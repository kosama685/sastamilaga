# Sasta Milaga — Merchant Center and SEO product readiness
**Audit date:** 2026-11-16 · **Scope:** 451,812 supplier snapshot records and local product candidate feed
**Status:** Structural catalogue coverage is separate from Google Merchant Center approval.

## Verified live entrypoints
| URL | Observed | Safe use |
| --- | --- | --- |
| https://sastamilaga.com/feeds/global/index.json | HTTP 200; 129 files; item counts sum to 451,812 | Inventory of raw supplier XML feeds; **NOT a Merchant Center feed approval list** |
| https://sastamilaga.com/feeds/global/1.xml | HTTP 200; 5,866 raw feed items reported by response header | Inspection only until each item passes full commercial eligibility |
| https://sastamilaga.com/feeds/google-merchant.xml | HTTP 200 | Existing local-product Merchant candidate feed; external account eligibility not confirmed |
| https://sastamilaga.com/sitemap-global-qualified.xml | HTTP 200; currently 1 child sitemap | SEO discovery of editorial-qualified product pages; not a Merchant feed |

## Checked-in source evidence
- The supplier lookup repository coverage gate expects 451,812 unique IDs across 1,024 buckets and 572 category entries. This is **catalogue completeness**, not live stock.
- The local candidate report shows 20,165 product pages scanned, 19,872 candidates, 293 exclusions, including 287 records missing primary images and 6 invalid/zero prices (overlapping reasons).
- The global legacy feed generator uses estimated supplier prices and does not verify final paid prices or purchasability on the linked landing pages.
- A sampled /global-shop/p/ product landing page returned HTTP 200, canonical on sastamilaga.com, but meta robots **noindex, follow** and no regular Buy Now/Add to Cart in server HTML.
- A supplied Merchant diagnostics brief describes an account-level Misrepresentation issue and quotas. Its account-state claims require rechecking in Merchant Center; a website or feed change alone does not prove account review clearance.

## NON-NEGOTIABLE eligibility gates before publishing supplier items
1. **Real purchasable SKU:** exact option maps to the commerce backend; a test order can be created through the canonical domain without WhatsApp-only ordering.
2. **Fresh inventory:** availability known for the target market and accurately reflected on page, feed and checkout; never mark unverified supplier items in stock.
3. **Confirmed final retail price:** price and currency match the landing page and checkout. Supplier min/max estimates are not retail Offers.
4. **Landing page:** HTTP 200, specific product, clear photo/variants, title, price, shipping restrictions and enabled purchasing option; rendered consistently for Googlebot/mobile/desktop.
5. **Structured data:** matching Product/Offer facts only when retail data is supported; correct canonical and indexability for eligible pages.
6. **Product hygiene:** factual title/description, safe accurate image, reliable manufacturer identifiers where provided; no fabricated brand/GTIN/MPN.
7. **Policy and account:** truthful contact/address/support, shipping/returns/privacy/terms, payment method and tax/customs disclosures; resolve Misrepresentation through Merchant Center review; check target countries and quotas.
8. **Continuous QA:** stable product ID and URL; scheduled feed refresh and audit; sample Googlebot and checkout tests; monitor disapprovals and crawl failures.

## Recommended operational sequence
**A. Stabilize local:** inspect actual local checkout and identifiers, then submit the local candidate URL as a scheduled-fetch source *only when* the account, eligibility and page/checkout tests pass.
**B. Keep global snapshot as discovery:** do not submit all 129 raw XML feeds. Preserve the snapshot and the 1,024-bucket coverage audit.
**C. Promote verified global products by explicit gates:** produce a *separate* Merchant-eligible source only from products passing criteria 1–8. Start with actual orderable SKUs; expand until the eligible set is complete, not until an arbitrary numeric target is met.
**D. SEO/AEO/GEO/SXO:** maintain editorially-qualified product sitemap, truthful page details, breadcrumb/product schema, quick readable answers, accessible variant selection, media performance, country-specific freight transparency, working CTAs and no duplicate/noindex conflicts.
**E. Account:** verify claimed website is https://sastamilaga.com and seek any needed Google review or Ads quota increase through the Merchant Center dashboard.

## Current automation and remaining blocks
- `tools/audit-global-merchant-readiness.mjs` scans all supplier ID buckets and creates `artifacts/global-merchant-readiness-audit.json`.
- GitHub Actions `global-merchant-readiness.yml` runs weekly and manually; the audit explicitly states **NOT VERIFIED** for merchant eligibility.
- Existing `merchant-feed-preflight.yml` independently validates the local candidate feed but **does not submit it to Google**.
- No Merchant API connection, authenticated account status, per-SKU current stock, per-SKU checkout success, or validated global final price is available in this workflow. Do not describe any of those as completed.

## External requirements
- Google Merchant Center product specification: https://support.google.com/merchants/answer/7052112
- Landing page requirements: https://support.google.com/merchants/answer/4752265
- Availability requirements: https://support.google.com/merchants/answer/6324448
