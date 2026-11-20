# Sitemap validation (live)

Validated 2026-11-20T04:15:57.354Z. Read-only GETs.

- `sitemap.xml` HTTP 200; lists `sitemap-landing.xml` 1 time(s).
- `sitemap-landing.xml` HTTP 200; 12 <url> entries; 30 xhtml hreflang links.
- Expected indexable landing URLs: 12; present: 12.

| URL in sitemap-landing.xml | HTTP |
|---|---|
| /pakistan/ | 200 |
| /shipping-to/ | 200 |
| /shipping-to/germany/ | 200 |
| /shipping-to/germany/de/ | 200 |
| /shipping-to/saudi-arabia/ | 200 |
| /shipping-to/saudi-arabia/ar/ | 200 |
| /shipping-to/serbia/ | 200 |
| /shipping-to/serbia/sr-cyrl/ | 200 |
| /shipping-to/serbia/sr-latn/ | 200 |
| /shipping-to/uk/ | 200 |
| /shipping-to/usa/ | 200 |
| /ur/pakistan/ | 200 |

## Issues

None.

## Not covered here
- Country, language, product and category sitemaps: they do not exist yet for the landing system (only `sitemap-landing.xml`). Product and category sitemaps belong to the existing site (`sitemap-products-*.xml`, `sitemap-pages.xml`) and were not re-validated URL by URL.
- Search Console submission, "submitted vs indexed" counts and crawl stats: no access.
