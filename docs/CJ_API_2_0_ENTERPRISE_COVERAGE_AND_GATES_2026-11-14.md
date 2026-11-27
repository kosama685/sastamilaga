# Sasta Milaga | CJ API 2.0 endpoint contract and enterprise release gates
**Verified against linked GitHub/Cloudflare code and CJ documentation: 2026-11-14**

The tables below inventory *every capability named in the supplied master brief*. This is an implementation and safety register, not a claim that all features are live. Confirm any endpoint marked "verify" against the current CJ documentation before development. The official documentation recommends refreshing knowledge monthly: https://developers.cjdropshipping.cn/en/api/introduction.html

**Verified live services:** Cloudflare `sastamilaga-cj-shipping` (CJ authentication, variant lookups, simple freight, product video lookup), `sasta-cj-variants-shipping` (verified/limited variant and shipping gateway), `sasta-cj-video-proxy` (signed Referer-aware media); Global Pages worker `sasta-global-product-design-v6` with D1 or static recovery. Checkout remains a separate WordPress/WooCommerce path. No CJ order mutation was performed by the SEO release.

**Status codes:** LIVE = observed in connected production code/tests; SOURCE = checked-in catalogue/static or separate UI only, not a fresh API confirmation; NOT VERIFIED = no validated end-to-end production route; RESTRICT = account/admin/order-sensitive action, do not surface publicly; DEPRECATED = intentionally not called.

## 1. Authentication and settings
| User-requested endpoint | Status | Feature / acceptance decision |
| --- | --- | --- |
| POST /authentication/getAccessToken | LIVE | Server-only provider token acquisition; access token never goes into browser JS |
| POST /authentication/refreshAccessToken | NOT VERIFIED | Implement 401/expiry recovery with refresh-token support, bounded retry and requestId logging; current provider can reacquire token |
| POST /authentication/logout | RESTRICT | Explicit account-owner disconnect only; never anonymous storefront control |
| POST /authentication/getAffiliateAccessToken | RESTRICT | No affiliate UI authorized; avoid loading affiliate secrets into shop runtime |
| POST /setting/get | NOT VERIFIED | Server-side store/currency defaults; no guessed defaults or secrets in response |

## 2. Products, categories, inventory and videos
| Endpoint | Status | Feature / acceptance decision |
| --- | --- | --- |
| GET /product/getCategory | SOURCE | Supplier category manifest and 572 static category pages exist; live CJ category sync not verified |
| GET /product/listV2 | SOURCE | CJ search/filter contract; static snapshot feeds current categories; full filtered remote query not proven |
| GET /product/list | DEPRECATED | Do not use the legacy list endpoint |
| GET /product/globalWarehouseList | NOT VERIFIED | Ships-from filters only after live warehouse-country provenance |
| GET /product/query?pid= | NOT VERIFIED | PDP specification verification. **Correct method is GET** per official CJ docs, not POST as in the brief |
| GET /product/variant/query?pid= | LIVE | Variant service in Cloudflare provider, cached and rate limited. **Correct method is GET**, not POST |
| GET /product/variant/queryByVid | NOT VERIFIED | Variant-specific attribute/stock reconciliation |
| GET /product/stock/queryByVid?vid= | NOT VERIFIED | Source of truth for available stock. **Correct method is GET**, not POST |
| POST /product/queryVideosByProductId | LIVE | Official video lookup, eligibility gates, signed proxy; verified 206 for authorized example |
| Warehouse-country/availability from product inventory | NOT VERIFIED | Do not invent inventory or warehouse badge from a static product image |

## 3. Warehouses and newer interfaces
| Endpoint / capability | Status | Feature / acceptance decision |
| --- | --- | --- |
| GET /warehouse/detail | NOT VERIFIED | Warehouse detail and actual origin information |
| GET /warehouse/list | NOT VERIFIED | Server-backed warehouse sidebar options |
| Get Storage Info (added 2025-11-18) | NOT VERIFIED | Resolve current endpoint and fields from CJ's storage docs before wiring |
| Sub-warehouse List (product inventory enhancement 2025-11-19) | NOT VERIFIED | Only display after confirmed inventory API response |

## 4. Shopping, orders and payment (administrative/restricted)
| Endpoint | Status | Feature / acceptance decision |
| --- | --- | --- |
| POST /shopping/order/createOrder | DEPRECATED | No new integration |
| POST /shopping/order/createOrderV2 | RESTRICT | No live order creation until authorized paid/sandbox verification |
| POST /shopping/order/createOrderV3 | RESTRICT | Future fulfillment adapter only: idempotent order reference, verified buyer payment, anti-duplicate rules |
| GET /shopping/order/list | RESTRICT | Authenticated account/order-owner scope, not public listing |
| GET /shopping/order/getOrderDetail (verify current docs) | RESTRICT | Authenticated server owner check required before showing order data |
| PATCH /shopping/order/confirmOrder | RESTRICT | **Correct method PATCH** per CJ docs; never execute as anonymous shopper |
| GET /shopping/pay/getBalance | RESTRICT | Financial/admin-only, no public balance exposure |
| POST /shopping/pay/payBalance | DEPRECATED | Do not use older balance settlement for new builds |
| POST /shopping/pay/payBalanceV2 | RESTRICT | Requires explicit owner-authorized financial workflow; not interchangeable with collecting customer payment |

**Commerce boundary:** WooCommerce cart/checkout remains the merchant-facing checkout; CJ is the possible back-office supplier fulfillment system. Do not replace WooCommerce checkout with CJ balance payment, generate a CJ supplier order from an unverified inquiry-only page, or send a paid order twice. A checkout HTTP 200 response is not proof of payment, fulfillment, or sandbox success.

## 5. Logistics and tracking
| Endpoint / interface | Status | Feature / acceptance decision |
| --- | --- | --- |
| POST /logistic/freightCalculate | LIVE | Provider calculates country/variant freight estimates; live conditions can change |
| POST /logistic/freightCalculateTip | NOT VERIFIED | Exact landed cost only after retrieving product property, valid origin and destination country; no zero-weight guesses |
| GET /logistic/trackInfo | NOT VERIFIED | Tracking page with authenticated/order-scoped reference |
| GET /logistic/getTrackInfo | DEPRECATED | Never call historical endpoint |
| Available Shipping Methods by SKU (new) | NOT VERIFIED | Confirm exact official endpoint, SKU availability and destination |
| Reachable Countries of a Shipping Method (new) | NOT VERIFIED | Validate current API and data before populating destination filters |
| Look Up Replaced Tracking Number (new) | NOT VERIFIED | Support tracking replacement while preserving original order lineage |
| Platform Logistics Order Processing (new) | NOT VERIFIED | Process/status documentation, requires order-state reconciliation |

## 6. Disputes
| Endpoint / function | Status | Feature / acceptance decision |
| --- | --- | --- |
| GET /disputes/disputeProducts | RESTRICT | Order-owner eligibility gate |
| POST /disputes/disputeConfirmInfo | RESTRICT | Required dispute preflight |
| POST /disputes/create | RESTRICT | Explicit customer request and permitted order scope only |
| POST /disputes/cancel | RESTRICT | Authenticated reversible-action policy, do not invoke in bulk |
| GET /disputes/getDisputeList | RESTRICT | Account-specific, no private information in client caching |

## 7. Logs and reconciliation
| Interface | Status | Feature / acceptance decision |
| --- | --- | --- |
| Query Order Logs (fullTimeline) | NOT VERIFIED | Owner-scoped history; reject other-account orders; exact endpoint to be verified |
| Query Product Connection Logs | NOT VERIFIED | Source of truth for CJ product <> WooCommerce product mapping |
| Query API Call Logs | NOT VERIFIED | Admin diagnostics with redacted request IDs and rate-limit statuses |

## 8. Search / SEO / AEO / GEO / SXO release controls
- Product permalinks: **do not bulk-migrate** established live paths. Use `/global-shop/p/<id>/<slug>/` for live CJ supplier records; preserve the working Cloudflare old-URL 301 redirects and self-canonicals.
- Category structured data and static internal links: PR #38 corrects 16,236 Product ItemList entries, covers 572 categories and generates 2,227 shared-topic links; all corrected URLs checked against actual HTML product cards. Empty semantic similarity produces no fabricated links.
- Category facets: the current static sidebar searches **only visible cards**. A true catalogue-wide filter requires indexed attributes, verified `listV2` query parameters or equivalent server-side search, and its own count/pagination tests. Do not advertise missing facets as functional.
- Search/filter indexing: keep internal search `noindex`, avoid exploding query-parameter permutations, reserve indexable pages for unique editorial/category pages with valid canonical links.
- Supplier Product markup: no `Offer`, `VideoObject`, brand, stock, GTIN, rating, review or fixed shipping claim without actual verified underlying data. No mass indexing of 451,812 supplier records.
- Local products: 20,165 product HTML pages; the last candidate Merchant report had 19,872 basic-format candidates and 293 exclusions, but **purchase and stock are not verified**. `tools/merchant-feed-preflight.mjs` archives a candidate XML only; it does not submit to Google Merchant Center.
- AI-readable navigation: PR #39 replaces 9 obsolete hash routes in `llms.txt` and adds `llms-full.txt`; this is documentation, not a Google ranking mechanism.
- Core Web Vitals: last site audit reported poor mobile homepage LCP caused by oversized JS catalogue loading. Significant app-shell refactor and live device retesting are still required.
- Search Console: OAuth `invalid_grant` was documented previously; owner reconnection is required for real indexing/coverage claims.
- D1: a free-tier row-read limit was reached during this audit; supplier snapshots fail over but fresh search/stock cannot be guaranteed.

## 9. Required final acceptance before any claim of "100% complete"
1. Owner-approved store, tax, refund, warehouse, inventory, product identifier and payment policies. Do not fabricate data.
2. Reconnected Google Search Console and Merchant Center with authenticated coverage and product approval totals.
3. Product data enrichment, supplier media ownership, and live checkout + settlement + CJ fulfillment sandbox tests.
4. Full cross-browser filter/pagination test against real server-side result sets, not just initial card batch.
5. Core Web Vitals performance pass on actual phone devices and ongoing 7/30-day monitoring.
6. Controlled change management, rollback, anti-duplication/idempotency and error-state drills for orders/disputes.

**Reference documentation**
- Product, search, variant and stock contracts: https://developers.cjdropshipping.cn/en/api/api2/api/product.html
- Shopping, payment and order contracts: https://developers.cjdropshipping.cn/en/api/api2/api/shopping.html
- Shipping: https://developers.cjdropshipping.cn/en/api/api2/api/logistic.html
- Disputes: https://developers.cjdropshipping.cn/en/api/api2/api/dispute.html
- Google facet crawl guidance: https://developers.google.com/crawling/docs/faceted-navigation
- Google Merchant product eligibility: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
