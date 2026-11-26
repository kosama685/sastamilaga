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
  // ISO 3166-1 alpha-2 registry. Membership is not shipping eligibility.
  var ISO_COUNTRIES = new Set('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' '));
  function normalizeCountry(value) { var c=String(value||'').trim().toUpperCase(); return ISO_COUNTRIES.has(c)?c:''; }
  function destination() { return normalizeCountry(typeof state.deliveryCountry==='string' ? state.deliveryCountry : (wanted() || state.country)); }
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
    if (!ship) return { baseUsd: base, subtotal: money(base), shipping: state.quoteStatus === 'unavailable' ? 'Quote required' : 'Choose delivery', total: '', totalCurrency: '' };
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
    priceValues.total.value.textContent = p.total || (state.ship ? 'Conversion pending · shown at checkout' : (state.quoteStatus === 'unavailable' ? 'Shipping confirmation pending' : 'Select a shipping method'));
    pricePanel.classList.toggle('is-ready', !!p.total);
    var target = wantedCurrency();
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
      (destination() ? '\nDeliver to: ' + countryName(destination()) : '\nDestination: not selected') + (state.postcode ? '\nPostcode: ' + state.postcode : '') + (o ? '\nVariant reference: ' + o.vid + '\nSKU: ' + o.sku : '') +
      (o && o.usd ? '\nUnit price estimate: ' + money(o.usd) : '') +
      (state.ship ? '\nSelected carrier: ' + state.ship.name + '\nShipping estimate: ' + amount(state.ship.amt, state.ship.cur) : '\nShipping: quote required; no payment authorised') +
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
  var dTimer = 0, dSeq = 0, dAbort = null, expiryTimer = 0;
  function setOrderable(yes) {
    var can=!!(state.option&&state.option.vid);
    can = can && !!yes && !!state.ship && quoteCurrent(state.ship); // Verified carrier quote is also required.
    els.add.disabled = !can; els.buy.disabled = !can;
  }
  function selectMethod(method) {
    if (!method || !quoteCurrent(method)) { shippingWarning('The carrier quotation expired or the selection changed. Refresh delivery.'); return; }
    state.preferredCarrier = method.name;
    state.ship = {
      key: method.key, name: method.name, amt: method.cost, cur: method.currency,
      days: method.days, scope: method.scope, expiresAt: method.expiresAt, label: method.name + ' · ' + amount(method.cost, method.currency) +
        (method.days ? ' (' + method.days + ' days estimated)' : '')
    };
    [].forEach.call(els.delivery.querySelectorAll('input[name="gpdp-shipping-method"]'), function (input) {
      input.checked = input.value === method.key;
      var label = input.closest('.gpdp-ship-method');
      if (label) label.classList.toggle('is-selected', input.checked);
    });
    clearTimeout(expiryTimer); expiryTimer=setTimeout(function(){ shippingWarning('The carrier quotation expired. Refresh delivery to obtain current rates.'); },Math.max(0,state.ship.expiresAt-Date.now()));
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
    clearTimeout(expiryTimer); state.quoteStatus='unavailable'; state.ship = null; state.shipMethods = []; els.delivery.hidden = false;
    els.delivery.className = 'gpdp-delivery is-warn'; els.delivery.textContent = message;
    var actions=document.createElement('div'); actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:10px';
    var retry=document.createElement('button');retry.type='button';retry.className='gpdp-opt';retry.textContent='Retry delivery quote';retry.addEventListener('click',checkDelivery);actions.appendChild(retry);
    var request=document.createElement('a');request.textContent='Request shipping confirmation';request.className='gpdp-opt';request.target='_blank';request.rel='noopener';updateWa();request.href=els.wa.href;actions.appendChild(request);els.delivery.appendChild(actions);
    renderPriceSummary(); updateWa(); setOrderable(false);
  }
  function normaliseWp(quotes, currency) {
    return quotes.filter(function (q) { return q && (q.service || q.name) && Number.isFinite(Number(q.cost)) && Number(q.cost) >= 0; })
      .map(function (q, i) { return {
        key: 'wp:' + i, name: String(q.service || q.name), cost: Number(q.cost),
        days: String(q.estimate || q.days || ''), currency: String(currency || 'USD').toUpperCase()
      }; }).sort(function (x, y) { return x.cost - y.cost; });
  }
  function quoteScope(o,cc,quantity,zip) { return {pid:String(P.pid).toUpperCase(),vid:String(o.vid),country:cc,quantity:quantity,zip:zip}; }
  function scopeKey(x) { return JSON.stringify([x.pid,x.vid,x.country,x.quantity,x.zip]); }
  function quoteCurrent(method) {
    return !!(method && method.scope && state.option && Number.isFinite(method.expiresAt) && method.expiresAt>Date.now() &&
      scopeKey(method.scope)===scopeKey(quoteScope(state.option,destination(),qty(),state.postcode||'')));
  }
  function parseScopedQuote(d,scope,now) {
    if(!d||d.currency!=='USD'||d.liveQuoteWithinTTL!==true||!['cache','cj_api'].includes(d.source)||
      String(d.pid).toUpperCase()!==scope.pid||d.vid!==scope.vid||d.country!==scope.country||
      d.quantity!==scope.quantity||String(d.zip||'')!==scope.zip||!Array.isArray(d.rates))return [];
    var checked=typeof d.checkedAt==='number'?d.checkedAt*1000:NaN;
    if(!Number.isSafeInteger(checked)||checked<=0||checked>now||checked+7200000<=now)return [];
    return d.rates.filter(function(r){return r&&typeof r.carrier==='string'&&r.carrier.trim()&&typeof r.shippingUsd==='number'&&Number.isFinite(r.shippingUsd)&&r.shippingUsd>=0;})
      .map(function(r,i){return {key:'cj:'+i,name:r.carrier,cost:r.shippingUsd,days:String(r.eta||''),currency:'USD',scope:scope,expiresAt:checked+7200000};})
      .sort(function(a,b){return a.cost-b.cost;});
  }
  function quoteError(code,status) {
    if(code==='daily_budget')return 'Live carrier checks have reached their daily service limit. Request shipping confirmation or try again later.';
    if(status===429||code==='qps_wait')return 'The carrier service is busy. Retry delivery shortly or request confirmation.';
    if(code==='variant_not_found_for_product')return 'This option could not be verified. Select an available option again.';
    if(code==='invalid_shipping_request')return 'Check the selected destination, postcode and quantity.';
    if(code==='postcode_required')return 'Enter your delivery postcode and retry.';
    if(code==='no_cj_method')return 'No carrier returned a rate for this exact option and address. Request shipping confirmation.';
    return 'No verified carrier quote is available right now. Retry, change the destination or request shipping confirmation. No payment is due.';
  }
  function checkDelivery() {
    clearTimeout(dTimer);clearTimeout(expiryTimer);
    if(dAbort)dAbort.abort();
    var seq=++dSeq;
    state.ship=null;state.shipMethods=[];state.quoteStatus='loading';
    renderPriceSummary();updateWa();setOrderable(false);
    if(!state.option)return;
    var cc=destination(),zip=String(state.postcode||'').trim();
    if(!cc){shippingWarning('Choose your delivery country to check carrier rates.');return;}
    if(!/^[A-Za-z0-9 -]{0,12}$/.test(zip)){shippingWarning('Enter a valid delivery postcode (up to 12 letters, digits or spaces).');return;}
    var scope=quoteScope(state.option,cc,qty(),zip);
    els.delivery.hidden=false;els.delivery.className='gpdp-delivery is-loading';
    els.delivery.textContent='Checking live shipping for your selected option, quantity and destination…';
    dTimer=setTimeout(function(){
      if(seq!==dSeq)return;
      dAbort=new AbortController();var controller=dAbort;
      var timeout=setTimeout(function(){controller.abort();},18000);
      workerShip(scope,seq,controller.signal).finally(function(){clearTimeout(timeout);});
    },400);
  }
  async function workerShip(scope,seq,signal) {
    try {
      // Use the same-domain D1-backed GET contract. No parallel WordPress/legacy POST requests.
      var u=new URL('/api/cj/shipping','https://sastamilaga.com');
      Object.keys(scope).forEach(function(k){u.searchParams.set(k,String(scope[k]));});
      var r=await fetch(u.href,{method:'GET',credentials:'omit',cache:'no-store',signal:signal,headers:{Accept:'application/json'}});
      var d=await r.json().catch(function(){return {};});
      if(seq!==dSeq)return false;
      if(!r.ok){shippingWarning(quoteError(d.error,r.status));return false;}
      var methods=parseScopedQuote(d,scope,Date.now());
      if(!methods.length){shippingWarning(quoteError(Array.isArray(d.rates)&&!d.rates.length?'no_cj_method':'invalid_quote',r.status));return false;}
      state.quoteStatus='quoted';
      renderMethods(methods,scope.country,'Verified supplier rate · checked '+new Date(Number(d.checkedAt)*1000).toLocaleString());
      return true;
    }catch(e){if(seq===dSeq)shippingWarning('Shipping service did not respond. Retry or request shipping confirmation. No payment is due.');return false;}
  }
  // A destination-specific request control, separate from the header display currency.
  var destWrap=document.createElement('div');destWrap.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin:12px 0';
  var countryLabel=document.createElement('label');countryLabel.textContent='Delivery country ';
  var countrySelect=document.createElement('select');countrySelect.setAttribute('aria-label','Delivery country');countrySelect.style.maxWidth='100%';
  var blank=document.createElement('option');blank.value='';blank.textContent='Choose country';countrySelect.appendChild(blank);
  Array.from(ISO_COUNTRIES).sort(function(a,b){return countryName(a).localeCompare(countryName(b));}).forEach(function(c){var option=document.createElement('option');option.value=c;option.textContent=countryName(c)+' ('+c+')';countrySelect.appendChild(option);});
  countrySelect.value=destination();countryLabel.appendChild(countrySelect);destWrap.appendChild(countryLabel);
  var postLabel=document.createElement('label');postLabel.textContent='Postcode (if applicable) ';
  var post=document.createElement('input');post.type='text';post.maxLength=12;post.autocomplete='postal-code';post.setAttribute('aria-label','Delivery postcode');postLabel.appendChild(post);destWrap.appendChild(postLabel);
  els.delivery.insertAdjacentElement('beforebegin',destWrap);
  countrySelect.addEventListener('change',function(){state.deliveryCountry=countrySelect.value;state.preferredCarrier='';checkDelivery();});
  post.addEventListener('input',function(){state.postcode=post.value.trim();checkDelivery();});

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
    if (!state.ship || !quoteCurrent(state.ship)) { say('Choose an available shipping method before adding this product to your cart, or request a quotation on WhatsApp.', 'warn'); return; }
    var cartScope=scopeKey(state.ship.scope),cartShip=state.ship;
    state.busy = true; els.add.setAttribute('aria-busy', 'true'); els.buy.setAttribute('aria-busy', 'true');
    storeReady().then(function (store) {
      if(state.ship!==cartShip || !quoteCurrent(cartShip) || scopeKey(cartShip.scope)!==cartScope)throw new Error('Delivery selection changed; refresh shipping.');
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
  els.qty.addEventListener('input', function () { checkDelivery(); });
  window.addEventListener('sm:market', function () { state.preferredCarrier='';delete state.deliveryCountry;state.country='';countrySelect.value=destination();checkDelivery(); });
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
      var d = r.j; state.data = d; state.country = (d.country || state.country || '').toUpperCase(); if(typeof state.deliveryCountry!=='string')countrySelect.value=destination();
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
  ctxReady.then(function () { if(typeof state.deliveryCountry!=='string')countrySelect.value=destination(); if (state.option) checkDelivery(); }, function () {});
})();
