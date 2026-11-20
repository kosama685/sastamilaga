import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build, MAP, slugOf} from './build-market-counts.mjs';
const rd = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/^﻿/, '');
const metrics = JSON.parse(rd('reports/catalog-snapshot-metrics.json'));
const out = build(rd('partials/chrome.json'), metrics);

test('every header category has a local count and a global count, none typed by hand', () => {
  assert.deepEqual(Object.keys(out.local).sort(), Object.keys(MAP).sort());
  for (const [slug, group] of Object.entries(MAP)) {
    assert.equal(out.global[slug].count, metrics.perGroup[group].rows, slug);
    assert.ok(out.local[slug].count > 0 && /^c\/[a-z-]+\.html$/.test(out.local[slug].href), slug);
  }
  assert.equal(out.globalTotal, metrics.rows);
  assert.ok(out.localTotal > 0);
});
test('global links point at existing global category pages', () => {
  for (const g of Object.values(out.global)) {
    assert.match(g.href, /^global\/g\/[a-z-]+\/$/);
    assert.ok(fs.existsSync(new URL('../' + g.href + 'index.html', import.meta.url)), 'missing page ' + g.href);
  }
  assert.equal(slugOf('Electronics & Appliances'), 'electronics-and-appliances');
});
test('the committed data file is up to date with its sources', () => {
  const committed = JSON.parse(rd('data/market-counts.json'));
  assert.deepEqual(committed, JSON.parse(JSON.stringify(out)));
});
test('market.js swaps to global only for a non-Pakistan destination and restores local for Pakistan', () => {
  const js = rd('assets/js/market.js');
  assert.match(js, /global = cc !== 'PK'/);
  assert.match(js, /if \(!cc\) return 0;/, 'no destination (e.g. crawlers): markup untouched');
  assert.match(js, /data-sm-local-href/);
  assert.match(js, /addEventListener\('sm:market', run\)/);
});
