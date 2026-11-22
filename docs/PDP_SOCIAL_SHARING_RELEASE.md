# Sasta Milaga — PDP sharing and purchase-panel alignment

Release: 2026-11-22  
Applies to: existing local static product pages (`/p/*.html`) and Cloudflare-rendered CJ product pages (`/global-shop/p/*`).

## Scope

- In the product-only CSS, align the sticky `.buy-panel` to `top: 0px`.
- Under **Order on WhatsApp**, inject one accessible, responsive share panel with 14 visible options.
- Direct web sharing: WhatsApp, Facebook, X, Telegram, Pinterest (when an image is present), LinkedIn, Reddit, LINE, VK, Email.
- Fallback sharing: Pinterest without image (copy), Instagram, TikTok and More apps (native share chooser where supported, copy link otherwise), Copy link (clipboard with fallback).
- URL for sharing comes from the page's canonical HTTPS link; removes tracking queries and fragments.
- No new cart handlers, checkout behavior, payment fields, supplier prices or CMS writes.
- The existing `assets/js/chrome.js` loaded on both page families adds `product-share.css` and `product-share.js`; no mass regeneration of local product HTML is needed.

## Implementation

- `assets/js/product-share.js`
- `assets/css/product-share.css`
- `assets/js/chrome.js` loader
- `assets/css/global-pdp.css` CJ top alignment
- `tools/product-share.test.mjs` via `.github/workflows/static.yml`

## Quality and operational checks

1. Existing product pages retain **Add to cart**, **Buy now** and **Order on WhatsApp** targets unchanged.
2. Exactly 14 accessible share options appear on product pages, not home/category/blog pages.
3. Social links use the canonical product URL and `rel="noopener noreferrer"` for off-site windows.
4. Clipboard and native Web Share gracefully fall back; Instagram and TikTok are not misrepresented as one-click web post integrations.
5. At mobile widths (including 330px and smaller), labels wrap without horizontal overflow.
6. Production deployment depends on successful GitHub Pages workflow. Some edge caches may serve the old asset until refreshed.

## No guarantee

Web sharing cannot force all installed apps to appear in a device's share sheet. Pinterest requires an image for its direct pin-builder link. Commerce actions remain governed by the existing site's checkout and supplier-verification logic.
