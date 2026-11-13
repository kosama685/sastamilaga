# Sasta Milaga — 451,812-product catalogue readiness gate

**Audit date:** 2026-11-13 (UTC)  
**Method:** Connected WordPress/SMCS read-only inspection, Cloudflare D1 read-only SQL, live route checks, GitHub repository inspection.  
**Status:** NOT READY for mass Merchant submission or global product sitemap publication.

## Verified source inventory

| Source | Records / status |
|---|---:|
| Cloudflare D1.catalog_products_cj | 451,812 |
| Cloudflare D1.catalog_products_woo_export | 20,193 |
| Cloudflare D1.catalog_products_shopify_export | 19,318 |
| Cloudflare D1.catalog_products_pilot | 724 |
| WooCommerce **currently published** (separate live store count) | 11,763 |
| GitHub static product pages (snapshot; not de-duplicated against Woo) | 20,165 |
| Existing static Merchant feed generator report: included | 19,872 |
| Existing static Merchant feed generator report: excluded | 293 |

The CSV/imported source is NOT the same as an orderable product. Do not sum these counts as independent offers.

## D1.catalog_products_cj completeness — direct aggregate SQL

| Test | Pass |
|---|---:|
| Total unique SKU-keyed records | 451,812 |
| Nonblank product name | 451,812 |
| Image URL/text field present (not fetched or inspected) | 451,812 |
| Positive numeric regular price (currency NOT verified) | 332,621 |
| Nonblank categories | 451,806 |
| Nonblank description | 1 |
| Description length ≥ 100 characters | 1 |
| Nonblank short description | 0 |
| Nonblank English SEO description | 0 |
| Nonblank stock field | 0 |
| Explicitly published status | 0 |

The rows use 'published=-1' and blank 'in_stock' fields as imported. The live CJ API was reached successfully for a sample SKU and returned variants with prices and image URLs but no inventory counts in that variants response. This demonstrates an enrichment path, NOT 451,812 current buyable SKUs.

## Google and live infrastructure

- Merchant Center account is connected, but its last reported sync/status is **2026-10-25** (not today's live approval count): approved 0, disapproved 36, blocked locally 513, API errors 3,123. Sample error: **Product limit exceeded**. Do not amplify imports until the quota and data-source configuration are confirmed.
- WordPress feed status is 'running', with stale/unfinished metadata; GitHub also carries a static feed, and there is a dedicated Cloudflare feed route. Verify which one Google actually consumes before submitting additional offers.
- Search Console is unavailable due to **invalid_grant**. The correct fix is Google's OAuth reconnect, not using the Google Indexing API for ordinary product pages.
- The repository's '/sitemap-global.xml' contains **573 global category URLs and zero individual product URLs**. A separate dynamic '/sitemap-global-products.xml' responds 200 but has not been validated for URL coverage or content quality.
- Sample '/global-shop/p/CJBHNSNS16441' returns HTTP 404/noindex; '/global/p/2E151EB3-DB9B-48E0-AB3D-E4BF6857B54D' returns HTTP 404/noindex. Do not infer that ALL product URLs fail from only these samples; test validated source and canonical URL formats before bulk publishing.
- Cloudflare R2 API reported **10042: Please enable R2 through the Cloudflare Dashboard**. Do not deploy architecture assuming R2 works. The catalogue already lives in D1.
- Preserve current Cloudflare catch-all Worker, existing specific global/product routes, WordPress order flow and GitHub Pages.

## Mandatory acceptance gates for one pilot product

1. Source identity: unique CJ product ID/SKU, with no duplicate canonical against an existing WooCommerce or static product page.
2. Live supplier status: real variant prices, currency conversion and markup, genuine images, recent availability, destination-dependent shipping and permitted market.
3. Commerce: the exact selected variant can be purchased with a valid cart, checkout, payment and shipping option. Confirm refund and returns policies for the target country.
4. Product page: HTTP 200, server-rendered unique useful product content, one H1, index/follow, self-consistent canonical, unique structured Product/Offer data, crawlable navigation and image accessibility. No fake reviews/GTIN/stock.
5. Merchant feed: attributes match page and checkout exactly; choose ONE feed/API source per item ID; Merchant Center account quota is sufficient; diagnostic status verified.
6. Sitemap: only canonical, indexable, valuable pages with HTTP 200, within 50,000 URLs and 50 MB uncompressed per sitemap. Do not list merely imported/unpublished SKUs.
7. Google Search Console: authorized account can verify sitemap acceptance and real URL indexing statistics. No indexing guarantee.
8. Pilot rollout: start with 10 then 100 then 1,000 actual eligible products, pausing on errors and comparing Merchant approvals, crawl/coverage, customer order tests, Worker error rates and supplier availability.

## Implemented in this change

The new 'tools/catalog-readiness-d1.mjs' script queries the D1 catalogue **read-only**. Its companion GitHub Actions workflow runs on manual dispatch or when this specific audit code changes. It produces downloadable GitHub Actions artifacts (JSON + Markdown) and a summary without creating products, sitemap entries, Merchant offers, Cloudflare routes or checkout changes.

No secrets, supplier order details or customer records are written to the reports.

**Remaining external dependencies:** Merchant Center quota increase (if permitted), Search Console OAuth reauthorization, verifying real buyable offers and price/availability/shipping per market, true product page routing, and phased indexing measurement.
