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

/* CJ freight needs a variant ID (vid). The site's CSV data has the product ID and SKU, so look the vid up once and cache it. */
async function vidFor(pid, sku, tok, ctx) {
  const key = `https://cache.internal/cj-vid/${encodeURIComponent(pid)}/${encodeURIComponent(sku || '')}`;
  const c = await cached(key); if (c && c.vid) return c.vid;
  const { d } = await cj(`/product/variant/query?pid=${encodeURIComponent(pid)}`, { headers: { 'CJ-Access-Token': tok } });
  const list = (d && d.data) || [];
  if (!list.length) throw new ItemError(`No CJ variants found for product ${pid}`);
  const v = (sku && list.find(x => x.variantSku === sku)) || list[0];
  await store(key, { vid: v.vid }, 30 * 86400, ctx);
  return v.vid;
}
class ItemError extends Error {}

async function quote(body, env, ctx, json) {
  const country = String(body.country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return json({ error: 'Choose a destination country' }, 400);
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return json({ error: 'No items' }, 400);
  const tok = await token(env, ctx);
  let products;
  try {
    products = await Promise.all(items.map(async it => ({ quantity: Math.min(99, Math.max(1, Math.floor(Number(it.qty) || 1))), vid: await vidFor(String(it.pid), it.sku, tok, ctx) })));
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
