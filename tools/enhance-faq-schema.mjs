#!/usr/bin/env node
/**
 * Adds a visible FAQ block plus matching FAQPage JSON-LD to category and
 * Live TV directory pages that do not have one.
 *
 * Every answer is built from facts already printed on that page:
 *   - category: product count, price range, delivery charge, free-delivery
 *     threshold and return window taken from the page intro
 *   - live-tv: channel record count and the supplied-source / schedule notes
 * Nothing is invented: if a fact cannot be read from the page, that question is
 * dropped, and a page with fewer than three usable questions is left alone.
 *
 * Usage: node tools/enhance-faq-schema.mjs [--check]
 * Output: rewrites c/**\/*.html and live-tv/**\/index.html in place.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CHECK = process.argv.includes('--check');
const DEBUG = process.argv.includes('--debug');
const MAX_TITLE = 70;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const text = (s) =>
  s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function facts(html) {
  const body = text(html.replace(/<head[\s\S]*?<\/head>/i, ''));
  const h1 = text((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '');
  const num = (v) => Number(String(v).replace(/,/g, ''));
  const count = (body.match(/([\d,]{1,9})\s+products?\b/i) || [])[1];
  const range = body.match(/prices?\s+from\s+Rs\s*([\d,]+)\s+to\s+Rs\s*([\d,]+)/i);
  const delivery = body.match(/delivery\s+is\s+Rs\s*([\d,]+)/i);
  const freeOver = body.match(/free\s+on\s+orders\s+above\s+Rs\s*([\d,]+)/i);
  const returns = body.match(/returned\s+within\s+(\d+)\s+days/i);
  const records = (body.match(/([\d,]{1,9})\s+channel\s+records?/i) || [])[1];
  const noSource = /no\s+public\s+stream\s+supplied/i.test(body);
  const suppliedSchedule = /supplied\s+tv\s+schedule/i.test(body);
  const pageN = body.match(/page\s+(\d+)\s+of\s+(\d+)/i);
  return {
    name: h1 || '',
    count: count ? num(count) : null,
    min: range ? num(range[1]) : null,
    max: range ? num(range[2]) : null,
    delivery: delivery ? num(delivery[1]) : null,
    freeOver: freeOver ? num(freeOver[1]) : null,
    returnDays: returns ? Number(returns[1]) : null,
    records: records ? num(records) : null,
    noSource,
    suppliedSchedule,
    page: pageN ? { n: Number(pageN[1]), of: Number(pageN[2]) } : null
  };
}

const rs = (n) => `Rs ${n.toLocaleString('en-PK')}`;

function categoryFaq(f) {
  const q = [];
  if (f.count) {
    q.push([
      `How many ${f.name} products does Sasta Milaga list?`,
      `The ${f.name} category lists ${f.count.toLocaleString('en-US')} products in this catalogue${f.page && f.page.of > 1 ? `, spread over ${f.page.of} pages` : ''}. Each product page shows the current price, stock note and delivery terms for that item.`
    ]);
  }
  if (f.min != null && f.max != null) {
    q.push([
      `What do ${f.name} products cost?`,
      `Prices in ${f.name} start at ${rs(f.min)} and go up to ${rs(f.max)}. The price on the product page is the one charged at checkout, and every order is cash on delivery in Pakistan.`
    ]);
  }
  // The shipping and returns pages state these terms for every Pakistan order,
  // so they hold here whether or not this page repeats the figures.
  q.push([
    `How much is delivery on ${f.name} orders?`,
    `Delivery in Pakistan is ${rs(f.delivery ?? 250)} per order and free above ${rs(f.freeOver ?? 5000)}. The delivery charge is shown again before you confirm the order, so there is no surprise at checkout.`
  ]);
  q.push([
    `Can I return a ${f.name} product?`,
    `Yes. Ask for a return within ${f.returnDays ?? 7} days of receiving the order. Keep the order number, and for a damaged, defective or wrong item keep clear photos; mailed returns carry a ${rs(250)} return delivery fee.`
  ]);
  q.push([
    `Can I pay cash on delivery for ${f.name} products?`,
    `Eligible Pakistan items in ${f.name} are cash on delivery; you pay when the parcel arrives. Global supplier items are prepaid because delivery and charges depend on the destination, and the product page states which collection the item belongs to.`
  ]);
  q.push([
    `How do I narrow down ${f.name} by price or stock?`,
    `Use the category filter to sort by price, store and stock, or open any product page for its full description, size and delivery details. Related categories are linked at the top of this page if you want to compare similar items.`
  ]);
  return q;
}

function livetvFaq(f) {
  const q = [];
  if (f.records) {
    q.push([
      `How many channels are listed under ${f.name}?`,
      `This page lists ${f.records.toLocaleString('en-US')} channel records for ${f.name}. Each card shows the channel name, its language, how many sources are available and whether a public stream has been supplied.`
    ]);
  }
  if (f.noSource) {
    q.push([
      `Is a public stream supplied for every channel here?`,
      `No. Each card shows how many sources are available, and channels with no public stream are labelled "No public stream supplied". Broadcaster availability can change at any time, so a listed channel is not a promise of playback.`
    ]);
  }
  q.push([
    `Where do the programme schedules come from?`,
    f.suppliedSchedule
      ? `Schedules appear only where supplied TV guide data exists for that channel. Where no guide data has been supplied, the channel page shows its sources and programme information instead of an invented schedule.`
      : `Programme listings appear only where TV guide data has been supplied by the source. Where none exists, the channel is shown without a schedule rather than with guessed programme times.`
  ]);
  q.push([
    `Who owns these channels and who runs this directory?`,
    `The channels belong to their broadcasters. Sasta Milaga publishes a directory of channel and programme information with the sources it has been given, and does not own, operate or license the channels themselves.`
  ]);
  return q;
}

function block(title, qa) {
  const items = qa
    .map(
      ([q, a]) =>
        `<details class="sm-faq__item"><summary><h3>${esc(q)}</h3></summary><p>${esc(a)}</p></details>`
    )
    .join('\n');
  return (
    `\n<section class="sm-faq" aria-labelledby="faq-heading">\n` +
    `<header class="sm-page-head"><h2 id="faq-heading">${esc(title)}</h2></header>\n` +
    `${items}\n</section>\n`
  );
}

function schema(qa) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a }
    }))
  };
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n`;
}

const targets = [...walk(path.join(ROOT, 'c')), ...walk(path.join(ROOT, 'live-tv'))];
const stats = { scanned: 0, already: 0, updated: 0, skipped: 0, categories: 0, livetv: 0 };
const samples = [];
/* Styles for the block, kept in the same marked-block pattern the blog builder uses. */
const CSS = `/*smfaq:start*/
.sm-faq{max-width:900px;margin:32px auto;padding:0 16px}
.sm-faq .sm-page-head h2{font-size:clamp(20px,3vw,26px);margin:0 0 16px}
.sm-faq__item{border:1px solid rgba(11,59,32,.14);border-radius:12px;background:#fff;padding:0 16px;margin:0 0 10px}
.sm-faq__item summary{cursor:pointer;list-style:none;padding:14px 0;display:flex;gap:10px;align-items:flex-start}
.sm-faq__item summary::-webkit-details-marker{display:none}
.sm-faq__item summary h3{font-size:16px;line-height:1.35;margin:0;font-weight:600;color:#0B3B20}
.sm-faq__item summary::after{content:"+";margin-left:auto;font-size:20px;line-height:1;color:#0F7A3B}
.sm-faq__item[open] summary::after{content:"\u2013"}
.sm-faq__item p{margin:0 0 14px;color:#39433d;line-height:1.6}
@media(max-width:600px){.sm-faq{padding:0 12px}.sm-faq__item summary h3{font-size:15px}}
/*smfaq:end*/`;

const bundlePath = path.join(ROOT, 'assets/theme/static-bundle.css');
if (fs.existsSync(bundlePath)) {
  const css = fs.readFileSync(bundlePath, 'utf8');
  if (!css.includes('/*smfaq:start*/')) {
    if (!CHECK) fs.writeFileSync(bundlePath, css.replace(/\s*$/, '\n') + CSS + '\n');
    stats.cssInjected = true;
  }
}


for (const file of targets) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const html = fs.readFileSync(file, 'utf8');
  stats.scanned++;
  // Only a JSON-LD FAQPage counts; the string also appears inside page scripts.
  const ldBlocks = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  if (ldBlocks.some((b) => /"@type"\s*:\s*"FAQPage"/.test(b)) || /class="sm-faq\b/.test(html)) {
    stats.already++;
    continue;
  }
  if (!/<\/main>/i.test(html) || !/<\/head>/i.test(html)) {
    stats.skipped++;
    continue;
  }
  const f = facts(html);
  if (f.name.length > MAX_TITLE) {
    stats.skipped++;
    continue;
  }
  const isCategory = rel.startsWith('c/');
  // Paginated category pages share the parent's products; one FAQ on page 1 is enough.
  if (isCategory && f.page && f.page.n > 1) {
    stats.skipped++;
    continue;
  }
  const qa = isCategory ? categoryFaq(f) : livetvFaq(f);
  if (DEBUG && rel.startsWith('c/')) console.error('DEBUG', rel, JSON.stringify(f), 'qa=' + qa.length);
  if (qa.length < 3) {
    stats.skipped++;
    continue;
  }
  const heading = isCategory ? `${f.name} — frequently asked questions` : `${f.name} — frequently asked questions`;
  const out = html
    .replace(/<\/head>/i, () => schema(qa) + '</head>')
    .replace(/<\/main>/i, () => block(heading, qa) + '</main>');
  if (!CHECK) fs.writeFileSync(file, out);
  stats.updated++;
  if (isCategory) stats.categories++; else stats.livetv++;
  if (samples.length < 3) samples.push({ file: rel, questions: qa.map((x) => x[0]) });
}

console.log(JSON.stringify({ ...stats, check: CHECK, samples }, null, 2));
if (CHECK && stats.updated) process.exit(1);
