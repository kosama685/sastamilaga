# Sasta Milaga: how the pieces fit, what is done, and how to finish

Audited 2026-11-11 from the live site, the GitHub repository and a read-only look at the WordPress server. No secret value appears in this file.

## 1. The architecture (one picture)

```
 Visitor ──> https://sastamilaga.com  (Cloudflare, real domain, canonical address of every page)
                │
                ├── static pages, blog, product/category pages, Live TV, sitemaps, feed ── built from GitHub, served as files
                │        (GitHub Pages copy: https://kosama685.github.io/sastamilaga is only the deploy/test path)
                │
                └── dynamic paths go to WordPress/WooCommerce (the source of truth)
                         /wp-json/*   /cart/  /checkout/  /my-account/  /wp-admin/  /smcs-oauth/
                              │
                              ├── WooCommerce: cart, checkout, orders, payments, COD, accounts (login/register)
                              ├── plugin global-dropshipping-commerce: CJ products, live variants, freight, CJ orders, webhook
                              ├── plugin sm-rewards / sm-earn: points, levels, daily spin, referral rules
                              └── CJ Dropshipping API  (the key lives ONLY on this server)
```

Rules that keep it safe: WooCommerce owns identity, orders, payments. The browser never sees a CJ key. Cloudflare D1 holds preferences and anything cacheable, never passwords.

## 2. What the audit found (facts)

| Area | Finding |
|---|---|
| CJ in WordPress | Already built and connected. Public route `GET /wp-json/gdcs/v1/live/options/<pid>` returns real CJ variants (name, SKU, vid, price) and already allows `https://kosama685.github.io` (CORS). |
| Freight and CJ cart | `POST /wp-json/gdcs/v1/live/freight` and `/live/cart` exist but require a security cookie (`gdcs_csrf`) that WordPress sets on **sastamilaga.com**. They work from a page served on that same domain, not from github.io. |
| CJ key | Read by the plugin from the constant `GDCS_CJ_API_KEY`, or the environment, or its encrypted vault. |
| Rewards | Rules live in WordPress (1 point per Rs 100 on completed orders, levels, one spin a day after 1 completed order). Points and spins are database records in WordPress. |
| Search Console 403 | The WordPress host sheds load: product pages answer `503 Retry-After: 120` + `noindex` even to Googlebot. It is a host/Cloudflare rule, not code. |
| Live TV | 631 of 714 browser streams really play. 80 are refused by the providers' own CDNs (403, CORS or dead). 536 are VLC-only by design. |

## 3. Done today (static side)

* Real CJ variations on global product pages, read from the WordPress API (tested: 20 options, price updates, SKU and name go into the cart and the WhatsApp order).
* Global cart, quick buy, regional WhatsApp routing, product-page cart actions, blog, contact page, footer directory, FAQ + schema on every product and category, merchant feed, WCAG fixes, canonical address `sastamilaga.com`.

## 4. How to set the CJ key (pick one; do it on the server, never in the browser or GitHub)

1. **Recommended.** Add one line to `wp-config.php` (above "That's all, stop editing"):
   `define('GDCS_CJ_API_KEY', 'PASTE_THE_NEW_KEY');`
2. Or in WordPress admin: the plugin's CJ connection page stores the key in its encrypted vault.
3. Or on the server: `wp gdcs connect` (uses the key from the vault or `GDCS_CJ_API_KEY`).

Rotation: create a new key in the CJ dashboard, set it as above, open `https://sastamilaga.com/wp-json/gdcs/v1/live/options/805E463D-8F63-485E-8F09-D0F412682E40` (must still return options), then revoke the old key in CJ. The key that was pasted in chat must be revoked.

## 5. Make the real domain serve everything (the missing link)

Goal: `sastamilaga.com` serves the static pages itself and forwards only the dynamic paths to WordPress, so the freight/cart cookie is first-party.

1. Cloudflare dashboard > Workers & Pages: use the Worker in `workers/product-pages` or a Pages project fed from this repo.
2. Route rules on `sastamilaga.com/*`:
   * pass through to the WordPress origin: `/wp-json/*`, `/wp-admin/*`, `/wp-login.php`, `/cart/*`, `/checkout/*`, `/my-account/*`, `/smcs-oauth/*`, `/wp-content/*`
   * everything else: static files from this repo.
3. In WordPress Cloudflare rules, allow verified search bots (Cloudflare "Verified Bots") so Google is not served 503, and lower the load guard's trigger for bots. This is what clears the Search Console 403/503 list.
4. Add the GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and run **Actions > Deploy Cloudflare Workers** (already in the repo).

After that, change the static code so shipping and "Add to WooCommerce cart" call `/wp-json/gdcs/v1/live/freight` and `/live/cart` on the same domain (needs the cookie from `GET /wp-json/gdcs/v1/context`, then `credentials: 'include'`).

## 6. Accounts, login, register, reward points, spin wheel

Use WordPress as the identity and rewards engine; use D1 only for what is not sensitive.

| Need | Where it lives | How the static site uses it |
|---|---|---|
| Register, login, password reset | WooCommerce (`/my-account/`) | Links and forms post to WordPress. After login the page is on the same domain, so the session cookie works. |
| Points on shopping | `sm-rewards` (WordPress tables) | Earned automatically when an order is completed. Shown on the account page. |
| Daily spin | `sm-rewards` spin rules | One spin per member per day; the server decides the prize. |
| Language, currency, country, wishlist | D1 table `customer_preferences` (already designed in the handoff) | Optional cache keyed by the WordPress user id. |

Not recommended: a second password store in D1, or giving points from the browser (a visitor could forge it). What is still needed: a small WordPress REST endpoint that returns the logged-in member's points, level and spin status, and a spin button that calls the existing spin rule. It is a few dozen lines in a mu-plugin; it needs SFTP write access to the live site (see section 9).

## 7. Live TV: VLC, 403, CORS (how it works)

* A browser may only play a stream if the provider's server sends permission (CORS) and does not require a token or a specific referrer. The 80 failing channels fail for those reasons; the player shows a clear message with Retry, Open VLC, Download playlist and Copy link.
* VLC is not limited by browser rules, so the 536 VLC-only channels and the 80 refused ones can still be opened there with one click.
* Do not proxy a provider's protected stream through your own server: that bypasses their access control. Fix a 403 by asking the provider to allow your domain, or replace the channel with a licensed source.
* Re-test any time: `node tools/apply-playback.mjs` records real playback results (`data/livetv/playback-report.json`).

## 8. Languages

English and Urdu pages are real (Urdu text from your own pages, with hreflang pairs). For more languages: translate the page text with a human or a reviewed translation tool, add pages under `/<lang>/…` with `hreflang`, one language at a time (Arabic first), and only publish what has been reviewed. WordPress already runs TranslatePress for its own pages; reuse those translations rather than machine-translating again. 104 languages is a long-term goal, not a quick job.

## 9. What needs your decision or access

1. **Write access to the live WordPress over SFTP.** I have used it read-only because of your earlier rule and because the host sheds load. Please confirm if I may upload (a) one small mu-plugin with the member REST endpoints and CORS for `sastamilaga.com`, and (b) nothing else. Uploads would be made at a quiet time, one file at a time, with a backup copy first.
2. Cloudflare token and account id (GitHub Secrets) and Cloudflare access for the bot rules.
3. A new CJ key set on the server (section 4).

## 10. Lighthouse and quality agent

* `.github/workflows/lighthouse.yml` runs Lighthouse weekly (and on demand) against the main page types and keeps the HTML reports as downloadable artifacts.
* First results are in the repository history (see the project report).
