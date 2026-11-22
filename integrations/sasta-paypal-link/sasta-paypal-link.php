<?php
/**
 * Plugin Name: Sasta PayPal Link Checkout
 * Description: Optional WooCommerce PayPal/card redirect using the merchant email only. Payments require manual verification.
 * Version: 1.0.0
 * Requires Plugins: woocommerce
 */
defined('ABSPATH') || exit;
add_action('plugins_loaded', static function () {
    if (!class_exists('WC_Payment_Gateway')) return;
    class Sasta_PayPal_Link_Gateway extends WC_Payment_Gateway {
        public function __construct() {
            $this->id = 'sasta_paypal_link';
            $this->method_title = 'Sasta PayPal payment link';
            $this->method_description = 'PayPal-hosted checkout with no API keys. Verify the invoice and received amount manually before marking an order paid.';
            $this->has_fields = false;
            $this->supports = ['products'];
            $this->init_form_fields();
            $this->init_settings();
            $this->enabled = $this->get_option('enabled', 'no');
            $this->title = $this->get_option('title', 'PayPal or debit/credit card');
            $this->description = 'Pay securely on PayPal. Guest card payment is offered where PayPal supports it. Payment receipt is verified before dispatch.';
            add_action('woocommerce_update_options_payment_gateways_' . $this->id, [$this, 'process_admin_options']);
        }
        public function init_form_fields() {
            $this->form_fields = [
                'enabled' => ['title' => 'Enable', 'type' => 'checkbox', 'label' => 'Offer this optional payment gateway', 'default' => 'no'],
                'title' => ['title' => 'Checkout title', 'type' => 'text', 'default' => 'PayPal or debit/credit card'],
                'email' => ['title' => 'Receiving PayPal email', 'type' => 'email', 'default' => 'osamakhancv@gmail.com'],
                'sandbox' => ['title' => 'Sandbox test', 'type' => 'checkbox', 'label' => 'Use PayPal sandbox (requires a sandbox receiving email above)', 'default' => 'no'],
            ];
        }
        public function is_available() {
            return parent::is_available() && is_email($this->get_option('email'));
        }
        public function process_payment($order_id) {
            $order = wc_get_order($order_id);
            if (!$order || $order->get_payment_method() !== $this->id || $order->is_paid()) return ['result' => 'failure'];
            // WooCommerce, including its shipping/tax plugins, owns the amount. Ignore all browser totals.
            $currency = $order->get_currency();
            $total = (float) $order->get_total();
            if (!in_array($currency, ['PKR', 'USD'], true) || $total <= 0) {
                wc_add_notice('This gateway supports priced WooCommerce orders in PKR or USD. Choose another payment method.', 'error');
                return ['result' => 'failure'];
            }
            $email = sanitize_email($this->get_option('email'));
            $sandbox = $this->get_option('sandbox') === 'yes';
            // Preserve the invoice/amount when retrying the same unchanged WooCommerce order.
            $snapshot = hash('sha256', wp_json_encode([$currency, $total, $email, $sandbox]));
            $amount = $order->get_meta('_sasta_paypal_usd');
            if ($order->get_meta('_sasta_paypal_snapshot') !== $snapshot || !$amount) {
                $rate = 1.0;
                if ($currency === 'PKR') {
                    $response = wp_remote_get('https://open.er-api.com/v6/latest/PKR', ['timeout' => 15]);
                    $fx = is_wp_error($response) ? [] : json_decode(wp_remote_retrieve_body($response), true);
                    $rate = (float) ($fx['rates']['USD'] ?? 0);
                    $age = time() - (int) ($fx['time_last_update_unix'] ?? 0);
                    if (is_wp_error($response) || wp_remote_retrieve_response_code($response) !== 200 || ($fx['result'] ?? '') !== 'success' || $rate <= 0 || $age > 259200 || $age < -3600) {
                        wc_add_notice('The USD exchange rate is unavailable. Your order is preserved; retry or select another payment method.', 'error');
                        return ['result' => 'failure'];
                    }
                }
                $amount = number_format(round($total * $rate, 2), 2, '.', '');
                if ((float) $amount <= 0) return ['result' => 'failure'];
                $invoice = 'SM-WC-' . $order->get_id() . '-' . strtoupper(wp_generate_password(8, false, false));
                $order->update_meta_data('_sasta_paypal_invoice', $invoice);
                $order->update_meta_data('_sasta_paypal_usd', $amount);
                $order->update_meta_data('_sasta_paypal_rate', $rate);
                $order->update_meta_data('_sasta_paypal_snapshot', $snapshot);
                $order->save();
                $order->add_order_note('PayPal link created: invoice ' . $invoice . ', USD ' . $amount . '. Pending manual verification; no payment has been confirmed.');
            }
            $args = [
                'cmd' => '_xclick', 'business' => $email, 'currency_code' => 'USD', 'amount' => $amount,
                'item_name' => 'Sasta Milaga order ' . $order->get_order_number(),
                'item_number' => $order->get_meta('_sasta_paypal_invoice'),
                'invoice' => $order->get_meta('_sasta_paypal_invoice'), 'quantity' => '1',
                'no_shipping' => '1', 'no_note' => '1', 'charset' => 'utf-8',
                // Both paths keep the native order pending. A browser return never marks it paid.
                'return' => $this->get_return_url($order),
                'cancel_return' => $order->get_checkout_payment_url(),
            ];
            return ['result' => 'success', 'redirect' => add_query_arg($args, $sandbox ? 'https://www.sandbox.paypal.com/cgi-bin/webscr' : 'https://www.paypal.com/cgi-bin/webscr')];
        }
    }
    add_filter('woocommerce_payment_gateways', static function ($gateways) {
        $gateways[] = Sasta_PayPal_Link_Gateway::class;
        return $gateways;
    });
});
