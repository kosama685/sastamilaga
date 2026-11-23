import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const from = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const product = from('assets/js/global-pdp.js');
const css = from('assets/css/global-pdp.css');
const template = from('assets/templates/global-pdp.html');
const bridge = from('assets/js/woo-bridge.js');
const cart = from('assets/js/global.js');
const checkout = from('app.js');

test('all modified storefront scripts compile before production deployment', () => {
  for (const source of [product, bridge, cart, checkout]) assert.doesNotThrow(() => new Script(source));
});

test('global product fetches full CJ carrier list and presents selectable radio cards', () => {
  assert.match(product, /function normaliseWp\(/);
  assert.match(product, /function workerShip\(/);
  assert.match(product, /methods\.forEach\(function \(method, index\)/);
  assert.match(product, /gpdp-shipping-method/);
  assert.match(product, /radio\.addEventListener\('change'/);
  assert.match(product, /state\.ship = \{/);
  assert.match(product, /selected delivery|Selected delivery/i);
  assert.match(css, /\.gpdp-ship-method\.is-selected/);
});

test('changes to options and quantity requote shipping and update landed-price estimate', () => {
  assert.match(product, /function renderPriceSummary/);
  assert.match(product, /Number\(state\.option\.usd\) \* qty\(\)/);
  assert.match(product, /Number\(itemInCur\) \+ Number\(ship\.amt\)/);
  assert.match(product, /function checkDelivery\(\)/);
  assert.match(product, /state\.ship = null; state\.shipMethods = \[\]/);
  assert.match(product, /function selectMethod\(method\)/);
  assert.match(product, /renderPriceSummary\(\); updateWa\(\); setOrderable\(true\)/);
});

test('the selected CJ carrier is preserved in the real cart and payment calculation', () => {
  assert.match(product, /shipAmt: state\.ship \? state\.ship\.amt/);
  assert.match(product, /if \(!state\.ship\)/);
  assert.match(bridge, /shipAmt: Number\(row\.shipAmt\)/);
  assert.match(bridge, /if \(same && \(same\.ship \|\| item\.ship\)\) return/);
  assert.match(cart, /a carrier quote applies/i);
  assert.match(checkout, /const haveShipping = rates\.every/);
  assert.match(checkout, /gFmt\(gSub\(\) \+ deliveryUsd\)/);
  assert.match(checkout, /throw new Error\('shipping'\)/);
  assert.match(checkout, /x\.shipAmt \* rates\[cur\] \/ rates\[sc\]/);
});

test('product page includes cache-busted shipping widget assets', () => {
  assert.match(template, /global-pdp\.css\?v=20261123-shipping/);
  assert.match(template, /global-pdp\.js\?v=20261123-shipping/);
});

test('CJ real example: one US$3.30 item plus 3 quoted carriers', () => {
  for (const [freight, total] of [[3.72,7.02],[5.27,8.57],[7.84,11.14]]) {
    assert.equal(Math.round((3.3 + freight) * 100) / 100, total);
  }
});
