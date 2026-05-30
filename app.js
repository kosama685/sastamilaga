

'use strict';

/* ── CONFIGURATION ── */
const FORMSPREE_ID = 'xwvzzjdl'; // Sign up at formspree.io, create a form, and paste your ID here.
const ADMIN_EMAIL  = 'kosama685@gmail.com';

/* ── Safety guard: ensure SASTA_PRODUCTS is always an array ── */
const PRODUCTS_RAW = (typeof window !== 'undefined' && Array.isArray(window.SASTA_PRODUCTS))
  ? window.SASTA_PRODUCTS
  : [];

const PKR       = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });
const SITE_URL  = 'https://sastamilaga.com'; // Ensure this matches your actual domain
const SITE_NAME = 'Sasta Milaga';

/* ── Fallback SVG image ── */
const fallbackImg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop stop-color="#1a5c2a"/><stop offset=".55" stop-color="#2d7a3a"/>' +
  '<stop offset="1" stop-color="#c8a96e"/></linearGradient></defs>' +
  '<rect width="100%" height="100%" fill="#060e08"/>' +
  '<circle cx="720" cy="140" r="230" fill="url(#g)" opacity=".4"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" ' +
  'fill="#c8a96e" font-family="Arial" font-size="48" font-weight="900">Sasta Milaga</text>' +
  '</svg>'
);

/* ── DOM helpers ── */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* ── App state ── */
const state = {
  route: 'home',
  limit: 60,
  view: 'grid',
  base: [],
  filters: { q: '', category: '', tag: '', store: '', min: '', max: '', stock: false, video: false, sort: 'relevant' },
  activeMega: null
};

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function num(v)      { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function esc(s)      { return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
function slug(s)     { return String(s || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function unSlug(s)   { return String(s || '').replace(/-/g, ' '); }
function titleCase(s){ return String(s || '').replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1)); }
function truncate(str, len){ return str && str.length > len ? str.slice(0, len).trim() + '…' : (str || ''); }

function price(p)    { return num(p.fp || p.bp || p.sp); }
function oldPrice(p) { return Math.max(num(p.sp), num(p.bp), price(p)); }
function discount(p) { const o = oldPrice(p), f = price(p); return o > f ? Math.round((o - f) / o * 100) : 0; }
function img(p)      { return (p && (p.img || (p.imgs && p.imgs[0]))) || fallbackImg; }
function isPublished(p){ return p.status !== 'draft' && p.status !== 'trash' && p.pub !== false; }
function productText(p){ return `${p.n} ${p.m} ${p.leaf} ${p.path} ${p.store} ${(p.tags || []).join(' ')} ${p.sd} ${p.seoT}`.toLowerCase(); }

/* ============================================================
   PRODUCT DATA — build derived maps & collections
   ============================================================ */
const products = PRODUCTS_RAW.filter(isPublished).map((p, i) => ({
  ...p,
  _i       : i,
  _slug    : slug(p.h || p.n || p.id),
  _catSlug : slug(p.m),
  _leafSlug: slug(p.leaf),
  _storeSlug: slug(p.store),
  _search  : ''
}));
products.forEach(p => { p._search = productText(p); });

const byHandle = new Map();
products.forEach(p => {
  byHandle.set(p._slug, p);
  byHandle.set(slug(p.id), p);
  if (p.h) byHandle.set(slug(p.h), p);
});

const categories = [...new Set(products.map(p => p.m).filter(Boolean))].map(name => {
  const list   = products.filter(p => p.m === name);
  const leaves = [...new Set(list.map(p => p.leaf).filter(Boolean))].slice(0, 24);
  return { name, slug: slug(name), count: list.length, image: img(list.find(p => img(p)) || list[0]), leaves };
}).sort((a, b) => b.count - a.count);

const stores    = [...new Set(products.map(p => p.store).filter(Boolean))];
const tagCounts = {};
products.forEach(p => (p.tags || []).forEach(t => { if (t.length > 1) tagCounts[t] = (tagCounts[t] || 0) + 1; }));
const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 80).map(([name, count]) => ({ name, slug: slug(name), count }));

function productsForCategory(cat){ return products.filter(p => p._catSlug === cat || slug(p.m) === cat); }
function productsForTag(tag)     { return products.filter(p => (p.tags || []).some(t => slug(t) === tag)); }
function productsForStore(store) { return products.filter(p => p._storeSlug === store); }

/* ============================================================
   SEO HELPERS
   ============================================================ */
function setSEO({ title, description, image, url, ldJson }) {
  document.title = title
    ? `${title} | ${SITE_NAME} Pakistan`
    : `${SITE_NAME} – Pakistan's Affordable Marketplace`;

  setMetaName('description', truncate(description, 160));
  setOrCreateLink('canonical', url || SITE_URL);

  setMetaProp('og:type',        'website');
  setMetaProp('og:site_name',   SITE_NAME);
  setMetaProp('og:title',       title || SITE_NAME);
  setMetaProp('og:description', truncate(description, 200));
  setMetaProp('og:image',       image || `${SITE_URL}/sasta-milaga-logo-final.png`);
  setMetaProp('og:url',         url || SITE_URL);

  setMetaName('twitter:card',        'summary_large_image');
  setMetaName('twitter:title',       title || SITE_NAME);
  setMetaName('twitter:description', truncate(description, 200));
  setMetaName('twitter:image',       image || `${SITE_URL}/sasta-milaga-logo-final.png`);

  const ldEl = $('#ld-dynamic');
  if (ldEl && ldJson) ldEl.textContent = JSON.stringify(ldJson);
}

function setMetaName(name, content) {
  let el = $(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el); }
  el.setAttribute('content', content || '');
}

function setMetaProp(prop, content) {
  let el = $(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
  el.setAttribute('content', content || '');
}

function setOrCreateLink(rel, href) {
  let el = $(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href || '');
}

/* ── JSON-LD builders ── */
function productLdJson(p) {
  const pUrl   = `${SITE_URL}/#/product/${p._slug}`;
  const pImg   = img(p);
  const pPrice = price(p);
  const schema = {
    '@context': 'https://schema.org',
    '@type'   : 'Product',
    'name'    : p.seoT || p.n,
    'description': truncate(p.d || p.sd || p.seoD || `${p.n} available at Sasta Milaga Pakistan`, 500),
    'image'   : pImg !== fallbackImg ? [pImg] : undefined,
    'sku'     : p.sku || p.id,
    'mpn'     : p.id,
    'brand'   : { '@type': 'Brand', 'name': p.store || SITE_NAME },
    'url'     : pUrl,
    'offers'  : {
      '@type'           : 'Offer',
      'url'             : pUrl,
      'priceCurrency'   : 'PKR',
      'price'           : String(pPrice || 0),
      'priceValidUntil' : new Date(Date.now() + 30 * 24 * 3600000).toISOString().slice(0, 10),
      'availability'    : (p.in || num(p.stock) > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      'itemCondition'   : 'https://schema.org/NewCondition',
      'seller'          : { '@type': 'Organization', 'name': SITE_NAME },
      'hasMerchantReturnPolicy': {
        '@type': 'MerchantReturnPolicy',
        'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
        'merchantReturnDays': 7,
        'returnMethod': 'https://schema.org/ReturnByMail',
        'returnFees': 'https://schema.org/RestockingFees'
      }
    }
  };
  if (oldPrice(p) > pPrice) {
    schema.offers.priceSpecification = {
      '@type': 'UnitPriceSpecification', 'price': String(oldPrice(p)), 'priceCurrency': 'PKR'
    };
  }
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type'   : 'BreadcrumbList',
    'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Home',       'item': SITE_URL },
      { '@type': 'ListItem', 'position': 2, 'name': p.m || 'Products', 'item': `${SITE_URL}/#/category/${p._catSlug}` },
      { '@type': 'ListItem', 'position': 3, 'name': p.n,          'item': pUrl }
    ]
  };
  return { '@context': 'https://schema.org', '@graph': [schema, breadcrumb] };
}

function returnPolicyLdJson() {
  return {
    '@context': 'https://schema.org',
    '@type': 'MerchantReturnPolicy',
    'name': 'Sasta Milaga 7-Day Return Policy',
    'applicableCountry': 'PK',
    'returnPolicyCategory': 'https://schema.org/MerchantReturnFiniteReturnWindow',
    'merchantReturnDays': 7,
    'returnMethod': 'https://schema.org/ReturnByMail',
    'returnFees': 'Customers bear return shipping costs (PKR 250) unless item is defective.',
    'refundType': 'https://schema.org/FullRefund',
    'itemCondition': ['https://schema.org/NewCondition', 'https://schema.org/DamagedCondition']
  };
}

/* ============================================================
   SOCIAL SHARE BAR
   ============================================================ */
function buildShareBar(p) {
  const url      = encodeURIComponent(`${SITE_URL}/#/product/${p._slug}`);
  const title    = encodeURIComponent(`${p.seoT || p.n} – PKR ${PKR.format(price(p))}`);
  const img_url  = encodeURIComponent(img(p) !== fallbackImg ? img(p) : `${SITE_URL}/sasta-milaga-logo-final.png`);
  const waText   = encodeURIComponent(`🛒 Check out *${p.n}* at Sasta Milaga!\n💰 Only ${PKR.format(price(p))} PKR\n🔗 ${decodeURIComponent(url)}`);

  return `<div class="share-bar" id="share-bar-${esc(p.id)}">
    <span>📤 Share:</span>
    <a class="share-btn whatsapp" href="https://wa.me/?text=${waText}" target="_blank" rel="noopener" aria-label="Share on WhatsApp" title="Share on WhatsApp">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span>WhatsApp</span>
    </a>
    <a class="share-btn facebook" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" aria-label="Share on Facebook">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
      <span>Facebook</span>
    </a>
    <button class="share-btn copy-link" onclick="copyProductLink('${esc(p._slug)}')" aria-label="Copy product link" title="Copy link">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
      <span>Copy Link</span>
    </button>
  </div>`;
}

window.copyProductLink = function (productSlug) {
  const url = `${SITE_URL}/#/product/${productSlug}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => toast('🔗 Link copied!')).catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
};

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('🔗 Link copied!'); } catch (e) { toast('Copy failed – please copy manually'); }
  document.body.removeChild(ta);
}

/* ============================================================
   INIT
   ============================================================ */
function init() {
  ensureAppRoot();
  updateCounts();
  bindEvents();
  renderMega();
  drawChatChips();
  
  // Handle initial load (Support both Hash and Path)
  handleRoute();
}

function ensureAppRoot() {
  if (!$('#app')) {
    const div = document.createElement('div');
    div.id = 'app';
    const main = $('#main') || $('main') || document.body;
    main.appendChild(div);
  }
}

function bindEvents() {
  window.addEventListener('popstate', handleRoute); // Back/Forward button support

  /* Search form */
  const searchForm = $('#topSearchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = ($('#topSearch') || {}).value || '';
      navigateTo('search', '', `q=${encodeURIComponent(q.trim())}`);
    });
  }

  /* Mega menu */
  const megaTrigger = $('#megaTrigger');
  const megaMenu    = $('#megaMenu');
  if (megaTrigger && megaMenu) {
    megaTrigger.addEventListener('click', () => {
      const isOpen = megaMenu.classList.toggle('open');
      megaTrigger.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.mega-menu') && !e.target.closest('#megaTrigger')) {
        megaMenu.classList.remove('open');
        megaTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Intercept ALL clicks for Clean URL navigation */
  document.body.addEventListener('click', e => {
    const link = e.target.closest('a');
    if (!link) return;

    // Check if it's an internal hash link or data-link
    const href = link.getAttribute('href');
    if (href && href.startsWith('#/')) {
      e.preventDefault();
      const path = href.substring(2); // remove '#/'
      const [routePart, queryPart] = path.split('?');
      navigateTo(routePart, '', queryPart || '');
    }
  });

  /* Chatbot */
  const openBot  = $('#openBot');
  const closeBot = $('#closeBot');
  const chatbot  = $('#chatbot');
  if (openBot && chatbot)  openBot.addEventListener('click',  () => { chatbot.classList.add('open');    chatbot.removeAttribute('aria-hidden'); });
  if (closeBot && chatbot) closeBot.addEventListener('click', () => { chatbot.classList.remove('open'); chatbot.setAttribute('aria-hidden', 'true'); });

  /* Chat form */
  const chatForm = $('#chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('#chatInput');
      const q     = (input ? input.value : '').trim();
      if (!q) return;
      if (input) input.value = '';
      addBotMessage(esc(q), true);
      answerBot(q);
    });
  }

  /* Modal & Cart Delegates */
  document.body.addEventListener('click', e => {
    if (e.target.closest('[data-close-modal]')) { closeModal(); return; }
    const quick = e.target.closest('[data-quick]');
    if (quick) { openQuick(quick.dataset.quick); return; }
    const addCart = e.target.closest('[data-add-cart]');
    if (addCart) { addToCart(addCart.dataset.addCart, Number(addCart.dataset.qty || 1)); return; }
    const wish = e.target.closest('[data-wish]');
    if (wish) { toggleWish(wish.dataset.wish); return; }
    const thumb = e.target.closest('[data-gallery]');
    if (thumb) { setGallery(thumb.dataset.gallery, thumb.dataset.type); return; }
  });
}

/* ============================================================
   ROUTER & NAVIGATION (CLEAN URL LOGIC)
   ============================================================ */
function navigateTo(route, sub = '', qs = '') {
  let hash = '';
  let path = '';

  if (route === 'home') {
    path = '/'; 
    hash = '#/home';
  } else {
    path = `/${route}${sub ? '/' + sub : ''}${qs ? '?' + qs : ''}`;
    hash = `#/${route}${sub ? '/' + sub : ''}${qs ? '?' + qs : ''}`;
  }

  // 1. Update visual URL bar (Clean URL)
  history.pushState({ route, sub, qs }, '', path);
  
  // 2. Update internal state
  window.location.hash = hash; // Keep hash for Blogger refresh safety
  
  // 3. Render
  route();
}

function handleRoute() {
  // Logic to determine current route from either Path or Hash
  // Fallback to hash if path is just "/" on load (Blogger default)
  const pathParts = window.location.pathname.replace(/^\//, '').split('/');
  const hashParts = window.location.hash.replace(/^#\//, '').split('?');
  
  let raw = pathParts[0] || hashParts[0] || 'home';
  
  // Safety fallback for Blogger root
  if (raw === '' || raw === 'p' || raw.includes('.html')) raw = 'home';

  const qs = hashParts[1] || window.location.search.substring(1);
  const parts = raw.split('/').filter(Boolean);

  state.limit = 60;
  state.view  = 'grid';
  window.scrollTo({ top: 0 });

  if      (parts[0] === 'category') renderListing('category', parts[1] || '', qs);
  else if (parts[0] === 'tag')      renderListing('tag',      parts[1] || '', qs);
  else if (parts[0] === 'search')   renderListing('search',   '',             qs);
  else if (parts[0] === 'deals')    renderListing('deals',    '',             qs);
  else if (parts[0] === 'store')    renderListing('store',    parts[1] || '', qs);
  else if (parts[0] === 'product')  renderPDP(parts.slice(1).join('/'));
  else if (parts[0] === 'cart')     renderCart();
  else if (parts[0] === 'wishlist') renderWishlist();
  else if (parts[0] === 'checkout') renderCheckout();
  else if (parts[0] === 'faq')      renderFAQ();
  else if (parts[0] === 'about')    renderAbout();
  else if (parts[0] === 'return-policy') renderReturnPolicy(); // NEW ROUTE
  else if (parts[0] === 'contact')  renderContact();            // NEW ROUTE
  else renderHome();
}

// Alias for the original function to maintain compatibility
function route() { handleRoute(); }

/* ============================================================
   RETURN POLICY PAGE (NEW)
   ============================================================ */
function renderReturnPolicy() {
  setSEO({
    title: 'Return & Refund Policy – 7 Day Easy Returns',
    description: 'Sasta Milaga Pakistan Return Policy. 7-day return window. Flat PKR 250 return fee. Free returns for defective items.',
    url: `${SITE_URL}/#/return-policy`,
    ldJson: returnPolicyLdJson()
  });

  renderApp(`
    <section class="section">
      <div class="section-head" style="text-align:center">
        <span class="eyebrow">Customer Care</span>
        <h1>Return & Refund Policy</h1>
        <p>Hassle-free returns within 7 days of delivery.</p>
      </div>

      <div class="about-grid" style="margin: 24px 0">
        <div class="about-card">
          <h3 style="color:var(--gold2)">7-Day Window</h3>
          <p style="color:var(--muted2);margin-top:8px">You have 7 days from the date of delivery to initiate a return request.</p>
        </div>
        <div class="about-card">
          <h3 style="color:var(--gold2)">Return Cost</h3>
          <p style="color:var(--muted2);margin-top:8px">Standard return shipping is <b>PKR 250</b>. Returns are free if the item is defective or damaged.</p>
        </div>
        <div class="about-card">
          <h3 style="color:var(--gold2)">Refund Method</h3>
          <p style="color:var(--muted2);margin-top:8px">Refunds are processed to your original payment method (Bank Transfer/EasyPaisa) within 7-10 business days.</p>
        </div>
      </div>

      <div class="faq-accordion">
        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">What is the return window? <span>+</span></button>
          <div class="faq-content">
            You can return any item within <b>7 days</b> of receiving your order. The item must be unused, in original packaging, and with tags attached.
          </div>
        </div>
        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">Who pays for return shipping? <span>+</span></button>
          <div class="faq-content">
            For "Change of Mind" returns, the customer bears the shipping cost of <b>PKR 250</b>. If the item is defective, damaged, or incorrect, Sasta Milaga covers the return shipping cost.
          </div>
        </div>
        <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">How do I initiate a return? <span>+</span></button>
          <div class="faq-content">
            Simply contact our WhatsApp support at <b>+92 300 0000000</b> or email us at <b>${ADMIN_EMAIL}</b> with your Order ID. We will guide you through the process.
          </div>
        </div>
         <div class="faq-item">
          <button class="faq-title" onclick="toggleFaq(this)">Can I get a refund to my Bank Account? <span>+</span></button>
          <div class="faq-content">
            Yes. Once we receive the returned item, we will process the refund to your Bank Account, JazzCash, or EasyPaisa within 7-10 working days.
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ============================================================
   CONTACT PAGE (NEW) - FORMSPREE INTEGRATION
   ============================================================ */
function renderContact() {
  setSEO({
    title: 'Contact Us – Customer Support',
    description: 'Get in touch with Sasta Milaga Pakistan. WhatsApp, Email, and Contact Form available.',
    url: `${SITE_URL}/#/contact`
  });

  renderApp(`
    <section class="section">
      <div class="section-head">
        <div><h1>Contact Us</h1><p>We are here to help you 24/7.</p></div>
      </div>
      
      <div class="cart-layout">
        <div class="detail-panel" style="padding:24px">
          <h2 style="margin:0 0 16px">Send us a message</h2>
          <form id="contactForm" action="https://formspree.io/f/${FORMSPREE_ID}" method="POST" class="form-grid">
            <input type="text" name="name" placeholder="Your Name" required>
            <input type="email" name="email" placeholder="Your Email" required>
            <input type="tel" name="phone" placeholder="Phone Number">
            <input type="text" name="subject" placeholder="Subject" required style="grid-column:1/-1">
            <textarea name="message" placeholder="How can we help?" rows="5" required style="grid-column:1/-1"></textarea>
            
            <input type="hidden" name="_subject" value="New Contact from Sasta Milaga">
            <input type="hidden" name="_captcha" value="false">
            
            <button type="submit" class="primary-btn" style="grid-column:1/-1">Send Message 🚀</button>
          </form>
        </div>
        
        <aside class="summary-box">
          <h3>Other Channels</h3>
          <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
            <a href="https://wa.me/923000000000" target="_blank" class="ghost-btn" style="justify-content:center">
              💬 Chat on WhatsApp
            </a>
            <a href="mailto:${ADMIN_EMAIL}" class="ghost-btn" style="justify-content:center">
              📧 Email: ${ADMIN_EMAIL}
            </a>
          </div>
          <div style="margin-top:24px;color:var(--muted2);font-size:.9rem">
            <p><b>Office Hours:</b><br>Mon - Sat: 9:00 AM - 9:00 PM</p>
            <p style="margin-top:8px"><b>Address:</b><br>Lahore, Pakistan</p>
          </div>
        </aside>
      </div>
    </section>
  `);

  // Form handling logic
  const form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', function(ev) {
      ev.preventDefault();
      const data = new FormData(form);
      const xhr = new XMLHttpRequest();
      xhr.open(form.method, form.action);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        if (xhr.status === 200) {
          form.reset();
          toast("Message sent! We'll reply shortly.");
        } else {
          toast("Oops! There was a problem.");
        }
      };
      xhr.send(data);
    });
  }
}

/* ============================================================
   MEGA MENU
   ============================================================ */
function renderMega() {
  state.activeMega = categories[0] ? categories[0].slug : '';
  const panel = $('#megaMenu');
  if (!panel) return;

  panel.innerHTML = `<div class="mega-grid">
    <div class="mega-tabs">${categories.map((c, i) =>
      `<button class="mega-tab ${i === 0 ? 'active' : ''}" data-mega="${esc(c.slug)}" aria-label="${esc(c.name)} category">
        ${esc(c.name)} <small>(${c.count})</small>
      </button>`
    ).join('')}</div>
    <div id="megaMain"></div>
    <div class="mega-tags">${topTags.slice(0, 28).map(t =>
      `<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)}</a>`
    ).join('')}</div>
  </div>`;

  function draw(slugName) {
    const c    = categories.find(x => x.slug === slugName) || categories[0];
    if (!c) return;
    const list     = productsForCategory(c.slug);
    const featured = list.find(p => img(p)) || list[0];
    const megaMain = $('#megaMain');
    if (!megaMain) return;
    megaMain.innerHTML = `
      <div class="mega-feature">
        <img src="${esc(img(featured))}" alt="${esc(c.name)}" onerror="this.src=window.fallbackImg" loading="lazy">
        <div>
          <span class="eyebrow">Browse Category</span>
          <h2>${esc(c.name)}</h2>
          <p>${c.count.toLocaleString()} products · filter by sub-category, tags, price &amp; deals.</p>
          <a class="primary-btn" href="#/category/${c.slug}">Open ${esc(c.name)} →</a>
        </div>
      </div>
      <div class="mega-list" style="margin-top:14px">
        ${c.leaves.map(l =>
          `<a href="#/category/${c.slug}?leaf=${encodeURIComponent(slug(l))}">${esc(l)}</a>`
        ).join('')}
      </div>`;
  }

  draw(state.activeMega);

  $$('.mega-tab').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      $$('.mega-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      draw(btn.dataset.mega);
    });
  });
}

/* ============================================================
   RENDER HELPER
   ============================================================ */
function renderApp(html) {
  const app = $('#app');
  if (!app) { console.warn('#app not found'); return; }
  app.innerHTML = html;
}

/* ============================================================
   HOME PAGE
   ============================================================ */
function renderHome() {
  setSEO({
    title: "Pakistan's Affordable Marketplace – Best Prices on Fashion, Electronics & More",
    description: `Shop ${products.length.toLocaleString()} products across ${categories.length} categories at Sasta Milaga – Pakistan's go-to marketplace for fashion, electronics, beauty, home decor and groceries. Best prices guaranteed.`,
    image: `${SITE_URL}/sasta-milaga-logo-final.png`,
    url: `${SITE_URL}/`,
    ldJson: {
      '@context': 'https://schema.org',
      '@type'   : 'ItemList',
      'name'    : 'Sasta Milaga Featured Categories',
      'itemListElement': categories.slice(0, 10).map((c, i) => ({
        '@type'   : 'ListItem',
        'position': i + 1,
        'name'    : c.name,
        'url'     : `${SITE_URL}/#/category/${c.slug}`
      }))
    }
  });

  const flash       = getDeals().slice(0, 8);
  const heroProducts= flash.slice(0, 3);
  const deal        = flash[0] || products[0];
  if (!deal) { renderApp('<div class="empty-state"><h2>No products loaded yet.</h2><p>Please check products.js is loaded correctly.</p></div>'); return; }

  const heroCards    = heroProducts.map(p =>
    `<a class="float-card" href="#/product/${p._slug}"><img src="${esc(img(p))}" onerror="this.src=window.fallbackImg" alt="${esc(p.n)}" loading="lazy"><b>${esc(p.n)}</b></a>`
  ).join('');
  const trendingTags = topTags.slice(0, 32).map(t =>
    `<a class="tag-chip" href="#/tag/${t.slug}">#${esc(t.name)} <small>${t.count}</small></a>`
  ).join('');
  const masonryItems = shuffle(products).slice(0, 48).map(masonryCard).join('');
  const dealTags     = (deal.tags || []).slice(0, 8).map(tagLink).join('');

  renderApp([
    '<section class="hero">',
      '<div class="hero-content">',
        '<span class="eyebrow">🇵🇰 Pakistan\'s #1 Affordable Marketplace</span>',
        '<h1>Everything <span class="gradient-text">Milaga.</span><br>Sasta <span class="gradient-text">Milaga.</span></h1>',
        `<p>Discover ${products.length.toLocaleString()} products across ${categories.length} categories. Shop fashion, electronics, beauty, groceries and more – all at the lowest prices in Pakistan.</p>`,
        '<div class="hero-actions">',
          '<a class="primary-btn" href="#/deals">⚡ Shop Flash Deals</a>',
          `<a class="ghost-btn" href="#/category/${categories[0] ? categories[0].slug : ''}">Browse Categories</a>`,
          '<button class="ghost-btn" onclick="document.getElementById(\'openBot\').click()">🤖 Ask Sasta AI</button>',
        '</div>',
      '</div>',
      '<div class="hero-float-grid" aria-hidden="true">' + heroCards + '</div>',
      '<div class="blast-badge" aria-hidden="true">Best Price<br>Blast ⚡</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-head">',
        `<div><h2>Shop by Category</h2><p>${categories.length} categories from your product catalog.</p></div>`,
        '<a class="ghost-btn" href="#/search?q=">View all →</a>',
      '</div>',
      '<div class="card-grid">' + categories.slice(0, 15).map(categoryCard).join('') + '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-head">',
        '<div><h2>⚡ Flash Sales</h2><p>Biggest discounts, in-stock products.</p></div>',
        '<span class="eyebrow" id="countdown">Sale refreshes soon</span>',
      '</div>',
      `<div class="products-row">${flash.slice(0, 4).map(productCard).join('')}</div>`,
    '</section>',

    '<section class="section">',
      '<div class="deal-layout">',
        '<div class="detail-panel" style="padding:24px">',
          '<span class="eyebrow">Deal of the Day 🔥</span>',
          `<h2>${esc(deal.n)}</h2>`,
          `<p>${esc(deal.sd || deal.seoD || 'A hot pick from the Sasta Milaga catalog.')}</p>`,
          `<div class="tags-wrap">${dealTags}</div>`,
          '<div style="display:flex;align-items:flex-end;gap:14px;margin:18px 0">',
            `<span class="big-price">${PKR.format(price(deal))}</span>`,
            oldPrice(deal) > price(deal) ? `<span class="old-price">${PKR.format(oldPrice(deal))}</span>` : '',
          '</div>',
          `<a class="primary-btn" href="#/product/${deal._slug}">Open Product →</a>`,
        '</div>',
        `<a class="category-card" style="min-height:420px" href="#/product/${deal._slug}">`,
          `<img src="${esc(img(deal))}" alt="${esc(deal.n)}" onerror="this.src=window.fallbackImg" loading="lazy">`,
          `<div><b>${discount(deal) || 'Hot'}% Off Today</b><small>${esc(deal.m)} · ${esc(deal.leaf)}</small></div>`,
        '</a>',
      '</div>',
    '</section>',

    '<section class="section">',
      '<div class="section-head"><div><h2>Trending Tags</h2><p>Tag-based discovery for faster browsing.</p></div></div>',
      `<div class="visual-strip">${trendingTags}</div>`,
    '</section>',

    '<section class="section">',
      '<div class="section-head"><div><h2>Discover More Products</h2><p>Visual discovery feed.</p></div></div>',
      `<div class="masonry">${masonryItems}</div>`,
    '</section>'
  ].join(''));

  startCountdown();
}

function categoryCard(c) {
  return `<a class="category-card" href="#/category/${c.slug}" title="${esc(c.name)} – ${c.count} products">
    <img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy" onerror="this.src=window.fallbackImg">
    <div><b>${esc(c.name)}</b><small>${c.count.toLocaleString()} products</small></div>
  </a>`;
}

/* ============================================================
   LISTING PAGE — Category / Tag / Search / Deals / Store
   ============================================================ */
function renderListing(type, val, qs) {
  qs = qs || '';
  const params      = new URLSearchParams(qs);
  const qFromUrl    = params.get('q') || '';
  const leafFromUrl = params.get('leaf') || '';
  let base = [], title = '', subtitle = '', cat = null;

  if (type === 'category') {
    cat      = categories.find(c => c.slug === val);
    base     = productsForCategory(val);
    if (leafFromUrl) base = base.filter(p => p._leafSlug === leafFromUrl);
    title    = cat ? cat.name : titleCase(unSlug(val));
    subtitle = `${base.length.toLocaleString()} products in this category`;
    setSEO({
      title      : `${title} – Buy Online at Best Prices in Pakistan`,
      description: `Shop ${base.length.toLocaleString()} ${title} products online in Pakistan at Sasta Milaga. Compare prices, filter by brand, price range and more.`,
      image      : cat ? cat.image : undefined,
      url        : `${SITE_URL}/#/category/${val}`,
      ldJson     : cat ? categoryLdJson(cat) : undefined
    });
  } else if (type === 'tag') {
    const tag = topTags.find(t => t.slug === val) || { name: titleCase(unSlug(val)) };
    base      = productsForTag(val);
    title     = `#${tag.name}`;
    subtitle  = `${base.length.toLocaleString()} products matched by tag`;
    setSEO({
      title      : `${tag.name} Products – Best Prices Pakistan`,
      description: `Find ${base.length.toLocaleString()} ${tag.name} products at Sasta Milaga Pakistan.`,
      url        : `${SITE_URL}/#/tag/${val}`,
      ldJson     : { '@context': 'https://schema.org', '@type': 'CollectionPage', 'name': `${tag.name} Products`, 'url': `${SITE_URL}/#/tag/${val}` }
    });
  } else if (type === 'store') {
    base      = productsForStore(val);
    title     = (base[0] && base[0].store) || titleCase(unSlug(val));
    subtitle  = `${base.length.toLocaleString()} products from this store`;
    setSEO({
      title      : `${title} – Official Store at Sasta Milaga Pakistan`,
      description: `Browse all ${base.length.toLocaleString()} products from ${title} at Sasta Milaga.`,
      url        : `${SITE_URL}/#/store/${val}`
    });
  } else if (type === 'deals') {
    base     = getDeals();
    title    = '⚡ Flash Deals';
    subtitle = 'Biggest discounts, in-stock products';
    setSEO({
      title      : 'Best Deals & Discounts – Sasta Milaga Pakistan',
      description: `Save big on ${base.length.toLocaleString()} discounted products at Sasta Milaga. Up to 70% off on fashion, electronics, beauty and more.`,
      url        : `${SITE_URL}/#/deals`
    });
  } else {
    base     = products;
    title    = qFromUrl ? `Search: "${qFromUrl}"` : 'Search Everything';
    subtitle = 'Search by name, category, store, description and tags';
    setSEO({
      title      : qFromUrl ? `"${qFromUrl}" – Search Results at Sasta Milaga` : 'Search All Products – Sasta Milaga Pakistan',
      description: `Search results for "${qFromUrl}" at Sasta Milaga Pakistan.`,
      url        : `${SITE_URL}/#/search?q=${encodeURIComponent(qFromUrl)}`
    });
  }

  state.base = base;
  state.filters.q = (type === 'search') ? qFromUrl : '';

  const heroImg   = img(base.find(p => img(p)) || products[0]);
  const leafChips = (cat && cat.leaves && cat.leaves.length > 1)
    ? `<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
        <a class="tag-chip ${!leafFromUrl ? 'active' : ''}" href="#/category/${val}" style="${!leafFromUrl ? 'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)' : ''}">All</a>
        ${cat.leaves.slice(0, 20).map(l =>
          `<a class="tag-chip ${slug(l) === leafFromUrl ? 'active' : ''}" href="#/category/${val}?leaf=${encodeURIComponent(slug(l))}" style="${slug(l) === leafFromUrl ? 'background:rgba(200,169,110,.22);border-color:rgba(200,169,110,.5)' : ''}">${esc(l)}</a>`
        ).join('')}
       </div>`
    : '';

  renderApp([
    '<section class="hero" style="min-height:320px">',
      '<div class="hero-content">',
        `<span class="eyebrow">${type === 'tag' ? 'Tag page' : type === 'category' ? 'Category page' : 'Results'}</span>`,
        `<h1>${esc(title)}</h1>`,
        `<p>${esc(subtitle)}. Filter by price, brand, stock and layout.</p>`,
        leafChips,
      '</div>',
      `<div class="blast-badge" aria-hidden="true">${base.length.toLocaleString()}<br>Items</div>`,
      `<div class="hero-float-grid" aria-hidden="true"><span class="float-card" style="right:80px;top:40px"><img src="${esc(heroImg)}" onerror="this.src=window.fallbackImg" alt="${esc(title)}"><b>${esc(title)}</b></span></div>`,
    '</section>',

    '<section class="section listing-shell">',
      '<aside class="filter-panel" aria-label="Product filters">',
        '<h2 style="margin:0 0 8px;font-size:1.3rem">🎛️ Filters</h2>',
        '<p style="color:var(--muted2);margin:0 0 14px;font-size:.82rem">Filter by price, tags, brand, stock &amp; video.</p>',

        '<div class="filter-group">',
          '<label for="filterQ">Search inside results</label>',
          `<input id="filterQ" value="${esc(state.filters.q)}" placeholder="Search products…" aria-label="Search within results">`,
        '</div>',

        '<div class="filter-group">',
          '<label>Price range (PKR)</label>',
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">',
            '<input id="minP" type="number" min="0" placeholder="Min" aria-label="Minimum price">',
            '<input id="maxP" type="number" min="0" placeholder="Max" aria-label="Maximum price">',
          '</div>',
        '</div>',

        '<div class="filter-group">',
          '<label for="sortBy">Sort by</label>',
          '<select id="sortBy" aria-label="Sort products">',
            '<option value="relevant">Most Relevant</option>',
            '<option value="low">Lowest Price</option>',
            '<option value="high">Highest Price</option>',
            '<option value="discount">Biggest Discount</option>',
            '<option value="new">Newest</option>',
            '<option value="media">Most Visual</option>',
          '</select>',
        '</div>',

        '<div class="filter-group">',
          '<label>Popular Tags</label>',
          '<div class="chip-cloud" id="filterTags"></div>',
        '</div>',

        '<div class="filter-group">',
          '<label for="storeFilter">Store / Brand</label>',
          '<select id="storeFilter" aria-label="Filter by store"><option value="">All Stores</option></select>',
        '</div>',

        '<div class="filter-group">',
          '<label><input id="stockOnly" type="checkbox" style="width:auto;margin-right:6px"> In stock only</label>',
          '<label style="margin-top:8px;display:block"><input id="videoOnly" type="checkbox" style="width:auto;margin-right:6px"> Video available</label>',
        '</div>',

        '<button class="primary-btn" id="applyFilters" style="width:100%;margin-top:16px">Apply Filters</button>',
        '<button class="ghost-btn" id="clearFilters" style="width:100%;margin-top:8px">Clear All</button>',
      '</aside>',

      '<div class="content-panel">',
        '<div class="listing-tools">',
          `<div><h2 id="resultTitle" style="font-size:1.4rem;margin:0">${esc(title)}</h2><p id="resultCount" style="margin:.3rem 0 0;color:var(--muted2)">Loading…</p></div>`,
          '<div class="view-toggle">',
            '<button class="ghost-btn active" data-view="grid" aria-label="Grid view">⊞ Grid</button>',
            '<button class="ghost-btn" data-view="list" aria-label="List view">≡ List</button>',
          '</div>',
        '</div>',
        '<div id="resultGrid" class="products-row"></div>',
        '<div class="load-more-wrap"><button class="ghost-btn" id="loadMore">Load more products ↓</button></div>',
      '</div>',
    '</section>'
  ].join(''));

  buildFilterControls(base);
  bindListingControls();
  drawResults();

  /* Pre-set search query if coming from search page */
  const filterQ = $('#filterQ');
  if (filterQ && type === 'search' && qFromUrl) filterQ.value = qFromUrl;
}

function buildFilterControls(base) {
  const localTags = {};
  base.forEach(p => (p.tags || []).slice(0, 10).forEach(t => { localTags[t] = (localTags[t] || 0) + 1; }));
  const filterTags = $('#filterTags');
  if (filterTags) {
    filterTags.innerHTML = Object.entries(localTags).sort((a, b) => b[1] - a[1]).slice(0, 45)
      .map(([t, c]) => `<button class="tag-chip small" data-filter-tag="${esc(t)}">#${esc(t)} <small>${c}</small></button>`)
      .join('');
  }
  const storeFilter = $('#storeFilter');
  if (storeFilter) {
    const localStores = [...new Set(base.map(p => p.store).filter(Boolean))].sort().slice(0, 200);
    storeFilter.innerHTML += localStores.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
  }
}

function bindListingControls() {
  const apply  = $('#applyFilters');
  const clear  = $('#clearFilters');
  const more   = $('#loadMore');

  if (apply)  apply.onclick = () => { state.limit = 60; drawResults(); };
  if (more)   more.onclick  = () => { state.limit += 60; drawResults(); };
  if (clear)  clear.onclick = () => {
    ['filterQ','minP','maxP'].forEach(id => { const el = $('#' + id); if (el) el.value = ''; });
    ['sortBy','storeFilter'].forEach(id => { const el = $('#' + id); if (el) el.value = el.options[0].value; });
    ['stockOnly','videoOnly'].forEach(id => { const el = $('#' + id); if (el) el.checked = false; });
    $$('[data-filter-tag].active').forEach(b => { b.classList.remove('active'); b.style.background = ''; b.style.borderColor = ''; });
    state.limit = 60;
    drawResults();
  };

  $$('.view-toggle button').forEach(b => {
    b.onclick = () => {
      state.view = b.dataset.view;
      $$('.view-toggle button').forEach(x => x.classList.toggle('active', x === b));
      drawResults();
    };
  });

  $$('#filterTags [data-filter-tag]').forEach(b => {
    b.onclick = () => {
      b.classList.toggle('active');
      b.style.background   = b.classList.contains('active') ? 'rgba(200,169,110,.22)' : '';
      b.style.borderColor  = b.classList.contains('active') ? 'rgba(200,169,110,.5)'  : '';
      state.limit = 60;
      drawResults();
    };
  });

  ['filterQ', 'minP', 'maxP', 'sortBy', 'storeFilter', 'stockOnly', 'videoOnly'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('input', () => { state.limit = 60; drawResults(); });
  });
}

function filteredResults() {
  let arr = [...(state.base || products)];
  const q            = (($('#filterQ') || {}).value || '').toLowerCase().trim();
  const min          = num(($('#minP') || {}).value);
  const max          = num(($('#maxP') || {}).value);
  const store        = (($('#storeFilter') || {}).value) || '';
  const stockOnly    = !!(($('#stockOnly') || {}).checked);
  const videoOnly    = !!(($('#videoOnly') || {}).checked);
  const selectedTags = $$('[data-filter-tag].active').map(b => b.dataset.filterTag);
  const sort         = (($('#sortBy') || {}).value) || 'relevant';

  if (q)           arr = arr.filter(p => p._search.includes(q));
  if (min)         arr = arr.filter(p => price(p) >= min);
  if (max)         arr = arr.filter(p => price(p) <= max);
  if (store)       arr = arr.filter(p => p.store === store);
  if (stockOnly)   arr = arr.filter(p => p.in || num(p.stock) > 0);
  if (videoOnly)   arr = arr.filter(p => (p.vids || []).length > 0);
  if (selectedTags.length) arr = arr.filter(p => selectedTags.every(t => (p.tags || []).includes(t)));

  arr.sort((a, b) => {
    if (sort === 'low')      return price(a) - price(b);
    if (sort === 'high')     return price(b) - price(a);
    if (sort === 'discount') return discount(b) - discount(a);
    if (sort === 'new')      return String(b.updated || '').localeCompare(String(a.updated || ''));
    if (sort === 'media')    return ((b.imgs || []).length + (b.vids || []).length) - ((a.imgs || []).length + (a.vids || []).length);
    return discount(b) - discount(a);
  });
  return arr;
}

function drawResults() {
  const arr         = filteredResults();
  const countEl     = $('#resultCount');
  const gridEl      = $('#resultGrid');
  const loadMoreEl  = $('#loadMore');
  if (countEl) countEl.textContent = `${arr.length.toLocaleString()} matching products`;
  const shown = arr.slice(0, state.limit);
  if (gridEl) {
    gridEl.className = state.view === 'list' ? 'product-list' : 'products-row';
    gridEl.innerHTML = shown.length
      ? shown.map(productCard).join('')
      : '<div class="empty-state"><h2>No products found</h2><p>Try fewer filters or ask Sasta AI for help.</p></div>';
  }
  if (loadMoreEl) loadMoreEl.style.display = arr.length > state.limit ? 'inline-flex' : 'none';
}

/* ============================================================
   PRODUCT DETAIL PAGE (PDP)
   ============================================================ */
function renderPDP(handle) {
  const p = byHandle.get(slug(handle)) || products[0];
  if (!p) { renderApp('<div class="empty-state"><h2>Product not found</h2><a class="primary-btn" href="#/home">Go Home</a></div>'); return; }

  const related = products.filter(x =>
    x.id !== p.id && (x.m === p.m || (x.tags || []).some(t => (p.tags || []).includes(t)))
  ).slice(0, 8);

  const media    = [...(p.imgs || []).map(u => ({ u, type: 'img' })), ...(p.vids || []).map(u => ({ u, type: 'video' }))];
  const first    = media[0] || { u: fallbackImg, type: 'img' };
  const seoTitle = p.seoT || p.n;
  const seoDesc  = p.seoD || p.sd || p.d || `Buy ${p.n} at the best price in Pakistan. Available at Sasta Milaga.`;
  const seoImg   = img(p) !== fallbackImg ? img(p) : `${SITE_URL}/sasta-milaga-logo-final.png`;

  setSEO({
    title      : `${seoTitle} – Buy at PKR ${PKR.format(price(p))} in Pakistan`,
    description: seoDesc,
    image      : seoImg,
    url        : `${SITE_URL}/#/product/${p._slug}`,
    ldJson     : productLdJson(p)
  });

  const breadcrumbHtml = `<div class="breadcrumbs" aria-label="Breadcrumb">
    <a href="#/home">Home</a> ›
    ${p.m ? `<a href="#/category/${p._catSlug}">${esc(p.m)}</a> ›` : ''}
    ${p.leaf ? `<a href="#/category/${p._catSlug}?leaf=${slug(p.leaf)}">${esc(p.leaf)}</a> ›` : ''}
    <span>${esc(p.n)}</span>
  </div>`;

  const thumbsHtml = media.map((m, i) =>
    `<button data-gallery="${esc(m.u)}" data-type="${m.type}" aria-label="View media ${i + 1}" class="${i === 0 ? 'active' : ''}">
      ${mediaElement(m.u, m.type, p.n)}
    </button>`
  ).join('');

  renderApp([
    '<section class="pdp" aria-label="Product detail">',
      '<div>',
        '<div class="gallery-panel">',
          `<div class="gallery-main" id="galleryMain">${mediaElement(first.u, first.type, p.n)}</div>`,
          `<div class="gallery-thumbs" role="list" aria-label="Product images">${thumbsHtml}</div>`,
        '</div>',
        '<div class="detail-panel">',
          breadcrumbHtml,
          '<h2 style="margin-top:14px">Product Details</h2>',
          `<p style="line-height:1.7;color:var(--muted2)">${esc(p.d || p.sd || p.seoD || 'Full product details at Sasta Milaga.')}</p>`,
          (p.tags || []).length ? `<h3 style="font-size:1rem;margin:14px 0 8px;color:var(--muted2)">Tags</h3><div class="tags-wrap">${(p.tags || []).map(tagLink).join('')}</div>` : '',
          p.sku ? `<p style="margin-top:14px;color:var(--muted);font-size:.82rem">SKU: <code>${esc(p.sku)}</code> &nbsp;|&nbsp; ID: <code>${esc(p.id)}</code></p>` : '',
        '</div>',
      '</div>',

      '<aside class="buy-panel" aria-label="Purchase options">',
        `<span class="eyebrow">${esc(p.m)}${p.leaf ? ' › ' + esc(p.leaf) : ''}</span>`,
        `<h1>${esc(p.n)}</h1>`,
        `<p class="product-meta">Sold by: <a href="#/store/${p._storeSlug}" style="color:var(--gold2)">${esc(p.store || SITE_NAME)}</a>${p.sku ? ` · SKU: ${esc(p.sku)}` : ''}</p>`,
        '<div style="margin:12px 0">',
          `<span class="big-price">${PKR.format(price(p))}</span>`,
          oldPrice(p) > price(p) ? ` <span class="old-price">${PKR.format(oldPrice(p))}</span>` : '',
          discount(p) ? ` <span class="discount" style="position:static;display:inline-block;margin-left:8px">-${discount(p)}%</span>` : '',
        '</div>',
        `<div class="tags-wrap" style="margin:10px 0">`,
          discount(p) ? `<span class="tag-chip" style="background:rgba(200,169,110,.2);border-color:rgba(200,169,110,.4)">💰 ${discount(p)}% Off</span>` : '',
          `<span class="tag-chip">${(p.in || num(p.stock) > 0) ? '✅ In Stock' : '⚠️ Check Availability'}</span>`,
          (p.vids || []).length ? '<span class="tag-chip">🎬 Video Available</span>' : '',
        '</div>',
        '<div class="qty" aria-label="Quantity selector">',
          '<button onclick="changeQty(-1)" aria-label="Decrease quantity">−</button>',
          '<b id="qty" aria-live="polite">1</b>',
          '<button onclick="changeQty(1)" aria-label="Increase quantity">+</button>',
        '</div>',
        '<div class="buy-actions">',
          `<button class="primary-btn" data-add-cart="${esc(p.id)}" aria-label="Add to cart">🛒 Add to Cart</button>`,
          `<a class="ghost-btn" href="#/checkout" onclick="addToCart('${esc(p.id)}',Number((document.getElementById('qty')||{}).textContent||1))" aria-label="Buy now">⚡ Buy Now</a>`,
        '</div>',
        `<button class="ghost-btn" style="width:100%;margin-top:8px" data-wish="${esc(p.id)}" aria-label="Save to wishlist">♡ Save to Wishlist</button>`,
        buildShareBar(p),
      '</aside>',
    '</section>',

    '<section class="section">',
      `<div class="section-head"><div><h2>${esc(crossTitle(p))}</h2><p>More products from the same category and tags.</p></div></div>`,
      `<div class="products-row">${related.map(productCard).join('')}</div>`,
    '</section>'
  ].join(''));
}

function crossTitle(p) {
  const m = (p.m || '').toLowerCase();
  if (m.includes('fashion'))     return 'Complete the Look';
  if (m.includes('home'))        return 'Style Your Space';
  if (m.includes('beauty'))      return 'Build Your Beauty Routine';
  if (m.includes('automotive'))  return 'Car Care Bundle';
  if (m.includes('electronic'))  return 'You May Also Like';
  return 'Frequently Bought Together';
}

function changeQty(n) {
  const q = $('#qty');
  if (q) q.textContent = Math.max(1, Number(q.textContent || 1) + n);
}
window.changeQty = changeQty;

function setGallery(url, type) {
  const main = $('#galleryMain');
  if (main) main.innerHTML = mediaElement(url, type, ($('h1') || {}).textContent || 'Product');
  $$('.gallery-thumbs button').forEach(b => b.classList.toggle('active', b.dataset.gallery === url));
}

function mediaElement(url, type, alt) {
  if (type === 'video') return `<video src="${esc(url)}" controls muted playsinline></video>`;
  return `<img src="${esc(url || fallbackImg)}" alt="${esc(alt)}" loading="lazy" onerror="this.src=window.fallbackImg">`;
}

/* ============================================================
   PRODUCT CARD
   ============================================================ */
function productCard(p) {
  return `<article class="product-card" itemscope itemtype="https://schema.org/Product">
    <a href="#/product/${p._slug}" class="product-media" aria-label="${esc(p.n)}">
      ${discount(p) ? `<span class="discount" aria-label="${discount(p)}% off">-${discount(p)}%</span>` : ''}
      ${(p.vids || []).length
        ? `<video src="${esc(p.vids[0])}" poster="${esc(img(p))}" muted loop playsinline onmouseover="this.play()" onmouseout="this.pause()" aria-label="${esc(p.n)} video"></video>`
        : `<img src="${esc(img(p))}" alt="${esc((p.alt && p.alt[0]) || p.n)}" loading="lazy" onerror="this.src=window.fallbackImg" itemprop="image">`}
    </a>
    <div class="product-body">
      <a class="product-title" href="#/product/${p._slug}" itemprop="name">${esc(p.n)}</a>
      <div class="product-meta">${esc(p.m)} · ${esc(p.leaf || p.store || '')}</div>
      <div class="tags-wrap">${(p.tags || []).slice(0, 3).map(tagLinkSmall).join('')}</div>
      <div class="price-line">
        <div>
          <div class="price" itemprop="offers" itemscope itemtype="https://schema.org/Offer">
            <span itemprop="price" content="${price(p)}">${PKR.format(price(p))}</span>
            <meta itemprop="priceCurrency" content="PKR">
          </div>
          ${oldPrice(p) > price(p) ? `<div class="old-price">${PKR.format(oldPrice(p))}</div>` : ''}
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

function masonryCard(p) {
  const ratio = 0.75 + ((p._i % 5) * 0.12);
  return `<div style="--ratio:1/${ratio.toFixed(2)}">${productCard(p)}</div>`;
}

function tagLink(t)      { return `<a class="tag-chip" href="#/tag/${slug(t)}" aria-label="Browse ${esc(t)} products">#${esc(t)}</a>`; }
function tagLinkSmall(t) { return `<a class="tag-chip small" href="#/tag/${slug(t)}">#${esc(t)}</a>`; }

/* ============================================================
   DEALS
   ============================================================ */
function getDeals() {
  return products.filter(p => price(p) > 0 && img(p)).sort((a, b) => discount(b) - discount(a) || price(a) - price(b));
}

function shuffle(arr) {
  return [...arr].sort((a, b) => ((a._i * 9301 + 49297) % 233280) - ((b._i * 9301 + 49297) % 233280));
}

function startCountdown() {
  const el  = $('#countdown');
  if (!el) return;
  const end = Date.now() + 1000 * 60 * 60 * 6;
  clearInterval(window.__saleTimer);
  window.__saleTimer = setInterval(() => {
    const elNow = $('#countdown');
    if (!elNow) { clearInterval(window.__saleTimer); return; }
    const left  = Math.max(0, end - Date.now());
    const h = String(Math.floor(left / 3600000)).padStart(2, '0');
    const m = String(Math.floor(left % 3600000 / 60000)).padStart(2, '0');
    const s = String(Math.floor(left % 60000 / 1000)).padStart(2, '0');
    elNow.textContent = `⏱ Flash sale: ${h}:${m}:${s}`;
  }, 1000);
}

/* ============================================================
   QUICK VIEW MODAL
   ============================================================ */
function openQuick(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const body = $('#quickModalBody');
  if (body) {
    body.innerHTML = `<div class="quick-view">
      <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=window.fallbackImg" loading="lazy">
      <div>
        <span class="eyebrow">${esc(p.m)}</span>
        <h2>${esc(p.n)}</h2>
        <p style="color:var(--muted2);line-height:1.6">${esc(p.sd || p.seoD || '')}</p>
        <div class="big-price">${PKR.format(price(p))}</div>
        <div class="tags-wrap">${(p.tags || []).slice(0, 10).map(tagLink).join('')}</div>
        <div class="buy-actions">
          <button class="primary-btn" data-add-cart="${esc(p.id)}">🛒 Add to Cart</button>
          <a class="ghost-btn" href="#/product/${p._slug}">Full Details →</a>
        </div>
        ${buildShareBar(p)}
      </div>
    </div>`;
  }
  const modal = $('#quickModal');
  if (modal) { modal.classList.add('open'); modal.removeAttribute('aria-hidden'); }
  document.body.classList.add('lock');
}

function closeModal() {
  const modal = $('#quickModal');
  if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
  document.body.classList.remove('lock');
}

/* ============================================================
   CART / WISHLIST / CHECKOUT
   ============================================================ */
function getCart() { try { return JSON.parse(localStorage.getItem('sm_cart') || '[]'); } catch(e){ return []; } }
function setCart(c){ try { localStorage.setItem('sm_cart', JSON.stringify(c)); } catch(e){} updateCounts(); }
function getWish() { try { return JSON.parse(localStorage.getItem('sm_wish') || '[]'); } catch(e){ return []; } }
function setWish(w){ try { localStorage.setItem('sm_wish', JSON.stringify(w)); } catch(e){} updateCounts(); }

function addToCart(id, qty) {
  qty = Number(qty) || 1;
  const cart = getCart();
  const row  = cart.find(x => x.id === id);
  if (row) row.qty += qty; else cart.push({ id, qty });
  setCart(cart);
  toast('🛒 Added to cart!');
}

function toggleWish(id) {
  let w = getWish();
  const had = w.includes(id);
  w = had ? w.filter(x => x !== id) : [...w, id];
  setWish(w);
  toast(had ? 'Removed from wishlist' : '♡ Saved to wishlist');
}

function updateCounts() {
  const cc = $('#cartCount');
  const wc = $('#wishCount');
  if (cc) cc.textContent = getCart().reduce((a, x) => a + (x.qty || 0), 0);
  if (wc) wc.textContent = getWish().length;
}

function renderCart() {
  setSEO({ title: 'Your Shopping Cart', description: 'Review your items and proceed to checkout at Sasta Milaga Pakistan.', url: `${SITE_URL}/#/cart` });
  const cart = getCart();
  const rows = cart.map(x => ({ item: products.find(p => p.id === x.id), qty: x.qty })).filter(x => x.item);
  const sub  = rows.reduce((a, x) => a + price(x.item) * x.qty, 0);
  renderApp(`<section class="section">
    <div class="section-head"><div><h2>🛒 Your Cart</h2><p>Review items and proceed to checkout.</p></div></div>
    ${rows.length
      ? `<div class="cart-layout"><div>${rows.map(({ item, qty }) => cartLine(item, qty)).join('')}</div>${summaryBox(sub)}</div>`
      : empty('Your cart is empty', 'Shop Flash Deals', '#/deals')}
  </section>`);
}

function cartLine(p, qty) {
  return `<div class="cart-line">
    <img src="${esc(img(p))}" alt="${esc(p.n)}" onerror="this.src=window.fallbackImg">
    <div>
      <b>${esc(p.n)}</b>
      <p style="color:var(--muted);margin:4px 0">${esc(p.m)} · ${esc(p.leaf || '')}</p>
      <div class="price">${PKR.format(price(p))}</div>
    </div>
    <div>
      <div class="qty">
        <button onclick="cartQty('${esc(p.id)}',-1)" aria-label="Decrease">−</button>
        <b>${qty}</b>
        <button onclick="cartQty('${esc(p.id)}',1)" aria-label="Increase">+</button>
      </div>
      <button class="ghost-btn" onclick="removeCart('${esc(p.id)}')" style="margin-top:8px">Remove</button>
    </div>
  </div>`;
}

function cartQty(id, n) {
  setCart(getCart().map(x => x.id === id ? { ...x, qty: Math.max(1, x.qty + n) } : x));
  renderCart();
}
function removeCart(id) { setCart(getCart().filter(x => x.id !== id)); renderCart(); }
window.cartQty    = cartQty;
window.removeCart = removeCart;

function summaryBox(sub) {
  const delivery = sub > 5000 ? 0 : 250;
  const total    = sub + delivery;
  return `<aside class="summary-box">
    <h2 style="margin:0 0 14px">Order Summary</h2>
    <div class="summary-row"><span>Subtotal</span><b>${PKR.format(sub)}</b></div>
    <div class="summary-row"><span>Delivery</span><b>${delivery ? PKR.format(delivery) : '🎉 Free'}</b></div>
    <div class="summary-row" style="border:0;font-size:1.2rem"><span>Total</span><b style="color:var(--gold2)">${PKR.format(total)}</b></div>
    <a class="primary-btn" style="width:100%;justify-content:center;display:flex;margin-top:14px" href="#/checkout">Proceed to Checkout →</a>
  </aside>`;
}

function renderWishlist() {
  setSEO({ title: 'My Wishlist', description: 'Your saved products at Sasta Milaga Pakistan.', url: `${SITE_URL}/#/wishlist` });
  const ids  = getWish();
  const list = products.filter(p => ids.includes(p.id));
  renderApp(`<section class="section">
    <div class="section-head"><div><h2>♡ Wishlist</h2><p>Saved products for later.</p></div></div>
    ${list.length ? `<div class="products-row">${list.map(productCard).join('')}</div>` : empty('Wishlist is empty', 'Explore Categories', '#/home')}
  </section>`);
}

function renderCheckout() {
  setSEO({ title: 'Checkout – Sasta Milaga Pakistan', description: 'Complete your order. Fast, secure checkout with Cash on Delivery.', url: `${SITE_URL}/#/checkout` });
  const rows = getCart().map(x => ({ item: products.find(p => p.id === x.id), qty: x.qty })).filter(x => x.item);
  const sub  = rows.reduce((a, x) => a + price(x.item) * x.qty, 0);
  renderApp(`<section class="section">
    <div class="section-head">
      <div><span class="eyebrow">Cart → Details → Payment → Confirm</span><h2>Fast Checkout</h2><p>Cash on Delivery, bank transfer or wallet.</p></div>
    </div>
    <div class="checkout-layout">
      <div class="detail-panel form-grid" style="padding:20px">
        <!-- Updated form to send to Formspree -->
        <form id="checkoutForm" action="https://formspree.io/f/${FORMSPREE_ID}" method="POST" class="form-grid" style="display:contents">
            <input required name="name" placeholder="Full name" aria-label="Full name">
            <input required name="phone" placeholder="Phone number" type="tel" aria-label="Phone number">
            <input placeholder="Email (optional)" type="email" name="email" aria-label="Email">
            <select aria-label="Payment method" name="payment">
              <option>Cash on Delivery (COD)</option>
              <option>Bank Transfer</option>
              <option>EasyPaisa / JazzCash</option>
            </select>
            <textarea required name="address" placeholder="Complete delivery address" aria-label="Delivery address"></textarea>
            <textarea placeholder="Order notes (optional)" name="notes" aria-label="Order notes"></textarea>
            
            <!-- Hidden fields for order data -->
            <input type="hidden" name="order_total" value="${sub}">
            <input type="hidden" name="_subject" value="New Order from Sasta Milaga">
            
            <button type="submit" class="primary-btn" style="grid-column:1/-1;padding:16px">🚀 Place Order</button>
        </form>
      </div>
      ${summaryBox(sub)}
    </div>
  </section>`);
  
  // Bind Checkout Form Logic
  const form = $('#checkoutForm');
  if (form) {
      form.addEventListener('submit', function(ev) {
      ev.preventDefault();
      const data = new FormData(form);
      const xhr = new XMLHttpRequest();
      xhr.open(form.method, form.action);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.onreadystatechange = function() {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        if (xhr.status === 200) {
          form.reset();
          localStorage.removeItem('sm_cart');
          updateCounts();
          renderApp('<section class="section"><div class="empty-state"><h2>✅ Order Placed!</h2><p>Thank you for shopping with Sasta Milaga. We will contact you shortly.</p><a class="primary-btn" href="#/home">Continue Shopping</a></div>');
        } else {
          toast("Oops! There was a problem submitting your order.");
        }
      };
      xhr.send(data);
    });
  }
}

function empty(title, cta, href) {
  return `<div class="empty-state"><h2>${esc(title)}</h2><p>Everything is searchable and image-led at Sasta Milaga.</p><a class="primary-btn" href="${esc(href)}">${esc(cta)}</a></div>`;
}

function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ============================================================
   AI CHATBOT
   ============================================================ */
const CHAT_CHIPS = [
  { label: '📱 Mobiles Under 5k',  query: 'mobile under 5000'  },
  { label: '💄 Beauty & Cosmetics', query: 'cosmetics'          },
  { label: '👗 Fashion Deals',      query: 'fashion sale'       },
  { label: '🚗 Car Accessories',    query: 'car accessories'    },
  { label: '🇵🇰 Delivery Info',     query: 'delivery info'      },
  { label: '💳 Payment Methods',   query: 'payment methods'    },
  { label: '🔄 Return Policy',      query: 'return policy'      },
  { label: '❓ How to Order',       query: 'how to order'       }
];

function drawChatChips() {
  const container = $('#chatChips');
  if (!container) return;
  container.innerHTML = CHAT_CHIPS.map(chip =>
    `<button class="chat-chip" onclick="handleChipClick('${esc(chip.query)}')">${esc(chip.label)}</button>`
  ).join('');
}

window.handleChipClick = function (query) {
  addBotMessage(esc(query), true);
  answerBot(query);
};

function addBotMessage(html, user) {
  user = !!user;
  const div = document.createElement('div');
  div.className = 'chat-msg' + (user ? ' user' : '');
  div.innerHTML  = user ? esc(html) : html;
  const chatLog  = $('#chatLog');
  if (chatLog) { chatLog.appendChild(div); chatLog.scrollTop = chatLog.scrollHeight; }
}

function answerBot(q) {
  const l = q.toLowerCase().trim();

  if (l.includes('delivery') || l.includes('shipping') || l.includes('cities') || l.includes('delivery fee')) {
    addBotMessage(`📦 <b>Delivery Info:</b><br>• Flat fee: <b>PKR 250</b> across Pakistan.<br>• <b>Free shipping</b> on orders above PKR 5,000.<br>• Major cities: 2–4 working days. Other areas: 3–6 days.`);
    return;
  }
  if (l.includes('payment') || l.includes('pay') || l.includes('easypaisa') || l.includes('jazzcash') || l.includes('cod')) {
    addBotMessage(`💳 <b>Payment Methods:</b><br>• <b>Cash on Delivery (COD)</b> – pay at your door.<br>• <b>EasyPaisa / JazzCash</b> – mobile wallets.<br>• <b>Bank Transfer</b> – direct online.<br>• <b>Credit / Debit Card</b>`);
    return;
  }
  if (l.includes('return') || l.includes('refund') || l.includes('exchange')) {
    addBotMessage(`🔄 <b>7-Day Easy Returns:</b><br>• Request within 7 days of delivery.<br>• Damaged / wrong items: <b>free return</b>.<br>• Other returns: PKR 250 return fee.<br>• Contact us on WhatsApp to start the process.`);
    return;
  }
  if (l.includes('order') || l.includes('how to buy') || l.includes('purchase')) {
    addBotMessage(`🛒 <b>How to Order:</b><br>1. Open a product page.<br>2. Choose quantity → <b>Add to Cart</b>.<br>3. Open cart → <b>Proceed to Checkout</b>.<br>4. Fill in your details and <b>Place Order</b>.`);
    return;
  }
  if (l.includes('contact') || l.includes('whatsapp') || l.includes('support') || l.includes('helpline')) {
    addBotMessage(`📞 <b>Customer Support:</b><br>• WhatsApp: <a href="https://wa.me/923000000000" target="_blank" style="color:var(--gold2)">+92 300 0000000</a><br>• Email: ${ADMIN_EMAIL}<br>• Hours: 9 AM – 9 PM (Mon–Sat)`);
    return;
  }

  let queryTerms = l;
  if (l.includes('phone') || l.includes('smartphone'))           queryTerms += ' mobile';
  if (l.includes('makeup') || l.includes('lip') || l.includes('cream')) queryTerms += ' beauty cosmetics';
  if (l.includes('clothes') || l.includes('dress') || l.includes('shirt')) queryTerms += ' fashion';
  if (l.includes('home') || l.includes('decor') || l.includes('kitchen')) queryTerms += ' home-decor';

  const maxMatch = l.match(/under\s*(?:rs\.?|pkr)?\s*(\d+)/i);
  const minMatch = l.match(/over\s*(?:rs\.?|pkr)?\s*(\d+)/i);
  const maxP = maxMatch ? Number(maxMatch[1]) : 0;
  const minP = minMatch ? Number(minMatch[1]) : 0;

  let arr = products.filter(p =>
    p._search.includes(queryTerms) || queryTerms.split(/\s+/).some(w => w.length > 2 && p._search.includes(w))
  );

  const catMatch = categories.find(c => queryTerms.includes(c.name.toLowerCase()) || queryTerms.includes(c.slug.replace(/-/g, ' ')));
  if (catMatch) arr = productsForCategory(catMatch.slug);

  const tagMatch = topTags.find(t => queryTerms.includes(t.name.toLowerCase()) || queryTerms.includes(t.slug.replace(/-/g, ' ')));
  if (tagMatch) arr = productsForTag(tagMatch.slug);

  if (maxP) arr = arr.filter(p => price(p) <= maxP);
  if (minP) arr = arr.filter(p => price(p) >= minP);
  if (queryTerms.includes('video'))                     arr = arr.filter(p => (p.vids || []).length > 0);
  if (queryTerms.includes('stock') || queryTerms.includes('available')) arr = arr.filter(p => p.in || num(p.stock) > 0);

  arr = arr.sort((a, b) =>
    (queryTerms.includes('deal') || queryTerms.includes('discount') || queryTerms.includes('sale'))
      ? discount(b) - discount(a)
      : price(a) - price(b)
  ).slice(0, 5);

  if (!arr.length) {
    addBotMessage(`I couldn't find an exact match for "<b>${esc(q)}</b>". Try: <b>cosmetics</b>, <b>mobile</b>, <b>home decor</b>, <b>fashion</b>, or ask about delivery &amp; returns.`);
    return;
  }

  addBotMessage(
    `<div>Found <b>${arr.length}</b> match${arr.length > 1 ? 'es' : ''}. Tap to view:</div>` +
    `<div class="chat-products">${arr.map(p =>
      `<a class="chat-product" href="#/product/${p._slug}">` +
        `<img src="${esc(img(p))}" onerror="this.src=window.fallbackImg" alt="${esc(p.n)}" loading="lazy">` +
        `<span><b>${esc(p.n)}</b><br><small style="color:var(--gold2)">${PKR.format(price(p))} · ${esc(p.m)}</small></span>` +
      '</a>'
    ).join('')}</div>`
  );
}

/* ============================================================
   FAQ PAGE
   ============================================================ */
function renderFAQ() {
  setSEO({
    title      : 'Frequently Asked Questions (FAQ) – Customer Support',
    description: 'Answers to common questions about Sasta Milaga: delivery times, shipping fees, Cash on Delivery, return policy, and how to order in Pakistan.',
    url        : `${SITE_URL}/#/faq`,
    ldJson     : {
      '@context' : 'https://schema.org',
      '@type'    : 'FAQPage',
      'mainEntity': [
        { '@type': 'Question', 'name': 'What is the shipping cost?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Flat PKR 250 for all orders. Free shipping on orders above PKR 5,000.' } },
        { '@type': 'Question', 'name': 'How long does delivery take?', 'acceptedAnswer': { '@type': 'Answer', 'text': '2–4 working days for major cities; 3–6 days for other areas.' } },
        { '@type': 'Question', 'name': 'What payment methods are accepted?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Cash on Delivery, EasyPaisa, JazzCash, Bank Transfer, and Credit/Debit Cards.' } },
        { '@type': 'Question', 'name': 'What is your return policy?', 'acceptedAnswer': { '@type': 'Answer', 'text': '7-day easy return policy. Damaged items are returned free; other returns carry PKR 250 fee.' } }
      ]
    }
  });

  renderApp(
    '<section class="section">' +
      '<div class="section-head" style="text-align:center;margin-bottom:30px">' +
        '<div>' +
          '<span class="eyebrow">Help Center</span>' +
          '<h2>Frequently Asked Questions</h2>' +
          '<p>Everything you need to know about shopping, shipping, and payments in Pakistan.</p>' +
        '</div>' +
      '</div>' +

      '<div class="faq-accordion">' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">What is the shipping cost and delivery area? <span>+</span></button><div class="faq-content">We deliver to all major cities and small towns across Pakistan. Flat shipping fee of <b>PKR 250</b> for all orders. <b>Free shipping</b> on orders above <b>PKR 5,000</b>.</div></div>' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">How long does delivery take? <span>+</span></button><div class="faq-content"><ul><li><b>2–4 working days</b> for major cities: Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Faisalabad, Multan.</li><li><b>3–6 working days</b> for other towns and rural areas.</li></ul></div></div>' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">What payment methods do you accept? <span>+</span></button><div class="faq-content"><ul><li><b>Cash on Delivery (COD)</b> – Pay at your doorstep.</li><li><b>EasyPaisa / JazzCash</b> – Mobile wallet.</li><li><b>Bank Transfer</b> – Direct online transfer.</li><li><b>Credit / Debit Card</b> – Secure online payment.</li></ul></div></div>' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">What is your return and refund policy? <span>+</span></button><div class="faq-content"><b>7-day return and exchange policy</b> across Pakistan. Damaged, defective, or incorrect items returned free of charge. Other returns: PKR 250 return shipping fee. Contact us on WhatsApp (+92 300 0000000) to start a return.</div></div>' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">How do I track my order? <span>+</span></button><div class="faq-content">You will receive a tracking link via SMS once your order is shipped. You can also contact WhatsApp support at any time with your order number for live updates.</div></div>' +
        '<div class="faq-item"><button class="faq-title" onclick="toggleFaq(this)">Is Cash on Delivery (COD) available everywhere? <span>+</span></button><div class="faq-content">Yes! COD is available across all of Pakistan, including small towns and rural areas. Pay the courier when your parcel arrives – no advance payment needed.</div></div>' +
      '</div>' +
    '</section>'
  );
}

window.toggleFaq = function (btn) {
  const item   = btn.parentElement;
  const isOpen = item.classList.toggle('open');
  btn.querySelector('span').textContent = isOpen ? '−' : '+';
};

/* ============================================================
   ABOUT PAGE
   ============================================================ */
function renderAbout() {
  setSEO({
    title      : "About Us – Pakistan's Best Price Marketplace",
    description: 'Learn about Sasta Milaga, our mission to provide affordable online shopping, delivery coverage across Punjab, Sindh, KPK, Balochistan, and our customer support.',
    url        : `${SITE_URL}/#/about`,
    ldJson     : {
      '@context'   : 'https://schema.org',
      '@type'      : 'Organization',
      'name'       : SITE_NAME,
      'url'        : SITE_URL,
      'description': "Pakistan's affordable marketplace with 13,000+ products and nationwide delivery.",
      'address'    : { '@type': 'PostalAddress', 'addressCountry': 'PK' }
    }
  });

  renderApp(
    '<section class="section">' +
      '<div class="about-hero">' +
        '<span class="eyebrow">About Sasta Milaga</span>' +
        '<h1>Pakistan\'s Affordable Online Hub</h1>' +
        '<p style="max-width:700px;margin:12px auto;color:var(--muted2);line-height:1.7">Sasta Milaga is built with a singular vision: to make high-quality everyday products affordable and accessible to every household in Pakistan. With over 13,000 products, we link buyers to the best deals directly.</p>' +
      '</div>' +
      '<div class="about-metrics">' +
        '<div class="metric-box"><span class="metric-number">13,000+</span><span class="metric-label">Products in Stock</span></div>' +
        '<div class="metric-box"><span class="metric-number">100%</span><span class="metric-label">COD Supported</span></div>' +
        '<div class="metric-box"><span class="metric-number">7 Days</span><span class="metric-label">Easy Returns</span></div>' +
        '<div class="metric-box"><span class="metric-number">24/7</span><span class="metric-label">WhatsApp Helpline</span></div>' +
      '</div>' +
      '<div class="about-grid">' +
        '<div class="about-card"><h3>🇵🇰 Nationwide Delivery</h3><p style="line-height:1.6;color:var(--muted)">We deliver to every corner of Pakistan, covering major cities, districts, and rural towns with reliable shipping networks.</p></div>' +
        '<div class="about-card"><h3>💰 Best Price Guarantee</h3><p style="line-height:1.6;color:var(--muted)">"Sasta Milaga" means "You will get it cheaper". We match or beat local store prices on every product.</p></div>' +
        '<div class="about-card"><h3>⭐ Premium Customer Care</h3><p style="line-height:1.6;color:var(--muted)">Instant WhatsApp helpline assistance for orders, returns, tracking, and custom requests.</p></div>' +
      '</div>' +
      '<div class="about-card" style="margin-top:24px"><h3>📍 Cities We Service</h3><p style="color:var(--muted2)">Primary cities with fast Cash on Delivery:</p><div class="cities-grid">' + ['Lahore','Karachi','Islamabad','Rawalpindi','Faisalabad','Multan','Peshawar','Quetta','Gujranwala','Sialkot','Hyderabad','Sargodha'].map(c => `<div class="city-tag">${esc(c)}</div>`).join('') + '</div></div>' +
    '</section>'
  );
}

/* ============================================================
   EXPOSE TO GLOBAL SCOPE
   ============================================================ */
window.fallbackImg = fallbackImg;

/* Start the app */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}