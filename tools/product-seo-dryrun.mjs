#!/usr/bin/env node
/**
 * Product SEO DRY RUN. Reads a read-only snapshot (TSV: ID, title, post_name, sku, thumb, price, clen, gallery) and
 * PROPOSES fixes. It writes only report files. It never touches the shop; an apply step is deliberately not included.
 *
 * Usage: node tools/product-seo-dryrun.mjs <snapshot.tsv> [outDir=reports]
 * Outputs: <outDir>/product-seo-resolution.csv (one row per issue), <outDir>/product-seo-dryrun-summary.json
 *
 * Rules (from the owner brief): never invent prices or images, never use unrelated stock images, never overwrite a valid SKU,
 * never add arbitrary numbers or keywords to titles to fake uniqueness, and never mark anything resolved without evidence.
 */
import fs from 'node:fs';
import path from 'node:path';

export function parseSnapshot(text) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const hi = lines.findIndex(l => l.startsWith('ID\ttitle'));
  const head = lines[hi].split('\t'), byId = new Map();
  for (const l of lines.slice(hi + 1)) {
    if (!l.trim()) continue;
    const c = l.split('\t'); if (!/^\d+$/.test(c[0])) continue;
    const r = Object.fromEntries(head.map((k, i) => [k, c[i] ?? '']));
    if (!byId.has(r.ID)) byId.set(r.ID, r); // duplicate meta rows must not double-count a product
  }
  return [...byId.values()];
}
const norm = t => t.toLowerCase().replace(/&amp;/g, '&').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const supplierRef = sku => (sku.match(/^(hhc|cj)[-_]?(.+)$/i) || [])[0] || '';

export function analyse(rows) {
  const issues = [], skuSet = new Set(rows.map(r => r.sku.trim().toLowerCase()).filter(Boolean));
  const add = (r, issue, action, status, note = '') => issues.push({product_id: r.ID, sku: r.sku, title: r.title, issue, proposed_action: action, state: status, note});
  const proposedSku = new Set();
  for (const r of rows) {
    const gallery = r.gallery.split(',').map(x => x.trim()).filter(Boolean);
    if (!r.thumb.trim()) {
      if (gallery.length) add(r, 'missing_featured_image', `Set featured image to first gallery image (attachment ${gallery[0]}); no new image imported`, 'PROPOSED_SAFE', 'gallery already holds genuine product images');
      else add(r, 'missing_featured_image', 'Re-fetch the genuine supplier image by supplier ID; until then keep out of indexing and sitemaps', 'EXTERNAL_DEPENDENCY', 'supplier image availability cannot be determined from the snapshot; never substitute stock imagery');
    }
    if (!r.sku.trim()) {
      let cand = `SM-${r.ID}`; while (skuSet.has(cand.toLowerCase()) || proposedSku.has(cand.toLowerCase())) cand += 'X';
      proposedSku.add(cand.toLowerCase());
      add(r, 'missing_sku', `Assign stable internal SKU ${cand} (post-ID based, collision-checked)`, 'PROPOSED_SAFE', 'no existing SKU is changed; replace with the supplier SKU later if one is found');
    }
    if (r.price === '' || !(Number(r.price) > 0)) add(r, 'missing_price', 'Mark out of stock and exclude from sitemaps until a verified supplier price is entered', 'PROPOSED_SAFE', 'a price is never fabricated');
    if (Number(r.clen) < 100) add(r, 'thin_content', 'Queue for description enrichment from real supplier attributes; do not index until done', 'EXTERNAL_DEPENDENCY', `content length ${r.clen} chars`);
  }
  const groups = new Map();
  for (const r of rows) { const k = norm(r.title); if (k) (groups.get(k) || groups.set(k, []).get(k)).push(r); }
  let dupGroups = 0, dupProducts = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue; dupGroups++; dupProducts += g.length;
    const skus = g.map(x => x.sku.trim().toLowerCase()).filter(Boolean), sameSku = skus.length > 1 && new Set(skus).size < skus.length;
    for (const r of g) add(r, 'duplicate_title', sameSku ? 'Likely the same product listed twice: review for merge or 301; do not retitle' : 'Different SKUs share one title: derive a distinguishing title from real attributes (model, size, colour, pack) once attribute data is pulled', 'NEEDS_ATTRIBUTE_DATA', `group of ${g.length}; first IDs: ${g.slice(0, 5).map(x => x.ID).join(' ')}`);
  }
  const dupSku = new Map();
  for (const r of rows) if (r.sku.trim()) (dupSku.get(r.sku.trim().toLowerCase()) || dupSku.set(r.sku.trim().toLowerCase(), []).get(r.sku.trim().toLowerCase())).push(r.ID);
  for (const [sku, ids] of dupSku) if (ids.length > 1) for (const id of ids) add(rows.find(x => x.ID === id), 'duplicate_sku', 'WooCommerce requires unique SKUs: investigate before any change', 'NEEDS_REVIEW', `sku ${sku} shared by ${ids.length} products; first IDs: ${ids.slice(0, 5).join(' ')}`);
  const count = k => issues.filter(i => i.issue === k).length, uniq = k => new Set(issues.filter(i => i.issue === k).map(i => i.product_id)).size;
  return {issues, summary: {products: rows.length, duplicateTitleGroups: dupGroups, productsInDuplicateTitleGroups: dupProducts,
    byIssue: Object.fromEntries(['missing_featured_image', 'missing_sku', 'missing_price', 'thin_content', 'duplicate_title', 'duplicate_sku'].map(k => [k, uniq(k)])),
    byState: Object.fromEntries([...new Set(issues.map(i => i.state))].map(s => [s, issues.filter(i => i.state === s).length])),
    productsWithAtLeastOneIssue: new Set(issues.map(i => i.product_id)).size, issuesTotal: issues.length, rowsAnalysed: rows.length, _count: count('missing_sku')}};
}
const csv = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) {
  const [snap, outDir = 'reports'] = process.argv.slice(2);
  const rows = parseSnapshot(fs.readFileSync(snap, 'utf8')), {issues, summary} = analyse(rows);
  delete summary._count;
  const cols = ['product_id', 'sku', 'title', 'issue', 'proposed_action', 'state', 'note'];
  fs.mkdirSync(outDir, {recursive: true});
  fs.writeFileSync(path.join(outDir, 'product-seo-resolution.csv'), [cols, ...issues.map(i => cols.map(c => i[c]))].map(r => r.map(csv).join(',')).join('\n') + '\n');
  fs.writeFileSync(path.join(outDir, 'product-seo-dryrun-summary.json'), JSON.stringify({mode: 'DRY RUN: nothing was changed in the shop', snapshotRows: rows.length, ...summary}, null, 1) + '\n');
  console.log(JSON.stringify(summary));
}
