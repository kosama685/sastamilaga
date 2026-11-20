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
  var REASONS = { woocommerce_rest_product_not_purchasable: 'not_purchasable', woocommerce_rest_missing_attributes: 'choose_option', woocommerce_rest_product_out_of_stock: 'out_of_stock', woocommerce_rest_cart_product_no_stock: 'out_of_stock' };
  function post(id, qty, retried, variation) {
    var body = { id: id, quantity: qty }; if (variation && variation.length) body.variation = variation;
    return getNonce(retried).then(function (n) {
      return json(ROOT + 'wp-json/wc/store/v1/cart/add-item', { method: 'POST', headers: { 'Content-Type': 'application/json', Nonce: n }, body: JSON.stringify(body) });
    }).then(function (x) {
      if (x.r.status === 403 && !retried) return post(id, qty, true, variation);   // the nonce had expired
      if (x.r.status === 201 || x.r.status === 200) return { ok: true, status: x.r.status, count: x.j && x.j.items_count };
      var code = (x.j && x.j.code) || 'error';
      return { ok: false, status: x.r.status, code: code, message: plain(x.j && x.j.message) || 'The cart could not be updated.', reason: REASONS[code] || (x.r.status >= 500 ? 'network' : 'error') };
    });
  }
  /* What the shopper sees after an add attempt. Pure: no DOM, no network (unit-tested in tools/woo-bridge-flow.test.mjs).
     WooCommerce is the only cart: success goes to /cart/ or /checkout/, never to the old static checkout (/#/checkout). */
  W.decide = function (res, buyNow, waHref) {
    var wa = waHref ? { href: waHref, label: 'Ask about this item on WhatsApp' } : null;
    if (res && res.ok) return buyNow ? { kind: 'go', href: '/checkout/' } : { kind: 'added', message: 'Added to your cart.', link: { href: '/cart/', label: 'View cart' } };
    var r = (res && res.reason) || 'error';
    if (r === 'not_purchasable') return { kind: 'refused', message: 'This item is delivered in Pakistan only.', link: { href: '/global-shop/', label: 'See items that ship to you' }, alt: wa };
    if (r === 'choose_option') return { kind: 'refused', message: 'Please choose an option (size, colour or model) first.', link: null, alt: null };
    if (r === 'out_of_stock') return { kind: 'refused', message: 'This item is out of stock right now.', link: wa, alt: null };
    if (r === 'unmapped') return { kind: 'refused', message: 'This item is ordered on WhatsApp.', link: wa, alt: null };
    if (r === 'network') return { kind: 'refused', message: 'The store could not be reached. Please try again.', link: wa, alt: null };
    return { kind: 'refused', message: (res && res.message) || 'The cart could not be updated.', link: wa, alt: null };
  };
  /* Read-only SKU availability for CJ option dialogs. Does not create or price products. */
  W.hasSKU = function (sku) {
    return loadIds().then(function (map) { return Boolean(map && map[String(sku)]); }).catch(function () { return null; });
  };
  W.sync = syncContext;
  // The store answers in 2-10 seconds, so everything a click needs is prepared in the background first (in this order: the country decides the session).
  W.warm = function () { return loadIds().then(function () { return syncContext(); }).then(function () { return getNonce(false); }).catch(function () {}); };
  W.add = function (sku, qty, variation) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    return loadIds().then(function (map) {
      var id = map[String(sku)]; if (!id) return { ok: false, reason: 'unmapped', message: 'This item is ordered on WhatsApp.' };
      return syncContext().then(function () { return post(id, qty, false, variation); });
    }).catch(function () { return { ok: false, reason: 'network', message: 'The store could not be reached. Please try again.' }; }).then(function (res) { if (res.ok) W.badge(); return res; });
  };
  W.count = function () { return fetch(ROOT + 'wp-json/wc/store/v1/cart', { credentials: 'include' }).then(function (r) { return r.json(); }).then(function (j) { return (j && j.items_count) || 0; }).catch(function () { return 0; }); };
  /* The header badge shows the WooCommerce cart count (the cart the shopper will actually pay for). */
  W.badge = function () {
    return W.count().then(function (n) {
      document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); });
      return n;
    });
  };
  /* LEGACY browser-only cart (localStorage sm_cart). No longer used by this file's buttons: the static checkout it fed is switched off
     at the edge, so items put here could never be paid for. Re-tested 2026-11-20 (tools/probe-woo-purchasable.mjs): in a Pakistan
     session WooCommerce accepted 20 of 20 mapped products (variable ones once the variation is sent); outside Pakistan local products
     are refused by the store's Pakistan-only policy, which W.decide() explains to the shopper. Kept only for other legacy callers. */
  W.localAdd = function (sku, qty) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1)); var cart = []; try { cart = JSON.parse(localStorage.getItem('sm_cart') || '[]'); } catch (e) {}
    var row = cart.filter(function (x) { return String(x.id).toLowerCase() === String(sku).toLowerCase(); })[0]; if (row) row.qty = Math.min(99, (row.qty || 0) + qty); else cart.push({ id: sku, qty: qty });
    try { localStorage.setItem('sm_cart', JSON.stringify(cart)); } catch (e) { return false; } W.badge(); return true;
  };
  /* Click handling. The domain's recovery layer listens for clicks on the document in the capture phase and swallows anything that looks
     like a static checkout. The window sits above the document in the event path, so this capture listener runs first. */
  function toast(html) {
    var t = document.getElementById('sm-static-toast');
    if (!t) { t = document.createElement('div'); t.id = 'sm-static-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483600;background:#0B3B20;color:#fff;padding:12px 20px;border-radius:12px;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);opacity:0;transition:opacity .25s;max-width:92vw'; document.body.appendChild(t); }
    t.innerHTML = html; t.style.opacity = '1'; clearTimeout(t.__h); t.__h = setTimeout(function () { t.style.opacity = '0'; }, 4200);
  }
  function pageSku() {
    var out = ''; document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) { try { var j = JSON.parse(s.textContent); (Array.isArray(j) ? j : j['@graph'] || [j]).forEach(function (x) { if (x['@type'] === 'Product' && x.sku) out = String(x.sku); }); } catch (e) {} });
    return out;
  }
  function wa() { var a = document.querySelector('main a.sm-wa-btn'); return a ? a.href : ''; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function linkHtml(l) { if (!l) return ''; var ext = /^https?:/.test(l.href) && l.href.indexOf(location.origin) !== 0; return ' <a href="' + esc(l.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + ' style="color:#FFB347;margin-left:8px">' + esc(l.label) + '</a>'; }
  /* Chosen options on the page (WooCommerce attribute selects), sent so variable products can be added. */
  function pageVariation() {
    var out = []; document.querySelectorAll('main select[name^="attribute_"]').forEach(function (s) { if (s.value) out.push({ attribute: s.name.replace(/^attribute_/, ''), value: s.value }); });
    return out;
  }
  function show(d) {
    if (d.kind === 'go') { toast('Opening secure checkout…'); location.href = d.href; return; }
    toast(esc(d.message) + linkHtml(d.link) + linkHtml(d.alt));
  }
  function run(sku, qty, buyNow, el) {
    if (!sku || (el && el.getAttribute('aria-busy'))) return; if (el) el.setAttribute('aria-busy', 'true');
    qty = Math.max(1, parseInt((document.getElementById('pdpQty') || {}).textContent, 10) || qty || 1);
    toast('Adding to your cart…');
    return W.add(sku, qty, pageVariation()).then(function (res) {
      if (el) el.removeAttribute('aria-busy');
      show(W.decide(res, buyNow, wa()));
      return res;
    });
  }
  var remote = /\.github\.io$/.test(host);   // the GitHub copy cannot share a WooCommerce session with the store: it hands the shopper over to the store with the item
  function go(sku, buyNow) { location.href = 'https://sastamilaga.com/?sm_do=' + (buyNow ? 'buy' : 'add') + '&sku=' + encodeURIComponent(sku); }
  window.addEventListener('click', function (e) {
    if (!W.active && !remote) return; var t = e.target; if (!t || !t.closest) return;
    var card = t.closest('[data-add-cart]');   // product cards (home, shop, search, categories)
    if (card) { e.preventDefault(); e.stopImmediatePropagation(); if (remote) go(card.getAttribute('data-add-cart'), false); else run(card.getAttribute('data-add-cart'), 1, false, card); return; }
    var a = t.closest('main a[href*="#/product/"]'); if (!a) return;   // static product page buttons
    var label = (a.textContent || '').trim().toLowerCase(), add = /^add to cart/.test(label), buy = /^buy now/.test(label); if (!add && !buy) return;
    var sku = pageSku(); if (!sku) return;
    e.preventDefault(); e.stopImmediatePropagation(); if (remote) go(sku, buy); else run(sku, 1, buy, a);
  }, true);
  // Arriving from the GitHub copy (or a shared link) with an item to add: do it, then clean the address.
  if (W.active) {
    var q = new URLSearchParams(location.search), act = q.get('sm_do'), want = q.get('sku');
    if (act && want && /^[A-Za-z0-9_-]{3,40}$/.test(want)) {
      history.replaceState(null, '', location.pathname);
      var start = function () { W.add(want, 1).then(function (res) { show(W.decide(res, act === 'buy', wa())); }); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    }
  }
  if (W.active) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', W.badge); else setTimeout(W.badge, 600); }
})();
