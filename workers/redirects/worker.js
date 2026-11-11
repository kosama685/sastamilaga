/* Sasta Milaga: old WordPress addresses -> the new pages (Cloudflare Worker).
 * Google indexed the WordPress addresses (/product/<slug>/, /product-category/…, /videos/…, /visa/…, /privacy-policy/ …).
 * The new site uses other addresses, so those requests returned 404. This Worker answers them with a permanent redirect (301)
 * to the matching new page, so search engines carry the old ranking over and visitors land on the right page.
 *
 *   /product/<slug>/ , /ur/product/<slug>/        -> /p/<page>.html           (11,201 products matched by SKU, name prefix or words)
 *   /product-category/<path>/[page/N/]            -> /c/<category>.html       (nearest category that has a page)
 *   /videos/<slug>/                               -> the product page, else /videos/
 *   /visa/<country>/ , /ur/visa/<country>/        -> /visa/
 *   /privacy-policy/ , /returns-refunds/ …        -> /privacy/ , /returns/ …  (old page names)
 *   /product-tag/…, /store/…, …/feed/             -> 410 Gone (address types the new site does not have)
 *   a product that no longer exists               -> 302 to a search for its words (temporary, so nobody lands on an error)
 * The matching data is data/redirects/*.json (built from a read-only export of the WordPress slugs). */

const memo = {};
async function data(name, env) {
  if (memo[name]) return memo[name];
  const r = await fetch(`${env.SITE_ORIGIN}/data/redirects/${name}.json`, { cf: { cacheTtl: 3600, cacheEverything: true } });
  if (!r.ok) throw new Error('data ' + name);
  return (memo[name] = await r.json());
}

const PAGES = {
  '/privacy-policy': '/privacy/', '/terms-conditions': '/terms/', '/returns-refunds': '/returns/', '/shipping-delivery': '/shipping/',
  '/track-order': '/track/', '/sell-with-us': '/seller/', '/rewards-program': '/earn-points/', '/refer-and-earn': '/earn-points/',
  '/product-category': '/shop/', '/earn': '/earn-points/', '/home': '/', '/home-ur': '/ur/about/',
};
const URDU_PAGES = { '/privacy-policy': '/ur/privacy/', '/terms-conditions': '/ur/terms/', '/returns-refunds': '/ur/returns/', '/shipping-delivery': '/ur/shipping/', '/sell-with-us': '/seller/' };

export default {
  async fetch(req, env) {
    const url = new URL(req.url), base = (env.CANONICAL_BASE || 'https://sastamilaga.com').replace(/\/$/, '');
    if (!['GET', 'HEAD'].includes(req.method)) return new Response('Method not allowed', { status: 405 });
    let path = url.pathname.replace(/\/+$/, '') || '/';
    const ur = path === '/ur' || path.startsWith('/ur/'), q = ur ? (path.replace(/^\/ur/, '') || '/') : path;
    const go = (to, status = 301) => new Response(null, { status, headers: { Location: base + to, 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
    const gone = () => new Response('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Gone | Sasta Milaga</title><p>This address no longer exists. <a href="/shop/">Browse the shop</a>.</p>', { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'public, max-age=3600' } });
    // The index pages /videos/ and /visa/ exist as real pages on the site: this Worker is routed on /videos/* and /visa/*, so it serves them itself (read from the static site).
    const pass = async () => { const r = await fetch(`${env.SITE_ORIGIN}${q}/`, { cf: { cacheTtl: 300, cacheEverything: true } }); if (!r.ok) return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } }); return new Response(r.body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=120, s-maxage=300', 'X-Redirects-Worker': 'index-passthrough' } }); };
    try {
      if (!ur && (q === '/videos' || q === '/visa')) return pass();
      if (ur && (q === '/videos' || q === '/visa')) return go(q + '/');
      if (q === '/product') return go('/shop/');
      if (/\/feed$/.test(q) || /^\/(product-tag|store)\//.test(q)) return gone();
      if (ur && q === '/') return go('/');
      if (ur && URDU_PAGES[q]) return go(URDU_PAGES[q]);
      if (PAGES[q]) return go(PAGES[q]);
      let m = q.match(/^\/product\/([^/]+)$/);
      if (m) {
        const slug = decodeURIComponent(m[1]).toLowerCase(), file = (await data('products', env))[slug];
        if (file) return go(`/p/${file}.html`);
        return go(`/search/?q=${encodeURIComponent(slug.replace(/-\d{1,2}$/, '').split('-').slice(0, 5).join(' '))}`, 302);
      }
      m = q.match(/^\/product-category\/(.+)$/);
      if (m) {
        const parts = m[1].split('/').filter(Boolean).filter((x, i, a) => x !== 'page' && !(a[i - 1] === 'page' && /^\d+$/.test(x)));
        const cm = await data('categories', env);
        for (let i = parts.length - 1; i >= 0; i--) if (cm[parts[i]]) return go(`/c/${cm[parts[i]]}.html`);
        return go('/shop/');
      }
      m = q.match(/^\/videos\/([^/]+)(?:\/\d+)?$/);
      if (m) { const file = (await data('products', env))[decodeURIComponent(m[1]).toLowerCase()]; return go(file ? `/p/${file}.html` : '/videos/'); }
      if (/^\/visa\/[^/]+/.test(q)) return go('/visa/');
      return new Response('Not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
    } catch (e) {
      return new Response('Temporarily unavailable', { status: 503, headers: { 'Retry-After': '60' } });
    }
  }
};
