# Cloudflare Workers

These are two separate Workers. Neither one is deployed yet, because deploying needs a Cloudflare login (`wrangler login`).
Both passed local tests with `wrangler dev`.

## 1. PayPal (`workers/paypal`)

The Worker handles PayPal payments so that the site's JavaScript never holds the secret:

- **Create order:** `POST /api/paypal/orders`. The Worker prices the cart from `data/prices.json`, which `gen_pages.py`
  builds from `products.js`, and converts PKR to USD. It ignores any amount the browser sends.
- **Capture:** `POST /api/paypal/orders/:id/capture`. The Worker captures the payment and checks with PayPal that it
  completed. It then sends the order to Formspree with the PayPal order and capture IDs.
- **Webhook:** `POST /api/paypal/webhook`. The Worker verifies each event's signature with PayPal, then records
  completed, denied, refunded and reversed captures.

To deploy (first with sandbox credentials, then switch to live):

```bash
cd workers/paypal
npx wrangler login
npx wrangler secret put PAYPAL_CLIENT_ID
npx wrangler secret put PAYPAL_CLIENT_SECRET    # stays in Cloudflare only
npx wrangler deploy
# Create a webhook in the PayPal dashboard pointing to https://<worker>/api/paypal/webhook, then:
npx wrangler secret put PAYPAL_WEBHOOK_ID
```

After deploying, put the Worker URL in `paypalWorker` and the public Client ID in `paypalClientId`, both in
`assets/js/config.js`. Once the sandbox payments work, set `PAYPAL_ENV = "live"` in `wrangler.toml`, put the live
credentials in place, and redeploy.

## 2. Global product pages (`workers/product-pages`)

The Worker builds a page with the title, description, canonical URL, Product and BreadcrumbList data, video and a
WhatsApp order button. It covers all 451,812 CJ products and reads the existing category files in `data/cj/c/*.js`.

- `/global/p/<category>/<productId>/<slug>`: the product page. A wrong or missing slug redirects with a 301; an unknown
  product returns a 404 page marked noindex.
- `/sitemap-global-products.xml`: the sitemap index, with one sitemap per category (572 sitemaps). The largest holds
  5,866 URLs, well under the 50,000 limit.
- `/robots.txt`.

Local test: all 572 sitemaps resolve, and together they list exactly 451,812 product URLs.

To deploy:

```bash
cd workers/product-pages
npx wrangler deploy
# Optional, to serve the data from R2 instead of GitHub Pages:
npx wrangler r2 bucket create sastamilaga-cj
# upload data/cj/manifest.js and data/cj/c/*.js with the same paths (573 objects, about 92 MB),
# then uncomment the [[r2_buckets]] block in wrangler.toml and deploy again.
```

The pages become the canonical product URLs only after the Worker is live on a domain. Then set `CANONICAL_BASE`, add
the sitemap index to Search Console, and change `liveUrl()` in `assets/js/global.js` to the new URL. Until then the site
keeps pointing to sastamilaga.com.

## Cost estimate

These are Cloudflare's list prices as of late 2026. Check them on cloudflare.com/plans before rollout.

| Item | Price | Expected use | Monthly |
|---|---|---|---|
| Workers Free | 100,000 requests a day | PayPal Worker, early crawl | $0 |
| Workers Paid (needed once traffic exceeds the free tier) | $5 a month, includes 10 M requests, then $0.30 per million | 451,812 product pages crawled 2–4 times a month, plus visitors (about 1–3 M requests) | $5 |
| R2 storage (optional) | $0.015 per GB-month, first 10 GB free | 92 MB | $0 |
| R2 reads (optional) | $0.36 per million, first 10 M free | 1 read per uncached page view | $0 |
| PayPal | PayPal's transaction fees per sale | | depends on sales |

Expected total: $0–5 a month for Cloudflare.
