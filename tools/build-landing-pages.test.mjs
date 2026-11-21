// Run: node tools/build-landing-pages.mjs && node --test tools/build-landing-pages.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {S, toCyrillic} from './landing-i18n.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8'));
const {routes} = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/routes.json'), 'utf8'));
const read = rel => fs.readFileSync(path.join(root, rel, 'index.html'), 'utf8');
const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const textOf = rel => strip(read(rel)).replace(/\s+/g, ' ');
const intl = routes.filter(r => data.markets.some(m => m.slug === r.market));

/* what each locale must say, and the script it must be written in */
const LOCALE = {
  'en': {prepaid: /prepaid/i, tax: /taxes and duties/i, script: /[A-Za-z]/, forbidden: null},
  'en-GB': {prepaid: /prepaid/i, tax: /taxes and duties/i, script: /[A-Za-z]/},
  'en-US': {prepaid: /prepaid/i, tax: /taxes and duties/i, script: /[A-Za-z]/},
  'en-SA': {prepaid: /prepaid/i, tax: /taxes and duties/i, script: /[A-Za-z]/},
  'de-DE': {prepaid: /Vorkasse/, tax: /Steuern und Zölle/, script: /[A-Za-z]/, noEnglish: /Check my order|Taxes and duties|Browse the global|Prepaid checkout/},
  'sr-Latn-RS': {prepaid: /unapred/, tax: /Porezi i carine/, script: /[A-Za-z]/, noCyrillic: true, noEnglish: /Check my order|Taxes and duties|Browse the global/},
  'sr-Cyrl-RS': {prepaid: /унапред/, tax: /Порези и царине/, script: /[Ѐ-ӿ]/, noEnglish: /Check my order|Taxes and duties|Browse the global/, cyrillicOnlyUi: true},
  'ar-SA': {prepaid: /مسبق/, tax: /الضرائب والرسوم/, script: /[؀-ۿ]/, noEnglish: /Check my order|Taxes and duties|Browse the global/}
};

test('required markets and locales exist', () => {
  assert.deepEqual(data.markets.map(m => m.slug).sort(), ['germany', 'saudi-arabia', 'serbia', 'uk', 'usa']);
  const have = new Set(routes.map(r => r.locale));
  for (const l of ['en-PK', 'ur-PK', 'de-DE', 'en-GB', 'en-US', 'sr-Latn-RS', 'sr-Cyrl-RS', 'ar-SA', 'en-SA']) assert.ok(have.has(l), 'missing locale ' + l);
  for (const r of routes) assert.ok(fs.existsSync(path.join(root, r.rel, 'index.html')), r.rel);
  assert.equal(new Set(routes.map(r => r.rel)).size, routes.length, 'unique routes');
});

for (const r of routes) {
  const rtl = ['ur', 'ar'].includes(r.lang.split('-')[0]);
  test(`${r.rel} [${r.lang}]: head, language, direction, canonical, robots`, () => {
    const h = read(r.rel);
    assert.match(h, new RegExp(`<html lang="${r.lang}" dir="${rtl ? 'rtl' : 'ltr'}">`));
    assert.equal((h.match(/<h1[ >]/g) || []).length, 1, 'exactly one h1');
    assert.equal((h.match(/rel="canonical"/g) || []).length, 1);
    assert.match(h, new RegExp(`rel="canonical" href="https://sastamilaga.com/${r.rel}/"`));
    assert.match(h, new RegExp(`name="robots" content="${r.indexable ? 'index, follow' : 'noindex, follow'}`));
    const title = h.match(/<title>([^<]+)<\/title>/)[1], desc = h.match(/name="description" content="([^"]+)"/)[1];
    assert.ok(title.length >= 20 && title.length <= 80, 'title length ' + title.length);
    assert.ok(desc.length >= 60 && desc.length <= 190, 'description length ' + desc.length);
    if (!r.indexable) assert.doesNotMatch(h, /hreflang="(?!.*aria-current)[^"]*" href="https:/, 'noindex pages carry no hreflang link tags');
  });

  test(`${r.rel}: JSON-LD parses, language matches, no Offer/rating/review, FAQ text is visible`, () => {
    const h = read(r.rel);
    const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const j = JSON.parse(m[1]);
    const types = j['@graph'].map(x => x['@type']);
    assert.ok(types.includes('WebPage') && types.includes('BreadcrumbList'));
    assert.equal(j['@graph'].find(x => x['@type'] === 'WebPage').inLanguage, r.lang);
    assert.doesNotMatch(m[1], /"Offer"|aggregateRating|"Review"|"price"/);
    const faq = j['@graph'].find(x => x['@type'] === 'FAQPage');
    if (faq) for (const q of faq.mainEntity) assert.ok(textOf(r.rel).includes(q.acceptedAnswer.text.replace(/\s+/g, ' ').slice(0, 40)), 'FAQ answer visible: ' + q.name);
  });

  test(`${r.rel}: every internal link resolves to a real file`, () => {
    const h = read(r.rel);
    for (const m of h.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const v = m[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue;
      // Approved CJ PDP routes are dynamically served by the global-shop Worker, not static files.
      // Both referenced product URLs were verified live as 200/index/follow/self-canonical on 2026-11-20.
      if (/^\/global-shop\/p\/(?:[A-Fa-f0-9-]{36}|\d{19})\/[a-z0-9-]+\/$/.test(v)) continue;
      // Root-absolute URLs resolve from the site root; relative URLs resolve from the current page.
      let target = path.normalize(v.startsWith('/') ? path.join(root, v.slice(1)) : path.join(root, r.rel, v));
      if (v.endsWith('/')) target = path.join(target, 'index.html');
      assert.ok(fs.existsSync(target), `${r.rel} -> ${v}`);
    }
  });

  test(`${r.rel}: no invented promises`, () => {
    const t = textOf(r.rel);
    assert.doesNotMatch(t, /\b\d+\s*(?:-|to|–)\s*\d+\s*(?:business\s+)?(?:days|Tage|dana|дана|أيام)\b/i, 'no transit-day claims');
    assert.doesNotMatch(t, /\b(guarantee[ds]?|guaranteed delivery|free shipping to|lowest price|best price|100% |Garantie|garantovan|гарантова)/i);
    assert.doesNotMatch(t, /\b(customer reviews?|star ratings?|rated \d|customers love|bestselling|trusted by)\b/i);
  });
}

for (const r of intl) {
  const L = LOCALE[r.lang];
  test(`${r.rel} [${r.lang}]: localized copy, script and refusal of cash on delivery`, () => {
    assert.ok(L, 'locale expectations exist');
    const t = textOf(r.rel);
    assert.match(t, L.prepaid); assert.match(t, L.tax);
    assert.match(t, L.script);
    if (L.noEnglish) assert.doesNotMatch(t, L.noEnglish, 'no untranslated English UI strings');
    if (L.noCyrillic) assert.doesNotMatch(strip(read(r.rel).replace(/<nav class="sml-links" aria-label=[\s\S]*?<\/nav>/, '')).replace(/\s+/g, ' '), /[Ѐ-ӿ]/, 'Latin Serbian page contains no Cyrillic outside the language switcher');
    if (L.cyrillicOnlyUi) { const ui = t.replace(/Sasta Milaga|WhatsApp[-a]*/g, ''); assert.doesNotMatch(ui, /[čćžšđ]|Dostava|Porezi/, 'Cyrillic page has no leftover Serbian Latin'); }
    assert.doesNotMatch(t, /Rs\s*\d/, 'no rupee prices on a foreign-market page');
    if (r.lang.startsWith('en')) {
      const refusals = /(Can I pay cash on delivery for an order to [A-Za-z ]+\?|Cash on delivery is offered for local products inside Pakistan\.|no cash on delivery|not cash on delivery)/gi;
      assert.doesNotMatch(t.replace(refusals, ''), /cash on delivery/i);
    }
  });
  test(`${r.rel}: order panel markup and WhatsApp hand-off`, () => {
    const h = read(r.rel);
    assert.match(h, /<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>/);
    for (const name of ['product', 'quantity', 'city', 'tax', 'paid']) assert.match(h, new RegExp(`name="${name}"`));
    assert.match(h, /wa\.me\/'\+WA/);
  });
}

test('Serbian Cyrillic equals the transliteration of the Latin text, with brand names kept in Latin', () => {
  assert.equal(toCyrillic('Dostava za Srbiju, Sasta Milaga, WhatsApp'), 'Достава за Србију, Sasta Milaga, WhatsApp');
  assert.equal(toCyrillic('njiva ljubav džep Đorđe'), 'њива љубав џеп Ђорђе');
  const lat = textOf('shipping-to/serbia/sr-latn'), cyr = textOf('shipping-to/serbia/sr-cyrl');
  assert.ok(cyr.length > 0.8 * lat.length && cyr.length < 1.2 * lat.length);
});

test('every locale pair of a market links to its siblings and marks the current one', () => {
  for (const slug of ['germany', 'serbia', 'saudi-arabia']) {
    const rs = routes.filter(r => r.market === slug);
    assert.ok(rs.length >= 2, slug);
    for (const r of rs) { const h = read(r.rel); assert.match(h, /aria-current="true"/); for (const o of rs.filter(x => x !== r)) assert.ok(h.includes(`hreflang="${o.lang}"`), `${r.rel} links to ${o.lang}`); }
  }
});

test('Pakistan facts match the store configuration', () => {
  const cfg = fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8');
  assert.match(cfg, new RegExp('deliveryFee:\\s*' + data.pakistan.delivery_fee_pkr + '\\b'));
  assert.match(cfg, new RegExp('freeDeliveryFrom:\\s*' + data.pakistan.free_delivery_from_pkr + '\\b'));
  // Landing-market support and storefront checkout may legitimately use
  // different regional WhatsApp numbers. Validate each configured E.164 number
  // without overwriting either business contact or payment routing.
  const storeWhatsApp = cfg.match(/whatsapp:\\s*'([1-9][0-9]{7,14})'/)?.[1];
  assert.ok(storeWhatsApp, 'Storefront WhatsApp must be a valid international number');
  assert.match(String(data.whatsapp), /^[1-9][0-9]{7,14}$/, 'Landing-market WhatsApp must be valid');
});

test('Pakistan English and Urdu reference each other (reciprocal hreflang); sitemap lists only indexable pages', () => {
  for (const rel of ['pakistan', 'ur/pakistan']) {
    const h = read(rel);
    assert.match(h, /hreflang="en" href="https:\/\/sastamilaga.com\/pakistan\/"/);
    assert.match(h, /hreflang="ur" href="https:\/\/sastamilaga.com\/ur\/pakistan\/"/);
    assert.match(h, /hreflang="x-default" href="https:\/\/sastamilaga.com\/pakistan\/"/);
  }
  const sm = fs.readFileSync(path.join(root, 'sitemap-landing.xml'), 'utf8');
  for (const r of routes) assert.equal(sm.includes(`<loc>https://sastamilaga.com/${r.rel}/</loc>`), !!r.indexable, r.rel);
});

test('indexable pages form a complete hreflang set; non-indexable pages never appear in one', () => {
  const idx = routes.filter(r => r.indexable);
  for (const r of idx) { const h = read(r.rel); for (const o of idx.filter(x => x.market === r.market)) assert.ok(h.includes(`hreflang="${o.lang === 'en-PK' ? 'en' : o.lang === 'ur-PK' ? 'ur' : o.lang}" href="https://sastamilaga.com/${o.rel}/"`), `${r.rel} lists ${o.rel}`); }
  for (const r of routes.filter(x => !x.indexable)) for (const o of routes) assert.ok(!read(o.rel).includes(`hreflang="${r.lang}" href="https://sastamilaga.com/${r.rel}/"`), `${o.rel} must not list noindex ${r.rel}`);
});

test('English strings are unchanged for the English pages (regression)', () => {
  assert.equal(S.en.send, 'Send my order details on WhatsApp');
  assert.match(textOf('shipping-to/uk'), /Global items, delivered to the United Kingdom/);
});

test('stylesheet uses the site theme tokens and animates only transform and opacity', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/landing.css'), 'utf8');
  for (const tok of ['#0F7A3B', '#FF8A00', '#EAF6EE', '#0B3B20']) assert.ok(css.includes(tok), tok);
  assert.doesNotMatch(css, /transition:\s*all/);
  for (const m of css.matchAll(/transition:([^;}]+)/g)) {
    if (m[1].trim() === 'none') continue;
    for (const part of m[1].split(/,(?![^(]*\))/)) assert.match(part.trim().split(/\s+/)[0], /^(transform|opacity)$/, 'transition: ' + part);
  }
});

test('build is idempotent', async () => {
  const {execFileSync} = await import('node:child_process');
  const snap = () => routes.map(p => read(p.rel)).join('\n') + fs.readFileSync(path.join(root, 'sitemap-landing.xml'), 'utf8') + fs.readFileSync(path.join(root, 'data/landing/routes.json'), 'utf8');
  const a = snap();
  execFileSync(process.execPath, [path.join(root, 'tools/build-landing-pages.mjs')], {cwd: root});
  assert.equal(snap(), a);
});

/* ---- live CJ shipping estimate in the order panel ---- */
import vm from 'node:vm';
const CC = {germany: 'DE', uk: 'GB', usa: 'US', serbia: 'RS', 'saudi-arabia': 'SA'};
for (const r of intl) {
  test(`${r.rel} [${r.lang}]: live-estimate block, country code, hidden quote field, parsable script`, () => {
    const h = read(r.rel);
    assert.match(h, new RegExp(`<div id="sml-quote" class="sml-quote" data-cc="${CC[r.market]}">`));
    assert.match(h, /<input type="hidden" name="quote" value="">/);
    assert.match(h, /<button type="button" class="sml-btn sml-btn--line" data-quote disabled>/);
    const m = h.match(/<script>\(function\(\)\{var f=document\.getElementById\('sml-order'\),q=document\.getElementById\('sml-quote'\)[\s\S]*?<\/script>/);
    assert.ok(m, 'quote script present');
    assert.doesNotThrow(() => new vm.Script(m[0].replace(/^<script>|<\/script>$/g, '')));
    assert.match(m[0], /https:\/\/sastamilaga\.com\/api\/cj\//);
    assert.doesNotMatch(m[0], /innerHTML|document\.write|eval\(/, 'rates are written with textContent only');
    assert.doesNotMatch(strip(h).replace(/\s+/g, ' '), /\b\d+(?:\.\d+)?\s*(?:USD|US\$)\b.*\bdays\b/i, 'no static prices or day counts in the HTML');
  });
}
test('Pakistan pages have no CJ quote block (local products, cash on delivery)', () => {
  for (const rel of ['pakistan', 'ur/pakistan']) assert.doesNotMatch(read(rel), /sml-quote|api\/cj/);
});
test('sitemap.xml lists sitemap-landing.xml exactly once', () => {
  const sm = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  assert.equal((sm.match(/sitemap-landing\.xml/g) || []).length, 1);
  assert.match(sm, /<sitemapindex[\s\S]*<\/sitemapindex>/);
});

test('no landing-page link or button trips the site-wide click guard (words like checkout, order now, cash on delivery in link text make the edge script swallow the click)', () => {
  const guard = /add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i;
  const files = [['shipping-to/index.html'], ['pakistan/index.html'], ['ur/pakistan/index.html'], ...['germany', 'uk', 'usa', 'serbia', 'saudi-arabia'].map(m => [`shipping-to/${m}/index.html`])];
  for (const [f] of files) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
    for (const m of main.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const href = (m[2].match(/href="([^"]*)"/) || [])[1] || '';
      if (/^\/(?:cart|checkout|my-account)(?:\/|$)/i.test(href)) continue;
      const text = m[3].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      assert.ok(!guard.test([text, m[2], href].join(' ')), `${f}: guarded wording in <${m[1]}>: ${text.slice(0, 80)}`);
    }
  }
});

test('Serbian Cyrillic keeps interpolation tokens until after transliteration', () => {
  assert.equal(toCyrillic('Dostava u {to} i {region}'), 'Достава у {to} и {region}');
  const html = read('shipping-to/serbia/sr-cyrl');
  assert.doesNotMatch(html, /\{(?:то|лабел|лоц|регион)\}/, 'no transliterated variables in public page');
  assert.match(html, /Глобални артикли са испоруком у Србију/);
});

test('all country storefront pages use isolated showcase CSS and readable scenic hero copy', () => {
  const css = fs.readFileSync(path.join(root, 'assets/css/country-showcase.css'), 'utf8');
  assert.ok(css.includes('.smxc{'), 'isolated showcase wrapper style');
  assert.match(css, /color:#084629!important/);
  assert.match(css, /color:#254b36!important/);
  assert.match(css, /color:#0b613a!important/);
  for (const r of routes) {
    const html = read(r.rel);
    assert.match(html, /class="smxc" data-smx-market=/, r.rel + ' must use dedicated showcase namespace');
    assert.doesNotMatch(html, /<div class="smx" data-smx-market=/, 'legacy travel CSS namespace conflicts: ' + r.rel);
    assert.ok(html.includes('country-showcase.css'), 'missing shared responsive CSS: ' + r.rel);
    assert.match(html, /id="sm-chrome-footer"/, 'shared footer unchanged: ' + r.rel);
  }
});
