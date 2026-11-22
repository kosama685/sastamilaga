// Playwright end-to-end test of the restored static shop (Add to cart, Buy now, Quick Buy, variations, shipping, cart, checkout, PayPal /
// card payment links, Formspree order) on the LIVE site, with the LOCAL shop scripts injected. Formspree and PayPal are intercepted and
// recorded (no order email, no payment); everything else (pages, catalogue, CJ options, shipping quotes, exchange rates) is live.
// Usage: node tools/static-shop.e2e.mjs [repoRoot] [screenshotDir]      (playwright-core + an installed Chrome; CHROME env var for the path)
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const repo = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\/$/, ''), shots = process.argv[3] || '';
const SITE = 'https://sastamilaga.com';
const LOCAL = {};
for (const [p, t] of [['/assets/js/woo-bridge.js', 'text/javascript'], ['/assets/js/global.js', 'text/javascript'], ['/assets/js/global-pdp.js', 'text/javascript'], ['/assets/js/cj-home-rails.js', 'text/javascript'], ['/app.js', 'text/javascript'], ['/assets/js/pdp-static.js', 'text/javascript'], ['/assets/theme/static-bundle.css', 'text/css'], ['/styles.css', 'text/css'], ['/assets/css/global-pdp.css', 'text/css']]) LOCAL[p] = [t, fs.readFileSync(repo + p, 'utf8')];
const LOCAL_HHC = SITE + '/p/raf-professional-electric-coffee-spice-grinder-300w-high-power-stainless-steel-m-hhc-3759872.html';
const LOCAL_SHP = SITE + '/p/1-pcs-silicon-remote-cover-soft-protective-silicone-case-for-tv-ac-and-led-remot-shp-c8f9e0fd1ad6b8ef.html';
const CJ_PDP = SITE + '/global-shop/p/1368068170002337792/leather-business-handbag-super-soft-large-capacity-wash-bag/';
const SPA_PDP = SITE + '/global-shop/#/global/p/luggage-and-travel-bags/1358774418171629568';
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };

async function context(opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  await ctx.addInitScript(() => { try { localStorage.setItem('sm_market', JSON.stringify({ country: 'PK', currency: 'PKR', lang: 'en' })); } catch (_) {} });
  const rec = { formspree: [], paypal: [], errors: [] };
  await ctx.route('**/*', async route => {
    const req = route.request(), u = new URL(req.url());
    if (/\.(png|jpe?g|webp|gif|mp4|woff2?)(\?|$)/.test(u.pathname) || /cloudflareinsights|clarity\.ms|googletagmanager|facebook|doubleclick/.test(u.host)) return route.abort();
    if (u.origin === SITE && LOCAL[u.pathname]) return route.fulfill({ status: 200, contentType: LOCAL[u.pathname][0], body: LOCAL[u.pathname][1] });
    if (u.host === 'formspree.io') { rec.formspree.push(req.postData() || ''); return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); }
    if (u.host === 'www.paypal.com') { rec.paypal.push(req.url()); return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>PayPal (test)</title><h1 id="pp">PayPal checkout (test stand-in)</h1>' }); }
    return route.continue().catch(() => {});
  });
  const page = await ctx.newPage();
  page.on('pageerror', e => { if (!/ViewTransition|Transition was aborted/.test(e.message)) rec.errors.push(e.message.slice(0, 160)); });
  return { ctx, page, rec };
}
const carts = page => page.evaluate(() => ({ local: JSON.parse(localStorage.getItem('sm_cart') || '[]'), cj: JSON.parse(localStorage.getItem('sm_gcart') || '[]') }));
const feedback = page => page.locator('#sm-store-feedback').innerText({ timeout: 4000 }).catch(() => '');

// 1) Local product page: Add to cart (twice), Buy now -> checkout
{ const { ctx, page, rec } = await context();
  await page.goto(LOCAL_HHC, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const add = page.locator('main .buy-panel a', { hasText: /^\s*Add to cart\s*$/ }).first();
  await add.waitFor({ timeout: 60000 }); await page.waitForTimeout(2500);
  ok(await add.isVisible() && await page.locator('main .buy-panel a', { hasText: /Buy now/ }).first().isVisible(), 'local product page shows "Add to cart" and "Buy now"');
  await add.click(); await page.waitForTimeout(800);
  let c = await carts(page);
  ok(c.local.length === 1 && c.local[0].id === 'hhc-3759872' && c.local[0].qty === 1, 'local Add to cart puts the product in the site cart (sm_cart)');
  ok(/Added to cart/.test(await feedback(page)), 'confirmation shows with "View cart" and "Checkout"');
  await add.click(); await page.waitForTimeout(800);
  c = await carts(page);
  ok(c.local[0].qty === 2, 'second click raises the quantity to 2 (no duplicate line)');
  ok((await page.locator('.smh-cart__count').first().innerText().catch(() => '')).trim() === '2', 'header cart badge shows 2');
  await Promise.all([page.waitForURL(/#\/checkout/, { timeout: 30000 }), page.locator('main .buy-panel a', { hasText: /Buy now/ }).first().click()]);
  await page.waitForSelector('#checkoutForm', { timeout: 60000 });
  const co = await page.locator('main').innerText();
  ok(/RAF Professional Electric Coffee/.test(co) && /1,937|5,811/.test(co), 'Buy now opens the checkout with the product (and its price)');
  ok(page.url().startsWith(SITE + '/#/checkout'), 'checkout stays on /#/checkout (not the WordPress /checkout/)');
  ok(rec.errors.length === 0, 'local flow: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 2) Local product with an "shp-" SKU: added and shown in the cart page; quantity +/- and remove work; reload keeps the cart
{ const { ctx, page, rec } = await context();
  await page.goto(LOCAL_SHP, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const add = page.locator('main .buy-panel a', { hasText: /^\s*Add to cart\s*$/ }).first();
  await add.waitFor({ timeout: 60000 }); await page.waitForTimeout(2000); await add.click(); await page.waitForTimeout(800);
  const sku = (await carts(page)).local[0]?.id || '';
  ok(/^shp-/.test(sku), `"shp-" product added with its SKU (${sku})`);
  await page.locator('#sm-store-feedback a', { hasText: 'View cart' }).click();
  await page.waitForURL(/#\/cart/, { timeout: 30000 }); await page.waitForSelector('.cart-line', { timeout: 60000 });
  ok(await page.locator('.cart-line').count() === 1, 'cart page lists the product (catalogue match for "shp-" SKUs)');
  await page.locator('.cart-line button[aria-label="Increase"]').click(); await page.waitForTimeout(400);
  ok((await carts(page)).local[0].qty === 2, 'cart page: + raises the quantity');
  await page.locator('.cart-line button[aria-label="Decrease"]').click(); await page.waitForTimeout(400);
  ok((await carts(page)).local[0].qty === 1, 'cart page: − lowers the quantity');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.cart-line', { timeout: 60000 });
  ok(page.url().startsWith(SITE + '/#/cart') && await page.locator('.cart-line').count() === 1, 'reload keeps /#/cart and the cart contents');
  await page.locator('.cart-line .ghost-btn', { hasText: 'Remove' }).click(); await page.waitForTimeout(500);
  ok((await carts(page)).local.length === 0 && /empty/i.test(await page.locator('main').innerText()), 'Remove empties the cart (empty state shown)');
  ok(rec.errors.length === 0, 'cart page: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 3) CJ product page (/global-shop/p/): variation + shipping quote -> Add to cart / Buy now
{ const { ctx, page, rec } = await context();
  await page.goto(CJ_PDP, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => { const a = document.querySelector('[data-gpdp-add]'); return a && !a.disabled; }, null, { timeout: 45000 });
  ok(/^\s*Add to cart\s*$/.test(await page.locator('[data-gpdp-add]').innerText()) && /^\s*Buy now\s*$/.test(await page.locator('[data-gpdp-buy]').innerText()), 'CJ page shows "Add to cart" and "Buy now"');
  await page.waitForFunction(() => /Delivers to|cannot be delivered|No verified/.test((document.querySelector('[data-gpdp-delivery]') || {}).textContent || ''), null, { timeout: 60000 }).catch(() => {});
  await page.locator('[data-gpdp-add]').click(); await page.waitForTimeout(1000);
  const c = await carts(page), row = c.cj[0] || {};
  ok(c.cj.length === 1 && row.vkey && row.unit > 0 && row.qty === 1, `CJ Add to cart: exact variation in the global cart (${row.vname}, US$${row.unit})`);
  ok(!!row.ship, `CJ cart line carries the shipping quote (${row.ship || 'none'})`);
  ok(/Added to cart/.test(await page.locator('[data-gpdp-status]').innerText()), 'CJ page confirms "Added to cart" with cart links');
  await Promise.all([page.waitForURL(/#\/checkout/, { timeout: 30000 }), page.locator('[data-gpdp-buy]').click()]);
  await page.waitForSelector('#checkoutForm', { timeout: 60000 });
  ok(/Leather Business Handbag/.test(await page.locator('main').innerText()), 'CJ Buy now opens the checkout with the global item');
  ok(rec.errors.length === 0, 'CJ page: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 4) Global shop product view (global.js): variation chosen -> Add to cart / Buy now
{ const { ctx, page, rec } = await context();
  await page.goto(SPA_PDP, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => { const v = document.getElementById('gvar'); return v && !/Loading the supplier/.test(v.innerText); }, null, { timeout: 60000 });
  ok(/^\s*Add to cart\s*$/.test(await page.locator('#gadd').innerText()) && /^\s*Buy now\s*$/.test(await page.locator('#gbuy').innerText()), 'global shop product shows "Add to cart" and "Buy now"');
  const opts = page.locator('#gvar input[name=variant]');
  if (await opts.count() > 1) await opts.nth(1).check({ force: true });
  await page.waitForTimeout(1500);
  await page.locator('#gadd').click(); await page.waitForTimeout(800);
  const c = await carts(page);
  ok(c.cj.length === 1 && c.cj[0].unit > 0 && !!c.cj[0].vkey, `global shop Add to cart: chosen option in the cart (${c.cj[0] && c.cj[0].vname})`);
  await Promise.all([page.waitForURL(/#\/checkout/, { timeout: 30000 }), page.locator('#gbuy').click()]);
  await page.waitForSelector('#checkoutForm', { timeout: 60000 });
  ok(/Global items/.test(await page.locator('main').innerText()), 'global shop Buy now opens the checkout');
  ok(rec.errors.length === 0, 'global shop: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 5) Homepage CJ card: Add to cart (option dialog) and Buy now
{ const { ctx, page, rec } = await context();
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const card = page.locator('[data-cj-order="add"]').first();
  for (let y = 0; y < 14 && !(await card.count()); y++) { await page.mouse.wheel(0, 1400); await page.waitForTimeout(900); }   // the CJ rails load as they scroll into view
  const has = await card.waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
  if (has) {
    await card.scrollIntoViewIfNeeded(); await card.click();
    const confirm = page.locator('#sm-cj-order-confirm');
    await page.waitForFunction(() => { const b = document.getElementById('sm-cj-order-confirm'); return b && !b.disabled && /Add to cart/.test(b.textContent) && b.offsetParent; }, null, { timeout: 45000 }).catch(() => {});
    ok(/Add to cart/.test(await confirm.innerText().catch(() => '')), 'homepage CJ card opens the option dialog with "Add to cart" (no WooCommerce check)');
    await confirm.click().catch(() => {}); await page.waitForTimeout(800);
    const c = await carts(page);
    ok(c.cj.length === 1 && c.cj[0].unit > 0, 'homepage CJ card: chosen option added to the cart');
  } else ok(false, 'homepage CJ cards did not appear');
  ok(rec.errors.length === 0, 'homepage: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 6) Checkout: mixed cart -> PayPal link, card link, cash on delivery; Formspree records the order first
{ const { ctx, page, rec } = await context();
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => {
    localStorage.setItem('sm_cart', JSON.stringify([{ id: 'hhc-3759872', qty: 1 }]));
    localStorage.setItem('sm_gcart', JSON.stringify([{ id: '1368068170002337792', sku: 'CJNS103193001AZ', name: 'Leather Business Handbag', vkey: '1368068171344515072', vname: 'Black', unit: 10.12, qty: 1, ship: 'CJPacket Asia Liquid Line US$5.06', shipAmt: 5.06, shipCur: 'USD', url: 'https://sastamilaga.com/global-shop/p/1368068170002337792/leather-business-handbag-super-soft-large-capacity-wash-bag/' }]));
  });
  const fill = async () => {
    await page.goto(SITE + '/#/checkout', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#checkoutForm', { timeout: 60000 });
    await page.fill('#checkoutForm [name=full_name]', 'Test Customer'); await page.fill('#checkoutForm [name=phone]', '03001234567'); await page.fill('#checkoutForm [name=email]', 'test@example.com');
    await page.fill('#checkoutForm [name=address]', 'House 1, Street 2, Test Town'); await page.fill('#checkoutForm [name=city]', 'Karachi');
  };
  await fill();
  const btns = await page.locator('[data-pay]').allInnerTexts();
  ok(btns.some(t => /PayPal/.test(t)) && btns.some(t => /card/i.test(t)), 'checkout offers "Pay with PayPal" and "Pay by debit or credit card"');
  await page.locator('.sm-co-tile[data-pm="PayPal / Card"]').click(); await page.locator('[data-pay="Login"]').waitFor({ state: 'visible', timeout: 30000 });
  await Promise.all([page.waitForURL(/paypal\.com/, { timeout: 60000 }), page.locator('[data-pay="Login"]').click()]);
  const pp = new URL(rec.paypal[0] || 'https://x');
  ok(pp.pathname === '/cgi-bin/webscr' && pp.searchParams.get('cmd') === '_xclick' && pp.searchParams.get('business') === 'osamakhancv@gmail.com', 'PayPal: _xclick link to osamakhancv@gmail.com (no API key)');
  ok(Number(pp.searchParams.get('amount')) > 20 && /^[A-Z]{3}$/.test(pp.searchParams.get('currency_code') || '') && /^SM-/.test(pp.searchParams.get('invoice') || ''), `PayPal: amount ${pp.searchParams.get('amount')} ${pp.searchParams.get('currency_code')} covers local + CJ + shipping, invoice ${pp.searchParams.get('invoice')}`);
  ok(pp.searchParams.get('return') === SITE + '/thank-you/' && pp.searchParams.get('cancel_return') === SITE + '/#/cart', 'PayPal: return to /thank-you/, cancel back to /#/cart');
  const form1 = rec.formspree[0] || '';
  ok(/order_items/.test(form1) && /RAF Professional/.test(form1) && /global_items/.test(form1) && /Leather Business Handbag/.test(form1) && /PayPal/.test(form1), 'Formspree received the order (local + CJ items, PayPal) BEFORE the PayPal redirect');
  // card link (back on the shop first: the previous step ended on the PayPal stand-in page)
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('sm_cart', JSON.stringify([{ id: 'hhc-3759872', qty: 1 }]));
    localStorage.setItem('sm_gcart', JSON.stringify([{ id: '1368068170002337792', sku: 'CJNS103193001AZ', name: 'Leather Business Handbag', vkey: '1368068171344515072', vname: 'Black', unit: 10.12, qty: 1, ship: 'CJPacket', shipAmt: 5.06, shipCur: 'USD', url: '' }]));
  });
  await fill();
  await page.locator('.sm-co-tile[data-pm="PayPal / Card"]').click(); await page.locator('[data-pay="Billing"]').waitFor({ state: 'visible', timeout: 30000 });
  await Promise.all([page.waitForURL(/paypal\.com/, { timeout: 60000 }), page.locator('[data-pay="Billing"]').click()]);
  const card = new URL(rec.paypal[1] || 'https://x');
  ok(card.searchParams.get('landing_page') === 'Billing' && card.searchParams.get('solution_type') === 'Sole', 'card payment: landing_page=Billing + solution_type=Sole (guest debit/credit card, like the link generator)');
  // cash on delivery (local only)
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.setItem('sm_cart', JSON.stringify([{ id: 'hhc-3759872', qty: 2 }])); localStorage.setItem('sm_gcart', '[]'); });
  await fill();
  const before = rec.formspree.length;
  await page.locator('#smPlaceOrder').click();
  await page.waitForFunction(n => window.__x || true, null).catch(() => {});
  await page.waitForTimeout(6000);
  const form3 = rec.formspree[before] || '';
  ok(form3 && /order_total/.test(form3) && !/PayPal/.test(form3.match(/name="payment_method"\r?\n\r?\n([^\r\n]*)/)?.[1] || ''), `cash on delivery / place order: Formspree received the order (${(form3.match(/name="payment_method"\r?\n\r?\n([^\r\n]*)/) || [])[1] || '?'})`);
  ok(/thank-you/.test(page.url()) || /Thank you|order (is )?received|confirmed/i.test(await page.locator('main').innerText().catch(() => '')), 'after placing the order the thank-you page shows');
  ok((await carts(page)).local.length === 0, 'cart is emptied after a successful order');
  if (shots) await page.screenshot({ path: shots + '/static-thankyou.png' });
  ok(rec.errors.length === 0, 'checkout: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 7) Formspree failure: the cart and form are kept, the shopper can retry
{ const { ctx, page } = await context();
  await ctx.route('https://formspree.io/**', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"down"}' }));
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => { localStorage.setItem('sm_cart', JSON.stringify([{ id: 'hhc-3759872', qty: 1 }])); localStorage.setItem('sm_gcart', '[]'); });
  await page.goto(SITE + '/#/checkout', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#checkoutForm', { timeout: 60000 });
  await page.fill('#checkoutForm [name=full_name]', 'Test Customer'); await page.fill('#checkoutForm [name=phone]', '03001234567'); await page.fill('#checkoutForm [name=address]', 'House 1, Test Town');
  await page.locator('#smPlaceOrder').click(); await page.waitForTimeout(5000);
  ok((await carts(page)).local.length === 1 && await page.inputValue('#checkoutForm [name=full_name]') === 'Test Customer' && !(await page.locator('#smPlaceOrder').isDisabled()), 'Formspree down: cart and form kept, the button can be pressed again');
  await ctx.close(); }

// 8) WordPress bridge + header cart link (live, not mocked). The bridge target is the WordPress option sm_static_cart_target:
//    'hash' (this release: /#/cart, /#/checkout) or 'pages' (the request cart /request-cart/, /order/). SM_BRIDGE_TARGET=pages before the switch.
{ const { ctx, page } = await context();
  const pages = process.env.SM_BRIDGE_TARGET === 'pages', cartTo = pages ? '/request-cart/' : '/#/cart', coTo = pages ? '/order/' : '/#/checkout';
  await page.goto(SITE + '/cart/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  ok(page.url().startsWith(SITE + cartTo), `sastamilaga.com/cart/ (WordPress) forwards to the static cart ${cartTo}`);
  await page.goto(SITE + '/checkout/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  ok(page.url().startsWith(SITE + coTo), `sastamilaga.com/checkout/ forwards to the static checkout ${coTo}`);
  await page.goto(LOCAL_HHC, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(2500);
  const hdr = page.locator('a.smh-tool--cart, a[aria-label="Cart"]').first();
  ok(/Empty|item/.test(await page.locator('.smh-cart__total').first().innerText().catch(() => '')), 'header shows the real cart contents instead of a fixed "Rs 0.00"');
  if (await hdr.count()) { await Promise.all([page.waitForURL(/#\/cart/, { timeout: 30000 }).catch(() => {}), hdr.click()]); ok(page.url().startsWith(SITE + '/#/cart'), 'header cart icon opens the static cart'); }
  else ok(false, 'header cart link not found');
  await ctx.close(); }

// 9) Phone: product page buttons and the checkout fit the screen
{ const { ctx, page, rec } = await context({ mobile: true });
  await page.goto(LOCAL_HHC, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const add = page.locator('main .buy-panel a', { hasText: /^\s*Add to cart\s*$/ }).first(); await add.waitFor({ timeout: 60000 }); await page.waitForTimeout(2000);
  await add.tap(); await page.waitForTimeout(600);
  await page.goto(SITE + '/#/checkout', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('#checkoutForm', { timeout: 60000 });
  const over = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(!over, 'phone: checkout has no sideways scrolling');
  if (shots) await page.screenshot({ path: shots + '/static-checkout-phone.png', fullPage: false });
  ok(rec.errors.length === 0, 'phone: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 10) Product-video Quick Buy (homepage "Watch before you buy"): Add to cart and Buy now from the video dialog
{ const { ctx, page, rec } = await context();
  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const card = page.locator('[data-vm-src]').first();
  for (let y = 0; y < 12 && !(await card.count()); y++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(700); }
  if (await card.count()) {
    const sku = String(await card.getAttribute('data-vm-q') || '').toLowerCase();
    await card.scrollIntoViewIfNeeded(); await card.click();
    const addBtn = page.locator('#smvm-cart');
    await addBtn.waitFor({ state: 'visible', timeout: 30000 });
    await addBtn.click(); await page.waitForTimeout(800);
    const c = await carts(page);
    ok(c.local.some(r => r.id === sku), `Quick Buy dialog: Add to cart puts ${sku} in the cart`);
    if (!(await page.locator('#smvm-buy').isVisible())) { await card.click(); await page.locator('#smvm-buy').waitFor({ state: 'visible', timeout: 30000 }); }
    await Promise.all([page.waitForURL(/#\/checkout/, { timeout: 30000 }), page.locator('#smvm-buy').click()]);
    await page.waitForSelector('#checkoutForm', { timeout: 60000 });
    ok(page.url().startsWith(SITE + '/#/checkout'), 'Quick Buy dialog: Buy now opens the checkout');
  } else ok(false, 'no product-video Quick Buy cards on the homepage');
  ok(rec.errors.length === 0, 'Quick Buy: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

// 11) A basket saved in the request cart (sm_order_cart_v1, live 22 Nov 20:12 until this release) moves into the cart once; an unpriced row stays
{ const { ctx, page, rec } = await context();
  await page.goto(SITE + '/robots.txt', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => localStorage.setItem('sm_order_cart_v1', JSON.stringify([
    { type: 'local', id: 'HHC-3759872', sku: 'HHC-3759872', name: 'Coffee grinder', qty: 2, unit: 1000, currency: 'PKR', attributes: [] },
    { type: 'cj', id: '1368068170002337792', sku: 'CJNS103193001AZ', name: 'Leather Business Handbag', vkey: '1368068171344515072', vname: 'Black', qty: 1, unit: 10.12, currency: 'USD' },
    { type: 'cj', id: '1368068170002337792', sku: 'CJNS103193002BY', name: 'Leather Business Handbag', vkey: '1368068171344515073', vname: 'Brown', qty: 1, unit: null, priceStatus: 'pending', currency: 'USD' }])));
  await page.goto(LOCAL_HHC, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForTimeout(2500);
  const c = await carts(page), left = await page.evaluate(() => JSON.parse(localStorage.getItem('sm_order_cart_v1') || '[]'));
  ok(c.local.some(r => r.id === 'hhc-3759872' && r.qty === 2), 'request-cart basket: the local item moved into the cart with its quantity');
  ok(c.cj.some(r => r.id === '1368068170002337792' && r.vkey === '1368068171344515072' && r.unit === 10.12), 'request-cart basket: the priced CJ option moved with its option and USD price');
  ok(left.length === 1 && left[0].unit === null, 'request-cart basket: the unpriced row is left untouched (nothing invented)');
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000);
  ok((await carts(page)).local.filter(r => r.id === 'hhc-3759872').every(r => r.qty === 2), 'request-cart basket: a reload does not add it twice');
  ok(rec.errors.length === 0, 'request-cart basket: no JavaScript errors' + (rec.errors.length ? ': ' + rec.errors.join(' | ') : ''));
  await ctx.close(); }

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
