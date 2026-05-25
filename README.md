# Sasta Milaga Blastic Marketplace

This ZIP contains a complete static HTML/CSS/JavaScript marketplace prototype built from your uploaded CSV.

## Files

- `index.html` - Main single-page website.
- `styles.css` - Blastic animated dark/neon marketplace design.
- `app.js` - Routing, product rendering, filters, search, cart, wishlist, PDP, checkout, mega menu, and CSV-trained catalog helper chatbot.
- `products.js` - All 13,674 products converted from your CSV into browser-readable JavaScript.
- `products.csv` - Original uploaded CSV copied into the project.
- `Code.gs` - Your Google Apps Script backend file for Google Sheets integration.

## How to run locally

Because the catalog is embedded in `products.js`, you can open `index.html` directly in a browser.

For best results, use a local server:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Main pages inside the SPA

- `#/home`
- `#/category/fashion-and-apparel`
- `#/tag/cosmetics`
- `#/search?q=mobile`
- `#/deals`
- `#/product/<product-handle>`
- `#/cart`
- `#/wishlist`
- `#/checkout`
- `#/store/<store-name>`

## CSV fields used

The website uses:
`product_id`, `sku`, `handle`, `product_type`, `name`, `category_main`, `category_path`, `category_leaf`, `brand_or_store`, `source_price`, `base_price`, `final_price`, `stock_quantity`, `in_stock`, `published`, `status`, `short_description`, `description`, `tags`, `primary_image`, `image_urls`, `video_urls`, `image_alt_tags`, `seo_meta_title`, `seo_meta_description`, and `last_updated`.

## Chatbot

The "Sasta AI Helper" is a local JavaScript catalog assistant. It does not call an external AI API. It searches and ranks your CSV products by category, tags, text, stock, video availability, price, and discount.

Try:
- `mobile under 1000`
- `cosmetics deals`
- `fashion with video`
- `home decor`
- `car accessories in stock`

## Google Sheets backend

To connect Google Sheets:

1. Open Google Sheets.
2. Import `products.csv` into a tab named `Products`.
3. Open Extensions > Apps Script.
4. Paste `Code.gs`.
5. Deploy as Web App.
6. Add frontend fetch/order logic as needed for live order submission.

The current website works fully as a static frontend demo using localStorage for cart and wishlist.
