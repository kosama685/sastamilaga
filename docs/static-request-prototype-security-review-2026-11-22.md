# Sasta Milaga — safe static request prototype implementation

Date: 2026-11-22 · Repository: `kosama685/sastamilaga`  
Source brief: user-provided pasted `نص ملصق.txt` (full standalone JavaScript, `sm-static-demo.html`, example checkout and client-side rewards/login).

## Executive status

**Implemented:** an isolated, professional, responsive **static request-cart DEMONSTRATION** for local Pakistan and CJ option cases, with a dedicated GitHub regression suite. Its data is non-commercial and contains fictitious demonstration products.

**Not implemented or implied:** a production payment processor, authenticated accounts, supplier approval, paid orders, operational inventory, COD order acceptance, confirmed Formspree receipt, or replacement for WooCommerce / WordPress / Cloudflare routing.

This prototype is deliberately on `feature/static-request-preview-hardened`, not loaded by live product pages. Never merge or link it as a real checkout without the release gates below.

## Source-file engineering audit

The attached code contains useful UI ideas and robust concepts such as exact option selection, local cart persistence, separate Pakistan and CJ currency totals, request-only Formspree status, and safeguards against duplicate clicks.

It also has defects that prevent an unconditional production deployment:

1. **JavaScript syntax failure:** `if (!window.SM allow_DEMO_REWARD_LOG) ...` is not valid JavaScript. A malformed feature flag would break parsing of the entire commerce bundle. This code was not copied to production.
2. **Insecure authentication:** `sm_static_users_v3`, demo SHA-256 salted password hashes, and `sm_static_session_v3` stored entirely in local/session storage cannot provide real customer authentication or cross-device orders. Password hash verification must be done securely on a provider/backend.
3. **Untrusted loyalty and commission:** a buyer can edit localStorage, browser-side balances and referral events. No redeemable points or commissions should ever be issued on these values. Owner approval and backend order ledger are prerequisites.
4. **False cart authority:** a localStorage cart confirms only that the browser wrote data, **not** that price, stock, variation or shipping is correct. `Quick Buy` to a Formspree order-request page is not payment checkout.
5. **Fictitious source SKUs:** the snippet's local shirt and CJ gadget are examples, not imported, qualified, verified items. It is unsafe to submit these to the live receiver as real orders.
6. **Competing cart handlers:** simply replacing `woo-bridge.js` with a `window.SMWoo` alias while leaving other capture handlers, global PDP scripts or checkout routes in place risks duplicate additions and invalid SKU mappings.
7. **Formspree limitations:** a successful HTTP response acknowledges receipt by a form receiver, not a durable database transaction, operator acceptance or paid order. Server-side idempotency, fulfilment and reconciliation are needed for confirmed orders.
8. **Hosting restrictions:** GitHub Pages is not a suitable primary platform for secure business checkout and account backends. Static page serving alone cannot enforce payment capture, stock locking or order authorization.

## Implemented prototype

| File | Purpose |
| --- | --- |
| `staging/static-request/index.html` | Responsive, accessible, noindex staff prototype; variation/quantity selectors for fictitious Pakistan and CJ demo records |
| `staging/static-request/preview.js` | Offline add/quick-request handler, exact variation merge, bounded qty, explicit unpriced supplier status |
| `tools/static-request-preview.test.mjs` | Automated test of variations, repeated additions, persistence, invalid inputs, untouched existing carts and absence of network/payment code |
| `.github/workflows/static-request-preview.yml` | Run syntax, end-to-end mocked UI behavior and separation security contracts |

### Persistence and isolation

This demo writes only the session-scoped key `sm_preview_cart_v1`. It **does not** touch:

- `sm_cart` (local)
- `sm_gcart` (CJ)
- `sm_order_cart_v1` (existing Formspree request cart)
- WordPress cookies or WooCommerce sessions
- PayPal, CJ APIs, WP REST endpoints, Cloudflare Workers or Formspree

It does **not** permit its demonstration products to be submitted to the production `/order/` form.

### Test evidence

GitHub Actions workflow: `Hardened static request demo safety`. Successful run after code deployment to branch. This uses simulated browser/session DOM events and does not represent successful merchant checkout.

## Production-ready target architecture

For a **real** commerce experience independent of WordPress and Cloudflare Workers, the recommended prior work remains the draft `feature/hosted-commerce-staging` / PR #119: a managed provider such as Shopify, using its official Cart API and hosted checkout, backed by merchant-authorized payment methods.

The shared storefront must use **one** cart owner and **one** route for customer checkout. A provider-confirmed cart line is added only after SKU/variation/qty validation. Quick Buy invokes that same operation and then follows the provider's hosted-checkout URL. The supplier stock, price, taxes and shipping are revalidated by the backend/provider, not by customer-visible JavaScript.

For an intentionally **request-only store** (no immediate payment), an authenticated commerce or order backend should receive and store accepted order requests with server-generated references, webhook verification and idempotent processing. Formspree can notify staff but cannot be the authoritative order database.

## Clear release blockers — owner action required

1. Choose and approve **payment-capable managed commerce** or **request-only commercial operation**. These are different business workflows.
2. Provide **an approved merchant/store account**, verified supported payment gateway and currency, actual product/variant imports and protected backend integration secrets. Do not paste provider admin secrets into GitHub or a chat.
3. Validate PayPal in the merchant's actual jurisdiction, or explicitly leave it disabled. A PayPal email is not payment capture confirmation.
4. Validate CJ variant ID/warehouse/price/stock/shipping/destination through an authorized connector/backend.
5. Confirm Pakistan COD zones, real courier charges, return rules and order-acceptance personnel.
6. Build provider-backed customer accounts, separately approved supplier roles, and server-side rewards/commission ledgers only after requirements and integrations are agreed.
7. Run staff pilot: local item, variation, CJ option, Quick Buy, duplicate clicks, network 429/5xx, provider price changes, COD unpaid, payment cancellation, account ownership, mobile keyboard use.
8. Save a secure backup of the old order database and snapshots of routing, redirects and webhook configuration. Approve a rollback, THEN authorize domain/checkout cutover.
9. After an approved switch, monitor uptime and order/payment reconciliation; retire old scripts only when no active orders depend on them.

## Current production position

The existing `/order/` and `/request-cart/` routes are distinct request-only pages. The original `woo-bridge.js`, `global-pdp.js` and public checkout paths still exist; they were **not replaced** as part of this demonstration.

**Do not label this a permanent 100% live checkout solution.** Its successful outcome is a tested, safe UI prototype plus an explicit transition design; a production deployment remains conditional on payment, order persistence and merchant approvals.
