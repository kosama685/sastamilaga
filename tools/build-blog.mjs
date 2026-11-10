// Build static blog pages for every post whose publish date has arrived (Asia/Karachi).
// Usage: node tools/build-blog.mjs   (run daily by .github/workflows/blog-schedule.yml)
// Output: b/index.html, b/<slug>.html, sitemap-blog.xml, and sitemap.xml index entry.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SITE = 'https://kosama685.github.io/sastamilaga';
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
  const dir = path.join(ROOT, 'b'), keep = new Set(['index.html', ...posts.map(p => `${p.slug}.html`)]);
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
<title>${e(/Sasta Milaga/i.test(title) ? title : title + ' | Sasta Milaga')}</title>
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
fs.writeFileSync(path.join(dir, 'index.html'), page({
  title: 'Blog – shopping, travel and how-to guides', desc: 'Guides from Sasta Milaga: how to order, cash on delivery, buying guides, Umrah and travel planning, and Live TV.',
  url: listUrl, image: `${SITE}/assets/brand/og-default-1200x630.jpg`, type: 'website',
  schema: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Sasta Milaga blog', url: listUrl, blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE}/b/${p.slug}.html`, datePublished: p.publish })) },
  body: `<section class="sm-page sm-page--wide"><nav class="sm-crumbs" aria-label="Breadcrumb"><a href="../">Home</a> <span aria-hidden="true">/</span> <span aria-current="page">Blog</span></nav>
<header class="sm-page-head"><h1>Blog</h1><p>Shopping guides, travel planning and how-tos from the Sasta Milaga team.</p></header>
<div class="sm-blog-grid">${posts.map(p => `<article class="sm-blog-card">${p.image ? `<a class="sm-blog-thumb" href="${p.slug}.html" tabindex="-1" aria-hidden="true"><img src="${e(imgRel(p))}" alt="" width="320" height="180" loading="lazy" decoding="async"></a>` : ''}<p class="sm-blog-meta"><span>${e(p.category)}</span> <time datetime="${p.publish}">${fmt(p.publish)}</time></p><h2><a href="${p.slug}.html">${e(p.title)}</a></h2><p>${e(p.description)}</p><a class="sm-blog-more" href="${p.slug}.html">Read the guide</a></article>`).join('')}</div></section>`
}));

const urls = [[listUrl, posts[0]?.updated || today], ...posts.map(p => [`${SITE}/b/${p.slug}.html`, p.updated || p.publish])];
fs.writeFileSync(path.join(ROOT, 'sitemap-blog.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d]) => `<url><loc>${u}</loc><lastmod>${d}</lastmod></url>`).join('\n')}\n</urlset>\n`);
const idxPath = path.join(ROOT, 'sitemap.xml');
let idx = fs.readFileSync(idxPath, 'utf8');
const entry = `<sitemap><loc>${SITE}/sitemap-blog.xml</loc><lastmod>${today}</lastmod></sitemap>`;
idx = idx.includes('sitemap-blog.xml') ? idx.replace(/<sitemap><loc>[^<]*sitemap-blog\.xml<\/loc><lastmod>[^<]*<\/lastmod><\/sitemap>/, entry) : idx.replace('</sitemapindex>', `${entry}\n</sitemapindex>`);
fs.writeFileSync(idxPath, idx);
const scheduled = (ctx.window.SM_BLOG || []).filter(p => p.publish > today).map(p => `${p.publish} ${p.slug}`);
console.log(`published ${posts.length} posts (today ${today}); scheduled: ${scheduled.length ? scheduled.join(', ') : 'none'}`);
