/* Header search suggestions for the whole catalogue: Pakistan products AND the global (supplier) catalogue.
   - Words, categories and products appear as you type; keyboard (arrows, Enter, Esc) and screen readers (combobox/listbox) work.
   - The 451,812 global products are never downloaded up front: a small keyword index (data/cj/search-index.js, 135 KB gzipped)
     says which category files to open first, and only those few files are fetched.
   - Prices shown for global items are the same estimates as on their product pages (supplier price x 1.2, US dollars).
   Also exposes window.SMCJSearch (rank, products) for the global search results block. */
(function () {
  'use strict';
  if (window.SMCJSearch) return;
  var SELF = (document.currentScript && document.currentScript.src) || '';
  var BASE = SELF.replace(/assets\/js\/search-suggest\.js.*$/, '') || (location.origin + '/');
  var MARGIN = 1.2, USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  var manP = null, idxP = null, own = new Map(), pend = new Map();
  var prevShard = window.SM_CJ_SHARD;
  window.SM_CJ_SHARD = function (s, rows) { own.set(s, rows); var p = pend.get(s); if (p) { p(rows); pend.delete(s); } if (prevShard) prevShard(s, rows); };
  function load(src) { return new Promise(function (res, rej) { var el = document.createElement('script'); el.src = src; el.async = true; el.onload = res; el.onerror = function () { rej(new Error(src)); }; document.head.appendChild(el); }); }
  function manifest() { return manP || (manP = window.SM_CJ ? Promise.resolve(window.SM_CJ) : load(BASE + 'data/cj/manifest.js').then(function () { return window.SM_CJ; })); }
  function index() { return idxP || (idxP = window.SM_CJ_IDX ? Promise.resolve(window.SM_CJ_IDX) : load(BASE + 'data/cj/search-index.js').then(function () { return window.SM_CJ_IDX; })); }
  function shard(s) {
    if (window.SMGlobal && window.SMGlobal.shard) return window.SMGlobal.shard(s);
    if (own.has(s)) return Promise.resolve(own.get(s));
    return new Promise(function (res, rej) { pend.set(s, res); load(BASE + 'data/cj/c/' + encodeURIComponent(s) + '.js').catch(function (e) { pend.delete(s); rej(e); }); });
  }
  var words = function (q) { return String(q || '').toLowerCase().replace(/[^a-z0-9\s-]+/g, ' ').split(/\s+/).filter(Boolean); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };

  /* category slugs ordered by how many products match the query words (needs the index) */
  function rank(ws) {
    return Promise.all([manifest(), index()]).then(function (a) {
      var man = a[0], ix = a[1], score = {}, n = ws.length;
      ws.forEach(function (w, i) {
        var keys = ix.t[w] ? [w] : (i === n - 1 ? Object.keys(ix.t).filter(function (k) { return k.indexOf(w) === 0; }).slice(0, 6) : []);
        keys.forEach(function (k) { ix.t[k].forEach(function (p) { var s = ix.c[p[0]]; (score[s] = score[s] || { hit: {}, sum: 0 }); score[s].hit[i] = 1; score[s].sum += p[1]; }); });
      });
      man.cats.forEach(function (c) { var nm = (c.n + ' ' + c.g).toLowerCase(); ws.forEach(function (w, i) { if (nm.indexOf(w) >= 0) { var e = (score[c.s] = score[c.s] || { hit: {}, sum: 0 }); e.hit[i] = 1; e.sum += 60; } }); });
      return Object.keys(score).map(function (s) { var e = score[s], hits = Object.keys(e.hit).length; return { s: s, v: (hits === n ? 1e6 : 0) + hits * 1e4 + e.sum }; }).sort(function (x, y) { return y.v - x.v; }).map(function (x) { return x.s; });
    });
  }
  /* global products matching every word: opens the best-ranked category files until `limit` hits */
  function products(ws, limit, maxShards, onHit) {
    return rank(ws).then(function (order) {
      var out = [], i = 0;
      function next() {
        if (out.length >= limit || i >= Math.min(order.length, maxShards)) return out;
        var s = order[i++];
        return shard(s).then(function (rows) {
          rows.some(function (r) { var nm = (r[2] + ' ' + r[1]).toLowerCase(); if (ws.every(function (w) { return nm.indexOf(w) >= 0; })) { out.push({ cat: s, r: r }); if (onHit) onHit(out); } return out.length >= limit; });
          return next();
        }, next);
      }
      return next();
    });
  }
  window.SMCJSearch = { words: words, rank: rank, products: products, manifest: manifest, index: index };

  /* ---------------- dropdown UI ---------------- */
  var CSS = '.smss{position:absolute;z-index:99990;inset-inline-start:0;width:max(100%,min(560px,94vw));top:calc(100% + 6px);max-height:min(78vh,640px);overflow:auto;border-radius:16px;background:#fff;color:#1c2b22;border:1px solid rgba(15,122,59,.18);box-shadow:0 26px 50px -22px rgba(11,59,32,.55),0 4px 12px rgba(11,59,32,.12);padding:6px;text-align:start;font:400 14px/1.45 system-ui,sans-serif}'
    + '.smss[hidden]{display:none}.smss h3{margin:10px 10px 4px;font:800 11px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#5a6f61}'
    + '.smss ul{list-style:none;margin:0;padding:0}.smss a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;color:inherit;text-decoration:none}'
    + '.smss a:hover,.smss a[aria-selected=true]{background:#EAF6EE}.smss a:focus-visible{outline:3px solid #FF8A00;outline-offset:-3px}'
    + '.smss img{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#F4FBF6;flex:none}.smss .t{flex:1;min-width:0}.smss .t b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}.smss .t small{color:#5a6f61}'
    + '.smss .p{flex:none;font-weight:800;color:#0B5E2E}.smss .i{flex:none;width:44px;display:grid;place-items:center;color:#0F7A3B}.smss mark{background:none;color:#0F7A3B;font-weight:800}'
    + '.smss .all a{justify-content:center;margin-top:4px;background:#0F7A3B;color:#fff;font-weight:800}.smss .all a:hover,.smss .all a[aria-selected=true]{background:#0B3B20}'
    + '.smss .st{padding:10px 12px;color:#5a6f61}@media (prefers-reduced-motion:no-preference){.smss{animation:smssin .14s ease-out}@keyframes smssin{from{opacity:0;transform:translateY(-4px)}}}';
  function init() {
    var input = document.getElementById('smh-q'); if (!input || input.dataset.smss) return; input.dataset.smss = '1';
    var form = input.closest('form'); if (!form) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    if (getComputedStyle(form).position === 'static') form.style.position = 'relative';
    var box = document.createElement('div'); box.className = 'smss'; box.id = 'smss-box'; box.hidden = true; box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Search suggestions'); form.appendChild(box);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'smss-box');
    var app = !!window.SMApp, hd = document.getElementById('sm-chrome-header'), pre = app ? '' : ((hd && hd.getAttribute('data-prefix')) || '../');
    var L = {
      search: function (q) { return app ? '#/search?q=' + encodeURIComponent(q) : pre + '#/search?q=' + encodeURIComponent(q); },
      cat: function (s) { return app ? '#/global/c/' + s : pre + 'c/global/' + s + '.html'; },
      gp: function (c, id) { return app ? '#/global/p/' + c + '/' + encodeURIComponent(id) : pre + 'global/p/' + c + '/' + encodeURIComponent(id); },
      lp: function (p) { return app ? '#/product/' + p._slug : pre + '#/product/' + p._slug; }
    };
    var token = 0, timer = null, cur = -1;
    var hl = function (text, ws) { var s = esc(text); ws.forEach(function (w) { s = s.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); }); return s; };
    var opts = function () { return Array.prototype.slice.call(box.querySelectorAll('a[role=option]')); };
    function close() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); cur = -1; }
    function mark(i) { var o = opts(); if (!o.length) return; cur = (i + o.length) % o.length; o.forEach(function (a, k) { a.setAttribute('aria-selected', k === cur ? 'true' : 'false'); }); input.setAttribute('aria-activedescendant', o[cur].id); o[cur].scrollIntoView({ block: 'nearest' }); }
    function paint(q, ws, parts) {
      var n = 0, id = function () { return 'smss-o' + (n++); };
      var html = '';
      if (parts.words && parts.words.length) html += '<h3>Suggestions</h3><ul>' + parts.words.map(function (w) { return '<li><a role="option" id="' + id() + '" href="' + esc(L.search(w)) + '"><span class="i"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></span><span class="t"><b>' + hl(w, ws) + '</b></span></a></li>'; }).join('') + '</ul>';
      if (parts.cats && parts.cats.length) html += '<h3>Global categories</h3><ul>' + parts.cats.map(function (c) { return '<li><a role="option" id="' + id() + '" href="' + esc(L.cat(c.s)) + '"><img src="' + esc(c.img) + '" alt="" width="44" height="44" loading="lazy"><span class="t"><b>' + hl(c.n, ws) + '</b><small>' + c.c.toLocaleString() + ' global products</small></span></a></li>'; }).join('') + '</ul>';
      if (parts.local && parts.local.length) html += '<h3>Products in Pakistan</h3><ul>' + parts.local.map(function (p) { var im = p.img || (p.imgs && p.imgs[0]) || ''; return '<li><a role="option" id="' + id() + '" href="' + esc(L.lp(p)) + '"><img src="' + esc(im) + '" alt="" width="44" height="44" loading="lazy"><span class="t"><b>' + hl(p.n, ws) + '</b></span><span class="p">' + esc(window.SMApp.PKR.format(window.SMApp.price(p))) + '</span></a></li>'; }).join('') + '</ul>';
      if (parts.glob && parts.glob.length) html += '<h3>Global products</h3><ul>' + parts.glob.map(function (h) { var r = h.r; return '<li><a role="option" id="' + id() + '" href="' + esc(L.gp(h.cat, r[0])) + '"><img src="' + esc(r[5]) + '" alt="" width="44" height="44" loading="lazy" onerror="this.style.visibility=\'hidden\'"><span class="t"><b>' + hl(r[2], ws) + '</b><small>Global item · estimate</small></span><span class="p">' + USD.format((r[3] || 0) * MARGIN) + '</span></a></li>'; }).join('') + '</ul>';
      if (parts.loading) html += '<p class="st" role="status">Searching the global catalogue…</p>';
      else if (!n) html += '<p class="st" role="status">No suggestions yet. Press Enter to search everything.</p>';
      html += '<div class="all"><a role="option" id="' + id() + '" href="' + esc(L.search(q)) + '">See all results for “' + esc(q) + '”</a></div>';
      box.innerHTML = html; box.hidden = false; input.setAttribute('aria-expanded', 'true'); cur = -1;
    }
    function run() {
      var q = input.value.trim(), ws = words(q); if (q.length < 2 || !ws.length) { close(); return; }
      var my = ++token, parts = { loading: true };
      var last = ws[ws.length - 1];
      if (window.SMApp && window.SMApp.products) { try { parts.local = window.SMApp.products.filter(function (p) { return ws.every(function (w) { return p._search.indexOf(w) >= 0; }); }).slice(0, 3); } catch (e) { } }
      paint(q, ws, parts);
      Promise.all([manifest(), index()]).then(function (a) {
        if (my !== token) return; var man = a[0], ix = a[1];
        parts.words = ix.w.filter(function (w) { return w.indexOf(last) === 0 && w !== last; }).slice(0, 4).map(function (w) { return ws.slice(0, -1).concat(w).join(' '); });
        parts.cats = man.cats.filter(function (c) { var nm = (c.n + ' ' + c.g).toLowerCase(); return ws.every(function (w) { return nm.indexOf(w) >= 0; }); }).sort(function (x, y) { return y.c - x.c; }).slice(0, 2);
        paint(q, ws, parts);
        return products(ws, 4, 3, function (hits) { if (my === token) { parts.glob = hits.slice(); paint(q, ws, parts); } });
      }).then(function (hits) { if (my !== token) return; parts.glob = hits || parts.glob; parts.loading = false; paint(q, ws, parts); }).catch(function () { if (my !== token) return; parts.loading = false; paint(q, ws, parts); });
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 140); });
    input.addEventListener('focus', function () { manifest(); index(); if (input.value.trim().length > 1 && box.hidden) run(); });
    input.addEventListener('keydown', function (e) {
      if (box.hidden) { if (e.key === 'ArrowDown' && input.value.trim().length > 1) { run(); } return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); mark(cur + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); mark(cur - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }   /* keep the typed text (a search box would clear itself) */
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); var o = opts()[cur]; if (o) { close(); o.click(); } }
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
    box.addEventListener('click', function (e) { if (e.target.closest('a')) setTimeout(close, 0); });
    form.addEventListener('submit', close);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  /* the header can arrive later on static pages (chrome.js injects it) */
  new MutationObserver(function () { if (!document.getElementById('smh-q') || document.getElementById('smh-q').dataset.smss) return; init(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
