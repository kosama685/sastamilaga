/* Sasta Milaga PayPal Worker (Cloudflare Workers).
 *
 * POST /api/paypal/orders              { items: [{ id, qty }] }  -> { id, usd, pkr, rate }
 * POST /api/paypal/orders/:id/capture  { form: {...customer fields} } -> { status, id }
 * POST /api/paypal/webhook             PayPal webhook (signature verified with PayPal before use)
 * GET  /api/paypal/health              configuration check (never returns secrets)
 *
 * The total is computed here from data/prices.json on the site, never taken from the browser.
 * Secrets live only in Cloudflare (wrangler secret put PAYPAL_CLIENT_SECRET). See README.md in this folder. */

class CartError extends Error {}
const API = { sandbox: 'https://api-m.sandbox.paypal.com', live: 'https://api-m.paypal.com' };
let priceCache = null, priceAt = 0, rateCache = null, rateAt = 0;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://kosama685.github.io').split(',').map(s => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin'
    };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/api/paypal/health') {
        return json({ env: env.PAYPAL_ENV || 'sandbox', clientId: !!env.PAYPAL_CLIENT_ID, secret: !!env.PAYPAL_CLIENT_SECRET, webhookId: !!env.PAYPAL_WEBHOOK_ID, site: env.SITE_ORIGIN });
      }
      if (url.pathname === '/api/paypal/webhook' && req.method === 'POST') return await webhook(req, env, json);
      if (req.method !== 'POST') return json({ error: 'Not found' }, 404);
      if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
      if (url.pathname === '/api/paypal/orders') return await createOrder(await req.json(), env, json);
      const m = url.pathname.match(/^\/api\/paypal\/orders\/([A-Z0-9]+)\/capture$/);
      if (m) return await capture(m[1], await req.json().catch(() => ({})), env, json, ctx);
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      const msg = String(e.message || e).slice(0, 200);
      if (e instanceof CartError) return json({ error: msg }, 400);
      return json({ error: 'Payment service error', detail: msg }, 502);
    }
  }
};

async function token(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error('PayPal credentials are not configured');
  const r = await fetch(`${API[env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox']}/v1/oauth2/token`, {
    method: 'POST', body: 'grant_type=client_credentials',
    headers: { Authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`), 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!r.ok) throw new Error(`PayPal auth failed (${r.status})`);
  return (await r.json()).access_token;
}
const base = env => API[env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox'];

async function prices(env) {
  if (priceCache && Date.now() - priceAt < 10 * 60e3) return priceCache;
  const r = await fetch(`${env.SITE_ORIGIN}/data/prices.json`, { cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error('Price list unavailable');
  priceCache = await r.json(); priceAt = Date.now(); return priceCache;
}
async function rate(env) {
  if (rateCache && Date.now() - rateAt < 60 * 60e3) return rateCache;
  const r = await fetch('https://open.er-api.com/v6/latest/PKR', { cf: { cacheTtl: 3600 } });
  const j = await r.json(); const v = j && j.rates && j.rates[env.PAYPAL_CURRENCY || 'USD'];
  if (!v) throw new Error('Exchange rate unavailable');
  rateCache = { v, at: j.time_last_update_utc }; rateAt = Date.now(); return rateCache;
}

/* Server-side total. Same rules as the site: unknown or zero-price items are rejected, delivery fee below the free threshold. */
async function quote(items, env) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw new CartError('Cart is empty or too large');
  const list = await prices(env); let sub = 0; const lines = [];
  for (const it of items) {
    const p = list.prices[String(it.id)], q = Math.floor(Number(it.qty));
    if (!p) throw new CartError(`Item ${String(it.id).slice(0, 40)} has no price`);
    if (!(q >= 1 && q <= 99)) throw new CartError('Invalid quantity');
    sub += p * q; lines.push({ id: String(it.id), qty: q, pkr: p });
  }
  const delivery = sub > list.freeDeliveryFrom ? 0 : list.deliveryFee, pkr = Math.round((sub + delivery) * 100) / 100;
  const r = await rate(env), usd = Math.max(0.01, Math.round(pkr * r.v * 100) / 100).toFixed(2);
  return { lines, sub, delivery, pkr, usd, rate: r.v, rateAt: r.at };
}

async function createOrder(body, env, json) {
  const q = await quote(body.items, env), t = await token(env);
  const r = await fetch(`${base(env)}/v2/checkout/orders`, {
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': crypto.randomUUID() },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{ description: `Sasta Milaga order (${q.lines.length} item${q.lines.length > 1 ? 's' : ''})`, custom_id: `PKR ${q.pkr}`.slice(0, 127),
        amount: { currency_code: env.PAYPAL_CURRENCY || 'USD', value: q.usd } }],
      payment_source: { paypal: { experience_context: { shipping_preference: 'NO_SHIPPING', brand_name: 'Sasta Milaga', user_action: 'PAY_NOW' } } }
    })
  });
  const d = await r.json();
  if (!r.ok) return json({ error: 'PayPal could not create the order', detail: d.message || d.name }, 502);
  return json({ id: d.id, usd: q.usd, pkr: q.pkr, delivery: q.delivery, rate: q.rate, rateAt: q.rateAt });
}

async function capture(id, body, env, json, ctx) {
  const t = await token(env);
  const r = await fetch(`${base(env)}/v2/checkout/orders/${id}/capture`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', 'PayPal-Request-Id': `cap-${id}` } });
  const d = await r.json();
  // Verify: status and captured amount must match what PayPal reports for this order.
  const cap = d.purchase_units && d.purchase_units[0] && d.purchase_units[0].payments && d.purchase_units[0].payments.captures && d.purchase_units[0].payments.captures[0];
  const paid = r.ok && d.status === 'COMPLETED' && cap && cap.status === 'COMPLETED';
  if (!paid) return json({ status: d.status || 'FAILED', error: 'Payment was not completed', detail: d.message || d.name }, 402);
  const record = { paypal_order_id: d.id, paypal_capture_id: cap.id, paid_amount: `${cap.amount.value} ${cap.amount.currency_code}`, pkr_total: (d.purchase_units[0].custom_id || '').replace('PKR ', ''),
    payer_email: (d.payer && d.payer.email_address) || '', verified_by: 'server', ...(body.form || {}) };
  if (env.ORDER_ENDPOINT) ctx.waitUntil(fetch(env.ORDER_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(record) }).catch(() => null));
  return json({ status: 'COMPLETED', id: d.id, captureId: cap.id, amount: cap.amount });
}

async function webhook(req, env, json) {
  const raw = await req.text(), event = JSON.parse(raw || '{}'), h = n => req.headers.get(n);
  if (!env.PAYPAL_WEBHOOK_ID) return json({ error: 'Webhook not configured' }, 503);
  const t = await token(env);
  const v = await fetch(`${base(env)}/v1/notifications/verify-webhook-signature`, {
    method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ auth_algo: h('paypal-auth-algo'), cert_url: h('paypal-cert-url'), transmission_id: h('paypal-transmission-id'),
      transmission_sig: h('paypal-transmission-sig'), transmission_time: h('paypal-transmission-time'), webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: event })
  }).then(r => r.json());
  if (v.verification_status !== 'SUCCESS') return json({ error: 'Invalid signature' }, 400);
  if (env.ORDER_ENDPOINT && /^PAYMENT\.CAPTURE\.(COMPLETED|DENIED|REFUNDED|REVERSED)$/.test(event.event_type)) {
    await fetch(env.ORDER_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ source: 'paypal-webhook', event: event.event_type, resource_id: event.resource && event.resource.id, amount: event.resource && event.resource.amount }) }).catch(() => null);
  }
  return json({ ok: true });
}
