// Run: node tools/build-landing-pages.mjs && node --test tools/build-landing-pages.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8'));
const pages = [
  {rel: 'pakistan', lang: 'en', dir: 'ltr', indexable: true},
  {rel: 'ur/pakistan', lang: 'ur', dir: 'rtl', indexable: true},
  {rel: 'shipping-to', lang: 'en', dir: 'ltr', indexable: false},
  ...data.markets.map(m => ({rel: 'shipping-to/' + m.slug, lang: 'en', dir: 'ltr', indexable: m.indexable, market: m}))
];
const read = rel => fs.readFileSync(path.join(root, rel, 'index.html'), 'utf8');
const strip = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

test('the five requested markets plus Pakistan exist', () => {
  assert.deepEqual(data.markets.map(m => m.slug).sort(), ['germany', 'saudi-arabia', 'serbia', 'uk', 'usa']);
  for (const p of pages) assert.ok(fs.existsSync(path.join(root, p.rel, 'index.html')), p.rel);
});

for (const p of pages) {
  test(`${p.rel}: head, language, canonical, robots`, () => {
    const h = read(p.rel);
    assert.match(h, new RegExp(`<html lang="${p.lang}" dir="${p.dir}">`));
    assert.equal((h.match(/<h1[ >]/g) || []).length, 1, 'exactly one h1');
    assert.equal((h.match(/rel="canonical"/g) || []).length, 1);
    assert.match(h, new RegExp(`rel="canonical" href="https://sastamilaga.com/${p.rel}/"`));
    assert.match(h, new RegExp(`name="robots" content="${p.indexable ? 'index, follow' : 'noindex, follow'}`));
    const title = h.match(/<title>([^<]+)<\/title>/)[1], desc = h.match(/name="description" content="([^"]+)"/)[1];
    assert.ok(title.length >= 20 && title.length <= 75, 'title length ' + title.length);
    assert.ok(desc.length >= 70 && desc.length <= 180, 'description length ' + desc.length);
    if (!p.indexable) assert.doesNotMatch(h, /hreflang/, 'noindex pages carry no hreflang');
  });

  test(`${p.rel}: JSON-LD parses and has no Offer, rating or review`, () => {
    const h = read(p.rel);
    const m = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    const j = JSON.parse(m[1]);
    const types = j['@graph'].map(x => x['@type']);
    assert.ok(types.includes('WebPage') && types.includes('BreadcrumbList'));
    assert.doesNotMatch(m[1], /"Offer"|aggregateRating|"Review"|"price"/);
    const faq = j['@graph'].find(x => x['@type'] === 'FAQPage');
    if (faq) for (const q of faq.mainEntity) assert.ok(strip(h).replace(/\s+/g, ' ').includes(q.acceptedAnswer.text.slice(0, 40)), 'FAQ text is visible on the page');
  });

  test(`${p.rel}: every internal link resolves to a real file`, () => {
    const h = read(p.rel);
    for (const m of h.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const v = m[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue;
      let target = path.normalize(path.join(root, p.rel, v));
      if (v.endsWith('/')) target = path.join(target, 'index.html');
      assert.ok(fs.existsSync(target), `${p.rel} -> ${v}`);
    }
  });

  test(`${p.rel}: no invented promises`, () => {
    const t = strip(read(p.rel)).replace(/\s+/g, ' ');
    assert.doesNotMatch(t, /\b\d+\s*(?:-|to)\s*\d+\s*(?:business\s+)?days\b/i, 'no transit-day claims');
    assert.doesNotMatch(t, /\b(guarantee[ds]?|guaranteed delivery|free shipping to|lowest price|best price|100% )/i);
    assert.doesNotMatch(t, /\b(customer reviews?|star ratings?|rated \d|customers love|bestselling|trusted by)\b/i);
  });
}

for (const p of pages.filter(x => x.market)) {
  test(`${p.rel}: international page avoids Pakistan and cash-on-delivery promises`, () => {
    const t = strip(read(p.rel)).replace(/\s+/g, ' ');
    assert.match(t, /prepaid/i);
    assert.match(t, /taxes and duties/i);
    // "cash on delivery" may appear only to refuse it: in a negation, or in the question/answer that says no.
    const refusals = /(Can I pay cash on delivery for an order to [A-Za-z ]+\?|Cash on delivery is offered for local products inside Pakistan\.|no cash on delivery|not cash on delivery)/gi;
    assert.doesNotMatch(t.replace(refusals, ''), /cash on delivery/i);
    if (/cash on delivery/i.test(t)) assert.match(t, /no cash on delivery|not cash on delivery|No\. Cash on delivery is offered for local products inside Pakistan/i, 'COD is mentioned only to refuse it');
    assert.doesNotMatch(t, /Rs\s*\d/, 'no rupee prices on a foreign-market page');
  });
  test(`${p.rel}: order panel unlocks only with required fields`, () => {
    const h = read(p.rel);
    assert.match(h, /<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>/);
    for (const name of ['product', 'quantity', 'city', 'tax', 'paid']) assert.match(h, new RegExp(`name="${name}"`));
    assert.match(h, /wa\.me\/'\+WA/);
  });
}

test('Pakistan facts match the store configuration', () => {
  const cfg = fs.readFileSync(path.join(root, 'assets/js/config.js'), 'utf8');
  assert.match(cfg, new RegExp('deliveryFee:\\s*' + data.pakistan.delivery_fee_pkr + '\\b'));
  assert.match(cfg, new RegExp('freeDeliveryFrom:\\s*' + data.pakistan.free_delivery_from_pkr + '\\b'));
  assert.match(cfg, new RegExp("whatsapp:\\s*'" + data.whatsapp + "'"));
});

test('Pakistan English and Urdu reference each other (reciprocal hreflang) and the sitemap lists only indexable pages', () => {
  const en = read('pakistan'), ur = read('ur/pakistan');
  for (const h of [en, ur]) {
    assert.match(h, /hreflang="en" href="https:\/\/sastamilaga.com\/pakistan\/"/);
    assert.match(h, /hreflang="ur" href="https:\/\/sastamilaga.com\/ur\/pakistan\/"/);
    assert.match(h, /hreflang="x-default" href="https:\/\/sastamilaga.com\/pakistan\/"/);
  }
  const sm = fs.readFileSync(path.join(root, 'sitemap-landing.xml'), 'utf8');
  assert.ok(sm.includes('/pakistan/') && sm.includes('/ur/pakistan/'));
  for (const m of data.markets) assert.equal(sm.includes('/shipping-to/' + m.slug + '/'), !!m.indexable, m.slug);
  assert.ok(!sm.includes('/shipping-to/</loc>'), 'hub is noindex and not listed');
});

test('Urdu page uses right-to-left layout and Urdu copy', () => {
  const h = read('ur/pakistan');
  assert.match(h, /<div class="sml" dir="rtl">/);
  assert.match(h, /[؀-ۿ]{4,}/);
  assert.match(h, /250/); assert.match(h, /5,000/);
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
  const snap = () => pages.map(p => read(p.rel)).join('\n') + fs.readFileSync(path.join(root, 'sitemap-landing.xml'), 'utf8');
  const a = snap();
  execFileSync(process.execPath, [path.join(root, 'tools/build-landing-pages.mjs')], {cwd: root});
  assert.equal(snap(), a);
});
