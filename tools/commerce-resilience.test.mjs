import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(file)=>readFileSync(new URL('../assets/js/'+file,import.meta.url),'utf8');
const global=source('global.js'),woo=source('woo-bridge.js'),rails=source('cj-home-rails.js'),pdp=source('global-pdp.js');

test('CJ options use the actual same-origin variant API and retain supplier fallback',()=>{
  assert.match(global,/api\/cj\/variants\?pid=/);
  assert.match(rails,/api\/cj\/variants\?pid=/);
  assert.match(global,/indicativeRetailUsd\)\s*\/\s*MARGIN/);
  assert.match(rails,/indicativeRetailUsd\)\s*\/\s*1\.2/);
});
test('quota exhausted never causes repeated CJ attempts or a claimed purchase',()=>{
  assert.match(global,/e\.status === 429\) throw e/);
  assert.match(rails,/if\(e\.quota\)break/);
  assert.match(global,/No order has been placed/);
  assert.match(rails,/No order has been created/);
});
test('global product quote actions do not depend on an unavailable WooCommerce cart',()=>{
  assert.doesNotMatch(global,/fetch\('\/wp-json\/gdcs\/v1\/live\/cart'/);
  assert.doesNotMatch(global,/Verifying your selection with secure WooCommerce checkout/);
  assert.match(global,/window\.__gcAct = \{ add:/);
  assert.match(global,/adapter\.save\(source,chosen\.v,q,notes,ownUrl\(cs,r\)\)/);
  assert.match(global,/location\.assign\(adapter\.orderUrl\(cc\)\)/);
  assert.match(global,/No payment is taken/);
  const quote=source('global-quote-flow.js');
  assert.match(quote,/type:'cj'/);
  assert.match(quote,/requestOnly:true/);
});
test('store API quota failures do not get mistaken for successful local orders',()=>{
  assert.match(woo,/worker_limit/);
  assert.match(woo,/No item was added/);
  assert.match(pdp,/r\.status === 429/);
  assert.match(pdp,/No item was added/);
});

test('unverified CJ options allow unpaid quotation requests but never pretend payment or freight exists',()=>{
  assert.match(global,/setVerifiedOrderState\(false\)/);
  assert.match(global,/button\.disabled = false/);
  assert.match(global,/Describe your required size or colour in the notes field/);
  assert.match(global,/Request a final shipping quote/);
  assert.match(global,/No verified carrier rate is available/);
  assert.match(global,/form\.elements\.opt\.focus\(\)/);
  assert.doesNotMatch(global,/Calculating for your country…/);
  assert.doesNotMatch(global,/Final total pending shipping verification/);
});
test('local cart bridge requires WooCommerce JSON and does not call cart API for every empty visitor',()=>{
  assert.match(woo,/Array\.isArray\(x\.j\.items\)/);
  assert.match(woo,/cartCookiePresent\(\)/);
  assert.match(woo,/!cartCookiePresent\(\) \|\| quotaActive\(\)/);
  assert.match(woo,/quotaUntil = Date\.now\(\) \+ 120000/);
});
test('supplier API and shipping quote have bounded browser response times',()=>{
  assert.match(global,/AbortSignal\.timeout\(9000\)/);
  assert.match(global,/AbortSignal\.timeout\(10000\)/);
  assert.match(global,/Shipping cannot be confirmed until a supplier variation is verified/);
});

test('CJ live freight uses the published same-origin GET query and a bounded legacy fallback',()=>{
  assert.match(global,/fetch\('\/api\/cj\/shipping\?'\+p\.toString\(\),options\)/);
  assert.match(global,/data\.rates\.map\(m=>/);
  assert.match(global,/if\(live\.status===429\)/);
  assert.match(global,/W\+'\/api\/cj\/shipping'/);
  assert.match(global,/e\.quota\)/);
});
