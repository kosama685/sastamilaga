#!/usr/bin/env node
/**
 * Read-only survey: does CJ return shipping options for ONE sample product to each country in the market picker?
 * Evidence only. It is an indicative quote for a single sample item (1 unit); it is NOT a commercial agreement,
 * a delivery guarantee, a tax statement or proof that checkout works for that country.
 * Sequential and throttled (default 1.5 s between calls) through the store's own /api/cj/shipping endpoint.
 * Usage: node tools/survey-cj-shipping.mjs [pid] [vid]   -> data/landing/country-shipping-evidence.json
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://sastamilaga.com/api/cj/';
const pid = process.argv[2] || '1830116277370114048';
const code = fs.readFileSync(path.join(root, 'assets/js/market.js'), 'utf8');
const CUR = vm.runInNewContext('(' + code.match(/var CUR = (\{[^;]+\});/)[1] + ')');
const countries = Object.keys(CUR).sort();
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(30000), headers: {accept: 'application/json'}});
      const body = await r.json().catch(() => null);
      if (r.ok) return {status: r.status, body};
      if (r.status === 400) return {status: r.status, body};
      await sleep(2500 * (i + 1));
    } catch { await sleep(2500 * (i + 1)); }
  }
  return {status: 0, body: null};
}
const v = await get(`${API}variants?pid=${pid}`);
const variant = (v.body?.variants || [])[0];
if (!variant) throw new Error('no variant for sample product');
const out = {sample: {pid, vid: variant.vid, sku: variant.sku, weightG: variant.weightG, quantity: 1}, observedOn: new Date().toISOString().slice(0, 10),
  note: 'Indicative CJ quote for one sample item. Not a commercial agreement, delivery guarantee, tax statement or checkout test.', results: {}};
let n = 0;
for (const c of countries) {
  const r = await get(`${API}shipping?pid=${pid}&vid=${variant.vid}&country=${c}&quantity=1`);
  const rates = (r.body?.rates || []).filter(x => x && x.carrier && isFinite(+x.shippingUsd));
  out.results[c] = r.status === 200
    ? {http: 200, methods: rates.length, minShippingUsd: rates.length ? Math.min(...rates.map(x => +x.shippingUsd)) : null,
       fastestEtaDays: rates.length ? rates.map(x => String(x.eta || '')).filter(Boolean).sort((a, b) => parseInt(a) - parseInt(b))[0] || null : null,
       carriers: [...new Set(rates.map(x => x.carrier))].slice(0, 6)}
    : {http: r.status, methods: null, error: r.body?.error || 'request_failed'};
  n++; if (n % 25 === 0) console.log(n + '/' + countries.length);
  await sleep(1500);
}
fs.mkdirSync(path.join(root, 'data/landing'), {recursive: true});
fs.writeFileSync(path.join(root, 'data/landing/country-shipping-evidence.json'), JSON.stringify(out, null, 1) + '\n');
const ok = Object.values(out.results).filter(x => x.methods > 0).length, none = Object.values(out.results).filter(x => x.http === 200 && x.methods === 0).length, fail = Object.values(out.results).filter(x => x.http !== 200).length;
console.log(JSON.stringify({countries: countries.length, withMethods: ok, noMethods: none, requestFailed: fail}));
