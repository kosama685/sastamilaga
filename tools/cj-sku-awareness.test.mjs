import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../assets/js/',import.meta.url);
const woo=readFileSync(new URL('wordpress-checkout.js',base),'utf8');
const rails=readFileSync(new URL('cj-home-rails.js',base),'utf8');
test('optional WordPress handoff checks the existing SKU map without creating products',()=>{
 assert.match(woo,/request\('\/data\/wp\/product-ids\.json'\)/);
 assert.match(woo,/!map\[row\.sku\]&&!map\[row\.id\]/);
 assert.doesNotMatch(woo,/\/wc\/v3\/products/);
});

test('CJ quick buy keeps exact supplier options without requiring a Woo SKU mapping',()=>{
 assert.match(rails,/adapter\.save\(/);
 assert.match(rails,/if\(!saved\?\.ok\)/);
 assert.match(rails,/adapter\.orderUrl/);
 assert.match(rails,/confirm\.textContent=action==='buy'\?'Buy now':'Add to cart'/);
 assert.doesNotMatch(rails,/woo\.hasSKU|woo\.add/);
});
