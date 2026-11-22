/* Shared pure Live TV contracts, also exercised by Node regression tests. */
(function (g) {
  "use strict";
  const safeURL = (u) => {
    try {
      const x = new URL(u);
      return (
        ["https:", "http:", "rtsp:", "rtmp:", "udp:", "rtp:"].includes(
          x.protocol,
        ) &&
        !x.username &&
        !x.password
      );
    } catch {
      return false;
    }
  };
  function sources(ch) {
    const list = ch.sources?.length
      ? ch.sources
      : [
          {
            url: ch.httpSrc || ch.page || ch.src,
            type: ch.type || "hls",
            label: "Primary source",
          },
          ...(ch.fallback
            ? [{ url: ch.fallback, type: ch.type || "hls", label: "Mirror" }]
            : []),
        ];
    return list
      .filter((s) => s && safeURL(s.url))
      .map((s) => ({
        ...s,
        type: /(?:youtube\.com|youtu\.be)/i.test(s.url)
          ? "youtube"
          : /twitch\.tv\//i.test(s.url)
            ? "twitch"
            : s.type,
      }));
  }
  function plan(ch, index = 0, mode = "auto", native = false) {
    const all = sources(ch),
      order = [index, ...all.map((_, i) => i).filter((i) => i !== index)],
      seen = new Set(),
      result = [];
    function add(s, i, url, engine) {
      const key = url + "|" + engine;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ source: s, sourceIndex: i, url, engine });
      }
    }
    for (const i of order) {
      const s = all[i];
      if (!s) continue;
      const url = s.url.replace(/^http:/i, "https:");
      if (!/^https:/i.test(url)) continue;
      if (s.type === "hls") {
        if (mode !== "native") add(s, i, url, "hls");
        if (native || mode === "native") add(s, i, url, "native");
      } else if (
        ["dash", "mp4", "youtube", "twitch", "iframe"].includes(s.type)
      )
        add(s, i, url, s.type);
    }
    return result;
  }
  function windowRange(total, scroll, height, row = 88, overscan = 5) {
    const start = Math.max(0, Math.floor(scroll / row) - overscan),
      end = Math.min(total, Math.ceil((scroll + height) / row) + overscan);
    return {
      start,
      end,
      top: start * row,
      bottom: Math.max(0, (total - end) * row),
    };
  }
  function matches(ch, q, country = "", group = "", region = (x) => x) {
    q = String(q || "")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .trim();
    if (
      country &&
      (country === "__world"
        ? !!(ch.country || ch.cc)
        : (ch.country || ch.cc) !== country)
    )
      return false;
    if (
      group &&
      (ch.group || ch.cat) !== group &&
      !ch.categories?.includes(group)
    )
      return false;
    if (!q) return true;
    const text = [
      ch.name,
      ...(ch.alternateNames || []),
      ...(ch.languages || []),
      ...(ch.categories || []),
      ch.upstreamId,
      ch.country || ch.cc,
      region(ch.country || ch.cc),
      ch.group,
      ch.cat,
      ch.language,
      ch.languageDisplay,
    ]
      .join(" ")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase();
    return (
      (!country ||
        (country === "__world"
          ? !ch.country && !ch.cc
          : (ch.country || ch.cc) === country)) &&
      (!group ||
        (ch.group || ch.cat) === group ||
        ch.categories?.includes(group)) &&
      q
        .toLowerCase()
        .split(/\s+/)
        .every((w) => text.includes(w))
    );
  }
  function externalLinks(url, name, ua = "") {
    if (!safeURL(url)) return {};
    const intent = (packageName) =>
      "intent:" +
      url.replace(/#.*$/, "").replace(/^https?:/i, "") +
      "#Intent;scheme=" +
      (/^https:/i.test(url) ? "https" : "http") +
      ";package=" +
      packageName +
      ";S.title=" +
      encodeURIComponent(name) +
      ";end";
    return {
      vlc:
        /Android/i.test(ua) && /^https?:/i.test(url)
          ? intent("org.videolan.vlc")
          : /iPhone|iPad|iPod/i.test(ua)
            ? "vlc-x-callback://x-callback-url/stream?url=" +
              encodeURIComponent(url)
            : "vlc://" + url,
      mx:
        /Android/i.test(ua) && /^https?:/i.test(url)
          ? intent("com.mxtech.videoplayer.ad")
          : "mxplayer://?url=" + encodeURIComponent(url),
      mxPro:
        /Android/i.test(ua) && /^https?:/i.test(url)
          ? intent("com.mxtech.videoplayer.pro")
          : "mxplayer://?url=" + encodeURIComponent(url),
      iina: "iina://weblink?url=" + encodeURIComponent(url),
    };
  }
  // Classify browser evidence without claiming that CORS is proven by a generic network error.
  // No stream URLs, signed tokens or request headers are retained or reported.
  function diagnose(reason, statusCode = 0) {
    const detail = String(reason || "").slice(0, 250).toLowerCase();
    const status = Number(statusCode) || 0;
    if (status === 401 || status === 403 || /access.denied|forbidden|unauthorized/.test(detail))
      return { code: "ACCESS_DENIED", summary: "Upstream access was denied (401/403). Check authorization with the rights holder.", next: "Check the authorized origin, entitlement and server logs; do not spoof an unrelated broadcaster's Referer." };
    if ([404, 410].includes(status))
      return { code: "SOURCE_MISSING", summary: "The stream manifest or segment is missing (404/410).", next: "Check the official source URL and its segment paths." };
    if (status >= 500 && status <= 599)
      return { code: "UPSTREAM_ERROR", summary: "The source server returned a temporary error.", next: "Check upstream health, CDN origin and segment availability." };
    if (/drm|widevine|license|encrypted|key.system|protection/.test(detail))
      return { code: "DRM_ENTITLEMENT", summary: "This stream needs a supported DRM player and a valid license.", next: "Use the broadcaster's licensed app or your authorized EME/DRM integration. VLC cannot supply Widevine licenses." };
    if (/mixed.content|blocked.*http:/.test(detail))
      return { code: "MIXED_CONTENT", summary: "An HTTP media resource was blocked on an HTTPS page.", next: "Serve the manifest and all segments over HTTPS on your authorized host." };
    if (/codec|decode|media.error|frag.parsing|unsupported.format|unsupported.codec/.test(detail))
      return { code: "CODEC_UNSUPPORTED", summary: "The browser cannot decode this media format.", next: "Inspect codecs with ffprobe; provide browser-compatible H.264/AAC or a supported DASH/HLS rendition." };
    if (/stall|buffer|timeout|25 seconds|timed.out|no playback/.test(detail))
      return { code: "STALL_OR_TIMEOUT", summary: "Playback stalled or timed out.", next: "Inspect segment timings, bitrate, live window and upstream capacity." };
    if (/cors|network|manifest.load|frag.load|source unavailable/.test(detail))
      return { code: "NETWORK_OR_CORS", summary: "Browser media fetch failed; CORS is one possibility, not a confirmed cause.", next: "Inspect DevTools Network and Console: response status, Origin, CORS, redirects and segment requests." };
    return { code: "PLAYER_FAILURE", summary: "The browser could not play the selected source.", next: "Check the stream's official availability, format and player requirements." };
  }
  // Each attempt signals success or failure. A stale player cannot advance a newer channel.
  function failover({ attempt, onExhausted, onState }) {
    let run = 0,
      cleanup = () => {},
      queue = [],
      position = 0;
    function stop() {
      run++;
      cleanup();
      cleanup = () => {};
    }
    function start(plan) {
      stop();
      queue = plan;
      position = 0;
      const current = run;
      function next() {
        if (current !== run) return;
        cleanup();
        cleanup = () => {};
        const item = queue[position++];
        if (!item) {
          onExhausted();
          return;
        }
        onState?.(item, position, queue.length);
        let failed = false;
        const end = () => {
          if (failed || current !== run) return;
          failed = true;
          Promise.resolve().then(next);
        };
        cleanup =
          attempt(item, {
            failed: end,
            playing: () => {
              if (current === run && !failed)
                onState?.(item, position, queue.length, "playing");
            },
          }) || (() => {});
      }
      next();
    }
    return { start, stop };
  }
  function resolve(channels, id) {
    id = String(id);
    return (
      channels.find((c) => String(c.id) === id) ||
      channels.find((c) => c.aliases?.includes(id))
    );
  }
  g.SLTVCore = Object.freeze({
    resolve,
    safeURL,
    sources,
    plan,
    windowRange,
    matches,
    externalLinks,
    diagnose,
    failover,
  });
})(typeof window !== "undefined" ? window : globalThis);
