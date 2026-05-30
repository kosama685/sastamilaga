/* ============================================================
   SASTA MILAGA – app.js
   Features: Routing · Products · Cart · Wishlist · Chatbot
             Dynamic SEO (title/meta/OG) · JSON-LD Schema
             Social Share Buttons · Category Pages
   ============================================================ */

const PRODUCTS_RAW = window.SASTA_PRODUCTS || [];
const PKR = new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0});
const SITE_URL = 'https://sastamilaga.com';
const SITE_NAME = 'Sasta Milaga';

const fallbackImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1a5c2a"/><stop offset=".55" stop-color="#2d7a3a"/><stop offset="1" stop-color="#c8a96e"/></linearGradient></defs><rect width="100%" height="100%" fill="#060e08"/><circle cx="720" cy="140" r="230" fill="url(#g)" opacity=".4"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#c8a96e" font-family="Arial" font-size="48" font-weight="900">Sasta Milaga</text></svg>`);

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const state = {
  route:'home',
  limit:60,
  view:'grid',
  filters:{q:'',category:'',tag:'',store:'',min:'',max:'',stock:false,video:false,sort:'relevant'},
  activeMega:null
};

/* ── Helpers ── */
function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function esc(s){ return String(s ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function slug(s){ return String(s||'').toLowerCase().trim().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function unSlug(s){ return String(s||'').replace(/-/g,' '); }
function titleCase(s){ return String(s||'').replace(/\w\S*/g,t=>t.charAt(0).toUpperCase()+t.slice(1)); }
function price(p){ return num(p.fp || p.bp || p.sp); }
function oldPrice(p){ return Math.max(num(p.sp), num(p.bp), price(p)); }
function discount(p){ const o=oldPrice(p), f=price(p); return o>f ? Math.round((o-f)/o*100) : 0; }
function img(p){ return p.img || (p.imgs && p.imgs[0]) || fallbackImg; }
function isPublished(p){ return p.status !== 'draft' && p.status !== 'trash' && p.pub !== false; }
function productText(p){ return `${p.n} ${p.m} ${p.leaf} ${p.path} ${p.store} ${(p.tags||[]).join(' ')} ${p.sd} ${p.seoT}`.toLowerCase(); }
function truncate(str,len){ return str && str.length>len ? str.slice(0,len).trim()+'…' : str||''; }

/* ── Product data ── */
const products = PRODUCTS_RAW.filter(isPublished).map((p,i)=>({
  ...p,
  _i:i,
  _slug: slug(p.h || p.n || p.id),
  _catSlug: slug(p.m),
  _leafSlug: slug(p.leaf),
  _storeSlug: slug(p.store),
  _search: ''
}));
products.forEach(p=>p._search = productText(p));

const byHandle = new Map();
products.forEach(p => { byHandle.set(p._slug,p); byHandle.set(slug(p.id),p); if(p.h) byHandle.set(slug(p.h),p); });

const categories = [...new Set(products.map(p=>p.m).filter(Boolean))]
  .map(name => {
    const list = products.filter(p=>p.m===name);
    const leaves = [...new Set(list.map(p=>p.leaf).filter(Boolean))].slice(0,24);
    return {name, slug:slug(name), count:list.length, image:img(list.find(p=>img(p)) || list[0]), leaves};
  }).sort((a,b)=>b.count-a.count);

const stores = [...new Set(products.map(p=>p.store).filter(Boolean))];
const tagCounts = {};
products.forEach(p => (p.tags||[]).forEach(t => { if(t.length > 1) tagCounts[t]=(tagCounts[t]||0)+1; }));
const topTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,80).map(([name,count])=>({name,slug:slug(name),count}));

function productsForCategory(cat){ return products.filter(p=>p._catSlug===cat || slug(p.m)===cat); }
function productsForTag(tag){ return products.filter(p=>(p.tags||[]).some(t=>slug(t)===tag)); }
function productsForStore(store){ return products.filter(p=>p._storeSlug===store); }

/* ============================================================
   SEO HELPERS
   ============================================================ */

/** Update all SEO meta tags dynamically per route */
function setSEO({ title, description, image, url, ldJson }){
  // Page title
  document.title = title ? `${title} | ${SITE_NAME} Pakistan` : `${SITE_NAME} – Pakistan's Affordable Marketplace`;

  // Meta description
  setMetaName('description', truncate(description, 160));

  // Canonical
  setOrCreateMeta('link[rel="canonical"]', null, url || SITE_URL, 'href', 'link', 'canonical');

  // Open Graph
  setMetaProp('og:title', title || SITE_NAME);
  setMetaProp('og:description', truncate(description, 200));
  setMetaProp('og:image', image || `${SITE_URL}/sasta-milaga-logo-final.png`);
  setMetaProp('og:url', url || SITE_URL);

  // Twitter / X
  setMetaName('twitter:title', title || SITE_NAME);
  setMetaName('twitter:description', truncate(description, 200));
  setMetaName('twitter:image', image || `${SITE_URL}/sasta-milaga-logo-final.png`);

  // Inject JSON-LD
  if(ldJson){
    const el = $('#ld-dynamic');
    if(el) el.textContent = JSON.stringify(ldJson);
  }
}

function setMetaName(name, content){
  let el = $(`meta[name="${name}"]`);
  if(!el){ el=document.createElement('meta'); el.setAttribute('name',name); document.head.appendChild(el); }
  el.setAttribute('content', content||'');
}
function setMetaProp(prop, content){
  let el = $(`meta[property="${prop}"]`);
  if(!el){ el=document.createElement('meta'); el.setAttribute('property',prop); document.head.appendChild(el); }
  el.setAttribute('content', content||'');
}
function setOrCreateMeta(selector, attr, val, attrToSet, tag, rel){
  let el = $(selector);
  if(!el){ el=document.createElement(tag); if(rel) el.setAttribute('rel',rel); document.head.appendChild(el); }
  el.setAttribute(attrToSet, val||'');
}

/** Build Product JSON-LD */
function productLdJson(p){
  const pUrl = `${SITE_URL}/#/product/${p._slug}`;
  const pImg = img(p);
  const pPrice = price(p);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": p.seoT || p.n,
    "description": truncate(p.d || p.sd || p.seoD || `${p.n} available at Sasta Milaga Pakistan`, 500),
    "image": pImg !== fallbackImg ? [pImg] : undefined,
    "sku": p.sku || p.id,
    "mpn": p.id,
    "brand": { "@type": "Brand", "name": p.store || SITE_NAME },
    "url": pUrl,
    "offers": {
      "@type": "Offer",
      "url": pUrl,
      "priceCurrency": "PKR",
      "price": String(pPrice || 0),
      "priceValidUntil": new Date(Date.now()+30*24*3600000).toISOString().slice(0,10),
      "availability": (p.in || num(p.stock) > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": { "@type": "Organization", "name": SITE_NAME }
    }
  };
  if(oldPrice(p) > pPrice){
    schema.offers.priceSpecification = {
      "@type": "UnitPriceSpecification",
      "price": String(oldPrice(p)),
      "priceCurrency": "PKR"
    };
  }
  // BreadcrumbList
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
      { "@type": "ListItem", "position": 2, "name": p.m || "Products", "item": `${SITE_URL}/#/category/${p._catSlug}` },
      { "@type": "ListItem", "position": 3, "name": p.n, "item": pUrl }
    ]
  };
  return { "@context": "https://schema.org", "@graph": [schema, breadcrumb] };
}

/** Build Category JSON-LD */
function categoryLdJson(cat){
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "name": `${cat.name} – ${SITE_NAME}`,
        "description": `Browse ${cat.count} ${cat.name} products at best prices in Pakistan.`,
        "url": `${SITE_URL}/#/category/${cat.slug}`
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
          { "@type": "ListItem", "position": 2, "name": cat.name, "item": `${SITE_URL}/#/category/${cat.slug}` }
        ]
      }
    ]
  };
}

/* ============================================================
   SOCIAL SHARE HELPERS
   ============================================================ */
function buildShareBar(p){
  const url = encodeURIComponent(`${SITE_URL}/#/product/${p._slug}`);
  const title = encodeURIComponent(`${p.seoT || p.n} – PKR ${PKR.format(price(p))}`);
  const img_url = encodeURIComponent(img(p) !== fallbackImg ? img(p) : `${SITE_URL}/sasta-milaga-logo-final.png`);
  const waText = encodeURIComponent(`🛒 Check out *${p.n}* at Sasta Milaga!\n💰 Only ${PKR.format(price(p))} PKR\n🔗 ${decodeURIComponent(url)}`);

  return `
  <div class="share-bar" id="share-bar-${esc(p.id)}">
    <span>📤 Share this product:</span>
    <a class="share-btn whatsapp"
       href="https://wa.me/?text=${waText}"
       target="_blank" rel="noopener"
       aria-label="Share on WhatsApp"
       title="Share on WhatsApp">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span>WhatsApp</span>
    </a>
    <a class="share-btn facebook"
       href="https://www.facebook.com/sharer/sharer.php?u=${url}"
       target="_blank" rel="noopener"
       aria-label="Share on Facebook"
       title="Share on Facebook">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      <span>Facebook</span>
    </a>
    <a class="share-btn twitter"
       href="https://twitter.com/intent/tweet?text=${title}&url=${url}&hashtags=SastaMilaga,PakistanShopping"
       target="_blank" rel="noopener"
       aria-label="Share on Twitter / X"
       title="Share on Twitter / X">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
      <span>X / Twitter</span>
    </a>
    <a class="share-btn pinterest"
       href="https://pinterest.com/pin/create/button/?url=${url}&media=${img_url}&description=${title}"
       target="_blank" rel="noopener"
       aria-label="Save on Pinterest"
       title="Save on Pinterest">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/></svg>
      <span>Pinterest</span>
    </a>
    <button class="share-btn copy-link"
       onclick="copyProductLink('${esc(p._slug)}')"
       aria-label="Copy product link"
       title="Copy link to clipboard">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      <span>Copy Link</span>
    </button>
  </div>`;
}

window.copyProductLink = function(productSlug){
  const url = `${SITE_URL}/#/product/${productSlug}`;
  navigator.clipboard.writeText(url).then(()=>toast('🔗 Link copied to clipboard!')).catch(()=>{
    const ta = document.createElement('textarea');
    ta.value = url; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('🔗 Link copied!');
  });
};

/* ============================================================
   INIT
   ============================================================ */
function init(){
  updateCounts();
  bindEvents();
  renderMega();
  drawChatChips();
  if(!location.hash) location.hash = '#/home';
  route();
  addBotMessage(`Hi! I can help you find products from ${products.length.toLocaleString()} items. Try: "mobile under 1000", "cosmetics deals", "fashion with video", or "car accessories".`);
}

function bindEvents(){
  window.addEventListener('hashchange', route);
  $('#topSearchForm').addEventListener('submit', e=>{
    e.preventDefault();
    const q = $('#topSearch').value.trim();
    location.hash = '#/search?q=' + encodeURIComponent(q);
  });
  const megaTrigger = $('#megaTrigger');
  megaTrigger.addEventListener('click',()=>{
    const isOpen = $('#megaMenu').classList.toggle('open');
    megaTrigger.setAttribute('aria-expanded', isOpen);
  });
  document.addEventListener('click', e=>{
    if(!e.target.closest('.mega-menu') && !e.target.closest('#megaTrigger')){
      $('#megaMenu').classList.remove('open');
      megaTrigger.setAttribute('aria-expanded','false');
    }
  });
  $('#mobileSearchBtn').addEventListener('click',()=>{ $('#topSearch').focus(); scrollTo({top:0,behavior:'smooth'}); });
  $('#openBot').addEventListener('click',()=>{ $('#chatbot').classList.add('open'); $('#chatbot').removeAttribute('aria-hidden'); });
  $('#closeBot').addEventListener('click',()=>{ $('#chatbot').classList.remove('open'); $('#chatbot').setAttribute('aria-hidden','true'); });
  $('#chatForm').addEventListener('submit', e=>{
    e.preventDefault();
    const q = $('#chatInput').value.trim();
    if(!q) return;
    $('#chatInput').value='';
    addBotMessage(q, true);
    answerBot(q);
  });
  document.body.addEventListener('click', e=>{
    const close = e.target.closest('[data-close-modal]');
    if(close) closeModal();
    const quick = e.target.closest('[data-quick]');
    if(quick) openQuick(quick.dataset.quick);
    const add = e.target.closest('[data-add-cart]');
    if(add) addToCart(add.dataset.addCart, Number(add.dataset.qty||1));
    const wish = e.target.closest('[data-wish]');
    if(wish) toggleWish(wish.dataset.wish);
    const thumb = e.target.closest('[data-gallery]');
    if(thumb) setGallery(thumb.dataset.gallery, thumb.dataset.type);
  });
}

/* ============================================================
   ROUTER
   ============================================================ */
function route(){
  $('#megaMenu').classList.remove('open');
  const raw = location.hash.replace(/^#\/?/,'') || 'home';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  state.limit = 60;
  state.view = 'grid';
  window.scrollTo({top:0});
  if(parts[0]==='category') renderListing('category', parts[1]||'', qs);
  else if(parts[0]==='tag') renderListing('tag', parts[1]||'', qs);
  else if(parts[0]==='search') renderListing('search','',qs);
  else if(parts[0]==='deals') renderListing('deals','',qs);
  else if(parts[0]==='store') renderListing('store', parts[1]||'', qs);
  else if(parts[0]==='product') renderPDP(parts.slice(1).join('/'));
  else if(parts[0]==='cart') renderCart();
  else if(parts[0]==='wishlist') renderWishlist();
  else if(parts[0]==='checkout') renderCheckout();
  else if(parts[0]==='faq') renderFAQ();
  else if(parts[0]==='about') renderAbout();
  else renderHome();
}

/* ============================================================
   MEGA MENU
   ============================================================ */
function renderMega(){
  state.activeMega = categories[0]?.slug;
  const panel = $('#megaMenu');
  panel.innerHTML = `<div class="mega-grid">
    <div class="mega-tabs">${categories.map((c,i)=>`<button class="mega-tab ${i===0?'active':''}" data-mega="${c.slug}" aria-label="${esc(c.name)} category">${esc(c.name)} <small>(${c.count})</small></button>`).join('')}</div>
    <div id="megaMain"></div>
    <div class="mega-tags">${topTags.slice(0,28).map(t=>`<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)}</a>`).join('')}</div>
  </div>`;
  function draw(slugName){
    const c = categories.find(x=>x.slug===slugName) || categories[0];
    const list = productsForCategory(c.slug);
    const featured = list.find(p=>img(p)) || list[0];
    $('#megaMain').innerHTML = `<div class="mega-feature">
      <img src="${esc(img(featured))}" alt="${esc(c.name)}" onerror="this.src=fallbackImg" loading="lazy">
      <div>
        <span class="eyebrow">Browse Category</span>
        <h2>${esc(c.name)}</h2>
        <p>${c.count.toLocaleString()} products. Browse by sub-category, tags, price and deals.</p>
        <a class="primary-btn" href="#/category/${c.slug}">Open ${esc(c.name)} →</a>
      </div>
    </div>
    <div class="mega-list" style="margin-top:14px">
      ${c.leaves.map(l=>`<a href="#/category/${c.slug}?leaf=${encodeURIComponent(slug(l))}">${esc(l)}</a>`).join('')}
    </div>`;
  }
  draw(state.activeMega);
  $$('.mega-tab').forEach(btn=>btn.addEventListener('mouseenter',()=>{
    $$('.mega-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    draw(btn.dataset.mega);
  }));
}

/* ============================================================
   HOME PAGE
   ============================================================ */
function renderHome(){
  setSEO({
    title: "Pakistan's Affordable Marketplace – Best Prices on Fashion, Electronics & More",
    description: `Shop ${products.length.toLocaleString()} products across ${categories.length} categories at Sasta Milaga – Pakistan's go-to marketplace for fashion, electronics, beauty, home decor and groceries. Best prices guaranteed.`,
    image: `${SITE_URL}/sasta-milaga-logo-final.png`,
    url: `${SITE_URL}/`,
    ldJson: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Sasta Milaga Featured Categories",
      "itemListElement": categories.slice(0,10).map((c,i)=>({
        "@type": "ListItem",
        "position": i+1,
        "name": c.name,
        "url": `${SITE_URL}/#/category/${c.slug}`
      }))
    }
  });

  const flash = getDeals().slice(0,8);
  const heroProducts = flash.slice(0,3);
  const deal = flash[0] || products[0];
  $('#app').innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">🇵🇰 Pakistan's #1 Affordable Marketplace</span>
        <h1>Everything <span class="gradient-text">Milaga.</span><br>Sasta <span class="gradient-text">Milaga.</span></h1>
        <p>Discover ${products.length.toLocaleString()} products across ${categories.length} categories. Shop fashion, electronics, beauty, groceries and more – all at the lowest prices in Pakistan.</p>
        <div class="hero-actions">
          <a class="primary-btn" href="#/deals">⚡ Shop Flash Deals</a>
          <a class="ghost-btn" href="#/category/${categories[0]?.slug||''}">Browse Categories</a>
          <button class="ghost-btn" onclick="document.querySelector('#openBot').click()">🤖 Ask Sasta AI</button>
        </div>
      </div>
      <div class="hero-float-grid" aria-hidden="true">
        ${heroProducts.map(p=>`<a class="float-card" href="#/product/${p._slug}"><img src="${esc(img(p))}" onerror="this.src=fallbackImg" alt="${esc(p.n)}" loading="lazy"><b>${esc(p.n)}</b></a>`).join('')}
      </div>
      <div class="blast-badge" aria-hidden="true">Best Price<br>Blast ⚡</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Shop by Category</h2><p>${categories.length} categories auto-generated from your product catalog.</p></div>
        <a class="ghost-btn" href="#/search?q=">View all →</a>
      </div>
      <div class="card-grid">
        ${categories.slice(0,15).map(categoryCard).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>⚡ Flash Sales</h2><p>Biggest discounts, in-stock products with quick-cart actions.</p></div>
        <span class="eyebrow" id="countdown">Sale refreshes soon</span>
      </div>
      <div class="products-row">${flash.slice(0,4).map(productCard).join('')}</div>
    </section>

    <section class="section">
      <div class="deal-layout">
        <div class="detail-panel" style="padding:24px">
          <span class="eyebrow">Deal of the Day 🔥</span>
          <h2>${esc(deal.n)}</h2>
          <p>${esc(deal.sd || deal.seoD || 'A hot pick from the Sasta Milaga catalog.')}</p>
          <div class="tags-wrap">${(deal.tags||[]).slice(0,8).map(tagLink).join('')}</div>
          <div style="display:flex;align-items:flex-end;gap:14px;margin:18px 0">
            <span class="big-price">${PKR.format(price(deal))}</span>
            ${oldPrice(deal)>price(deal)?`<span class="old-price">${PKR.format(oldPrice(deal))}</span>`:''}
          </div>
          <a class="primary-btn" href="#/product/${deal._slug}">Open Product →</a>
        </div>
        <a class="category-card" style="min-height:420px" href="#/product/${deal._slug}">
          <img src="${esc(img(deal))}" alt="${esc(deal.n)}" onerror="this.src=fallbackImg" loading="lazy">
          <div><b>${discount(deal) || 'Hot'}% Off Today</b><small>${esc(deal.m)} · ${esc(deal.leaf)}</small></div>
        </a>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Trending Tags</h2><p>Tag-based discovery routes for faster browsing.</p></div></div>
      <div class="visual-strip">${topTags.slice(0,32).map(t=>`<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)} <small>${t.count}</small></a>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Discover More Products</h2><p>Pinterest-style visual discovery feed.</p></div></div>
      <div class="masonry">${shuffle(products).slice(0,48).map(masonryCard).join('')}</div>
    </section>
  `;
  startCountdown();
}

function categoryCard(c){
  return `<a class="category-card" href="#/category/${c.slug}" title="${esc(c.name)} – ${c.count} products">
    <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.src=fallbackImg">
    <div><b>${esc(c.name)}</b><small>${c.count.toLocaleString()} products</small></div>
  </a>`;
}

/* ============================================================
   LISTING PAGE (Category / Tag / Search / Deals / Store)
   ============================================================ */
function renderListing(type, val, qs=''){
  const params = new URLSearchParams(qs||'');
  const qFromUrl = params.get('q') || '';
  const leafFromUrl = params.get('leaf') || '';
  let base = [];
  let title = '';
  let subtitle = '';
  let cat = null;

  if(type==='category'){
    cat = categories.find(c=>c.slug===val);
    base = productsForCategory(val);
    if(leafFromUrl) base = base.filter(p=>p._leafSlug===leafFromUrl);
    title = cat?.name || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products in this category`;
    setSEO({
      title: `${title} – Buy Online at Best Prices in Pakistan`,
      description: `Shop ${base.length.toLocaleString()} ${title} products online in Pakistan at Sasta Milaga. Compare prices, filter by brand, price range and more.`,
      image: cat ? cat.image : undefined,
      url: `${SITE_URL}/#/category/${val}`,
      ldJson: cat ? categoryLdJson(cat) : undefined
    });
  } else if(type==='tag'){
    const tag = topTags.find(t=>t.slug===val) || {name:titleCase(unSlug(val))};
    base = productsForTag(val);
    title = `#${tag.name}`;
    subtitle = `${base.length.toLocaleString()} products matched by tag`;
    setSEO({
      title: `${tag.name} Products – Best Prices Pakistan`,
      description: `Find ${base.length.toLocaleString()} ${tag.name} products at Sasta Milaga Pakistan. Best prices, easy filtering, fast delivery.`,
      url: `${SITE_URL}/#/tag/${val}`,
      ldJson: { "@context":"https://schema.org","@type":"CollectionPage","name":`${tag.name} Products`,"url":`${SITE_URL}/#/tag/${val}` }
    });
  } else if(type==='store'){
    base = productsForStore(val);
    title = base[0]?.store || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products from this store`;
    setSEO({
      title: `${title} – Official Store at Sasta Milaga Pakistan`,
      description: `Browse all ${base.length.toLocaleString()} products from ${title} at Sasta Milaga. Competitive prices, verified seller.`,
      url: `${SITE_URL}/#/store/${val}`
    });
  } else if(type==='deals'){
    base = getDeals();
    title = '⚡ Blastic Deals';
    subtitle = 'Biggest discounts, in-stock products';
    setSEO({
      title: 'Best Deals & Discounts – Sasta Milaga Pakistan',
      description: `Save big on ${base.length.toLocaleString()} discounted products at Sasta Milaga. Up to 70% off on fashion, electronics, beauty and more in Pakistan.`,
      url: `${SITE_URL}/#/deals`
    });
  } else {
    state.filters.q = qFromUrl;
    $('#topSearch').value = qFromUrl;
    base = products;
    title = qFromUrl ? `Search: "${qFromUrl}"` : 'Search Everything';
    subtitle = 'Search by name, category, store, description and tags';
    setSEO({
      title: qFromUrl ? `"${qFromUrl}" – Search Results at Sasta Milaga` : 'Search All Products – Sasta Milaga Pakistan',
      description: `Search results for "${qFromUrl}" at Sasta Milaga. Find the best prices on products across Pakistan.`,
      url: `${SITE_URL}/#/search?q=${encodeURIComponent(qFromUrl)}`
    });
  }

  state.base = base;
  state.filters.q = type==='search' ? qFromUrl : '';
  const heroImg = img(base.find(p=>img(p)) || products[0]);

  // Category leaf filter chips
  const leafChips = (cat && cat.leaves && cat.leaves.length > 1)
    ? `<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="tag-chip ${!leafFromUrl?'active':''}" href="#/category/${val}" style="${!leafFromUrl?'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)':''}">All</a>
        ${cat.leaves.slice(0,20).map(l=>`<a class="tag-chip ${slug(l)===leafFromUrl?'active':''}" href="#/category/${val}?leaf=${encodeURIComponent(slug(l))}" style="${slug(l)===leafFromUrl?'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)':''}">${esc(l)}</a>`).join('')}
       </div>` : '';

  $('#app').innerHTML = `
    <section class="hero" style="min-height:320px">
      <div class="hero-content">
        <span class="eyebrow">${type==='tag'?'Tag discovery':'type'==='category'?'Category':'Catalog'} ${type==='tag'?'page':type==='category'?'page':'search'}</span>
        <h1>${esc(title)}</h1>
        <p>${esc(subtitle)}. Filter by price, brand, stock and layout.</p>
        ${leafChips}
      </div>
      <div class="blast-badge" aria-hidden="true">${base.length.toLocaleString()}<br>Items</div>
      <div class="hero-float-grid" aria-hidden="true"><span class="float-card" style="right:80px;top:40px"><img src="${esc(heroImg)}" onerror="this.src=fallbackImg" alt="${esc(title)}"><b>${esc(title)}</b></span></div>
    </section>
    <section class="section listing-shell">
      <aside class="filter-panel" aria-label="Product filters">
        <h2 style="margin:0 0 8px;font-size:1.3rem">🎛️ Filters</h2>
        <p style="color:var(--muted2);margin:0 0 14px;font-size:.82rem">Filter by price, tags, brand, stock &amp; video.</p>
        <div class="filter-group">
          <label for="filterQ">Search inside results</label>
          <input id="filterQ" value="${esc(state.filters.q)}" placeholder="Search products..." aria-label="Search within results">
        </div>
        <div class="filter-group">
          <label>Price range (PKR)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="minP" type="number" placeholder="Min" aria-label="Minimum price">
            <input id="maxP" type="number" placeholder="Max" aria-label="Maximum price">
          </div>
        </div>
        <div class="filter-group">
          <label for="sortBy">Sort by</label>
          <select id="sortBy" aria-label="Sort products">
            <option value="relevant">Most Relevant</option>
            <option value="low">Lowest Price</option>
            <option value="high">Highest Price</option>
            <option value="discount">Biggest Discount</option>
            <option value="new">Newest</option>
            <option value="media">Most Visual</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Popular Tags</label>
          <div class="chip-cloud" id="filterTags"></div>
        </div>
        <div class="filter-group">
          <label for="storeFilter">Store / Brand</label>
          <select id="storeFilter" aria-label="Filter by store"><option value="">All Stores</option></select>
        </div>
        <div class="filter-group">
          <label><input id="stockOnly" type="checkbox" style="width:auto;margin-right:6px"> In stock only</label>
          <label style="margin-top:8px;display:block"><input id="videoOnly" type="checkbox" style="width:auto;margin-right:6px"> Video available</label>
        </div>
        <button class="primary-btn" id="applyFilters" style="width:100%;margin-top:16px">Apply Filters</button>
      </aside>
      <div class="content-panel">
        <div class="listing-tools">
          <div><h2 id="resultTitle" style="font-size:1.4rem;margin:0">${esc(title)}</h2><p id="resultCount" style="margin:.3rem 0 0;color:var(--muted2)">Loading…</p></div>
          <div class="view-toggle">
            <button class="ghost-btn active" data-view="grid" aria-label="Grid view">⊞ Grid</button>
            <button class="ghost-btn" data-view="list" aria-label="List view">≡ List</button>
          </div>
        </div>
        <div id="resultGrid" class="products-row"></div>
        <div class="load-more-wrap"><button class="ghost-btn" id="loadMore">Load more products ↓</button></div>
      </div>
    </section>
  `;
  buildFilterControls(base);
  bindListingControls();
  drawResults();
}

function buildFilterControls(base){
  const localTags = {};
  base.forEach(p=>(p.tags||[]).slice(0,10).forEach(t=>localTags[t]=(localTags[t]||0)+1));
  $('#filterTags').innerHTML = Object.entries(localTags).sort((a,b)=>b[1]-a[1]).slice(0,45).map(([t,c])=>`<button class="tag-chip small" data-filter-tag="${esc(t)}">#${esc(t)} <small>${c}</small></button>`).join('');
  const localStores = [...new Set(base.map(p=>p.store).filter(Boolean))].sort().slice(0,200);
  $('#storeFilter').innerHTML += localStores.map(s=>`<option value="${esc(s)}">${esc(s)}</option>`).join('');
}

function bindListingControls(){
  $('#applyFilters').onclick = ()=>{ state.limit=60; drawResults(); };
  $('#loadMore').onclick = ()=>{ state.limit += 60; drawResults(); };
  $$('.view-toggle button').forEach(b=>b.onclick=()=>{
    state.view = b.dataset.view;
    $$('.view-toggle button').forEach(x=>x.classList.toggle('active',x===b));
    drawResults();
  });
  $$('#filterTags [data-filter-tag]').forEach(b=>b.onclick=()=>{
    b.classList.toggle('active');
    if(b.classList.contains('active')){
      b.style.background='rgba(200,169,110,.22)';b.style.borderColor='rgba(200,169,110,.5)';
    } else { b.style.background=''; b.style.borderColor=''; }
    state.limit=60; drawResults();
  });
  ['filterQ','minP','maxP','sortBy','storeFilter','stockOnly','videoOnly'].forEach(id=>{
    const el = $('#'+id); if(el) el.addEventListener('input',()=>{state.limit=60; drawResults();});
  });
}

function filteredResults(){
  let arr = [...(state.base || products)];
  const q = ($('#filterQ')?.value || '').toLowerCase().trim();
  const min = num($('#minP')?.value);
  const max = num($('#maxP')?.value);
  const store = $('#storeFilter')?.value || '';
  const stockOnly = !!$('#stockOnly')?.checked;
  const videoOnly = !!$('#videoOnly')?.checked;
  const selectedTags = $$('[data-filter-tag].active').map(b=>b.dataset.filterTag);
  if(q) arr = arr.filter(p=>p._search.includes(q));
  if(min) arr = arr.filter(p=>price(p)>=min);
  if(max) arr = arr.filter(p=>price(p)<=max);
  if(store) arr = arr.filter(p=>p.store===store);
  if(stockOnly) arr = arr.filter(p=>p.in || num(p.stock)>0);
  if(videoOnly) arr = arr.filter(p=>(p.vids||[]).length);
  if(selectedTags.length) arr = arr.filter(p=>selectedTags.every(t=>(p.tags||[]).includes(t)));
  const sort = $('#sortBy')?.value || 'relevant';
  arr.sort((a,b)=>{
    if(sort==='low') return price(a)-price(b);
    if(sort==='high') return price(b)-price(a);
    if(sort==='discount') return discount(b)-discount(a);
    if(sort==='new') return String(b.updated).localeCompare(String(a.updated));
    if(sort==='media') return ((b.imgs||[]).length+(b.vids||[]).length)-((a.imgs||[]).length+(a.vids||[]).length);
    return discount(b)-discount(a);
  });
  return arr;
}

function drawResults(){
  const arr = filteredResults();
  $('#resultCount').textContent = `${arr.length.toLocaleString()} matching products`;
  const shown = arr.slice(0,state.limit);
  const cls = state.view === 'list' ? 'product-list' : 'products-row';
  $('#resultGrid').className = cls;
  $('#resultGrid').innerHTML = shown.map(productCard).join('') || `<div class="empty-state"><h2>No products found</h2><p>Try fewer filters or ask Sasta AI for help.</p></div>`;
  $('#loadMore').style.display = arr.length > state.limit ? 'inline-flex' : 'none';
}

/* ============================================================
   PRODUCT DETAIL PAGE (PDP) – with SEO + JSON-LD + Share Bar
   ============================================================ */
function renderPDP(handle){
  const p = byHandle.get(slug(handle)) || products[0];
  const related = products.filter(x=>x.id!==p.id && (x.m===p.m || (x.tags||[]).some(t=>(p.tags||[]).includes(t)))).slice(0,8);
  const media = [...(p.imgs||[]).map(u=>({u,type:'img'})), ...(p.vids||[]).map(u=>({u,type:'video'}))];
  const first = media[0] || {u:fallbackImg,type:'img'};

  // ── Dynamic SEO for this product ──
  const seoTitle = p.seoT || p.n;
  const seoDesc = p.seoD || p.sd || p.d || `Buy ${p.n} at the best price in Pakistan. Available at Sasta Milaga – ${p.m || 'top category'}.`;
  const seoImg = img(p) !== fallbackImg ? img(p) : `${SITE_URL}/sasta-milaga-logo-final.png`;

  setSEO({
    title: `${seoTitle} – Buy at PKR ${PKR.format(price(p))} in Pakistan`,
    description: seoDesc,
    image: seoImg,
    url: `${SITE_URL}/#/product/${p._slug}`,
    ldJson: productLdJson(p)
  });

  // ── Breadcrumb HTML ──
  const breadcrumbHtml = `<div class="breadcrumbs" aria-label="Breadcrumb">
    <a href="#/home">Home</a> ›
    ${p.m ? `<a href="#/category/${p._catSlug}">${esc(p.m)}</a> ›` : ''}
    ${p.leaf ? `<a href="#/category/${p._catSlug}?leaf=${slug(p.leaf)}">${esc(p.leaf)}</a> ›` : ''}
    <span>${esc(p.n)}</span>
  </div>`;

  $('#app').innerHTML = `
    <section class="pdp" aria-label="Product detail">
      <div>
        <div class="gallery-panel">
          <div class="gallery-main" id="galleryMain">${mediaElement(first.u, first.type, p.n)}</div>
          <div class="gallery-thumbs" role="list" aria-label="Product images">
            ${media.map((m,i)=>`<button data-gallery="${esc(m.u)}" data-type="${m.type}" aria-label="View image ${i+1}" class="${i===0?'active':''}">${mediaElement(m.u,m.type,p.n)}</button>`).join('')}
          </div>
        </div>

        <div class="detail-panel">
          ${breadcrumbHtml}
          <h2 style="margin-top:14px">Product Details</h2>
          <p style="line-height:1.7;color:var(--muted2)">${esc(p.d || p.sd || p.seoD || 'Full product details available at Sasta Milaga.')}</p>
          ${(p.tags||[]).length ? `<h3 style="font-size:1rem;margin:14px 0 8px;color:var(--muted2)">Tags</h3><div class="tags-wrap">${(p.tags||[]).map(tagLink).join('')}</div>` : ''}
          ${p.sku ? `<p style="margin-top:14px;color:var(--muted);font-size:.82rem">SKU: <code>${esc(p.sku)}</code> &nbsp;|&nbsp; ID: <code>${esc(p.id)}</code></p>` : ''}
        </div>
      </div>

      <aside class="buy-panel" aria-label="Purchase options">
        <span class="eyebrow">${esc(p.m)} ${p.leaf?'› '+esc(p.leaf):''}</span>
        <h1>${esc(p.n)}</h1>
        <p class="product-meta">
          Sold by: <a href="#/store/${p._storeSlug}" style="color:var(--gold2)">${esc(p.store || SITE_NAME)}</a>
          ${p.sku ? `· SKU: ${esc(p.sku)}` : ''}
        </p>
        <div style="margin:12px 0">
          <span class="big-price">${PKR.format(price(p))}</span>
          ${oldPrice(p)>price(p)?` <span class="old-price">${PKR.format(oldPrice(p))}</span>`:''}
          ${discount(p)?` <span class="discount" style="position:static;display:inline-block;margin-left:8px">-${discount(p)}%</span>`:''}
        </div>
        <div class="tags-wrap" style="margin:10px 0">
          ${discount(p)?`<span class="tag-chip" style="background:rgba(200,169,110,.2);border-color:rgba(200,169,110,.4)">💰 ${discount(p)}% Off</span>`:''}
          <span class="tag-chip">${p.in || num(p.stock)>0 ? '✅ In Stock' : '⚠️ Check Availability'}</span>
          ${(p.vids||[]).length?'<span class="tag-chip">🎬 Video Available</span>':''}
        </div>
        <div class="qty" aria-label="Quantity selector">
          <button onclick="changeQty(-1)" aria-label="Decrease quantity">−</button>
          <b id="qty" aria-live="polite">1</b>
          <button onclick="changeQty(1)" aria-label="Increase quantity">+</button>
        </div>
        <div class="buy-actions">
          <button class="primary-btn" data-add-cart="${esc(p.id)}" aria-label="Add to cart">🛒 Add to Cart</button>
          <a class="ghost-btn" href="#/checkout" onclick="addToCart('${esc(p.id)}',Number(document.querySelector('#qty')?.textContent||1))" aria-label="Buy now">⚡ Buy Now</a>
        </div>
        <button class="ghost-btn" style="width:100%;margin-top:8px" data-wish="${esc(p.id)}" aria-label="Save to wishlist">♡ Save to Wishlist</button>

        ${buildShareBar(p)}
      </aside>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>${crossTitle(p)}</h2><p>More products from the same category and tags.</p></div></div>
      <div class="products-row">${related.map(productCard).join('')}</div>
    </section>
  `;
}

function crossTitle(p){
  const m=(p.m||'').toLowerCase();
  if(m.includes('fashion')) return 'Complete the Look';
  if(m.includes('home')) return 'Style Your Space';
  if(m.includes('beauty')) return 'Build Your Beauty Routine';
  if(m.includes('automotive')) return 'Car Care Bundle';
  if(m.includes('electronic')) return 'You May Also Like';
  return 'Frequently Bought Together';
}

function changeQty(n){ const q=$('#qty'); q.textContent=Math.max(1, Number(q.textContent||1)+n); }
window.changeQty = changeQty;

function setGallery(url,type){
  $('#galleryMain').innerHTML = mediaElement(url,type,$('h1')?.textContent||'Product');
  $$('.gallery-thumbs button').forEach(b=>b.classList.toggle('active', b.dataset.gallery===url));
}

function mediaElement(url,type,alt){
  if(type==='video') return `<video src="${esc(url)}" controls muted playsinline></video>`;
  return `<img src="${esc(url||fallbackImg)}" alt="${esc(alt)}" loading="lazy" onerror="this.src=fallbackImg">`;
}

/* ============================================================
   PRODUCT CARD
   ============================================================ */
function productCard(p){
  return `<article class="product-card" itemscope itemtype="https://schema.org/Product">
    <a href="#/product/${p._slug}" class="product-media" aria-label="${esc(p.n)}">
      ${discount(p)?`<span class="discount" aria-label="${discount(p)}% off">-${discount(p)}%</span>`:''}
      ${(p.vids||[]).length
        ? `<video src="${esc(p.vids[0])}" poster="${esc(img(p))}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()" aria-label="${esc(p.n)} video"></video>`
        : `<img src="${esc(img(p))}" alt="${esc(p.alt?.[0] || p.n)}" loading="lazy" onerror="this.src=fallbackImg" itemprop="image">`}
    </a>
    <div class="product-body">
      <a class="product-title" href="#/product/${p._slug}" itemprop="name">${esc(p.n)}</a>
      <div class="product-meta">${esc(p.m)} · ${esc(p.leaf || p.store || '')}</div>
      <div class="tags-wrap">${(p.tags||[]).slice(0,3).map(tagLinkSmall).join('')}</div>
      <div class="price-line">
        <div>
          <div class="price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price" content="${price(p)}">${PKR.format(price(p))}</span>
            <meta itemprop="priceCurrency" content="PKR">
          </div>
          ${oldPrice(p)>price(p)?`<div class="old-price">${PKR.format(oldPrice(p))}</div>`:''}
        </div>
        <button class="mini-btn" data-wish="${esc(p.id)}" aria-label="Save to wishlist">♡</button>
      </div>
      <div class="quick-actions">
        <button data-quick="${esc(p.id)}" aria-label="Quick view ${esc(p.n)}">Quick View</button>
        <button data-add-cart="${esc(p.id)}" aria-label="Add ${esc(p.n)} to cart">Add to Cart</button>
      </div>
    </div>
  </article>`;
}

function masonryCard(p){
  const ratio = 0.75 + ((p._i % 5) * .12);
  return `<div style="--ratio:1/${ratio.toFixed(2)}">${productCard(p)}</div>`;
}

function tagLink(t){ return `<a class="tag-chip" href="#/tag/${slug(t)}" aria-label="Browse ${t} products">#${esc(t)}</a>`; }
function tagLinkSmall(t){ return `<a class="tag-chip small" href="#/tag/${slug(t)}">#${esc(t)}</a>`; }

/* ============================================================
   DEALS
   ============================================================ */
function getDeals(){
  return products.filter(p=>price(p)>0 && img(p)).sort((a,b)=>discount(b)-discount(a) || price(a)-price(b));
}

function shuffle(arr){ return [...arr].sort((a,b)=>((a._i*9301+49297)%233280)-((b._i*9301+49297)%233280)); }

function startCountdown(){
  const el = $('#countdown');
  if(!el) return;
  let end = Date.now()+1000*60*60*6;
  clearInterval(window.__saleTimer);
  window.__saleTimer = setInterval(()=>{
    const left = Math.max(0,end-Date.now());
    const h = String(Math.floor(left/3600000)).padStart(2,'0');
    const m = String(Math.floor(left%3600000/60000)).padStart(2,'0');
    const s = String(Math.floor(left%60000/1000)).padStart(2,'0');
    if(el) el.textContent = `⏱ Flash sale: ${h}:${m}:${s}`;
  },1000);
}

/* ============================================================
   QUICK VIEW MODAL
   ============================================================ */
function openQuick(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  $('#quickModalBody').innerHTML = `<div class="quick-view">
    <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=fallbackImg" loading="lazy">
    <div>
      <span class="eyebrow">${esc(p.m)}</span>
      <h2>${esc(p.n)}</h2>
      <p style="color:var(--muted2);line-height:1.6">${esc(p.sd || p.seoD || '')}</p>
      <div class="big-price">${PKR.format(price(p))}</div>
      <div class="tags-wrap">${(p.tags||[]).slice(0,10).map(tagLink).join('')}</div>
      <div class="buy-actions"><button class="primary-btn" data-add-cart="${esc(p.id)}">🛒 Add to Cart</button><a class="ghost-btn" href="#/product/${p._slug}">Full Details →</a></div>
      ${buildShareBar(p)}
    </div>
  </div>`;
  $('#quickModal').classList.add('open');
  $('#quickModal').removeAttribute('aria-hidden');
  document.body.classList.add('lock');
}

function closeModal(){
  $('#quickModal').classList.remove('open');
  $('#quickModal').setAttribute('aria-hidden','true');
  document.body.classList.remove('lock');
}

/* ============================================================
   CART / WISHLIST / CHECKOUT
   ============================================================ */
function getCart(){ return JSON.parse(localStorage.getItem('sm_cart')||'[]'); }
function setCart(c){ localStorage.setItem('sm_cart',JSON.stringify(c)); updateCounts(); }
function getWish(){ return JSON.parse(localStorage.getItem('sm_wish')||'[]'); }
function setWish(w){ localStorage.setItem('sm_wish',JSON.stringify(w)); updateCounts(); }

function addToCart(id,qty=1){
  const cart = getCart();
  const row = cart.find(x=>x.id===id);
  if(row) row.qty += qty; else cart.push({id,qty});
  setCart(cart); toast('🛒 Added to cart!');
}

function toggleWish(id){
  let w = getWish();
  w = w.includes(id) ? w.filter(x=>x!==id) : [...w,id];
  setWish(w); toast(w.includes(id) ? '♡ Saved to wishlist' : 'Removed from wishlist');
}

function updateCounts(){
  if($('#cartCount')) $('#cartCount').textContent = getCart().reduce((a,x)=>a+x.qty,0);
  if($('#wishCount')) $('#wishCount').textContent = getWish().length;
}

function renderCart(){
  setSEO({ title: 'Your Shopping Cart', description: 'Review your items and proceed to checkout at Sasta Milaga Pakistan.', url:`${SITE_URL}/#/cart` });
  const cart = getCart();
  const rows = cart.map(x=>({item:products.find(p=>p.id===x.id),qty:x.qty})).filter(x=>x.item);
  const sub = rows.reduce((a,x)=>a+price(x.item)*x.qty,0);
  $('#app').innerHTML = `<section class="section"><div class="section-head"><div><h2>🛒 Your Cart</h2><p>Review items and proceed to checkout.</p></div></div>
    ${rows.length ? `<div class="cart-layout"><div>${rows.map(({item,qty})=>cartLine(item,qty)).join('')}</div>${summaryBox(sub)}</div>` : empty('Your cart is empty','Shop Flash Deals','#/deals')}
  </section>`;
}

function cartLine(p,qty){
  return `<div class="cart-line">
    <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=fallbackImg">
    <div><b>${esc(p.n)}</b><p style="color:var(--muted);margin:4px 0">${esc(p.m)} · ${esc(p.leaf)}</p><div class="price">${PKR.format(price(p))}</div></div>
    <div><div class="qty"><button onclick="cartQty('${esc(p.id)}',-1)" aria-label="Decrease">−</button><b>${qty}</b><button onclick="cartQty('${esc(p.id)}',1)" aria-label="Increase">+</button></div><button class="ghost-btn" onclick="removeCart('${esc(p.id)}')" style="margin-top:8px">Remove</button></div>
  </div>`;
}

function cartQty(id,n){
  const cart=getCart().map(x=>x.id===id?{...x,qty:Math.max(1,x.qty+n)}:x);
  setCart(cart); renderCart();
}
function removeCart(id){ setCart(getCart().filter(x=>x.id!==id)); renderCart(); }
window.cartQty = cartQty; window.removeCart = removeCart;

function summaryBox(sub){
  const delivery = sub>5000 ? 0 : 250;
  const total = sub + delivery;
  return `<aside class="summary-box"><h2 style="margin:0 0 14px">Order Summary</h2>
    <div class="summary-row"><span>Subtotal</span><b>${PKR.format(sub)}</b></div>
    <div class="summary-row"><span>Delivery</span><b>${delivery?PKR.format(delivery):'🎉 Free'}</b></div>
    <div class="summary-row" style="border:0;font-size:1.2rem"><span>Total</span><b style="color:var(--gold2)">${PKR.format(total)}</b></div>
    <a class="primary-btn" style="width:100%;justify-content:center;display:flex;margin-top:14px" href="#/checkout">Proceed to Checkout →</a>
  </aside>`;
}

function renderWishlist(){
  setSEO({ title: 'My Wishlist', description: 'Your saved products at Sasta Milaga Pakistan.', url:`${SITE_URL}/#/wishlist` });
  const ids = getWish();
  const list = products.filter(p=>ids.includes(p.id));
  $('#app').innerHTML = `<section class="section"><div class="section-head"><div><h2>♡ Wishlist</h2><p>Saved products for later.</p></div></div>
  ${list.length ? `<div class="products-row">${list.map(productCard).join('')}</div>` : empty('Wishlist is empty','Explore Categories','#/home')}
  </section>`;
}

function renderCheckout(){
  setSEO({ title: 'Checkout – Sasta Milaga Pakistan', description: 'Complete your order at Sasta Milaga. Fast, secure checkout with Cash on Delivery available.', url:`${SITE_URL}/#/checkout` });
  const rows = getCart().map(x=>({item:products.find(p=>p.id===x.id),qty:x.qty})).filter(x=>x.item);
  const sub = rows.reduce((a,x)=>a+price(x.item)*x.qty,0);
  $('#app').innerHTML = `<section class="section">
    <div class="section-head"><div><span class="eyebrow">Cart → Details → Payment → Confirm</span><h2>Fast Checkout</h2><p>Secure checkout with Cash on Delivery, bank transfer or wallet.</p></div></div>
    <div class="checkout-layout">
      <form class="detail-panel form-grid" style="padding:20px" onsubmit="event.preventDefault(); toast('✅ Order captured! Connect Code.gs to Google Sheets for live orders.');">
        <input required placeholder="Full name" aria-label="Full name">
        <input required placeholder="Phone number" type="tel" aria-label="Phone number">
        <input placeholder="Email (optional)" type="email" aria-label="Email">
        <select aria-label="Payment method"><option>Cash on Delivery (COD)</option><option>Bank Transfer</option><option>EasyPaisa / JazzCash</option><option>Credit / Debit Card</option></select>
        <textarea required placeholder="Complete delivery address" aria-label="Delivery address"></textarea>
        <textarea placeholder="Order notes (optional)" aria-label="Order notes"></textarea>
        <button class="primary-btn" style="grid-column:1/-1;padding:16px">🚀 Place Order</button>
      </form>
      ${summaryBox(sub)}
    </div>
  </section>`;
}

function empty(title, cta, href){ return `<div class="empty-state"><h2>${esc(title)}</h2><p>Everything is searchable and image-led at Sasta Milaga.</p><a class="primary-btn" href="${href}">${esc(cta)}</a></div>`; }

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2400); }

/* ============================================================
   AI CHATBOT (AEO & UX Enhanced)
   ============================================================ */
const CHAT_CHIPS = [
  { label: "📱 Mobiles Under 5k", query: "mobile under 5000" },
  { label: "💄 Beauty & Cosmetics", query: "cosmetics" },
  { label: "👗 Fashion Deals", query: "fashion sale" },
  { label: "🚗 Car Accessories", query: "car accessories" },
  { label: "🇵🇰 Delivery Info", query: "delivery info" },
  { label: "💳 Payment Methods", query: "payment methods" },
  { label: "🔄 Return Policy", query: "return policy" },
  { label: "❓ How to Order", query: "how to order" }
];

function drawChatChips() {
  const container = $('#chatChips');
  if (!container) return;
  container.innerHTML = CHAT_CHIPS.map(chip => 
    `<button class="chat-chip" onclick="handleChipClick('${esc(chip.query)}')">${esc(chip.label)}</button>`
  ).join('');
}

window.handleChipClick = function(query) {
  addBotMessage(query, true);
  answerBot(query);
};

function addBotMessage(html, user=false){
  const div=document.createElement('div');
  div.className='chat-msg'+(user?' user':'');
  div.innerHTML = user ? esc(html) : html;
  const chatLog = $('#chatLog');
  if (chatLog) {
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }
}

function answerBot(q){
  const l = q.toLowerCase().trim();

  // 1. FAQ / Customer Help Matches (AEO & Local Trust Signals)
  if (l.includes("delivery") || l.includes("shipping") || l.includes("shipping cost") || l.includes("cities") || l.includes("delivery fee")) {
    addBotMessage(`📦 <b>Delivery Info:</b><br>- <b>Flat Shipping Fee:</b> Flat PKR 250 across Pakistan.<br>- <b>Free Shipping:</b> Auto-applied on orders above <b>PKR 5,000</b>.<br>- <b>Delivery Time:</b> 2-4 working days for major cities (Lahore, Karachi, Islamabad, Peshawar) and 3-6 days for other regions.`);
    return;
  }
  if (l.includes("payment") || l.includes("pay") || l.includes("easypaisa") || l.includes("jazzcash") || l.includes("cod")) {
    addBotMessage(`💳 <b>Payment Methods:</b><br>- <b>Cash on Delivery (COD)</b> is fully supported across Pakistan.<br>- <b>Bank Transfer</b> & direct wallet payments (EasyPaisa / JazzCash) are also available at checkout.`);
    return;
  }
  if (l.includes("return") || l.includes("refund") || l.includes("exchange")) {
    addBotMessage(`🔄 <b>7-Day Easy Returns:</b><br>We offer a hassle-free 7-day return policy. If you receive a damaged or incorrect product, contact us via WhatsApp with your order details to initiate a refund or exchange.`);
    return;
  }
  if (l.includes("order") || l.includes("how to buy") || l.includes("purchase")) {
    addBotMessage(`🛒 <b>How to Order:</b><br>1. Click on any product.<br>2. Choose quantity and tap <b>Add to Cart</b>.<br>3. Open the cart page and tap <b>Proceed to Checkout</b>.<br>4. Fill in your delivery details, select payment, and click <b>Place Order</b>.`);
    return;
  }
  if (l.includes("contact") || l.includes("phone") || l.includes("whatsapp") || l.includes("support") || l.includes("helpline")) {
    addBotMessage(`📞 <b>Customer Support:</b><br>- <b>WhatsApp Helpline:</b> <a href="https://wa.me/923000000000" target="_blank" style="color:var(--gold2);text-decoration:underline"><b>+92 300 0000000</b></a><br>- Support Hours: 9:00 AM to 9:00 PM (Monday to Saturday).`);
    return;
  }

  // 2. Synonyms mapping for better search
  let queryTerms = l;
  if (l.includes("phone") || l.includes("smartphone")) queryTerms += " mobile";
  if (l.includes("makeup") || l.includes("lip") || l.includes("cream")) queryTerms += " beauty cosmetics";
  if (l.includes("clothes") || l.includes("dress") || l.includes("shirt") || l.includes("clothing")) queryTerms += " fashion";
  if (l.includes("home") || l.includes("decor") || l.includes("kitchen")) queryTerms += " home-decor";

  // 3. Extract Price Filters
  let max = (l.match(/under\s*(rs\.?|pkr)?\s*(\d+)/i)||[])[2];
  let min = (l.match(/over\s*(rs\.?|pkr)?\s*(\d+)/i)||[])[2];

  // 4. Query Catalog
  let arr = products.filter(p => {
    return p._search.includes(queryTerms) || queryTerms.split(/\s+/).some(w => w.length > 2 && p._search.includes(w));
  });

  const cat = categories.find(c => queryTerms.includes(c.name.toLowerCase()) || queryTerms.includes(c.slug.replaceAll('-',' ')));
  if(cat) arr = productsForCategory(cat.slug);

  const tag = topTags.find(t => queryTerms.includes(t.name.toLowerCase()) || queryTerms.includes(t.slug.replaceAll('-',' ')));
  if(tag) arr = productsForTag(tag.slug);

  if(max) arr = arr.filter(p=>price(p)<=Number(max));
  if(min) arr = arr.filter(p=>price(p)>=Number(min));
  if(queryTerms.includes('video')) arr = arr.filter(p=>(p.vids||[]).length);
  if(queryTerms.includes('stock') || queryTerms.includes('available')) arr = arr.filter(p=>p.in || num(p.stock)>0);
  if(queryTerms.includes('deal') || queryTerms.includes('discount') || queryTerms.includes('sale')) arr = arr.sort((a,b)=>discount(b)-discount(a));
  else arr = arr.sort((a,b)=>price(a)-price(b));

  arr = arr.slice(0, 5);

  if(!arr.length){
    addBotMessage(`I couldn't find an exact match for "${esc(q)}". Try searching for categories like <b>cosmetics</b>, <b>mobile</b>, <b>home decor</b>, <b>fashion</b>, or ask about <b>delivery info</b>.`);
    return;
  }

  addBotMessage(`<div>Found <b>${arr.length}</b> matches. Tap to view:</div>
    <div class="chat-products">${arr.map(p=>`<a class="chat-product" href="#/product/${p._slug}">
      <img src="${esc(img(p))}" onerror="this.src=fallbackImg" alt="${esc(p.n)}" loading="lazy">
      <span><b>${esc(p.n)}</b><br><small style="color:var(--gold2)">${PKR.format(price(p))} · ${esc(p.m)}</small></span>
    </a>`).join('')}</div>`);
}

/* ============================================================
   FAQ & ABOUT PAGES (SEO, GEO, & AEO Enhanced)
   ============================================================ */
function renderFAQ() {
  setSEO({
    title: 'Frequently Asked Questions (FAQ) – Customer Support',
    description: 'Find answers to common questions about Sasta Milaga delivery times, shipping fees, Cash on Delivery support, return policy, and order placement in Pakistan.',
    url: `${SITE_URL}/#/faq`
  });

  $('#app').innerHTML = `
    <section class="section">
      <div class="section-head" style="text-align:center;margin-bottom:30px">
        <div>
          <span class="eyebrow">Help Center</span>
          <h2>Frequently Asked Questions</h2>
          <p>Everything you need to know about shopping, shipping, and payments in Pakistan.</p>
        </div>
      </div>

      <div class="faq-accordion">
        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">
            What is the shipping cost and delivery area? <span>+</span>
          </button>
          <div class="faq-content">
            We deliver to all major cities and small towns across Pakistan. 
            There is a flat shipping fee of <b>PKR 250</b> for all orders. 
            However, shipping is <b>100% FREE</b> for all orders above <b>PKR 5,000</b>.
          </div>
        </div>

        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">
            How long does delivery take? <span>+</span>
          </button>
          <div class="faq-content">
            Delivery usually takes:
            <ul>
              <li><b>2 to 4 working days</b> for major cities like Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Faisalabad, and Multan.</li>
              <li><b>3 to 6 working days</b> for other towns and rural areas across Pakistan.</li>
            </ul>
          </div>
        </div>

        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">
            What payment methods do you accept? <span>+</span>
          </button>
          <div class="faq-content">
            We accept:
            <ul>
              <li><b>Cash on Delivery (COD)</b> – Pay cash at your doorstep.</li>
              <li><b>EasyPaisa / JazzCash</b> – Mobile wallet payment.</li>
              <li><b>Bank Transfer</b> – Direct online bank transfer.</li>
              <li><b>Credit / Debit Card</b> – Pay securely online.</li>
            </ul>
          </div>
        </div>

        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">
            What is your return and refund policy? <span>+</span>
          </button>
          <div class="faq-content">
            We offer an easy <b>7-day return and exchange policy</b>. If you receive a damaged, defective, or incorrect product, please reach out to our WhatsApp helpline (+92 300 0000000) within 7 days. Once verified, we will process your replacement or full refund.
          </div>
        </div>

        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">
            How do I track my order? <span>+</span>
          </button>
          <div class="faq-content">
            Once your order is shipped, you will receive a tracking link via SMS. You can also contact our WhatsApp support at any time with your order number to get live tracking updates.
          </div>
        </div>
      </div>
    </section>
  `;
}

window.toggleFaq = function(btn) {
  const item = btn.parentElement;
  const isOpen = item.classList.toggle('open');
  btn.querySelector('span').textContent = isOpen ? '−' : '+';
};

function renderAbout() {
  setSEO({
    title: 'About Us – Pakistan\'s Best Price Marketplace',
    description: 'Learn more about Sasta Milaga, our mission to provide the most affordable online shopping experience, our delivery coverage across Punjab, Sindh, KPK, Balochistan, and our premium customer support.',
    url: `${SITE_URL}/#/about`
  });

  $('#app').innerHTML = `
    <section class="section">
      <div class="about-hero">
        <span class="eyebrow">About Sasta Milaga</span>
        <h1>Pakistan's Affordable Online Hub</h1>
        <p style="max-width:700px;margin:12px auto;color:var(--muted2);line-height:1.7">
          Sasta Milaga is built with a singular vision: to make high-quality everyday products affordable and accessible to every household in Pakistan. With over 13,000 products, we link buyers to the best deals directly.
        </p>
      </div>

      <div class="about-metrics">
        <div class="metric-box">
          <span class="metric-number">13,000+</span>
          <span class="metric-label">Products in Stock</span>
        </div>
        <div class="metric-box">
          <span class="metric-number">100%</span>
          <span class="metric-label">COD Supported</span>
        </div>
        <div class="metric-box">
          <span class="metric-number">7 Days</span>
          <span class="metric-label">Easy Returns</span>
        </div>
        <div class="metric-box">
          <span class="metric-number">24/7</span>
          <span class="metric-label">WhatsApp Helpline</span>
        </div>
      </div>

      <div class="about-grid">
        <div class="about-card">
          <h3>🇵🇰 Nationwide Delivery</h3>
          <p style="line-height:1.6;color:var(--muted)">We deliver to every corner of Pakistan, covering major cities, districts, and rural towns with reliable shipping networks.</p>
        </div>
        <div class="about-card">
          <h3>💰 Best Price Guarantee</h3>
          <p style="line-height:1.6;color:var(--muted)">Our business name is our promise: "Sasta Milaga" (You will get it cheaper). We match or beat local store prices.</p>
        </div>
        <div class="about-card">
          <h3>⭐ Premium Customer Care</h3>
          <p style="line-height:1.6;color:var(--muted)">We provide instant WhatsApp helpline assistance for orders, returns, tracking, and custom requests.</p>
        </div>
      </div>

      <div class="about-card" style="margin-top:24px">
        <h3>📍 Cities We Service</h3>
        <p style="color:var(--muted2)">Some of the primary cities we ship to with quick cash-on-delivery:</p>
        <div class="cities-grid">
          <div class="city-tag">Lahore</div>
          <div class="city-tag">Karachi</div>
          <div class="city-tag">Islamabad</div>
          <div class="city-tag">Rawalpindi</div>
          <div class="city-tag">Faisalabad</div>
          <div class="city-tag">Multan</div>
          <div class="city-tag">Peshawar</div>
          <div class="city-tag">Quetta</div>
          <div class="city-tag">Gujranwala</div>
          <div class="city-tag">Sialkot</div>
          <div class="city-tag">Hyderabad</div>
          <div class="city-tag">Sargodha</div>
        </div>
      </div>
    </section>
  `;
}

window.fallbackImg = fallbackImg;
init();
