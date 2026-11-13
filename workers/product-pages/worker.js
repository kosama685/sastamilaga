/* Sasta Milaga global product pages (Cloudflare Workers, optional R2).
 * Renders a crawlable HTML page for any of the 451,812 CJ products from the existing category shards
 * (data/cj/c/<category>.js). Shards are read from R2 when the CJ_DATA bucket is bound, otherwise from the site.
 *
 * GET /global/p/<category>/<productId>[/<slug>]     product page (301 to the canonical slug)
 * GET /sitemap-global-products.xml                  sitemap index (one sitemap per category)
 * GET /sitemaps/global/<category>.xml               product URLs of one category (largest has 5,866)
 * GET /feeds/google-merchant.xml                   the local-products feed (20,000 products), streamed whole from the static site
 * GET /feeds/global/index.json                     list of Google Merchant feed files (about 4,000 products each)
 * GET /feeds/global/<n>.xml                       one Google Merchant feed file of the global catalogue
 * GET /robots.txt
 *
 * Nothing is invented: name, SKU, image, video, category and the supplier price range come from the CSV snapshot.
 * Prices are shown as estimates (supplier price x margin) and the page says the final price is confirmed on WhatsApp,
 * so no Offer is published in structured data. */

const MARGIN = 1.2;
/* 2026-11-13: these pages are generated from supplier fields only (no description, no verified retail price or stock), so they are thin. Keep them out of the index until a category's products carry real text, photo and price; visitors can still open and order from them. */
const INDEX_PAGES = false;
const ROBOTS_META = INDEX_PAGES ? 'index, follow, max-image-preview:large' : 'noindex, follow';
const memo = new Map();

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), p = url.pathname;
    const cfg = { site: env.SITE_ORIGIN, self: (env.CANONICAL_BASE || url.origin).replace(/\/$/, ''), wa: env.WHATSAPP || '966510451995' };
    try {
      if (p === '/robots.txt') return text(`User-agent: *\nAllow: /\nSitemap: ${cfg.self}/sitemap-global-products.xml\n`, 'text/plain');
      if (p === '/sitemap-global-products.xml') return sitemapIndex(env, cfg);
      let m = p.match(/^\/sitemaps\/global\/([a-z0-9-]+)\.xml$/);
      if (m) return categorySitemap(m[1], env, cfg, ctx);
      if (p === '/feeds/google-merchant.xml') return localFeed(env);
      if (p === '/feeds/global/index.json') return feedIndex(env, cfg, ctx);
      m = p.match(/^\/feeds\/global\/(\d{1,3})\.xml$/);
      if (m) return feedChunk(+m[1], env, cfg, ctx);
      m = p.match(/^\/global\/p\/([a-z0-9-]+)\/([A-Za-z0-9-]+)(?:\/([a-z0-9-]*))?\/?$/);
      if (m) return productPage(m[1], m[2], m[3], env, cfg, ctx);
      if (p === '/' || p === '/global') return Response.redirect(`${cfg.site}/#/global`, 302);
      return notFound(cfg);
    } catch (e) {
      return new Response('Temporarily unavailable', { status: 503, headers: { 'Retry-After': '60' } });
    }
  }
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'product';
const usd = n => '$' + (Math.round(n * MARGIN * 100) / 100).toFixed(2);
const text = (body, type, status = 200, extra = {}) => new Response(body, { status, headers: { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'public, max-age=3600, s-maxage=86400', ...extra } });

async function load(path, env, ctx) {
  if (memo.has(path)) return memo.get(path);
  let body;
  if (env.CJ_DATA) { const o = await env.CJ_DATA.get(path); if (!o) return null; body = await o.text(); }
  else {
    const r = await fetch(`${env.SITE_ORIGIN}/data/cj/${path}`, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!r.ok) return null; body = await r.text();
  }
  if (memo.size > 40) memo.delete(memo.keys().next().value);
  memo.set(path, body); return body;
}
async function manifest(env, ctx) {
  const t = await load('manifest.js', env, ctx); if (!t) throw new Error('manifest');
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}
async function shard(cat, env, ctx) {
  const t = await load(`c/${cat}.js`, env, ctx); if (!t) return null;
  return JSON.parse(t.slice(t.indexOf('[', t.indexOf(',')), t.lastIndexOf(']') + 1));
}


/* ---------- Unique, honest descriptions: only real fields (name, group, category, price band, video, reference) ---------- */
const maskSku = s => String(s || '').replace(/^CJ/i, 'SM-');
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function uniqueDesc(r, c) {
  const [id, sku, name, lo, hi, , video] = r, h = hash(id), pick = (a, k) => a[(h >>> k) % a.length];
  const band = lo ? (hi > lo ? `from ${usd(lo)} to ${usd(hi)}` : `about ${usd(lo)}`) : '';
  const open = pick([`${name} is listed in ${c.n} (${c.g}) at the Sasta Milaga global shop.`, `Find ${name} under ${c.n} in the Sasta Milaga global shop.`, `${name}: a ${String(c.n).toLowerCase()} item from the Sasta Milaga global range, ${c.g}.`, `Sasta Milaga global shop, ${c.g} / ${c.n}: ${name}.`], 0);
  const price = band ? pick([`Estimated price ${band} in US dollars, depending on the option you choose.`, `Prices run ${band} (US dollars, estimated) across the available options.`, `The estimated price is ${band}; the final amount is confirmed before you pay.`], 5) : 'The price is quoted on request.';
  const vid = video ? pick(['A product video is available on the product page.', 'You can watch a video of this item before you order.'], 9) : '';
  const ref = `Reference ${maskSku(sku)}.`;
  const close = pick(['Colour, size, stock and the shipping cost for your country are confirmed with you before payment, and delivery is worldwide.', 'We confirm the option, stock and shipping to your country first; you pay only after that, and we deliver worldwide.', 'Shipping to your country, the exact option and availability are confirmed before you pay. Worldwide delivery.'], 13);
  return [open, price, vid, ref, close].filter(Boolean).join(' ');
}

/* The local-products feed is a 23 MB static file. Stream it through untouched (no buffering, no size cap) so Merchant Center gets all of it. */
async function localFeed(env) {
  const r = await fetch(`${env.SITE_ORIGIN}/feeds/google-merchant.xml`, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!r.ok) return new Response('Feed temporarily unavailable', { status: 503, headers: { 'Retry-After': '300' } });
  return new Response(r.body, { status: 200, headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900, s-maxage=3600', 'X-Content-Type-Options': 'nosniff' } });
}

/* ---------- Google Merchant feed of the global catalogue: files of about 4,000 products ---------- */
function chunkCats(m, per = 4000) { const out = []; let cur = [], n = 0; for (const c of m.cats) { if (n + c.c > per && cur.length) { out.push(cur); cur = []; n = 0; } cur.push(c); n += c.c; } if (cur.length) out.push(cur); return out; }
async function feedIndex(env, cfg, ctx) {
  const m = await manifest(env, ctx), chunks = chunkCats(m);
  return text(JSON.stringify({ total: m.total, files: chunks.length, feeds: chunks.map((cs, i) => ({ url: `${cfg.self}/feeds/global/${i + 1}.xml`, products: cs.reduce((a, c) => a + c.c, 0), categories: cs.length })) }, null, 1), 'application/json', 200, { 'Cache-Control': 'public, max-age=600, s-maxage=3600' });
}
async function feedChunk(k, env, cfg, ctx) {
  const m = await manifest(env, ctx), cats = chunkCats(m)[k - 1]; if (!cats) return notFound(cfg);
  const avail = env.FEED_AVAILABILITY || 'backorder', lead = +(env.FEED_LEAD_DAYS || 14), date = new Date(Date.now() + lead * 864e5).toISOString().slice(0, 10) + 'T00:00+00:00';
  const items = []; let skipped = 0;
  for (const c of cats) {
    const rows = await shard(c.s, env, ctx); if (!rows) continue;
    for (const r of rows) {
      const [id, sku, name, lo, hi, img] = r;
      if (!(lo > 0) || !/^https?:\/\//.test(img || '') || !name) { skipped++; continue; }
      const link = `${cfg.self}/global/p/${c.s}/${id}/${slug(name)}`;   // the canonical address of the product page
      items.push(`<item><g:id>${esc(id)}</g:id><g:title>${esc(String(name).slice(0, 150))}</g:title><g:description>${esc(uniqueDesc(r, c))}</g:description><g:link>${esc(link)}</g:link><g:image_link>${esc(img)}</g:image_link><g:availability>${esc(avail)}</g:availability>${avail === 'backorder' || avail === 'preorder' ? `<g:availability_date>${date}</g:availability_date>` : ''}<g:price>${(Math.round(lo * MARGIN * 100) / 100).toFixed(2)} USD</g:price><g:condition>new</g:condition><g:product_type>${esc(c.g + ' > ' + c.n)}</g:product_type><g:identifier_exists>no</g:identifier_exists></item>`);
    }
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Sasta Milaga global shop (${k})</title><link>${cfg.self}/global/</link><description>Global products with worldwide delivery. Prices are US-dollar estimates; the final price and shipping are confirmed before payment.</description>\n${items.join('\n')}\n</channel></rss>\n`;
  return text(body, 'application/xml', 200, { 'X-Feed-Items': String(items.length), 'X-Feed-Skipped': String(skipped) });
}

async function productPage(cat, pid, given, env, cfg, ctx) {
  const [m, rows] = await Promise.all([manifest(env, ctx), shard(cat, env, ctx)]);
  const c = m.cats.find(x => x.s === cat); if (!c || !rows) return notFound(cfg);
  const r = rows.find(x => x[0] === pid); if (!r) return notFound(cfg);
  const [id, sku, name, lo, hi, img, video] = r, s = slug(name), path = `/global/p/${cat}/${id}/${s}`, canonical = cfg.self + path;
  if (given !== s) return Response.redirect(canonical, 301);
  const price = lo ? (hi > lo ? `${usd(lo)} – ${usd(hi)}` : usd(lo)) : 'Price on request';
  const desc = uniqueDesc(r, c).slice(0, 300);
  const msg = `Assalam o Alaikum! I want to order this global item:\n${name}\nCJ ID: ${id}\nSKU: ${sku}\nEstimated price: ${price}\n${canonical}`;
  const wa = `https://wa.me/${cfg.wa}?text=${encodeURIComponent(msg)}`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Product', '@id': canonical + '#product', name, sku, mpn: id, image: [img], category: c.n, url: canonical, brand: { '@type': 'Brand', name: 'Sasta Milaga' },
      ...(video ? { subjectOf: { '@type': 'VideoObject', name, description: `${name} product video`, thumbnailUrl: img, contentUrl: video, uploadDate: m.snapshot } } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${cfg.self}/` },
      { '@type': 'ListItem', position: 2, name: 'Global shop', item: `${cfg.self}/c/global/index.html` },
      { '@type': 'ListItem', position: 3, name: c.n, item: `${cfg.self}/c/global/${cat}.html` },
      { '@type': 'ListItem', position: 4, name, item: canonical }] }] };
  const idx = rows.indexOf(r), related = rows.slice(Math.max(0, idx - 4), idx).concat(rows.slice(idx + 1, idx + 5)).slice(0, 8);
  const S = cfg.self, relUrl = x => `${S}/global/p/${cat}/${x[0]}/${slug(x[2])}`;
  const spa = `${S}/#/global/p/${cat}/${encodeURIComponent(id)}`;
  const html = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(name.slice(0, 90))} – ${esc(c.n)} | Sasta Milaga</title>
<meta name="description" content="${esc(desc)}"><meta name="robots" content="${ROBOTS_META}">
<link rel="canonical" href="${esc(canonical)}"><link rel="alternate" hreflang="en" href="${esc(canonical)}"><link rel="alternate" hreflang="x-default" href="${esc(canonical)}">
<meta property="og:type" content="product"><meta property="og:site_name" content="Sasta Milaga"><meta property="og:locale" content="en_PK">
<meta property="og:title" content="${esc(name)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image"><meta name="theme-color" content="#0F7A3B">
<link rel="icon" href="${S}/assets/brand/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="${S}/assets/brand/apple-touch-icon.png">
<link rel="stylesheet" href="${S}/assets/theme/static-bundle.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="sm-static sm-page-static">
<div id="sm-chrome-header" data-prefix="/"><header class="sm-fallback-head"><a href="${S}/"><img src="${S}/assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<main id="main" class="sm-main"><div id="app" class="sm-app">
<nav class="sm-crumbs" aria-label="Breadcrumb"><a href="${S}/">Home</a> <span aria-hidden="true">/</span> <a href="${S}/#/global">Global shop</a> <span aria-hidden="true">/</span> <a href="${S}/c/global/${cat}.html">${esc(c.n)}</a> <span aria-hidden="true">/</span> <span aria-current="page">${esc(name.slice(0, 70))}</span></nav>
<section class="pdp" aria-label="Product detail"><div>
<div class="gallery-panel"><div class="gallery-main">${video ? `<video controls playsinline preload="none" poster="${esc(img)}" src="${esc(video)}"></video>` : `<img src="${esc(img)}" alt="${esc(name)}" width="800" height="800" fetchpriority="high" decoding="async">`}</div></div>
<div class="detail-panel"><h2>Product details</h2><p>${esc(uniqueDesc(r, c))}</p><p class="product-meta">Reference: <code>${esc(maskSku(sku))}</code> · Category: <a href="${S}/c/global/${cat}.html">${esc(c.n)}</a> (${esc(c.g)})</p></div></div>
<aside class="buy-panel" aria-label="Order options"><span class="eyebrow">${esc(c.n)}</span><h1>${esc(name)}</h1><p class="product-meta">Global item · delivered worldwide</p>
<div style="margin:12px 0"><span class="big-price">${esc(price)}</span> <small class="sm-est">estimated, US dollars</small></div>
<div class="sm-gactions"><a class="primary-btn sm-buynow" href="${esc(spa)}" style="text-align:center;justify-content:center">Choose options and add to cart</a></div>
<a class="sm-wa-btn" href="${esc(wa)}" target="_blank" rel="noopener" style="display:flex;justify-content:center;text-align:center;text-decoration:none">Order on WhatsApp</a>
<ul class="sm-buy-facts" role="list"><li>Stock, options and shipping to your country are confirmed before you pay</li><li>Pay by card or PayPal link after confirmation</li><li>Prices are estimates; the final total is sent on WhatsApp</li></ul></aside></section>
${related.length ? `<section class="section"><div class="section-head"><div><h2>More in ${esc(c.n)}</h2></div><a class="ghost-btn" href="${S}/c/global/${cat}.html">View all</a></div><ul class="sm-static-links" role="list">${related.map(x => `<li><a href="${esc(relUrl(x))}">${esc(String(x[2]).slice(0, 90))}</a> <span>${x[3] ? esc(usd(x[3])) : ''}</span></li>`).join('')}</ul></section>` : ''}
</div></main>
<div id="sm-chrome-footer"></div>
<script src="${S}/assets/js/chrome.js" defer></script>
</body></html>`;
  return text(html, 'text/html');
}

async function sitemapIndex(env, cfg) {
  const m = await manifest(env);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${m.cats.map(c => `<sitemap><loc>${cfg.self}/sitemaps/global/${c.s}.xml</loc><lastmod>${m.snapshot}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`;
  return text(body, 'application/xml');
}
async function categorySitemap(cat, env, cfg, ctx) {
  const m = await manifest(env, ctx), rows = await shard(cat, env, ctx);
  if (!rows || !m.cats.some(c => c.s === cat)) return notFound(cfg);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.map(r => `<url><loc>${cfg.self}/global/p/${cat}/${r[0]}/${slug(r[2])}</loc><lastmod>${m.snapshot}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  return text(body, 'application/xml');
}
function notFound(cfg) {
  return text(`<!doctype html><title>Not found | Sasta Milaga</title><meta name="robots" content="noindex"><p>This product is not in the catalogue. <a href="${cfg.site}/#/global">Browse the global shop</a>.</p>`, 'text/html', 404);
}
