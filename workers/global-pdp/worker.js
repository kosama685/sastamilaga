/* Sasta Milaga global product page, edge-rendered (Cloudflare Worker "sasta-global-pdp-v6", route sastamilaga.com/global-shop/p/*).
 *
 * Replaces the emergency "inquiry-only" page (sasta-global-product-quota-resilient-v5, 2026-11-14) with the SAME design as the local
 * product pages (p/*.html): shared header/footer via chrome.js, the pdp gallery / details / buy-panel layout and static-bundle.css.
 *
 * Server side (no database, no WordPress): name, SKU, category and main photo come from the 1,024 static lookup buckets on GitHub
 * Pages (data/cj/lookup/<fnv1a&1023>.json, built by tools/build-cj-static-lookup.mjs), so the page cannot fail on D1 quota or a slow origin.
 * In the browser, assets/js/global-pdp.js adds the full gallery, description, options with the destination price
 * (GET /wp-json/sm/v1/gpdp/<pid>), a delivery check (/api/cj/shipping) and the real cart (POST /wp-json/gdcs/v1/live/cart).
 * Pages stay "noindex, follow" exactly as before; no Offer markup is published (prices are confirmed per destination).
 */
export const PAGES = 'https://kosama685.github.io/sastamilaga';
export const SITE = 'https://sastamilaga.com';
const WA = '923343582295';
const CLARITY_SCRIPT = "<!-- Microsoft Clarity project zh6iif5boz -->\n<script type=\"text/javascript\">\n    (function(c,l,a,r,i,t,y){\n        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};\n        t=l.createElement(r);t.async=1;t.src=\"https://www.clarity.ms/tag/\"+i;\n        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);\n    })(window, document, \"clarity\", \"script\", \"zh6iif5boz\");\n</script>\n";
function withClarity(html) {
  // The fetched HTML template may already contain Clarity; avoid double loading.
  if (html.includes('clarity.ms/tag/') || html.includes('"zh6iif5boz"')) return html;
  return html.replace(/<head\b[^>]*>/i, head => head + '\n' + CLARITY_SCRIPT);
}
const BLOCKED_CATEGORY = /adult|sex\s*toy|erotic|condom|lubricant/i;   // same catalogue the WordPress side removes (mu-plugins/sm-live-card-actions.php)

export const bucketOf = id => { let h = 2166136261; for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0; return (h >>> 0) & 1023; };
export const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'product';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const jsonSafe = o => JSON.stringify(o).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

async function getJSON(fetcher, url, ttl) {
  const r = await fetcher(url, {cf: {cacheTtl: ttl, cacheEverything: true}});
  if (!r.ok) throw Object.assign(new Error('upstream ' + r.status), {status: r.status});
  return r.json();
}
async function getText(fetcher, url, ttl) {
  const r = await fetcher(url, {cf: {cacheTtl: ttl, cacheEverything: true}});
  if (!r.ok) throw new Error('template ' + r.status);
  return r.text();
}
export async function lookup(fetcher, id) {
  const key = bucketOf(id).toString(16).padStart(3, '0');
  const b = await getJSON(fetcher, `${PAGES}/data/cj/lookup/${key}.json`, 3600);
  const items = b.items || {};
  const hit = items[id] || items[id.toUpperCase()] || items[id.toLowerCase()];
  if (!hit) return null;
  const [sku, name, category, categorySlug, image] = hit;
  return {id: items[id] ? id : (items[id.toUpperCase()] ? id.toUpperCase() : id.toLowerCase()), sku, name, category, categorySlug, image, snapshot: b.snapshot};
}

const FALLBACK_TEMPLATE = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><!--GPDP:HEAD--><link rel="stylesheet" href="/assets/theme/static-bundle.css"><link rel="stylesheet" href="/assets/css/global-pdp.css"></head><body class="sm-static sm-page-static sm-gpdp-page"><div id="sm-chrome-header" data-prefix="/"></div><main id="main" class="sm-main"><div id="app" class="sm-app"><!--GPDP:MAIN--></div></main><div id="sm-chrome-footer"></div><script src="/assets/js/chrome.js" defer></script><script src="/assets/js/global-pdp.js" defer></script></body></html>`;

export function headHtml(p, canonical) {
  const title = `${p.name} | Sasta Milaga Global Shop`;
  const desc = `${p.name}. Global supplier item: choose an option, check delivery to your country and pay securely. Shipping and the full total are confirmed before payment.`.slice(0, 300);
  const ld = {'@context': 'https://schema.org', '@graph': [
    {'@type': 'BreadcrumbList', itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/'},
      {'@type': 'ListItem', position: 2, name: 'Global Shop', item: SITE + '/c/global/index.html'},
      {'@type': 'ListItem', position: 3, name: p.name, item: canonical}]},
    {'@type': 'Product', '@id': canonical + '#product', name: p.name, sku: p.sku || undefined, category: p.category || undefined, image: p.image ? [p.image] : undefined, url: canonical}]};
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Sasta Milaga">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">${p.image ? `<meta property="og:image" content="${esc(p.image)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonSafe(ld)}</script>`;
}

export function mainHtml(p, canonical) {
  const waText = `Assalam o Alaikum! I want to order:\n${p.name}\nProduct reference: ${p.id}\nQuantity: 1\n${canonical}`;
  const wa = `https://wa.me/${WA}?text=${encodeURIComponent(waText)}`;
  const data = {pid: p.id, sku: p.sku, name: p.name, category: p.category, image: p.image, url: canonical, wa: WA};
  const cat = p.categorySlug ? `<a href="/search/?q=${encodeURIComponent(p.category || '')}">${esc(p.category)}</a> <span aria-hidden="true">/</span> ` : '';
  return `<nav class="sm-crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">/</span> <a href="/c/global/index.html">Global Shop</a> <span aria-hidden="true">/</span> ${cat}<span aria-current="page">${esc(p.name.length > 70 ? p.name.slice(0, 69) + '…' : p.name)}</span></nav>
<section class="pdp gpdp" aria-label="Product detail" data-gpdp>
 <div>
  <div class="gallery-panel"><div class="gallery-main" data-gpdp-main>${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" width="800" height="800" fetchpriority="high" decoding="async">` : ''}</div><div class="gallery-thumbs sm-static-thumbs" data-gpdp-thumbs></div></div>
  <div class="detail-panel"><h2>Product details</h2><div data-gpdp-desc><p class="gpdp-muted">Loading the supplier's product details…</p></div><p class="product-meta">SKU: <code>${esc(p.sku || p.id)}</code> · Product reference: <code>${esc(p.id)}</code></p></div>
 </div>
 <aside class="buy-panel" aria-label="Purchase options">
  <span class="eyebrow">${esc(p.category || 'Global collection')}</span>
  <h1>${esc(p.name)}</h1>
  <p class="product-meta" data-gpdp-dest>Global supplier item · prepaid · shipping confirmed before you pay</p>
  <div class="gpdp-price-row"><span class="big-price" data-gpdp-price>Price for your destination…</span></div>
  <div class="gpdp-options" data-gpdp-options hidden></div>
  <div class="gpdp-qty" data-gpdp-qty-wrap hidden><span id="gpdp-qty-l">Quantity</span><div class="gpdp-qty__ctl" role="group" aria-labelledby="gpdp-qty-l"><button type="button" data-step="-1" aria-label="Decrease quantity">−</button><input data-gpdp-qty type="number" inputmode="numeric" min="1" max="10" value="1" aria-labelledby="gpdp-qty-l"><button type="button" data-step="1" aria-label="Increase quantity">+</button></div></div>
  <div class="gpdp-delivery" data-gpdp-delivery role="status" aria-live="polite" hidden></div>
  <div class="buy-actions"><button type="button" class="primary-btn" data-gpdp-add disabled>Add to cart</button><button type="button" class="ghost-btn" data-gpdp-buy disabled>Buy now</button></div>
  <p class="gpdp-status" data-gpdp-status role="status" aria-live="polite"></p>
  <a class="sm-wa-btn" data-gpdp-wa href="${esc(wa)}" target="_blank" rel="noopener">Order on WhatsApp</a>
  <ul class="sm-buy-facts" role="list"><li>Prepaid secure checkout; the item, shipping and total are confirmed before you pay</li><li>Delivery options depend on your country and the option you choose</li><li>Taxes and import duties are set by your country and may be due on delivery</li><li><a href="/returns/">Returns</a> follow the published returns policy</li></ul>
 </aside>
</section>
<section class="sm-page sm-page--wide sm-faq"><div class="sm-prose"><h2>Questions about this product</h2>
<h3>How do I know the final price?</h3><p>The price shown is for your selected destination. Shipping is added at checkout, and you see the full total before you pay.</p>
<h3>Can you deliver to my country?</h3><p>Choose an option and the page checks the supplier's delivery methods to your destination. If none is available, you are told before anything is added to your cart. See <a href="/shipping-to/">shipping by country</a>.</p>
<h3>Can I pay cash on delivery?</h3><p>No. Global supplier items are prepaid. Cash on delivery applies only to local products in Pakistan.</p>
<h3>Can I return it?</h3><p>Yes, under the published <a href="/returns/">returns policy</a>. Damaged, defective or wrong items are replaced or refunded after review.</p>
</div></section>
<script type="application/json" id="gpdp-data">${jsonSafe(data)}</script>`;
}

function notFound(template) {
  const head = '<title>Product not available | Sasta Milaga</title><meta name="robots" content="noindex, follow">';
  const main = '<section class="sm-page sm-page--wide"><div class="sm-prose"><h1>This product is not available</h1><p>It may have been removed by the supplier. Browse the <a href="/c/global/index.html">global collection</a> or <a href="/search/">search products</a>.</p></div></section>';
  return new Response(withClarity(template.replace('<!--GPDP:HEAD-->', head).replace('<!--GPDP:MAIN-->', main)), {status: 404, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Sasta-Renderer': 'global-pdp-v6'}});
}

export async function handle(request, fetcher = fetch) {
  const url = new URL(request.url);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
  const m = url.pathname.match(/^\/global-shop\/p\/([A-Za-z0-9-]{1,100})(?:\/([^/]*))?\/?$/);
  let template = FALLBACK_TEMPLATE;
  try { const t = await getText(fetcher, `${PAGES}/assets/templates/global-pdp.html`, 300); if (t.includes('<!--GPDP:MAIN-->') && t.includes('<!--GPDP:HEAD-->')) template = t; } catch { /* keep the inline fallback */ }
  if (!m) return notFound(template);
  let p;
  try { p = await lookup(fetcher, m[1]); }
  catch (e) { return new Response('Product data is temporarily unavailable. Please retry shortly.', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '30'}}); }
  if (!p || BLOCKED_CATEGORY.test(p.category || '')) return notFound(template);
  const slug = slugify(p.name), canonical = `${SITE}/global-shop/p/${p.id}/${slug}/`;
  if (!m[2]) return Response.redirect(canonical + url.search, 301);
  const html = withClarity(template.replace('<!--GPDP:HEAD-->', headHtml(p, canonical)).replace('<!--GPDP:MAIN-->', mainHtml(p, canonical)));
  return new Response(request.method === 'HEAD' ? null : html, {status: 200, headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=600', 'X-Sasta-Renderer': 'global-pdp-v6',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin'}});
}

export default { fetch: request => handle(request) };
