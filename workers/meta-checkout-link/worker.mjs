/**
 * Meta Shops -> native WooCommerce checkout-link.
 * Isolated route only: sastamilaga.com/checkout-link*
 * Does NOT create/price carts at the edge. WooCommerce 11.x is the system of record.
 * Never add a GitHub/static fallback; a failed origin must fail closed.
 */
const HOST = 'sastamilaga.com';
const PATH = /^\/checkout-link\/?$/i;
const ID = /^(?:[A-Za-z0-9._~=-]{1,100})$/;
const noStore = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };

function fail(status, message) {
  return new Response(message, { status, headers: { ...noStore, 'Content-Type': 'text/plain; charset=utf-8' } });
}

function validate(url) {
  if (url.href.length > 8192) return 'Checkout link is too long.';
  const all = url.searchParams.getAll('products');
  if (all.length !== 1 || !all[0] || all[0].length > 4096) return 'Exactly one products parameter is required.';
  const items = all[0].split(',');
  if (items.length < 1 || items.length > 30) return 'Choose between 1 and 30 products.';
  const seen = new Set();
  for (const entry of items) {
    const parts = entry.split(':');
    if (parts.length !== 2 || !ID.test(parts[0]) || !/^[1-9][0-9]?$/.test(parts[1])) return 'Invalid product or quantity.';
    if (seen.has(parts[0])) return 'Duplicate product identifiers are not supported.';
    seen.add(parts[0]);
  }
  const coupons = url.searchParams.getAll('coupon');
  if (coupons.length > 1 || (coupons.length && (coupons[0].length > 100 || /[\x00-\x1f\x7f]/.test(coupons[0])))) return 'Invalid coupon.';
  return '';
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== HOST || !PATH.test(url.pathname)) return fail(404, 'Not found');
    if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Method not allowed');
    if (!env.PRIMARY || typeof env.PRIMARY.fetch !== 'function') return fail(503, 'Checkout temporarily unavailable');
    if (request.method === 'GET') {
      const issue = validate(url);
      if (issue) return fail(400, issue);
    }
    try {
      // Preserve the full query (products, coupon, Meta attribution), cookies and
      // all origin Set-Cookie headers, while preventing redirect following at the edge.
      const response = await env.PRIMARY.fetch(new Request(request, { redirect: 'manual' }));
      const headers = new Headers(response.headers);
      Object.entries(noStore).forEach(([name, value]) => headers.set(name, value));
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status, statusText: response.statusText, headers,
      });
    } catch (_) {
      return fail(502, 'Checkout temporarily unavailable. Please try again.');
    }
  },
};
