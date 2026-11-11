/* WooCommerce bridge. On sastamilaga.com WooCommerce owns the cart, checkout, orders and payments.
 * "Add to cart" and "Buy now" on the static pages add the product to the REAL WooCommerce cart (Store API, same-origin cookies),
 * so /cart/ and /checkout/ show what the customer chose. Nothing is stored or priced in the browser: WordPress prices the cart.
 *   SMWoo.add(sku, qty)  -> Promise<{ok, status, message, reason}>      SMWoo.count() -> Promise<number>
 * The SKU -> WordPress product id map is data/wp/product-ids.json (read-only export of the store). Products with no id there
 * (not in WordPress, or global items) are ordered on WhatsApp instead. */
(function () {
  'use strict';
  var host = location.hostname, ROOT = '/';
  var W = window.SMWoo = { active: /(^|\.)sastamilaga\.com$/.test(host) || !!window.SM_FORCE_WOO };
  var ids = null, nonce = '', synced = false;
  function json(u, o) { o = o || {}; o.credentials = 'include'; return fetch(u, o).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { r: r, j: j }; }); }); }
  function plain(s) { var d = document.createElement('div'); d.innerHTML = String(s || ''); return d.textContent || ''; }
  function loadIds() { if (ids) return Promise.resolve(ids); return fetch(ROOT + 'data/wp/product-ids.json').then(function (r) { return r.json(); }).then(function (j) { ids = j; return j; }); }
  // WordPress decides who may buy Pakistan-only products from the shopper's country: follow the country chosen in the site's country window.
  function syncContext() {
    if (synced) return Promise.resolve(); synced = true;
    var want = {}; try { want = JSON.parse(localStorage.getItem('sm_market') || '{}'); } catch (e) {}
    if (!want.country) return Promise.resolve();
    return json(ROOT + 'wp-json/gdcs/v1/context').then(function (c) {
      if (!c.j || c.j.country === want.country) return;
      return json(ROOT + 'wp-json/gdcs/v1/context', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': c.j.csrf }, body: JSON.stringify({ country: want.country, currency: want.currency || c.j.currency, language: want.lang || c.j.language || 'en', csrf: c.j.csrf }) });
    }).catch(function () {});
  }
  function getNonce(force) {
    if (nonce && !force) return Promise.resolve(nonce);
    return fetch(ROOT + 'wp-json/wc/store/v1/cart', { credentials: 'include' }).then(function (r) { nonce = r.headers.get('nonce') || ''; return nonce; });
  }
  function post(id, qty, retried) {
    return getNonce(retried).then(function (n) {
      return json(ROOT + 'wp-json/wc/store/v1/cart/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: n }, body: JSON.stringify({ id: id, quantity: qty }) });
    }).then(function (x) {
      if (x.r.status === 403 && !retried) return post(id, qty, true);   // the nonce had expired
      if (x.r.status === 201 || x.r.status === 200) return { ok: true, status: x.r.status, count: x.j && x.j.items_count };
      return { ok: false, status: x.r.status, message: plain(x.j && x.j.message) || 'The cart could not be updated.', reason: (x.j && x.j.code) || 'error' };
    });
  }
  W.add = function (sku, qty) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    return loadIds().then(function (map) {
      var id = map[String(sku)]; if (!id) return { ok: false, reason: 'unmapped', message: 'This item is ordered on WhatsApp.' };
      return syncContext().then(function () { return post(id, qty); });
    }).catch(function () { return { ok: false, reason: 'network', message: 'The store could not be reached. Please try again.' }; }).then(function (res) { if (res.ok) W.badge(); return res; });
  };
  W.count = function () { return fetch(ROOT + 'wp-json/wc/store/v1/cart', { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (j) { return (j && j.items_count) || 0; }).catch(function () { return 0; }); };
  W.badge = function () { if (!W.active) return; W.count().then(function (n) { document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); }); }); };
  if (W.active) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', W.badge); else setTimeout(W.badge, 600); }
})();
