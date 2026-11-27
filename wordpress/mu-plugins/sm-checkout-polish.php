<?php
/**
 * Plugin Name: Sasta Milaga checkout spacing fixes
 * Description: Checkout page only. (1) The "Fill this form by voice" button can never become a cell of the two-column checkout grid
 * (it pushed billing to the right column and "Your order" to the bottom left; root fix in /assets/js/voice-fill.js, this is the safety net).
 * (2) Shipping options read left to right: radio, carrier and delivery time, then the price, instead of a right-aligned block with an
 * empty gap after the radio button. (3) The selected option is highlighted. Styles only; no checkout logic is touched.
 * Source of truth: kosama685/sastamilaga wordpress/mu-plugins/sm-checkout-polish.php. Added 2026-11-21. Undo: delete this file.
 *
 * @package SastaMilaga
 */

defined( 'ABSPATH' ) || exit;

add_action( 'wp_head', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_order_received_page() ) {
		return;
	}
	?>
<style id="sm-checkout-polish">
/* (1) the voice button stays inside the billing card; if it is ever a direct child of the grid, it spans the full row */
.woocommerce-checkout form.checkout > .sm-vf-fill { grid-column: 1 / -1; justify-self: start; }
.woocommerce-checkout .woocommerce-billing-fields > .sm-vf-fill { margin: 4px 0 16px; }

/* (2) shipping options: radio | carrier + delivery time | price */
.woocommerce-checkout #shipping_method { margin: 0; padding: 0; list-style: none; }
.woocommerce-checkout #shipping_method li { display: flex; align-items: center; gap: 12px; text-align: start; padding: 14px 16px; margin: 0; }
.woocommerce-checkout #shipping_method li + li { border-top: 1px solid rgba(15, 122, 59, .12); }
.woocommerce-checkout #shipping_method li > input[type="radio"] { flex: 0 0 auto; margin: 0; width: 18px; height: 18px; accent-color: #0F7A3B; }
.woocommerce-checkout #shipping_method li > label {
	flex: 1 1 auto; min-width: 0; margin: 0; cursor: pointer; text-align: start;
	display: grid; grid-template-columns: minmax(0, 1fr) auto; column-gap: 16px; row-gap: 2px; align-items: center;
	font-size: .95rem; line-height: 1.4; color: #12331f; font-weight: 600;
}
.woocommerce-checkout #shipping_method li > label .gdcs-checkout-estimate { grid-column: 2; grid-row: 1; text-align: end; white-space: nowrap; color: #0F7A3B; font-weight: 800; }
.woocommerce-checkout #shipping_method li > label .gdcs-checkout-payable { grid-column: 2; grid-row: 2; text-align: end; white-space: nowrap; font-size: .82rem; font-weight: 500; color: #5c6871; }
.woocommerce-checkout #shipping_method li > label > .woocommerce-Price-amount { grid-column: 2; grid-row: 1; text-align: end; white-space: nowrap; color: #0F7A3B; font-weight: 800; }
.woocommerce-checkout #shipping_method li > label > .sm-ship-name { grid-column: 1; grid-row: 1 / span 2; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.woocommerce-checkout #shipping_method li > label > .sm-ship-name b { font-weight: 700; color: #12331f; }
.woocommerce-checkout #shipping_method li > label > .sm-ship-name small { font-weight: 500; font-size: .84rem; color: #5c6871; }
/* (3) selected option */
.woocommerce-checkout #shipping_method li:has(> input:checked) { background: #EAF6EE; box-shadow: inset 3px 0 0 #0F7A3B; }
.woocommerce-checkout #shipping_method li:hover { background: #f4faf6; }
.woocommerce-checkout #shipping_method li:has(> input:checked):hover { background: #EAF6EE; }
.woocommerce-checkout #shipping_method li > input:focus-visible { outline: 3px solid #FF8A00; outline-offset: 2px; }
@media (max-width: 560px) {
	.woocommerce-checkout #shipping_method li { padding: 12px; gap: 10px; }
	.woocommerce-checkout #shipping_method li > label { column-gap: 10px; font-size: .9rem; }
	/* phones: carrier and estimate across the full width, prices on the row below */
	.woocommerce-checkout #shipping_method li > label > .sm-ship-name { grid-column: 1 / -1; grid-row: 1; }
	.woocommerce-checkout #shipping_method li > label > .sm-ship-name ~ .gdcs-checkout-estimate { grid-column: 1; grid-row: 2; text-align: start; margin-top: 4px; }
	.woocommerce-checkout #shipping_method li > label > .sm-ship-name ~ .gdcs-checkout-payable { grid-column: 2; grid-row: 2; margin-top: 4px; }
}
</style>
	<?php
}, 99 );

/* Supplier shipping labels arrive as "CJPacket Eub — Supplier estimate: 14-26 days: <prices>". Show the carrier in bold with the
   delivery estimate on its own line. Re-applied after WooCommerce redraws the shipping block (updated_checkout). Other labels untouched. */
add_action( 'wp_footer', function () {
	if ( ! function_exists( 'is_checkout' ) || ! is_checkout() || is_order_received_page() ) {
		return;
	}
	?>
<script id="sm-checkout-polish-js" bv-exclude="true" data-cfasync="false">
(function () {
	function tidy() {
		document.querySelectorAll('#shipping_method li > label').forEach(function (l) {
			var t = l.firstChild; if (!t || t.nodeType !== 3) return;
			var m = t.nodeValue.match(/^\s*(.+?)\s+[—-]\s+Supplier estimate:\s*(.+?)\s*:?\s*$/); if (!m) return;
			var w = document.createElement('span'); w.className = 'sm-ship-name';
			var b = document.createElement('b'); b.textContent = m[1];
			var s = document.createElement('small'); s.textContent = 'Delivery estimate: ' + m[2].replace(/(\d)-(\d)/, '$1–$2') + ' (supplier estimate)';
			w.appendChild(b); w.appendChild(s); l.replaceChild(w, t);
		});
	}
	tidy();
	document.addEventListener('DOMContentLoaded', tidy);
	if (window.jQuery) { window.jQuery(document.body).on('updated_checkout updated_shipping_method', tidy); }
})();
</script>
	<?php
}, 99 );
