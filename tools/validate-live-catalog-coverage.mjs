#!/usr/bin/env node
/**
 * External product and category HTTP health: structural completeness plus
 * representative exact product pages for EVERY one of the 1024 lookup buckets.
 * No auth, cookies, form posts, add-to-cart, payment or webhook delivery.
 */
import fs from 'node:fs';
import path from 'node:path';
const BASE='https://sastamilaga.com';
const ROOT=process.cwd(),DIR=path.join(ROOT,'data/cj/lookup');
const source=fs.readFileSync(path.join(ROOT,'data/cj/manifest.js'),'utf8');
const m=JSON.parse(source.slice(source.indexOf('{'),source.lastIndexOf('}')+1));
const approved=/^(?:[0-9]{19}|[0-9A-F]{8}-(?:[0-9A-F]{4}-){3}[0-9A-F]{12})$/;
const slug=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,130).replace(/-+$/,'')||'product';
const idx=JSON.parse(fs.readFileSync(path.join(DIR,'manifest.json'),'utf8'));
if(idx.unique_ids!==451812||m.total!==451812||idx.shards!==1024||idx.duplicates!==0)throw Error('Static supplier catalogue completeness gate failed');
const files=fs.readdirSync(DIR).filter(f=>/^[a-f0-9]{3}\.json$/.test(f));
if(files.length!==1024)throw Error('Missing catalog lookup buckets');
let covered=0;const jobs=[];
for(const f of files.sort()){
 const data=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
 if(data.snapshot!==m.snapshot)throw Error('Snapshot version drift '+f);
 const rows=Object.entries(data.items||{});
 if(rows.length!==data.count||!rows.length)throw Error('Bad bucket count '+f);
 for(const [id,r] of rows){if(!approved.test(id)||!Array.isArray(r)||!r[1]||typeof r[1]!=='string')throw Error('Malformed real supplier record '+f);covered++}
 const [id,row]=rows[0];
 jobs.push({kind:'supplier_product',name:id,url:BASE+'/global-shop/p/'+encodeURIComponent(id)+'/'+slug(row[1])+'/',expected:200,pattern:/<link rel="canonical" href="https:\/\/sastamilaga\.com\/global-shop\/p\//});
}
if(covered!==451812)throw Error('Incomplete supplier ID coverage '+covered);
if(!Array.isArray(m.cats)||m.cats.length!==572)throw Error('Category manifest count changed');
for(const c of m.cats)jobs.push({kind:'global_category',name:c.s,url:BASE+'/c/global/'+c.s+'.html',expected:200});
for(const [name,p,status] of [['cart','/cart/',200],['qualified_sitemap','/sitemap-global-qualified.xml',200],['qualified_sitemap_page1','/sitemaps/global-qualified/1.xml',200],['homepage','/',200]]){
 jobs.push({kind:'critical_route',name,url:BASE+p,expected:status});
}
// Screenshot regression: a real product URL must remain HTTP 200 even with
// analytics/tracking query parameters. Check the actual HTML canonical and
// error text, not merely the status code. Unknown IDs still correctly 404.
const QA_CANONICAL=BASE+'/global-shop/p/1830116277370114048/retro-square-heel-pointed-toe-ankle-boots-fashion-versatile-chelsea-boot-women-s-shoes/';
const QA_PRODUCT_PATTERN=/<link rel="canonical" href="https:\/\/sastamilaga\.com\/global-shop\/p\/1830116277370114048\//;
for(const [name,tail] of [
 ['shoe_no_query',''],
 ['shoe_tracking_query','?utm_source=regression&utm_medium=qa&utm_campaign=error-screenshot'],
 ['shoe_extra_query','?utm_source=qa&fbclid=tracking-reference&utm_id=20261114'],
]){
 jobs.push({kind:'screenshot_regression',name,url:QA_CANONICAL+tail,expected:200,pattern:QA_PRODUCT_PATTERN});
}
jobs.push({kind:'screenshot_regression',name:'legacy_shoe_follows_permanent_canonical',url:BASE+'/global/p/woman-boots/1830116277370114048/old-supplier-video-slug?utm_source=qa',expected:200,pattern:QA_PRODUCT_PATTERN});

async function verify(job) {
 const start=Date.now();let last;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const res=await fetch(job.url,{method:job.pattern?'GET':'HEAD',redirect:'follow',headers:{'user-agent':'SastaMilaga-Catalog-Recovery-QA/1.0','accept':'text/html,application/xml,*/*;q=0.8'},signal:AbortSignal.timeout(16000)});
   const html=job.pattern?(await res.text()).slice(0,15000):'';
   const pass=res.status===job.expected&&(!job.pattern||job.pattern.test(html))&&!/Catalog(?:ue)? (?:temporarily |recovery temporarily )?unavailable/i.test(html);
   const entry={kind:job.kind,name:job.name,status:res.status,pass,latency_ms:Date.now()-start};
   if(pass||![429,500,502,503,504].includes(res.status))return entry;
   last=entry;
  }catch(e){last={kind:job.kind,name:job.name,status:0,pass:false,reason:e?.name||'network_error'};}
  await new Promise(r=>setTimeout(r,500*(attempt+1)));
 }
 return last;
}
let cursor=0;const results=[];
async function runner(){while(true){const pos=cursor++;if(pos>=jobs.length)return;results[pos]=await verify(jobs[pos]);}}
await Promise.all(Array.from({length:8},()=>runner()));
const counts={};for(const x of results){const s=counts[x.kind]??={tested:0,passed:0,failed:0};s.tested++;if(x.pass)s.passed++;else s.failed++;}
const bad=results.filter(x=>!x.pass);
const report={tested_utc:new Date().toISOString(),snapshot:m.snapshot,source_products_covered:covered,lookup_shards:files.length,global_categories:m.cats.length,checked_http_routes:jobs.length,counts,passed:bad.length===0,failures:bad.slice(0,100),limitations:['1024 live PDPs sampled, one per index bucket; the source ID mapping covers all 451,812 records but not each live HTTP URL.','Category HTML status is tested for all 572 global categories; local static product HTML is not exhaustively HTTP-crawled.','No final shipping quotes, live inventory, Merchant approvals, payments or Google indexing verified.']};
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/catalog-health-coverage.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({checked_http_routes:report.checked_http_routes,source_products_covered:covered,counts:report.counts,failures:report.failures.slice(0,10)}));
if(!report.passed)process.exitCode=1;
