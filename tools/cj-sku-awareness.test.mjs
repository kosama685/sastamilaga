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
test('homepage CJ option dialog adds the exact supplier option to the site cart; Buy now opens the static checkout',()=>{
 assert.match(rails,/store\.addCj\(\{/);
 assert.match(rails,/vkey:String\(v\.sku\|\|v\.vid\)/);
 assert.match(rails,/if\(!v\?\.sku\|\|!v\?\.vid\)/);   // never an unidentified option
 assert.match(rails,/location\.assign\(store\.checkoutUrl\(\)\)/);
 assert.doesNotMatch(rails,/woo\.add|SMWoo/);   // no WooCommerce dependency
});
