/* Sasta Milaga static pages (p/, c/): inject the same header and footer as the home page.
   The product content is already in the HTML for crawlers; this only adds site chrome. */
(function () {
  'use strict';
  var holder = document.getElementById('sm-chrome-header');
  if (!holder) return;
  var prefix = holder.getAttribute('data-prefix') || '../';

  function fixLinks(root) {
    root.querySelectorAll('[href],[src],[srcset],[action]').forEach(function (el) {
      ['href', 'src', 'action'].forEach(function (a) {
        var v = el.getAttribute(a);
        if (v == null || /^(https?:|mailto:|tel:|data:|\/\/|#(?!\/))/.test(v)) return;
        el.setAttribute(a, v === './' ? prefix : prefix + v.replace(/^\.\//, ''));
      });
      var ss = el.getAttribute('srcset');
      if (ss) el.setAttribute('srcset', ss.split(',').map(function (part) { var t = part.trim(); return /^(https?:|data:)/.test(t) ? t : prefix + t; }).join(', '));
    });
  }
  function runScripts(html) {
    var box = document.createElement('div'); box.innerHTML = html;
    box.querySelectorAll('script').forEach(function (old) {
      var s = document.createElement('script');
      if (old.src) s.src = old.src; else s.textContent = old.textContent;
      document.body.appendChild(s);
    });
  }

  fetch(prefix + 'partials/chrome.json', { credentials: 'omit' }).then(function (r) { return r.json(); }).then(function (c) {
    runScripts(c.boot);
    var h = document.createElement('div'); h.innerHTML = c.header; fixLinks(h);
    holder.replaceWith.apply(holder, Array.prototype.slice.call(h.childNodes));
    var fh = document.getElementById('sm-chrome-footer');
    if (fh) { var f = document.createElement('div'); f.innerHTML = c.footer; fixLinks(f); fh.replaceWith.apply(fh, Array.prototype.slice.call(f.childNodes)); }
    runScripts(c.smh);
    /* Header search goes to the full catalogue search */
    var form = document.querySelector('form.smh-search');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      var q = (form.querySelector('input[type="search"]') || {}).value || '', cat = (form.querySelector('select') || {}).value || '';
      location.href = prefix + (cat ? '#/category/' + cat + (q ? '?q=' + encodeURIComponent(q) : '') : '#/search?q=' + encodeURIComponent(q));
    }, true);
    document.querySelectorAll('[data-gdcs-market]').forEach(function (b) { if (b.tagName === 'BUTTON') b.addEventListener('click', function () { location.href = prefix + '#/language'; }); });
    /* Cart badge from the shared cart (same storage key as app.js) */
    try {
      var n = JSON.parse(localStorage.getItem('sm_cart') || '[]').reduce(function (a, x) { return a + (x.qty || 0); }, 0);
      document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); });
    } catch (e) {}
    var site = document.createElement('script'); site.src = prefix + 'assets/js/site.min.js'; document.body.appendChild(site);
  }).catch(function () { /* the fallback logo header stays */ });
  /* WhatsApp order button on every product and video card */
  var wa = document.createElement('script'); wa.src = prefix + 'assets/js/wa-cards.js'; wa.defer = true; document.head.appendChild(wa);
  /* Country / language / currency window (header "Shopping destination" button) */
  var mk = document.createElement('script'); mk.src = prefix + 'assets/js/market.js'; mk.defer = true; document.head.appendChild(mk);
  /* Contact number by location (Pakistan number for Pakistan visitors) */
  var ct = document.createElement('script'); ct.src = prefix + 'assets/js/contact.js'; ct.defer = true; document.head.appendChild(ct);
})();
