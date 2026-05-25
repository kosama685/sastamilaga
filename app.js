const PRODUCTS_RAW = window.SASTA_PRODUCTS || [];
const PKR = new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0});
const fallbackImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff3ecd"/><stop offset=".55" stop-color="#22d9ff"/><stop offset="1" stop-color="#b8ff14"/></linearGradient></defs><rect width="100%" height="100%" fill="#090d1c"/><circle cx="720" cy="140" r="230" fill="url(#g)" opacity=".45"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="Arial" font-size="48" font-weight="900">Sasta Milaga</text></svg>`);
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const state = {
  route:'home',
  limit:60,
  view:'grid',
  filters:{q:'',category:'',tag:'',store:'',min:'',max:'',stock:false,video:false,sort:'relevant'},
  activeMega:null
};

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

function init(){
  updateCounts();
  bindEvents();
  renderMega();
  if(!location.hash) location.hash = '#/home';
  route();
  addBotMessage(`Hi! I can help you find products from ${products.length.toLocaleString()} CSV items. Try: "mobile under 1000", "cosmetics deals", "fashion with video", or "car accessories".`);
}
function bindEvents(){
  window.addEventListener('hashchange', route);
  $('#topSearchForm').addEventListener('submit', e=>{
    e.preventDefault();
    const q = $('#topSearch').value.trim();
    location.hash = '#/search?q=' + encodeURIComponent(q);
  });
  $('#megaTrigger').addEventListener('click',()=>$('#megaMenu').classList.toggle('open'));
  document.addEventListener('click', e=>{
    if(!e.target.closest('.mega-menu') && !e.target.closest('#megaTrigger')) $('#megaMenu').classList.remove('open');
  });
  $('#mobileSearchBtn').addEventListener('click',()=>{$('#topSearch').focus(); scrollTo({top:0,behavior:'smooth'});});
  $('#openBot').addEventListener('click',()=>$('#chatbot').classList.add('open'));
  $('#closeBot').addEventListener('click',()=>$('#chatbot').classList.remove('open'));
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
  else renderHome();
}
function renderMega(){
  state.activeMega = categories[0]?.slug;
  const panel = $('#megaMenu');
  panel.innerHTML = `<div class="mega-grid">
    <div class="mega-tabs">${categories.map((c,i)=>`<button class="mega-tab ${i===0?'active':''}" data-mega="${c.slug}">${esc(c.name)} <small>(${c.count})</small></button>`).join('')}</div>
    <div id="megaMain"></div>
    <div class="mega-tags">${topTags.slice(0,28).map(t=>`<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)}</a>`).join('')}</div>
  </div>`;
  function draw(slugName){
    const c = categories.find(x=>x.slug===slugName) || categories[0];
    const list = productsForCategory(c.slug);
    const featured = list.find(p=>img(p)) || list[0];
    $('#megaMain').innerHTML = `<div class="mega-feature">
      <img src="${esc(img(featured))}" alt="${esc(c.name)}" onerror="this.src=fallbackImg">
      <div>
        <span class="eyebrow">Visual category</span>
        <h2>${esc(c.name)}</h2>
        <p>${c.count.toLocaleString()} products. Browse by sub-category, tags, image style and best deal.</p>
        <a class="primary-btn" href="#/category/${c.slug}">Open ${esc(c.name)}</a>
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
function renderHome(){
  const flash = getDeals().slice(0,8);
  const heroProducts = flash.slice(0,3);
  const deal = flash[0] || products[0];
  $('#app').innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">Blastic marketplace powered by your CSV</span>
        <h1>Everything <span class="gradient-text">Milaga.</span><br>Sasta <span class="gradient-text">Milaga.</span></h1>
        <p>Discover ${products.length.toLocaleString()} products across ${categories.length} visual categories. Search by image mood, category, tag, price, brand/store and stock status.</p>
        <div class="hero-actions">
          <a class="primary-btn" href="#/deals">Shop Flash Deals</a>
          <a class="ghost-btn" href="#/category/${categories[0]?.slug||''}">Explore Categories</a>
          <button class="ghost-btn" onclick="document.querySelector('#openBot').click()">Ask Sasta AI</button>
        </div>
      </div>
      <div class="hero-float-grid">
        ${heroProducts.map(p=>`<a class="float-card" href="#/product/${p._slug}"><img src="${esc(img(p))}" onerror="this.src=fallbackImg" alt="${esc(p.n)}"><b>${esc(p.n)}</b></a>`).join('')}
      </div>
      <div class="blast-badge">Best Price<br>Blast ⚡</div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Shop by image categories</h2><p>Categories are generated from <b>category_main</b> in your product CSV.</p></div>
        <a class="ghost-btn" href="#/search?q=">View all</a>
      </div>
      <div class="card-grid">
        ${categories.slice(0,15).map(categoryCard).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div><h2>Flash sales</h2><p>Strike-through prices, neon discount badges and quick-cart actions.</p></div>
        <span class="eyebrow" id="countdown">Sale refreshes soon</span>
      </div>
      <div class="products-row">${flash.slice(0,4).map(productCard).join('')}</div>
    </section>

    <section class="section">
      <div class="deal-layout">
        <div class="detail-panel">
          <span class="eyebrow">Deal of the day</span>
          <h2>${esc(deal.n)}</h2>
          <p>${esc(deal.sd || deal.seoD || 'A hot pick from the Sasta Milaga catalog.')}</p>
          <div class="tags-wrap">${(deal.tags||[]).slice(0,8).map(tagLink).join('')}</div>
          <div style="display:flex;align-items:flex-end;gap:14px;margin:18px 0">
            <span class="big-price">${PKR.format(price(deal))}</span>
            ${oldPrice(deal)>price(deal)?`<span class="old-price">${PKR.format(oldPrice(deal))}</span>`:''}
          </div>
          <a class="primary-btn" href="#/product/${deal._slug}">Open Product</a>
        </div>
        <a class="category-card" style="min-height:420px" href="#/product/${deal._slug}">
          <img src="${esc(img(deal))}" alt="${esc(deal.n)}" onerror="this.src=fallbackImg">
          <div><b>${discount(deal) || 'Hot'}% Blastic Deal</b><small>${esc(deal.m)} · ${esc(deal.leaf)}</small></div>
        </a>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Trending tag portals</h2><p>Tags create magazine-style discovery routes instead of boring text navigation.</p></div></div>
      <div class="visual-strip">${topTags.slice(0,32).map(t=>`<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)} <small>${t.count}</small></a>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>Infinite discovery feed</h2><p>Pinterest-style product feed for visual browsing.</p></div></div>
      <div class="masonry">${shuffle(products).slice(0,48).map(masonryCard).join('')}</div>
    </section>
  `;
  startCountdown();
}
function categoryCard(c){
  return `<a class="category-card" href="#/category/${c.slug}">
    <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.src=fallbackImg">
    <div><b>${esc(c.name)}</b><small>${c.count.toLocaleString()} products</small></div>
  </a>`;
}
function renderListing(type, val, qs=''){
  const params = new URLSearchParams(qs||'');
  const qFromUrl = params.get('q') || '';
  const leafFromUrl = params.get('leaf') || '';
  let base = [];
  let title = '';
  let subtitle = '';
  if(type==='category'){
    const cat = categories.find(c=>c.slug===val);
    base = productsForCategory(val);
    if(leafFromUrl) base = base.filter(p=>p._leafSlug===leafFromUrl);
    title = cat?.name || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products in this visual category`;
  }else if(type==='tag'){
    const tag = topTags.find(t=>t.slug===val) || {name:titleCase(unSlug(val))};
    base = productsForTag(val);
    title = `#${tag.name}`;
    subtitle = `${base.length.toLocaleString()} products matched by CSV tags`;
  }else if(type==='store'){
    base = productsForStore(val);
    title = base[0]?.store || titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products from this store/brand`;
  }else if(type==='deals'){
    base = getDeals();
    title = 'Blastic Deals';
    subtitle = 'Discount-heavy, in-stock and image-rich products';
  }else{
    state.filters.q = qFromUrl;
    $('#topSearch').value = qFromUrl;
    base = products;
    title = qFromUrl ? `Search: ${qFromUrl}` : 'Search everything';
    subtitle = 'Search name, category, store, description and tags';
  }
  state.base = base;
  state.filters.q = type==='search' ? qFromUrl : '';
  const heroImg = img(base.find(p=>img(p)) || products[0]);
  $('#app').innerHTML = `
    <section class="hero" style="min-height:360px">
      <div class="hero-content">
        <span class="eyebrow">${type === 'tag' ? 'Tag discovery page' : type === 'category' ? 'Master category page' : 'Visual catalog'}</span>
        <h1>${esc(title)}</h1>
        <p>${esc(subtitle)}. Filter visually with price, tags, stock, video and layout mode.</p>
      </div>
      <div class="blast-badge">${base.length.toLocaleString()}<br>Items</div>
      <div class="hero-float-grid"><span class="float-card" style="right:80px;top:40px"><img src="${esc(heroImg)}" onerror="this.src=fallbackImg"><b>${esc(title)}</b></span></div>
    </section>
    <section class="section listing-shell">
      <aside class="filter-panel">
        <h2>Visual filters</h2>
        <p>Built from CSV fields: category, tags, store, price, stock and video.</p>
        <div class="filter-group">
          <label>Search inside results</label>
          <input id="filterQ" value="${esc(state.filters.q)}" placeholder="Search products...">
        </div>
        <div class="filter-group">
          <label>Price range</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input id="minP" type="number" placeholder="Min">
            <input id="maxP" type="number" placeholder="Max">
          </div>
        </div>
        <div class="filter-group">
          <label>Sort</label>
          <select id="sortBy">
            <option value="relevant">Relevant</option>
            <option value="low">Lowest price</option>
            <option value="high">Highest price</option>
            <option value="discount">Biggest discount</option>
            <option value="new">Newest</option>
            <option value="media">Most visual</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Popular tags</label>
          <div class="chip-cloud" id="filterTags"></div>
        </div>
        <div class="filter-group">
          <label>Store / brand</label>
          <select id="storeFilter"><option value="">All stores</option></select>
        </div>
        <div class="filter-group">
          <label><input id="stockOnly" type="checkbox" style="width:auto"> In stock only</label>
          <label><input id="videoOnly" type="checkbox" style="width:auto"> Video available</label>
        </div>
        <button class="primary-btn" id="applyFilters" style="width:100%;margin-top:14px">Apply Filters</button>
      </aside>
      <div class="content-panel">
        <div class="listing-tools">
          <div><h2 id="resultTitle">${esc(title)}</h2><p id="resultCount">Loading...</p></div>
          <div class="view-toggle">
            <button class="ghost-btn active" data-view="grid">Grid</button>
            <button class="ghost-btn" data-view="list">List</button>
          </div>
        </div>
        <div id="resultGrid" class="products-row"></div>
        <div class="load-more-wrap"><button class="ghost-btn" id="loadMore">Load more blastic products</button></div>
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
    state.limit=60;
    drawResults();
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
function renderPDP(handle){
  const p = byHandle.get(slug(handle)) || products[0];
  const related = products.filter(x=>x.id!==p.id && (x.m===p.m || (x.tags||[]).some(t=>(p.tags||[]).includes(t)))).slice(0,8);
  const media = [...(p.imgs||[]).map(u=>({u,type:'img'})), ...(p.vids||[]).map(u=>({u,type:'video'}))];
  const first = media[0] || {u:fallbackImg,type:'img'};
  document.title = `${p.seoT || p.n} | Sasta Milaga`;
  $('#app').innerHTML = `
    <section class="pdp">
      <div>
        <div class="gallery-panel">
          <div class="gallery-main" id="galleryMain">${mediaElement(first.u, first.type, p.n)}</div>
          <div class="gallery-thumbs">${media.map(m=>`<button data-gallery="${esc(m.u)}" data-type="${m.type}">${mediaElement(m.u,m.type,p.n)}</button>`).join('')}</div>
        </div>
        <div class="detail-panel">
          <div class="breadcrumbs">${(p.path||p.m||'').split('>').map(x=>`<a href="#/search?q=${encodeURIComponent(x.trim())}">${esc(x.trim())}</a>`).join(' › ')}</div>
          <h2>Product details</h2>
          <p>${esc(p.d || p.sd || p.seoD || 'Details coming soon.')}</p>
          <h3>Tags</h3>
          <div class="tags-wrap">${(p.tags||[]).map(tagLink).join('')}</div>
        </div>
      </div>
      <aside class="buy-panel">
        <span class="eyebrow">${esc(p.m)} · ${esc(p.leaf)}</span>
        <h1>${esc(p.n)}</h1>
        <p class="product-meta">Store: <a href="#/store/${p._storeSlug}">${esc(p.store || 'Sasta Milaga')}</a> · SKU ${esc(p.sku||p.id)}</p>
        <div><span class="big-price">${PKR.format(price(p))}</span>${oldPrice(p)>price(p)?` <span class="old-price">${PKR.format(oldPrice(p))}</span>`:''}</div>
        <div class="tags-wrap">${discount(p)?`<span class="tag-chip">-${discount(p)}% deal</span>`:''}<span class="tag-chip">${p.in || num(p.stock)>0 ? 'In stock' : 'Check stock'}</span>${(p.vids||[]).length?'<span class="tag-chip">Video available</span>':''}</div>
        <div class="qty"><button onclick="changeQty(-1)">-</button><b id="qty">1</b><button onclick="changeQty(1)">+</button></div>
        <div class="buy-actions">
          <button class="primary-btn" data-add-cart="${esc(p.id)}">Add to cart</button>
          <a class="ghost-btn" href="#/checkout" onclick="addToCart('${esc(p.id)}',Number(document.querySelector('#qty')?.textContent||1))">Buy now</a>
        </div>
        <button class="ghost-btn" style="width:100%" data-wish="${esc(p.id)}">♡ Save to wishlist</button>
        <p>${esc(p.sd || p.seoD || '')}</p>
      </aside>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>${crossTitle(p)}</h2><p>Matched by same category and CSV tags.</p></div></div>
      <div class="products-row">${related.map(productCard).join('')}</div>
    </section>
  `;
}
function crossTitle(p){
  const m=(p.m||'').toLowerCase();
  if(m.includes('fashion')) return 'Complete the look';
  if(m.includes('home')) return 'Style this space';
  if(m.includes('beauty')) return 'Build your beauty routine';
  if(m.includes('automotive')) return 'Car care bundle';
  return 'Frequently bought together';
}
function changeQty(n){ const q=$('#qty'); q.textContent=Math.max(1, Number(q.textContent||1)+n); }
window.changeQty = changeQty;
function setGallery(url,type){ $('#galleryMain').innerHTML = mediaElement(url,type,$('h1')?.textContent||'Product'); }
function mediaElement(url,type,alt){
  if(type==='video') return `<video src="${esc(url)}" controls muted playsinline></video>`;
  return `<img src="${esc(url||fallbackImg)}" alt="${esc(alt)}" loading="lazy" onerror="this.src=fallbackImg">`;
}
function productCard(p){
  return `<article class="product-card">
    <a href="#/product/${p._slug}" class="product-media">
      ${discount(p)?`<span class="discount">-${discount(p)}%</span>`:''}
      ${(p.vids||[]).length ? `<video src="${esc(p.vids[0])}" poster="${esc(img(p))}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()"></video>` : `<img src="${esc(img(p))}" alt="${esc(p.alt?.[0] || p.n)}" loading="lazy" onerror="this.src=fallbackImg">`}
    </a>
    <div class="product-body">
      <a class="product-title" href="#/product/${p._slug}">${esc(p.n)}</a>
      <div class="product-meta">${esc(p.m)} · ${esc(p.leaf || p.store || '')}</div>
      <div class="tags-wrap">${(p.tags||[]).slice(0,3).map(tagLinkSmall).join('')}</div>
      <div class="price-line">
        <div><div class="price">${PKR.format(price(p))}</div>${oldPrice(p)>price(p)?`<div class="old-price">${PKR.format(oldPrice(p))}</div>`:''}</div>
        <button class="mini-btn" data-wish="${esc(p.id)}">♡</button>
      </div>
      <div class="quick-actions">
        <button data-quick="${esc(p.id)}">Quick view</button>
        <button data-add-cart="${esc(p.id)}">Add</button>
      </div>
    </div>
  </article>`;
}
function masonryCard(p){
  const ratio = 0.75 + ((p._i % 5) * .12);
  return `<div style="--ratio:1/${ratio.toFixed(2)}">${productCard(p)}</div>`;
}
function tagLink(t){ return `<a class="tag-chip" href="#/tag/${slug(t)}">#${esc(t)}</a>`; }
function tagLinkSmall(t){ return `<a class="tag-chip small" href="#/tag/${slug(t)}">#${esc(t)}</a>`; }
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
    if(el) el.textContent = `Flash sale ${h}:${m}:${s}`;
  },1000);
}
function openQuick(id){
  const p = products.find(x=>x.id===id); if(!p) return;
  $('#quickModalBody').innerHTML = `<div class="quick-view">
    <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=fallbackImg">
    <div>
      <span class="eyebrow">${esc(p.m)}</span>
      <h2>${esc(p.n)}</h2>
      <p>${esc(p.sd || p.seoD || '')}</p>
      <div class="big-price">${PKR.format(price(p))}</div>
      <div class="tags-wrap">${(p.tags||[]).slice(0,10).map(tagLink).join('')}</div>
      <div class="buy-actions"><button class="primary-btn" data-add-cart="${esc(p.id)}">Add to cart</button><a class="ghost-btn" href="#/product/${p._slug}">Full details</a></div>
    </div>
  </div>`;
  $('#quickModal').classList.add('open');
  document.body.classList.add('lock');
}
function closeModal(){ $('#quickModal').classList.remove('open'); document.body.classList.remove('lock'); }
function getCart(){ return JSON.parse(localStorage.getItem('sm_cart')||'[]'); }
function setCart(c){ localStorage.setItem('sm_cart',JSON.stringify(c)); updateCounts(); }
function getWish(){ return JSON.parse(localStorage.getItem('sm_wish')||'[]'); }
function setWish(w){ localStorage.setItem('sm_wish',JSON.stringify(w)); updateCounts(); }
function addToCart(id,qty=1){
  const cart = getCart();
  const row = cart.find(x=>x.id===id);
  if(row) row.qty += qty; else cart.push({id,qty});
  setCart(cart); toast('Added to cart');
}
function toggleWish(id){
  let w = getWish();
  w = w.includes(id) ? w.filter(x=>x!==id) : [...w,id];
  setWish(w); toast(w.includes(id) ? 'Saved to wishlist' : 'Removed from wishlist');
}
function updateCounts(){
  if($('#cartCount')) $('#cartCount').textContent = getCart().reduce((a,x)=>a+x.qty,0);
  if($('#wishCount')) $('#wishCount').textContent = getWish().length;
}
function renderCart(){
  const cart = getCart();
  const rows = cart.map(x=>({item:products.find(p=>p.id===x.id),qty:x.qty})).filter(x=>x.item);
  const sub = rows.reduce((a,x)=>a+price(x.item)*x.qty,0);
  $('#app').innerHTML = `<section class="section"><div class="section-head"><div><h2>Your cart</h2><p>Image-first checkout basket with localStorage cart.</p></div></div>
    ${rows.length ? `<div class="cart-layout"><div>${rows.map(({item,qty})=>cartLine(item,qty)).join('')}</div>${summaryBox(sub)}</div>` : empty('Your cart is empty','Shop deals','#/deals')}</section>`;
}
function cartLine(p,qty){
  return `<div class="cart-line">
    <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=fallbackImg">
    <div><b>${esc(p.n)}</b><p>${esc(p.m)} · ${esc(p.leaf)}</p><div class="price">${PKR.format(price(p))}</div></div>
    <div><div class="qty"><button onclick="cartQty('${esc(p.id)}',-1)">-</button><b>${qty}</b><button onclick="cartQty('${esc(p.id)}',1)">+</button></div><button class="ghost-btn" onclick="removeCart('${esc(p.id)}')">Remove</button></div>
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
  return `<aside class="summary-box"><h2>Order summary</h2>
    <div class="summary-row"><span>Subtotal</span><b>${PKR.format(sub)}</b></div>
    <div class="summary-row"><span>Delivery</span><b>${delivery?PKR.format(delivery):'Free'}</b></div>
    <div class="summary-row"><span>Total</span><b>${PKR.format(total)}</b></div>
    <a class="primary-btn" style="width:100%;justify-content:center;display:flex;margin-top:14px" href="#/checkout">Checkout</a>
  </aside>`;
}
function renderWishlist(){
  const ids = getWish();
  const list = products.filter(p=>ids.includes(p.id));
  $('#app').innerHTML = `<section class="section"><div class="section-head"><div><h2>Wishlist</h2><p>Saved products, price watching and fast cart transfer.</p></div></div>
  ${list.length ? `<div class="products-row">${list.map(productCard).join('')}</div>` : empty('Wishlist is empty','Explore categories','#/home')}</section>`;
}
function renderCheckout(){
  const rows = getCart().map(x=>({item:products.find(p=>p.id===x.id),qty:x.qty})).filter(x=>x.item);
  const sub = rows.reduce((a,x)=>a+price(x.item)*x.qty,0);
  $('#app').innerHTML = `<section class="section">
    <div class="section-head"><div><span class="eyebrow">Cart → Details → Payment → Confirm</span><h2>Fast checkout</h2><p>Conversion-focused checkout structure with COD-friendly fields.</p></div></div>
    <div class="checkout-layout">
      <form class="detail-panel form-grid" onsubmit="event.preventDefault(); toast('Demo order captured locally. Connect Code.gs for Google Sheets orders.');">
        <input required placeholder="Full name">
        <input required placeholder="Phone">
        <input placeholder="Email">
        <select><option>Cash on Delivery</option><option>Bank transfer</option><option>Wallet</option></select>
        <textarea required placeholder="Complete delivery address"></textarea>
        <textarea placeholder="Order notes"></textarea>
        <button class="primary-btn" style="grid-column:1/-1">Place order</button>
      </form>
      ${summaryBox(sub)}
    </div>
  </section>`;
}
function empty(title, cta, href){ return `<div class="empty-state"><h2>${esc(title)}</h2><p>Everything is image-led and searchable.</p><a class="primary-btn" href="${href}">${esc(cta)}</a></div>`; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2200); }

function addBotMessage(html,user=false){
  const div=document.createElement('div');
  div.className='chat-msg'+(user?' user':'');
  div.innerHTML = user ? esc(html) : html;
  $('#chatLog').appendChild(div);
  $('#chatLog').scrollTop = $('#chatLog').scrollHeight;
}
function answerBot(q){
  const l = q.toLowerCase();
  let max = (l.match(/under\s*(rs\.?|pkr)?\s*(\d+)/i)||[])[2];
  let min = (l.match(/over\s*(rs\.?|pkr)?\s*(\d+)/i)||[])[2];
  let arr = products.filter(p=>p._search.includes(l) || l.split(/\s+/).some(w=>w.length>3 && p._search.includes(w)));
  const cat = categories.find(c=>l.includes(c.name.toLowerCase()) || l.includes(c.slug.replaceAll('-',' ')));
  if(cat) arr = productsForCategory(cat.slug);
  const tag = topTags.find(t=>l.includes(t.name.toLowerCase()) || l.includes(t.slug.replaceAll('-',' ')));
  if(tag) arr = productsForTag(tag.slug);
  if(max) arr = arr.filter(p=>price(p)<=Number(max));
  if(min) arr = arr.filter(p=>price(p)>=Number(min));
  if(l.includes('video')) arr = arr.filter(p=>(p.vids||[]).length);
  if(l.includes('stock') || l.includes('available')) arr = arr.filter(p=>p.in || num(p.stock)>0);
  if(l.includes('deal') || l.includes('discount') || l.includes('sale')) arr = arr.sort((a,b)=>discount(b)-discount(a));
  else arr = arr.sort((a,b)=>price(a)-price(b));
  arr = arr.slice(0,5);
  if(!arr.length){
    addBotMessage(`I could not find an exact match. Try a broader tag like <b>cosmetics</b>, <b>mobile</b>, <b>home decor</b>, <b>fashion</b>, or <b>car accessories</b>.`);
    return;
  }
  addBotMessage(`<div>I found <b>${arr.length}</b> strong matches. Tap any product to open details:</div>
    <div class="chat-products">${arr.map(p=>`<a class="chat-product" href="#/product/${p._slug}">
      <img src="${esc(img(p))}" onerror="this.src=fallbackImg">
      <span><b>${esc(p.n)}</b><br><small>${PKR.format(price(p))} · ${esc(p.m)}</small></span>
    </a>`).join('')}</div>`);
}
window.fallbackImg = fallbackImg;
init();
