<?php
declare(strict_types=1);
namespace Sasta\FormspreeOrders;
defined('ABSPATH') || exit;

/**
 * Verify Formspree-Signature exactly as documented:
 * HMAC-SHA256(secret, "<unix-timestamp>.<unmodified-raw-body>").
 */
final class Signature {
    public static function verify(string $secret, string $header, string $raw, ?int $now = null): bool {
        if (strlen($secret) < 16 || $header === '' || $raw === '' || strlen($raw) > 131072) {
            return false;
        }
        if (!preg_match('/(?:^|,)\s*t=([0-9]{9,12})\s*(?:,|$)/', $header, $t)) {
            return false;
        }
        if (!preg_match('/(?:^|,)\s*v1=([a-fA-F0-9]{64})\s*(?:,|$)/', $header, $sig)) {
            return false;
        }
        $timestamp = (int) $t[1];
        $now = $now ?? time();
        if (abs($now - $timestamp) > 300) {
            return false;
        }
        $expected = hash_hmac('sha256', $t[1] . '.' . $raw, $secret);
        return hash_equals($expected, strtolower($sig[1]));
    }
    public static function money(?string $text): ?float {
        if ($text === null || $text === '') {
            return null;
        }
        // The static checkout labels its local quote with PKR or Rs; other
        // currencies and unspecified strings require human review.
        if (!preg_match('/(?:^|\s)(?:PKR|Rs\.?|₨)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/iu', trim($text), $m)) {
            return null;
        }
        $amount = (float) str_replace(',', '', $m[1]);
        return is_finite($amount) && $amount >= 0 && $amount <= 100000000 ? $amount : null;
    }
}
