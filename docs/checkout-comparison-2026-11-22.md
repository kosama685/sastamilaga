# Static and WordPress checkout comparison

Both options are retained for owner testing. No production checkout, DNS or WordPress settings were changed by this branch.

## Static option

Product buttons display **Add to cart** and **Buy now**. Both local and CJ selections enter the combined persistent cart. `/order/` offers PayPal, card via PayPal, local Pakistan COD, and quotation. The local product bridge reads the real catalogue field names and simple static Product offers, preserves quantity and intercepts the SPA Buy now link before its legacy handler.

For PayPal/card, calculate the USD total first. Local delivery uses configured rates and a recent PKR/USD rate. CJ items require exact variants: the existing public supplier service supplies option pricing and a destination/postal-code freight quote for the whole CJ basket. Missing prices, partial freight responses and unavailable rates keep the quotation path available without inventing a payable total. Destination customs duties are explicitly separate. Supplier price and freight observations do not guarantee stock.

Checkout saves order details to the existing configured Formspree endpoint before opening PayPal `_xclick`. No PayPal keys are required. Cancellation retains the cart and session draft, and the same saved invoice can be resumed without a second Formspree POST. Browser returns never mark payment received. Static prices remain customer-modifiable; staff must independently reconcile items, supplier stock, invoice and actual PayPal settlement before fulfillment. Formspree timeouts retain the reference for reconciliation, not exactly-once server delivery.

## WordPress option

The comparison panel on `/order/` offers **Test WordPress / WooCommerce checkout**, **Review WordPress cart**, and **Open existing WordPress checkout**. The explicit test button transfers mapped local products and exact CJ variants to the native cart, using the destination session, Store API nonce and supplier CSRF token. WordPress recalculates its own totals. Static cart rows are preserved. Successful transfers are checkpointed; uncertain responses require review and are not blindly replayed. A changed selection requires reviewing/emptying the previous test cart.

Native WordPress handoff requires same-origin WordPress REST routes on sastamilaga.com. For a local WordPress installation only, set `SM_CONFIG.wordpressLocalTest = true`. A static local server cannot execute WordPress. Product mapping is `data/wp/product-ids.json`; missing mappings surface an error rather than silently losing items.

An optional installable, email-only gateway is supplied in `integrations/sasta-paypal-link/`. It uses native WooCommerce totals, keeps the native order pending, and needs manual PayPal settlement verification. It requires classic WooCommerce checkout. It has not been installed or activated on the live server.

## Verification and remaining live checks

- 59 Node tests pass across pricing, WordPress handoff, mixed carts, variations, persistence, quote failures and payment-link composition.
- 9 offline PHP gateway checks pass for authoritative native totals, conversion, invoice reuse, pending state, stale FX, unsupported currency and sandbox routing.
- Chrome at 390px passes static product Add/Buy quantity and price, mixed checkout, exact USD/card redirect, cancellation, draft restoration, invoice reuse, missing shipping, failed Formspree intake, stable-reference retry and empty cart. External requests were mocked: no real customer order or payment was created.
- Public supplier `/api/cj/health` returned HTTP 200 with a configured key and allowed store origins. This is not proof that every product can ship.
- Read-only WordPress CLI diagnosis confirmed WooCommerce 11.1.2, published native cart/checkout pages, enabled COD and modern PayPal gateway, and disabled legacy PayPal gateway. The optional email-only gateway is not installed; no production settings were changed.
- Public Woo Store API `/wp-json/wc/store/v1/cart` returned HTTP 200 and a cart JSON object. `/cart/` and `/checkout/` exceeded the 12-second probe timeout; full live native checkout remains unverified.
- Public `/order/` returned HTTP 200 but does not contain this branch's pricing module. This branch is not live.

Before choosing a path, test representative simple/variable local and CJ products against the actual origin, verify Formspree staff receipt, and complete a sandbox payment on the selected flow. PayPal decides guest-card eligibility. No real payment was attempted here.

Run the browser check after starting `node tools/serve-pages-like.mjs . 8797`. Install `puppeteer-core` in a QA directory, set `SM_PUPPETEER_MODULE` to its resolved module path and `CHROME` to a Chrome executable, then run `node tools/checkout-payment.e2e.cjs`. The browser test intercepts every external order/payment request. Its screenshot is written to the OS temp directory or `SM_QA_OUTPUT`.
