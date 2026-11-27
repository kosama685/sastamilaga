#!/usr/bin/env node
/**
 * Read-only measurement of the supplier catalogue SNAPSHOT (data/cj/manifest.js + c/<category>.js shards).
 * It measures the snapshot, not live stock or prices. Output: reports/catalog-snapshot-metrics.json
 * Usage: node tools/measure-catalog-snapshot.mjs [baseUrl]   (default: the GitHub Pages site; 1 request at a time)
 * Row layout (from the shards): [id, sku, name, priceLow, priceHigh, imageUrl, videoUrl]
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'https://kosama685.github.io/sastamilaga').replace(/\/$/, '') + '/data/cj/';
const get = async p => { for (let i = 0; i < 3; i++) { try { const r = await fetch(base + p, {signal: AbortSignal.timeout(60000)}); if (r.ok) return await r.text(); } catch {} await new Promise(r => setTimeout(r, 1500 * (i + 1))); } return null; };
const manifestText = await get('manifest.js');
if (!manifestText) throw new Error('manifest unavailable');
const manifest = JSON.parse(manifestText.slice(manifestText.indexOf('{'), manifestText.lastIndexOf('}') + 1));
const cats = manifest.cats || [];
const m = {snapshot: manifest.snapshot, declaredTotal: manifest.total, categories: cats.length, groups: (manifest.groups || []).length, shardsRead: 0, shardsFailed: [],
  rows: 0, noImage: 0, noPrice: 0, noName: 0, noSku: 0, withVideo: 0, shortName: 0, dupId: 0, dupSku: 0, dupName: 0, priceMin: null, priceMax: null, perGroup: {}};
const ids = new Set(), skus = new Set(), names = new Set();
for (const c of cats) {
  const t = await get(`c/${c.s}.js`);
  if (!t) { m.shardsFailed.push(c.s); continue; }
  let rows; try { rows = JSON.parse(t.slice(t.indexOf('[', t.indexOf(',')), t.lastIndexOf(']') + 1)); } catch { m.shardsFailed.push(c.s + ':parse'); continue; }
  m.shardsRead++;
  const g = (m.perGroup[c.g] ||= {rows: 0, noImage: 0, noPrice: 0, withVideo: 0});
  for (const [id, sku, name, lo, , img, video] of rows) {
    m.rows++; g.rows++;
    if (!/^https?:\/\//.test(img || '')) { m.noImage++; g.noImage++; }
    if (!(lo > 0)) { m.noPrice++; g.noPrice++; } else { m.priceMin = m.priceMin === null ? lo : Math.min(m.priceMin, lo); m.priceMax = m.priceMax === null ? lo : Math.max(m.priceMax, lo); }
    if (!name) m.noName++; else if (String(name).length < 15) m.shortName++;
    if (!sku) m.noSku++;
    if (video) { m.withVideo++; g.withVideo++; }
    if (ids.has(id)) m.dupId++; else ids.add(id);
    if (sku) { if (skus.has(sku)) m.dupSku++; else skus.add(sku); }
    const key = String(name || '').trim().toLowerCase(); if (key) { if (names.has(key)) m.dupName++; else names.add(key); }
  }
}
m.measuredAt = new Date().toISOString();
m.note = 'Measures the dated GitHub Pages snapshot only. Live stock, live price and publication status are NOT measured here. Video links in the snapshot are known to return 403 and are counted only as "has a stored video link".';
fs.mkdirSync(path.join(root, 'reports'), {recursive: true});
fs.writeFileSync(path.join(root, 'reports/catalog-snapshot-metrics.json'), JSON.stringify(m, null, 2) + '\n');
console.log(JSON.stringify({rows: m.rows, declaredTotal: m.declaredTotal, categories: m.categories, shardsRead: m.shardsRead, shardsFailed: m.shardsFailed.length}));
