<?php
/**
 * Plugin Name: Sasta Milaga flight booking (requests + Duffel + PayPal)
 * Description: Turns the /travel/ flight search into a complete booking journey that is paid with the SAME PayPal / card
 * JavaScript buttons as the shop checkout (WooCommerce PayPal Payments on the order-pay page).
 *
 *  Mode "request" (works without any supplier key): the search opens a short form, the trip and the customer's contact details
 *  become a Travel Ops request with a reference number, the team quotes and sends a payment link (sm-travel-pay.php).
 *  Mode "duffel" (needs a Duffel access token, see Settings → Flight booking): live airline offers; the customer picks a fare,
 *  enters passenger details, the fare is re-priced at Duffel and (when the airline allows it) HELD, a WooCommerce order is
 *  created in the fare's currency and the customer pays on the order-pay page. When WooCommerce records the payment, this file
 *  pays Duffel from the agency balance and stores the airline booking reference; anything unexpected puts the order on hold
 *  for the team (never a silent failure, never a second charge).
 *
 * Supplier tokens stay server-side, encrypted at rest in the option the existing Duffel settings page uses (sm-global-travel).
 * Routes (namespace sm-travel/v1): GET booking/config, GET booking/offer, POST booking/start, POST request,
 * GET admin/status, POST admin/settings (the last two need an administrator, e.g. a GitHub Actions application password).
 * Source of truth: kosama685/sastamilaga wordpress/mu-plugins/sm-flight-booking.php · docs/travel-booking.md. Added 2026-11-21.
 * Undo: delete this file (orders, requests and settings stay; the search falls back to the old WhatsApp hand-off).
 *
 * @package SastaMilaga
 */

defined( 'ABSPATH' ) || exit;

const SMFB_VERSION  = '1.0.0';
const SMFB_NS       = 'sm-travel/v1';
const SMFB_OPTION   = 'smfb_settings';
const SMFB_META     = '_smfb';
const SMFB_PAX      = '_smfb_pax';
const SMFB_API      = 'https://api.duffel.com';
const SMFB_TOLERANCE = 1.02;   // a supplier price may move up to 2% between payment and ticketing; more goes to the team
/** Currencies PayPal can charge (WooCommerce orders in other currencies cannot be paid with the PayPal / card buttons). */
const SMFB_PAYPAL_CURRENCIES = array( 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'JPY', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'MXN', 'MYR', 'PHP', 'THB', 'TWD', 'BRL' );

/* ====================================================================================================================
 * Settings and credentials
 * ================================================================================================================== */

function smfb_settings() {
	$s = get_option( SMFB_OPTION, array() );
	return ( is_array( $s ) ? $s : array() ) + array( 'booking_enabled' => 0, 'ack_balance' => 0, 'ack_paypal' => 0, 'last_test' => null );
}
function smfb_save_settings( array $changes ) {
	update_option( SMFB_OPTION, array_merge( smfb_settings(), $changes ), false );
}
function smfb_duffel_settings() {
	$s = get_option( 'sm_duffel_settings', array() );
	return is_array( $s ) ? $s : array();
}
/* Same AES-256-GCM format as SM_Duffel_Provider (sm-global-travel), so both read and write one stored token. */
function smfb_encrypt( $plain ) {
	if ( ! function_exists( 'openssl_encrypt' ) || '' === $plain ) {
		return '';
	}
	$iv  = random_bytes( 12 );
	$tag = '';
	$enc = openssl_encrypt( $plain, 'aes-256-gcm', hash( 'sha256', wp_salt( 'auth' ), true ), OPENSSL_RAW_DATA, $iv, $tag, '', 16 );
	return false === $enc ? '' : 'v2:' . base64_encode( $iv . $tag . $enc );
}
function smfb_decrypt( $cipher ) {
	if ( ! function_exists( 'openssl_decrypt' ) || 0 !== strpos( (string) $cipher, 'v2:' ) ) {
		return '';
	}
	$raw = base64_decode( substr( $cipher, 3 ), true );
	if ( ! is_string( $raw ) || strlen( $raw ) <= 28 ) {
		return '';
	}
	$plain = openssl_decrypt( substr( $raw, 28 ), 'aes-256-gcm', hash( 'sha256', wp_salt( 'auth' ), true ), OPENSSL_RAW_DATA, substr( $raw, 0, 12 ), substr( $raw, 12, 16 ), '' );
	return is_string( $plain ) ? $plain : '';
}
function smfb_token( $env ) {
	$s      = smfb_duffel_settings();
	$stored = (string) ( $s[ 'test' === $env ? 'test_token' : 'live_token' ] ?? '' );
	if ( '' === $stored ) {
		$const = 'test' === $env ? 'SM_DUFFEL_TEST_TOKEN' : 'SM_DUFFEL_LIVE_TOKEN';
		return defined( $const ) ? trim( (string) constant( $const ) ) : '';
	}
	return smfb_decrypt( $stored );
}
/** Live airline search is shown to the public (switches on the existing Settings → Duffel Travel API page). */
function smfb_search_on() {
	return class_exists( 'SM_Duffel_Provider' ) && SM_Duffel_Provider::public_search_enabled( 'flights' );
}
/** Online booking + payment for live offers (Settings → Flight booking, needs both owner confirmations). */
function smfb_booking_on() {
	$s = smfb_settings();
	return smfb_search_on() && ! empty( $s['booking_enabled'] ) && ! empty( $s['ack_balance'] ) && ! empty( $s['ack_paypal'] );
}

/* ====================================================================================================================
 * Small helpers
 * ================================================================================================================== */

function smfb_error( $code, $message, $status = 400, $extra = array() ) {
	return new WP_Error( $code, $message, array( 'status' => $status ) + $extra );
}
function smfb_nocache( $data, $status = 200 ) {
	$r = new WP_REST_Response( $data, $status );
	$r->header( 'Cache-Control', 'private, no-store, max-age=0' );
	return $r;
}
function smfb_ip_key( $scope ) {
	$ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_CF_CONNECTING_IP'] ?? ( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ) ) );
	return 'smfb_rl_' . sanitize_key( $scope ) . '_' . substr( hash_hmac( 'sha256', $ip, wp_salt( 'auth' ) ), 0, 24 );
}
/** True when this visitor already used $limit calls of $scope in the window. */
function smfb_limited( $scope, $limit, $window = 600 ) {
	$key   = smfb_ip_key( $scope );
	$count = (int) get_transient( $key );
	if ( $count >= $limit ) {
		return true;
	}
	set_transient( $key, $count + 1, $window );
	return false;
}
function smfb_round( $amount, $currency ) {
	return in_array( $currency, array( 'JPY', 'HUF', 'TWD' ), true ) ? (float) ceil( $amount ) : round( (float) $amount, 2 );
}
function smfb_valid_date( $d ) {
	return is_string( $d ) && preg_match( '/^\d{4}-\d{2}-\d{2}$/', $d ) && checkdate( (int) substr( $d, 5, 2 ), (int) substr( $d, 8, 2 ), (int) substr( $d, 0, 4 ) );
}
function smfb_iso( $t ) {
	return $t ? gmdate( 'c', is_numeric( $t ) ? (int) $t : strtotime( (string) $t ) ) : '';
}
function smfb_whatsapp( $text ) {
	$url = function_exists( 'sm_whatsapp_url' ) ? (string) sm_whatsapp_url( $text ) : '';
	return $url ? $url : 'https://wa.me/923432601806?text=' . rawurlencode( $text );
}
function smfb_staff_mail( $subject, array $lines, $order_or_post_url = '' ) {
	$to = (string) apply_filters( 'smfb_staff_email', get_option( 'admin_email' ) );
	if ( $to ) {
		wp_mail( $to, '[Travel] ' . $subject, implode( "\n", $lines ) . ( $order_or_post_url ? "\n\nOpen: " . $order_or_post_url : '' ) );
	}
}
/** Customer price for a Duffel offer: the existing markup rule (sm-global-travel), taxes passed through. */
function smfb_customer_price( array $offer ) {
	$total    = (float) ( $offer['total_amount'] ?? 0 );
	$tax      = is_numeric( $offer['tax_amount'] ?? null ) ? (float) $offer['tax_amount'] : null;
	$currency = strtoupper( (string) ( $offer['total_currency'] ?? 'USD' ) );
	$price    = class_exists( 'SM_Global_Travel' ) ? SM_Global_Travel::marked_up( $total, $tax ) : $total;
	return smfb_round( (float) apply_filters( 'smfb_customer_price', $price, $offer ), $currency );
}

/* ====================================================================================================================
 * Duffel client (server-side only; never returns supplier bodies to the browser)
 * ================================================================================================================== */

function smfb_duffel( $method, $path, $body = null, $env = 'live' ) {
	$token = smfb_token( $env );
	if ( '' === $token ) {
		return smfb_error( 'smfb_unconfigured', 'Online flight booking is not configured.', 503, array( 'supplier' => 'no_token' ) );
	}
	$args = array(
		'method'      => strtoupper( $method ),
		'timeout'     => 30,
		'redirection' => 0,
		'headers'     => array( 'Accept' => 'application/json', 'Content-Type' => 'application/json', 'Duffel-Version' => 'v2', 'Authorization' => 'Bearer ' . $token ),
	);
	if ( null !== $body ) {
		$args['body'] = wp_json_encode( array( 'data' => $body ) );
	}
	$res = wp_remote_request( SMFB_API . $path, $args );
	if ( is_wp_error( $res ) ) {
		return smfb_error( 'smfb_supplier', 'The airline system did not respond. Please try again.', 503, array( 'supplier' => 'network' ) );
	}
	$http = (int) wp_remote_retrieve_response_code( $res );
	$json = json_decode( (string) wp_remote_retrieve_body( $res ), true );
	if ( $http < 200 || $http >= 300 || ! is_array( $json ) ) {
		$first = is_array( $json ) && isset( $json['errors'][0] ) && is_array( $json['errors'][0] ) ? $json['errors'][0] : array();
		$code  = sanitize_key( (string) ( $first['code'] ?? ( 'http_' . $http ) ) );
		return smfb_error( 'smfb_supplier', 'The airline system could not complete this step.', $http >= 500 ? 502 : 409, array( 'supplier' => $code ? $code : 'http_' . $http, 'http' => $http ) );
	}
	return isset( $json['data'] ) && is_array( $json['data'] ) ? $json['data'] : array();
}
function smfb_get_offer( $offer_id, $env ) {
	if ( ! is_string( $offer_id ) || ! preg_match( '/^off_[A-Za-z0-9]{8,64}$/', $offer_id ) ) {
		return smfb_error( 'smfb_offer', 'This fare is not valid. Please search again.', 400 );
	}
	return smfb_duffel( 'GET', '/air/offers/' . rawurlencode( $offer_id ) . '?return_available_services=false', null, $env );
}
function smfb_pax_type( array $p ) {
	$type = (string) ( $p['type'] ?? '' );
	if ( '' !== $type ) {
		return $type;
	}
	$age = isset( $p['age'] ) ? (int) $p['age'] : 30;
	return $age < 2 ? 'infant_without_seat' : ( $age < 12 ? 'child' : 'adult' );
}
/** What the browser may see about an offer: itinerary, rules, the customer price and the passenger slots to fill. */
function smfb_offer_view( array $o ) {
	$slices   = array();
	$carriers = array();
	foreach ( (array) ( $o['slices'] ?? array() ) as $s ) {
		$segs = array();
		foreach ( (array) ( $s['segments'] ?? array() ) as $g ) {
			$carrier = sanitize_text_field( $g['marketing_carrier']['name'] ?? ( $g['operating_carrier']['name'] ?? '' ) );
			if ( $carrier ) {
				$carriers[ $carrier ] = true;
			}
			$segs[] = array(
				'carrier' => $carrier,
				'flight'  => sanitize_text_field( ( $g['marketing_carrier']['iata_code'] ?? '' ) . ( $g['marketing_carrier_flight_number'] ?? '' ) ),
				'from'    => sanitize_text_field( $g['origin']['iata_code'] ?? '' ),
				'to'      => sanitize_text_field( $g['destination']['iata_code'] ?? '' ),
				'dep'     => sanitize_text_field( $g['departing_at'] ?? '' ),
				'arr'     => sanitize_text_field( $g['arriving_at'] ?? '' ),
			);
		}
		$slices[] = array(
			'from'     => sanitize_text_field( $s['origin']['iata_code'] ?? '' ),
			'to'       => sanitize_text_field( $s['destination']['iata_code'] ?? '' ),
			'fromName' => sanitize_text_field( $s['origin']['city_name'] ?? ( $s['origin']['name'] ?? '' ) ),
			'toName'   => sanitize_text_field( $s['destination']['city_name'] ?? ( $s['destination']['name'] ?? '' ) ),
			'duration' => sanitize_text_field( $s['duration'] ?? '' ),
			'segments' => $segs,
		);
	}
	$rule = static function ( $r ) {
		if ( ! is_array( $r ) ) {
			return null;
		}
		return array( 'allowed' => ! empty( $r['allowed'] ), 'penalty' => is_numeric( $r['penalty_amount'] ?? null ) ? (float) $r['penalty_amount'] : null, 'currency' => sanitize_text_field( $r['penalty_currency'] ?? '' ) );
	};
	$currency = strtoupper( sanitize_text_field( $o['total_currency'] ?? '' ) );
	$expires  = strtotime( (string) ( $o['expires_at'] ?? '' ) );
	$req      = (array) ( $o['payment_requirements'] ?? array() );
	$pax      = array();
	foreach ( (array) ( $o['passengers'] ?? array() ) as $p ) {
		$pax[] = array( 'id' => sanitize_text_field( $p['id'] ?? '' ), 'type' => smfb_pax_type( (array) $p ), 'age' => isset( $p['age'] ) ? (int) $p['age'] : null );
	}
	return array(
		'id'                  => sanitize_text_field( $o['id'] ?? '' ),
		'price'               => smfb_customer_price( $o ),
		'currency'            => $currency,
		'expiresAt'           => $expires ? smfb_iso( $expires ) : '',
		'hold'                => empty( $req['requires_instant_payment'] ),
		'priceGuaranteeUntil' => ! empty( $req['price_guarantee_expires_at'] ) ? smfb_iso( $req['price_guarantee_expires_at'] ) : null,
		'idsRequired'         => ! empty( $o['passenger_identity_documents_required'] ),
		'passengers'          => $pax,
		'slices'              => $slices,
		'carriers'            => array_keys( $carriers ),
		'owner'               => sanitize_text_field( $o['owner']['name'] ?? '' ),
		'refund'              => $rule( $o['conditions']['refund_before_departure'] ?? null ),
		'change'              => $rule( $o['conditions']['change_before_departure'] ?? null ),
		'bookable'            => in_array( $currency, SMFB_PAYPAL_CURRENCIES, true ) && $expires && $expires > time() + 90,
	);
}
/** "KHI → DXB · Fri 5 Dec 2026 · return Fri 12 Dec 2026 · Emirates" */
function smfb_trip_line( array $view ) {
	$first = $view['slices'][0] ?? array();
	$dep   = isset( $first['segments'][0]['dep'] ) ? strtotime( $first['segments'][0]['dep'] ) : 0;
	$line  = ( $first['from'] ?? '' ) . ' → ' . ( $first['to'] ?? '' ) . ( $dep ? ' · ' . gmdate( 'D j M Y', $dep ) : '' );
	if ( isset( $view['slices'][1]['segments'][0]['dep'] ) ) {
		$line .= ' · return ' . gmdate( 'D j M Y', strtotime( $view['slices'][1]['segments'][0]['dep'] ) );
	}
	return $line . ( $view['carriers'] ? ' · ' . implode( ', ', array_slice( $view['carriers'], 0, 2 ) ) : '' );
}

/* ====================================================================================================================
 * Passenger validation (what airlines need: names as in the passport, date of birth, contact; passport when required)
 * ================================================================================================================== */

function smfb_passengers( $input, array $offer, array $contact ) {
	$slots = (array) ( $offer['passengers'] ?? array() );
	if ( ! is_array( $input ) || ! $slots || count( $input ) !== count( $slots ) ) {
		return smfb_error( 'smfb_passengers', 'Enter the details for every passenger.', 400 );
	}
	$ids_required = ! empty( $offer['passenger_identity_documents_required'] );
	$today        = gmdate( 'Y-m-d' );
	$out          = array();
	$adults       = array();
	$infants      = array();
	foreach ( array_values( $slots ) as $i => $slot ) {
		$p   = is_array( $input[ $i ] ?? null ) ? $input[ $i ] : array();
		$n   = $i + 1;
		$id  = (string) ( $slot['id'] ?? '' );
		$title = sanitize_key( $p['title'] ?? '' );
		$given = trim( preg_replace( '/\s+/', ' ', (string) ( $p['given_name'] ?? '' ) ) );
		$family = trim( preg_replace( '/\s+/', ' ', (string) ( $p['family_name'] ?? '' ) ) );
		$born  = (string) ( $p['born_on'] ?? '' );
		if ( ( $p['id'] ?? '' ) !== $id ) {
			return smfb_error( 'smfb_passengers', 'The passenger list changed. Please reopen this fare.', 409 );
		}
		if ( ! in_array( $title, array( 'mr', 'mrs', 'ms', 'miss' ), true ) ) {
			return smfb_error( 'smfb_passengers', "Choose a title for passenger $n.", 400 );
		}
		if ( ! preg_match( "/^[A-Za-z][A-Za-z '\\-]{0,59}$/", $given ) || ! preg_match( "/^[A-Za-z][A-Za-z '\\-]{0,59}$/", $family ) ) {
			return smfb_error( 'smfb_passengers', "Enter passenger $n's first and last name in English letters, exactly as in the passport.", 400 );
		}
		if ( ! smfb_valid_date( $born ) || $born >= $today || $born < '1900-01-01' ) {
			return smfb_error( 'smfb_passengers', "Enter a valid date of birth for passenger $n.", 400 );
		}
		$gender = in_array( $p['gender'] ?? '', array( 'm', 'f' ), true ) ? $p['gender'] : ( 'mr' === $title ? 'm' : 'f' );
		$row    = array(
			'id'           => $id,
			'title'        => $title,
			'gender'       => $gender,
			'given_name'   => $given,
			'family_name'  => $family,
			'born_on'      => $born,
			'email'        => $contact['email'],
			'phone_number' => $contact['phone'],
		);
		if ( $ids_required ) {
			$doc     = strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', (string) ( $p['passport'] ?? '' ) ) );
			$country = strtoupper( (string) ( $p['passport_country'] ?? '' ) );
			$expiry  = (string) ( $p['passport_expiry'] ?? '' );
			if ( ! preg_match( '/^[A-Z0-9]{5,20}$/', $doc ) || ! preg_match( '/^[A-Z]{2}$/', $country ) || ! smfb_valid_date( $expiry ) || $expiry <= $today ) {
				return smfb_error( 'smfb_passengers', "Enter passenger $n's passport number, issuing country and a valid expiry date.", 400 );
			}
			$row['identity_documents'] = array( array( 'type' => 'passport', 'unique_identifier' => $doc, 'issuing_country_code' => $country, 'expires_on' => $expiry ) );
		}
		$type = smfb_pax_type( (array) $slot );
		if ( 'adult' === $type ) {
			$adults[] = $i;
		} elseif ( 'infant_without_seat' === $type ) {
			$infants[] = $i;
		}
		$out[ $i ] = $row;
	}
	if ( count( $infants ) > count( $adults ) ) {
		return smfb_error( 'smfb_passengers', 'Each infant must travel with an adult.', 400 );
	}
	foreach ( $infants as $k => $infant_index ) {   // airlines seat each infant on one adult's lap
		$out[ $adults[ $k ] ]['infant_passenger_id'] = $out[ $infant_index ]['id'];
	}
	return array_values( $out );
}
function smfb_contact( $raw ) {
	$raw   = is_array( $raw ) ? $raw : array();
	$email = sanitize_email( (string) ( $raw['email'] ?? '' ) );
	$phone = '+' . preg_replace( '/\D+/', '', (string) ( $raw['phone'] ?? '' ) );
	if ( ! is_email( $email ) ) {
		return smfb_error( 'smfb_contact', 'Enter a valid email address for your e-ticket.', 400 );
	}
	if ( ! preg_match( '/^\+[1-9]\d{7,14}$/', $phone ) ) {
		return smfb_error( 'smfb_contact', 'Enter your mobile number with the country code, e.g. +92 300 1234567.', 400 );
	}
	return array( 'email' => $email, 'phone' => $phone );
}

/* ====================================================================================================================
 * Booking: start (re-price, hold when possible, WooCommerce order), ticketing after payment, cancellation
 * ================================================================================================================== */

/**
 * @param array  $in  { offer_id, passengers[], contact{email,phone} }
 * @param string $env 'live' for the public site; 'test' only for the sandbox self-test
 * @return array|WP_Error { order, pay_url, mode, held_until, amount, currency }
 */
function smfb_start( array $in, $env = 'live' ) {
	$contact = smfb_contact( $in['contact'] ?? array() );
	if ( is_wp_error( $contact ) ) {
		return $contact;
	}
	$offer = smfb_get_offer( (string) ( $in['offer_id'] ?? '' ), $env );
	if ( is_wp_error( $offer ) ) {
		return smfb_error( 'smfb_offer', 'This fare is no longer available. Please search again.', 409, array( 'supplier' => $offer->get_error_data()['supplier'] ?? '' ) );
	}
	$view = smfb_offer_view( $offer );
	if ( ! $view['bookable'] ) {
		return smfb_error( 'smfb_offer', in_array( $view['currency'], SMFB_PAYPAL_CURRENCIES, true ) ? 'This fare has expired. Please search again.' : 'This fare cannot be paid online. Send it as a request and our team books it for you.', 409 );
	}
	$pax = smfb_passengers( $in['passengers'] ?? null, $offer, $contact );
	if ( is_wp_error( $pax ) ) {
		return $pax;
	}
	$currency        = $view['currency'];
	$price           = $view['price'];
	$supplier_total  = (float) $offer['total_amount'];
	$mode            = $view['hold'] ? 'hold' : 'instant';
	$expires         = $view['expiresAt'];
	$duffel_order    = '';
	$price_guarantee = $view['priceGuaranteeUntil'];
	$pnr             = '';
	if ( 'hold' === $mode ) {
		$held = smfb_duffel( 'POST', '/air/orders', array( 'type' => 'hold', 'selected_offers' => array( $view['id'] ), 'passengers' => $pax ), $env );
		if ( is_wp_error( $held ) ) {
			$mode = 'instant';   // the airline refused the hold: book right after payment instead
		} else {
			$duffel_order    = sanitize_text_field( $held['id'] ?? '' );
			$pnr             = sanitize_text_field( $held['booking_reference'] ?? '' );
			$supplier_total  = is_numeric( $held['total_amount'] ?? null ) ? (float) $held['total_amount'] : $supplier_total;
			$ps              = (array) ( $held['payment_status'] ?? array() );
			$expires         = ! empty( $ps['payment_required_by'] ) ? smfb_iso( $ps['payment_required_by'] ) : $expires;
			$price_guarantee = ! empty( $ps['price_guarantee_expires_at'] ) ? smfb_iso( $ps['price_guarantee_expires_at'] ) : null;
		}
	}
	$names = array();
	foreach ( $pax as $p ) {
		$names[] = strtoupper( $p['title'] . ' ' . $p['given_name'] . ' ' . $p['family_name'] );
	}
	$line  = smfb_trip_line( $view );
	$count = count( $pax );

	/* Travel Ops request, so online bookings sit in the same staff pipeline as quotes and visa files. */
	$request = 0;
	if ( post_type_exists( 'smt_enquiry' ) ) {
		$request = wp_insert_post( array( 'post_type' => 'smt_enquiry', 'post_status' => 'smt-new', 'post_title' => 'Online flight booking ' . $line, 'post_content' => implode( "\n", array( 'Online flight booking (Duffel ' . $env . ', ' . $mode . ')', 'Trip: ' . $line, 'Passengers: ' . implode( ', ', $names ), 'Contact: ' . $contact['email'] . ' · ' . $contact['phone'] ) ) ), true );
		if ( is_wp_error( $request ) ) {
			$request = 0;
		} else {
			update_post_meta( $request, 'name', ucwords( strtolower( $pax[0]['given_name'] . ' ' . $pax[0]['family_name'] ) ) );
			update_post_meta( $request, 'email', $contact['email'] );
			update_post_meta( $request, 'phone', $contact['phone'] );
			update_post_meta( $request, 'summary', 'Flight ' . $line );
			update_post_meta( $request, 'source', 'online-booking' );
		}
	}

	$order = wc_create_order( array( 'customer_id' => 0, 'created_via' => 'sm-flight-booking' ) );
	if ( is_wp_error( $order ) ) {
		return smfb_error( 'smfb_order', 'We could not create your booking. Please try again.', 500 );
	}
	$order->set_customer_id( 0 );
	$item = new WC_Order_Item_Product();
	if ( function_exists( 'smtp_product_id' ) ) {
		$item->set_product_id( smtp_product_id() );   // the hidden "Sasta Milaga travel booking" product (sm-travel-pay.php)
	}
	$item->set_name( 'Flight ' . $line . ' · ' . $count . ' passenger' . ( 1 === $count ? '' : 's' ) );
	$item->set_quantity( 1 );
	$item->set_subtotal( $price );
	$item->set_total( $price );
	$order->add_item( $item );
	$order->set_currency( $currency );
	$order->set_billing_first_name( ucwords( strtolower( $pax[0]['given_name'] ) ) );
	$order->set_billing_last_name( ucwords( strtolower( $pax[0]['family_name'] ) ) );
	$order->set_billing_email( $contact['email'] );
	$order->set_billing_phone( $contact['phone'] );
	$order->update_meta_data( SMFB_META, array(
		'v'                 => 1,
		'env'               => $env,
		'mode'              => $mode,
		'state'             => 'awaiting_payment',
		'offer'             => $view['id'],
		'duffel_order'      => $duffel_order,
		'pnr'               => $pnr,
		'supplier_total'    => $supplier_total,
		'supplier_currency' => $currency,
		'price'             => $price,
		'currency'          => $currency,
		'expires'           => $expires,
		'price_guarantee'   => $price_guarantee,
		'line'              => $line,
		'slices'            => $view['slices'],
		'names'             => $names,
		'refund'            => $view['refund'],
		'change'            => $view['change'],
		'request'           => (int) $request,
		'created'           => gmdate( 'c' ),
		'error'             => '',
	) );
	if ( 'instant' === $mode ) {
		$order->update_meta_data( SMFB_PAX, smfb_encrypt( wp_json_encode( $pax ) ) );   // needed to book after payment; deleted after
	}
	if ( $request && defined( 'SMTP_META_REQUEST' ) ) {
		$order->update_meta_data( SMTP_META_REQUEST, (int) $request );   // sm-travel-pay moves the request to "Paid"
	}
	$order->calculate_totals( false );
	$order->set_status( 'pending' );
	$order->add_order_note( sprintf( 'Online flight booking started (%s, %s). Supplier total %s %s; customer price %s %s.%s', $env, 'hold' === $mode ? 'fare held at the airline until ' . $expires : 'airline books after payment', number_format( $supplier_total, 2, '.', '' ), $currency, number_format( $price, 2, '.', '' ), $currency, $duffel_order ? ' Duffel order ' . $duffel_order . '.' : '' ) );
	$order->save();
	if ( $request ) {
		update_post_meta( $request, 'order', $order->get_id() );
	}
	return array(
		'order'      => $order->get_id(),
		'pay_url'    => $order->get_checkout_payment_url(),
		'mode'       => $mode,
		'held_until' => 'hold' === $mode ? $expires : null,
		'amount'     => $price,
		'currency'   => $currency,
	);
}

function smfb_meta( $order ) {
	$m = $order ? $order->get_meta( SMFB_META ) : null;
	return is_array( $m ) ? $m : null;
}
function smfb_put_meta( $order, array $m ) {
	$order->update_meta_data( SMFB_META, $m );
	$order->save_meta_data();
}

/** Issue the ticket once WooCommerce has recorded the payment. Runs at most once at a time per order. */
function smfb_ticket( $order_id ) {
	$order = wc_get_order( $order_id );
	$m     = smfb_meta( $order );
	if ( ! $m || ! $order->is_paid() || in_array( $m['state'] ?? '', array( 'ticketed', 'ticketing', 'cancelled' ), true ) ) {
		return;
	}
	$lock = 'smfb_lock_' . (int) $order_id;
	if ( ! add_option( $lock, time(), '', 'no' ) ) {
		if ( time() - (int) get_option( $lock ) < 300 ) {
			return;   // another request is ticketing this order right now
		}
		update_option( $lock, time(), false );
	}
	try {
		if ( function_exists( 'set_time_limit' ) ) {
			@set_time_limit( 150 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}
		$m['state'] = 'ticketing';
		smfb_put_meta( $order, $m );
		$env = 'test' === ( $m['env'] ?? '' ) ? 'test' : 'live';
		$max = (float) $m['supplier_total'] * SMFB_TOLERANCE;
		if ( 'hold' === $m['mode'] ) {
			$d = smfb_duffel( 'GET', '/air/orders/' . rawurlencode( $m['duffel_order'] ), null, $env );
			if ( is_wp_error( $d ) ) {
				return smfb_fail( $order, $m, $d );
			}
			if ( ! empty( $d['payment_status']['awaiting_payment'] ) ) {
				$amount = (float) ( $d['total_amount'] ?? 0 );
				$cur    = strtoupper( (string) ( $d['total_currency'] ?? '' ) );
				if ( $cur !== $m['supplier_currency'] || $amount > $max ) {
					return smfb_fail( $order, $m, smfb_error( 'smfb_price', 'price', 409, array( 'supplier' => 'price_increased' ) ), sprintf( 'Airline price is now %s %s (paid fare was based on %s %s).', number_format( $amount, 2, '.', '' ), $cur, number_format( (float) $m['supplier_total'], 2, '.', '' ), $m['supplier_currency'] ) );
				}
				$paid = smfb_duffel( 'POST', '/air/payments', array( 'order_id' => $m['duffel_order'], 'payment' => array( 'type' => 'balance', 'amount' => number_format( $amount, 2, '.', '' ), 'currency' => $cur ) ), $env );
				if ( is_wp_error( $paid ) ) {
					return smfb_fail( $order, $m, $paid );
				}
				$d = smfb_duffel( 'GET', '/air/orders/' . rawurlencode( $m['duffel_order'] ), null, $env );
				if ( is_wp_error( $d ) ) {
					$d = array( 'id' => $m['duffel_order'], 'booking_reference' => $m['pnr'] );   // paid; details can be read later
				}
			}
		} else {
			$offer = smfb_get_offer( $m['offer'], $env );
			if ( is_wp_error( $offer ) ) {
				return smfb_fail( $order, $m, $offer, 'The fare expired or sold out before ticketing.' );
			}
			$amount = (float) ( $offer['total_amount'] ?? 0 );
			$cur    = strtoupper( (string) ( $offer['total_currency'] ?? '' ) );
			if ( $cur !== $m['supplier_currency'] || $amount > $max ) {
				return smfb_fail( $order, $m, smfb_error( 'smfb_price', 'price', 409, array( 'supplier' => 'price_increased' ) ), sprintf( 'Airline price is now %s %s (paid fare was based on %s %s).', number_format( $amount, 2, '.', '' ), $cur, number_format( (float) $m['supplier_total'], 2, '.', '' ), $m['supplier_currency'] ) );
			}
			$pax = json_decode( smfb_decrypt( (string) $order->get_meta( SMFB_PAX ) ), true );
			if ( ! is_array( $pax ) || ! $pax ) {
				return smfb_fail( $order, $m, smfb_error( 'smfb_pax', 'pax', 500, array( 'supplier' => 'passenger_data_missing' ) ) );
			}
			$d = smfb_duffel( 'POST', '/air/orders', array( 'type' => 'instant', 'selected_offers' => array( $m['offer'] ), 'passengers' => $pax, 'payments' => array( array( 'type' => 'balance', 'amount' => number_format( $amount, 2, '.', '' ), 'currency' => $cur ) ) ), $env );
			if ( is_wp_error( $d ) ) {
				return smfb_fail( $order, $m, $d );
			}
		}
		$tickets = array();
		foreach ( (array) ( $d['documents'] ?? array() ) as $doc ) {
			if ( 'electronic_ticket' === ( $doc['type'] ?? '' ) && ! empty( $doc['unique_identifier'] ) ) {
				$tickets[] = sanitize_text_field( $doc['unique_identifier'] );
			}
		}
		$m['state']        = 'ticketed';
		$m['pnr']          = sanitize_text_field( $d['booking_reference'] ?? $m['pnr'] );
		$m['duffel_order'] = sanitize_text_field( $d['id'] ?? $m['duffel_order'] );
		$m['tickets']      = $tickets;
		$m['ticketed_at']  = gmdate( 'c' );
		$m['error']        = '';
		smfb_put_meta( $order, $m );
		$order->delete_meta_data( SMFB_PAX );
		$order->save_meta_data();
		if ( ! empty( $m['request'] ) && 'smt_enquiry' === get_post_type( $m['request'] ) ) {
			wp_update_post( array( 'ID' => (int) $m['request'], 'post_status' => 'smt-done' ) );
		}
		$order->update_status( 'completed', sprintf( 'Flight booked: airline booking reference %s (Duffel order %s%s).', $m['pnr'], $m['duffel_order'], $tickets ? ', e-tickets ' . implode( ', ', $tickets ) : '' ) );
	} catch ( Throwable $e ) {
		smfb_fail( $order, $m, smfb_error( 'smfb_exception', 'exception', 500, array( 'supplier' => 'exception' ) ), 'Unexpected error: ' . substr( $e->getMessage(), 0, 160 ) );
	} finally {
		delete_option( $lock );
	}
}

function smfb_fail( $order, array $m, WP_Error $err, $detail = '' ) {
	$data       = (array) $err->get_error_data();
	$code       = (string) ( $data['supplier'] ?? $err->get_error_code() );
	$m['state'] = 'failed';
	$m['error'] = $code;
	smfb_put_meta( $order, $m );
	$advice = 'http_500' === $code || 'http_502' === $code || 'network' === $code
		? 'The airline payment may still have gone through: check the order in the Duffel dashboard BEFORE retrying.'
		: 'Retry from the "Flight booking" box on this order, rebook manually, or refund the customer from this order.';
	$order->update_status( 'on-hold', sprintf( 'Flight ticketing did not complete (%s). The customer HAS PAID. %s %s', $code, $detail, $advice ) );
	smfb_staff_mail( 'Ticketing needs attention: order #' . $order->get_id(), array( 'The customer paid but the flight was not ticketed automatically.', 'Trip: ' . ( $m['line'] ?? '' ), 'Passengers: ' . implode( ', ', (array) ( $m['names'] ?? array() ) ), 'Reason code: ' . $code . ( $detail ? ' · ' . $detail : '' ), $advice ), $order->get_edit_order_url() );
	return null;
}

/* Payment recorded by WooCommerce (PayPal / card capture) → ticket. processing fires first; the lock stops a double booking. */
add_action( 'woocommerce_order_status_processing', 'smfb_ticket', 20 );
add_action( 'woocommerce_payment_complete', 'smfb_ticket', 20 );

/* Unpaid booking cancelled → release the held seats and forget passport data. */
add_action( 'woocommerce_order_status_cancelled', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	$m     = smfb_meta( $order );
	if ( ! $m || 'ticketed' === $m['state'] ) {
		return;
	}
	if ( 'hold' === $m['mode'] && $m['duffel_order'] && 'awaiting_payment' === $m['state'] ) {
		$c = smfb_duffel( 'POST', '/air/order_cancellations', array( 'order_id' => $m['duffel_order'] ), $m['env'] );
		if ( ! is_wp_error( $c ) && ! empty( $c['id'] ) ) {
			smfb_duffel( 'POST', '/air/order_cancellations/' . rawurlencode( $c['id'] ) . '/actions/confirm', null, $m['env'] );
		}
	}
	$m['state'] = 'cancelled';
	smfb_put_meta( $order, $m );
	$order->delete_meta_data( SMFB_PAX );
	$order->save_meta_data();
} );
add_action( 'woocommerce_order_status_refunded', function ( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( smfb_meta( $order ) ) {
		$order->delete_meta_data( SMFB_PAX );
		$order->save_meta_data();
	}
} );

/* Order-pay page: an expired held / instant fare cannot be paid any more (the airline would refuse the ticket). */
add_action( 'template_redirect', function () {
	if ( ! function_exists( 'is_wc_endpoint_url' ) || ! is_wc_endpoint_url( 'order-pay' ) ) {
		return;
	}
	$order = wc_get_order( absint( get_query_var( 'order-pay' ) ) );
	$m     = smfb_meta( $order );
	if ( ! $m || ! $order->needs_payment() || 'awaiting_payment' !== $m['state'] ) {
		return;
	}
	$expires = strtotime( (string) $m['expires'] );
	if ( $expires && $expires < time() + 60 ) {
		$order->update_status( 'cancelled', 'Flight fare expired before payment; order cancelled automatically.' );
		wc_add_notice( 'This fare has expired, so it can no longer be paid. Please search again for the latest prices.', 'error' );
	}
}, 5 );

/* Order-pay page: what the customer is paying for, how long the fare is held, and the airline's rules. */
add_action( 'before_woocommerce_pay_form', function ( $order ) {
	$m = smfb_meta( $order );
	if ( ! $m || 'awaiting_payment' !== $m['state'] ) {
		return;
	}
	$expires = strtotime( (string) $m['expires'] );
	$left    = $expires ? human_time_diff( time(), $expires ) : '';
	$rule    = static function ( $r, $label ) {
		if ( ! is_array( $r ) ) {
			return '';
		}
		if ( empty( $r['allowed'] ) ) {
			return $label . ': not allowed';
		}
		return $label . ': allowed' . ( null !== $r['penalty'] ? ( $r['penalty'] > 0 ? ' (airline fee ' . $r['currency'] . ' ' . number_format( (float) $r['penalty'], 2 ) . ')' : ' (no airline fee)' ) : '' );
	};
	$rules = array_filter( array( $rule( $m['refund'] ?? null, 'Refund before departure' ), $rule( $m['change'] ?? null, 'Change before departure' ) ) );
	echo '<div class="smfb-pay" style="border:1px solid #E2E8E4;border-radius:14px;padding:16px 18px;margin:0 0 20px;background:#F4FBF6">';
	echo '<p style="margin:0 0 4px;font-weight:700;color:#0B3B20">Flight ' . esc_html( $m['line'] ) . '</p>';
	echo '<p style="margin:0 0 8px">' . esc_html( implode( ' · ', (array) $m['names'] ) ) . '</p>';
	if ( 'hold' === $m['mode'] ) {
		echo '<p style="margin:0 0 8px"><strong>Your seats are held by the airline' . ( $left ? ' for about ' . esc_html( $left ) : '' ) . '.</strong> Complete payment below to issue your e-ticket; we email the airline booking reference straight away.</p>';
	} else {
		echo '<p style="margin:0 0 8px"><strong>Please complete payment' . ( $left ? ' within ' . esc_html( $left ) : '' ) . '.</strong> The airline issues your ticket right after payment. If the airline changes the fare before ticketing, our team contacts you and you can choose a full refund.</p>';
	}
	if ( $rules ) {
		echo '<p style="margin:0;color:#55605B;font-size:.92em">' . esc_html( implode( ' · ', $rules ) ) . '</p>';
	}
	echo '</div>';
} );

/* Customer: booking reference on the thank-you page, My account order view and the order emails. */
function smfb_customer_block( $order, $plain = false ) {
	$m = smfb_meta( $order );
	if ( ! $m ) {
		return '';
	}
	switch ( $m['state'] ) {
		case 'ticketed':
			$text = 'Your flight is booked. Airline booking reference (PNR): ' . $m['pnr'] . ( ! empty( $m['tickets'] ) ? ' · e-ticket ' . implode( ', ', $m['tickets'] ) : '' ) . '. Use the reference on the airline website to check in.';
			break;
		case 'failed':
		case 'ticketing':
			$text = 'Payment received. Our travel team is finalising your ticket with the airline and will contact you shortly (9 AM–9 PM PKT, Monday to Saturday). If the ticket cannot be issued at the price you paid, you get a full refund.';
			break;
		case 'cancelled':
			$text = 'This booking was cancelled and the airline released the seats.';
			break;
		default:
			$text = 'Waiting for payment. Your fare is reserved until ' . ( $m['expires'] ? gmdate( 'j M Y, H:i', strtotime( $m['expires'] ) ) . ' UTC' : 'the time shown at payment' ) . '.';
	}
	$head = 'Flight ' . $m['line'];
	return $plain ? "\n" . $head . "\n" . $text . "\n" : '<section class="smfb-order" style="border:1px solid #E2E8E4;border-radius:14px;padding:14px 16px;margin:0 0 18px"><h2 style="font-size:1.05em;margin:0 0 6px">' . esc_html( $head ) . '</h2><p style="margin:0">' . esc_html( $text ) . '</p></section>';
}
add_action( 'woocommerce_order_details_before_order_table', function ( $order ) {
	echo smfb_customer_block( $order ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside
} );
add_action( 'woocommerce_email_order_meta', function ( $order, $sent_to_admin, $plain_text ) {
	echo smfb_customer_block( $order, $plain_text ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped inside
}, 5, 3 );

/* ====================================================================================================================
 * Staff: "Flight booking" box on the order screen (state, PNR, retry)
 * ================================================================================================================== */

add_action( 'add_meta_boxes', function () {
	$id    = absint( $_GET['id'] ?? ( $_GET['post'] ?? 0 ) ); // phpcs:ignore WordPress.Security.NonceVerification
	$order = $id ? wc_get_order( $id ) : null;
	if ( ! smfb_meta( $order ) ) {
		return;
	}
	$screen = function_exists( 'wc_get_page_screen_id' ) ? wc_get_page_screen_id( 'shop-order' ) : 'shop_order';
	add_meta_box( 'smfb', 'Flight booking (Duffel)', 'smfb_order_box', $screen, 'side', 'high' );
} );
function smfb_order_box( $post_or_order ) {
	$order = $post_or_order instanceof WC_Order ? $post_or_order : wc_get_order( $post_or_order->ID ?? 0 );
	$m     = smfb_meta( $order );
	if ( ! $m ) {
		return;
	}
	$labels = array( 'awaiting_payment' => 'Waiting for customer payment', 'ticketing' => 'Ticketing in progress', 'ticketed' => 'Ticketed', 'failed' => 'Needs attention: paid, not ticketed', 'cancelled' => 'Cancelled' );
	echo '<p><strong>' . esc_html( $labels[ $m['state'] ] ?? $m['state'] ) . '</strong>' . ( 'test' === $m['env'] ? ' <em>(sandbox)</em>' : '' ) . '</p>';
	echo '<p>' . esc_html( $m['line'] ) . '<br>' . esc_html( implode( ', ', (array) $m['names'] ) ) . '</p>';
	echo '<p>Mode: ' . esc_html( 'hold' === $m['mode'] ? 'held at airline, paid from balance after customer payment' : 'booked and paid from balance after customer payment' ) . '<br>Supplier: ' . esc_html( number_format( (float) $m['supplier_total'], 2 ) . ' ' . $m['supplier_currency'] ) . ' · Customer: ' . esc_html( number_format( (float) $m['price'], 2 ) . ' ' . $m['currency'] ) . '</p>';
	if ( $m['pnr'] ) {
		echo '<p>Booking reference: <code>' . esc_html( $m['pnr'] ) . '</code></p>';
	}
	if ( $m['duffel_order'] ) {
		echo '<p>Duffel order: <a target="_blank" rel="noopener" href="' . esc_url( 'https://app.duffel.com/orders/' . rawurlencode( $m['duffel_order'] ) ) . '"><code>' . esc_html( $m['duffel_order'] ) . '</code></a></p>';
	}
	if ( $m['error'] ) {
		echo '<p style="color:#b32d2e">Last error: <code>' . esc_html( $m['error'] ) . '</code></p>';
	}
	if ( 'failed' === $m['state'] ) {
		$url = wp_nonce_url( admin_url( 'admin-post.php?action=smfb_retry&order=' . $order->get_id() ), 'smfb_retry_' . $order->get_id() );
		echo '<p><a class="button button-primary" href="' . esc_url( $url ) . '">Retry ticketing</a></p><p class="description">Check the Duffel dashboard first if the last error was http_500, http_502 or network.</p>';
	}
}
add_action( 'admin_post_smfb_retry', function () {
	$id = absint( $_GET['order'] ?? 0 );
	if ( ! current_user_can( 'manage_woocommerce' ) || ! check_admin_referer( 'smfb_retry_' . $id ) ) {
		wp_die( 'Not allowed', 403 );
	}
	$order = wc_get_order( $id );
	$m     = smfb_meta( $order );
	if ( $m && 'failed' === $m['state'] ) {
		$m['state'] = 'paid_retry';
		smfb_put_meta( $order, $m );
		if ( ! $order->is_paid() ) {
			$order->set_status( 'processing', 'Ticketing retried by ' . wp_get_current_user()->user_login . '.' );
			$order->save();   // the processing hook runs the ticketing
		} else {
			smfb_ticket( $id );
		}
	}
	wp_safe_redirect( $order ? $order->get_edit_order_url() : admin_url() );
	exit;
} );

/* ====================================================================================================================
 * Public REST routes
 * ================================================================================================================== */

add_action( 'rest_api_init', function () {
	register_rest_route( SMFB_NS, '/booking/config', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'smfb_rest_config' ) );
	register_rest_route( SMFB_NS, '/booking/offer', array( 'methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'smfb_rest_offer' ) );
	register_rest_route( SMFB_NS, '/booking/start', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'smfb_rest_start' ) );
	register_rest_route( SMFB_NS, '/request', array( 'methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => 'smfb_rest_request' ) );
	$admin = static function () {
		return current_user_can( 'manage_options' );
	};
	register_rest_route( SMFB_NS, '/admin/status', array( 'methods' => 'GET', 'permission_callback' => $admin, 'callback' => 'smfb_rest_status' ) );
	register_rest_route( SMFB_NS, '/admin/settings', array( 'methods' => 'POST', 'permission_callback' => $admin, 'callback' => 'smfb_rest_settings' ) );
} );

function smfb_rest_config() {
	$r = new WP_REST_Response( array(
		'mode'       => smfb_search_on() ? 'duffel' : 'request',
		'search'     => smfb_search_on(),
		'booking'    => smfb_booking_on(),
		'currencies' => SMFB_PAYPAL_CURRENCIES,
		'hours'      => '9 AM to 9 PM Pakistan time, Monday to Saturday',
		'version'    => SMFB_VERSION,
	) );
	$r->header( 'Cache-Control', 'public, max-age=60' );
	return $r;
}

function smfb_rest_offer( WP_REST_Request $req ) {
	if ( ! smfb_booking_on() ) {
		return smfb_error( 'smfb_off', 'Online booking is not available right now. Send your trip as a request instead.', 503 );
	}
	if ( smfb_limited( 'offer', 30 ) ) {
		return smfb_error( 'smfb_rate', 'Please wait a moment and try again.', 429 );
	}
	$offer = smfb_get_offer( (string) $req->get_param( 'id' ), 'live' );
	if ( is_wp_error( $offer ) ) {
		return smfb_error( 'smfb_offer', 'This fare is no longer available. Please search again.', 409 );
	}
	return smfb_nocache( smfb_offer_view( $offer ) );
}

function smfb_rest_start( WP_REST_Request $req ) {
	if ( ! smfb_booking_on() ) {
		return smfb_error( 'smfb_off', 'Online booking is not available right now. Send your trip as a request instead.', 503 );
	}
	$p = $req->get_json_params();
	if ( ! is_array( $p ) || ! empty( $p['hp'] ) ) {
		return smfb_error( 'smfb_invalid', 'Invalid booking.', 400 );
	}
	$key = isset( $p['key'] ) && preg_match( '/^[A-Za-z0-9-]{8,64}$/', (string) $p['key'] ) ? 'smfb_key_' . md5( (string) $p['key'] ) : '';
	if ( $key && is_array( $done = get_transient( $key ) ) ) {
		return smfb_nocache( $done );   // the same click sent twice: same order, no second hold
	}
	$day = 'smfb_starts_' . gmdate( 'Ymd' );   // site-wide cap on new airline holds per day (protects the agency's Duffel standing)
	if ( smfb_limited( 'start', 4, 900 ) || (int) get_transient( $day ) >= (int) apply_filters( 'smfb_daily_start_cap', 60 ) ) {
		return smfb_error( 'smfb_rate', 'Too many booking attempts. Please wait a few minutes or send a request instead.', 429 );
	}
	set_transient( $day, (int) get_transient( $day ) + 1, DAY_IN_SECONDS + HOUR_IN_SECONDS );
	$out = smfb_start( $p, 'live' );
	if ( is_wp_error( $out ) ) {
		return $out;
	}
	if ( $key ) {
		set_transient( $key, $out, 30 * MINUTE_IN_SECONDS );
	}
	return smfb_nocache( $out );
}

/**
 * "Get my best price" request (no supplier key needed): trip + contact → Travel Ops request with a reference number.
 * The team quotes and sends a payment link from the request (sm-travel-pay.php).
 */
function smfb_rest_request( WP_REST_Request $req ) {
	$p = $req->get_json_params();
	if ( ! is_array( $p ) ) {
		return smfb_error( 'smfb_invalid', 'Invalid request.', 400 );
	}
	if ( ! empty( $p['hp'] ) ) {
		return smfb_nocache( array( 'request' => 0, 'ref' => '', 'whatsapp' => smfb_whatsapp( 'Hello Sasta Milaga' ) ) );   // bot: pretend success
	}
	$key = isset( $p['key'] ) && preg_match( '/^[A-Za-z0-9-]{8,64}$/', (string) $p['key'] ) ? 'smfb_rkey_' . md5( (string) $p['key'] ) : '';
	if ( $key && is_array( $done = get_transient( $key ) ) ) {
		return smfb_nocache( $done );
	}
	if ( smfb_limited( 'request', 6, 900 ) ) {
		return smfb_error( 'smfb_rate', 'You have sent several requests. Please wait a few minutes or message us on WhatsApp.', 429 );
	}
	$kind = sanitize_key( $p['kind'] ?? '' );
	if ( ! in_array( $kind, array( 'flight', 'hotel' ), true ) ) {
		return smfb_error( 'smfb_kind', 'Unknown trip type.', 400 );
	}
	$name  = trim( sanitize_text_field( (string) ( $p['name'] ?? '' ) ) );
	$phone = trim( preg_replace( '/[^\d+ ]/', '', (string) ( $p['phone'] ?? '' ) ) );
	$email = sanitize_email( (string) ( $p['email'] ?? '' ) );
	$notes = mb_substr( sanitize_textarea_field( (string) ( $p['notes'] ?? '' ) ), 0, 600 );
	if ( mb_strlen( $name ) < 2 || mb_strlen( $name ) > 80 ) {
		return smfb_error( 'smfb_name', 'Enter your name.', 400 );
	}
	$digits = preg_replace( '/\D+/', '', $phone );
	if ( strlen( $digits ) < 9 || strlen( $digits ) > 15 ) {
		return smfb_error( 'smfb_phone', 'Enter your WhatsApp or mobile number, e.g. +92 300 1234567.', 400 );
	}
	if ( '' !== (string) ( $p['email'] ?? '' ) && ! is_email( $email ) ) {
		return smfb_error( 'smfb_email', 'Check your email address, or leave it empty.', 400 );
	}
	if ( empty( $p['consent'] ) ) {
		return smfb_error( 'smfb_consent', 'Please agree that our travel team may contact you about this trip.', 400 );
	}
	$dep = sanitize_text_field( (string) ( $p['departure'] ?? '' ) );
	$ret = sanitize_text_field( (string) ( $p['return'] ?? '' ) );
	if ( ! smfb_valid_date( $dep ) || $dep < gmdate( 'Y-m-d', time() - DAY_IN_SECONDS ) ) {
		return smfb_error( 'smfb_dates', 'Choose a valid future date.', 400 );
	}
	if ( '' !== $ret && ( ! smfb_valid_date( $ret ) || $ret <= $dep ) ) {
		return smfb_error( 'smfb_dates', 'The return or check-out date must be after the first date.', 400 );
	}
	$adults = max( 1, min( 9, (int) ( $p['adults'] ?? 1 ) ) );
	$ages   = array_values( array_filter( array_map( 'intval', array_slice( (array) ( $p['ages'] ?? array() ), 0, 8 ) ), static function ( $a ) {
		return $a >= 0 && $a <= 17;
	} ) );
	$who      = $adults . ' adult' . ( $adults > 1 ? 's' : '' ) . ( $ages ? ', children aged ' . implode( ', ', $ages ) : '' );
	$currency = strtoupper( sanitize_text_field( (string) ( $p['currency'] ?? 'USD' ) ) );
	$label    = static function ( $v, $code ) {
		$v = trim( sanitize_text_field( (string) $v ) );
		return $v ? mb_substr( $v, 0, 90 ) : $code;
	};
	if ( 'flight' === $kind ) {
		$o = strtoupper( sanitize_text_field( (string) ( $p['origin'] ?? '' ) ) );
		$d = strtoupper( sanitize_text_field( (string) ( $p['destination'] ?? '' ) ) );
		if ( ! preg_match( '/^[A-Z0-9]{2,5}$/', $o ) || ! preg_match( '/^[A-Z0-9]{2,5}$/', $d ) || $o === $d ) {
			return smfb_error( 'smfb_route', 'Choose the departure and arrival cities from the suggestions.', 400 );
		}
		$cabin = sanitize_key( $p['cabin'] ?? 'economy' );
		if ( ! in_array( $cabin, array( 'economy', 'premium_economy', 'business', 'first' ), true ) ) {
			$cabin = 'economy';
		}
		$title = "Flight $o → $d · $dep";
		$lines = array( 'Flight request', 'From: ' . $label( $p['origin_label'] ?? '', $o ), 'To: ' . $label( $p['destination_label'] ?? '', $d ), "Depart: $dep", '' !== $ret ? "Return: $ret" : 'One way', "Travellers: $who", 'Cabin: ' . ucwords( str_replace( '_', ' ', $cabin ) ) );
	} else {
		$city = $label( $p['city_label'] ?? '', '' );
		if ( mb_strlen( $city ) < 2 ) {
			return smfb_error( 'smfb_city', 'Enter the city or area for your stay.', 400 );
		}
		if ( '' === $ret ) {
			return smfb_error( 'smfb_dates', 'Choose check-in and check-out dates.', 400 );
		}
		$rooms = max( 1, min( 9, (int) ( $p['rooms'] ?? 1 ) ) );
		$title = "Hotel $city · $dep";
		$lines = array( 'Hotel request', "Destination: $city", "Check-in: $dep", "Check-out: $ret", "Guests: $who", "Rooms: $rooms" );
	}
	if ( preg_match( '/^[A-Z]{3}$/', $currency ) ) {
		$lines[] = "Preferred currency: $currency";
	}
	$offer = is_array( $p['offer'] ?? null ) ? $p['offer'] : null;
	if ( $offer ) {
		$lines[] = 'Selected fare: ' . mb_substr( sanitize_text_field( (string) ( $offer['summary'] ?? '' ) ), 0, 160 ) . ( is_numeric( $offer['price'] ?? null ) ? ' · shown ' . strtoupper( sanitize_text_field( (string) ( $offer['currency'] ?? '' ) ) ) . ' ' . number_format( (float) $offer['price'], 2 ) : '' ) . ( preg_match( '/^off_[A-Za-z0-9]{8,64}$/', (string) ( $offer['id'] ?? '' ) ) ? ' · ' . $offer['id'] : '' );
	}
	$contact_lines = array( "Name: $name", "WhatsApp / mobile: $phone" );
	if ( $email ) {
		$contact_lines[] = "Email: $email";
	}
	if ( '' !== $notes ) {
		$contact_lines[] = 'Notes: ' . $notes;
	}
	$type = post_type_exists( 'smt_enquiry' ) ? 'smt_enquiry' : 'sm_trip_request';
	$id   = wp_insert_post( array( 'post_type' => $type, 'post_status' => 'smt_enquiry' === $type ? 'smt-new' : 'private', 'post_title' => $title, 'post_content' => implode( "\n", array_merge( $lines, array( '' ), $contact_lines ) ) ), true );
	if ( is_wp_error( $id ) ) {
		return smfb_error( 'smfb_store', 'We could not save your request. Please message us on WhatsApp.', 500 );
	}
	update_post_meta( $id, '_sm_trip', array( 'kind' => $kind, 'departure' => $dep, 'return' => $ret, 'adults' => $adults, 'ages' => $ages, 'lines' => $lines ) );
	update_post_meta( $id, 'summary', $title );
	update_post_meta( $id, 'source', 'travel-search' );
	update_post_meta( $id, 'name', $name );
	update_post_meta( $id, 'phone', $phone );
	if ( $email ) {
		update_post_meta( $id, 'email', $email );
	}
	update_post_meta( $id, 'consent', gmdate( 'c' ) );
	smfb_staff_mail( 'New ' . $kind . ' request #' . $id . ': ' . $title, array_merge( $lines, array( '' ), $contact_lines, array( '', 'Reply on WhatsApp: ' . ( function_exists( 'smtp_wa_link' ) ? smtp_wa_link( $phone, "Assalam o Alaikum $name, this is Sasta Milaga travel about your request #$id." ) : $phone ) ) ), admin_url( 'post.php?post=' . (int) $id . '&action=edit' ) );
	if ( $email && function_exists( 'WC' ) && WC()->mailer() ) {
		$mailer = WC()->mailer();
		$html   = '<p>Assalam o Alaikum ' . esc_html( $name ) . ',</p><p>We received your travel request <strong>#' . (int) $id . '</strong>:</p><p>' . nl2br( esc_html( implode( "\n", $lines ) ) ) . '</p><p>Our travel team checks the latest fares and availability and sends you the price and a secure payment link (PayPal or debit / credit card) on WhatsApp or email, ' . esc_html( '9 AM to 9 PM Pakistan time, Monday to Saturday' ) . '. Nothing is charged until you approve the price.</p>';
		$mailer->send( $email, 'We received your travel request #' . (int) $id, $mailer->wrap_message( 'Travel request #' . (int) $id, $html ) );
	}
	$out = array(
		'request'  => (int) $id,
		'ref'      => '#' . (int) $id,
		'whatsapp' => smfb_whatsapp( "Hello Sasta Milaga, this is $name about my travel request #$id:\n" . implode( "\n", $lines ) ),
		'email'    => (bool) $email,
	);
	if ( $key ) {
		set_transient( $key, $out, 30 * MINUTE_IN_SECONDS );
	}
	return smfb_nocache( $out );
}

/* ====================================================================================================================
 * Administrator routes (used by the GitHub Actions workflow "Travel booking settings" with an application password)
 * ================================================================================================================== */

function smfb_status() {
	$d = smfb_duffel_settings();
	$s = smfb_settings();
	return array(
		'duffel_live_token'   => '' !== smfb_token( 'live' ),
		'duffel_test_token'   => '' !== smfb_token( 'test' ),
		'environment'         => ( $d['environment'] ?? 'test' ) === 'live' ? 'live' : 'test',
		'production_approved' => ! empty( $d['production_approved'] ),
		'flights_search'      => ! empty( $d['flights_search_enabled'] ),
		'public_search_on'    => smfb_search_on(),
		'booking_switch'      => ! empty( $s['booking_enabled'] ),
		'ack_balance'         => ! empty( $s['ack_balance'] ),
		'ack_paypal'          => ! empty( $s['ack_paypal'] ),
		'online_booking_on'   => smfb_booking_on(),
		'markup_percent'      => (float) ( ( (array) get_option( 'sm_global_travel_settings', array() ) + array( 'markup_percent' => 20 ) )['markup_percent'] ),
		'last_test'           => $s['last_test'],
		'version'             => SMFB_VERSION,
	);
}
function smfb_rest_status() {
	return smfb_nocache( smfb_status() );
}
function smfb_rest_settings( WP_REST_Request $req ) {
	$p = $req->get_json_params();
	if ( ! is_array( $p ) ) {
		return smfb_error( 'smfb_invalid', 'JSON body expected.', 400 );
	}
	$d = smfb_duffel_settings() + array( 'environment' => 'test', 'production_approved' => 0, 'flights_search_enabled' => 0, 'stays_search_enabled' => 0, 'test_token' => '', 'live_token' => '' );
	foreach ( array( 'duffel_test_token' => 'test_token', 'duffel_live_token' => 'live_token' ) as $in => $slot ) {
		$tok = trim( (string) ( $p[ $in ] ?? '' ) );
		if ( '' === $tok ) {
			continue;
		}
		$prefix = 'test_token' === $slot ? 'duffel_test_' : 'duffel_live_';
		if ( strlen( $tok ) > 300 || 0 !== strpos( $tok, $prefix ) || ! preg_match( '/^duffel_(test|live)_[A-Za-z0-9_-]+$/', $tok ) ) {
			return smfb_error( 'smfb_token', "$in must start with $prefix.", 400 );
		}
		$enc = smfb_encrypt( $tok );
		if ( '' === $enc ) {
			return smfb_error( 'smfb_crypto', 'Encryption is not available on the server.', 500 );
		}
		$d[ $slot ] = $enc;
	}
	if ( isset( $p['environment'] ) ) {
		$d['environment'] = 'live' === $p['environment'] ? 'live' : 'test';
	}
	if ( isset( $p['production_approved'] ) ) {
		$d['production_approved'] = $p['production_approved'] ? 1 : 0;
	}
	if ( isset( $p['flights_search'] ) ) {
		$d['flights_search_enabled'] = $p['flights_search'] ? 1 : 0;
	}
	if ( 'live' === $d['environment'] && empty( $d['production_approved'] ) ) {
		$d['flights_search_enabled'] = 0;   // same rule as the Duffel settings page
		$d['stays_search_enabled']   = 0;
	}
	update_option( 'sm_duffel_settings', $d, false );
	$changes = array();
	foreach ( array( 'online_booking' => 'booking_enabled', 'ack_balance' => 'ack_balance', 'ack_paypal' => 'ack_paypal' ) as $in => $slot ) {
		if ( isset( $p[ $in ] ) ) {
			$changes[ $slot ] = $p[ $in ] ? 1 : 0;
		}
	}
	if ( $changes ) {
		smfb_save_settings( $changes );
	}
	if ( isset( $p['markup_percent'] ) && is_numeric( $p['markup_percent'] ) ) {
		$g                   = (array) get_option( 'sm_global_travel_settings', array() );
		$g['markup_percent'] = max( 0, min( 100, round( (float) $p['markup_percent'], 2 ) ) );
		update_option( 'sm_global_travel_settings', $g );
	}
	return smfb_nocache( smfb_status() );
}

/* ====================================================================================================================
 * Settings → Flight booking (readiness checklist, the booking switch, sandbox self-test)
 * ================================================================================================================== */

add_action( 'admin_menu', function () {
	add_options_page( 'Flight booking', 'Flight booking', 'manage_options', 'smfb', 'smfb_admin_page' );
} );
function smfb_admin_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$st  = smfb_status();
	$s   = smfb_settings();
	$ok  = static function ( $b ) {
		return $b ? '<span style="color:#0F7A3B;font-weight:700">Yes</span>' : '<span style="color:#b32d2e;font-weight:700">No</span>';
	};
	$msg = sanitize_key( wp_unslash( $_GET['smfb'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification
	echo '<div class="wrap"><h1>Flight booking</h1>';
	if ( $msg ) {
		$text = array( 'saved' => 'Saved.', 'acks' => 'Online booking needs both confirmations ticked.', 'tested' => 'Sandbox test finished: see the result below.', 'notoken' => 'Add a Duffel test token first (Settings → Duffel Travel API).' )[ $msg ] ?? '';
		if ( $text ) {
			echo '<div class="notice notice-info"><p>' . esc_html( $text ) . '</p></div>';
		}
	}
	echo '<p>How the <a href="' . esc_url( home_url( '/travel/' ) ) . '" target="_blank">/travel/</a> flight search works right now: <strong>' . ( $st['online_booking_on'] ? 'live airline fares with online booking and payment' : ( $st['public_search_on'] ? 'live airline fares; customers send the fare as a request' : 'request mode: customers send their trip with contact details and the team sends a payment link' ) ) . '</strong>.</p>';
	echo '<h2>Readiness</h2><table class="widefat striped" style="max-width:760px"><tbody>';
	echo '<tr><td>Duffel live access token saved</td><td>' . $ok( $st['duffel_live_token'] ) . '</td><td>Rotate it in the Duffel dashboard (Developers → Access tokens) if it was ever shared, then paste the new one on <a href="' . esc_url( admin_url( 'options-general.php?page=sm-duffel-settings' ) ) . '">Settings → Duffel Travel API</a>.</td></tr>';
	echo '<tr><td>Duffel test token saved</td><td>' . $ok( $st['duffel_test_token'] ) . '</td><td>Free in the Duffel dashboard (test mode). Needed for the sandbox test below.</td></tr>';
	echo '<tr><td>Environment live + production approved</td><td>' . $ok( 'live' === $st['environment'] && $st['production_approved'] ) . '</td><td>Settings → Duffel Travel API.</td></tr>';
	echo '<tr><td>Live flight search shown to customers</td><td>' . $ok( $st['public_search_on'] ) . '</td><td>"Flights search enabled" on Settings → Duffel Travel API.</td></tr>';
	echo '<tr><td>Online booking + payment</td><td>' . $ok( $st['online_booking_on'] ) . '</td><td>Switch below.</td></tr>';
	echo '<tr><td>Markup on airline base fare</td><td>' . esc_html( $st['markup_percent'] ) . '%</td><td>Settings → Global Travel. Taxes are passed through.</td></tr>';
	echo '</tbody></table>';
	echo '<h2>Online booking switch</h2><form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'smfb_save' );
	echo '<input type="hidden" name="action" value="smfb_save">';
	echo '<p><label><input type="checkbox" name="ack_balance" value="1"' . checked( ! empty( $s['ack_balance'] ), true, false ) . '> The Duffel balance is funded (tickets are paid from it right after the customer pays; Duffel bills in the fare currency).</label></p>';
	echo '<p><label><input type="checkbox" name="ack_paypal" value="1"' . checked( ! empty( $s['ack_paypal'] ), true, false ) . '> PayPal has approved this business account for selling airline tickets (PayPal lists airlines under activities that need pre-approval).</label></p>';
	echo '<p><label><input type="checkbox" name="booking_enabled" value="1"' . checked( ! empty( $s['booking_enabled'] ), true, false ) . '> Let customers book and pay online for live fares.</label></p>';
	echo '<p><button class="button button-primary">Save</button></p></form>';
	echo '<h2>Sandbox self-test</h2><p>Searches London → New York with the <strong>test</strong> token, books a Duffel Airways test fare through the same code customers use (WooCommerce order, simulated payment with emails off, ticketing), shows the booking reference and deletes the test order. No money moves.</p>';
	echo '<form method="post" action="' . esc_url( admin_url( 'admin-post.php' ) ) . '">';
	wp_nonce_field( 'smfb_test' );
	echo '<input type="hidden" name="action" value="smfb_test"><button class="button"' . disabled( ! $st['duffel_test_token'], true, false ) . '>Run sandbox booking test</button></form>';
	if ( is_array( $s['last_test'] ) ) {
		$t = $s['last_test'];
		echo '<p style="margin-top:10px">Last test ' . esc_html( $t['at'] ?? '' ) . ': <strong>' . ( ! empty( $t['ok'] ) ? 'passed' : 'failed' ) . '</strong> · ' . esc_html( $t['detail'] ?? '' ) . '</p>';
	}
	echo '</div>';
}
add_action( 'admin_post_smfb_save', function () {
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'smfb_save' ) ) {
		wp_die( 'Not allowed', 403 );
	}
	$ack_b = empty( $_POST['ack_balance'] ) ? 0 : 1;
	$ack_p = empty( $_POST['ack_paypal'] ) ? 0 : 1;
	$on    = empty( $_POST['booking_enabled'] ) ? 0 : 1;
	$flag  = 'saved';
	if ( $on && ( ! $ack_b || ! $ack_p ) ) {
		$on   = 0;
		$flag = 'acks';
	}
	smfb_save_settings( array( 'ack_balance' => $ack_b, 'ack_paypal' => $ack_p, 'booking_enabled' => $on ) );
	wp_safe_redirect( admin_url( 'options-general.php?page=smfb&smfb=' . $flag ) );
	exit;
} );
add_action( 'admin_post_smfb_test', function () {
	if ( ! current_user_can( 'manage_options' ) || ! check_admin_referer( 'smfb_test' ) ) {
		wp_die( 'Not allowed', 403 );
	}
	if ( '' === smfb_token( 'test' ) ) {
		wp_safe_redirect( admin_url( 'options-general.php?page=smfb&smfb=notoken' ) );
		exit;
	}
	smfb_self_test();
	wp_safe_redirect( admin_url( 'options-general.php?page=smfb&smfb=tested' ) );
	exit;
} );

/**
 * End-to-end sandbox run through the customer code path. Returns and stores { at, ok, detail }.
 * Duffel's test mode has an unlimited balance and the "Duffel Airways" test airline; no real ticket or charge happens.
 */
function smfb_self_test( $origin = 'LHR', $destination = 'JFK' ) {
	$result = array( 'at' => gmdate( 'Y-m-d H:i' ) . ' UTC', 'ok' => false, 'detail' => '' );
	$silence = static function () {
		return false;
	};
	$order_id = 0;
	$request  = 0;
	try {
		$search = smfb_duffel( 'POST', '/air/offer_requests?return_offers=true', array( 'slices' => array( array( 'origin' => $origin, 'destination' => $destination, 'departure_date' => gmdate( 'Y-m-d', time() + 30 * DAY_IN_SECONDS ) ) ), 'passengers' => array( array( 'type' => 'adult' ) ), 'cabin_class' => 'economy' ), 'test' );
		if ( is_wp_error( $search ) ) {
			throw new RuntimeException( 'search failed: ' . ( $search->get_error_data()['supplier'] ?? $search->get_error_code() ) );
		}
		$offers = (array) ( $search['offers'] ?? array() );
		usort( $offers, static function ( $a, $b ) {
			return ( 'ZZ' === ( $b['owner']['iata_code'] ?? '' ) ) <=> ( 'ZZ' === ( $a['owner']['iata_code'] ?? '' ) );
		} );
		$offer = $offers[0] ?? null;
		if ( ! $offer ) {
			throw new RuntimeException( 'no test offers returned' );
		}
		$passenger = array( 'id' => $offer['passengers'][0]['id'] ?? '', 'title' => 'mr', 'given_name' => 'Test', 'family_name' => 'Passenger', 'born_on' => '1990-01-01', 'passport' => 'P12345678', 'passport_country' => 'GB', 'passport_expiry' => gmdate( 'Y-m-d', time() + 5 * YEAR_IN_SECONDS ) );
		$start     = smfb_start( array( 'offer_id' => $offer['id'], 'passengers' => array( $passenger ), 'contact' => array( 'email' => get_option( 'admin_email' ), 'phone' => '+442080160508' ) ), 'test' );
		if ( is_wp_error( $start ) ) {
			throw new RuntimeException( 'start failed: ' . $start->get_error_message() . ' ' . ( $start->get_error_data()['supplier'] ?? '' ) );
		}
		$order_id = (int) $start['order'];
		$order    = wc_get_order( $order_id );
		$request  = (int) ( smfb_meta( $order )['request'] ?? 0 );
		foreach ( array( 'new_order', 'customer_processing_order', 'customer_completed_order', 'customer_on_hold_order', 'cancelled_order' ) as $mail ) {
			add_filter( 'woocommerce_email_enabled_' . $mail, $silence, 999 );
		}
		add_filter( 'pre_wp_mail', '__return_true', 999 );
		$order->payment_complete( 'SANDBOX-SELFTEST' );   // the same hook a real PayPal capture fires
		$m = smfb_meta( wc_get_order( $order_id ) );
		$result['ok']     = 'ticketed' === ( $m['state'] ?? '' ) && '' !== ( $m['pnr'] ?? '' );
		$result['detail'] = sprintf( 'mode %s, state %s, booking reference %s, customer price %s %s%s', $start['mode'], $m['state'] ?? '?', $m['pnr'] ?: '-', $start['amount'], $start['currency'], ! empty( $m['error'] ) ? ', error ' . $m['error'] : '' );
	} catch ( Throwable $e ) {
		$result['detail'] = substr( $e->getMessage(), 0, 200 );
	} finally {
		remove_filter( 'pre_wp_mail', '__return_true', 999 );
		if ( $order_id && ( $o = wc_get_order( $order_id ) ) ) {
			$o->delete( true );
		}
		if ( $request ) {
			wp_delete_post( $request, true );
		}
	}
	smfb_save_settings( array( 'last_test' => $result ) );
	return $result;
}
