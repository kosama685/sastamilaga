import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=fs.readFileSync('reports/gsc-403-2026-11-16.txt','utf8').split(/\r?\n/).filter(x=>x.startsWith('https://'));
test('owner-provided historical 403 inventory has all 699 unique URLs',()=>{
  assert.equal(data.length,699);
  assert.equal(new Set(data).size,699);
  assert.ok(data.includes('https://sastamilaga.com/'));
  assert.ok(data.every(u=>{const x=new URL(u);return x.protocol==='https:'&&x.hostname==='sastamilaga.com';}));
});
test('shopping mutation URLs remain distinct from indexable pages',()=>{
 const count=data.filter(u=>new URL(u).searchParams.has('add-to-cart')).length;
 assert.equal(count,208);
 const script=fs.readFileSync('tools/audit-gsc-403.mjs','utf8');
 assert.match(script,/SHOPPING_ACTION_DO_NOT_CRAWL/);
 assert.match(script,/PRIVATE_COMMERCE_DO_NOT_INDEX/);
 assert.match(script,/NOT_PROBED_INTENTIONALLY/);
 assert.match(script,/redirect:'manual'/);
});
