#!/usr/bin/env node
/**
 * Sasta Milaga emergency offline-capable supplier product lookup.
 *
 * Deterministically indexes every source catalogue shard into 1024 JSON
 * buckets as a GitHub Pages deployment build artifact. No D1 calls, private
 * keys, variants, live stock, estimated final checkout amounts or video URLs.
 * Idempotent: the index is regenerated from the same manifest on each deploy.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(process.cwd());
const DATA=path.join(ROOT,'data','cj');
const DEST=path.join(DATA,'lookup');
const manifestSrc=fs.readFileSync(path.join(DATA,'manifest.js'),'utf8');
const m=JSON.parse(manifestSrc.slice(manifestSrc.indexOf('{'),manifestSrc.lastIndexOf('}')+1));
if(!Array.isArray(m.cats)||m.cats.length<500||m.total<450000)throw new Error('Supplier manifest not complete: refuse publishing partial lookup');
const COUNT=1024;
const bucketOf=id=>{let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return(h>>>0)&(COUNT-1);};
const buckets=Array.from({length:COUNT},()=>Object.create(null));
let rowCount=0, duplicates=0, failures=[];
for(const cat of m.cats){
 const f=path.join(DATA,'c',cat.s+'.js');
 if(!fs.existsSync(f)){failures.push(cat.s);continue;}
 const txt=fs.readFileSync(f,'utf8');
 const match=/^SM_CJ_SHARD\("([^"]+)",(\[[\s\S]*\])\);\s*$/.exec(txt);
 if(!match||match[1]!==cat.s){failures.push(cat.s+':bad_format');continue;}
 const rows=JSON.parse(match[2]);
 if(rows.length!==cat.c){failures.push(cat.s+':count_mismatch_'+rows.length);continue;}
 for(const x of rows){
  const id=String(x?.[0]||'').toUpperCase();
  if(!/^(?:[0-9]{19}|[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12})$/.test(id))throw new Error('Unsafe product ID in supplier snapshot');
  const name=String(x?.[2]||'').trim().slice(0,500);
  if(!name)throw new Error('Product with missing name cannot be indexed into snapshot');
  const b=buckets[bucketOf(id)];
  if(Object.prototype.hasOwnProperty.call(b,id)){duplicates++;continue;}
  // Exact product reference maps to verified snapshot title, SKU, category and original supplier image only.
  b[id]=[String(x?.[1]||'').slice(0,125),name,cat.n,cat.s,String(x?.[5]||'').slice(0,700)];
  rowCount++;
 }
}
if(failures.length)throw new Error('Catalogue shards incomplete: '+failures.slice(0,9).join(', '));
if(rowCount+duplicates!==m.total)throw new Error('All supplier rows not covered: '+rowCount+'+'+duplicates+' vs '+m.total);
if(rowCount<450000||duplicates>1000)throw new Error('Unexpected supplier ID duplicates/missing records');
for(const id of ['1830116277370114048','87FD613D-EEC7-474A-A408-02C9DCC6E9E2']){
 if(!buckets[bucketOf(id)][id])throw new Error('Critical smoke-test product missing: '+id);
}
fs.mkdirSync(DEST,{recursive:true});
let bytes=0;
for(let i=0;i<COUNT;i++){
 const key=i.toString(16).padStart(3,'0');
 const payload=JSON.stringify({snapshot:m.snapshot,count:Object.keys(buckets[i]).length,items:buckets[i]});
 const f=path.join(DEST,key+'.json');
 fs.writeFileSync(f,payload);
 bytes+=Buffer.byteLength(payload);
}
const index={snapshot:m.snapshot,source_catalogue_rows:m.total,unique_ids:rowCount,duplicates,shards:COUNT,bytes,source_snapshot_date:m.snapshot,allow_indexing:false,note:'Static D1-failure recovery lookup only. Never evidence of live stock, approved content, pricing or product eligibility.'};
fs.writeFileSync(path.join(DEST,'manifest.json'),JSON.stringify(index,null,2));
console.log(JSON.stringify({status:'success',...index}));
