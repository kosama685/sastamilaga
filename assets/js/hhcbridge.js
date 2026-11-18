/* Sasta Milaga — HHC public storefront media bridge.
 * Uses only public WordPress REST reads. No supplier API secrets, writes,
 * synthetic inventory, price changes, or fabricated product photography.
 */
(function () {
  'use strict';
  if (window.SM_HHCBridge) return;
  var BASE = (document.currentScript && document.currentScript.src || location.origin + '/assets/js/hhcbridge.js')
    .replace(/assets\/js\/hhcbridge\.js(?:\?.*)?$/, '');
  var requests = new Map();
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" rx="15" fill="#F4F8F5"/><g fill="none" stroke="#6B8475" stroke-width="7"><rect x="85" y="100" width="150" height="120" rx="9"/><circle cx="131" cy="140" r="12"/><path d="m100 203 46-44 31 27 27-20 20 37"/></g><text x="160" y="259" font-family="Arial,sans-serif" font-size="15" text-anchor="middle" fill="#375847">Image unavailable</text></svg>'
  );
  function terms(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/)
      .filter(function (w) { return w.length > 2 && !/^(the|and|for|with|from|suit|product|women|men)$/.test(w); }).slice(0, 6);
  }
  function findLocalImage(title) {
    var ws = terms(title);
    if (ws.length < 2) return Promise.resolve('');
    var query = ws.slice(0, 3).join(' ');
    if (requests.has(query)) return requests.get(query);
    var u = BASE + 'wp-json/wp/v2/media?media_type=image&per_page=15&search=' + encodeURIComponent(query);
    var task = fetch(u, { credentials: 'omit', headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw Error('media lookup failed'); return r.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows)) return '';
        var best = rows.find(function (m) {
          var name = ((m.title && m.title.rendered) || '') + ' ' + (m.slug || '');
          var lower = name.toLowerCase();
          return ws.slice(0, 3).every(function (w) { return lower.indexOf(w) >= 0; })
            && m.source_url && /^https:\/\//.test(m.source_url);
        });
        return best ? best.source_url : '';
      }).catch(function () { return ''; });
    requests.set(query, task);
    return task;
  }
  function verifyImage(url) {
    return new Promise(function (ok) {
      if (!url) { ok(false); return; }
      var probe = new Image(), done = false;
      var t = setTimeout(function () { if (!done) { done = true; probe.src = ''; ok(false); } }, 5000);
      probe.onload = function () { if (!done) { done = true; clearTimeout(t); ok(true); } };
      probe.onerror = function () { if (!done) { done = true; clearTimeout(t); ok(false); } };
      probe.src = url;
    });
  }
  function fallback(img) {
    if (!img || img.dataset.hhcRepairing || (img.src || '').startsWith('data:')) return;
    var parent = img.closest('.smss a, .gallery-main, .gallery-thumbs, .sm-static-thumbs, .sm-card, .sm-product, .gallery-panel');
    if (!parent) return;
    img.dataset.hhcRepairing = '1';
    var link = img.closest('.smss a, .sm-card a, a[href*="/p/"]');
    var title = link ? (link.textContent || '').trim() : (img.getAttribute('alt') || document.querySelector('h1')?.textContent || '');
    findLocalImage(title).then(verifyImage).then(function (found) {
      // Resolve a suitable same-name WordPress image, or use an honest neutral placeholder.
      // The lookup is repeated only from our cached promise and the test image is not rendered.
      if (!found) { img.src = PLACEHOLDER; img.alt = 'Product image unavailable'; return; }
      return findLocalImage(title).then(function (url) { img.src = url || PLACEHOLDER; });
    }).catch(function () { img.src = PLACEHOLDER; });
  }
  document.addEventListener('error', function (e) {
    if (e.target instanceof HTMLImageElement) fallback(e.target);
  }, true);
  window.SM_HHCBridge = { findLocalImage: findLocalImage, placeholder: PLACEHOLDER, version: '20261118-1' };
})();