// Guard against a future GitHub Actions deploy silently undoing live Cloudflare route repairs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const yml = readFileSync(new URL('../.github/workflows/workers.yml', import.meta.url), 'utf8');
const wanted = [
  ['sastamilaga.com/product/*', 'sasta-cj-storefront-v1'],
  ['sastamilaga.com/sitemap-global-qualified.xml', 'sasta-qualified-sitemaps-quota-v2'],
  ['sastamilaga.com/sitemaps/global-qualified/*', 'sasta-qualified-sitemaps-quota-v2'],
];
for (const [pattern, worker] of wanted) {
  const route = 'attach "' + pattern + '" ' + worker;
  assert.ok(yml.includes(route), 'Missing deployment route assignment: ' + route);
  assert.equal(yml.split(route).length - 1, 1, 'Route must be assigned exactly once: ' + pattern);
}
const legacyLoop = yml.match(/for pat in [\s\S]+?; do attach "\$pat" sastamilaga-redirects; done/);
assert.ok(legacyLoop, 'Legacy redirects loop must remain intact');
assert.ok(!legacyLoop[0].includes('"sastamilaga.com/product/*"'), 'Legacy loop would overwrite CJ storefront route');
assert.ok(legacyLoop[0].includes('"sastamilaga.com/ur/product/*"'), 'Urdu legacy route must be preserved');
assert.match(yml, /Preserving existing \/global\/p\/\* Worker route/, 'Preserve dedicated legacy global product Worker');
console.log('PASS: CI preserves CJ product, qualified sitemap and historic legacy routes');
