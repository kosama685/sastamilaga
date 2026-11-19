#!/usr/bin/env node
/**
 * Market / locale registry. Read-only inventory of what the repository actually contains; it never marks anything "complete" on the
 * strength of a route or a machine translation. Sources: assets/js/market.js (country -> currency map), the language list in the
 * static pages' translate script, data/landing/routes.json (built landing pages) and data/landing/markets.json.
 * Writes: data/landing/locale-registry.json, reports/market-locale-registry.csv, reports/landing-page-route-map.md,
 *         reports/keyword-and-internal-link-map.csv
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const data = JSON.parse(rd('data/landing/markets.json'));
const {routes} = JSON.parse(rd('data/landing/routes.json'));

/* --- countries from the market picker --- */
const code = rd('assets/js/market.js');
const cm = code.match(/var CUR = (\{[^;]+\});/);
if (!cm) throw Error('Country/currency map not found in assets/js/market.js');
const CUR = vm.runInNewContext('(' + cm[1] + ')');
const countries = Object.keys(CUR).sort();

/* --- languages from the site's translate overlay --- */
const shipHtml = rd('shipping/index.html');
const lm = shipHtml.match(/var L = (\{[^}]+\})/);
const overlay = lm ? JSON.parse(lm[1]) : {};
const overlayLangs = Object.keys(overlay).sort();

const landingByMarket = {};
for (const r of routes) (landingByMarket[r.market] ||= []).push(r);
const slugToCode = {germany: 'DE', uk: 'GB', usa: 'US', serbia: 'RS', 'saudi-arabia': 'SA', pakistan: 'PK'};
const codeToSlug = Object.fromEntries(Object.entries(slugToCode).map(([k, v]) => [v, k]));

const ASSISTANT = new Set(['de-DE', 'sr-Latn-RS', 'sr-Cyrl-RS', 'ar-SA']);
const localeRows = routes.filter(r => r.market !== 'hub').map(r => {
  const isPK = r.market === 'pakistan', native = !isPK && !r.lang.startsWith('en') ? 'assistant-drafted' : (r.lang === 'ur' ? 'assistant-drafted' : 'source-language');
  const mk = data.markets.find(m => m.slug === r.market);
  return {
    kind: 'landing-locale', code: r.lang, market: r.market, url: r.url, dir: r.dir,
    translation: native, humanReviewed: false,
    currencyDisplay: isPK ? 'PKR (store config)' : 'USD estimates only; local currency display not verified',
    shipping: isPK ? 'Pakistan delivery fee and free-delivery threshold match assets/js/config.js' : 'not verified (no live quote on the page; handed to WhatsApp)',
    payment: isPK ? 'cash on delivery for local products (stated in policy pages)' : 'prepaid stated; payment methods not verified',
    taxReturns: isPK ? 'see returns/ page' : 'general guidance only; country policy not verified',
    status: {translated: native !== 'source-language' ? 'drafted' : 'source', reviewed: false, marketConfigured: false, published: false, indexable: !!r.indexable, submitted: false},
    hreflang: r.indexable ? 'complete reciprocal set emitted' : 'withheld while noindex',
    sitemap: r.indexable ? 'sitemap-landing.xml' : 'excluded (noindex)',
    blockers: r.indexable
      ? ['branch not merged or deployed', ...(r.lang === 'ur' ? ['Urdu copy needs native review'] : [])]
      : ['branch not merged or deployed', 'no verified shipping, checkout, tax or returns for this country', ...(ASSISTANT.has(r.lang) ? ['copy drafted by the assistant, needs native-speaker review'] : []), 'noindex until evidence gate passes']
  };
});

const countryRows = countries.map(c => {
  const slug = codeToSlug[c], pages = slug ? (landingByMarket[slug] || []).map(r => r.lang) : [];
  return {kind: 'country', code: c, currencyDisplay: CUR[c], landingLocales: pages, status: pages.length ? 'landing-built-noindex' : 'not-started',
    blockers: pages.length ? ['evidence gate not passed'] : ['no landing page', 'shipping, payment, tax, returns and translation not verified']};
});
const languageRows = overlayLangs.map(l => ({kind: 'language', code: l, rtl: !!overlay[l][1], mechanism: 'browser translate overlay (no dedicated URLs)', urls: 0, humanReviewed: false,
  status: 'overlay-only', blockers: ['no localized URLs', 'translation not reviewed', 'must not be indexed as doorway pages']}));

const registry = {generatedFrom: ['assets/js/market.js', 'shipping/index.html (translate overlay list)', 'data/landing/routes.json'],
  counts: {countriesInPicker: countries.length, languagesInOverlay: overlayLangs.length, landingLocalesBuilt: localeRows.length, landingLocalesIndexable: localeRows.filter(r => r.status.indexable).length,
    landingLocalesHumanReviewed: localeRows.filter(r => r.humanReviewed).length, countriesWithLanding: countryRows.filter(r => r.landingLocales.length).length},
  note: 'A locale is not complete because a route or machine translation exists. Statuses: translated, reviewed, marketConfigured, published, indexable, submitted are tracked separately.',
  landingLocales: localeRows, countries: countryRows, languages: languageRows};
fs.writeFileSync(path.join(root, 'data/landing/locale-registry.json'), JSON.stringify(registry, null, 2) + '\n');

const csvCell = v => { const s = Array.isArray(v) ? v.join('; ') : (v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const header = ['kind', 'code', 'market_or_name', 'url', 'direction', 'translation', 'human_reviewed', 'currency_display', 'shipping', 'payment', 'tax_returns', 'translated', 'reviewed', 'market_configured', 'published', 'indexable', 'submitted', 'hreflang', 'sitemap', 'status', 'blockers'];
const lines = [header.join(',')];
for (const r of localeRows) lines.push([r.kind, r.code, r.market, r.url, r.dir, r.translation, r.humanReviewed, r.currencyDisplay, r.shipping, r.payment, r.taxReturns, r.status.translated, r.status.reviewed, r.status.marketConfigured, r.status.published, r.status.indexable, r.status.submitted, r.hreflang, r.sitemap, '', r.blockers].map(csvCell).join(','));
for (const r of countryRows) lines.push(['country', r.code, '', '', '', '', '', r.currencyDisplay, 'not verified', 'not verified', 'not verified', '', '', '', false, false, false, '', '', r.status, r.blockers].map(csvCell).join(','));
for (const r of languageRows) lines.push(['language', r.code, r.rtl ? 'rtl' : 'ltr', '', r.rtl ? 'rtl' : 'ltr', r.mechanism, false, '', '', '', '', 'overlay', false, false, false, false, false, '', '', r.status, r.blockers].map(csvCell).join(','));
fs.mkdirSync(path.join(root, 'reports'), {recursive: true});
fs.writeFileSync(path.join(root, 'reports/market-locale-registry.csv'), lines.join('\n') + '\n');

/* --- route map --- */
const md = ['# Landing page route map', '', 'Generated by `tools/build-locale-registry.mjs` from `data/landing/routes.json`. Every page has one self-referencing canonical. hreflang is emitted only for indexable pages; noindex pages are excluded from sitemaps and from hreflang sets.', '',
  '| URL | Language | Dir | Robots | In sitemap-landing.xml | hreflang |', '|---|---|---|---|---|---|'];
for (const r of routes) md.push(`| ${r.url} | ${r.lang} | ${r.dir} | ${r.robots} | ${r.indexable ? 'yes' : 'no'} | ${r.indexable ? 'complete reciprocal set' : 'withheld'} |`);
md.push('', '## Intended hreflang sets once a market is approved (not emitted today)', '');
for (const slug of Object.keys(landingByMarket).filter(s => s !== 'hub')) md.push(`- **${slug}**: ` + landingByMarket[slug].map(r => `${r.lang} → \`${r.url}\``).join('; '));
md.push('', '## Redirects', '', 'No existing URL was changed, so no redirects are required. New paths: `/pakistan/`, `/ur/pakistan/`, `/shipping-to/**`. They do not collide with existing routes (checked against the repository tree). `/ur/` home is served by a Cloudflare route, not a file in this repository.', '');
fs.writeFileSync(path.join(root, 'reports/landing-page-route-map.md'), md.join('\n'));

/* --- keyword + internal link map (links are COUNTED from the built HTML; search volume is NOT measured) --- */
const pageHtml = r => rd(r.rel + '/index.html');
const out = new Map(), inn = new Map(routes.map(r => [r.url, 0]));
for (const r of routes) {
  const h = pageHtml(r), set = new Set();
  for (const m of h.matchAll(/<a [^>]*href="([^"#]+)"/g)) {
    let v = m[1]; if (/^(mailto:|tel:|https?:\/\/(?!sastamilaga\.com))/.test(v)) continue;
    const abs = /^https?:/.test(v) ? v : new URL(v, r.url).href; set.add(abs.replace(/index\.html$/, ''));
  }
  out.set(r.url, set);
  for (const t of set) if (inn.has(t) && t !== r.url) inn.set(t, inn.get(t) + 1);
}
const intent = {pakistan: 'transactional (local order, cash on delivery)', hub: 'navigational'};
const k = ['url', 'locale', 'target_topic (page H1)', 'search_intent', 'search_volume', 'keyword_difficulty', 'data_source', 'observed_on', 'confidence', 'internal_links_out', 'internal_links_in_from_landing_pages', 'schema_types', 'indexable'];
const klines = [k.join(',')];
for (const r of routes) {
  const h = pageHtml(r), h1 = (h.match(/<h1>([^<]+)<\/h1>/) || [])[1] || '';
  const types = (h.match(/"@type":"(WebPage|BreadcrumbList|FAQPage)"/g) || []).map(x => x.replace(/.*:"|"/g, ''));
  klines.push([r.url, r.lang, h1.replace(/&amp;/g, '&'), intent[r.market] || 'commercial investigation (delivery, customs, ordering from abroad)', 'not measured', 'not measured', 'none: no Search Console, Keyword Planner or SEO-dataset access in this run', '', 'unvalidated', out.get(r.url).size, inn.get(r.url), [...new Set(types)].join('; '), r.indexable].map(csvCell).join(','));
}
fs.writeFileSync(path.join(root, 'reports/keyword-and-internal-link-map.csv'), klines.join('\n') + '\n');
console.log(JSON.stringify(registry.counts));
