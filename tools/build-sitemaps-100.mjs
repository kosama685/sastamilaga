#!/usr/bin/env node
/**
 * Build the public sitemap set with 100 URLs per child file.
 *
 * The previous feeds listed /product/<slug>/ and /category/.../page/N/ URLs
 * that return HTTP 404 (the live pages are /p/<slug>.html and /c/<slug>.html),
 * while the ~20k real product and category pages were absent from every
 * sitemap. This tool builds the URL list from the files that are deployed.
 *
 * Eligibility is decided from the page itself: no noindex robots meta, and a
 * self-referencing canonical. Legacy root-level *.html landing pages canonicalise
 * to /c/global/<slug>.html or the homepage, so they are never listed.
 *
 * Private and tooling paths (cart, checkout, account, search, staging, backup,
 * tools, reports, docs, workers, data, partials) are excluded.
 *
 * A stratified HTTP sample is re-checked on every run (400 URLs by default, 5
 * requests/second); --verify-all checks every URL before writing anything.
 *
 * Usage:
 *   node tools/build-sitemaps-100.mjs                 # build + sample check
 *   node tools/build-sitemaps-100.mjs --check         # fail if output is stale
 *   node tools/build-sitemaps-100.mjs --verify-all    # check every URL first
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://sastamilaga.com';
const SITEMAP_URLS_PER_FILE = 100;
const OUT_DIR = path.join(ROOT, 'sitemaps');

/* Feeds produced by other pipelines. They stay in the index; the static
   shards below replace the retired product, category and pages feeds. */
const KEPT_FEEDS = [
  'sitemap-blog.xml',
  'sitemap-cj-global-categories.xml',
  'sitemap-landing.xml',
  'sitemap-campaigns.xml',
  'sitemap-visa.xml',
  'sitemap-livetv.xml',
  'travel/sitemap.xml'
];

const EXCLUDE_PREFIX = [
  'assets/', 'backup/', 'data/', 'docs/', 'reports/', 'staging/', 'tools/',
  'workers/', 'integrations/', 'partials/', '.github/', 'sitemaps/',
  'search/', 'cart/', 'checkout/', 'account/', 'my-account/', 'thank-you/',
  'wishlist/'
];
const EXCLUDE_TOP = new Set([
  '404.html', 'sitemap.xml', 'sitemap_index.xml', 'llms.txt', 'robots.txt',
  'CNAME', '_headers', '_redirects', '.htaccess', '.nojekyll'
]);

/* Every page's own HTML decides eligibility. Blobs are read straight from git
   so the check works in a sparse checkout as well as in CI. */

const arg = (name) => process.argv.includes(name);
const verifyAll = arg('--verify-all');
const checkMode = arg('--check');
// CI regenerates the feeds after its page generators have run, so it skips the
// network sample and relies on the in-page eligibility check.
const skipVerify = arg('--no-verify');

function walkFiles(dir = ROOT, rel = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      if (EXCLUDE_PREFIX.some((p) => `${r}/` === p)) continue;
      walkFiles(path.join(dir, e.name), r, out);
    } else if (e.name.endsWith('.html')) {
      out.push(r);
    }
  }
  return out;
}

/* Everything git knows about plus any page a generator created in this run. */
function treeFiles() {
  const out = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  const seen = new Set(out.split('\n').filter(Boolean));
  for (const f of walkFiles()) seen.add(f);
  return [...seen];
}

function toUrl(file) {
  const parts = file.split('/');
  if (EXCLUDE_TOP.has(file)) return null;
  if (EXCLUDE_PREFIX.some((p) => file.startsWith(p))) return null;
  if (parts[parts.length - 1] === 'index.html') {
    const dir = parts.slice(0, -1).join('/');
    return dir ? `${SITE}/${dir}/` : `${SITE}/`;
  }
  // Legacy root-level landing pages canonicalise elsewhere; never list them.
  if (parts.length === 1) return null;
  if (!file.endsWith('.html')) return null;
  return `${SITE}/${file}`;
}

function readHtml(file) {
  const abs = path.join(ROOT, file);
  if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
  try {
    return execFileSync('git', ['show', `HEAD:${file}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch {
    return null;
  }
}

function eligible(html, url) {
  if (html == null) return false;
  const robots = (html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i) || [])[1] || '';
  const canon = (html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) || [])[1] || '';
  if (/noindex/i.test(robots)) return false;
  return canon.replace(/\/$/, '') === url.replace(/\/$/, '');
}

const files = treeFiles();
const candidates = [];
for (const f of files) {
  const u = toUrl(f);
  if (u) candidates.push({ file: f, url: u });
}
const urls = new Set();
const dropped = { noindexOrCanonical: 0 };
for (const c of candidates) {
  if (!eligible(readHtml(c.file), c.url)) { dropped.noindexOrCanonical++; continue; }
  urls.add(c.url);
}

const sorted = [...urls].sort();

/* ---------- verification ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function inspect(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'sastamilaga-sitemap-verifier/1.0' } });
  const html = r.status === 200 ? await r.text() : '';
  const robots = (html.match(/<meta\s+name="robots"\s+content="([^"]*)"/i) || [])[1] || '';
  const canon = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/i) || [])[1] || '';
  return {
    status: r.status,
    noindex: /noindex/i.test(robots),
    selfCanonical: canon.replace(/\/$/, '') === r.url.replace(/\/$/, '')
  };
}

async function verify(list, label) {
  const failures = [];
  for (let i = 0; i < list.length; i += 5) {
    const batch = list.slice(i, i + 5);
    const results = await Promise.all(batch.map(async (u) => {
      try { return { url: u, ...(await inspect(u)) }; }
      catch (e) { return { url: u, status: 0, error: String(e.message || e) }; }
    }));
    for (const r of results) {
      if (r.status !== 200 || r.noindex || !r.selfCanonical) failures.push(r);
    }
    await sleep(1000);
    if (failures.length) break;
  }
  console.log(JSON.stringify({ verify: label, checked: list.length, failures: failures.slice(0, 5), failure_count: failures.length }));
  if (failures.length) {
    throw new Error(`${label}: ${failures.length} URL(s) are not eligible (first: ${failures[0].url})`);
  }
}

function sample(list, n) {
  if (list.length <= n) return list;
  const step = list.length / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.floor(i * step)]);
  return out;
}

/* ---------- output ---------- */
const totalShards = Math.ceil(sorted.length / SITEMAP_URLS_PER_FILE);
const shards = Array.from({ length: totalShards }, (_, i) => `sitemap-static-${String(i + 1).padStart(5, '0')}.xml`);

const plan = shards.map((name, i) => {
  const chunk = sorted.slice(i * SITEMAP_URLS_PER_FILE, (i + 1) * SITEMAP_URLS_PER_FILE);
  return {
    file: path.join(OUT_DIR, name),
    body: '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      chunk.map((u) => `<url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n') +
      '\n</urlset>\n'
  };
});

const indexBody = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [...KEPT_FEEDS.map((f) => `${SITE}/${f}`), ...shards.map((s) => `${SITE}/sitemaps/${s}`)]
    .map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join('\n') +
  '\n</sitemapindex>\n';

// A CRLF checkout must compare equal to the LF we write.
const lf = (s) => s.replace(/\r\n/g, '\n');

if (checkMode) {
  let stale = 0;
  for (const p of plan) {
    const current = fs.existsSync(p.file) ? lf(fs.readFileSync(p.file, 'utf8')) : '';
    if (current !== lf(p.body)) stale++;
  }
  for (const f of ['sitemap_index.xml', 'sitemap.xml']) {
    const cur = fs.existsSync(path.join(ROOT, f)) ? lf(fs.readFileSync(path.join(ROOT, f), 'utf8')) : '';
    if (cur !== lf(indexBody)) stale++;
  }
  const extra = fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).filter((f) => /^sitemap-static-\d{5}\.xml$/.test(f) && !shards.includes(f))
    : [];
  if (stale || extra.length) throw new Error(`Sitemap output is stale: ${stale} file(s), ${extra.length} orphan shard(s)`);
  console.log(JSON.stringify({ check: 'passed', urls: sorted.length, shards: shards.length }));
  process.exit(0);
}

if (!skipVerify) {
  const sampleList = sample(sorted, 400);
  await verify(sampleList, `stratified sample (${sampleList.length} of ${sorted.length})`);
  if (verifyAll) await verify(sorted, 'all URLs');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const f of fs.readdirSync(OUT_DIR)) {
  if (/^sitemap-static-\d{5}\.xml$/.test(f) && !shards.includes(f)) fs.unlinkSync(path.join(OUT_DIR, f));
}
for (const p of plan) fs.writeFileSync(p.file, p.body);
fs.writeFileSync(path.join(ROOT, 'sitemap_index.xml'), indexBody);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), indexBody);

console.log(JSON.stringify({
  urls: sorted.length,
  shards: shards.length,
  per_file: SITEMAP_URLS_PER_FILE,
  dropped: dropped.noindexOrCanonical,
  index: 'sitemap_index.xml (+ sitemap.xml)',
  kept_feeds: KEPT_FEEDS
}, null, 2));
