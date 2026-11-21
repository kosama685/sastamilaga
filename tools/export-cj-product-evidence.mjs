#!/usr/bin/env node
/**
 * Category-wise per-product offline CJ evidence exporter.
 * Exports every original supplier ID as its OWN JSON file INSIDE a .tar.gz,
 * grouped by original category. These are NOT public Product offers.
 *
 * Usage: node tools/export-cj-product-evidence.mjs
 * Output: artifacts/cj-seo-evidence/category-product-files.tar.gz (451812 JSON files)
 *         artifacts/cj-seo-evidence/all-products.jsonl.gz (complete manifest)
 *         artifacts/cj-seo-evidence/category-index.json
 *         artifacts/cj-seo-evidence/completeness.json
 * Tar can be inspected with: tar -tzf <archive> | head
 * No file is written inside the site's public p/, feeds/, or sitemap folders.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {once} from 'node:events';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'data/cj/lookup');
const OUT=path.join(ROOT,'artifacts/cj-seo-evidence');
const META=JSON.parse(fs.readFileSync(path.join(SOURCE,'manifest.json'),'utf8'));
const paths=fs.readdirSync(SOURCE).filter(s=>/^[0-9a-f]{3}\.json$/.test(s)).sort();
if(META.allow_indexing!==false)throw Error('Fail closed: source snapshot must remain nonindexable');
if(paths.length!==META.shards)throw Error('Source shard count mismatch: '+paths.length);
fs.mkdirSync(OUT,{recursive:true});
const tarFile=path.join(OUT,'category-product-files.tar.gz');
const manifestFile=path.join(OUT,'all-products.jsonl.gz');
const tarFileStream=fs.createWriteStream(tarFile);
const gz=zlib.createGzip({level:5});
gz.pipe(tarFileStream);
const manFileStream=fs.createWriteStream(manifestFile);
const manGz=zlib.createGzip({level:6});
manGz.pipe(manFileStream);
const ids=new Set(),cats=new Map(),samples=[];
let records=0,invalidId=0,missingSku=0,missingTitle=0,missingImage=0,duplicates=0;
let tarChunks=[],tarBytes=0;
const idValid=/^(?:[0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i;
const slug=s=>String(s||'uncategorized').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,55)||'uncategorized';
function oct(b,num,pos,len){
 const s=num.toString(8).padStart(len-1,'0')+'\0';
 if(s.length>len)throw Error('Tar number overflow');
 b.write(s,pos,len,'ascii');
}
function tarEntry(name,body){
 const data=Buffer.from(body,'utf8'),buf=Buffer.alloc(512);
 const split=name.lastIndexOf('/');
 const filename=name.slice(split+1),prefix=name.slice(0,split);
 if(Buffer.byteLength(filename)>100||Buffer.byteLength(prefix)>155)throw Error('Tar path exceeds USTAR '+name);
 buf.write(filename,0,100,'utf8');buf.write(prefix,345,155,'utf8');
 oct(buf,0o644,100,8);oct(buf,0,108,8);oct(buf,0,116,8);
 oct(buf,data.length,124,12);oct(buf,0,136,12);
 buf.fill(32,148,156);buf.write('0',156);
 buf.write('ustar\0',257,6,'ascii');buf.write('00',263,2,'ascii');
 const sum=buf.reduce((a,v)=>a+v,0);
 buf.write(sum.toString(8).padStart(6,'0')+'\0 ',148,8,'ascii');
 const pad=(512-(data.length%512))%512;
 return Buffer.concat([buf,data,pad?Buffer.alloc(pad):Buffer.alloc(0)]);
}
async function flushTar(){
 if(!tarChunks.length)return;
 const batch=Buffer.concat(tarChunks,tarBytes);
 tarChunks=[];tarBytes=0;
 if(!gz.write(batch))await once(gz,'drain');
}
async function tarAppend(name,payload){
 const chunk=tarEntry(name,payload);tarChunks.push(chunk);tarBytes+=chunk.length;
 if(tarBytes>=2*1024*1024)await flushTar();
}
async function appendManifest(text){
 if(!manGz.write(text))await once(manGz,'drain');
}
for(const file of paths){
 const bucket=JSON.parse(fs.readFileSync(path.join(SOURCE,file),'utf8'));
 const entries=Object.entries(bucket.items||{});
 if(bucket.snapshot!==META.snapshot||entries.length!==bucket.count)throw Error('Corrupt input shard '+file);
 let manifestBatch='';
 for(const [id,raw] of entries){
  records++;
  if(ids.has(id)){duplicates++;throw Error('Duplicate CJ ID '+id)}
  ids.add(id);
  if(!idValid.test(id))invalidId++;
  const [supplierSku,title,originalCategory,sourceCategorySlug,image]=Array.isArray(raw)?raw:[];
  const name=String(title||'').trim(),sku=String(supplierSku||'').trim(),category=String(originalCategory||'Uncategorized').trim();
  const validImage=/^https:\/\/\S+$/i.test(String(image||''));
  if(!sku)missingSku++;if(!name)missingTitle++;if(!validImage)missingImage++;
  const catSlug=slug(sourceCategorySlug||category)+'-'+crypto.createHash('sha1').update(category).digest('hex').slice(0,7);
  const state=cats.get(catSlug)||{slug:catSlug,originalCategory:category,sourceRows:0,missingSku:0,missingTitle:0,missingImage:0,approvedForIndex:0};
  state.sourceRows++;if(!sku)state.missingSku++;if(!name)state.missingTitle++;if(!validImage)state.missingImage++;
  cats.set(catSlug,state);
  // A source record is not a verified retail offer: never synthesize Product Offers,
  // reviews, GTIN, brand, shopping dates, inventory status or canonical URLs.
  const item={supplierId:id,supplierSku:sku||null,name:name||null,originalCategory:category,
   sourceCategorySlug:sourceCategorySlug||null,imageSource:validImage?image:null,
   sourceSnapshot:META.snapshot,status:'supplier_snapshot_only',published:false,
   googleIndexEligible:false,merchantEligible:false,productOffer:null,
   canonical:null,blockedReasons:['unverified_retail_offer','unverified_current_stock','unverified_destination_shipping','unverified_product_description','unverified_exact_variant_checkout']};
  if(!idValid.test(id))item.blockedReasons.push('invalid_supplier_id');
  if(!sku)item.blockedReasons.push('missing_supplier_sku');
  if(!name)item.blockedReasons.push('missing_title');
  if(!validImage)item.blockedReasons.push('missing_https_image');
  const rel='seo-structured-data/cj/'+catSlug+'/'+id.toLowerCase()+'.json';
  await tarAppend(rel,JSON.stringify(item)+'\n');
  manifestBatch+=JSON.stringify({id,category:catSlug,path:rel,indexEligible:false})+'\n';
  if(manifestBatch.length>=1<<18){await appendManifest(manifestBatch);manifestBatch=''}
  if(samples.length<5)samples.push({id,category:catSlug,file:rel});
 }
 if(manifestBatch)await appendManifest(manifestBatch);
}
if(records!==META.source_catalogue_rows||ids.size!==META.unique_ids||duplicates!==0){
 throw Error('Failed full CJ source accounting: '+JSON.stringify({records,unique:ids.size,expected:META.unique_ids,duplicates}))
}
await flushTar();
if(!gz.write(Buffer.alloc(1024)))await once(gz,'drain');
gz.end();manGz.end();
await Promise.all([once(tarFileStream,'finish'),once(manFileStream,'finish')]);
const categories=[...cats.values()].sort((a,b)=>b.sourceRows-a.sourceRows);
const index={sourceSnapshot:META.snapshot,generatedAt:new Date().toISOString(),categories,sourceRows:records};
const summary={sourceSnapshot:META.snapshot,sourceShards:paths.length,sourceRecords:records,uniqueProductIds:ids.size,
 perProductFilesInsideTar:records,categoryDirectories:categories.length,duplicates,invalidId,missingSku,missingTitle,missingImage,
 indexEligibleFromSource:0,merchantEligibleFromSource:0,
 publishedChanges:0,reason:'No checkout, verified retail price, live stock or country shipping in the 5-field supplier snapshot',
 deliverables:['category-product-files.tar.gz','all-products.jsonl.gz','category-index.json'],samples};
fs.writeFileSync(path.join(OUT,'category-index.json'),JSON.stringify(index,null,2)+'\n');
fs.writeFileSync(path.join(OUT,'completeness.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
