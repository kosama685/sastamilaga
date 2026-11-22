<?php
/**
 * Plugin Name: Sasta Milaga static cart bridge
 * Description: The storefront's cart and checkout run in the browser on the static site (sastamilaga.com/#/cart and /#/checkout: cash on
 * delivery in Pakistan, bank transfer, PayPal or a debit / credit card through a PayPal payment link; every order is recorded in Formspree).
 * WordPress still answers /cart/ and /checkout/ on this domain. When the WooCommerce cart is empty, those two pages now forward to the static
 * cart / checkout instead of showing "Your cart is currently empty" (old links, bookmarks, PayPal "cancel" returns, browser reloads).
 * Untouched: a non-empty WooCommerce cart, WooCommerce endpoints (order-pay, order-received: travel payment links and flight bookings),
 * logged-in shop managers, wp-admin, AJAX and REST.
 * Source of truth: kosama685/sastamilaga wordpress/mu-plugins/sm-static-cart-bridge.php. Added 2026-11-22 (owner request: static shop first).
 * Undo: delete this file.
 *
 * @package SastaMilaga
 */

defined( 'ABSPATH' ) || exit;

add_action( 'template_redirect', function () {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) || ! function_exists( 'is_cart' ) ) {
		return;
	}
	$is_checkout = function_exists( 'is_checkout' ) && is_checkout();
	if ( ! is_cart() && ! $is_checkout ) {
		return;
	}
	if ( function_exists( 'is_wc_endpoint_url' ) && ( is_wc_endpoint_url( 'order-pay' ) || is_wc_endpoint_url( 'order-received' ) ) ) {
		return;   // payment links (travel, flights) and WooCommerce thank-you pages
	}
	if ( isset( $_GET['pay_for_order'] ) || isset( $_GET['key'] ) || isset( $_GET['wc-ajax'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		return;
	}
	if ( current_user_can( 'manage_woocommerce' ) ) {
		return;   // staff keep the WooCommerce pages
	}
	if ( function_exists( 'WC' ) && WC()->cart && ! WC()->cart->is_empty() ) {
		return;   // a real WooCommerce cart (e.g. a staff payment link in progress) stays in WooCommerce
	}
	nocache_headers();
	wp_safe_redirect( home_url( '/#/' . ( $is_checkout ? 'checkout' : 'cart' ) ), 302, 'Sasta Milaga static cart bridge' );
	exit;
}, 1 );
