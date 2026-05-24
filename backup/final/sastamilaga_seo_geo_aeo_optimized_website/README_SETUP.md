# Sastamilaga Commerce SEO/GEO/AEO Optimized Website Package

Generated: 2026-05-24

## What is included
- Multi-page ecommerce website with animated attractive design
- 13,674 static product pages in `/products/`
- 192 static category pages in `/category/`
- `products.html` with text search, voice search, image-assisted search, filters and product data table
- `chatbot.html` iframe shopping guide and `chatbot-widget.js` floating widget
- `sitemap.xml`, `robots.txt`, canonical URLs, Open Graph, Twitter cards
- Product JSON-LD, Breadcrumb JSON-LD, FAQ JSON-LD and WebSite SearchAction
- `merged_products_seo_geo_aeo_complete.csv`
- `gap_analysis_seo_geo_aeo.csv` and HTML audit page
- Google Apps Script backend for product loading, orders, updating prices/commission/delivery

## Before publishing
1. Replace `https://sastamilaga.com` with your real deployed domain in generated files if needed.
2. Upload all files to hosting with the same folder structure.
3. Upload `merged_products_seo_geo_aeo_complete.csv` into a Google Sheet named `Products`.
4. Paste `google_apps_script/Code.gs` into Apps Script and deploy as Web App.
5. Submit `/sitemap.xml` in Google Search Console.
6. Test sample product URLs with Google Rich Results Test.

## Easy price/commission/delivery changes
Update these CSV/sheet columns:
- `base_price`
- `commission_percent`
- `commission_fixed`
- `delivery_charge`
- `final_price`

The included Apps Script has `updateProduct` and `bulkCharges` actions.
