# Sasta Milaga — Checkout and Order Delivery Review (2026-11-16)

## Verified architecture
- Public static storefront checkout is rendered in `app.js`; the existing handler reads `new FormData(form)` and submits to `SM_CONFIG.orderEndpoint` (currently Formspree).
- The static PayPal selection in `app.js` creates an **awaiting payment** order message and redirects to a PayPal payment link. Receipt of that message is **not evidence of completed payment**; verify the transaction before dispatch.
- `assets/js/checkout.js` supports a separate PayPal Worker integration, but its execution is gated by `paypalClientId` and `paypalWorker`, both currently empty in `assets/js/config.js`.
- WordPress and WooCommerce also operate on `sastamilaga.com`; the site's checkout route can redirect to cart when checkout has no active session. Do not equate that HTTP 302 with a failed paid checkout without a controlled cart test.
- The Cloudflare zone has a catch-all `sastamilaga.com/*` Worker named `sasta-public-github-recovery-v1`. Checkout requests may be handled differently from static GitHub Pages requests.
- WordPress `admin_email` is `kosama685@gmail.com`, but this does **not** independently prove outgoing transactional email delivery.

## Implemented on this branch
- Added optional `city` and `near_place` inputs directly into the existing `sm-co-grid` form. The inputs inherit the current checkout styling and enter the existing `FormData` payload.
- Checkout handler, Formspree destination, PayPal link, WooCommerce settings and Cloudflare routing were not altered.
- Added an automated checkout contract regression test.

## Do not deploy the proposed dual-send example unchanged
1. Browser-side dual submission causes multiple notifications and is not an authoritative WooCommerce order record.
2. Formspree/FormSubmit response `ok` alone cannot guarantee inbox delivery or durable processing.
3. The proposed Worker writes `ORDER_SEEN` **before** it confirms email delivery; a failed email can permanently suppress retries.
4. WooCommerce API keys cannot be hardcoded, and any polling service must have bounded pagination, retries, concurrency protection, and no personal data in logs.
5. A PayPal order should only be marked paid following server-side capture/verification, never after a Formspree response or a redirect.

## Production completion gates (not yet proven)
- Establish one durable source of truth for each checkout channel (WooCommerce HPOS for native Woo orders; a durable authenticated order store for static checkout if kept separate).
- Confirm verified mail transport and WooCommerce new-order recipient, retry behaviour, and deduplication.
- Obtain explicit consent/approval for sending customer contact and address data to any additional processing provider.
- Run controlled, non-charged order acceptance tests for COD, failed Formspree, PayPal canceled/approved, duplicate clicks, and recoveries.
- Check each route on production and the mirrored GitHub Pages deployment after CI; do not change the catch-all Worker until route-specific monitoring and rollback are ready.

## Existing URL audit
The repository already includes `tools/audit-internal-urls.mjs` and `.github/workflows/site-link-audit.yml`. Run that audited check rather than a smaller ad hoc regex over links; failures should be repaired from its reported exact paths.
