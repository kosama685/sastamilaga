# Sastamilaga Complete Product Package

Generated: 2026-05-24T12:04:33

## What is included

- `merged_products_complete.csv` — complete normalized catalog for Google Sheets import.
- `products.html` — animated product dashboard/storefront with product cards, all-products data table, multiple photos/videos, SEO fields, image alt tags, price editor, commission editor, delivery charge editor, and CSV export.
- `products_data.js` — full product dataset used by `products.html`; keep it in the same folder as `products.html`.
- `data/products.json` — compact JSON product data for developers/APIs.
- `google_apps_script/Code.gs` — Apps Script backend for products, order creation, price updates, commission updates, and delivery charge updates.
- `category_tag_audit.csv` — category/tag analysis summary.
- `analysis_summary.json` — machine-readable processing summary.

## Import into Google Sheets

1. Create a new Google Sheet.
2. Rename the first tab to `Products`.
3. File > Import > Upload > choose `merged_products_complete.csv`.
4. Insert as `Replace current sheet`.
5. Open Extensions > Apps Script.
6. Paste `google_apps_script/Code.gs`.
7. Save and deploy as a Web App.
8. Copy the `/exec` URL and paste it into the `Apps Script Web App URL` field inside `products.html`.

## Price formula

`final_price = base_price + commission_amount + delivery_charge`

`commission_amount = base_price * commission_percent / 100 + commission_fixed`

You can edit these per product in `products.html`, export a CSV, or save updates to Google Sheets through Apps Script.

## Data summary

- Product rows: 13,674
- Unique SKUs: 13,674
- Category paths: 192
- Products with images: 13,668
- Total image URLs: 54,927
- Total video URLs: 4,681
- Price range: PKR 0 to PKR 9,887

## Important

Keep `products.html` and `products_data.js` together in the same folder. The HTML can run locally because it loads the data as a normal JavaScript file.
