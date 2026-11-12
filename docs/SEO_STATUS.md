# SEO programme status (verified live, 2026-11-12)

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
| SM-009 | Breadcrumbs | Mostly done | `BreadcrumbList` verified on product, category, blog post and `/global/p/` pages. Not on `/shop/`, `/live-tv/`, `/travel/` (hub pages). Home needs none. |
| SM-010 | ProductGroup for variants | Not started | No `ProductGroup`/`hasVariant` anywhere. Static `/p/` pages carry no variant data; only `/global/p/` has real variants. |
| SM-011 | Real pagination | Done for categories and blog | `/c/<slug>-N.html` and `/b/page-N.html` are real URLs with self-canonicals; blog index has `rel="next"`. |
| SM-012 | Trust signals | Partly | No fake badges or ratings; no verified reviews yet. |
| SM-013 | Live TV hubs | Partly | Country/category deep links work; no separate indexable hub pages. |
| SM-014 | Editorial operations | Open (people) | Editor + official stream links. |
| SM-015 | Image SEO | Partly | Lazy loading in place; alt-text audit not done. |
| SM-016 | Core Web Vitals | Open | `products-lite.js` (about 20 MB) still loads whole; to split into chunks. |
| SM-017 | Mobile UX | Partly | Needs a device pass after SM-016. |
| SM-018 | Checkout | Partly | Live: cart, checkout, PayPal link, order recording, shipping quotes. Missing: server-side payment verification and supplier order creation (need PayPal REST credentials). |
| SM-019 | FAQ / refresh | Partly | `FAQPage` on category, product, blog pages. |
| SM-020 | Newsletter consent | Not started | Needs a mail provider and a consent log. |
| SM-021 | Wishlist | Partly | Exists; ids to re-check against the live catalogue. |
| SM-022 | Search-intent data | Not started | Needs Search Console reconnection. |
| SM-023 | Internationalisation | Partly | 15 languages machine-translated and labelled; no hreflang for them. 104-language workflow not built. |
| SM-024 | Security | Partly | Keys are in GitHub secrets, none in browser code; old supplier key to be revoked by the owner. |
| SM-025 | SEO automation | Partly | `inventory.yml`, `lighthouse.yml` exist; weekly crawl delta + release gate to add. |
