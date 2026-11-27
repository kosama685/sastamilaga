/* ═══════════════════════════════════════════════════════════
   SASTA MILAGA – app.js v4.0 CORPORATE LIGHT EDITION
   Full SPA router · Blog CMS · Color Customizer · SEO/AEO/GEO
   ═══════════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────
   0. COLOUR CUSTOMIZER (Admin Panel)
   Allows easy palette changes without
   touching the XML. Store in localStorage.
────────────────────────────────────────── */
const COLOR_DEFAULTS = {
  '--primary':     '#1a6b3a',
  '--primary-dk':  '#134f2b',
  '--primary-lt':  '#d4edde',
  '--accent':      '#2a9d5c',
  '--accent-lt':   '#e6f5ec',
  '--gold':        '#d4a017',
  '--gold-dk':     '#a87a0e',
  '--gold-lt':     '#fff8e6',
  '--gold2':       '#f5c842',
  '--sky':         '#1f7fbf',
  '--sky-lt':      '#e8f4fd',
  '--bg':          '#f8faf8',
  '--bg2':         '#ffffff',
  '--bg3':         '#eef7f1',
};

function applyColors(map) {
  const root = document.documentElement;
  Object.entries(map).forEach(([k, v]) => root.style.setProperty(k, v));
}

function loadColors() {
  try {
    const saved = JSON.parse(localStorage.getItem('sm_colors') || '{}');
    applyColors({ ...COLOR_DEFAULTS, ...saved });
  } catch (_) {
    applyColors(COLOR_DEFAULTS);
  }
}
loadColors();

function saveColors(map) {
  try {
    const prev = JSON.parse(localStorage.getItem('sm_colors') || '{}');
    localStorage.setItem('sm_colors', JSON.stringify({ ...prev, ...map }));
  } catch (_) {}
}

function resetColors() {
  localStorage.removeItem('sm_colors');
  applyColors(COLOR_DEFAULTS);
}

/* ──────────────────────────────────────────
   1. CONSTANTS & STATE
────────────────────────────────────────── */
const APP  = document.getElementById('app');
const SITE_NAME = 'Sasta Milaga';
const SITE_URL  = 'https://sastamilaga.com';

const State = {
  cart:     JSON.parse(localStorage.getItem('sm_cart')     || '[]'),
  wishlist: JSON.parse(localStorage.getItem('sm_wishlist') || '[]'),
  blogPosts: JSON.parse(localStorage.getItem('sm_blog')   || '[]'),
};

function saveCart()     { localStorage.setItem('sm_cart', JSON.stringify(State.cart)); }
function saveWishlist() { localStorage.setItem('sm_wishlist', JSON.stringify(State.wishlist)); }
function saveBlog()     { localStorage.setItem('sm_blog', JSON.stringify(State.blogPosts)); }

function updateCounts() {
  const cc = document.getElementById('cartCount');
  const wc = document.getElementById('wishCount');
  if (cc) cc.textContent = State.cart.reduce((a,i) => a + i.qty, 0);
  if (wc) wc.textContent = State.wishlist.length;
}
updateCounts();

/* ──────────────────────────────────────────
   2. SEO / AEO / GEO HELPERS
────────────────────────────────────────── */
function setMeta(opts = {}) {
  const {
    title = SITE_NAME,
    desc  = "Pakistan's most affordable marketplace for fashion, beauty, home, electronics, groceries & automotive.",
    url   = SITE_URL,
    image = SITE_URL + '/sasta-milaga-logo-final.png',
    type  = 'website',
    ldJson = null,
  } = opts;

  document.title = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  const setMT = (sel, attr, val) => {
    let el = document.querySelector(sel);
    if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
    el.setAttribute(attr, val);
  };

  setMT('[name="description"]', 'content', desc);
  setMT('[property="og:title"]',       'content', document.title);
  setMT('[property="og:description"]', 'content', desc);
  setMT('[property="og:url"]',         'content', url);
  setMT('[property="og:image"]',       'content', image);
  setMT('[property="og:type"]',        'content', type);
  setMT('[name="twitter:title"]',      'content', document.title);
  setMT('[name="twitter:description"]','content', desc);

  // Canonical
  let canon = document.querySelector('link[rel="canonical"]');
  if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
  canon.href = url;

  // Dynamic JSON-LD
  if (ldJson) {
    const el = document.getElementById('ld-dynamic');
    if (el) el.textContent = JSON.stringify(ldJson);
  }
}

function buildProductLD(p) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.desc || p.title,
    image: p.img,
    sku: p.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: p.price,
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/#/product/${p.id}`,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
    aggregateRating: p.rating ? {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviews || 1,
    } : undefined,
  };
}

function buildBlogLD(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.img || '',
    datePublished: post.date,
    dateModified: post.updatedAt || post.date,
    author: { '@type': 'Person', name: post.author || SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: SITE_URL + '/sasta-milaga-logo-final.png' },
    },
    url: `${SITE_URL}/#/blog/${post.slug}`,
    mainEntityOfPage: `${SITE_URL}/#/blog/${post.slug}`,
  };
}

/* ──────────────────────────────────────────
   3. SAMPLE DATA (pulled from products.js
   via window.PRODUCTS if available)
────────────────────────────────────────── */
const PRODUCTS = window.PRODUCTS || generateSampleProducts();

function generateSampleProducts() {
  const cats = ['Fashion','Beauty','Electronics','Home','Groceries','Automotive','Sports','Toys'];
  const list = [];
  for (let i = 1; i <= 80; i++) {
    const cat = cats[i % cats.length];
    list.push({
      id: `prod-${i}`,
      title: `${cat} Product ${i} – Premium Quality`,
      price: Math.floor(500 + Math.random() * 9500),
      oldPrice: Math.floor(700 + Math.random() * 11000),
      discount: Math.floor(10 + Math.random() * 45),
      img: `https://picsum.photos/seed/${i}/400/400`,
      category: cat,
      rating: (3.5 + Math.random() * 1.5).toFixed(1),
      reviews: Math.floor(20 + Math.random() * 480),
      tags: [cat, 'Sale', 'Popular'],
      isNew: i % 7 === 0,
      desc: `High-quality ${cat.toLowerCase()} product with premium features. Trusted by thousands of customers across Pakistan.`,
    });
  }
  return list;
}

/* ──────────────────────────────────────────
   4. CATEGORIES
────────────────────────────────────────── */
const CATEGORIES = [
  { slug:'fashion',     label:'Fashion',     icon:'👗', sub:'Clothing, Shoes, Accessories', img:'https://picsum.photos/seed/cat1/400/500', count: '3.2K+ items' },
  { slug:'beauty',      label:'Beauty',      icon:'💄', sub:'Skincare, Makeup, Fragrance',   img:'https://picsum.photos/seed/cat2/400/500', count: '1.8K+ items' },
  { slug:'electronics', label:'Electronics', icon:'📱', sub:'Mobiles, Laptops, Gadgets',     img:'https://picsum.photos/seed/cat3/400/500', count: '2.5K+ items' },
  { slug:'home',        label:'Home',        icon:'🏠', sub:'Furniture, Decor, Kitchen',     img:'https://picsum.photos/seed/cat4/400/500', count: '2.1K+ items' },
  { slug:'groceries',   label:'Groceries',   icon:'🛒', sub:'Fresh, Organic, Imported',      img:'https://picsum.photos/seed/cat5/400/500', count: '1.4K+ items' },
  { slug:'automotive',  label:'Automotive',  icon:'🚗', sub:'Parts, Accessories, Tools',     img:'https://picsum.photos/seed/cat6/400/500', count: '980+ items' },
  { slug:'sports',      label:'Sports',      icon:'⚽', sub:'Equipment, Fitness, Outdoor',   img:'https://picsum.photos/seed/cat7/400/500', count: '760+ items' },
  { slug:'toys',        label:'Toys',        icon:'🧸', sub:'Kids, Games, Educational',      img:'https://picsum.photos/seed/cat8/400/500', count: '640+ items' },
];

/* ──────────────────────────────────────────
   5. UI HELPERS
────────────────────────────────────────── */
function toast(msg, dur = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}

function render(html) {
  APP.innerHTML = html;
  APP.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function formatPKR(n) {
  return 'PKR ' + Number(n).toLocaleString('en-PK');
}

function stars(r) {
  const full = Math.floor(r);
  const half = r - full >= .5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half);
}

function slug(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function dateStr(iso) {
  return new Date(iso).toLocaleDateString('en-PK', { year:'numeric', month:'long', day:'numeric' });
}

/* ──────────────────────────────────────────
   6. COMPONENT: PRODUCT CARD
────────────────────────────────────────── */
function renderProductCard(p, mode = 'grid') {
  const inWish = State.wishlist.some(w => w.id === p.id);
  return `
  <article class="product-card" role="article" itemscope itemtype="https://schema.org/Product">
    <a class="product-media" href="#/product/${p.id}" itemprop="url" aria-label="${p.title}">
      <img src="${p.img}" alt="${p.title}" loading="lazy" itemprop="image"/>
      ${p.discount ? `<span class="discount">-${p.discount}%</span>` : ''}
      ${p.isNew ? `<span class="badge-new">New</span>` : ''}
      <button class="wishlist-btn ${inWish ? 'active' : ''}" data-wish="${p.id}"
        aria-label="${inWish ? 'Remove from wishlist' : 'Add to wishlist'}"
        aria-pressed="${inWish}">${inWish ? '♥' : '♡'}</button>
    </a>
    <div class="product-body">
      <p class="product-meta" itemprop="brand">${p.category}</p>
      <h3 class="product-title" itemprop="name">${p.title}</h3>
      <div class="rating-stars" aria-label="${p.rating} out of 5 stars"
        itemprop="aggregateRating" itemscope itemtype="https://schema.org/AggregateRating">
        <span itemprop="ratingValue">${stars(+p.rating)}</span>
        <span class="rating-count" itemprop="reviewCount">(${p.reviews})</span>
      </div>
      <div class="price-line" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
        <div>
          <span class="old-price" aria-label="Original price">${formatPKR(p.oldPrice)}</span>
          <span class="price" itemprop="price" content="${p.price}" aria-label="Sale price">${formatPKR(p.price)}</span>
          <meta itemprop="priceCurrency" content="PKR"/>
        </div>
      </div>
      <div class="quick-actions">
        <button data-quick="${p.id}">Quick View</button>
        <button class="add-cart-btn" data-cart="${p.id}">Add to Cart</button>
      </div>
    </div>
  </article>`;
}

/* ──────────────────────────────────────────
   7. COMPONENT: TICKER
────────────────────────────────────────── */
function renderTicker() {
  const items = ['🔥 Mega Sale – Up to 70% Off','✦ Free Delivery on Orders above PKR 999','✦ 13,000+ Products In-Stock','✦ Karachi · Lahore · Islamabad · All Cities','✦ Authentic Products Guaranteed','✦ Easy 7-Day Returns','✦ Eid Sale Now Live','✦ New Arrivals Daily'];
  const doubled = [...items, ...items];
  return `<div class="ticker-wrap" aria-label="Promotional announcements" role="marquee">
    <div class="ticker-inner" aria-hidden="true">
      ${doubled.map(i => `<span class="ticker-item">${i}</span>`).join('')}
    </div>
  </div>`;
}

/* ──────────────────────────────────────────
   8. HOME PAGE
────────────────────────────────────────── */
function renderHome() {
  setMeta({
    title: `${SITE_NAME} – Pakistan's Best Prices on Fashion, Electronics & More`,
    desc: "Shop Pakistan's most affordable marketplace. 13,000+ products in fashion, beauty, electronics, home, groceries & automotive. Delivery across all cities.",
    ldJson: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: `${SITE_NAME} – Home`,
      url: SITE_URL,
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.hero h1', '.hero p'],
      },
    }
  });

  const featured = PRODUCTS.slice(0, 8);
  const deals    = PRODUCTS.slice(8, 16);
  const trending = PRODUCTS.filter(p => p.category === 'Electronics').slice(0, 8);

  render(`
  ${renderTicker()}

  <!-- HERO -->
  <section class="hero" aria-labelledby="hero-heading">
    <span class="eyebrow" aria-label="Featured promotion">🇵🇰 Pakistan's #1 Affordable Marketplace</span>
    <h1 id="hero-heading">
      Shop<br/>
      <span class="gradient-text">Sasta.</span>
      Live<br/>
      <span class="gradient-gold">Better.</span>
    </h1>
    <p>Discover 13,000+ products at Pakistan's best prices. Fashion, beauty, electronics, home, groceries, automotive — all in one place, delivered fast to your door.</p>
    <div class="hero-actions">
      <a class="primary-btn" href="#/deals" aria-label="View today's deals">⚡ Today's Deals</a>
      <a class="ghost-btn" href="#/search?q=" aria-label="Browse all products">Explore All Products →</a>
    </div>
    <div class="hero-stats" role="list" aria-label="Key statistics">
      <div class="hero-stat-item" role="listitem">
        <span class="hero-stat-num">13K+</span>
        <span class="hero-stat-label">Products</span>
      </div>
      <div class="hero-stat-item" role="listitem">
        <span class="hero-stat-num">50+</span>
        <span class="hero-stat-label">Cities</span>
      </div>
      <div class="hero-stat-item" role="listitem">
        <span class="hero-stat-num">4.8★</span>
        <span class="hero-stat-label">Rating</span>
      </div>
      <div class="hero-stat-item" role="listitem">
        <span class="hero-stat-num">2.1M+</span>
        <span class="hero-stat-label">Customers</span>
      </div>
    </div>
    <div class="hero-float-grid" aria-hidden="true">
      <div class="float-card">
        <img src="https://picsum.photos/seed/float1/200/200" alt=""/>
        <span>Summer Dress</span>
        <span class="fc-price">PKR 1,299</span>
        <span class="fc-badge">35% OFF</span>
      </div>
      <div class="float-card">
        <img src="https://picsum.photos/seed/float2/200/200" alt=""/>
        <span>Smartwatch</span>
        <span class="fc-price">PKR 4,499</span>
        <span class="fc-badge">New</span>
      </div>
    </div>
    <div class="blast-badge" aria-label="Limited deal">🔥 Deal of the Day upto 70% OFF</div>
  </section>

  <!-- TRUST BADGES -->
  <section class="trust-strip" aria-label="Our guarantees">
    <div class="trust-item">
      <div class="trust-icon" aria-hidden="true">🚚</div>
      <div class="trust-text">
        <b>Free Delivery</b>
        <span>On orders above PKR 999</span>
      </div>
    </div>
    <div class="trust-item">
      <div class="trust-icon" aria-hidden="true">🔒</div>
      <div class="trust-text">
        <b>Secure Payment</b>
        <span>100% protected checkout</span>
      </div>
    </div>
    <div class="trust-item">
      <div class="trust-icon" aria-hidden="true">↩️</div>
      <div class="trust-text">
        <b>Easy Returns</b>
        <span>7-day hassle-free returns</span>
      </div>
    </div>
    <div class="trust-item">
      <div class="trust-icon" aria-hidden="true">✅</div>
      <div class="trust-text">
        <b>Genuine Products</b>
        <span>100% authenticity guaranteed</span>
      </div>
    </div>
    <div class="trust-item">
      <div class="trust-icon" aria-hidden="true">📞</div>
      <div class="trust-text">
        <b>24/7 Support</b>
        <span>Chat, call, or WhatsApp</span>
      </div>
    </div>
  </section>

  <!-- CATEGORIES -->
  <section class="section" aria-labelledby="cat-heading">
    <div class="section-head">
      <div>
        <span class="section-badge">Browse by Category</span>
        <h2 id="cat-heading">Shop by <span>Category</span></h2>
        <p>From fashion to automotive — find everything you need</p>
      </div>
      <a class="ghost-btn" href="#/search?q=">View All →</a>
    </div>
    <div class="card-grid" role="list">
      ${CATEGORIES.map(c => `
      <a class="category-card" href="#/category/${c.slug}" role="listitem"
        aria-label="${c.label}: ${c.sub}">
        <img src="${c.img}" alt="${c.label}" loading="lazy"/>
        <div>
          <b>${c.icon} ${c.label}</b>
          <small>${c.count}</small>
        </div>
        <span class="cat-badge">${c.sub.split(',')[0]}</span>
      </a>`).join('')}
    </div>
  </section>

  <!-- FEATURED PRODUCTS -->
  <section class="section" aria-labelledby="featured-heading">
    <div class="section-head">
      <div>
        <span class="section-badge">Handpicked for You</span>
        <h2 id="featured-heading">Featured <span>Products</span></h2>
        <p>Top picks at unbeatable prices</p>
      </div>
      <a class="ghost-btn" href="#/search?q=">View All →</a>
    </div>
    <div class="products-row" role="list">
      ${featured.map(p => renderProductCard(p)).join('')}
    </div>
  </section>

  <!-- DEAL BANNERS -->
  <section class="section deal-layout" aria-label="Special offers">
    <div class="deal-banner" style="background: linear-gradient(135deg, #e8f5ed, #d0f0e0);">
      <h3>⚡ Flash Sale</h3>
      <p>Limited time offers on top electronics. Don't miss out!</p>
      <div class="countdown" id="countdown1" aria-label="Time remaining">
        <div class="cd-unit"><span class="cd-num" id="cd1-h">08</span><span class="cd-label">Hours</span></div>
        <div class="cd-unit"><span class="cd-num" id="cd1-m">42</span><span class="cd-label">Mins</span></div>
        <div class="cd-unit"><span class="cd-num" id="cd1-s">17</span><span class="cd-label">Secs</span></div>
      </div>
      <a class="primary-btn" href="#/deals" style="margin-top: 16px; display: inline-flex;">Shop Flash Sale →</a>
    </div>
    <div class="deal-banner" style="background: linear-gradient(135deg, #fff8e6, #fdefc6);">
      <h3>🌟 Weekend Special</h3>
      <p>Extra 20% off on fashion & beauty this weekend only!</p>
      <a class="gold-btn" href="#/category/fashion" style="margin-top: 12px; display: inline-flex;">Shop Fashion →</a>
      <a class="ghost-btn" href="#/category/beauty" style="margin-top: 8px; display: inline-flex;">Shop Beauty →</a>
    </div>
  </section>

  <!-- TRENDING ELECTRONICS -->
  <section class="section" aria-labelledby="trending-heading">
    <div class="section-head">
      <div>
        <span class="section-badge">Hot Right Now</span>
        <h2 id="trending-heading">Trending <span>Electronics</span></h2>
      </div>
      <a class="ghost-btn" href="#/category/electronics">View All →</a>
    </div>
    <div class="products-row" role="list">
      ${trending.map(p => renderProductCard(p)).join('')}
    </div>
  </section>

  <!-- BLOG PREVIEW -->
  <section class="section" aria-labelledby="blog-preview-heading">
    <div class="section-head">
      <div>
        <span class="section-badge">Latest Articles</span>
        <h2 id="blog-preview-heading">From Our <span>Blog</span></h2>
        <p>Shopping tips, style guides & Pakistan market insights</p>
      </div>
      <a class="ghost-btn" href="#/blog">All Posts →</a>
    </div>
    ${renderBlogPreviewGrid()}
  </section>

  <!-- DEALS PRODUCTS -->
  <section class="section" aria-labelledby="deals-heading">
    <div class="section-head">
      <div>
        <span class="section-badge">Best Value</span>
        <h2 id="deals-heading">Today's <span>Best Deals</span></h2>
      </div>
      <a class="ghost-btn" href="#/deals">All Deals →</a>
    </div>
    <div class="products-row" role="list">
      ${deals.map(p => renderProductCard(p)).join('')}
    </div>
  </section>
  `);

  startCountdown();
  bindProductEvents();
}

/* ──────────────────────────────────────────
   9. COUNTDOWN TIMER
────────────────────────────────────────── */
function startCountdown() {
  let h = 8, m = 42, s = 17;
  const hEl = document.getElementById('cd1-h');
  const mEl = document.getElementById('cd1-m');
  const sEl = document.getElementById('cd1-s');
  if (!hEl) return;
  const t = setInterval(() => {
    s--;
    if (s < 0) { s = 59; m--; }
    if (m < 0) { m = 59; h--; }
    if (h < 0) { clearInterval(t); return; }
    hEl.textContent = String(h).padStart(2, '0');
    mEl.textContent = String(m).padStart(2, '0');
    sEl.textContent = String(s).padStart(2, '0');
  }, 1000);
}

/* ──────────────────────────────────────────
   10. BLOG SYSTEM
────────────────────────────────────────── */
const SAMPLE_POSTS = [
  {
    id: 'post-1', slug: 'best-affordable-fashion-pakistan-2025',
    title: 'Best Affordable Fashion Picks in Pakistan for 2025',
    excerpt: 'Discover the top budget-friendly fashion trends taking over Pakistani markets this year, from lawn prints to street style.',
    content: `<p>Pakistan's fashion scene has exploded with affordable options that don't compromise on style. Whether you're looking for <strong>lawn prints</strong>, casual streetwear, or formal attire, there's something for every budget.</p>
<h2>Top Trends for 2025</h2>
<p>This year's fashion calendar is dominated by earthy tones, oversized silhouettes, and sustainable fabric choices. Local brands have stepped up significantly, offering international-quality garments at a fraction of the import price.</p>
<h2>Where to Shop Smart</h2>
<p>Platforms like Sasta Milaga aggregate deals from across Pakistan's biggest marketplaces, making it easy to compare prices and find the best value. Always check for seasonal sales in Eid, Independence Day, and end-of-season periods.</p>
<blockquote>Shopping smart doesn't mean compromising on style — it means knowing where to look and when to buy.</blockquote>
<h2>Budget Breakdown</h2>
<p>Here's how Pakistani shoppers can stretch their fashion budgets:</p>
<ul>
<li>Casual daily wear: PKR 500–1,500 per outfit</li>
<li>Formal/festive wear: PKR 2,000–5,000</li>
<li>Premium brands: PKR 5,000–15,000</li>
</ul>`,
    author: 'Sasta Editorial', date: '2025-05-15', img: 'https://picsum.photos/seed/blog1/800/450',
    category: 'Fashion', readTime: 5,
  },
  {
    id: 'post-2', slug: 'electronics-buying-guide-pakistan',
    title: 'Electronics Buying Guide: What to Look for in Pakistan',
    excerpt: 'Navigating Pakistan's electronics market can be tricky. Here's your complete guide to finding authentic products at the best prices.',
    content: `<p>Pakistan's electronics market is vast and varied. From imported flagship phones to locally assembled laptops, the choices can be overwhelming — and the risk of counterfeit products is real.</p>
<h2>Mobile Phones</h2>
<p>For smartphones, always check PTA approval status. A phone without PTA registration will be blocked after 60 days of use. Look for grey-market indicators like missing warranty cards or mismatched IMEI numbers.</p>
<h2>Laptops & Computers</h2>
<p>Locally assembled laptops offer excellent value. Brands like Axiom and Haier have strong after-sales networks. For international brands, always buy from authorized resellers.</p>
<h2>Smart Home Devices</h2>
<p>Smart plugs, security cameras, and LED strips have gained massive popularity. Look for locally supported brands to ensure app compatibility and customer service.</p>`,
    author: 'Tech Team', date: '2025-04-28', img: 'https://picsum.photos/seed/blog2/800/450',
    category: 'Electronics', readTime: 7,
  },
  {
    id: 'post-3', slug: 'beauty-skincare-tips-pakistan-climate',
    title: 'Skincare Tips Tailored for Pakistan's Climate',
    excerpt: 'Pakistan's hot, humid summers and dry winters demand a skincare routine that adapts. Here's what dermatologists recommend.',
    content: `<p>Pakistan's diverse climate — from the scorching heat of Sindh to the freezing winters of KPK — means your skincare routine needs to be flexible and locally aware.</p>
<h2>Summer Essentials</h2>
<p>High SPF sunscreen is non-negotiable during Pakistan's summer months. Look for lightweight, non-comedogenic formulas that won't clog pores in the humidity. Local brands like <em>Hemani</em> and imported options from Korea are both excellent choices.</p>
<h2>Winter Care</h2>
<p>In winter, switch to richer moisturizers. Shea butter-based creams work well for the dry northern regions. Always use a gentle cleanser to avoid stripping the skin's natural barrier.</p>`,
    author: 'Beauty Desk', date: '2025-03-10', img: 'https://picsum.photos/seed/blog3/800/450',
    category: 'Beauty', readTime: 4,
  },
  {
    id: 'post-4', slug: 'grocery-shopping-tips-save-money-pakistan',
    title: 'Smart Grocery Shopping: Save Up to 40% in Pakistan',
    excerpt: 'Expert tips on reducing your monthly grocery bill without sacrificing quality. From bulk buying to local market hacks.',
    content: `<p>With rising inflation, smart grocery shopping has become essential for Pakistani households. Here are proven strategies to reduce your monthly food expenditure.</p>
<h2>Buy Seasonal Produce</h2>
<p>Pakistan's agricultural calendar is rich. Mangoes, guavas, citrus — buying in season means better quality at 30-50% lower prices than off-season.</p>
<h2>Bulk Buying</h2>
<p>Staples like flour (atta), rice, lentils (dal), and cooking oil are significantly cheaper when bought in larger quantities. Look for family-sized packaging.</p>`,
    author: 'Deals Team', date: '2025-02-18', img: 'https://picsum.photos/seed/blog4/800/450',
    category: 'Groceries', readTime: 6,
  },
];

function getAllPosts() {
  return [...SAMPLE_POSTS, ...State.blogPosts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderBlogPreviewGrid() {
  const posts = getAllPosts().slice(0, 3);
  return `<div class="blog-grid">
    ${posts.map(p => `
    <article class="blog-card" itemscope itemtype="https://schema.org/BlogPosting">
      <a class="blog-card-img" href="#/blog/${p.slug}" aria-label="${p.title}">
        <img src="${p.img}" alt="${p.title}" loading="lazy" itemprop="image"/>
      </a>
      <div class="blog-card-body">
        <span class="blog-cat" itemprop="articleSection">${p.category}</span>
        <h3 itemprop="name"><a href="#/blog/${p.slug}" itemprop="url">${p.title}</a></h3>
        <p class="blog-excerpt" itemprop="description">${p.excerpt}</p>
        <div class="blog-meta">
          <b itemprop="author">${p.author}</b>
          <span>·</span>
          <time itemprop="datePublished" datetime="${p.date}">${dateStr(p.date)}</time>
          <span>·</span>
          <span>${p.readTime} min read</span>
        </div>
      </div>
    </article>`).join('')}
  </div>`;
}

/* ── BLOG LIST PAGE ── */
function renderBlog() {
  const posts = getAllPosts();
  setMeta({
    title: `Blog – Shopping Tips & Style Guides | ${SITE_NAME}`,
    desc: 'Explore Pakistan shopping tips, style guides, electronics advice, beauty tutorials, and deals insights from the Sasta Milaga team.',
    url: SITE_URL + '/#/blog',
    ldJson: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: `${SITE_NAME} Blog`,
      url: SITE_URL + '/#/blog',
      description: 'Shopping tips, style guides and market insights for Pakistan.',
    }
  });

  const [featured, ...rest] = posts;

  render(`
  <div class="section">
    <div class="section-head">
      <div>
        <span class="section-badge">Knowledge Hub</span>
        <h2>Our <span>Blog</span></h2>
        <p>Expert tips, style guides & deals intelligence from Pakistan's affordable marketplace</p>
      </div>
      <button class="primary-btn" onclick="navigate('#/admin/blog/new')">✍ Write Post</button>
    </div>

    ${featured ? `
    <article class="blog-featured" itemscope itemtype="https://schema.org/BlogPosting">
      <a class="blog-card-img" href="#/blog/${featured.slug}" aria-label="Featured: ${featured.title}">
        <img src="${featured.img}" alt="${featured.title}" itemprop="image"/>
      </a>
      <div class="blog-card-body">
        <span class="blog-cat" itemprop="articleSection">${featured.category}</span>
        <h2 style="font-family:'Playfair Display',serif;font-size:1.8rem;margin-bottom:12px;" itemprop="name">
          <a href="#/blog/${featured.slug}">${featured.title}</a>
        </h2>
        <p class="blog-excerpt" itemprop="description">${featured.excerpt}</p>
        <div class="blog-meta" style="margin-top:16px;">
          <b itemprop="author">${featured.author}</b>
          <span>·</span>
          <time datetime="${featured.date}">${dateStr(featured.date)}</time>
          <span>·</span>
          <span>${featured.readTime} min read</span>
        </div>
        <a class="primary-btn" href="#/blog/${featured.slug}" style="margin-top:18px;display:inline-flex;">Read Article →</a>
      </div>
    </article>` : ''}

    <div class="blog-grid" style="margin-top:22px;">
      ${rest.map(p => `
      <article class="blog-card" itemscope itemtype="https://schema.org/BlogPosting">
        <a class="blog-card-img" href="#/blog/${p.slug}">
          <img src="${p.img}" alt="${p.title}" loading="lazy" itemprop="image"/>
        </a>
        <div class="blog-card-body">
          <span class="blog-cat">${p.category}</span>
          <h3 itemprop="name"><a href="#/blog/${p.slug}">${p.title}</a></h3>
          <p class="blog-excerpt" itemprop="description">${p.excerpt}</p>
          <div class="blog-meta">
            <b>${p.author}</b> · <time datetime="${p.date}">${dateStr(p.date)}</time> · ${p.readTime} min
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <a class="ghost-btn" href="#/blog/${p.slug}" style="padding:8px 16px;font-size:.8rem;">Read More →</a>
            ${State.blogPosts.find(b => b.id === p.id) ? `<button class="ghost-btn" style="padding:8px 14px;font-size:.8rem;" onclick="editPost('${p.id}')">Edit</button>` : ''}
          </div>
        </div>
      </article>`).join('')}
    </div>
  </div>`);
}

/* ── SINGLE BLOG POST ── */
function renderBlogPost(postSlug) {
  const post = getAllPosts().find(p => p.slug === postSlug);
  if (!post) { renderHome(); return; }

  setMeta({
    title: post.title + ' | ' + SITE_NAME,
    desc: post.excerpt,
    url: SITE_URL + '/#/blog/' + post.slug,
    image: post.img,
    type: 'article',
    ldJson: buildBlogLD(post),
  });

  const recent = getAllPosts().filter(p => p.slug !== post.slug).slice(0, 3);

  render(`
  <div class="blog-layout">
    <main>
      <article itemscope itemtype="https://schema.org/BlogPosting">
        <div class="article-header">
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="#/home">Home</a> › <a href="#/blog">Blog</a> › <span>${post.category}</span>
          </nav>
          <span class="blog-cat" itemprop="articleSection">${post.category}</span>
          <h1 style="font-family:'Playfair Display',serif;font-size:clamp(1.8rem,4vw,2.8rem);margin:14px 0;line-height:1.15;" itemprop="name">${post.title}</h1>
          <div class="blog-meta" style="font-size:.88rem;">
            <b itemprop="author">${post.author}</b>
            <span>·</span>
            <time itemprop="datePublished" datetime="${post.date}">${dateStr(post.date)}</time>
            <span>·</span>
            <span>${post.readTime} min read</span>
          </div>
        </div>
        <div class="article-hero">
          <img src="${post.img}" alt="${post.title}" itemprop="image"/>
        </div>
        <div class="article-body" itemprop="articleBody">${post.content}</div>

        <!-- Share -->
        <div class="share-bar" role="group" aria-label="Share this article">
          <span>Share this article:</span>
          <a class="share-btn whatsapp" href="https://wa.me/?text=${encodeURIComponent(post.title + ' ' + SITE_URL + '/#/blog/' + post.slug)}" rel="noopener" target="_blank">📱 WhatsApp</a>
          <a class="share-btn facebook" href="https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL + '/#/blog/' + post.slug)}" rel="noopener" target="_blank">👍 Facebook</a>
          <a class="share-btn twitter" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(SITE_URL + '/#/blog/' + post.slug)}" rel="noopener" target="_blank">🐦 Twitter</a>
          <button class="share-btn copy-link" onclick="navigator.clipboard.writeText(window.location.href);toast('Link copied!')">🔗 Copy Link</button>
        </div>
      </article>

      <!-- Related Products -->
      <section style="margin-top:32px;" aria-label="Related products">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:16px;">Shop Related ${post.category}</h3>
        <div class="products-row">
          ${PRODUCTS.filter(p => p.category === post.category).slice(0, 4).map(p => renderProductCard(p)).join('')}
        </div>
      </section>
    </main>

    <aside class="blog-sidebar">
      <!-- Recent Posts -->
      <div class="sidebar-widget">
        <h4>Recent Posts</h4>
        ${recent.map(p => `
        <div class="recent-post-item">
          <img src="${p.img}" alt="${p.title}" loading="lazy"/>
          <div>
            <h5><a href="#/blog/${p.slug}">${p.title}</a></h5>
            <span>${dateStr(p.date)}</span>
          </div>
        </div>`).join('')}
      </div>

      <!-- Categories -->
      <div class="sidebar-widget">
        <h4>Categories</h4>
        <div class="chip-cloud">
          ${[...new Set(getAllPosts().map(p => p.category))].map(cat =>
            `<a class="tag-chip" href="#/blog?cat=${cat}">${cat}</a>`
          ).join('')}
        </div>
      </div>

      <!-- Newsletter -->
      <div class="sidebar-widget" style="background:var(--primary-lt);border-color:var(--primary);">
        <h4 style="color:var(--primary);">📬 Newsletter</h4>
        <p style="font-size:.84rem;color:var(--text3);margin-bottom:12px;">Get weekly deals & tips in your inbox</p>
        <input placeholder="Your email address" type="email" style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:white;padding:10px 12px;margin-bottom:8px;font-family:inherit;font-size:.88rem;outline:none;"/>
        <button class="primary-btn" style="width:100%;justify-content:center;">Subscribe →</button>
      </div>
    </aside>
  </div>`);

  bindProductEvents();
}

/* ── BLOG ADMIN (New/Edit Post) ── */
function renderBlogAdmin(editId = null) {
  const post = editId ? State.blogPosts.find(p => p.id === editId) : null;
  setMeta({ title: `${editId ? 'Edit' : 'New'} Blog Post | ${SITE_NAME}` });

  render(`
  <div class="section" style="max-width:800px;margin:0 auto;">
    <div class="section-head">
      <h2>${editId ? 'Edit' : 'Write New'} <span>Blog Post</span></h2>
      <a class="ghost-btn" href="#/blog">← Back to Blog</a>
    </div>
    <div class="form-section">
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Post Title *</label>
          <input id="blog-title" type="text" placeholder="Enter your blog post title"
            value="${post ? post.title : ''}"
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:1rem;color:var(--text);outline:none;"/>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Category *</label>
          <select id="blog-cat" style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:.92rem;color:var(--text);outline:none;">
            ${['Fashion','Beauty','Electronics','Home','Groceries','Automotive','Sports','Deals','Tips'].map(c =>
              `<option ${post && post.category === c ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Featured Image URL</label>
          <input id="blog-img" type="url" placeholder="https://example.com/image.jpg"
            value="${post ? post.img : ''}"
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:.92rem;color:var(--text);outline:none;"/>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Excerpt / Description * (for SEO)</label>
          <textarea id="blog-excerpt" rows="3" placeholder="Brief summary for search engines and social sharing..."
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:.92rem;color:var(--text);outline:none;resize:vertical;">${post ? post.excerpt : ''}</textarea>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Author Name</label>
          <input id="blog-author" type="text" placeholder="Your name"
            value="${post ? post.author : ''}"
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:.92rem;color:var(--text);outline:none;"/>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Read Time (minutes)</label>
          <input id="blog-readtime" type="number" placeholder="5" min="1" max="60"
            value="${post ? post.readTime : '5'}"
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:12px 14px;font-family:inherit;font-size:.92rem;color:var(--text);outline:none;"/>
        </div>
        <div>
          <label style="display:block;font-weight:700;font-size:.84rem;color:var(--text2);margin-bottom:6px;">Post Content (HTML supported) *</label>
          <textarea id="blog-content" rows="18" placeholder="Write your blog post here. You can use basic HTML tags like &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;blockquote&gt;, &lt;strong&gt;, &lt;em&gt;..."
            style="width:100%;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:14px;font-family:'Courier New',monospace;font-size:.88rem;color:var(--text);outline:none;resize:vertical;">${post ? post.content : ''}</textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="primary-btn" onclick="saveBlogPost('${editId || ''}')">
            ${editId ? '💾 Update Post' : '🚀 Publish Post'}
          </button>
          ${editId ? `<button class="ghost-btn" style="border-color:#e53e3e;color:#c53030;" onclick="deleteBlogPost('${editId}')">🗑 Delete Post</button>` : ''}
          <a class="ghost-btn" href="#/blog">Cancel</a>
        </div>
      </div>
    </div>
  </div>`);
}

window.saveBlogPost = function(editId) {
  const title   = document.getElementById('blog-title')?.value.trim();
  const cat     = document.getElementById('blog-cat')?.value;
  const img     = document.getElementById('blog-img')?.value.trim();
  const excerpt = document.getElementById('blog-excerpt')?.value.trim();
  const content = document.getElementById('blog-content')?.value.trim();
  const author  = document.getElementById('blog-author')?.value.trim() || SITE_NAME;
  const rt      = parseInt(document.getElementById('blog-readtime')?.value) || 5;

  if (!title || !excerpt || !content) { toast('⚠️ Please fill in required fields'); return; }

  const postSlug = slug(title);
  const now  = new Date().toISOString().split('T')[0];

  if (editId) {
    const idx = State.blogPosts.findIndex(p => p.id === editId);
    if (idx > -1) {
      State.blogPosts[idx] = { ...State.blogPosts[idx], title, category:cat, img, excerpt, content, author, readTime:rt, slug:postSlug, updatedAt:now };
    }
  } else {
    State.blogPosts.unshift({
      id: 'post-' + Date.now(), slug: postSlug,
      title, category: cat, img: img || `https://picsum.photos/seed/${Date.now()}/800/450`,
      excerpt, content, author, readTime: rt, date: now,
    });
  }

  saveBlog();
  toast(editId ? '✅ Post updated!' : '🎉 Post published!');
  navigate('#/blog');
};

window.deleteBlogPost = function(id) {
  if (!confirm('Delete this post permanently?')) return;
  State.blogPosts = State.blogPosts.filter(p => p.id !== id);
  saveBlog();
  toast('Post deleted');
  navigate('#/blog');
};

window.editPost = function(id) {
  navigate('#/admin/blog/' + id);
};

/* ──────────────────────────────────────────
   11. COLOUR CUSTOMIZER PAGE
────────────────────────────────────────── */
function renderColorCustomizer() {
  setMeta({ title: `Theme Customizer | ${SITE_NAME}` });
  const saved = JSON.parse(localStorage.getItem('sm_colors') || '{}');
  const cur = { ...COLOR_DEFAULTS, ...saved };

  const colorGroups = [
    { label: 'Brand Colors', tokens: ['--primary', '--primary-dk', '--primary-lt', '--accent', '--accent-lt'] },
    { label: 'Gold Accents', tokens: ['--gold', '--gold-dk', '--gold-lt', '--gold2'] },
    { label: 'Sky / Info',   tokens: ['--sky', '--sky-lt'] },
    { label: 'Backgrounds',  tokens: ['--bg', '--bg2', '--bg3'] },
  ];

  render(`
  <div class="section" style="max-width:860px;margin:0 auto;">
    <div class="section-head">
      <div>
        <span class="section-badge">Admin Tool</span>
        <h2>🎨 Theme <span>Customizer</span></h2>
        <p>Change brand colors without editing the XML theme code.</p>
      </div>
      <a class="ghost-btn" href="#/home">← Back to Site</a>
    </div>

    ${colorGroups.map(g => `
    <div class="form-section" style="margin-bottom:18px;">
      <h3>${g.label}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">
        ${g.tokens.map(token => `
        <label style="display:flex;flex-direction:column;gap:7px;">
          <span style="font-size:.78rem;font-weight:700;color:var(--text3);">${token}</span>
          <div style="display:flex;align-items:center;gap:9px;">
            <input type="color" id="${token.replace(/--/,'cc-')}" value="${cur[token]}"
              style="width:44px;height:36px;border:1.5px solid var(--line2);border-radius:var(--r-sm);cursor:pointer;padding:2px;"
              onchange="livePreviewColor('${token}',this.value)"/>
            <input type="text" value="${cur[token]}" id="${token.replace(/--/,'ct-')}"
              style="flex:1;border:1.5px solid var(--line2);border-radius:var(--r-sm);background:var(--bg3);padding:8px 10px;font-family:monospace;font-size:.84rem;color:var(--text);outline:none;"
              oninput="document.getElementById('${token.replace(/--/,'cc-')}').value=this.value;livePreviewColor('${token}',this.value)"/>
          </div>
        </label>`).join('')}
      </div>
    </div>`).join('')}

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;">
      <button class="primary-btn" onclick="applyAndSaveColors()">💾 Save & Apply Theme</button>
      <button class="ghost-btn" onclick="resetColorsAndRefresh()">↺ Reset to Default</button>
    </div>

    <!-- Preview -->
    <div class="form-section" style="margin-top:24px;">
      <h3>Live Preview</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;">
        <button class="primary-btn">Primary Button</button>
        <button class="ghost-btn">Ghost Button</button>
        <button class="gold-btn">Gold Button</button>
      </div>
      <div style="margin-top:14px;display:flex;flex-wrap:wrap;gap:8px;">
        <span class="tag-chip">Tag Chip</span>
        <span class="section-badge">Section Badge</span>
        <span class="blog-cat">Blog Category</span>
      </div>
      <div style="margin-top:14px;background:var(--primary-lt);border:1px solid var(--primary);border-radius:var(--r);padding:16px;color:var(--primary);">
        Primary light background preview
      </div>
      <div style="margin-top:10px;background:var(--gold-lt);border:1px solid var(--gold);border-radius:var(--r);padding:16px;color:var(--gold-dk);">
        Gold accent background preview
      </div>
    </div>
  </div>`);
}

window.livePreviewColor = function(token, value) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value) || /^rgba?\(/.test(value)) {
    document.documentElement.style.setProperty(token, value);
  }
};

window.applyAndSaveColors = function() {
  const saved = {};
  Object.keys(COLOR_DEFAULTS).forEach(token => {
    const el = document.getElementById(token.replace(/--/, 'ct-'));
    if (el) saved[token] = el.value;
  });
  saveColors(saved);
  applyColors(saved);
  toast('🎨 Theme saved successfully!');
};

window.resetColorsAndRefresh = function() {
  resetColors();
  toast('↺ Theme reset to default');
  setTimeout(() => navigate('#/admin/colors'), 300);
};

/* ──────────────────────────────────────────
   12. SEARCH PAGE
────────────────────────────────────────── */
function renderSearch(q = '', page = 1) {
  const PER_PAGE = 16;
  const results  = q
    ? PRODUCTS.filter(p =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        p.category.toLowerCase().includes(q.toLowerCase()) ||
        (p.tags || []).some(t => t.toLowerCase().includes(q.toLowerCase()))
      )
    : PRODUCTS;

  const total = results.length;
  const pages = Math.ceil(total / PER_PAGE);
  const slice = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  setMeta({
    title: q ? `"${q}" – Search Results | ${SITE_NAME}` : `All Products | ${SITE_NAME}`,
    desc: q ? `Find the best prices for "${q}" in Pakistan on ${SITE_NAME}.` : `Browse all ${PRODUCTS.length}+ products on ${SITE_NAME}.`,
    ldJson: {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      name: `Search: ${q || 'All Products'}`,
    }
  });

  render(`
  <div class="section">
    <div class="listing-shell">
      <!-- Filter Panel -->
      <aside class="filter-panel" role="search" aria-label="Filter products">
        <h4>Filters</h4>
        <div class="filter-group">
          <label>Search</label>
          <input type="text" id="searchInput" placeholder="Search products…" value="${q}"
            onkeydown="if(event.key==='Enter'){navigate('#/search?q='+encodeURIComponent(this.value))}"/>
        </div>
        <div class="filter-group">
          <label>Category</label>
          <select id="catFilter" onchange="navigate('#/category/'+this.value)">
            <option value="">All Categories</option>
            ${CATEGORIES.map(c => `<option value="${c.slug}">${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="filter-group">
          <label>Min Price (PKR)</label>
          <input type="number" id="minPrice" placeholder="0" min="0"/>
        </div>
        <div class="filter-group">
          <label>Max Price (PKR)</label>
          <input type="number" id="maxPrice" placeholder="50000" max="100000"/>
        </div>
        <div class="filter-group">
          <label>Sort By</label>
          <select id="sortFilter">
            <option>Relevance</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Top Rated</option>
            <option>Most Reviewed</option>
            <option>Newest</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Popular Tags</label>
          <div class="chip-cloud">
            ${[...new Set(PRODUCTS.flatMap(p => p.tags || []))].slice(0, 20).map(t =>
              `<button class="tag-chip small" onclick="navigate('#/search?q=${encodeURIComponent(t)}')">${t}</button>`
            ).join('')}
          </div>
        </div>
      </aside>

      <!-- Content -->
      <div class="content-panel">
        <div class="listing-tools">
          <p style="color:var(--text3);font-size:.9rem;">
            <b style="color:var(--text);">${total.toLocaleString()} products</b>
            ${q ? ` matching "<b style="color:var(--primary);">${q}</b>"` : ''}
          </p>
          <div class="view-toggle">
            <button class="ghost-btn active" aria-label="Grid view" aria-pressed="true">⊞</button>
            <button class="ghost-btn" aria-label="List view" aria-pressed="false">☰</button>
          </div>
        </div>

        ${slice.length ? `
        <div class="products-row" role="list">
          ${slice.map(p => renderProductCard(p)).join('')}
        </div>
        <div class="load-more-wrap">
          ${page < pages ? `<button class="primary-btn" onclick="navigate('#/search?q=${encodeURIComponent(q)}&page=${page+1}')">Load More (${(total - page*PER_PAGE)} remaining) →</button>` : ''}
          <p style="color:var(--muted);font-size:.8rem;margin-top:12px;">Showing ${Math.min(page*PER_PAGE,total)} of ${total} products</p>
        </div>` : `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <h2>No products found</h2>
          <p>Try different keywords or browse our categories</p>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap;">
            ${CATEGORIES.slice(0, 4).map(c => `<a class="tag-chip" href="#/category/${c.slug}">${c.icon} ${c.label}</a>`).join('')}
          </div>
        </div>`}
      </div>
    </div>
  </div>`);

  bindProductEvents();
}

/* ──────────────────────────────────────────
   13. CATEGORY PAGE
────────────────────────────────────────── */
function renderCategory(catSlug, page = 1) {
  const cat  = CATEGORIES.find(c => c.slug === catSlug);
  const name = cat ? cat.label : catSlug.replace(/-/g, ' ');
  const prods = PRODUCTS.filter(p => p.category.toLowerCase() === name.toLowerCase());
  const PER_PAGE = 16;
  const slice = prods.slice((page-1)*PER_PAGE, page*PER_PAGE);

  setMeta({
    title: `${name} – Best Prices in Pakistan | ${SITE_NAME}`,
    desc: `Shop ${name} at Pakistan's best prices on ${SITE_NAME}. ${prods.length}+ products with fast delivery.`,
    ldJson: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${name} – ${SITE_NAME}`,
      description: `Browse ${prods.length}+ ${name} products in Pakistan.`,
    }
  });

  render(`
  <div class="section">
    <div class="section-head">
      <div>
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="#/home">Home</a> › <span>${name}</span>
        </nav>
        <h2>${cat ? cat.icon : ''} <span>${name}</span></h2>
        <p>${prods.length} products available in Pakistan</p>
      </div>
      <a class="ghost-btn" href="#/search?q=${encodeURIComponent(name)}">All ${name} →</a>
    </div>
    ${slice.length ? `
    <div class="products-row" role="list">
      ${slice.map(p => renderProductCard(p)).join('')}
    </div>
    <div class="load-more-wrap">
      ${(page * PER_PAGE) < prods.length ? `<button class="primary-btn" onclick="navigate('#/category/${catSlug}?page=${page+1}')">Load More →</button>` : ''}
    </div>` : `
    <div class="empty-state">
      <span class="empty-icon">${cat ? cat.icon : '📦'}</span>
      <h2>Coming Soon</h2>
      <p>${name} products arriving soon. Check back later!</p>
    </div>`}
  </div>`);

  bindProductEvents();
}

/* ──────────────────────────────────────────
   14. PRODUCT DETAIL PAGE
────────────────────────────────────────── */
function renderProduct(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) { renderHome(); return; }

  setMeta({
    title: p.title + ' | ' + SITE_NAME,
    desc: p.desc || p.title,
    image: p.img,
    type: 'product',
    ldJson: buildProductLD(p),
  });

  const related = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);

  render(`
  <article class="pdp" itemscope itemtype="https://schema.org/Product">
    <!-- Gallery + Details Left -->
    <div>
      <div>
        <div class="gallery-panel">
          <div class="gallery-main" id="mainImg">
            <img src="${p.img}" alt="${p.title}" id="mainImgEl" itemprop="image"/>
          </div>
          <div class="gallery-thumbs">
            ${[p.img, p.img.replace('/400/', '/401/'), p.img.replace('/400/', '/402/'), p.img.replace('/400/', '/403/')].map((src,i) =>
              `<button class="${i===0?'active':''}" onclick="switchImg('${src}',this)" aria-label="View image ${i+1}">
                <img src="${src}" alt="View ${i+1}" loading="lazy"/>
              </button>`
            ).join('')}
          </div>
        </div>
        <div class="detail-panel">
          <h3 style="font-size:.84rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--text3);margin-bottom:12px;">Product Details</h3>
          <table style="width:100%;font-size:.87rem;border-collapse:collapse;">
            ${[['Category',p.category],['Rating',`${p.rating}★ (${p.reviews} reviews)`],['SKU',p.id],['Availability','In Stock'],['Delivery','Free above PKR 999']].map(([k,v]) =>
              `<tr><td style="padding:9px 0;border-bottom:1px solid var(--divider);color:var(--text3);font-weight:700;width:40%;">${k}</td>
               <td style="padding:9px 0;border-bottom:1px solid var(--divider);color:var(--text);">${v}</td></tr>`
            ).join('')}
          </table>
          <div class="tags-wrap" style="margin-top:14px;">
            ${(p.tags||[]).map(t => `<span class="tag-chip small">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Buy Panel Right -->
    <div class="buy-panel">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <a href="#/home">Home</a> › <a href="#/category/${slug(p.category)}">${p.category}</a> › Product
      </nav>
      ${p.discount ? `<span class="discount" style="position:static;display:inline-block;margin-bottom:8px;">-${p.discount}% OFF</span>` : ''}
      <h1 itemprop="name">${p.title}</h1>
      <div class="rating-stars" style="margin:8px 0;">
        ${stars(+p.rating)} <span class="rating-count">(${p.reviews} reviews)</span>
      </div>
      <div itemprop="offers" itemscope itemtype="https://schema.org/Offer" style="margin:14px 0;">
        <meta itemprop="priceCurrency" content="PKR"/>
        <meta itemprop="price" content="${p.price}"/>
        <meta itemprop="availability" content="https://schema.org/InStock"/>
        <span class="old-price">${formatPKR(p.oldPrice)}</span>
        <span class="big-price">${formatPKR(p.price)}</span>
        <p style="color:var(--accent);font-size:.84rem;font-weight:700;margin-top:4px;">
          You save ${formatPKR(p.oldPrice - p.price)} (${p.discount}%)
        </p>
      </div>
      <div class="qty" aria-label="Quantity selector">
        <button onclick="changeQty(-1)" aria-label="Decrease quantity">−</button>
        <b id="qtyVal" aria-live="polite">1</b>
        <button onclick="changeQty(1)" aria-label="Increase quantity">+</button>
      </div>
      <div class="buy-actions">
        <button class="primary-btn add-cart-btn" data-cart="${p.id}" style="flex:1;justify-content:center;">🛒 Add to Cart</button>
        <button class="ghost-btn" data-wish="${p.id}" aria-label="Add to wishlist">♡</button>
      </div>
      <a class="gold-btn" href="#/checkout" style="width:100%;justify-content:center;display:flex;margin-top:8px;">⚡ Buy Now</a>

      <!-- Trust chips -->
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px;">
        <span class="tag-chip small">🔒 Secure Checkout</span>
        <span class="tag-chip small">🚚 Fast Delivery</span>
        <span class="tag-chip small">↩️ 7-Day Return</span>
        <span class="tag-chip small">✅ Genuine Product</span>
      </div>

      <!-- Share -->
      <div class="share-bar">
        <span>Share:</span>
        <a class="share-btn whatsapp" href="https://wa.me/?text=${encodeURIComponent(p.title + ' ' + SITE_URL)}" rel="noopener" target="_blank">📱 WhatsApp</a>
        <a class="share-btn facebook" href="https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}" rel="noopener" target="_blank">👍 Facebook</a>
        <button class="share-btn copy-link" onclick="navigator.clipboard.writeText(window.location.href);toast('Link copied!')">🔗 Copy</button>
      </div>
    </div>
  </article>

  <!-- Related Products -->
  ${related.length ? `
  <section class="section" aria-labelledby="related-heading">
    <div class="section-head">
      <h2 id="related-heading">Related <span>Products</span></h2>
    </div>
    <div class="products-row" role="list">
      ${related.map(x => renderProductCard(x)).join('')}
    </div>
  </section>` : ''}`);

  bindProductEvents();
}

window.changeQty = function(d) {
  const el = document.getElementById('qtyVal');
  if (el) el.textContent = Math.max(1, (+el.textContent) + d);
};
window.switchImg = function(src, btn) {
  const el = document.getElementById('mainImgEl');
  if (el) el.src = src;
  document.querySelectorAll('.gallery-thumbs button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
};

/* ──────────────────────────────────────────
   15. DEALS PAGE
────────────────────────────────────────── */
function renderDeals() {
  setMeta({
    title: `Today's Best Deals | ${SITE_NAME}`,
    desc: `Shop today's biggest deals in Pakistan. Up to 70% off on electronics, fashion, beauty, home & groceries.`,
  });
  const deals = PRODUCTS.filter(p => p.discount > 30).slice(0, 24);
  render(`
  <div class="section">
    <div class="section-head">
      <div>
        <span class="section-badge">Limited Time</span>
        <h2>⚡ Best <span>Deals</span> Today</h2>
        <p>${deals.length} deals ending soon. Don't miss out!</p>
      </div>
    </div>
    <div class="products-row" role="list">
      ${deals.map(p => renderProductCard(p)).join('')}
    </div>
  </div>`);
  bindProductEvents();
}

/* ──────────────────────────────────────────
   16. WISHLIST
────────────────────────────────────────── */
function renderWishlist() {
  setMeta({ title: `Wishlist | ${SITE_NAME}` });
  const items = PRODUCTS.filter(p => State.wishlist.some(w => w.id === p.id));
  render(`
  <div class="section">
    <div class="section-head">
      <h2>♡ My <span>Wishlist</span></h2>
      <p>${items.length} saved item${items.length !== 1 ? 's' : ''}</p>
    </div>
    ${items.length ? `
    <div class="products-row" role="list">${items.map(p => renderProductCard(p)).join('')}</div>` : `
    <div class="empty-state">
      <span class="empty-icon">♡</span>
      <h2>Your wishlist is empty</h2>
      <p>Save items you love by clicking the heart icon</p>
      <a class="primary-btn" href="#/home" style="margin-top:18px;display:inline-flex;">Start Shopping →</a>
    </div>`}
  </div>`);
  bindProductEvents();
}

/* ──────────────────────────────────────────
   17. CART
────────────────────────────────────────── */
function renderCart() {
  setMeta({ title: `Cart | ${SITE_NAME}` });
  const items = State.cart.map(ci => ({ ...ci, ...PRODUCTS.find(p => p.id === ci.id) }));
  const subtotal = items.reduce((a,i) => a + i.price * i.qty, 0);
  const delivery = subtotal >= 999 ? 0 : 150;
  const total = subtotal + delivery;

  render(`
  <div class="section">
    <h2 style="font-family:'Playfair Display',serif;margin-bottom:24px;">🛒 Shopping <span style="color:var(--primary);">Cart</span></h2>
    ${items.length ? `
    <div class="cart-layout">
      <div>
        ${items.map(i => `
        <div class="cart-line" role="article">
          <img src="${i.img}" alt="${i.title}" loading="lazy"/>
          <div>
            <p style="font-weight:700;font-size:.92rem;margin-bottom:4px;">${i.title}</p>
            <p style="color:var(--text3);font-size:.8rem;">${i.category}</p>
            <div class="qty" style="margin:8px 0;display:inline-flex;">
              <button onclick="updateCart('${i.id}',-1)" aria-label="Decrease">−</button>
              <b>${i.qty}</b>
              <button onclick="updateCart('${i.id}',1)" aria-label="Increase">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <p style="font-weight:800;color:var(--primary);">${formatPKR(i.price * i.qty)}</p>
            <button onclick="removeFromCart('${i.id}')" style="color:var(--muted);font-size:.78rem;border:0;background:none;cursor:pointer;margin-top:6px;">✕ Remove</button>
          </div>
        </div>`).join('')}
      </div>
      <div class="summary-box">
        <h3 style="font-weight:800;margin-bottom:16px;">Order Summary</h3>
        <div class="summary-row"><span>Subtotal (${State.cart.reduce((a,i) => a+i.qty,0)} items)</span><span>${formatPKR(subtotal)}</span></div>
        <div class="summary-row"><span>Delivery</span><span>${delivery === 0 ? '<span style="color:var(--accent);">FREE</span>' : formatPKR(delivery)}</span></div>
        <div class="summary-row summary-total"><b>Total</b><b>${formatPKR(total)}</b></div>
        ${delivery > 0 ? `<p style="color:var(--accent);font-size:.8rem;margin-top:8px;">Add PKR ${formatPKR(999-subtotal)} more for free delivery!</p>` : ''}
        <a class="primary-btn" href="#/checkout" style="display:flex;justify-content:center;margin-top:18px;">Proceed to Checkout →</a>
        <a class="ghost-btn" href="#/home" style="display:flex;justify-content:center;margin-top:10px;">← Continue Shopping</a>
      </div>
    </div>` : `
    <div class="empty-state">
      <span class="empty-icon">🛒</span>
      <h2>Your cart is empty</h2>
      <p>Add some items to get started</p>
      <a class="primary-btn" href="#/home" style="margin-top:18px;display:inline-flex;">Start Shopping →</a>
    </div>`}
  </div>`);
}

window.updateCart = function(id, delta) {
  const item = State.cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) State.cart = State.cart.filter(i => i.id !== id);
  }
  saveCart(); updateCounts(); renderCart();
};
window.removeFromCart = function(id) {
  State.cart = State.cart.filter(i => i.id !== id);
  saveCart(); updateCounts(); renderCart(); toast('Item removed from cart');
};

/* ──────────────────────────────────────────
   18. CHECKOUT
────────────────────────────────────────── */
function renderCheckout() {
  setMeta({ title: `Checkout | ${SITE_NAME}` });
  render(`
  <div class="section">
    <h2 style="font-family:'Playfair Display',serif;margin-bottom:24px;">Secure <span style="color:var(--primary);">Checkout</span></h2>
    <div class="checkout-layout">
      <div>
        <div class="form-section">
          <h3>📦 Delivery Information</h3>
          <div class="form-grid">
            <input type="text" placeholder="First Name *" required/>
            <input type="text" placeholder="Last Name *" required/>
            <input type="email" placeholder="Email Address *" required/>
            <input type="tel" placeholder="Phone Number * (e.g. 0300-1234567)" required/>
            <input type="text" placeholder="Full Address *" style="grid-column:1/-1;" required/>
            <select><option>Karachi</option><option>Lahore</option><option>Islamabad</option><option>Rawalpindi</option><option>Peshawar</option><option>Quetta</option><option>Multan</option><option>Faisalabad</option><option>Hyderabad</option><option>Other</option></select>
            <select><option>Sindh</option><option>Punjab</option><option>KPK</option><option>Balochistan</option><option>AJK</option><option>GB</option></select>
            <textarea placeholder="Special instructions or notes (optional)" rows="3"></textarea>
          </div>
        </div>
        <div class="form-section">
          <h3>💳 Payment Method</h3>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${[['💵','Cash on Delivery','Pay when your order arrives. Safe & trusted.'],['📱','Easypaisa / JazzCash','Mobile wallet instant payment.'],['🏦','Bank Transfer','Direct bank or HBL / MCB transfer.']].map(([icon,name,desc]) => `
            <label style="display:flex;align-items:flex-start;gap:12px;border:1.5px solid var(--line2);border-radius:var(--r);padding:14px;cursor:pointer;transition:.2s;">
              <input type="radio" name="payment" style="margin-top:2px;"/> 
              <span style="font-size:1.2rem;">${icon}</span>
              <div>
                <b style="display:block;font-weight:800;font-size:.92rem;">${name}</b>
                <span style="color:var(--text3);font-size:.8rem;">${desc}</span>
              </div>
            </label>`).join('')}
          </div>
        </div>
        <button class="primary-btn" style="width:100%;justify-content:center;padding:16px;" onclick="placeOrder()">🚀 Place Order (${formatPKR(State.cart.reduce((a,i) => { const p=PRODUCTS.find(x=>x.id===i.id); return a+(p?p.price*i.qty:0); }, 0))})</button>
      </div>
      <div class="summary-box">
        <h3 style="font-weight:800;margin-bottom:16px;">Your Order</h3>
        ${State.cart.map(ci => { const p = PRODUCTS.find(x => x.id === ci.id); return p ? `
        <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--divider);">
          <img src="${p.img}" alt="${p.title}" style="width:52px;height:52px;object-fit:cover;border-radius:var(--r-sm);"/>
          <div style="flex:1;"><p style="font-size:.84rem;font-weight:700;line-height:1.35;">${p.title}</p><p style="color:var(--text3);font-size:.78rem;">Qty: ${ci.qty}</p></div>
          <span style="font-weight:700;font-size:.88rem;color:var(--primary);">${formatPKR(p.price*ci.qty)}</span>
        </div>` : ''; }).join('')}
        <div class="summary-row summary-total" style="margin-top:12px;"><b>Total</b><b style="color:var(--primary);">${formatPKR(State.cart.reduce((a,i)=>{ const p=PRODUCTS.find(x=>x.id===i.id); return a+(p?p.price*i.qty:0); },0))}</b></div>
      </div>
    </div>
  </div>`);
}

window.placeOrder = function() {
  State.cart = []; saveCart(); updateCounts();
  toast('🎉 Order placed! You will receive a confirmation call.');
  setTimeout(() => navigate('#/home'), 2000);
};

/* ──────────────────────────────────────────
   19. FAQ
────────────────────────────────────────── */
function renderFAQ() {
  setMeta({
    title: `Frequently Asked Questions | ${SITE_NAME}`,
    desc: 'Find answers to common questions about ordering, delivery, returns, and payments on Sasta Milaga Pakistan.',
    ldJson: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        { '@type':'Question', name:'How do I order?', acceptedAnswer:{ '@type':'Answer', text:'Browse products, add to cart, and proceed to checkout. Fill in delivery details and choose payment method.' } },
        { '@type':'Question', name:'Is cash on delivery available?', acceptedAnswer:{ '@type':'Answer', text:'Yes! COD is available across all major cities in Pakistan.' } },
      ]
    }
  });

  const faqs = [
    ['How do I place an order?', 'Browse our 13,000+ products, add items to your cart, and click "Proceed to Checkout". Fill in your delivery details, choose your payment method (Cash on Delivery, Easypaisa, or Bank Transfer), and click "Place Order". You\'ll receive a confirmation call within 24 hours.'],
    ['Is Cash on Delivery available?', 'Yes! COD is available across all major Pakistani cities including Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Quetta, Multan, Faisalabad, Hyderabad, and Sialkot.'],
    ['How long does delivery take?', 'Standard delivery takes 3-5 working days for major cities and 5-7 days for other areas. Express delivery (1-2 days) is available in select cities.'],
    ['What is your return policy?', 'We offer a 7-day hassle-free return policy. If you\'re not satisfied with your purchase, contact our support team within 7 days of delivery. Items must be unused and in original packaging.'],
    ['Are the products genuine?', 'Yes, 100%. We only source from verified sellers and authorized distributors. All products are quality-checked before dispatch.'],
    ['Is there free delivery?', 'Yes! Orders above PKR 999 qualify for free standard delivery. For orders below PKR 999, a delivery charge of PKR 150 applies.'],
    ['How do I track my order?', 'After your order is shipped, you\'ll receive an SMS with your tracking number. You can track your order on our website under the "Track Order" section.'],
    ['Can I cancel my order?', 'Orders can be cancelled within 2 hours of placement. After that, please wait for delivery and initiate a return if needed.'],
    ['Which payment methods are accepted?', 'We accept Cash on Delivery (COD), Easypaisa, JazzCash, and direct bank transfer (HBL, MCB, UBL, Meezan Bank).'],
    ['Do you deliver internationally?', 'Currently, we only deliver within Pakistan. We cover 50+ cities across all provinces.'],
  ];

  render(`
  <div class="section" style="max-width:900px;margin:0 auto;">
    <div class="section-head" style="text-align:center;display:block;margin-bottom:32px;">
      <span class="section-badge">Help Center</span>
      <h2>Frequently Asked <span>Questions</span></h2>
      <p>Can't find an answer? <a href="https://wa.me/923001234567" style="color:var(--primary);font-weight:700;">Chat with us on WhatsApp →</a></p>
    </div>
    <div class="faq-accordion" role="list">
      ${faqs.map((f, i) => `
      <div class="faq-item" role="listitem">
        <button class="faq-title" onclick="toggleFaq(this)" aria-expanded="false">
          <span>${f[0]}</span>
          <span class="faq-toggle">+</span>
        </button>
        <div class="faq-content" aria-hidden="true">
          <p>${f[1]}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>`);
}

window.toggleFaq = function(btn) {
  const item = btn.closest('.faq-item');
  const open = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('open'));
  if (!open) item.classList.add('open');
};

/* ──────────────────────────────────────────
   20. ABOUT
────────────────────────────────────────── */
function renderAbout() {
  setMeta({
    title: `About Us – Pakistan's Affordable Marketplace | ${SITE_NAME}`,
    desc: 'Learn about Sasta Milaga – Pakistan\'s mission to make quality products affordable for everyone across the country.',
  });

  render(`
  <div class="section">
    <div class="about-hero">
      <span class="section-badge">Our Story</span>
      <h1>Making Pakistan <br/><span class="gradient-text">Shop Smarter</span></h1>
      <p style="color:var(--text3);max-width:660px;margin:14px auto 0;font-size:1.02rem;line-height:1.75;">
        Sasta Milaga was born from a simple belief: quality products should be accessible to everyone in Pakistan, at prices that don't compromise on value.
      </p>
    </div>

    <div class="about-metrics" role="list">
      ${[['13,000+','Products Listed'],['2.1M+','Happy Customers'],['50+','Cities Served'],['4.8★','Average Rating']].map(([n,l]) => `
      <div class="metric-box" role="listitem">
        <span class="metric-number">${n}</span>
        <span class="metric-label">${l}</span>
      </div>`).join('')}
    </div>

    <div class="about-grid">
      ${[['🎯','Our Mission','To democratize shopping in Pakistan by connecting buyers with the best prices across fashion, beauty, electronics, home, groceries, and automotive.'],['👁','Our Vision','A Pakistan where every family can access quality products at fair prices, delivered fast and reliably to their doorstep.'],['💎','Our Values','Transparency in pricing. Authenticity in products. Speed in delivery. Empathy in service.']].map(([icon,title,text]) => `
      <div class="about-card">
        <div class="ac-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${text}</p>
      </div>`).join('')}
    </div>

    <div class="form-section" style="margin-top:24px;">
      <h3 style="margin-bottom:14px;">🗺 Cities We Serve</h3>
      <div class="cities-grid">
        ${['Karachi','Lahore','Islamabad','Rawalpindi','Peshawar','Quetta','Multan','Faisalabad','Hyderabad','Sialkot','Gujranwala','Sargodha','Bahawalpur','Sukkur','Larkana','Abbottabad','Dera Ghazi Khan','Sheikhupura','Rahim Yar Khan','Jhang'].map(c =>
          `<span class="city-tag">📍 ${c}</span>`
        ).join('')}
        <span class="city-tag">+ 30 more cities</span>
      </div>
    </div>
  </div>`);
}

/* ──────────────────────────────────────────
   21. MEGA MENU
────────────────────────────────────────── */
function buildMegaMenu() {
  const menu = document.getElementById('megaMenu');
  const trigger = document.getElementById('megaTrigger');
  if (!menu || !trigger) return;

  const featured = CATEGORIES[0];
  const featureProd = PRODUCTS[0];

  menu.innerHTML = `
  <div class="mega-grid">
    <div class="mega-tabs" role="tablist" aria-label="Category tabs">
      ${CATEGORIES.map((c, i) => `
      <button class="mega-tab ${i===0?'active':''}" onclick="switchMegaTab(${i})" role="tab" aria-selected="${i===0}">${c.icon} ${c.label}</button>`).join('')}
    </div>
    <div id="megaMain">
      <div class="mega-feature">
        <img src="${featureProd.img}" alt="${featureProd.title}" loading="lazy"/>
        <div>
          <p style="color:var(--primary);font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Featured</p>
          <h2>${featureProd.title}</h2>
          <p>${featureProd.desc || ''}</p>
          <a class="primary-btn" href="#/product/${featureProd.id}" style="margin-top:12px;display:inline-flex;font-size:.84rem;padding:10px 18px;">View Deal →</a>
        </div>
      </div>
      <div class="mega-list" style="margin-top:16px;">
        ${CATEGORIES[0].sub.split(',').map(s => `<a href="#/search?q=${encodeURIComponent(s.trim())}">${s.trim()}</a>`).join('')}
        <a href="#/category/${CATEGORIES[0].slug}">View All ${CATEGORIES[0].label} →</a>
      </div>
    </div>
    <div class="mega-tags">
      <p style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:8px;">Quick Links</p>
      ${PRODUCTS.slice(0,12).map(p => `<a href="#/product/${p.id}">${p.title.substring(0,28)}…</a>`).join('')}
    </div>
  </div>`;

  window.switchMegaTab = function(idx) {
    const cat = CATEGORIES[idx];
    document.querySelectorAll('.mega-tab').forEach((t,i) => {
      t.classList.toggle('active', i === idx);
      t.setAttribute('aria-selected', i === idx);
    });
    const main = document.getElementById('megaMain');
    if (!main) return;
    const catProds = PRODUCTS.filter(p => p.category === cat.label).slice(0, 1);
    const fp = catProds[0] || PRODUCTS[idx];
    main.innerHTML = `
    <div class="mega-feature">
      <img src="${cat.img}" alt="${cat.label}" loading="lazy"/>
      <div>
        <p style="color:var(--primary);font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;">${cat.label}</p>
        <h2>${cat.label} Collection</h2>
        <p>${cat.sub}</p>
        <a class="primary-btn" href="#/category/${cat.slug}" style="margin-top:12px;display:inline-flex;font-size:.84rem;padding:10px 18px;">Shop ${cat.label} →</a>
      </div>
    </div>
    <div class="mega-list" style="margin-top:16px;">
      ${cat.sub.split(',').map(s => `<a href="#/search?q=${encodeURIComponent(s.trim())}">${s.trim()}</a>`).join('')}
      <a href="#/category/${cat.slug}">View All →</a>
    </div>`;
  };

  let open = false;
  trigger.addEventListener('click', () => {
    open = !open;
    menu.classList.toggle('open', open);
    trigger.setAttribute('aria-expanded', open);
  });
  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && e.target !== trigger) {
      open = false; menu.classList.remove('open');
      trigger.setAttribute('aria-expanded', false);
    }
  });
}

/* ──────────────────────────────────────────
   22. PRODUCT EVENTS
────────────────────────────────────────── */
function bindProductEvents() {
  document.querySelectorAll('[data-cart]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.cart;
      const p  = PRODUCTS.find(x => x.id === id);
      if (!p) return;
      const ex = State.cart.find(i => i.id === id);
      if (ex) ex.qty++; else State.cart.push({ id, qty: 1 });
      saveCart(); updateCounts();
      toast(`✅ "${p.title.substring(0,28)}…" added to cart!`);
    });
  });

  document.querySelectorAll('[data-wish]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.wish;
      const p  = PRODUCTS.find(x => x.id === id);
      if (!p) return;
      const idx = State.wishlist.findIndex(w => w.id === id);
      if (idx > -1) {
        State.wishlist.splice(idx, 1);
        toast('Removed from wishlist');
      } else {
        State.wishlist.push({ id });
        toast('♥ Added to wishlist!');
      }
      saveWishlist(); updateCounts();
      btn.textContent = State.wishlist.some(w => w.id === id) ? '♥' : '♡';
      btn.setAttribute('aria-pressed', State.wishlist.some(w => w.id === id));
    });
  });

  document.querySelectorAll('[data-quick]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.quick;
      const p  = PRODUCTS.find(x => x.id === id);
      if (!p) return;
      const modal = document.getElementById('quickModal');
      const body  = document.getElementById('quickModalBody');
      if (!modal || !body) return;
      body.innerHTML = `
      <div class="quick-view">
        <img src="${p.img}" alt="${p.title}"/>
        <div>
          <span class="blog-cat">${p.category}</span>
          <h2 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin:10px 0;">${p.title}</h2>
          <div class="rating-stars">${stars(+p.rating)} <span class="rating-count">(${p.reviews})</span></div>
          <div style="margin:14px 0;">
            <span class="old-price">${formatPKR(p.oldPrice)}</span>
            <span class="big-price">${formatPKR(p.price)}</span>
          </div>
          <p style="color:var(--text3);font-size:.88rem;margin-bottom:16px;">${p.desc || ''}</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="primary-btn add-cart-btn" data-cart="${p.id}">🛒 Add to Cart</button>
            <a class="ghost-btn" href="#/product/${p.id}" onclick="closeModal()">View Full Details →</a>
          </div>
        </div>
      </div>`;
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lock');
      bindProductEvents();
    });
  });
}

window.closeModal = function() {
  const modal = document.getElementById('quickModal');
  if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }
  document.body.classList.remove('lock');
};

document.addEventListener('click', e => {
  if (e.target.dataset.closeModal || e.target.classList.contains('modal')) closeModal();
});

/* ──────────────────────────────────────────
   23. AI CHATBOT
────────────────────────────────────────── */
(function initChatbot() {
  const bot    = document.getElementById('chatbot');
  const log    = document.getElementById('chatLog');
  const chips  = document.getElementById('chatChips');
  const form   = document.getElementById('chatForm');
  const input  = document.getElementById('chatInput');
  const openB  = document.getElementById('openBot');
  const closeB = document.getElementById('closeBot');
  if (!bot) return;

  const CHIPS = ['Mobiles under 5000','Skincare deals','Car accessories','Kitchen appliances','Eid fashion sale','Cheap laptops'];
  chips.innerHTML = CHIPS.map(c => `<button class="chat-chip">${c}</button>`).join('');
  chips.querySelectorAll('.chat-chip').forEach(c => {
    c.addEventListener('click', () => { input.value = c.textContent; handleChat(c.textContent); });
  });

  function addMsg(text, isUser = false) {
    const d = document.createElement('div');
    d.className = 'chat-msg' + (isUser ? ' user' : '');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  function addProducts(results) {
    const w = document.createElement('div');
    w.className = 'chat-products';
    w.innerHTML = results.slice(0, 3).map(p => `
    <a class="chat-product" href="#/product/${p.id}">
      <img src="${p.img}" alt="${p.title}" loading="lazy"/>
      <div>
        <b style="display:block;font-size:.84rem;">${p.title.substring(0,36)}…</b>
        <span style="color:var(--primary);font-weight:700;font-size:.82rem;">${formatPKR(p.price)}</span>
        ${p.discount ? `<span style="color:var(--gold-dk);font-size:.74rem;"> (${p.discount}% off)</span>` : ''}
      </div>
    </a>`).join('');
    log.appendChild(w);
    log.scrollTop = log.scrollHeight;
  }

  addMsg('Hi! 👋 I\'m your Sasta AI shopping assistant. Tell me what you\'re looking for and I\'ll find the best deals for you!');

  function handleChat(q) {
    if (!q.trim()) return;
    addMsg(q, true);
    input.value = '';
    const kw = q.toLowerCase();

    // Price filter
    const priceMatch = kw.match(/under\s*(\d+)|below\s*(\d+)|less than\s*(\d+)/);
    const maxPrice = priceMatch ? parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]) : null;

    let results = PRODUCTS.filter(p => {
      const matchKw = p.title.toLowerCase().includes(kw) ||
        p.category.toLowerCase().includes(kw) ||
        (p.tags||[]).some(t => t.toLowerCase().includes(kw.split(' ')[0]));
      const matchPrice = !maxPrice || p.price <= maxPrice;
      return matchKw && matchPrice;
    });

    if (!results.length && maxPrice) {
      results = PRODUCTS.filter(p => p.price <= maxPrice).slice(0, 6);
    }
    if (!results.length) results = PRODUCTS.slice(0, 3);

    setTimeout(() => {
      if (results.length) {
        addMsg(`Found ${results.length} matching products! Here are the top picks:`);
        addProducts(results);
      } else {
        addMsg('Hmm, I couldn\'t find exact matches. Let me show you our best sellers instead:');
        addProducts(PRODUCTS.slice(0, 3));
      }
    }, 600);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleChat(input.value);
  });

  openB.addEventListener('click', () => { bot.classList.add('open'); bot.setAttribute('aria-hidden','false'); input.focus(); });
  closeB.addEventListener('click', () => { bot.classList.remove('open'); bot.setAttribute('aria-hidden','true'); });
})();

/* ──────────────────────────────────────────
   24. SEARCH BAR
────────────────────────────────────────── */
document.getElementById('topSearchForm')?.addEventListener('submit', e => {
  e.preventDefault();
  const q = document.getElementById('topSearch').value.trim();
  navigate('#/search?q=' + encodeURIComponent(q));
});

document.getElementById('mobileSearchBtn')?.addEventListener('click', () => {
  navigate('#/search?q=');
  setTimeout(() => document.getElementById('searchInput')?.focus(), 300);
});

/* ──────────────────────────────────────────
   25. ROUTER
────────────────────────────────────────── */
function parseHash() {
  const hash  = location.hash.replace('#/', '') || 'home';
  const [path, qstr] = hash.split('?');
  const parts = path.split('/');
  const params = {};
  if (qstr) qstr.split('&').forEach(pair => {
    const [k, v] = pair.split('=');
    params[k] = decodeURIComponent(v || '');
  });
  return { path: parts[0], sub: parts[1], sub2: parts[2], params };
}

function route() {
  const { path, sub, sub2, params } = parseHash();
  const page = parseInt(params.page) || 1;

  switch (path) {
    case 'home':       renderHome();              break;
    case 'search':     renderSearch(params.q || '', page); break;
    case 'category':   renderCategory(sub, page); break;
    case 'product':    renderProduct(sub);         break;
    case 'deals':      renderDeals();              break;
    case 'wishlist':   renderWishlist();           break;
    case 'cart':       renderCart();               break;
    case 'checkout':   renderCheckout();           break;
    case 'faq':        renderFAQ();                break;
    case 'about':      renderAbout();              break;
    case 'blog':
      if (sub && sub !== 'new') renderBlogPost(sub);
      else renderBlog();
      break;
    case 'admin':
      if (sub === 'colors') renderColorCustomizer();
      else if (sub === 'blog') {
        if (sub2 === 'new' || !sub2) renderBlogAdmin();
        else renderBlogAdmin(sub2);
      }
      break;
    default: renderHome();
  }
}

window.navigate = function(url) {
  location.hash = url.replace(/^#/, '');
};

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  buildMegaMenu();
  if (!location.hash || location.hash === '#') {
    location.hash = '#/home';
  } else {
    route();
  }
});

/* ──────────────────────────────────────────
   26. ACTIVE NAV HIGHLIGHTING
────────────────────────────────────────── */
window.addEventListener('hashchange', () => {
  const hash = location.hash;
  document.querySelectorAll('.desktop-actions a, .bottom-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', hash.startsWith(href) && href !== '#/home' ||
      (href === '#/home' && (hash === '#/home' || hash === '#/')));
  });
});