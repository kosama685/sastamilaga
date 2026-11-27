# SEO programme status (verified 2026-11-12, updated after the second work session)

Source: `seo-issues-sasta/10_execution_backlog_25.csv` (every task there is marked "Not started" in the package itself).
"Verified" means checked against the live site on the date above. Nothing here is invented: where a task needs real data or a person, it says so.

| ID | Task | Status | Evidence / what is left |
|---|---|---|---|
| SM-001 | Indexability | Mostly done | `?add-to-cart=` / `sm_buy_now` URLs return 200 with `<meta robots="noindex, follow">` and canonical `/shop/`; robots.txt does not block them (it only blocks `/cart/`, `/checkout/`, `/my-account/`). The Search Console "blocked by robots.txt" rows were last crawled 25-26 Oct, so they need "Validate fix". 468 URLs answer 403 to non-Google visitors (Cloudflare challenge; Googlebot passes) — Cloudflare dashboard setting, not in this repo. |
| SM-002 | Source parity | Done | Static site served on the canonical domain; Pages deploy working again 2026-11-12. |
| SM-003 | 3,142 products without a photo | Open (data) | WordPress data; live WordPress is not edited. Needs export, supplier photo match, human approval. |
| SM-004 | No offer without verified price/stock | To verify | Product pages emit `Offer`; check that products with no price (20) omit it. |
| SM-005 | Supplier enrichment in batches | Partly | Worker serves 451,812 `/global/p/` pages; no scheduled batch job that validates variants/descriptions. |
| SM-006 | Live TV rights | Open (people) | 11,973 channels listed; rights owner sign-off required. |
| SM-007 | Category descriptions | Open (content) | Needs real specifications. |
| SM-008 | Unique metadata | Open (content) | Needs draft + human check. |
| SM-009 | Breadcrumbs | Done in code, to verify after deploy | `BreadcrumbList` verified on product, category, blog post and `/global/p/` pages; added to the seven hub pages (shop, live-tv, travel, global-shop, visa, videos, contact). Home needs none. |
| SM-010 | ProductGroup for variants | Deliberately not built server-side | Real variants exist only at view time from the CJ API (about 1,000 calls a day per endpoint); rendering them for 451,812 pages would exhaust the quota, and the page snapshot holds no variant data. Prices are estimates, so `offers` would be omitted anyway. Option: add `ProductGroup` client-side for pages a visitor opens (Google renders JavaScript), only from variants that carry a real price. |
| SM-011 | Real pagination | Done | `/c/<slug>-N.html` and `/b/page-N.html` are real URLs with self-canonicals; blog index has `rel="next"`. The blog index canonical is now `/b/` everywhere (it was `/b/index.html` while `sitemap-pages.xml` listed `/b/`; found by the weekly crawl). |
| SM-012 | Trust signals | Partly | No fake badges or ratings; no verified reviews yet. |
| SM-013 | Live TV hubs | Partly | Country/category deep links work; no separate indexable hub pages. |
| SM-014 | Editorial operations | Open (people) | Editor + official stream links. |
| SM-015 | Image SEO | Partly | Lazy loading in place; alt-text audit not done. |
| SM-016 | Core Web Vitals | Open, measured | Live homepage, mobile Lighthouse: score 32, LCP 6.7 s, TBT 4.7 s. The LCP element is hero text with a 6.1 s render delay: `products-lite.js` (19 MB, 3.2 MB gzipped, 20,165 products) is evaluated and then `app.js` builds the product maps before first paint. Only the app-shell pages (home, shop, live-tv) load it; product, category, blog and `/global/p/` pages are 8-135 KB with no app JavaScript. Tried and rejected: shipping the data as a `JSON.parse` string (no gain, file grew to 22 MB). Real fix: render the home from a small chunk and build the full catalogue lazily; needs a refactor of the data layer in `app.js`. |
| SM-017 | Mobile UX | Partly | Needs a device pass after SM-016. |
| SM-018 | Checkout | Partly | Live: cart, checkout, PayPal link, order recording, shipping quotes. Missing: server-side payment verification and supplier order creation (need PayPal REST credentials). |
| SM-019 | FAQ / refresh | Partly | `FAQPage` on category, product, blog pages. |
| SM-020 | Newsletter consent | Not started | Needs a mail provider and a consent log. |
| SM-021 | Wishlist | Partly | Exists; ids to re-check against the live catalogue. |
| SM-022 | Search-intent data | Not started | Needs Search Console reconnection. |
| SM-023 | Internationalisation | Engineering done, review open | `.github/workflows/translate-i18n.yml` (weekly, Cloudflare Workers AI `@cf/meta/m2m100-1.2b`, 75 UI strings, 98 languages besides English and Urdu; the model covers about 100 languages, not 104). Only missing strings are translated; every file is marked machine-translated and unreviewed; no hreflang, pages or sitemap entries. Output quality is uneven (it rendered "Add to cart" in Urdu as "add into cartoon"), so human review is required before any language is called reviewed. |
| SM-024 | Security | Partly | Keys are in GitHub secrets, none in browser code; old supplier key to be revoked by the owner. |
| SM-025 | SEO automation | Done in code | `.github/workflows/weekly-crawl.yml` (Tuesdays): reads the sitemaps, checks every small-sitemap URL and a rotating sample of the large ones (about 500 URLs, 2 minutes), writes `docs/crawl/DELTA.md` and `latest.json`, fails the run when a sitemap URL is broken, redirecting, noindex or not self-canonical. |
