/* Global product page (edge-rendered by workers/global-pdp; same layout as the local product pages).
 * Adds, in the browser: the full photo gallery with zoom, the supplier description, options with the price for the shopper's destination,
 * a delivery check, and the same browser-persisted UNPAID request cart used by Pakistan products.
 * Buy Now opens a request form; never treats a supplier estimate as a payable total.
 * Data: GET /wp-json/sm/v1/gpdp/<pid> for read-only options, plus a read-only freight lookup.
 * These upstream data sources are legacy dependencies until an approved supplier snapshot replaces them. */
(function () {
  'use strict';
  var root = document.querySelector('[data-gpdp]'), dataEl = document.getElementById('gpdp-data');
  if (!root || !dataEl) return;
  var P = {}; try { P = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var $ = function (sel) { return root.querySelector(sel); };
  var els = { main: $('[data-gpdp-main]'), thumbs: $('[data-gpdp-thumbs]'), desc: document.querySelector('[data-gpdp-desc]'), price: $('[data-gpdp-price]'),
    dest: $('[data-gpdp-dest]'), opts: $('[data-gpdp-options]'), qtyWrap: $('[data-gpdp-qty-wrap]'), qty: $('[data-gpdp-qty]'), delivery: $('[data-gpdp-delivery]'),
    add: $('[data-gpdp-add]'), buy: $('[data-gpdp-buy]'), status: $('[data-gpdp-status]'), wa: $('[data-gpdp-wa]') };
  var state = { data: null, option: null, images: [], index: 0, busy: false, country: '', csrf: '', ship: null, shipMethods: [], preferredCarrier: '' };
  // Header links to /cart/ and /checkout/ (WordPress paths on sastamilaga.com) are sent to the static cart by assets/js/woo-bridge.js.
  var COUNTRY_NAMES = {}; try { COUNTRY_NAMES = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { COUNTRY_NAMES = null; }
  function countryName(cc) { try { return (COUNTRY_NAMES && COUNTRY_NAMES.of(cc)) || cc; } catch (e) { return cc; } }
  function money(usd) { return 'US$' + Number(usd).toFixed(2); }
  function amount(n, cur) {
    if (!Number.isFinite(Number(n))) return 'Unavailable';
    cur = String(cur || 'USD').toUpperCase();
    if (cur === 'USD') return money(n);
    try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n); }
    catch (e) { return cur + ' ' + Number(n).toFixed(2); }
  }
  function fxUsd(n, currency) {
    if (currency === 'USD') return n;
    try {
      var fx = window.SMMarket && window.SMMarket.fx;
      return fx && typeof fx.convert === 'function' ? fx.convert(n, 'USD', currency) : null;
    } catch (e) { return null; }
  }
  function orderAmounts() {
    if (!state.option || !(Number(state.option.usd) > 0)) return null;
    var base = Number(state.option.usd) * qty(), ship = state.ship;
    if (!ship) return { baseUsd: base, subtotal: money(base), shipping: 'Choose delivery', total: '', totalCurrency: '' };
    var cur = String(ship.cur || 'USD').toUpperCase(), itemInCur = fxUsd(base, cur);
    var valid = Number.isFinite(Number(itemInCur)) && itemInCur !== null && Number.isFinite(Number(ship.amt)) && Number(ship.amt) >= 0;
    return { baseUsd: base, subtotal: valid ? amount(itemInCur, cur) : money(base),
      shipping: amount(ship.amt, cur), total: valid ? amount(Number(itemInCur) + Number(ship.amt), cur) : '',
      totalCurrency: valid ? cur : '', totalValue: valid ? Number(itemInCur) + Number(ship.amt) : null };
  }
  var pricePanel = null, priceValues = null;
  function renderPriceSummary() {
    if (!els.delivery || !state.option) return;
    if (!pricePanel) {
      pricePanel = document.createElement('section'); pricePanel.className = 'gpdp-order-summary';
      pricePanel.setAttribute('aria-label', 'Estimated order price breakdown');
      var heading = document.createElement('h2'); heading.textContent = 'Your order estimate'; pricePanel.appendChild(heading);
      var rows = document.createElement('dl'); priceValues = {};
      [['items', 'Items'], ['shipping', 'Selected delivery'], ['total', 'Estimated total']].forEach(function (entry) {
        var row = document.createElement('div'); row.className = 'gpdp-order-summary__row gpdp-order-summary__' + entry[0];
        var term = document.createElement('dt'); term.textContent = entry[1];
        var value = document.createElement('dd'); value.textContent = '—'; priceValues[entry[0]] = { term: term, value: value };
        row.appendChild(term); row.appendChild(value); rows.appendChild(row);
      });
      pricePanel.appendChild(rows);
      var note = document.createElement('p'); note.className = 'gpdp-order-summary__note'; note.textContent =
        'Estimated product and carrier rates. Taxes or import duties may apply. Your payable total is reviewed at checkout.';
      pricePanel.appendChild(note); els.delivery.insertAdjacentElement('afterend', pricePanel);
    }
    var p = orderAmounts(); if (!p) { pricePanel.hidden = true; return; }
    pricePanel.hidden = false;
    priceValues.items.term.textContent = 'Items (' + qty() + ' × ' + money(state.option.usd) + ')';
    priceValues.items.value.textContent = p.subtotal;
    priceValues.shipping.value.textContent = p.shipping;
    priceValues.total.value.textContent = p.total || (state.ship ? 'Conversion pending · shown at checkout' : 'Select a shipping method');
    pricePanel.classList.toggle('is-ready', !!p.total);
    var target = wantedCurrency();
    var approx = p.total && p.totalCurrency !== target && fxUsd(p.baseUsd, target);
    // The final amount stays in the carrier's quotation currency; payment is converted only in checkout.
    if (p.total && target && target !== p.totalCurrency) {
      var converted = null;
      try { converted = window.SMMarket && window.SMMarket.fx && window.SMMarket.fx.convert(p.totalValue, p.totalCurrency, target); } catch (e) {}
      if (converted !== null && Number.isFinite(Number(converted))) priceValues.total.value.textContent += ' (≈ ' + amount(converted, target) + ')';
    }
  }
  function market() { try { return JSON.parse(localStorage.getItem('sm_market') || '{}') || {}; } catch (e) { return {}; } }
  function wanted() { return String(market().country || '').toUpperCase(); }
  function wantedCurrency() { return String(market().currency || '').toUpperCase(); }
  function say(msg, kind) { els.status.textContent = msg || ''; els.status.className = 'gpdp-status' + (kind ? ' is-' + kind : ''); }
  function qty() { var n = parseInt(els.qty.value, 10) || 1; n = Math.max(1, Math.min(10, n)); els.qty.value = n; return n; }
  function api(path, opts) {
    opts = opts || {}; opts.credentials = 'include'; opts.headers = opts.headers || {}; opts.headers.Accept = 'application/json';
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, j: j || {} }; }); });
  }

  /* When neither option source answers, the shopper describes the option and asks for a quote on WhatsApp (no price = no paid cart line). */
  function requestFallback(message) {
    if (els.status.querySelector('.gpdp-request-fallback')) return;
    say(message + ' Tell us the option you need and we quote it on WhatsApp.', 'warn');
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
    button.textContent = 'Ask for this option on WhatsApp';
    button.addEventListener('click', function () {
      var requested = detail.value.trim();
      if (!requested) { detail.focus(); detail.setCustomValidity('Describe the size or colour you need.'); detail.reportValidity(); return; }
      detail.setCustomValidity('');
      // No live price is known while both option sources are down, so the item cannot go into the paid cart: ask for a quote instead.
      var wa = (P.wa || (window.SM_CONFIG || {}).whatsapp || '923343582295');
      var msg = 'Assalam o Alaikum! Please quote this global item:\n' + (P.name || '') + '\nOption: ' + requested + '\nQuantity: ' + qty() + '\n' + (P.url || location.href.split('#')[0]);
      window.open('https://wa.me/' + String(wa).replace(/\D/g, '') + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
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
    var o = state.option, p = orderAmounts();
    var msg = 'Assalam o Alaikum! I want to order:\n' + P.name +
      (o ? '\nOption: ' + o.name : '') + '\nQuantity: ' + qty() +
      (state.country ? '\nDeliver to: ' + countryName(state.country) : '') +
      (o && o.usd ? '\nUnit price estimate: ' + money(o.usd) : '') +
      (state.ship ? '\nSelected carrier: ' + state.ship.name + '\nShipping estimate: ' + amount(state.ship.amt, state.ship.cur) : '\nShipping: awaiting carrier selection') +
      (p && p.total ? '\nEstimated items + shipping: ' + p.total : '') + '\n' + P.url +
      '\nPlease confirm stock, final carrier rates, duties and payable total.';
    els.wa.href = 'https://wa.me/' + (P.wa || '966510451995') + '?text=' + encodeURIComponent(msg);
  }
  function choose(o) {
    state.option = o; state.ship = null; state.shipMethods = [];
    setOrderable(false);
    [].forEach.call(els.opts.querySelectorAll('[data-vid]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-vid') === o.vid ? 'true' : 'false'); });
    els.price.textContent = o.usd ? money(o.usd) : 'Price confirmed at checkout';
    if (o.image) { var n = state.images.indexOf(o.image); if (n < 0) { state.images.push(o.image); buildGallery(state.images); n = state.images.indexOf(o.image); } showImage(n); }
    renderPriceSummary(); updateWa(); checkDelivery();
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

  /* ---- Live CJ carrier picker. A supplier quote is NOT a payment authorization. ---- */
  var dTimer = 0, dSeq = 0;
  function setOrderable(yes) {
    var can = !!(yes && state.option && state.option.vid && state.ship);
    els.add.disabled = !can; els.buy.disabled = !can;
  }
  function selectMethod(method) {
    if (!method) return;
    state.preferredCarrier = method.name;
    state.ship = {
      key: method.key, name: method.name, amt: method.cost, cur: method.currency,
      days: method.days, label: method.name + ' · ' + amount(method.cost, method.currency) +
        (method.days ? ' (' + method.days + ' days estimated)' : '')
    };
    [].forEach.call(els.delivery.querySelectorAll('input[name="gpdp-shipping-method"]'), function (input) {
      input.checked = input.value === method.key;
      var label = input.closest('.gpdp-ship-method');
      if (label) label.classList.toggle('is-selected', input.checked);
    });
    renderPriceSummary(); updateWa(); setOrderable(true);
  }
  function renderMethods(methods, destination, note) {
    state.shipMethods = methods; state.ship = null;
    els.delivery.hidden = false;
    els.delivery.className = 'gpdp-delivery is-ok gpdp-delivery--methods';
    els.delivery.replaceChildren();
    var heading = document.createElement('div'); heading.className = 'gpdp-ship-heading';
    var title = document.createElement('h2'); title.textContent = 'Choose your delivery'; heading.appendChild(title);
    var meta = document.createElement('span'); meta.className = 'gpdp-ship-destination';
    meta.textContent = 'Delivering to ' + countryName(destination); heading.appendChild(meta);
    els.delivery.appendChild(heading);
    var list = document.createElement('div'); list.className = 'gpdp-shipping-methods';
    list.setAttribute('role', 'radiogroup'); list.setAttribute('aria-label', 'Delivery carrier');
    methods.forEach(function (method, index) {
      var label = document.createElement('label'); label.className = 'gpdp-ship-method';
      var radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'gpdp-shipping-method'; radio.value = method.key;
      var content = document.createElement('span'); content.className = 'gpdp-ship-method__content';
      var carrier = document.createElement('strong'); carrier.textContent = method.name; content.appendChild(carrier);
      var info = document.createElement('small');
      info.textContent = (method.days ? method.days + ' days estimated' : 'Delivery time at checkout') +
        (index === 0 ? ' · Lowest quoted price' : '');
      content.appendChild(info);
      var price = document.createElement('b'); price.className = 'gpdp-ship-method__price'; price.textContent = amount(method.cost, method.currency);
      radio.addEventListener('change', function () { if (radio.checked) selectMethod(method); });
      label.appendChild(radio); label.appendChild(content); label.appendChild(price); list.appendChild(label);
    });
    els.delivery.appendChild(list);
    var foot = document.createElement('small'); foot.className = 'gpdp-ship-foot';
    foot.textContent = note + ' · Carrier delivery windows are estimates. Confirmed before payment.';
    els.delivery.appendChild(foot);
    var selected = methods.filter(function (m) { return m.name === state.preferredCarrier; })[0] || methods[0];
    selectMethod(selected);
  }
  function shippingWarning(message) {
    state.ship = null; state.shipMethods = []; els.delivery.hidden = false;
    els.delivery.className = 'gpdp-delivery is-warn'; els.delivery.textContent = message;
    renderPriceSummary(); updateWa(); setOrderable(false);
  }
  function normaliseWp(quotes, currency) {
    return quotes.filter(function (q) { return q && (q.service || q.name) && Number.isFinite(Number(q.cost)) && Number(q.cost) >= 0; })
      .map(function (q, i) { return {
        key: 'wp:' + i, name: String(q.service || q.name), cost: Number(q.cost),
        days: String(q.estimate || q.days || ''), currency: String(currency || 'USD').toUpperCase()
      }; }).sort(function (x, y) { return x.cost - y.cost; });
  }
  function checkDelivery() {
    clearTimeout(dTimer);
    var seq = ++dSeq;
    state.ship = null; state.shipMethods = [];
    renderPriceSummary(); updateWa(); setOrderable(false);
    if (!state.option) return;
    els.delivery.hidden = false; els.delivery.className = 'gpdp-delivery is-loading';
    els.delivery.textContent = 'Finding available delivery options for your selected product and quantity…';
    dTimer = setTimeout(function () {
      var o = state.option, cc = state.country || wanted() || 'PK', supplierPending = null;
      var slowShip = setTimeout(function () {
        if (seq === dSeq && !state.ship) supplierPending = workerShip(o, seq);
      }, 5000);
      context().then(function () {
        if (seq !== dSeq) return null;
        cc = state.country || wanted() || cc;
        return api('/wp-json/gdcs/v1/live/freight', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': state.csrf },
          body: JSON.stringify({ pid: P.pid, vid: o.vid, quantity: qty() })
        });
      }).then(function (r) {
        clearTimeout(slowShip);
        if (seq !== dSeq || !r) return;
        var methods = r.ok ? normaliseWp((r.j && r.j.quotes) || [], r.j.currency) : [];
        if (methods.length) {
          var warehouse = r.j && r.j.origin && r.j.origins ?
            ((r.j.origins.filter(function (z) { return z.code === r.j.origin; })[0] || {}).name || '') : '';
          renderMethods(methods, cc, warehouse ? 'Shipping from ' + warehouse : 'Live supplier warehouse quote');
          return;
        }
        workerShip(o, seq).then(function (ok) {
          if (!ok && seq === dSeq) shippingWarning(
            'No carrier quote is available for this option and destination. Change the option or destination, or request help on WhatsApp.');
        });
      }).catch(function () {
        clearTimeout(slowShip);
        if (seq !== dSeq) return;
        workerShip(o, seq).then(function (ok) {
          if (!ok && seq === dSeq) shippingWarning('Shipping rates are currently unavailable. Please request a quotation on WhatsApp.');
        });
      });
    }, 250);
  }
  function workerShip(o, seq) {
    var C = window.SM_CONFIG || {};
    var W = String(C.cjShippingWorker || C.cjImageWorker ||
      'https://sastamilaga-cj-shipping.usamaestonia.workers.dev').replace(/\/$/, '');
    var cc = state.country || wanted() || 'PK';
    return fetch(W + '/api/cj/shipping', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country: cc, items: [{ pid: P.pid, sku: o.sku || P.sku, qty: qty(), vid: o.vid }] })
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (seq !== dSeq) return false;
      var methods = ((d && d.methods) || []).filter(function (m) {
        return m && m.name && Number.isFinite(Number(m.price)) && Number(m.price) >= 0;
      }).map(function (m, i) {
        return { key: 'cj:' + i, name: String(m.name), cost: Number(m.price),
          days: String(m.days || ''), currency: 'USD' };
      }).sort(function (a, b) { return a.cost - b.cost; });
      if (!methods.length) return false;
      renderMethods(methods, cc, 'CJ supplier freight quotation');
      return true;
    }).catch(function () { return false; });
  }

  /* ---- the real cart ---- */
  function badge(n) { if (n == null) return; document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); }); }
  /* The site's own cart (assets/js/woo-bridge.js = SMStore): chrome.js loads it on every page; load it here if it is not there yet. */
  var storeLoading = null;
  function storeReady() {
    if (window.SMStore) return Promise.resolve(window.SMStore);
    if (storeLoading) return storeLoading;
    storeLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = '/assets/js/woo-bridge.js?v=store-20261122b'; s.async = true;
      s.onload = function () { window.SMStore ? resolve(window.SMStore) : reject(new Error('The cart did not start.')); };
      s.onerror = function () { reject(new Error('The cart could not be loaded.')); };
      document.head.appendChild(s);
    }).catch(function (e) { storeLoading = null; throw e; });
    return storeLoading;
  }
  /* Add to cart / Buy now (restored 2026-11-22, owner request): the exact supplier option, quantity, price and the cheapest carrier go into
     the site's global cart (sm_gcart); Buy now opens the shared checkout (PayPal or card through a PayPal payment link, cash on delivery for
     Pakistan where offered; every order is recorded in Formspree first). */
  function toCart(buyNow) {
    if (state.busy || !state.option) return;
    if (!state.ship) { say('Choose an available shipping method before adding this product to your cart, or request a quotation on WhatsApp.', 'warn'); return; }
    state.busy = true; els.add.setAttribute('aria-busy', 'true'); els.buy.setAttribute('aria-busy', 'true');
    storeReady().then(function (store) {
      var o = state.option;
      var res = store.addCj({
        id: String(P.pid), sku: String(o.sku || P.sku || P.pid), name: String(P.name || 'Global supplier product'), img: o.image || P.image || '',
        vkey: String(o.vid || ''), vname: String(o.name || o.sku || ''), unit: Number(o.usd), qty: qty(),
        ship: state.ship ? state.ship.label : '', shipAmt: state.ship ? state.ship.amt : 0, shipCur: state.ship ? state.ship.cur : 'USD',
        url: location.href.split('#')[0]
      });
      if (!res.ok) throw new Error(res.message);
      badge(res.count);
      if (buyNow) { location.assign(store.checkoutUrl()); return; }
      els.status.className = 'gpdp-status is-ok';
      els.status.textContent = 'Added to cart. ';
      [['View cart', store.cartUrl()], ['Checkout', store.checkoutUrl()]].forEach(function (l) { var a = document.createElement('a'); a.href = l[1]; a.textContent = l[0]; els.status.appendChild(a); });
    }).catch(function (err) {
      say(String((err && err.message) || 'The cart could not be updated.') + ' You can also order on WhatsApp.', 'warn');
    }).then(function () {
      state.busy = false; els.add.removeAttribute('aria-busy'); els.buy.removeAttribute('aria-busy');
    });
  }
  /* Window capture: runs before any page-level click guard, so these two buttons always reach the real cart. */
  window.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('[data-gpdp-add],[data-gpdp-buy]') : null;
    if (!t || !root.contains(t) || t.disabled) return;
    e.preventDefault(); e.stopImmediatePropagation(); toCart(t.hasAttribute('data-gpdp-buy'));
  }, true);
  root.addEventListener('click', function (e) { var s = e.target.closest && e.target.closest('[data-step]'); if (!s) return; els.qty.value = qty() + parseInt(s.getAttribute('data-step'), 10); qty(); updateWa(); checkDelivery(); });
  els.qty.addEventListener('change', function () { qty(); updateWa(); checkDelivery(); });
  window.addEventListener('sm:market', function () { state.preferredCarrier = ''; context().then(load); });
  window.addEventListener('sm:fx-rates', function () { renderPriceSummary(); updateWa(); });

  /* ---- load ---- */
  /* Supplier options straight from the CJ Worker (the same live variant list the global shop uses). Shown when WordPress is slow (over
     6 s) or unavailable, so Add to cart / Buy now never stay disabled behind a slow store server. Estimated price = supplier price + 20%
     (MARGIN in global.js); the request cart treats every CJ price as a quote that staff confirm before payment. */
  function supplierOptions() {
    var C = window.SM_CONFIG || {}, W = String(C.cjShippingWorker || C.cjImageWorker || 'https://sastamilaga-cj-shipping.usamaestonia.workers.dev').replace(/\/$/, '');
    return fetch(W + '/api/cj/product?pid=' + encodeURIComponent(P.pid)).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); }).then(function (d) {
      return (d && Array.isArray(d.variants) ? d.variants : []).filter(function (v) { return v && v.vid; }).map(function (v) {
        var supplier = Number(v.price), usd = supplier > 0 ? Math.round(supplier * 1.2 * 100) / 100 : 0;
        return { vid: String(v.vid), sku: String(v.sku || ''), name: String(v.key || v.name || v.sku || 'Option'), image: /^https:\/\//i.test(v.image || '') ? v.image : '', usd: usd, estimate: true };
      });
    });
  }
  var supplierShown = false;
  function useSupplier(reason) {
    if (supplierShown || state.data) return;
    supplierShown = true;
    supplierOptions().then(function (list) {
      if (state.data) return;   // WordPress answered in the meantime: its options are already shown
      if (!list.length) { requestFallback(reason); return; }
      renderOptions(list); els.qtyWrap.hidden = false;
      choose(state.option && list.filter(function (o) { return o.vid === state.option.vid; })[0] || list[0]);
      say('Showing the supplier\'s live options with estimated prices. Staff confirm the final price and shipping before you pay.', 'info');
    }).catch(function () { if (!state.data) requestFallback(reason); });
  }
  function load() {
    var slow = setTimeout(function () { useSupplier('Live supplier options are slow to load right now.'); }, 6000);
    return api('/wp-json/sm/v1/gpdp/' + encodeURIComponent(P.pid)).then(function (r) {
      clearTimeout(slow);
      if (!r.ok) {
        renderDescription('');
        if (r.status === 404) { els.price.textContent = 'Not available'; say('Supplier availability is unconfirmed; contact support for a quote.', 'warn'); return; }
        if (!state.option) els.price.textContent = 'Price confirmed on WhatsApp';
        useSupplier('Live supplier options are unavailable right now.');
        return;
      }
      var d = r.j; state.data = d; state.country = (d.country || state.country || '').toUpperCase();
      buildGallery([P.image].concat(d.images || []));
      renderDescription(d.description);
      els.dest.textContent = 'Global supplier item · quote before payment' + (state.country ? ' · delivering to ' + countryName(state.country) : '');
      var priced = (d.options || []).filter(function (o) { return o && o.vid; });
      if (!priced.length) { els.price.textContent = 'Price pending supplier verification'; requestFallback('Choose the option you need and send a quotation request.'); return; }
      renderOptions(priced); els.qtyWrap.hidden = false;
      var keep = state.option && priced.filter(function (o) { return o.vid === state.option.vid; })[0];
      choose(keep || priced[0]);
      if (!d.ordering_enabled) { setOrderable(false); say('Supplier order verification is paused. Add your exact option to the combined cart as an unpaid request.', 'warn'); }
    }).catch(function () { clearTimeout(slow); useSupplier('Live supplier details are unavailable right now.'); });
  }
  /* Options do not depend on the visitor context, so load them at once (they used to wait for the context call: two slow WordPress calls
     in a row, 15 s and more before Add to cart enabled). The delivery check re-runs when the context (country) has been settled. */
  var ctxReady = context();
  load();
  ctxReady.then(function () { if (state.option) checkDelivery(); }, function () {});
})();
