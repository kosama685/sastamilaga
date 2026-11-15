import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../assets/js/',import.meta.url);
const woo=readFileSync(new URL('woo-bridge.js',base),'utf8');
const rails=readFileSync(new URL('cj-home-rails.js',base),'utf8');
test('Woo bridge checks existing SKU map without creating products',()=>{
 assert.match(woo,/W\.hasSKU = function \(sku\)/);
 assert.match(woo,/Boolean\(map && map\[String\(sku\)\]\)/);
});
test('unsynced CJ options use real WhatsApp order instead of empty checkout',()=>{
 assert.match(rails,/confirm\.textContent='Request this option on WhatsApp'/);
 assert.match(rails,/if\(isMapped!==true\)/);
 assert.match(rails,/window\.open\(wa\.href/);
 assert.match(rails,/const saved=await woo\.add/);
 assert.match(rails,/if\(!saved\?\.ok\)/);
 assert.match(rails,/if\(action==='buy'\)location\.assign\('\/checkout\/'\)/);
});
