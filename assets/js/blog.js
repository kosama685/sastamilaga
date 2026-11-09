/* Sasta Milaga blog: lists posts from assets/data/blog.js whose publish date has arrived
   (Pakistan time). Static copies of each published post live in b/<slug>.html for crawlers. */
(function () {
  'use strict';
  const A = window.SMApp;
  if (!A || !window.SM_BLOG) return;
  const { esc, renderApp, setSEO, pageHead } = A;
  const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); /* Asia/Karachi (UTC+5) */
  const published = () => window.SM_BLOG.filter(p => p.publish <= today()).sort((a, b) => b.publish.localeCompare(a.publish));
  const fmt = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const url = p => `${A.SITE_URL}/b/${p.slug}.html`;

  function list() {
    const posts = published();
    setSEO({ title: 'Blog – shopping, travel and how-to guides', description: 'Guides from Sasta Milaga: how to order, cash on delivery, buying guides, Umrah and travel planning, and Live TV.', url: `${A.SITE_URL}/b/index.html`,
      ldJson: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Sasta Milaga blog', url: `${A.SITE_URL}/b/index.html`,
        blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: url(p), datePublished: p.publish, dateModified: p.updated || p.publish })) } });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Blog', 'Shopping guides, travel planning and how-tos from the Sasta Milaga team.')}
      <div class="sm-blog-grid">${posts.map(p => `<article class="sm-blog-card"><p class="sm-blog-meta"><span>${esc(p.category)}</span> <time datetime="${p.publish}">${fmt(p.publish)}</time></p>
        <h2><a href="#/blog/${p.slug}">${esc(p.title)}</a></h2><p>${esc(p.description)}</p><a class="sm-blog-more" href="#/blog/${p.slug}" aria-label="Read: ${esc(p.title)}">Read the guide</a></article>`).join('')}</div></section>`);
  }
  function post(slug) {
    const p = published().find(x => x.slug === slug);
    if (!p) { renderApp(`<section class="sm-page">${pageHead('Post not found', 'This post is not published yet or the link has changed.')}<p><a class="sm-btn" href="#/blog">See all posts</a></p></section>`); return; }
    setSEO({ title: p.title, description: p.description, url: url(p), image: `${A.SITE_URL}/${p.image}`,
      ldJson: { '@context': 'https://schema.org', '@graph': [
        { '@type': 'BlogPosting', headline: p.title, description: p.description, datePublished: p.publish, dateModified: p.updated || p.publish, author: { '@type': 'Organization', name: p.author },
          publisher: { '@type': 'Organization', name: 'Sasta Milaga', logo: { '@type': 'ImageObject', url: `${A.SITE_URL}/assets/brand/logo.png` } }, mainEntityOfPage: url(p), image: `${A.SITE_URL}/${p.image}`, keywords: p.tags.join(', ') },
        ...(p.faq && p.faq.length ? [{ '@type': 'FAQPage', mainEntity: p.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${A.SITE_URL}/` }, { '@type': 'ListItem', position: 2, name: 'Blog', item: `${A.SITE_URL}/b/index.html` }, { '@type': 'ListItem', position: 3, name: p.title, item: url(p) }] }] } });
    const more = published().filter(x => x !== p).slice(0, 3);
    renderApp(`<article class="sm-page sm-article">${pageHead(p.title, `<span class="sm-blog-meta"><span>${esc(p.category)}</span> <time datetime="${p.publish}">${fmt(p.publish)}</time> · ${esc(p.author)}</span>`, ['<a href="#/blog">Blog</a>'])}
      <div class="sm-prose">${p.body}</div>
      ${p.faq && p.faq.length ? `<section class="sm-article-faq"><h2>Questions people ask</h2>${p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</section>` : ''}
      ${p.links && p.links.length ? `<p class="sm-page-actions">${p.links.map(([l, h], i) => `<a class="sm-btn${i ? ' sm-btn--ghost' : ''}" href="${esc(h)}">${esc(l)}</a>`).join(' ')}</p>` : ''}
      ${more.length ? `<section class="section"><h2>More guides</h2><div class="sm-blog-grid">${more.map(x => `<article class="sm-blog-card"><h3><a href="#/blog/${x.slug}">${esc(x.title)}</a></h3><p>${esc(x.description)}</p></article>`).join('')}</div></section>` : ''}</article>`);
  }
  window.SMBlog = { route(s) { return s ? post(s) : list(); }, published };
  if (/^#\/blog(\/|$)/.test(location.hash)) A.route();
})();
