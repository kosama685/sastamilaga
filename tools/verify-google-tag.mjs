import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

// The static homepage is the source for generated section pages.
// The Cloudflare edge covers separately-generated public product/article pages.
const root = new URL('../', import.meta.url);
const id = 'GTM-P5PP74FB';
const loader = '<script async src="https://www.googletagmanager.com/gtm.js?id=' + id + '"></script>';
const pages = ['index.html', 'visa/index.html', 'shop/index.html', 'shipping/index.html'];
for (const page of pages) {
  const path = new URL(page, root);
  assert.ok(existsSync(path), page + ': generated page is present');
  const html = readFileSync(path, 'utf8');
  const open = html.indexOf('<head>');
  const close = html.indexOf('</head>');
  assert.ok(open >= 0 && close > open, page + ': static head exists');
  const head = html.slice(open + '<head>'.length, close);
  assert.ok(head.includes(loader), page + ': correct Google tag is directly in the head');
  assert.equal(head.split('www.googletagmanager.com/gtm.js?id=').length - 1, 1, page + ': exactly one tag loader');
  assert.equal(html.split('gtm.js?id=GTM-P5PP74FB').length - 1, 1, page + ': no duplicate loader');
  assert.ok(head.includes('window.dataLayer = window.dataLayer || [];'), page + ': initializes the data layer');
  assert.ok(head.includes("gtag('js', new Date());"), page + ': initializes the Google tag');
}
console.log('PASS: one Google tag on each representative generated HTML page.');
