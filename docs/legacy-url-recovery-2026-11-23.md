# Legacy URL recovery — 23 November 2026

839 root category and article addresses now have static recovery documents pointing directly to verified existing canonical content. This covers every reported root HTML content URL. GitHub Pages serves these documents with HTTP 200, an immediate HTML refresh, a canonical link and a visible fallback link. JavaScript preserves query parameters and fragments. They are HTML redirects, not HTTP 301 redirects. No Cloudflare route or quota dependency was introduced.

Search suggestions now use absolute canonical category and product URLs and `/search/?q=…`. Supplier suggestions use `/global-shop/p/<pid>/<slug>/` rather than legacy hash or `/global/p/` paths.

The manifest is generated from actual category/article files. Existing root pages take priority. Unknown paths and administration probes such as `/webmail` and `/cpanel` retain their real status. Aliases stay outside sitemaps; canonical content remains the indexed destination.

Validation: `node --test tools/legacy-root-routes.test.mjs tools/search-stacking.test.mjs`; syntax check of `assets/js/search-suggest.js`. Production verification is recorded separately after deployment. This does not certify external supplier availability, checkout infrastructure, every historical URL, or every URL on the internet.


Production evidence:
- 839 aliases plus 839 canonical destinations: 1,678 HTTP checks, all 200, zero failures (`reports/legacy-live-verification-2026-11-23.json`).
- Source scan: 23,217 HTML files, 80,094 distinct internal paths, zero missing static references. Dynamic APIs, supplier responses and private checkout are outside that source-only check.
- All 20,165 locally generated product suggestion URLs matched existing product files.
- Browser: legacy Wool & Blend and Bicycle Lights links reached the correct category; smart-watch search displayed results; selecting a result opened the exact named product with HTTP 200 and no JavaScript errors.
- Removed only the obsolete `sastamilaga.com/search*` supplier-SSR route after verifying the GitHub origin. Other routes were preserved.
- Added `sasta-product-recovery-v1` only on `/product/*`, delegating healthy responses and legacy WordPress redirects to the existing renderer. On 5xx for a valid supplier ID, it renders the exact existing snapshot product shell, with canonical URL, noindex, no invented stock or payable total. Both numeric and UUID references passed live deployment checks. Unknown products retain genuine failure statuses. The deployment records a route backup and restores it if smoke tests fail.
- Existing Worker deployment CI preserves this recovery route. Independent recovery changes no longer trigger shipping/payment redeployments.

Legacy root recovery uses HTTP 200 HTML redirects with immediate refresh, not server-side 301 responses. Search and product recovery do not prove that live supplier options, payment, freight or fulfillment are operational. These must still be confirmed before accepting an order.
