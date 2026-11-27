/* Weekly read-only crawl of https://sastamilaga.com (GET requests only, polite concurrency).
   Reads sitemap.xml, takes every URL of the small sitemaps and a rotating sample of the large ones, and records for each URL:
   status, redirect target, self-canonical, robots (meta + header), title, description, JSON-LD types.
   It then compares with the previous run (docs/crawl/latest.json) and writes docs/crawl/DELTA.md.
   Release gate: exit code 1 when a URL that is in a sitemap answers 4xx/5xx, redirects, is noindex, or has a canonical that is not itself. */
import fs from 'node:fs';

const BASE = process.env.CRAWL_BASE || 'https://sastamilaga.com';
const SAMPLE = +(process.env.SAMPLE || 150), FULL_UP_TO = +(process.env.FULL_UP_TO || 400), CONC = 6;
const UA = 'SastaMilagaWeeklyAudit/1.0 (+read-only; own site)';
const wk = Math.floor(Date.now() / (7 * 864e5));
const get = async (u, opt = {}) => { const r = await fetch(u, { redirect: 'manual', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000), ...opt }); return r; };
const locs = x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());

const idx = await (await get(`${BASE}/sitemap.xml`)).text();
const children = locs(idx).filter(u => u.endsWith('.xml'));
const urls = new Map(), family = new Map();   // family = sitemap name without its number, so hundreds of catalogue shards share one sample budget
for (const c of children) {
  try {
    const t = await (await get(c)).text(), l = locs(t).filter(u => !u.endsWith('.xml')), rel = c.replace(BASE + '/', ''), fam = /^sitemaps\//.test(rel) ? rel.replace(/\/[^/]+$/, '/') : rel.replace(/-?\d+\.xml$/, '.xml');
    (family.get(fam) || family.set(fam, []).get(fam)).push(...l.map(u => [u, c.replace(BASE + '/', '')]));
  } catch (e) { console.log('sitemap failed', c, e.message); }
}
for (const [fam, all] of family) {
  let l = all;
  if (all.length > FULL_UP_TO) { const step = Math.max(1, Math.floor(all.length / SAMPLE)); l = all.filter((_, i) => (i + wk) % step === 0).slice(0, SAMPLE); }
  l.forEach(([u, c]) => urls.set(u, c));
  console.log(`${fam}: ${all.length} urls, checking ${l.length}`);
}
console.log(`sitemaps: ${children.length}, urls to check: ${urls.size}`);

const pick = (h, re) => { const m = h.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
async function check(u) {
  try {
    const r = await get(u), loc = r.headers.get('location') || '';
    if (r.status >= 300 && r.status < 400) return { u, status: r.status, redirect: loc };
    const h = await r.text(), types = [...new Set([...h.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)].map(m => m[1]))].sort();
    return { u, status: r.status, canonical: pick(h, /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i) || pick(h, /<link[^>]*href="([^"]+)"[^>]*rel="canonical"/i),
      robots: pick(h, /<meta[^>]*name="robots"[^>]*content="([^"]+)"/i), xrt: r.headers.get('x-robots-tag') || '', title: pick(h, /<title>([^<]*)<\/title>/i).slice(0, 120),
      desc: !!pick(h, /<meta[^>]*name="description"[^>]*content="([^"]+)"/i), jsonld: types };
  } catch (e) { return { u, status: 0, error: String(e.message || e).slice(0, 80) }; }
}
const list = [...urls.keys()], out = [];
let next = 0; await Promise.all(Array.from({ length: CONC }, async () => { while (next < list.length) { const u = list[next++]; out.push({ ...(await check(u)), sitemap: urls.get(u) }); } }));
out.sort((a, b) => a.u.localeCompare(b.u));

const problems = o => {
  const p = [];
  if (o.status === 0) p.push('no response'); else if (o.status >= 400) p.push('HTTP ' + o.status); else if (o.status >= 300) p.push('redirects to ' + o.redirect);
  if (o.status === 200) {
    if (/noindex/i.test(`${o.robots} ${o.xrt}`)) p.push('noindex but in sitemap');
    if (!o.canonical) p.push('no canonical'); else if (o.canonical.replace(/\/$/, '') !== o.u.replace(/\/$/, '')) p.push('canonical is ' + o.canonical);
    if (!o.title) p.push('no title'); if (!o.desc) p.push('no meta description');
  }
  return p;
};
out.forEach(o => { o.problems = problems(o); });

fs.mkdirSync('docs/crawl', { recursive: true });
let prev = []; try { prev = JSON.parse(fs.readFileSync('docs/crawl/latest.json', 'utf8')).urls || []; } catch { }
const pm = new Map(prev.map(o => [o.u, o]));
const nowBad = out.filter(o => o.problems.length), newlyBad = nowBad.filter(o => !pm.get(o.u) || !pm.get(o.u).problems.length);
const fixed = out.filter(o => !o.problems.length && pm.get(o.u) && pm.get(o.u).problems.length);
const titleDup = {}; out.filter(o => o.title).forEach(o => { (titleDup[o.title] = titleDup[o.title] || []).push(o.u); });
const dups = Object.entries(titleDup).filter(([, v]) => v.length > 1);
const byType = {}; out.forEach(o => (o.jsonld || []).forEach(t => { byType[t] = (byType[t] || 0) + 1; }));
const md = [`# Weekly crawl delta`, ``, `Run: ${new Date().toISOString()} · base ${BASE} · URLs checked ${out.length} (previous run: ${prev.length || 'none'})`, ``,
  `| Metric | Now |`, `|---|---|`, `| HTTP 200 | ${out.filter(o => o.status === 200).length} |`, `| Redirects in sitemap | ${out.filter(o => o.status >= 300 && o.status < 400).length} |`, `| 4xx / 5xx / no response | ${out.filter(o => o.status === 0 || o.status >= 400).length} |`, `| URLs with a problem | ${nowBad.length} |`, `| Newly broken since last run | ${newlyBad.length} |`, `| Fixed since last run | ${fixed.length} |`, `| Duplicate titles (in this sample) | ${dups.length} groups |`, ``,
  `## Newly broken`, ...(newlyBad.length ? newlyBad.slice(0, 100).map(o => `- ${o.u} — ${o.problems.join('; ')}`) : ['- none']), ``,
  `## Fixed`, ...(fixed.length ? fixed.slice(0, 100).map(o => `- ${o.u}`) : ['- none']), ``,
  `## All current problems (first 150)`, ...(nowBad.length ? nowBad.slice(0, 150).map(o => `- ${o.u} — ${o.problems.join('; ')}`) : ['- none']), ``,
  `## Duplicate titles (first 20 groups)`, ...(dups.length ? dups.slice(0, 20).map(([t, v]) => `- "${t}" × ${v.length}: ${v.slice(0, 3).join(', ')}`) : ['- none']), ``,
  `## JSON-LD types seen`, Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(' · '), ``].join('\n');
fs.writeFileSync('docs/crawl/DELTA.md', md);
fs.writeFileSync('docs/crawl/latest.json', JSON.stringify({ at: new Date().toISOString(), base: BASE, urls: out }));
console.log(md.split('\n').slice(0, 14).join('\n'));
if (newlyBad.length || nowBad.some(o => o.status === 0 || o.status >= 400)) { console.log('RELEASE GATE: failing'); process.exitCode = 1; }
