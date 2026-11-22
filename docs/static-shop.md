# Static shop: cart, checkout and payment (restored 22 Nov 2026)

On the owner's instruction the shop works like it did on 20 November. It runs entirely in the browser on the static site: no WooCommerce
cart, no WordPress or Cloudflare Worker in the buying path, and no PayPal API keys.

## What the shopper gets
| Where | Buttons | Result |
|---|---|---|
| Local product page (`/p/*.html`) | **Add to cart**, **Buy now** | `sm_cart` (SKU + quantity). Buy now opens checkout |
| Main page product view, cards, Quick view | Add to cart, Buy now | `sm_cart` (handled by `app.js`) |
| Product-video **Quick Buy** dialog | Add to cart, Buy now | `sm_cart` with the chosen video option's SKU |
| CJ product page (`/global-shop/p/…`) | **Add to cart**, **Buy now** | `sm_gcart`: exact supplier option, price, quantity and cheapest carrier |
| Global shop view (`#/global/p/…`) | Add to cart, Buy now | `sm_gcart` (same format) |
| Homepage CJ cards | Add to cart, Buy now (option dialog) | `sm_gcart` |

**Cart:** `https://sastamilaga.com/#/cart` shows local and CJ items with quantity controls and Remove.

**Checkout:** `https://sastamilaga.com/#/checkout`.
- Payment methods: cash on delivery, EasyPaisa / JazzCash, bank transfer, and PayPal or debit / credit card.
- Cash on delivery and EasyPaisa / JazzCash are offered only for Pakistan local-only carts.

On `sastamilaga.com` the paths `/cart/` and `/checkout/` belong to WordPress. So the shop keeps the `#/` addresses, and three things send shoppers there:
- links to `/cart/`, `/checkout/`, `/request-cart/` and `/order/` (handled by `woo-bridge.js`);
- WordPress itself, which forwards its empty `/cart/` and `/checkout/` (`wordpress/mu-plugins/sm-static-cart-bridge.php`, live);
- PayPal's cancel link.

WooCommerce payment links (`/checkout/order-pay/…`) are untouched.

## Payment
1. The order is first posted to Formspree (`SM_CONFIG.orderEndpoint`, `https://formspree.io/f/xwvzzjdl`). It carries:
   - local items in PKR, plus delivery;
   - CJ items in USD, with option and carrier;
   - totals and the payment method.
2. **PayPal / card:** the browser opens a PayPal Payments Standard link with no keys and no SDK:
   `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=osamakhancv@gmail.com&amount=…&currency_code=USD&invoice=SM-…&item_name=…&return=https://sastamilaga.com/thank-you/&cancel_return=https://sastamilaga.com/#/cart&no_shipping=1&no_note=1&charset=utf-8&rm=1`.
   - "Pay by debit or credit card" adds `landing_page=Billing&solution_type=Sole`. That is PayPal's guest card form, the same as `kosama685.github.io/paypal-link-generator-debit-card`.
   - The amount is local PKR + delivery + CJ USD + each CJ carrier, converted at today's rate (open.er-api.com).
   - PayPal cannot charge PKR, so the amount is in the visitor's PayPal-supported currency, or USD.
3. **Check every PayPal payment against the Formspree order before dispatch.** The link sets the amount, but PayPal does not report back to the site.

## Files
| File | Role |
|---|---|
| `assets/js/woo-bridge.js` | Static store bridge (`window.SMStore`): local and CJ carts, Add to cart / Buy now / Quick Buy clicks, header badge and links. The name is historical: `chrome.js` and every page load it |
| `app.js` | Cart and checkout pages, Formspree, PayPal link (`paypalLink`), `#/cart` and `#/checkout` kept on the live domain (`WP_OWNED_PATHS`) |
| `assets/js/global-pdp.js` | CJ product page: options (WordPress, else CJ Worker after 6 s), delivery check (WordPress, else CJ Worker after 7 s), Add to cart / Buy now |
| `assets/js/global.js` | Global shop view: options (CJ Worker, else WordPress), Add to cart / Buy now |
| `assets/js/cj-home-rails.js` | Homepage CJ cards: option dialog, Add to cart / Buy now |
| `wordpress/mu-plugins/sm-static-cart-bridge.php` | WordPress `/cart/` and `/checkout/` forward to the static shop when the WooCommerce cart is empty |

## Tests
- `node tools/static-shop.e2e.mjs`: Playwright, live pages with the local scripts. **53/53** on 22 Nov 2026 (after rebasing on main 65dc58b). Set `SM_BRIDGE_TARGET=pages` while WordPress still forwards to the request-cart pages. It covers:
  - local Add to cart (twice) and Buy now; `shp-` SKUs; the cart page (+, −, Remove, reload);
  - CJ page option and shipping, global shop view, homepage CJ cards, Quick Buy;
  - PayPal link, card link, cash on delivery, Formspree down (cart and form kept);
  - WordPress bridge, header link, phone layout, no JavaScript errors;
  - a basket saved in the request cart moves into this cart once.
- `node tools/product-pages.e2e.mjs`: CJ options and delivery when WordPress is down or slow, `config.js`, `.buy-panel{top:0}`. **22/22**.
- `node tools/site-audit.mjs 6`: sampled SEO and broken-link audit (status, canonical, title, description, H1, internal links).
- One real order was sent through the real checkout to Formspree on 22 Nov 2026 (bank transfer, marked "TEST ORDER (automated check) – please ignore"). Formspree answered 200 and the thank-you page showed.

## Known issues (not part of this change)
- `/faq/` answers **503**. It is rendered by the CJ storefront edge Worker (`edge/cj-storefront.mjs`, renderer `cj-ssr-v1`), which needs a WordPress data call and fails while WordPress is slow. Fix: serve the static `faq/index.html` when that call fails, or take `/faq/` off that Worker's routes.
- `sitemap-global-qualified.xml` is listed in the sitemap index but has 0 URLs.
- The live homepage has two H1 headings ("Shopping for Pakistan…" and "The world. Live on your screen.").
- The request-cart pages from 22 Nov (`/request-cart/`, `/order/`) still exist. Links to them now open the static cart and checkout.

## Two static checkouts existed on 22 Nov 2026
Another session's design was merged to `main` at 20:12 (PRs #135 and #136). It uses the request cart (`sm_order_cart_v1`), `/request-cart/` and `/order/`, with checkout-pricing.js and paypal-payment-link.js. This release keeps those pages and files and their tests, but the product buttons and the header cart now use the 20 November cart and checkout above.

**Baskets are not lost.** When a page loads, `woo-bridge.js` moves request-cart rows into this cart once. A row moves only when it is exact:
- a local SKU with no option attributes (app.js prices it from the catalogue);
- a CJ option with its USD price.

Other rows (no price, or local options) stay in `sm_order_cart_v1`, untouched.

**After this release is deployed**, point WordPress at it:
- run `wp option update sm_static_cart_target hash` (the mu-plugin is already live; it defaults to `pages`);
- check: `/cart/` answers 302 to `/#/cart` and `/checkout/` answers 302 to `/#/checkout`.

To go back to the request cart, run `wp option update sm_static_cart_target pages` and revert this release.