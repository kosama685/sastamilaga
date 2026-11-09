# Sasta Milaga – setup guide

This guide covers every setting, where it lives, and the order to switch features on. Settings the browser can see go in
`assets/js/config.js`. Secrets go only into Cloudflare, with `wrangler secret put` or the dashboard. Never put a secret in
this repository, in `config.js`, or in a chat.

## 1. What works without any setup

- **Catalogue:** 20,165 local products and 451,812 global products.
- **WhatsApp ordering:** an order button on every card.
- **Checkout:** cash on delivery, bank transfer and EasyPaisa/JazzCash.
- **PayPal / debit or credit card:** a payment link to `paypalEmail`. Orders are emailed to Formspree first. Before you
  dispatch, check in PayPal that the amount for that order number has arrived.
- **Travel and content:** airport suggestions, blog scheduling, sitemaps, `robots.txt` and `llms.txt`.

## 2. Settings in `assets/js/config.js`

These values are public; anyone can see them in the page source.

| Setting | What it does | Current value | Change it when |
|---|---|---|---|
| `paypalEmail` | Receives PayPal / card payment-link payments | `osamakhancv@gmail.com` | The PayPal account changes |
| `orderEndpoint` | The Formspree form that receives orders | `https://formspree.io/f/xwvzzjdl` | You change forms |
| `whatsapp` | The WhatsApp number on every order button | `966510451995` | The number changes. Also update `WA_NUMBER` in `app.js` |
| `deliveryFee`, `freeDeliveryFrom` | Delivery in Pakistan | `250`, `5000` (PKR) | Prices change |
| `paypalClientId` | Public PayPal REST Client ID, for the Worker checkout | empty | Step 4 is done |
| `paypalWorker` | URL of the PayPal Worker | empty | Step 4 is done |
| `cjShippingWorker` | URL of the CJ shipping Worker | empty | Step 3 is done |
| `liveTvSnapshot` | Live TV reads the local channel file | `false` | The full channel export exists (step 6) |

After you edit `config.js`, commit and push to `main`. GitHub Actions deploys within about a minute.

## 3. CJ live shipping prices (`workers/cj-shipping`)

This Worker shows real CJ shipping methods and prices on global product pages, and adds the chosen method to the
WhatsApp order.

```bash
cd workers/cj-shipping
npx wrangler login                    # once per computer; opens the browser
npx wrangler secret put CJ_API_KEY    # paste the CJ key when asked; it is stored only in Cloudflare
npx wrangler deploy                   # prints the URL, e.g. https://sastamilaga-cj-shipping.<account>.workers.dev
```

Then set `cjShippingWorker` in `assets/js/config.js` to that URL, and commit and push.

**When you rotate the CJ key** (do it now: the old key was pasted in a chat), go to CJ Dashboard → API → Generate, then
run:

```bash
cd workers/cj-shipping
npx wrangler secret put CJ_API_KEY    # paste the new key
```

Nothing else changes. No file in the repository contains the key. For local testing, a git-ignored
`workers/cj-shipping/.dev.vars` file holds `CJ_API_KEY="..."`. Delete that file or update it after you rotate the key.

**Limits:**
- CJ allows 1 request per second. The Worker waits and retries, and caches results: access tokens about 14 days,
  variant IDs 30 days, quotes 6 hours.
- Each quote uses CJ API points; keep an eye on "RemainingPoints" in the CJ dashboard.
- Prices are CJ supplier shipping in US$, before customs duties.

## 4. PayPal with automatic payment confirmation (`workers/paypal`)

This is optional. The payment link already works; the Worker adds server-side pricing and automatic payment
verification.

1. Go to PayPal Developer → Apps & Credentials and create a REST app. Start in Sandbox.
2. Run the following:

   ```bash
   cd workers/paypal
   npx wrangler secret put PAYPAL_CLIENT_ID
   npx wrangler secret put PAYPAL_CLIENT_SECRET
   npx wrangler deploy
   ```

3. In the PayPal app, add a webhook pointing to `https://<paypal-worker-url>/api/paypal/webhook`. Subscribe it to
   PAYMENT.CAPTURE.COMPLETED, DENIED, REFUNDED and REVERSED. Then run `npx wrangler secret put PAYPAL_WEBHOOK_ID`.
4. In `config.js`, set `paypalClientId` (the public Client ID) and `paypalWorker` (the Worker URL).
5. Test a sandbox payment.
6. Then switch to live:
   - set `PAYPAL_ENV = "live"` in `workers/paypal/wrangler.toml`;
   - put the live Client ID and secret in place;
   - redeploy;
   - update `paypalClientId`.

Card fields inside the PayPal buttons appear only when PayPal approves your account for them.

## 5. Global product pages (`workers/product-pages`)

This Worker gives each of the 451,812 global products its own page, plus 572 sitemaps.

```bash
cd workers/product-pages
npx wrangler deploy
```

Then do the following:
1. Submit `https://<worker-url>/sitemap-global-products.xml` in Google Search Console.
2. Optionally, attach a custom domain and set `CANONICAL_BASE` in `workers/product-pages/wrangler.toml`.
3. Change `liveUrl()` in `assets/js/global.js` to the Worker URL, so product links and canonical URLs point to the
   new pages.

Cost: $0–5 a month. See `workers/README.md`.

## 6. Live TV

The WordPress channel list (`https://sastamilaga.com/wp-json/sltv/v1/channels`) is too slow to load from the browser.

1. Get all 10,619 channels, in one of two ways:
   - a one-time export from WordPress;
   - a run of the snapshot script when the server is quiet: 177 pages, 2 at a time.
2. Save them as `data/livetv/channels.js`, in the format described at the top of `assets/js/local-api.js`.
3. Test a sample of the stream URLs.
4. Set `liveTvSnapshot: true` in `config.js`, then commit and push.

Do not publish a partial list.

## 7. Orders into Google Sheets (optional)

1. Create an Apps Script project and deploy it as a web app (Execute as: me; Who has access: Anyone).
2. Copy the `/exec` URL into a new `sheetEndpoint` setting.
3. Wire up the checkout. See the Apps Script prompt from the project chat.

## 8. Checks after any change

- Wait until the "Deploy static content to Pages" run in the GitHub Actions tab is green.
- Then open the site:
  - a product card shows the WhatsApp button;
  - checkout reaches the thank-you page with COD;
  - a global product page shows shipping prices, if the CJ Worker is set up.

## Where secrets live

| Secret | Stored in | Never in |
|---|---|---|
| CJ API key | Cloudflare secret `CJ_API_KEY` (cj-shipping Worker) | the repo, `config.js`, chat |
| PayPal Client Secret, Webhook ID | Cloudflare secrets (paypal Worker) | the repo, `config.js` |
| PayPal Client ID | `config.js` (it is public) | (none) |
| PayPal email | `config.js` (it is public by design) | (none) |
