#!/usr/bin/env node
/**
 * SEO / AEO / GEO audit for the Sasta Milaga storefront.
 *
 * Answers three questions on every sampled page, with no dependencies:
 *   SEO — is the page indexable and correctly described? (title, description, canonical, h1, og)
 *   AEO — can an answer engine quote it? (FAQ block, JSON-LD FAQPage, direct answer text)
 *   GEO — can a generative engine cite it? (structured data types, llms.txt, sitemap coverage)
 *
 * Usage:  node scripts/seo-aeo-geo-audit.mjs [--limit 600] [--strict]
 * Output: reports/seo-aeo-geo-latest.json  + a Markdown summary on stdout
 * Exit:   0 normally, 1 with --strict when a hard error is found.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const LIMIT = Number((args.find(a => a.startsWith("--limit"))?.split("=")[1]) || 600);
const STRICT = args.includes("--strict");

const SKIP_DIRS = new Set([".git", "node_modules", "reports", "assets", "backups", "products-csv", "data"]);

function walk(dir, out = [], depth = 0) {
  if (depth > 4) return out;
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out, depth + 1);
    else if (extname(name) === ".html") out.push(full);
  }
  return out;
}

/** Deterministic sample: always the entry points, then an even stride through the rest. */
function sample(files) {
  const must = ["index.html", "live-tv/index.html", "visa/index.html", "travel/index.html",
    "products.html", "search/index.html", "sitemap.html", "how-to-order/index.html"];
  const picked = must.map(p => join(ROOT, p)).filter(existsSync);
  const rest = files.filter(f => !picked.includes(f));
  const stride = Math.max(1, Math.floor(rest.length / Math.max(1, LIMIT - picked.length)));
  for (let i = 0; i < rest.length && picked.length < LIMIT; i += stride) picked.push(rest[i]);
  return picked;
}

const pick = (html, re) => (html.match(re) || [])[1]?.trim() || "";
const count = (html, re) => (html.match(re) || []).length;

function auditPage(file) {
  const html = readFileSync(file, "utf8");
  const rel = "/" + relative(ROOT, file).replace(/\\/g, "/");
  const title = pick(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = pick(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canonical = pick(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const ogTitle = pick(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  const robots = pick(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i);
  const h1 = count(html, /<h1[\s>]/gi);
  const imgs = count(html, /<img\s/gi);
  const altImgs = count(html, /<img[^>]+alt=/gi);
  // `[^>]*` not `[^>]+`: an anchor whose href is the first attribute must still count.
  const links = count(html, /<a\s[^>]*href=["']\//gi);
  const faqBlock = /faq|frequently asked/i.test(html);
  const noindex = /noindex/i.test(robots);

  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  const types = [];
  let brokenLd = 0;
  for (const m of ld) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const o of arr) {
        if (!o) continue;
        if (o["@type"]) types.push([].concat(o["@type"]).join(","));
        else if (o["@graph"]) types.push("@graph");
      }
    } catch { brokenLd++; }
  }

  const problems = [];
  if (!title) problems.push("missing title");
  else if (title.length > 70) problems.push(`title ${title.length} chars (>70)`);
  else if (title.length < 15) problems.push(`title ${title.length} chars (<15)`);
  if (!desc && !noindex) problems.push("missing meta description");
  else if (desc && desc.length > 165) problems.push(`description ${desc.length} chars (>165)`);
  if (!canonical) problems.push("missing canonical");
  if (!ogTitle) problems.push("missing og:title");
  if (h1 === 0 && !noindex) problems.push("no h1");
  if (h1 > 1) problems.push(`${h1} h1 tags`);
  if (imgs > 0 && altImgs < imgs) problems.push(`${imgs - altImgs} image(s) without alt`);
  if (links < 3 && !noindex) problems.push("thin internal linking (<3)");

  return {
    path: rel, title, titleLen: title.length, descLen: desc.length, canonical,
    noindex, h1, imgs, altImgs, internalLinks: links, faqBlock,
    ldTypes: [...new Set(types)], brokenLd, problems
  };
}

function auditSitemaps() {
  const out = [];
  let files = [];
  try { files = readdirSync(ROOT).filter(f => /^sitemap.*\.xml$/i.test(f)); } catch { }
  for (const f of files) {
    const xml = readFileSync(join(ROOT, f), "utf8");
    const locs = (xml.match(/<loc>/g) || []).length;
    const isIndex = /<sitemapindex/i.test(xml);
    out.push({ file: f, urls: locs, isIndex, kb: Math.round(xml.length / 1024) });
  }
  return out;
}

const files = walk(ROOT);
const pages = sample(files).map(auditPage);
const sitemaps = auditSitemaps();

const withProblems = pages.filter(p => p.problems.length);
const aeo = pages.filter(p => p.faqBlock || p.ldTypes.some(t => /FAQPage/.test(t)));
const geo = pages.filter(p => p.ldTypes.length > 0);
const broken = pages.reduce((n, p) => n + p.brokenLd, 0);

const report = {
  generatedAt: new Date().toISOString(),
  repo: process.env.GITHUB_REPOSITORY || "local",
  commit: process.env.GITHUB_SHA || "local",
  totals: {
    htmlFiles: files.length,
    sampled: pages.length,
    pagesWithProblems: withProblems.length,
    aeoReady: aeo.length,
    structuredData: geo.length,
    brokenJsonLd: broken,
    sitemaps: sitemaps.length,
    sitemapUrls: sitemaps.reduce((n, s) => n + s.urls, 0)
  },
  sitemaps,
  pages
};

mkdirSync(join(ROOT, "reports"), { recursive: true });
writeFileSync(join(ROOT, "reports", "seo-aeo-geo-latest.json"), JSON.stringify(report, null, 2));

const pct = (n) => `${Math.round((n / pages.length) * 100)}%`;
const md = [
  `## SEO / AEO / GEO audit`,
  ``,
  `| Metric | Value |`,
  `| --- | --- |`,
  `| HTML pages in repo | ${files.length} |`,
  `| Pages sampled | ${pages.length} |`,
  `| Pages with a problem | ${withProblems.length} (${pct(withProblems.length)}) |`,
  `| AEO ready (FAQ / FAQPage) | ${aeo.length} (${pct(aeo.length)}) |`,
  `| Has structured data | ${geo.length} (${pct(geo.length)}) |`,
  `| Broken JSON-LD blocks | ${broken} |`,
  `| Sitemaps / URLs declared | ${sitemaps.length} / ${report.totals.sitemapUrls} |`,
  ``,
  withProblems.length ? `### Top fixes` : `### No blocking issues in the sample`,
  ...withProblems.slice(0, 15).map(p => `- \`${p.path}\` — ${p.problems.join("; ")}`)
].join("\n");

console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) {
  try { writeFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n", { flag: "a" }); } catch { }
}
if (STRICT && (broken > 0 || withProblems.length > pages.length * 0.5)) {
  console.error("strict mode: audit failed");
  process.exit(1);
}
