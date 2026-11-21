<?php
/**
 * Plugin Name: Sasta Milaga global product page data
 * Description: Read-only JSON for the edge-rendered global product page (/global-shop/p/<pid>/): name, plain-text description, images,
 * options and the USD price the global cart (GDCS VirtualCheckout) will charge for the visitor's destination. Reuses the plugin's own
 * 1-hour supplier cache (GDCS LiveCatalog::detail) plus a 30-minute transient per product and destination. Writes nothing.
 * Source of truth: kosama685/sastamilaga wordpress/mu-plugins/sm-global-pdp-api.php. Added 2026-11-21. Undo: delete this file.
 *
 * @package SastaMilaga
 */

defined( 'ABSPATH' ) || exit;

add_action( 'rest_api_init', function () {
	register_rest_route(
		'sm/v1',
		'/gpdp/(?P<pid>[A-Za-z0-9-]{1,100})',
		array(
			'methods'             => 'GET',
			'permission_callback' => '__return_true',
			'callback'            => 'smgp_data',
		)
	);
} );

/**
 * Exchange-rate keep-alive. Global prices and the global cart need a GDCS exchange rate younger than 72 hours, refreshed by the
 * daily WP-Cron event gdcs_refresh_exchange_rates. WP-Cron is disabled on this host, so rates expired on 2026-11-17 and every global
 * price failed ("A current verified exchange rate for PKR is required"). When the saved rates are older than 30 hours, the plugin's own
 * refresh (GDCS Currency::scheduled_refresh, which logs its own errors) runs once at the very end of a front-end request, after the
 * response is sent. At most one attempt per 30 minutes. No cron or persistence change.
 */
add_action( 'shutdown', function () {
	if ( is_admin() || wp_doing_cron() || ( defined( 'WP_CLI' ) && WP_CLI ) || ! class_exists( '\GDCS\Currency' ) ) {
		return;
	}
	$saved = (array) get_option( 'gdcs_exchange_rates', array() );
	if ( ! empty( $saved['updated_at'] ) && time() - (int) $saved['updated_at'] < 30 * HOUR_IN_SECONDS ) {
		return;
	}
	if ( get_transient( 'smgp_fx_try' ) ) {
		return;
	}
	set_transient( 'smgp_fx_try', 1, 30 * MINUTE_IN_SECONDS );
	if ( function_exists( 'litespeed_finish_request' ) ) {
		litespeed_finish_request();
	} elseif ( function_exists( 'fastcgi_finish_request' ) ) {
		fastcgi_finish_request();
	}
	\GDCS\Currency::scheduled_refresh();
}, PHP_INT_MAX );

/** Plain text with paragraph breaks kept; supplier HTML is never echoed to the browser. */
function smgp_text( $html ) {
	$html = preg_replace( '#<\s*(br|/p|/li|/h[1-6]|/div|/tr)\b[^>]*>#i', "\n", (string) $html );
	$text = html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$text = preg_replace( "/[ \t\x{00A0}]+/u", ' ', $text );
	$text = preg_replace( "/\n\s*\n+/", "\n\n", trim( $text ) );
	return mb_substr( $text, 0, 6000 );
}

function smgp_data( WP_REST_Request $r ) {
	$pid = (string) $r['pid'];
	if ( 0 === stripos( $pid, 'hhc-' ) ) {
		return new WP_Error( 'smgp_local', 'Local products use their own page.', array( 'status' => 404 ) );
	}
	if ( ! class_exists( '\GDCS\LiveCatalog' ) ) {
		return new WP_Error( 'smgp_off', 'The global catalogue is not available.', array( 'status' => 503 ) );
	}
	if ( function_exists( 'smla_blocked' ) && smla_blocked( $pid, '/global-shop/p/' . $pid . '/' ) ) {
		return new WP_Error( 'smgp_blocked', 'This product is not available on Sasta Milaga.', array( 'status' => 404 ) );
	}
	$cc  = class_exists( '\GDCS\CountryPolicy' ) ? (string) \GDCS\CountryPolicy::country() : '';
	$key = 'smgp2_' . md5( $pid . '|' . $cc );
	$out = get_transient( $key );
	if ( false === $out ) {
		try {
			$d = \GDCS\LiveCatalog::detail( $pid );
		} catch ( \Throwable $e ) {
			return new WP_Error( 'smgp_unavailable', 'This supplier product is unavailable right now.', array( 'status' => 404 ) );
		}
		$options = array();
		foreach ( (array) ( $d['variants'] ?? array() ) as $v ) {
			if ( (float) ( $v['price'] ?? 0 ) <= 0 ) {
				continue;
			}
			$usd = null;
			try {
				$pv  = \GDCS\Pricing::preview( (float) $v['price'], array( 'country' => $cc ? $cc : 'US' ) );
				$usd = round( (float) \GDCS\Currency::convert( (float) $pv['retail'], (string) $pv['currency'], 'USD' ), 2 );
			} catch ( \Throwable $e ) {
				$usd = null;
			}
			$options[] = array(
				'vid'   => (string) $v['vid'],
				'name'  => (string) $v['name'],
				'sku'   => (string) ( $v['sku'] ?? '' ),
				'image' => esc_url_raw( (string) ( $v['image'] ?? '' ) ),
				'usd'   => $usd,
			);
		}
		$images = array();
		foreach ( (array) ( $d['images'] ?? array() ) as $img ) {
			$img = esc_url_raw( (string) $img );
			if ( $img && 0 === strpos( $img, 'https://' ) ) {
				$images[] = $img;
			}
		}
		$out = array(
			'pid'              => (string) $d['pid'],
			'name'             => (string) $d['name'],
			'sku'              => (string) ( $d['sku'] ?? '' ),
			'description'      => smgp_text( $d['description'] ?? '' ),
			'images'           => array_slice( array_values( array_unique( $images ) ), 0, 12 ),
			'options'          => $options,
			'country'          => $cc,
			'ordering_enabled' => class_exists( '\GDCS\VirtualCheckout' ) && \GDCS\VirtualCheckout::ready(),
			'checked_at'       => (int) ( $d['checked_at'] ?? time() ),
		);
		$priced = array_filter( array_column( $options, 'usd' ), 'is_numeric' );
		set_transient( $key, $out, ( $priced || ! $options ) ? 30 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );   // never keep a missing price for long
	}
	$res = rest_ensure_response( $out );
	$res->header( 'Cache-Control', 'private, max-age=300' );
	return $res;
}
