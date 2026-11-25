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
    var chips=document.createElement('div');chips.className='chip-cloud';chips.setAttribute('role','group');chips.setAttribute('aria-label','Active preview filters');aside.appendChild(chips);
    var full=document.createElement('a');full.className='ghost-btn';full.textContent='Filter the full category by country, stock, brand and model';aside.appendChild(full);
    var scope=document.createElement('p');scope.textContent='This preview filters displayed listings only; open the full category for delivery and verified attributes.';aside.appendChild(scope);
    var category=(location.pathname.match(/\/c\/global\/([a-z0-9-]+)\.html$/)||[])[1];if(!category)full.hidden=true;
    function draw() {
      var opts = { q: el(ids[0]).value, min: el(ids[1]).value,
        max: el(ids[2]).value, sort: el(ids[3]).value, video: el(ids[4]).checked };
      var invalid=(opts.min!==''&&(!Number.isFinite(Number(opts.min))||Number(opts.min)<0))||(opts.max!==''&&(!Number.isFinite(Number(opts.max))||Number(opts.max)<0))||(opts.min!==''&&opts.max!==''&&Number(opts.min)>Number(opts.max));
      var list = invalid?[]:filterCards(cards, opts);
      chips.replaceChildren();
      [['q','Search',ids[0]],['min','Min USD',ids[1]],['max','Max USD',ids[2]],['sort','Sort',ids[3]],['video','Video-labelled',ids[4]]].forEach(function(f){var val=opts[f[0]];if(!val||val==='original')return;var b=document.createElement('button');b.type='button';b.className='ghost-btn';b.textContent=f[1]+(val===true?'':': '+val)+' ×';b.setAttribute('aria-label','Remove '+f[1]);b.onclick=function(){var x=el(f[2]);if(x.type==='checkbox')x.checked=false;else x.value=f[0]==='sort'?'original':'';draw();};chips.appendChild(b);});
      if(category){var params=new URLSearchParams();['q','min','max','sort'].forEach(function(k){if(opts[k]&&opts[k]!=='original')params.set(k,opts[k]);});if(opts.video)params.set('video','1');full.href='../../#/global/c/'+category+(params.toString()?'?'+params:'');}
      var found = new Set(list);
      cards.forEach(function (p) { p.node.hidden = !found.has(p); });
      var ordered = opts.sort === 'original' ? cards.filter(function (p) { return found.has(p); }) : list;
      ordered.forEach(function (p) { grid.appendChild(p.node); });
      count.textContent = invalid?'Enter a valid price range.':list.length + ' of ' + cards.length + ' displayed listings match these filters';
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
