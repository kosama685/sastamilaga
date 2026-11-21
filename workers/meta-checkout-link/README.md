# Meta Shop Checkout URL — review / approval only

**Catalog:** `994628306405792`  
**Candidate URL for Meta Commerce Manager:** `https://sastamilaga.com/checkout-link/`  
**Status:** NOT deployed. DO NOT submit to Meta before approval and successful production verification.

## Verified existing platform

- WooCommerce 11.1.2 (active) already implements `/checkout-link/`: accepts comma-separated `products=ID:quantity`, optional `coupon=CODE`, sets a WooCommerce cart session and redirects to checkout. Official documentation: https://github.com/woocommerce/woocommerce/blob/trunk/docs/best-practices/urls-and-routing/checkout-urls.md
- Meta for WooCommerce 3.7.8 is installed; its newer 3.7.9 release identifies native `/checkout-link/` as the supported Meta checkout. No custom PHP product/cart creation is needed.
- Sasta Milaga routes `sastamilaga.com/*` through Cloudflare `sasta-canonical-sync-v11`. Its active public routing treats `/checkout-link/` as a static/public request and falls back to the GitHub mirror, so Meta checkout is NOT ready. This isolated Worker passes only `/checkout-link/` to the existing `sasta-wp-cron-autopilot` WooCommerce origin, preserving session cookies, coupons, redirect and attribution. No static fallback.
- The upstream `sasta-wp-cron-autopilot` public cache is restricted to home/product/shop/video pages and excludes non-language query strings. Thus checkout requests are not cached there.

## Sample product and current discrepancy

- Meta sample: **Sabawoon S134 60W Original Car Charger Adapter**
- WooCommerce product ID **10030**, SKU `hhc-3759842`, published/in stock (read-only Woo lookup on 2026-11-21).
- Live WooCommerce product price reported **PKR 857**, while generated public static product page shows **PKR 1,285**. Resolve product/feed/cart pricing before Meta submission; do not change prices without owner approval.
- The catalog's **actual content ID for this product is not verified**: it could be a Woo ID, SKU, or feed-specific identifier. Do not assume that the catalog sends `10030`.
- The WooCommerce bridge's read-only SKU map connects `hhc-3759842` to Woo ID `10030`, but this does not prove which identifier Meta sends.
- A single item may be represented as `products=10030:2` **only if** Meta's product content ID is `10030`. Native WooCommerce also supports a nonnumeric SKU such as `products=hhc-3759842:2`, but Meta must send a matching value.

## Steps requiring explicit owner authorization

1. Connect official Meta Ads MCP at `https://mcp.facebook.com/ads` via a supported client/connector with Meta OAuth; do not paste tokens. This ChatGPT session does not currently have that server as a connected tool. Confirm catalog `994628306405792` and exact `content_id` of the Sabawoon item.
2. Reconcile which catalog items are purchasable in WooCommerce (including all variations), the source retail prices, stock, shipping eligibility, permitted markets and usable coupons. Do not publish or modify catalog data until approved.
3. Review this branch and run locally: `node --test workers/meta-checkout-link/worker.test.mjs`.
4. After explicit deployment approval, deploy `sasta-meta-checkout-link` with service binding `PRIMARY -> sasta-wp-cron-autopilot`, and attach **only** `sastamilaga.com/checkout-link*` to it in Cloudflare. Do not edit the existing production `sasta-canonical-sync-v11` Worker. Confirm no route collision and document the previous route ownership. Do not enable static fallback for checkout.
5. With permission to perform a **cart-only live test**, use a clean guest browser session for Meta's exact full URL. Verify `products=<actual-catalog-ID>:2`, optional coupon, Woo checkout cart lines, unit price, totals, persisted cookies, shipping and payment availability. **Stop before placing an order or taking payment.**
6. Run Meta Commerce Manager's preview/validation in catalog `994628306405792`, inspect its result, then ask again for permission before saving/enabling Meta checkout.
7. Rollback: remove the more-specific Cloudflare `/checkout-link*` route; the original `sastamilaga.com/*` remains unaffected.

## Safety and test boundaries

The Worker forwards Meta query values to WooCommerce's **native session and checkout** after size/quantity validation. It does not create orders or take payments, and does not handle payment credentials. It rejects missing/invalid product input and fails closed on upstream errors, without displaying an empty static cart. Tests mock the Woo origin and **do not establish actual cart contents, prices, or Meta acceptance**. Existing WooCommerce product pricing, order data, stock, PayPal and other gateway settings are not touched.
