import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../assets/js/cj-home-rails.js',import.meta.url),'utf8');
test('CJ buttons require real WooCommerce add-item acknowledgement',()=>{
 assert.match(code,/await woo\.add\(String\(v\.sku\),n\)/);
 assert.match(code,/if\(!saved\?\.ok\)/);
 assert.match(code,/dialog\.close\(\);[\s\S]{0,150}if\(action==='buy'\)location\.assign\('\/checkout\/'\)/);
});
test('CJ cards never create a fake local cart transaction',()=>{
 assert.doesNotMatch(code,/SMGCart\?\.addVerified|localStorage\.setItem\(['"]sm_gcart/);
 assert.match(code,/No order has been created/);
});
test('CJ actions intercept document-level checkout guards without touching normal commerce',()=>{
 assert.match(code,/window\.addEventListener\('click',[\s\S]*?stopImmediatePropagation\(\)[\s\S]*?},true\)/);
 assert.match(code,/host\.contains\(btn\)/);
 assert.match(code,/window\.SMWoo/);
});
