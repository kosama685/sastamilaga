/* Builds data/cj/search-index.js: a small keyword -> category index over all global (supplier) product names.
   It lets the header search and the global search open the right category files first and suggest words as you type,
   without downloading the 86 MB catalogue. Run after the catalogue shards change:  node tools/build-cj-search-index.mjs
   Output: window.SM_CJ_IDX = { c:[category slugs], t:{ token:[[catIndex,count],...top 3] }, w:[most common tokens, for completion] } */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const man = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/cj/manifest.js'), 'utf8'), { window: man });
const cats = man.SM_CJ.cats.map(c => c.s), idxOf = new Map(cats.map((s, i) => [s, i]));
const STOP = new Set('the and for with from your you pcs piece pieces set new hot sale free item items one two use used using can are that this has have not all any per'.split(' '));
const MIN_TOTAL = +(process.env.MIN_TOTAL || 15), TOP_CATS = 3, TOP_WORDS = +(process.env.TOP_WORDS || 9000);
const tot = new Map(), per = new Map();   // token -> total ; token -> Map(cat -> count)
let rows = 0;
for (const s of cats) {
  let data = null; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data/cj/c', s + '.js'), 'utf8'), { SM_CJ_SHARD: (n, r) => { data = r; } });
  if (!data) continue; const ci = idxOf.get(s);
  for (const r of data) {
    rows++; const seen = new Set();
    for (const w of String(r[2]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')) {
      if (w.length < 3 || w.length > 20 || /^\d+$/.test(w) || STOP.has(w) || seen.has(w)) continue; seen.add(w);
      tot.set(w, (tot.get(w) || 0) + 1);
      let m = per.get(w); if (!m) per.set(w, m = new Map()); m.set(ci, (m.get(ci) || 0) + 1);
    }
  }
}
const t = {}; let kept = 0;
for (const [w, n] of tot) {
  if (n < MIN_TOTAL) continue; kept++;
  t[w] = [...per.get(w)].sort((a, b) => b[1] - a[1]).slice(0, TOP_CATS);
}
const w = [...tot].filter(([k, n]) => n >= MIN_TOTAL && /^[a-z]/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, TOP_WORDS).map(x => x[0]);
const out = `window.SM_CJ_IDX=${JSON.stringify({ built: new Date().toISOString().slice(0, 10), rows, c: cats, t, w })};\n`;
fs.writeFileSync(path.join(ROOT, 'data/cj/search-index.js'), out);
console.log(`rows ${rows}, tokens kept ${kept}, completion words ${w.length}, file ${(out.length / 1024).toFixed(0)} KB`);
