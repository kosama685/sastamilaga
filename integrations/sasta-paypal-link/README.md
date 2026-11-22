# Optional WordPress PayPal-link gateway

This is the second checkout option for comparison with the static `/order/` flow. No API keys or PayPal SDK are required. It uses `osamakhancv@gmail.com` by default.

Install `sasta-paypal-link.php` in its own `wp-content/plugins/sasta-paypal-link/` directory, activate it, then enable **Sasta PayPal payment link** under WooCommerce → Settings → Payments. Use the classic WooCommerce checkout shortcode `[woocommerce_checkout]`; a Checkout Blocks integration is not included. Existing WooCommerce shipping, inventory and destination validation still apply.

The native WooCommerce order owns product prices, shipping and taxes. PKR orders are converted to USD using a recent server-fetched rate; USD orders need no conversion. Unsupported currencies produce an error instead of a guessed amount. Amount, rate and invoice are stored on the native order. Retrying the same unchanged order preserves its invoice.

Payment redirects use PayPal `_xclick`. Return/cancellation never marks an order paid. **Manually verify the invoice, merchant, received USD amount and settlement in PayPal before marking the WooCommerce order paid or fulfilling it.** No IPN listener or automatic capture/verification is implemented. Do not enable an automated fulfillment plugin that dispatches pending orders.

For sandbox payment testing, enable Sandbox and enter a PayPal sandbox business receiving email. A real merchant email does not serve as a sandbox account. PayPal controls whether guest debit/credit card checkout is offered.

Offline verification:

```sh
php -l integrations/sasta-paypal-link/sasta-paypal-link.php
php integrations/sasta-paypal-link/test.php
```

The plugin is optional and disabled by default. Adding these files to GitHub does not install it on WordPress.
