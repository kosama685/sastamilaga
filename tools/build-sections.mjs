// Clean URLs for the app sections + clean links in the page source.
// 1. Rewrites href="#/..." in index.html and partials/chrome.json to clean URLs when the target page exists
//    (c/<cat>.html, c/global/<cat>.html, b/<post>.html, <section>/, global/g/<group>/). Routes that need private input keep #/.
// 2. Writes <section>/index.html for each app section: the app shell with a <base href> and its own title, description,
//    canonical, og/twitter tags, robots, and a short static intro that is replaced when the app renders.
//    GitHub Pages serves them as real pages (HTTP 200, no # in the URL).
// 3. Adds the public section URLs to sitemap-pages.xml.
// Usage: node tools/build-sections.mjs   (idempotent; run after editing index.html)
import fs from 'node:fs';
import { waDirectory, WA_CSS } from './wa-directory.mjs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://kosama685.github.io/sastamilaga';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));
const total = (() => { const t = read('products.js'); return (t.match(/"id":/g) || []).length; })();
const M = (() => { const t = read('data/cj/manifest.js'); return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); })();
const fmt = n => n.toLocaleString('en');
const WP = { ...(exists('data/wp/pages.json') ? JSON.parse(read('data/wp/pages.json')) : {}), ...(exists('data/wp/pages-own.json') ? JSON.parse(read('data/wp/pages-own.json')) : {}) };   // pages cloned from sastamilaga.com (tools: see data/wp)
const PURE = new Set(['earn-points', 'daily-spin', 'seller-rules', 'about', 'contact', 'faq', 'how-to-order', 'privacy', 'terms', 'safe-shopping', 'tours']);   // content pages: their text is in the HTML and the app does not re-render them
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
  'earn-points': ['Earn reward points', 'Earn 1 point for every Rs 100 on completed orders.'],
  'daily-spin': ['Daily spin', 'Spin once a day for points or wallet money.'],
  'seller-rules': ['Seller rules and policies', 'Rules for selling on Sasta Milaga.'],
  seller: ['Sell on Sasta Milaga', 'Sell your products on Sasta Milaga to customers across Pakistan.'],
  careers: ['Careers', 'Work with Sasta Milaga.'],
  press: ['Press', 'Sasta Milaga news and press information.'],
  sitemap: ['Site map', 'All sections, categories and pages of Sasta Milaga.'],
  'safe-shopping': ['Safe shopping', 'A few habits keep online shopping safe, on this site and everywhere else.'],
  tours: ['Tour packages and guided trips', 'Find a trip that fits your dates and budget: dated tour packages, guided activities and pilgrimage trips.'],
  // Private pages: real URLs (no #) but noindex, not in the sitemap.
  cart: ['Your cart', 'Review the items in your Sasta Milaga cart.'],
  checkout: ['Checkout', 'Complete your Sasta Milaga order: cash on delivery, bank transfer, EasyPaisa/JazzCash or PayPal.'],
  wishlist: ['Saved items', 'Your saved products at Sasta Milaga.'],
  account: ['Your account', 'Sign in or register at Sasta Milaga.'],
  'thank-you': ['Thank you for your order', 'Your Sasta Milaga order has been received.'],
  search: ['Search results', 'Search the Sasta Milaga catalogue.'],
  'global/search': ['Search the global shop', `Search ${fmt(M.total)} global products at Sasta Milaga.`],
};
const PRODUCTION_PRIVATE = k => PRIVATE.has(k);
const PRIVATE = new Set(['cart', 'checkout', 'wishlist', 'account', 'thank-you', 'search', 'global/search']);
// One page per global group (Fashion & Apparel, Electronics …), indexable.
const GROUPS = M.groups.map(g => ({ key: `global/g/${g.s}`, title: `${g.n} – global shop`, desc: `${fmt(g.c)} ${g.n} products in ${M.cats.filter(c => c.g === g.n).length} categories with worldwide delivery from Sasta Milaga.` }));
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const wpArticle = rec => `<article class="sm-page sm-page--wide"><header class="sm-page-head"><h1>${esc(rec.title)}</h1></header><div class="sm-prose">${rec.body}</div></article>`;
const titleTag = t => (/Sasta Milaga/i.test(t) ? t : `${t} | Sasta Milaga`);

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

/* Phone and WhatsApp worldwide: footer band (index.html + chrome.json) and its CSS, inserted idempotently. */
const BAND = /<section class="smwa smwa--footer"[\s\S]*?<\/section>/;
const addBand = html => { const clean = html.replace(BAND, ''); const i = clean.indexOf('<div class="smf-bottom">'); return i < 0 ? clean : clean.slice(0, i) + waDirectory('footer') + clean.slice(i); };
index = addBand(index); fs.writeFileSync(path.join(ROOT, 'index.html'), index);
{ const cj = JSON.parse(read('partials/chrome.json')); cj.footer = addBand(cj.footer); fs.writeFileSync(path.join(ROOT, 'partials/chrome.json'), JSON.stringify(cj)); }
for (const css of ['styles.css', 'assets/theme/static-bundle.css']) {
  const f = path.join(ROOT, css); let c = fs.readFileSync(f, 'utf8'); c = c.replace(/\n?\/\*smwa:start\*\/[\s\S]*?\/\*smwa:end\*\//, '');
  fs.writeFileSync(f, c.replace(/\s*$/, '\n') + '/*smwa:start*/' + WA_CSS + '/*smwa:end*/\n');
}
let made = 0;
const pages = [...Object.entries(SECTIONS).map(([key, [title, desc]]) => ({ key, title, desc })), ...GROUPS];
const rep = (s, re, fn) => s.replace(re, () => fn);   // replacement as a function: "$" in text is never special
/* Empties a <div id=...> but keeps its opening tag (balanced </div> matching). */
function emptyDiv(h, openRe) {
  const m = openRe.exec(h); if (!m) return h;
  const re = /<div\b|<\/div>/g; re.lastIndex = m.index; let depth = 0, x;
  while ((x = re.exec(h))) { depth += x[0] === '</div>' ? -1 : 1; if (depth === 0) return h.slice(0, m.index) + m[0] + '</div>' + h.slice(re.lastIndex); }
  return h;
}
function shell({ key, keepHome = false, keepTv = false, lang = 'en', dir = 'ltr', base, title, desc, url, robots, body, isStatic, alts, locale }) {
  let h = index
    .replace('<html lang="en" dir="ltr">', () => `<html lang="${lang}" dir="${dir}"${lang !== 'en' ? ' data-native' : ''}>`)
    .replace(/<head>/, () => `<head>\n<base href="${base}">`);
  h = rep(h, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  h = rep(h, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  h = rep(h, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`);
  h = rep(h, /<meta name="robots" content="[^"]*">/, `<meta name="robots" content="${robots}">`);
  h = rep(h, /<link rel="alternate" hreflang="en" href="[^"]*"><link rel="alternate" hreflang="x-default" href="[^"]*">/, alts);
  h = rep(h, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  h = rep(h, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  h = rep(h, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`);
  if (locale) h = rep(h, /<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${locale}">`);
  h = rep(h, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`);
  h = rep(h, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`);
  // Without JavaScript (or before the app renders) the page shows its own content, not the home page.
  h = h.replace('<div id="home-view">', () => '<div id="home-view" hidden>');
  if (!keepHome) h = emptyDiv(h, /<div id="home-view"[^>]*>/);      // one H1 and no repeated home content on pages that do not need it
  if (!keepTv) h = emptyDiv(h, /<div id="view-livetv"[^>]*>/);
  h = h.replace('<div id="app" class="sm-app" hidden></div>', () => `<div id="app" class="sm-app"${isStatic ? ' data-static="1"' : ''}>${body}</div>`);
  return h;
}
const alt1 = (en, ur) => `<link rel="alternate" hreflang="en" href="${en}">${ur ? `<link rel="alternate" hreflang="ur" href="${ur}">` : ''}<link rel="alternate" hreflang="x-default" href="${en}">`;
let made2 = 0;
for (const { key, title, desc } of pages) {
  // global/ shows the same content as the generated c/global/index.html, which stays the canonical page.
  const url = key === 'global' ? `${SITE}/c/global/index.html` : `${SITE}/${key}/`, priv = PRODUCTION_PRIVATE(key);
  const rec = WP[key], pure = rec && PURE.has(key), urRec = WP['ur/' + key];
  const intro = `<section class="sm-page"><header class="sm-page-head"><h1>${esc(title.replace(/ \| Sasta Milaga$/, ''))}</h1><p>${esc(desc)}</p></header></section>`;
  // content pages use the cloned text and its own SEO title/description; shipping and returns keep the country-wise app and add the full policy under it
  const body = pure ? (key === 'contact' ? wpArticle(rec).replace('</header>', () => '</header>' + waDirectory('page')) : wpArticle(rec)) : rec ? intro + `<div class="sm-page sm-page--wide"><div class="sm-prose">${rec.body}</div></div>` : intro;
  const h = shell({ key, keepHome: key === 'travel', keepTv: key === 'live-tv', base: '../'.repeat(key.split('/').length), title: pure ? titleTag(rec.seoTitle) : titleTag(title), desc: pure ? rec.description : desc, url, robots: priv ? 'noindex, nofollow' : 'index, follow, max-image-preview:large', body, isStatic: pure, alts: alt1(url, urRec ? `${SITE}/ur/${key}/` : '') });
  fs.mkdirSync(path.join(ROOT, key), { recursive: true });
  fs.writeFileSync(path.join(ROOT, key, 'index.html'), h); made++;
}
// Native Urdu pages (ur/<page>/): the owner's own Urdu text, paired with the English page by hreflang.
for (const [k, rec] of Object.entries(WP)) {
  if (!k.startsWith('ur/')) continue;
  const key = k.slice(3), url = `${SITE}/ur/${key}/`, en = `${SITE}/${key}/`;
  const h = shell({ key, lang: 'ur', dir: 'rtl', locale: 'ur_PK', base: '../../', title: titleTag(rec.seoTitle), desc: rec.description, url, robots: 'index, follow, max-image-preview:large', body: wpArticle(rec), isStatic: true,
    alts: `<link rel="alternate" hreflang="en" href="${en}"><link rel="alternate" hreflang="ur" href="${url}"><link rel="alternate" hreflang="x-default" href="${en}">` });
  fs.mkdirSync(path.join(ROOT, 'ur', key), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'ur', key, 'index.html'), h); made2++;
}
// Full shipping and returns policy text for the app pages (fetched by assets/js/pages.js)
for (const k of ['shipping', 'returns']) if (WP[k]) fs.writeFileSync(path.join(ROOT, 'data/wp', `policy-${k}.html`), WP[k].body);
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
  fs.writeFileSync(path.join(ROOT, '404.html'), emptyDiv(emptyDiv(h, /<div id="home-view"[^>]*>/), /<div id="view-livetv"[^>]*>/));
}
// Public section URLs in sitemap-pages.xml (idempotent; global/ is canonicalised to c/global/index.html, so it is left out).
const smPath = path.join(ROOT, 'sitemap-pages.xml');
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8'), added = 0;
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages.map(p => p.key).filter(k => k !== 'global' && !PRIVATE.has(k)).map(s => `${SITE}/${s}/`).concat(`${SITE}/b/`, Object.keys(WP).filter(k => k.startsWith('ur/')).map(k => `${SITE}/${k}/`));
  for (const u of urls) if (!sm.includes(`<loc>${u}</loc>`)) { sm = sm.replace('</urlset>', `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>\n</urlset>`); added++; }
  fs.writeFileSync(smPath, sm);
  console.log(`sitemap-pages.xml: ${added} section URLs added`);
}
console.log(`index.html: ${ni} links made clean · chrome.json: ${nc} · pages: ${made} (${GROUPS.length} global groups) · Urdu pages: ${made2}`);
