# Shared supplier product URL recovery

Deployed 23 November 2026. The reported `/global/p/headband-and-hair-band-and-hairpin/1386583701764313088` link permanently redirects to the matching Mori Girl's Moving Butterfly Hairpin Headdress page, which returns HTTP 200 without a prior browser session.

## Changes

- `sasta-product-recovery-v2` resolves legacy `/global/p/<category>/<id>` links using the complete static lookup rather than an incomplete live database. It preserves query parameters and sends a 301 to the matching `/global-shop/p/<id>/<name>/` canonical page.
- UUIDs are uppercased before bucket hashing. Previously, lowercase UUIDs could select a different bucket and incorrectly return not found.
- Valid `/product/<id>/<name>/` pages recover from live-renderer 404, 429 and 5xx responses when their exact record exists in the public snapshot. Healthy responses, legacy WordPress redirects, authentication failures and transactional requests retain their existing handling.
- Static catalog fetches retry once using a distinct canonical-host cache key. Successful catalog data is cached; upstream error statuses are not. This also escapes previously cached gateway failures.
- Deployment changes only the three supplier-product routes, records prior route owners and runs live checks with bounded propagation retries. Other routes remain unchanged. Future general Worker deployments preserve the recovery route.
- The product-renderer deployment preflight now follows GitHub's canonical-domain redirects when checking its template, JavaScript and stylesheet.

## Verification

| Check | Result |
|---|---|
| Complete source and lookup comparison | 451,812 unique product records; zero duplicates; every source row matched |
| Legacy URL mapping | All 451,812 mappings checked locally |
| Lowercase UUID lookup | All 84,653 UUID records checked |
| Local product rendering | One public product rendered from every one of 1,024 lookup buckets |
| Deployed index | All 1,024 deployed buckets matched the source index byte-for-byte after rechecks |
| Live shared-product links | 1,024 bucket samples plus three supplied-URL variants; all 1,027 passed |
| Combined live audit | 2,051 passed, zero unresolved failures; three initial checksum mismatches passed recheck |
| Fresh browser contexts | Desktop, mobile, reload, copied canonical link, JavaScript disabled and lowercase UUID passed |
| Regression tests | 14 targeted tests passed |
| Production deployment jobs | Product recovery and standalone product renderer succeeded |

Evidence:

- [Complete local mapping verification](../reports/complete-product-link-mapping-2026-11-23.json)
- [Live URL and deployed-index verification](../reports/shared-product-live-coverage-2026-11-23.json)
- [Fresh-browser verification](../reports/shared-product-browser-2026-11-23.json)

The live audit samples one product per lookup bucket; it does **not** claim an individual HTTP request to all 451,812 product URLs. Every source mapping was checked, and all deployed index partitions were verified. The existing 483 excluded-category records remain excluded; public coverage is 451,329 catalog records. Unknown or excluded products retain genuine unavailable statuses. Snapshot accessibility does not verify live stock, options, freight, payment or fulfillment. These continue to require confirmation before an order is accepted.
