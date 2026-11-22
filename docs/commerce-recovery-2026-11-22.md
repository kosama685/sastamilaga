# Sasta Milaga — commerce recovery and secure account implementation

Audit: 2026-11-22 (Asia/Riyadh)  
Production: https://sastamilaga.com  
GitHub PR: [#118](https://github.com/kosama685/sastamilaga/pull/118) (already merged)

## Verified state

- **PR #118 was merged** to main before the 2026-11-22 follow-up. It adds **opt-in request basket** `sm_order_cart_v1`, `/request-cart/`, `/order/`, and a form powered by the configured Formspree receiver. It is **not** a payment gateway or WooCommerce replacement.
- Live GET tests returned HTTP 200 for `/order/` and `/request-cart/`. The browser test of `/checkout/` and `/my-account/` did not finish before the 5.5-second timeout; this is **not** proof of a particular HTTP status.
- Cloudflare routes `/cart*`, `/checkout*`, `/my-account*`, `/wp-login.php*`, `/wp-json*` to `sasta-woo-namecheap-bridge-v1`. Static JavaScript cannot bypass this quota/routing by requesting the same hostname.
- DNS has a proxied `origin.sastamilaga.com` host with **no Workers route**, but browser navigation to `https://origin.sastamilaga.com/` returned a **Default Web Site Page**, not WordPress. This hostname must not be used for customer checkout until its Namecheap vhost, HTTPS, cookies, redirects, origin ACLs, REST endpoints and WAF have been verified.
- Connected WordPress reports WooCommerce installed and 11,763 published products. The existence of a working connector is **not** proof all public customers can complete checkout.
- Local Pakistan COD request cart already falls back from WooCommerce failures through `assets/js/cod-recovery.js` and submits to configured Formspree after explicit customer request and server acknowledgement. It does not create a paid order.

## Improvements committed after PR #118

1. `assets/js/order-cart.js`: allow **CJ price-pending requests** with `unit: null`, not arbitrary zero/guessed prices. Retain `sm_cart`, `sm_gcart`, `sm_order_cart_v1`; do not clear browser storage during migrations.
2. `assets/js/global-pdp.js`: when an exact supplier option is missing, a GDCS cart endpoint returns 429/5xx, or live supplier details are inaccessible, show a **Save quotation request** action. The shopper supplies size/colour and can save a CJ request without another WooCommerce cart call. Only the `sm_order_cart_v1` request basket changes.
3. `assets/js/order-page.js` and `assets/js/request-cart-page.js`: display the number of unpriced options, carry `order_global_unpriced_option_count` to the Formspree request, and show **NOT_PAID** / **UNCONFIRMED** statuses.
4. `tools/unified-order-request.test.mjs` and `.github/workflows/unified-order-production-contract.yml`: test separated PKR/USD totals, preservation of legacy carts, price-pending CJ items, request-form safety, syntax and public static order URLs.

### Known limitations of the request flow

- Browser-side price fields and Formspree-submitted order lines are untrusted customer input. Staff **must verify every SKU, stock, shipping rate, total, tax, payment status and country** using trusted supplier/admin sources before order acceptance.
- A Formspree 200 only confirms receipt by that service; it does **not** imply staff processed an order, WooCommerce received an order, PayPal captured payment or the supplier reserved stock.
- An ambiguous network timeout could mean the receiver got the request. Keep the basket and reference, warn against duplicate submissions, and check the receiver inbox. **Exactly-once order acceptance requires a server-side idempotency ledger**, not localStorage alone.
- Source-format `unit:null` indicates an **unpriced request**, not a $0 product.

## Safe production architecture (not yet deployed)

### Customer login, logout and My Account

**Do not implement the pasted `sm_users` + passwords stored in localStorage.** Customer passwords, roles, sessions, address books, purchase history and redemption balances require a server-side, authenticated identity service.

Preferred: WordPress core authentication/session cookie on a **healthy, secure origin route** (or a managed identity provider), with session checks and server-side access control. The static page may display an account UI, but private orders are returned from authenticated APIs and never trusted from browser storage.

- `POST /auth/login`: HTTPS, CSRF protections, session rotation, throttling, rate limit and credential validation at the backend.
- `POST /auth/logout`: invalidate server session; clear only auth keys/cookies, never browser shopping carts.
- `GET /auth/me`: return only the authenticated customer's minimal profile.
- `GET /auth/orders`: verify ownership server-side, do not accept arbitrary customer email as authorization.
- `GET /auth/addresses`: encrypted/restricted backend data; redact from analytics and logs.
- Password-reset and email-verification flows must be server-controlled.

### Supplier access

Separate **supplier application** from **supplier approval/login**. A Formspree application is merely an enquiry and must not grant a role. Supplier role assignments need administrator confirmation and audited backend permission checks; payouts, customer addresses and supplier orders must not be exposed by manipulating the client.

### Rewards

The uploaded sample awards/changes points in localStorage and lets the client forge balances. This is unsafe. Accrue points only from **server-verified delivered, non-refunded orders**. Reversals/cancellations deduct via an immutable backend ledger, manual administration can audit, and redemptions require an atomic server transaction. Formspree and WhatsApp are notifications, not rewards ledgers.

### PayPal

The existing `assets/js/config.js` has a configured PayPal email but an **empty PayPal Client ID and Worker endpoint**. Do **not** manufacture a successful payment in JavaScript. PayPal Smart Buttons or secure invoice links require an approved live app/merchant flow; server-side order-creation/capture or authenticated webhooks must match currency, amount and order ID. Display a PayPal checkout option only when the actual collection and verification flow is operational. The existing PayPal settings were not changed.

### CJ variation and carrier data

- Exact `pid`, `vid`, supplier SKU, option label, warehouse, variant stock and current quote must come from authenticated, bounded server/provider responses.
- 429/1027/5xx calls should use short circuit breaker/backoff and cached **noncommercial** supplier descriptions; no stale stock, freight or purchasability claims.
- If unavailable, offer WhatsApp or Formspree **unpriced quotation requests**. Do not falsely enable an Add to Cart checkout at an unverified price.

### Direct WordPress routing / Cloudflare quotas

The existing origin hostname is **not ready**; it renders a default hosting page. A safe route correction must first verify the intended Namecheap virtual host, TLS, WordPress URL settings, cookie domain/SameSite/Secure, REST CORS, payment callbacks, CSRF, IP allowlists, caching exclusions, WAF, and production health. Only then can an authenticated commerce subdomain and select paths be cut over, using rollback and synthetic customer tests. Do not blanket-skip Cloudflare security for `wp-admin`, `/checkout/` or `/wp-json/`.

## Acceptance tests before marking 100% operational

| Requirement | Evidence required |
|---|---|
| Static quote basket | browser add, refresh, cross-tab persistence, variants, removal, 429 retry safety, mixed PKR/USD |
| Pakistan COD | exact SKU/qty/source price, Pakistan address, Formspree receiver acknowledgment, fulfillment inbox reconciliation |
| CJ order enquiry | exact variant or explicitly pending variant, chosen destination, supplier quote, Formspree payload and operator acknowledgment |
| Customer auth | backend password verification, server-side session, login/logout/reset, access-control and CSRF tests |
| Supplier auth | admin-approved role, server authorization, independent supplier data access test |
| Rewards | server-side order delivery and return events, signed ledger entries, no client-side fraud |
| PayPal | PayPal live merchant approval, signed server transaction and webhook reconciliation |
| Existing commerce | WooCommerce and original COD checkout continue to function or have an explicitly approved, fully tested replacement |
| Cloudflare/WordPress | target hostname serves valid WordPress, TLS/cookies work, 429/1027 gone in verified test cohort |
| Production order | one synthetic authorized test through the chosen receiver (not a fake paid order), screenshot/response and internal order ID match |

**Status:** PR #118 merged, static quotation fallback committed, backend/auth/PayPal/WordPress origin routing are **not 100% certified or replaced**. Any all-complete claim without these tests would be false.
