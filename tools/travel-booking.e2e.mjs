// Real-browser check of the /travel/ flight search with the LOCAL travel.js + travel-booking.js/.css injected into the LIVE page.
// Airport suggestions come from the live site; the request / booking routes are MOCKED here, so nothing is stored or charged.
//  A) request mode (no supplier key): search → "Get your best fare" sheet → request number + WhatsApp hand-off
//  B) booking mode (Duffel on): live-fare card → "Book this fare" → fresh price + passenger form → order-pay page
// Usage: node tools/travel-booking.e2e.mjs [repoRoot] [screenshotDir]   (puppeteer-core + Chrome; CHROME env var for the path)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const repo = process.argv[2] || new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1').replace(/\/$/, ''), shots = process.argv[3] || '';
const local = {
  '/assets/js/travel.js': ['text/javascript', fs.readFileSync(repo + '/assets/js/travel.js', 'utf8')],
  '/assets/js/travel-booking.js': ['text/javascript', fs.readFileSync(repo + '/assets/js/travel-booking.js', 'utf8')],
  '/assets/css/travel-booking.css': ['text/css', fs.readFileSync(repo + '/assets/css/travel-booking.css', 'utf8')],
};
const GUARD = /add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i;
const dep = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
const OFFER = { id: 'off_0000TESTOFFER1', price: 230, currency: 'USD', carriers: ['Duffel Airways'], taxAmount: 50, taxCurrency: 'USD', expiresAt: new Date(Date.now() + 1800e3).toISOString(),
  journeys: [[{ carrier: 'Duffel Airways', flightNumber: 'ZZ101', origin: 'KHI', destination: 'DXB', departingAt: dep + 'T09:00:00', arrivingAt: dep + 'T10:15:00' }]], baggage: [{ type: 'checked', quantity: 1 }] };
const VIEW = { id: OFFER.id, price: 231.5, currency: 'USD', expiresAt: OFFER.expiresAt, hold: true, priceGuaranteeUntil: null, idsRequired: true, bookable: true, owner: 'Duffel Airways', carriers: ['Duffel Airways'],
  passengers: [{ id: 'pas_A1', type: 'adult', age: null }, { id: 'pas_C1', type: 'child', age: 7 }],
  slices: [{ from: 'KHI', to: 'DXB', fromName: 'Karachi', toName: 'Dubai', duration: 'PT2H15M', segments: [{ carrier: 'Duffel Airways', flight: 'ZZ101', from: 'KHI', to: 'DXB', dep: dep + 'T09:00:00', arr: dep + 'T10:15:00' }] }],
  refund: { allowed: true, penalty: 40, currency: 'USD' }, change: { allowed: false, penalty: null, currency: '' } };
const PAY = 'https://sastamilaga.com/checkout/order-pay/99999/?pay_for_order=true&key=wc_order_TEST';

const b = await puppeteer.launch({ executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new' });
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };

async function open(mode, width = 1280) {
  const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport({ width, height: width < 700 ? 844 : 900, isMobile: width < 700, hasTouch: width < 700 });
  const errs = [], seen = { request: null, start: null, offer: 0, flights: 0, config: 0 };
  p.on('pageerror', e => errs.push(e.message + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.setRequestInterception(true);
  p.on('request', async r => {
    const u = new URL(r.url());
    if (u.origin !== 'https://sastamilaga.com') return /\.(png|jpe?g|webp|gif|woff2?)(\?|$)/.test(u.pathname) || /cloudflareinsights|googletagmanager|clarity|facebook/.test(u.host) ? r.abort() : r.continue();
    if (local[u.pathname]) return r.respond({ status: 200, contentType: local[u.pathname][0], body: local[u.pathname][1] });
    const api = u.pathname.replace('/wp-json/sm-travel/v1/', '');
    const json = (data, status = 200) => r.respond({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (u.pathname.startsWith('/wp-json/sm-travel/v1/')) {
      if (api === 'booking/config') { seen.config++; return json(mode === 'booking' ? { mode: 'duffel', search: true, booking: true, currencies: ['USD', 'EUR', 'GBP'] } : { mode: 'request', search: false, booking: false, currencies: [] }); }
      if (api === 'request') { seen.request = JSON.parse(r.postData() || '{}'); return json({ request: 70999, ref: '#70999', whatsapp: 'https://wa.me/923343582295?text=' + encodeURIComponent('Hello Sasta Milaga, about my travel request #70999'), email: true }); }
      if (api === 'duffel/flights') { seen.flights++; return json({ results: [OFFER], source: 'Duffel live search', bookingEnabled: false }); }
      if (api === 'booking/offer') { seen.offer++; return json(VIEW); }
      if (api === 'booking/start') { seen.start = JSON.parse(r.postData() || '{}'); return json({ order: 99999, pay_url: PAY, mode: 'hold', held_until: OFFER.expiresAt, amount: 231.5, currency: 'USD' }); }
      return r.continue();   // suggest, hotel-suggest: the live site
    }
    // Stand-in for the WooCommerce order-pay page. It opts into cross-document view transitions like the static site does
    // (@view-transition{navigation:auto}); without that Chrome reports a harmless "Transition was aborted" error on the old page.
    if (u.pathname.startsWith('/checkout/order-pay/')) return r.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>order pay</title><style>@view-transition{navigation:auto}</style><h1 id="paypage">Order pay page (test)</h1>' });
    r.continue();
  });
  await p.goto('https://sastamilaga.com/travel/?tab=flights&e2e=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 120000 });
  await p.waitForSelector('#sm-flight-form input[name="origin_label"]', { visible: true, timeout: 60000 });
  return { ctx, p, errs, seen };
}
/** Type into an airport field and click the live suggestion for that IATA code. */
async function pick(p, name, q, code) {
  const input = `#sm-flight-form input[name="${name}"]`;
  await p.click(input, { clickCount: 3 }); await p.type(input, q, { delay: 40 });
  await p.waitForFunction((n, c) => [...(document.querySelector(`#sm-flight-form input[name="${n}"]`)?.closest('.sm-field')?.querySelectorAll('.sm-suggestions button') || [])].some(b => b.textContent.includes(`(${c})`)), { timeout: 30000 }, name, code);
  await p.evaluate((n, c) => [...document.querySelector(`#sm-flight-form input[name="${n}"]`).closest('.sm-field').querySelectorAll('.sm-suggestions button')].find(b => b.textContent.includes(`(${c})`)).click(), name, code);
}
const guardHits = p => p.evaluate(src => { const g = new RegExp(src, 'i'); return [...document.querySelectorAll('dialog.smtb a, dialog.smtb button, .sm-fare-actions button')].filter(n => { const href = n.getAttribute('href') || ''; if (/^(https:\/\/sastamilaga\.com)?\/(cart|checkout|my-account)\//.test(href)) return false; return g.test([n.textContent, n.getAttribute('aria-label') || '', n.id, href].join(' ')); }).map(n => n.textContent.trim()); }, GUARD.source);

// A) request mode
{ const { ctx, p, errs, seen } = await open('request');
  await pick(p, 'origin_label', 'Karachi', 'KHI'); await pick(p, 'destination_label', 'Dubai', 'DXB');
  const codes = await p.evaluate(() => [document.querySelector('#sm-flight-form [name=origin]').value, document.querySelector('#sm-flight-form [name=destination]').value]);
  ok(codes[0] === 'KHI' && codes[1] === 'DXB', `live suggestions fill the airport codes (${codes.join(' → ')})`);
  await p.click('#sm-flight-form .sm-submit');
  await p.waitForSelector('dialog.smtb[open] input[name="name"]', { visible: true, timeout: 20000 });
  const sheet = await p.evaluate(() => ({ title: document.getElementById('smtb-title')?.textContent, trip: document.querySelector('.smtb-trip')?.innerText || '' }));
  ok(sheet.title === 'Get your best fare' && /Karachi/.test(sheet.trip) && /Dubai/.test(sheet.trip), 'search opens the "Get your best fare" sheet with the trip summary');
  ok(seen.config >= 1 && seen.flights === 0, 'request mode: config read, no live search called');
  await p.click('dialog.smtb .smtb-btn--go');
  const err1 = await p.$eval('dialog.smtb .smtb-status', n => n.textContent);
  ok(/name/i.test(err1) && !seen.request, 'empty form is not sent; clear message: ' + err1);
  await p.type('dialog.smtb input[name="name"]', 'Test Customer'); await p.type('dialog.smtb input[name="phone"]', '+92 300 1234567'); await p.type('dialog.smtb input[name="email"]', 'test@example.com');
  await p.type('dialog.smtb textarea[name="notes"]', 'Flexible by 2 days');
  if (shots) await p.screenshot({ path: shots + '/travel-request-desktop.png' });
  await p.click('dialog.smtb .smtb-btn--go');
  const err2 = await p.$eval('dialog.smtb .smtb-status', n => n.textContent);
  ok(/tick/i.test(err2) && !seen.request, 'consent is required before sending');
  await p.click('dialog.smtb .smtb-check input'); await p.click('dialog.smtb .smtb-btn--go');
  await p.waitForSelector('dialog.smtb .smtb-done__ref', { timeout: 20000 });
  const r = seen.request || {};
  ok(r.kind === 'flight' && r.origin === 'KHI' && r.destination === 'DXB' && r.name === 'Test Customer' && r.phone === '+92 300 1234567' && r.email === 'test@example.com' && r.consent === true && /Karachi/.test(r.origin_label || '') && r.departure && typeof r.key === 'string', 'request body carries trip, labels, contact, consent and an idempotency key');
  const done = await p.evaluate(() => ({ ref: document.querySelector('.smtb-done__ref')?.textContent, wa: document.querySelector('.smtb-btn--wa')?.href || '', steps: document.querySelectorAll('.smtb-steps li').length }));
  ok(/#70999/.test(done.ref) && done.wa.startsWith('https://wa.me/') && done.steps === 3, 'success view: request number, 3 next steps, WhatsApp button');
  if (shots) await p.screenshot({ path: shots + '/travel-request-done.png' });
  ok((await guardHits(p)).length === 0, 'no sheet button or link trips the edge click guard');
  const note = await p.$eval('[data-affiliate-note]', n => n.textContent);
  ok(/secure payment link/.test(note), 'search footnote explains the request + payment-link flow');
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

// A2) phone width: the sheet is full screen and fits
{ const { ctx, p, errs } = await open('request', 390);
  await pick(p, 'origin_label', 'Lahore', 'LHE'); await pick(p, 'destination_label', 'Jeddah', 'JED');
  await p.evaluate(() => document.querySelector('#sm-flight-form').requestSubmit());
  await p.waitForSelector('dialog.smtb[open] input[name="name"]', { visible: true, timeout: 20000 });
  const m = await p.evaluate(() => { const d = document.querySelector('dialog.smtb').getBoundingClientRect(); return { w: Math.round(d.width), vw: innerWidth, overflow: document.querySelector('.smtb__body').scrollWidth > document.querySelector('.smtb__body').clientWidth + 1 }; });
  ok(m.w >= m.vw - 1 && !m.overflow, `phone: sheet is full width (${m.w}/${m.vw}px) with no sideways scroll`);
  if (shots) await p.screenshot({ path: shots + '/travel-request-phone.png' });
  ok(errs.length === 0, 'phone: no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

// B) booking mode
{ const { ctx, p, errs, seen } = await open('booking');
  await pick(p, 'origin_label', 'Karachi', 'KHI'); await pick(p, 'destination_label', 'Dubai', 'DXB');
  await p.evaluate(() => { const f = document.querySelector('#sm-flight-form'); const c = f.querySelector('[name=children]'); c.value = '1'; c.dispatchEvent(new Event('change', { bubbles: true })); const a = f.querySelector('[name="ages[]"]'); if (a) a.value = '7'; });
  await p.click('#sm-flight-form .sm-submit');
  await p.waitForSelector('.sm-fare-actions .sm-fare-book', { visible: true, timeout: 20000 });
  ok(seen.flights === 1, 'booking mode: live search called once');
  const card = await p.evaluate(() => [...document.querySelectorAll('.sm-fare-actions button')].map(b => b.textContent));
  ok(card.includes('Book this fare') && card.includes('Ask our team'), 'fare card offers "Book this fare" and "Ask our team"');
  ok((await guardHits(p)).length === 0, 'fare card buttons are guard-safe');
  if (shots) await p.screenshot({ path: shots + '/travel-results.png' });
  await p.click('.sm-fare-actions .sm-fare-book');
  await p.waitForSelector('dialog.smtb[open] .smtb-pax', { visible: true, timeout: 20000 });
  const v = await p.evaluate(() => ({ price: document.querySelector('.smtb-price strong')?.textContent, label: document.querySelector('.smtb-price span')?.textContent, pax: document.querySelectorAll('.smtb-pax legend').length, passport: !!document.querySelector('input[name="passport0"]'), rules: document.querySelector('.smtb-rules')?.innerText || '' }));
  ok(seen.offer === 1 && /231/.test(v.price || '') && /Updated/.test(v.label || ''), 'fare re-priced before the form; a changed price is labelled ' + v.price);
  ok(v.pax === 3 && v.passport, 'one block per passenger (adult + child) plus contact, passport fields when the airline needs them');
  ok(/Refund before departure: allowed/.test(v.rules) && /holds your seats/.test(v.rules), 'airline rules and the seat hold are shown');
  if (shots) await p.screenshot({ path: shots + '/travel-book-desktop.png' });
  const fill = async (sel, val) => { await p.evaluate((s, x) => { const n = document.querySelector(s); n.value = x; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }, sel, val); };
  await fill('select[name=title0]', 'mr'); await fill('input[name=given0]', 'Test'); await fill('input[name=family0]', 'Passenger'); await fill('input[name=born0]', '1990-01-01');
  await fill('input[name=passport0]', 'AB1234567'); await fill('select[name=pcountry0]', 'PK'); await fill('input[name=pexpiry0]', '2030-01-01');
  await fill('select[name=title1]', 'miss'); await fill('input[name=given1]', 'Ayesha'); await fill('input[name=family1]', 'محمد'); await fill('input[name=born1]', '2019-05-05');
  await fill('input[name=passport1]', 'AB7654321'); await fill('select[name=pcountry1]', 'PK'); await fill('input[name=pexpiry1]', '2030-01-01');
  await fill('dialog.smtb input[name=email]', 'test@example.com'); await fill('dialog.smtb input[name=phone]', '+92 300 1234567');
  await p.click('dialog.smtb .smtb-check input');
  await p.click('dialog.smtb .smtb-btn--go');
  const e1 = await p.$eval('dialog.smtb .smtb-status', n => n.textContent);
  ok(/English letters/.test(e1) && !seen.start, 'non-Latin passport name stopped in the browser: ' + e1);
  await fill('input[name=family1]', 'Khan');
  await Promise.all([p.waitForNavigation({ timeout: 30000 }).catch(() => null), p.click('dialog.smtb .smtb-btn--go')]);
  const s = seen.start || {};
  ok(s.offer_id === OFFER.id && s.passengers?.length === 2 && s.passengers[0].id === 'pas_A1' && s.passengers[1].id === 'pas_C1' && s.passengers[0].passport === 'AB1234567' && s.contact?.phone === '+92 300 1234567' && typeof s.key === 'string', 'booking/start body: offer, passenger slots in order, passport, contact, idempotency key');
  ok(p.url() === PAY && !!(await p.$('#paypage')), 'browser lands on the WooCommerce order-pay page (same PayPal / card buttons as checkout)');
  ok(errs.length === 0, 'no JavaScript errors' + (errs.length ? ': ' + errs.join(' || ') : ''));
  await ctx.close(); }

await b.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
