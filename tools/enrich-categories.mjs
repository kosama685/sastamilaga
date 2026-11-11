#!/usr/bin/env node
/* Category pages: an intro written from the category's real data, links to related categories, and titles that fit a search result.
 *   node tools/enrich-categories.mjs
 * Intro facts: product count, price range, the most common words in the category's own product names, and the store's delivery, cash on
 * delivery and returns terms. Nothing is invented. Idempotent: the intro block carries class "sm-cat-intro" and is replaced on re-runs. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = s => String(s || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const STOP = new Set('the and for with from this that your you are not all any can has have use used using new best set pack pcs piece pieces size color colour random men women mens womens kids baby unisex high quality premium multi purpose portable of in on to a an by or at as it its be is per cm mm ml kg'.split(' '));
const topWords = (names, n = 6) => { const c = {}; for (const s of names) for (const w of new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/))) if (w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)) c[w] = (c[w] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); };
const cut = (s, n) => { if (s.length <= n) return s; const c = s.slice(0, n + 1); return c.slice(0, c.lastIndexOf(' ')).replace(/[ ,;:\-–|(&]+$/, ''); };
const fmt = n => n.toLocaleString('en-US');

function retitle(h, max = 65) {   // keep "... | Sasta Milaga", shorten the name part at a word boundary
  const m = h.match(/<title>([^<]*)<\/title>/); if (!m) return h; const t = m[1]; if (t.replace(/&amp;/g, '&').length <= max) return h;
  const mm = t.match(/^(.*?)( [–-] [^|(]*?)?( \(page \d+\))? \| Sasta Milaga$/); if (!mm) return h;
  const [, name, mid = '', page = ''] = mm, tail = page + ' | Sasta Milaga'; let nt = cut(name, Math.max(18, max - (mid + tail).replace(/&amp;/g, '&').length)) + mid + tail;
  if (nt.replace(/&amp;/g, '&').length > max) nt = cut(name, max - tail.length) + tail;
  return h.replace(t, nt);
}
function insert(h, block) {
  h = h.replace(/<section class="sm-page sm-page--wide sm-cat-intro">[\s\S]*?<\/section>/, '');
  const i = h.indexOf('</header>', h.indexOf('sm-page-head')); if (i < 0) return null;
  return h.slice(0, i + 9) + block + h.slice(i + 9);
}
const intro = (title, paras, related) => `<section class="sm-page sm-page--wide sm-cat-intro"><div class="sm-prose">${paras.map(p => `<p>${p}</p>`).join('')}${related.length ? `<p><strong>Related categories:</strong> ${related.map(r => `<a href="${r.href}">${esc(r.name)}</a>`).join(' · ')}</p>` : ''}</div></section>`;

// ---- local categories (page 1 only)
const pj = read('products.js'); const P = JSON.parse(pj.slice(pj.indexOf('window.SASTA_PRODUCTS=') + 22, pj.lastIndexOf(']') + 1));
const bySlug = {}; for (const p of P) for (const k of new Set([slug(p.m), slug(p.leaf)])) if (k) (bySlug[k] = bySlug[k] || []).push(p);
const localSlugs = Object.keys(bySlug).filter(k => fs.existsSync(path.join(ROOT, 'c', k + '.html')));
let nLocal = 0, nTitle = 0, skipped = 0;
for (const f of fs.readdirSync(path.join(ROOT, 'c'))) {
  if (!f.endsWith('.html')) continue; const file = path.join(ROOT, 'c', f); let h = fs.readFileSync(file, 'utf8'); const o = h; h = retitle(h);
  const k = f.replace(/\.html$/, ''), list = bySlug[k];
  if (list && !/-\d+$/.test(k) && !/\(page \d+\)/.test(o.match(/<title>([^<]*)/)?.[1] || '')) {
    const name = (h.match(/<h1>(.*?)<\/h1>/) || [])[1] || k; const prices = list.map(p => p.sp ?? p.bp).filter(x => x > 0), lo = Math.min(...prices), hi = Math.max(...prices), kw = topWords(list.map(p => p.n));
    const rel = localSlugs.filter(x => x !== k).sort((a, b) => bySlug[b].length - bySlug[a].length).slice(0, 5).map(x => ({ href: `${x}.html`, name: bySlug[x][0].m === bySlug[x][0].leaf || slug(bySlug[x][0].m) === x ? bySlug[x][0].m : bySlug[x][0].leaf }));
    const paras = [`${name} at Sasta Milaga: ${fmt(list.length)} products with prices from Rs ${fmt(Math.round(lo))} to Rs ${fmt(Math.round(hi))}${kw.length ? `, including ${kw.slice(0, 5).join(', ')}` : ''}.`, 'Every order is cash on delivery in Pakistan. Delivery is Rs 250, and free on orders above Rs 5,000. Products can be returned within 7 days.'];
    const r = insert(h, intro(name, paras, rel)); if (r) { h = r; nLocal++; } else skipped++;
  }
  if (h !== o) { fs.writeFileSync(file, h); if (retitle(o) !== o) nTitle++; }
}
// ---- global categories
const mf = read('data/cj/manifest.js'); const M = JSON.parse(mf.slice(mf.indexOf('{'), mf.lastIndexOf('}') + 1)); let nGlobal = 0;
for (const c of M.cats) {
  const file = path.join(ROOT, 'c/global', c.s + '.html'); if (!fs.existsSync(file)) continue; let h = fs.readFileSync(file, 'utf8'); const o = h; h = retitle(h);
  const t = fs.readFileSync(path.join(ROOT, 'data/cj/c', c.s + '.js'), 'utf8'); const rows = JSON.parse(t.slice(t.indexOf('[', t.indexOf(',')), t.lastIndexOf(']') + 1));
  const lo = Math.min(...rows.map(r => r[3]).filter(x => x > 0)), hi = Math.max(...rows.map(r => r[4] || r[3])), kw = topWords(rows.map(r => r[2]));
  const rel = M.cats.filter(x => x.g === c.g && x.s !== c.s).sort((a, b) => b.c - a.c).slice(0, 5).map(x => ({ href: `${x.s}.html`, name: x.n }));
  const paras = [`${c.n} in the Sasta Milaga global shop (${c.g}): ${fmt(rows.length)} products with estimated prices from US$ ${(lo * 1.2).toFixed(2)} to US$ ${(hi * 1.2).toFixed(2)}${kw.length ? `, including ${kw.slice(0, 5).join(', ')}` : ''}.`, 'Global items are prepaid and delivered worldwide. Stock, options and the shipping cost for your country are confirmed with you before you pay, and the final price is sent on WhatsApp.'];
  const r = insert(h, intro(c.n, paras, rel)); if (r) { h = r; nGlobal++; }
  if (h !== o) fs.writeFileSync(file, h);
}
console.log(`local category intros ${nLocal} | global category intros ${nGlobal} | titles shortened (local) ${nTitle} | no header found ${skipped}`);
