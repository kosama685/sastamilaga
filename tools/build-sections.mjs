// Clean URLs for the app sections + clean links in the page source.
// 1. Rewrites href="#/..." in index.html and partials/chrome.json to clean URLs when the target file exists
//    (c/<cat>.html, c/global/<cat>.html, b/<post>.html, <section>/). Routes with parameters keep #/.
// 2. Writes <section>/index.html for each app section: the app shell with <base href="../"> and its own
//    title, description, canonical, og/twitter tags. GitHub Pages serves them as real pages (no # in the URL).
// Usage: node tools/build-sections.mjs   (idempotent; run after editing index.html)
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://kosama685.github.io/sastamilaga';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));
const total = (() => { const t = read('products.js'); return (t.match(/"id":/g) || []).length; })();
const SECTIONS = {
  shop: ['Shop all products', `Shop ${total.toLocaleString('en')} products in PKR at Sasta Milaga with cash on delivery across Pakistan, plus 451,812 global products with worldwide delivery.`],
  global: ['Global shop – worldwide delivery', 'Browse 451,812 global products in 572 categories with worldwide delivery. Prices are US$ estimates confirmed on WhatsApp before you pay.'],
  deals: ['Deals and discounts', 'Today\'s best prices at Sasta Milaga: discounted products in PKR with cash on delivery across Pakistan.'],
  videos: ['Product videos – watch before you buy', 'Watch product videos before you buy at Sasta Milaga. Prices in PKR, cash on delivery in Pakistan.'],
  travel: ['Flights, hotels, Umrah and visas', 'Search flights and hotels, and request Umrah, tours and visa services from Pakistan with Sasta Milaga.'],
  'live-tv': ['Live TV – watch free-to-air channels online', 'Watch more than 2,000 free-to-air TV channels from around the world online: news, entertainment, sports, music and kids.'],
  about: ['About Sasta Milaga', 'Sasta Milaga is an online store and travel desk for Pakistan and Pakistanis abroad: affordable products, cash on delivery and travel services.'],
  faq: ['Frequently asked questions', 'Answers about ordering, cash on delivery, delivery charges, returns, global items and travel bookings at Sasta Milaga.'],
  contact: ['Contact Sasta Milaga', 'Contact Sasta Milaga on WhatsApp +966510451995 for orders, delivery, returns and travel requests.'],
  'how-to-order': ['How to order', 'How to order at Sasta Milaga: add to cart, choose cash on delivery, bank transfer, EasyPaisa/JazzCash or PayPal, or order on WhatsApp.'],
  shipping: ['Shipping and delivery', 'Delivery across Pakistan: Rs 250, free above Rs 5,000. Global items ship worldwide; shipping is confirmed before payment.'],
  returns: ['Returns', 'How to request a return at Sasta Milaga within 7 days of delivery.'],
  'return-policy': ['Return and refund policy', 'Sasta Milaga return policy: 7-day returns, free for damaged or wrong items.'],
  privacy: ['Privacy policy', 'How Sasta Milaga collects and uses your information.'],
  terms: ['Terms and conditions', 'Terms and conditions for shopping and travel services at Sasta Milaga.'],
  cookies: ['Cookie policy', 'How Sasta Milaga uses cookies.'],
  track: ['Track your order', 'Track a Sasta Milaga order with your order number and phone.'],
  seller: ['Sell on Sasta Milaga', 'Sell your products on Sasta Milaga to customers across Pakistan.'],
  careers: ['Careers', 'Work with Sasta Milaga.'],
  press: ['Press', 'Sasta Milaga news and press information.'],
  sitemap: ['Site map', 'All sections, categories and pages of Sasta Milaga.'],
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* #/route -> clean relative URL, only when that file exists. */
function clean(route) {
  const r = route.replace(/^#\//, ''); if (r.includes('?')) return null;
  const p = r.split('/').filter(Boolean);
  if (!p.length || p[0] === 'home') return './';
  if (p[0] === 'category' && p.length === 2 && exists(`c/${p[1]}.html`)) return `c/${p[1]}.html`;
  if (p[0] === 'global' && p.length === 1) return 'global/';
  if (p[0] === 'global' && p[1] === 'c' && p[2] && exists(`c/global/${p[2]}.html`)) return `c/global/${p[2]}.html`;
  if (p[0] === 'blog' && p.length === 1) return 'b/';
  if (p[0] === 'blog' && p[1] && exists(`b/${p[1]}.html`)) return `b/${p[1]}.html`;
  if (p.length === 1 && SECTIONS[p[0]]) return `${p[0]}/`;
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

let made = 0;
for (const [sec, [title, desc]] of Object.entries(SECTIONS)) {
  // global/ shows the same content as the generated c/global/index.html, which stays the canonical page.
  const url = sec === 'global' ? `${SITE}/c/global/index.html` : `${SITE}/${sec}/`, full = `${title} | Sasta Milaga`;
  let h = index
    .replace(/<head>/, '<head>\n<base href="../">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(full)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${url}">`)
    .replace(/(<link rel="alternate" hreflang="(?:en|x-default)" href=")[^"]*(">)/g, `$1${url}$2`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(full)}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${url}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(full)}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`);
  fs.mkdirSync(path.join(ROOT, sec), { recursive: true });
  fs.writeFileSync(path.join(ROOT, sec, 'index.html'), h); made++;
}
// Section URLs in sitemap-pages.xml (idempotent; global/ is canonicalised to c/global/index.html, so it is left out).
const smPath = path.join(ROOT, 'sitemap-pages.xml');
if (fs.existsSync(smPath)) {
  let sm = fs.readFileSync(smPath, 'utf8'), added = 0;
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.keys(SECTIONS).filter(s => s !== 'global').map(s => `${SITE}/${s}/`).concat(`${SITE}/b/`);
  for (const u of urls) if (!sm.includes(`<loc>${u}</loc>`)) { sm = sm.replace('</urlset>', `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>\n</urlset>`); added++; }
  fs.writeFileSync(smPath, sm);
  console.log(`sitemap-pages.xml: ${added} section URLs added`);
}
console.log(`index.html: ${ni} links made clean · chrome.json: ${nc} · section pages: ${made}`);
