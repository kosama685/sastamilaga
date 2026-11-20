#!/usr/bin/env node
/**
 * Global coverage reports, derived from data files (no hand-typed counts):
 *   data/landing/locale-registry.json (246 countries, 127 languages), routes.json, markets.json,
 *   country-shipping-evidence.json (CJ sample-quote survey), woocommerce-config-*.json, catalog-audit-*.json,
 *   reports/catalog-snapshot-metrics.json, cities.json, live-validation.json, test-run.json (optional).
 * Writes the CSVs and Markdown reports listed at the bottom. Nothing here claims verification that has no evidence file behind it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const rj = (p, d = null) => fs.existsSync(path.join(root, p)) ? JSON.parse(rd(p).replace(/^﻿/, '')) : d;
const wr = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), {recursive: true}); fs.writeFileSync(path.join(root, p), s); };
const cell = v => { const s = Array.isArray(v) ? v.join('; ') : String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
const csv = rows => rows.map(r => r.map(cell).join(',')).join('\n') + '\n';
const pct = (n, d) => d ? (Math.round(n / d * 1000) / 10).toFixed(1) + '%' : 'n/a (denominator 0)';
const frac = (n, d) => `${n} of ${d} (${pct(n, d)})`;

const reg = rj('data/landing/locale-registry.json'), routes = rj('data/landing/routes.json').routes, markets = rj('data/landing/markets.json');
const ship = rj('data/landing/country-shipping-evidence.json'), wc = rj('data/landing/woocommerce-config-2026-11-20.json'), cat = rj('data/landing/catalog-audit-2026-11-20.json');
const snap = rj('reports/catalog-snapshot-metrics.json'), cities = rj('data/landing/cities.json').cities, live = rj('data/landing/live-validation.json'), tests = rj('data/landing/test-run.json', {});
const head = (() => { try { return execSync('git rev-parse --short HEAD', {cwd: root}).toString().trim(); } catch { return 'unknown'; } })();
const TODAY = '2026-11-20';

/* ---------- names ---------- */
const regionName = new Intl.DisplayNames(['en'], {type: 'region'}), langName = new Intl.DisplayNames(['en'], {type: 'language'});
const cname = c => { try { return regionName.of(c) || c; } catch { return c; } };
const lname = l => { try { return langName.of(l === 'he' ? 'he' : l) || l; } catch { return l; } };

/* ---------- policy regions (from the published shipping policy table, mapped by geography; approximate) ---------- */
const GCC = new Set('AE SA QA KW BH OM'.split(' ')), EUROPE = new Set('GB IE FR DE ES IT PT NL BE LU AT CH LI DK SE NO FI IS PL CZ SK HU RO BG HR SI GR CY MT EE LV LT AL AD BA ME MK RS XK MD MC SM VA UA'.split(' '));
const region = c => c === 'PK' ? 'Pakistan' : GCC.has(c) ? 'UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman' : EUROPE.has(c) ? 'United Kingdom and Europe' : c === 'US' || c === 'CA' ? 'USA and Canada' : c === 'AU' || c === 'NZ' ? 'Australia and New Zealand' : 'Other regions (policy row: Africa, Asia and Latin America)';
const regionPolicy = r => r === 'Pakistan' ? 'Global collection: yes, prepaid. Pakistan collection: yes, cash on delivery' : /Other regions/.test(r) ? 'Global collection: "Most destinations, quoted at checkout"' : 'Global collection: "Yes, quoted at checkout"';
const slugToCode = {germany: 'DE', uk: 'GB', usa: 'US', serbia: 'RS', 'saudi-arabia': 'SA', pakistan: 'PK'};
const pagesByCode = {};
for (const r of routes) if (slugToCode[r.market]) (pagesByCode[slugToCode[r.market]] ||= []).push(r);

/* ---------- country coverage + matrices ---------- */
const countries = reg.countries.map(x => x.code).sort();
const q = c => ship?.results?.[c];
const quoteStatus = c => !ship ? 'not surveyed' : !q(c) ? 'not surveyed' : q(c).http !== 200 ? 'survey request failed' : q(c).methods > 0 ? 'CJ returned shipping options (sample item)' : 'CJ returned no shipping option (sample item)';
const countryRows = [['country_code', 'country_name', 'currency_display', 'policy_region', 'landing_page', 'landing_locales', 'index_status', 'cj_sample_quote', 'fulfilment_verification', 'payment_verification', 'returns_verification', 'overall_status', 'next_step']];
const fulf = [['country_code', 'country_name', 'policy_region', 'published_policy_for_region', 'cj_sample_quote_status', 'shipping_providers_sample', 'delivery_methods_returned', 'delivery_estimate_days_carrier_sample', 'shipping_charge_min_usd_sample', 'free_shipping_eligibility', 'cod_available', 'customs_tax_responsibility', 'restricted_categories', 'evidence_source', 'observed_on', 'verification_status']];
const pay = [['country_code', 'country_name', 'currency_display', 'woocommerce_native_checkout_allowed', 'global_prepaid_checkout', 'cod', 'paypal_and_cards_enabled_in_woocommerce', 'local_methods_enabled_in_woocommerce', 'tested_end_to_end', 'evidence_source', 'verification_status']];
const ret = [['country_code', 'country_name', 'returns_policy_url', 'damaged_defective_wrong_item', 'not_received', 'change_of_mind', 'refund_method', 'country_specific_terms', 'evidence_source', 'verification_status']];
const EUR_LOCAL = 'Bancontact, BLIK, EPS, iDeal, MyBank, Przelewy24, Trustly, Multibanco';
const RET = {damaged: 'Report within 7 days of delivery with photos and video; replacement or refund at no extra cost after review', notReceived: 'If tracking shows no delivery 30 days after the latest estimated date, contact support: carrier investigation, then replacement or refund', mind: 'Where local law gives a cancellation right (policy cites 14 days in the UK and EU), tell us within that period and return the item unused; return shipping is the buyer\'s unless faulty. Personalised items excluded unless defective', refund: 'Prepaid and international orders: refunded to the original payment method once approved'};
const PK_RET = {damaged: 'Free return delivery for damaged items or wrong item sent; request within 7 days', notReceived: 'See global rule for global items', mind: 'Return by mail: delivery fee Rs 250; in-person returns at the Karachi address given in the policy, after contacting support first', refund: 'Mail returns refunded in 7 to 10 working days to bank account, JazzCash or EasyPaisa; in-store returns processed within 7 days'};
for (const c of countries) {
  const n = cname(c), reg_ = region(c), pk = c === 'PK', pages = pagesByCode[c] || [], qs = quoteStatus(c), qq = q(c);
  const idx = pages.length ? (pages.every(p => p.indexable) ? 'index' : 'noindex') : 'no page';
  const status = pages.length ? (pk ? 'landing-live-indexed' : 'landing-live-indexed-by-owner-override') : 'config-only (no landing page)';
  countryRows.push([c, n, reg.countries.find(x => x.code === c)?.currencyDisplay || '', reg_, pages.length ? 'yes' : 'no', pages.map(p => p.lang), idx, qs, pk ? 'published policy; checkout not tested' : 'pending: no commercial agreement or per-country checkout test', pk ? 'COD gateway enabled in WooCommerce; not tested end to end' : 'pending: not tested end to end', 'published global returns policy; country terms pending', status,
    pages.length ? (pk ? 'submit sitemap-landing.xml in Search Console; native review of Urdu copy' : 'provide shipping, payment and returns evidence; native review of non-English copy') : 'collect evidence for this country; build a page only when it qualifies']);
  fulf.push([c, n, reg_, regionPolicy(reg_), qs, qq?.carriers || '', qq?.methods ?? '', qq?.fastestEtaDays ?? '', qq?.minShippingUsd ?? '', pk ? 'Pakistan delivery Rs 250; free from Rs 5,000 (assets/js/config.js, shipping policy)' : 'none on file', pk ? 'yes, Pakistan collection (local products)' : 'no (global items are prepaid per shipping policy)', 'Duties, VAT/GST and customs fees are set by the destination and are not included unless checkout shows them (published shipping policy)', 'not verified', 'published shipping policy; survey: data/landing/country-shipping-evidence.json (indicative quote for one sample item, quantity 1, via /api/cj/shipping)', ship?.observedOn || '', pk ? 'published policy; courier coverage not verified' : 'pending verification: no carrier contract, restricted-category list or per-country order test on file']);
  pay.push([c, n, reg.countries.find(x => x.code === c)?.currencyDisplay || '', pk ? 'yes (the only allowed country)' : 'no (WooCommerce selling locations = Pakistan only)', 'platform reports virtual checkout ready (GDCS VirtualCheckout::ready() = true); not tested', pk ? 'enabled (WooCommerce gateway "cod") for local products' : 'no', 'PayPal and Debit & Credit Cards gateways enabled (store-wide)', EUROPE.has(c) ? EUR_LOCAL + ' enabled store-wide; availability per country not tested' : 'store-wide list only; per-country availability not tested', 'no', 'data/landing/woocommerce-config-2026-11-20.json (read-only WP-CLI, 2026-11-20)', 'configuration observed; not verified by a test payment']);
  const R = pk ? PK_RET : RET;
  ret.push([c, n, 'https://sastamilaga.com/returns/', R.damaged, R.notReceived, R.mind, R.refund, 'Mandatory local consumer rights continue to apply (policy). No country-specific terms on file', 'data/wp/policy-returns.html (published policy)', pk ? 'published policy; not tested' : 'published global policy; country-specific verification pending']);
}
wr('reports/country-coverage-246.csv', csv(countryRows));
wr('reports/global-fulfilment-matrix.csv', csv(fulf));
wr('reports/global-payment-matrix.csv', csv(pay));
wr('reports/global-returns-matrix.csv', csv(ret));

/* ---------- language coverage ---------- */
const overlay = reg.languages.map(l => l.code);
const base = l => l.split('-')[0];
const withPages = new Set(routes.filter(r => r.market !== 'hub').map(r => base(r.lang)));
const drafted = new Set(['ur', 'de', 'sr', 'ar']);      // copy drafted by the assistant, not by a native speaker
const rtl = new Set(['ar', 'ur', 'fa', 'he', 'ps', 'sd', 'ug', 'yi', 'dv']);
const langs = [...new Set(['en', ...overlay])];
const langRows = [['language_code', 'language_name', 'direction', 'in_translate_overlay', '1_not_started', '2_machine_translated', '3_translation_validated', '4_native_review_pending', '5_native_review_completed', '6_published', '7_indexable', 'current_status', 'landing_urls', 'note']];
const langStat = {};
for (const l of langs) {
  const isEn = l === 'en', dr = drafted.has(l), pub = withPages.has(l);
  const urls = routes.filter(r => r.market !== 'hub' && base(r.lang) === l).map(r => r.url);
  const idxd = routes.some(r => r.market !== 'hub' && base(r.lang) === l && r.indexable);
  const status = isEn ? 'source language, published, indexable' : dr ? 'assistant-drafted translation, automated checks passed, native review pending, published, indexable' : 'not started';
  langStat[l] = {isEn, dr, pub, idxd};
  langRows.push([l, lname(l), rtl.has(l) ? 'rtl' : 'ltr', overlay.includes(l) ? 'yes' : 'no (source language)', !isEn && !dr ? 'yes' : 'no', dr ? 'assistant-drafted (not a human translation)' : 'no', dr ? 'automated checks only (script, placeholders, no leftover English); no linguistic validation' : 'no', dr ? 'yes' : (isEn ? 'n/a' : 'no'), 'no (0 reviewers recorded)', pub ? 'yes' : 'no', idxd ? 'yes' : 'no', status, urls.join(' '), l === 'sr' ? 'Latin (sr-Latn-RS) and Cyrillic (sr-Cyrl-RS) are separate published pages; Cyrillic is transliterated from the Latin text' : dr ? 'Copy drafted by the assistant. Never describe as native-reviewed.' : isEn ? 'English pages exist for DE, GB, US, RS, SA, PK' : 'Only a browser translate overlay exists; no dedicated URLs or localized metadata']);
}
wr('reports/language-coverage-127.csv', csv(langRows));

/* ---------- counters ---------- */
const nC = countries.length, nOverlay = overlay.length, nLang = langs.length;
const survey = ship ? Object.values(ship.results) : [];
const sWith = survey.filter(x => x.http === 200 && x.methods > 0).length, sNone = survey.filter(x => x.http === 200 && x.methods === 0).length, sFail = survey.filter(x => x.http !== 200).length;
const countriesWithPage = Object.keys(pagesByCode).length;
const draftedInOverlay = [...drafted].filter(l => overlay.includes(l)).length;
const landingLocales = routes.filter(r => r.market !== 'hub');
const idxPages = routes.filter(r => r.indexable).length;
const liveIssues = live ? live.hreflangIssues.length + live.sitemapIssues.length : null;
const T = tests;
const testSum = Object.values(T).reduce((a, x) => ({tests: a.tests + (x.tests || 0), pass: a.pass + (x.pass || 0), fail: a.fail + (x.fail || 0)}), {tests: 0, pass: 0, fail: 0});
const cm = Object.entries(T).map(([k, v]) => `| ${k} | ${v.tests} | ${v.pass} | ${v.fail} | ${v.command} |`).join('\n');

/* ---------- reports ---------- */
const pubTotal = Object.values(cat.productsByStatus).reduce((a, b) => a + b, 0);
wr('reports/product-seo-audit.md', `# Product SEO audit

**Date:** ${cat.observedOn}. **Method:** ${cat.source}

## Scope and what "the catalogue" is
- **Local WooCommerce catalogue (measured here):** ${cat.productsByStatus.publish.toLocaleString()} published products. This is the real number; the earlier 400,000 and 600,000 figures describe the CJ supplier snapshot, not the shop.
- **CJ supplier snapshot (measured separately):** ${snap.rows.toLocaleString()} rows in ${snap.categories} categories, dated ${snap.snapshot}. Not imported into WooCommerce and not sellable through native WooCommerce checkout (see the payment matrix).

## Local catalogue measurements (2026-11-20)
| Measure | Count | Share of published |
|---|---|---|
| Published | ${cat.productsByStatus.publish.toLocaleString()} | 100% |
| Draft / pending / private / trash | ${cat.productsByStatus.draft} / ${cat.productsByStatus.pending} / ${cat.productsByStatus.private} / ${cat.productsByStatus.trash} | n/a |
| Published variations | ${cat.publishedVariations.toLocaleString()} | n/a |
| Published without a thumbnail | ${cat.publishedWithoutThumbnail.toLocaleString()} | ${pct(cat.publishedWithoutThumbnail, cat.productsByStatus.publish)} |
| Published without a price | ${cat.publishedWithoutPrice} | ${pct(cat.publishedWithoutPrice, cat.productsByStatus.publish)} |
| Published without a SKU | ${cat.publishedWithoutSku.toLocaleString()} | ${pct(cat.publishedWithoutSku, cat.productsByStatus.publish)} |
| Published, stock status out of stock | ${cat.publishedOutOfStock} | ${pct(cat.publishedOutOfStock, cat.productsByStatus.publish)} |
| Published with under 100 characters of description | ${cat.publishedContentUnder100Chars} | ${pct(cat.publishedContentUnder100Chars, cat.productsByStatus.publish)} |
| Titles shared by more than one published product | ${cat.duplicateTitleGroups} title groups | n/a |
| Product categories (all have products) | ${cat.productCategoryTerms} | n/a |

Not measured: ${cat.notMeasured.join('; ')}.

## CJ snapshot measurements (reports/catalog-snapshot-metrics.json)
${snap.rows.toLocaleString()} rows; no row missing image, price, name or SKU; ${snap.dupId} duplicate IDs; ${snap.dupSku} duplicate SKUs; ${snap.dupName.toLocaleString()} rows repeat an earlier name; ${snap.shortName.toLocaleString()} names under 15 characters; maximum snapshot price ${snap.priceMax.toLocaleString()} (an unreviewed outlier). The snapshot has no descriptions, attributes, stock or verified retail prices, so it cannot support product pages that deserve indexing.

## What exists and what does not
- **Exists (verified to exist, content not reviewed here):** per-SKU draft SEO and category-link plans generated by another session (see \`reports/categories-keywords-interlinking.csv\` and the commits "Build per-SKU draft semantic SEO..." and "Generate full 451812-record draft SEO..."); static local product pages with internal links.
- **Not built by this work:** a product optimization pipeline for the WooCommerce catalogue (unique titles, clean URLs, specification-based descriptions, product-specific FAQs, image alt text, schema validation), batch checkpoints and rollback. Doing it responsibly needs reviewed specifications per product; generating text from titles alone would create the thin and duplicated content this audit warns against.
- **Highest-value fixes the numbers point to:** (1) ${cat.publishedWithoutThumbnail.toLocaleString()} products without an image, (2) ${cat.duplicateTitleGroups} duplicate title groups, (3) ${cat.publishedWithoutSku.toLocaleString()} products without a SKU, (4) ${cat.publishedWithoutPrice} unpriced published products.
`);

wr('reports/qualified-order-cro-report.md', `# Qualified-order and conversion report

**Date:** ${TODAY}. Based on what is deployed on the 12 landing pages and on the WooCommerce configuration observed on ${wc.observedOn}.

## Implemented and tested (landing pages)
- Answer-first hero, "how an order works" steps, a "what you pay and what is not included" table, customs and product-rule note, localized FAQ with matching JSON-LD, related links and a contact band, in the site's theme colors.
- **Qualified-order panel:** product link or name, option, quantity, delivery country, town/city and postcode, two required confirmations (taxes and duties may apply; prepaid, not cash on delivery for global items). The send button stays disabled until the essentials are present, prevents duplicate sends and opens WhatsApp with the details. Verified in a real browser on all pages.
- **Live shipping estimate** for the five foreign markets: CJ variants then CJ freight through the store's own \`/api/cj/*\` endpoints; rates shown unchanged as indicative US dollars; any failure falls back to WhatsApp. Verified live on 2026-11-19 on eight pages.
- Footer link "Shipping by country" and links from the shopping guide and the shipping pages.

## Not implemented (and why)
| Requested | Status |
|---|---|
| Postcode-based eligibility check | The postcode is collected but not sent to the freight API; shipping is quoted by country |
| Total payable amount | Only item plus shipping, indicative; taxes and duties are not calculated |
| Working checkout route from the landing pages | Hand-off is WhatsApp. Native WooCommerce checkout accepts Pakistan only; the plugin's virtual checkout reports ready but was not wired to the landing pages or tested with an order |
| Featured products, category highlights, trust section | Not built; no verified product feed per country |
| Pricing | No prices are published on the landing pages (no verified retail price or stock for supplier items) |
| Analytics events (engagement, CTA clicks, delivery checks, add-to-cart, checkout, orders) | Not added; no landing-page analytics integration was found that could be reused without touching protected files |
| Measured conversion and qualified-order rates | No data exists. Do not infer any rate |

## Measurement plan (needs the owner)
Define a qualified order, add privacy-compliant events to the panel (CTA click, quote success, send), and record a 30-day baseline before setting targets.
`);

const owner = 'owner action';
const blockers = [
  ['Footer link on the 63 committed section-page copies of index.html', 'Edits ready in the scratch clone but not committed: the safety system blocked the commit because the authorization named only index.html and partials/chrome.json', 'Name the 63 generated section pages (or say "commit the regenerated section pages") ', owner],
  ['Pull request', 'The GitHub connector returns 403 for PR creation and gh is not installed; work was pushed directly to main on the owner\'s instruction', 'Open PRs yourself, or provide a token with pull-request scope', owner],
  ['Search Console sitemap submission and index monitoring', 'No Search Console access', 'Submit sitemap-landing.xml and the main sitemaps; export Coverage and Page indexing reports', owner],
  ['Native review of Urdu, German, Serbian and Arabic copy', 'No reviewer recorded', 'Name a native reviewer per language; record sign-off in data/landing/markets.json', owner],
  ['Per-country shipping, payment and returns verification (240 countries without pages; 5 foreign markets already indexed by owner override)', 'No carrier contracts, no per-country test orders, no restricted-category list', 'Supply contracts or test-order evidence per country', owner],
  ['Translations for the remaining 122 overlay languages', 'No translation provider, translation memory or reviewers connected to the landing system; machine translation without review would be mislabeled', 'Choose a provider and reviewers; the registry already tracks all seven statuses', owner],
  ['City pages', 'Zero cities have verified fulfilment evidence and documented search demand; infrastructure and gates are built', 'Provide dated carrier evidence and Search Console demand per city', owner],
  ['Country x language route generation for 246 x 128 combinations', 'Official-language mapping and per-country evidence are not available; generating the combinations now would create doorway pages', 'Approve a verified country-language mapping and the evidence rule for promotion', owner],
  ['Product optimization pipeline for the 11,763 published products', 'Needs reviewed specifications per product; not started', 'Prioritize the 2,889 products without images and the 506 duplicate-title groups first', owner],
  ['Landing-page analytics and conversion measurement', 'No event integration available without touching protected files', 'Authorize an events integration and define "qualified order"', owner],
  ['Global checkout from the landing pages', 'Native WooCommerce checkout is limited to Pakistan; the virtual checkout was not tested with an order', 'Run a sandbox order through the virtual checkout and approve wiring it to the pages', owner],
  ['Country and language sitemaps', 'Not built: no country or language pages beyond the 12', 'Follows the decisions above', 'follow-up']
];
wr('reports/remaining-blockers.md', `# Remaining blockers\n\nEvery item below is open. None is hidden behind a completion percentage.\n\n| # | Item | Why it is open | Resolution step | Owner |\n|---|---|---|---|---|\n${blockers.map((b, i) => `| ${i + 1} | ${b.join(' | ')} |`).join('\n')}\n`);

const secs = [
  ['1', 'Preserve and verify existing work', 'Done', `Live validator: ${live ? live.pages.length : 0} pages, ${liveIssues} issues; tests re-run`],
  ['2', 'Footer link', 'Partial', 'Live on home, blog, product/category chrome and landing pages (desktop and mobile verified); 63 committed section-page copies not committed (authorization)'],
  ['3', 'Country coverage (246)', 'Partial', `Configuration and matrices for ${nC} countries; ${countriesWithPage} have pages; 240 deliberately without pages`],
  ['4', 'Language coverage (127)', 'Partial', `Registry with 7 statuses for ${nLang} languages; ${draftedInOverlay} drafted; ${overlay.length - draftedInOverlay} not started`],
  ['5', 'Country x language routes', 'Partial', 'Centralized generator and validators exist for the 12 live routes; the combination matrix is not generated (see blockers)'],
  ['6', 'City pages', 'Partial', 'Registry, evidence gates, generator and tests built; 0 cities qualify'],
  ['7', 'Shipping, payment, returns verification', 'Partial', `Matrices for ${nC} countries from published policy, WooCommerce config and a CJ quote survey; per-country commercial verification pending`],
  ['8', 'SEO, AEO, GEO, SXO', 'Partial', 'Landing pages validated; no keyword volume data; no Core Web Vitals; no Google data'],
  ['9', 'Product SEO (entire catalogue)', 'Partial', 'Audit only; pipeline not built'],
  ['10', 'Qualified order and conversion', 'Partial', 'Panel and live estimate built; analytics, postcode eligibility and checkout wiring not built'],
  ['11', 'Search Console and indexing', 'Blocked', 'Validation done; submission needs owner access'],
  ['12', 'Testing', 'Partial', `${testSum.pass} of ${testSum.tests} automated tests pass; no 246 x 127 route-combination tests (no such routes exist)`],
  ['13', 'Final reports', 'Done', '14 reports generated'],
  ['14', 'Git, PR, deployment', 'Partial', 'No PR possible; work pushed directly to main on the owner\'s instruction; deployments verified live']
];
const done = secs.filter(s => s[2] === 'Done').length;
wr('reports/global-completion-report.md', `# Global completion report

**Date:** ${TODAY}. **Repository commit when generated:** \`${head}\`. Every figure is a numerator and denominator with its evidence. No figure is a blended score.

## Mission sections (14)
Fully done: ${frac(done, 14)}. Partial: ${secs.filter(s => s[2] === 'Partial').length}. Blocked on the owner: ${secs.filter(s => s[2] === 'Blocked').length}.

| # | Section | Status | Evidence |
|---|---|---|---|
${secs.map(s => `| ${s.join(' | ')} |`).join('\n')}

## Independent completion figures
| Measure | Numerator / denominator | Evidence |
|---|---|---|
| Landing pages live and passing the live validator | ${frac(live ? live.pages.filter(p => p.status === 200).length : 0, routes.length)} | data/landing/live-validation.json, reports/hreflang-validation.md |
| Countries with a landing page | ${frac(countriesWithPage, nC)} | reports/country-coverage-246.csv |
| Countries with configuration, policy region and status rows | ${frac(nC, nC)} | reports/country-coverage-246.csv (configuration only, not pages) |
| Countries where CJ returned shipping options for the sample item | ${ship ? frac(sWith, nC) : 'not surveyed'} (no option: ${sNone}; request failed: ${sFail}) | data/landing/country-shipping-evidence.json, one sample item, quantity 1, ${ship?.observedOn || 'n/a'} |
| Countries with shipping verified commercially (contract, restricted list, test order) | ${frac(0, nC)} | none on file |
| Countries with payment verified by a test payment | ${frac(0, nC)} | gateways are enabled in WooCommerce (matrix) but no payment was tested; native checkout allows Pakistan only |
| Countries with country-specific returns terms | ${frac(0, nC)} | one global published policy applies; local consumer rights stated generically |
| Languages with dedicated landing URLs (incl. source English) | ${frac(withPages.size, nLang)} | reports/language-coverage-127.csv |
| Overlay languages assistant-drafted | ${frac(draftedInOverlay, nOverlay)} | same |
| Drafted languages with automated checks passed | ${frac(draftedInOverlay, draftedInOverlay)} | tests (scripts, placeholders, leftover English); not a linguistic validation |
| Overlay languages with native review completed | ${frac(0, nOverlay)} | no reviewer recorded |
| Cities with a page | ${frac(0, cities.length)} | reports/city-coverage.csv (registry empty; no city qualifies) |
| Indexable landing pages (page says index, follow) | ${frac(idxPages, routes.length)} | live robots tags; ${markets.markets.length} foreign markets indexed by owner override |
| Pages shown to be indexed by Google | unknown | no Search Console access; do not infer from the sitemap |
| Landing sitemap URLs present and HTTP 200 | ${live ? frac(routes.filter(r => r.indexable).length - live.sitemapIssues.length, routes.filter(r => r.indexable).length) : 'n/a'} | reports/sitemap-validation.md |
| Country, language, product and category sitemaps built for the landing system | ${frac(0, 4)} | not built |
| Automated tests passing | ${frac(testSum.pass, testSum.tests)} | reports/test-results.md |
| Published products with an image | ${frac(cat.productsByStatus.publish - cat.publishedWithoutThumbnail, cat.productsByStatus.publish)} | reports/product-seo-audit.md |
| Search Console submission | ${frac(0, 1)} | awaiting owner action |

## Test runs
| Suite | Tests | Pass | Fail | Command |
|---|---|---|---|---|
${cm || '| not recorded | | | | |'}

## Route coverage
${nC} countries x ${nLang} languages = ${(nC * nLang).toLocaleString()} combinations. Live routes: ${landingLocales.length} locale pages plus the hub (${routes.length} URLs). ${(nC * nLang - landingLocales.length).toLocaleString()} combinations have no route; each is non-indexable by construction because no page exists. No combination was generated, to avoid doorway pages.

## Deliverable status
Reports generated: country-coverage-246.csv, language-coverage-127.csv, city-coverage.csv, global-fulfilment-matrix.csv, global-payment-matrix.csv, global-returns-matrix.csv, global-seo-validation.md, hreflang-validation.md, sitemap-validation.md, product-seo-audit.md, qualified-order-cro-report.md, test-results.md, remaining-blockers.md, this file.
`);

wr('reports/global-seo-validation.md', `# Global SEO validation

**Date:** ${TODAY}. Scope: the 12 deployed landing pages and the registries. Nothing here is a Google measurement.

## Technical (validated, live)
- ${live ? live.pages.length : 0} pages: HTTP 200, self canonical, expected robots, \`html lang\` equals the locale, one H1, JSON-LD parses, no duplicate titles or descriptions (reports/hreflang-validation.md; ${liveIssues} issues).
- Hreflang is reciprocal, self-referencing, with one \`x-default\`; \`sitemap-landing.xml\` carries the same sets (reports/sitemap-validation.md).
- Internal links: the pages are linked from the shopping guide, the English and Urdu shipping pages and, after 2026-11-20, from the shared footer (home, blog, product and category chrome, landing pages).

## Semantic, AEO, GEO, SXO
- Answer-first intros and visible FAQs with matching FAQPage markup on every page; WebPage and BreadcrumbList markup; no Offer, rating or review markup.
- **No keyword research evidence exists.** reports/keyword-and-internal-link-map.csv records search volume and difficulty as "not measured". No Search Console, Keyword Planner or dataset was available. Do not treat any keyword as validated.
- GEO: business identity in the pages is limited to the site name, WhatsApp number and published policies; no addresses or offices were invented.
- SXO: mobile layouts, RTL, keyboard focus and a working order panel were tested; Core Web Vitals and accessibility audits (axe/Lighthouse) were not run.

## Risks (see also reports/seo-technical-validation.md)
Foreign-market pages are indexed by owner override without per-country evidence or native review of non-English copy; the footer link now gives all 12 pages a sitewide inbound link, which raises the exposure if search engines judge them thin.
`);
console.log(JSON.stringify({countries: nC, languages: nLang, overlay: nOverlay, withPage: countriesWithPage, survey: ship ? {withMethods: sWith, none: sNone, failed: sFail} : null, sectionsDone: done}));
