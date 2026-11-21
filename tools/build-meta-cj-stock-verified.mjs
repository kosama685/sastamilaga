#!/usr/bin/env node
/**
 * Meta Commerce catalog: CJ stock-evidence gate.
 * A 451,812-item discovery snapshot is NOT retail inventory. Never promote
 * an inferred/supplier estimate or a blanket "backorder" to "in stock".
 * --audit: emit a machine-readable readiness assessment, no feed.
 * --build: create segmented, Meta-native XML *only* for fresh verified retail offers.
 *
 * Input NDJSON per variant is provided by a separate authorized supplier and
 * checkout reconciliation process, NEVER from raw data/cj snapshots:
 * {id,title,description,link,image_link,country,currency,retail_price,
 *  variant_id,stock:{source:"cj_api",checked_at,cj_warehouse_units,factory_units},
 *  retail:{price_checked_at,checkout_checked_at,shipping_checked_at,
 *    exact_variant_checkout:true,price_matches_checkout:true,
 *    page_matches_checkout:true,shipping_confirmed:true,
 *    merchant_policy_reviewed:true,reference:"..."}}
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {once} from 'node:events';

const ROOT=process.cwd();
const INPUT=path.resolve(process.env.META_CJ_VERIFIED_OFFERS_FILE||'data/meta/cj-retail-verified.ndjson');
const TARGET=path.resolve(process.env.META_CJ_OUTPUT_DIR||'feeds/meta-verified');
const REPORT=path.resolve(process.env.META_CJ_REPORT||'artifacts/meta-cj-stock-readiness.json');
const MARKET=process.env.META_CJ_COUNTRY||'PK';
const CCY=process.env.META_CJ_CURRENCY||'PKR';
const DAY=86_400_000;
const MAX_PER_FEED=5000;
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh=(value,days)=>{let t=Date.parse(value||'');return Number.isFinite(t)&&t<=Date.now()&&Date.now()-t<=days*DAY};
const https=(value,local)=>{try{const u=new URL(value);return u.protocol==='https:'&&(!local||u.hostname==='sastamilaga.com')}catch{return false}};
const tag=(key,value)=>'<g:'+key+'>'+ESC(value)+'</g:'+key+'>';
const xmlHeader=(shard)=>'<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Sasta Milaga — Verified '+MARKET+' CJ retail offers '+shard+'</title><link>https://sastamilaga.com/</link><description>Only independently verified retail offers</description>\n';
const xmlFooter='</channel></rss>\n';
const validId=/^[A-Za-z0-9_.:-]{5,100}$/;

function validate(p){
 let why=[];
 if(!p||typeof p!=='object'||Array.isArray(p))return ['invalid_record'];
 if(!validId.test(String(p.id||'')))why.push('invalid_id');
 if(!validId.test(String(p.variant_id||'')))why.push('missing_exact_variant');
 if(!p.title||!p.description||String(p.title).length>150||String(p.description).length>5000)why.push('invalid_copy');
 if(!https(p.link,true)||!https(p.image_link,false))why.push('invalid_landing_or_image');
 if(p.country!==MARKET||p.currency!==CCY)why.push('wrong_market');
 if(typeof p.retail_price!=='number'||!Number.isFinite(p.retail_price)||p.retail_price<=0||Math.round(p.retail_price*100)/100!==p.retail_price)why.push('unverified_retail_price');
 if(!['new','used','refurbished'].includes(p.condition))why.push('invalid_condition');
 let stock=p.stock||{},retail=p.retail||{};
 if(stock.source!=='cj_api'||!fresh(stock.checked_at,1))why.push('missing_or_stale_cj_inventory');
 const own=stock.cj_warehouse_units,factory=stock.factory_units;
 if(!Number.isInteger(own)||own<0||!Number.isInteger(factory)||factory<0)why.push('invalid_supplier_quantity');
 // factory inventory is NOT physically held at a CJ warehouse, and cannot
 // be presented as "in stock" without an approved retailer-orderable flow.
 if(!(own>0||factory>0))why.push('no_confirmed_positive_inventory');
 for(const key of ['exact_variant_checkout','price_matches_checkout','page_matches_checkout','shipping_confirmed','merchant_policy_reviewed'])if(retail[key]!==true)why.push('missing_retail_'+key);
 for(const [key,days] of [['price_checked_at',1],['checkout_checked_at',7],['shipping_checked_at',7]])if(!fresh(retail[key],days))why.push('stale_retail_'+key);
 if(!retail.reference||String(retail.reference).length<8)why.push('missing_evidence_reference');
 if(p.price_kind!=='final_retail')why.push('supplier_estimate_not_retail');
 if(!Number.isInteger(own)||own<=0){ // factory-only listing can be ordered, but not labelled in stock
  if(retail.factory_order_verified!==true)why.push('factory_stock_not_orderable');
 }
 return why;
}
function item(p){
 const stock=p.stock;
 const status=stock.cj_warehouse_units>0?'in stock':'available for order';
 return '<item>'+tag('id',p.id)+tag('title',p.title)+tag('description',p.description)+tag('link',p.link)+tag('image_link',p.image_link)+tag('availability',status)+tag('price',p.retail_price.toFixed(2)+' '+p.currency)+tag('condition',p.condition)+
  (p.brand?tag('brand',p.brand):'')+(p.gtin?tag('gtin',p.gtin):'')+(p.mpn?tag('mpn',p.mpn):'')+
  (p.product_type?tag('product_type',p.product_type):'')+
  '</item>\n';
}
async function main(){
 if(!/^[A-Z]{2}$/.test(MARKET)||!/^[A-Z]{3}$/.test(CCY))throw Error('Invalid explicit market/currency');
 const report={generated_at:new Date().toISOString(),market:MARKET,currency:CCY,sourceCatalogAtObservation:451812,supplierSnapshotDate:'2026-11-05',stockFlagsObservedOn:'2026-11-21',stockFlagsPopulatedAtObservation:0,currentStockFlagsNotRequeried:true,sourceFilePresent:fs.existsSync(INPUT),read:0,eligible:0,excluded:0,reasons:{},shards:[],liveFeedReady:false,stockMethod:'CJ API per-variant evidence <= 24h; verified final retail price, checkout and shipping',adsApproved:false,claim:'Neither Meta approval nor Google indexing is implied'};
 fs.mkdirSync(path.dirname(REPORT),{recursive:true});
 if(!report.sourceFilePresent){fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(process.argv.includes('--build'))throw Error('No independent CJ inventory/checkout evidence. Refusing to publish misleading feed.');return}
 const seen=new Set(),qualified=[];
 const lines=readline.createInterface({input:fs.createReadStream(INPUT),crlfDelay:Infinity});
 for await(const line of lines){if(!line.trim())continue;report.read++;
  let p,why;
  try{p=JSON.parse(line);why=validate(p)}catch{why=['invalid_json']}
  if(p&&seen.has(p.id))why.push('duplicate_id');
  if(p)seen.add(p.id);
  if(why.length){report.excluded++;for(const k of new Set(why))report.reasons[k]=(report.reasons[k]||0)+1;continue}
  qualified.push(p);report.eligible++;
 }
 if(process.argv.includes('--build')&&qualified.length){
  fs.mkdirSync(TARGET,{recursive:true});
  const tempDir=TARGET+'.tmp.'+process.pid;fs.mkdirSync(tempDir,{recursive:true});
  const created=[];
  try{
   for(let i=0;i<qualified.length;i+=MAX_PER_FEED){
    const index=1+i/MAX_PER_FEED,file=path.join(tempDir,index+'.xml');
    const body=xmlHeader(index)+qualified.slice(i,i+MAX_PER_FEED).map(item).join('')+xmlFooter;
    if(Buffer.byteLength(body)>48_000_000)throw Error('XML shard too large');
    fs.writeFileSync(file,body);created.push({file:index+'.xml',products:Math.min(MAX_PER_FEED,qualified.length-i)});
   }
   // Publishing requires a separate deliberate release: output remains in temp
   // unless the verified cohort is sound and no file is empty or oversized.
   // Swap the entire verified-feed directory: never leave stale old shards
   // visible if a smaller verified cohort is published later.
   const backup=TARGET+'.backup.'+process.pid;
   let oldMoved=false;
   try{
    if(fs.existsSync(TARGET)){fs.renameSync(TARGET,backup);oldMoved=true}
    fs.renameSync(tempDir,TARGET);
    if(oldMoved)fs.rmSync(backup,{recursive:true,force:true});
   }catch(e){
    if(oldMoved&&!fs.existsSync(TARGET))fs.renameSync(backup,TARGET);
    throw e;
   }
   report.shards=created;report.liveFeedReady=true;
  }catch(e){fs.rmSync(tempDir,{recursive:true,force:true});throw e}
 }
 fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({read:report.read,eligible:report.eligible,excluded:report.excluded,reasons:report.reasons,liveFeedReady:report.liveFeedReady,shards:report.shards}));
 if(process.argv.includes('--build')&&!report.liveFeedReady)throw Error('Zero verified orderable CJ offers. No Meta feed published.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
