#!/usr/bin/env node
/**
 * Audit local static products by immutable HHC SKU; optional WooCommerce
 * export JSON for cross-system reconciliation. Read only by default.
 * Usage:
 * node tools/audit-static-local-products.mjs --out reports/local-catalog-audit.json
 * node tools/audit-static-local-products.mjs --woo-export /secure/woo-export.json --out reports/audit.json
 * Woo JSON: array of {sku,id,permalink,price,stock_status,images:[{src}]}\n * This audit is intentionally read-only and safe to run on every source update.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const P=path.join(ROOT,'p');
const args=process.argv.slice(2);const param=(k)=>args.includes(k)?args[args.indexOf(k)+1]:null;
const files=fs.readdirSync(P).filter(x=>x.endsWith('.html')).sort();
if(files.length<19000)throw Error('Incomplete static product inventory; abort');
const normalize=s=>String(s||'').trim().toLowerCase();
const strip=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const canonical='https://sastamilaga.com';
const records=new Map(),dupes=[],missing=[],issues=[],indexable=0,withImages=0,withVideo=0,withFaq=0;
for(const file of files){
 const html=fs.readFileSync(path.join(P,file),'utf8');
 const sku=normalize(html.match(/"sku"\s*:\s*"([^"]+)"/i)?.[1] || html.match(/SKU:\s*<code>([^<]+)</i)?.[1] || '');
 if(!sku){missing.push(file);continue}
 const rec={sku,file,canonical:canonical+'/p/'+file,price:html.match(/"price"\s*:\s*"([^"]*)"/)?.[1]||null,
  title:strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]),
  image:html.match(/<meta property="og:image" content="([^"]+)"/)?.[1]||null,
  video:/<video\b/.test(html),
  indexable:!/<meta name="robots" content="[^"]*\bnoindex\b/i.test(html),
  description:html.match(/<meta name="description" content="([^"]*)"/)?.[1]||null};
 if(rec.indexable)indexable++;if(rec.image)withImages++;if(rec.video)withVideo++;if(/FAQPage/.test(html))withFaq++;
 if(records.has(sku))dupes.push({sku,first:records.get(sku).file,second:file});
 else records.set(sku,rec);
 if(!html.includes('<link rel="canonical" href="'+rec.canonical+'"'))issues.push({sku,issue:'canonical_mismatch',file});
 if(rec.title.length<6||!rec.description)issues.push({sku,issue:'thin_or_missing_meta',file});
}
let matched=0,wooOnly=0,staticOnly=0,priceMismatch=[],urlMismatch=[],imageMismatch=[],stockUnverified=0;
const source=param('--woo-export');const woo=source?JSON.parse(fs.readFileSync(source,'utf8')):null;
if(woo){
 const seen=new Set();
 for(const p of woo){
  const sku=normalize(p.sku);if(!sku)continue;
  const item=records.get(sku);if(!item){wooOnly++;continue}
  matched++;seen.add(sku);
  if(item.price!==null&&p.price!==undefined&&Math.abs(Number(item.price)-Number(p.price))>0.01)priceMismatch.push({sku,static:item.price,woo:String(p.price)});
  if(p.permalink&&p.permalink!==item.canonical)urlMismatch.push({sku,static:item.canonical,woo:p.permalink});
  const image=p.images?.[0]?.src||p.image?.url||null;
  if(image&&item.image&&image!==item.image)imageMismatch.push({sku,static:item.image,woo:image});
  if(!p.stock_updated_at)stockUnverified++;
 }
 staticOnly=[...records.keys()].filter(k=>!seen.has(k)).length;
}
const report={generated:new Date().toISOString(),files:files.length,uniqueSku:records.size,missingSku:missing.length,duplicateSku:dupes.length,indexable,withImages,withVideo,withFaq,issuesCount:issues.length,
  reconciliation:{wooProvided:!!woo,matched,wooOnly,staticOnly,priceMismatchCount:priceMismatch.length,urlMismatchCount:urlMismatch.length,imageMismatchCount:imageMismatch.length,stockUnverified},
  samples:{missingSku:missing.slice(0,30),duplicateSku:dupes.slice(0,30),issues:issues.slice(0,50),priceMismatch:priceMismatch.slice(0,50),urlMismatch:urlMismatch.slice(0,50),imageMismatch:imageMismatch.slice(0,50)}};
const out=param('--out');if(out){const full=path.resolve(out);fs.mkdirSync(path.dirname(full),{recursive:true});fs.writeFileSync(full,JSON.stringify(report,null,2)+'\n')}
process.stdout.write(JSON.stringify(report,null,2)+'\n');
