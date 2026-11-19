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
```

## Add a market
1. Add an entry to `data/landing/markets.json` (`slug`, `code`, `name`, `region`, `intro`, `tax`, `safety`, `question`, `answer`, `indexable: false`, `evidence`). Use only statements that are true of the live store or generally true of cross-border parcels. No transit days, prices, guarantees.
2. Add the slug to `VARIANTS` in `tools/build-landing-pages.mjs`, and a name for it in each language's `names` in `tools/landing-i18n.mjs`.
3. Build, run the tests, run the registry tool.

## Add a language to a market
1. Add a string set to `S` and market copy to `M` in `tools/landing-i18n.mjs`.
2. Add a variant (`id`, `rel`, `S`, `lang` BCP-47, `native`, `dir` if RTL) to the market's `VARIANTS` entry. Add the locale expectations in `LOCALE` in the test file.
3. Have a native speaker review it before the market is made indexable.

## Make a market indexable
Only after: verified shipping, payment, tax and returns for that country, and native-speaker review of each language. Record the evidence in `markets.json` (`evidence`), set `"indexable": true`, rebuild. The build then emits the full reciprocal hreflang set and lists the pages in `sitemap-landing.xml`. Add `sitemap-landing.xml` to the sitemap index (not done here).

## Verify prices and policies
Pakistan fee and threshold are asserted against `assets/js/config.js` by a test. International pages carry no prices and no Offer markup by design.

## Live shipping estimate
International pages call the store's own `/api/cj/variants` and `/api/cj/shipping` (same origin on sastamilaga.com). The panel parses the product id from a `/global-shop/p/<id>/` link, lists the CJ variants, then requests rates for the market's country code. Rates are shown as returned (indicative USD); if the service fails or the link is missing, the order still goes through WhatsApp. These endpoints reject other origins, so test locally with captured responses.

## Roll back
The change adds files only. Revert the merge commit, or delete `pakistan/`, `ur/pakistan/`, `shipping-to/`, `sitemap-landing.xml`, `data/landing/`, `assets/css/landing.css` and the tools above. No existing URL, redirect or template was changed.

## Protected paths
`chrome.js`, `tools/build-chrome-runtime*.mjs`, the audit tools and the cart handler were not edited. The landing pages only use the existing chrome placeholders.
