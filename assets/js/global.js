/* ============================================================
   SASTA MILAGA – Global shop (CJ catalogue, 451,812 products)
   Data: data/cj/manifest.js + one shard per category (data/cj/c/<slug>.js),
   loaded on demand. Prices are recorded supplier observations in USD and
   are shown as estimates; stock, options and shipping are confirmed with
   the customer before payment (same flow as sastamilaga.com).
   Routes: #/global, #/global/g/<group>, #/global/c/<cat>, #/global/p/<cat>/<id>,
           #/global/search?q=, #/global/videos
   ============================================================ */
(function () {
  'use strict';
  const A = window.SMApp;
  if (!A) return;
  const { esc, slug, renderApp, setSEO, toast, waLink, pageHead } = A;
  const BASE = 'data/cj/';
  const MARGIN = 1.2;            /* same 20% margin the live store applies to supplier observations */
  const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const shards = new Map();      /* slug -> rows */
  const pending = new Map();
  let manifestP = null;
  let searchToken = 0;

  window.SM_CJ_SHARD = function (s, rows) { shards.set(s, rows); const p = pending.get(s); if (p) { p.resolve(rows); pending.delete(s); } };
  function loadScript(src) {
    return new Promise((res, rej) => { const el = document.createElement('script'); el.src = src; el.async = true; el.onload = res; el.onerror = () => rej(new Error('load ' + src)); document.head.appendChild(el); });
  }
  function manifest() { return manifestP || (manifestP = window.SM_CJ ? Promise.resolve(window.SM_CJ) : loadScript(BASE + 'manifest.js').then(() => window.SM_CJ)); }
  function shard(s) {
    if (shards.has(s)) return Promise.resolve(shards.get(s));
    if (pending.has(s)) return pending.get(s).promise;
    let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; });
    pending.set(s, { promise, resolve, reject });
    loadScript(`${BASE}c/${encodeURIComponent(s)}.js`).catch(e => { pending.delete(s); reject(e); });
    return promise;
  }
  /* row = [id, sku, name, min, max, img, video] */
  const est = r => r[3] ? (r[4] > r[3] ? `${USD.format(r[3] * MARGIN)} – ${USD.format(r[4] * MARGIN)}` : USD.format(r[3] * MARGIN)) : 'Price on request';
  const liveUrl = r => `${A.LIVE_URL}/global-shop/p/${encodeURIComponent(r[0])}/${slug(r[2]).slice(0, 80)}/`;
  const detailHash = (cat, r) => `#/global/p/${cat}/${encodeURIComponent(r[0])}`;
  const fallback = window.fallbackImg || '';

  function card(cat, r) {
    return `<article class="sm-card"><a class="sm-card__media" href="${detailHash(cat, r)}" tabindex="-1" aria-hidden="true"><img src="${esc(r[5])}" alt="${esc(r[2])}" width="480" height="480" loading="lazy" decoding="async" onerror="this.src=window.fallbackImg">${r[6] ? '<span class="sm-card__badge">Video</span>' : ''}</a>
      <div class="sm-card__body"><h3 class="sm-card__title"><a href="${detailHash(cat, r)}">${esc(r[2])}</a></h3><p class="sm-card__price">${est(r)} <small class="sm-est">est.</small></p>
      <div class="smqb-actions"><a class="smqb-opt sm-btn--ghost" href="${detailHash(cat, r)}"><span>View options</span></a></div></div></article>`;
  }
  function globalNote() {
    return `<p class="sm-global-note">Global items ship worldwide from our supplier network. Prices are estimates in US dollars; we confirm stock, options, shipping and the final total with you before you pay.</p>`;
  }

  /* ---------- pages ---------- */
  async function home() {
    const m = await manifest();
    setSEO({ title: 'Global shop – worldwide delivery', description: `Browse ${m.total.toLocaleString()} global products in ${m.cats.length} categories with worldwide delivery. Prices are estimates in USD and confirmed before you pay.`, url: `${A.SITE_URL}/c/global/index.html`,
      ldJson: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'Sasta Milaga Global shop', url: `${A.SITE_URL}/c/global/index.html`,
        mainEntity: { '@type': 'ItemList', numberOfItems: m.groups.length, itemListElement: m.groups.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.n, url: `${A.SITE_URL}/#/global/g/${g.s}` })) } } });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Global shop', `${m.total.toLocaleString()} products in ${m.cats.length} categories, delivered worldwide.`)}
      ${searchBox('')}${globalNote()}
      <ul class="sm-cats sm-cats--global" role="list">${m.groups.map(g => { const c = m.cats.find(x => x.g === g.n); return `<li><a class="sm-cat" href="#/global/g/${g.s}"><span class="sm-cat__img"><img src="${esc(c ? c.img : '')}" alt="${esc(g.n)}" width="300" height="300" loading="lazy" onerror="this.src=window.fallbackImg"></span><span class="sm-cat__name">${esc(g.n)}</span><span class="sm-cat__count">${g.c.toLocaleString()} products</span></a></li>`; }).join('')}</ul>
      <p class="sm-page-actions"><a class="sm-btn sm-btn--ghost" href="#/global/videos">Watch ${m.videos.toLocaleString()} product videos</a></p></section>`);
    bindSearch();
  }
  async function group(gs) {
    const m = await manifest(); const g = m.groups.find(x => x.s === gs); if (!g) return home();
    const cats = m.cats.filter(c => c.g === g.n);
    setSEO({ title: `${g.n} – global shop`, description: `${g.c.toLocaleString()} ${g.n} products in ${cats.length} categories with worldwide delivery from Sasta Milaga.`, url: `${A.SITE_URL}/#/global/g/${gs}` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead(g.n, `${g.c.toLocaleString()} products in ${cats.length} categories.`, ['<a href="#/global">Global shop</a>'])}
      <ul class="sm-cats sm-cats--global" role="list">${cats.map(c => `<li><a class="sm-cat" href="#/global/c/${c.s}"><span class="sm-cat__img"><img src="${esc(c.img)}" alt="${esc(c.n)}" width="300" height="300" loading="lazy" onerror="this.src=window.fallbackImg"></span><span class="sm-cat__name">${esc(c.n)}</span><span class="sm-cat__count">${c.c.toLocaleString()} products</span></a></li>`).join('')}</ul></section>`);
  }
  async function category(cs, qs) {
    const m = await manifest(); const c = m.cats.find(x => x.s === cs); if (!c) return home();
    const g = m.groups.find(x => x.n === c.g);
    setSEO({ title: `${c.n} – buy online with worldwide delivery`, description: `Shop ${c.c.toLocaleString()} ${c.n} products from the Sasta Milaga global shop. Estimated prices from ${USD.format(c.lo * MARGIN)}; final price confirmed before payment.`, url: `${A.SITE_URL}/c/global/${cs}.html` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead(c.n, `${c.c.toLocaleString()} products${c.v ? ` · ${c.v.toLocaleString()} with video` : ''}.`, ['<a href="#/global">Global shop</a>', g ? `<a href="#/global/g/${g.s}">${esc(g.n)}</a>` : ''].filter(Boolean))}
      ${globalNote()}
      <div class="sm-gfilters" role="search"><label><span>Search in ${esc(c.n)}</span><input id="gq" type="search" placeholder="Name or SKU"></label>
        <label><span>Max price (USD)</span><input id="gmax" type="number" min="0" inputmode="decimal"></label>
        <label><span>Sort by</span><select id="gsort"><option value="">Recommended</option><option value="low">Lowest price</option><option value="high">Highest price</option><option value="az">Name A–Z</option></select></label>
        <label class="sm-gcheck"><input id="gvid" type="checkbox"> With video</label></div>
      <p id="gcount" class="sm-gcount" role="status" aria-live="polite">Loading products…</p><div id="ggrid" class="products-row"></div>
      <div class="load-more-wrap"><button type="button" class="ghost-btn" id="gmore" hidden>Load more products</button></div></section>`);
    let rows;
    try { rows = await shard(cs); } catch (e) { document.getElementById('gcount').textContent = 'This category could not be loaded. Check your connection and reload the page.'; return; }
    let limit = 60;
    const q0 = new URLSearchParams(qs || '').get('q') || ''; const gq = document.getElementById('gq'); gq.value = q0;
    const draw = () => {
      const q = gq.value.trim().toLowerCase(), max = parseFloat(document.getElementById('gmax').value) || 0, vid = document.getElementById('gvid').checked, sort = document.getElementById('gsort').value;
      let list = rows.filter(r => (!q || r[2].toLowerCase().includes(q) || r[1].toLowerCase().includes(q)) && (!max || r[3] * MARGIN <= max) && (!vid || r[6]));
      if (sort === 'low') list = list.slice().sort((a, b) => a[3] - b[3]); else if (sort === 'high') list = list.slice().sort((a, b) => b[4] - a[4]); else if (sort === 'az') list = list.slice().sort((a, b) => a[2].localeCompare(b[2]));
      document.getElementById('gcount').textContent = `${list.length.toLocaleString()} matching products`;
      document.getElementById('ggrid').innerHTML = list.slice(0, limit).map(r => card(cs, r)).join('');
      document.getElementById('gmore').hidden = list.length <= limit;
    };
    ['gq', 'gmax', 'gsort', 'gvid'].forEach(id => document.getElementById(id).addEventListener('input', () => { limit = 60; draw(); }));
    document.getElementById('gmore').onclick = () => { limit += 60; draw(); };
    draw();
  }
  async function product(cs, id) {
    const m = await manifest(); const c = m.cats.find(x => x.s === cs);
    let rows = []; try { rows = await shard(cs); } catch (e) { }
    const r = rows.find(x => x[0] === id);
    if (!r || !c) { renderApp(`<section class="sm-page">${pageHead('Product not found', 'This global product is not in the current catalogue. Try searching for it.')}${searchBox('')}</section>`); bindSearch(); return; }
    const g = m.groups.find(x => x.n === c.g);
    setSEO({ title: `${r[2]} – ${c.n}`, description: `${r[2]} from the Sasta Milaga global shop (${c.n}). Estimated price ${est(r)}; stock, options and shipping are confirmed before you pay.`, image: r[5], url: liveUrl(r),
      ldJson: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'Product', name: r[2], sku: r[1], image: [r[5]], category: c.n, brand: { '@type': 'Brand', name: 'Sasta Milaga' }, url: liveUrl(r),
          ...(r[6] ? { subjectOf: { '@type': 'VideoObject', name: r[2], description: `${r[2]} product video`, thumbnailUrl: r[5], contentUrl: r[6], uploadDate: m.snapshot } } : {}) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${A.SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Global shop', item: `${A.SITE_URL}/c/global/index.html` }, { '@type': 'ListItem', position: 3, name: c.n, item: `${A.SITE_URL}/c/global/${cs}.html` }, { '@type': 'ListItem', position: 4, name: r[2] }] }] } });
    const related = rows.filter(x => x !== r).slice(0, 8);
    renderApp(`<nav class="sm-crumbs" aria-label="Breadcrumb"><a href="./">Home</a> <span aria-hidden="true">/</span> <a href="#/global">Global shop</a>${g ? ` <span aria-hidden="true">/</span> <a href="#/global/g/${g.s}">${esc(g.n)}</a>` : ''} <span aria-hidden="true">/</span> <a href="#/global/c/${cs}">${esc(c.n)}</a></nav>
      <section class="pdp" aria-label="Product detail"><div><div class="gallery-panel"><div class="gallery-main">${r[6] ? `<video src="${esc(r[6])}" poster="${esc(r[5])}" controls playsinline preload="none"></video>` : `<img src="${esc(r[5])}" alt="${esc(r[2])}" width="800" height="800" onerror="this.src=window.fallbackImg">`}</div>
        ${r[6] ? `<div class="gallery-thumbs"><button type="button" data-gallery="${esc(r[5])}" data-type="img" aria-label="Show image"><img src="${esc(r[5])}" alt=""></button><button type="button" class="active" data-gallery="${esc(r[6])}" data-type="video" aria-label="Play video"><img src="${esc(r[5])}" alt=""></button></div>` : ''}</div></div>
      <aside class="buy-panel" aria-label="Order options"><span class="eyebrow">${esc(c.n)}</span><h1>${esc(r[2])}</h1><p class="product-meta">SKU: ${esc(r[1])} · Global item</p>
        <div style="margin:12px 0"><span class="big-price">${est(r)}</span> <small class="sm-est">estimated</small></div>
        <form class="sm-greq" id="greq"><label><span>Quantity</span><input type="number" name="qty" min="1" max="99" value="1"></label><label><span>Size, colour or option (optional)</span><input name="opt" maxlength="120" placeholder="e.g. Blue, size M"></label><label><span>Deliver to (country and city)</span><input name="to" required maxlength="120" placeholder="e.g. Pakistan, Karachi"></label>
          ${shipBox()}
          <button type="submit" class="sm-wa-btn">Request this item on WhatsApp</button></form>
        <ul class="sm-buy-facts" role="list"><li>We confirm stock, options and shipping first</li><li>Pay by card or PayPal link after confirmation</li><li>Delivery time depends on your country</li></ul>
        <p class="product-meta"><a href="${esc(liveUrl(r))}" rel="noopener">View this product on sastamilaga.com</a></p></aside></section>
      <section class="section"><div class="section-head"><div><h2>More in ${esc(c.n)}</h2></div><a class="ghost-btn" href="#/global/c/${cs}">View all</a></div><div class="products-row">${related.map(x => card(cs, x)).join('')}</div></section>`);
    bindShip(r);
    document.getElementById('greq').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target;
      const ship = f.ship && f.ship.value ? `Shipping chosen: ${f.ship.value}\n` : '';
      const msg = `Assalam o Alaikum! I want to order a global item:\n${r[2]}\nSKU: ${r[1]}\nQuantity: ${f.qty.value}\n${f.opt.value ? 'Option: ' + f.opt.value + '\n' : ''}Deliver to: ${f.to.value}\nEstimated price: ${est(r)}\n${ship}${liveUrl(r)}\nPlease confirm stock, shipping and the final total.`;
      window.open(waLink(msg), '_blank', 'noopener'); toast('Opening WhatsApp with your request');
    });
  }
  /* Live CJ shipping quote (workers/cj-shipping). Shown only when SM_CONFIG.cjShippingWorker is set. */
  function shipBox() {
    if (!(window.SM_CONFIG || {}).cjShippingWorker) return '';
    let names; try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { names = null; }
    const codes = 'AF AL DZ AR AM AU AT AZ BH BD BY BE BR BG CA CL CN CO HR CY CZ DK EG EE FI FR GE DE GH GR HK HU IN ID IQ IE IL IT JP JO KZ KE KW KG LV LB LT LU MY MV MT MX MA NP NL NZ NG NO OM PK PS PH PL PT QA RO RU SA RS SG SK SI ZA KR ES LK SE CH TW TJ TH TN TR TM UA AE GB US UZ VN YE'.split(' ');
    const opts = codes.map(c => [c, names ? names.of(c) : c]).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => `<option value="${c}"${c === 'PK' ? ' selected' : ''}>${esc(n)}</option>`).join('');
    return `<fieldset class="sm-ship"><legend>Shipping cost</legend><div class="sm-ship__row"><label class="screen-reader-text" for="gship-cc">Ship to country</label><select id="gship-cc">${opts}</select><button type="button" class="sm-btn sm-btn--ghost" id="gship-go">Get shipping cost</button></div>
      <div id="gship-out" class="sm-ship__out" role="status" aria-live="polite"></div></fieldset>`;
  }
  function bindShip(r) {
    const go = document.getElementById('gship-go'); if (!go) return;
    const out = document.getElementById('gship-out'), W = window.SM_CONFIG.cjShippingWorker.replace(/\/$/, '');
    go.addEventListener('click', async () => {
      const cc = document.getElementById('gship-cc').value, qty = Number(document.querySelector('#greq [name="qty"]').value) || 1;
      go.disabled = true; out.textContent = 'Getting shipping options from the supplier…';
      try {
        const res = await fetch(W + '/api/cj/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: cc, items: [{ pid: r[0], sku: r[1], qty }] }) });
        const d = await res.json();
        if (!res.ok || !d.methods || !d.methods.length) { out.textContent = (d && d.error ? d.error + '. ' : '') + 'We will confirm shipping on WhatsApp.'; return; }
        out.innerHTML = d.methods.slice(0, 6).map((m, i) => `<label class="sm-ship__opt"><input type="radio" name="ship" value="${esc(`${m.name}: ${USD.format(m.price)}, ${m.days} days`)}"${i ? '' : ' checked'}> <span>${esc(m.name)}</span> <b>${USD.format(m.price)}</b> <small>${esc(m.days)} days</small></label>`).join('') + '<p class="sm-ship__note">Supplier shipping price in US$ for this quantity, before any customs duties.</p>';
      } catch (e) { out.textContent = 'Shipping prices are not available right now. We will confirm shipping on WhatsApp.'; }
      finally { go.disabled = false; }
    });
  }
  function searchBox(q) {
    return `<form class="sm-gsearch" id="gsearch" role="search"><label class="screen-reader-text" for="gsq">Search global products</label><input id="gsq" type="search" value="${esc(q)}" placeholder="Search all global products" required><button type="submit" class="sm-btn">Search</button></form>`;
  }
  function bindSearch() {
    const f = document.getElementById('gsearch');
    if (f) f.addEventListener('submit', e => { e.preventDefault(); location.hash = '#/global/search?q=' + encodeURIComponent(document.getElementById('gsq').value.trim()); });
  }
  /* Search every category: likely categories first, results stream in, stops at 120 unless asked for more. */
  async function search(qs) {
    const q = (new URLSearchParams(qs || '').get('q') || '').trim();
    const m = await manifest(); const token = ++searchToken;
    setSEO({ title: q ? `"${q}" in the global shop` : 'Search the global shop', description: `Search ${m.total.toLocaleString()} global products at Sasta Milaga.`, url: `${A.SITE_URL}/#/global/search` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead(q ? `Global results for "${q}"` : 'Search the global shop', '', ['<a href="#/global">Global shop</a>'])}${searchBox(q)}
      <p id="gstat" class="sm-gcount" role="status" aria-live="polite"></p><div class="sm-progress" aria-hidden="true"><span id="gbar"></span></div><div id="ggrid" class="products-row"></div>
      <div class="load-more-wrap"><button type="button" class="ghost-btn" id="gmore" hidden>Keep searching</button></div></section>`);
    bindSearch();
    if (!q) { document.getElementById('gstat').textContent = 'Type a product name or SKU.'; return; }
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const score = c => words.reduce((a, w) => a + (c.n.toLowerCase().includes(w) ? 2 : 0) + (c.g.toLowerCase().includes(w) ? 1 : 0), 0);
    const order = m.cats.slice().sort((a, b) => score(b) - score(a) || b.c - a.c);
    let found = 0, i = 0, cap = 120, scanned = 0;
    const grid = document.getElementById('ggrid'), stat = document.getElementById('gstat'), bar = document.getElementById('gbar'), more = document.getElementById('gmore');
    const run = async () => {
      more.hidden = true;
      while (i < order.length && found < cap) {
        if (token !== searchToken || !document.body.contains(grid)) return;
        const c = order[i++]; let rows;
        try { rows = await shard(c.s); } catch (e) { continue; }
        scanned += c.c;
        const hits = rows.filter(r => { const n = (r[2] + ' ' + r[1]).toLowerCase(); return words.every(w => n.includes(w)); }).slice(0, cap - found);
        if (hits.length) { grid.insertAdjacentHTML('beforeend', hits.map(r => card(c.s, r)).join('')); found += hits.length; }
        stat.textContent = `${found.toLocaleString()} results · searched ${scanned.toLocaleString()} of ${m.total.toLocaleString()} products`;
        bar.style.transform = `scaleX(${scanned / m.total})`;
      }
      if (i < order.length) { more.hidden = false; more.onclick = () => { cap += 120; run(); }; }
      else stat.textContent = `${found.toLocaleString()} results in all ${m.total.toLocaleString()} global products`;
    };
    run();
  }
  async function videos() {
    const m = await manifest();
    setSEO({ title: 'Global product videos', description: `Watch ${m.videos.toLocaleString()} global product videos before you order from Sasta Milaga.`, url: `${A.SITE_URL}/#/global/videos` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Global product videos', `${m.videos.toLocaleString()} products with a video.`, ['<a href="#/global">Global shop</a>'])}<p id="gcount" class="sm-gcount">Loading videos…</p><ul class="smhv-rail smhv-rail--grid" role="list" id="gvids"></ul><div class="load-more-wrap"><button type="button" class="ghost-btn" id="gmore" hidden>Load more videos</button></div></section>`);
    if (!window.SM_CJ_VIDEOS) { try { await loadScript(BASE + 'videos.js'); } catch (e) { document.getElementById('gcount').textContent = 'Videos could not be loaded. Reload the page to try again.'; return; } }
    let limit = 48; const all = window.SM_CJ_VIDEOS;
    const draw = () => {
      document.getElementById('gcount').textContent = `${all.length.toLocaleString()} videos`;
      document.getElementById('gvids').innerHTML = all.slice(0, limit).map(v => `<li class="smhv-card"><a href="#/global/p/${v[1]}/${encodeURIComponent(v[0])}" class="smhv-link"><span class="smhv-media"><img src="${esc(v[5])}" alt="${esc(v[2])}" width="420" height="420" loading="lazy" onerror="this.src=window.fallbackImg"><span class="smhv-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></span><span class="smhv-body"><span class="smhv-name">${esc(v[2])}</span><span class="smhv-price">${est([0, 0, 0, v[3], v[4]])}</span></span></a></li>`).join('');
      document.getElementById('gmore').hidden = all.length <= limit;
    };
    document.getElementById('gmore').onclick = () => { limit += 48; draw(); };
    draw();
  }

  /* Every global product, page by page (60 per page) in manifest category order. A page loads only the 1–2 category
     files that contain it, so all 451,812 products are reachable without downloading the whole catalogue. */
  async function all(qs) {
    const m = await manifest(), PER = 60, pages = Math.ceil(m.total / PER);
    const page = Math.min(pages, Math.max(1, parseInt(new URLSearchParams(qs || '').get('page'), 10) || 1));
    setSEO({ title: `All ${m.total.toLocaleString()} global products${page > 1 ? ` – page ${page}` : ''}`, description: `Browse all ${m.total.toLocaleString()} global products in ${m.cats.length} categories with worldwide delivery. Prices are US$ estimates confirmed before you pay.`, url: `${A.SITE_URL}/#/global/all${page > 1 ? '?page=' + page : ''}` });
    const sw = window.SMCatalogueSwitch ? window.SMCatalogueSwitch('global') : '';
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('All global products', `${m.total.toLocaleString()} products in ${m.cats.length} categories, from ${m.csvFiles || 452} supplier files. Page ${page.toLocaleString()} of ${pages.toLocaleString()}.`, ['<a href="#/global">Global shop</a>'])}
      ${sw}${globalNote()}<p id="gcount" class="sm-gcount" role="status">Loading products…</p><div id="ggrid" class="products-row"></div>
      <nav class="sm-gpager" aria-label="Pages">${pager(page, pages)}</nav></section>`);
    let start = (page - 1) * PER, need = PER; const out = []; let acc = 0;
    for (const c of m.cats) {
      if (need <= 0) break;
      if (start >= acc + c.c) { acc += c.c; continue; }
      const rows = await shard(c.s), from = Math.max(0, start - acc), take = rows.slice(from, from + need);
      take.forEach(r => out.push([c.s, r])); need -= take.length; start += take.length; acc += c.c;
    }
    const first = (page - 1) * PER + 1;
    document.getElementById('gcount').textContent = `Showing ${first.toLocaleString()}–${(first + out.length - 1).toLocaleString()} of ${m.total.toLocaleString()} global products`;
    document.getElementById('ggrid').innerHTML = out.map(([s, r]) => card(s, r)).join('');
    const jump = document.getElementById('gjump');
    if (jump) jump.addEventListener('submit', e => { e.preventDefault(); const n = Math.min(pages, Math.max(1, parseInt(e.target.p.value, 10) || 1)); location.hash = `#/global/all?page=${n}`; });
    window.scrollTo(0, 0);
  }
  function pager(page, pages) {
    const link = (n, label, rel) => `<a href="#/global/all?page=${n}"${rel ? ` rel="${rel}"` : ''}${n === page ? ' aria-current="page" class="is-on"' : ''}>${label}</a>`;
    const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter(n => n >= 1 && n <= pages).sort((a, b) => a - b);
    let html = page > 1 ? link(page - 1, '‹ Previous', 'prev') : '';
    nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) html += '<span aria-hidden="true">…</span>'; html += link(n, n.toLocaleString()); });
    if (page < pages) html += link(page + 1, 'Next ›', 'next');
    return html + `<form id="gjump" class="sm-gpager__jump"><label for="gjump-p">Go to page</label><input id="gjump-p" name="p" type="number" min="1" max="${pages}" value="${page}"><button type="submit" class="sm-btn sm-btn--ghost">Go</button></form>`;
  }

  window.SMGlobal = {
    route(parts, qs) {
      searchToken++;
      const [a, b, c] = parts;
      if (a === 'g' && b) return group(b);
      if (a === 'c' && b) return category(b, qs);
      if (a === 'p' && b && c) return product(b, decodeURIComponent(c));
      if (a === 'search') return search(qs);
      if (a === 'videos') return videos();
      if (a === 'all') return all(qs);
      return home();
    },
    manifest
  };
  /* app.js routed before this file loaded: render the global page now */
  if (/^#\/global(\/|\?|$)/.test(location.hash) || /^global(\/|$)/.test((A.cleanRoute && A.cleanRoute(location.pathname)) || '')) A.route();
})();
