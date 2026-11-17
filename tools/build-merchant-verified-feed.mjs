#!/usr/bin/env node
// Build a Merchant XML feed ONLY from independently checked, retail-orderable offers.
// Raw CJ snapshots and estimated supplier prices must never be promoted automatically.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import {once} from 'node:events';

const source=path.resolve(process.env.GMC_VERIFIED_OFFERS_FILE||'data/merchant/verified-offers.ndjson');
const target=path.resolve('feeds/merchant-verified.xml');
const report=path.resolve('artifacts/merchant-verified-report.json');
const country=process.env.GMC_TARGET_COUNTRY||'';
const currency=process.env.GMC_TARGET_CURRENCY||'';
const now=Date.now();
function xml(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function https(url,siteOnly){try{const x=new URL(url);return x.protocol==='https:'&&(!siteOnly||x.hostname==='sastamilaga.com')}catch{return false}}
function recent(value,days){const t=Date.parse(value||'');return Number.isFinite(t)&&t<=now&&now-t<=days*86400000}
function errors(p){
 const bad=[];
 if(!p||typeof p!=='object'||Array.isArray(p))return ['not_an_object'];
 for(const k of ['id','title','description','link','image_link','price','availability','country','currency'])if(p[k]===undefined||p[k]===null||p[k]==='')bad.push('missing_'+k);
 if(!/^[A-Za-z0-9_.:-]{1,80}$/.test(String(p.id||'')))bad.push('invalid_stable_id');
 if(!https(p.link,true))bad.push('invalid_landing');
 if(!https(p.image_link,false))bad.push('invalid_image');
 if(p.country!==country||p.currency!==currency)bad.push('market_mismatch');
 if(typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0||Math.round(p.price*100)/100!==p.price)bad.push('not_retail_price');
 if(!['in_stock','out_of_stock'].includes(p.availability))bad.push('unknown_stock');
 if(String(p.title||'').length>150||String(p.description||'').length>5000)bad.push('oversize_text');
 if(p.offer_kind!=='verified_retail')bad.push('supplier_estimate');
 const e=p.evidence||{};
 for(const k of ['exact_variant_checkout','price_matches_page_and_checkout','stock_matches_page_and_checkout','shipping_reviewed','indexable_landing','merchant_policy_reviewed'])if(e[k]!==true)bad.push('unverified_'+k);
 for(const [k,d] of [['price_checked_at',1],['stock_checked_at',1],['landing_checked_at',7],['shipping_checked_at',7],['checkout_tested_at',30]])if(!recent(e[k],d))bad.push('stale_'+k);
 if(typeof e.reference!=='string'||e.reference.length<8)bad.push('missing_evidence_reference');
 if(typeof p.identifier_exists!=='boolean')bad.push('unknown_identifier_status');
 if(p.identifier_exists===true&&!p.gtin&&!(p.brand&&p.mpn))bad.push('missing_identifiers');
 if(p.shipping_price!==undefined&&(!Number.isFinite(p.shipping_price)||p.shipping_price<0))bad.push('invalid_shipping_cost');
 return bad;
}
function node(k,v){return v===undefined||v===null||v===''?'':'<g:'+k+'>'+xml(v)+'</g:'+k+'>'}
function item(p){
 let s='<item>';
 for(const key of ['id','title','description','link','image_link','availability'])s+=node(key,p[key]);
 s+=node('price',p.price.toFixed(2)+' '+p.currency)+node('condition','new');
 for(const key of ['brand','gtin','mpn','product_type'])s+=node(key,p[key]);
 s+=node('identifier_exists',p.identifier_exists?'yes':'no');
 if(p.shipping_price!==undefined)s+='<g:shipping>'+node('country',country)+node('service','Standard')+node('price',p.shipping_price.toFixed(2)+' '+currency)+'</g:shipping>';
 return s+'</item>\n';
}
if(!/^[A-Z]{2}$/.test(country)||!/^[A-Z]{3}$/.test(currency))throw Error('Set verified target country and currency explicitly');
if(!fs.existsSync(source))throw Error('Verified retail inventory file missing; raw catalogue is not eligible');
fs.mkdirSync('feeds',{recursive:true});fs.mkdirSync('artifacts',{recursive:true});
const temp=target+'.tmp';const out=fs.createWriteStream(temp);
async function write(x){if(!out.write(x))await once(out,'drain')}
const seen=new Set(),stats={read:0,eligible:0,excluded:0},why={},examples=[];
try{
 await write('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Sasta Milaga Verified Offers</title><link>https://sastamilaga.com/</link><description>Verified retail offers only</description>\n');
 const lines=readline.createInterface({input:fs.createReadStream(source),crlfDelay:Infinity});
 for await (const line of lines){
  if(!line.trim())continue;stats.read++;
  let p,fail;
  try{p=JSON.parse(line);fail=errors(p)}catch{fail=['invalid_json']}
  if(p&&seen.has(String(p.id)))fail.push('duplicate_id');
  if(p)seen.add(String(p.id));
  if(fail.length){stats.excluded++;for(const reason of new Set(fail))why[reason]=(why[reason]||0)+1;if(examples.length<25)examples.push({id:p?.id||null,reasons:fail});continue}
  stats.eligible++;await write(item(p));
 }
 await write('</channel></rss>\n');out.end();await once(out,'finish');
 if(stats.eligible===0)throw Error('Zero independently verified, checkout-eligible offers; upload blocked');
 if(fs.statSync(temp).size>=4*1024**3)throw Error('Merchant file exceeds Google 4 GB limit');
 fs.renameSync(temp,target);
 const sha256=crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
 fs.writeFileSync(report,JSON.stringify({createdAt:new Date().toISOString(),country,currency,stats,rejections:why,examples,sha256,merchantApproval:'NOT_CLAIMED',uploaded:false},null,2)+'\n');
 console.log(JSON.stringify({stats,sha256,report}));
}catch(err){out.destroy();try{fs.unlinkSync(temp)}catch{}throw err}
