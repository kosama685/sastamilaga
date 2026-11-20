import test from 'node:test';
import assert from 'node:assert/strict';
import {parseSnapshot, analyse} from './product-seo-dryrun.mjs';

const H = 'ID\ttitle\tpost_name\tsku\tthumb\tprice\tclen\tgallery';
const tsv = rows => 'mysql: Deprecated program name\n' + H + '\n' + rows.map(r => r.join('\t')).join('\n') + '\n';
const row = (id, o = {}) => [id, o.title ?? 'Item ' + id, 's' + id, o.sku ?? 'hhc-' + id, o.thumb ?? '10', o.price ?? '100', o.clen ?? '500', o.gallery ?? ''];

test('parser skips the mysql warning, and a product joined twice is counted once', () => {
  const rows = parseSnapshot(tsv([row(1), row(1), row(2)]));
  assert.equal(rows.length, 2);
});
test('missing image: a gallery image is a safe proposal, no gallery is an external dependency, nothing is imported', () => {
  const {issues} = analyse(parseSnapshot(tsv([row(1, {thumb: '', gallery: '7,8'}), row(2, {thumb: ''})])));
  const a = issues.find(i => i.product_id === '1'), b = issues.find(i => i.product_id === '2');
  assert.equal(a.state, 'PROPOSED_SAFE'); assert.match(a.proposed_action, /attachment 7/);
  assert.equal(b.state, 'EXTERNAL_DEPENDENCY'); assert.match(b.proposed_action, /never substitute|keep out of indexing/);
});
test('missing SKU gets a collision-checked internal SKU and existing SKUs are never touched', () => {
  const {issues} = analyse(parseSnapshot(tsv([row(5, {sku: ''}), row(6, {sku: 'SM-5'})])));
  const i = issues.find(x => x.issue === 'missing_sku');
  assert.notEqual(i.proposed_action.match(/SM-\w+/)[0].toLowerCase(), 'sm-5');
  assert.equal(issues.filter(x => x.product_id === '6' && x.issue === 'missing_sku').length, 0);
});
test('missing or zero price is never invented: product is excluded until a verified price exists', () => {
  const {issues} = analyse(parseSnapshot(tsv([row(1, {price: ''}), row(2, {price: '0'})])));
  assert.equal(issues.filter(i => i.issue === 'missing_price').length, 2);
  assert.ok(issues.every(i => !/set price (to|=)/i.test(i.proposed_action)));
});
test('duplicate titles: unicode-safe grouping, no arbitrary retitling, same-SKU pairs flagged as likely double listing', () => {
  const {issues, summary} = analyse(parseSnapshot(tsv([row(1, {title: 'Wall Art Tiles', sku: 'a'}), row(2, {title: 'wall  art tiles!', sku: 'b'}), row(3, {title: 'Other'}), row(4, {title: 'Dup', sku: 'z'}), row(5, {title: 'Dup', sku: 'z'})])));
  assert.equal(summary.duplicateTitleGroups, 2);
  const d = issues.filter(i => i.issue === 'duplicate_title');
  assert.equal(d.length, 4);
  assert.ok(d.every(i => i.state === 'NEEDS_ATTRIBUTE_DATA'));
  assert.match(d.find(i => i.product_id === '4').proposed_action, /same product listed twice/);
  assert.match(d.find(i => i.product_id === '1').proposed_action, /real attributes/);
});
test('a duplicate-title note stays small even for a very large group', () => {
  const rows = Array.from({length: 500}, (_, i) => row(i + 1, {title: 'Same', sku: 'k' + i}));
  const {issues} = analyse(parseSnapshot(tsv(rows)));
  assert.ok(issues.every(i => i.note.length < 80));
});
