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
test('legacy global product actions require a real WooCommerce cart acknowledgement',()=>{
  assert.match(global,/fetch\('\/wp-json\/gdcs\/v1\/live\/cart'/);
  assert.match(global,/if \(!result\.ok \|\| !data\.added\)/);
  assert.match(global,/String\(variant\.vid\)/);
  assert.doesNotMatch(global,/window\.__gcAct = \{ add: \(\) => \{ if \(addRow\(\)\)/);
});
test('store API quota failures do not get mistaken for successful local orders',()=>{
  assert.match(woo,/worker_limit/);
  assert.match(woo,/No item was added/);
  assert.match(pdp,/r\.status === 429/);
  assert.match(pdp,/No item was added/);
});
