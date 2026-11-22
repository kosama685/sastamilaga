# Sasta Milaga — Git-only unpaid commerce migration QA gate
Date: 2026-11-22
Branch: feature/git-only-formspree-request-commerce-20261122
Pull request: #130
Production cutover: NOT performed.

## Architecture contract
This candidate deliberately makes the static storefront's Add/Quick Buy controls submit **unpaid order requests**, never a paid or accepted commerce transaction. The request cart lives in browser localStorage and is **not** an authoritative order database. Formspree receives the request; a 2xx HTTP response is only intake acknowledgement, not proof of staff inbox receipt or order acceptance. Sensitive customer contact fields are not stored in the local receipt ledger. The existing /order/ page submits to the configured Formspree form and retains the same request reference after ambiguous failures.

No true secure payment, live inventory, CJ shipping, login, rewards or referral payouts can be made authoritative by GitHub Pages JavaScript alone. These require approved services and protected backend records. Existing Cloudflare routes on the apex domain are not removed by this PR.

## 18 user acceptance checks
| # | Test | Current evidence / release gate |
| - | - | - |
| 1 | Pakistan simple item → Add to Cart → Checkout → COD request | Branch static bridge saves unpaid local request and navigates to /order/; actual browser/form receipt not verified |
| 2 | Pakistan size variation → cart → checkout | Selected form attributes stored; per-SKU live browsing test needed |
| 3 | Saudi CJ colour → quotation → request | Global JS saves exact known variant or customer-requested option; real supplier quote/stock not guaranteed |
| 4 | CJ no rate → no invented total | Null shipping, unpriced quote and request-only status are explicit; verified carrier quote still absent |
| 5 | Quick Buy exact item/variant/qty | Branch uses selected video option SKU and quantity; real browser scenario needed |
| 6 | Cart refresh persistence | LocalStorage-backed request cart; automated cart tests |
| 7 | Quantity updates subtotal | Automated cart tests; estimates only |
| 8 | Remove updates badge/empty state | Cart events update request badge; browser smoke required |
| 9 | Formspree acknowledged and staff received | NO staff inbox verification. Formspree 2xx is not staff receipt |
| 10 | Formspree failure preserves cart | Form code preserves items/form/reference and no false success |
| 11 | Duplicate click → no duplicate fulfillment | Browser in-flight guard, but Formspree has NO server-side exactly-once delivery/fulfillment |
| 12 | Network timeout stable reference | Session-stable request id and no blind retry; manual reconciliation required |
| 13 | PayPal cancellation | This request flow collects no payment. Real PayPal cancellation not testable |
| 14 | Account isolation | BLOCKED: needs authenticated server-side account data; cannot use localStorage |
| 15 | Rewards verified order only | BLOCKED: no server-side order ledger or eligible-order webhooks |
| 16 | Referral payout verified attribution only | BLOCKED: no authoritative referral/payout backend; referral code sent unverified |
| 17 | Mobile responsiveness | Existing order request CSS is responsive; real mobile and keyboard testing needed |
| 18 | GitHub Pages release actual domain commit | BLOCKED until approved merge, Pages deploy, domain route test and cache verification |

## Repository files changed
- assets/js/woo-bridge.js — replacement legacy-path static request click adapter; no Woo API calls
- assets/js/global.js — CJ product buttons send unpaid requests, with quote-required display on unavailable rates
- assets/js/order-cart.js — allows unpriced Pakistan request items, preserves exact variation identity, no invented shipping total
- assets/js/request-cart-page.js — handles unpriced local rows and indicative totals
- assets/js/order-page.js — stores non-PII Formspree acknowledgement receipt and preserves cart after failed or uncertain submission
- order/index.html and request-cart/index.html — accurate customer-facing request language
- tools/static-request-commerce.test.mjs and .github/workflows/static-request-commerce.yml — contract tests

## Critical production cutover blockers
1. Confirm staff's Formspree inbox has received an authorized controlled test request; verify sender notifications, spam filtering and actual recipient.
2. Test representative local simple/variable and CJ product pages on desktop/mobile, exact variation and quantity, back/refresh, browser storage rejection, timeout and repeat clicks.
3. Replace or remove the legacy Cloudflare /cart*, /checkout*, /global-shop/p/* and /wp-json* routing only after route mapping is audited. Do not change DNS simply to expose a nonworking origin.
4. Obtain a real protected order database and payment service before claiming accepted/paid orders, account isolation, loyalty balances or referral payouts.
5. Resolve old Woo-specific workflow expectations with replacement end-to-end behavior tests; do not suppress failing checks without review.
6. After review, merge, deploy GitHub Pages, verify served asset content/hash on the actual apex domain, then run a controlled Formspree intake test.
7. Preserve Git rollback reference from the Nov 20 snapshot and PR #129.

## No-missed-order operational rule
Assign a stable reference on first submission. On timeout/failed response preserve cart and fields, retain reference, and instruct support reconciliation rather than blind resend. Only report `INTAKE_ACKNOWLEDGED_UNPAID` on a valid Formspree 2xx response. Formspree staff must separately verify receipt. No checkout is a paid order without an authoritative payment/provider confirmation.
