# SastaMilaga — CJ catalogue 503 error incident and regression closure

Date: 2026-11-14 UTC. Site: https://sastamilaga.com

## Observed customer symptom
The supplied browser screenshot showed a blank white product page with a plain-text `Catalog temporarily unavailable` message for this 19-digit CJ ID:
`/global-shop/p/1830116277370114048/retro-square-heel-pointed-toe-ankle-boots-fashion-versatile-chelsea-boot-women-s-shoes/?utm_...`

## Confirmed infrastructure root cause
Cloudflare D1 API explicitly rejected queries with **HTTP 400, code 7500**: `Your account has exceeded D1's free tier daily row read limit. Upgrade to a paid plan or wait until tomorrow (midnight UTC) to continue.`
The original page Worker queried D1 live for every product and therefore could serve a 503 when the quota was exhausted. Excessive full-catalogue COUNT operations compounded daily read consumption.

## Deployed production recovery
- PR #22: D1-free snapshot fallback for CJ product pages; HTTP 200 with real supplier name/image/canonical, but **noindex** when unreviewed. Missing IDs remain 404. Stop scanning 451,812 rows with each ops-guard Cron execution.
- PR #23: Persist 1,024 static JSON lookup buckets for 451,812 unique CJ source IDs to GitHub Pages.
- PR #24: Preserve valid qualified sitemap output during D1 outage from confirmed approved baseline; never index all 451k thin records.
- PR #25: Live verification workflow scans **all 572 global category URLs**, one product from **each of 1,024 lookup buckets**, and four critical routes.
- PR #26: Redirect former mass-product sitemap addresses to the reviewed-qualified sitemap; avoid advertising unverified product URLs to Google.
- PR #28: Add exact screenshot-path regression with UTM and fbclid tracking parameters, plus old shoe URL followed to its canonical URL. Reject status !=200, missing canonical, and the plain-text unavailable message.

Latest PR #28 merged main commit `5c48f2e30fc1c7df655f23dd70000e184e9928ac`; GitHub QA success: https://github.com/kosama685/sastamilaga/actions/runs/43626900939

## Test evidence and scope
Full live workflow run https://github.com/kosama685/sastamilaga/actions/runs/43626234000 yielded:
`{"checked_http_routes":1600,"source_products_covered":451812,"counts":{"supplier_product":{"tested":1024,"passed":1024,"failed":0},"global_category":{"tested":572,"passed":572,"failed":0},"critical_route":{"tested":4,"passed":4,"failed":0}},"failures":[]}`.
The PR #28 extended workflow passed the screenshot-query regression tests (expected 1,604 total HTTP samples). Its deployment commit workflow on main must be checked separately before claiming a second independent run.

Additional live `page_inspect` probes returned HTTP 200 for the exact tracked shoe URL, Woman Boots category, different 19-digit CJ product, qualified sitemap, cart and homepage. The shoe product retains `noindex,follow`, reflecting incomplete source-data validation; category and homepage stay indexable.

**Important semantics:** 200 is expected for *existing* healthy product/category pages. Legacy redirects should return 301 and invalid/nonexistent products should return 404; changing these to fake 200 hurts SEO and error detection. Neither all 451,812 product HTTP URLs nor merchant approval/payment flows has been tested individually.

## SRE alerts and prevention
- D1 account remains on a row-read-limited free tier; the snapshot fallback is a resilient read path, not unlimited D1 availability. Consider paid D1 once budget/traffic justify it.
- Keep `sasta-ops-guard-v1` every 30 minutes and independent external GitHub checks. A missing D1 snapshot should fail with real 503, not a fabricated indexable page.
- Maintain all 1,024 static lookup buckets and GitHub Pages publication; monitor the GitHub Actions result, error rate, and CDN response times after future releases.
- Do not emit unsupported worldwide stock/shipping/pricing, unlicensed video media or Product Offer markup.
- Search Console saved Google authorization still returned `invalid_grant` on prior audit and authentic current indexing/Google Merchant approved totals cannot be reported without reconnecting the accounts.

## Rollback
- Product route `sastamilaga.com/global-shop/p/*` currently points to `sasta-global-product-quota-resilient-v5`; previous working script `sasta-global-product-rich-v4` is retained, but reverting to it during D1 quota exhaustion would reintroduce the error. Roll back only after verified D1 recovery.
- GitHub source/health regression: revert PR #28 merge `5c48f2e...` to remove the additional QA only; never delete the 1,024 lookup buckets while D1 remains quota-limited.
- Category Worker `sasta-global-category-seo-edge-v1` remains unchanged.

## Accountable next actions
Engineering: inspect the first post-merge main-branch run and investigate any live 503 alerts. Owner: assess paid D1/alternative persistent storage and reconnect Google authorization. Commerce: verify country-specific checkout/payment in a sandbox with no real customer charges. SEO: review supplier metadata and only qualify substantiated products.
