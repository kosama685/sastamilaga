/*
 * Sasta Milaga — progressive enhancement of pre-rendered global category pages.
 * Reads ONLY the product cards already on the page. The supplier source remains
 * authoritative; estimated prices are NOT checkout quotes or availability.
 * No network requests, cookies, local storage, redirects, or schema changes.
 */
(function (root) {
  'use strict';
  function priceNumber(text) {
    var match = String(text || '').match(/(?:US\$|\$)\s*([\d,]+(?:\.\d+)?)/i);
    return match ? Number(match[1].replace(/,/g, '')) : NaN;
  }
  function filterCards(items, options) {
    var q = String(options.q || '').trim().toLocaleLowerCase();
    var min = options.min === '' ? NaN : Number(options.min);
    var max = options.max === '' ? NaN : Number(options.max);
    var selected = items.filter(function (p) {
      if (q && p.title.toLocaleLowerCase().indexOf(q) === -1) return false;
      if (options.video && !p.video) return false;
      if (Number.isFinite(min) && (!Number.isFinite(p.price) || p.price < min)) return false;
      if (Number.isFinite(max) && (!Number.isFinite(p.price) || p.price > max)) return false;
      return true;
    });
    var sort = String(options.sort || 'original');
    if (sort === 'az') selected.sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (sort === 'low') selected.sort(function (a, b) {
      return (Number.isFinite(a.price) ? a.price : Infinity) - (Number.isFinite(b.price) ? b.price : Infinity);
    });
    if (sort === 'high') selected.sort(function (a, b) {
      return (Number.isFinite(b.price) ? b.price : -Infinity) - (Number.isFinite(a.price) ? a.price : -Infinity);
    });
    return selected;
  }
  function init() {
    var aside = document.getElementById('sm-global-facets-v1');
    if (!aside) return;
    var app = document.getElementById('app');
    var grid = app && app.querySelector(':scope > .products-row');
    if (!grid) return;
    grid.classList.add('sm-global-facets-grid');
    var cards = Array.from(grid.querySelectorAll(':scope > .sm-card')).map(function (node, i) {
      var title = node.querySelector('.sm-card__title');
      var price = node.querySelector('.sm-card__price');
      return { node: node, order: i, title: title ? title.textContent.trim() : '',
        price: priceNumber(price ? price.textContent : ''),
        video: !!node.querySelector('.sm-card__badge') && /video/i.test(node.querySelector('.sm-card__badge').textContent) };
    });
    var el = function (id) { return document.getElementById(id); };
    var ids = ['sm-gf-q', 'sm-gf-min', 'sm-gf-max', 'sm-gf-sort', 'sm-gf-video'];
    var count = el('sm-gf-count');
    function draw() {
      var opts = { q: el(ids[0]).value, min: el(ids[1]).value,
        max: el(ids[2]).value, sort: el(ids[3]).value, video: el(ids[4]).checked };
      var list = filterCards(cards, opts);
      var found = new Set(list);
      cards.forEach(function (p) { p.node.hidden = !found.has(p); });
      var ordered = opts.sort === 'original' ? cards.filter(function (p) { return found.has(p); }) : list;
      ordered.forEach(function (p) { grid.appendChild(p.node); });
      count.textContent = list.length + ' of ' + cards.length + ' displayed listings match these filters';
      el('sm-gf-empty').hidden = list.length > 0;
    }
    ids.forEach(function (id) { el(id).addEventListener('input', draw); });
    el('sm-gf-reset').addEventListener('click', function () {
      ids.forEach(function (id) { var x = el(id); if (x.type === 'checkbox') x.checked = false; else x.value = ''; });
      el('sm-gf-sort').value = 'original';
      draw();
    });
    draw();
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { priceNumber: priceNumber, filterCards: filterCards };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : {});
