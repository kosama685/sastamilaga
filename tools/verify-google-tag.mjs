import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = new URL('../', import.meta.url);
const id = 'GTM-P5PP74FB';
const target = 'https://www.googletagmanager.com/gtm.js?id=' + id;
const pages = ['index.html', 'visa/index.html', 'shop/index.html', 'shipping/index.html'];
for (const page of pages) {
  const path = new URL(page, root);
  assert.ok(existsSync(path), page + ': generated page is present');
  const html = readFileSync(path, 'utf8');
  const head = /^<[\\s\\S]*?<head\\b[^>]*>([\\s\\S]*?)<\\/head>/i.exec(html)?.[1];
  assert.ok(head, page + ': static head exists');
  const loaders = [...head.matchAll(/<script\\b[^>]*\\bsrc=["']https:\\/\\/www\\.googletagmanager\\.com\\/gtm\\.js\\?id=([^"'&]+)["'][^>]*><\\/script>/gi)];
  assert.equal(loaders.length, 1, page + ': exactly one Google tag loader is installed');
  assert.equal(loaders[0][1], id, page + ': correct container ID');
  assert.ok(head.includes(target), page + ': exact Google tag URL');
  assert.ok(head.includes('window.dataLayer = window.dataLayer || [];'), page + ': initializes the data layer');
  assert.ok(head.includes('gtag(\'js\', new Date());'), page + ': initializes the Google tag');
  assert.equal((html.match(/gtm\\.js\\?id=GTM-P5PP74FB/g) || []).length, 1, page + ': no duplicate loader');
}
console.log('PASS: Google tag is in the generated source of every representative site section.');
