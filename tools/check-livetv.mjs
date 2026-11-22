import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { snapshotText, makeSnapshot, playlistText } from "./livetv-catalog.mjs";
const ORIGIN = "https://sastamilaga.com";
export function publicURL(url) {
  try {
    const u = new URL(url);
    return (
      ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password &&
      !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[|172\.(1[6-9]|2\d|3[01])\.)/i.test(
        u.hostname,
      ) &&
      !/(?:\.local|\.localhost|\.internal|\.test|\.invalid)$/i.test(u.hostname)
    );
  } catch {
    return false;
  }
}
async function limitedBody(response, max = 700000) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  let text = "",
    size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) throw Error("Manifest too large");
      text += new TextDecoder().decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return text;
}
export async function probeSource(
  source,
  { fetcher = fetch, timeout = 5000 } = {},
) {
  const at = new Date().toISOString();
  if (
    !publicURL(source.url) ||
    !/^https:/i.test(source.url) ||
    ["youtube", "twitch", "iframe", "external", "ts"].includes(source.type)
  )
    return {
      status: "needs-player",
      checkedAt: at,
      reason: "External player or broadcaster page required",
    };
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), timeout);
  let cors = true;
  async function get(url, range = false) {
    if (!publicURL(url)) throw Error("Non-public stream URL");
    const r = await fetcher(url, {
      signal: controller.signal,
      headers: { Origin: ORIGIN, ...(range ? { Range: "bytes=0-2047" } : {}) },
      redirect: "follow",
    });
    cors =
      cors &&
      ["*", ORIGIN].includes(r.headers.get("access-control-allow-origin"));
    if (!r.ok) {
      await r.body?.cancel();
      throw Error("HTTP " + r.status);
    }
    return r;
  }
  try {
    let r = await get(source.url, source.type === "mp4");
    if (source.type === "hls") {
      let text = await limitedBody(r),
        base = r.url || source.url;
      for (let depth = 0; depth < 3; depth++) {
        if (!text.trimStart().startsWith("#EXTM3U"))
          throw Error("Invalid HLS manifest");
        const lines = text.split(/\r?\n/).map((s) => s.trim());
        const first = lines.find((s) => s && !s.startsWith("#"));
        if (!first) throw Error("No playable HLS media");
        const url = new URL(first, base).href;
        if (/#EXT-X-STREAM-INF/.test(text)) {
          r = await get(url);
          text = await limitedBody(r);
          base = r.url || url;
          continue;
        }
        // A reachable manifest does not establish a right to fetch decryption keys.
        // Defer encrypted sources to the broadcaster's authorized player.
        const protection = text.match(/#EXT-X-(?:SESSION-)?KEY:[^\r\n]*/i);
        if (protection && !/\bMETHOD=NONE\b/i.test(protection[0]))
          return {
            status: "needs-player",
            checkedAt: at,
            reason: "Encrypted HLS requires authorized player and entitlement verification",
          };
        const segment = await get(url, true);
        const reader = segment.body?.getReader();
        if (reader) {
          const result = await reader.read();
          await reader.cancel();
          if (!result.value?.length) throw Error("Empty media segment");
        }
        return {
          status: cors ? "ok" : "needs-player",
          checkedAt: at,
          reason: cors
            ? "HLS manifest and first media segment reachable"
            : "Broadcaster CORS does not permit this browser origin",
        };
      }
      throw Error("Nested HLS manifest limit");
    }
    if (source.type === "dash") {
      const text = await limitedBody(r);
      if (!/<MPD[\s>]/.test(text)) throw Error("Invalid DASH manifest");
      return {
        status: "needs-player",
        checkedAt: at,
        reason:
          "DASH manifest reachable; media playback requires player verification",
      };
    }
    const mediaType = r.headers.get("content-type") || "";
    await r.body?.cancel();
    if (source.type === "mp4" && /(?:text\/html|application\/json)/i.test(mediaType))
      return {
        status: "dead",
        checkedAt: at,
        reason: "HTTP endpoint returned a page or JSON, not an MP4 stream",
      };
    return {
      status: cors ? "ok" : "needs-player",
      checkedAt: at,
      reason: cors
        ? "Media endpoint reachable"
        : "Broadcaster CORS restricts browser playback",
    };
  } catch (e) {
    return {
      status: e.name === "AbortError" ? "needs-player" : "dead",
      checkedAt: at,
      reason:
        e.name === "AbortError"
          ? "Probe timed out; source may be playable in another region or player"
          : String(e.message).slice(0, 150),
    };
  } finally {
    clearTimeout(timer);
  }
}
export async function checkCatalog() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    file = path.join(root, "data/livetv/channels.js"),
    context = { window: {} };
  vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { timeout: 5000 });
  const db = context.window.SM_LIVETV;
  const all = [
    ...new Map(
      db.items.flatMap((c) => c.sources.map((s) => [s.url, s])),
    ).values(),
  ];
  const observed = new Map();
  for (const source of db.items.flatMap((c) => c.sources))
    if (
      source.checkedAt &&
      (!observed.has(source.url) ||
        source.checkedAt > observed.get(source.url).checkedAt)
    )
      observed.set(source.url, {
        status: source.status,
        checkedAt: source.checkedAt,
        reason: source.reason,
      });
  const incremental = process.argv.includes("--unchecked-only");
  const queue = incremental
    ? all.filter((source) => !observed.has(source.url))
    : all;
  const max =
    Number(
      process.argv.find((s) => s.startsWith("--max-sources="))?.split("=")[1],
    ) || queue.length;
  const results = incremental ? new Map(observed) : new Map();
  let cursor = 0,
    done = 0;
  await Promise.all(
    Array.from({ length: 48 }, async () => {
      while (cursor < Math.min(queue.length, max)) {
        const source = queue[cursor++];
        results.set(source.url, await probeSource(source));
        if (++done % 1000 === 0)
          console.log(
            "Checked " +
              done +
              "/" +
              Math.min(queue.length, max) +
              " unique stream URLs",
          );
      }
    }),
  );
  for (const ch of db.items) {
    for (const s of ch.sources) {
      if (results.has(s.url)) Object.assign(s, results.get(s.url));
    }
    ch.status = !ch.sources.length
      ? "no-source"
      : ch.sources.some((s) => s.status === "ok")
        ? "ok"
        : ch.sources.every((s) => s.status === "dead")
          ? "dead"
          : ch.sources.some((s) => s.status === "unchecked")
            ? "unchecked"
            : "needs-player";
    ch.chk = ch.status === "dead" ? "fail" : undefined;
  }
  const report = {
    at: new Date().toISOString(),
    origin: ORIGIN,
    channels: db.items.length,
    uniqueSources: all.length,
    testedThisRun: done,
    checked: new Set(
      db.items.flatMap((c) =>
        c.sources.filter((s) => s.checkedAt).map((s) => s.url),
      ),
    ).size,
    remaining:
      all.length -
      new Set(
        db.items.flatMap((c) =>
          c.sources.filter((s) => s.checkedAt).map((s) => s.url),
        ),
      ).size,
    statuses: Object.fromEntries(
      ["ok", "dead", "needs-player", "unchecked", "no-source"].map((s) => [
        s,
        db.items.filter((c) => c.status === s).length,
      ]),
    ),
    note: "Network observations from one region. Endpoint reachability does not guarantee playback everywhere.",
  };
  fs.writeFileSync(
    file,
    snapshotText(makeSnapshot(db.items, { ...db, health: report })),
  );
  fs.writeFileSync(
    path.join(root, "data/livetv/playlist.m3u"),
    playlistText(db.items),
  );
  fs.writeFileSync(
    path.join(root, "data/livetv/playback-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await checkCatalog();
