#!/usr/bin/env node
/**
 * Sasta Milaga — offline, reversible and exhaustive CJ source inventory ledger.
 *
 * Every source ID is covered, grouped under its ORIGINAL supplier category and
 * export partition, with explicit NOINDEX/NO-MERCHANT hold reasons.
 * Never creates product HTML, public sitemaps, fake FAQs, stock, brand, translated
 * content, reviews or prices from an incomplete five-field source snapshot.
 *
 * Usage: node tools/build-global-seo-readiness-ledger.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {once} from 'node:events';

const ROOT=process.cwd();
const SOURCE=path.join(ROOT,'data/cj/lookup');
const DEST=path.join(ROOT,'artifacts/global-seo');
const manifest=JSON.parse(fs.readFileSync(path.join(SOURCE,'manifest.json'),'utf8'));
if(manifest.allow_indexing!==false)throw Error('Safety gate: source snapshot indexing flag changed. Review before scanning.');
if(manifest.unique_ids!==451812)throw Error('Unexpected source inventory size; use a reviewed snapshot or update the approval control.');

fs.mkdirSync(DEST,{recursive:true});
const files=fs.readdirSync(SOURCE).filter(f=>/^[0-9a-f]{3}\.json$/.test(f)).sort();
const out=fs.createWriteStream(path.join(DEST,'product-readiness.jsonl.gz'));
const gzip=zlib.createGzip({level:6});
gzip.pipe(out);
const categoryMap=new Map(),counts={sourceRows:0,uniqueIds:0,validProductIds:0,hasTitle:0,hasSKU:0,hasImageURL:0,hasSupplierCategory:0,eligibleForIndex:0,eligibleForMerchant:0,faqReady:0,translationReady:0,duplicateIDs:0,invalidBuckets:0};
const seen=new Set(), examples=[];
const validId=/^(?:[0-9]{19}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$/;
const reasons=['missing_verified_price','missing_verified_stock','missing_market_shipping','missing_verified_description_attributes','missing_checkout_evidence','missing_translation_review','missing_factual_product_faq'];
const safeCategory=x=>String(x||'Uncategorized').trim().slice(0,200)||'Uncategorized';
const safeSlug=x=>String(x||'uncategorized').toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,110)||'uncategorized';
async function write(line){if(!gzip.write(line))await once(gzip,'drain')}
for(const f of files){
 let bucket;
 try{bucket=JSON.parse(fs.readFileSync(path.join(SOURCE,f),'utf8'))}catch(e){counts.invalidBuckets++;throw Error('Invalid shard '+f+': '+e.message)}
 if(bucket.snapshot!==manifest.snapshot||Object.keys(bucket.items||{}).length!==bucket.count){counts.invalidBuckets++;throw Error('Invalid shard metadata '+f)}
 for(const [id,fields] of Object.entries(bucket.items)){
  counts.sourceRows++;
  if(seen.has(id))counts.duplicateIDs++;else seen.add(id);
  const [sku,title,category,categorySlug,image]=Array.isArray(fields)?fields:[];
  const name=String(title||'').trim(),s=String(sku||'').trim(),cat=safeCategory(category),slug=safeSlug(categorySlug||cat);
  const imageURL=/^https:\/\/[^\s]+$/i.test(String(image||''))?String(image):null;
  const identityOK=validId.test(id);
  if(identityOK)counts.validProductIds++;
  if(name)counts.hasTitle++;
  if(s)counts.hasSKU++;
  if(imageURL)counts.hasImageURL++;
  if(cat!=='Uncategorized')counts.hasSupplierCategory++;
  const group=categoryMap.get(slug)||{supplierCategory:cat,slug,sourceRows:0,missingTitle:0,missingSKU:0,missingImage:0,reviewStatus:'taxonomy_review_required',indexEligible:0};
  group.sourceRows++;
  if(!name)group.missingTitle++;
  if(!s)group.missingSKU++;
  if(!imageURL)group.missingImage++;
  categoryMap.set(slug,group);
  const reasonList=[...reasons];
  if(!identityOK)reasonList.push('invalid_supplier_id');
  if(!name)reasonList.push('missing_title');
  if(!s)reasonList.push('missing_supplier_sku');
  if(!imageURL)reasonList.push('missing_or_invalid_image');
  if(cat==='Uncategorized')reasonList.push('missing_supplier_category');
  // The source snapshot does not include valid price, inventory, origin, reviews,
  // GTIN, verified brand, factual FAQ answers, shipping or translated copy.
  const entry={id,sku:s||null,name:name||null,supplierCategory:cat,categorySlug:slug,
    imageSource:imageURL,sourceSnapshot:manifest.snapshot,indexEligible:false,
    merchantEligible:false,faqReady:false,translationReady:false,canonicalURL:null,
    reasons:reasonList};
  if(examples.length<8)examples.push({id,category:cat,reasonCount:reasonList.length});
  await write(JSON.stringify(entry)+'\n');
 }
}
gzip.end();await once(out,'finish');
counts.uniqueIds=seen.size;
if(files.length!==manifest.shards||counts.uniqueIds!==manifest.unique_ids||counts.sourceRows!==manifest.source_catalogue_rows||counts.duplicateIDs||counts.invalidBuckets)throw Error('Inventory completeness mismatch: '+JSON.stringify(counts));
const sorted=[...categoryMap.values()].sort((a,b)=>b.sourceRows-a.sourceRows||a.slug.localeCompare(b.slug));
const overview={generatedAt:new Date().toISOString(),snapshot:manifest.snapshot,source:{records:manifest.source_catalogue_rows,shards:files.length,allowIndexing:false},counts,categories:sorted.length,
  artifacts:{ledger:'product-readiness.jsonl.gz',categoryReport:'category-readiness.json',humanReport:'readiness-summary.md'},
  meaning:'100% SOURCE RECORDS ACCOUNTED FOR; ZERO AUTHORISED FOR INDEXING OR OFFERS BY THIS DATASET. D1 editorial eligibility is separate.',exampleReasons:examples};
fs.writeFileSync(path.join(DEST,'source-completeness.json'),JSON.stringify(overview,null,2)+'\n');
fs.writeFileSync(path.join(DEST,'category-readiness.json'),JSON.stringify({generatedAt:overview.generatedAt,snapshot:manifest.snapshot,categories:sorted},null,2)+'\n');
fs.writeFileSync(path.join(DEST,'readiness-summary.md'),[
 '# Global Supplier SEO Inventory — evidence gate',
 '',`Snapshot: ${manifest.snapshot} · scanned ${counts.sourceRows.toLocaleString('en-US')} records in ${files.length} source shards · ${sorted.length} supplier category slugs.`,
 '', '**Publishing status: none of these records are approved by this offline source alone.** This assessment does not override separate editorial-approved D1 products.',
 '', 'Every supplier ID has an entry in the compressed JSONL ledger. The ledger preserves SKU and original supplier category and records missing evidence instead of inventing translations, FAQ, price, stock or shipping.',
 '', '| Category | Records | Missing source title | Missing SKU | Missing image URL |',
 '|---|---:|---:|---:|---:|',
 ...sorted.slice(0,60).map(x=>`| ${x.supplierCategory.replaceAll('|','/')} | ${x.sourceRows} | ${x.missingTitle} | ${x.missingSKU} | ${x.missingImage} |`),
 '', 'Remaining prerequisites for each product: verified current price, stock and market shipping, source-backed specifications, approved localization and real factual FAQ answers. Only approved D1 cohorts may enter indexable sitemaps.'
 ].join('\n')+'\n');
console.log(JSON.stringify({complete:true,rows:counts.sourceRows,shards:files.length,categories:sorted.length,indexEligibleFromSnapshot:0,files:overview.artifacts}));
