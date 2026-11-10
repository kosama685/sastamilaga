/* "Make yourself at home": shopping destination, language and display currency.
 * - Opens from the header button [data-gdcs-market].
 * - Country -> suggested currency (ISO 4217 map below). Converted prices are estimates shown next to the real price;
 *   checkout and payment stay in PKR (local) / USD (global).
 * - Language uses the site's existing translator (?gdcs_lang=xx, cookie sm_lang). Machine translation, labelled as such.
 * - Location suggestion only after the visitor ticks the box (one request to ipapi.co).
 * - Choice saved in localStorage 'sm_market' = { country, currency, lang }. Fires 'sm:market'. */
(function () {
  'use strict';
  if (window.SMMarket) return;
  var KEY = 'sm_market', RATE_KEY = 'sm_fx_pkr', RATE_TTL = 12 * 3600e3;
  var CUR = {AD:'EUR',AE:'AED',AF:'AFN',AG:'XCD',AI:'XCD',AL:'ALL',AM:'AMD',AO:'AOA',AR:'ARS',AS:'USD',AT:'EUR',AU:'AUD',AW:'AWG',AX:'EUR',AZ:'AZN',BA:'BAM',BB:'BBD',BD:'BDT',BE:'EUR',BF:'XOF',BG:'BGN',BH:'BHD',BI:'BIF',BJ:'XOF',BL:'EUR',BM:'BMD',BN:'BND',BO:'BOB',BQ:'USD',BR:'BRL',BS:'BSD',BT:'BTN',BW:'BWP',BY:'BYN',BZ:'BZD',CA:'CAD',CC:'AUD',CD:'CDF',CF:'XAF',CG:'XAF',CH:'CHF',CI:'XOF',CK:'NZD',CL:'CLP',CM:'XAF',CN:'CNY',CO:'COP',CR:'CRC',CU:'CUP',CV:'CVE',CW:'ANG',CX:'AUD',CY:'EUR',CZ:'CZK',DE:'EUR',DJ:'DJF',DK:'DKK',DM:'XCD',DO:'DOP',DZ:'DZD',EC:'USD',EE:'EUR',EG:'EGP',EH:'MAD',ER:'ERN',ES:'EUR',ET:'ETB',FI:'EUR',FJ:'FJD',FK:'FKP',FM:'USD',FO:'DKK',FR:'EUR',GA:'XAF',GB:'GBP',GD:'XCD',GE:'GEL',GF:'EUR',GG:'GBP',GH:'GHS',GI:'GIP',GL:'DKK',GM:'GMD',GN:'GNF',GP:'EUR',GQ:'XAF',GR:'EUR',GT:'GTQ',GU:'USD',GW:'XOF',GY:'GYD',HK:'HKD',HN:'HNL',HR:'EUR',HT:'HTG',HU:'HUF',ID:'IDR',IE:'EUR',IL:'ILS',IM:'GBP',IN:'INR',IO:'USD',IQ:'IQD',IR:'IRR',IS:'ISK',IT:'EUR',JE:'GBP',JM:'JMD',JO:'JOD',JP:'JPY',KE:'KES',KG:'KGS',KH:'KHR',KI:'AUD',KM:'KMF',KN:'XCD',KP:'KPW',KR:'KRW',KW:'KWD',KY:'KYD',KZ:'KZT',LA:'LAK',LB:'LBP',LC:'XCD',LI:'CHF',LK:'LKR',LR:'LRD',LS:'LSL',LT:'EUR',LU:'EUR',LV:'EUR',LY:'LYD',MA:'MAD',MC:'EUR',MD:'MDL',ME:'EUR',MF:'EUR',MG:'MGA',MH:'USD',MK:'MKD',ML:'XOF',MM:'MMK',MN:'MNT',MO:'MOP',MP:'USD',MQ:'EUR',MR:'MRU',MS:'XCD',MT:'EUR',MU:'MUR',MV:'MVR',MW:'MWK',MX:'MXN',MY:'MYR',MZ:'MZN',NA:'NAD',NC:'XPF',NE:'XOF',NF:'AUD',NG:'NGN',NI:'NIO',NL:'EUR',NO:'NOK',NP:'NPR',NR:'AUD',NU:'NZD',NZ:'NZD',OM:'OMR',PA:'PAB',PE:'PEN',PF:'XPF',PG:'PGK',PH:'PHP',PK:'PKR',PL:'PLN',PM:'EUR',PN:'NZD',PR:'USD',PS:'ILS',PT:'EUR',PW:'USD',PY:'PYG',QA:'QAR',RE:'EUR',RO:'RON',RS:'RSD',RU:'RUB',RW:'RWF',SA:'SAR',SB:'SBD',SC:'SCR',SD:'SDG',SE:'SEK',SG:'SGD',SH:'SHP',SI:'EUR',SJ:'NOK',SK:'EUR',SL:'SLE',SM:'EUR',SN:'XOF',SO:'SOS',SR:'SRD',SS:'SSP',ST:'STN',SV:'USD',SX:'ANG',SY:'SYP',SZ:'SZL',TC:'USD',TD:'XAF',TF:'EUR',TG:'XOF',TH:'THB',TJ:'TJS',TK:'NZD',TL:'USD',TM:'TMT',TN:'TND',TO:'TOP',TR:'TRY',TT:'TTD',TV:'AUD',TW:'TWD',TZ:'TZS',UA:'UAH',UG:'UGX',UM:'USD',US:'USD',UY:'UYU',UZ:'UZS',VA:'EUR',VC:'XCD',VE:'VES',VG:'USD',VI:'USD',VN:'VND',VU:'VUV',WF:'XPF',WS:'WST',XK:'EUR',YE:'YER',YT:'EUR',ZA:'ZAR',ZM:'ZMW',ZW:'ZWL'};
  var LANGS = 'en ur ar af az bg bn ca cs da de el es et fa fi fr ga gu he hi hr hu id is it ja kn ko lt lv ml mr ms nb nl pl ps pt ro ru sd sk sl sq sr sv sw ta th tr uk vi zh ak am as ast av ay ba be bo bs bua ce ceb ch ckb cy dv dz ee eu ff fil fy gd gl ht hy ilo ka kg kha kk kl km kok kv ky lb ln lo lua mai mg mh mi mk mn mt my ne no nr nso ny oc or os pa pag pap si sn so sr-cyrl ss st tn uz war wo xh yo zh-hans zu'.split(' ');
  var dn = function (type) { try { return new Intl.DisplayNames(['en'], { type: type }); } catch (e) { return null; } };
  var regionName = dn('region'), langName = dn('language'), curName = dn('currency');
  var cname = function (c) { try { return (regionName && regionName.of(c)) || c; } catch (e) { return c; } };
  /* Flag images (Windows has no flag emoji). flagcdn.com serves public-domain flags; 'lazy' keeps the 246-item list light. */
  var flag = function (c, w) { w = w || 32; return '<img class="sm-mk__flagimg" src="https://flagcdn.com/w' + (w > 40 ? 80 : 40) + '/' + c.toLowerCase() + '.png" width="' + w + '" height="' + Math.round(w * 0.75) + '" alt="" loading="lazy" decoding="async">'; };
  var COUNTRIES = Object.keys(CUR).map(function (c) { return { c: c, n: cname(c) }; }).sort(function (a, b) { return a.n.localeCompare(b.n); });
  var fold = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }
  var saved = load();
  var state = saved || { country: 'PK', currency: 'PKR', lang: (new URLSearchParams(location.search).get('gdcs_lang') || cookie('sm_lang') || 'en').toLowerCase(), auto: false };
  var IS_BOT = /bot|crawl|spider|slurp|mediapartners|lighthouse|pagespeed|facebookexternalhit/i.test(navigator.userAgent || '');

  /* ---- automatic country, language and currency (no API keys) ----
     Country: free keyless IP lookups, tried in order (GeoJS, ipwho.is, country.is); fallback = region of the browser language.
     Language: the browser's own preference list (navigator.languages). Currency: from the country.
     Only the country code is kept (in this browser). Search-engine crawlers are skipped so they always see the default page. */
  var GEO_URLS = [
    ['https://get.geojs.io/v1/ip/country.json', function (j) { return j.country; }],
    ['https://ipwho.is/?fields=success,country_code', function (j) { return j.success === false ? '' : j.country_code; }],
    ['https://api.country.is/', function (j) { return j.country; }]
  ];
  function timedFetch(url, ms) { var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms); return fetch(url, { signal: c.signal, credentials: 'omit' }).finally(function () { clearTimeout(t); }); }
  function geoCountry(i) {
    i = i || 0; if (i >= GEO_URLS.length) return Promise.reject(new Error('geo'));
    return timedFetch(GEO_URLS[i][0], 3500).then(function (r) { return r.json(); }).then(function (j) {
      var cc = String(GEO_URLS[i][1](j) || '').toUpperCase(); if (!CUR[cc]) throw new Error('bad country'); return cc;
    }).catch(function () { return geoCountry(i + 1); });
  }
  function browserCountry() { var l = (navigator.languages && navigator.languages[0]) || navigator.language || ''; try { var r = new Intl.Locale(l).region; if (r && CUR[r]) return r; } catch (e) {} return ''; }
  var LANG_ALIAS = { nn: 'nb', tl: 'fil', iw: 'he', 'zh-tw': 'zh', 'zh-hk': 'zh' };
  function browserLang() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) { var l = String(list[i]).toLowerCase(), b = l.split('-')[0]; b = LANG_ALIAS[l] || LANG_ALIAS[b] || b; if (b === 'en') return 'en'; if (LANGS.indexOf(b) >= 0) return b; }
    return 'en';
  }
  function applyAutoLang(lang) {
    if (!lang || lang === 'en') return false;
    if (!document.getElementById('home-view') || document.documentElement.hasAttribute('data-native')) return false;   /* only the app pages carry the page translator (not p/, c/, b/ pages) */
    var q = new URLSearchParams(location.search).get('gdcs_lang'); if (q && q.toLowerCase() === lang) return false;
    try { if (sessionStorage.getItem('sm_lang_tried')) return false; sessionStorage.setItem('sm_lang_tried', '1'); } catch (e) { return false; }
    var u = new URL(location.href); u.searchParams.set('gdcs_lang', lang);
    document.cookie = 'sm_lang=' + lang + ';path=/;max-age=31536000';
    location.replace(u.toString()); return true;
  }
  function autoDetect() {
    if (saved || IS_BOT) return Promise.resolve();
    var lang = browserLang();
    return geoCountry().catch(function () { return browserCountry() || 'PK'; }).then(function (cc) {
      state = { country: cc, currency: CUR[cc] || 'PKR', lang: lang, auto: true };
      save(state); paintHeader(); clearFx(); localiseText(document.body);
      window.dispatchEvent(new CustomEvent('sm:market', { detail: state }));
      if (applyAutoLang(lang)) return;
      getRates().then(function () { convertIn(document); convertTagged(document); }).catch(function () { });
      note();
    });
  }
  /* A small, dismissible notice: what was chosen and why, with a one-click way to change it. */
  function note() {
    if (!state.auto) return;
    try { if (localStorage.getItem('sm_auto_ack')) return; } catch (e) { }
    if (document.getElementById('sm-auto')) return;
    var active = (new URLSearchParams(location.search).get('gdcs_lang') || '').toLowerCase() === state.lang;   /* say "language" only when it is really applied */
    var langTxt = state.lang !== 'en' && active ? ' · ' + ((langName && langName.of(state.lang)) || state.lang) + ' (machine translation)' : '';
    var n = document.createElement('div'); n.id = 'sm-auto'; n.className = 'sm-auto'; n.setAttribute('role', 'status');
    n.innerHTML = '<span>Set for you: <b>' + esc(cname(state.country)) + ' · ' + esc(state.currency) + '</b>' + esc(langTxt) + ', from your approximate location.</span><button type="button" data-a="change">Change</button><button type="button" data-a="ok" aria-label="Dismiss this notice">OK</button>';
    n.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (!a) return; try { localStorage.setItem('sm_auto_ack', '1'); } catch (x) { } n.remove(); if (a === 'change') open(); });
    document.body.appendChild(n);
  }
  var rates = null;

  /* ---- exchange rates (PKR base) ---- */
  function getRates() {
    if (rates) return Promise.resolve(rates);
    try { var c = JSON.parse(localStorage.getItem(RATE_KEY) || 'null'); if (c && Date.now() - c.at < RATE_TTL) { rates = c.r; return Promise.resolve(rates); } } catch (e) {}
    return fetch('https://open.er-api.com/v6/latest/PKR').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.rates) throw new Error('no rates');
      rates = j.rates; try { localStorage.setItem(RATE_KEY, JSON.stringify({ at: Date.now(), r: rates })); } catch (e) {} return rates;
    });
  }
  function fmt(v, cur) { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v); } catch (e) { return cur + ' ' + v.toFixed(2); } }
  /* Shows prices in the visitor's currency only: "Rs 1,234" / "$1.23 – $4.56" are replaced by "SAR 16.70".
     The original markup (with its PKR/USD schema.org microdata) stays in the DOM, hidden, and comes back on PKR. */
  var PRICE_SEL = '.sm-card__price, .big-price, .smhv-price, .smh-cart__total, .smtp-price, .cart-line .price, .summary-row b, .sm-cat__price, .sm-stack__price';
  function convertIn(root) {
    if (!rates || state.currency === 'PKR' || !rates[state.currency]) return;
    var to = rates[state.currency], usd = rates.USD;
    (root || document).querySelectorAll(PRICE_SEL).forEach(function (el) {
      if (el.dataset.fx === state.currency && el.querySelector(':scope > .sm-fx')) return;
      var orig = el.querySelector(':scope > .sm-fx-orig'), src = orig ? orig.innerHTML : el.innerHTML;
      var probe = document.createElement('div'); probe.innerHTML = src; var t = probe.textContent, out = [];
      var rs = t.match(/Rs\.?\s?([\d,]+(?:\.\d+)?)/g), us = t.match(/\$\s?([\d,]+(?:\.\d+)?)/g);
      if (rs) rs.forEach(function (x) { out.push(fmt(parseFloat(x.replace(/[^\d.]/g, '')) * to, state.currency)); });
      else if (us && usd) { if (state.currency === 'USD') return; us.forEach(function (x) { out.push(fmt(parseFloat(x.replace(/[^\d.]/g, '')) / usd * to, state.currency)); }); }
      if (!out.length) return;
      var extra = /est\./.test(t) ? ' <small class="sm-est">est.</small>' : '';
      el.dataset.fx = state.currency;
      el.innerHTML = '<span class="sm-fx-orig" hidden>' + src + '</span><span class="sm-fx" title="Converted at today\'s rate from ' + (rs ? 'PKR' : 'USD') + '">' + esc(out.join(' – ')) + '</span>' + extra;
    });
  }
  /* Prices the live theme wrote in another currency (mega-menu visa prices: <span class="gdcs-converted-price"
     data-currency="SAR">SAR 605.65</span>) follow the chosen currency too, PKR included. */
  function convertTagged(root) {
    if (!rates) return;
    (root || document).querySelectorAll('.gdcs-converted-price[data-currency]').forEach(function (el) {
      var from = el.getAttribute('data-currency'); if (!el.dataset.srcHtml) el.dataset.srcHtml = el.innerHTML;
      if (el.dataset.shown === state.currency) return;
      if (state.currency === from || !rates[from] || !rates[state.currency]) { el.innerHTML = el.dataset.srcHtml; el.dataset.shown = state.currency; return; }
      var probe = document.createElement('div'); probe.innerHTML = el.dataset.srcHtml;
      var amt = parseFloat(probe.textContent.replace(/[^\d.]/g, '')); if (!amt) return;
      var v = amt / rates[from] * rates[state.currency];
      el.innerHTML = '<span class="sm-fx" title="Converted at today\'s rate from ' + from + '">' + esc(state.currency === 'PKR' ? 'Rs ' + Math.round(v).toLocaleString('en') : fmt(v, state.currency)) + '</span>';
      el.dataset.shown = state.currency;
    });
  }
  function clearFx() {
    document.querySelectorAll('[data-fx]').forEach(function (el) { var o = el.querySelector(':scope > .sm-fx-orig'); if (o) el.innerHTML = o.innerHTML; delete el.dataset.fx; });
  }

  /* Page wording follows the chosen destination: "Shopping for Pakistan · prices in PKR" -> "Shopping for Saudi Arabia · prices in SAR".
     Text nodes keep their original value so switching back restores it exactly. */
  var origText = new WeakMap();
  function localiseText(root) {
    var name = cname(state.country), cur = state.currency;
    var w = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      var p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|INPUT)$/.test(p.nodeName) || p.closest('.sm-mk, .sm-fx-orig, [data-no-localise]')) return NodeFilter.FILTER_REJECT;
      return (origText.has(n) || /Pakistan|PKR/.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP; } });
    var n; while ((n = w.nextNode())) {
      if (!origText.has(n)) origText.set(n, n.nodeValue);
      var o = origText.get(n), v = o;
      if (state.country !== 'PK' || cur !== 'PKR') {
        v = v.replace(/Shopping for Pakistan/g, 'Shopping for ' + name).replace(/prices in PKR/g, 'prices in ' + cur);
        // Destination card value ("Your shopping destination" → "Pakistan")
        if (o.trim() === 'Pakistan' && n.parentNode.previousElementSibling && /shopping destination/i.test(n.parentNode.previousElementSibling.textContent)) v = o.replace('Pakistan', name);
      }
      if (n.nodeValue !== v) n.nodeValue = v;
    }
  }

  /* ---- header ---- */
  function paintHeader() {
    document.querySelectorAll('[data-gdcs-market]').forEach(function (b) {
      var c = b.querySelector('.gdcs-market-trigger__country'), u = b.querySelector('.gdcs-market-trigger__currency'), f = b.querySelector('.gdcs-flag'), s = b.querySelector('.gdcs-market-trigger__separator');
      if (c) c.textContent = cname(state.country); if (u) u.textContent = state.currency; if (s) s.textContent = ' · ';
      if (f) f.innerHTML = flag(state.country, 32);
      b.setAttribute('aria-label', 'Shopping destination: ' + cname(state.country) + ', ' + state.currency + '. Change country, language or currency');
    });
    document.documentElement.classList.toggle('sm-abroad', state.country !== 'PK');
  }

  /* ---- dialog ---- */
  var dlg, list, search, pane, langSel, curSel, geo, status;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'sm-mk'; dlg.id = 'gdcs-market-dialog'; dlg.setAttribute('aria-labelledby', 'sm-mk-title');
    dlg.innerHTML = '<div class="sm-mk__head"><span class="sm-mk__globe" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.8 3.9 5.8 3.9 9s-1.3 6.2-3.9 9c-2.6-2.8-3.9-5.8-3.9-9S9.4 5.8 12 3z"/></svg></span>' +
      '<div><h2 id="sm-mk-title">Make yourself at home.</h2><p>Choose where you shop and how you browse.</p></div>' +
      '<button type="button" class="sm-mk__close" aria-label="Close">×</button></div>' +
      '<div class="sm-mk__body"><div class="sm-mk__left"><label for="sm-mk-q" class="sm-mk__lbl">Find your country or region</label>' +
      '<div class="sm-mk__search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sm-mk-q" type="search" placeholder="Search countries" autocomplete="off"></div>' +
      '<ul class="sm-mk__list" role="radiogroup" aria-label="Countries"></ul><div class="sm-mk__picked" aria-live="polite"></div></div>' +
      '<div class="sm-mk__right"><div class="sm-mk__pane"></div>' +
      '<label class="sm-mk__lbl" for="sm-mk-lang">Language</label><select id="sm-mk-lang"></select>' +
      '<p class="sm-mk__hint">Other languages are machine translated in your browser.</p>' +
      '<label class="sm-mk__lbl" for="sm-mk-cur">Display currency</label><select id="sm-mk-cur"></select>' +
      '<p class="sm-mk__hint">Converted amounts are estimates at today\'s rate. Checkout confirms the payment currency and delivery total.</p>' +
      '<label class="sm-mk__geo"><input type="checkbox" id="sm-mk-geo"> Suggest a destination using my approximate location.</label><p class="sm-mk__status" role="status"></p>' +
      '<button type="button" class="sm-mk__save">Save and continue</button></div></div>';
    document.body.appendChild(dlg);
    list = dlg.querySelector('.sm-mk__list'); search = dlg.querySelector('#sm-mk-q'); pane = dlg.querySelector('.sm-mk__pane');
    langSel = dlg.querySelector('#sm-mk-lang'); curSel = dlg.querySelector('#sm-mk-cur'); geo = dlg.querySelector('#sm-mk-geo'); status = dlg.querySelector('.sm-mk__status');
    langSel.innerHTML = LANGS.map(function (l) { var n = l; try { n = (langName && langName.of(l)) || l; } catch (e) {} return [l, n]; })
      .sort(function (a, b) { return a[0] === 'en' ? -1 : b[0] === 'en' ? 1 : a[1].localeCompare(b[1]); })
      .map(function (x) { return '<option value="' + x[0] + '">' + esc(x[1]) + (x[0] === 'en' ? '' : ' (machine translation)') + '</option>'; }).join('');
    var curs = Object.keys(CUR).map(function (c) { return CUR[c]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).sort();
    curSel.innerHTML = curs.map(function (c) { var n = c; try { n = (curName && curName.of(c)) || c; } catch (e) {} return '<option value="' + c + '">' + c + ' – ' + esc(n) + '</option>'; }).join('');
    search.addEventListener('input', renderList);
    list.addEventListener('change', function (e) { if (e.target.name === 'sm-mk-c') pick(e.target.value, true); });
    dlg.querySelector('.sm-mk__close').addEventListener('click', function () { dlg.close(); });
    // Close only on a click on the backdrop, i.e. outside the dialog's box (clicks on its own padding/scrollbar stay inside).
    dlg.addEventListener('click', function (e) {
      if (e.target !== dlg) return;
      var r = dlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
    });
    dlg.querySelector('.sm-mk__save').addEventListener('click', apply);
    geo.addEventListener('change', function () {
      if (!geo.checked) return;
      status.textContent = 'Finding your approximate location…';
      geoCountry().then(function (cc) {
        pick(cc, true); search.value = ''; renderList(); status.textContent = 'Suggested: ' + cname(cc) + '. You can change it.';
      }).catch(function () { status.textContent = 'Could not detect your location. Choose a country from the list.'; });
    });
  }
  var draft = {};
  function renderList() {
    var q = fold(search.value).trim();
    var items = COUNTRIES.filter(function (x) { return !q || fold(x.n).indexOf(q) >= 0 || x.c.toLowerCase() === q; });
    list.innerHTML = items.length ? items.map(function (x) {
      return '<li><label class="sm-mk__c' + (x.c === draft.country ? ' is-on' : '') + '"><input type="radio" name="sm-mk-c" value="' + x.c + '"' + (x.c === draft.country ? ' checked' : '') + '><span class="sm-mk__f" aria-hidden="true">' + flag(x.c) + '</span><span class="sm-mk__n">' + esc(x.n) + '</span><span class="sm-mk__cc">' + x.c + '</span></label></li>';
    }).join('') : '<li class="sm-mk__none">No country matches “' + esc(search.value) + '”.</li>';
  }
  function pick(cc, suggestCurrency) {
    draft.country = cc; if (suggestCurrency) { draft.currency = CUR[cc] || 'PKR'; curSel.value = draft.currency; if (curSel.value !== draft.currency) { draft.currency = 'PKR'; curSel.value = 'PKR'; } }
    list.querySelectorAll('.sm-mk__c').forEach(function (l) { l.classList.toggle('is-on', l.querySelector('input').value === cc); });
    pane.innerHTML = '<div class="sm-mk__sel"><span class="sm-mk__bigflag" aria-hidden="true">' + flag(cc, 64) + '</span><h3>' + esc(cname(cc)) + '</h3></div>' +
      '<p>' + (cc === 'PK' ? 'Local products are delivered across Pakistan with cash on delivery. Global items ship from our supplier network.' : 'Global items ship to ' + esc(cname(cc)) + ' from our supplier network. Local supplier items are delivered within Pakistan only: you can order them for an address in Pakistan, for example for family.') + '</p>' +
      '<p class="sm-mk__note">Choosing a country suggests its currency. Your selected language stays the same. PKR is used if a currency is unavailable.</p>';
    dlg.querySelector('.sm-mk__picked').innerHTML = '<span aria-hidden="true">✓</span> <span>Your shopping experience, personalised.<b>' + esc(cname(cc)) + '</b></span>';
  }
  function open() {
    if (!dlg) build();
    draft = { country: state.country, currency: state.currency, lang: state.lang };
    search.value = ''; renderList(); pick(draft.country, false); curSel.value = draft.currency; langSel.value = LANGS.indexOf(draft.lang) >= 0 ? draft.lang : 'en';
    geo.checked = false; status.textContent = '';
    dlg.showModal(); search.focus();
    var on = list.querySelector('.is-on'); if (on) on.scrollIntoView({ block: 'center' });
  }
  function apply() {
    var lang = langSel.value, langChanged = lang !== state.lang;
    state = { country: draft.country, currency: curSel.value || 'PKR', lang: lang, auto: false };   /* an explicit choice always wins over detection */
    var n = document.getElementById('sm-auto'); if (n) n.remove();
    save(state); dlg.close(); paintHeader(); clearFx(); localiseText(document.body);
    window.dispatchEvent(new CustomEvent('sm:market', { detail: state }));
    if (langChanged) {
      var u = new URL(location.href); if (lang === 'en') u.searchParams.delete('gdcs_lang'); else u.searchParams.set('gdcs_lang', lang);
      document.cookie = 'sm_lang=' + lang + ';path=/;max-age=31536000'; location.href = u.toString(); return;
    }
    getRates().then(function () { convertIn(document); convertTagged(document); }).catch(function () {});
  }

  function init() {
    paintHeader();
    document.addEventListener('click', function (e) { var t = e.target.closest && e.target.closest('[data-gdcs-market], [data-gdl-header-language], [data-gdl-header-currency]'); if (t) { e.preventDefault(); e.stopPropagation(); open(); } }, true);
    // Always watch for newly rendered prices; convertIn() does nothing while the currency is PKR or rates are not loaded.
    var queued = false, again = function () { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; convertIn(document); convertTagged(document); localiseText(document.body); }); };
    localiseText(document.body);
    if (document.querySelector('.gdcs-converted-price[data-currency]')) getRates().then(again).catch(function () {});
    new MutationObserver(function (m) { for (var i = 0; i < m.length; i++) if (m[i].addedNodes.length) { again(); break; } }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', again); document.addEventListener('sasta:rendered', again);
    if (state.currency !== 'PKR') getRates().then(again).catch(function () {});
    // Visa tab of the travel box: every destination, popular ones first (the live form listed only 10).
    var dl = document.getElementById('smx-countries');
    if (dl) {
      var pop = ['Saudi Arabia', 'United Arab Emirates', 'Serbia', 'Turkey', 'Schengen (Europe)', 'United Kingdom', 'Malaysia', 'Azerbaijan', 'Qatar', 'Thailand'];
      dl.innerHTML = pop.concat(COUNTRIES.map(function (x) { return x.n; }).filter(function (n) { return pop.indexOf(n) < 0; })).map(function (n) { return '<option value="' + esc(n) + '"></option>'; }).join('');
    }
    if (saved) { if (state.auto && applyAutoLang(state.lang)) return; note(); } else autoDetect();
  }
  var css = document.createElement('style');
  css.textContent = '.sm-mk{width:min(1180px,calc(100vw - 32px));max-height:min(860px,calc(100vh - 32px));padding:0;border:0;border-radius:28px;box-shadow:0 30px 80px rgba(9,46,30,.28),0 4px 14px rgba(9,46,30,.12);color:#11261b;background:#fff;overflow:hidden}' +
    '.sm-mk::backdrop{background:rgba(10,30,20,.45);backdrop-filter:blur(4px)}.sm-mk[open]{display:flex;flex-direction:column}' +
    '.sm-mk__head{display:flex;align-items:center;gap:24px;padding:32px 36px 28px;background:radial-gradient(120% 140% at 100% 0,#cdf3e6 0,rgba(205,243,230,0) 60%),#fbfdfc;border-bottom:1px solid #e6eee9}' +
    '.sm-mk__head h2{margin:0;font-size:clamp(26px,3.4vw,40px);letter-spacing:-.03em;line-height:1.1}.sm-mk__head p{margin:6px 0 0;color:#4b5a52}' +
    '.sm-mk__globe{flex:0 0 auto;display:grid;place-items:center;width:84px;height:84px;border-radius:50%;color:#fff;background:linear-gradient(145deg,#1fae86,#0e7a5c);box-shadow:0 10px 24px rgba(14,122,92,.3)}' +
    '.sm-mk__close{margin-left:auto;width:52px;height:52px;border-radius:50%;border:0;background:#fff;box-shadow:0 4px 14px rgba(0,0,0,.1);font-size:28px;line-height:1;cursor:pointer;transition:transform .2s}.sm-mk__close:hover{transform:scale(1.06)}.sm-mk__close:focus-visible{outline:3px solid #0e7a5c;outline-offset:2px}' +
    '.sm-mk__body{display:grid;grid-template-columns:1.1fr 1fr;min-height:0;overflow:auto}.sm-mk__left{padding:28px 32px;border-right:1px solid #e6eee9;display:flex;flex-direction:column;min-height:0}.sm-mk__right{padding:28px 32px;background:#f8fbf9}' +
    '.sm-mk__lbl{display:block;font-weight:700;margin:0 0 10px}.sm-mk__right .sm-mk__lbl{margin-top:18px}' +
    '.sm-mk__search{display:flex;align-items:center;gap:10px;padding:0 18px;border:2px solid #e8a33d;border-radius:999px;background:#fbfcfb}.sm-mk__search input{flex:1;border:0!important;background:none!important;min-height:52px;font-size:17px;outline:0!important;box-shadow:none!important;padding:0}.sm-mk__search:focus-within{box-shadow:0 0 0 4px rgba(232,163,61,.22)}' +
    '.sm-mk__flagimg{display:block;border-radius:4px;box-shadow:0 0 0 1px rgba(0,0,0,.08);object-fit:cover}' +
    '.sm-mk__list{list-style:none;margin:14px 0 0;padding:0 6px 0 0;overflow:auto;max-height:360px;display:grid;gap:10px}' +
    '.sm-mk__c{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:14px;padding:16px 18px;border:1px solid #e3ebe6;border-radius:16px;cursor:pointer;transition:transform .15s}.sm-mk__c:hover{transform:translateX(2px);border-color:#9bd3bf}' +
    '.sm-mk__c.is-on{border:2px solid #0e7a5c;background:#effaf5;font-weight:700}.sm-mk__c input{width:20px;height:20px;accent-color:#0e7a5c}.sm-mk__c:focus-within{outline:3px solid #0e7a5c;outline-offset:2px}' +
    '.sm-mk__f{font-size:26px;line-height:1}.sm-mk__cc{color:#5b6a62;font-size:14px}.sm-mk__none{padding:16px;color:#5b6a62}' +
    '.sm-mk__picked{display:flex;gap:14px;align-items:center;margin-top:16px;padding:16px 20px;border-radius:16px;background:#eef8f3}.sm-mk__picked>span:first-child{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#0e9a6c;color:#fff;font-weight:700}.sm-mk__picked b{display:block;font-size:18px}' +
    '.sm-mk__sel{display:flex;align-items:center;gap:16px}.sm-mk__sel h3{margin:0;font-size:30px;letter-spacing:-.02em}.sm-mk__bigflag{font-size:52px;line-height:1}' +
    '.sm-mk__pane p{color:#3f4d46;line-height:1.7}.sm-mk__note{padding:14px 18px;border-radius:14px;background:#e3f4ec;color:#3f5a4d!important;font-size:15px}' +
    '.sm-mk__right select{width:100%;min-height:54px;border:1px solid #d5e0da;border-radius:999px;padding:0 18px;font-size:16px;background:#fff}.sm-mk__hint{margin:8px 4px 0;color:#5b6a62;font-size:13px;line-height:1.5}' +
    '.sm-mk__geo{display:flex;gap:10px;align-items:center;margin-top:18px}.sm-mk__status{min-height:1.4em;color:#0e7a5c;font-size:14px}' +
    '.sm-mk__save{margin-top:8px;width:100%;min-height:54px;border:0;border-radius:999px;background:#0e7a5c;color:#fff;font-weight:700;font-size:17px;cursor:pointer;box-shadow:0 8px 20px rgba(14,122,92,.28);transition:transform .2s}.sm-mk__save:hover{transform:translateY(-1px)}.sm-mk__save:active{transform:scale(.98)}.sm-mk__save:focus-visible{outline:3px solid #11261b;outline-offset:2px}' +
    '.sm-fx{display:inline-block;margin-left:6px;color:#5b6a62;font-weight:500;font-size:.8em}.sm-flag-emoji{font-size:22px;line-height:1}' +
    '@media (max-width:820px){.sm-mk{border-radius:20px;overflow:auto}.sm-mk[open]{display:block}.sm-mk__body{grid-template-columns:1fr;overflow:visible}.sm-mk__left{border-right:0;border-bottom:1px solid #e6eee9}.sm-mk__head{padding:20px;gap:14px}.sm-mk__globe{width:56px;height:56px}.sm-mk__globe svg{width:30px;height:30px}.sm-mk__left,.sm-mk__right{padding:20px}.sm-mk__list{max-height:260px}}' +
    '@media (prefers-reduced-motion:reduce){.sm-mk *{transition:none!important}}';
  document.head.appendChild(css);
  css.textContent += '.sm-auto{position:fixed;z-index:99990;left:50%;top:12px;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;max-width:min(760px,calc(100vw - 24px));padding:10px 14px;border-radius:14px;background:#11261b;color:#fff;font-size:14px;line-height:1.45;box-shadow:0 12px 30px rgba(9,46,30,.35)}' +
    '.sm-auto button{min-height:34px;padding:0 14px;border:0;border-radius:999px;font:600 13px/1 inherit;cursor:pointer;background:#fff;color:#11261b}.sm-auto button[data-a="change"]{background:transparent;color:#bfeedd;text-decoration:underline}.sm-auto button:focus-visible{outline:3px solid #ffc439;outline-offset:2px}' +
    '@media (max-width:820px){.sm-auto{top:auto;bottom:calc(86px + env(safe-area-inset-bottom));}}';
  window.SMMarket = { open: open, state: function () { return state; }, convert: convertIn, list: function () { return COUNTRIES.slice(); }, detect: geoCountry, browserLang: browserLang, countryName: cname, flag: flag, currencies: CUR };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
