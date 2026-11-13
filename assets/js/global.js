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
  const MARGIN = 1.2;
  /* Supplier names are never shown to customers: SKU prefix and shipping method brand are masked in visible text.
     The order message to our own team keeps the full SKU and method name. */
  const maskSku = s => String(s || '').replace(/^CJ/i, 'SM-');
  const neutral = s => String(s || '').replace(/\bCJ\s*Packet\b/gi, 'Packet').replace(/\bCJ\s*/gi, '');            /* same 20% margin the live store applies to supplier observations */
  const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const shards = new Map();      /* slug -> rows */
  const pending = new Map();
  let manifestP = null;
  let searchToken = 0;

  const prevShard = window.SM_CJ_SHARD;
  window.SM_CJ_SHARD = function (s, rows) { shards.set(s, rows); const p = pending.get(s); if (p) { p.resolve(rows); pending.delete(s); } if (prevShard) prevShard(s, rows); };
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
  /* ---------- Global cart: prepaid global items, ordered through WhatsApp with the shipping confirmed before payment ---------- */
  const GC_KEY = 'sm_gcart', GC_TO = 'sm_gto';
  const gcGet = () => { try { return JSON.parse(localStorage.getItem(GC_KEY) || '[]'); } catch (e) { return []; } };
  const gcSet = l => { try { localStorage.setItem(GC_KEY, JSON.stringify(l)); } catch (e) { } try { A.setCart(A.getCart()); } catch (e) { } };   // setCart refreshes the header count
  const gcKey = x => [x.id, x.opt || '', x.vkey || ''].join('|');
  const gcCount = () => gcGet().reduce((a, x) => a + (x.qty || 0), 0);
  const gcAdd = row => { const l = gcGet(), k = gcKey(row), f = l.find(x => gcKey(x) === k); if (f) f.qty = Math.min(99, f.qty + row.qty); else l.push(row); gcSet(l); };
  const gcSaved = k => { try { return localStorage.getItem('sm_gc_' + k) || ''; } catch (e) { return ''; } };
  const gcTo = () => { try { const s = localStorage.getItem(GC_TO); if (s) return s; } catch (e) { } const mk = window.SMMarket; try { return mk ? mk.countryName(mk.state().country) : ''; } catch (e) { return ''; } };
  function gcHtml() {
    const l = gcGet(); if (!l.length) return '';
    const sub = l.reduce((a, x) => a + x.unit * x.qty, 0);
    const lines = l.map(x => `<div class="cart-line"><img src="${esc(x.img)}" alt="${esc(x.name)}" width="88" height="88" onerror="this.src=window.fallbackImg"><div><b>${esc(x.name)}</b><p style="color:var(--muted);margin:4px 0">${x.vname ? esc(x.vname) + ' · ' : ''}${x.opt ? esc(x.opt) + ' · ' : ''}Global item${x.ship ? '<br>Shipping: ' + esc(x.ship) : ''}</p><div class="price">${USD.format(x.unit)} <small class="sm-est">estimated each</small></div></div><div><div class="qty"><button type="button" data-gc="dec" data-k="${esc(gcKey(x))}" aria-label="Decrease">−</button><b>${x.qty}</b><button type="button" data-gc="inc" data-k="${esc(gcKey(x))}" aria-label="Increase">+</button></div><button type="button" class="ghost-btn" data-gc="rm" data-k="${esc(gcKey(x))}" style="margin-top:8px">Remove</button></div></div>`).join('');
    return `<section class="section sm-gcart" aria-labelledby="gcart-h"><div class="section-head"><div><h2 id="gcart-h">Global items</h2><p>Prepaid. Stock, options and shipping to your country are confirmed with you before you pay.</p></div></div>
      <div class="cart-layout"><div>${lines}</div><aside class="summary-box"><h2 style="margin:0 0 14px">Global order</h2><div class="summary-row"><span>Items (estimated)</span><b>${USD.format(sub)}</b></div><div class="summary-row"><span>Shipping</span><b>Confirmed on WhatsApp</b></div>
        <div class="sm-gcart__form" role="group" aria-label="Delivery details">
          <label class="sm-gcart__to"><span>Full name</span><input id="gcName" maxlength="80" autocomplete="name" value="${esc(gcSaved('name'))}" required></label>
          <label class="sm-gcart__to"><span>Phone / WhatsApp number</span><input id="gcPhone" type="tel" maxlength="30" autocomplete="tel" value="${esc(gcSaved('phone'))}" placeholder="e.g. +92 300 1234567" required></label>
          <label class="sm-gcart__to"><span>Email (optional)</span><input id="gcEmail" type="email" maxlength="100" autocomplete="email" value="${esc(gcSaved('email'))}"></label>
          <label class="sm-gcart__to"><span>Deliver to (country and city)</span><input id="gcTo" maxlength="120" autocomplete="country-name" value="${esc(gcTo())}" placeholder="e.g. Pakistan, Karachi" required></label>
          <label class="sm-gcart__to"><span>Street address</span><textarea id="gcAddr" maxlength="300" rows="2" autocomplete="street-address" required>${esc(gcSaved('addr'))}</textarea></label></div>
        <a class="primary-btn" href="#/checkout" style="width:100%;margin-top:12px;display:flex;justify-content:center">Proceed to checkout</a><button type="button" class="ghost-btn" data-gc="order" style="width:100%;margin-top:12px">Place global order on WhatsApp</button><button type="button" class="ghost-btn" data-gc="clear" style="width:100%;margin-top:8px">Clear global items</button>
        <p class="product-meta" style="margin-top:10px">Prices are estimates in US dollars. We send the final total, including shipping, before you pay by card or PayPal link.</p></aside></div></section>`;
  }
  function gcMessage(l, to) {
    const sub = l.reduce((a, x) => a + x.unit * x.qty, 0);
    return `Assalam o Alaikum! I want to order these global items (prepaid):\n\n${l.map((x, i) => `${i + 1}. ${x.name}\n   SKU: ${x.sku}${x.vname ? '\n   Variant: ' + x.vname : ''}${x.opt ? '\n   Notes: ' + x.opt : ''}${x.ship ? '\n   Shipping chosen: ' + x.ship : ''}\n   Quantity: ${x.qty}\n   Estimated: ${USD.format(x.unit)} each\n   ${x.url}`).join('\n\n')}\n\nItems total (estimated): ${USD.format(sub)}\nDeliver to: ${to}\nPlease confirm stock, shipping and the final total.`;
  }
  let gcBound = false;
  function gcBind() {
    if (gcBound) return; gcBound = true;
    document.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-gc]'); if (!b) return; const act = b.getAttribute('data-gc'), k = b.getAttribute('data-k'); let l = gcGet();
      if (act === 'inc' || act === 'dec') { l = l.map(x => gcKey(x) === k ? { ...x, qty: Math.max(1, Math.min(99, x.qty + (act === 'inc' ? 1 : -1))) } : x); gcSet(l); A.route(); }
      else if (act === 'rm') { gcSet(l.filter(x => gcKey(x) !== k)); A.route(); }
      else if (act === 'clear') { gcSet([]); A.route(); }
      else if (act === 'order') {
        const v = id => ((document.getElementById(id) || {}).value || '').trim(), need = [['gcName', 'your name'], ['gcPhone', 'your phone number'], ['gcTo', 'the country and city to deliver to'], ['gcAddr', 'your street address']];
        for (const [id, label] of need) if (!v(id)) { toast('Enter ' + label); const i = document.getElementById(id); if (i) i.focus(); return; }
        const em = v('gcEmail'); if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Check your email address'); document.getElementById('gcEmail').focus(); return; }
        if (v('gcPhone').replace(/\D/g, '').length < 7) { toast('Enter a valid phone number'); document.getElementById('gcPhone').focus(); return; }
        const to = v('gcTo'); try { localStorage.setItem(GC_TO, to); localStorage.setItem('sm_gc_name', v('gcName')); localStorage.setItem('sm_gc_phone', v('gcPhone')); localStorage.setItem('sm_gc_email', em); localStorage.setItem('sm_gc_addr', v('gcAddr')); } catch (er) { }
        const who = `Customer: ${v('gcName')}\nPhone: ${v('gcPhone')}${em ? '\nEmail: ' + em : ''}\nAddress: ${v('gcAddr')}\n\n`;
        window.open(waLink(who + gcMessage(l, to)), '_blank', 'noopener'); toast('Opening WhatsApp with your global order');
      }
    });
  }
  /* Gallery switcher for the global product page (the app's own switcher only knows its local product page): thumbnails swap the main slot between the photo and the video. */
  document.addEventListener('click', e => {
    const tb = e.target.closest && e.target.closest('.pdp .gallery-thumbs button[data-gallery]'); if (!tb) return;
    const main = document.querySelector('.pdp .gallery-main'); if (!main) return; const u = tb.dataset.gallery, poster = (document.querySelector('.pdp .gallery-thumbs button[data-type="img"]:not(.sm-var-thumb) img') || {}).src || '';
    main.innerHTML = tb.dataset.type === 'video' ? `<video src="${esc(u)}" poster="${esc(poster)}" controls playsinline preload="metadata"></video>` : `<img src="${esc(u)}" alt="" width="800" height="800">`;
    document.querySelectorAll('.pdp .gallery-thumbs button').forEach(x => x.classList.toggle('active', x === tb));
  });
  window.SMGCart = { count: gcCount, html: gcHtml, bind: gcBind, get: gcGet, fmt: n => USD.format(n), clear: () => gcSet([]) };
  gcBind();
  // global.js loads after the first route has rendered: refresh the header count, and the cart page if it is the page being shown
  if (gcCount()) { try { A.setCart(A.getCart()); } catch (e) { } if (/(^|\/)(cart|checkout)\/?$/.test(location.pathname) || /^#\/(cart|checkout)/.test(location.hash)) setTimeout(() => A.route(), 0); }
  const est = r => r[3] ? (r[4] > r[3] ? `${USD.format(r[3] * MARGIN)} – ${USD.format(r[4] * MARGIN)}` : USD.format(r[3] * MARGIN)) : 'Price on request';
  const liveUrl = r => `${A.LIVE_URL}/global-shop/p/${encodeURIComponent(r[0])}/${slug(r[2]).slice(0, 80)}/`;
  const detailHash = (cat, r) => `#/global/p/${cat}/${encodeURIComponent(r[0])}`;
  const ownUrl = (cat, r) => `${A.SITE_URL}/global/p/${cat}/${encodeURIComponent(r[0])}`;   /* link that works for the customer (the WordPress copy is not reliable) */
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
    setSEO({ title: `${r[2]} – ${c.n}`, description: `${r[2]} from the Sasta Milaga global shop (${c.n}). Estimated price ${est(r)}; stock, options and shipping are confirmed before you pay.`, image: r[5],
      // These product views are rendered in the browser (no page of their own on GitHub Pages), so they are not indexed:
      // canonical points to the real static category page that lists them. Real product pages need workers/product-pages.
      url: `${A.SITE_URL}/c/global/${cs}.html`, robots: 'noindex, follow',
      ldJson: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'Product', name: r[2], sku: maskSku(r[1]), image: [r[5]], category: c.n, brand: { '@type': 'Brand', name: 'Sasta Milaga' }, url: ownUrl(cs, r),
          ...(r[6] ? { subjectOf: { '@type': 'VideoObject', name: r[2], description: `${r[2]} product video`, thumbnailUrl: r[5], contentUrl: r[6], uploadDate: m.snapshot } } : {}) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${A.SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Global shop', item: `${A.SITE_URL}/c/global/index.html` }, { '@type': 'ListItem', position: 3, name: c.n, item: `${A.SITE_URL}/c/global/${cs}.html` }, { '@type': 'ListItem', position: 4, name: r[2] }] }] } });
    const related = rows.filter(x => x !== r).slice(0, 8);
    renderApp(`<nav class="sm-crumbs" aria-label="Breadcrumb"><a href="./">Home</a> <span aria-hidden="true">/</span> <a href="#/global">Global shop</a>${g ? ` <span aria-hidden="true">/</span> <a href="#/global/g/${g.s}">${esc(g.n)}</a>` : ''} <span aria-hidden="true">/</span> <a href="#/global/c/${cs}">${esc(c.n)}</a></nav>
      <section class="pdp pdp3" aria-label="Product detail"><div class="gallery-panel"><div class="gallery-main">${r[6] ? `<video src="${esc(r[6])}" poster="${esc(r[5])}" controls playsinline preload="none"></video>` : `<img src="${esc(r[5])}" alt="${esc(r[2])}" width="800" height="800" onerror="this.src=window.fallbackImg">`}</div>
        ${r[6] ? `<div class="gallery-thumbs"><button type="button" data-gallery="${esc(r[5])}" data-type="img" aria-label="Show image"><img src="${esc(r[5])}" alt=""></button><button type="button" class="active" data-gallery="${esc(r[6])}" data-type="video" aria-label="Play video"><img src="${esc(r[5])}" alt=""></button></div>` : ''}</div>
      <aside class="buy-panel" aria-label="Order options"><span class="eyebrow">${esc(c.n)}</span><h1>${esc(r[2])}</h1><p class="product-meta">SKU: ${esc(maskSku(r[1]))} · Global item</p>
        <div style="margin:12px 0"><span class="big-price">${est(r)}</span> <small class="sm-est">estimated</small></div>
        <form class="sm-greq" id="greq">${varBox()}<label><span>Quantity</span><input type="number" name="qty" min="1" max="99" value="1"></label><label><span>${(window.SM_CONFIG || {}).cjShippingWorker || (window.SM_CONFIG || {}).wpApi ? 'Notes (optional)' : 'Size, colour or option (optional)'}</span><input name="opt" maxlength="120" placeholder="${(window.SM_CONFIG || {}).cjShippingWorker || (window.SM_CONFIG || {}).wpApi ? 'Anything we should know' : 'e.g. Blue, size M'}"></label><label><span>Deliver to (country and city)</span><input name="to" required maxlength="120" value="${esc(gcTo())}" placeholder="e.g. Pakistan, Karachi"></label>
          <div class="sm-total" id="gtotal" role="status" aria-live="polite"></div>
          <div class="sm-gactions"><button type="button" class="primary-btn" id="gadd">Add to cart</button><button type="button" class="primary-btn sm-buynow" id="gbuy">Buy now</button></div>
          <button type="submit" class="sm-wa-btn">Order on WhatsApp</button></form>
        <ul class="sm-trust" role="list"><li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/></svg><span>Stock confirmed before you pay</span></li><li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg><span>Card or PayPal</span></li><li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg><span>Worldwide shipping</span></li><li><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3a8.5 8.5 0 1 1 15.4-4.6Z"/></svg><span>WhatsApp support</span></li></ul>
        <p class="product-meta">More like this: <a href="#/global/c/${cs}">${esc(c.n)}</a>${g ? ` · <a href="#/global/g/${g.s}">${esc(g.n)}</a>` : ''}</p></aside>
      <div class="pdp-side">
        <section class="sm-ship-card" aria-labelledby="gdel-h"><h2 id="gdel-h"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg> Delivery information</h2>${shipBox()}</section>
        <section class="pdp-share"><h2>Share this product</h2><div class="sm-share"><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(r[2] + ' ' + ownUrl(cs, r))}">WhatsApp</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ownUrl(cs, r))}">Facebook</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(ownUrl(cs, r))}&text=${encodeURIComponent(r[2])}">X</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(ownUrl(cs, r))}&text=${encodeURIComponent(r[2])}">Telegram</a></div></section>
        <a class="pdp-promo" href="${A.APP_BASE}travel/"><b>Book your next adventure</b><small>Flights · Hotels · Umrah packages</small><span>Book now ›</span></a></div></section>
      <section class="sm-tabs" aria-label="Product information"><div role="tablist" aria-label="Product information tabs"><button type="button" role="tab" aria-selected="true" data-tab="gtab-d">Details</button><button type="button" role="tab" aria-selected="false" data-tab="gtab-s">Delivery &amp; payment</button></div>
        <div role="tabpanel" id="gtab-d"><dl class="sm-gdl"><div><dt>Product</dt><dd>${esc(r[2])}</dd></div><div><dt>Reference</dt><dd>${esc(maskSku(r[1]))}</dd></div><div><dt>Category</dt><dd>${esc(c.n)}${g ? ` · ${esc(g.n)}` : ''}</dd></div><div><dt>Estimated price</dt><dd>${est(r)} per item (US dollars; final price confirmed before payment)</dd></div><div><dt>Product video</dt><dd>${r[6] ? 'Available on this page' : 'Not available for this item'}</dd></div><div><dt>Options</dt><dd>${(window.SM_CONFIG || {}).cjShippingWorker || (window.SM_CONFIG || {}).wpApi ? 'Choose from the options above (live supplier options)' : 'Colour, size and other options are confirmed with you before you pay. Add them in the notes field.'}</dd></div></dl></div>
        <div role="tabpanel" id="gtab-s" hidden><p style="margin:0">Worldwide delivery from our supplier. The carrier prices shown are for your country and added to your total. Stock, options and the final total are confirmed with you before you pay by card or PayPal link. Delivery time depends on the carrier and your country; customs duties may apply.</p></div></section>
      <section class="section"><div class="section-head"><div><h2>More in ${esc(c.n)}</h2></div><a class="ghost-btn" href="#/global/c/${cs}">View all</a></div><div class="products-row">${related.map(x => card(cs, x)).join('')}</div></section>`);
    const chosen = { v: null };
    const gTotal = () => {
      const el = document.getElementById('gtotal'), f = document.getElementById('greq'); if (!el || !f) return;
      const q = Math.max(1, Math.min(99, parseInt(f.qty.value, 10) || 1)), unit = (chosen.v ? chosen.v.price : (r[3] || 0)) * MARGIN, items = unit * q;
      if (!unit) { el.innerHTML = '<small>This item has no listed price yet. Order it on WhatsApp and we will quote it.</small>'; return; }
      const s = document.querySelector('.sm-ship-card [name=ship]:checked'), amt = s ? parseFloat(s.dataset.amt) : NaN, cur = s ? (s.dataset.cur || 'USD') : 'USD';
      const money = (n, c) => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: c }).format(n); } catch (e) { return `${c} ${n.toFixed(2)}`; } };
      const ship = isNaN(amt) ? '<dd>Calculating for your country…</dd>' : `<dd>${money(amt, cur)}</dd>`;
      const total = isNaN(amt) ? `${USD.format(items)} + delivery` : (cur === 'USD' ? USD.format(items + amt) : `${USD.format(items)} + ${money(amt, cur)}`);
      el.innerHTML = `<dl><div><dt>${USD.format(unit)} × ${q}${chosen.v && (chosen.v.key || chosen.v.name) ? ' · ' + esc(chosen.v.key || chosen.v.name) : ''}</dt><dd>${USD.format(items)}</dd></div><div><dt>Delivery to ${esc((document.getElementById('gship-to') || {}).textContent || (f.to.value || 'your country'))}</dt>${ship}</div><div class="sm-total__sum"><dt>Total</dt><dd>${total}</dd></div></dl><small>Estimated prices in US dollars. Stock and the final total are confirmed before you pay.</small>`;
    };
    window.__gTotal = gTotal;
    ['change', 'input'].forEach(ev => document.getElementById('greq').addEventListener(ev, e => { if (e.target.name === 'qty') { gTotal(); if (ev === 'change') quoteSoon(); } }));
    document.addEventListener('change', e => { if (e.target && e.target.name === 'ship') gTotal(); });
    { const so = document.getElementById('gship-out'); if (so) new MutationObserver(gTotal).observe(so, { childList: true, subtree: true }); }
    gTotal();     /* the variant the customer picked (real CJ variants, when the CJ Worker is configured) */
    bindVariants(r, chosen);
    (wpShip() ? bindShipWp : bindShip)(r, chosen);
    const rowFrom = f => { const v = chosen.v; return { id: r[0], cs, sku: r[1], name: r[2], img: (v && v.image) || r[5], unit: (v ? v.price : (r[3] || 0)) * MARGIN, qty: Math.max(1, Math.min(99, parseInt(f.qty.value, 10) || 1)), opt: (f.opt.value || '').trim(), ship: ((document.querySelector('.sm-ship-card [name=ship]:checked') || {}).value || ''), shipAmt: parseFloat(((document.querySelector('.sm-ship-card [name=ship]:checked') || {}).dataset || {}).amt) || 0, shipCur: ((document.querySelector('.sm-ship-card [name=ship]:checked') || {}).dataset || {}).cur || 'USD', vkey: v ? (v.sku || v.key || '') : '', vname: v ? (v.key || v.name || '') : '', url: ownUrl(cs, r) }; };
    const addRow = () => { const f = document.getElementById('greq'); const row = rowFrom(f); if (!row.unit) { toast('This item has no listed price yet. Order it on WhatsApp and we will quote it.'); return null; } gcAdd(row); return row; };
    /* Window-capture handler: on the store's own domain a site-wide script swallows add-to-cart clicks at document level, so these two buttons are handled before it (window comes first in the event path). */
    window.__gcAct = { add: () => { if (addRow()) toast('Added to cart'); }, buy: () => { if (addRow()) { A.go('checkout'); } } };
    if (!window.__gcActBound) { window.__gcActBound = true; window.addEventListener('click', e => { const b = e.target && e.target.closest && e.target.closest('#gadd,#gbuy'); if (!b || !window.__gcAct) return; e.preventDefault(); e.stopImmediatePropagation(); window.__gcAct[b.id === 'gbuy' ? 'buy' : 'add'](); }, true); }
    document.getElementById('greq').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target; const v = chosen.v;
      const shipEl = document.querySelector('.sm-ship-card [name=ship]:checked'), ship = shipEl && shipEl.value ? `Shipping chosen: ${shipEl.value}\n` : '';
      const variant = v ? `Variant: ${v.key || v.name} (SKU ${v.sku})\n` : '';
      const price = v ? USD.format(v.price * MARGIN) : est(r);
      const msg = `Assalam o Alaikum! I want to order a global item:\n${r[2]}\nSKU: ${r[1]}\n${variant}Quantity: ${f.qty.value}\n${f.opt.value ? 'Notes: ' + f.opt.value + '\n' : ''}Deliver to: ${f.to.value}\nEstimated price: ${price} each\n${ship}${ownUrl(cs, r)}\nPlease confirm stock, shipping and the final total.`;
      window.open(waLink(msg), '_blank', 'noopener'); toast('Opening WhatsApp with your request');
    });
  }
  /* Live CJ shipping quote (workers/cj-shipping). Shown only when SM_CONFIG.cjShippingWorker is set. */

  /* Live shipping quotes from the WordPress store (global-dropshipping-commerce): real carrier rates for the visitor's country,
     already converted to the visitor's currency. Only on the store's own domain, where the session cookies are first-party. */
  const wpShip = () => { const C = window.SM_CONFIG || {}; return !C.cjShippingWorker && C.wpApi && window.SMWoo && window.SMWoo.active; };
  /* Fallback quote: workers/cj-shipping (supplier carrier prices in US$) for the visitor's detected country. Returns true when quotes were shown. */
  let qSeq = 0;   /* only the newest quote request may write to the page (options can be clicked quickly) */
  async function workerQuote(r, chosen, qty, out, stale) {
    const C = window.SM_CONFIG || {}, W = (C.cjShippingWorker || C.cjImageWorker || '').replace(/\/$/, ''); if (!W) return false;
    let cc = 'PK'; try { cc = (window.SMMarket && window.SMMarket.state().country) || 'PK'; } catch (e) { }
    const ck = `smq:${cc}:${(chosen && chosen.v && chosen.v.vid) || r[0]}:${qty}`; let d = null;
    try { const c = JSON.parse(sessionStorage.getItem(ck) || 'null'); if (c && Date.now() - c.t < 30 * 60e3) d = c.d; } catch (e) { }   /* same country, option and quantity: no second call to the supplier (it allows one request per second) */
    try {
      if (!d) {
        const res = await fetch(W + '/api/cj/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: cc, items: [{ pid: r[0], sku: r[1], qty, ...(chosen && chosen.v ? { vid: chosen.v.vid } : {}) }] }) });
        d = await res.json(); if (!res.ok || !d.methods || !d.methods.length) { if (stale && stale()) return true; return false; }
        try { sessionStorage.setItem(ck, JSON.stringify({ t: Date.now(), d })); } catch (e) { }
      }
      if (stale && stale()) return true; if (!d.methods || !d.methods.length) return false;
      out.innerHTML = d.methods.slice(0, 6).map((m, i) => `<label class="sm-ship__opt"><input type="radio" name="ship" value="${esc(`${neutral(m.name)}: ${USD.format(m.price)}, ${m.days} days`)}" data-amt="${esc(String(m.price))}" data-cur="USD"${i ? '' : ' checked'}> <span>${esc(neutral(m.name))}</span> <b>${USD.format(m.price)}</b> <small>${esc(m.days)} days</small></label>`).join('') + `<p class="sm-ship__note">Carrier price in US$ for ${qty} item${qty > 1 ? 's' : ''} to ${esc((window.SMMarket && window.SMMarket.countryName(cc)) || cc)}, before any customs duties. The final total is confirmed before you pay.</p>`;
      return true;
    } catch (e) { return false; }
  }
  function shipBoxWp() {
    const mk = window.SMMarket; let nm = ''; try { nm = mk ? mk.countryName(mk.state().country) : ''; } catch (e) { }
    return `<fieldset class="sm-ship"><legend>Shipping cost</legend><div class="sm-ship__row"><span>Delivering to <b id="gship-to">${esc(nm || 'your country')}</b> <button type="button" class="sm-btn sm-btn--ghost" id="gship-chg">Change</button></span><button type="button" class="sm-btn sm-btn--ghost" id="gship-go">Get shipping cost</button></div>
      <div id="gship-out" class="sm-ship__out" role="status" aria-live="polite"><small>Choose an option to see the carrier rates for your country.</small></div></fieldset>`;
  }
  function bindShipWp(r, chosen) {
    const go = document.getElementById('gship-go'); if (!go) return;
    const out = document.getElementById('gship-out'), api = (() => { try { return new URL(window.SM_CONFIG.wpApi).pathname; } catch (e) { return window.SM_CONFIG.wpApi; } })().replace(/\/$/, ''), chg = document.getElementById('gship-chg');
    if (chg) chg.addEventListener('click', () => { if (window.SMMarket) window.SMMarket.open(); });
    if (window.__shipMk) window.removeEventListener('sm:market', window.__shipMk);
    window.__shipMk = () => { const t = document.getElementById('gship-to'), mk = window.SMMarket; try { if (t && mk) t.textContent = mk.countryName(mk.state().country); } catch (e) { } if (chosen && chosen.v) quoteSoon(); };
    window.addEventListener('sm:market', window.__shipMk);
    go.addEventListener('click', async () => {
      if (!chosen.v) { out.innerHTML = '<small>Choose an option first.</small>'; return; }
      const qty = Number(document.querySelector('#greq [name="qty"]').value) || 1;
      go.disabled = true; out.textContent = 'Getting carrier rates for your country…';
      const my = ++qSeq, stale = () => my !== qSeq;
      try {
        /* the shipping Worker answers in a second or two: ask it first; the store's live feed is only the second source */
        if (await workerQuote(r, chosen, qty, out, stale)) return;
        let res = null, d = null;
        try {
          await window.SMWoo.sync();
          const c = await (await fetch(`${api}/context`, { credentials: 'include' })).json();
          res = await fetch(`${api}/live/freight`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-GDCS-CSRF': c.csrf }, body: JSON.stringify({ pid: r[0], vid: chosen.v.vid, quantity: qty, csrf: c.csrf }) });
          d = await res.json().catch(() => null);
        } catch (e) { res = null; }
        if (!res || !res.ok || !d || !d.quotes || !d.quotes.length) {
          /* The store's live feed is down: ask the shipping Worker (same supplier, US$ prices) for the visitor's detected country. */
          /* the supplier's one-request-per-second queue was busy: ask again twice on our own before giving up */
          if ((go._tries = (go._tries || 0) + 1) <= 2) { out.textContent = 'The supplier is busy, trying again…'; go.disabled = false; setTimeout(() => { if (!stale()) go.click(); }, 2500 * go._tries); return; }
          go._tries = 0; out.textContent = 'Shipping prices could not be loaded just now. Please press "Get shipping cost" again in a moment, or place the order and we will confirm shipping on WhatsApp.'; return;
        }
        const money = (n, cur) => { try { return new Intl.NumberFormat('en', { style: 'currency', currency: cur }).format(n); } catch (e) { return `${cur} ${n.toFixed(2)}`; } };
        out.innerHTML = d.quotes.slice(0, 6).map((m, i) => { const val = `${neutral(m.service)}: ${money(m.cost, m.currency)}, ${m.estimate} days`; return `<label class="sm-ship__opt"><input type="radio" name="ship" value="${esc(val)}" data-amt="${esc(String(m.cost))}" data-cur="${esc(String(m.currency || 'USD'))}"${i ? '' : ' checked'}> <span>${esc(neutral(m.service))}</span> <b>${esc(money(m.cost, m.currency))}</b> <small>${esc(m.estimate)} days</small></label>`; }).join('') + `<p class="sm-ship__note">Carrier price for ${qty} item${qty > 1 ? 's' : ''} shipped from ${esc((d.origins && d.origins[0] && d.origins[0].name) || 'our supplier')}, before any customs duties. The final total is confirmed before you pay.</p>`;
      } catch (e) { out.textContent = 'Shipping prices could not be loaded just now. Please press "Get shipping cost" again in a moment.'; }
      finally { go.disabled = false; }
    });
  }
  function shipBox() {
    if (wpShip()) return shipBoxWp();
    if (!(window.SM_CONFIG || {}).cjShippingWorker) return '';
    let names; try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { names = null; }
    // Every country, with the visitor's own (detected) country selected: no manual choice needed.
    const mk = window.SMMarket, cur = (mk && mk.state().country) || 'PK';
    const list = mk ? mk.list() : 'AF AL DZ AR AM AU AT AZ BH BD BY BE BR BG CA CL CN CO HR CY CZ DK EG EE FI FR GE DE GH GR HK HU IN ID IQ IE IL IT JP JO KZ KE KW KG LV LB LT LU MY MV MT MX MA NP NL NZ NG NO OM PK PS PH PL PT QA RO RU SA RS SG SK SI ZA KR ES LK SE CH TW TJ TH TN TR TM UA AE GB US UZ VN YE'.split(' ').map(c => ({ c, n: names ? names.of(c) : c }));
    const opts = list.map(x => `<option value="${x.c}"${x.c === cur ? ' selected' : ''}>${esc(x.n)}</option>`).join('');
    return `<fieldset class="sm-ship"><legend>Shipping cost</legend><div class="sm-ship__row"><label class="screen-reader-text" for="gship-cc">Ship to country</label><select id="gship-cc">${opts}</select><button type="button" class="sm-btn sm-btn--ghost" id="gship-go">Get shipping cost</button></div>
      <div id="gship-out" class="sm-ship__out" role="status" aria-live="polite"></div></fieldset>`;
  }
  /* Real CJ variants (colour, size …) from workers/cj-shipping: GET /api/cj/product?pid=. Shown only when the Worker is configured. */
  function varBox() {
    const C = window.SM_CONFIG || {}; if (!C.cjShippingWorker && !C.wpApi) return '';
    return `<fieldset class="sm-var" id="gvar" aria-live="polite"><legend>Choose an option</legend><p class="sm-var__load">Loading the supplier's options…</p></fieldset>`;
  }
  /* Automatic shipping quote for the visitor's country (re-run when the variant or the detected country changes). */
  let quoteTimer = null;
  function quoteSoon() { clearTimeout(quoteTimer); quoteTimer = setTimeout(() => { const go = document.getElementById('gship-go'); if (go && !go.disabled) go.click(); }, 250); }
  /* The supplier allows one request per second for the whole shop, so a busy moment answers 503 once and succeeds a few seconds later (successes are cached for an hour). Ask again quietly before telling the visitor anything. */
  function fetchRetry(u, n = 4) { return fetch(u).then(x => { if (!x.ok) throw new Error(x.status); return x; }).catch(e => (n > 0 ? new Promise(res => setTimeout(res, 1800 + (4 - n) * 1200)).then(() => fetchRetry(u, n - 1)) : Promise.reject(e))); }
  function bindVariants(r, chosen) {
    const box = document.getElementById('gvar'); if (!box) return;
    const C = window.SM_CONFIG || {}, W = (C.cjShippingWorker || '').replace(/\/$/, '');
    const pick = v => {
      chosen.v = v;
      const price = document.querySelector('.buy-panel .big-price'); if (price) price.textContent = v.label || USD.format(v.price * MARGIN);
      const img = document.querySelector('.gallery-main img'); if (img && v.image) img.src = v.image;
      const vid = document.querySelector('.gallery-main video'); if (vid && v.image && vid.paused) vid.poster = v.image;
      // Products with a video: the main slot is the video, so the variation photo gets its own thumbnail, shown in the main slot (the video stays one click away).
      const gt = document.querySelector('.gallery-thumbs');
      if (v.image && gt && !document.querySelector('.gallery-main img')) {
        let tb = gt.querySelector('.sm-var-thumb'); if (!tb) { tb = document.createElement('button'); tb.type = 'button'; tb.className = 'sm-var-thumb'; tb.dataset.type = 'img'; tb.innerHTML = '<img alt="" width="64" height="64">'; gt.appendChild(tb); }
        tb.setAttribute('aria-label', 'Selected variation: ' + (v.key || v.name || '')); tb.dataset.gallery = v.image; tb.querySelector('img').src = v.image; tb.click();
      }   /* video products: the cover image follows the variant */
      const out = document.getElementById('gship-out'); if (out) out.textContent = '';   /* a new variant needs a new shipping quote */
      if (window.__gTotal) window.__gTotal();
      quoteSoon();
    };
    /* Real options: the CJ Worker when configured, otherwise the WordPress store's live options (same CJ data, the store's own price). */
    const RATE = { USD: 1, SAR: 1 / 3.75, AED: 1 / 3.6725 };   // pegged currencies only; anything else keeps the catalogue price
    const fromWp = d => ({ variants: ((d && d.options) || []).map(o => { const m = /([A-Z]{3})\s*([\d.,]+)/.exec(o.price_label || ''); const usd = m && RATE[m[1]] ? parseFloat(m[2].replace(/,/g, '')) * RATE[m[1]] : (r[3] || 0) * MARGIN; return { vid: o.vid, name: o.name, key: o.name, sku: o.sku, image: o.image || '', price: usd / MARGIN, label: m ? o.price_label : '' }; }) });   /* a label without a price (feed down) is dropped: the tile shows the catalogue estimate, refined below from the supplier price */
    (W ? fetch(`${W}/api/cj/product?pid=${encodeURIComponent(r[0])}`).then(x => x.json()) : (window.SMWoo && window.SMWoo.active ? window.SMWoo.sync() : Promise.resolve()).then(() => fetchRetry(`${(window.SMWoo && window.SMWoo.active ? (() => { try { return new URL(C.wpApi).pathname; } catch (e) { return C.wpApi; } })() : C.wpApi).replace(/\/$/, '')}/live/options/${encodeURIComponent(r[0])}`).then(x => { if (!x.ok) throw new Error(x.status); return x.json(); }).then(fromWp))).then(d => {
      const list = (d && d.variants) || [];
      if (!list.length) { box.innerHTML = '<legend>Choose an option</legend><p class="sm-var__load">Options will be confirmed on WhatsApp.</p>'; return; }
      if (list.length === 1) {
        box.innerHTML = `<legend>Option</legend><p class="sm-var__one"><b>${esc(list[0].key || list[0].name)}</b> <small>SKU ${esc(maskSku(list[0].sku))}</small></p>`; pick(list[0]); return;
      }
      box.innerHTML = `<legend>Choose an option <small>(${list.length})</small></legend><div class="sm-var__grid" role="radiogroup">${list.map((v, i) => `<label class="sm-var__opt"><input type="radio" name="variant" value="${esc(v.vid)}" required><span class="sm-var__img">${v.image ? `<img src="${esc(v.image)}" alt="" width="56" height="56" loading="lazy">` : ''}</span><span class="sm-var__t"><b>${esc(v.key || v.name)}</b><small>${v.label || USD.format(v.price * MARGIN)}</small></span></label>`).join('')}</div>`;
      box.addEventListener('change', e => { if (e.target.name === 'variant') pick(list.find(v => v.vid === e.target.value)); });
      { const f0 = box.querySelector('input[name=variant]'); if (f0) { f0.checked = true; pick(list[0]); } }   /* default option: the first one, so price and delivery show at once */
      // Variation photos arrive a moment later from the image Worker: fill the tiles and keep the main picture in step with the choice.
      (function enrich() {
        const IW = (window.SM_CONFIG || {}).cjImageWorker; if (!IW || list.every(v => v.image && v.label)) return;
        fetch(`${IW.replace(/\/$/, '')}/api/cj/product?pid=${encodeURIComponent(r[0])}`).then(x => (x.ok ? x.json() : null)).then(d => {
          if (!d || !d.variants) return; const m = {}, pm = {}; d.variants.forEach(v => { if (v.image && /^https:\/\//.test(v.image)) m[v.vid] = v.image; if (v.price > 0) pm[v.vid] = v.price; });
          list.forEach(v => { if (!v.image && m[v.vid]) v.image = m[v.vid]; if (!v.label && pm[v.vid]) v.price = pm[v.vid]; });   /* supplier price per option; the page shows it with the same 20% margin */
          box.querySelectorAll('.sm-var__opt').forEach((lab, i) => { const v = list[i], s = lab.querySelector('.sm-var__t small'); if (s && v && !v.label) s.textContent = 'est. ' + USD.format(v.price * MARGIN); });
          { const sel0 = box.querySelector('input[name=variant]:checked'), v0 = sel0 && list.find(x => x.vid === sel0.value), bp = document.querySelector('.buy-panel .big-price'); if (v0 && !v0.label && bp) bp.textContent = USD.format(v0.price * MARGIN); }
          box.querySelectorAll('.sm-var__opt').forEach((lab, i) => { const v = list[i], holder = lab.querySelector('.sm-var__img'); if (holder && v && v.image && !holder.firstChild) { const im = document.createElement('img'); im.src = v.image; im.alt = ''; im.width = 56; im.height = 56; im.loading = 'lazy'; im.onerror = () => im.remove(); holder.appendChild(im); } });
          const sel = box.querySelector('input[name=variant]:checked'); if (sel) { const v = list.find(x => x.vid === sel.value), g = document.querySelector('.gallery-main img'); if (v && v.image && g) g.src = v.image; else if (v && v.image) sel.dispatchEvent(new Event('change', { bubbles: true })); }
        }).catch(() => { });
      })();
    }).catch(() => { box.innerHTML = '<legend>Choose an option</legend><p class="sm-var__load">Options could not be loaded just now. <button type="button" class="sm-btn sm-btn--ghost" id="gvar-retry">Try again</button> Or tell us your size or colour in the notes and we will confirm it on WhatsApp.</p>'; const b = document.getElementById('gvar-retry'); if (b) b.addEventListener('click', () => { box.innerHTML = '<legend>Choose an option</legend><p class="sm-var__load">Loading the supplier\'s options…</p>'; bindVariants(r, chosen); }); });
  }
  function bindShip(r, chosen) {
    const go = document.getElementById('gship-go'); if (!go) return;
    if (window.__shipMk) window.removeEventListener('sm:market', window.__shipMk);
    window.__shipMk = e => {          /* country detected or changed: select it and quote again */
      const sel = document.getElementById('gship-cc'); if (!sel || !e.detail) return;
      sel.value = e.detail.country; if (chosen && chosen.v) quoteSoon();
    };
    window.addEventListener('sm:market', window.__shipMk);
    const out = document.getElementById('gship-out'), W = window.SM_CONFIG.cjShippingWorker.replace(/\/$/, '');
    go.addEventListener('click', async () => {
      const cc = document.getElementById('gship-cc').value, qty = Number(document.querySelector('#greq [name="qty"]').value) || 1;
      go.disabled = true; out.textContent = 'Getting shipping options from the supplier…';
      try {
        const res = await fetch(W + '/api/cj/shipping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: cc, items: [{ pid: r[0], sku: r[1], qty, ...(chosen && chosen.v ? { vid: chosen.v.vid } : {}) }] }) });
        const d = await res.json();
        if (!res.ok || !d.methods || !d.methods.length) { out.textContent = (d && d.error ? d.error + '. ' : '') + 'We will confirm shipping on WhatsApp.'; return; }
        out.innerHTML = d.methods.slice(0, 6).map((m, i) => `<label class="sm-ship__opt"><input type="radio" name="ship" value="${esc(`${m.name}: ${USD.format(m.price)}, ${m.days} days`)}" data-amt="${esc(String(m.price))}" data-cur="USD"${i ? '' : ' checked'}> <span>${esc(neutral(m.name))}</span> <b>${USD.format(m.price)}</b> <small>${esc(m.days)} days</small></label>`).join('') + '<p class="sm-ship__note">Supplier shipping price in US$ for this quantity, before any customs duties.</p>';
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
    setSEO({ title: q ? `"${q}" in the global shop` : 'Search the global shop', description: `Search ${m.total.toLocaleString()} global products at Sasta Milaga.`, url: `${A.SITE_URL}/#/global/search`, robots: 'noindex, follow' });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead(q ? `Global results for "${q}"` : 'Search the global shop', '', ['<a href="#/global">Global shop</a>'])}${searchBox(q)}
      <p id="gstat" class="sm-gcount" role="status" aria-live="polite"></p><div class="sm-progress" aria-hidden="true"><span id="gbar"></span></div><div id="ggrid" class="products-row"></div>
      <div class="load-more-wrap"><button type="button" class="ghost-btn" id="gmore" hidden>Keep searching</button></div></section>`);
    bindSearch();
    if (!q) { document.getElementById('gstat').textContent = 'Type a product name or SKU.'; return; }
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const score = c => words.reduce((a, w) => a + (c.n.toLowerCase().includes(w) ? 2 : 0) + (c.g.toLowerCase().includes(w) ? 1 : 0), 0);
    let order = m.cats.slice().sort((a, b) => score(b) - score(a) || b.c - a.c);
    try { if (window.SMCJSearch) { const rk = await window.SMCJSearch.rank(words), mp = new Map(m.cats.map(c => [c.s, c])), seen = new Set(rk); order = rk.map(s => mp.get(s)).filter(Boolean).concat(m.cats.filter(c => !seen.has(c.s)).sort((a, b) => b.c - a.c)); } } catch (e) { }
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

  /* Global results inside the main search page (#/search?q=): shown above the Pakistan listing, filled from the best-matching category files. */
  let extToken = 0;
  function searchBlock(qs) {
    const q = (new URLSearchParams(qs || '').get('q') || '').trim(); if (!q) return;
    const app = document.getElementById('app'); if (!app) return;
    const old = document.getElementById('gext'); if (old) old.remove();
    const sec = document.createElement('section'); sec.id = 'gext'; sec.className = 'section sm-gext';
    sec.innerHTML = `<div class="section-head"><div><h2>Global shop results for “${esc(q)}”</h2><p id="gext-stat" role="status" aria-live="polite">Searching the global catalogue…</p></div><a class="ghost-btn" href="#/global/search?q=${encodeURIComponent(q)}">See all global results</a></div><div id="gext-grid" class="products-row"></div>`;
    const shell = app.querySelector('.listing-shell'); if (shell && shell.parentNode) shell.parentNode.insertBefore(sec, shell); else app.appendChild(sec);
    const my = ++extToken, grid = sec.querySelector('#gext-grid'), stat = sec.querySelector('#gext-stat'), words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let tries = 0;
    const go = () => {
      if (!window.SMCJSearch) { if (tries++ < 40) return setTimeout(go, 100); stat.textContent = 'Open the global shop search to see global results.'; return; }
      window.SMCJSearch.products(words, 12, 8, hits => { if (my === extToken && document.body.contains(sec)) grid.innerHTML = hits.map(h => card(h.cat, h.r)).join(''); })
        .then(hits => { if (my !== extToken || !document.body.contains(sec)) return; grid.innerHTML = hits.map(h => card(h.cat, h.r)).join(''); stat.textContent = hits.length ? `${hits.length} of the best matches from the global catalogue. Prices are estimates in US dollars.` : 'No global products matched all your words. Try fewer or different words.'; })
        .catch(() => { stat.textContent = 'The global catalogue could not be searched just now.'; });
    };
    go();
  }
  window.SMGlobal = {
    searchBlock, shard,
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
  if (/^#\/global(\/|\?|$)/.test(location.hash) || /^global(-shop)?(\/|$)/.test((A.cleanRoute && A.cleanRoute(location.pathname)) || '') || /^#\/search/.test(location.hash) || /^search(\/|$)/.test((A.cleanRoute && A.cleanRoute(location.pathname)) || '')) A.route();
})();
