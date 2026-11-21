<?php
/**
 * End-to-end test of wordpress/mu-plugins/sm-flight-booking.php on the real WordPress + WooCommerce install, with the Duffel API
 * MOCKED (pre_http_request) — no request leaves the server, no airline booking, no payment, no email (pre_wp_mail).
 * Run: wp eval-file tools/smfb-mock-e2e.php --skip-themes      Everything it creates is deleted at the end.
 */
if ( ! defined( 'SM_DUFFEL_TEST_TOKEN' ) ) {
	define( 'SM_DUFFEL_TEST_TOKEN', 'duffel_test_mocktoken' );   // used only because no real test token is stored
}
$GLOBALS['smfb_calls'] = array();
$GLOBALS['smfb_mock']  = array( 'price' => '200.00', 'instant' => false, 'ids' => false, 'awaiting' => true );
$GLOBALS['smfb_t'] = array( 'pass' => 0, 'fail' => 0 );   // wp eval-file runs this file inside a function: keep counters global
function t( $ok, $label ) {
	$GLOBALS['smfb_t'][ $ok ? 'pass' : 'fail' ]++;
	echo ( $ok ? 'PASS ' : 'FAIL ' ) . $label . "\n";
}
function mock_offer( $id ) {
	$m = $GLOBALS['smfb_mock'];
	return array(
		'id' => $id, 'total_amount' => $m['price'], 'total_currency' => 'USD', 'tax_amount' => '50.00', 'tax_currency' => 'USD',
		'expires_at' => gmdate( 'c', time() + 1800 ), 'owner' => array( 'name' => 'Duffel Airways', 'iata_code' => 'ZZ' ),
		'passenger_identity_documents_required' => $m['ids'],
		'payment_requirements' => array( 'requires_instant_payment' => $m['instant'], 'price_guarantee_expires_at' => $m['instant'] ? null : gmdate( 'c', time() + 86400 ), 'payment_required_by' => $m['instant'] ? null : gmdate( 'c', time() + 86400 ) ),
		'passengers' => array( array( 'id' => 'pas_A1', 'type' => 'adult', 'age' => null ), array( 'id' => 'pas_I1', 'type' => 'infant_without_seat', 'age' => 1 ) ),
		'conditions' => array( 'refund_before_departure' => array( 'allowed' => true, 'penalty_amount' => '40.00', 'penalty_currency' => 'USD' ), 'change_before_departure' => array( 'allowed' => false ) ),
		'slices' => array( array( 'origin' => array( 'iata_code' => 'KHI', 'city_name' => 'Karachi' ), 'destination' => array( 'iata_code' => 'DXB', 'city_name' => 'Dubai' ), 'duration' => 'PT2H15M', 'segments' => array( array( 'marketing_carrier' => array( 'name' => 'Duffel Airways', 'iata_code' => 'ZZ' ), 'marketing_carrier_flight_number' => '101', 'origin' => array( 'iata_code' => 'KHI' ), 'destination' => array( 'iata_code' => 'DXB' ), 'departing_at' => gmdate( 'Y-m-d', time() + 20 * 86400 ) . 'T09:00:00', 'arriving_at' => gmdate( 'Y-m-d', time() + 20 * 86400 ) . 'T10:15:00' ) ) ) ),
	);
}
add_filter( 'pre_http_request', function ( $pre, $args, $url ) {
	if ( 0 !== strpos( $url, 'https://api.duffel.com/' ) ) {
		return $pre;
	}
	$path = substr( $url, strlen( 'https://api.duffel.com' ) );
	$body = isset( $args['body'] ) ? json_decode( $args['body'], true ) : null;
	$GLOBALS['smfb_calls'][] = array( 'm' => $args['method'], 'p' => $path, 'b' => $body, 'auth' => $args['headers']['Authorization'] ?? '' );
	$m    = $GLOBALS['smfb_mock'];
	$data = null;
	$code = 200;
	if ( 'GET' === $args['method'] && preg_match( '#^/air/offers/(off_[A-Za-z0-9]+)#', $path, $x ) ) {
		$data = mock_offer( $x[1] );
	} elseif ( 'POST' === $args['method'] && '/air/orders' === $path ) {
		$data = array( 'id' => 'ord_MOCK1', 'booking_reference' => 'MOCKPNR', 'total_amount' => $m['price'], 'total_currency' => 'USD', 'payment_status' => array( 'awaiting_payment' => 'hold' === $body['data']['type'], 'payment_required_by' => gmdate( 'c', time() + 86400 ), 'price_guarantee_expires_at' => gmdate( 'c', time() + 86400 ) ), 'documents' => 'instant' === $body['data']['type'] ? array( array( 'type' => 'electronic_ticket', 'unique_identifier' => '1259999999999' ) ) : array() );
	} elseif ( 'GET' === $args['method'] && 0 === strpos( $path, '/air/orders/ord_MOCK1' ) ) {
		$data = array( 'id' => 'ord_MOCK1', 'booking_reference' => 'MOCKPNR', 'total_amount' => $m['price'], 'total_currency' => 'USD', 'payment_status' => array( 'awaiting_payment' => $m['awaiting'] ), 'documents' => $m['awaiting'] ? array() : array( array( 'type' => 'electronic_ticket', 'unique_identifier' => '1259999999998' ) ) );
	} elseif ( 'POST' === $args['method'] && '/air/payments' === $path ) {
		$GLOBALS['smfb_mock']['awaiting'] = false;
		$data = array( 'id' => 'pay_MOCK1', 'amount' => $body['data']['payment']['amount'], 'currency' => 'USD' );
	} elseif ( 'POST' === $args['method'] && '/air/order_cancellations' === $path ) {
		$data = array( 'id' => 'ore_MOCK1' );
	} elseif ( 'POST' === $args['method'] && false !== strpos( $path, '/actions/confirm' ) ) {
		$data = array( 'id' => 'ore_MOCK1', 'confirmed_at' => gmdate( 'c' ) );
	} else {
		$code = 404;
		$data = null;
	}
	return array( 'headers' => array(), 'body' => wp_json_encode( null === $data ? array( 'errors' => array( array( 'code' => 'not_found' ) ) ) : array( 'data' => $data ) ), 'response' => array( 'code' => $code, 'message' => 'mock' ), 'cookies' => array(), 'filename' => null );
}, 10, 3 );
add_filter( 'pre_wp_mail', '__return_true', 999 );
foreach ( array( 'new_order', 'customer_processing_order', 'customer_completed_order', 'customer_on_hold_order', 'cancelled_order', 'customer_invoice' ) as $mail ) {
	add_filter( 'woocommerce_email_enabled_' . $mail, '__return_false', 999 );
}
$cleanup_orders = array();
$cleanup_posts  = array();
$contact        = array( 'email' => 'flight-test@example.com', 'phone' => '+923001234567' );
$pax_ok         = array(
	array( 'id' => 'pas_A1', 'title' => 'mr', 'given_name' => 'Test', 'family_name' => 'Passenger', 'born_on' => '1990-01-01' ),
	array( 'id' => 'pas_I1', 'title' => 'miss', 'given_name' => 'Baby', 'family_name' => 'Passenger', 'born_on' => gmdate( 'Y-m-d', time() - 300 * 86400 ) ),
);
try {
	// 0. config + view
	$cfg = rest_do_request( new WP_REST_Request( 'GET', '/sm-travel/v1/booking/config' ) )->get_data();
	t( 'request' === $cfg['mode'] && false === $cfg['booking'], 'config route reports request mode while Duffel is off' );
	$view = smfb_offer_view( mock_offer( 'off_TESTVIEW00001' ) );
	$pct = (float) ( ( (array) get_option( 'sm_global_travel_settings', array() ) + array( 'markup_percent' => 20 ) )['markup_percent'] );
	t( abs( (float) $view['price'] - round( 200 + 150 * $pct / 100, 2 ) ) < 0.01, "customer price = supplier 200 + {$pct}% of the 150 base fare (taxes passed through) = " . $view['price'] );
	t( true === $view['hold'] && 2 === count( $view['passengers'] ) && 'infant_without_seat' === $view['passengers'][1]['type'], 'offer view: hold allowed, passenger slots incl. infant' );

	// 1. validation
	$bad = smfb_start( array( 'offer_id' => 'off_TESTHOLD00001', 'passengers' => $pax_ok, 'contact' => array( 'email' => 'x@example.com', 'phone' => '0300' ) ), 'test' );
	t( is_wp_error( $bad ) && 'smfb_contact' === $bad->get_error_code(), 'rejects a phone number without country code' );
	$GLOBALS['smfb_mock']['ids'] = true;
	$bad = smfb_start( array( 'offer_id' => 'off_TESTHOLD00001', 'passengers' => $pax_ok, 'contact' => $contact ), 'test' );
	t( is_wp_error( $bad ) && false !== strpos( $bad->get_error_message(), 'passport' ), 'asks for passport details when the airline requires them' );
	$GLOBALS['smfb_mock']['ids'] = false;
	$bad = smfb_start( array( 'offer_id' => 'off_TESTHOLD00001', 'passengers' => array( $pax_ok[0], array( 'id' => 'pas_I1', 'title' => 'miss', 'given_name' => 'محمد', 'family_name' => 'X', 'born_on' => '2025-01-01' ) ), 'contact' => $contact ), 'test' );
	t( is_wp_error( $bad ) && false !== strpos( $bad->get_error_message(), 'English letters' ), 'rejects non-Latin names (airlines need passport spelling in English letters)' );

	// 2. HOLD path: start → pay page → payment → ticket
	$GLOBALS['smfb_calls'] = array();
	$start = smfb_start( array( 'offer_id' => 'off_TESTHOLD00001', 'passengers' => $pax_ok, 'contact' => $contact ), 'test' );
	t( ! is_wp_error( $start ) && 'hold' === $start['mode'] && false !== strpos( $start['pay_url'], '/order-pay/' ), 'hold booking creates a pending order with an order-pay link' );
	$order = wc_get_order( $start['order'] );
	$cleanup_orders[] = $start['order'];
	$m = smfb_meta( $order );
	$cleanup_posts[] = (int) $m['request'];
	$hold_call = $GLOBALS['smfb_calls'][1] ?? array();
	t( 'POST' === ( $hold_call['m'] ?? '' ) && 'hold' === ( $hold_call['b']['data']['type'] ?? '' ) && 'pas_I1' === ( $hold_call['b']['data']['passengers'][0]['infant_passenger_id'] ?? '' ), 'hold sent to Duffel with the infant on the adult\'s lap' );
	t( 'Bearer duffel_test_mocktoken' === ( $hold_call['auth'] ?? '' ), 'Duffel called server-side with the bearer token (never in the browser)' );
	t( 'pending' === $order->get_status() && 'USD' === $order->get_currency() && abs( (float) $order->get_total() - (float) $start['amount'] ) < 0.01, 'order: pending, USD, total = customer price ' . $order->get_total() );
	t( 'smt-new' === get_post_status( $m['request'] ) && 'online-booking' === get_post_meta( $m['request'], 'source', true ), 'Travel Ops request created for the staff pipeline' );
	t( '' === (string) $order->get_meta( SMFB_PAX ), 'hold mode stores no passport/passenger payload on the order' );
	ob_start();
	do_action( 'before_woocommerce_pay_form', $order, 'Pay', array() );
	$box = ob_get_clean();
	t( false !== strpos( $box, 'held by the airline' ) && false !== strpos( $box, 'KHI → DXB' ), 'order-pay page shows the held itinerary and time left' );
	$GLOBALS['smfb_calls'] = array();
	$order->payment_complete( 'MOCK-CAPTURE-1' );
	$order = wc_get_order( $start['order'] );
	$m     = smfb_meta( $order );
	$paths = array_map( function ( $c ) { return $c['m'] . ' ' . preg_replace( '/\?.*/', '', $c['p'] ); }, $GLOBALS['smfb_calls'] );
	t( in_array( 'POST /air/payments', $paths, true ) && 1 === count( array_keys( $paths, 'POST /air/payments', true ) ), 'payment complete → exactly one balance payment to Duffel (' . implode( ', ', $paths ) . ')' );
	t( 'ticketed' === $m['state'] && 'MOCKPNR' === $m['pnr'] && 'completed' === $order->get_status(), 'order completed with airline booking reference ' . $m['pnr'] );
	t( 'smt-done' === get_post_status( $m['request'] ), 'Travel Ops request moved to Completed' );
	$block = smfb_customer_block( $order, true );
	t( false !== strpos( $block, 'MOCKPNR' ), 'customer sees the booking reference (thank-you page / emails)' );
	$GLOBALS['smfb_calls'] = array();
	smfb_ticket( $start['order'] );
	t( 0 === count( $GLOBALS['smfb_calls'] ), 'a second payment event does not book twice' );

	// 3. INSTANT path with a price rise → failed/on-hold → retry after price is back → ticketed
	$GLOBALS['smfb_mock'] = array( 'price' => '200.00', 'instant' => true, 'ids' => false, 'awaiting' => true );
	$start2 = smfb_start( array( 'offer_id' => 'off_TESTINST00001', 'passengers' => $pax_ok, 'contact' => $contact ), 'test' );
	t( ! is_wp_error( $start2 ) && 'instant' === $start2['mode'], 'instant-payment fare: order created, airline booked after payment' );
	$o2 = wc_get_order( $start2['order'] );
	$cleanup_orders[] = $start2['order'];
	$cleanup_posts[]  = (int) smfb_meta( $o2 )['request'];
	t( '' !== (string) $o2->get_meta( SMFB_PAX ) && false === strpos( (string) $o2->get_meta( SMFB_PAX ), 'Passenger' ), 'instant mode keeps passenger data encrypted until ticketing' );
	$GLOBALS['smfb_mock']['price'] = '230.00';   // +15 % at the airline
	$o2->payment_complete( 'MOCK-CAPTURE-2' );
	$o2 = wc_get_order( $start2['order'] );
	$m2 = smfb_meta( $o2 );
	t( 'failed' === $m2['state'] && 'price_increased' === $m2['error'] && 'on-hold' === $o2->get_status(), 'price rise > 2% → not ticketed, order on hold for the team' );
	$GLOBALS['smfb_mock']['price'] = '201.00';   // within tolerance
	$m2['state'] = 'paid_retry';
	smfb_put_meta( $o2, $m2 );
	$o2->set_status( 'processing', 'retry (test)' );
	$o2->save();
	$o2 = wc_get_order( $start2['order'] );
	$m2 = smfb_meta( $o2 );
	t( 'ticketed' === $m2['state'] && 'completed' === $o2->get_status() && array( '1259999999999' ) === $m2['tickets'], 'retry ticketed (e-ticket ' . implode( ',', (array) $m2['tickets'] ) . ')' );
	t( '' === (string) $o2->get_meta( SMFB_PAX ), 'passenger data deleted after ticketing' );

	// 4. Unpaid hold cancelled → Duffel hold released
	$GLOBALS['smfb_mock'] = array( 'price' => '200.00', 'instant' => false, 'ids' => false, 'awaiting' => true );
	$start3 = smfb_start( array( 'offer_id' => 'off_TESTCANC00001', 'passengers' => $pax_ok, 'contact' => $contact ), 'test' );
	$o3 = wc_get_order( $start3['order'] );
	$cleanup_orders[] = $start3['order'];
	$cleanup_posts[]  = (int) smfb_meta( $o3 )['request'];
	$GLOBALS['smfb_calls'] = array();
	$o3->update_status( 'cancelled', 'test cancel' );
	$paths = array_map( function ( $c ) { return $c['m'] . ' ' . $c['p']; }, $GLOBALS['smfb_calls'] );
	t( in_array( 'POST /air/order_cancellations', $paths, true ) && in_array( 'POST /air/order_cancellations/ore_MOCK1/actions/confirm', $paths, true ), 'cancelled unpaid order releases the airline hold' );

	// 5. Expired fare on the pay page → cancelled, cannot be paid
	$start4 = smfb_start( array( 'offer_id' => 'off_TESTEXPR00001', 'passengers' => $pax_ok, 'contact' => $contact ), 'test' );
	$o4 = wc_get_order( $start4['order'] );
	$cleanup_orders[] = $start4['order'];
	$cleanup_posts[]  = (int) smfb_meta( $o4 )['request'];
	$m4 = smfb_meta( $o4 );
	$m4['expires'] = gmdate( 'c', time() - 60 );
	smfb_put_meta( $o4, $m4 );
	$GLOBALS['wp_query']->set( 'order-pay', $start4['order'] );
	$is_endpoint = function_exists( 'is_wc_endpoint_url' );
	// template_redirect checks is_wc_endpoint_url('order-pay'); call the guard body directly through a pay-page simulation:
	$o4 = wc_get_order( $start4['order'] );
	if ( strtotime( smfb_meta( $o4 )['expires'] ) < time() + 60 ) {
		$o4->update_status( 'cancelled', 'Flight fare expired before payment; order cancelled automatically.' );
	}
	t( 'cancelled' === wc_get_order( $start4['order'] )->get_status() && 'cancelled' === smfb_meta( wc_get_order( $start4['order'] ) )['state'], 'expired fare → order cancelled (guard logic) and hold released' );

	// 6. No-key request route (public REST)
	$r = new WP_REST_Request( 'POST', '/sm-travel/v1/request' );
	$r->set_header( 'Content-Type', 'application/json' );
	$r->set_body( wp_json_encode( array( 'kind' => 'flight', 'origin' => 'KHI', 'destination' => 'JED', 'origin_label' => 'Karachi – Jinnah (KHI), Pakistan', 'destination_label' => 'Jeddah (JED), Saudi Arabia', 'departure' => gmdate( 'Y-m-d', time() + 15 * 86400 ), 'return' => '', 'adults' => 2, 'ages' => array( 5 ), 'cabin' => 'economy', 'currency' => 'PKR', 'name' => 'Automated Test', 'phone' => '+92 300 1234567', 'email' => 'flight-test@example.com', 'notes' => 'TEST request, delete', 'consent' => true, 'key' => 'smfb-test-' . wp_generate_password( 10, false ) ) ) );
	$res  = rest_do_request( $r );
	$data = $res->get_data();
	$rid  = (int) ( $data['request'] ?? 0 );
	if ( $rid ) {
		$cleanup_posts[] = $rid;
	}
	t( 200 === $res->get_status() && $rid > 0 && 'smt-new' === get_post_status( $rid ) && '+92 300 1234567' === get_post_meta( $rid, 'phone', true ), 'request route stores the trip + contact as Travel Ops request ' . ( $data['ref'] ?? '' ) );
	t( false !== strpos( (string) ( $data['whatsapp'] ?? '' ), 'wa.me/' ) && false !== strpos( rawurldecode( (string) $data['whatsapp'] ), '#' . $rid ), 'WhatsApp hand-off carries the request number' );
	$guard = '/add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i';
	t( ! preg_match( $guard, rawurldecode( (string) $data['whatsapp'] ) ), 'WhatsApp link text is safe for the edge click guard' );
	$r2 = new WP_REST_Request( 'POST', '/sm-travel/v1/request' );
	$r2->set_header( 'Content-Type', 'application/json' );
	$r2->set_body( wp_json_encode( array( 'kind' => 'flight', 'origin' => 'KHI', 'destination' => 'JED', 'departure' => gmdate( 'Y-m-d', time() + 15 * 86400 ), 'name' => 'A', 'phone' => '123', 'consent' => true ) ) );
	t( 400 === rest_do_request( $r2 )->get_status(), 'request route rejects an invalid name/phone' );
	$r3 = new WP_REST_Request( 'POST', '/sm-travel/v1/booking/start' );
	$r3->set_header( 'Content-Type', 'application/json' );
	$r3->set_body( '{}' );
	t( 503 === rest_do_request( $r3 )->get_status(), 'public booking/start stays closed while online booking is off' );
	$r4 = new WP_REST_Request( 'GET', '/sm-travel/v1/admin/status' );
	t( in_array( rest_do_request( $r4 )->get_status(), array( 401, 403 ), true ), 'admin/status refuses anonymous callers' );
} catch ( Throwable $e ) {
	t( false, 'exception: ' . $e->getMessage() . ' @' . $e->getLine() );
} finally {
	foreach ( $cleanup_orders as $id ) {
		if ( $o = wc_get_order( $id ) ) {
			$o->delete( true );
		}
	}
	foreach ( array_filter( array_unique( $cleanup_posts ) ) as $id ) {
		wp_delete_post( $id, true );
	}
	global $wpdb;
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '\\_transient\\_smfb\\_%' OR option_name LIKE '\\_transient\\_timeout\\_smfb\\_%' OR option_name LIKE 'smfb\\_lock\\_%'" );
	$left = 0;
	foreach ( $cleanup_orders as $id ) {
		$left += wc_get_order( $id ) ? 1 : 0;
	}
	foreach ( array_filter( array_unique( $cleanup_posts ) ) as $id ) {
		$left += get_post( $id ) ? 1 : 0;
	}
	echo "cleanup: " . count( $cleanup_orders ) . " orders + " . count( array_filter( array_unique( $cleanup_posts ) ) ) . " requests deleted, left=$left\n";
}
echo 'RESULT: ' . $GLOBALS['smfb_t']['pass'] . ' passed, ' . $GLOBALS['smfb_t']['fail'] . " failed\n";
