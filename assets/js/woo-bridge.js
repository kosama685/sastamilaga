/* Sasta Milaga static store bridge (restored 2026-11-22 at the owner's request: Add to cart, Buy now and Quick Buy work like on
 * 20 November, without WooCommerce, WordPress or any Cloudflare Worker).
 *
 *   Local products (Pakistan, PKR)  -> localStorage "sm_cart"  rows {id: <sku, lower case>, qty}      (the cart app.js reads)
 *   CJ / global products (USD)      -> localStorage "sm_gcart" rows {id, sku, name, img, vkey, vname, unit, qty, opt, ship, ...}
 *                                      (the same format global.js writes, so one checkout shows both)
 *   Cart:     <site>/#/cart        Checkout: <site>/#/checkout   (app.js: cash on delivery in Pakistan, bank transfer, PayPal or a
 *             debit / credit card through a PayPal payment link; every order is recorded in Formspree before any payment)
 *
 * On sastamilaga.com the paths /cart/ and /checkout/ belong to WordPress, so the static shop keeps the hash addresses there, and links to
 * /cart/, /checkout/ or the retired /request-cart/ are sent to them. WordPress forwards its own empty /cart/ and /checkout/ here too
 * (wordpress/mu-plugins/sm-static-cart-bridge.php). The file keeps its historical name because chrome.js and every generated page load it.
 *
 * API: window.SMStore = { addLocal(sku, qty), addCj(row), count(), cartUrl(), checkoutUrl(), refresh() }
 */
(function (g) {
  'use strict';
  if (g.SMStore) return;
  var MAX_QTY = 99, busy = false, vmCard = null;
  var me = document.currentScript || [].filter.call(document.scripts, function (s) { return /\/assets\/js\/woo-bridge\.js/.test(s.src); })[0];
  var ROOT = '/';
  try { if (me && me.src) ROOT = new URL(me.src.replace(/assets\/js\/woo-bridge\.js.*$/, ''), location.href).pathname; } catch (e) { /* keep "/" */ }
  var url = function (route) { return ROOT + '#/' + route; };

  function clean(s, n) { return String(s == null ? '' : s).trim().slice(0, n || 200); }
  function qtyOk(n) { n = Number(n); return Number.isInteger(n) && n >= 1 && n <= MAX_QTY ? n : 1; }
  function read(key) { try { var v = JSON.parse(g.localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function write(key, rows) { try { g.localStorage.setItem(key, JSON.stringify(rows)); return true; } catch (e) { return false; } }
  function count() { return read('sm_cart').concat(read('sm_gcart')).reduce(function (a, x) { return a + (Number(x && x.qty) || 0); }, 0); }

  /* changed = the cart contents changed (an add here or in another tab): only then is the cart PAGE redrawn. The checkout is never
     redrawn from here, so nothing the shopper typed is lost. */
  function refresh(changed) {
    var n = count();
    document.querySelectorAll('.smh-cart__count, #cartCount, [data-cart-count]').forEach(function (el) { el.textContent = String(n); el.setAttribute('data-n', String(n)); el.hidden = false; });
    // The header template printed a fixed "Rs 0.00" under "Cart"; show the real number of items instead (prices are totalled in the cart).
    document.querySelectorAll('.smh-cart__total').forEach(function (el) { el.textContent = n ? n + ' item' + (n === 1 ? '' : 's') : 'Empty'; });
    try { if (g.SMApp && typeof g.SMApp.setCart === 'function') g.SMApp.setCart(g.SMApp.getCart()); } catch (e) { /* app.js not on this page */ }
    try { if (changed && g.SMApp && /^#\/cart/.test(location.hash)) g.SMApp.route(); } catch (e) { /* ignore */ }
    try { document.dispatchEvent(new CustomEvent('sm:cart-changed', { detail: { count: n } })); } catch (e) { /* old browsers */ }
  }

  /* ---------- the two carts ---------- */
  function addLocal(sku, qty) {
    sku = clean(sku, 128).toLowerCase();
    if (!sku) return { ok: false, message: 'This product has no SKU, so it cannot be added. Please order it on WhatsApp.' };
    var rows = read('sm_cart'), n = qtyOk(qty), row = rows.filter(function (x) { return String(x && x.id).toLowerCase() === sku; })[0];
    if (row) row.qty = Math.min(MAX_QTY, (Number(row.qty) || 0) + n); else rows.push({ id: sku, qty: n });
    if (!write('sm_cart', rows)) return { ok: false, message: 'Your browser blocked saving the cart. Allow site storage and try again.' };
    refresh(true);
    return { ok: true, count: count() };
  }
  function addCj(row) {
    if (!row || !row.id) return { ok: false, message: 'This global item is missing its product id.' };
    var unit = Number(row.unit);
    if (!(unit > 0)) return { ok: false, message: 'This option has no listed price yet. Ask for a quote on WhatsApp.' };
    var item = {
      id: clean(row.id, 64), sku: clean(row.sku, 80), name: clean(row.name, 240) || 'Global item', img: /^https:\/\//i.test(row.img || '') ? clean(row.img, 500) : '',
      vkey: clean(row.vkey, 120), vname: clean(row.vname, 160), unit: Math.round(unit * 100) / 100, qty: qtyOk(row.qty), opt: clean(row.opt, 120),
      ship: clean(row.ship, 160), shipAmt: Number(row.shipAmt) > 0 ? Number(row.shipAmt) : 0, shipCur: clean(row.shipCur || 'USD', 3), url: clean(row.url, 500), cs: clean(row.cs, 80)
    };
    var key = [item.id, item.opt, item.vkey].join('|'), rows = read('sm_gcart');
    var same = rows.filter(function (x) { return [x.id, x.opt || '', x.vkey || ''].join('|') === key; })[0];
    if (same) { same.qty = Math.min(MAX_QTY, (Number(same.qty) || 0) + item.qty); if (item.ship) { same.ship = item.ship; same.shipAmt = item.shipAmt; same.shipCur = item.shipCur; } }
    else rows.push(item);
    if (!write('sm_gcart', rows)) return { ok: false, message: 'Your browser blocked saving the cart. Allow site storage and try again.' };
    refresh(true);
    return { ok: true, count: count() };
  }

  /* ---------- feedback ---------- */
  function notice(message, withLinks, isError) {
    var t = document.getElementById('sm-store-feedback');
    if (!t) {
      t = document.createElement('div'); t.id = 'sm-store-feedback'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite');
      t.style.cssText = 'position:fixed;left:12px;right:12px;bottom:16px;max-width:560px;margin:0 auto;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;padding:14px 16px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.28);font:600 15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff';
      document.body.appendChild(t);
    }
    t.style.background = isError ? '#8a1c12' : '#0b3b20';
    t.replaceChildren(document.createTextNode(message));
    if (withLinks) {
      [['View cart', url('cart')], ['Checkout', url('checkout')]].forEach(function (l, i) {
        var a = document.createElement('a'); a.href = l[1]; a.textContent = l[0];
        a.style.cssText = 'color:' + (i ? '#0b3b20' : '#fff') + ';background:' + (i ? '#ffb020' : 'transparent') + ';border:1px solid #ffb020;border-radius:999px;padding:6px 14px;text-decoration:none;font-weight:800';
        t.appendChild(a);
      });
    }
    clearTimeout(t._h); t._h = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, withLinks ? 7000 : 5000);
  }
  function done(res, buyNow) {
    if (!res.ok) { notice(res.message, false, true); return; }
    if (buyNow) { location.assign(url('checkout')); return; }
    notice('Added to cart (' + res.count + ' item' + (res.count === 1 ? '' : 's') + ').', true);
  }

  /* ---------- reading the product the shopper is looking at ---------- */
  function schemaSku() {
    var sku = '';
    document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
      try {
        var j = JSON.parse(el.textContent || '{}'), nodes = Array.isArray(j) ? j : (j['@graph'] || [j]);
        nodes.forEach(function (x) { if (!sku && x && x['@type'] === 'Product' && x.sku) sku = clean(x.sku, 100); });
      } catch (e) { /* malformed block */ }
    });
    return sku;
  }
  function pageSku() {
    var m = location.pathname.match(/-((?:[a-z]{2,4}-)[0-9a-z][0-9a-z-]*)\.html$/i);
    var holder = document.querySelector('main [data-sku]');
    return schemaSku() || (holder && holder.getAttribute('data-sku')) || (m ? m[1] : '');
  }
  function pageQty() {
    var e = document.getElementById('pdpQty') || document.getElementById('qty') || document.querySelector('main input[name="quantity"]');
    return e ? qtyOk(e.value || e.textContent) : 1;
  }

  /* ---------- clicks (window capture: runs before any older handler) ---------- */
  function onClick(e) {
    var t = e.target && e.target.closest ? e.target : null;
    if (!t) return;
    var opener = t.closest('[data-vm-src]');
    if (opener) { vmCard = opener; return; }

    // Links to the WordPress cart / checkout or the retired request cart open the static cart instead (not order-pay or other endpoints).
    var link = t.closest('a[href]');
    if (link && !link.target && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      try {
        var u = new URL(link.getAttribute('href'), location.href), p = u.pathname.replace(/\/+$/, '/');
        if (u.origin === location.origin && !u.search && !u.hash && (p === '/cart/' || p === ROOT + 'cart/' || p === '/request-cart/' || p === ROOT + 'request-cart/' || p === '/checkout/' || p === ROOT + 'checkout/' || p === '/order/')) {
          e.preventDefault(); e.stopImmediatePropagation();
          location.assign(url(/checkout|order/.test(p) ? 'checkout' : 'cart'));
          return;
        }
      } catch (err) { /* not a URL */ }
    }

    var target = t.closest('#smvm-cart,#smvm-buy,[data-add-cart],main a[href*="#/product/"]');
    if (!target) return;
    var sku = '', q = 1, buyNow = false;
    if (target.id === 'smvm-cart' || target.id === 'smvm-buy') {            // product-video quick buy dialog (local products)
      var sel = document.getElementById('smvm-opt'), opts = [];
      try { opts = JSON.parse((vmCard && vmCard.getAttribute('data-vm-opts')) || '[]'); } catch (err) { opts = []; }
      var chosen = sel && sel.selectedIndex >= 0 ? opts[sel.selectedIndex] : null;
      sku = (chosen && chosen.q) || (vmCard && vmCard.getAttribute('data-vm-q')) || '';
      q = qtyOk((document.getElementById('smvm-qty') || {}).value);
      buyNow = target.id === 'smvm-buy';
    } else if (target.hasAttribute('data-add-cart')) {
      if (g.SMApp) return;                                                   // app.js handles its own product cards and product view
      sku = target.getAttribute('data-add-cart'); q = qtyOk(target.getAttribute('data-qty'));
    } else {                                                                 // generated product page (p/*.html): "Add to cart" / "Buy now" links
      var label = clean(target.textContent, 80).toLowerCase();
      if (!/^(add to cart|buy now)/.test(label) && !/add to cart|buy now/i.test(target.getAttribute('aria-label') || '')) return;
      if (g.SMApp && document.getElementById('app') && !document.querySelector('main .pdp')) return;   // app.js product view
      buyNow = /buy now/.test(label) || /buy now/i.test(target.getAttribute('aria-label') || '');
      sku = pageSku(); q = pageQty();
    }
    if (!sku) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (busy) return;
    busy = true;
    try { done(addLocal(sku, q), buyNow); } finally { setTimeout(function () { busy = false; }, 350); }
  }
  g.addEventListener('click', onClick, true);

  /* Items saved in the request cart (localStorage "sm_order_cart_v1", /request-cart/ + /order/, live 22 Nov 20:12 until this release) move
     into this cart once, so nobody loses a basket. Only rows that are exact are moved: a local SKU without option attributes (app.js prices
     it from the catalogue) and a CJ option with its USD price. Anything else stays where it was, untouched. */
  function adoptRequestCart() {
    var old = read('sm_order_cart_v1'); if (!old.length) return;
    var keep = [], moved = 0;
    old.forEach(function (r) {
      var res = null, q = qtyOk(r && r.qty);
      if (r && r.type === 'local' && r.sku && !(Array.isArray(r.attributes) && r.attributes.length)) res = addLocal(r.sku, q);
      else if (r && r.type === 'cj' && r.id && Number(r.unit) > 0) res = addCj({ id: r.id, sku: r.sku, name: r.name, vkey: r.vkey || r.sku, vname: r.vname, unit: Number(r.unit), qty: q, url: r.url });
      if (res && res.ok) moved++; else keep.push(r);
    });
    if (moved) write('sm_order_cart_v1', keep);
  }

  function start() {
    try { adoptRequestCart(); } catch (e) { /* never block the page */ }
    refresh(false);
    setTimeout(function () { refresh(false); }, 1500);   // chrome.js draws the header (and its badge) a moment after load
    g.addEventListener('storage', function (ev) { if (ev.key === 'sm_cart' || ev.key === 'sm_gcart') refresh(true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();

  g.SMStore = { addLocal: addLocal, addCj: addCj, count: count, refresh: refresh, cartUrl: function () { return url('cart'); }, checkoutUrl: function () { return url('checkout'); }, notice: notice };
})(window);
