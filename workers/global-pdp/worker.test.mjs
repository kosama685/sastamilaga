// node --test workers/global-pdp/worker.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {handle, bucketOf, slugify, PAGES} from './worker.js';

const template = fs.readFileSync(new URL('../../assets/templates/global-pdp.html', import.meta.url), 'utf8');
const CHAIR = '1988880782439141377';
const items = {[CHAIR]: ['CJYL2590499', 'Zero Gravity Chair 26" Zero Gravity Recliner Lounge Chair Indoor & Outdoor', 'Garden Tools', 'garden-tools', 'https://cf.cjdropshipping.com/a.jpg'],
  'ABCD-1234': ['CJX1', 'Evil <script>alert(1)</script> name', 'Toys', 'toys', ''],
  '777': ['CJA', 'Blocked item', 'Adult Wellness', 'adult-wellness', '']};
function fetcher({noTemplate = false, bucketDown = false} = {}) {
  return async url => {
    if (url === `${PAGES}/assets/templates/global-pdp.html`) return noTemplate ? new Response('nope', {status: 404}) : new Response(template);
    const m = url.match(/\/data\/cj\/lookup\/([0-9a-f]{3})\.json$/);
    if (m) {
      if (bucketDown) return new Response('down', {status: 503});
      const want = parseInt(m[1], 16), own = Object.fromEntries(Object.entries(items).filter(([id]) => bucketOf(id) === want));
      return Response.json({snapshot: '2026-11-05', count: Object.keys(own).length, items: own});
    }
    return new Response('unexpected ' + url, {status: 500});
  };
}
const get = (path, opts) => handle(new Request('https://sastamilaga.com' + path), fetcher(opts));

test('bucket hashing matches tools/build-cj-static-lookup.mjs', () => {
  const src = fs.readFileSync(new URL('../../tools/build-cj-static-lookup.mjs', import.meta.url), 'utf8');
  assert.match(src, /const bucketOf=id=>\{let h=2166136261;for\(let i=0;i<id\.length;i\+\+\)h=Math\.imul\(h\^id\.charCodeAt\(i\),16777619\)>>>0;return\(h>>>0\)&\(COUNT-1\);\};/);
  assert.equal(slugify('Zero Gravity Chair 26" Zero Gravity Recliner Lounge Chair Indoor & Outdoor'), 'zero-gravity-chair-26-zero-gravity-recliner-lounge-chair-indoor-outdoor');
});
test('a known product renders in the local product-page shell, noindex, with the data the browser script needs', async () => {
  const r = await get(`/global-shop/p/${CHAIR}/zero-gravity-chair-26-zero-gravity-recliner-lounge-chair-indoor-outdoor/?utm_source=x`);
  assert.equal(r.status, 200);
  const h = await r.text();
  for (const s of ['id="sm-chrome-header" data-prefix="/"', '/assets/theme/static-bundle.css', '/assets/js/chrome.js', '/assets/js/global-pdp.js', 'class="pdp gpdp"', 'class="gallery-panel"', 'class="buy-panel"', 'data-gpdp-add', 'data-gpdp-buy', 'class="sm-wa-btn"', 'id="gpdp-data"'])
    assert.ok(h.includes(s), 'missing ' + s);
  assert.match(h, /<meta name="robots" content="noindex, follow">/);
  assert.match(h, new RegExp(`<link rel="canonical" href="https://sastamilaga.com/global-shop/p/${CHAIR}/zero-gravity-chair-26-zero-gravity-recliner-lounge-chair-indoor-outdoor/">`));
  assert.ok(!h.includes('<!--GPDP:'), 'markers replaced');
  assert.ok(!/"offers"/.test(h), 'no Offer markup');
  assert.ok(!/inquiry-only/i.test(h), 'not the old inquiry-only page');
  const data = JSON.parse(h.match(/<script type="application\/json" id="gpdp-data">([\s\S]*?)<\/script>/)[1]);
  assert.equal(data.pid, CHAIR); assert.equal(data.sku, 'CJYL2590499');
  JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(r.headers.get('x-sasta-renderer'), 'global-pdp-v6');
});
test('names are escaped everywhere (HTML and inline JSON)', async () => {
  const h = await (await get('/global-shop/p/ABCD-1234/x/')).text();
  assert.ok(!h.includes('<script>alert(1)</script>'));
  assert.ok(h.includes('Evil &lt;script&gt;alert(1)&lt;/script&gt; name'));
});
test('missing slug redirects to the canonical URL; unknown and blocked products are 404; bad paths are 404', async () => {
  const r = await get(`/global-shop/p/${CHAIR}`);
  assert.equal(r.status, 301); assert.match(r.headers.get('location'), /\/zero-gravity-chair-26-zero-gravity-recliner-lounge-chair-indoor-outdoor\/$/);
  assert.equal((await get('/global-shop/p/0000000000000000001/x/')).status, 404);
  assert.equal((await get('/global-shop/p/777/blocked-item/')).status, 404);
  assert.equal((await get('/global-shop/p/../../etc/passwd')).status, 404);
});
test('the page still renders when the template cannot be fetched; a lookup outage is an honest 503, not a fake page', async () => {
  const r = await get(`/global-shop/p/${CHAIR}/x/`, {noTemplate: true});
  assert.equal(r.status, 200); const h = await r.text();
  assert.ok(h.includes('data-gpdp-add') && h.includes('/assets/js/global-pdp.js') && !h.includes('<!--GPDP:'));
  const d = await get(`/global-shop/p/${CHAIR}/x/`, {bucketDown: true});
  assert.equal(d.status, 503); assert.equal(d.headers.get('cache-control'), 'no-store');
});
test('only GET and HEAD are served', async () => {
  const r = await handle(new Request(`https://sastamilaga.com/global-shop/p/${CHAIR}/x/`, {method: 'POST'}), fetcher());
  assert.equal(r.status, 405);
});
