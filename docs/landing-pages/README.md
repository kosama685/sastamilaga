# Landing pages: how this system works

One template, generated from data. Pages are static HTML on GitHub Pages and use the shared header and footer through the existing chrome placeholders.

| File | Purpose |
|---|---|
| `data/landing/markets.json` | Market facts (English copy, `indexable` flag, evidence note, Pakistan fee/threshold) |
| `tools/landing-i18n.mjs` | UI strings for en, de, sr (Latin), ar and per-market copy for de, sr, ar. Serbian Cyrillic is transliterated from the Latin text |
| `tools/build-landing-pages.mjs` | Generates every page, `sitemap-landing.xml` and `data/landing/routes.json` |
| `tools/build-landing-pages.test.mjs` | 86 content, SEO, link, locale and live-estimate tests |
| `tools/build-locale-registry.mjs` | Writes `data/landing/locale-registry.json` and the CSV/MD reports under `reports/` |
| `tools/measure-catalog-snapshot.mjs` | Read-only measurement of the catalogue snapshot |
| `assets/css/landing.css` | Theme tokens (green #0F7A3B, orange #FF8A00, mint #EAF6EE, dark green #0B3B20) |

## Commands

```
node tools/build-landing-pages.mjs       # regenerate pages (idempotent)
node --test tools/build-landing-pages.test.mjs
node tools/build-locale-registry.mjs     # refresh the registry and reports
node tools/measure-catalog-snapshot.mjs  # refresh catalogue metrics (network, a few minutes)

# global coverage (2026-11-20)
node tools/survey-cj-shipping.mjs        # read-only CJ quote for one sample item to all 246 countries (~25 min, throttled)
node tools/validate-landing-live.mjs     # read-only live check: hreflang, canonicals, sitemaps -> reports/hreflang-validation.md, sitemap-validation.md
node tools/build-city-pages.mjs          # city pages: generates only cities that pass the evidence gates (registry is empty)
node tools/build-global-coverage.mjs     # country/language/fulfilment/payment/returns matrices and the completion reports
node --test tools/build-city-pages.test.mjs tools/build-global-coverage.test.mjs
```

Evidence files read by the coverage builder: `data/landing/country-shipping-evidence.json` (CJ sample quotes), `woocommerce-config-2026-11-20.json` (read-only WooCommerce settings), `catalog-audit-2026-11-20.json` (read-only catalogue counts), `cities.json`, `test-run.json`. Refresh them before regenerating the reports; the builder never invents a value that has no evidence file behind it.

## Add a market
1. Add an entry to `data/landing/markets.json` (`slug`, `code`, `name`, `region`, `intro`, `tax`, `safety`, `question`, `answer`, `indexable: false`, `evidence`). Use only statements that are true of the live store or generally true of cross-border parcels. No transit days, prices, guarantees.
2. Add the slug to `VARIANTS` in `tools/build-landing-pages.mjs`, and a name for it in each language's `names` in `tools/landing-i18n.mjs`.
3. Build, run the tests, run the registry tool.

## Add a language to a market
1. Add a string set to `S` and market copy to `M` in `tools/landing-i18n.mjs`.
2. Add a variant (`id`, `rel`, `S`, `lang` BCP-47, `native`, `dir` if RTL) to the market's `VARIANTS` entry. Add the locale expectations in `LOCALE` in the test file.
3. Have a native speaker review it before the market is made indexable.

## Index status
Since 2026-11-20 all markets are indexable by owner override (see each `evidence` field). Recommended practice remains: verify shipping, payment, tax and returns, and have a native speaker review each language, before indexing a market. To withdraw one, set `"indexable": false` and rebuild.

## Make a market indexable
Only after: verified shipping, payment, tax and returns for that country, and native-speaker review of each language. Record the evidence in `markets.json` (`evidence`), set `"indexable": true`, rebuild. The build then emits the full reciprocal hreflang set and lists the pages in `sitemap-landing.xml`. Add `sitemap-landing.xml` to the sitemap index (not done here).

## Verify prices and policies
Pakistan fee and threshold are asserted against `assets/js/config.js` by a test. International pages carry no prices and no Offer markup by design.

## Live shipping estimate
International pages call the store's own `/api/cj/variants` and `/api/cj/shipping` (same origin on sastamilaga.com). The panel parses the product id from a `/global-shop/p/<id>/` link, lists the CJ variants, then requests rates for the market's country code. Rates are shown as returned (indicative USD); if the service fails or the link is missing, the order still goes through WhatsApp. These endpoints reject other origins, so test locally with captured responses.

## Occasion, offer and special-day collections

`node tools/build-landing-pages.mjs` now also builds 58 collection pages: three country hubs and two detailed occasion guides for each of the 11 existing market/language variants, plus three global hubs. This covers all six supported landing markets, not every destination in the worldwide country picker. Existing locale and RTL behavior is retained.

The editorial calendar is `data/campaigns/registry.json`. Localized topic copy is in `guides.json`, `special-day-guides.json` and `tools/campaign-i18n.mjs`. `data/campaigns/local-catalog.json` contains existing Pakistan product-page references; refresh it with `python tools/prepare-campaign-catalog.py`. Supplier selections come from the existing category shards. Prices and live availability are intentionally confirmed on the product pages.

Every page has a self-canonical, reciprocal language alternates, visible FAQs, breadcrumbs and CollectionPage/ItemList markup. `sitemap-campaigns.xml` is registered in the root sitemap. `data/campaigns/keyword-map.csv` records page intent and semantic topic targets; it does not claim measured volume, rankings, Google indexing or Ads approval. Calendar sources are linked next to the relevant occasions. Lunar dates, school calendars and family-specific Slava dates are not guessed.

### Publish a documented promotion

Add a record to `data/campaigns/promotions.json` with `market`, `verified: true`, `title`, `description`, `url`, `termsUrl`, `evidenceUrl`, `startsAt` and `endsAt`. Use full ISO timestamps with timezone offsets. The purchase destination and terms URLs must stay on sastamilaga.com; evidence must use HTTPS. Confirm the discount, eligible products and destination before marking it verified. Without a matching active record, a country offer hub explicitly says no verified limited-time discount is published.

Only current, evidenced promotions are emitted. `assets/js/campaigns.js` also hides expired promotion cards on cached pages. `.github/workflows/campaign-refresh.yml` rebuilds and publishes changed generated pages daily at 01:15 UTC (04:15 Asia/Riyadh). It makes no write when the output is unchanged. The promotion registry currently contains no verified discounts.

### Validate collections

Run the original landing and storefront suites and `node --test tools/build-campaign-pages.test.mjs`. The DOM tests require Linkedom; set `SM_DOM_MODULE` to an installed module path as in the GitHub workflows. Collection checks cover 58 routes, source/category/product links, fragment anchors, reciprocal alternates, schema, promotion eligibility, cached expiration and deterministic output. The normal Pages deploy runs these checks before publishing.

Native-language editorial review remains recorded separately from generated-page validation. Do not infer reviewed shipping, translation, discounts or customer feedback from a successful build.

## Roll back
Revert the relevant landing/campaign commit and redeploy. Keep the existing country routes and shared chrome files; do not delete the entire country tree to reverse an occasion-page update.

## Protected paths
`chrome.js`, `tools/build-chrome-runtime*.mjs`, the audit tools and the cart handler were not edited. The landing pages only use the existing chrome placeholders.
