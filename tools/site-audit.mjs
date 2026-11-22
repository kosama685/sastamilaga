// Sampled live SEO + broken-link audit of sastamilaga.com (read-only, at most 2 requests at a time).
//  - every sitemap in /sitemap.xml: a sample of its URLs (status, final URL, canonical, robots, title, description, H1)
//  - internal links found on key pages (home, shop, a local product, a CJ product, a category, travel, visa): status of each target
// Usage: node tools/site-audit.mjs [perSitemap=8] [outFile]
import fs from 'node:fs';
const SITE = 'https://sastamilaga.com', PER = Number(process.argv[2] || 8), OUT = process.argv[3] || '';
const UA = 'Mozilla/5.0 (compatible; SastaMilagaAudit/1.0; owner site check)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url, redirect = 'manual') {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect, headers: { 'User-Agent': UA, Accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(45000) });
    const type = r.headers.get('content-type') || '';
    const body = /html|xml|text/.test(type) && r.status < 400 ? await r.text() : '';
    return { url, status: r.status, location: r.headers.get('location') || '', type, body, ms: Date.now() - t0 };
  } catch (e) { return { url, status: 0, error: String(e.message || e).slice(0, 80), ms: Date.now() - t0 }; }
}
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); await sleep(150); } })); return out; }
const pick = (arr, n) => { if (arr.length <= n) return arr; const step = arr.length / n; return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]); };
const locs = xml => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
const meta = html => {
  const m = (re) => (html.match(re) || [])[1] || '';
  return {
    title: m(/<title[^>]*>([^<]*)<\/title>/i).trim(),
    description: m(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || m(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i),
    canonical: m(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || m(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i),
    robots: m(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i),
    h1: (html.match(/<h1[\s>]/gi) || []).length,
  };
};

const report = { checkedAt: new Date().toISOString(), sitemaps: [], pages: [], links: [], problems: [] };
// 1) sitemaps
const index = await get(SITE + '/sitemap.xml');
const maps = locs(index.body || '').filter(u => /sitemap/i.test(u));
console.log(`sitemap index: ${index.status}, ${maps.length} sitemaps`);
const pageUrls = [];
for (const sm of maps) {
  const r = await get(sm, 'follow'); const urls = locs(r.body || '').filter(u => !/sitemap.*\.xml$/i.test(u));
  report.sitemaps.push({ sitemap: sm, status: r.status, urls: urls.length });
  if (r.status !== 200 || !urls.length) report.problems.push({ kind: 'sitemap', url: sm, detail: `status ${r.status}, ${urls.length} URLs` });
  pageUrls.push(...pick(urls, PER));
  await sleep(150);
}
// 2) sampled sitemap pages
const pages = await pool([...new Set(pageUrls)], 2, async u => {
  const r = await get(u);
  const m = r.body ? meta(r.body) : {};
  const row = { url: u, status: r.status, location: r.location, ms: r.ms, ...m };
  if (r.status >= 300 && r.status < 400) report.problems.push({ kind: 'sitemap URL redirects', url: u, detail: `${r.status} -> ${r.location}` });
  else if (r.status !== 200) report.problems.push({ kind: 'sitemap URL not 200', url: u, detail: String(r.status || r.error) });
  else {
    if (!m.title) report.problems.push({ kind: 'missing title', url: u });
    if (!m.description) report.problems.push({ kind: 'missing meta description', url: u });
    if (m.canonical && m.canonical.replace(/\/$/, '') !== u.replace(/\/$/, '')) report.problems.push({ kind: 'canonical differs from sitemap URL', url: u, detail: m.canonical });
    if (/noindex/i.test(m.robots)) report.problems.push({ kind: 'noindex page listed in sitemap', url: u, detail: m.robots });
    if (m.h1 !== 1) report.problems.push({ kind: m.h1 ? 'more than one H1' : 'no H1 in HTML', url: u, detail: `h1 count ${m.h1}` });
    if (r.ms > 8000) report.problems.push({ kind: 'slow page (> 8 s)', url: u, detail: r.ms + ' ms' });
  }
  return row;
});
report.pages = pages;
// 3) internal links on key pages
const KEY = [SITE + '/', SITE + '/shop/', SITE + '/travel/', SITE + '/visa/', SITE + '/p/raf-professional-electric-coffee-spice-grinder-300w-high-power-stainless-steel-m-hhc-3759872.html', SITE + '/global-shop/p/1368068170002337792/leather-business-handbag-super-soft-large-capacity-wash-bag/', SITE + '/c/home-and-living.html'];
const targets = new Map();
for (const k of KEY) {
  const r = await get(k);
  const baseHref = ((r.body || '').match(/<base[^>]+href=["']([^"']+)["']/i) || [])[1];   // pages like /shop/ use <base href="../">
  const base = baseHref ? new URL(baseHref, k).href : k;
  for (const m of (r.body || '').matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
    let u; try { u = new URL(m[1].replace(/&amp;/g, '&'), base); } catch (e) { continue; }
    if (u.origin !== SITE || /\.(jpg|jpeg|png|webp|gif|pdf|mp4)$/i.test(u.pathname)) continue;
    u.hash = ''; if (!targets.has(u.href)) targets.set(u.href, k);
  }
  await sleep(150);
}
const linkList = [...targets.keys()].slice(0, 260);
report.links = await pool(linkList, 2, async u => {
  const r = await get(u);
  if (r.status >= 400 || r.status === 0) report.problems.push({ kind: 'broken internal link', url: u, detail: `${r.status || r.error} (linked from ${targets.get(u)})` });
  return { url: u, status: r.status, location: r.location, from: targets.get(u) };
});
// summary
const by = {}; report.problems.forEach(p => { by[p.kind] = (by[p.kind] || 0) + 1; });
console.log(`sampled sitemap pages: ${pages.length} | internal links checked: ${report.links.length}`);
console.log('status of sampled pages:', JSON.stringify(pages.reduce((a, p) => (a[p.status] = (a[p.status] || 0) + 1, a), {})));
console.log('status of internal links:', JSON.stringify(report.links.reduce((a, p) => (a[p.status] = (a[p.status] || 0) + 1, a), {})));
console.log('problems by kind:', JSON.stringify(by, null, 1));
report.problems.slice(0, 40).forEach(p => console.log(' -', p.kind, '|', p.url.replace(SITE, ''), p.detail ? '| ' + p.detail : ''));
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
