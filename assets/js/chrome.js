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
    function badge() {
      try {
        var sum = function (k) { return JSON.parse(localStorage.getItem(k) || '[]').reduce(function (a, x) { return a + (x.qty || 0); }, 0); };
        var n = sum('sm_cart') + sum('sm_gcart');
        document.querySelectorAll('.smh-cart__count').forEach(function (el) { el.textContent = n; el.setAttribute('data-n', n); });
      } catch (e) {}
    }
    badge();
    /* Product pages: "Add to cart" and "Buy now" act on the shared cart right here (no second click on another page). */
    function toast(msg) {
      var t = document.getElementById('sm-static-toast');
      if (!t) { t = document.createElement('div'); t.id = 'sm-static-toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;background:#0B3B20;color:#fff;padding:12px 20px;border-radius:12px;font:600 15px/1.3 system-ui,sans-serif;box-shadow:0 14px 30px -12px rgba(0,0,0,.5);opacity:0;transition:opacity .25s'; document.body.appendChild(t); }
      t.innerHTML = msg; t.style.opacity = '1'; clearTimeout(t.__h); t.__h = setTimeout(function () { t.style.opacity = '0'; }, 3200);
    }
    function productSku() {
      var out = '';
      document.querySelectorAll('script[type="application/ld+json"]').forEach(function (s) {
        try { var j = JSON.parse(s.textContent); (Array.isArray(j) ? j : j['@graph'] || [j]).forEach(function (x) { if (x['@type'] === 'Product' && x.sku) out = String(x.sku); }); } catch (e) {}
      });
      return out;
    }
    function addToSharedCart() {
      var sku = productSku(); if (!sku) return false;
      var cart = []; try { cart = JSON.parse(localStorage.getItem('sm_cart') || '[]'); } catch (e) {}
      var row = cart.filter(function (x) { return x.id === sku; })[0]; if (row) row.qty = (row.qty || 0) + 1; else cart.push({ id: sku, qty: 1 });
      try { localStorage.setItem('sm_cart', JSON.stringify(cart)); } catch (e) { return false; }
      badge(); return true;
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('main a[href*="#/product/"]'); if (!a) return;
      var label = (a.textContent || '').trim().toLowerCase(), isAdd = /^add to cart/.test(label), isBuy = /^buy now/.test(label); if (!isAdd && !isBuy) return;
      if (window.SMWoo && window.SMWoo.active) {   // live domain: the real WooCommerce cart
        var sku = productSku(); if (!sku) return; e.preventDefault();
        if (a.getAttribute('aria-busy')) return; a.setAttribute('aria-busy', 'true');
        window.SMWoo.add(sku, 1).then(function (r) {
          a.removeAttribute('aria-busy');
          if (r.ok) { if (isBuy) location.href = '/checkout/'; else toast('Added to cart. <a href="/cart/" style="color:#FFB347;margin-left:8px">View cart</a>'); }
          else if (r.reason === 'unmapped') toast('This item is ordered on WhatsApp. <a href="' + (document.querySelector('main a.sm-wa-btn') || {}).href + '" target="_blank" rel="noopener" style="color:#FFB347;margin-left:8px">Order on WhatsApp</a>');
          else toast(r.message);
        });
        return;
      }
      if (!addToSharedCart()) return;   // no product data on the page: fall back to the link
      e.preventDefault();
      if (isBuy) location.href = prefix + 'checkout/'; else toast('Added to cart. <a href="' + prefix + 'cart/" style="color:#FFB347;margin-left:8px">View cart</a>');
    });
    var site = document.createElement('script'); site.src = prefix + 'assets/js/site.min.js'; document.body.appendChild(site);
  }).catch(function () { /* the fallback logo header stays */ });
  /* WhatsApp order button on every product and video card */
  var wa = document.createElement('script'); wa.src = prefix + 'assets/js/wa-cards.js'; wa.defer = true; document.head.appendChild(wa);
  /* Country / language / currency window (header "Shopping destination" button) */
  var mk = document.createElement('script'); mk.src = prefix + 'assets/js/market.js'; mk.defer = true; document.head.appendChild(mk);
  var wb = document.createElement('script'); wb.src = prefix + 'assets/js/woo-bridge.js'; wb.defer = true; document.head.appendChild(wb);
  var ay = document.createElement('script'); ay.src = prefix + 'assets/js/a11y.js'; ay.defer = true; document.head.appendChild(ay);
  var mt = document.createElement('script'); mt.src = prefix + 'assets/js/i18n.js'; mt.defer = true; document.head.appendChild(mt);
  /* Contact number by location (Pakistan number for Pakistan visitors) */
  var ct = document.createElement('script'); ct.src = prefix + 'assets/js/contact.js'; ct.defer = true; document.head.appendChild(ct);
})();
