// Static multi-source catalogue builder. Unavailable feeds never delete previous channels.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  parseM3U,
  mergeChannels,
  makeSnapshot,
  snapshotText,
  playlistText,
} from "./livetv-catalog.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dir = path.join(root, "data/livetv");
const arg = process.argv.slice(2).find((a) => !a.startsWith("--"));
let previous = [];
try {
  const context = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(dir, "channels.js"), "utf8"),
    context,
    { timeout: 3000 },
  );
  previous = context.window.SM_LIVETV.items || [];
} catch {}
const report = {
    at: new Date().toISOString(),
    feeds: [],
    retainedPrevious: previous.length,
  },
  inputs = [...previous];
try {
  inputs.push(
    ...JSON.parse(fs.readFileSync(path.join(dir, "wp-channels.json"), "utf8")),
  );
} catch {}
async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(18000) });
  if (!r.ok) throw Error("HTTP " + r.status);
  return r.text();
}
let metadata = new Map();
if (!arg) {
  try {
    metadata = new Map(
      JSON.parse(await get("https://iptv-org.github.io/api/channels.json")).map(
        (x) => [x.id, x],
      ),
    );
  } catch (e) {
    report.metadataError = e.message;
  }
}
let sources = arg
  ? [arg]
  : [
      "https://iptv-org.github.io/iptv/index.m3u",
      "https://raw.githubusercontent.com/Free-TV/IPTV/master/playlist.m3u8",
      ...["", "_hong_kong", "_macau", "_taiwan", "_singapore", "_malaysia"].map(
        (s) => "https://epg.pw/test_channels" + s + ".m3u",
      ),
    ];
if (!arg) {
  try {
    const registry = await get(
      "https://raw.githubusercontent.com/iptv-org/iptv/master/PLAYLISTS.md",
    );
    sources.push(
      ...[
        ...registry.matchAll(
          /https:\/\/iptv-org\.github\.io\/iptv\/(?:countries|categories|languages)\/[a-z0-9_-]+\.m3u/g,
        ),
      ].map((m) => m[0]),
    );
  } catch (e) {
    report.registryError = e.message;
  }
}
if (!arg && !process.argv.includes("--no-regional"))
  sources.push(
    "https://raw.githubusercontent.com/YanG-1989/m3u/main/Gather.m3u",
    "https://raw.githubusercontent.com/kimwang1978/collect-tv-txt/main/merged_output.m3u",
    "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/v6.m3u",
    "https://raw.githubusercontent.com/fanmingming/live/main/tv/m3u/ipv6.m3u",
  );
sources = [...new Set(sources)];
let cursor = 0;
await Promise.all(
  Array.from({ length: 12 }, async () => {
    while (cursor < sources.length) {
      const source = sources[cursor++];
      try {
        const text = /^https?:/.test(source)
          ? await get(source)
          : fs.readFileSync(source, "utf8");
        const country =
          source.match(/\/countries\/([a-z]{2})\.m3u/)?.[1] ||
          {
            _hong_kong: "HK",
            _macau: "MO",
            _taiwan: "TW",
            _singapore: "SG",
            _malaysia: "MY",
          }[source.match(/test_channels(_[^.]+)\.m3u/)?.[1]] ||
          "";
        const rows = parseM3U(text, { source, country, metadata });
        inputs.push(...rows);
        report.feeds.push({ url: source, status: "ok", entries: rows.length });
      } catch (e) {
        report.feeds.push({
          url: source,
          status: "unavailable",
          error: e.message,
        });
      }
    }
  }),
);
if (!report.feeds.some((s) => s.status === "ok"))
  throw Error(
    "No source playlist could be fetched; prior snapshot left unchanged.",
  );
const items = mergeChannels(inputs),
  db = makeSnapshot(items, {
    source: "Public FTA playlists + retained previous channels",
    license: "Upstream public playlists; broadcaster restrictions still apply",
    epg: "https://iptv-org.github.io/api/guides.json",
    ...(() => {
      try {
        const meta = JSON.parse(
          fs.readFileSync(path.join(dir, "metadata.json"), "utf8"),
        );
        return {
          countryDirectory: meta.countries,
          regions: meta.regions,
          languageDirectory: meta.languages,
          categoryDirectory: meta.categories,
          epgBase: meta.epgBase,
        };
      } catch {
        return {};
      }
    })(),
  });
try {
  const previousHealth = JSON.parse(
    fs.readFileSync(path.join(dir, "playback-report.json"), "utf8"),
  );
  if (previousHealth.at) {
    const allSources = items.flatMap((c) => c.sources),
      unique = new Set(allSources.map((s) => s.url)),
      checked = new Set(
        allSources.filter((s) => s.checkedAt).map((s) => s.url),
      );
    db.health = {
      ...previousHealth,
      channels: items.length,
      uniqueSources: unique.size,
      checked: checked.size,
      remaining: unique.size - checked.size,
      statuses: Object.fromEntries(
        ["ok", "dead", "needs-player", "unchecked", "no-source"].map(
          (status) => [status, items.filter((c) => c.status === status).length],
        ),
      ),
    };
    fs.writeFileSync(
      path.join(dir, "playback-report.json"),
      JSON.stringify(db.health, null, 2),
    );
  }
} catch {}
report.channels = items.length;
report.sources = items.reduce((n, c) => n + c.sources.length, 0);
report.countries = db.facets.countries.length;
report.successfulFeeds = report.feeds.filter((s) => s.status === "ok").length;
report.failedFeeds = report.feeds.length - report.successfulFeeds;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "channels.js"), snapshotText(db));
fs.writeFileSync(path.join(dir, "playlist.m3u"), playlistText(items));
fs.writeFileSync(
  path.join(dir, "build-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    channels: report.channels,
    sources: report.sources,
    countries: report.countries,
    feeds: report.feeds.length,
    successfulFeeds: report.successfulFeeds,
    failedFeeds: report.failedFeeds,
  }),
);
if (process.argv.includes("--check"))
  await (await import("./check-livetv.mjs")).checkCatalog();
