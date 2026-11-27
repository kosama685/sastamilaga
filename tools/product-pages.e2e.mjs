// Real-browser check of local and CJ product pages on the LIVE site with the LOCAL product scripts/CSS injected.
// Nothing is ordered or submitted: Add to cart only writes the browser's request cart (localStorage), Buy now only opens /order/.
// Failure modes are simulated by intercepting requests (WordPress down or slow, CJ Worker down).
// Usage: node tools/product-pages.e2e.mjs [repoRoot] [screenshotDir]   (puppeteer-core + Chrome; CHROME env var for the path)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const repo = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\/$/, ''), shots = process.argv[3] || '';
const LOCAL = {};
for (const [path, type] of [['/assets/js/global.js', 'text/javascript'], ['/assets/js/global-pdp.js', 'text/javascript'], ['/assets/js/woo-bridge.js', 'text/javascript'], ['/assets/js/pdp-static.js', 'text/javascript'], ['/assets/css/global-pdp.css', 'text/css'], ['/assets/theme/static-bundle.css', 'text/css'], ['/styles.css', 'text/css'], ['/app.js', 'text/javascript'], ['/assets/js/cj-home-rails.js', 'text/javascript']]) LOCAL[path] = [type, fs.readFileSync(repo + path, 'utf8')];
const LOCAL_PDP = 'https://sastamilaga.com/p/raf-professional-electric-coffee-spice-grinder-300w-high-power-stainless-steel-m-hhc-3759872.html';
const CJ_PDP = 'https://sastamilaga.com/global-shop/p/1368068170002337792/leather-business-handbag-super-soft-large-capacity-wash-bag/';
const SPA_PDP = 'https://sastamilaga.com/global-shop/#/global/p/luggage-and-travel-bags/1358774418171629568';
const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function open(url, sim = {}) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width: 1366, height: 900 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem('sm_market', JSON.stringify({ country: 'PK', currency: 'PKR', lang: 'en' })); localStorage.removeItem('sm_cart'); localStorage.removeItem('sm_gcart'); } catch (_) {} });
  const seen = { notFound: [], errs: [], local: 0, gpdp: 0, worker: 0, wpOptions: 0 };
  p.on('pageerror', e => { if (!/ViewTransition|Transition was aborted/.test(e.message)) seen.errs.push(e.message.slice(0, 160)); });
  p.on('response', r => { if (r.status() === 404 && /\/assets\//.test(r.url())) seen.notFound.push(r.url()); });
  await p.setRequestInterception(true);
  p.on('request', async r => {
    const u = new URL(r.url());
    if (/\.(png|jpe?g|webp|gif|mp4)(\?|$)/.test(u.pathname) || /cloudflareinsights|clarity|googletagmanager|facebook/.test(u.host)) return r.abort();
    if (u.origin === 'https://sastamilaga.com' && LOCAL[u.pathname]) { seen.local++; return r.respond({ status: 200, contentType: LOCAL[u.pathname][0], body: LOCAL[u.pathname][1] }); }
    if (u.pathname.startsWith('/wp-json/sm/v1/gpdp/')) {
      seen.gpdp++;
      if (sim.wpDown) return r.respond({ status: 503, contentType: 'application/json', body: '{"code":"down"}' });
      if (sim.wpSlow) { await wait(sim.wpSlow); return r.continue().catch(() => {}); }
    }
    if (/\/live\/options\//.test(u.pathname)) { seen.wpOptions++; if (sim.wpDown) return r.respond({ status: 503, contentType: 'application/json', body: '{}' }); }
    if (u.host.endsWith('workers.dev') && u.pathname === '/api/cj/product') { seen.worker++; if (sim.workerDown) return r.respond({ status: 500, contentType: 'application/json', body: '{"error":"quota"}', headers: { 'Access-Control-Allow-Origin': '*' } }); }
    if (u.pathname.startsWith('/order/') && false) return r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><style>@view-transition{navigation:auto}</style><h1 id="orderpage">Order request page (test)</h1>' });
    r.continue().catch(() => {});
  });
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  return { ctx, p, seen };
}
const cartRows = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('sm_cart') || '[]').map(r => ({ type: 'local', ...r })).concat(JSON.parse(localStorage.getItem('sm_gcart') || '[]').map(r => ({ type: 'cj', currency: 'USD', ...r }))); } catch (e) { return []; } });   // the site's carts: sm_cart (local), sm_gcart (CJ)
const panelTop = p => p.evaluate(() => { const n = document.querySelector('.buy-panel'); return n ? getComputedStyle(n).top : 'none'; });

// 1) Local product page
{ const { ctx, p, seen } = await open(LOCAL_PDP);
  await p.waitForSelector('.buy-panel .primary-btn', { visible: true, timeout: 60000 }); await wait(4000);
  ok(await panelTop(p) === '0px', 'local page: .buy-panel is sticky at top 0px');
  await p.click('.buy-panel .primary-btn'); await wait(4000);
  const rows = await cartRows(p);
  ok(rows.length === 1 && rows[0].type === 'local' && rows[0].id === 'hhc-3759872' && rows[0].qty === 1, 'local Add to cart: the product is in the site cart (sm_cart)');
  const toast = await p.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[class*=toast]')].map(n => n.innerText).join(' | '));
  ok(!/could not be updated/i.test(toast), 'local: no "cart could not be updated" message');
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), p.evaluate(() => { const bn = [...document.querySelectorAll('.buy-panel a, .buy-panel button')].find(n => /buy now/i.test(n.textContent)); bn && bn.click(); })]);
  ok(/#\/checkout/.test(p.url()), 'local Buy now opens the checkout (/#/checkout)');
  ok(seen.notFound.length === 0 && seen.errs.length === 0, 'local: no missing assets, no JS errors' + (seen.notFound.length + seen.errs.length ? ' ' + seen.notFound.concat(seen.errs).join(' | ') : ''));
  await ctx.close(); }

// 2) CJ product page, normal
{ const { ctx, p, seen } = await open(CJ_PDP); const t0 = Date.now();
  await p.waitForFunction(() => { const a = document.querySelector('[data-gpdp-add]'); return a && !a.disabled; }, { timeout: 45000 }).catch(() => {});
  const secs = Math.round((Date.now() - t0) / 1000);
  ok(await p.$eval('[data-gpdp-add]', n => !n.disabled), `CJ page: Add to cart enabled after ${secs}s (options load without waiting for the context call)`);
  ok(seen.notFound.length === 0, 'CJ page: config.js and all assets load (no 404)' + (seen.notFound.length ? ' ' + seen.notFound.join(' | ') : ''));
  ok(await p.waitForFunction(() => typeof window.SM_CONFIG === 'object', { timeout: 20000 }).then(() => true).catch(() => false), 'CJ page: site config (SM_CONFIG) is available');
  ok(await panelTop(p) === '0px', 'CJ page: .buy-panel is sticky at top 0px');
  await p.click('[data-gpdp-add]'); await wait(3000);
  const rows = await cartRows(p);
  ok(rows.length === 1 && rows[0].type === 'cj' && rows[0].currency === 'USD' && rows[0].vkey, `CJ Add to cart: cart line with the exact variation (${rows[0] && rows[0].vname} ${rows[0] && rows[0].unit} USD)`);
  if (shots) await p.screenshot({ path: shots + '/cj-normal.png' });
  ok(seen.errs.length === 0, 'CJ page: no JS errors' + (seen.errs.length ? ' ' + seen.errs.join(' | ') : ''));
  await ctx.close(); }

// 3) CJ product page, WordPress down → supplier options from the CJ Worker
{ const { ctx, p, seen } = await open(CJ_PDP, { wpDown: true });
  await p.waitForFunction(() => { const a = document.querySelector('[data-gpdp-add]'); return a && !a.disabled; }, { timeout: 30000 }).catch(() => {});
  const v = await p.evaluate(() => ({ add: !document.querySelector('[data-gpdp-add]').disabled, opts: document.querySelectorAll('[data-gpdp-options] [data-vid]').length, status: (document.querySelector('[data-gpdp-status]') || {}).innerText || '' }));
  ok(seen.gpdp >= 1 && seen.worker >= 1 && v.add && v.opts > 0, `WordPress down: ${v.opts} supplier option(s) from the CJ Worker, Add to cart enabled`);
  ok(/estimated prices/i.test(v.status), 'WordPress down: the page says prices are estimates confirmed by staff');
  await p.click('[data-gpdp-add]'); await wait(3000);
  const rows = await cartRows(p);
  ok(rows.length === 1 && rows[0].type === 'cj' && rows[0].vkey, 'WordPress down: the exact variation still goes into the cart');
  ok(seen.errs.length === 0, 'WordPress down: no JS errors' + (seen.errs.length ? ' ' + seen.errs.join(' | ') : ''));
  await ctx.close(); }

// 4) CJ product page, WordPress slow (12 s) → supplier options at ~6 s, then WordPress data replaces them and keeps the choice
{ const { ctx, p, seen } = await open(CJ_PDP, { wpSlow: 12000 }); const t0 = Date.now();
  await p.waitForFunction(() => { const a = document.querySelector('[data-gpdp-add]'); return a && !a.disabled; }, { timeout: 30000 }).catch(() => {});
  const first = Math.round((Date.now() - t0) / 1000);
  ok(first <= 11, `WordPress slow: options usable after ${first}s instead of waiting for WordPress`);
  await wait(16000);
  const after = await p.evaluate(() => ({ pressed: (document.querySelector('[data-gpdp-options] [aria-pressed="true"]') || {}).textContent || '', status: (document.querySelector('[data-gpdp-status]') || {}).innerText || '' }));
  ok(!!after.pressed, `WordPress slow: an option stays selected after WordPress answers (${after.pressed.trim().slice(0, 40)})`);
  ok(seen.errs.length === 0, 'WordPress slow: no JS errors' + (seen.errs.length ? ' ' + seen.errs.join(' | ') : ''));
  await ctx.close(); }

// 5) Global shop (in-page) product view, CJ Worker down → WordPress options
{ const { ctx, p, seen } = await open(SPA_PDP, { workerDown: true });
  await p.waitForFunction(() => { const v = document.getElementById('gvar'); return v && !/Loading the supplier/.test(v.innerText); }, { timeout: 90000 }).catch(() => {});
  const g = await p.evaluate(() => (document.getElementById('gvar') || {}).innerText || '');
  ok(seen.worker >= 1 && seen.wpOptions >= 1 && /Choose an option|Option/.test(g) && !/could not be loaded/.test(g), `global shop, CJ Worker down: options come from WordPress ("${g.replace(/\s+/g, ' ').slice(0, 70)}")`);
  ok(await panelTop(p) === '0px', 'global shop: .buy-panel is sticky at top 0px');
  ok(seen.errs.length === 0, 'global shop: no JS errors' + (seen.errs.length ? ' ' + seen.errs.join(' | ') : ''));
  await ctx.close(); }

// 6) Global shop product view, both sources down → honest message with Try again
{ const { ctx, p } = await open(SPA_PDP, { workerDown: true, wpDown: true });
  await p.waitForFunction(() => /could not be loaded/.test((document.getElementById('gvar') || {}).innerText || ''), { timeout: 90000 }).catch(() => {});
  ok(await p.evaluate(() => /could not be loaded/.test(document.getElementById('gvar').innerText) && !!document.getElementById('gvar-retry')), 'both sources down: "Options could not be loaded" with a Try again button (no false options)');
  await ctx.close(); }

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
