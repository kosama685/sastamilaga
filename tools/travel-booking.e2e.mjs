// Real-browser check of the /travel/ flight search with the LOCAL travel.js + travel-booking.js/.css injected into the LIVE page
// (static assets/js/… or the WordPress plugin's assets/…, whichever the live page loads).
// Live: airport suggestions and the Aviasales market prices (real data). Mocked: config, request, live Duffel search, booking —
// so nothing is stored, booked or charged.
//  A) no source on → "Get your best fare" request sheet directly
//  C) market prices on (Duffel off) → compare panel with real Aviasales fares, cheapest-day strip, "Book with our team"
//  B) everything on → live fare + market fare side by side → "Book this fare" → passenger form → order-pay page
// Usage: node tools/travel-booking.e2e.mjs [repoRoot] [screenshotDir]   (puppeteer-core + Chrome; CHROME env var for the path)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const repo = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\/$/, ''), shots = process.argv[3] || '';
const read = f => fs.readFileSync(repo + f, 'utf8');
const LOCAL = [[/\/travel\.js$/, 'text/javascript', read('/assets/js/travel.js')], [/\/travel-booking\.js$/, 'text/javascript', read('/assets/js/travel-booking.js')], [/\/travel-booking\.css$/, 'text/css', read('/assets/css/travel-booking.css')]];
const GUARD = /add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i;
const dep = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
const OFFER = { id: 'off_0000TESTOFFER1', price: 230, currency: 'USD', carriers: ['Duffel Airways'], taxAmount: 50, taxCurrency: 'USD', expiresAt: new Date(Date.now() + 1800e3).toISOString(),
  journeys: [[{ carrier: 'Duffel Airways', flightNumber: 'ZZ101', origin: 'KHI', destination: 'DXB', departingAt: dep + 'T09:00:00', arrivingAt: dep + 'T10:15:00' }]], baggage: [{ type: 'checked', quantity: 1 }] };
const VIEW = { id: OFFER.id, price: 231.5, currency: 'USD', expiresAt: OFFER.expiresAt, hold: true, priceGuaranteeUntil: null, idsRequired: true, bookable: true, owner: 'Duffel Airways', carriers: ['Duffel Airways'],
  passengers: [{ id: 'pas_A1', type: 'adult', age: null }, { id: 'pas_C1', type: 'child', age: 7 }],
  slices: [{ from: 'KHI', to: 'DXB', fromName: 'Karachi', toName: 'Dubai', duration: 'PT2H15M', segments: [{ carrier: 'Duffel Airways', flight: 'ZZ101', from: 'KHI', to: 'DXB', dep: dep + 'T09:00:00', arr: dep + 'T10:15:00' }] }],
  refund: { allowed: true, penalty: 40, currency: 'USD' }, change: { allowed: false, penalty: null, currency: '' } };
const PAY = 'https://sastamilaga.com/checkout/order-pay/99999/?pay_for_order=true&key=wc_order_TEST';
const CFG = { none: { mode: 'request', search: false, booking: false, market: false, currencies: [] }, market: { mode: 'request', search: false, booking: false, market: true, currencies: ['USD'] }, all: { mode: 'duffel', search: true, booking: true, market: true, currencies: ['USD', 'EUR', 'GBP'] } };

const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };

async function open(mode, width = 1280) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width, height: width < 700 ? 844 : 900, isMobile: width < 700, hasTouch: width < 700 });
  const errs = [], seen = { request: null, start: null, offer: 0, flights: 0, config: 0, market: 0, local: 0 };
  p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.setRequestInterception(true);
  p.on('request', async r => {
    const u = new URL(r.url());
    if (u.origin !== 'https://sastamilaga.com') return /\.(png|jpe?g|webp|gif|woff2?)(\?|$)/.test(u.pathname) || /cloudflareinsights|googletagmanager|clarity|facebook|doubleclick/.test(u.host) ? r.abort() : r.continue();
    const local = (u.pathname.startsWith('/assets/') || u.pathname.includes('/sm-global-travel/assets/')) && LOCAL.find(([re]) => re.test(u.pathname));
    if (local) { seen.local++; return r.respond({ status: 200, contentType: local[1], body: local[2] }); }
    const api = u.pathname.replace('/wp-json/sm-travel/v1/', '');
    const json = (data, status = 200) => r.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (u.pathname.startsWith('/wp-json/sm-travel/v1/')) {
      if (api === 'booking/config') { seen.config++; return json(CFG[mode]); }
      if (api === 'request') { seen.request = JSON.parse(r.postData() || '{}'); return json({ request: 70999, ref: '#70999', whatsapp: 'https://wa.me/923343582295?text=' + encodeURIComponent('Hello Sasta Milaga, about my travel request #70999'), email: true }); }
      if (api === 'duffel/flights') { seen.flights++; return json({ results: [OFFER], source: 'Duffel live search', bookingEnabled: true }); }
      if (api === 'booking/offer') { seen.offer++; return json(VIEW); }
      if (api === 'booking/start') { seen.start = JSON.parse(r.postData() || '{}'); return json({ order: 99999, pay_url: PAY, mode: 'hold', held_until: OFFER.expiresAt, amount: 231.5, currency: 'USD' }); }
      if (api === 'market-prices') seen.market++;
      return r.continue();   // suggest + market-prices: the live site (real data)
    }
    // Stand-in for the WooCommerce order-pay page; opts into cross-document view transitions like the site does.
    if (u.pathname.startsWith('/checkout/order-pay/')) return r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>order pay</title><style>@view-transition{navigation:auto}</style><h1 id="paypage">Order pay page (test)</h1>' });
    r.continue();
  });
  await p.goto('https://sastamilaga.com/travel/?tab=flights&e2e=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('#sm-flight-form input[name="origin_label"]', { visible: true, timeout: 90000 });
  await p.waitForFunction(() => !!window.SMTravel, { timeout: 60000 });
  return { ctx, p, errs, seen };
}
/** Type into an airport field and click the live suggestion for that IATA code. */
async function pick(p, name, q, code) {
  const input = `#sm-flight-form input[name="${name}"]`;
  await p.click(input, { clickCount: 3 }); await p.type(input, q, { delay: 60 });
  await p.waitForFunction((n, c) => [...(document.querySelector(`#sm-flight-form input[name="${n}"]`)?.closest('.sm-field')?.querySelectorAll('.sm-suggestions button') || [])].some(b => b.textContent.includes(`(${c})`)), { timeout: 45000 }, name, code);
  await p.evaluate((n, c) => [...document.querySelector(`#sm-flight-form input[name="${n}"]`).closest('.sm-field').querySelectorAll('.sm-suggestions button')].find(b => b.textContent.includes(`(${c})`)).click(), name, code);
}
const guardHits = p => p.evaluate(src => { const g = new RegExp(src, 'i'); return [...document.querySelectorAll('dialog.smtb a, dialog.smtb button, .smc a, .smc button')].filter(n => { const href = n.getAttribute('href') || ''; if (/^(https:\/\/sastamilaga\.com)?\/(cart|checkout|my-account)\//.test(href)) return false; return g.test([n.textContent, n.getAttribute('aria-label') || '', n.id, href].join(' ')); }).map(n => n.textContent.trim()); }, GUARD.source);
const pause = ms => new Promise(r => setTimeout(r, ms));

// A) no source on → request sheet directly
{ const { ctx, p, errs, seen } = await open('none');
  await pick(p, 'origin_label', 'Karachi', 'KHI'); await pick(p, 'destination_label', 'Dubai', 'DXB');
  await p.click('#sm-flight-form .sm-submit');
  await p.waitForSelector('dialog.smtb[open] input[name="name"]', { visible: true, timeout: 30000 });
  ok(seen.local >= 1, `local scripts injected into the live page (${seen.local} files)`);
  ok(await p.$eval('#smtb-title', n => n.textContent) === 'Get your best fare' && seen.market === 0 && seen.flights === 0, 'no price source on: the request sheet opens straight away');
  await p.click('dialog.smtb .smtb-btn--go');
  ok(/name/i.test(await p.$eval('dialog.smtb .smtb-status', n => n.textContent)) && !seen.request, 'empty form is not sent');
  await p.type('dialog.smtb input[name="name"]', 'Test Customer'); await p.type('dialog.smtb input[name="phone"]', '+92 300 1234567'); await p.type('dialog.smtb input[name="email"]', 'test@example.com');
  ok(await p.$eval('dialog.smtb .smtb-status', n => n.textContent) === '', 'typing clears the old error');
  await p.click('dialog.smtb .smtb-check input'); await p.click('dialog.smtb .smtb-btn--go');
  await p.waitForSelector('dialog.smtb .smtb-done__ref', { timeout: 20000 });
  const r = seen.request || {};
  ok(r.origin === 'KHI' && r.destination === 'DXB' && r.name === 'Test Customer' && r.consent === true && typeof r.key === 'string', 'request carries trip, contact, consent, idempotency key');
  ok((await guardHits(p)).length === 0, 'sheet buttons are safe for the edge click guard');
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

// C) market prices only (the live state today): compare panel with real Aviasales prices
{ const { ctx, p, errs, seen } = await open('market');
  await pick(p, 'origin_label', 'Lahore', 'LHE'); await pick(p, 'destination_label', 'Jeddah', 'JED');
  await p.click('#sm-flight-form .sm-submit');
  await p.waitForSelector('.smc .smc-tile--market', { visible: true, timeout: 30000 });
  await p.waitForFunction(() => !document.querySelector('.smc-card--skel'), { timeout: 45000 });
  const c = await p.evaluate(() => ({ eyebrow: document.querySelector('[data-flight-results] .sm-travel-eyebrow')?.textContent, live: document.querySelector('.smc-tile--live')?.innerText || '', market: document.querySelector('.smc-tile--market')?.innerText || '',
    cards: document.querySelectorAll('.smc-card--market').length, links: [...document.querySelectorAll('.smc-card--market .smc-link')].map(a => a.href), rels: [...document.querySelectorAll('.smc-link')].map(a => a.rel), days: document.querySelectorAll('.smc-day').length, chipsHidden: document.querySelector('.smc-chips')?.hidden }));
  ok(seen.market === 1 && seen.flights === 0, 'market prices fetched once from the live site; no live Duffel call while Duffel is off');
  ok(c.eyebrow === 'COMPARE FARES' && /Book with Sasta Milaga/i.test(c.live) && /Get a confirmed fare/.test(c.live), 'compare panel: the "Book with Sasta Milaga" tile offers a confirmed fare from the team');
  ok(c.cards > 0 && /per adult/.test(c.market) && /Aviasales/.test(c.market), `real Aviasales prices shown: ${c.cards} fares, tile "${c.market.replace(/\s+/g, ' ').slice(0, 90)}"`);
  ok(c.links.length > 0 && c.links.every(h => h.startsWith('https://tp.media/r?') || h.startsWith('https://www.aviasales.com/search/')) && c.rels.every(r => /sponsored/.test(r) && /nofollow/.test(r)), 'each market fare links to Aviasales through the partner link (rel="nofollow sponsored")');
  ok(c.days >= 2, `cheapest-day strip shown (${c.days} days)`);
  ok(c.chipsHidden === true, 'filter chips hidden while only one source has fares');
  if (shots) await p.screenshot({ path: shots + '/travel-compare-market.png', fullPage: false, clip: await p.$eval('[data-flight-results]', n => { const r = n.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(1400, r.height) }; }) });
  ok((await guardHits(p)).length === 0, 'compare buttons and links are guard-safe');
  const firstFare = await p.$eval('.smc-card--market .smc-card__air', n => n.textContent);
  await p.click('.smc-card--market .smtb-btn--go');
  await p.waitForSelector('dialog.smtb[open] .smtb-trip__fare', { visible: true, timeout: 20000 });
  ok(/seen on Aviasales/.test(await p.$eval('.smtb-trip__fare', n => n.textContent)), `"Book with our team" opens the request with the chosen market fare (${firstFare})`);
  await p.click('dialog.smtb .smtb__x');
  const before = await p.$eval('#sm-flight-form [name=departure]', n => n.value);
  const target = await p.evaluate(() => { const d = [...document.querySelectorAll('.smc-day')].find(x => !x.classList.contains('is-on')); d.click(); return d.querySelector('span').textContent; });
  await p.waitForFunction(m => document.querySelector('#sm-flight-form [name=departure]').value !== m, { timeout: 10000 }, before).catch(() => {});
  await pause(1500);
  ok(await p.$eval('#sm-flight-form [name=departure]', n => n.value) !== before && seen.market >= 2, `tapping a day (${target}) searches that date again`);
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

// C2) phone width: compare panel fits
{ const { ctx, p, errs } = await open('market', 390);
  await pick(p, 'origin_label', 'Islamabad', 'ISB'); await pick(p, 'destination_label', 'Dubai', 'DXB');
  await p.evaluate(() => document.querySelector('#sm-flight-form').requestSubmit());
  await p.waitForSelector('.smc .smc-tile--market', { visible: true, timeout: 30000 });
  await p.waitForFunction(() => !document.querySelector('.smc-card--skel'), { timeout: 45000 });
  const m = await p.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth + 1, smc: Math.round(document.querySelector('.smc').getBoundingClientRect().width), vw: innerWidth }));
  ok(!m.over && m.smc <= m.vw, `phone: compare panel fits (${m.smc}px of ${m.vw}px, no sideways page scroll)`);
  if (shots) await p.screenshot({ path: shots + '/travel-compare-phone.png', clip: await p.$eval('.smc', n => { const r = n.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(1700, r.height) }; }) });
  ok(errs.length === 0, 'phone: no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

// B) everything on: live Duffel fare next to market prices → book
{ const { ctx, p, errs, seen } = await open('all');
  await pick(p, 'origin_label', 'Karachi', 'KHI'); await pick(p, 'destination_label', 'Dubai', 'DXB');
  await p.evaluate(() => { const f = document.querySelector('#sm-flight-form'); const c = f.querySelector('[name=children]'); c.value = '1'; c.dispatchEvent(new Event('change', { bubbles: true })); const a = f.querySelector('[name="ages[]"]'); if (a) a.value = '7'; });
  await p.click('#sm-flight-form .sm-submit');
  await p.waitForSelector('.smc-card--live .smtb-btn--go', { visible: true, timeout: 30000 });
  await p.waitForFunction(() => !document.querySelector('.smc-card--skel'), { timeout: 45000 });
  const v1 = await p.evaluate(() => ({ live: document.querySelector('.smc-tile--live')?.innerText || '', chips: !document.querySelector('.smc-chips').hidden, groups: [...document.querySelectorAll('.smc-group__h')].map(n => n.textContent), btns: [...document.querySelectorAll('.smc-card--live button')].map(b => b.textContent) }));
  ok(seen.flights === 1 && seen.market === 1, 'both sources queried in parallel: live Duffel + Aviasales');
  ok(/\$230/.test(v1.live) && /2 travellers/.test(v1.live), 'live tile: lowest bookable total for all travellers');
  ok(v1.chips && v1.groups.some(g => /Bookable now/.test(g)), 'both groups shown with filter chips: ' + v1.groups.join(' | '));
  ok(v1.btns.includes('Book this fare') && v1.btns.includes('Ask our team'), 'live fare offers "Book this fare" and "Ask our team"');
  await p.click('.smc-chip[data-k="market"]');
  ok(await p.evaluate(() => !document.querySelector('.smc-card--live') && !!document.querySelector('.smc-card--market, .smc-empty')), '"Market prices" chip filters the list');
  await p.click('.smc-chip[data-k="all"]');
  if (shots) await p.screenshot({ path: shots + '/travel-compare-all.png', clip: await p.$eval('[data-flight-results]', n => { const r = n.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(1500, r.height) }; }) });
  await p.click('.smc-card--live .smtb-btn--go');
  await p.waitForSelector('dialog.smtb[open] .smtb-pax', { visible: true, timeout: 20000 });
  const fill = async (sel, val) => { await p.evaluate((s, x) => { const n = document.querySelector(s); n.value = x; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }, sel, val); };
  await fill('select[name=title0]', 'mr'); await fill('input[name=given0]', 'Test'); await fill('input[name=family0]', 'Passenger'); await fill('input[name=born0]', '1990-01-01');
  await fill('input[name=passport0]', 'AB1234567'); await fill('select[name=pcountry0]', 'PK'); await fill('input[name=pexpiry0]', '2030-01-01');
  await fill('select[name=title1]', 'miss'); await fill('input[name=given1]', 'Ayesha'); await fill('input[name=family1]', 'محمد'); await fill('input[name=born1]', '2019-05-05');
  await fill('input[name=passport1]', 'AB7654321'); await fill('select[name=pcountry1]', 'PK'); await fill('input[name=pexpiry1]', '2030-01-01');
  await fill('dialog.smtb input[name=email]', 'test@example.com'); await fill('dialog.smtb input[name=phone]', '+92 300 1234567');
  await p.click('dialog.smtb .smtb-check input'); await p.click('dialog.smtb .smtb-btn--go');
  ok(/English letters/.test(await p.$eval('dialog.smtb .smtb-status', n => n.textContent)) && !seen.start, 'non-Latin passport name stopped in the browser');
  await fill('input[name=family1]', 'Khan');
  await Promise.all([p.waitForNavigation({ timeout: 30000 }).catch(() => null), p.click('dialog.smtb .smtb-btn--go')]);
  const s = seen.start || {};
  ok(s.offer_id === OFFER.id && s.passengers?.length === 2 && s.passengers[1].id === 'pas_C1' && s.contact?.phone === '+92 300 1234567', 'booking/start: offer, passengers in slot order, contact');
  ok(p.url() === PAY && !!(await p.$('#paypage')), 'lands on the WooCommerce order-pay page (same PayPal / card buttons as checkout)');
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
