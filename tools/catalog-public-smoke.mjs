// Independent public HTTP smoke. No writes, purchases, checkout requests or broad crawling.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base='https://sastamilaga.com',out=[];
async function check(path,fn){try{const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(25000),headers:{'User-Agent':'SastaCatalogQA/1.0'}});const t=await r.text();const details=fn(r,t);out.push({path,status:r.status,ok:true,details});}catch(e){out.push({path,ok:false,error:String(e.message).slice(0,250)});}}
await check('/api/catalog-facets/v1?category=smart-watches&country=PK',(r,t)=>{assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/application\/json/);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);assert.match(r.headers.get('cache-control')||'',/no-store/);const j=JSON.parse(t);assert.equal(j.schema,1);assert.equal(j.country,'PK');assert.ok(Array.isArray(j.rows));return {rows:j.rows.length};});
await check('/api/catalog-facets/v1?category=smart-watches&country=invalid',r=>assert.equal(r.status,400));
const canonical='/c/global/smart-watches.html';
await check(canonical,(r,t)=>{assert.equal(r.status,200);assert.ok(t.includes(base+canonical));assert.match(t,/global-static-facets\.js/);});
await check('/assets/js/global.js',(r,t)=>{assert.equal(r.status,200);assert.match(t,/gcountry/);assert.match(t,/catalog-facets\.js/);});
await check('/assets/js/catalog-facets.js',(r,t)=>{assert.equal(r.status,200);assert.match(t,/loadEvidence/);});
for(const path of [canonical+'?min_price=10&max_price=20',canonical+'?orderby=price','/global/c/smart-watches/','/global/c/smart-watches/?q=watch','/product-category/electronics-appliances/gadgets/smart-watches/','/ur/product/micro-fitted-waterproof-mattress-cover-protector-dust-mite-proof-machine-washable/?attribute_colour=Blue']){
 await check(path,(r,t)=>{const loc=r.headers.get('location');if(r.status===302&&path.startsWith('/global/c/smart-watches/')){const suffix=new URL(base+path).search;assert.equal(loc,base+'/#/global/c/smart-watches'+suffix);assert.match(r.headers.get('x-robots-tag')||'',/noindex/);return {redirect:loc,pendingPermanent:!suffix};}if([301,308].includes(r.status)){assert.ok(loc);const u=new URL(loc,base);assert.equal(u.origin,base);if(path==='/global/c/smart-watches/')assert.equal(u.href,base+canonical);return {redirect:u.href};}assert.equal(r.status,200);const canonicalTags=[...t.matchAll(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi)].map(x=>x[0]);const rob=r.headers.get('x-robots-tag')||'';return {canonicalTags,robots:rob,manualReview:true};});
}
await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/catalog-public-smoke.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out));if(out.some(x=>!x.ok))process.exitCode=1;
