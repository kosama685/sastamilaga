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
  function run(sku, qty, buyNow, el) {
    if (!sku || (el && el.getAttribute('aria-busy'))) return; if (el) el.setAttribute('aria-busy', 'true');
    W.add(sku, qty).then(function (r) {
      if (el) el.removeAttribute('aria-busy');
      if (r.ok) { if (buyNow) location.href = '/checkout/'; else toast('Added to cart. <a href="/cart/" style="color:#FFB347;margin-left:8px">View cart</a>'); }
      else if (r.reason === 'unmapped') toast('This item is ordered on WhatsApp.' + (wa() ? ' <a href="' + wa() + '" target="_blank" rel="noopener" style="color:#FFB347;margin-left:8px">Order on WhatsApp</a>' : ''));
      else toast(r.message);
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
      var start = function () { W.add(want, 1).then(function (r) { if (r.ok) { if (act === 'buy') location.href = '/checkout/'; else { toast('Added to cart. <a href="/cart/" style="color:#FFB347;margin-left:8px">View cart</a>'); } } else if (r.reason === 'unmapped') toast('This item is ordered on WhatsApp.'); else toast(r.message); }); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    }
  }
  if (W.active) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', W.badge); else setTimeout(W.badge, 600); }
})();
