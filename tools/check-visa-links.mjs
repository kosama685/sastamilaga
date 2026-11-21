#!/usr/bin/env node
/**
 * Checks every official link used by the visa pages and writes data/visa/link-check.json.
 * tools/build-visa-pages.mjs publishes only links that answered (HTTP 2xx/3xx, or 401/403/405/406/429 from bot protection on a live host).
 * A host that does not resolve, times out or returns 404/410/5xx is left out and the page tells readers to contact the embassy instead.
 * Usage: node tools/check-visa-links.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PORTALS, INVESTMENT, SCHENGEN_INFO, PK_BEOE, NUSUK} from './visa-content.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urls = new Set([SCHENGEN_INFO, PK_BEOE, NUSUK, ...Object.values(PORTALS).filter(Boolean)]);
for (const list of Object.values(INVESTMENT)) for (const p of list) if (p.url) urls.add(p.url);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
async function check(u) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(u, {method, redirect: 'follow', signal: AbortSignal.timeout(25000), headers: {'user-agent': UA, accept: 'text/html,*/*'}});
      if (r.status < 400 || [401, 403, 405, 406, 429].includes(r.status)) return {ok: true, status: r.status, final: r.url};
      if (method === 'GET') return {ok: false, status: r.status};
    } catch (e) { if (method === 'GET') return {ok: false, status: 0, error: String(e.cause?.code || e.name)}; }
  }
}
const results = {}; let i = 0;
const list = [...urls];
await Promise.all(Array.from({length: 6}, async () => { while (i < list.length) { const u = list[i++]; results[u] = await check(u); } }));
const ok = Object.values(results).filter(r => r.ok).length;
fs.mkdirSync(path.join(root, 'data/visa'), {recursive: true});
fs.writeFileSync(path.join(root, 'data/visa/link-check.json'), JSON.stringify({checkedOn: new Date().toISOString().slice(0, 10), ok, total: list.length, results}, null, 1) + '\n');
console.log(JSON.stringify({ok, total: list.length}));
for (const [u, r] of Object.entries(results)) if (!r.ok) console.log('DROPPED', r.status, r.error || '', u);
