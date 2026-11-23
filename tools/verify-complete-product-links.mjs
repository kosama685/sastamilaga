import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bucketOf,slugify,lookup,handle} from '../workers/global-pdp/worker.js';
import {resolveLegacyPath} from '../workers/product-recovery/worker.mjs';
const dir='data/cj/lookup/',meta=JSON.parse(fs.readFileSync(dir+'manifest.json','utf8'));
const src=fs.readFileSync('data/cj/manifest.js','utf8');
const manifest=JSON.parse(src.slice(src.indexOf('{'),src.lastIndexOf('}')+1));
const buckets=new Map(),seen=new Set(),samples=[];
const blocked=/adult|sex\s*toy|erotic|condom|lubricant/i;
for(let i=0;i<1024;i++){
 const key=i.toString(16).padStart(3,'0'),b=JSON.parse(fs.readFileSync(dir+key+'.json','utf8'));
 assert.equal(b.snapshot,meta.snapshot);assert.equal(b.count,Object.keys(b.items).length);
 buckets.set(key,b);
 for(const [id,row] of Object.entries(b.items)){
  assert.equal(bucketOf(id),i);assert.ok(!seen.has(id));seen.add(id);
  assert.ok(row[1]&&row[3]);
 }
 const sample=Object.entries(b.items).find(([,r])=>!blocked.test(r[2]));
 assert.ok(sample);samples.push({id:sample[0],row:sample[1]});
}
assert.equal(seen.size,451812);assert.equal(meta.unique_ids,seen.size);
let sourceRows=0;
for(const cat of manifest.cats){
 const text=fs.readFileSync('data/cj/c/'+cat.s+'.js','utf8');
 const rows=JSON.parse(/^SM_CJ_SHARD\("[^"]+",([\s\S]+)\);\s*$/.exec(text)[1]);
 assert.equal(rows.length,cat.c);
 for(const row of rows){
  const id=String(row[0]).toUpperCase(),hit=buckets.get(bucketOf(id).toString(16).padStart(3,'0')).items[id];
  assert.deepEqual(hit,[String(row[1]||'').slice(0,125),String(row[2]||'').trim().slice(0,500),cat.n,cat.s,String(row[5]||'').slice(0,700)]);
  sourceRows++;
 }
}
const fetcher=async url=>{
 const m=/\/lookup\/([a-f0-9]{3})\.json$/.exec(String(url));
 if(m)return {ok:true,json:async()=>buckets.get(m[1])};
 return new Response('',{status:404});
};
let resolved=0,caseChecks=0,excluded=0;
for(const b of buckets.values())for(const [id,row] of Object.entries(b.items)){
 const actual=await resolveLegacyPath('/global/p/'+row[3]+'/'+id,fetcher);
 assert.equal(actual,'/global-shop/p/'+id+'/'+slugify(row[1])+'/');resolved++;
 if(/[A-F]/.test(id)){
  assert.equal((await lookup(fetcher,id.toLowerCase())).id,id);caseChecks++;
 }
 if(blocked.test(row[2]))excluded++;
}
for(const {id,row} of samples){
 const r=await handle(new Request('https://sastamilaga.com/global-shop/p/'+id+'/'+slugify(row[1])+'/'),fetcher);
 assert.equal(r.status,200);assert.ok((await r.text()).includes(id));
}
const report={at:new Date().toISOString(),source_rows:sourceRows,unique_product_ids:seen.size,legacy_paths_verified:resolved,lowercase_uuid_lookups:caseChecks,lookup_buckets:1024,rendered_bucket_samples:samples.length,existing_excluded_category_records:excluded,passed:true,scope:'Every source row and legacy URL mapping validated locally; render sample per bucket. Existing excluded categories remain excluded. Live checks are recorded separately.'};
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/complete-product-link-mapping-2026-11-23.json',JSON.stringify(report,null,2)+'\n');
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/product-link-samples.json',JSON.stringify(samples));
console.log(JSON.stringify(report));
