/* Sasta Milaga CJ shipping Worker (Cloudflare Workers).
 *
 * POST /api/cj/shipping  { country: "PK", zip?: "54000", items: [{ pid, sku?, qty }] }
 *   -> { country, currency: "USD", methods: [{ name, price, days }], unavailable?: [...] }
 * GET  /api/cj/health    -> configuration check (never returns the key)
 *
 * The CJ API key is a Cloudflare secret (CJ_API_KEY). It never reaches the browser or GitHub.
 * Access tokens (valid ~15 days, CJ rate-limits token requests) and product variant IDs are cached
 * with the Cache API so normal traffic makes one freight call per quote. */

const CJ = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_KEY = 'https://cache.internal/cj-token';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://kosama685.github.io').split(',').map(s => s.trim());
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/api/cj/health') return json({ key: !!env.CJ_API_KEY, origins: allowed });
      if (url.pathname === '/api/cj/product' && req.method === 'GET') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await product(url.searchParams.get('pid'), env, ctx, json);
      }
      if (url.pathname === '/api/cj/shipping' && req.method === 'POST') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await quote(await req.json(), env, ctx, json);
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Shipping service error', detail: String(e.message || e).slice(0, 200) }, 502);
    }
  }
};

/* CJ allows 1 request per second per account: wait and retry when it answers with its QPS limit. */
async function cj(path, init = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(CJ + path, init); const d = await r.json().catch(() => ({}));
    const limited = r.status === 429 || /QPS limit|Too Many Requests/i.test(d.message || '');
    if (!limited || attempt >= 3) return { r, d };
    await new Promise(res => setTimeout(res, 1100 * (attempt + 1)));
  }
}

async function cached(key) { const r = await caches.default.match(key); return r ? r.json() : null; }
async function store(key, data, ttl, ctx) {
  ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } })));
}

async function token(env, ctx) {
  const c = await cached(TOKEN_KEY);
  if (c && c.token && Date.parse(c.expires) - Date.now() > 3600e3) return c.token;
  if (!env.CJ_API_KEY) throw new Error('CJ_API_KEY is not configured');
  const { r, d } = await cj('/authentication/getAccessToken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: env.CJ_API_KEY }) });
  if (!d.result || !d.data || !d.data.accessToken) throw new Error(`CJ auth failed: ${d.message || r.status}`);
  const expires = d.data.accessTokenExpiryDate || new Date(Date.now() + 14 * 864e5).toISOString();
  const ttl = Math.max(3600, Math.floor((Date.parse(expires) - Date.now()) / 1000) - 3600);
  await store(TOKEN_KEY, { token: d.data.accessToken, expires }, ttl, ctx);
  return d.data.accessToken;
}

/* Variants (colour, size …) of a CJ product, from CJ's variant API; cached 6 hours. */
async function variantsOf(pid, tok, ctx) {
  const key = `https://cache.internal/cj-variants/${encodeURIComponent(pid)}`;
  const c = await cached(key); if (c) return c;
  const { d } = await cj(`/product/variant/query?pid=${encodeURIComponent(pid)}`, { headers: { 'CJ-Access-Token': tok } });
  const list = ((d && d.data) || []).map(v => ({
    vid: v.vid, sku: v.variantSku, key: v.variantKey || '', name: v.variantNameEn || v.variantName || '',
    price: Number(v.variantSellPrice) || 0, image: v.variantImage || '', weight: Number(v.variantWeight) || 0
  })).filter(v => v.vid);
  if (list.length) await store(key, list, 6 * 3600, ctx);
  return list;
}
/* CJ freight needs a variant ID (vid): use the one the customer picked, else the variant with the product SKU, else the first. */
async function vidFor(it, tok, ctx) {
  if (it.vid && /^[A-Za-z0-9-]{8,64}$/.test(String(it.vid))) return String(it.vid);
  const list = await variantsOf(String(it.pid), tok, ctx);
  if (!list.length) throw new ItemError(`No CJ variants found for product ${it.pid}`);
  return ((it.sku && list.find(x => x.sku === it.sku)) || list[0]).vid;
}
class ItemError extends Error {}

async function product(pid, env, ctx, json) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(String(pid || ''))) return json({ error: 'Invalid product id' }, 400);
  const tok = await token(env, ctx), variants = await variantsOf(pid, tok, ctx);
  return json({ pid, currency: 'USD', variants, ...(variants.length ? {} : { error: 'No variants found for this product' }) });
}

async function quote(body, env, ctx, json) {
  const country = String(body.country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return json({ error: 'Choose a destination country' }, 400);
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return json({ error: 'No items' }, 400);
  const tok = await token(env, ctx);
  let products;
  try {
    products = await Promise.all(items.map(async it => ({ quantity: Math.min(99, Math.max(1, Math.floor(Number(it.qty) || 1))), vid: await vidFor(it, tok, ctx) })));
  } catch (e) {
    if (e instanceof ItemError) return json({ country, methods: [], error: e.message }, 200);
    throw e;
  }
  const qkey = `https://cache.internal/cj-freight/${country}/${body.zip || ''}/${products.map(p => p.vid + 'x' + p.quantity).join(',')}`;
  const hit = await cached(qkey); if (hit) return json({ ...hit, cached: true });
  // Variant lookups for several items run in parallel above; pause so the freight call respects CJ's 1/s limit.
  if (products.length > 1) await new Promise(res => setTimeout(res, 1100));
  const { d } = await cj('/logistic/freightCalculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': tok },
    body: JSON.stringify({ startCountryCode: env.START_COUNTRY || 'CN', endCountryCode: country, ...(body.zip ? { zip: String(body.zip) } : {}), products })
  });
  const methods = ((d && d.data) || []).map(m => ({ name: m.logisticName, price: Number(m.logisticPrice), days: m.logisticAging })).filter(m => m.name && m.price >= 0).sort((a, b) => a.price - b.price);
  const out = { country, currency: 'USD', methods, ...(methods.length ? {} : { error: d && d.message ? `No shipping method: ${d.message}` : 'No shipping method to this country' }) };
  if (methods.length) await store(qkey, out, 6 * 3600, ctx);
  return json(out);
}
