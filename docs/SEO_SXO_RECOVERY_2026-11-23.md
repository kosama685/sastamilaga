# Sasta Milaga — SEO/SXO recovery, source-grounded first pass (2026-11-23)

## Audited facts
- SEOwer homepage score 34/100, AI/GEO 30/100 are proprietary diagnostics, not Google ranking measurements. The SEOwer target keyword was "live", which is a poor umbrella keyword for a mixed shopping/travel/media homepage.
- GTmetrix (Seattle desktop, Nov 23): performance 58%, LCP 1.5s, TBT 3.1s, CLS 0.06, total transferred 11.1MB; product-lite.js 3.29MB transfer, market.js ~2.3s CPU. These are **before** figures; no claimed post-deploy metric improvement without a repeat test.
- \`llms.txt\` exists publicly and references the site as of Nov 23, so SEOwer's "missing" flag is a false positive.
- D1 CJ snapshot is 451,812 supplier IDs, 572 categories; "700k+ currently available retail offers" is not verified. The static snapshot has \`allow_indexing:false\`. No supplier data should be mass-published, duplicated into sitemaps, or assigned fabricated live stock/price/schema.
- Genuine missing pages must return 404/410, moved pages a verified 301, transient failure a 503, and real available pages 200. Universal 200 creates soft 404s and is not an SEO goal.

## Implemented in this change
- Reduce unnecessary main-thread work in \`assets/js/market.js\`: PK/PKR homepage DOM mutations no longer trigger repeated currency/locale whole-page scans; expensive 240+ country <option> elements populate only on first interaction with the country form. FX conversion and other countries remain supported.
- Dedicated FAQ recovery Worker is isolated to \`/faq\` and \`/faq/\`, validates the true source FAQ HTML, and never masquerades a failure as HTTP 200 or alters checkout.
- Add regression tests for homepage/FAQ canonicals, existing llms.txt, CJ noindex snapshot, and market.js selectors.
- Add remote URL smoke test; alerts by failed GitHub Actions execution rather than making uncertain live claims.

## Further work (gated)
1. Measure GTmetrix and Chrome Performance/Long Animation Frames after deployment. Confirm real CPU time, CLS, LCP, Total Blocking Time and INP across device/location before claiming success.
2. Split the monolithic \`products-lite.js\` into an indexed, fetch-on-demand local catalogue. This requires updating \`app.js\` (which captures \`window.SASTA_PRODUCTS\` at evaluation time) and testing home/shop/search/cart/local product links; simply deleting the script would break browsing.
3. Only cache immutable hashed/versioned assets for a year; unversioned \`market.js\`, \`app.js\`, images and policy data need revalidation or shorter TTL until fingerprinting exists.
4. Replace oversized third-party product images with validated responsive CDN variants while retaining original fallbacks and correct aspect ratio; never rewrite all supplier image URLs blindly.
5. Create accurate topic-cluster navigation and answered user questions on pillar pages, but don't stuff a single broad keyword, fabricate testimonials, invent sameAs profiles or auto-create misleading Product Offer schema.
6. Audit all crawlable site URLs against existing 200/301/404/410/503 plus canonical, robots, sitemap eligibility, and Google Search Console. Keep checkout/account private routes out of public caching/indexing.
7. Expand eligibility ledger by product based on verified selling country, exact variant, supplier price/stock, shipping and checkout, with controlled publication and no mass 451812 product URL launch.

## Rollback
- Revert this Git commit for \`market.js\` and smoke tests, then allow the normal Pages deployment to finish.
- FAQ Cloudflare route \`sastamilaga.com/faq*\` is isolated; restore previous route only after verifying which origin can serve \`faq/index.html\`. Do not attach a broad wildcard Worker to checkout.
