# SastaMilaga.com — production recovery evidence and acceptance register
**Date:** 2026-11-14 UTC | **Scope:** CJ video-broken legacy product pages; canonical D1 product detail recovery; associated SEO and live commerce safeguards.

> Change-control rule: a GitHub merge and successful CI are not the same thing as an actual browser video playback or a successful sandbox purchase. All claims below are scoped to observations verified today. Do not use this report to advertise 100% indexability.

## 1. Legacy CJ video 0:00 / forbidden source — TESTED — LIMITED SCOPE
**Original issue:** `/global/p/<category>/<id>/<slug>` rendered a raw snapshot video directly from `download-only-api.cjdropshipping.com`; the supplier source responds HTTP 403 for sampled media. A broken player stayed at 0:00.

**Root cause:** Old route `sastamilaga-global-pages` renders November 5 supplier CSV data: only SKU, title, image, estimated price, and a stored video link. It has no licensed-video entitlement check, gallery or accurate current product variants. Existing `sasta-cj-video-proxy` has HMAC validation and byte-range support; it cannot legitimately override upstream 403 or a CJ media license restriction. Live WordPress plugin `GDCS\Videos::eligible` requires `videoState=ON_STATE` and `isFree=1` or `isBuy=true`; keep this gate.

**Code:** [PR #20](https://github.com/kosama685/sastamilaga/pull/20) merged commit `f14f8a6c93155fde9bd16ee9860fb3fe27f512b2`; `tools/legacy-cj-product-canonical-redirect.mjs` and tests. Uses real D1 product ID/name to issue an SEO-friendly HTTP 301 to `/global-shop/p/<id>/<slug>/`. Missing D1 IDs return 404/noindex; a D1 outage returns 503. No video hotlink or proxy-bypass attempt.

**Cloudflare deployment:** New isolated Worker `sasta-global-legacy-canonical-v1` version/deployment `a9bb92baab7b47729b07f18e1224dbe8`, route `sastamilaga.com/global/p/*` route ID `eba38f1a2108426d8a8322328865a1f2`, changed from `sastamilaga-global-pages`; the old Worker still exists.

**Tests:** GitHub Actions `Verify legacy global product migration` passed, including numeric and UUID redirects, unknown 404 and path isolation. Production sampled old numeric-ID and UUID shoe pages: HTTP 301; canonical shoe page: HTTP 200; invalid product: HTTP 404. This eliminates the broken embedded video player on migrated legacy URLs, **not** the upstream 403 or unavailable media licensing.

**Unresolved:** No actual licensed video was demonstrated playing. CJ's eligible-video records must be obtained through authorized CJ APIs and each source must return playable byte ranges before publishing VideoObject or a video player.

**Rollback:** In Cloudflare route ID above, replace script `sasta-global-legacy-canonical-v1` with `sastamilaga-global-pages`; no customer checkout paths were changed.

**Owner next action:** Engineering + CJ account owner verify per-video entitlement, non-403 source and rights; only then add a video player.

## 2. D1 canonical product gallery and structured data — TESTED — LIMITED SCOPE
**Original issue:** Canonical supplier pages did not expose variant photos interactively or sufficiently useful buying guidance.

**Root cause:** D1 has supplier reference/name/image/category records but most listings lack reviewed descriptions, stock, destination shipping and true final checkout prices. The old static source does not include gallery/size-chart detail.

**Code:** [PR #19](https://github.com/kosama685/sastamilaga/pull/19) merged commit `bc5527df85f8d14b0974781bd1f04f2e8873bb63`; `tools/global-product-uuid-and-numeric-worker.mjs`. Reuses rate-gated `/api/cj/variants?pid=...` and `/api/cj/shipping`; progressively loads actual CJ variant images (allowlisted HTTPS CJ image domains) without suggesting unverified stock. Adds factual buyer Q&As, accessible variant-image thumbnails, BreadcrumbList and one Product schema object without fabricated Offer, VideoObject, reviews or GTIN; adds D1-SEO-approved related links, category, shipping, returns and buying-guide links; valid supplier specifications are rendered when the D1 editorial approval flag exists. Keeps unreviewed items noindex and inquiry-only.

**Cloudflare deployment:** New isolated Worker `sasta-global-product-rich-v4` deployment `fc48804fc9df45299d9c32b9b544d727`, route `sastamilaga.com/global-shop/p/*`, route ID `42009e629d974f1ebc3120e1ac9226a6`. Previous version `sasta-global-product-universal-v3` preserved for rollback.

**Tests:** GitHub Actions `Test all CJ supplier ID formats` run `43586309838` passed 6 tests. Live sampled numeric shoe and UUID product return 200 with self-canonical and correct robots; cart remains 200. WordPress connected HTML fetch confirmed `#sasta-verified-gallery-v1` and the image allowlist script are in live HTML. **Automated browser thumbnail clicks, shipment completion and video playback were not evidenced.**

**Unresolved:** 451,810 of 451,812 supplier records were not D1 SEO-approved in the latest count, actual shipping/taxes vary by destination, and the live WooCommerce purchase path is not proven for all products. User-provided footwear example has a factual contradiction: its CJ title says “pointed toe,” whereas CJ specification says “round toe”; editorial review is required. Do not fabricate a size chart to fill gaps.

**Rollback:** Set the product route ID above back to `sasta-global-product-universal-v3`; do not delete v4 until rollback window expires.

**Owner next action:** CJ editorial ops validate title/description/variants/material and origin media; engineering verify gallery clicks and shipping in browser across selected countries.

## 3. Category and local-product SEO, AEO, GEO, SXO — TESTED — LIMITED SCOPE
**Issue:** Thin keyword-heavy legacy category pages, overclaims about worldwide fulfillment, fragmented internal linking.

**Code:** [PR #13](https://github.com/kosama685/sastamilaga/pull/13) (global category metadata and semantic guides), [PR #14](https://github.com/kosama685/sastamilaga/pull/14) (local product links), [PR #15](https://github.com/kosama685/sastamilaga/pull/15) (Cloudflare edge backstop). Build tests passed: 572 category pages with 3,426 contextual category links; 20,165 checked-in static local products scanned, 19,887 qualified for enhancement and 72,339 product-to-product links; 278 excluded. Unconditional shipping claims replaced with destination-conditional language.

**Cloudflare deploy:** `sasta-global-category-seo-edge-v1` `24dd64021c404cb2a21e943418414da0`; route `sastamilaga.com/c/global/*` ID `b33f025a820e442fb14529537143eb7b`. Public earphones and garden-tools category pages both verified HTTP 200 with updated metadata; a rendered buyer guide and contextual category links were retrieved from the live page. GitHub Pages build/deploy passed, but full per-URL live crawl and Core Web Vitals have not been completed.

**Unresolved:** Ranking, AEO/GEO citations and organic indexing are outside engineering's direct control; measure with Search Console and actual page analytics.

**Rollback:** Remove only the category-specific route and retain catch-all `sasta-canonical-sync-v11`; previous GitHub commit can be reverted for build-time transforms.

**Owner next action:** SEO lead perform post-release coverage crawl and update semantically useful category/editorial links from real supplier details.

## 4. Qualified supplier sitemaps — TESTED — LIMITED SCOPE
**Issue:** D1's 451,812 supplier entries include 367,159 numeric IDs formerly rejected by canonical product route and the original qualified sitemap implementation.

**Code:** [PR #16](https://github.com/kosama685/sastamilaga/pull/16) for both ID formats; [PR #17](https://github.com/kosama685/sastamilaga/pull/17) for D1-qualified 5,000-URL sitemap segments. Deploy: `sasta-global-qualified-sitemaps-v1` `598e634e71664d948d0be7e1950e1702`; public `/sitemap-global-qualified.xml` and `/sitemaps/global-qualified/1.xml` return HTTP 200. Eligibility requires explicit D1 approval, factual description length >=100, usable name/image and valid ID; currently **two** supplier records pass the basic SEO gate. It is NOT a Merchant readiness gate.

**Unresolved:** Older legacy `/sitemap-global-products.xml` still needs reconciliation, full sitemap discovery from root and Google authenticated coverage. No bulk index requests.

**Rollback:** Re-upload prior `tools/seo-qualified-sitemaps-worker.mjs` Git commit and its D1 binding if validation identifies an issue. Keep the original worker versions for route rollback.

**Owner next action:** SEO engineering compare all discovery sitemaps and remove stale unreviewed product URL references.

## 5. WooCommerce queue and checkout — BLOCKED
**Issue:** Read-only WordPress Action Scheduler SQL at latest check found **31,929 pending and overdue** actions: 19,678 `woocommerce_deliver_webhook_async`, 11,586 product-attribute update tasks, 454 `smha_import_one`, 163 `gdcs_import` and other small hooks. No bulk execution or deletion was performed.

**Root cause:** Not established from queue counts alone; the webhook target state, deduplication keys, order side effects and runner capacity require controlled examination.

**Evidence:** Public cart route HTTP 200. Older `WooCommerce cart and checkout smoke` GitHub job succeeded with no purchase; this does not prove a real buyer session or payment. No sandbox payment was authorized.

**Unresolved:** Queue retention, webhook delivery idempotency, bounded recovery, cart persistence, country-specific tax and checkout, real Merchant landing-page purchase paths.

**Rollback:** No queue mutation made. Any subsequent controlled batch must snapshot Action Scheduler IDs, log outcomes and have exact per-hook retry/rollback policy.

**Owner next action:** WooCommerce operations + hosting administrator validate a database backup, webhook consumer idempotency and process a small bounded non-customer-effects batch first.

## 6. Cloudflare 30-minute monitoring — TESTED — LIMITED SCOPE
**Issue:** Need safe continuous health observations without mass job execution.

**Current:** `sasta-ops-guard-v1` still runs `*/30 * * * *`, D1 `sasta_ops_guard_runs` health snapshots are persisted. Last queried snapshot `2026-11-14T10:30:28.771Z`: 451,812 records, 2 approved, sitemap 200, example D1 product 200, Merchant feed 200, **cart probe 0** and `healthy=0` with `cart_route_http_0`. Independent external cart inspection returned 200: the internal probe failure alone does **not** prove checkout is down. Investigate Cloudflare-to-origin network restrictions or edge recursion. The guard is **monitoring**, not remediation.

**Rollback:** No monitor modification. Schedule was preserved.

**Owner next action:** Cloudflare engineer differentiate internal network probe errors from externally confirmed checkout failures, and add real conversion/transaction telemetry.

## 7. Google Search Console and Merchant Center — BLOCKED
**Issue:** Google Search Console OAuth returned `invalid_grant`; Rank Math reported no Google refresh token or Search Console permission. Current **authenticated Google indexing totals cannot be supplied** until the owner reconnects and grants consent. No fabricated counts are included.

**Merchant:** WordPress feed at `/wp-content/uploads/smcs/google-feed-x9hdgtc1hvxydimmdmc5aakd.xml` was observed running with 5,339 staged items on this audit. Merchant API auto_sync=false, old sync still `running` with sent=0. The last available error/approval counts are from **2026-10-25** and are not a current approved-item total. Avoid duplicate feed source ingestion and prevent any supplier item with unverified retail price, shipping country or active purchase path from Merchant.

**Rollback:** No Google settings, account tokens, feeds or approvals were mutated by this release.

**Owner next action:** Google account owner reconnect Search Console and Merchant Center; SEO/commerce lead capture authenticated Search Console index counts and Merchant approved totals before declaring this workstream complete.

---

## Release gates
- **Verified deployed:** Canonical D1 page Worker and old product URL redirect; all changes are in GitHub commits with passing CI and live route probes.
- **Only limited tested:** Browser interaction, shipping quotes, media playback, cross-border checkout and Core Web Vitals.
- **Blocked:** Any blanket claim of all 451,812 products indexed, videos playable, Merchant-approved or purchasable. Supplier licensing and data-quality corrections plus legitimate authenticated Google reporting are required.
- **Not started:** Authorized live customer-like sandbox payment, owner-reviewed title/spec discrepancy resolution, full CJ catalog enrichment and a controlled Action Scheduler recovery.

The existence of a Worker, sitemap or Merchant feed is not evidence of approval, Google inclusion, licensed playback or successful checkout.
