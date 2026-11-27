// Real-browser check of the global product page against the LIVE store, with the local Worker output and local JS/CSS injected for the product URL.
// Adds test items to the real WooCommerce cart and removes them again; never places an order.
// Usage: node tools/global-pdp.e2e.mjs [repoRoot] [screenshotDir]   (needs puppeteer-core + Chrome; CHROME env var for the path)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const repo = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\/$/, ''), shots = process.argv[3] || '';
const {handle, PAGES} = await import(pathToFileURL(repo + '/workers/global-pdp/worker.js').href);
const tpl = fs.readFileSync(repo + '/assets/templates/global-pdp.html', 'utf8'), js = fs.readFileSync(repo + '/assets/js/global-pdp.js', 'utf8'), css = fs.readFileSync(repo + '/assets/css/global-pdp.css', 'utf8'), pdps = fs.readFileSync(repo + '/assets/js/pdp-static.js', 'utf8');
const fetcher = async (u, o) => u === `${PAGES}/assets/templates/global-pdp.html` ? new Response(tpl) : fetch(u, {signal: AbortSignal.timeout(60000)});
const PATH = '/global-shop/p/1988880782439141377/zero-gravity-chair-26-zero-gravity-recliner-lounge-chair-indoor-outdoor/';
const b = await puppeteer.launch({executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new'});
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
async function open(cc, w = 1280, path = PATH) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({width: w, height: 900});
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setRequestInterception(true);
  p.on('request', async r => {
    const u = new URL(r.url());
    if (u.origin === 'https://sastamilaga.com' && u.pathname.startsWith('/global-shop/p/')) { const res = await handle(new Request(r.url()), fetcher); return r.respond({status: res.status, headers: {'content-type': 'text/html; charset=utf-8', ...(res.headers.get('location') ? {location: res.headers.get('location')} : {})}, body: await res.text()}); }
    if (u.origin === 'https://sastamilaga.com' && u.pathname === '/assets/js/global-pdp.js') return r.respond({status: 200, contentType: 'text/javascript', body: js});
    if (u.origin === 'https://sastamilaga.com' && u.pathname === '/assets/js/pdp-static.js') return r.respond({status: 200, contentType: 'text/javascript', body: pdps});
    if (u.origin === 'https://sastamilaga.com' && u.pathname === '/assets/css/global-pdp.css') return r.respond({status: 200, contentType: 'text/css', body: css});
    r.continue();
  });
  await p.evaluateOnNewDocument(c => localStorage.setItem('sm_market', JSON.stringify({country: c, currency: 'USD', lang: 'en'})), cc);
  await p.goto('https://sastamilaga.com' + path + (path.endsWith('/') ? '?v=' + Date.now() : ''), {waitUntil: 'networkidle2', timeout: 120000});
  await p.waitForFunction(() => /US\$|Not available|WhatsApp/.test(document.querySelector('[data-gpdp-price]')?.textContent || ''), {timeout: 60000}).catch(() => {});
  await p.waitForFunction(() => /Delivers to|cannot be delivered|could not|confirmed at checkout/.test(document.querySelector('[data-gpdp-delivery]')?.textContent || ''), {timeout: 90000}).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));
  return {ctx, p, errs};
}
const status = p => p.$eval('[data-gpdp-status]', e => e.textContent.trim());
async function cartClear(p) { return p.evaluate(async () => { const r = await fetch('/wp-json/wc/store/v1/cart', {credentials: 'include'}); const n = r.headers.get('nonce'); const j = await r.json(); const out = {count: j.items_count, total: j.totals && (j.totals.total_price + ' ' + j.totals.currency_code), names: (j.items || []).map(i => i.name)}; for (const it of j.items || []) await fetch('/wp-json/wc/store/v1/cart/remove-item', {method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json', Nonce: n}, body: JSON.stringify({key: it.key})}); return out; }); }

// 1) USA: same design, live data, real cart
{ const {ctx, p, errs} = await open('US');
  const s = await p.evaluate(() => ({header: /Shopping destination/.test(document.querySelector('header')?.innerText || '') && !!document.querySelector('header .smh-cart__count, .smh-cart__count'), footer: (document.querySelector('footer')?.innerText || '').length,
    layout: !!document.querySelector('section.pdp.pdp3.gpdp') && !!document.querySelector('.pdp-side') && !!document.querySelector('.sm-tabs'),
    side: document.querySelector('.pdp-side')?.innerText || '', trust: document.querySelector('.sm-trust')?.innerText || '', tabR: document.getElementById('tab-r')?.innerText || '',
    thumbs: document.querySelectorAll('.gallery-thumbs .gpdp-thumb').length, desc: document.querySelectorAll('[data-gpdp-desc] p').length, descInTab: !!document.querySelector('#tab-d [data-gpdp-desc]'),
    qtyControls: document.querySelectorAll('#pdpQty, [data-gpdp-qty]').length, price: document.querySelector('[data-gpdp-price]').textContent,
    opts: document.querySelectorAll('[data-gpdp-options] .gpdp-opt').length, delivery: document.querySelector('[data-gpdp-delivery]').textContent, addEnabled: !document.querySelector('[data-gpdp-add]').disabled,
    overflow: document.documentElement.scrollWidth > innerWidth}));
  ok(s.header && s.footer > 200, 'US: shared site header and footer (footer ' + s.footer + ' chars)');
  ok(s.layout, 'US: same three-column product design as local pages (pdp3 + side column + tabs)');
  ok(/Prepaid checkout/.test(s.side) && !/Cash on delivery across Pakistan/.test(s.side) && /Prepaid secure checkout/.test(s.trust) && /prepaid/i.test(s.tabR), 'US: global wording in side panel, trust icons and Delivery tab (no Pakistan COD text)');
  ok(s.thumbs >= 5, 'US: gallery thumbnails ' + s.thumbs); ok(s.desc >= 2 && s.descInTab, 'US: supplier description in the Description tab (' + s.desc + ' paragraphs)');
  ok(s.qtyControls === 1, 'US: exactly one quantity control'); ok(s.price === 'US$83.42', 'US: destination price ' + s.price); ok(s.opts === 1, 'US: options ' + s.opts);
  ok(/Delivers to United States/.test(s.delivery), 'US: delivery check -> ' + s.delivery);
  ok(s.addEnabled, 'US: Add to cart enabled');
  const geo = await p.evaluate(() => { const bp = document.querySelector('.buy-panel').getBoundingClientRect(), tb = document.querySelector('.sm-tabs').getBoundingClientRect(), bn = getComputedStyle(document.querySelector('[data-gpdp-buy]')); return {overlap: bp.bottom > tb.top + 1, buyColor: bn.color, buyBg: bn.backgroundColor}; });
  ok(!geo.overlap && geo.buyColor !== geo.buyBg, 'US: buy panel does not overlap the tabs; Buy now text visible (' + geo.buyColor + ' on ' + geo.buyBg + ')');
  ok(/US\$/.test(s.delivery), 'US: delivery quoted in the shopper currency (US$)'); ok(!s.overflow, 'US: no horizontal overflow');
  if (shots) await p.screenshot({path: shots + '\\gpdp-us-desktop.png', fullPage: true});
  await p.click('.gallery-thumbs .gpdp-thumb:nth-child(3)'); ok(await p.evaluate(() => document.querySelector('.gallery-main img').src === document.querySelectorAll('.gallery-thumbs .gpdp-thumb img')[2].src), 'US: thumbnail swaps the main photo');
  await p.click('[data-gpdp-main]'); await new Promise(r => setTimeout(r, 600));
  ok(await p.evaluate(() => !!document.querySelector('dialog.gpdp-lightbox')?.open), 'US: photo opens full screen'); await p.keyboard.press('Escape');
  await p.click('[data-gpdp-add]'); await p.waitForFunction(() => /Added|unavailable|could not|expired|reached/i.test(document.querySelector('[data-gpdp-status]').textContent), {timeout: 90000}).catch(() => {});
  const st = await status(p); ok(/Added to your cart/.test(st), 'US: "' + st + '"');
  const badgeN = await p.evaluate(() => [...document.querySelectorAll('.smh-cart__count')].map(e => e.textContent).join(','));
  const c = await cartClear(p); ok(c.count === 1 && /8342 USD/.test(c.total), 'US: item in the REAL WooCommerce cart ' + JSON.stringify(c) + ' header badge=' + badgeN + ' (removed again, no order)');
  ok(errs.length === 0, 'US: no JavaScript errors ' + JSON.stringify(errs.slice(0, 3)));
  await ctx.close(); }
// 2) Saudi Arabia, chair: no delivery -> told up front, cart buttons off
{ const {ctx, p} = await open('SA');
  const d = await p.$eval('[data-gpdp-delivery]', e => e.textContent); const dis = await p.$eval('[data-gpdp-add]', e => e.disabled);
  ok(/cannot be delivered to Saudi Arabia/.test(d) && dis, 'SA chair: told before adding, buttons off -> ' + d);
  const c = await cartClear(p); ok(c.count === 0, 'SA chair: nothing in the cart');
  await ctx.close(); }
// 3) Saudi Arabia, ankle boots: deliverable -> real cart
{ const {ctx, p} = await open('SA', 1280, '/global-shop/p/1830116277370114048');
  const s = await p.evaluate(() => ({url: location.pathname, price: document.querySelector('[data-gpdp-price]')?.textContent, opts: document.querySelectorAll('.gpdp-opt').length, d: document.querySelector('[data-gpdp-delivery]')?.textContent}));
  ok(/\/global-shop\/p\/1830116277370114048\/[a-z0-9-]+\/$/.test(s.url), 'SA boots: short link 301s to the canonical page ' + s.url);
  console.log('     boots: price=' + s.price + ' options=' + s.opts + ' delivery=' + s.d);
  await p.click('[data-gpdp-add]').catch(() => {}); await p.waitForFunction(() => /Added|unavailable|could not|expired|reached/i.test(document.querySelector('[data-gpdp-status]').textContent), {timeout: 90000}).catch(() => {});
  const st = await status(p); const c = await cartClear(p);
  ok(/Added to your cart/.test(st) && c.count === 1, 'SA boots: added to the REAL cart ' + JSON.stringify(c) + ' (removed again)');
  await ctx.close(); }
// 4) Buy now -> real WooCommerce checkout
{ const {ctx, p} = await open('US');
  await Promise.all([p.waitForNavigation({timeout: 120000}).catch(() => {}), p.click('[data-gpdp-buy]')]);
  await new Promise(r => setTimeout(r, 3000));
  const u = p.url(), body = await p.evaluate(() => document.body.innerText);
  ok(/\/checkout\/?/.test(new URL(u).pathname) && /Billing details|Place order|Your order/i.test(body), 'Buy now opens the real WooCommerce checkout form: ' + new URL(u).pathname + (/temporarily unavailable/i.test(body) ? ' (edge fallback: origin slow)' : ''));
  if (shots) await p.screenshot({path: shots + '\\gpdp-checkout.png', fullPage: false});
  const c = await cartClear(p); console.log('     cleaned cart: ' + JSON.stringify(c));
  await ctx.close(); }
// 5) Mobile
{ const {ctx, p} = await open('US', 390);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile 390px: no horizontal overflow');
  if (shots) await p.screenshot({path: shots + '\\gpdp-us-mobile.png', fullPage: true});
  await ctx.close(); }
console.log(pass + ' passed, ' + fail + ' failed'); await b.close();
