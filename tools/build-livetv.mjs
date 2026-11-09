// Builds data/livetv/channels.js from the Free-TV/IPTV playlist (free-to-air channels, github.com/Free-TV/IPTV).
// Usage: node tools/build-livetv.mjs [playlist-url-or-file]   (run daily by .github/workflows/blog-schedule.yml)
// Every channel in the playlist is kept. Free-TV marks: Ⓖ geo-blocked, Ⓨ YouTube, Ⓢ not 24/7, Ⓣ Twitch.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const SRC = process.argv[2] || 'https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8';
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
const count = key => Object.entries(items.reduce((a, c) => (c[key] && (a[c[key]] = (a[c[key]] || 0) + 1), a), {})).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
const db = { source: SRC, license: 'Free-TV/IPTV playlist (free-to-air channels only)', snapshot: new Date().toISOString().slice(0, 10), perPage: 60,
  facets: { total: items.length, countries: count('cc'), categories: count('cat') }, items };
fs.mkdirSync(path.join(ROOT, 'data/livetv'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data/livetv/channels.js'), '/* Live TV channels from the Free-TV/IPTV playlist (github.com/Free-TV/IPTV), rebuilt by tools/build-livetv.mjs. Do not edit by hand. */\nwindow.SM_LIVETV=' + JSON.stringify(db) + ';\n');
const by = t => items.filter(t).length;
console.log(`${items.length} channels · ${db.facets.countries.length} countries · HLS ${by(c => c.type === 'hls' && !c.ext)} · DASH ${by(c => c.type === 'dash')} · MP4 ${by(c => c.type === 'mp4')} · YouTube ${by(c => c.type === 'youtube')} · Twitch/Dailymotion ${by(c => c.type === 'iframe')} · external (VLC/app) ${by(c => c.ext)} · geo-blocked ${by(c => c.geo)}`);
