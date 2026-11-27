// Redirects Worker and the visa guides: existing guide pages are served, old WordPress visa URLs still go to /visa/.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/redirects/worker.js';

const ORIGIN = 'https://kosama685.github.io/sastamilaga', env = {SITE_ORIGIN: ORIGIN, CANONICAL_BASE: 'https://sastamilaga.com'};
const pages = new Set(['/visa/', '/visa/germany/', '/visa/guides/', '/visa/guides/work-visa/']);
globalThis.fetch = async url => {
  const p = String(url).replace(ORIGIN, '');
  return pages.has(p) ? new Response('<!doctype html><title>ok</title>', {status: 200, headers: {'content-type': 'text/html; charset=utf-8'}}) : new Response('<!doctype html>404', {status: 404, headers: {'content-type': 'text/html'}});
};
const get = p => worker.fetch(new Request('https://sastamilaga.com' + p), env);

test('existing visa guide pages are served (200), with one canonical trailing-slash address', async () => {
  for (const p of ['/visa/germany/', '/visa/guides/', '/visa/guides/work-visa/']) {
    const r = await get(p); assert.equal(r.status, 200, p); assert.equal(r.headers.get('x-redirects-worker'), 'visa-guide');
  }
  const r = await get('/visa/germany'); assert.equal(r.status, 301); assert.equal(r.headers.get('location'), 'https://sastamilaga.com/visa/germany/');
});
test('old WordPress visa addresses without a page, and Urdu copies, still redirect to /visa/', async () => {
  for (const p of ['/visa/old-wordpress-slug/', '/visa/dubai-visit-visa-for-pakistani/', '/ur/visa/germany/', '/visa/a/b/c/']) {
    const r = await get(p); assert.equal(r.status, 301, p); assert.equal(r.headers.get('location'), 'https://sastamilaga.com/visa/', p);
  }
});
test('natural country names redirect to the canonical visa guide instead of the hub', async () => {
  const aliases = {
    '/visa/usa': '/visa/united-states/', '/visa/us': '/visa/united-states/', '/visa/united-states-of-america': '/visa/united-states/',
    '/visa/uae': '/visa/united-arab-emirates/', '/visa/dubai': '/visa/united-arab-emirates/',
    '/visa/uk': '/visa/united-kingdom/', '/visa/turkey': '/visa/turkiye/', '/visa/holland': '/visa/netherlands/',
    '/visa/burma': '/visa/myanmar/', '/visa/swaziland': '/visa/eswatini/', '/visa/czech-republic': '/visa/czechia/', '/visa/ksa': '/visa/saudi-arabia/',
  };
  for (const [from, to] of Object.entries(aliases)) {
    const r = await get(from + '/');
    assert.equal(r.status, 301, from);
    assert.equal(r.headers.get('location'), 'https://sastamilaga.com' + to, from);
  }
});
test('a country name the site has no guide for still falls back to the hub', async () => {
  const r = await get('/visa/atlantis/');
  assert.equal(r.status, 301);
  assert.equal(r.headers.get('location'), 'https://sastamilaga.com/visa/');
});
test('the /visa/ index is still passed through from the static site', async () => {
  const r = await get('/visa/'); assert.equal(r.status, 200); assert.equal(r.headers.get('x-redirects-worker'), 'index-passthrough');
});
