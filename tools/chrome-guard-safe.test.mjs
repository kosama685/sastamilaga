// The edge guard (deployed Worker, see docs/cart-bridge-design.md) swallows clicks on any link or button whose text, aria-label,
// name, id or href matches the pattern below, unless the href goes to /cart/, /checkout/ or /my-account/. A header or footer link
// with such words is dead on every static page. This keeps the shared chrome free of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const guard = /add.?to.?cart|buy.?now|place.?order|order.?now|checkout|pay.?now|paypal|cash.?on.?delivery/i;
const exempt = href => /^\/?(?:\.\.\/)*(?:cart|checkout|my-account)(?:\/|$|\.html)/i.test(href) || /^https:\/\/sastamilaga\.com\/(?:cart|checkout|my-account)(?:\/|$)/i.test(href);

function offenders(html) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attrs = m[1], href = (attrs.match(/href="([^"]*)"/) || [])[1] || '';
    if (exempt(href)) continue;
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const aria = (attrs.match(/aria-label="([^"]*)"/) || [])[1] || '', id = (attrs.match(/\bid="([^"]*)"/) || [])[1] || '';
    if (guard.test([text, aria, id, href].join(' '))) out.push(`${href} :: ${text.slice(0, 80)}`);
  }
  return out;
}
for (const file of ['partials/chrome.json', 'partials/chrome-runtime.json']) {
  test(`${file}: no header/footer link text trips the edge click guard`, () => {
    const j = JSON.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8').replace(/^﻿/, ''));
    const html = Object.values(j).filter(v => typeof v === 'string').join('\n');
    assert.ok(html.includes('How to order'), 'sanity: chrome markup was read');
    assert.deepEqual(offenders(html), []);
  });
}
test('index.html chrome is guard-safe too', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  // header and footer only. The product-video quick-buy dialog after the footer still uses the legacy static cart (known follow-up).
  const f = html.lastIndexOf('<footer');
  const chrome = html.slice(html.indexOf('<header'), html.indexOf('<main')) + html.slice(f, html.indexOf('</footer>', f));
  assert.deepEqual(offenders(chrome), []);
});
