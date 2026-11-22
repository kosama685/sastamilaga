/* Global product page (edge-rendered by workers/global-pdp; same layout as the local product pages).
 * Adds, in the browser: the full photo gallery with zoom, the supplier description, options with the price for the shopper's destination,
 * a delivery check, and the REAL cart: POST /wp-json/gdcs/v1/live/cart (GDCS VirtualCheckout) puts the item in the WooCommerce cart at a
 * server-verified price; "Buy now" then opens the WooCommerce checkout. Nothing is priced, stored or ordered in the browser.
 * Data: GET /wp-json/sm/v1/gpdp/<pid> (wordpress/mu-plugins/sm-global-pdp-api.php), GET /api/cj/shipping (indicative carrier quotes). */
(function () {
  'use strict';
  var root = document.querySelector('[data-gpdp]'), dataEl = document.getElementById('gpdp-data');
  if (!root || !dataEl) return;
  var P = {}; try { P = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var $ = function (sel) { return root.querySelector(sel); };
  var els = { main: $('[data-gpdp-main]'), thumbs: $('[data-gpdp-thumbs]'), desc: document.querySelector('[data-gpdp-desc]'), price: $('[data-gpdp-price]'),
    dest: $('[data-gpdp-dest]'), opts: $('[data-gpdp-options]'), qtyWrap: $('[data-gpdp-qty-wrap]'), qty: $('[data-gpdp-qty]'), delivery: $('[data-gpdp-delivery]'),
    add: $('[data-gpdp-add]'), buy: $('[data-gpdp-buy]'), status: $('[data-gpdp-status]'), wa: $('[data-gpdp-wa]') };
  var state = { data: null, option: null, images: [], index: 0, busy: false, country: '', csrf: '' };
  var COUNTRY_NAMES = {}; try { COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { COUNTRY_NAMES = null; }
  function countryName(cc) { try { return (COUNTRY_NAMES && COUNTRY_NAMES.of(cc)) || cc; } catch (e) { return cc; } }
  function money(usd) { return 'US$' + Number(usd).toFixed(2); }
  function market() { try { return JSON.parse(localStorage.getItem('sm_market') || '{}') || {}; } catch (e) { return {}; } }
  function wanted() { return String(market().country || '').toUpperCase(); }
  function wantedCurrency() { return String(market().currency || '').toUpperCase(); }
  function say(msg, kind) { els.status.textContent = msg || ''; els.status.className = 'gpdp-status' + (kind ? ' is-' + kind : ''); }
  function qty() { var n = parseInt(els.qty.value, 10) || 1; n = Math.max(1, Math.min(10, n)); els.qty.value = n; return n; }
  function api(path, opts) {
    opts = opts || {}; opts.credentials = 'include'; opts.headers = opts.headers || {}; opts.headers.Accept = 'application/json';
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j || {} }; }); });
  }

  /* A request-only alternative for exhausted supplier / Woo quotas.
   * It must never claim a Woo cart or confirmed order and never auto-publish a price.
   * The buyer supplies an option description if the live variant API is unavailable. */
  var requestCartLoading = null;
  function requestCartReady() {
    if (window.SMOrderCart) return Promise.resolve(window.SMOrderCart);
    if (requestCartLoading) return requestCartLoading;
    requestCartLoading = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = '/assets/js/order-cart.js?v=20261122-1';
      script.async = true;
      script.onload = function () { window.SMOrderCart ? resolve(window.SMOrderCart) : reject(new Error('Request cart unavailable')); };
      script.onerror = function () { reject(new Error('Request cart could not be loaded')); };
      document.head.appendChild(script);
    }).catch(function (e) { requestCartLoading = null; throw e; });
    return requestCartLoading;
  }
  function requestFallback(message) {
    say(message + ' You can save a separate quotation request without payment or contacting the checkout API.', 'warn');
    var wrap = document.createElement('div');
    wrap.className = 'gpdp-request-fallback';
    wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-top:12px;';
    var label = document.createElement('label');
    label.textContent = 'Size / colour / option (required for quotation): ';
    label.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;align-items:center;';
    var detail = document.createElement('input'); detail.type = 'text'; detail.maxLength = 160;
    detail.required = true;
    detail.placeholder = 'For example: black, size M';
    detail.value = state.option && state.option.name ? String(state.option.name).slice(0,160) : '';
    detail.setAttribute('aria-label', 'Describe the supplier option to confirm');
    label.appendChild(detail);
    var button = document.createElement('button'); button.type = 'button';
    button.textContent = 'Save quotation request';
    button.addEventListener('click', function () {
      var requested = detail.value.trim();
      if (!requested) { detail.focus(); detail.setCustomValidity('Describe the size or colour you need.'); detail.reportValidity(); return; }
      detail.setCustomValidity(''); button.disabled = true;
      requestCartReady().then(function (cart) {
        // No unit price is passed: live pricing, stock, freight and PayPal/COD
        // cannot be promised while the supplier service is unavailable.
        var answer = cart.add({type:'cj',id:P.pid,sku:state.option && state.option.sku || P.pid,
          name:P.name || 'Global supplier product',vkey:state.option && state.option.vid || '',
          vname:requested,unit:null,qty:qty(),url:location.href});
        if (!answer.ok) throw new Error(answer.message || 'Could not save the quotation request');
        say('Your supplier quotation request is saved. No item was added to WooCommerce and no order was placed.', 'ok');
        var link = document.createElement('a'); link.href = '/request-cart/';
        link.textContent = 'Review request cart and send details'; els.status.appendChild(document.createTextNode(' '));els.status.appendChild(link);
      }).catch(function (e) { button.disabled = false; say(String(e.message||e)+' Please use WhatsApp instead.', 'warn'); });
    });
    wrap.appendChild(label);wrap.appendChild(button);els.status.appendChild(wrap);
  }
  /* ---- destination: the store session follows the destination chosen in the site's country window ---- */
  function context() {
    return api('/wp-json/gdcs/v1/context?light=1').then(function (c) {
      state.csrf = c.j.csrf || ''; state.country = (c.j.country || '').toUpperCase();
      var want = wanted(), cur = wantedCurrency() || String(c.j.currency || 'USD').toUpperCase();
      if (!want || !state.csrf || (want === state.country && cur === String(c.j.currency || '').toUpperCase())) return;
      return api('/wp-json/gdcs/v1/context', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': state.csrf },
        body: JSON.stringify({ country: want, currency: cur, language: c.j.language || 'en', csrf: state.csrf }) })
        .then(function () { return api('/wp-json/gdcs/v1/context?light=1'); })
        .then(function (c2) { state.csrf = c2.j.csrf || state.csrf; state.country = (c2.j.country || want).toUpperCase(); });
    }).catch(function () { });
  }

  /* ---- gallery with zoom ---- */
  function showImage(i) {
    if (!state.images.length) return;
    state.index = (i + state.images.length) % state.images.length;
    var img = els.main.querySelector('img');
    if (!img) { img = document.createElement('img'); img.width = 800; img.height = 800; img.decoding = 'async'; els.main.appendChild(img); }
    img.src = state.images[state.index]; img.alt = P.name + (state.index ? ' – image ' + (state.index + 1) : '');
    [].forEach.call(els.thumbs.children, function (b, n) { b.setAttribute('aria-current', n === state.index ? 'true' : 'false'); b.classList.toggle('active', n === state.index); });
  }
  function buildGallery(list) {
    var seen = {}; state.images = list.filter(function (u) { if (!u || seen[u]) return false; seen[u] = 1; return true; }).slice(0, 16);
    els.thumbs.innerHTML = '';
    state.images.forEach(function (u, n) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gpdp-thumb'; b.setAttribute('aria-label', 'Show image ' + (n + 1));
      var im = document.createElement('img'); im.src = u; im.alt = ''; im.width = 120; im.height = 120; im.loading = 'lazy'; im.decoding = 'async';
      b.appendChild(im); b.addEventListener('click', function () { showImage(n); }); els.thumbs.appendChild(b);
    });
    showImage(0);
  }
  els.main.classList.add('gpdp-zoomable'); els.main.setAttribute('role', 'button'); els.main.setAttribute('tabindex', '0'); els.main.setAttribute('aria-label', 'Open the photo full screen');
  els.main.addEventListener('mousemove', function (e) {
    var img = els.main.querySelector('img'); if (!img || window.matchMedia('(hover: none)').matches) return;
    var r = els.main.getBoundingClientRect(); img.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%';
    els.main.classList.add('is-zoom');
  });
  els.main.addEventListener('mouseleave', function () { els.main.classList.remove('is-zoom'); });
  var box = null;
  function openBox() {
    if (!state.images.length) return;
    if (!box) {
      box = document.createElement('dialog'); box.className = 'gpdp-lightbox'; box.setAttribute('aria-label', 'Product photos');
      box.innerHTML = '<button type="button" class="gpdp-lb-close" aria-label="Close">×</button><button type="button" class="gpdp-lb-prev" aria-label="Previous photo">‹</button><img alt=""><button type="button" class="gpdp-lb-next" aria-label="Next photo">›</button>';
      document.body.appendChild(box);
      box.querySelector('.gpdp-lb-close').addEventListener('click', function () { box.close(); });
      box.querySelector('.gpdp-lb-prev').addEventListener('click', function () { showImage(state.index - 1); box.querySelector('img').src = state.images[state.index]; });
      box.querySelector('.gpdp-lb-next').addEventListener('click', function () { showImage(state.index + 1); box.querySelector('img').src = state.images[state.index]; });
      box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
      box.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') box.querySelector('.gpdp-lb-prev').click(); if (e.key === 'ArrowRight') box.querySelector('.gpdp-lb-next').click(); });
    }
    box.querySelector('img').src = state.images[state.index]; box.querySelector('img').alt = P.name;
    if (typeof box.showModal === 'function') box.showModal();
  }
  els.main.addEventListener('click', openBox);
  els.main.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBox(); } });

  /* ---- description ---- */
  function renderDescription(text) {
    els.desc.innerHTML = '';
    var parts = String(text || '').split(/\n{2,}/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 30);
    if (!parts.length) { var p0 = document.createElement('p'); p0.textContent = 'The supplier has not published a description for this item. Ask us on WhatsApp for specifications.'; els.desc.appendChild(p0); return; }
    parts.forEach(function (t) { var p = document.createElement('p'); p.textContent = t; els.desc.appendChild(p); });
  }

  /* ---- options, price, WhatsApp text ---- */
  function updateWa() {
    var o = state.option, msg = 'Assalam o Alaikum! I want to order:\n' + P.name + (o ? '\nOption: ' + o.name : '') + '\nQuantity: ' + qty() +
      (state.country ? '\nDeliver to: ' + countryName(state.country) : '') + (o && o.usd ? '\nPrice shown: ' + money(o.usd) : '') + '\n' + P.url;
    els.wa.href = 'https://wa.me/' + (P.wa || '966510451995') + '?text=' + encodeURIComponent(msg);
  }
  function choose(o) {
    state.option = o;
    [].forEach.call(els.opts.querySelectorAll('[data-vid]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vid') === o.vid ? 'true' : 'false'); });
    els.price.textContent = o.usd ? money(o.usd) : 'Price confirmed at checkout';
    if (o.image) { var n = state.images.indexOf(o.image); if (n < 0) { state.images.push(o.image); buildGallery(state.images); n = state.images.indexOf(o.image); } showImage(n); }
    updateWa(); checkDelivery();
  }
  function renderOptions(list) {
    els.opts.innerHTML = '';
    var label = document.createElement('p'); label.className = 'gpdp-opt-label'; label.textContent = list.length > 1 ? 'Choose an option' : 'Option';
    els.opts.appendChild(label);
    var wrap = document.createElement('div'); wrap.className = 'gpdp-opt-list'; wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 'Options');
    list.slice(0, 60).forEach(function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gpdp-opt'; b.setAttribute('data-vid', o.vid); b.setAttribute('aria-pressed', 'false');
      if (o.image) { var im = document.createElement('img'); im.src = o.image; im.alt = ''; im.width = 36; im.height = 36; im.loading = 'lazy'; b.appendChild(im); }
      var t = document.createElement('span'); t.textContent = o.name + (o.usd ? ' · ' + money(o.usd) : ''); b.appendChild(t);
      b.addEventListener('click', function () { choose(o); }); wrap.appendChild(b);
    });
    els.opts.appendChild(wrap); els.opts.hidden = false;
  }

  /* ---- delivery check: the store's own quote (POST /wp-json/gdcs/v1/live/freight), the same one the cart and checkout use.
     It knows which supplier warehouse holds stock (for example a US warehouse with domestic carriers). ---- */
  var dTimer = 0, dSeq = 0;
  function setOrderable(yes) { var can = yes && !!(state.data && state.data.ordering_enabled); els.add.disabled = !can; els.buy.disabled = !can; }
  function checkDelivery() {
    clearTimeout(dTimer);
    dTimer = setTimeout(function () {
      var o = state.option, seq = ++dSeq;
      if (!o) return;
      els.delivery.hidden = false; els.delivery.className = 'gpdp-delivery is-loading'; els.delivery.textContent = 'Checking delivery to your destination…';
      context().then(function () {
        var cc = state.country;
        return api('/wp-json/gdcs/v1/live/freight', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': state.csrf },
          body: JSON.stringify({ pid: P.pid, vid: o.vid, quantity: qty() }) }).then(function (r) { return { r: r, cc: cc }; });
      }).then(function (x) {
        if (seq !== dSeq) return;
        var r = x.r, cc = x.cc, where = cc ? countryName(cc) : 'your destination';
        if (!r.ok) {
          els.delivery.className = 'gpdp-delivery is-warn';
          els.delivery.textContent = (r.j && r.j.message ? String(r.j.message).replace(/<[^>]+>/g, '') : 'Delivery could not be checked right now.') + ' You can still ask us on WhatsApp.';
          setOrderable(false); // no unverified shipping or checkout when the carrier service is unavailable
          requestFallback('Shipping is not verified for this option.');
          return;
        }
        var q = (r.j.quotes || []).filter(function (z) { return z && z.service; });
        if (!q.length) {
          els.delivery.className = 'gpdp-delivery is-warn';
          els.delivery.textContent = 'This option cannot be delivered to ' + where + ' from the supplier\'s warehouses right now. Choose another option, change your destination at the top of the page, or ask us on WhatsApp.';
          setOrderable(false); requestFallback('No verified carrier quote is available for this variation and destination.'); return;
        }
        q.sort(function (a, b) { return (a.cost - b.cost) || (parseInt(a.estimate, 10) - parseInt(b.estimate, 10)); });
        var best = q[0], cur = r.j.currency || 'USD', fmt = function (v) { return cur === 'USD' ? money(v) : (cur + ' ' + Number(v).toFixed(r.j.digits == null ? 2 : r.j.digits)); };
        var from = r.j.origin && r.j.origins ? (r.j.origins.filter(function (z) { return z.code === r.j.origin; })[0] || {}).name : '';
        els.delivery.className = 'gpdp-delivery is-ok';
        els.delivery.textContent = 'Delivers to ' + where + (from ? ' from the supplier\'s ' + from.replace(/\s*\([A-Z]{2}\)$/, '') + ' warehouse' : '') + ': ' + q.length + ' method' + (q.length > 1 ? 's' : '') +
          ', shipping from ' + fmt(best.cost) + (best.estimate ? ' (' + best.estimate + ' days, carrier estimate)' : '') + '. The exact shipping charge is shown at checkout before you pay.';
        setOrderable(true);
      }).catch(function () { if (seq === dSeq) { els.delivery.className = 'gpdp-delivery is-warn'; els.delivery.textContent = 'No verified carrier rate is available. Request a supplier quote before payment.'; setOrderable(false); requestFallback('Shipping verification is unavailable.'); } });
    }, 250);
  }

  /* ---- the real cart ---- */
  function badge(n) { if (n == null) return; document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); }); }
  function toCart(buyNow) {
    if (state.busy || !state.option) return;
    state.busy = true; els.add.setAttribute('aria-busy', 'true'); els.buy.setAttribute('aria-busy', 'true');
    say(buyNow ? 'Preparing secure checkout…' : 'Checking the supplier and adding to your cart…', 'info');
    context().then(function () {
      return api('/wp-json/gdcs/v1/live/cart', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': state.csrf },
        body: JSON.stringify({ pid: P.pid, vid: state.option.vid, quantity: qty() }) });
    }).then(function (r) {
      if (r.ok && r.j.added) {
        badge(r.j.items);
        if (buyNow) { say('Opening secure checkout…', 'ok'); location.href = r.j.checkout || '/checkout/'; return; }
        els.status.className = 'gpdp-status is-ok'; els.status.textContent = 'Added to your cart. ';
        var a = document.createElement('a'); a.href = r.j.cart || '/cart/'; a.textContent = 'View cart'; els.status.appendChild(a);
        return;
      }
      var msg = (r.j && r.j.message) ? String(r.j.message).replace(/<[^>]+>/g, '') : 'The cart could not be updated. Please try again.';
      if (r.status === 403) msg = 'Your session expired. Please try again.';
      if (r.status === 429 || r.status >= 500) { requestFallback('Secure checkout is temporarily unavailable. No item was added.'); return; }
      say(msg, 'warn');
    }).catch(function () { requestFallback('The store could not be reached. No order was placed.'); })
      .then(function () { state.busy = false; els.add.removeAttribute('aria-busy'); els.buy.removeAttribute('aria-busy'); });
  }
  /* Window capture: runs before any page-level click guard, so these two buttons always reach the real cart. */
  window.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-gpdp-add],[data-gpdp-buy]') : null;
    if (!t || !root.contains(t) || t.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation(); toCart(t.hasAttribute('data-gpdp-buy'));
  }, true);
  root.addEventListener('click', function (e) { var s = e.target.closest && e.target.closest('[data-step]'); if (!s) return; els.qty.value = qty() + parseInt(s.getAttribute('data-step'), 10); qty(); updateWa(); checkDelivery(); });
  els.qty.addEventListener('change', function () { qty(); updateWa(); checkDelivery(); });
  window.addEventListener('sm:market', function () { context().then(load); });

  /* ---- load ---- */
  function load() {
    return api('/wp-json/sm/v1/gpdp/' + encodeURIComponent(P.pid)).then(function (r) {
      if (!r.ok) {
        renderDescription('');
        els.price.textContent = r.status === 404 ? 'Not available' : 'Price confirmed on WhatsApp';
        if (r.status === 404) say('This product is not available from the supplier right now.', 'warn');
        else requestFallback('Live supplier options are unavailable right now.');
        return;
      }
      var d = r.j; state.data = d; state.country = (d.country || state.country || '').toUpperCase();
      buildGallery([P.image].concat(d.images || []));
      renderDescription(d.description);
      els.dest.textContent = 'Global supplier item · prepaid' + (state.country ? ' · delivering to ' + countryName(state.country) : '');
      var priced = (d.options || []).filter(function (o) { return o && o.vid; });
      if (!priced.length) { els.price.textContent = 'Price pending supplier verification'; requestFallback('Choose the option you need and send a quotation request.'); return; }
      renderOptions(priced); els.qtyWrap.hidden = false;
      var keep = state.option && priced.filter(function (o) { return o.vid === state.option.vid; })[0];
      choose(keep || priced[0]);
      if (!d.ordering_enabled) { setOrderable(false); requestFallback('Online ordering is paused. Save a quotation request with your exact variation and quantity.'); }
    }).catch(function () { requestFallback('Live supplier details are unavailable right now.'); });
  }
  context().then(load);
})();
