#!/usr/bin/env node
/* Records real browser playback results in the channel list.
 *   node tools/apply-playback.mjs result1.json [result2.json ...]
 * Each result file is an array from the playback test (one <video> per stream, pass = the playhead advanced >= 3 s).
 *   played  -> chk "ok"    (listed first)
 *   failed  -> chk "fail"  (kept, labelled "may be offline", listed last: a stream blocked from one region can work in another)
 * Writes data/livetv/playback-report.json with the counts and the reason for every failure. Nothing is removed from the catalogue. */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const file = path.join(ROOT, 'data/livetv/channels.js'); const src = fs.readFileSync(file, 'utf8');
const a = src.indexOf('{'), b = src.lastIndexOf('}') + 1; const db = JSON.parse(src.slice(a, b));
const results = process.argv.slice(2).flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const by = new Map(results.map(r => [r.id, r])); let ok = 0, fail = 0;
for (const c of db.items) { const r = by.get(c.id); if (!r) continue; if (r.ok) { c.chk = 'ok'; ok++; } else { c.chk = 'fail'; fail++; } }
fs.writeFileSync(file, src.slice(0, a) + JSON.stringify(db) + src.slice(b));
const reasons = {}; results.filter(r => !r.ok).forEach(r => { const k = String(r.err || 'no playback').replace(/\d{3}$/, m => m).slice(0, 60); reasons[k] = (reasons[k] || 0) + 1; });
const byType = {}; results.forEach(r => { byType[r.type] = byType[r.type] || { tested: 0, played: 0 }; byType[r.type].tested++; if (r.ok) byType[r.type].played++; });
const total = db.items.length, ext = db.items.filter(c => c.ext).length, yt = db.items.filter(c => c.type === 'youtube').length, frames = db.items.filter(c => c.type === 'iframe').length;
fs.writeFileSync(path.join(ROOT, 'data/livetv/playback-report.json'), JSON.stringify({
  testedAt: new Date().toISOString().slice(0, 10), method: 'Real playback in Chrome from https://kosama685.github.io: one video element per stream; pass = the playhead advanced at least 3 seconds (not just a playlist response)',
  configuredChannels: total, browserStreamsTested: results.length, played: ok, failed: fail, byType, failureReasons: reasons,
  notTestedHere: { vlcOnly: ext, youtubeEmbeds: yt, broadcasterEmbeds: frames, note: 'VLC-only channels cannot play in a browser by design; embeds are played by the broadcaster\'s own player' },
  failedChannels: results.filter(r => !r.ok).map(r => ({ id: r.id, name: r.name, country: r.cc, type: r.type, error: r.err }))
}, null, 1));
console.log(`channels ${total} | tested ${results.length} | played ${ok} | failed ${fail}`, reasons);
