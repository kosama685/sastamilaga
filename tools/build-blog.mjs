// Build static blog pages for every post whose publish date has arrived (Asia/Karachi).
// Usage: node tools/build-blog.mjs   (run daily by .github/workflows/blog-schedule.yml)
// Output: b/index.html, b/<slug>.html, sitemap-blog.xml, and sitemap.xml index entry.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://sastamilaga.com';
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const ctx = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/data/blog.js'), 'utf8'), ctx);
// Posts cloned from sastamilaga.com (metadata here, body in data/wp/posts/<slug>.html)
if (fs.existsSync(path.join(ROOT, 'assets/data/blog-wp.js'))) vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/data/blog-wp.js'), 'utf8'), ctx);
// Validation: unique slugs and titles, real ISO dates. A bad entry stops the build instead of publishing duplicates.
{
  const all = ctx.window.SM_BLOG || [], seen = new Set(), titles = new Set(), bad = [];
  for (const p of all) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || '')) bad.push(`invalid slug: ${p.slug}`);
    if (seen.has(p.slug)) bad.push(`duplicate slug: ${p.slug}`); seen.add(p.slug);
    if (titles.has(p.title)) bad.push(`duplicate title: ${p.title}`); titles.add(p.title);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.publish || '') || isNaN(Date.parse(p.publish + 'T00:00:00Z')) || new Date(p.publish + 'T00:00:00Z').toISOString().slice(0, 10) !== p.publish) bad.push(`invalid publish date: ${p.slug} ${p.publish}`);
  }
  if (bad.length) { console.error(bad.join('\n')); process.exit(1); }
}
const posts = (ctx.window.SM_BLOG || []).filter(p => p.publish <= today).sort((a, b) => b.publish.localeCompare(a.publish));
// Remove pages of posts that are no longer due or no longer listed (e.g. a date moved later), so nothing is published early.
{
  const dir = path.join(ROOT, 'b'), keep = new Set(['index.html', ...Array.from({ length: 12 }, (_, i) => `page-${i + 2}.html`), ...posts.map(p => `${p.slug}.html`)]);
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.html') && !keep.has(f)) fs.unlinkSync(path.join(dir, f));
}
fs.writeFileSync(path.join(ROOT, 'b-published.txt'), posts.map(p => `${SITE}/b/${p.slug}.html`).join('\n') + '\n');
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const ld = o => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const fixLinks = html => html.replace(/href="#\//g, 'href="../#/');

function page({ title, desc, url, image, schema, body, type = 'article' }) {
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${e(/Sasta Milaga/i.test(title) || title.length + 15 > 65 ? title : title + ' | Sasta Milaga')}</title>
<meta name="description" content="${e(desc)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${url}"><link rel="alternate" hreflang="x-default" href="${url}">
<meta property="og:type" content="${type}"><meta property="og:site_name" content="Sasta Milaga"><meta property="og:locale" content="en_PK">
<meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(desc)}"><meta name="twitter:image" content="${image}">
<meta name="theme-color" content="#0F7A3B">
<link rel="icon" href="../assets/brand/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="../assets/brand/apple-touch-icon.png">
<link rel="preload" href="../assets/fonts/host-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/theme/static-bundle.css">
${ld(schema)}
</head>
<body class="sm-static sm-page-static">
<div id="sm-chrome-header" data-prefix="../"><header class="sm-fallback-head"><a href="../"><img src="../assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<main id="main" class="sm-main"><div id="app" class="sm-app">${body}</div></main>
<div id="sm-chrome-footer"></div>
<script src="../assets/js/chrome.js" defer></script>
</body>
</html>
`;
}

const dir = path.join(ROOT, 'b');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const img = p => (p.image ? (/^https?:/.test(p.image) ? p.image : `${SITE}/${p.image}`) : `${SITE}/assets/brand/og-default-1200x630.jpg`);
const imgRel = p => (/^https?:/.test(p.image) ? p.image : `../${p.image}`);
const bodyOf = p => (p.static ? fs.readFileSync(path.join(ROOT, 'data/wp/posts', `${p.slug}.html`), 'utf8') : p.body);
for (const p of posts) {
  const url = `${SITE}/b/${p.slug}.html`;
  const more = posts.filter(x => x !== p).slice(0, 3);
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.publish, dateModified: p.updated || p.publish, inLanguage: 'en',
      author: { '@type': 'Organization', name: p.author }, publisher: { '@type': 'Organization', name: 'Sasta Milaga', logo: { '@type': 'ImageObject', url: `${SITE}/assets/brand/logo.png` } },
      mainEntityOfPage: url, image: img(p), keywords: (p.tags || []).join(', '), articleSection: p.category },
    ...(p.faq?.length ? [{ '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` }, { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/b/index.html` }, { '@type': 'ListItem', position: 3, name: p.title, item: url }] }] };
  const body = `<article class="sm-page sm-article">
<nav class="sm-crumbs" aria-label="Breadcrumb"><a href="../">Home</a> <span aria-hidden="true">/</span> <a href="index.html">Blog</a> <span aria-hidden="true">/</span> <span aria-current="page">${e(p.title)}</span></nav>
<header class="sm-page-head"><h1>${e(p.title)}</h1><p><span class="sm-blog-meta"><span>${e(p.category)}</span> <time datetime="${p.publish}">${fmt(p.publish)}</time> · ${e(p.author)}</span></p></header>
${p.image ? `<figure class="sm-article-hero"><img src="${e(imgRel(p))}" alt="${e(p.imageAlt || p.title)}" width="960" height="540" decoding="async"></figure>` : ''}
<div class="sm-prose">${fixLinks(bodyOf(p))}</div>
${p.faq?.length ? `<section class="sm-article-faq"><h2>Questions people ask</h2>${p.faq.map(f => `<details><summary>${e(f.q)}</summary><p>${e(f.a)}</p></details>`).join('')}</section>` : ''}
${p.links?.length ? `<p class="sm-page-actions">${p.links.map(([l, h], i) => `<a class="sm-btn${i ? ' sm-btn--ghost' : ''}" href="${e(h.startsWith('#/') ? '../' + h : h)}">${e(l)}</a>`).join(' ')}</p>` : ''}
${more.length ? `<section class="section"><h2>More guides</h2><div class="sm-blog-grid">${more.map(x => `<article class="sm-blog-card"><h3><a href="${x.slug}.html">${e(x.title)}</a></h3><p>${e(x.description)}</p></article>`).join('')}</div></section>` : ''}
</article>`;
  fs.writeFileSync(path.join(dir, `${p.slug}.html`), page({ title: p.metaTitle || p.title, desc: p.description, url, image: img(p), schema, body }));
}
const listUrl = `${SITE}/b/index.html`;
/* Blog listing: hero band, featured latest post, card grid and real paginated pages (b/index.html, b/page-2.html ...). */
const PER = 12, pageCount = Math.max(1, Math.ceil((posts.length - 1) / PER));   // page 1 shows the featured post plus 12 cards
const plain = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const readMin = p => Math.max(1, Math.ceil(plain(bodyOf(p)).split(' ').filter(Boolean).length / 200));
const pageHref = n => (n === 1 ? 'index.html' : `page-${n}.html`), pageUrl = n => `${SITE}/b/${pageHref(n)}`;
const CAL = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
const CLOCK = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const USER = '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/></svg>';
const ARR = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const HERO_ART = '<svg class="smb-hero__art" aria-hidden="true" viewBox="0 0 520 220" fill="none"><path d="M20 190C120 60 300 30 500 70" stroke="#0F7A3B" stroke-opacity=".28" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round"/><g transform="translate(330 28) rotate(8)"><path d="M10 52 96 22l32-26c6-5 14-5 17 0 3 5-1 12-6 17l-22 32 22 62-12 7-36-48-38 20-4 22-12 4-8-26-26-8 4-12 22 2 16-18z" fill="#fff" stroke="#0F7A3B" stroke-width="2" stroke-linejoin="round" transform="scale(.9)"/></g><circle cx="430" cy="150" r="46" fill="#EAF6EE" stroke="#0F7A3B" stroke-opacity=".35" stroke-width="2"/><path d="M384 150h92M430 104v92M394 120c26 14 50 14 72 0M394 180c26-14 50-14 72 0" stroke="#0F7A3B" stroke-opacity=".35" stroke-width="2"/><rect x="60" y="120" width="54" height="74" rx="10" fill="#FF8A00" fill-opacity=".92"/><rect x="74" y="106" width="26" height="16" rx="6" stroke="#B85F00" stroke-width="3"/><path d="M76 134v50M98 134v50" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/></svg>';
const media = (p, loading) => (p.image ? `<a class="smb-media" href="${p.slug}.html" tabindex="-1" aria-hidden="true"><img src="${e(imgRel(p))}" alt="" width="640" height="360" loading="${loading}" decoding="async"><span class="smb-date">${CAL}<time datetime="${p.publish}">${fmt(p.publish)}</time></span></a>` : '');
const meta = p => `<p class="smb-meta"><span>${USER}By Sasta Milaga</span><span>${CLOCK}${readMin(p)} min read</span></p>`;
const feature = p => `<article class="smb-feature">${media(p, 'eager')}<div class="smb-feature__body"><span class="smb-pill">${e(p.category)}</span><h2><a href="${p.slug}.html">${e(p.title)}</a></h2><p class="smb-excerpt">${e(p.description)}</p>${meta(p)}<a class="smb-btn" href="${p.slug}.html">Read more ${ARR}</a></div></article>`;
const card = p => `<article class="smb-card">${media(p, 'lazy')}<div class="smb-card__body"><p class="smb-card__top"><span class="smb-pill">${e(p.category)}</span>${p.image ? '' : `<time datetime="${p.publish}">${fmt(p.publish)}</time>`}</p><h3><a href="${p.slug}.html">${e(p.title)}</a></h3><p class="smb-excerpt">${e(p.description)}</p>${meta(p)}<a class="smb-link" href="${p.slug}.html">Read the guide ${ARR}</a></div></article>`;
const pager = n => pageCount < 2 ? '' : `<nav class="smb-pager" aria-label="Blog pages">${n > 1 ? `<a class="smb-pager__a" href="${pageHref(n - 1)}" rel="prev" aria-label="Previous page">&lsaquo;</a>` : ''}${Array.from({ length: pageCount }, (_, i) => i + 1).map(i => i === n ? `<span class="smb-pager__a is-on" aria-current="page">${i}</span>` : `<a class="smb-pager__a" href="${pageHref(i)}" aria-label="Page ${i}">${i}</a>`).join('')}${n < pageCount ? `<a class="smb-pager__a" href="${pageHref(n + 1)}" rel="next" aria-label="Next page">&rsaquo;</a>` : ''}</nav>`;
for (let n = 1; n <= pageCount; n++) {
  const first = n === 1, rest = posts.slice(1), chunk = rest.slice((n - 1) * PER, n * PER);
  const titleN = first ? 'Blog – shopping, travel and how-to guides' : `Blog – shopping, travel and how-to guides (page ${n})`;
  fs.writeFileSync(path.join(dir, pageHref(n)), page({
    title: titleN, desc: first ? 'Guides from Sasta Milaga: how to order, cash on delivery, buying guides, Umrah and travel planning, and Live TV.' : `More guides from Sasta Milaga: shopping, buying guides, Umrah and travel planning. Page ${n} of ${pageCount}.`,
    url: pageUrl(n), image: `${SITE}/assets/brand/og-default-1200x630.jpg`, type: 'website',
    schema: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: titleN, url: pageUrl(n), isPartOf: { '@type': 'Blog', name: 'Sasta Milaga blog', url: listUrl }, mainEntity: { '@type': 'ItemList', itemListElement: (first ? [posts[0], ...chunk] : chunk).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/b/${p.slug}.html`, name: p.title })) } },
    body: `<section class="smb"><div class="smb-hero"><div class="smb-hero__in"><nav class="sm-crumbs" aria-label="Breadcrumb"><a href="../">Home</a> <span aria-hidden="true">/</span> ${first ? '<span aria-current="page">Blog</span>' : `<a href="index.html">Blog</a> <span aria-hidden="true">/</span> <span aria-current="page">Page ${n}</span>`}</nav><h1>Sasta Milaga <em>Blog</em></h1><p>Shopping guides, travel planning and how-tos from the Sasta Milaga team.</p><span class="smb-rule" aria-hidden="true"></span></div>${HERO_ART}</div><div class="smb-wrap">${first && posts[0] ? feature(posts[0]) : ''}<div class="smb-grid">${chunk.map(card).join('')}</div>${pager(n)}</div></section>`
  }));
}


/* Blog listing styles (static-bundle.css), inserted idempotently. Theme tokens: --sm-brand-green / --sm-brand-orange / --sm-brand-deep. */
const BLOG_CSS = `
.smb{--g:var(--sm-brand-green,#0F7A3B);--o:var(--sm-brand-orange,#FF8A00);--deep:var(--sm-brand-deep,#0B3B20);--mint:var(--sm-brand-light,#EAF6EE);--ease:cubic-bezier(.22,1,.36,1);color:#1c2b22;line-height:1.6}
.smb *{box-sizing:border-box}
.smb .smb-hero{position:relative;overflow:hidden;background:radial-gradient(700px 260px at 92% 10%,rgba(15,122,59,.14),transparent 60%),radial-gradient(520px 220px at 8% 100%,rgba(255,138,0,.16),transparent 60%),linear-gradient(100deg,#fff7ee,#fff 45%,var(--mint));border-bottom:1px solid rgba(15,122,59,.14)}
.smb .smb-hero__in{position:relative;z-index:1;max-width:1360px;margin:0 auto;padding:clamp(1.4rem,3vw,2.4rem) clamp(1rem,2.5vw,2rem) clamp(1.8rem,3.5vw,3rem)}
.smb .smb-hero h1{margin:.6rem 0 .4rem;font-size:clamp(2.1rem,5vw,3.6rem);line-height:1.05;letter-spacing:-.035em;font-weight:800;color:var(--deep)}
.smb .smb-hero h1 em{font-style:normal;color:var(--o)}
.smb .smb-hero p{margin:0;max-width:46ch;font-size:clamp(1rem,1.4vw,1.15rem);color:#3b5546}
.smb .smb-rule{display:block;width:92px;height:4px;margin-top:1.1rem;border-radius:4px;background:var(--o)}
.smb .smb-hero .sm-crumbs{font-size:.95rem;color:#3b5546}.smb .smb-hero .sm-crumbs a{color:var(--deep);font-weight:600}.smb .smb-hero .sm-crumbs [aria-current]{color:var(--o);font-weight:700}
.smb .smb-hero__art{position:absolute;right:clamp(0rem,4vw,4rem);bottom:0;width:min(46vw,560px);height:auto;opacity:.95}
.smb .smb-wrap{max-width:1360px;margin:0 auto;padding:clamp(1.2rem,3vw,2.2rem) clamp(1rem,2.5vw,2rem) 3rem}
.smb .smb-feature{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(1rem,3vw,2.2rem);align-items:center;padding:clamp(.8rem,1.6vw,1.1rem);margin-top:-2.6rem;position:relative;z-index:2;border-radius:22px;background:#fff;border:1px solid rgba(15,122,59,.12);box-shadow:0 30px 50px -34px rgba(11,59,32,.5),0 3px 8px rgba(11,59,32,.07)}
.smb .smb-media{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;border-radius:16px;background:var(--mint)}
.smb .smb-media img{display:block;width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease)}
.smb .smb-media:hover img{transform:scale(1.03)}
.smb .smb-date{position:absolute;left:.8rem;top:.8rem;display:inline-flex;align-items:center;gap:.4rem;padding:.3rem .7rem;border-radius:10px;background:rgba(255,255,255,.96);color:var(--deep);font-size:.82rem;font-weight:700;box-shadow:0 6px 14px -8px rgba(0,0,0,.45)}
.smb .smb-date svg{color:var(--g)}
.smb .smb-pill{display:inline-block;padding:.22rem .75rem;border-radius:999px;background:#FFF0DC;color:#9A4A00;font-size:.8rem;font-weight:700;line-height:1.4}
.smb .smb-feature__body{padding:.4rem clamp(.2rem,1.4vw,1rem) .4rem 0}
.smb .smb-feature h2{margin:.7rem 0 .6rem;font-size:clamp(1.4rem,2.5vw,2.15rem);line-height:1.15;letter-spacing:-.025em;font-weight:800}
.smb h2 a,.smb h3 a{color:var(--deep);text-decoration:none;background:linear-gradient(var(--o),var(--o)) 0 100%/0 2px no-repeat;transition:background-size .35s var(--ease)}
.smb h2 a:hover,.smb h3 a:hover{background-size:100% 2px}
.smb .smb-excerpt{margin:0 0 .9rem;color:#445a4c;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.smb .smb-meta{display:flex;flex-wrap:wrap;gap:.4rem 1.1rem;margin:0 0 1.1rem;font-size:.86rem;color:#4f6657}
.smb .smb-meta span{display:inline-flex;align-items:center;gap:.4rem}.smb .smb-meta svg{color:var(--g)}
.smb a.smb-btn,.smb a.smb-btn:visited,.smb a.smb-btn:hover{color:#1d1200}
.smb .smb-btn{display:inline-flex;align-items:center;gap:.55rem;padding:.7rem 1.25rem;border-radius:12px;background:var(--o);color:#1d1200;font-weight:800;text-decoration:none;box-shadow:0 12px 22px -14px rgba(255,138,0,.9);transition:transform .3s var(--ease),box-shadow .3s var(--ease)}
.smb .smb-btn:hover{transform:translateY(-2px);box-shadow:0 16px 26px -14px rgba(255,138,0,.95)}.smb .smb-btn:active{transform:translateY(0)}
.smb a:focus-visible{outline:3px solid var(--o);outline-offset:3px;border-radius:6px}
.smb .smb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:1.3rem;margin-top:1.6rem}
.smb .smb-card{display:flex;flex-direction:column;overflow:hidden;border-radius:18px;background:#fff;border:1px solid rgba(15,122,59,.12);box-shadow:0 18px 30px -26px rgba(11,59,32,.55);transition:transform .35s var(--ease),box-shadow .35s var(--ease)}
.smb .smb-card:hover{transform:translateY(-3px);box-shadow:0 26px 36px -26px rgba(11,59,32,.6)}
.smb .smb-card .smb-media{border-radius:0}
.smb .smb-card__body{display:flex;flex-direction:column;flex:1;padding:1rem 1.1rem 1.2rem}
.smb .smb-card__top{margin:0 0 .5rem;display:flex;justify-content:space-between;align-items:center;gap:.5rem;font-size:.82rem;color:#4f6657}
.smb .smb-card h3{margin:0 0 .5rem;font-size:1.12rem;line-height:1.3;letter-spacing:-.015em;font-weight:800}
.smb .smb-card .smb-excerpt{font-size:.94rem;-webkit-line-clamp:3}
.smb .smb-card .smb-meta{margin:auto 0 .8rem}
.smb .smb-link{display:inline-flex;align-items:center;gap:.4rem;font-weight:700;color:var(--g);text-decoration:none}
.smb .smb-link:hover{color:var(--deep)}.smb .smb-link svg{transition:transform .3s var(--ease)}.smb .smb-link:hover svg{transform:translateX(3px)}
.smb .smb-pager{display:flex;justify-content:center;gap:.5rem;margin:2.2rem 0 0}
.smb .smb-pager__a{display:inline-grid;place-items:center;min-width:2.6rem;height:2.6rem;padding:0 .6rem;border-radius:12px;border:1px solid rgba(15,122,59,.2);background:#fff;color:var(--deep);font-weight:700;text-decoration:none;transition:transform .25s var(--ease),background-color .2s}
.smb a.smb-pager__a:hover{background:var(--mint);transform:translateY(-1px)}
.smb .smb-pager__a.is-on{background:var(--o);border-color:var(--o);color:#1d1200}
@media (max-width:860px){.smb .smb-hero__art{display:none}.smb .smb-feature{grid-template-columns:1fr;margin-top:-1.4rem}.smb .smb-feature__body{padding:.2rem .3rem .6rem}}
@media (prefers-reduced-motion:reduce){.smb *{transition:none!important}}
`;
{ const f = path.join(ROOT, 'assets/theme/static-bundle.css'); let c = fs.readFileSync(f, 'utf8'); c = c.replace(/\n?\/\*smblog:start\*\/[\s\S]*?\/\*smblog:end\*\//, ''); fs.writeFileSync(f, c.replace(/\s*$/, '\n') + '/*smblog:start*/' + BLOG_CSS + '/*smblog:end*/\n'); }

const urls = [[listUrl, posts[0]?.updated || today], ...Array.from({ length: pageCount - 1 }, (_, i) => [pageUrl(i + 2), posts[0]?.updated || today]), ...posts.map(p => [`${SITE}/b/${p.slug}.html`, p.updated || p.publish])];
fs.writeFileSync(path.join(ROOT, 'sitemap-blog.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const idxPath = path.join(ROOT, 'sitemap.xml');
let idx = fs.readFileSync(idxPath, 'utf8');
const entry = `<sitemap><loc>${SITE}/sitemap-blog.xml</loc><lastmod>${today}</lastmod></sitemap>`;
idx = idx.includes('sitemap-blog.xml') ? idx.replace(/<sitemap><loc>[^<]*sitemap-blog\.xml<\/loc><lastmod>[^<]*<\/lastmod><\/sitemap>/, entry) : idx.replace('</sitemapindex>', `${entry}\n</sitemapindex>`);
fs.writeFileSync(idxPath, idx);
const scheduled = (ctx.window.SM_BLOG || []).filter(p => p.publish > today).map(p => `${p.publish} ${p.slug}`);
console.log(`published ${posts.length} posts (today ${today}); scheduled: ${scheduled.length ? scheduled.join(', ') : 'none'}`);
