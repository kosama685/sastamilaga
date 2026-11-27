# NovaProcure Corporate Product Ordering Website

A complete corporate product catalog website with Google Sheets + Apps Script order automation. It includes a polished frontend, a Google Apps Script backend, sample Excel product data, CSV import data, and deployment instructions.

## What is included

```text
product_order_suite/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/app.js
├── apps-script/
│   └── Code.gs
└── data/
    ├── products_template.xlsx
    └── products_template.csv
```

## Main features

- Corporate responsive product catalog design.
- Category-wise product browsing.
- Search by product name, product ID, brand, SKU, tags, and description.
- Voice search using the browser Web Speech API.
- Featured-only, in-stock-only, price range, sorting, and category filters.
- Product order modal with auto-detected Product ID.
- Backend verifies product ID, price, stock, and status from Google Sheets.
- New orders are appended to `All_Orders`.
- Daily sheets are created automatically, for example `Orders_2026-05-24`.
- `setup()` can create all required sheets and seed sample products.

## Google Sheet setup

Your provided spreadsheet ID is already placed in `apps-script/Code.gs`:

```js
const SPREADSHEET_ID = '1zlupdxEyaOhuurdvYi5DhRduXVszY5plN7UFqEfO0X4';
```

Open your Google Sheet and create or import a sheet named `Products` with these columns:

```text
Product ID, Product Name, Category, Brand, SKU, Price, Stock, Status, Featured, Image URL, Description, Tags, Created At, Updated At
```

You can import `data/products_template.xlsx` or `data/products_template.csv` into Google Sheets.

## Apps Script deployment

1. Open your Google Sheet.
2. Go to **Extensions > Apps Script**.
3. Paste the full content of `apps-script/Code.gs`.
4. Confirm `SPREADSHEET_ID` matches your sheet.
5. Run `setup()` once from the Apps Script editor and approve permissions.
6. Click **Deploy > New deployment**.
7. Select **Web app**.
8. Set **Execute as** to **Me**.
9. Set **Who has access** to **Anyone** or **Anyone with the link**.
10. Deploy and copy the Web App URL.

Your uploaded starter HTML already contained this Apps Script URL, so I kept it as the current default in `assets/js/app.js`:

```js
GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyFmP_-KqHaGnNr79Vf2K0sYEKKCkHxco6rwZ9bO7qDLuon6fzGIO0O_VfvNlCnFx5kkw/exec'
```

After deploying a new version, replace that value with your new Web App URL.

## Website deployment

The frontend uses only HTML, CSS, and JavaScript. You can deploy it to:

- Netlify
- Vercel static hosting
- GitHub Pages
- Any cPanel/static hosting
- Apps Script HTML service if you later want same-origin hosting

For local testing, open `index.html` in a browser or use any simple local server. Voice search usually requires Chrome and HTTPS when hosted online.

## How ordering works

1. The frontend loads products from Apps Script using `?action=products`.
2. When a user clicks **Buy now**, the selected product is stored in the hidden order fields.
3. The form sends only the order request plus the detected `productId`.
4. Apps Script looks up the product in the `Products` sheet.
5. Apps Script calculates the final price from the sheet, not the browser.
6. Apps Script appends the order to:
   - `All_Orders`
   - the daily sheet, such as `Orders_2026-05-24`

## Optional stock deduction

By default, the script does not reduce stock automatically:

```js
const AUTO_DEDUCT_STOCK = false;
```

Change it to `true` if every successful order should reduce stock in the `Products` sheet.

## Troubleshooting

### Products do not load

Check these first:

- Apps Script Web App is deployed.
- Access is set to Anyone / Anyone with link.
- `GOOGLE_SCRIPT_URL` in `assets/js/app.js` is the `/exec` URL, not `/dev`.
- `setup()` has been run once.
- Product sheet is named exactly `Products`.

### Orders do not appear

Check:

- Required fields are filled.
- Product ID exists in `Products`.
- Product `Status` is `Active`.
- Requested quantity is not greater than `Stock`.
- Apps Script permissions were approved.

### Voice search does not work

Use Chrome or Edge and host over HTTPS. Some browsers do not support the Web Speech API.

## Customization

Brand colors are defined in `assets/css/styles.css` under `:root`. Change these variables:

```css
--brand: #2563eb;
--accent: #14b8a6;
--ink: #0f172a;
```

Currency is set in `assets/js/app.js`:

```js
CURRENCY: 'USD'
```

Change it to `PKR`, `AED`, `GBP`, etc. as needed.
