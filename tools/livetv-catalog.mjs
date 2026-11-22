import { createHash } from "node:crypto";
export const countryCode = (s) =>
  String(s || "").toUpperCase() === "UK"
    ? "GB"
    : /^[A-Z]{2}$/i.test(s || "")
      ? String(s).toUpperCase()
      : "";
export const fold = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function streamType(url) {
  if (/(?:youtube\.com|youtu\.be)/i.test(url)) return "youtube";
  if (/twitch\.tv\//i.test(url)) return "twitch";
  if (/\.mpd(?:[?#]|$)/i.test(url)) return "dash";
  if (/\.m3u8?(?:[?#]|$)/i.test(url)) return "hls";
  if (/\.(?:mp4|webm|m4v)(?:[?#]|$)/i.test(url)) return "mp4";
  if (/\.ts(?:[?#]|$)/i.test(url)) return "ts";
  return "external";
}
function nameOf(s) {
  return String(s || "")
    .replace(/[ⒼⓎⓈⓉ]/g, "")
    .replace(/\s*\((?:\d{3,4}p|[248]K|HD|SD)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function attr(s, k) {
  return (
    s
      .match(new RegExp("(?:^|\\s)" + k + '=(?:"([^"]*)"|\x27([^\x27]*)\x27)'))
      ?.slice(1)
      .find((x) => x !== undefined) || ""
  );
}
function caption(line) {
  let quoted = false,
    quote = "";
  for (let i = 0; i < line.length; i++) {
    if (
      (line[i] === '"' || line[i] === "'") &&
      (!quoted || line[i] === quote)
    ) {
      quoted = !quoted;
      quote = line[i];
    } else if (line[i] === "," && !quoted) return line.slice(i + 1).trim();
  }
  return "";
}
export function parseM3U(
  text,
  { source = "playlist", country = "", metadata = new Map() } = {},
) {
  if (
    !String(text)
      .replace(/^\uFEFF/, "")
      .trimStart()
      .startsWith("#EXTM3U")
  )
    throw Error("Not an M3U playlist");
  const rows = [];
  let pending = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF:")) {
      pending = line;
      continue;
    }
    if (!pending || !line || line.startsWith("#")) continue;
    const tvgId = attr(pending, "tvg-id"),
      meta = metadata.get(tvgId) || {},
      name = nameOf(
        attr(pending, "tvg-name") || caption(pending) || meta.name || tvgId,
      );
    const cc = attr(pending, "tvg-country") || country || meta.country || "";
    const countries = [
      ...new Set(
        String(cc)
          .split(/[;,/\s]+/)
          .map(countryCode)
          .filter(Boolean),
      ),
    ];
    for (const c of countries.length ? countries : [""])
      rows.push({
        name,
        country: c,
        group:
          attr(pending, "group-title") || meta.categories?.[0] || "General",
        language:
          attr(pending, "tvg-language") || (meta.languages || []).join(", "),
        logo: attr(pending, "tvg-logo") || meta.logo || "",
        tvgId,
        radio: attr(pending, "radio") === "true",
        sources: [
          {
            url: line,
            label: source,
            type: streamType(line),
            geo: /Ⓖ/.test(pending) && c ? [c] : [],
            provenance: [source],
          },
        ],
      });
    pending = null;
  }
  return rows;
}
export function mergeChannels(inputs) {
  const channels = new Map();
  // Enrich an old missing country only when the exact same named stream has one
  // unambiguous country in the current metadata. Never merge known countries.
  const hints = new Map();
  const urlsOf = (x) =>
    (
      x.sources?.map((s) => s.url) ||
      [x.httpSrc, x.orig, x.page, x.src].filter(Boolean)
    ).map((url) => String(url).replace(/^http:/i, "https:"));
  for (const x of inputs) {
    const cc = countryCode(x.country || x.cc);
    if (!cc) continue;
    for (const url of urlsOf(x).filter(Boolean)) {
      const key = fold(nameOf(x.name)) + "|" + url;
      if (!hints.has(key)) hints.set(key, new Set());
      hints.get(key).add(cc);
    }
  }
  for (const input of inputs) {
    const name = nameOf(input.name);
    if (!name) continue;
    let cc = countryCode(input.country || input.cc);
    if (!cc) {
      const candidates = new Set(
        urlsOf(input).flatMap((url) => [
          ...(hints.get(fold(name) + "|" + url) || []),
        ]),
      );
      if (candidates.size === 1) cc = [...candidates][0];
    }
    const key = fold(name) + "|" + cc;
    let ch = channels.get(key);
    if (!ch) {
      const slug = fold(name).replace(/\s+/g, "-").slice(0, 64) || "channel";
      ch = {
        id:
          slug +
          "-" +
          (cc || "world").toLowerCase() +
          "-" +
          createHash("sha1").update(key).digest("hex").slice(0, 7),
        name,
        logo: input.logo || "",
        country: cc,
        cc,
        group: input.group || input.cat || "General",
        cat: input.cat || input.group || "General",
        language: input.language || "",
        radio: !!input.radio,
        sources: [],
        aliases: [],
        tvgIds: [],
        status: "unchecked",
      };
      channels.set(key, ch);
    }
    if (input.id != null && !ch.aliases.includes(String(input.id)))
      ch.aliases.push(String(input.id));
    for (const alias of input.aliases || [])
      if (!ch.aliases.includes(String(alias))) ch.aliases.push(String(alias));
    for (const id of [input.tvgId, ...(input.tvgIds || [])].filter(Boolean))
      if (!ch.tvgIds.includes(id)) ch.tvgIds.push(id);
    if (!ch.logo && input.logo) ch.logo = input.logo;
    if (!ch.language && input.language) ch.language = input.language;
    const sources = input.sources?.length
      ? input.sources
      : [
          ...[
            ...new Set(
              [input.httpSrc, input.orig, input.page, input.src].filter(
                Boolean,
              ),
            ),
          ].map((url) => ({
            url,
            type: input.type,
            label: input.wp ? "WordPress archive" : "Previous snapshot",
            status:
              input.chk === "fail"
                ? "dead"
                : input.ext
                  ? "needs-player"
                  : "unchecked",
          })),
          ...(input.fallback
            ? [{ url: input.fallback, label: "Previous mirror" }]
            : []),
        ];
    for (const s of sources) {
      if (!s?.url) continue;
      const url = String(s.url).trim(),
        existing = ch.sources.find((x) => x.url === url);
      if (existing) {
        // An auto-generated HTTPS candidate must not erase a previously observed
        // status when its original, checked mirror is encountered later.
        if (
          s.checkedAt &&
          (!existing.checkedAt || s.checkedAt > existing.checkedAt)
        ) {
          Object.assign(existing, {
            status: s.status,
            checkedAt: s.checkedAt,
            reason: s.reason,
          });
        }
        existing.provenance = [
          ...new Set([
            ...(existing.provenance || []),
            ...(s.provenance || [s.label || "Snapshot"]),
          ]),
        ];
        continue;
      }
      const type = [
        "hls",
        "dash",
        "mp4",
        "ts",
        "youtube",
        "twitch",
        "iframe",
      ].includes(s.type)
        ? s.type
        : streamType(url);
      ch.sources.push({
        ...s,
        url,
        type,
        label: s.label || "Mirror " + (ch.sources.length + 1),
        geo: Array.isArray(s.geo) ? s.geo : [],
        status:
          s.status ||
          (/^http:/i.test(url) || type === "external"
            ? "needs-player"
            : "unchecked"),
      });
      if (
        /^http:\/\//i.test(url) &&
        !ch.sources.some((x) => x.url === url.replace(/^http:/i, "https:"))
      )
        ch.sources.push({
          url: url.replace(/^http:/i, "https:"),
          type,
          label: "HTTPS alternative",
          geo: s.geo || [],
          generatedFrom: url,
          status: "unchecked",
          provenance: s.provenance || [s.label || "Snapshot"],
        });
    }
  }
  return [...channels.values()]
    .filter((c) => c.sources.length)
    .map((c) => {
      const s = c.sources.find((s) => /^https:/i.test(s.url)) || c.sources[0];
      c.status = c.sources.some((s) => s.status === "ok")
        ? "ok"
        : c.sources.every((s) => s.status === "dead")
          ? "dead"
          : c.sources.some((s) => s.status === "unchecked")
            ? "unchecked"
            : "needs-player";
      return {
        ...c,
        src: s.url,
        type: s.type,
        ext: c.sources.every((s) => s.status === "needs-player"),
        chk: c.status === "dead" ? "fail" : undefined,
      };
    })
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.country.localeCompare(b.country),
    );
}
export function makeSnapshot(items, extra = {}) {
  const facets = (key) =>
    [
      ...items.reduce((m, c) => {
        const k = c[key];
        if (k) m.set(k, (m.get(k) || 0) + 1);
        return m;
      }, new Map()),
    ]
      .map(([k, n]) => ({ k, n }))
      .sort((a, b) => a.k.localeCompare(b.k));
  return {
    version: 2,
    snapshot: new Date().toISOString(),
    perPage: 60,
    ...extra,
    facets: {
      total: items.length,
      countries: facets("country"),
      categories: facets("group"),
      languages: facets("language"),
    },
    items,
  };
}
export function snapshotText(db) {
  return (
    "/* Public free-to-air directory. Status is observational, not a guarantee. */\nwindow.SM_LIVETV=" +
    JSON.stringify(db) +
    ";\nwindow.LIVE_TV_CHANNELS=window.SM_LIVETV.items;\n"
  );
}
export function playlistText(items) {
  const clean = (value) => String(value || "").replace(/["\r\n]/g, "");
  return (
    "#EXTM3U\n" +
    items
      .flatMap((channel) =>
        channel.sources.map(
          (source, index) =>
            '#EXTINF:-1 tvg-id="' +
            clean(channel.tvgIds?.[0] || channel.id) +
            '" tvg-country="' +
            clean(channel.country) +
            '" tvg-logo="' +
            clean(channel.logo) +
            '" group-title="' +
            clean(channel.group) +
            '",' +
            clean(channel.name) +
            (channel.sources.length > 1
              ? " [Mirror " + (index + 1) + "]"
              : "") +
            "\n" +
            clean(source.url),
        ),
      )
      .join("\n") +
    "\n"
  );
}
