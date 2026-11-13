#!/usr/bin/env bash
# Anonymous WooCommerce cart -> checkout smoke test.
# Never submits an order or payment. No user data is printed.
set -euo pipefail
BASE="https://sastamilaga.com"
PRODUCT_ID="15" # live published, simple, in-stock sample
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf 'Anonymous cart test for existing product %s. No order/payment submitted.\n' "$PRODUCT_ID"
add_status="$(curl -sS -L --max-time 35 --retry 1 --retry-delay 1 -A "SastaMilaga-QA/1.0" -c "$WORK/cookies" -b "$WORK/cookies" -o "$WORK/add.html" -w '%{http_code}' "$BASE/cart/?add-to-cart=$PRODUCT_ID")"
printf 'Add-to-cart final HTTP %s\n' "$add_status"
cart_status="$(curl -sS -L --max-time 35 --retry 1 --retry-delay 1 -A "SastaMilaga-QA/1.0" -c "$WORK/cookies" -b "$WORK/cookies" -o "$WORK/cart.html" -w '%{http_code}' "$BASE/cart/")"
printf 'Cart HTTP %s\n' "$cart_status"
if [[ "$add_status" != "200" || "$cart_status" != "200" ]]; then
 echo 'FAIL: cart request did not respond 200'; exit 2
fi
if ! grep -Eiq 'vegetable[[:space:]]+shredder|3-in-1[[:space:]]+multifunctional' "$WORK/cart.html"; then
 echo 'First cart attempt did not include item in server HTML. Trying standard WooCommerce product permalink.'
 fallback="$BASE/product/3-in-1-multifunctional-vegetable-shredder-peeler-bottle-opener/?add-to-cart=$PRODUCT_ID"
 fallback_status="$(curl -sS -L --max-time 35 -A "SastaMilaga-QA/1.0" -c "$WORK/cookies" -b "$WORK/cookies" -o "$WORK/fallback.html" -w '%{http_code}' "$fallback")"
 cart_status="$(curl -sS -L --max-time 35 -A "SastaMilaga-QA/1.0" -c "$WORK/cookies" -b "$WORK/cookies" -o "$WORK/cart.html" -w '%{http_code}' "$BASE/cart/")"
 printf 'Product permalink add-to-cart HTTP: %s; second cart HTTP: %s\n' "$fallback_status" "$cart_status"
fi
echo 'Cookie names received (values redacted):'
awk 'NF>=7 {print $6}' "$WORK/cookies" | sort -u | head -15
echo 'Cart HTML signals (safe tags only):'
grep -Eio 'cart-empty|woocommerce-cart-form|wc-block-cart|wp-block-woocommerce-cart|no-products' "$WORK/cart.html" | sort -u | head -15 || true
if ! grep -Eiq 'vegetable[[:space:]]+shredder|3-in-1[[:space:]]+multifunctional' "$WORK/cart.html"; then
 echo 'FAIL: product not in server HTML after both routes; possible JS-only rendering, cookie loss or routing problem'; exit 3
fi
echo 'Expected product found in cart markup'
checkout_status="$(curl -sS --max-time 35 --retry 1 --retry-delay 1 -A "SastaMilaga-QA/1.0" -c "$WORK/cookies" -b "$WORK/cookies" -D "$WORK/checkout.headers" -o "$WORK/checkout.html" -w '%{http_code}' "$BASE/checkout/")"
printf 'Checkout HTTP with cart %s\n' "$checkout_status"
if [[ "$checkout_status" != "200" ]]; then
 echo 'FAIL: checkout did not open (no order/payment attempted)'; exit 4
fi
if ! grep -Eiq 'checkout|billing|payment' "$WORK/checkout.html"; then
 echo 'FAIL: checkout HTML lacks form wording'; exit 5
fi
echo 'PASS: cart -> checkout entry. Payment, shipping rates and order placement NOT verified.'
