#!/usr/bin/env node
/* Points every public address of the site at a new base URL (canonical links, hreflang, Open Graph, structured data, sitemaps,
 * robots.txt, the Merchant feed, and the build tools' own SITE constants so the daily jobs keep producing the new address).
 *
 *   node tools/set-site-url.mjs https://sastamilaga.com --check     count what would change, write nothing
 *   node tools/set-site-url.mjs https://sastamilaga.com             rewrite
 *
 * Use it when the custom domain, not github.io, is the storefront Google should index. Run it once, commit, deploy.
 * The Cloudflare Workers keep their own settings in workers/*\/wrangler.toml (not touched here). */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const [target, flag] = process.argv.slice(2);
if (!target || !/^https:\/\/[a-z0-9.-]+(\/[a-z0-9._~\-\/]*)?$/i.test(target)) { console.error('Usage: node tools/set-site-url.mjs https://your-domain [--check]'); process.exit(1); }
const NEW = target.replace(/\/+$/, ''), OLDS = ['https://kosama685.github.io/sastamilaga'];
const SKIP = new Set(['.git', 'node_modules', 'workers', 'backup', 'temporary screenshots', '.wrangler', '.vscode']);
const EXT = new Set(['.html', '.xml', '.js', '.mjs', '.json', '.txt', '.css', '.md', '.yml', '.m3u']);
let files = 0, changed = 0, hits = 0;
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue; const p = path.join(dir, e.name);
    if (e.isDirectory()) { walk(p); continue; }
    if (!EXT.has(path.extname(e.name))) continue; files++;
    const s = fs.readFileSync(p, 'utf8'); let t = s, n = 0;
    for (const o of OLDS) { const parts = t.split(o); n += parts.length - 1; t = parts.join(NEW); }
    if (n) { changed++; hits += n; if (flag !== '--check') fs.writeFileSync(p, t); }
  }
})(ROOT);
console.log(`${flag === '--check' ? 'would change' : 'changed'} ${hits} addresses in ${changed} of ${files} files -> ${NEW}`);
