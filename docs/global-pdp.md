# Global product pages (/global-shop/p/*)

Since 2026-11-21 global supplier (CJ) product pages use the same design and cart as the local product pages.

## Before
Route `sastamilaga.com/global-shop/p/*` pointed at `sasta-global-product-quota-resilient-v5`, the emergency Worker from the
2026-11-14 D1 quota incident: own cut-down header, one photo, no price, no options, no cart, "inquiry-only" WhatsApp button.

## How it works now
| Part | File | What it does |
|---|---|---|
| Edge page | `workers/global-pdp/worker.js` (Worker `sasta-global-pdp-v6`) | Renders the page from the local product-page template (`assets/templates/global-pdp.html`: chrome.js header/footer, static-bundle.css, pdp layout). Name, SKU, category and main photo come from the static lookup buckets (`data/cj/lookup/*.json`), so no D1 and no WordPress call is needed to show the page. Unknown ids 404, no-slug URLs 301 to the canonical slug, `noindex, follow` as before. |
| Live data | `wordpress/mu-plugins/sm-global-pdp-api.php` -> `GET /wp-json/sm/v1/gpdp/<pid>` | Gallery (up to 12 photos), plain-text description, options with the USD price for the shopper's destination (same `Pricing::preview` the cart uses), ordering on/off. 30-minute cache per product and destination. Also keeps the GDCS exchange rates fresh (WP-Cron is disabled on this host; rates had expired on 2026-11-17, which broke every global price). |
| Browser | `assets/js/global-pdp.js`, `assets/css/global-pdp.css` | Gallery with thumbnails, hover zoom and full-screen viewer; option chips; quantity; delivery check with the store's own quote (`POST /wp-json/gdcs/v1/live/freight`, knows the stocking warehouse); **Add to cart / Buy now** through `POST /wp-json/gdcs/v1/live/cart` (GDCS VirtualCheckout: the item goes into the real WooCommerce cart at a server-verified price; Buy now opens `/checkout/`). |
| Layout | `assets/js/pdp-static.js` | Same three-column upgrade as local pages; in global mode (`section.pdp.gpdp`) it keeps the live gallery and quantity and uses prepaid / delivery-by-country wording instead of Pakistan cash-on-delivery text. Local pages are unchanged (`tools/pdp-static-local-regression.mjs`). |

## Release, verification, rollback
- Release: push to `main` runs `.github/workflows/global-pdp.yml`: unit tests, waits for GitHub Pages, deploys the Worker, smoke-tests workers.dev, switches the route (previous script recorded in the log), smoke-tests the live site and switches back automatically if it fails.
- Verify before/after: `node tools/global-pdp.e2e.mjs` (real browser, real store; adds and removes test items; never places an order).
- Rollback: Actions -> "Global product page Worker" -> Run workflow -> action `rollback` (default restores `sasta-global-product-quota-resilient-v5`). WordPress part: delete `wp-content/mu-plugins/sm-global-pdp-api.php` (backups in `~/sm-private/backups/smgp/`).

## Known limits
- `/checkout/` is rendered by WordPress and takes 10-20 s on this host; when it times out the edge shows "Secure checkout is temporarily unavailable" (seen 1 of 4 test runs). Server performance work, not part of this page.
- Product reviews and per-product videos come from the existing site scripts (product-video-universal.js); there is no review data for supplier items.
- Pages stay noindex until product text and prices are reviewed (same policy as before).
