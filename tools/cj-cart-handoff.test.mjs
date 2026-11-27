import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../assets/js/cj-home-rails.js',import.meta.url),'utf8');
test('CJ quick buy adds the exact option to the site cart; Buy now continues to the static checkout (20 November flow, restored 2026-11-22)',()=>{
 assert.match(code,/const res=store\.addCj\(\{id:String\(r\[0\]\),sku:String\(v\.sku\)/);
 assert.match(code,/if\(!res\.ok\)\{status\.textContent=res\.message;return;\}/);
 assert.match(code,/dialog\.close\(\);[\s\S]{0,80}if\(action==='buy'\)\{location\.assign\(store\.checkoutUrl\(\)\);return;\}/);
});
test('CJ cards never create a fake local cart transaction',()=>{
 assert.doesNotMatch(code,/SMGCart\?\.addVerified|localStorage\.setItem\(['"]sm_gcart/);
 assert.match(code,/No order has been created/);
});
test('CJ actions intercept document-level checkout guards without touching normal commerce',()=>{
 assert.match(code,/window\.addEventListener\('click',[\s\S]*?stopImmediatePropagation\(\)[\s\S]*?},true\)/);
 assert.match(code,/host\.contains\(btn\)/);
 assert.match(code,/const store=window\.SMStore;/);
});
