// Metadata reconciliation. Upstream health is provenance, never proof of local playback.
import fs from "node:fs";
import { createHash } from "node:crypto";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  countryCode,
  fold,
  streamType,
  makeSnapshot,
  snapshotText,
  playlistText,
} from "./livetv-catalog.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dir = path.join(root, "data/livetv");
export const registry = {
  channels: "https://iptv-org.github.io/api/channels.json",
  streams: "https://iptv-org.github.io/api/streams.json",
  countries: "https://iptv-org.github.io/api/countries.json",
  categories: "https://iptv-org.github.io/api/categories.json",
  languages: "https://iptv-org.github.io/api/languages.json",
  regions: "https://iptv-org.github.io/api/regions.json",
  feeds: "https://iptv-org.github.io/api/feeds.json",
  guides: "https://iptv-org.github.io/api/guides.json",
  nexusChannels: "https://dearbulut.github.io/iptv/api/v1/channels.json",
  nexusStreams: "https://dearbulut.github.io/iptv/api/v1/streams.json",
  nexusHealth: "https://dearbulut.github.io/iptv/api/v1/health.json",
  nexusIndex: "https://dearbulut.github.io/iptv/api/v1/index.json",
  nexusCountries: "https://dearbulut.github.io/iptv/api/v1/countries.json",
  nexusCategories: "https://dearbulut.github.io/iptv/api/v1/categories.json",
  nexusLanguages: "https://dearbulut.github.io/iptv/api/v1/languages.json",
  nexusPlaylist: "https://dearbulut.github.io/iptv/playlists/index.m3u",
  nexusBest: "https://dearbulut.github.io/iptv/playlists/best.m3u",
};
export function reconcile(items, data, report = {}) {
  const byId = new Map(),
    byName = new Map(),
    rows = [...items],
    excluded = [];
  for (const c of rows) {
    c.country = countryCode(c.country || c.cc);
    c.cc = c.country;
    for (const id of [c.upstreamId, ...(c.tvgIds || [])].filter(Boolean))
      byId.set(id.split("@")[0], c);
    byName.set(fold(c.name) + "|" + (c.country || c.cc || ""), c);
  }
  const metas = new Map((data.nexusChannels || []).map((c) => [c.id, c]));
  for (const c of data.channels || [])
    metas.set(c.id, { ...metas.get(c.id), ...c });
  for (const raw of metas.values()) {
    const m = { ...raw, country: countryCode(raw.country) };
    // Adult channels require an age-controlled surface which this general directory does not offer.
    if (m.is_nsfw) {
      excluded.push({
        id: m.id,
        reason: "Adult channel requires an age-controlled surface",
      });
      continue;
    }
    let c =
      byId.get(m.id) || byName.get(fold(m.name) + "|" + (m.country || ""));
    if (!c) {
      c = {
        id: "iptv-" + m.id,
        name: m.name,
        country: m.country || "",
        cc: m.country || "",
        group: m.categories?.[0] || "General",
        cat: m.categories?.[0] || "General",
        sources: [],
        aliases: [],
        tvgIds: [m.id],
        status: "no-source",
        catalogueOnly: true,
      };
      rows.push(c);
    }
    byId.set(m.id, c);
    c.upstreamId = m.id;
    c.website = m.website || c.website || "";
    c.logo = c.logo || m.logo || "";
    c.alternateNames = [
      ...new Set([...(c.alternateNames || []), ...(m.alt_names || [])]),
    ];
    c.categories = [
      ...new Set([...(c.categories || []), ...(m.categories || [])]),
    ];
    c.languages = [
      ...new Set([...(c.languages || []), ...(m.languages || [])]),
    ];
    c.closed = m.closed || null;
    c.tvgIds = [...new Set([...(c.tvgIds || []), m.id])];
  }
  for (const f of data.feeds || []) {
    const c = byId.get(f.channel);
    if (c) {
      c.languages = [
        ...new Set([...(c.languages || []), ...(f.languages || [])]),
      ];
      c.feedIds = [...new Set([...(c.feedIds || []), f.id])];
    }
  }
  const excludedIds = new Set(excluded.map((x) => x.id));
  let retained = 0,
    invalid = 0;
  const quarantinedStreams = [];
  for (const [provider, streams] of [
    ["iptv-org", data.streams || []],
    ["IPTV Nexus", data.nexusStreams || []],
  ])
    for (const s of streams) {
      if (excludedIds.has(s.channel)) {
        quarantinedStreams.push({
          channel: s.channel,
          url: s.url,
          reason: "Adult channel requires an age-controlled surface",
        });
        continue;
      }
      if (!s.url || !/^(https?|rtsp|rtmp|udp|rtp):\/\//i.test(s.url)) {
        invalid++;
        quarantinedStreams.push({
          channel: s.channel,
          url: s.url,
          reason: "Unsupported or missing stream URL",
        });
        continue;
      }
      let c = byId.get(s.channel) || byName.get(fold(s.title || "") + "|");
      if (!c) {
        const name = s.title || s.channel || "Unassigned public stream";
        c = {
          id:
            "stream-" +
            createHash("sha256").update(s.url).digest("hex").slice(0, 20),
          name,
          country: "",
          cc: "",
          group: "General",
          cat: "General",
          sources: [],
          aliases: [],
          tvgIds: s.channel ? [s.channel] : [],
          status: "unchecked",
        };
        rows.push(c);
        byName.set(fold(name) + "|", c);
        if (s.channel) byId.set(s.channel, c);
      }
      const existing = c.sources.find((x) => x.url === s.url);
      if (existing) {
        existing.provenance = [
          ...new Set([...(existing.provenance || []), provider]),
        ];
        existing.provider ||= provider;
        existing.feed ||= s.feed || null;
        existing.quality ||= s.quality || null;
        existing.referrer ||= s.referrer || null;
        existing.userAgent ||= s.user_agent || null;
        existing.labels = [
          ...new Set([...(existing.labels || []), ...(s.labels || [])]),
        ];
        if (s.health) existing.upstreamHealth = s.health;
        if (s.referrer || s.user_agent) {
          const requirement = {
            referrer: s.referrer || null,
            userAgent: s.user_agent || null,
          };
          existing.requestRequirements ||= [];
          if (
            !existing.requestRequirements.some(
              (r) =>
                r.referrer === requirement.referrer &&
                r.userAgent === requirement.userAgent,
            )
          )
            existing.requestRequirements.push(requirement);
        }
        retained++;
        continue;
      }
      c.sources.push({
        url: s.url,
        type: streamType(s.url),
        label:
          provider +
          (s.feed ? " · " + s.feed : "") +
          (s.quality ? " · " + s.quality : ""),
        provider,
        feed: s.feed || null,
        quality: s.quality || null,
        referrer: s.referrer || null,
        userAgent: s.user_agent || null,
        labels: s.labels || [],
        provenance: [provider],
        status: "unchecked",
        upstreamHealth: s.health || undefined,
      });
      retained++;
    }
  const names = new Map((data.languages || []).map((x) => [x.code, x.name]));
  for (const c of rows) {
    c.languages ||= [];
    c.languageDisplay = c.languages.map((k) => names.get(k) || k).join(", ");
    c.language = c.language || c.languages.join(", ");
    c.categories ||= [c.group || c.cat || "General"];
    c.sources ||= [];
    c.sourceCount = c.sources.length;
    c.catalogueOnly = !c.sources.length;
    if (!c.sources.length) c.status = "no-source";
  }
  report.quarantinedStreams = quarantinedStreams;
  report.missingMetadataIds = [...metas.keys()].filter(
    (id) => !excludedIds.has(id) && !byId.has(id),
  );
  if (report.missingMetadataIds.length) throw Error("Unaccounted metadata IDs");
  report.metadataRecords = metas.size;
  report.streamRows =
    (data.streams?.length || 0) + (data.nexusStreams?.length || 0);
  report.streamRowsRetained = retained;
  report.invalidStreamRows = invalid;
  report.quarantined = excluded;
  report.noSourceChannels = rows.filter((c) => !c.sources.length).length;
  return rows.sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}
export async function enrich() {
  const context = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(dir, "channels.js"), "utf8"),
    context,
  );
  const db = context.window.SM_LIVETV;
  const data = {},
    report = { at: new Date().toISOString(), sources: [] };
  let cursor = 0;
  const entries = Object.entries(registry);
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (cursor < entries.length) {
        const [name, url] = entries[cursor++];
        try {
          let text;
          const cache =
            process.env.SM_TV_METADATA_CACHE &&
            path.join(process.env.SM_TV_METADATA_CACHE, "tv-" + name + ".json");
          if (cache && fs.existsSync(cache))
            text = fs.readFileSync(cache, "utf8");
          else {
            let err;
            for (let retry = 0; retry < 3; retry++) {
              try {
                const r = await fetch(url, {
                  signal: AbortSignal.timeout(25000),
                });
                if (!r.ok) throw Error("HTTP " + r.status);
                text = await r.text();
                break;
              } catch (e) {
                err = e;
                if (retry < 2)
                  await new Promise((r) => setTimeout(r, 500 * 2 ** retry));
              }
            }
            if (text === undefined) throw err;
          }
          if (name.startsWith("nexus") && /Playlist|Best/.test(name)) {
            const { parseM3U } = await import("./livetv-catalog.mjs");
            data[name] = parseM3U(text, { source: url });
          } else data[name] = JSON.parse(text);
          report.sources.push({
            name,
            url,
            status: "ok",
            records: Array.isArray(data[name]) ? data[name].length : 1,
          });
        } catch (e) {
          report.sources.push({
            name,
            url,
            status: "unavailable",
            reason: e.message,
          });
        }
      }
    }),
  );
  const items = reconcile(db.items, data, report);
  // Playlist-only URLs are also retained; metadata/stream APIs are not assumed exhaustive.
  const urls = new Set(items.flatMap((c) => c.sources.map((s) => s.url)));
  for (const c of [...(data.nexusPlaylist || []), ...(data.nexusBest || [])])
    for (const s of c.sources)
      if (!urls.has(s.url)) {
        let target = items.find(
          (x) =>
            (c.tvgId && x.tvgIds?.includes(c.tvgId.split("@")[0])) ||
            (fold(x.name) === fold(c.name) && x.country === c.country),
        );
        if (!target) {
          target = {
            ...c,
            id:
              "nexus-" +
              createHash("sha256").update(s.url).digest("hex").slice(0, 20),
            aliases: [],
            tvgIds: c.tvgId ? [c.tvgId] : [],
            status: "unchecked",
          };
          items.push(target);
        } else target.sources.push(s);
        urls.add(s.url);
      }
  for (const c of items) {
    c.sourceCount = c.sources.length;
    c.catalogueOnly = !c.sources.length;
    if (c.sources.length && c.status === "no-source") c.status = "unchecked";
  }
  const usedLanguages = new Set(items.flatMap((c) => c.languages || []));
  const metadata = {
    countries: (data.countries || db.countryDirectory || []).map((c) => ({
      ...c,
      code: countryCode(c.code),
      upstreamCode: c.code,
    })),
    regions: (data.regions || []).map((r) => ({
      ...r,
      countries: r.countries.map(countryCode),
    })),
    categories: data.categories || [],
    languages: (data.languages || []).filter((l) => usedLanguages.has(l.code)),
    epgBase: "https://dearbulut.github.io/iptv/epg/channels/",
  };
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata));
  const next = makeSnapshot(items, {
    ...db,
    countryDirectory: metadata.countries,
    regions: metadata.regions,
    languageDirectory: metadata.languages,
    categoryDirectory: metadata.categories,
    epgBase: metadata.epgBase,
  });
  fs.writeFileSync(path.join(dir, "channels.js"), snapshotText(next));
  fs.writeFileSync(path.join(dir, "playlist.m3u"), playlistText(items));
  report.channels = items.length;
  report.uniqueURLs = new Set(
    items.flatMap((c) => c.sources.map((s) => s.url)),
  ).size;
  fs.writeFileSync(
    path.join(dir, "reconciliation-report.json"),
    JSON.stringify(report, null, 2),
  );
  const build = JSON.parse(
    fs.readFileSync(path.join(dir, "build-report.json"), "utf8"),
  );
  build.channels = items.length;
  build.sources = items.reduce((n, c) => n + c.sources.length, 0);
  build.countries = next.facets.countries.length;
  fs.writeFileSync(
    path.join(dir, "build-report.json"),
    JSON.stringify(build, null, 2),
  );
  console.log(
    JSON.stringify({
      channels: report.channels,
      uniqueURLs: report.uniqueURLs,
      noSourceChannels: report.noSourceChannels,
      quarantined: report.quarantined.length,
      metadataCountries: metadata.countries.length,
      feeds: report.sources.map((x) => ({ name: x.name, status: x.status })),
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await enrich();
