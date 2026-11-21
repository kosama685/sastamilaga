#!/usr/bin/env node
/**
 * Cloudflare Error 1027 availability guard, intentionally limited to public
 * Worker routes. It never edits worker scripts, DNS, payment, orders or secrets.
 *
 * Audit: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node tools/repair-cloudflare-public-routes.mjs
 * Repair: same command with --fix. GET/PUT route flag only; fail closed on sensitive paths.
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const PROTECTED_PATH = /^sastamilaga\.com\/(?:api\/|smcs-oauth\/|account(?:\/|$)|__ops-health(?:\.|\/)|__cj-preview\/|cart(?:\/|$)|checkout(?:\/|$)|my-account(?:\/|$)|wp-admin\/|wp-login|wp-json\/|wc-api\/|auth\/|oauth\/|login\/|billing\/|payment\/|orders?\/|webhooks?\/)/i;
const HOST = /^(?:www\.)?sastamilaga\.com\//i;

export function isSafePublicRoute(route) {
  return !!route && HOST.test(route.pattern || '') && !PROTECTED_PATH.test(route.pattern || '') &&
    /^[a-z][a-z0-9_-]{1,100}$/i.test(route.script || '') &&
    /^[a-f0-9]{32}$/i.test(route.id || '');
}

export function publicFailClosed(routes) {
  return routes.filter(r => r.request_limit_fail_open === false && isSafePublicRoute(r));
}

async function request(token, path, options = {}) {
  const rsp = await fetch('https://api.cloudflare.com/client/v4' + path, {
    ...options,
    headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', ...(options.headers || {})}
  });
  const data = await rsp.json().catch(() => ({}));
  if (!rsp.ok || data.success !== true) throw new Error('Cloudflare API failure on ' + path + ' (' + rsp.status + '): ' +
    JSON.stringify(data.errors || []).slice(0, 450));
  return data;
}
async function main() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apply = process.argv.includes('--fix');
  if (!token || !/^[a-f0-9]{32}$/i.test(zoneId || '')) throw new Error('Cloudflare token and verified zone ID required');
  const base = '/zones/' + zoneId + '/workers/routes';
  const first = await request(token, base + '?per_page=100');
  const routes = first.result || [];
  // This zone currently has 89 routes. Refuse a partial listing: never repair
  // unknown routes when Cloudflare pagination or account selection changes.
  if (!Array.isArray(routes) || routes.length < 75 || routes.length >= 100) throw new Error('Unexpected route inventory size: ' + routes.length);
  if (!routes.some(r => r.pattern === 'sastamilaga.com/*') || !routes.some(r => r.pattern === 'sastamilaga.com/shop/*'))
    throw new Error('Missing expected public catch-all and shop routes');
  const need = publicFailClosed(routes);
  console.log(JSON.stringify({zone:'sastamilaga.com',routes:routes.length,public_fail_closed:need.map(r => r.pattern),mode:apply?'fix':'audit'}));
  if (!apply && need.length) process.exitCode = 1;
  if (!apply || !need.length) return;
  for (const route of need) {
    const data = await request(token, base + '/' + route.id, {
      method: 'PUT',
      body: JSON.stringify({id:route.id,pattern:route.pattern,script:route.script,request_limit_fail_open:true})
    });
    if (data.result?.request_limit_fail_open !== true) throw new Error('Fail-open repair unconfirmed: ' + route.pattern);
    console.log('protected public availability: ' + route.pattern);
  }
  const after = await request(token, base + '?per_page=100');
  const still = publicFailClosed(after.result || []);
  if (still.length) throw new Error('Public routes still fail closed: ' + still.map(x => x.pattern).join(', '));
  console.log('PASS: all ' + (after.result || []).filter(isSafePublicRoute).length + ' public Worker routes fail open; sensitive routes untouched.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(e => { console.error(e.message); process.exitCode = 1; });
}
