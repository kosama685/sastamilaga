// Builds data/livetv/channels.js from the Free-TV/IPTV playlist (free-to-air channels, github.com/Free-TV/IPTV).
// Usage: node tools/build-livetv.mjs [playlist-url-or-file]   (run daily by .github/workflows/blog-schedule.yml)
// Every channel in the playlist is kept. Free-TV marks: Ⓖ geo-blocked, Ⓨ YouTube, Ⓢ not 24/7, Ⓣ Twitch.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SRC = process.argv.slice(2).find(a => !a.startsWith('--')) || 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
const text = /^https?:/.test(SRC) ? await (await fetch(SRC)).text() : fs.readFileSync(SRC, 'utf8');
if (!text.startsWith('#EXTM3U')) { console.error('Not an M3U playlist'); process.exit(1); }

const attr = (line, k) => { const m = line.match(new RegExp(k + '="([^"]*)"')); return m ? m[1] : ''; };
const CATS = [['News', /\b(news|cnn|jazeera|euronews|france ?24|dw|trt world|cgtn|nhk world|haber|noticias|nachrichten|nieuws|notizie|info)\b/i],
  ['Religious', /\b(quran|qur'an|islam|islamic|makkah|mecca|madinah|madina|peace tv|sunnah|iqra|church|catholic|christian|god|gospel|ewtn|bible|hope|daystar|vatican)\b/i],
  ['Kids', /\b(kids?|cartoon|junior|baby|children|toon|disney|nick)\b/i], ['Sports', /\b(sports?|sport|football|racing|golf|tennis|fight|olymp)/i],
  ['Music', /\b(music|mtv|hits|radio|fm|concert)\b/i]];
const items = []; let id = 0;
const lines = text.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i]; if (!l.startsWith('#EXTINF')) continue;
  let url = ''; for (let j = i + 1; j < lines.length; j++) { const u = lines[j].trim(); if (!u || u.startsWith('#')) continue; url = u; break; }
  if (!url) continue;
  const raw = l.slice(l.lastIndexOf(',') + 1).trim();
  const marks = (raw.match(/[ⒼⓎⓈⓉ]/g) || []).join('');
  const name = raw.replace(/[ⒼⓎⓈⓉ]/g, '').replace(/\s+/g, ' ').trim() || attr(l, 'tvg-name');
  let cc = (attr(l, 'tvg-country').split(/[;,\s]/)[0] || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(cc) || cc === 'UK') cc = cc === 'UK' ? 'GB' : '';
  // Player type: HLS (hls.js), DASH (dash.js), MP4 (native), YouTube / Twitch / Dailymotion (official embeds).
  // http:// (blocked on https pages), rtsp:// and web pages stay "external": VLC app, .m3u download or copy link.
  const https = url.startsWith('https://');
  const twitch = url.match(/twitch\.tv\/([\w-]+)/i), dm = url.match(/dailymotion\.com\/video\/([\w]+)/i);
  let type = 'hls', src = url, ext = true;
  if (/youtu\.?be/.test(url)) { type = 'youtube'; ext = false; }
  else if (twitch) { type = 'iframe'; src = `https://player.twitch.tv/?channel=${twitch[1]}&parent=kosama685.github.io&parent=localhost&muted=false`; ext = false; }
  else if (dm) { type = 'iframe'; src = `https://www.dailymotion.com/embed/video/${dm[1]}?autoplay=1`; ext = false; }
  else if (https && /\.m3u8(\?|$)/i.test(url)) { type = 'hls'; ext = false; }
  else if (https && /\.mpd(\?|$)/i.test(url)) { type = 'dash'; ext = false; }
  else if (https && /\.mp4(\?|$)/i.test(url)) { type = 'mp4'; ext = false; }
  const cat = (CATS.find(([, re]) => re.test(name)) || ['General'])[0];
  items.push({ id: ++id, name, logo: attr(l, 'tvg-logo'), cc, cat, type, src, ext, ...(src !== url ? { page: url } : {}),
    ...(marks.includes('Ⓖ') ? { geo: true } : {}), ...(marks.includes('Ⓢ') ? { part: true } : {}), group: attr(l, 'group-title') });
}
// Second source: the channels published in the WordPress Live TV plugin (data/livetv/wp-channels.json, a read-only export of its table).
// Same classification as above. A channel whose stream address is already in the first source is not repeated.
{
  const wf = path.join(ROOT, 'data/livetv/wp-channels.json');
  if (fs.existsSync(wf)) {
    const norm = u => String(u).trim().replace(/^http:\/\//i, 'https://').replace(/[?#].*$/, '').toLowerCase();
    const seen = new Set(items.map(c => norm(c.page || c.src))); let added = 0, dup = 0;
    for (const w of JSON.parse(fs.readFileSync(wf, 'utf8'))) {
      const url = String(w.src || '').trim(); if (!url) continue; if (seen.has(norm(url))) { dup++; continue; } seen.add(norm(url));
      const https = url.startsWith('https://'); let type = 'hls', src = url, ext = true;
      if (/youtu\.?be/.test(url)) { type = 'youtube'; ext = false; }
      else if (https && /\.mpd(\?|$)/i.test(url)) { type = 'dash'; ext = false; }
      else if (https && (w.type === 'mp4' || /\.mp4(\?|$)/i.test(url))) { type = 'mp4'; ext = false; }
      else if (https) { type = 'hls'; ext = false; }
      const cc = /^[A-Z]{2}$/.test(String(w.cc || '').toUpperCase()) ? String(w.cc).toUpperCase() : '';
      items.push({ id: ++id, name: String(w.name || '').replace(/\s+/g, ' ').trim(), logo: String(w.logo || '').replace(/^http:\/\//i, 'https://'), cc, cat: w.cat || 'General', type, src, ext, group: '', wp: 1 }); added++;
    }
    console.log(`WordPress channels: ${added} added, ${dup} already in the playlist`);
  }
}
/* --check: test each browser-playable stream the way a browser would (Origin header, playlist then first video segment).
   A stream that answers without CORS permission can never play on this site, so it goes straight to the VLC option instead of
   failing in the player. Nothing else is changed: unreachable ones are only marked (chk:"fail") because they may be region-locked. */
if (process.argv.includes('--check')) {
  const ORIGIN = 'https://kosama685.github.io', UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
  const get = async (u, ms = 9000, range) => { const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms); try { return await fetch(u, { headers: { Origin: ORIGIN, 'User-Agent': UA, ...(range ? { Range: 'bytes=0-1023' } : {}) }, signal: ac.signal, redirect: 'follow' }); } finally { clearTimeout(t); } };
  const cors = r => { const a = r.headers.get('access-control-allow-origin'); return a === '*' || a === ORIGIN; };
  const first = (text, after) => { const L = text.split(/\r?\n/); for (let i = 0; i < L.length; i++) if (L[i] && !L[i].startsWith('#') && (!after || /#EXT-X-STREAM-INF/.test(L[i - 1] || ''))) return L[i]; return ''; };
  async function probe(c) {
    if (c.ext || c.type !== 'hls') return;
    try {
      let r = await get(c.src); if (!r.ok) { c.chk = 'fail'; return; }
      if (!cors(r)) { c.ext = true; c.why = 'cors'; return; }
      let text = await r.text(), base = r.url;
      if (/#EXT-X-STREAM-INF/.test(text)) { const v = first(text, true); if (v) { base = new URL(v, base).href; r = await get(base); if (!r.ok) { c.chk = 'fail'; return; } if (!cors(r)) { c.ext = true; c.why = 'cors'; return; } text = await r.text(); } }
      const seg = first(text); if (!seg) return;
      const sr = await get(new URL(seg, base).href, 9000, true); const ok = sr.ok || sr.status === 206; try { await sr.body?.cancel(); } catch (e) { }
      if (!ok) { c.chk = 'fail'; return; }
      if (!cors(sr)) { c.ext = true; c.why = 'cors'; }
    } catch (e) { c.chk = 'fail'; }
  }
  const queue = items.filter(c => c.type === 'hls' && !c.ext); let done = 0;
  // Each channel gets an overall limit (a stream that sends headers and then never finishes its body would otherwise block a worker forever).
  const limited = async c => { let t; await Promise.race([probe(c), new Promise(res => { t = setTimeout(() => { c.chk = 'fail'; res(); }, 30000); })]); clearTimeout(t); };
  await Promise.all(Array.from({ length: 32 }, async () => { while (queue.length) { await limited(queue.shift()); if (++done % 200 === 0) console.log(`checked ${done}`); } }));
  console.log(`check: ${items.filter(c => c.why === 'cors').length} need VLC (no CORS), ${items.filter(c => c.chk === 'fail').length} unreachable from here`);
}
const count = key => Object.entries(items.reduce((a, c) => (c[key] && (a[c[key]] = (a[c[key]] || 0) + 1), a), {})).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
const db = { source: SRC, license: 'Free-TV/IPTV playlist (free-to-air channels only)', snapshot: new Date().toISOString().slice(0, 10), perPage: 60,
  facets: { total: items.length, countries: count('cc'), categories: count('cat') }, items };
fs.mkdirSync(path.join(ROOT, 'data/livetv'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/livetv/channels.js'), '/* Live TV channels from the Free-TV/IPTV playlist (github.com/Free-TV/IPTV), rebuilt by tools/build-livetv.mjs. Do not edit by hand. */\nwindow.SM_LIVETV=' + JSON.stringify(db) + ';\n');
const by = t => items.filter(t).length;
console.log(`${items.length} channels · ${db.facets.countries.length} countries · HLS ${by(c => c.type === 'hls' && !c.ext)} · DASH ${by(c => c.type === 'dash')} · MP4 ${by(c => c.type === 'mp4')} · YouTube ${by(c => c.type === 'youtube')} · Twitch/Dailymotion ${by(c => c.type === 'iframe')} · external (VLC/app) ${by(c => c.ext)} · geo-blocked ${by(c => c.geo)}`);
