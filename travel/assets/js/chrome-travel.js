/* Sasta Milaga Travel — storefront chrome.
 *
 * Travel pages use exactly the same header and footer as the shop. The markup
 * comes from the canonical partials/chrome-runtime.json payload that every
 * static product page already loads, so there is one source of truth.
 *
 * This loader intentionally does NOT load the commerce scripts that chrome.js
 * pulls in (woo-bridge, hhcbridge, cod-recovery, hhc). Travel has no cart,
 * checkout or COD flow, and those scripts must not touch the booking hand-off.
 */
(function () {
  'use strict';

  var holder = document.getElementById('sm-chrome-header');
  if (!holder || window.__smTravelChrome) return;
  window.__smTravelChrome = true;

  /* Shop app hash routes do not exist on the travel app. Send them to the
     real page instead of a dead hash on the current travel URL. */
  var HASH = [
    [/^#\/travel\?tab=flights/i, '/travel/flights/'],
    [/^#\/travel\?tab=stays/i, '/travel/stays/'],
    [/^#\/travel\?tab=tours/i, '/travel/tours/'],
    [/^#\/travel\?tab=cars/i, '/travel/cars/'],
    [/^#\/travel\?tab=umrah/i, '/travel/umrah/'],
    [/^#\/travel\?tab=visa/i, '/travel/visa/'],
    [/^#\/travel\?tab=esim/i, '/travel/esim/'],
    [/^#\/travel\b/i, '/travel/'],
    [/^#\/search\?(.*)$/i, '/search/?$1'],
    [/^#\/search\b/i, '/search/'],
    [/^#\/shop\b/i, '/shop/'],
    [/^#\/language\b/i, '/#/language'],
    [/^#\/product\//i, '/shop/'],
    [/^#\/category\//i, '/shop/']
  ];

  function mapHash(v) {
    for (var i = 0; i < HASH.length; i++) if (HASH[i][0].test(v)) return v.replace(HASH[i][0], HASH[i][1]);
    return '/';
  }

  /* Chrome markup is written for the site root; travel pages live one or two
     levels deep, so every relative URL becomes root-absolute. */
  function fix(scope) {
    scope.querySelectorAll('[href],[src],[srcset],[action]').forEach(function (el) {
      ['href', 'src', 'action'].forEach(function (attr) {
        var v = el.getAttribute(attr);
        if (v == null || v === '') return;
        if (/^(https?:|mailto:|tel:|data:|\/\/|\/)/.test(v)) return;
        if (v.charAt(0) === '#') { el.setAttribute(attr, mapHash(v)); return; }
        el.setAttribute(attr, '/' + v.replace(/^\.\//, ''));
      });
      var ss = el.getAttribute('srcset');
      if (ss) el.setAttribute('srcset', ss.split(',').map(function (part) {
        var t = part.trim();
        return /^(https?:|data:|\/)/.test(t) ? t : '/' + t.replace(/^\.\//, '');
      }).join(', '));
    });
  }

  function run(html) {
    var box = document.createElement('div');
    box.innerHTML = html;
    box.querySelectorAll('script').forEach(function (old) {
      var s = document.createElement('script');
      if (old.src) s.src = old.src; else s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }

  function read(file) {
    return fetch(file, { credentials: 'omit', cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error('chrome ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || !j.header || !j.footer || !j.boot || !j.smh) throw new Error('chrome incomplete');
      return j;
    });
  }

  function cartBadge() {
    try {
      var sum = function (k) {
        return JSON.parse(localStorage.getItem(k) || '[]').reduce(function (a, x) { return a + (x.qty || 0); }, 0);
      };
      var n = sum('sm_cart') + sum('sm_gcart');
      document.querySelectorAll('.smh-cart__count').forEach(function (el) {
        el.textContent = n;
        el.setAttribute('data-n', n);
      });
    } catch (e) { /* storage disabled */ }
  }

  read('/partials/chrome-runtime.json').catch(function () {
    return read('/partials/chrome.json');
  }).then(function (c) {
    run(c.boot);

    var h = document.createElement('div');
    h.innerHTML = c.header;
    fix(h);
    holder.replaceWith.apply(holder, Array.prototype.slice.call(h.childNodes));

    var fh = document.getElementById('sm-chrome-footer');
    if (fh) {
      var f = document.createElement('div');
      f.innerHTML = c.footer;
      fix(f);
      fh.replaceWith.apply(fh, Array.prototype.slice.call(f.childNodes));
    }

    run(c.smh);

    /* The shop header search is the catalogue search. */
    var form = document.querySelector('form.smh-search');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var q = (form.querySelector('input[type="search"]') || {}).value || '';
        var cat = (form.querySelector('select') || {}).value || '';
        if (!q.trim()) { if (cat) location.href = '/c/' + encodeURIComponent(cat) + '.html'; return; }
        location.href = '/search/?q=' + encodeURIComponent(q.trim());
      }, true);
    }

    /* "Shopping destination" opens the shop window, which travel does not host. */
    document.querySelectorAll('[data-gdcs-market]').forEach(function (b) {
      if (b.tagName === 'BUTTON') b.addEventListener('click', function () { location.href = '/#/language'; });
    });

    cartBadge();
    document.documentElement.classList.add('sm-travel-chrome-ready');
  }).catch(function () {
    /* Keep a real, crawlable brand link if the payload cannot be fetched. */
    holder.innerHTML = '<header class="sm-fallback-head"><a href="/"><img src="/assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header>';
  });
})();
