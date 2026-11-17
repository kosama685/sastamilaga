# Sasta Milaga — Secure Merchant SFTP publishing

STATUS: STAGED ONLY; NO PRODUCT FEED UPLOADED TO GOOGLE.

## Verified facts
Google SFTP endpoint: partnerupload.google.com, port 19321, MD5 host fingerprint 85:19:8a:fb:60:4b:94:13:5c:ea:fe:3b:99:c7:a5:4d. Google requires the remote uploaded filename to match the filename registered for a specific Merchant Center data source. Uploading a file does not mean the products are approved.

The 451,812 CJ snapshot entries are supplier catalogue records, not verified retail products. Existing local XML is also candidate-only; its shipping estimates and identifier defaults must be independently checked. Never submit supplier-only/noindex/WhatsApp-only records as purchasable inventory.

## First: reset the exposed SFTP password
The prior Merchant SFTP password was shared in chat. Reset it in Merchant Center, then save the NEW password as a GitHub Actions secret. Do not commit passwords to repository files or include them in logs.

## Required GitHub Secrets
GMC_SFTP_USERNAME — Merchant-provided SFTP username
GMC_SFTP_PASSWORD — newly rotated Merchant SFTP password
GMC_RELEASE_SHA256 — SHA-256 of the precisely verified and approved feed produced by the builder

## Required GitHub Variables
GMC_SFTP_FILENAME — filename EXACTLY registered in Merchant Center (do not invent a timestamped name)
GMC_TARGET_COUNTRY — real target country, e.g. PK only if account is set for Pakistan
GMC_TARGET_CURRENCY — verified retail currency, e.g. PKR only if visible on page and at checkout
GMC_AUTO_PUBLISH_ENABLED — leave unset or false until a trusted verified daily export and release digest exists

## Required retail offer file
The workflow requires data/merchant/verified-offers.ndjson. This is intentionally NOT generated from the 451,812 supplier snapshot. It must come from current checked retail inventory and verified WooCommerce checkout.

Each row needs: id, title, description, link, image_link, price (number), currency, country, availability, identifier_exists (verified boolean), offer_kind=verified_retail.

The evidence object requires:
- exact_variant_checkout=true
- price_matches_page_and_checkout=true
- stock_matches_page_and_checkout=true
- shipping_reviewed=true
- indexable_landing=true
- merchant_policy_reviewed=true
- price_checked_at and stock_checked_at: within 24 hours
- landing_checked_at and shipping_checked_at: within 7 days
- checkout_tested_at: within 30 days
- reference: identifier for auditable independent evidence

Do not create fictional approval evidence. The builder checks presence and recency, not the truth of outside claims. Verified prices and availability must match the site, structured data and checkout. Only include brand/GTIN/MPN when genuine. Set shipping_price only when verified; otherwise validate account-level Merchant shipping rules.

## How the pipeline operates
1. Run the tests. The exporter fails closed if the verified retail file is absent or if no item qualifies.
2. Generate feeds/merchant-verified.xml and artifacts/merchant-verified-report.json from verified retail NDJSON.
3. Review the exact XML SHA-256 and excluded rows; set GMC_RELEASE_SHA256 only after independent approval.
4. In GitHub Actions, run Secure Google Merchant SFTP with publish=false for preflight.
5. Configure the rotated username/password, the exact source filename and correct target market.
6. On a specifically approved release, choose publish=true. The uploader checks host fingerprints, registered filename format, feed checksum and file size under 4GB.
7. Confirm upload in Google Merchant Center Data sources, inspect diagnostics, and correct policy or processing issues. Transfer success does not imply Merchant approval.

Daily scheduled workflow exists but is disabled by default: no publication until the source and gating variables are deliberately established.

## Official documentation
https://support.google.com/merchants/answer/13813117
https://support.google.com/merchants/answer/13760862
https://support.google.com/merchants/answer/7052112
https://support.google.com/merchants/answer/4752265
