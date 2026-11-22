# Sasta Milaga — static storefront

A static HTML/CSS/JavaScript copy of the sastamilaga.com storefront, hosted on GitHub Pages:
https://sastamilaga.com/

It reuses the live theme (header, mega menu, travel search, Live TV, footer). There is no build server: the data is in JS
files, and crawlable HTML pages are generated ahead of time and committed.

## Catalogue

| Data | Files | Count |
|---|---|---|
| Local products (WooCommerce export, with SEO title and description) | `products.js`, `products.csv`, `p/*.html` | 20,165 |
| Local category pages | `c/*.html` | 218 |
| Global (CJ) supplier products | `data/cj/manifest.js` + `data/cj/c/<category>.js` (loaded on demand) | 451,812 in 572 categories |
| Global category pages | `c/global/*.html` | 573 |
| Global product videos | `data/cj/videos.js` | 5,804 |
| Airports for flight search (OurAirports, public domain) | `data/travel/airports.js` | 4,133 |
| Live TV channels | `data/livetv/channels.js` + all-mirror `playlist.m3u` | 17,463 channels / 191 countries |

Global product prices are the supplier's US$ price plus margin, shown as estimates. Orders for them are sent as a
WhatsApp request and confirmed by the team before payment.

## Routes

The app is a hash-routed SPA (`app.js`): `#/home`, `#/shop`, `#/category/<slug>`, `#/product/<id>`, `#/search?q=`,
`#/cart`, `#/checkout`, `#/global`, `#/global/c/<slug>`, `#/global/search?q=`, `#/global/videos`, `#/blog`,
`#/blog/<slug>`, `#/live-tv`, `#/travel`, `#/catalog-tools` (CSV import/export).

Every product, category and blog post also has a plain HTML page (`p/`, `c/`, `c/global/`, `b/`) with its own title,
description, canonical URL and JSON-LD.

## Scripts

- `assets/js/local-api.js` answers flight airport suggestions from `data/travel/airports.js`, so they work without the
  WordPress API. Live TV also uses the complete local snapshot (`liveTvSnapshot: true`). Hotel city lookup uses the live
  API because the booking partner needs its own city IDs.
- `assets/js/checkout.js` adds PayPal when `paypalClientId` is set in `assets/js/config.js`. Only the public Client ID
  goes there, never the secret.
- `assets/js/global.js` is the global shop, and `assets/js/blog.js` is the blog.

## Blog scheduling

Posts are listed in `assets/data/blog.js`, each with a `date`. The SPA shows only posts whose date has passed.
`.github/workflows/blog-schedule.yml` runs `node tools/build-blog.mjs` every day at 00:10 Pakistan time, then commits
the new `b/*.html` pages and the sitemap and redeploys Pages. You can also run it by hand from the Actions tab.

## SEO files

- `sitemap.xml` (index), `sitemap-pages.xml`, `sitemap-products-{1,2,3}.xml`, `sitemap-global.xml`, `sitemap-blog.xml`
- `robots.txt`, `llms.txt`

## Run locally

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## World TV maintenance

Open [the live directory](https://sastamilaga.com/live-tv/). The static catalogue retains all archived WordPress streams and merges iptv-org country/category/language playlists, Free-TV, epg.pw and regional lists. Mirror sources, favourites, recent viewing, country filters and the virtualized list work without WordPress. HLS/native/DASH and supported embeds attempt browser playback; installed-player links remain available when a source cannot play.

```sh
node tools/build-livetv.mjs
node tools/check-livetv.mjs
node tools/verify-livetv-coverage.mjs
node --test tools/build-livetv.test.mjs tools/check-livetv.test.mjs tools/live-tv-hub.test.mjs
```

The daily `livetv-refresh.yml` workflow rebuilds, audits and validates data before dispatching the central Pages deployment. Failed probes never delete channels. Review `data/livetv/build-report.json` for feed failures and `playback-report.json` for dated regional observations. See [the release guide](docs/world-tv-release-2026-11-22.md) for playback behaviour, complete verification, browser testing and asset provenance.

## Known limits

- Live TV preserves every source, including unreachable, HTTP-only and app-only sources. Broadcaster availability, regional restrictions, CORS and codecs affect playback; no browser can guarantee every upstream stream.

- PayPal is off until a public Client ID is added. A server-side endpoint is needed to verify payments, and GitHub Pages
  cannot run one.
- Individual global products have no static pages, because 451,812 pages would exceed the 1 GB Pages limit. Their
  canonical link points to the product page on sastamilaga.com.
- hreflang is English / x-default only. Translation happens in the browser, so no translated pages exist to list.
