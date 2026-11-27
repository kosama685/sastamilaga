import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {validateCity, indexableCity, renderCity, coverageRows} from './build-city-pages.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markets = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8')).markets;
const good = {country: 'uk', city: 'Leeds', citySlug: 'leeds', lang: 'en-GB', fulfilmentVerified: true,
  fulfilmentEvidence: {source: 'carrier quote to LS1', url: 'https://example.com/quote', date: '2026-11-20'},
  searchNeedEvidence: {source: 'Search Console', date: '2026-11-20', note: 'fixture'}, nativeReviewed: false,
  intro: 'Fixture intro from evidence.', deliveryMethods: ['Carrier X'], faq: [['q', 'a']], indexable: true};

test('the committed registry is empty and generates nothing (no city has verified evidence)', () => {
  const j = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/cities.json'), 'utf8'));
  assert.deepEqual(j.cities, []);
  assert.equal(fs.existsSync(path.join(root, 'shipping-to/uk/leeds')), false);
});
test('gates reject unverified fulfilment, missing evidence date, missing search need and missing copy', () => {
  assert.deepEqual(validateCity(good, markets), []);
  assert.match(validateCity({...good, fulfilmentVerified: false}, markets).join(), /fulfilment/);
  assert.match(validateCity({...good, fulfilmentEvidence: {source: 'x', url: 'https://e.com', date: 'soon'}}, markets).join(), /fulfilment/);
  assert.match(validateCity({...good, fulfilmentEvidence: undefined}, markets).join(), /fulfilment/);
  assert.match(validateCity({...good, searchNeedEvidence: undefined}, markets).join(), /search need/);
  assert.match(validateCity({...good, intro: ''}, markets).join(), /intro/);
  assert.match(validateCity({...good, deliveryMethods: []}, markets).join(), /intro/);
  assert.match(validateCity({...good, country: 'atlantis'}, markets).join(), /country/);
  assert.match(validateCity({...good, citySlug: 'Leeds City'}, markets).join(), /citySlug/);
});
test('a non-English city page is never indexable without a recorded native review', () => {
  const de = {...good, country: 'germany', lang: 'de-DE'};
  assert.equal(indexableCity(de), false);
  assert.equal(indexableCity({...de, nativeReviewed: true}), true);
  assert.equal(indexableCity({...good, indexable: false}), false);
});
test('rendered pages carry the right robots tag, canonical and the evidence line', () => {
  const idx = renderCity(good, 'the United Kingdom');
  assert.match(idx, /content="index, follow/); assert.match(idx, /rel="canonical" href="https:\/\/sastamilaga.com\/shipping-to\/uk\/leeds\/"/); assert.match(idx, /carrier quote to LS1, 2026-11-20/);
  assert.match(renderCity({...good, indexable: false}, 'the United Kingdom'), /content="noindex, follow"/);
});
test('coverage rows mark unverified cities as not generated and not indexable', () => {
  const rows = coverageRows([{...good, fulfilmentVerified: false}], markets);
  assert.equal(rows[0][4], 'not generated'); assert.equal(rows[0][5], 'not verified'); assert.match(rows[0][6], /noindex/);
});
