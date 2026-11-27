# Cart bridge: findings and purchase-flow design (2026-11-20)

## Status (owner chose option B, authorized editing woo-bridge.js and a Pakistan-session test)
| Step | State | Evidence |
|---|---|---|
| 1. Pakistan-session purchasability | DONE | `tools/probe-woo-purchasable.mjs`: PK session 20/20 mapped products accepted (2 variable, with variation); SA session 0/20 (18 not purchasable by policy, 2 variations hidden). `data/cart/purchasable-probe-*.json`. No order created. |
| 2. `SMWoo.add` sends variations; buttons use the real WooCommerce cart | DONE | `assets/js/woo-bridge.js`: `run()` calls `W.add(sku, qty, pageVariation())`; success opens `/cart/` or `/checkout/`; the static `/#/checkout` and the localStorage cart are no longer used by these buttons; header badge reads the WooCommerce count. |
| 3. Non-PK sessions and unmapped items | DONE | `W.decide()`: "delivered in Pakistan only" + "See items that ship to you" (`/global-shop/`) + WhatsApp; unmapped and out-of-stock go to WhatsApp; labels are guard-safe (option B). |
| 4. Tests | DONE | `tools/woo-bridge-flow.test.mjs` 5/5 (with the 5 existing cart tests: 10/10). `tools/cart-bridge.e2e.mjs` against live WooCommerce with the local file swapped in: 11/11 (PK add lands in the real cart, Rs 742, `/cart/` shows it, item removed; SA gets the honest refusal; the guard message never appears). |
| 5. Guard change | NOT NEEDED for these buttons | woo-bridge handles the click at window capture before the guard. New buttons elsewhere must go through `data-add-cart`. |
| 6. Sandbox checkout order | PENDING OWNER | needs an authorized test gateway |

Not covered yet: "Buy now" was unit-tested (goes to `/checkout/`) but not exercised live; variable products on static pages only work where the page has WooCommerce `attribute_*` selects (otherwise the shopper gets "Please choose an option first"); the separate static checkout in `checkout.js`/`app.js` still exists for other legacy callers.

Branch `cart-bridge`, from `main` `f257840`. Design only: no cart, checkout, Worker or WordPress code is changed by this document.

## 1. What happens today (observed)

There are **two carts**, and they never meet:

| Step | What runs | Where the item goes |
|---|---|---|
| Shopper presses "Add to cart" on a static product page or card | `assets/js/woo-bridge.js` window-capture listener (runs before the guard) calls `SMWoo.localAdd()` | **browser `localStorage` (`sm_cart`)**, not WooCommerce |
| Toast says "Added to cart. View cart" | link goes to `/cart/` | WordPress `/cart/` reads the **WooCommerce** session, which is empty |
| "Buy now" | navigates to `/#/checkout` (static checkout) | static checkout form |
| Shopper submits the static checkout | edge guard (`BLOCKER` in the deployed Worker `sasta-canonical-sync-v11`; source not in this repository, only in `docs/inventory-worker-probes.txt`) cancels the submit | toast: "This static cart has not been synchronized with WooCommerce. No order was submitted." |

The guard also cancels clicks on any link or button whose text matches `add to cart / buy now / place order / order now / checkout / pay now / paypal / cash on delivery` (except links to `/cart/`, `/checkout/`, `/my-account/`). Live pages carry the header `x-sasta-checkout: disabled-during-origin-outage`: the static checkout was deliberately switched off, and the guard is the switch.

So the message is not a sync bug in itself: it is the safety net catching a static checkout that is turned off. The real defect is that "Add to cart" puts items in a cart that cannot be paid for.

## 2. Why the static cart exists: WooCommerce refuses the items

`woo-bridge.js` already contains a working Store API client (`SMWoo.add`). Its own comment says it was abandoned because "the WooCommerce cart accepted none of 15 sampled products". Re-tested today, anonymous session, no order created:

| SKU | WP id | Store API `cart/add-item` result |
|---|---|---|
| 1199697 | 60721 | 400 `woocommerce_rest_product_not_purchasable` |
| 3767669 | 63619 | 400 `woocommerce_rest_missing_attributes` (variable product, no variation sent) |
| hhc-2434214 | 36824 | 400 `woocommerce_rest_product_not_purchasable` |

The test session was geolocated outside Pakistan (Saudi Arabia). Known store rules explain both errors:
- WooCommerce selling locations are **Pakistan only**, and the GDCS plugin hides Pakistan-only products for every non-PK country. A non-PK session therefore gets "not purchasable". **Not yet verified from a Pakistan session** (needs the Worker-signed country header or a PK visitor).
- `SMWoo.add()` sends only `{id, quantity}`; variable products need the chosen variation attributes, so every variable product fails.

`data/wp/product-ids.json` maps 9,588 SKUs to WordPress ids; unmapped items (including CJ global items) cannot use the WooCommerce cart at all.

## 3. Target purchase flow

| Product type | Flow | Button label (guard-safe) | Cart |
|---|---|---|---|
| Local product, Pakistan session, simple | Store API `add-item` with id + quantity, then real `/cart/` | "Add to bag" until the guard is changed (see 4) | WooCommerce |
| Local product, Pakistan session, variable | Store API `add-item` with `variation: [{attribute, value}]` from the page's option picker | same | WooCommerce |
| Local product, non-PK session | No cart. Explain "Local products deliver in Pakistan only" and link to the global collection | "See items that ship to you" | none |
| CJ global item | No cart. Existing landing-page quote panel: product link, option, quantity, country, live CJ quote, confirmations, then WhatsApp with the full summary | "Send my order details on WhatsApp" (already guard-safe and live) | none |
| Unmapped or out of stock | Disabled control plus WhatsApp enquiry | "Ask about this item" | none |

Rules: nothing is priced or stored in the browser for a purchase; WooCommerce prices the cart; an order exists only after WooCommerce checkout; the static `/#/checkout` path and the `sm_cart` localStorage cart are retired once the WooCommerce path works.

## 4. The guard must change with it

Any new button whose text says "Add to cart", "Buy now" or "Checkout" on a Worker-served static page is swallowed by the guard unless `woo-bridge.js` catches it first (it does, at window capture, but only for `[data-add-cart]` cards and `#/product/` links). Two options:

- **A (recommended):** change the guard in the Worker so it only blocks the static checkout form submit and `/#/checkout`, not words in link text. Requires the Worker source (`sasta-canonical-sync-v11`), which is **not in this repository**, and a Cloudflare deploy. Owner action.
- **B (no Worker change):** keep guard-safe labels and route every purchase control through `data-add-cart` so the existing window-capture listener handles it. Works today, but labels like "Add to bag" are a compromise.

## 5. Implementation steps (each on this branch, each tested)

1. Verify purchasability from a Pakistan session for 20 sampled mapped SKUs (simple and variable) through the store's own test path; record results. Owner input needed if the signed-country test path is not allowed.
2. Extend `SMWoo.add(sku, qty, variation)` to pass variation attributes; switch `run()` from `localAdd` to `add` when `SMWoo.active` and the session is PK; keep `localAdd` only as a fallback that leads to WhatsApp, never to `/#/checkout`.
3. Non-PK sessions and unmapped items: render the WhatsApp/global path instead of a cart control.
4. Tests: unit tests for the decision table; a no-purchase smoke (existing `tools/smoke-woo-cart-checkout.sh` workflow) extended to add one PK simple and one PK variable product and read `/cart/` back.
5. Guard change (option A) by the owner, or option B labels.
6. Sandbox checkout test once the owner provides an authorized test gateway.

Note: `assets/js/woo-bridge.js` was listed as a protected cart file in earlier instructions. Steps 2 and 3 edit it, so they need the owner's explicit go-ahead.

## 6. Open decisions for the owner
1. Authorize editing `assets/js/woo-bridge.js` (steps 2 and 3).
2. Option A (Worker guard change, needs Worker source and Cloudflare) or option B (guard-safe labels).
3. Allow a Pakistan-session purchasability test (step 1).
4. Provide or approve a sandbox payment gateway for the end-to-end order test.
