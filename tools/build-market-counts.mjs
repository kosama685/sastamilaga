#!/usr/bin/env node
/**
 * Mega-menu counts per market -> data/market-counts.json (read by assets/js/market.js).
 * - local: the Pakistan catalogue counts already printed in the header (partials/chrome.json), with their /c/<slug>.html links.
 * - global: the CJ supplier catalogue per group from reports/catalog-snapshot-metrics.json, linked to /global/g/<slug>/
 *   (the same numbers those global category pages show).
 * No number is typed by hand. Re-run after either source changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, '');

// Header category -> global group. "Travel & Outdoor" has no supplier group of that name; its nearest is "Sports & Outdoor".
export const MAP = {
  'home-and-living': 'Home & Living', 'health-and-beauty': 'Health & Beauty', 'fashion-and-apparel': 'Fashion & Apparel',
  'electronics-and-appliances': 'Electronics & Appliances', automotive: 'Automotive', 'tools-and-diy': 'Tools & DIY', 'travel-and-outdoor': 'Sports & Outdoor'
};
export const slugOf = name => name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const unesc = s => s.replace(/&amp;/g, '&');

export function build(chromeText, metrics) {
  const local = {};
  for (const m of chromeText.matchAll(/href=\\?"(c\/([a-z-]+)\.html)\\?"[\s\S]{0,600}?<strong>([^<]+)<\/strong><small>([\d,]+) products<\/small>/g)) {
    if (!local[m[2]]) local[m[2]] = {name: unesc(m[3]), count: +m[4].replace(/,/g, ''), href: m[1]};
  }
  const allMatch = chromeText.match(/Shop all ([\d,]+) products/);
  const global = {};
  for (const [slug, group] of Object.entries(MAP)) {
    const g = metrics.perGroup[group];
    if (!g) throw new Error('missing global group ' + group);
    global[slug] = {name: group, count: g.rows, href: `global/g/${slugOf(group)}/`};
  }
  return {generatedFrom: {local: 'partials/chrome.json', global: `reports/catalog-snapshot-metrics.json (snapshot ${metrics.snapshot})`},
    snapshot: metrics.snapshot, localTotal: allMatch ? +allMatch[1].replace(/,/g, '') : null, globalTotal: metrics.rows, globalAllHref: 'c/global/index.html', local, global};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = build(rd('partials/chrome.json'), JSON.parse(rd('reports/catalog-snapshot-metrics.json')));
  fs.writeFileSync(path.join(root, 'data/market-counts.json'), JSON.stringify(out, null, 1) + '\n');
  console.log(JSON.stringify({local: Object.keys(out.local).length, global: Object.keys(out.global).length, localTotal: out.localTotal, globalTotal: out.globalTotal}));
}
