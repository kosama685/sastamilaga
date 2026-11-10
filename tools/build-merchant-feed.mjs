#!/usr/bin/env node
/* Google Merchant Center feed built from the product landing pages themselves (p/*.html), so the feed and the page can never disagree.
 *   node tools/build-merchant-feed.mjs  ->  feeds/google-merchant.xml, feeds/merchant-report.json
 * Only real data is written. Brand, GTIN and MPN are not in the catalogue, so they are left out and identifier_exists=no is set,
 * which is the documented way to submit products without identifiers. No ratings or reviews are generated.
 * Products that Merchant Center would reject (no image, no price, no title ...) are not written; each one is listed with its reason in the report. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://kosama685.github.io/sastamilaga';
const dir = path.join(ROOT, 'p');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const text = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, ' ').trim();
const cut = (s, n) => { if (s.length <= n) return s; const c = s.slice(0, n + 1); return c.slice(0, c.lastIndexOf(' ')).replace(/[ ,;:\-–|(]+$/, ''); };
const LD = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
const items = [], rejected = [], seen = new Set(); let total = 0;
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.html')).sort()) {
  total++; const h = fs.readFileSync(path.join(dir, f), 'utf8'); let p = null, crumbs = [];
  for (const m of h.matchAll(LD)) { try { const j = JSON.parse(m[1]); for (const n of (Array.isArray(j) ? j : j['@graph'] || [j])) { if (n['@type'] === 'Product') p = n; if (n['@type'] === 'BreadcrumbList') crumbs = (n.itemListElement || []).map(x => x.name || (x.item && x.item.name)).filter(Boolean); } } catch (e) {} }
  const why = []; if (!p) { rejected.push({ page: f, reasons: ['no Product data on the page'] }); continue; }
  const o = Array.isArray(p.offers) ? p.offers[0] : (p.offers || {});
  const id = String(p.sku || '').trim(), title = text(p.name), desc = text(p.description) || title, img = Array.isArray(p.image) ? p.image[0] : p.image;
  const price = Number(o.price), link = `${SITE}/p/${f}`;
  if (!id) why.push('missing id (sku)'); else if (seen.has(id)) why.push('duplicate id ' + id);
  if (!title) why.push('missing title'); if (!(price > 0)) why.push('missing or zero price'); if (o.priceCurrency !== 'PKR') why.push('currency is not PKR');
  if (!img || !/^https:\/\//.test(img)) why.push('no product image (a Merchant Center requirement)');
  if (why.length) { rejected.push({ page: f, id, reasons: why }); continue; }
  seen.add(id);
  const avail = /InStock/.test(o.availability || '') ? 'in stock' : /PreOrder/.test(o.availability || '') ? 'preorder' : 'out of stock';
  const type = (crumbs.length > 1 ? crumbs.slice(1) : []).join(' > ') || text(p.category);
  items.push(`<item><g:id>${esc(id)}</g:id><g:title>${esc(cut(title, 150))}</g:title><g:description>${esc(cut(desc, 5000))}</g:description><g:link>${esc(link)}</g:link><g:image_link>${esc(img)}</g:image_link><g:availability>${avail}</g:availability><g:price>${price.toFixed(2)} PKR</g:price><g:condition>new</g:condition>${type ? `<g:product_type>${esc(type)}</g:product_type>` : ''}<g:identifier_exists>no</g:identifier_exists><g:shipping><g:country>PK</g:country><g:service>Standard</g:service><g:price>${price >= 5000 ? '0.00' : '250.00'} PKR</g:price></g:shipping></item>`);
}
fs.mkdirSync(path.join(ROOT, 'feeds'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'feeds/google-merchant.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Sasta Milaga</title><link>${SITE}/</link><description>Sasta Milaga Local products, prices in PKR, cash on delivery in Pakistan</description>\n${items.join('\n')}\n</channel></rss>\n`);
const reasons = {}; rejected.forEach(r => r.reasons.forEach(x => { reasons[x] = (reasons[x] || 0) + 1; }));
fs.writeFileSync(path.join(ROOT, 'feeds/merchant-report.json'), JSON.stringify({ productPages: total, inFeed: items.length, excluded: rejected.length, excludedByReason: reasons, notIncluded: 'brand, gtin, mpn, google_product_category, ratings and reviews are not in the catalogue and are not invented', excludedProducts: rejected.slice(0, 2000) }, null, 1));
console.log(`product pages ${total} | in feed ${items.length} | excluded ${rejected.length}`, reasons);
