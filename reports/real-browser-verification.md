# Real browser verification of production (2026-11-20)

Method: headless Chrome (puppeteer-core) against https://sastamilaga.com, desktop 1280 px and mobile 390 px, cache-busted, recording status, final URL, canonical, robots, H1 count, footer "Shipping by country" link, horizontal overflow, JavaScript errors and failed/4xx requests. 17 routes x 2 viewports = 34 loads.

## Result summary
- All 12 landing URLs: HTTP 200, no redirect, canonical equals the URL, exactly one H1, no horizontal overflow, 0 JavaScript errors, 0 failed requests, both viewports.
- `/shipping-to/` and the five English market pages still carry the old copy ("prepaid checkout"); none has the redesigned cards. Cause: the fix is not in `main` (see `phase-1-live-verification.md`).
- Footer link "Shipping by country": present on the landing pages and `/global-shop/` target; **absent on `/faq/`, `/shop/`, `/cart/`, `/checkout/` (which ends on `/cart/`)**. The hub measured 0 at desktop and 1 at mobile in this run; I treat that single reading as unstable (late-rendered footer) and have not re-measured it.

## Issue register
| URL | Expected | Actual | Root cause | Fix state |
|---|---|---|---|---|
| `/shipping-to/` country cards | open the landing page | click does nothing; toast "This static cart has not been synchronized with WooCommerce" | An inline guard script (id `sm-woo-cart-notice`, not in the repository, not on GitHub Pages, not on `/cart/` or `/faq/`: injected on the static pages the Worker serves) swallows clicks on any link or button whose text matches `add to cart / buy now / place order / order now / checkout / pay now / paypal / cash on delivery`. Card text said "prepaid checkout" and "Cash on delivery". Reproduced in Chrome. | Fixed on branch `completion-2026-11-20` (9794997, 0edad7d) with a regression test. **Not live.** |
| every landing page and the hub | the "How to order" link works | the link text in the shared chrome includes "cash on delivery" and is also swallowed | same guard; text comes from shared chrome | **PENDING OWNER ACTION**: needs a reword in the protected chrome partial |
| `/faq/`, `/shop/` | footer shows "Shipping by country" | link absent | footer is built by `edge/cj-render.mjs` in the Worker | Fixed on branch (6333310). **Not live**: the storefront Worker deploys only through the manual workflow. |
| `/cart/` | footer link present | absent | WordPress theme footer, not in this repository | BLOCKED: needs WordPress theme access |
| `/checkout/` | loads checkout | ends on `/cart/` | WooCommerce redirects an empty cart; header `x-redirect-by: WordPress` | Not a defect with an empty cart. A real checkout cannot be tested without a session holding an item and an authorized sandbox gateway. |
| `/shop/` with an unknown query parameter (`?v=`, `?cb=`, `?z=`) | page | HTTP 400 "Unsupported CJ filter: z" (`invalid_input`) | The Worker validates query parameters strictly and rejects unknown ones; known tracking parameters (`utm_*`, `gclid`, `fbclid`) pass. This is by design, but it means any new campaign or cache-buster parameter returns a 400 page. | Documented. Suggested improvement (not applied): ignore unknown parameters instead of returning 400. |
| `/global-shop/` | opens the shop | one 301 to `/c/global/index.html`, then 200 | Worker canonical redirect; no loop | No defect. |

## Not tested
Search, filters, WhatsApp hand-off, shipping quotes, cart add/remove and checkout on these 17 routes in this sweep. The shipping quote was tested earlier on the landing pages (36 variants loaded, correct country passed). Cart and checkout were not exercised; no authorized sandbox payment method is available to me.
