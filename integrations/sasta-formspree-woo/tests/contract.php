<?php
declare(strict_types=1);
define('ABSPATH', __DIR__);
require dirname(__DIR__) . '/includes/Signature.php';
use Sasta\FormspreeOrders\Signature;
function check(bool $condition, string $message): void {
    if (!$condition) { fwrite(STDERR, "FAIL: $message\n"); exit(1); }
}
$secret='formspree-test-secret-that-is-not-production';
$now=1794820000; $t=(string)$now;
$body='{"form":"xwvzzjdl","submission":{"order_id":"SM-AB123","full_name":"Example","phone":"000000000","address":"Example address","order_items":"1 x Widget"}}';
$sign=hash_hmac('sha256', $t.'.'.$body, $secret);
check(Signature::verify($secret, 't='.$t.',v1='.$sign, $body, $now), 'valid HMAC accepted');
check(Signature::verify($secret, 'v1='.$sign.', t='.$t, $body, $now), 'header order flexible');
check(!Signature::verify($secret, 't='.$t.',v1='.$sign, $body.' ', $now), 'altered raw bytes rejected');
check(!Signature::verify($secret, 't='.$t.',v1='.$sign, $body, $now+301), 'stale signature rejected');
check(!Signature::verify('wrong-secret', 't='.$t.',v1='.$sign, $body, $now), 'wrong secret rejected');
check(!Signature::verify($secret, '', $body, $now), 'unsigned request rejected');
check(!Signature::verify($secret, 't='.$t.',v1=malformed', $body, $now), 'malformed signature rejected');
check(!Signature::verify($secret, 't='.$t.',v1='.$sign, str_repeat('x',131073), $now), 'large request rejected');
check(Signature::money('PKR 1,250')===1250.0, 'PKR quote');
check(Signature::money('Rs. 250.50')===250.50, 'Rs quote');
check(Signature::money('USD 250')===null, 'foreign currency not PKR');
check(Signature::money('250')===null, 'ambiguous quote not PKR');
check(Signature::money('PKR -1')===null, 'negative quote rejected');
check(Signature::money('PKR 200000000')===null, 'oversized quote rejected');
$code=file_get_contents(dirname(__DIR__) . '/sasta-formspree-woo.php');
check(str_contains($code, "set_status('pending')"), 'pending status required');
check(str_contains($code, "set_created_via('sasta-formspree')"), 'source marked');
check(str_contains($code, '_sasta_fs_payment_unverified'), 'payment unverified metadata');
check(!str_contains($code, 'set_paid('), 'never mark paid');
check(!str_contains($code, 'payment_complete('), 'never complete payment');
check(!str_contains($code, 'reduce_order_stock('), 'never reduce stock');
check(str_contains(file_get_contents(dirname(__DIR__).'/includes/Signature.php'), 'hash_equals'), 'constant-time verification');
echo "PASS: 21 signature, currency and safety assertions\n";
