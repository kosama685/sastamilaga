# Meta catalog inventory recovery — Sasta Milaga (2026-11-21)

## Verified facts
- The CJ static catalog contains 451,812 records in 129 public XML feed partitions.
- The Cloudflare D1 table catalog_products_cj has 451,812 records and no usable imported in_stock flags (live check on November 21).
- Cloudflare Worker sastamilaga-global-pages currently assigns backorder to every supplier feed item using FEED_AVAILABILITY, with an arbitrary 14-day availability date. This is NOT verified stock.
- CJ inventory API separately supplies warehouse- and variant-level CJ-owned stock and factory inventory. Positive factory inventory does not establish stocked goods in a CJ warehouse, live country shipping, or verified checkout.
- The 1.2x supplier-price estimate in the existing global XML is not a validated final retail checkout price.
- A separate WooCommerce Google-format feed is available at https://sastamilaga.com/wp-content/uploads/smcs/google-feed-x9hdgtc1hvxydimmdmc5aakd.xml; it must still be reviewed for item eligibility, product URL and real checkout consistency.

## Safe publishing contract

Run node tools/build-meta-cj-stock-verified.mjs --audit for an evidence report. Audit mode never generates a product feed.

To build Meta-native RSS, provide an independently verified per-variant source file (not the raw CJ supplier snapshot) under environment variable META_CJ_VERIFIED_OFFERS_FILE, select META_CJ_COUNTRY and META_CJ_CURRENCY, and run node tools/build-meta-cj-stock-verified.mjs --build.

Every offer must include:
- A stable ID and exact orderable variant ID, product details, HTTPS landing and product image.
- Verified fixed final retail price, currency, and destination market — not an estimated supplier cost.
- CJ API evidence with warehouse and factory quantities, timestamp checked within 24 hours.
- Successful exact-variant checkout, confirmed current product page price, country shipping and policy approval, backed by reference.
- Independent proof for the same direct image URL within seven days: HTTP 200, crawler-accessible JPEG/PNG, at least 500×500 pixels and at most 8 MB. A URL string alone is not enough.
- Genuine brand, manufacturer part number or GTIN; never invent these identifiers.
- Recent price (24h), checkout (7d) and shipping (7d) evidence.

A CJ-owned warehouse unit count above zero permits Meta-native 'in stock'; positive factory-only quantity permits 'available for order' ONLY with factory-order checkout proof. Unverified, stale or zero stock is omitted. No eligible items means feed publication fails closed. Output shards contain <=5,000 items and are written to feeds/meta-verified/*.xml when approved source input exists.

In Meta Commerce Manager, select the Commerce Manager native format for these generated Meta-specific XML files; the existing Google-format feeds use a different availability value convention.

## Deployment limits

- This audit branch does not change any live stock, product, payments, Merchant Center configuration, or the 129 public CJ feeds.
- CI runs a daily evidence contract test and saves a JSON artifact. No public Meta CJ feed URL is ready until verified source records exist and the generated XML is explicitly deployed.
- The CJ inventory API enforces a rate limit of about one request per second in current tests; 451,812 individual live checks cannot be verified in one conversation. Refresh in prioritized batches, cache with expiry, respect quotas, and verify all market checkout promises.
- Do NOT label all 451,812 supplier records as in stock, assign invented shipping dates, or duplicate product feeds in Meta.

Next integration: approved secure CJ inventory batch ingestion with provenance and expiry, then verified final retail price, shipping and checkout reconciliation before Meta publishing. The connected CJ tool alone does not automatically grant GitHub Actions secure credentials.
