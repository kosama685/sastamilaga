# CJ Product Evidence — 451,812 Supplier IDs

This source is a 2026-11-05 supplier snapshot; it is **not** a live stock feed.

Run the checked-in script to export all supplier IDs without skipping any:
```bash
node --test tools/cj-category-product-evidence.test.mjs
node tools/export-cj-product-evidence.mjs
tar -tzf artifacts/cj-seo-evidence/category-product-files.tar.gz | wc -l
```
An archive contains one independent JSON **evidence file** per CJ ID, under a folder named after its original supplier category. Output is private to GitHub Actions artifacts, not published as website pages or Merchant feeds. Each JSON records accurate known source fields and explicit reasons not to index or advertise it yet.

A supplier Product may only become search rich-result eligible after validated copy, verified fixed customer retail price and current market stock, accurate shipping and returns, and orderable product variants all appear correctly on the **individual product URL**. No fabricated offers, merchant ratings, brands, GTINs or stock.

Archive file layout:
- `seo-structured-data/cj/<supplier-category>-<short-hash>/<exact-supplier-id>.json` — one record per source product
- `all-products.jsonl.gz` — every ID with archive path and hold status
- `category-index.json` — totals per category
- `completeness.json` — source counts vs generated output

This is not a Google Search Console indexing action. The 451,812 source records are not eligible for automated indexing from a five-field snapshot. Only the independently editorially approved, orderable subset may be added to qualified sitemaps and Product Offers.

Dedicated CJ storefront PDPs remain dynamic by stable SKU URL; Google does **not** require 451,812 committed HTML files. Putting those files in GitHub Pages would also create an unnecessarily large repository and duplicate URL handling.
