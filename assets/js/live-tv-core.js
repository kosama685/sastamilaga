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
    failover,
  });
})(typeof window !== "undefined" ? window : globalThis);
