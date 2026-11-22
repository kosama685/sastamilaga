# Uploaded standalone storefront — production safety review
Date: 2026-11-22

## Decision
DO NOT replace the actual Sasta Milaga homepage with the uploaded demonstration application. It contains three invented sample products instead of the live catalogue, example stock counts, hardcoded CJ freight quotes and browser-stored plaintext accounts. It is useful only as a visual prototype, not as an accepted production commerce implementation.

## Verified source defects from the uploaded app.js
1. `signUp` saves plaintext passwords in localStorage. This does not provide real authentication or customer isolation. The `State.auth` object is attacker-editable.
2. `buildOrder` unconditionally sets `verified: true`, even though the only evidence is client-side Formspree submission. The subsequent `grantRewards` and `creditReferral` calls can mint purportedly verified rewards or referral payouts.
3. `CONFIG.cjCountries` includes hardcoded Saudi/UAE carrier prices and delivery estimates without a supplier API quote or corresponding exact variation/warehouse validation.
4. `stock: 999` and other static inventory assertions are not verified current supplier inventory.
5. `bindCart` quantity-decrement handler uses a malformed comparison expression, which can reference an undefined identifier and prevent correct cart editing.
6. Its duplicate-click lock exists only within a browser; it is not transactional, cross-device, or server-side fulfillment idempotency. Its timeout message assumes a request was not sent, which cannot be known after a timeout.
7. The static implementation cannot verify PayPal captures, administer COD orders, authorize accounts, or securely issue rewards. A payment email alone is not a supported payment integration.

## Safe production direction
- Preserve the real catalog, branding, route structure and existing orders.
- Keep Formspree as an **unpaid REQUEST receiver**, and never promote 2xx acknowledgement to paid, delivered or staff-accepted.
- Preserve exact SKU, variation attributes, quantity and a stable reference on retry.
- Keep unknown prices or shipping as UNVERIFIED; never invent a charge or carrier ETA.
- No real login, account history, redeemable points or referral payouts without server-side authorization and a ledger.
- Do not merge the request-only storefront onto the actual domain until test failures, Cloudflare route conflicts and genuine Formspree receipt are resolved.

## Current controlled PR
PR #130 includes safer local and CJ request-cart behavior, Formspree receipts and a staff support recovery link. It does not establish a real commerce backend. Production remains unchanged while review gates are open.
