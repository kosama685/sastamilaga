import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const script=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'export-cj-product-evidence.mjs');
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'cj-category-proof-'));
 const input=path.join(root,'data/cj/lookup'),out=path.join(root,'out');
 fs.mkdirSync(input,{recursive:true});
 const A='87FD613D-EEC7-474A-A408-02C9DCC6E9E2';
 fs.writeFileSync(path.join(input,'manifest.json'),JSON.stringify({snapshot:'2026-11-05',source_catalogue_rows:3,unique_ids:3,shards:2,allow_indexing:false}));
 fs.writeFileSync(path.join(input,'000.json'),JSON.stringify({snapshot:'2026-11-05',count:2,items:{
  [A]:['CJ-Q','Test garden light','Garden Tools','garden-tools','https://example.com/garden.png'],
  '2111278541410217985':['CJ-R','Test greenhouse','Garden Tools','garden-tools','https://example.com/g.jpg']
 }}));
 fs.writeFileSync(path.join(input,'001.json'),JSON.stringify({snapshot:'2026-11-05',count:1,items:{
  '2003370861502812162':['CJ-S','Test cleanser','Beauty','beauty','']
 }}));
 return {root,input,out,A};
}
test('exports one quarantined JSON per supplier ID, grouped by category, no omissions',()=>{
 const f=fixture();
 try{
  const r=spawnSync(process.execPath,[script],{cwd:f.root,env:{...process.env,CJ_LOOKUP_ROOT:f.input,CJ_EXPORT_OUT:f.out},encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  const stats=JSON.parse(fs.readFileSync(path.join(f.out,'completeness.json')));
  assert.equal(stats.sourceRecords,3);assert.equal(stats.uniqueProductIds,3);
  assert.equal(stats.perProductFilesInsideTar,3);assert.equal(stats.categoryDirectories,2);
  assert.equal(stats.indexEligibleFromSource,0);assert.equal(stats.missingImage,1);
  const tar=spawnSync('tar',['-tzf',path.join(f.out,'category-product-files.tar.gz')],{encoding:'utf8'});
  assert.equal(tar.status,0,tar.stderr);
  const names=tar.stdout.trim().split('\n').filter(Boolean);
  assert.equal(names.length,3);
  assert.ok(names.some(x=>x.endsWith('/'+f.A+'.json')),'Original UUID filename must be preserved');
  const entry=spawnSync('tar',['-xOzf',path.join(f.out,'category-product-files.tar.gz'),names[0]],{encoding:'utf8'});
  assert.equal(entry.status,0,entry.stderr);
  const item=JSON.parse(entry.stdout);
  assert.equal(item.googleIndexEligible,false);assert.equal(item.merchantEligible,false);
  assert.equal(item.productOffer,null);assert.equal(item.canonical,null);
  assert.ok(item.blockedReasons.includes('unverified_current_stock'));
 }finally{fs.rmSync(f.root,{recursive:true,force:true})}
});
test('fail closed on catalog shards with duplicated supplier IDs',()=>{
 const f=fixture();
 try{
  const p=path.join(f.input,'001.json'),o=JSON.parse(fs.readFileSync(p));
  o.items={[f.A]:['CJ-S','Duplicate','Beauty','beauty','https://example.com/x.jpg']};
  fs.writeFileSync(p,JSON.stringify(o));
  const r=spawnSync(process.execPath,[script],{cwd:f.root,env:{...process.env,CJ_LOOKUP_ROOT:f.input,CJ_EXPORT_OUT:f.out},encoding:'utf8'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/Duplicate CJ ID/);
 }finally{fs.rmSync(f.root,{recursive:true,force:true})}
});
