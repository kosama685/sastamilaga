<?php
/**
 * Plugin Name: Sasta Milaga travel payment links
 * Description: Lets the travel team collect payment for a confirmed travel request with the SAME PayPal / card flow as the shop checkout
 * (WooCommerce PayPal Payments, PayPal JavaScript SDK buttons). On a request in Travel Ops → Requests & bookings, staff enter the confirmed
 * total in USD; this creates a pending WooCommerce order and a "pay for order" link to copy, send on WhatsApp or email as an invoice.
 * The customer pays on WooCommerce's order-pay page; when WooCommerce records the payment, the request moves to "Paid".
 * Customers also see unpaid travel payments with a "Pay now" button under My account → My travel requests.
 * No card or PayPal data touches this code; capture, webhooks and refunds stay with WooCommerce PayPal Payments.
 * Source of truth: kosama685/sastamilaga wordpress/mu-plugins/sm-travel-pay.php. Added 2026-11-21. Undo: delete this file (orders stay).
 *
 * @package SastaMilaga
 */

defined( 'ABSPATH' ) || exit;

const SMTP_PRODUCT_OPTION = 'smtp_travel_pay_product';
const SMTP_META_REQUEST   = '_sm_travel_request';
const SMTP_CURRENCY       = 'USD';   // PayPal does not settle PKR; travel payments are charged in USD like global items

/** A private, hidden, virtual product that carries travel payments (never listed, never in feeds). */
function smtp_product_id() {
	$id = (int) get_option( SMTP_PRODUCT_OPTION );
	if ( $id && ( $p = wc_get_product( $id ) ) && 'trash' !== $p->get_status() ) {
		return $id;
	}
	$p = new WC_Product_Simple();
	$p->set_name( 'Sasta Milaga travel booking' );
	$p->set_status( 'private' );
	$p->set_catalog_visibility( 'hidden' );
	$p->set_virtual( true );
	$p->set_regular_price( '0' );
	$p->set_tax_status( 'none' );
	$p->set_reviews_allowed( false );
	$p->update_meta_data( '_sm_travel_pay_only', 'yes' );
	$p->update_meta_data( '_wc_gla_visibility', 'dont-sync-and-show' );
	$id = (int) $p->save();
	update_option( SMTP_PRODUCT_OPTION, $id, false );
	return $id;
}

/** Orders created for a request, newest first. */
function smtp_orders_for( $request_id ) {
	if ( ! function_exists( 'wc_get_orders' ) ) {
		return array();
	}
	return wc_get_orders( array( 'limit' => 20, 'orderby' => 'date', 'order' => 'DESC', 'meta_key' => SMTP_META_REQUEST, 'meta_value' => (int) $request_id, 'status' => array_keys( wc_get_order_statuses() ) ) );
}

function smtp_wa_link( $phone, $text ) {
	$digits = preg_replace( '/\D+/', '', (string) $phone );
	if ( 0 === strpos( $digits, '00' ) ) {
		$digits = substr( $digits, 2 );
	} elseif ( 0 === strpos( $digits, '0' ) ) {
		$digits = '92' . substr( $digits, 1 );   // local Pakistani mobile number written as 03xx…
	}
	return $digits ? 'https://wa.me/' . $digits . '?text=' . rawurlencode( $text ) : '';
}

/* ---------- Staff: payment box on the request ---------- */

add_action( 'add_meta_boxes_smt_enquiry', function () {
	if ( current_user_can( 'manage_woocommerce' ) ) {
		add_meta_box( 'smtp-pay', 'Payment link (PayPal / card)', 'smtp_box', 'smt_enquiry', 'side', 'high' );
	}
} );

function smtp_box( $post ) {
	$orders = smtp_orders_for( $post->ID );
	echo '<style>#smtp-pay .smtp-o{border:1px solid #dcdcde;border-radius:8px;padding:8px;margin:0 0 8px}#smtp-pay .smtp-o b{display:block}#smtp-pay input[type=number],#smtp-pay input[type=text]{width:100%}#smtp-pay .smtp-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}#smtp-pay code{word-break:break-all;font-size:11px}</style>';
	if ( isset( $_GET['smtp'] ) ) {
		$msg = array( 'created' => 'Payment link created.', 'emailed' => 'Invoice email sent to the customer.', 'noemail' => 'No customer email on this request: copy the link or send it on WhatsApp.', 'bad' => 'Enter an amount between 1 and 100,000 USD.' )[ sanitize_key( wp_unslash( $_GET['smtp'] ) ) ] ?? '';
		if ( $msg ) {
			echo '<p style="background:#EAF6EE;padding:6px 8px;border-radius:6px">' . esc_html( $msg ) . '</p>';
		}
	}
	foreach ( $orders as $o ) {
		$url = $o->needs_payment() ? $o->get_checkout_payment_url() : '';
		echo '<div class="smtp-o"><b>Order #' . (int) $o->get_id() . ' · ' . wp_kses_post( wc_price( $o->get_total(), array( 'currency' => $o->get_currency() ) ) ) . '</b>Status: ' . esc_html( wc_get_order_status_name( $o->get_status() ) ) . ' · <a href="' . esc_url( $o->get_edit_order_url() ) . '">open order</a>';
		if ( $url ) {
			$text = 'Assalam o Alaikum! Your Sasta Milaga travel booking is confirmed for payment: ' . wp_strip_all_tags( wc_price( $o->get_total(), array( 'currency' => $o->get_currency() ) ) ) . '. Pay securely by PayPal or card here: ' . $url;
			$wa   = smtp_wa_link( get_post_meta( $post->ID, 'phone', true ), html_entity_decode( $text ) );
			echo '<div style="margin-top:6px"><code>' . esc_html( $url ) . '</code></div><div class="smtp-row"><button type="button" class="button button-small" onclick="navigator.clipboard.writeText(' . esc_attr( wp_json_encode( $url ) ) . ');this.textContent=\'Copied\'">Copy link</button>';
			if ( $wa ) {
				echo '<a class="button button-small" target="_blank" rel="noopener" href="' . esc_url( $wa ) . '">Send on WhatsApp</a>';
			}
			$mail = wp_nonce_url( admin_url( 'admin-post.php?action=smtp_email&req=' . $post->ID . '&order=' . $o->get_id() ), 'smtp_email_' . $o->get_id() );
			echo '<a class="button button-small" href="' . esc_url( $mail ) . '">Email invoice</a></div>';
		}
		echo '</div>';
	}
	$summary = (string) get_post_meta( $post->ID, 'summary', true );
	if ( '' === $summary ) {
		$summary = trim( (string) get_post_meta( $post->ID, 'destination', true ) . ' ' . (string) get_post_meta( $post->ID, 'visa_type', true ) );
	}
	wp_nonce_field( 'smtp_' . $post->ID, '_smtp_nonce' );
	echo '<p><label for="smtp-amount"><strong>Confirmed total (USD)</strong></label><input id="smtp-amount" type="number" name="smtp_amount" min="1" max="100000" step="0.01" placeholder="e.g. 245.00"></p>';
	echo '<p><label for="smtp-desc"><strong>What the customer pays for</strong></label><input id="smtp-desc" type="text" name="smtp_desc" maxlength="190" value="' . esc_attr( wp_trim_words( 'Travel booking: ' . ( $summary ? $summary : get_the_title( $post ) ), 24, '…' ) ) . '"></p>';
	/* The edit screen is one form with a hidden action=editpost near the top; this button's own name/value comes later, so PHP uses it. */
	echo '<p><button type="submit" class="button button-primary" name="action" value="smtp_create" formaction="' . esc_url( admin_url( 'admin-post.php' ) ) . '" formmethod="post">Create payment link</button></p>';
	echo '<p class="description">Only after the fare, availability and conditions are confirmed with the supplier. The customer pays on the same secure PayPal / card page as the shop checkout; the request moves to "Paid" automatically.</p>';
}

function smtp_guard( $request_id ) {
	if ( ! current_user_can( 'manage_woocommerce' ) || 'smt_enquiry' !== get_post_type( $request_id ) || ! isset( $_POST['_smtp_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['_smtp_nonce'] ) ), 'smtp_' . $request_id ) ) {
		wp_die( 'Not allowed', 403 );
	}
}
function smtp_back( $request_id, $flag ) {
	wp_safe_redirect( add_query_arg( 'smtp', $flag, get_edit_post_link( $request_id, 'url' ) ) );
	exit;
}

add_action( 'admin_post_smtp_create', function () {
	$request_id = (int) ( $_POST['post_ID'] ?? 0 );
	smtp_guard( $request_id );
	$amount = round( (float) wp_unslash( $_POST['smtp_amount'] ?? 0 ), 2 );
	if ( $amount < 1 || $amount > 100000 ) {
		smtp_back( $request_id, 'bad' );
	}
	$desc  = sanitize_text_field( wp_unslash( $_POST['smtp_desc'] ?? '' ) );
	$desc  = mb_substr( '' !== $desc ? $desc : 'Travel booking', 0, 190 ) . ' (request #' . $request_id . ')';
	$customer = (int) get_post_meta( $request_id, 'user_id', true );   // the requester's account, or 0 for a guest request
	if ( $customer && user_can( $customer, 'manage_woocommerce' ) ) {
		$customer = 0;   // request keyed in by staff (Travel Ops records the logged-in user): make it a guest order the customer can pay
	}
	$order    = wc_create_order( array( 'customer_id' => $customer, 'created_via' => 'sm-travel-pay' ) );
	/* An order created in an admin session is otherwise attached to the staff member, and the customer is then asked to log in as them. */
	$order->set_customer_id( $customer );
	$item  = new WC_Order_Item_Product();
	$item->set_product_id( smtp_product_id() );
	$item->set_name( $desc );
	$item->set_quantity( 1 );
	$item->set_subtotal( $amount );
	$item->set_total( $amount );
	$order->add_item( $item );
	$order->set_currency( SMTP_CURRENCY );
	$name = trim( (string) get_post_meta( $request_id, 'name', true ) );
	if ( '' !== $name ) {
		$parts = preg_split( '/\s+/', $name, 2 );
		$order->set_billing_first_name( $parts[0] );
		$order->set_billing_last_name( $parts[1] ?? '' );
	}
	$email = sanitize_email( (string) get_post_meta( $request_id, 'email', true ) );
	if ( $email ) {
		$order->set_billing_email( $email );
	}
	$order->set_billing_phone( sanitize_text_field( (string) get_post_meta( $request_id, 'phone', true ) ) );
	$order->set_billing_city( sanitize_text_field( (string) get_post_meta( $request_id, 'city', true ) ) );
	$order->update_meta_data( SMTP_META_REQUEST, $request_id );
	$order->calculate_totals( false );
	$order->set_status( 'pending' );
	$order->add_order_note( sprintf( 'Payment link created from travel request #%d by %s.', $request_id, wp_get_current_user()->user_login ) );
	$order->save();
	if ( $order->get_customer_id() !== $customer ) {   // a hook re-assigned it during save: put it back
		$order->set_customer_id( $customer );
		$order->save();
	}
	update_post_meta( $request_id, 'order', $order->get_id() );   // shown as "Order #…" in My travel requests (sm-travel-ops)
	smtp_back( $request_id, 'created' );
} );

add_action( 'admin_post_smtp_email', function () {
	$request_id = (int) ( $_GET['req'] ?? 0 );
	$order_id   = (int) ( $_GET['order'] ?? 0 );
	if ( ! current_user_can( 'manage_woocommerce' ) || ! check_admin_referer( 'smtp_email_' . $order_id ) ) {
		wp_die( 'Not allowed', 403 );
	}
	$order = wc_get_order( $order_id );
	if ( ! $order || (int) $order->get_meta( SMTP_META_REQUEST ) !== $request_id ) {
		wp_die( 'Order not found', 404 );
	}
	if ( ! $order->get_billing_email() ) {
		smtp_back( $request_id, 'noemail' );
	}
	$mails = WC()->mailer()->get_emails();
	if ( isset( $mails['WC_Email_Customer_Invoice'] ) ) {
		$mails['WC_Email_Customer_Invoice']->trigger( $order->get_id(), $order );
		$order->add_order_note( 'Payment link emailed to the customer (invoice).' );
	}
	smtp_back( $request_id, 'emailed' );
} );

/* ---------- Paid → request status ---------- */

foreach ( array( 'woocommerce_order_status_processing', 'woocommerce_order_status_completed' ) as $smtp_hook ) {
	add_action( $smtp_hook, function ( $order_id ) {
		$order = wc_get_order( $order_id );
		$req   = $order ? (int) $order->get_meta( SMTP_META_REQUEST ) : 0;
		if ( ! $req || 'smt_enquiry' !== get_post_type( $req ) ) {
			return;
		}
		if ( in_array( get_post_status( $req ), array( 'smt-new', 'smt-contacted', 'smt-docs' ), true ) ) {
			wp_update_post( array( 'ID' => $req, 'post_status' => 'smt-paid' ) );
		}
		update_post_meta( $req, 'order', $order->get_id() );
		$order->add_order_note( sprintf( 'Travel request #%d marked as paid.', $req ) );
	} );
}

/* ---------- Customer: unpaid travel payments under My travel requests ---------- */

add_action( 'woocommerce_account_travel-requests_endpoint', function () {
	$user = get_current_user_id();
	if ( ! $user ) {
		return;
	}
	$due = array_filter( wc_get_orders( array( 'customer_id' => $user, 'limit' => 20, 'status' => array( 'pending', 'failed' ), 'meta_key' => SMTP_META_REQUEST, 'meta_compare' => 'EXISTS' ) ), function ( $o ) {
		return $o->needs_payment();
	} );
	if ( ! $due ) {
		return;
	}
	echo '<h3 style="margin-top:24px">Payment due</h3><table class="shop_table shop_table_responsive"><thead><tr><th>Request</th><th>Amount</th><th></th></tr></thead><tbody>';
	foreach ( $due as $o ) {
		$items = $o->get_items();
		$first = $items ? reset( $items ) : null;
		echo '<tr><td data-title="Request">' . esc_html( $first ? $first->get_name() : 'Travel booking' ) . '</td><td data-title="Amount">' . wp_kses_post( wc_price( $o->get_total(), array( 'currency' => $o->get_currency() ) ) ) . '</td><td><a class="button" href="' . esc_url( $o->get_checkout_payment_url() ) . '">Pay now</a></td></tr>';
	}
	echo '</tbody></table><p>Secure payment by PayPal or card, the same as our shop checkout.</p>';
}, 20 );
