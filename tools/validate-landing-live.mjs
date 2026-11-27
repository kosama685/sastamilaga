#!/usr/bin/env node
/**
 * Read-only validation of the DEPLOYED landing pages: status, canonical, robots, lang/dir, hreflang reciprocity,
 * x-default, JSON-LD, title/description uniqueness and sitemap consistency.
 * Writes reports/hreflang-validation.md, reports/sitemap-validation.md and data/landing/live-validation.json.
 * It validates what the pages and sitemaps SAY. It does not prove Google has crawled or indexed anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://sastamilaga.com';
const {routes} = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/routes.json'), 'utf8'));
const get = async (u, tries = 3) => {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(u + (u.includes('?') ? '&' : '?') + 'cb=' + Math.random().toString(36).slice(2, 8), {redirect: 'manual', signal: AbortSignal.timeout(30000), headers: {'user-agent': 'Mozilla/5.0 landing-validator'}}); return {status: r.status, location: r.headers.get('location'), xrobots: r.headers.get('x-robots-tag'), text: await r.text()}; }
    catch { await new Promise(r => setTimeout(r, 2000)); }
  }
  return {status: 0, text: ''};
};
const pages = [];
for (const r of routes) {
  const g = await get(r.url), h = g.text;
  const attr = re => (h.match(re) || [])[1] || '';
  const alts = [...h.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]);
  let ldOk = false; try { JSON.parse(attr(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)); ldOk = true; } catch {}
  pages.push({rel: r.rel, url: r.url, expectLang: r.lang, expectIndexable: !!r.indexable, status: g.status, redirect: g.location || null, xrobots: g.xrobots || null,
    canonical: attr(/rel="canonical" href="([^"]+)"/), robots: attr(/name="robots" content="([^"]+)"/), lang: attr(/<html lang="([^"]+)"/), dir: attr(/<html lang="[^"]+" dir="([^"]+)"/),
    title: attr(/<title>([^<]*)<\/title>/), description: attr(/name="description" content="([^"]*)"/), h1: (h.match(/<h1[ >]/g) || []).length, alts, ldOk});
}
const byUrl = new Map(pages.map(p => [p.url, p]));
const issues = [];
for (const p of pages) {
  if (p.status !== 200) issues.push(`${p.url}: HTTP ${p.status}`);
  if (p.redirect) issues.push(`${p.url}: redirects to ${p.redirect}`);
  if (p.canonical !== p.url) issues.push(`${p.url}: canonical is ${p.canonical}`);
  if (p.lang !== p.expectLang) issues.push(`${p.url}: html lang ${p.lang}, expected ${p.expectLang}`);
  if (p.expectIndexable && !/^index/.test(p.robots)) issues.push(`${p.url}: robots "${p.robots}" but indexable expected`);
  if (!p.expectIndexable && !/noindex/.test(p.robots)) issues.push(`${p.url}: robots "${p.robots}" but noindex expected`);
  if (p.xrobots && /noindex/i.test(p.xrobots) && p.expectIndexable) issues.push(`${p.url}: X-Robots-Tag ${p.xrobots}`);
  if (p.h1 !== 1) issues.push(`${p.url}: ${p.h1} H1 elements`);
  if (!p.ldOk) issues.push(`${p.url}: JSON-LD does not parse`);
  // hreflang reciprocity: every landing page referenced must reference back, with its own language
  const own = p.alts.filter(([l]) => l !== 'x-default').find(([, u]) => u === p.url);
  if (p.alts.length && !own) issues.push(`${p.url}: no self-referencing hreflang`);
  if (p.alts.length && own && own[0] !== p.lang) issues.push(`${p.url}: self hreflang "${own[0]}" differs from html lang "${p.lang}"`);
  for (const [l, u] of p.alts) {
    if (l === 'x-default') continue;
    const q = byUrl.get(u);
    if (!q) { issues.push(`${p.url}: hreflang ${l} points to ${u}, not a known landing page`); continue; }
    if (!q.expectIndexable) issues.push(`${p.url}: hreflang ${l} points to a noindex page ${u}`);
    if (!q.alts.some(([ql, qu]) => qu === p.url)) issues.push(`${p.url} -> ${u}: not reciprocal`);
    if (q.lang !== l) issues.push(`${p.url}: hreflang code ${l} for ${u} but that page is ${q.lang}`);
  }
  const xd = p.alts.filter(([l]) => l === 'x-default');
  if (p.alts.length && xd.length !== 1) issues.push(`${p.url}: ${xd.length} x-default entries`);
}
const dupTitles = Object.entries(pages.reduce((m, p) => ((m[p.title] ||= []).push(p.url), m), {})).filter(([, v]) => v.length > 1);
const dupDesc = Object.entries(pages.reduce((m, p) => ((m[p.description] ||= []).push(p.url), m), {})).filter(([, v]) => v.length > 1);
for (const [t, v] of dupTitles) issues.push(`duplicate title "${t}": ${v.join(', ')}`);
for (const [t, v] of dupDesc) issues.push(`duplicate description: ${v.join(', ')}`);

// sitemaps
const idx = await get(ORIGIN + '/sitemap.xml'), lm = await get(ORIGIN + '/sitemap-landing.xml');
const sIssues = [];
if (idx.status !== 200) sIssues.push('sitemap.xml HTTP ' + idx.status);
const listed = (idx.text.match(/<loc>https:\/\/sastamilaga\.com\/sitemap-landing\.xml<\/loc>/g) || []).length;
if (listed !== 1) sIssues.push(`sitemap.xml lists sitemap-landing.xml ${listed} times`);
if (lm.status !== 200) sIssues.push('sitemap-landing.xml HTTP ' + lm.status);
const entries = [...lm.text.matchAll(/<url><loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)].map(m => ({loc: m[1], alts: [...m[2].matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(x => [x[1], x[2]])}));
const expected = pages.filter(p => p.expectIndexable).map(p => p.url).sort();
const actual = entries.map(e => e.loc).sort();
for (const u of expected) if (!actual.includes(u)) sIssues.push('missing from sitemap-landing.xml: ' + u);
for (const u of actual) if (!expected.includes(u)) sIssues.push('in sitemap-landing.xml but not indexable: ' + u);
if (new Set(actual).size !== actual.length) sIssues.push('duplicate <loc> entries');
for (const e of entries) {
  const p = byUrl.get(e.loc); if (!p) continue;
  const head = JSON.stringify(p.alts.map(([l, u]) => l + '|' + u).sort()), sm = JSON.stringify(e.alts.map(([l, u]) => l + '|' + u).sort());
  if (e.alts.length && head !== sm) sIssues.push(`${e.loc}: sitemap hreflang set differs from the page head`);
}
const rows = [];
for (const u of actual) { const g = await get(u); rows.push([u, g.status]); if (g.status !== 200) sIssues.push(`${u}: HTTP ${g.status}`); }
const stamp = new Date().toISOString();
fs.writeFileSync(path.join(root, 'data/landing/live-validation.json'), JSON.stringify({validatedAt: stamp, pages: pages.map(({alts, ...p}) => ({...p, hreflangCount: alts.length})), hreflangIssues: issues, sitemapIssues: sIssues}, null, 1) + '\n');
const md1 = [`# Hreflang and head validation (live)`, '', `Validated ${stamp} against ${ORIGIN} with \`tools/validate-landing-live.mjs\` (read-only GETs). This checks what the pages say; it does **not** show that Google has crawled or indexed them.`, '',
  `Pages checked: **${pages.length}**. Issues found: **${issues.length}**.`, '', '| URL | HTTP | html lang | dir | robots | canonical ok | hreflang entries | H1 | JSON-LD |', '|---|---|---|---|---|---|---|---|---|',
  ...pages.map(p => `| ${p.url.replace(ORIGIN, '')} | ${p.status} | ${p.lang} | ${p.dir} | ${p.robots} | ${p.canonical === p.url ? 'yes' : 'NO'} | ${p.alts.length} | ${p.h1} | ${p.ldOk ? 'ok' : 'FAIL'} |`), '',
  '## Reciprocity rules checked', '- every hreflang target is a known landing page and is indexable', '- the target lists the source back (reciprocal) and its own language code equals the hreflang value', '- each page has a self-referencing hreflang equal to its `html lang`', '- exactly one `x-default` per page that has hreflang', '- no duplicate titles or descriptions across the 12 pages', '',
  '## Issues', '', ...(issues.length ? issues.map(i => '- ' + i) : ['None.'])].join('\n') + '\n';
const md2 = [`# Sitemap validation (live)`, '', `Validated ${stamp}. Read-only GETs.`, '', `- \`sitemap.xml\` HTTP ${idx.status}; lists \`sitemap-landing.xml\` ${listed} time(s).`, `- \`sitemap-landing.xml\` HTTP ${lm.status}; ${entries.length} <url> entries; ${entries.reduce((a, e) => a + e.alts.length, 0)} xhtml hreflang links.`,
  `- Expected indexable landing URLs: ${expected.length}; present: ${expected.filter(u => actual.includes(u)).length}.`, '', '| URL in sitemap-landing.xml | HTTP |', '|---|---|', ...rows.map(([u, s]) => `| ${u.replace(ORIGIN, '')} | ${s} |`), '',
  '## Issues', '', ...(sIssues.length ? sIssues.map(i => '- ' + i) : ['None.']), '',
  '## Not covered here', '- Country, language, product and category sitemaps: they do not exist yet for the landing system (only `sitemap-landing.xml`). Product and category sitemaps belong to the existing site (`sitemap-products-*.xml`, `sitemap-pages.xml`) and were not re-validated URL by URL.', '- Search Console submission, "submitted vs indexed" counts and crawl stats: no access.'].join('\n') + '\n';
fs.writeFileSync(path.join(root, 'reports/hreflang-validation.md'), md1);
fs.writeFileSync(path.join(root, 'reports/sitemap-validation.md'), md2);
console.log(JSON.stringify({pages: pages.length, hreflangIssues: issues.length, sitemapIssues: sIssues.length}));
if (issues.length || sIssues.length) { console.log([...issues, ...sIssues].join('\n')); }
