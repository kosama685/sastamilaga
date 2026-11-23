# Legacy URL recovery — 23 November 2026

839 root category and article addresses now have static recovery documents pointing directly to verified existing canonical content. This covers every reported root HTML content URL. GitHub Pages serves these documents with HTTP 200, an immediate HTML refresh, a canonical link and a visible fallback link. JavaScript preserves query parameters and fragments. They are HTML redirects, not HTTP 301 redirects. No Cloudflare route or quota dependency was introduced.

Search suggestions now use absolute canonical category and product URLs and `/search/?q=…`. Supplier suggestions use `/global-shop/p/<pid>/<slug>/` rather than legacy hash or `/global/p/` paths.

The manifest is generated from actual category/article files. Existing root pages take priority. Unknown paths and administration probes such as `/webmail` and `/cpanel` retain their real status. Aliases stay outside sitemaps; canonical content remains the indexed destination.

Validation: `node --test tools/legacy-root-routes.test.mjs tools/search-stacking.test.mjs`; syntax check of `assets/js/search-suggest.js`. Production verification is recorded separately after deployment. This does not certify external supplier availability, checkout infrastructure, every historical URL, or every URL on the internet.
