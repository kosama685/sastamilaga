// Saves real CJ shipping methods, prices and transit days per country for ONE small sample parcel (1 x 50 g item, from China),
// so the Shipping page can show country-wise numbers without any server. Exact prices depend on weight and are quoted per
// product (workers/cj-shipping) or confirmed before payment.
// Usage (on a computer that has the key; the key is never written to the output):
//   CJ_API_KEY=... node tools/cj-shipping-sample.mjs      or keep it in workers/cj-shipping/.dev.vars (git-ignored)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
let key = process.env.CJ_API_KEY;
if (!key) { try { key = fs.readFileSync(path.join(ROOT, 'workers/cj-shipping/.dev.vars'), 'utf8').match(/CJ_API_KEY="([^"]+)"/)[1]; } catch (e) { } }
if (!key) { console.error('Set CJ_API_KEY or create workers/cj-shipping/.dev.vars'); process.exit(1); }
const CJ = 'https://developers.cjdropshipping.com/api2.0/v1', sleep = ms => new Promise(r => setTimeout(r, ms));
const SAMPLE = { pid: '2608191043311610500', vid: '2608191043311613500', name: 'Hair care essential oil 30 ml', weightG: 50 };
const market = fs.readFileSync(path.join(ROOT, 'assets/js/market.js'), 'utf8');
const countries = [...new Set([...market.slice(market.indexOf('var CUR = {'), market.indexOf('};', market.indexOf('var CUR = {'))).matchAll(/\b([A-Z]{2}):'[A-Z]{3}'/g)].map(m => m[1]))];
async function call(p, init) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(CJ + p, init), d = await r.json().catch(() => ({}));
    if (r.status === 429 || /QPS limit|Too Many Requests/i.test(d.message || '')) { await sleep(1300 * (a + 1)); continue; }
    return d;
  }
  return {};
}
const auth = await call('/authentication/getAccessToken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) });
if (!auth.data || !auth.data.accessToken) { console.error('CJ auth failed:', auth.message); process.exit(1); }
const token = auth.data.accessToken, out = { generated: new Date().toISOString().slice(0, 10), from: 'CN', currency: 'USD', sample: SAMPLE, countries: {}, unavailable: [] };
const file = path.join(ROOT, 'data/shipping/cj-sample.json'); fs.mkdirSync(path.dirname(file), { recursive: true });
let n = 0;
for (const cc of countries) {
  await sleep(1150);
  const d = await call('/logistic/freightCalculate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token }, body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: cc, products: [{ quantity: 1, vid: SAMPLE.vid }] }) });
  const m = ((d && d.data) || []).map(x => ({ name: x.logisticName, price: Number(x.logisticPrice), days: x.logisticAging })).filter(x => x.name && x.price >= 0).sort((a, b) => a.price - b.price);
  if (m.length) out.countries[cc] = m.slice(0, 8); else out.unavailable.push(cc);
  if (++n % 20 === 0) { fs.writeFileSync(file, JSON.stringify(out)); console.log(`${n}/${countries.length}`); }
}
fs.writeFileSync(file, JSON.stringify(out));
console.log(`done: ${Object.keys(out.countries).length} countries with CJ shipping, ${out.unavailable.length} without; ${file}`);
