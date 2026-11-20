// Run after: node tools/build-global-coverage.mjs
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const [h, ...b] = rows; return b.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
const reg = JSON.parse(rd('data/landing/locale-registry.json'));
const {routes} = JSON.parse(rd('data/landing/routes.json'));
const countries = parseCsv(rd('reports/country-coverage-246.csv')), langs = parseCsv(rd('reports/language-coverage-127.csv'));
const fulf = parseCsv(rd('reports/global-fulfilment-matrix.csv')), pay = parseCsv(rd('reports/global-payment-matrix.csv')), ret = parseCsv(rd('reports/global-returns-matrix.csv'));

test('every registry country and language appears in the reports; none is omitted', () => {
  assert.equal(reg.countries.length, 246); assert.equal(reg.languages.length, 127);
  for (const m of [countries, fulf, pay, ret]) assert.deepEqual(m.map(r => r.country_code).sort(), reg.countries.map(c => c.code).sort());
  const codes = new Set(langs.map(r => r.language_code));
  for (const l of reg.languages) assert.ok(codes.has(l.code), 'language ' + l.code);
  assert.equal(langs.length, 128, '127 overlay languages plus the source language');
});
test('country page status is consistent with the live routes', () => {
  const slugToCode = {germany: 'DE', uk: 'GB', usa: 'US', serbia: 'RS', 'saudi-arabia': 'SA', pakistan: 'PK'};
  const have = new Set(routes.filter(r => slugToCode[r.market]).map(r => slugToCode[r.market]));
  assert.equal(have.size, 6);
  for (const c of countries) {
    if (have.has(c.country_code)) assert.equal(c.landing_page, 'yes'); else { assert.equal(c.landing_page, 'no'); assert.match(c.index_status, /no page/); assert.match(c.overall_status, /config-only/); }
  }
});
test('no country is claimed commercially verified, and only Pakistan has COD', () => {
  for (const r of fulf) {
    assert.doesNotMatch(r.verification_status, /^verified/i, r.country_code);
    assert.match(r.verification_status, /pending|published policy/);
    assert.equal(/^yes/.test(r.cod_available), r.country_code === 'PK', 'COD only for Pakistan: ' + r.country_code);
  }
  for (const r of pay) { assert.equal(r.tested_end_to_end, 'no'); assert.doesNotMatch(r.verification_status, /^verified/i); assert.equal(/^yes/.test(r.woocommerce_native_checkout_allowed), r.country_code === 'PK'); }
  for (const r of ret) assert.match(r.verification_status, /pending|published policy/);
});
test('fulfilment rows never invent numbers: estimates and charges exist only where the CJ survey produced them', () => {
  const ev = fs.existsSync(path.join(root, 'data/landing/country-shipping-evidence.json')) ? JSON.parse(rd('data/landing/country-shipping-evidence.json')) : null;
  for (const r of fulf) {
    const q = ev?.results?.[r.country_code];
    if (!q || !(q.methods > 0)) { assert.equal(r.shipping_charge_min_usd_sample, ''); assert.equal(r.delivery_estimate_days_carrier_sample, ''); }
    else assert.equal(Number(r.shipping_charge_min_usd_sample), q.minShippingUsd);
  }
});
test('language statuses: no native review is ever claimed; only the four drafted languages are marked drafted', () => {
  for (const r of langs) {
    assert.doesNotMatch(r['5_native_review_completed'], /^(yes|completed)/i, r.language_code);
    assert.doesNotMatch(r.current_status, /native review completed/i);
  }
  const drafted = langs.filter(r => /^assistant-drafted/.test(r['2_machine_translated'])).map(r => r.language_code).sort();
  assert.deepEqual(drafted, ['ar', 'de', 'sr', 'ur']);
  for (const r of langs.filter(x => x['6_published'] === 'yes')) assert.ok(r.landing_urls.length > 0, 'published language must have URLs: ' + r.language_code);
  for (const r of langs.filter(x => x['1_not_started'] === 'yes')) assert.equal(r['6_published'], 'no');
  assert.equal(langs.find(r => r.language_code === 'ur').direction, 'rtl'); assert.equal(langs.find(r => r.language_code === 'ar').direction, 'rtl'); assert.equal(langs.find(r => r.language_code === 'de').direction, 'ltr');
});
test('city report has no pages and the registry is empty', () => {
  assert.equal(parseCsv(rd('reports/city-coverage.csv')).length, 0);
  assert.deepEqual(JSON.parse(rd('data/landing/cities.json')).cities, []);
});
test('completion report states denominators and does not claim Google indexing', () => {
  const t = rd('reports/global-completion-report.md');
  assert.match(t, /of 246/); assert.match(t, /of 128/); assert.match(t, /Pages shown to be indexed by Google \| unknown/);
  assert.doesNotMatch(t, /100%.*complete/i);
  const b = rd('reports/remaining-blockers.md');
  for (const k of ['Search Console', 'Native review', 'City pages', 'Pull request', 'section-page copies']) assert.match(b, new RegExp(k));
});
test('every non-live country/language combination is non-indexable by construction (no route exists for it)', () => {
  const live = new Set(routes.map(r => r.url));
  const sm = rd('sitemap-landing.xml');
  for (const m of sm.matchAll(/<loc>([^<]+)<\/loc>/g)) assert.ok(live.has(m[1]), 'sitemap URL is a known route: ' + m[1]);
  const nonPage = countries.filter(c => c.landing_page === 'no');
  assert.equal(nonPage.length, 240);
  assert.ok(nonPage.every(c => !/^index/.test(c.index_status)));
});
