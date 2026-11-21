// Static release gate for one Clarity project and one worldwide WhatsApp channel.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { REGIONS, waDirectory } from './wa-directory.mjs';

const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root),'utf8');
const whatsApp = '923343582295';
const clarityId = 'zh6iif5boz';
const market = JSON.parse(read('data/landing/markets.json'));
assert.equal(market.whatsapp, whatsApp, 'All country landing order forms must use the central WhatsApp');
assert.ok(read('assets/js/config.js').includes("whatsapp: '"+whatsApp+"'"), 'Store configuration uses central WhatsApp');
assert.ok(read('assets/js/wa-cards.js').includes("|| '"+whatsApp+"'"), 'Cards use central WhatsApp fallback');
assert.ok(REGIONS.length >= 13, 'Existing regional phone listings remain');
const directory = waDirectory('footer');
const messages = [...directory.matchAll(/https:\/\/wa\.me\/([0-9]+)/g)].map(m => m[1]);
assert.ok(messages.length >= REGIONS.length + 1, 'One universal CTA plus all region CTAs');
assert.ok(messages.every(n => n === whatsApp), 'All region WhatsApp order links use the same number');
for (const r of REGIONS) assert.ok(directory.includes('tel:+'+r.n), 'Regional phone listings are retained: '+r.name);
assert.ok(directory.includes('Delivery and payment options are confirmed'), 'Never promise unverified international shipping');

const routes = JSON.parse(read('data/landing/routes.json')).routes;
const pages = [...new Set(['index.html', 'shop/index.html', 'visa/index.html', 'pakistan/index.html', 'ur/pakistan/index.html', ...routes.map(r => r.rel+'/index.html')])];
for (const page of pages) {
  const html = read(page);
  const open = html.indexOf('<head>'), close = html.indexOf('</head>');
  assert.ok(open >= 0 && close > open, page+': server-side HTML head');
  const head = html.slice(open, close);
  assert.ok(head.includes('https://www.clarity.ms/tag/'), page+': Clarity loader in static head');
  assert.equal(head.split('"'+clarityId+'"').length - 1, 1, page+': exactly one Clarity project call');
  assert.equal(head.split('https://www.clarity.ms/tag/').length - 1, 1, page+': exactly one Clarity external loader');
}
console.log('PASS: Clarity is in every tested section and country HTML head; '+REGIONS.length+' regions share one worldwide WhatsApp order number; '+pages.length+' HTML pages tested.');
