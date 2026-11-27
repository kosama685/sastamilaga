// Regression check for the static storefront checkout; no network or orders are created.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const open = app.indexOf('<form id="checkoutForm"');
const close = app.indexOf('</form>', open);
assert.ok(open >= 0 && close > open, 'Checkout form must exist');
const form = app.slice(open, close);
for (const field of ['city', 'near_place']) {
  const tags = [...form.matchAll(/<input\b[^>]*>/g)].map(match => match[0]);
  const matches = tags.filter(tag => new RegExp('\\bname="' + field + '"').test(tag));
  assert.equal(matches.length, 1, field + ' must appear exactly once');
  assert.doesNotMatch(matches[0], /\brequired(?:\s|=|>)/, field + ' must be optional');
}
assert.match(form, /name="city"[^>]*autocomplete="address-level2"/);
assert.match(form, /name="near_place"/);
assert.match(form, /onsubmit="placeOrder\(event\)"/, 'Preserve existing checkout handler');
assert.match(app, /const data = new FormData\(form\)/, 'Both fields must flow into the existing order payload');
assert.match(app, /window\.placeOrder = function/, 'Existing checkout handling must be retained');
assert.match(app, /paypalLink\(/, 'Preserve PayPal handoff');
console.log('PASS: checkout fields optional, present once and included in existing FormData order payload');
