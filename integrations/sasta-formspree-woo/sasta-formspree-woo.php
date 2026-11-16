<?php
/**
 * Plugin Name: Sasta Milaga — Formspree Order Mirror
 * Description: Copies verified static checkout submissions into WooCommerce Orders as unpaid, pending records. Does not change checkout, PayPal, cart, prices, stock, or gateways.
 * Version: 1.0.0
 * Requires PHP: 8.0
 * Requires Plugins: woocommerce
 * Author: Sasta Milaga
 * Text Domain: sasta-formspree-woo
 */
defined('ABSPATH') || exit;
require_once __DIR__ . '/includes/Signature.php';

final class Sasta_Formspree_Woo_Mirror {
    private const FORM_ID = 'xwvzzjdl';
    private const SECRET_OPTION = 'sasta_fs_order_signing_secret';
    private const NOTIFY_OPTION = 'sasta_fs_order_admin_notify';

    public static function init(): void {
        add_action('rest_api_init', [__CLASS__, 'routes']);
        add_action('admin_menu', [__CLASS__, 'admin_menu']);
        add_action('admin_post_sasta_fs_order_settings', [__CLASS__, 'save_settings']);
    }

    public static function routes(): void {
        register_rest_route('sasta-formspree/v1', '/orders', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'receive'],
            // Formspree is not a WordPress user. The callback validates its
            // mandatory signed webhook before parsing or writing anything.
            'permission_callback' => '__return_true',
        ]);
    }

    private static function signing_secret(): string {
        if (defined('SASTA_FORMSPREE_SIGNING_SECRET')) {
            return (string) constant('SASTA_FORMSPREE_SIGNING_SECRET');
        }
        return (string) get_option(self::SECRET_OPTION, '');
    }

    private static function value(array $submission, string $key, int $max = 300): string {
        $v = $submission[$key] ?? '';
        if (!is_string($v) && !is_numeric($v)) {
            return '';
        }
        return sanitize_text_field(substr(trim((string) $v), 0, $max));
    }

    public static function receive(WP_REST_Request $req) {
        $secret = self::signing_secret();
        if (strlen($secret) < 16) {
            return new WP_Error('sasta_fs_unconfigured', 'Order importer is not configured.', ['status' => 503]);
        }
        $raw = (string) $req->get_body();
        if (!\Sasta\FormspreeOrders\Signature::verify(
            $secret,
            (string) $req->get_header('formspree-signature'),
            $raw
        )) {
            return new WP_Error('sasta_fs_invalid_signature', 'Invalid webhook signature.', ['status' => 401]);
        }
        if (!function_exists('wc_create_order') || !class_exists('WC_Order_Item_Fee')) {
            return new WP_Error('sasta_fs_woo_unavailable', 'WooCommerce is unavailable.', ['status' => 503]);
        }

        $payload = json_decode($raw, true, 16);
        if (!is_array($payload) || !is_array($payload['submission'] ?? null)) {
            return new WP_Error('sasta_fs_payload', 'Malformed submission.', ['status' => 422]);
        }
        $form = (string) ($payload['form'] ?? '');
        $form = basename(rtrim($form, '/'));
        if ($form !== self::FORM_ID) {
            return new WP_Error('sasta_fs_form_mismatch', 'Unknown form.', ['status' => 403]);
        }
        $s = $payload['submission'];
        $external = self::value($s, 'order_id', 70);
        $name = self::value($s, 'full_name', 170);
        $phone = self::value($s, 'phone', 50);
        $address = self::value($s, 'address', 600);
        $email = self::value($s, 'email', 200);
        $items = self::value($s, 'order_items', 8000);
        $global = self::value($s, 'global_items', 8000);
        if (!preg_match('/^SM-[A-Z0-9_-]{5,65}$/i', $external) ||
            $name === '' || $phone === '' || $address === '' ||
            ($items === '' && $global === '') ||
            ($email !== '' && !is_email($email))) {
            return new WP_Error('sasta_fs_fields', 'Missing or invalid order fields.', ['status' => 422]);
        }
        // Formspree retries are idempotent. Never rely on customer e-mail
        // or timestamp alone as the order's identity.
        $dedupe = hash('sha256', self::FORM_ID . ':' . $external);
        $existing = self::find_order($dedupe);
        if ($existing > 0) {
            return new WP_REST_Response(['ok' => true, 'duplicate' => true, 'woo_order_id' => $existing], 200);
        }
        // add_option has a unique option_name in MySQL: a short lock prevents
        // concurrent webhook retries from creating two orders.
        $lock = 'sasta_fs_order_lock_' . $dedupe;
        $prior = get_option($lock, false);
        if (is_numeric($prior) && (int) $prior > 0 && (int) $prior < 2147483647) {
            return new WP_REST_Response(['ok' => true, 'duplicate' => true, 'woo_order_id' => (int) $prior], 200);
        }
        if (is_string($prior) && str_starts_with($prior, 'busy:')) {
            $started = (int) substr($prior, 5);
            if (time() - $started < 600) {
                return new WP_Error('sasta_fs_busy', 'Order import is being processed.', ['status' => 503]);
            }
            delete_option($lock); // a stale lock; recheck meta before retried creation
            $existing = self::find_order($dedupe);
            if ($existing > 0) {
                return new WP_REST_Response(['ok' => true, 'duplicate' => true, 'woo_order_id' => $existing], 200);
            }
        }
        if (!add_option($lock, 'busy:' . time(), '', false)) {
            return new WP_Error('sasta_fs_locked', 'Order is currently being processed.', ['status' => 503]);
        }

        try {
            $words = preg_split('/\s+/u', trim($name)) ?: [];
            $first = array_shift($words) ?: $name;
            $last = implode(' ', $words);
            $billing = [
                'first_name' => $first,
                'last_name' => $last,
                'address_1' => $address,
                'city' => self::value($s, 'city', 150),
                'email' => $email,
                'phone' => $phone,
            ];
            // Never invent a country. The static checkout does not collect it.
            $order = new WC_Order();
            $order->set_created_via('sasta-formspree');
            $order->set_status('pending');
            $order->set_currency('PKR');
            $order->set_address($billing, 'billing');
            $order->set_address([
                'first_name' => $first,
                'last_name' => $last,
                'address_1' => $address,
                'city' => $billing['city'],
            ], 'shipping');
            $order->set_customer_note(self::value($s, 'notes', 1200));
            $order->update_meta_data('_sasta_fs_dedupe', $dedupe);
            $order->update_meta_data('_sasta_fs_external_order_id', $external);
            $order->update_meta_data('_sasta_fs_form_id', self::FORM_ID);
            $order->update_meta_data('_sasta_fs_payment_unverified', 'yes');
            $order->update_meta_data('_sasta_fs_payment_method_label', self::value($s, 'payment_method', 100));
            $order->update_meta_data('_sasta_fs_payment_status_text', self::value($s, 'payment_status', 240));
            $order->update_meta_data('_sasta_fs_city', self::value($s, 'city', 150));
            $order->update_meta_data('_sasta_fs_near_place', self::value($s, 'near_place', 180));
            $order->update_meta_data('_sasta_fs_order_items', $items);
            $order->update_meta_data('_sasta_fs_global_items', $global);
            $order->update_meta_data('_sasta_fs_global_quote_usd', self::value($s, 'global_estimate_usd', 90));
            $order->update_meta_data('_sasta_fs_local_quote_text', self::value($s, 'order_total', 90));
            $order->update_meta_data('_sasta_fs_imported_utc', gmdate('c'));

            $quote = \Sasta\FormspreeOrders\Signature::money(self::value($s, 'order_total', 90));
            // The local quote excludes global supplier items, so never post a
            // combined paid amount as if it had been charged or reconciled.
            if ($quote !== null && $global === '') {
                $line = new WC_Order_Item_Fee();
                $line->set_name('Static storefront quoted amount — manually verify');
                $line->set_amount($quote);
                $line->set_total($quote);
                $order->add_item($line);
                $order->update_meta_data('_sasta_fs_quote_unverified', 'yes');
            } else {
                $order->update_meta_data('_sasta_fs_quote_unverified', 'yes');
                $order->update_meta_data('_sasta_fs_quote_requires_manual_pricing', 'yes');
            }
            // Saving with HPOS-aware WooCommerce CRUD (not raw SQL) ensures
            // it appears in WooCommerce > Orders and in the admin HPOS table.
            $order->save();
            $id = (int) $order->get_id();
            if ($id < 1) {
                throw new RuntimeException('WooCommerce did not return an order ID.');
            }

            $note = 'FORM SUBMISSION ' . $external .
                "\nSOURCE: Formspree (external static checkout), not WooCommerce cart." .
                "\nPAYMENT: NOT VERIFIED. PayPal approval/redirect is never proof of payment." .
                "\nPAYMENT SELECTED: " . self::value($s, 'payment_method', 100) .
                "\nQUOTE (UNVERIFIED): " . self::value($s, 'order_total', 90) .
                "\nLOCAL ITEMS:\n" . substr($items, 0, 5000) .
                "\nGLOBAL ITEMS (supplier estimate only):\n" . substr($global, 0, 5000) .
                "\nLANDMARK: " . self::value($s, 'near_place', 180);
            $order->add_order_note($note, false);
            update_option($lock, (string) $id, false);

            if (get_option(self::NOTIFY_OPTION, 'no') === 'yes') {
                $admin = (string) get_option('admin_email');
                if (is_email($admin)) {
                    // Operational notice only. No customer PII or cards in email.
                    wp_mail($admin, 'Sasta Milaga: external order #' . $id . ' needs review',
                        "A pending Formspree order was copied into WooCommerce.\n" .
                        admin_url('admin.php?page=wc-orders&action=edit&id=' . $id) .
                        "\nPayment is NOT VERIFIED. Check PayPal before dispatch.");
                }
            }
            return new WP_REST_Response(['ok' => true, 'created' => true, 'woo_order_id' => $id], 201);
        } catch (Throwable $error) {
            // Do not expose the submission or exception text to a public caller.
            // Keep lock if a saved Woo order exists; retry finds it by metadata.
            $existing = self::find_order($dedupe);
            if ($existing > 0) {
                update_option($lock, (string) $existing, false);
                return new WP_REST_Response(['ok' => true, 'duplicate' => true, 'woo_order_id' => $existing], 200);
            }
            delete_option($lock);
            return new WP_Error('sasta_fs_import_failed', 'Order import failed; retry safely.', ['status' => 503]);
        }
    }

    private static function find_order(string $dedupe): int {
        if (!function_exists('wc_get_orders')) {
            return 0;
        }
        $ids = wc_get_orders([
            'type' => 'shop_order',
            'limit' => 1,
            'return' => 'ids',
            'meta_query' => [[
                'key' => '_sasta_fs_dedupe',
                'value' => $dedupe,
                'compare' => '=',
            ]],
        ]);
        return is_array($ids) && !empty($ids) ? (int) $ids[0] : 0;
    }

    public static function admin_menu(): void {
        if (!function_exists('WC')) {
            return;
        }
        add_submenu_page('woocommerce', 'Formspree Orders', 'Formspree Orders',
            'manage_woocommerce', 'sasta-formspree-woo', [__CLASS__, 'settings_page']);
    }

    public static function settings_page(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('Access denied.');
        }
        $configured = strlen(self::signing_secret()) >= 16;
        echo '<div class="wrap"><h1>Sasta Milaga — Formspree Orders</h1>';
        echo '<p>Server-side mirror to WooCommerce Orders only. PayPal, the website checkout, and inventory are unchanged. Imported orders remain <strong>Pending payment</strong>.</p>';
        echo '<p>Webhook URL: <code>' . esc_html(rest_url('sasta-formspree/v1/orders')) . '</code></p>';
        echo '<p>Expected form: <code>' . esc_html(self::FORM_ID) . '</code></p>';
        echo '<p>Signing secret: <strong>' . ($configured ? 'configured' : 'NOT configured (webhooks fail closed)') . '</strong></p>';
        echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
        wp_nonce_field('sasta_fs_order_settings');
        echo '<input type="hidden" name="action" value="sasta_fs_order_settings">';
        if (!defined('SASTA_FORMSPREE_SIGNING_SECRET')) {
            echo '<p><label>Formspree webhook signing secret (leave blank to keep existing): <input type="password" name="secret" autocomplete="new-password" style="width:350px" /></label></p>';
        } else {
            echo '<p>Signing secret is controlled by the SASTA_FORMSPREE_SIGNING_SECRET server constant.</p>';
        }
        echo '<p><label><input type="checkbox" name="notify" value="yes" ' . checked(get_option(self::NOTIFY_OPTION, 'no'), 'yes', false) . '> Email the WordPress administrator a link to each newly imported pending order (optional, email delivery not guaranteed)</label></p>';
        submit_button('Save order bridge settings');
        echo '</form><p><strong>Next:</strong> Formspree form xwvzzjdl → Plugins → Webhooks → Simple webhook. Enter the URL above, configure the SAME signing secret, and test with a harmless signed submission. Requires a Formspree plan that includes webhooks.</p>';
        echo '<p><strong>Warning:</strong> Past Formspree submissions are not imported automatically. Do not fulfil PayPal orders until payment is independently confirmed.</p></div>';
    }

    public static function save_settings(): void {
        if (!current_user_can('manage_woocommerce')) {
            wp_die('Access denied.');
        }
        check_admin_referer('sasta_fs_order_settings');
        if (!defined('SASTA_FORMSPREE_SIGNING_SECRET')) {
            $secret = isset($_POST['secret']) && is_string($_POST['secret'])
                ? sanitize_text_field(wp_unslash($_POST['secret'])) : '';
            if ($secret !== '' && strlen($secret) >= 16) {
                update_option(self::SECRET_OPTION, $secret, false);
            }
        }
        update_option(self::NOTIFY_OPTION, (isset($_POST['notify']) && $_POST['notify'] === 'yes') ? 'yes' : 'no', false);
        wp_safe_redirect(admin_url('admin.php?page=sasta-formspree-woo&settings=updated'));
        exit;
    }
}
Sasta_Formspree_Woo_Mirror::init();
