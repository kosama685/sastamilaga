# Sasta Milaga — Formspree to WooCommerce Orders

**Purpose:** Mirror current static checkout submissions to **WooCommerce → Orders** while keeping GitHub shopping/cart/checkout JavaScript and PayPal completely unchanged.

**Deployment status:** Source code only until an administrator installs the WordPress plugin and connects Formspree; creating the GitHub code does NOT activate it on WordPress.

## What is already verified

- app.js posts the static checkout FormData to https://formspree.io/f/xwvzzjdl.
- assets/js/config.js has paypalEmail set to osamakhancv@gmail.com. This plugin NEVER changes this email.
- WordPress WooCommerce 11.1.2 uses HPOS order storage. Native Woo CRUD writes are therefore required for reliable admin visibility.
- Formspree supports signed Simple Webhooks on Professional/Business plans. This plugin verifies the raw-body HMAC on every POST before parsing order fields. Signature documentation: https://help.formspree.io/articles/advanced-features/verify-webhook-signatures

## Activation steps

1. Upload the installable plugin ZIP via WordPress → Plugins → Add New → Upload Plugin. Activate it after confirming WooCommerce is active.
2. WordPress → WooCommerce → Formspree Orders: enter and save the signing secret from the actual Formspree webhook. This signing secret is NOT the public form ID, PayPal email or any API token. A wp-config.php constant named SASTA_FORMSPREE_SIGNING_SECRET also works and takes precedence.
3. In Formspree, select form xwvzzjdl → Plugins → Webhooks → Simple Webhook and enter destination:
   https://sastamilaga.com/wp-json/sasta-formspree/v1/orders
   Configure the same signing secret. Formspree must be on a plan with Webhooks.
4. Send one signed, unpaid test submission via Formspree and confirm the response is 201 and that precisely one new Pending payment order appears under WordPress → WooCommerce → Orders. Retry the same external order ID with a fresh signature; response should be 200 and return the same Woo order ID.
5. Open the new Woo order: check contact details, address, city/landmark, submitted items and quote in the private order notes. PayPal remains unverified until checked in the PayPal account.

## Safety

- NO GitHub cart/checkout JavaScript modification, NO change to osamakhancv@gmail.com or any PayPal settings, NO gateway capture, NO order paid marking, NO inventory changes.
- The plugin adds new orders in Pending payment only. It records Formspree order reference and full submitted items privately. The local PKR quoted amount is shown only when no global supplier items exist, and labelled explicitly unverified; global-only or mixed-currency quotes require manual pricing.
- PayPal redirect, Formspree success, or an email notice is NOT proof of payment. Do not dispatch before confirming payment separately.
- Formspree webhook HMAC uses the exact raw body with timestamp, allows 5-minute clock tolerance and rejects unsupported/forged payloads.
- Replayed external order IDs are deduplicated using native Woo order meta and a MySQL option lock.
- Optional WordPress administrator email notification with just an admin order link is OFF by default. Email delivery is not guaranteed unless SMTP is verified; no personal data is included in notices.
- Formspree historical submissions are NOT imported automatically. Do not bulk-import emails without verifying each source/order ID and payment state.
- No signing secret or WooCommerce API key is committed in the repository or ZIP.

## Acceptance

- Installed and enabled in WordPress, Formspree webhook activated on form xwvzzjdl.
- Signed test request produces a single Woo pending order; a replay does not duplicate.
- Forged, wrong-form, or expired requests rejected without order creation.
- Name, email when present, phone, shipping address, items and payment method label visible to authorized Woo admin.
- Webhook responds inside Formspree's 3-second target; if WordPress hosting cannot reliably meet that target, do not declare 100% delivery. Use a durable queued receiver with proven retries before going live.
- Check order-notification SMTP only if the optional admin email is enabled.

## Rollback

Disable the Formspree webhook, then deactivate this plugin. No storefront routing, payment, PayPal, stock, catalog or GitHub JS needs rollback. Existing pending mirrored WooCommerce orders remain for audit.
