#!/usr/bin/env node
/**
 * Polite audit of the published sitemap set.
 *
 * Reads sitemap_index.xml from the live site, loads every child feed, then
 * checks a stratified sample of the listed URLs at 5 requests/second:
 * status, robots meta, canonical, <title>, meta description, H1 and schema.
 *
 * Usage: node tools/audit-live-sitemap.mjs [--sample 300] [--all]
 * Output: artifacts/audit/sitemap-audit.json, urls-sample.csv
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE = process.env.SITE_ORIGIN || 'https://sastamilaga.com';
const OUT = path.resolve('artifacts/audit');
const argv = process.argv.slice(2);
const SAMPLE = argv.includes('--all') ? 0 : Number(argv[argv.indexOf('--sample') + 1] || 300);

const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'sastamilaga-sitemap-audit/1.0' } });
  return { status: r.status, body: await r.text() };
}

const index = await get(`${SITE}/sitemap_index.xml`);
if (index.status !== 200) throw new Error(`sitemap_index.xml -> ${index.status}`);
const feeds = locs(index.body);
const feedStatus = [];
const urls = [];
for (const feed of feeds) {
  const res = await get(feed);
  const list = res.status === 200 ? locs(res.body) : [];
  feedStatus.push({ feed: feed.replace(SITE, ''), status: res.status, urls: list.length });
  urls.push(...list);
  await sleep(150);
}

const unique = [...new Set(urls)];
const target = SAMPLE ? Math.min(SAMPLE, unique.length) : unique.length;
const step = unique.length / target;
const sample = Array.from({ length: target }, (_, i) => unique[Math.floor(i * step)]);

const rows = [];
for (let i = 0; i < sample.length; i += 5) {
  const batch = sample.slice(i, i + 5);
  const results = await Promise.all(batch.map(async (url) => {
    try {
      const r = await get(url);
      const h = r.body;
      const pick = (re) => (h.match(re) || [])[1] || '';
      return {
        url,
        status: r.status,
        robots: pick(/<meta\s+name="robots"\s+content="([^"]*)"/i),
        canonical: pick(/<link\s+rel="canonical"\s+href="([^"]*)"/i),
        title: pick(/<title>([^<]*)<\/title>/i).trim(),
        description: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
        h1: (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]?.replace(/<[^>]+>/g, '').trim() || '',
        schema: (h.match(/application\/ld\+json/g) || []).length,
        bytes: h.length
      };
    } catch (e) {
      return { url, status: 0, error: String(e.message || e) };
    }
  }));
  rows.push(...results);
  await sleep(1000);
  process.stderr.write(`\rchecked ${rows.length}/${sample.length}`);
}

const bad = rows.filter((r) => r.status !== 200);
const noindex = rows.filter((r) => /noindex/i.test(r.robots || ''));
const canonMismatch = rows.filter((r) => r.canonical && r.canonical.replace(/\/$/, '') !== r.url.replace(/\/$/, ''));
const missingCanonical = rows.filter((r) => !r.canonical);
const missingTitle = rows.filter((r) => !r.title);
const missingDesc = rows.filter((r) => !r.description);
const missingH1 = rows.filter((r) => !r.h1);
const noSchema = rows.filter((r) => !r.schema);
const titles = new Map();
for (const r of rows) if (r.title) titles.set(r.title, (titles.get(r.title) || 0) + 1);
const dupTitles = [...titles].filter(([, n]) => n > 1);

const summary = {
  generatedAt: new Date().toISOString(),
  site: SITE,
  feeds: feedStatus,
  sitemapUrls: urls.length,
  uniqueUrls: unique.length,
  sampleChecked: rows.length,
  failures: { status: bad.length, noindex: noindex.length, canonicalMismatch: canonMismatch.length, missingCanonical: missingCanonical.length, missingTitle: missingTitle.length, missingDescription: missingDesc.length, missingH1: missingH1.length, noSchema: noSchema.length },
  duplicateTitlesInSample: dupTitles.length,
  examples: { status: bad.slice(0, 5), canonicalMismatch: canonMismatch.slice(0, 5) }
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'sitemap-audit.json'), JSON.stringify(summary, null, 2) + '\n');
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync(path.join(OUT, 'urls-sample.csv'),
  ['url,status,robots,canonical,title,description,h1,schema,bytes']
    .concat(rows.map((r) => [r.url, r.status, r.robots, r.canonical, r.title, r.description, r.h1, r.schema, r.bytes].map(esc).join(',')))
    .join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
