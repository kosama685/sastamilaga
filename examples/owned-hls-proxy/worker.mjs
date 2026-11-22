/**
 * Authorized-only HLS media relay for infrastructure under your control.
 * NO arbitrary remote URL, NO third-party hotlink bypass, NO DRM license proxy.
 * Env secrets (not in git): OWNED_STREAM_ORIGIN=https://media.example.net,
 * OWNED_STREAM_BEARER=<credential issued by that same origin>.
 * Route: https://sastamilaga.com/owned-media/live/example/index.m3u8
 */
const WEB_ORIGIN = 'https://sastamilaga.com';
const URL_PREFIX = '/owned-media/';
const SOURCE_PREFIX = '/live/';
const ALLOWED_MEDIA_EXT = /\.(?:m3u8|ts|m4s|mp4|aac|mp3|vtt|key|webvtt)$/i;

function originConfig(env) {
  const u = new URL(String(env?.OWNED_STREAM_ORIGIN || ''));
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash ||
      u.pathname !== '/' || !u.hostname) throw Error('Configure an HTTPS origin owned by this organization.');
  if (!env?.OWNED_STREAM_BEARER || typeof env.OWNED_STREAM_BEARER !== 'string') throw Error('Origin bearer secret missing');
  return u;
}
function toSource(requestUrl, base) {
  const u = new URL(requestUrl);
  if (!u.pathname.startsWith(URL_PREFIX) || /%2f|%5c|%2e|\\/i.test(u.pathname))
    throw Error('Unapproved media path');
  const p = u.pathname.slice(URL_PREFIX.length - 1);
  if (!p.startsWith(SOURCE_PREFIX) || !ALLOWED_MEDIA_EXT.test(p)) throw Error('Media path outside the permitted /live/ tree');
  const target = new URL(p + u.search, base);
  if (target.origin !== base.origin || !target.pathname.startsWith(SOURCE_PREFIX))
    throw Error('Media target outside the allowed origin');
  return target;
}
function playlistURL(raw, parent, origin) {
  const target = new URL(raw, parent);
  if (target.origin !== origin.origin ||
      !target.pathname.startsWith(SOURCE_PREFIX) ||
      !ALLOWED_MEDIA_EXT.test(target.pathname) ||
      target.username || target.password)
    throw Error('Cross-origin or unapproved HLS child URI');
  return URL_PREFIX.slice(0, -1) + target.pathname + target.search;
}
function rewriteHLS(text, parent, origin) {
  if (!String(text).trimStart().startsWith('#EXTM3U')) throw Error('Upstream content is not a valid HLS playlist');
  if (text.length > 1024 * 1024) throw Error('Playlist exceeds 1 MiB policy');
  return text.split(/\r?\n/).map(line => {
    if (/^\s*#/.test(line)) {
      // Rewrite same-origin HLS URI attributes (KEY, MAP, MEDIA, I-FRAME-STREAM-INF).
      return line.replace(/URI="([^"]+)"/g, (_all, src) => 'URI="' +
        playlistURL(src, parent, origin) + '"');
    }
    if (!line.trim()) return line;
    return playlistURL(line.trim(), parent, origin);
  }).join('\n');
}
function responseHeaders(reqOrigin, contentType) {
  const h = new Headers({
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
  });
  if (reqOrigin === WEB_ORIGIN) {
    h.set('Access-Control-Allow-Origin', WEB_ORIGIN);
    h.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'Range');
    h.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length');
  }
  return h;
}
export async function handle(request, env, fetcher=fetch) {
  const url = new URL(request.url);
  const caller = request.headers.get('Origin') || '';
  const basic = responseHeaders(caller, 'text/plain; charset=utf-8');
  if (caller && caller !== WEB_ORIGIN) return new Response('Origin not allowed', {status:403,headers:basic});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:basic});
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{...Object.fromEntries(basic),Allow:'GET, HEAD, OPTIONS'}});
  let source, root;
  try { root=originConfig(env); source=toSource(request.url,root); }
  catch { return new Response('Owned media route is not configured', {status:503,headers:basic}); }
  let upstream;
  try {
    const headers = new Headers({
      'Authorization': 'Bearer ' + env.OWNED_STREAM_BEARER,
      'User-Agent': 'SastaMilaga-AuthorizedMediaRelay/1.0',
      'Referer': WEB_ORIGIN + '/',
      'Accept': '*/*'
    });
    const range = request.headers.get('Range');
    if (range && /^bytes=\d*-\d*$/.test(range)) headers.set('Range',range);
    upstream = await fetcher(source.toString(),{
      method:request.method,
      headers,
      redirect:'manual',
      signal:AbortSignal.timeout(12000)
    });
  } catch {
    return new Response('Owned origin unavailable',{status:502,headers:basic});
  }
  if (upstream.status >= 300 && upstream.status < 400)
    return new Response('Redirect outside the approved media route is denied',{status:502,headers:basic});
  const h=responseHeaders(caller,upstream.headers.get('Content-Type')||'application/octet-stream');
  if (!upstream.ok) return new Response('Authorized media not available',{status:upstream.status,headers:h});
  if (request.method === 'HEAD') return new Response(null,{status:upstream.status,headers:h});
  if (/\.m3u8$/i.test(source.pathname)) {
    try {
      const manifest = await upstream.text();
      const rewritten = rewriteHLS(manifest,source,root);
      h.set('Content-Type','application/vnd.apple.mpegurl; charset=utf-8');
      return new Response(rewritten,{status:200,headers:h});
    } catch { return new Response('Invalid or external HLS manifest resource',{status:502,headers:basic}); }
  }
  // Media chunks stream through without buffering entire video files in Worker memory.
  for (const key of ['Content-Length','Content-Range','Accept-Ranges'])
    if (upstream.headers.has(key)) h.set(key,upstream.headers.get(key));
  return new Response(upstream.body,{status:upstream.status,headers:h});
}
export default {fetch(request,env){return handle(request,env)}};
