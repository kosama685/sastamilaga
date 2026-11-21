// Cart bridge: woo-bridge.js uses the real WooCommerce cart (Store API) and explains every refusal honestly.
// Loads the real file in a sandbox with a mocked Store API; no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src = fs.readFileSync(new URL('../assets/js/woo-bridge.js', import.meta.url), 'utf8');

function load(handler) {
  const calls = [];
  const res = (status, body, headers = {}) => ({status, ok: status < 400, headers: {get: k => headers[k.toLowerCase()] ?? null}, json: async () => body});
  const fetch = async (url, o = {}) => {
    calls.push({url, method: o.method || 'GET', body: o.body ? JSON.parse(o.body) : null, nonce: o.headers?.Nonce});
    if (url.endsWith('data/wp/product-ids.json')) return res(200, {'hhc-1': 101, 'hhc-var': 202});
    if (url.endsWith('wp-json/wc/store/v1/cart') && (o.method || 'GET') === 'GET') return res(200, {items_count: 3}, {nonce: 'n' + calls.length});
    if (url.includes('gdcs/v1/context')) return res(200, {country: 'PK'});
    return handler(url, o, res, calls);
  };
  const el = () => ({style: {}, setAttribute() {}, appendChild() {}});
  const window = {location: {hostname: 'sastamilaga.com', search: '', pathname: '/', origin: 'https://sastamilaga.com', href: ''}, addEventListener() {}};
  const ctx = {window, location: window.location, fetch, URLSearchParams, setTimeout: () => 0, clearTimeout() {}, console, Promise, JSON, Math, parseInt, String, Boolean,
    localStorage: {getItem: () => null, setItem() {}}, history: {replaceState() {}},
    document: {readyState: 'complete', querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: el, addEventListener() {}, body: {appendChild() {}}, head: {appendChild() {}}}};
  vm.createContext(ctx); vm.runInContext(src, ctx);
  return {W: ctx.window.SMWoo, calls};
}

test('a Pakistan-session add goes to the real WooCommerce cart and sends the chosen variation', async () => {
  const {W, calls} = load((url, o, res) => res(201, {items_count: 1, items: []}));
  const r = await W.add('hhc-var', 2, [{attribute: 'pa_color', value: 'black'}]);
  assert.equal(r.ok, true);
  const add = calls.find(c => c.url.endsWith('cart/add-item'));
  assert.deepEqual(add.body, {id: 202, quantity: 2, variation: [{attribute: 'pa_color', value: 'black'}]});
  assert.ok(add.nonce, 'Store API nonce sent');
});
test('an expired nonce is refreshed once and the add is retried', async () => {
  let n = 0;
  const {W, calls} = load((url, o, res) => (++n === 1 ? res(403, {code: 'woocommerce_rest_invalid_nonce'}) : res(201, {items_count: 1, items: []})));
  assert.equal((await W.add('hhc-1', 1)).ok, true);
  assert.equal(calls.filter(c => c.url.endsWith('cart/add-item')).length, 2);
});
test('store refusals are mapped to clear reasons', async () => {
  for (const [code, reason] of [['woocommerce_rest_product_not_purchasable', 'not_purchasable'], ['woocommerce_rest_missing_attributes', 'choose_option'], ['woocommerce_rest_product_out_of_stock', 'out_of_stock']]) {
    const {W} = load((url, o, res) => res(400, {code, message: 'x'}));
    assert.equal((await W.add('hhc-1', 1)).reason, reason, code);
  }
  const {W, calls} = load(() => { throw new Error('should not be called'); });
  const r = await W.add('not-in-map', 1);
  assert.equal(r.reason, 'unmapped');
  assert.equal(calls.filter(c => c.url.endsWith('cart/add-item')).length, 0, 'no cart call for unmapped items');
});
test('decision table: success goes to WooCommerce /cart/ or /checkout/, refusals explain and offer the right next step', () => {
  const {W} = load(() => {});
  const wa = 'https://wa.me/923000000000?text=x';
  assert.deepEqual(JSON.parse(JSON.stringify(W.decide({ok: true}, true, wa))), {kind: 'go', href: '/checkout/'});
  assert.equal(W.decide({ok: true}, false, wa).link.href, '/cart/');
  const abroad = W.decide({ok: false, reason: 'not_purchasable'}, false, wa);
  assert.match(abroad.message, /Pakistan only/); assert.equal(abroad.link.href, '/global-shop/'); assert.equal(abroad.alt.href, wa);
  assert.equal(W.decide({ok: false, reason: 'choose_option'}, false, wa).link, null);
  assert.equal(W.decide({ok: false, reason: 'unmapped'}, false, wa).link.href, wa);
  assert.equal(W.decide({ok: false, reason: 'network'}, false, null).link, null);
});
test('guard-safe: no shopper-facing label the edge guard would swallow, and never the old static checkout', () => {
  const {W} = load(() => {});
  const guard = /add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i;
  for (const r of ['not_purchasable', 'choose_option', 'out_of_stock', 'unmapped', 'network', 'error']) {
    const d = W.decide({ok: false, reason: r}, false, 'https://wa.me/1');
    for (const l of [d.link, d.alt].filter(Boolean)) assert.doesNotMatch(l.label, guard, r);
  }
  assert.doesNotMatch(src, /location\.href\s*=\s*'\/#\/checkout'/);
  assert.doesNotMatch(src.replace(/W\.localAdd = function[\s\S]*?\n  \};/, ''), /W\.localAdd\(/, 'buttons no longer use the browser-only cart');
});

test('Cloudflare Worker quota denial is not mistaken for a cart update', async () => {
  const {W, calls} = load((url, opts, res) => res(429, null));
  const result = await W.add('hhc-1', 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'worker_limit');
  assert.equal(calls.filter(x => x.url.includes('cart/add-item')).length, 1);
  const decision = W.decide(result, false, 'https://wa.me/923343582295?text=item');
  assert.equal(decision.kind, 'refused');
  assert.match(decision.message, /No item was added/);
  assert.match(decision.link.href, /^https:\/\/wa.me\//);
});
test('non-nonce 403 is not blindly retried, avoiding repeated disallowed cart writes', async () => {
  const {W, calls} = load((url, opts, res) => res(403, {code:'forbidden',message:'Access refused'}));
  const result = await W.add('hhc-1', 1);
  assert.equal(result.ok, false);
  assert.equal(calls.filter(x => x.url.includes('cart/add-item')).length, 1);
});

test('an HTML fallback returning HTTP 200 is never counted as a WooCommerce cart update', async () => {
  const {W} = load((url, opts, res) => res(200, null));
  const result = await W.add('hhc-1', 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'service_unavailable');
});
