# Landing system baseline

Observations are dated. Facts are labelled **observed**; anything else is an assumption or a recommendation.

## 1. Architecture (observed 2026-11-14 to 2026-11-19)

| Layer | What it is | Evidence |
|---|---|---|
| Static front end | GitHub Pages from `kosama685/sastamilaga` (`main`). Static HTML for `p/` (local products), `c/` (categories), `b/` (blog), section pages | repository tree, `.github/workflows/static.yml` |
| Edge | Cloudflare Workers in front of `sastamilaga.com`: `/global-shop/p/*` product pages, `/global/p/*` legacy 301s, `/c/global/*` category SEO, qualified sitemaps, redirects, video proxy `/cjv/*`, CJ variants and shipping `/api/cj/*` | `docs/production-recovery/2026-11-14-*.md`, live response headers |
| WordPress / WooCommerce | Cart, checkout, local-product commerce, plugin `global-dropshipping-commerce` (CJ API, videos, freight) | server code read over SSH, live `/cart/` |
| Data | CJ catalogue snapshot (GitHub Pages `data/cj/`), Cloudflare D1 (free tier row-read limit reached on 2026-11-14) | incident report in `docs/production-recovery/` |

A static front end cannot do live shipping quotes, stock checks or checkout. The landing pages therefore hand orders to WhatsApp and link to the existing shop; they do not call those services.

## 2. Theme (observed in `assets/theme/static-bundle.css` and the live pages)
`--smh-g #0F7A3B` (green), `--smh-gd #0B5E2E`, `--smh-t #0B3B20` (dark green), `--smh-o #FF8A00` (orange), `--smh-m #EAF6EE` (mint), `--smh-line #E2E8E4`, footer navy `#141a2b`. Fonts: Host Grotesk (headings), Inter (body). `assets/css/landing.css` reuses these tokens.

## 3. Catalogue snapshot, measured 2026-11-19 (`reports/catalog-snapshot-metrics.json`)
Source: `data/cj/manifest.js` and all 572 category shards, snapshot dated **2026-11-05**. This measures the snapshot, not live stock, live price or publication status.

| Metric | Value |
|---|---|
| Rows read | **451,812** (declared total 451,812; 572 of 572 shards read, 0 failed) |
| Groups / categories | 16 / 572 |
| Missing image, price, name or SKU | 0 / 0 / 0 / 0 |
| Duplicate product IDs | 0 |
| Duplicate SKUs | 2 |
| Rows whose name repeats an earlier row (case-insensitive) | 19,741 |
| Names shorter than 15 characters | 3,380 |
| Rows with a stored video link | 5,804 (those links return HTTP 403; licensed playback goes through the CJ API) |
| Price range in snapshot | 0.01 to 999,999 (the maximum is an obvious outlier, unreviewed) |
| Largest groups | Fashion & Apparel 114,141; Health & Beauty 54,645; Electronics & Appliances 47,524 |

Not measured: published/draft/variable status, live stock, live prices, variants, attribute completeness, description quality (the snapshot has none). The user estimate of "400,000+" is consistent with 451,812 snapshot rows.
Local (non-CJ) catalogue: 20,165 static product pages, per `docs/CJ_API_2_0_ENTERPRISE_COVERAGE_AND_GATES_2026-11-14.md`.

## 4. SEO state before this work (observed, from repository documents and live checks)
- 451,810 of 451,812 supplier records were not SEO-approved; `sitemap-global-qualified.xml` lists 2 products. Unreviewed supplier pages are `noindex, follow` by design.
- 572 global category pages carry schema and about 3,426 contextual links (PR #13 to #17, per the release report).
- Google Search Console OAuth returned `invalid_grant`; Merchant Center totals unavailable (reported 2026-11-14).
- `/cart/` time to first byte 2.4 to 2.8 s, one cold request 10.9 s (2026-11-15); `/checkout/` redirects to `/cart/` when the WooCommerce cart is empty; `/api/cj/variants` returned HTTP 503 on 2026-11-14.
- Market picker lists 246 countries; the audit tool on `main` records 0 markets qualified for indexable landing pages.
- The site's translate overlay lists 127 languages; only English and Urdu have dedicated URLs, plus the new pages.

## 5. Protected paths (not edited)
`assets/js/chrome.js`, `tools/build-chrome-runtime.mjs`, `tools/build-chrome-runtime.test.mjs`, `partials/chrome*.json`, `tools/audit-static-global-seo.mjs`, `tools/audit-market-locale-readiness.mjs`, `tools/audit-public-locales.mjs`, `assets/js/woo-bridge.js`, `.github/workflows/chrome-runtime-ci.yml`, `.github/workflows/static.yml`. `git diff origin/main` on these returns no changes.

## 6. Limits of this baseline
No live deployment was changed or measured after the change. Core Web Vitals, field data, Search Console data and keyword volumes were not available.
