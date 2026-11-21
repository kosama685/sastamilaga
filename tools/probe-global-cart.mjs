#!/usr/bin/env node
/**
 * Global cart probe: proves a CJ item can be put in the REAL WooCommerce cart through the store's own endpoint
 * (POST /wp-json/gdcs/v1/live/cart, GDCS VirtualCheckout), then removes it. NO ORDER IS CREATED.
 * One fresh anonymous session per case, sequential requests (the host is easily overloaded).
 * Usage: node tools/probe-global-cart.mjs [pid:vid:COUNTRY ...]
 */
const O = 'https://sastamilaga.com';
const cases = (process.argv.slice(2).length ? process.argv.slice(2) : [
  '1988880782439141377:1988880782703382529:SA', '1988880782439141377:1988880782703382529:US', '1830116277370114048::SA'
]).map(s => { const [pid, vid, cc] = s.split(':'); return {pid, vid, cc}; });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function session() {
  const jar = new Map();
  const req = async (p, o = {}) => {
    const headers = {accept: 'application/json', 'user-agent': 'Mozilla/5.0 global-cart-probe', ...(o.headers || {})};
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => k + '=' + v).join('; ');
    const r = await fetch(O + p, {...o, headers, signal: AbortSignal.timeout(120000)});
    for (const c of r.headers.getSetCookie?.() || []) { const kv = c.split(';')[0]; const i = kv.indexOf('='); jar.set(kv.slice(0, i), kv.slice(i + 1)); }
    const j = await r.json().catch(() => null); await sleep(600);
    return {status: r.status, j, nonce: r.headers.get('nonce')};
  };
  return {req, jar};
}
const results = [];
for (const c of cases) {
  const {req, jar} = await session();
  if (!c.vid) { const v = await (await fetch(`${O}/api/cj/variants?pid=${c.pid}`, {headers: {referer: O + '/'}})).json(); c.vid = v.variants?.[0]?.vid; }
  const ctx = await req('/wp-json/gdcs/v1/context');
  const csrf = ctx.j?.csrf || decodeURIComponent(jar.get('gdcs_csrf') || '');
  const set = await req('/wp-json/gdcs/v1/context', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-GDCS-CSRF': csrf},
    body: JSON.stringify({country: c.cc, currency: 'USD', language: 'en', csrf})});
  const csrf2 = decodeURIComponent(jar.get('gdcs_csrf') || '') || csrf;
  const add = await req('/wp-json/gdcs/v1/live/cart', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-GDCS-CSRF': csrf2},
    body: JSON.stringify({pid: c.pid, vid: c.vid, quantity: 1})});
  const cart = await req('/wp-json/wc/store/v1/cart');
  const items = cart.j?.items || [];
  let removed = null;
  for (const it of items) { const rm = await req('/wp-json/wc/store/v1/cart/remove-item', {method: 'POST', headers: {'Content-Type': 'application/json', Nonce: cart.nonce}, body: JSON.stringify({key: it.key})}); removed = rm.status; }
  const row = {case: `${c.pid}:${c.vid}:${c.cc}`, contextSet: set.status, sessionCountry: set.j?.country ?? null, addStatus: add.status,
    added: !!add.j?.added, message: add.j?.message || null, cartItems: items.length, cartTotal: cart.j?.totals ? cart.j.totals.total_price + ' ' + cart.j.totals.currency_code + ' (minor units ' + cart.j.totals.currency_minor_unit + ')' : null,
    itemName: items[0]?.name || null, removedStatus: removed, orderCreated: false};
  results.push(row); console.log(JSON.stringify(row));
}
