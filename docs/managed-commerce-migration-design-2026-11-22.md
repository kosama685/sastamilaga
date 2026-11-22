# Sasta Milaga — Managed Commerce Migration: Architecture, Cart/Checkout Fix, QA & Rollback

**Status:** Staging-only branch `feature/hosted-commerce-staging`. No production DNS, WordPress, WooCommerce, PayPal, CJ credentials, Cloudflare routing, product/order data, or existing browsers' cart keys changed.

**Audit date:** 2026-11-22. Primary public store: https://sastamilaga.com

## Executive decision

**Preferred candidate: Shopify hosted commerce + officially managed Shopify customer accounts, checkout and orders; CJdropshipping's supported Shopify connection for reviewed CJ SKUs.** The existing static site may remain for content and SEO. Its Add to Cart and Quick Buy will connect to a verified Shopify Storefront Cart API only *after* merchant onboarding and SKU mapping are approved. The hosted Shopify checkout revalidates payment, tax, stock and shipping. Existing WooCommerce/WordPress paths must remain available until a parallel pilot passes.

**Important Pakistan constraint:** Shopify Payments is not available for a Pakistan-registered merchant. The merchant must activate a supported third-party provider for its legal country, supported currencies and payouts; COD is a Shopify **manual payment method** that produces an unpaid order record. PayPal availability depends on the legal merchant account and platform/gateway support; an email alone does not enable PayPal checkout. Do not claim a particular payment method is approved until the merchant actually activates and tests it.

Sources:
- Shopify supported payment jurisdictions: https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries
- Pakistan third-party payment provider directory: https://www.shopify.com/pk/payment-gateways
- Shopify manual payment methods (COD): https://help.shopify.com/en/manual/payments/manual-payments
- Official Shopify Storefront cart: https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate
- Official Shopify Cart checkoutURL: https://shopify.dev/docs/api/storefront/latest/objects/cart
- CJ Shopify integration: https://www.cjdropshipping.com/blogs/cj-news/How-to-Connect-Shopify-Store-to-CJdropshipping

## 1. Observed current architecture and broken journeys

| Shopper action | Current code | Calls | Failure / business risk | Target post-pilot |
| --- | --- | --- | --- | --- |
| Local Pakistan Add to Cart | `assets/js/woo-bridge.js` | SKU map → WordPress WooCommerce Store API | Cloudflare route/worker quota, WP session or availability fails; misleading indefinite “Adding…” | Provider Cart API using pre-approved Shopify ProductVariant GID mapped to original local SKU |
| Local Buy Now | Same bridge | Woo add → `/checkout/` | Checkout/WordPress route separate from static page | Provider add + verified cart + official hosted checkout URL |
| Global variant selection | `assets/js/global-pdp.js` and CJ-related scripts | `/wp-json/sm/v1/gpdp/:pid` | Quota, stale/unknown supplier option, incomplete stock and shipping | CJ app sync into Shopify exact approved variants; quotes only when uncertain |
| Global Add / Quick Buy | `assets/js/global-pdp.js` | `/wp-json/gdcs/v1/live/cart` | 429/5xx/WordPress bridge failures; variation not mapped | Shopify Cart API for verified & stocked CJ variant; otherwise unpriced enquiry |
| Static request cart | `assets/js/order-cart.js` | Local browser storage `sm_order_cart_v1` | Not a source of paid/order authority | Keep separately labelled “request for quotation” path |
| Pakistan COD fallback | `assets/js/cod-recovery.js` | Request cart → Formspree | Email receipt is not a durable confirmed order | Hosted commerce COD as **pending/unpaid** order; Formspree is notification only |
| Current request checkout | `/order/`, `assets/js/order-page.js` | Formspree | Must verify inbox; untrusted client values | Separate quote flow, or staff manually creates approved order in commerce backend |
| PayPal | `assets/js/config.js` | Blank `paypalClientId` and `paypalWorker` | PayPal email is not merchant capture capability | Provider-supported PayPal + verified order capture/webhooks if account allows |
| Customer account | WordPress `/my-account/` edge bridge | WordPress sessions | Quota, cookie and ownership risk | Shopify's authenticated customer accounts |
| Supplier account | Proposed static localStorage role | None trustworthy | Role forgeable, supplier orders and payouts exposed | Admin-approved supplier backend/managed portal, separate from customer auth |
| Rewards | Proposed localStorage points | None trustworthy | Point forging and double spending | Server-side loyalty ledger from delivered, non-refunded order events |

### Verified routing facts

- Cloudflare routes `/cart*`, `/checkout*`, `/my-account*`, `/wp-login.php*`, `/wp-json*` to `sasta-woo-namecheap-bridge-v1`.
- In browser checks, static `/order/` and `/request-cart/` returned 200. `/checkout/` and `/my-account/` did not return within the measured timeout; do not infer a definitive HTTP status from a timeout.
- `https://origin.sastamilaga.com/` displayed **Default Web Site Page**, not a verified WordPress storefront. Never shift checkout there.
- Production CJ 429 fallback is deployed; it stores an **unpriced request**, and Formspree staff receipt has not yet been verified against a controlled customer submission.
- Checkout route behavior may change with cookies and live deploys. Do not assume a previously observed `/checkout/` → `/cart/` redirect applies to all customers.

## 2. Chosen replacement components

- **Storefront front end:** Existing static GitHub Pages product/SEO pages can continue initially. The eventual production code uses the same provider cart adapter as the staging branch once credentials/merchant approval and real product mappings are present. Removing Cloudflare Worker dependency is a **cutover step**, not achieved by simply adding JavaScript.
- **Cart:** Official Shopify Storefront API `cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cart(id)`. Shopify's validated Cart ID and quantities are the source of truth; browser localStorage only retains a provider cart ID, not payment or product price.
- **Quick Buy:** The **same Add mutation** as Add to Cart, then re-read cart and hand over only to the Shopify-provided `checkoutUrl` after the platform accepts the line. A local in-flight lock prevents double clicks. For a full distributed guarantee, order creation/payment deduplication must be enforced by the commerce/payment platform.
- **Checkout:** Shopify-hosted checkout recalculates actual stock, taxes, available shipping, presentment currency and final price. No client JS marks an order paid or accepted.
- **COD:** Configure a manual COD payment method in Shopify for the Pakistan market and selected applicable shipping zones. COD orders are **unpaid** and operationally pending customer acceptance until fulfilled.
- **CJ:** Use supported CJ-Shopify connector after reviewing variant mappings, warehouse/carrier, delivered countries, inventory sync and fulfillment status. CJ API secrets never enter the browser. Confirm whether the app supports this exact legal entity, fulfilment path and product catalog.
- **Accounts:** Use platform-authenticated customer login/logout/order-history and server authorization. Supplier portal requires an administrator-approved independent role model, not localStorage.
- **Rewards:** Choose a platform loyalty app that records immutable points from verified delivered and non-refunded orders; test refunds, redemptions, duplicate webhooks and customer deletion/export.
- **SEO and international:** Preserve old canonical product URLs where possible. For moved pages publish tested 301 redirects, reciprocal language links only where translated pages genuinely exist, market-appropriate shipping restrictions, sitemap mapping, verified product schema, and old-to-new SKU/variant mapping. Unqualified supplier snapshots remain excluded from indexing.

### Candidate comparison

| Option | Advantage | Blockers |
| --- | --- | --- |
| **Shopify (recommended conditional)** | Managed hosted checkout, COD manual method, customer accounts, official Cart API, documented CJ Shopify integration | Pakistan third-party PSP onboarding, PayPal country eligibility, recurring subscription + app/gateway fees, exact CJ stock/variant mapping, platform admin access |
| BigCommerce | Hosted commerce/payments integrations and API support | Pakistan merchant gateway suitability, direct CJ integration and account availability must be confirmed; potentially more custom fulfilment work |
| Medusa/Vendure on independently managed hosting | Maximum control, no Shopify lock-in, fully independent of WP and CF Workers | Responsible for PCI/payments, authentication, idempotency, stock reconciliation, server uptime, backups, fraud and support; higher migration risk |

**Costs:** Shopify subscription tier, country-specific gateway rates, third-party transaction fees, CJ supplier/warehouse fees, plan features, loyalty/supplier apps and currency conversion are **not approved quotes**. Obtain actual invoices and payment onboarding documents before selecting and paying for a plan. COD manual payment and third-party transaction fee rules should be checked on the selected Shopify plan.

## 3. Staging code implemented — not deployed to the live store

- `staging/hosted-commerce/adapter.js` exposes a minimal `SMHostedCommerce` using the official Storefront GraphQL Cart API. Supports validated variant ID, quantity, provider acknowledgement, cart recovery, CartLine update and hosted `checkoutUrl`. Rejects unconfigured shops, malformed SKU mappings, duplicate in-flight clicks, userErrors, unsafe URLs and invalid quantities. Never reads/mutates `sm_cart`, `sm_gcart` or `sm_order_cart_v1`.
- `staging/hosted-commerce/index.html` and `staging-ui.js` provide a compact mobile-responsive integration lab. The user must manually enter an **approved test shop** and public Storefront token and enter a **reviewed variant GID**. It has `noindex` tags. **No server-side auth guard is installed**: do not publish this lab to a public store without access controls. The token is **Storefront-only public token**, not an Admin API token.
- `tools/hosted-commerce-staging.test.mjs` simulates provider success/failure, cart persistence, duplicate clicks, unsafe checkout URLs and legacy cart preservation without reaching production services.
- `.github/workflows/hosted-commerce-staging.yml` executes these checks on the isolated branch.

The staging interface is a **test harness**, not an operational alternative payment processor. No actual merchant account or checkout credentials have been found or installed.

## 4. Product/SKU mapping and protected data

Prepare an owner-reviewed import spreadsheet with:
- Current local/CJ source, original `sku`, supplier `pid`/`vid`, variation descriptors and existing canonical URL
- Exact Shopify Product ID and ProductVariant GID returned from actual import
- Stock timestamp, supplier stock zone, current supplier cost and intended store retail policy
- Destination shipping market, carrier quote and item restrictions
- Quality approval flags for images, authenticity, product safety, terms, and translated copy
- Migration status (draft, verified, pilot, approved, blocked), plus original WooCommerce order reconciliation for historical records

A source product with an unverified variation or no current carrier quote **must remain quotation-only**. Do not bulk-import all 451,812 supplier IDs just because the source inventory audit counted them.

### Cart transition

Preserve the existing browser keys `sm_cart`, `sm_gcart`, `sm_order_cart_v1` and Woo cookies until cutover. On first approved migration visit, offer a **review items for re-add** screen that maps each variant and asks the new commerce platform to validate it; do not silently convert unmatched or stale entries. Never copy localStorage password/session values to the new account backend.

## 5. Required owner prerequisites and actions

1. Register or connect a legitimate Shopify test store under the correct Pakistan legal business entity and verify admin access, operating currency, shipping origin and chosen plan. **No connected Shopify account is currently available to verify**.
2. Confirm supported third-party payment gateway onboarding (e.g. with an officially listed provider) and actual settlement/withdrawal to the company's bank account; confirm COD and international charge/FX requirements. Do not assume PayPal works for a Pakistan-based merchant.
3. Configure manual COD method for Pakistan; confirm courier service integration and per-SKU shipping rules, including PKR 250 / free above 5,000 policy only if contractually current.
4. Connect CJ to the Shopify **test** store; verify the SKU/variant/warehouse/stock/freight mapping and whether the selected country is actually shippable.
5. Supply a **Storefront public access token** and shop hostname *via the store admin/staging only*. Admin keys, webhooks, supplier secrets and PSP credentials must be placed in provider-managed backends/secrets, not GitHub.
6. Approve a controlled sandbox order and payment cancellation test, then one staff-only COD order. Confirm order creation, emails, fulfilment and refund flows; verify personal data access and suppression.
7. Approve migration schedule, DNS target, SEO redirects, rollback owner and disaster recovery. Do not turn off WooCommerce or Cloudflare until the replacement is operating correctly and old orders have been backed up/reconciled.

## 6. Release acceptance matrix

| Test | Required evidence |
| --- | --- |
| Simple local item + refresh | Same provider Cart ID and confirmed quantity |
| Local option size/colour | Exact verified Shopify ProductVariant GID |
| Quick Buy | Uses identical add path and provider `checkoutUrl`, never a made-up checkout |
| CJ item | Verified variant, live inventory, destination shipping; otherwise unpriced quotation |
| 429/5xx/stale item | Clear failure with unchanged cart; bounded retries; no payment/stock claim |
| Double click/reload | No duplicate item/order, platform idempotency and order reconciliation |
| PayPal | Only enabled for merchant-eligible account; paid only after verified gateway capture |
| COD | Provider order record created **unpaid**, dispatch after staff confirmation |
| Customer account | Personal details/order history visible only after server-side authorization |
| Supplier account | Admin-approved role, backend security, isolated supplier orders |
| Rewards | Ledger balances unaffected by browser-side tampering and reversed for refunds |
| Mobile/accessibility | 390px no overflow, keyboard focus, accessible error messages |
| SEO and redirects | URLs, 301 map, canonical and locale links validated before go-live |
| Recovery | Previous storefront restored within approved rollback objective; no payments lost |
| Monitoring | Health alerts, gateway webhooks, supplier sync, scheduled backups and order reconciliation |

## 7. Rollback protocol

- Save DNS zone and Worker routes snapshot, existing GitHub deployment SHA, Woo database+uploads backup and recent order export (securely stored; not committed to GitHub).
- Keep the existing live routes unchanged during staged testing. No mixed live cart/session state.
- In pilot, restrict traffic to an isolated hostname and staff accounts. Any checkout/payment/stock inconsistency stops rollout; pause new pilot orders.
- To roll back production after approved cutover, restore the saved DNS/routing and static build, verify merchant callbacks and original order queue, then reconcile captured payments before resuming.
- Do not remove the old provider, database or secrets until statutory retention and order reconciliation requirements are satisfied.

## 8. Progress / limitations

**Implemented now:** GitHub staging Storefront cart adapter, hosted checkout navigation guard, provider-confirmed cart mutations, responsive staging screen, automated regression suite and migration runbook.

**Not implemented/verified:** Approved Shopify account, actual merchant payment methods, live CJ variants, real product imports, hosted checkout transaction, customer/supplier accounts, server-side rewards, production URL cutover, independent DNS/CLOUDFLARE exit, financial reconciliation, and end-to-end production orders.

**No production traffic or payment path was changed.**
