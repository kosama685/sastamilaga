// Read-only content audit of every generated product, category and channel page.
// Reports what each page actually contains: real image vs placeholder, FAQ,
// schema types, title/meta length, internal links, word count, encoding damage.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'artifacts/audit');
const SITE = 'https://sastamilaga.com';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const strip = (s) => s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const groups = {
  product: walk(path.join(ROOT, 'p')),
  category: walk(path.join(ROOT, 'c')),
  channel: walk(path.join(ROOT, 'live-tv'))
};

const rows = [];
for (const [kind, files] of Object.entries(groups)) {
  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const rel = path.relative(ROOT, file).split(path.sep).join('/');
    const url = rel.endsWith('index.html') ? `${SITE}/${rel.replace(/index\.html$/, '')}` : `${SITE}/${rel}`;
    const pick = (re) => (html.match(re) || [])[1] || '';
    const jsonld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
    const types = new Set();
    for (const block of jsonld) for (const m of block.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)) types.add(m[1]);
    const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
    const productImgs = imgs.filter((t) => !/logo-|brand\/logo|no-image\.svg/i.test(t));
    const noImage = imgs.filter((t) => /no-image\.svg/i.test(t)).length;
    const missingAlt = imgs.filter((t) => !/\balt="[^"]+"/i.test(t)).length;
    const remoteImgs = imgs.filter((t) => /src="https?:\/\//i.test(t)).length;
    const body = strip(html.replace(/<head[\s\S]*?<\/head>/i, ''));
    const faqSection = /class="[^"]*sm-faq/i.test(html);
    const faqQuestions = (html.match(/<h3[^>]*>/g) || []).length;
    const internalLinks = new Set([...html.matchAll(/href="(\.\.?\/[^"#][^"]*|\/[^"#][^"]*)"/g)].map((m) => m[1]));
    rows.push({
      kind, path: rel, url,
      bytes: html.length,
      title: pick(/<title>([^<]*)<\/title>/i),
      description: pick(/<meta\s+name="description"\s+content="([^"]*)"/i),
      robots: pick(/<meta\s+name="robots"\s+content="([^"]*)"/i),
      canonical: pick(/<link\s+rel="canonical"\s+href="([^"]*)"/i),
      h1: (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] ? strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]) : '',
      jsonld: jsonld.length,
      types: [...types].sort().join('|'),
      faqPage: types.has('FAQPage'),
      faqSection,
      faqQuestions,
      imgs: imgs.length,
      realImgs: productImgs.length,
      noImage,
      missingAlt,
      remoteImgs,
      links: internalLinks.size,
      words: body.split(/\s+/).filter(Boolean).length,
      money: /Rs\s?[\d,]+/.test(html),
      encodingDamage: (html.match(/\uFFFD/g) || []).length
    });
  }
}

const summarize = (list) => {
  const n = list.length || 1;
  const pct = (x) => Math.round((x / n) * 1000) / 10;
  const count = (fn) => list.filter(fn).length;
  return {
    pages: list.length,
    noindex: count((r) => /noindex/i.test(r.robots)),
    noRealImage: count((r) => r.realImgs === 0),
    placeholderOnly: count((r) => r.realImgs === 0 && r.noImage > 0),
    missingAlt: count((r) => r.missingAlt > 0),
    noFaqPage: count((r) => !r.faqPage),
    noFaqSection: count((r) => !r.faqSection),
    noSchema: count((r) => r.jsonld === 0),
    noH1: count((r) => !r.h1),
    shortTitle: count((r) => r.title.length < 20),
    longTitle: count((r) => r.title.length > 65),
    shortDescription: count((r) => r.description.length < 70),
    longDescription: count((r) => r.description.length > 165),
    thin: count((r) => r.words < 120),
    encodingDamage: count((r) => r.encodingDamage > 0),
    noPrice: count((r) => !r.money),
    fewLinks: count((r) => r.links < 4),
    pct: {
      noindex: pct(count((r) => /noindex/i.test(r.robots))),
      noRealImage: pct(count((r) => r.realImgs === 0)),
      noFaqPage: pct(count((r) => !r.faqPage)),
      thin: pct(count((r) => r.words < 120))
    },
    avgWords: Math.round(list.reduce((a, r) => a + r.words, 0) / n),
    typeHistogram: (() => {
      const m = new Map();
      for (const r of list) for (const t of (r.types || '').split('|').filter(Boolean)) m.set(t, (m.get(t) || 0) + 1);
      return Object.fromEntries([...m].sort((a, b) => b[1] - a[1]).slice(0, 12));
    })()
  };
};

const summary = {};
for (const k of Object.keys(groups)) summary[k] = summarize(rows.filter((r) => r.kind === k));
summary.generatedAt = new Date().toISOString();
summary.totalPages = rows.length;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'product-content.json'), JSON.stringify(summary, null, 2) + '\n');
const cols = ['kind', 'path', 'url', 'bytes', 'title', 'description', 'robots', 'h1', 'jsonld', 'types', 'faqPage', 'faqSection', 'imgs', 'realImgs', 'noImage', 'missingAlt', 'remoteImgs', 'links', 'words', 'money', 'encodingDamage'];
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync(path.join(OUT, 'product-content.csv'), [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') + '\n');
console.log(JSON.stringify(summary, null, 2));
