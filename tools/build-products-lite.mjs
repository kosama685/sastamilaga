#!/usr/bin/env node
/* products.js is the full catalogue (57 MB). The app's listing, search, cart and quick-view screens need far less: every product is
 * kept, with the same ids, names, prices, stock, categories, tags and images, but detail-only text is trimmed (full descriptions,
 * every gallery image, every alt text). Full detail lives on the static product pages (p/*.html).
 *   node tools/build-products-lite.mjs   ->  assets/data/products-lite.js
 * Run it after products.js changes (the deploy workflow also runs it). */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const src = fs.readFileSync(path.join(ROOT, 'products.js'), 'utf8');
const k = src.indexOf('window.SASTA_PRODUCTS='); if (k < 0) throw new Error('products.js: window.SASTA_PRODUCTS not found');
const header = src.slice(0, k), arr = JSON.parse(src.slice(k + 'window.SASTA_PRODUCTS='.length, src.lastIndexOf(']') + 1));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const c = s.slice(0, n + 1); return c.slice(0, Math.max(c.lastIndexOf(' '), n * .6)).trim() + '…'; };
const lite = arr.map(p => {
  const o = { ...p };
  if (!o.img && Array.isArray(o.imgs) && o.imgs[0]) o.img = o.imgs[0];
  delete o.imgs;                                 // gallery images: only the product detail view needs them (static pages carry them)
  delete o.alt;                                  // image alt text: cards use the product name
  delete o.updated;
  o.d = o.sd ? '' : cut(o.d, 240);               // the short description is used everywhere; the long one only as a fallback
  delete o.seoD;                                 // the app falls back to sd, and the static pages carry their own meta description
  return o;
});
fs.mkdirSync(path.join(ROOT, 'assets/data'), { recursive: true });
const out = `${header}window.SASTA_PRODUCTS=${JSON.stringify(lite)};\n`;
fs.writeFileSync(path.join(ROOT, 'assets/data/products-lite.js'), out);
console.log(`products ${lite.length} | full ${(src.length / 1e6).toFixed(1)} MB -> lite ${(out.length / 1e6).toFixed(1)} MB`);
