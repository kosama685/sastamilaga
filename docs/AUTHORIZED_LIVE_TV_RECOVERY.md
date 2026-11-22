# Sasta Milaga · Authorized Live-Stream Playback Recovery Runbook
Updated 2026-11-22. This document covers streams that **you host or have explicit rights to redistribute**. Never use spoofed request headers, an open proxy, harvested credentials, DRM bypass, or a generic third-party URL proxy to access an unlicensed broadcaster.

## 0. Capture a reproducible case

Write down channel ID, UTC time, user country/network, browser and version, player, source protocol (HLS/DASH/MP4), and an error **category**. Never copy signed media URLs, Authorization headers, DRM tokens, playback cookies or user PII into public GitHub Issues.

Recent source-observation data in \`data/livetv/playback-report.json\` (2026-11-22T20:09Z) list 39,844 channels, 26,281 unique URLs, 95 observed OK, 14,652 dead, 4,566 needs-player, 20,531 no-source; this run tested **0** URLs and should not be treated as proof that any channel currently works or is licensed.

## 1. Browser diagnosis: one manifest, one segment, one playback attempt

1. Open the page → F12 → **Network** → enable **Preserve log** and **Disable cache** → filter **m3u8**, **mpd**, **m4s**, **ts**, **key**, **license**. Reload and click Play. Keep the Console open.
2. Find the master manifest and any variant manifest. Inspect Status, Remote Address, Request URL host, Initiator, **Origin** and **Referer** sent by the browser, Response **Access-Control-Allow-Origin** and \`Vary: Origin\`; inspect actual response and redirect chain. Follow *each* child segment: the manifest being HTTP 200 is not proof that video segments can be downloaded.
3. Typical evidence:
   - **403/401**: authorization, geographic/entitlement rules, or upstream hotlink policy. CORS cannot fix a real access denial. On **your** origin, correct the allowlist and credentials; on third-party sources, use the broadcaster's authorized website/app.
   - **CORS**: Console explicitly reports a CORS policy failure, often manifest/segment response absent to JS despite an HTTP response. Set CORS headers **on your own media origin and its manifest/segment responses**.
   - **404/410**: expired manifest, child playlist, segment path or token. Check the stream packager and URL lifetime.
   - **200 + HTML instead of video playlist**: authentication/geo error page or reverse-proxy fallback. Manifest must start \`#EXTM3U\`; DASH must be valid MPD XML.
   - **Encrypted manifest / license failures**: DRM uses EME/CDM and a legitimate license service. VLC is not a Widevine DRM client. Use your licensed player integration; do not extract keys.
   - **Mixed content**: HTTPS site requests HTTP manifest, segment, key or license. Migrate *every* resource to HTTPS.
   - **MediaError / unsupported codecs**: compare codec profiles with device support; H.264/AAC or supported DASH codecs can be offered by your own encoder.
   - **Stalls/partial fragments**: non-monotonic timestamps, wrong \`Content-Length\`/\`Content-Range\`, old segments, origin/edge caching, bitrate spikes or a failing source.
4. Collect sanitized request IDs and response code; retry once with blockers disabled **only as an isolation test**, then restore them. Don't advise users to disable security permanently.

## 2. Your media origin: terminal commands

Replace the placeholder with your own licensed host. Only run diagnostics against hosts for which you have permission.

\`\`\`bash
export URL="https://media.example.net/live/demo/index.m3u8"
# HEAD gives initial headers; many servers disable HEAD, so also test real GET:
curl -sSIL --max-time 15 "$URL"
curl -sS -D /tmp/hls-headers.txt -o /tmp/hls-manifest.m3u8 \
  -H "Origin: https://sastamilaga.com" --max-time 20 "$URL"
head -n 24 /tmp/hls-headers.txt
head -n 30 /tmp/hls-manifest.m3u8
# Test browser preflight only when the request truly triggers preflight:
curl -i -X OPTIONS "$URL" \
  -H "Origin: https://sastamilaga.com" \
  -H "Access-Control-Request-Method: GET"
ffprobe -v warning -show_streams -show_format -of json "$URL"
ffprobe -v error -show_entries stream=index,codec_name,codec_type,profile,width,height,level \
  -of json "$URL"
# Inspect decoding/segment errors for 15 seconds, without rehosting third-party content:
ffmpeg -hide_banner -loglevel warning -i "$URL" -t 15 -f null -
\`\`\`

If the URL uses a short-lived token, don't paste that token into a ticket. Follow up with a bounded probe on one of **your own** child variant playlists or segments (test 200/206, Content-Type and content bytes). A HEAD request alone cannot prove that HLS playback works.

## 3. VLC for licensed HLS/DASH

In VLC: **Media → Open Network Stream → Network**, paste your authorized media URL → Play. For buffering: **Tools → Preferences → Input/Codecs → Network caching (ms)**, test 1000–3000 ms; higher cache reduces stalls but increases live latency.

\`\`\`bash
vlc --network-caching=1800 \
  --http-user-agent="SastaMilaga-AuthorizedPlayer/1.0" \
  --http-referrer="https://sastamilaga.com/" \
  "https://media.example.net/live/demo/index.m3u8"
# Inspect which switches your installed VLC supports:
vlc --longhelp --advanced | grep -Ei "http-referrer|http-user-agent|network-caching|avcodec-hw"
\`\`\`

Use these headers **only for a media server you administer or have explicit authorization to access**. Depending on VLC version, per-item syntax \`:http-referrer=...\` and \`:http-user-agent=...\` may be supported instead. If playback has green/purple frames, test switching **Hardware-accelerated decoding** between Automatic and Disabled under Input/Codecs and compare. VLC cannot provide a Widevine license; DRM streams require a broadcaster-authorized browser/app or licensed DRM SDK.

## 4. Fix CORS and access rules on YOUR Nginx media server

Permit the particular web origin and ensure the headers are returned by **both** m3u8/mpd and segment/key paths. A mere JS player change cannot make CORS work.

\`\`\`nginx
server {
    listen 443 ssl;
    server_name media.example.net;
    # ssl_certificate ...;
    # ssl_certificate_key ...;
    location /live/ {
        add_header Access-Control-Allow-Origin "https://sastamilaga.com" always;
        add_header Vary "Origin" always;
        add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Range, Content-Type" always;
        add_header Access-Control-Expose-Headers "Content-Length, Content-Range, Accept-Ranges" always;
        if ($request_method = OPTIONS) { return 204; }
        # Use your real HLS/DASH origin/packager storage, not an open third-party proxy:
        alias /srv/media/live/;
        types {
            application/vnd.apple.mpegurl m3u8;
            application/dash+xml mpd;
            video/mp2t ts;
            video/mp4 mp4 m4s;
        }
    }
}
\`\`\`

Run \`sudo nginx -t && sudo systemctl reload nginx\`, then repeat the \`curl\` Origin/GET checks. If Cloudflare caches a stale \`Access-Control-Allow-Origin\`, purge the specific media URL with the appropriate Origin or let its TTL expire. Keep Referer-only rules as secondary controls; use signed URLs, tokens or authenticated sessions for real authorization.

## 5. Browser player and legal DRM

- **HLS.js** uses the browser's Media Source Extensions; fallback to the native HTML5 HLS player only where supported (not every browser supports HLS natively).
- **DASH.js** requires a supported video/codec/container; encrypted DASH requires a separate EME and license-server integration.
- In Chrome/Edge/Firefox, verify the browser is current, proprietary codec/DRM components are enabled, media autoplay policy is satisfied, and \`navigator.requestMediaKeySystemAccess\` succeeds for the licensed key system. An iframe also needs a suitable Permissions-Policy for encrypted-media.
- Do not copy DRM license URLs, cookies or keys into JS sources, GitHub actions or public M3U files. An encrypted stream is not unprotected because a manifest can be downloaded.

## 6. Owned-origin Cloudflare Worker example

See \`examples/owned-hls-proxy/worker.mjs\` for a **fail-closed** example. To use it, configure \`OWNED_STREAM_ORIGIN=https://media.example.net\` and \`OWNED_STREAM_TOKEN\` using a Worker secret and map **only** the chosen \`/owned-media/*\` path. This Worker never accepts arbitrary remote hosts or URL parameters and must not be attached to any third-party broadcast URL. It rewrites same-origin nested HLS manifest/segment paths, denies redirects to unknown hosts and restricts CORS to the site's origins. Run the included tests before connecting a route.

A generic \`https://proxy.example/<any remote URL>\` is prohibited: it becomes an SSRF/open-proxy and can evade copyright, entitlement and access restrictions. A Worker cannot solve Widevine licensing.

### Same-origin local Node proxy, for a controlled staging host

\`\`\`js
// owned-media-proxy.mjs — Node 22+, only for assets in your own local packager.
import http from 'node:http';
const upstream = 'https://media.example.net';
http.createServer(async (req,res) => {
  if (!['GET','HEAD'].includes(req.method) || !/^\/owned-media\/[a-zA-Z0-9_./-]+(?:\?.*)?$/.test(req.url)) {
    res.writeHead(404); res.end('Not available'); return;
  }
  const target = new URL(req.url.replace(/^\/owned-media/, ''), upstream);
  if (target.origin !== upstream || target.pathname.includes('..')) {res.writeHead(403);res.end();return;}
  try {
    const r=await fetch(target,{redirect:'manual',headers:{'User-Agent':'AuthorizedMediaTesting/1.0'}});
    if (r.status>=300&&r.status<400){res.writeHead(502);res.end('Redirect blocked');return;}
    res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/octet-stream',
      'Access-Control-Allow-Origin':'http://localhost:3000','Vary':'Origin','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD'){res.end();return;}
    for await (const chunk of r.body)res.write(chunk);
    res.end();
  } catch {res.writeHead(502);res.end('Owned stream unavailable');}
}).listen(8787,'127.0.0.1');
\`\`\`

This small Node example proxies a **single direct owned resource**; for production HLS it must also rewrite same-origin nested manifest paths (see the Worker) and enforce TLS, authentication, quota, and bandwidth controls. It is not a universal HLS proxy.

## 7. Playlist for authorized channels

\`\`\`m3u
#EXTM3U
#EXTINF:-1 tvg-id="owned-demo" group-title="Licensed Live",Owned Demo
https://sastamilaga.com/owned-media/live/demo/index.m3u8
\`\`\`

Only append channels you own or are explicitly licensed to redistribute. Do not bulk-rewrite the repository's \`data/livetv/playlist.m3u\` from aggregator URLs to an unrestricted proxy.

- **VLC**: Media → Open File/Open Network Stream or Media → Open Playlist.
- **MX Player**: Network Stream → paste HLS URL; codec support depends on device.
- **TiviMate**: Add playlist → M3U playlist → enter your HTTPS M3U URL; supported external-player selection varies by version.
- **Kodi**: enable PVR IPTV Simple Client → configure remote M3U path; for DRM, use the authorized add-on and InputStream Adaptive where permitted.
- **Jellyfin/Emby**: configure Live TV with a supported M3U tuner; ensure direct streams and transcode policy are permitted.
- **Plex**: native arbitrary M3U ingestion is not generally available; a compatible tuner bridge/plugin may be required. Don't treat Plex as a drop-in M3U player.

## 8. Official sources and rights verification

Locate the broadcaster's verified website/streaming page or official app-store listing. Confirm published owner, geographic restrictions, embed policy, redistribution rights, playback platform, and duration of authorization in a written agreement. For an aggregator (including IPTV directories), entries and reachability **do not establish redistribution rights**. If access fails with 403, stop and request a permitted embed/license from the owner. If a channel disappears, keep a descriptive listing and link to the official provider rather than fabricating a proxy link.

## 9. QA and rollback

1. Test your origin manifest, one variant, encryption/key requirements and 3 consecutive segments. Confirm the browser sees 200/206 and matching CORS headers.
2. Test Safari/native HLS; Chrome/HLS.js; Edge/DASH; Android external player; one mobile data and one desktop connection.
3. Compare 30 s playback: startup under acceptable latency, uninterrupted audio/video and stall/recovery counts.
4. Verify restricted/unlicensed/DRM sources **fail closed**, do not loop endlessly or leak secret URLs. Channels may remain discoverable.
5. Validate \`node --test tools/live-tv-hub.test.mjs\` and GitHub Actions \`World TV catalogue and player regression\`.
6. Roll back the player JS commit via GitHub revert or redeploy the last known-good static release if error rate increases. Do not change checkout or Cloudflare commerce routes to fix video.

## References

- https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- https://developer.mozilla.org/en-US/docs/Web/API/Encrypted_Media_Extensions_API
- https://developers.cloudflare.com/cache/cache-security/cors/
- https://ffmpeg.org/ffprobe.html
- https://docs.videojs.com/ and https://github.com/video-dev/hls.js
