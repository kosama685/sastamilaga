# Sasta Milaga static commerce v2 — staging test desk

This is a **runnable, isolated, mobile-friendly UNPAID REQUEST** application and modular JavaScript library. It does not depend on WordPress, WooCommerce, or Cloudflare Worker calls inside these modules.

## Open
`/staging/static-commerce-v2/` on the GitHub Pages preview for this branch, once available. The production apex domain may route through Cloudflare independently and is not switched by this PR.

## Modules
- `store.js`: static cart persistence, variation identity, quantity/edit/remove, separate PKR/USD estimates, null shipping and payable total, stable request reference, non-PII intake acknowledgments.
- `products.js`: adapters for reviewed local products and CJ manifest rows; exact variation selection; static freight data always labelled *indicative*, never a verified payable quote.
- `checkout.js`: Formspree AJAX POST, 15-second timeout, button disabling, manual-reconciliation state on ambiguous delivery, preserve cart and form on failure.
- `paypal.js`: cancellation safety; no unverifiable browser payment capture.
- `utils.js`: rejects client-only accounts, rewards and referral payouts; correct production SHA verification semantics.
- `app.js` and `index.html`: **staging-only**, accessible responsive integration desk for staff to supply known SKU/variant and test Formspree intake.

## GitHub Actions secrets
`CJ_ACCESS_TOKEN`, `CJ_API_KEY` and `CLOUDFLARE_*` are Actions secrets. They cannot safely be read in GitHub Pages JavaScript and do not automatically configure a carrier API or secure checkout. A reviewed GitHub Actions **scheduled snapshot build** could use CJ secrets to generate read-only product data, but quote freshness and per-variation carrier eligibility remain unverified until a trusted server confirms them. Never commit Actions secret values or put them into a static JS bundle.

## Important limits and acceptance rules
1. Pakistan simple / variable: request cart is functional with reviewed SKU and variation details; COD remains unpaid, subject to staff acceptance.
2. CJ Saudi colour: selected variant identity can be saved; static bands are *not* verified carrier rates, so final shipping / payable total is always null.
3. Quick Buy: preserve the existing cart; use a separate exact-item intent or explicit confirmation before replacing items. Never clear an unrelated cart silently.
4. Refresh, quantities, removal: automated local request-cart tests cover these operations.
5. Formspree 2xx: intake acknowledged, not a verified staff receipt or confirmed sale. Actual staff inbox confirmation is a separate acceptance requirement.
6. Formspree 5xx/timeout: preserve the cart and form; a timeout may have reached Formspree, so never blindly resend.
7. Browser idempotency is advisory only: real exactly-once fulfillment requires a server-side deduplication database.
8. PayPal: disabled until a provider-backed checkout, authenticated server capture verification and webhook handling are available.
9. Accounts, rewards and referral payouts: disabled until server-side authorization and financial/reward ledger are available.
10. Mobile: responsive CSS provided; device and keyboard testing are still required.
11. GitHub Pages: a source SHA from the GitHub API alone does not prove the domain serves that build; verify deployed artifact fingerprint on actual hostname.
12. Production: **NO CUTOVER**. Do not remove old routing or merchant data until the new flow passes staff receipt, live route and payment safety tests.

## Controlled tests
`node --test tools/static-commerce-v2.test.mjs`
`node --test tools/static-request-commerce.test.mjs tools/github-only-commerce.test.mjs tools/unified-order-request.test.mjs`

The 18 user scenarios cannot all be certified by client-only code; cases 9, 11, 13–16 and 18 require independent merchant/provider/hosting verification or protected server-side systems.

## Next verification
Use a controlled non-sensitive Formspree request, confirm reception in Formspree and the staff mailbox, then test exact local/variant and CJ product mappings on real mobile devices. Resolve existing legacy Woo-specific CI failures before replacing production.
