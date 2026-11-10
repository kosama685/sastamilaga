// Clean URLs for the app sections + clean links in the page source.
// 1. Rewrites href="#/..." in index.html and partials/chrome.json to clean URLs when the target page exists
//    (c/<cat>.html, c/global/<cat>.html, b/<post>.html, <section>/, global/g/<group>/). Routes that need private input keep #/.
// 2. Writes <section>/index.html for each app section: the app shell with a <base href> and its own title, description,
//    canonical, og/twitter tags, robots, and a short static intro that is replaced when the app renders.
//    GitHub Pages serves them as real pages (HTTP 200, no # in the URL).
// 3. Adds the public section URLs to sitemap-pages.xml.
// Usage: node tools/build-sections.mjs   (idempotent; run after editing index.html)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://kosama685.github.io/sastamilaga';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));
const total = (() => { const t = read('products.js'); return (t.match(/"id":/g) || []).length; })();
const M = (() => { const t = read('data/cj/manifest.js'); return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); })();
const fmt = n => n.toLocaleString('en');
const SECTIONS = {
  shop: ['Shop all products', `Shop ${fmt(total)} products in PKR at Sasta Milaga with cash on delivery across Pakistan, plus ${fmt(M.total)} global products with worldwide delivery.`],
  global: ['Global shop – worldwide delivery', `Browse ${fmt(M.total)} global products in ${M.cats.length} categories with worldwide delivery. Prices are US$ estimates confirmed on WhatsApp before you pay.`],
  'global/all': [`All ${fmt(M.total)} global products`, `Browse every global product, page by page: ${fmt(M.total)} products in ${M.cats.length} categories with worldwide delivery.`],
  'global/videos': ['Global product videos', `Watch ${fmt(M.videos)} global product videos before you order from Sasta Milaga.`],
  deals: ['Deals and discounts', 'Today\'s best prices at Sasta Milaga: discounted products in PKR with cash on delivery across Pakistan.'],
  videos: ['Product videos – watch before you buy', 'Watch product videos before you buy at Sasta Milaga. Prices in PKR, cash on delivery in Pakistan.'],
  travel: ['Flights, hotels, Umrah and visas', 'Search flights and hotels, and request Umrah, tours and visa services from Pakistan with Sasta Milaga.'],
  visa: ['Visa destinations: check requirements with our team', 'Search more than 240 destinations, choose your visa type and send the request. Free first check of your documents; visa decisions belong to the embassy.'],
  rewards: ['Rewards and lowest prices', 'The lowest-priced products at Sasta Milaga, cheapest first, with price bands from Rs 300. Prices in PKR, cash on delivery in Pakistan.'],
  'live-tv': ['Live TV – watch free-to-air channels online', 'Watch more than 2,000 free-to-air TV channels from around the world online: news, entertainment, sports, music and kids.'],
  about: ['About Sasta Milaga', 'Sasta Milaga is an online store and travel desk for Pakistan and Pakistanis abroad: affordable products, cash on delivery and travel services.'],
  faq: ['Frequently asked questions', 'Answers about ordering, cash on delivery, delivery charges, returns, global items and travel bookings at Sasta Milaga.'],
  contact: ['Contact Sasta Milaga', 'Contact Sasta Milaga on WhatsApp +966510451995 for orders, delivery, returns and travel requests.'],
  'how-to-order': ['How to order', 'How to order at Sasta Milaga: add to cart, choose cash on delivery, bank transfer, EasyPaisa/JazzCash or PayPal, or order on WhatsApp.'],
  shipping: ['Shipping and delivery by country', 'Delivery in Pakistan is Rs 250, free above Rs 5,000. Global items ship worldwide: supplier shipping methods, prices and transit times for your country.'],
  returns: ['Returns and refunds by country', '7-day returns for Sasta Milaga Local products in Pakistan; return terms for global products depend on the supplier and your country.'],
  'return-policy': ['Return and refund policy', 'Sasta Milaga return policy: 7-day returns, free for damaged or wrong items.'],
  privacy: ['Privacy policy', 'How Sasta Milaga collects and uses your information.'],
  terms: ['Terms and conditions', 'Terms and conditions for shopping and travel services at Sasta Milaga.'],
  cookies: ['Cookie policy', 'How Sasta Milaga uses cookies.'],
  track: ['Track your order', 'Track a Sasta Milaga order with your order number and phone.'],
  seller: ['Sell on Sasta Milaga', 'Sell your products on Sasta Milaga to customers across Pakistan.'],
  careers: ['Careers', 'Work with Sasta Milaga.'],
  press: ['Press', 'Sasta Milaga news and press information.'],
  sitemap: ['Site map', 'All sections, categories and pages of Sasta Milaga.'],
  // Private pages: real URLs (no #) but noindex, not in the sitemap.
  cart: ['Your cart', 'Review the items in your Sasta Milaga cart.'],
  checkout: ['Checkout', 'Complete your Sasta Milaga order: cash on delivery, bank transfer, EasyPaisa/JazzCash or PayPal.'],
  wishlist: ['Saved items', 'Your saved products at Sasta Milaga.'],
  account: ['Your account', 'Sign in or register at Sasta Milaga.'],
  'thank-you': ['Thank you for your order', 'Your Sasta Milaga order has been received.'],
  search: ['Search results', 'Search the Sasta Milaga catalogue.'],
  'global/search': ['Search the global shop', `Search ${fmt(M.total)} global products at Sasta Milaga.`],
};
const PRIVATE = new Set(['cart', 'checkout', 'wishlist', 'account', 'thank-you', 'search', 'global/search']);
// One page per global group (Fashion & Apparel, Electronics …), indexable.
const GROUPS = M.groups.map(g => ({ key: `global/g/${g.s}`, title: `${g.n} – global shop`, desc: `${fmt(g.c)} ${g.n} products in ${M.cats.filter(c => c.g === g.n).length} categories with worldwide delivery from Sasta Milaga.` }));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* #/route -> clean relative URL, only when that page exists. */
function clean(route) {
  const r = route.replace(/^#\//, ''); if (r.includes('?')) return null;
  const p = r.split('/').filter(Boolean);
  if (!p.length || p[0] === 'home') return './';
  if (p[0] === 'category' && p.length === 2 && exists(`c/${p[1]}.html`)) return `c/${p[1]}.html`;
  if (p[0] === 'global' && p[1] === 'c' && p[2] && p.length === 3 && exists(`c/global/${p[2]}.html`)) return `c/global/${p[2]}.html`;
  if (p[0] === 'global' && p[1] === 'g' && p[2] && p.length === 3 && GROUPS.some(g => g.key === `global/g/${p[2]}`)) return `global/g/${p[2]}/`;
  if (p[0] === 'blog' && p.length === 1) return 'b/';
  if (p[0] === 'blog' && p[1] && exists(`b/${p[1]}.html`)) return `b/${p[1]}.html`;
  if (SECTIONS[p.join('/')] && p.length <= 2) return `${p.join('/')}/`;
  return null;
}
function rewriteLinks(html, q = '"') {
  let n = 0;
  const re = q === '"' ? /href="(#\/[^"]*)"/g : /href=\\"(#\/[^"\\]*)\\"/g;
  const out = html.replace(re, (m, h) => { const c = clean(h); if (c === null) return m; n++; return q === '"' ? `href="${c}"` : `href=\\"${c}\\"`; });
  return [out, n];
}

let index = read('index.html');
let [idx2, ni] = rewriteLinks(index); fs.writeFileSync(path.join(ROOT, 'index.html'), idx2); index = idx2;
let [chrome2, nc] = rewriteLinks(read('partials/chrome.json'), '\\"'); fs.writeFileSync(path.join(ROOT, 'partials/chrome.json'), chrome2);

const pages = [...Object.entries(SECTIONS).map(([key, [title, desc]]) => ({ key, title, desc })), ...GROUPS];
let made = 0;
for (const { key, title, desc } of pages) {
  // global/ shows the same content as the generated c/global/index.html, which stays the canonical page.
  const url = key === 'global' ? `${SITE}/c/global/index.html` : `${SITE}/${key}/`, full = `${title} | Sasta Milaga`;
  const base = '../'.repeat(key.split('/').length), priv = PRIVATE.has(key);
  const h1 = esc(title.replace(/ \| Sasta Milaga$/, ''));
  const intro = `<section class="sm-page"><header class="sm-page-head"><h1>${h1}</h1><p>${esc(desc)}</p></header></section>`;
  let h = index
    .replace(/<head>/, `<head>\n<base href="${base}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${priv ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">`)
    .replace(/(<link rel="alternate" hreflang="(?:en|x-default)" href=")[^"]*(">)/g, `$1${url}$2`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(full)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(full)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`)
    // Without JavaScript (or before the app renders) this page shows its own heading, not the home page.
    .replace('<div id="home-view">', '<div id="home-view" hidden>')
    .replace('<div id="app" class="sm-app" hidden></div>', `<div id="app" class="sm-app">${intro}</div>`);
  fs.mkdirSync(path.join(ROOT, key), { recursive: true });
  fs.writeFileSync(path.join(ROOT, key, 'index.html'), h); made++;
}
// 404.html: GitHub Pages serves it, with a genuine 404 status, for every unknown address. It also carries global product
// addresses (/global/p/<category>/<id>): the app renders them in the browser; they are noindex and not in any sitemap.
{
  const baseOld = "b.href=location.pathname.replace(/[^\\/]*$/,'')";
  const baseNew = "b.href=(function(){var p=location.pathname,i=p.indexOf('/global/p/');if(i>=0)return p.slice(0,i+1);return /github\\.io$/.test(location.hostname)?'/'+p.split('/')[1]+'/':'/';})()";
  if (!index.includes(baseOld)) throw new Error('404.html: base script not found in index.html');
  const intro = `<section class="sm-page"><header class="sm-page-head"><h1>Page not found</h1><p>We could not find that page. It may have moved, or the address may be mistyped.</p></header></section>`;
  const h = index.replace(baseOld, baseNew).replace(/<html\b/, '<html data-nf')
    .replace(/<title>[^<]*<\/title>/, '<title>Page not found | Sasta Milaga</title>')
    .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, follow">')
    .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="This page does not exist. Try the shop, the global shop or search.">')
    .replace('<div id="home-view">', '<div id="home-view" hidden>')
    .replace('<div id="app" class="sm-app" hidden></div>', `<div id="app" class="sm-app">${intro}</div>`);
  fs.writeFileSync(path.join(ROOT, '404.html'), h);
}
// Public section URLs in sitemap-pages.xml (idempotent; global/ is canonicalised to c/global/index.html, so it is left out).
const smPath = path.join(ROOT, 'sitemap-pages.xml');
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8'), added = 0;
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map(p => p.key).filter(k => k !== 'global' && !PRIVATE.has(k)).map(s => `${SITE}/${s}/`).concat(`${SITE}/b/`);
  for (const u of urls) if (!sm.includes(`<loc>${u}</loc>`)) { sm = sm.replace('</urlset>', `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>\n</urlset>`); added++; }
  fs.writeFileSync(smPath, sm);
  console.log(`sitemap-pages.xml: ${added} section URLs added`);
}
console.log(`index.html: ${ni} links made clean · chrome.json: ${nc} · pages: ${made} (${GROUPS.length} global groups)`);
