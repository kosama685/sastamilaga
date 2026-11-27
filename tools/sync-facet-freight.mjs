// Promote only fresh, exact CJ freight observations already written by the existing shipping Worker.
// Never infer stock, attributes, SEO approval or checkout eligibility. No supplier requests here.
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function categoryMap(manifest){
 const m=new Map();
 for(const c of manifest.cats||[]){if(typeof c.n!=='string'||!/^[a-z0-9-]{1,120}$/.test(c.s))continue;m.set(c.n,m.has(c.n)?null:c.s);}
 return m;
}
export function candidate(r,cats,now){
 if(r.source!=='cj_api'||r.quantity!==1||r.zip_code!==''||!/^[A-Z]{2}$/.test(r.country_code||'')||!r.product_id||!r.variant_id)return null;
 const category=cats.get(r.categories);
 if(!category||r.identity_count!==1)return null;
 const at=r.fetched_at*1000,until=r.expires_at*1000;
 if(!Number.isSafeInteger(at)||!Number.isSafeInteger(until)||at>now||at<=0||until<=now||until<=at||until-at>7200000)return null;
 let rates;try{rates=JSON.parse(r.rates_json)}catch{return null;}
 if(!Array.isArray(rates)||!rates.some(x=>x&&typeof x.carrier==='string'&&x.carrier.trim()&&typeof x.amountUsd==='number'&&Number.isFinite(x.amountUsd)&&x.amountUsd>=0))return null;
 return [category,r.country_code,r.product_id,r.variant_id,'CN',1,'UNKNOWN','QUOTED',at,until,at,until,'Warehouse inventory not checked by freight sync','Existing CJ shipping Worker cache; exact variant, country, qty 1; no postcode'];
}
export const UPSERT="INSERT INTO catalog_facet_variant_market VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(category_slug,country,product_id,variant_id,origin_country) DO UPDATE SET delivery_state=excluded.delivery_state,delivery_observed_at=excluded.delivery_observed_at,delivery_expires_at=excluded.delivery_expires_at,delivery_evidence_ref=excluded.delivery_evidence_ref WHERE excluded.delivery_observed_at>catalog_facet_variant_market.delivery_observed_at";
export async function run(){
 const account=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
 if(!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('D1 credentials unavailable');
 const url='https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/ac28088f-6a54-4d29-8c64-821661efe88f/query';
 async function query(body){const res=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error('D1 HTTP '+res.status);const j=await res.json();if(!j.success||!Array.isArray(j.result)||j.result.some(x=>!x.success))throw Error('D1 batch failed');return j.result;}
 const raw=await fs.readFile(new URL('../data/cj/manifest.js',import.meta.url),'utf8'),manifest=JSON.parse(raw.trim().replace(/^window\.SM_CJ=/,'').replace(/;$/,''));
 const cats=categoryMap(manifest),now=Date.now(),sec=Math.floor(now/1000),report={at:new Date(now).toISOString(),read:0,promoted:0,held:0,already_current:0,source:'fresh existing freight cache only',supplier_requests:0,stock_approvals:0};
 // Walk at most 500 fresh cache records per run, using expiry index; deterministic cursor.
 let lastExpiry=sec,lastKey='';
 for(let page=0;page<5;page++){
 const [r]=await query({sql:"SELECT s.*,p.categories,(SELECT COUNT(*) FROM catalog_products_cj WHERE cj_product_id=s.product_id) identity_count FROM cj_shipping_cache s LEFT JOIN catalog_products_cj p ON p.cj_product_id=s.product_id WHERE s.expires_at>? AND (s.expires_at>? OR (s.expires_at=? AND s.cache_key>?)) ORDER BY s.expires_at,s.cache_key LIMIT 100",params:[sec,lastExpiry,lastExpiry,lastKey]});
 const rows=r.results||[];if(!rows.length)break;
 const batch=[];for(const row of rows){report.read++;const p=candidate(row,cats,now);if(!p){report.held++;continue;}batch.push({sql:UPSERT,params:p});}
 if(batch.length){const out=await query({batch});for(const x of out){if(x.meta?.changes===1)report.promoted++;else report.already_current++;}}
 lastExpiry=rows.at(-1).expires_at;lastKey=rows.at(-1).cache_key;if(rows.length<100)break;
 }
 report.batch_ceiling=500;report.complete_catalog=false;
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/facet-sync.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
