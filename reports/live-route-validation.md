# Live route validation (2026-11-20)

Method: read-only HTTP requests (`curl -D`) against https://sastamilaga.com, headers inspected to identify which system answers each route. Statuses below are observed, not inferred.

| Route | HTTP | Served by (evidence) | "Shipping by country" footer link | State |
|---|---|---|---|---|
| `/` , `/blog/`, product/category pages, 12 landing pages | 200 | static chrome (committed HTML / `partials/chrome*.json`) | present | COMPLETE (browser-verified earlier, desktop + mobile) |
| `/shipping/`, `/about/`, `/privacy/`, `/travel/`, `/ur/faq/` | 200 | GitHub static recovery (`x-sasta-recovery: github-readonly`) | present | COMPLETE |
| `/faq/`, `/shop/`, product pages | 200 | Cloudflare Worker `edge/cj-storefront.mjs` (`X-Sasta-Renderer: cj-ssr-v1`); footer built in `edge/cj-render.mjs` | **missing live**; fixed on branch `completion-2026-11-20` (6333310) | OWNER ACTION: Worker deploys only through manual workflow `cj-storefront-migration.yml` (preview, then production). Not run. |
| `/cart/` | 200 | WordPress / WooCommerce (`x-powered-by: PHP`, LiteSpeed, `Cache-Control: private, no-store`) | **missing** | BLOCKED: footer belongs to the WordPress theme, not in this repo. Needs theme/footer access. |
| `/checkout/` | 302 -> `/cart/` | WordPress (`x-redirect-by: WordPress`) | n/a (redirects) | NOT A DEFECT with an empty cart: WooCommerce sends an empty-cart checkout to the cart. Redirect preserved. A real checkout needs a session with items (see checkout report). |
| `/global-shop/` | 301 -> `/c/global/index.html` -> 200 | Worker (`X-Sasta-SEO: canonical-url-v1` redirect), then static recovery | present on target | NO LOOP. The earlier "loop" came from the test client following a cache-busting query parameter. One hop, ends in 200. Note: the redirect target is an `index.html` URL; a cleaner canonical target is a possible later improvement, not changed. |
| `/shop/` | 200 | Worker | missing live (same fix as `/faq/`) | The earlier 400 reproduces only with the query parameter `cb`. `?utm_source`, `?gclid`, `?fbclid`, `?q`, `?page=1` all return 200. Treated as a test artifact; cause inside the Worker's parameter handling not traced further. |

## Other findings
- Response headers `x-sasta-checkout: disabled-during-origin-outage` and `x-sasta-recovery-cause: github_static_primary` appear on static pages: the Worker is in a "GitHub static primary" mode. Whether this is permanent or an outage leftover is unknown and affects the checkout phase.
- `tools/cj-storefront.test.mjs` fails to load (`edge/cj-assets.mjs` is not in the repository). Pre-existing, not caused by the footer change. The footer edit was only syntax-checked (`node --check`).

## Not verified
- No regression test exists yet for footer-on-every-route; routes served by WordPress and the Worker cannot be tested from the static repo alone (needs a live-probe test, planned).
