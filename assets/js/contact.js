/* Contact numbers by location.
 * Every visitor sees the WhatsApp line of their own regional team, on every page: header bar, menus, footer, contact blocks,
 * product, category, blog and app-rendered pages. The region follows the saved country ('sm_market', set by the country window
 * or by automatic detection) and updates the moment the country changes. Numbers are the regional teams published on sastamilaga.com. */
(function () {
  'use strict';
  var LINES = {
    pk:   { n: '923432601806',  t: '+92 343 2601806' },
    gulf: { n: '966510451995',  t: '+966510451995' },
    au:   { n: '61415183156',   t: '+61 415 183 156' },
    us:   { n: '12817489768',   t: '+1 (281) 748-9768' },
    uk:   { n: '447846109263',  t: '+44 7846 109263' },
    ie:   { n: '353852228885',  t: '+353 85 222 8885' },
    hr:   { n: '385953532432',  t: '+385 95 353 2432' },
    it:   { n: '393454677458',  t: '+39 345 467 7458' },
    sg:   { n: '6580138554',    t: '+65 8013 8554' },
    cn:   { n: '8619563055191', t: '+86 195 6305 5191' },
    af:   { n: '26772228229',   t: '+267 72 228 229' },
    in:   { n: '918128425068',  t: '+91 81284 25068' },
    eg:   { n: '201028377512',  t: '+20 10 28377512' }
  };
  var OLD = ['923000000000'];   // placeholder numbers that must never be shown
  function set(k, list) { list.split(' ').forEach(function (c) { MAP[c] = k; }); }
  var MAP = {};
  set('pk', 'PK'); set('gulf', 'SA AE QA KW BH OM'); set('au', 'AU NZ'); set('us', 'US CA'); set('uk', 'GB'); set('hr', 'HR'); set('it', 'IT');
  set('sg', 'SG'); set('cn', 'CN'); set('in', 'IN'); set('eg', 'EG');
  set('ie', 'IE FR DE ES PT NL BE LU AT CH DK SE NO FI IS PL CZ SK HU RO BG GR SI EE LV LT MT CY AD MC SM LI AL BA ME MK RS XK MD UA BY');
  set('af', 'BW ZA NA ZW ZM MW MZ TZ KE UG RW ET GH NG SN CI CM AO LS SZ MU MG DZ MA TN LY SD SS CD CG GA GM GN ML NE BF TD TG BJ SL LR MR DJ ER SO BI CV ST GQ GW KM SC');

  function country() { try { return JSON.parse(localStorage.getItem('sm_market') || '{}').country || 'PK'; } catch (e) { return 'PK'; } }
  function key() { return MAP[country()] || 'gulf'; }   // other countries: the international (Gulf) line, as before

  // Code that builds WhatsApp links reads SM_CONFIG.whatsapp when it runs: give it the number for this visitor.
  function patchConfig() {
    var cfg = window.SM_CONFIG; if (!cfg || cfg.__waPatched) return;
    try { Object.defineProperty(cfg, 'whatsapp', { configurable: true, enumerable: true, get: function () { return LINES[key()].n; }, set: function () {} }); cfg.__waPatched = true; } catch (e) {}
  }

  var ALLK = Object.keys(LINES);
  function swapIn(s, k) {
    var out = String(s), i, o;
    for (i = 0; i < ALLK.length; i++) { o = ALLK[i]; if (o === k) continue; out = out.split(LINES[o].n).join(LINES[k].n).split(LINES[o].t).join(LINES[k].t); }
    OLD.forEach(function (x) { out = out.split(x).join(LINES[k].n); });
    return out;
  }
  function hasNumber(s) { for (var i = 0; i < ALLK.length; i++) if (s.indexOf(LINES[ALLK[i]].t) >= 0) return true; return false; }
  function fix(root) {
    var k = key(), i, el, n, tel = new RegExp('^tel:\\+?(' + ALLK.map(function (x) { return LINES[x].n; }).join('|') + ')');
    var links = root.querySelectorAll('a[href*="wa.me/"],a[href*="api.whatsapp.com"],a[href^="tel:"]');
    for (i = 0; i < links.length; i++) {
      el = links[i]; var h = el.getAttribute('href'), h2 = h.indexOf('tel:') === 0 ? h.replace(tel, 'tel:+' + LINES[k].n) : swapIn(h, k);
      if (h2 !== h) el.setAttribute('href', h2);
    }
    var w = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT, null), t, list = [];
    while ((t = w.nextNode())) { if (t.nodeValue.indexOf('+') >= 0 && hasNumber(t.nodeValue)) list.push(t); }
    for (i = 0; i < list.length; i++) { n = swapIn(list[i].nodeValue, k); if (n !== list[i].nodeValue) list[i].nodeValue = n; }
    var labelled = root.querySelectorAll('[aria-label*="+"]');
    for (i = 0; i < labelled.length; i++) { var a = labelled[i].getAttribute('aria-label'); if (hasNumber(a)) labelled[i].setAttribute('aria-label', swapIn(a, k)); }
  }

  var queued = false;
  function run() { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(function () { queued = false; patchConfig(); if (document.body) fix(document); }); }
  window.SMContact = { number: function () { return LINES[key()].n; }, text: function () { return LINES[key()].t; }, region: key, lines: LINES, refresh: run };
  patchConfig(); run();
  document.addEventListener('DOMContentLoaded', run);
  window.addEventListener('sm:market', run);
  window.addEventListener('storage', run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
})();
