#!/usr/bin/env node
/**
 * Purchasability probe for the cart bridge. NO ORDER IS EVER CREATED: it only uses the Store API cart
 * (add-item, then remove-item) inside one anonymous session, after setting the session country through the
 * store's own preference endpoint (POST /wp-json/gdcs/v1/context), the same call assets/js/woo-bridge.js makes.
 * Sequential, one request at a time, short pauses (the host is easily overloaded).
 *
 * Usage: node tools/probe-woo-purchasable.mjs [country=PK] [sample=20]  -> data/cart/purchasable-probe.json
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const O = 'https://sastamilaga.com', country = (process.argv[2] || 'PK').toUpperCase(), N = +process.argv[3] || 20;
const jar = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(p, o = {}) {
  const headers = {accept: 'application/json', 'user-agent': 'Mozilla/5.0 cart-bridge-probe', ...(o.headers || {})};
  if (jar.size) headers.cookie = [...jar].map(([k, v]) => k + '=' + v).join('; ');
  const r = await fetch(O + p, {...o, headers, signal: AbortSignal.timeout(90000)});
  for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
  const j = await r.json().catch(() => null); await sleep(700);
  return {status: r.status, j, nonce: r.headers.get('nonce')};
}
const ids = await (await fetch(O + '/data/wp/product-ids.json')).json();
const keys = Object.keys(ids), step = Math.max(1, Math.floor(keys.length / N));
const sample = Array.from({length: N}, (_, i) => keys[i * step]).filter(Boolean);

const ctx = await req('/wp-json/gdcs/v1/context');
const set = await req('/wp-json/gdcs/v1/context', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-GDCS-CSRF': ctx.j?.csrf || ''},
  body: JSON.stringify({country, currency: country === 'PK' ? 'PKR' : (ctx.j?.currency || 'USD'), language: 'en', csrf: ctx.j?.csrf || ''})});
const check = await req('/wp-json/gdcs/v1/context');
let {nonce} = await req('/wp-json/wc/store/v1/cart');
const results = [];
for (const sku of sample) {
  const id = ids[sku], prod = await req('/wp-json/wc/store/v1/products/' + id);
  const type = prod.j?.type || (prod.status === 200 ? 'unknown' : 'not-visible');
  let variation = [];
  if (type === 'variable') {
    const v = (prod.j.variations || [])[0];
    variation = (v?.attributes || []).map(a => ({attribute: a.name, value: a.value}));
  }
  const body = {id: type === 'variable' && prod.j.variations?.[0] ? prod.j.variations[0].id : id, quantity: 1, ...(variation.length ? {variation} : {})};
  let add = await req('/wp-json/wc/store/v1/cart/add-item', {method: 'POST', headers: {'Content-Type': 'application/json', Nonce: nonce}, body: JSON.stringify(body)});
  if (add.status === 403) { nonce = (await req('/wp-json/wc/store/v1/cart')).nonce; add = await req('/wp-json/wc/store/v1/cart/add-item', {method: 'POST', headers: {'Content-Type': 'application/json', Nonce: nonce}, body: JSON.stringify(body)}); }
  if (add.nonce) nonce = add.nonce;
  const ok = add.status === 200 || add.status === 201;
  const item = ok ? (add.j.items || []).find(x => x.id === body.id) : null;
  if (item) { const rm = await req('/wp-json/wc/store/v1/cart/remove-item', {method: 'POST', headers: {'Content-Type': 'application/json', Nonce: nonce}, body: JSON.stringify({key: item.key})}); if (rm.nonce) nonce = rm.nonce; }
  results.push({sku, id, type, purchasableFlag: prod.j?.is_purchasable ?? null, inStock: prod.j?.is_in_stock ?? null, sentVariation: variation.length > 0,
    addStatus: add.status, ok, code: ok ? null : add.j?.code || null, message: ok ? null : String(add.j?.message || '').replace(/<[^>]+>|&quot;/g, '').slice(0, 140)});
  console.log(sku, type, add.status, ok ? 'OK' : add.j?.code);
}
const out = {probedAt: new Date().toISOString(), country, sessionCountryAfterSet: check.j?.country ?? null, contextSetStatus: set.status, orderCreated: false,
  summary: {sampled: results.length, accepted: results.filter(r => r.ok).length, byCode: results.reduce((m, r) => (m[r.code || 'OK'] = (m[r.code || 'OK'] || 0) + 1, m), {})}, results};
fs.mkdirSync(path.join(root, 'data/cart'), {recursive: true});
fs.writeFileSync(path.join(root, `data/cart/purchasable-probe-${country}.json`), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({country, sessionCountry: out.sessionCountryAfterSet, ...out.summary}));
