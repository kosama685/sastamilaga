#!/usr/bin/env node
/* SEO / AEO / GEO analysis CSVs built only from the real catalogue and pages. Nothing is invented: keywords are the most frequent words in
 * your own product names, FAQ suggestions use the store's real terms, channel suggestions are channels that exist in the playlist.
 *   node tools/build-seo-reports.mjs [outDir]    -> pages, local products, categories (local + global), blog schedule, Live TV, global products (large)
 * The 451,812-row global product file is written to outDir/large/ and is not meant for the repository. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'reports')); fs.mkdirSync(path.join(OUT, 'large'), { recursive: true });
const SITE = 'https://sastamilaga.com';
const q = v => { v = String(v ?? ''); if (/^[=+\-@]/.test(v)) v = "'" + v; return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };   // also blocks CSV formula injection
const csv = (file, head, rows) => { const w = fs.createWriteStream(file); w.write(head.join(',') + '\n'); for (const r of rows) w.write(r.map(q).join(',') + '\n'); w.end(); };
const strip = s => String(s || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set('the and for with from this that your you are not all any can has have use used using new best set pack pcs piece pieces size color colour random men women mens womens kids baby unisex high quality premium multi purpose portable for of in on to a an by or at as it its be is'.split(' '));
const topWords = (names, n = 10) => { const c = {}; for (const s of names) for (const w of new Set(String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/))) if (w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)) c[w] = (c[w] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); };
const meta = (h, re) => (h.match(re) || [])[1] || '';
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 1. pages: sections, categories, blog, static pages
const smPages = new Set(['sitemap-pages.xml', 'sitemap-global.xml'].flatMap(f => [...read(f).matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]))); const smBlog = new Set([...read('sitemap-blog.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
const pageRows = []; const addPage = (rel, type) => { const f = path.join(ROOT, rel); if (!fs.existsSync(f)) return; const h = fs.readFileSync(f, 'utf8'); const title = meta(h, /<title>([^<]*)<\/title>/), desc = meta(h, /<meta name="description" content="([^"]*)"/), can = meta(h, /rel="canonical" href="([^"]+)"/), robots = meta(h, /<meta name="robots" content="([^"]*)"/);
  const text = strip(h.slice(h.indexOf('<main'))); pageRows.push([`${SITE}/${rel.replace(/index\.html$/, '')}`, type, title, title.length, desc.length, (h.match(/<h1[ >]/g) || []).length, can, /noindex/.test(robots) ? 'noindex' : 'index', smPages.has(can) || smBlog.has(can) ? 'yes' : 'no', text.split(' ').length, /FAQPage/.test(h) ? 'yes' : 'no', /BreadcrumbList/.test(h) ? 'yes' : 'no', (h.match(/href="[^"#]+"/g) || []).length]); };
for (const d of fs.readdirSync(ROOT, { withFileTypes: true })) if (d.isDirectory() && fs.existsSync(path.join(ROOT, d.name, 'index.html')) && !/^(p|c|b|data|assets|workers|tools|docs|reports|feeds|partials|backup|node_modules)$/.test(d.name)) addPage(`${d.name}/index.html`, 'section');
for (const f of fs.readdirSync(path.join(ROOT, 'c'))) if (f.endsWith('.html')) addPage(`c/${f}`, 'local category'); for (const f of fs.readdirSync(path.join(ROOT, 'c/global'))) if (f.endsWith('.html')) addPage(`c/global/${f}`, 'global category');
for (const f of fs.readdirSync(path.join(ROOT, 'b'))) if (f.endsWith('.html')) addPage(`b/${f}`, f === 'index.html' || /^page-\d+/.test(f) ? 'blog list' : 'blog post'); addPage('index.html', 'home');
csv(path.join(OUT, 'pages-seo-audit.csv'), ['url', 'type', 'title', 'title_chars', 'description_chars', 'h1_count', 'canonical', 'indexing', 'in_sitemap', 'words', 'faq_markup', 'breadcrumb_markup', 'links'], pageRows);

// 2. local products
const pj = read('products.js'); const P = JSON.parse(pj.slice(pj.indexOf('window.SASTA_PRODUCTS=') + 22, pj.lastIndexOf(']') + 1));
const names = {}; P.forEach(p => { const k = String(p.n || '').toLowerCase().trim(); names[k] = (names[k] || 0) + 1; });
const pfiles = new Set(fs.readdirSync(path.join(ROOT, 'p')).map(f => f.replace(/\.html$/, '')));
csv(path.join(OUT, 'products-local.csv'), ['id', 'sku', 'name', 'category', 'leaf', 'price_pkr', 'in_stock', 'has_image', 'description_chars', 'thin_description', 'duplicate_name', 'generic_category', 'has_video'],
  P.map(p => { const d = strip(p.d || p.sd).length; return [p.id, p.sku, p.n, p.m, p.leaf, p.sp ?? p.bp ?? '', p.in === false ? 'no' : 'yes', p.img || (p.imgs && p.imgs[0]) ? 'yes' : 'no', d, d < 250 ? 'yes' : 'no', names[String(p.n || '').toLowerCase().trim()] > 1 ? 'yes' : 'no', !p.m || !p.leaf || /^(other|uncategori)/i.test(p.m) ? 'yes' : 'no', (p.vids || []).length ? 'yes' : 'no']; }));

// 3. categories with semantic keywords, interlinking and FAQ suggestions (local)
const byCat = {}; P.forEach(p => { (byCat[p.m] = byCat[p.m] || []).push(p); });
const catRows = Object.entries(byCat).sort((a, b) => b[1].length - a[1].length).map(([m, list]) => { const sibs = Object.keys(byCat).filter(x => x !== m).sort((a, b) => byCat[b].length - byCat[a].length).slice(0, 3); const kw = topWords(list.map(p => p.n), 10);
  return ['local', m, list.length, kw.join(' | '), sibs.join(' | '), `How much is delivery for ${m}? (Rs 250, free above Rs 5,000) | Can I pay cash on delivery for ${m}? | Can I return ${m} products? (7 days)`, `buy ${(kw[0] || m)} online in Pakistan | ${m} cash on delivery | best ${(kw[1] || m)} price Pakistan`]; });
const M = JSON.parse(read('data/cj/manifest.js').slice(read('data/cj/manifest.js').indexOf('{'), read('data/cj/manifest.js').lastIndexOf('}') + 1));
const shards = {}; const g = [];
for (const c of M.cats) { const t = fs.readFileSync(path.join(ROOT, 'data/cj/c', c.s + '.js'), 'utf8'); const rows = JSON.parse(t.slice(t.indexOf('[', t.indexOf(',')), t.lastIndexOf(']') + 1)); shards[c.s] = rows;
  const kw = topWords(rows.map(r => r[2]), 10); const sibs = M.cats.filter(x => x.g === c.g && x.s !== c.s).sort((a, b) => b.c - a.c).slice(0, 3).map(x => x.n);
  g.push(['global', `${c.g} > ${c.n}`, rows.length, kw.join(' | '), sibs.join(' | '), `Do you deliver ${c.n} worldwide? | How is shipping for ${c.n} calculated? | Can I choose the colour or size of ${c.n}?`, `buy ${(kw[0] || c.n)} online worldwide | ${c.n} with delivery to my country | ${(kw[1] || c.n)} price`]); }
csv(path.join(OUT, 'categories-keywords-interlinking.csv'), ['scope', 'category', 'products', 'semantic_keywords_from_product_names', 'interlink_to_related_categories', 'faq_questions', 'long_tail_phrases'], [...catRows, ...g]);

// 4. blog schedule
const ctx = {}; new Function('window', read('assets/data/blog.js') + '\n' + (fs.existsSync(path.join(ROOT, 'assets/data/blog-wp.js')) ? read('assets/data/blog-wp.js') : ''))(ctx);
const today = new Date().toISOString().slice(0, 10); const posts = (ctx.SM_BLOG || (typeof SM_BLOG !== 'undefined' ? SM_BLOG : [])) || [];
csv(path.join(OUT, 'blog-schedule.csv'), ['slug', 'publish_date', 'status', 'category', 'title', 'description_chars'], posts.map(p => [p.slug, p.publish, p.publish > today ? 'scheduled' : 'published', p.category, p.title, String(p.description || '').length]).sort((a, b) => a[1].localeCompare(b[1])));

// 5. Live TV channels with real playback result and a "suggest to feature" flag (names that exist in the playlist; not a trend claim)
const tv = read('data/livetv/channels.js'); const T = JSON.parse(tv.slice(tv.indexOf('{'), tv.lastIndexOf('}') + 1)).items;
const FEATURE = /(sports?|cricket|t20|psl|ptv|geo|ary|hum tv|express|dunya|samaa|bol|drama|zindagi|urdu1|a-sports|ten sports|star sports|sky sports|bein|dazn|espn|bbc|cnn|al jazeera|saudi|sbc|mbc|rotana|quran|makkah|madinah)/i;
csv(path.join(OUT, 'live-tv-channels.csv'), ['id', 'name', 'country', 'category', 'type', 'browser_playback_result', 'vlc_only', 'suggest_to_feature'], T.map(c => [c.id, c.name, c.cc, c.cat, c.type, c.chk === 'ok' ? 'played' : c.chk === 'fail' ? 'failed or not reachable' : c.ext ? 'not browser playable' : 'not tested here', c.ext ? 'yes' : 'no', FEATURE.test(c.name + ' ' + (c.cat || '')) ? 'yes (sports, news, drama or Saudi/Pakistan brand)' : '']));

// 6. every global product (large file, not for the repository)
const w = fs.createWriteStream(path.join(OUT, 'large', 'global-products-all.csv')); w.write('product_id,reference,name,group,category,supplier_price_low_usd,supplier_price_high_usd,estimated_price_usd,has_video,page_url\n'); let n = 0;
for (const c of M.cats) for (const r of shards[c.s]) { n++; w.write([r[0], String(r[1]).replace(/^CJ/i, 'SM-'), r[2], c.g, c.n, r[3], r[4], r[3] ? (Math.round(r[3] * 1.2 * 100) / 100) : '', r[6] ? 'yes' : 'no', `${SITE}/global/p/${c.s}/${r[0]}`].map(q).join(',') + '\n'); } w.end();
console.log(`pages ${pageRows.length} | local products ${P.length} | categories ${catRows.length + g.length} (${catRows.length} local, ${g.length} global) | blog ${posts.length} | live tv ${T.length} | global products ${n}`);
