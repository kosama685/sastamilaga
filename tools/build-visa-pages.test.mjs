// node tools/build-visa-pages.mjs && node --test tools/build-visa-pages.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {COUNTRIES, status, okLink, buildAll} from './build-visa-pages.mjs';
import {SCHENGEN, GCC, INVESTMENT, TYPES, PORTALS} from './visa-content.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const DATA = JSON.parse(rd('data/visa/pk-requirements.json'));
const {pages} = buildAll();
const page = slug => pages.find(p => p.rel === `visa/${slug}/`).html;
const bySlug = Object.fromEntries(COUNTRIES.map(c => [c.code, c]));

test('one page per destination in the dataset, unique slugs, plus 9 guides and a guides index', () => {
  assert.equal(COUNTRIES.length, DATA.count);
  assert.equal(new Set(COUNTRIES.map(c => c.slug)).size, COUNTRIES.length);
  for (const t of TYPES) assert.ok(pages.some(p => p.rel === `visa/guides/${t.slug}/`), t.slug);
  assert.ok(pages.some(p => p.rel === 'visa/guides/'));
  assert.equal(pages.length, COUNTRIES.length + TYPES.length + 1);
});
test('every page: one H1, self canonical, indexable, valid JSON-LD with breadcrumbs, site chrome', () => {
  for (const p of pages) {
    const h = p.html;
    assert.equal((h.match(/<h1[ >]/g) || []).length, 1, p.rel);
    assert.ok(h.includes(`<link rel="canonical" href="https://sastamilaga.com/${p.rel}">`), p.rel);
    assert.match(h, /<meta name="robots" content="index, follow/);
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.ok(ld['@graph'].some(x => x['@type'] === 'BreadcrumbList'), p.rel);
    assert.ok(h.includes('id="sm-chrome-header" data-prefix="/"') && h.includes('/assets/js/chrome.js'), p.rel);
  }
});
test('entry status shown matches the dataset and is always dated and attributed', () => {
  for (const c of COUNTRIES) {
    const h = page(c.slug), st = status(DATA.requirements[c.code]);
    assert.ok(h.includes(`<strong>${st.label.replace(/&/g, '&amp;')}</strong>`), c.code + ' ' + st.label);
    assert.ok(h.includes('Last published status, January 2025'), c.code);
    assert.ok(h.includes('passport-index dataset'), c.code);
  }
  assert.equal(status('90').label, 'Visa-free up to 90 days');
  assert.equal(status('e-visa').key, 'evisa');
  assert.equal(status('visa required').key, 'required');
});
test('no fees, prices, processing times or investment amounts are published', () => {
  for (const p of pages) {
    const text = p.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    const money = text.match(/(?:US\$|\$|€|£|USD|EUR|PKR|Rs\.?)\s?\d[\d,]*/g) || [];
    assert.deepEqual(money.filter(m => !/€30,000/.test(m)), [], p.rel + ' ' + money.join(' '));
    assert.doesNotMatch(text, /\b\d+\s*(?:working\s+)?days to process|processed in \d+/i, p.rel);
  }
});
test('only official links that passed the link check are published', () => {
  for (const c of COUNTRIES) {
    const h = page(c.slug), url = PORTALS[c.code];
    if (url && okLink(url)) assert.ok(h.includes(url), c.code + ' verified portal missing');
    if (url && !okLink(url)) assert.ok(!h.includes(url), c.code + ' unverified portal published');
  }
});
test('Schengen guidance only on Schengen countries; GCC guidance only on GCC countries', () => {
  for (const c of COUNTRIES) {
    const h = page(c.slug);
    assert.equal(h.includes('90 days in any 180-day period'), SCHENGEN.has(c.code), c.code);
    assert.equal(h.includes('€30,000'), SCHENGEN.has(c.code), c.code);
    assert.equal(h.includes('Wafid system'), GCC.has(c.code), c.code);
  }
});
test('investment: closed programmes say Closed, countries without one say so, nothing claims a guarantee', () => {
  for (const c of COUNTRIES) {
    const h = page(c.slug), progs = INVESTMENT[c.code] || [];
    if (!progs.length) assert.ok(h.includes('We are not aware of a residence- or citizenship-by-investment programme'), c.code);
    for (const pr of progs) { assert.ok(h.includes(pr.name.replace(/'/g, '&#39;').replace(/&(?!#)/g, '&amp;')), c.code + ' ' + pr.name); if (pr.status === 'closed') assert.match(h, /sv-badge--closed">Closed</); }
    assert.doesNotMatch(h.replace(/cannot guarantee|can guarantee my visa|never guarantee|guarantee approval|nobody can guarantee|Can Sasta Milaga guarantee/gi, ''), /guarantee/i, c.code);
  }
  assert.match(page(bySlug.ES.slug), /Spain investor residence \(golden visa\)[\s\S]*Abolished in 2025/);
  assert.match(page(bySlug.MT.slug), /EU Court of Justice ruled in April 2025/);
});
test('sitemap-visa.xml lists every page and is referenced from sitemap.xml; /visa/ carries the directory', () => {
  const sm = rd('sitemap-visa.xml');
  assert.ok(sm.includes('<loc>https://sastamilaga.com/visa/</loc>'));
  for (const p of pages) assert.ok(sm.includes(`<loc>https://sastamilaga.com/${p.rel}</loc>`), p.rel);
  assert.ok(rd('sitemap.xml').includes('<loc>https://sastamilaga.com/sitemap-visa.xml</loc>'));
  const hub = rd('visa/index.html');
  assert.ok(hub.includes('sv-hub'));
  for (const c of COUNTRIES) assert.ok(hub.includes(`href="/visa/${c.slug}/"`), 'hub misses ' + c.slug);
  assert.ok(hub.indexOf('sv-hub') > hub.indexOf('id="app"'), 'directory sits after #app so the app does not replace it');
});


test('Kenya uses official eTA and permit evidence, not generic embassy steps',()=>{
 const h=page('kenya');
 for(const u of ['https://etakenya.go.ke/form/apply/how-to-apply','https://immigration.go.ke/work-permits-and-passes/','https://fns.immigration.go.ke/','https://immigration.go.ke/students-pass/'])assert.ok(h.includes(u),u);
 assert.match(h,/Ordinary Pakistani passport holders visiting Kenya generally need an approved electronic travel authorisation/);
 assert.match(h,/six months of validity from planned arrival/);
 assert.match(h,/Other visa categories still require individual confirmation/);
 assert.doesNotMatch(h,/Biometrics or interview|book the earliest suitable date|usually a language test/);
 const graph=JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
 const a=graph.find(x=>x['@type']==='FAQPage').mainEntity[0].acceptedAnswer.text;assert.match(a,/official exemption/);assert.match(a,/Admission remains subject to immigration checks/);
 const normalize=v=>v.replace(/"dateModified":"\d{4}-\d{2}-\d{2}"/g,'"dateModified":"DATE"');assert.equal(normalize(rd('visa/kenya/index.html')),normalize(h));
});
