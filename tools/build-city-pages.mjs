#!/usr/bin/env node
/**
 * City landing-page generator with hard evidence gates. With the current empty registry it writes nothing.
 * A city page is built only when: the country exists in markets.json, fulfilment is verified WITH dated evidence,
 * search need is documented with a dated source, and the supplied copy (intro, delivery methods, FAQ) is present.
 * A page is indexable only when additionally `indexable` is true and (the language is English or a native review is recorded).
 * Writes: shipping-to/<country>/<city>/index.html (qualifying cities only) and reports/city-coverage.csv (always).
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://sastamilaga.com';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const dated = e => e && typeof e.source === 'string' && e.source.length > 3 && /^\d{4}-\d{2}-\d{2}$/.test(e.date || '');

export function validateCity(c, markets) {
  const errors = [];
  if (!markets.some(m => m.slug === c.country)) errors.push('unknown country slug');
  if (!c.city || !/^[a-z0-9-]+$/.test(c.citySlug || '')) errors.push('city/citySlug invalid');
  if (c.fulfilmentVerified !== true || !dated(c.fulfilmentEvidence) || !/^https?:\/\//.test(c.fulfilmentEvidence?.url || '')) errors.push('fulfilment not verified with dated evidence and a URL');
  if (!dated(c.searchNeedEvidence) || !c.searchNeedEvidence.note) errors.push('search need not documented with a dated source');
  if (!c.intro || !Array.isArray(c.deliveryMethods) || !c.deliveryMethods.length || !Array.isArray(c.faq) || !c.faq.length) errors.push('intro, deliveryMethods and faq must be supplied from evidence');
  return errors;
}
export function indexableCity(c) {
  const english = /^en(-|$)/i.test(c.lang || '');
  return c.indexable === true && validateCity(c, [{slug: c.country}]).length === 0 && (english || c.nativeReviewed === true);
}
export function renderCity(c, countryName) {
  const rel = `shipping-to/${c.country}/${c.citySlug}`, url = `${ORIGIN}/${rel}/`, pre = '../../../', idx = indexableCity(c);
  const title = `${c.city}, ${countryName}: delivery from Sasta Milaga`;
  return `<!doctype html>
<html lang="${esc(c.lang)}" dir="${/^(ar|ur|fa|he)/i.test(c.lang) ? 'rtl' : 'ltr'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(c.intro.slice(0, 160))}"><meta name="robots" content="${idx ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">
<link rel="canonical" href="${url}"><link rel="stylesheet" href="${pre}assets/theme/static-bundle.css"><link rel="stylesheet" href="${pre}assets/css/landing.css"></head>
<body class="sm-static sm-page-static"><div id="sm-chrome-header" data-prefix="${pre}"></div>
<main id="main" class="sm-main"><div id="app" class="sm-app"><div class="sml"><div class="sml-wrap"><header class="sml-hero"><h1>${esc(c.city)}, ${esc(countryName)}</h1><p class="sml-answer">${esc(c.intro)}</p></header>
<section class="sml-card"><h2>Delivery methods</h2><ul>${c.deliveryMethods.map(m => `<li>${esc(m)}</li>`).join('')}</ul><p class="sml-note">Evidence: ${esc(c.fulfilmentEvidence.source)}, ${esc(c.fulfilmentEvidence.date)}.</p></section>
<section class="sml-card"><h2>Questions</h2>${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
<p><a href="${pre}shipping-to/${esc(c.country)}/">${esc(countryName)}</a></p></div></div></div></main><div id="sm-chrome-footer"></div><script src="${pre}assets/js/chrome.js" defer></script></body></html>
`;
}
export function coverageRows(cities, markets) {
  return cities.map(c => {
    const errs = validateCity(c, markets), name = markets.find(m => m.slug === c.country)?.name || c.country;
    return [name, c.city, c.lang, `${ORIGIN}/shipping-to/${c.country}/${c.citySlug}/`, errs.length ? 'not generated' : 'generated', c.fulfilmentVerified === true && !errs.length ? 'verified' : 'not verified', errs.length ? 'noindex (not built)' : (indexableCity(c) ? 'index' : 'noindex'), c.nativeReviewed === true ? 'completed' : 'pending', indexableCity(c) ? 'listed in sitemap-landing.xml (manual add required)' : 'not listed', errs.join('; ')];
  });
}
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const {cities} = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/cities.json'), 'utf8'));
  const markets = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8')).markets;
  let built = 0;
  for (const c of cities) {
    if (validateCity(c, markets).length) continue;
    const dir = path.join(root, 'shipping-to', c.country, c.citySlug);
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(path.join(dir, 'index.html'), renderCity(c, markets.find(m => m.slug === c.country).name)); built++;
  }
  const header = ['country', 'city', 'language', 'page_url', 'content_status', 'fulfilment_verification', 'indexability', 'native_review', 'sitemap_status', 'blocking_reasons'];
  const cell = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v);
  fs.mkdirSync(path.join(root, 'reports'), {recursive: true});
  fs.writeFileSync(path.join(root, 'reports/city-coverage.csv'), [header, ...coverageRows(cities, markets)].map(r => r.map(cell).join(',')).join('\n') + '\n');
  console.log(JSON.stringify({registryEntries: cities.length, pagesBuilt: built}));
}
