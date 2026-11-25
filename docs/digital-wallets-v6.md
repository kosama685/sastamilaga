# Native wallet staging — PayPal JS SDK v6

The existing email-based hosted checkout remains unchanged. This branch adds browser adapters, not a deployed order service. The existing local-only PayPal Worker cannot safely handle the mixed CJ cart and is not reused automatically.

## Activation blockers
- Obtain the public REST client ID for an eligible merchant account; keep the secret on the server.
- Enable Apple Pay and Google Pay for the actual merchant country; register the checkout domain and install Apple's PayPal-issued domain association file. Confirm Google production approval as applicable. Venmo is US-only. Pay Later and Credit require eligibility.
- Implement and test the same-origin service below, with server-authoritative local and CJ prices, exact variants, stock, destination-specific freight and taxes, persistent order/capture records, idempotency, origin/session and CSRF protections, rate limits and signed PayPal webhooks. Never accept client-provided totals as truth.
- Run real sandbox wallet/browser tests, including 3DS and ambiguous failures. Google PAYER_ACTION_REQUIRED deliberately enters reconciliation hold; do not enable live until the additional action flow has been implemented and tested.
- Set walletClientId and walletEnvironment only after the backend and merchant environment agree. walletCheckoutEnabled defaults to false. No native wallet buttons appear if backend quote or SDK eligibility fails.

## Same-origin JSON protocol (not deployed)
POST /api/wallet-checkout/quote: receives local id/qty and global pid/vid/qty/carrier, destination and requested currency. Recompute everything on the server. Return protocol sm-wallet-v1, environment, authoritative=true, orderPersistence=true, captureVerification=true, opaque quoteId bound to session/cart, amount (exact decimal string), currency, country, merchantCountry, expiresAt (milliseconds, <=15 min), methods (approved subset). Any mismatch with the reviewed checkout total prevents rendering.

POST /api/wallet-checkout/orders: receives quoteId, method, attemptId, customer. Validate session, customer address, stock, quote freshness and totals; persist merchant order before invoking Orders API. Idempotently return orderId, reference, persisted=true, amount, currency. Use the proper PayPal payment source, not the legacy wallet-only source. Do not trust browser-supplied status.

POST /api/wallet-checkout/capture: receives orderId, attemptId. Enforce session ownership, prevent double capture, validate actual capture identity, currency, exact amount and completed status against stored order. Persist outcome before returning orderId, captureId, amount, currency, status=COMPLETED, verified=true, persisted=true. Reconcile uncertain results against PayPal and merchant records before allowing retry. The session hold is deliberately conservative; add authenticated recovery/status endpoint before production so a verified unpaid/cancelled order can be released without manual storage edits. Never store payment tokens in logs or browser storage.

All endpoints require JSON, no-store, proper HTTP status, and no static fallback. No payment credentials are committed. No real payment is needed by unit tests.

Official references:
- https://developer.paypal.com/sdk/js/set-up/
- https://developer.paypal.com/apple-pay/integrate/
- https://developer.paypal.com/google-pay/integrate/
- https://developer.paypal.com/sdk/js/reference/
