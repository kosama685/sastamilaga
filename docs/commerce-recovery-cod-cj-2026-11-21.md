# Sasta Milaga — Pakistan COD and CJ commerce recovery
Audit and implementation: 21 November 2026 (Asia/Riyadh).

## Production architecture (verified)
- `https://sastamilaga.com/`: public static storefront served through Cloudflare with GitHub Pages origin.
- Namecheap WordPress/WooCommerce remains the transactional origin, reached through the `sasta-woo-namecheap-bridge-v1` Worker on `/wp-json*`, `/cart*`, `/checkout*`.
- `sasta-cj-variants-shipping` Worker is routed on `/api/cj/*`, backed by D1 and a service binding to `sastamilaga-cj-shipping`.
- The Cloudflare D1 catalogue holds 451,812 CJ product mappings; the CJ variant cache held 1,296 products at inspection. A mapped product does not imply all variants are cached or in stock.
- The Cloudflare Worker settings show a service binding `SHIPPING_PROVIDER` (the underlying supplier Worker has a `CJ_API_KEY` secret binding). These bindings were not changed.
- GitHub Pages and the Namecheap origin are separate systems; the attachment's suggested "no WordPress" architecture does not describe the current live store.

## Root cause of the customer's error messages
GitHub Actions production GET probes recorded `HTTP 429` with `error code: 1027` on the WooCommerce cart API and CJ health endpoint. Cloudflare identifies 1027 as exhaustion of the Workers Free daily request limit. This happens **before** the request reaches CJ's API or the Namecheap WordPress application, so the message is NOT evidence that CJ throttled the supplier account or PayPal failed.
Read-only verification: https://github.com/kosama685/sastamilaga/actions/runs/44941285289

## Implemented changes
1. `assets/js/cod-recovery.js`: independent COD request cart for Pakistan-only published local items; localStorage saves only a request draft, not a WooCommerce session or order. Uses JSON-LD product SKU/price or the published local catalogue and preserves required WooCommerce option attributes. Caps item/quantity counts.
2. `cod-checkout/index.html`: accessible, responsive Pakistan COD request form. Collects customer contact, address, city, country, optional landmark/notes, visible estimated PKR total and consent. Sends a direct browser FormData POST to the existing Formspree URL from `SM_CONFIG.orderEndpoint`. No Cloudflare Worker is executed for the Formspree submit; no card details are collected. A successful Formspree response means an **order request** was accepted by Formspree, not that stock is confirmed or any payment was taken.
3. `assets/js/woo-bridge.js`: still attempts the genuine WooCommerce Store API first. For `worker_limit`, `service_unavailable`, `network`, or `unmapped` errors only, it can save the eligible published local item to the separate COD request cart and offer a same-domain link to `/cod-checkout/`. Avoids claiming a successful Woo cart. Existing stock, location and missing-variation refusals remain fail-closed. Inline errors are shown below the product buttons.
4. `assets/js/chrome.js`, `index.html`, and five section landing pages: load the COD script and cache-bust the revised WooCommerce script without editing 20k generated local HTML files; dynamic scripts are loaded in a predictable order on static product pages.
5. `assets/js/global.js`: corrected the shipped API contract. The D1 Worker accepts `GET /api/cj/shipping?pid=<pid>&vid=<vid>&country=<ISO2>&quantity=<integer>`, not the previous legacy POST-only supplier endpoint. Converts verified `rates[]` carrier/USD/ETA data into the existing UI. Legacy supplier POST fallback is retained for nonquota errors and is never retried against Cloudflare Error 1027.
6. PayPal JavaScript, receiving email, account configuration and payment routes **not modified**.

## Endpoint contracts
| Purpose | Method | URL / contract |
| --- | --- | --- |
| Store API cart | GET | `/wp-json/wc/store/v1/cart` (Woo session, nonce) |
| Local add item | POST | `/wp-json/wc/store/v1/cart/add-item` with Woo product ID, quantity and attributes |
| COD request | POST | `https://formspree.io/f/xwvzzjdl` as browser FormData |
| Formspree signed webhook (requires activation) | POST | `/wp-json/sasta-formspree/v1/orders` |
| CJ variants | GET | `/api/cj/variants?pid=<pid>` |
| CJ shipping | GET | `/api/cj/shipping?pid=<pid>&vid=<vid>&country=<ISO2>&quantity=<qty>` |
| CJ health | GET | `/api/cj/health` |
| CJ upstream variants (server-side only) | GET | `https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?pid=<pid>` with secret `CJ-Access-Token` |
| Global Woo cart | POST | `/wp-json/gdcs/v1/live/cart` with validated GDCS session and authentic pid/vid |

## Tests and evidence
- Automated tests `tools/cod-recovery.test.mjs` check SKU/price provenance, qty/total, published-catalogue fallback, missing attributes, storage failures and no payment/API calls.
- `tools/woo-bridge-flow.test.mjs` and `tools/commerce-resilience.test.mjs` check real Woo cart responses and CJ route contract, quota-safe handling and no false success.
- `.github/workflows/cod-fallback-live-smoke.yml` checks public `/cod-checkout/` and `/assets/js/cod-recovery.js` from an independent GitHub runner. Both returned HTTP 200. Dynamic WooCommerce and CJ GETs returned HTTP 429/Error 1027.
- Script syntax and no-purchase checks: `.github/workflows/commerce-resilience.yml` on main.
- **No live Formspree order was submitted** during this development; inbox notification/webhook receipt cannot be certified until a controlled dummy test is explicitly accepted and verified in Formspree. A GET/static test is not proof of a successful POST.

## Current acceptance boundaries
- Pakistan local COD **request route** can be used independently of WooCommerce's Cloudflare Worker quota; do not mark the request as accepted stock, an actual Woo order, or paid without separate verification.
- Direct WooCommerce cart and checkout remain blocked to the public while Cloudflare returns 1027, even though separate Namecheap origin read-only Woo APIs previously returned valid JSON.
- Live CJ options and freight require Worker capacity. The D1 cache contains a limited subset of products, not a complete preverified catalogue.
- To mirror Formspree requests into WooCommerce HPOS, install/activate the existing `integrations/sasta-formspree-woo` plugin and configure the actual Formspree signed webhook and signing secret. Repository source alone does not install it.
- An account-plan change to add Worker capacity requires owner approval; no such billing change was made.

## Rollback
Revert the scoped COD release (COD script, checkout page, Woo fallback and loader versions) through a reviewed GitHub commit; do not force-push `main` or erase unrelated edits. To disable the COD fallback safely, remove only its script references and restore the Woo error message. The WordPress database, PayPal settings, domain DNS, Namecheap origin and Cloudflare payment routes were not changed.
