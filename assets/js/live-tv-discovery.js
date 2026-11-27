(function (g) {
  "use strict";
  const cache = new Map();
  function countryFromTrace(text) {
    return String(text).match(/^loc=([A-Z]{2})$/m)?.[1] || "";
  }
  function nowNext(programmes, now = Date.now()) {
    const rows = (Array.isArray(programmes) ? programmes : [])
      .filter(
        (p) =>
          typeof p.title === "string" &&
          Number.isFinite(Date.parse(p.start)) &&
          Number.isFinite(Date.parse(p.stop)),
      )
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    return {
      now:
        rows.find(
          (p) => Date.parse(p.start) <= now && Date.parse(p.stop) > now,
        ) || null,
      next: rows.find((p) => Date.parse(p.start) > now) || null,
    };
  }
  function scheduleRows(programmes, query = "") {
    const fold = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const words = fold(query).trim().split(/\s+/).filter(Boolean);
    return (Array.isArray(programmes) ? programmes : []).filter(p =>
      typeof p?.title === "string" && Number.isFinite(Date.parse(p.start)) &&
      Number.isFinite(Date.parse(p.stop)) && Date.parse(p.stop) > Date.parse(p.start) &&
      words.every(word => fold(p.title + " " + (p.description || "")).includes(word))
    ).sort((a,b) => Date.parse(a.start) - Date.parse(b.start));
  }
  async function detectCountry() {
    try {
      const r = await fetch("/cdn-cgi/trace", {
        signal: AbortSignal.timeout(3500),
        cache: "no-store",
      });
      return r.ok ? countryFromTrace(await r.text()) : "";
    } catch {
      return "";
    }
  }
  async function programmes(channel) {
    const id = channel.upstreamId || channel.tvgIds?.[0]?.split("@")[0];
    if (!id) return { programmes: [], reason: "No matched programme guide" };
    const saved = cache.get(id);
    if (saved && Date.now() - saved.at < 15 * 60 * 1000) return saved.data;
    try {
      const r = await fetch(
        "https://dearbulut.github.io/iptv/epg/channels/" +
          encodeURIComponent(id) +
          ".json",
        { signal: AbortSignal.timeout(8000) },
      );
      if (!r.ok) throw Error("Guide not supplied");
      const reader = r.body.getReader();
      let text = "",
        size = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if ((size += value.length) > 2000000) throw Error("Guide too large");
          text += decoder.decode(value, { stream: true });
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      const data = JSON.parse(text);
      if (data.channel !== id) throw Error("Guide channel mismatch");
      cache.set(id, { at: Date.now(), data });
      return data;
    } catch {
      return {
        programmes: [],
        reason: "Programme guide currently unavailable",
      };
    }
  }
  g.SLTVDiscovery = Object.freeze({
    countryFromTrace,
    nowNext,
    scheduleRows,
    detectCountry,
    programmes,
  });
})(typeof window !== "undefined" ? window : globalThis);
