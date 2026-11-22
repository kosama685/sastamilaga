<?php
if (PHP_SAPI !== 'cli') exit;
// Offline gateway tests. No WordPress install, orders, network requests or payments.
define('ABSPATH', __DIR__);
$settings = ['enabled'=>'yes','email'=>'osamakhancv@gmail.com'];
$fx_age = 0;
$notices = [];
function add_action($hook, $callback) { if ($hook === 'plugins_loaded') $callback(); }
function add_filter($hook, $callback) {}
function is_email($email) { return filter_var($email, FILTER_VALIDATE_EMAIL); }
function sanitize_email($email) { return $email; }
function wp_json_encode($value) { return json_encode($value); }
function wp_generate_password($length, $special, $extra) { return 'TEST1234'; }
function wc_add_notice($text, $type) { $GLOBALS['notices'][] = $text; }
function wc_get_order($id) { return $GLOBALS['order']; }
function wp_remote_get($url, $args) { return ['code'=>200,'body'=>json_encode(['result'=>'success','rates'=>['USD'=>0.004],'time_last_update_unix'=>time()-$GLOBALS['fx_age']])]; }
function is_wp_error($response) { return false; }
function wp_remote_retrieve_body($response) { return $response['body']; }
function wp_remote_retrieve_response_code($response) { return $response['code']; }
function add_query_arg($args, $url) { return $url . '?' . http_build_query($args); }
#[AllowDynamicProperties]
class WC_Payment_Gateway {
    public function init_settings() {}
    public function get_option($name, $default = '') { return $GLOBALS['settings'][$name] ?? $this->form_fields[$name]['default'] ?? $default; }
    public function is_available() { return $this->enabled === 'yes'; }
    public function get_return_url($order) { return 'https://shop.test/order-received/1'; }
}
class OrderFixture {
    public $meta = [], $notes = [], $currency = 'PKR', $total = 2250, $paid = false;
    public function get_payment_method() { return 'sasta_paypal_link'; }
    public function is_paid() { return $this->paid; }
    public function get_currency() { return $this->currency; }
    public function get_total() { return $this->total; }
    public function get_id() { return 1; }
    public function get_order_number() { return '1'; }
    public function get_meta($key) { return $this->meta[$key] ?? ''; }
    public function update_meta_data($key, $value) { $this->meta[$key] = $value; }
    public function save() {}
    public function add_order_note($note) { $this->notes[] = $note; }
    public function get_checkout_payment_url() { return 'https://shop.test/order-pay/1'; }
}
function check($condition, $message) { if (!$condition) throw new RuntimeException($message); echo "PASS $message\n"; }
require __DIR__ . '/sasta-paypal-link.php';
$gateway = new Sasta_PayPal_Link_Gateway();
$order = new OrderFixture();
$result = $gateway->process_payment(1);
parse_str(parse_url($result['redirect'], PHP_URL_QUERY), $query);
check($result['result'] === 'success' && $query['amount'] === '9.00', 'server Woo total converts PKR to USD');
check($query['business'] === 'osamakhancv@gmail.com' && $query['cmd'] === '_xclick', 'email-only PayPal link');
check(!$order->paid && $query['cancel_return'] === 'https://shop.test/order-pay/1', 'redirects preserve pending native order');
$gateway->process_payment(1);
check(count($order->notes) === 1, 'same order retry preserves one invoice');
$order = new OrderFixture(); $order->currency = 'USD'; $order->total = 17.35;
$result = $gateway->process_payment(1); parse_str(parse_url($result['redirect'], PHP_URL_QUERY), $query);
check($query['amount'] === '17.35', 'native USD order needs no FX');
$order = new OrderFixture(); $fx_age = 300000;
check($gateway->process_payment(1)['result'] === 'failure', 'stale FX rejects payment without marking paid');
$order = new OrderFixture(); $order->paid = true;
check($gateway->process_payment(1)['result'] === 'failure', 'paid orders cannot create another payment');
$order = new OrderFixture(); $order->currency = 'EUR';
check($gateway->process_payment(1)['result'] === 'failure', 'unsupported currency never silently converts');
$order = new OrderFixture(); $order->currency = 'USD'; $settings['sandbox'] = 'yes';
$result = $gateway->process_payment(1);
check(parse_url($result['redirect'], PHP_URL_HOST) === 'www.sandbox.paypal.com', 'sandbox option remains separate');
