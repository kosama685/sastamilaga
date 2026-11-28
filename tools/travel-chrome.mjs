#!/usr/bin/env node
/**
 * Put the storefront header and footer on every travel page.
 *
 * Travel pages used their own top bar, header and footer, so /travel/ looked
 * like a different site from the shop. This rewrites the chrome of the
 * already-built pages in travel/ (the deployed source of truth) to mount the
 * shared payload from partials/chrome-runtime.json, and keeps a compact travel
 * sub-navigation plus a travel link directory so no internal link is lost.
 *
 * Idempotent: a page that already mounts the chrome is left untouched.
 * Deterministic: no dates, no random ordering.
 *
 * Usage: node tools/travel-chrome.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRAVEL = path.join(ROOT, 'travel');
const VERSION = '20261128-chrome4';

const NAV = [
  ['flights', 'Flights'], ['stays', 'Stays'], ['tours', 'Tours'], ['cars', 'Cars'],
  ['umrah', 'Umrah'], ['visa', 'Visa'], ['esim', 'eSIM'], ['group-tours', 'Group tours'],
  ['destinations', 'Destinations'], ['compare', 'Compare']
];
const SERVICES = NAV.slice(0, 8);
const DESTS = [
  ['dubai', 'Dubai'], ['abu-dhabi', 'Abu Dhabi'], ['jeddah', 'Jeddah'], ['makkah', 'Makkah'],
  ['madinah', 'Madinah'], ['riyadh', 'Riyadh'], ['istanbul', 'Istanbul'], ['antalya', 'Antalya']
];
const COMPANY = [
  ['about', 'About'], ['how-it-works', 'How it works'], ['contact', 'Contact'],
  ['privacy', 'Privacy policy'], ['terms', 'Terms of service'], ['refund-policy', 'Refund policy']
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function headerBlock(active) {
  const links = NAV.map(([slug, label]) => {
    const on = slug === active ? ' aria-current="page"' : '';
    return `<a href="/travel/${slug}/"${on}>${esc(label)}</a>`;
  }).join('');
  return `<div id="sm-chrome-header" data-prefix="/"><header class="sm-fallback-head"><a href="/"><img src="/assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<div class="tvbar"><nav class="wrap" aria-label="Travel services"><a href="/travel/"${active === 'home' ? ' aria-current="page"' : ''}>Travel home</a>${links}<a href="/travel/contact/">Get a quote</a></nav></div>`;
}

function footerBlock() {
  const list = (items, prefix) => items.map(([slug, label]) => `<li><a href="${prefix}${slug}/">${esc(label)}</a></li>`).join('');
  return `<section class="tvdir" aria-label="Travel directory"><div class="wrap">
<div><h2>Travel services</h2><ul>${list(SERVICES, '/travel/')}<li><a href="/travel/ai-planner/">AI trip planner</a></li><li><a href="/travel/faq/">FAQ</a></li></ul></div>
<div><h2>Popular destinations</h2><ul>${list(DESTS, '/travel/destination/')}<li><a href="/travel/destinations/">All destinations</a></li></ul></div>
<div><h2>Company</h2><ul>${list(COMPANY, '/travel/')}<li><a href="https://sastamilaga.com/">Shop</a></li></ul></div>
</div></section>
<div id="sm-chrome-footer"></div>`;
}

function transform(html) {
  if (html.includes('id="sm-chrome-header"')) {
    /* Already mounted: keep asset versions current and repair the duplicate card. */
    let out = html
      .replace(/\/travel\/assets\/css\/travel\.css\?v=[^"]*/g, `/travel/assets/css/travel.css?v=${VERSION}`)
      .replace(/\/travel\/assets\/js\/chrome-travel\.js\?v=[^"]*/g, `/travel/assets/js/chrome-travel.js?v=${VERSION}`);
    const cardRe = /<a class="card" href="\/travel\/group-tours\/"[^>]*>\r?\n<div class="ic"[^>]*>[^<]*<\/div>\r?\n<h3>Group tours<\/h3><p>[^<]*<\/p>\r?\n<span class="link">Explore group tours →<\/span><\/a>/g;
    if ([...out.matchAll(cardRe)].length > 1) {
      let kept = false;
      out = out.replace(cardRe, (m) => { if (kept) return ''; kept = true; return m; });
    }
    if (out === html) return null;
    if (html.includes('\r\n')) out = out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    return out;
  }

  const nav = html.match(/<nav class="nav-links"[^>]*>([\s\S]*?)<\/nav>/);
  let active = '';
  if (nav) {
    const on = nav[1].match(/<a href="\/travel\/([a-z0-9-]+)\/"[^>]*class="on"/);
    if (on) active = on[1];
  }

  const headerRe = /<a class="skip" href="#main">Skip to content<\/a>\s*<div class="topbar">[\s\S]*?<\/header>/;
  const footerRe = /<footer class="ftr">[\s\S]*?<\/footer>/;
  if (!headerRe.test(html)) throw new Error('header block not found');
  if (!footerRe.test(html)) throw new Error('footer block not found');

  let out = html.replace(headerRe, headerBlock(active)).replace(footerRe, footerBlock());

  out = out.replace(/\/travel\/assets\/css\/travel\.css\?v=[^"]*/g, `/travel/assets/css/travel.css?v=${VERSION}`);

  if (/assets\/js\/travel\.js/.test(out)) {
    out = out.replace(/(<script src="\/travel\/assets\/js\/travel\.js)/, `<script src="/travel/assets/js/chrome-travel.js?v=${VERSION}" defer></script>\n$1`);
  } else {
    out = out.replace('</body>', `<script src="/travel/assets/js/chrome-travel.js?v=${VERSION}" defer></script>\n</body>`);
  }

  /* Home printed the Group tours card twice: VERTICALS already contains it. */
  const cardRe = /<a class="card" href="\/travel\/group-tours\/"[^>]*>\r?\n<div class="ic"[^>]*>[^<]*<\/div>\r?\n<h3>Group tours<\/h3><p>[^<]*<\/p>\r?\n<span class="link">Explore group tours →<\/span><\/a>/g;
  if ([...out.matchAll(cardRe)].length > 1) {
    let kept = false;
    out = out.replace(cardRe, (m) => { if (kept) return ''; kept = true; return m; });
  }

  /* Keep the file's own line endings so the diff is only the chrome. */
  if (html.includes('\r\n')) out = out.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');

  return out;
}

const check = process.argv.includes('--check');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) files.push(p);
  }
})(TRAVEL);

let changed = 0;
let skipped = 0;
for (const file of files.sort()) {
  const html = fs.readFileSync(file, 'utf8');
  const next = transform(html);
  if (next === null) { skipped++; continue; }
  if (next === html) { skipped++; continue; }
  if (!check) fs.writeFileSync(file, next);
  changed++;
}

/* Repair mixed endings left by any earlier run, without touching LF-only files. */
if (!check) {
  for (const file of files) {
    const body = fs.readFileSync(file, 'utf8');
    if (body.includes('\r\n') && /(^|[^\r])\n/.test(body)) {
      fs.writeFileSync(file, body.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n'));
    }
  }
}

if (check) {
  if (changed) throw new Error(`${changed} travel page(s) still need the storefront chrome`);
  console.log(JSON.stringify({ check: 'passed', pages: files.length, skipped }));
} else {
  console.log(JSON.stringify({ pages: files.length, changed, skipped }));
}
