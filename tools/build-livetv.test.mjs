import test from "node:test";
import assert from "node:assert/strict";
import {
  parseM3U,
  mergeChannels,
  makeSnapshot,
  playlistText,
} from "./livetv-catalog.mjs";
const playlist = (name, url, extra = "") =>
  '#EXTM3U\n#EXTINF:-1 tvg-country="PK" ' +
  extra +
  "," +
  name +
  "\n" +
  url +
  "\n";
test("M3U attributes and names with commas parse without truncation", () => {
  const rows = parseM3U(
    playlist(
      "News, World",
      "https://example.test/live.m3u8",
      'group-title="News, Talk" tvg-language="urd"',
    ),
  );
  assert.equal(rows[0].name, "News, World");
  assert.equal(rows[0].group, "News, Talk");
  assert.equal(rows[0].language, "urd");
});
test("true duplicates preserve every distinct signed URL as a mirror", () => {
  const rows = [
    ...parseM3U(
      playlist("News (720p)", "https://example.test/live.m3u8?token=a"),
    ),
    ...parseM3U(
      playlist("News (1080p)", "https://example.test/live.m3u8?token=b"),
    ),
  ];
  const merged = mergeChannels(rows);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].sources.length, 2);
});
test("same channel name in different countries remains distinct and IDs are order independent", () => {
  const rows = [
    { name: "One", country: "PK", src: "https://example.test/a.m3u8" },
    { name: "One", country: "IN", src: "https://example.test/b.m3u8" },
  ];
  const a = mergeChannels(rows),
    b = mergeChannels([...rows].reverse());
  assert.equal(a.length, 2);
  assert.deepEqual(
    a.map((c) => c.id),
    b.map((c) => c.id),
  );
});
test("HTTP sources retain originals and gain HTTPS candidates without downgrade", () => {
  const ch = mergeChannels(
    parseM3U(playlist("Test", "http://example.test/live.m3u8")),
  )[0];
  assert.equal(ch.sources.length, 2);
  assert.ok(ch.sources.some((s) => s.url === "http://example.test/live.m3u8"));
  assert.ok(ch.sources.some((s) => s.generatedFrom));
});
test("dead channels and legacy ID aliases are retained, including non-Latin names", () => {
  const items = mergeChannels([
    {
      id: 123,
      name: "世界新聞",
      cc: "TW",
      src: "https://example.test/live.m3u8",
      chk: "fail",
    },
  ]);
  assert.equal(items.length, 1);
  assert.equal(items[0].status, "dead");
  assert.ok(items[0].aliases.includes("123"));
  assert.equal(makeSnapshot(items).facets.countries[0].k, "TW");
});
test("country aliases and multi-country entries never lose country coverage", () => {
  const items = mergeChannels(
    parseM3U(
      '#EXTM3U\n#EXTINF:-1 tvg-country="UK;US",World\nhttps://example.test/a.m3u8',
    ),
  );
  assert.deepEqual(items.map((c) => c.country).sort(), ["GB", "US"]);
});

test("legacy missing-country duplicates are enriched only by an unambiguous exact named stream", () => {
  const rows = [
    { id: 9, name: "World News", cc: "", src: "https://example.test/a.m3u8" },
    {
      name: "World News",
      country: "GB",
      sources: [{ url: "https://example.test/a.m3u8", type: "hls" }],
    },
  ];
  const result = mergeChannels(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].country, "GB");
  assert.ok(result[0].aliases.includes("9"));
  rows.push({
    name: "World News",
    country: "US",
    src: "https://example.test/a.m3u8",
  });
  assert.equal(mergeChannels(rows).length, 3);
});

test("IPTV export contains every retained mirror URL", () => {
  const items = mergeChannels([
    {
      name: "Mirror TV",
      country: "PK",
      sources: [
        { url: "https://example.test/a.m3u8" },
        { url: "https://example.test/b.m3u8" },
      ],
    },
  ]);
  const text = playlistText(items);
  assert.ok(text.includes("https://example.test/a.m3u8"));
  assert.ok(text.includes("https://example.test/b.m3u8"));
  assert.equal((text.match(/#EXTINF/g) || []).length, 2);
});

test("HTTPS candidate generation preserves previous health observations on repeat builds", () => {
  const item = {
    name: "HTTP mirror",
    country: "PK",
    sources: [
      {
        url: "http://example.test/a.m3u8",
        type: "hls",
        status: "needs-player",
        checkedAt: "2026-11-22T12:00:00Z",
      },
      {
        url: "https://example.test/a.m3u8",
        type: "hls",
        status: "ok",
        checkedAt: "2026-11-22T12:00:00Z",
      },
    ],
  };
  const second = mergeChannels(mergeChannels([item]));
  const secure = second[0].sources.find((s) => s.url.startsWith("https:"));
  assert.equal(secure.status, "ok");
  assert.ok(secure.checkedAt);
});

test("legacy pages and their original embed URLs are both retained", () => {
  const page = "https://www.twitch.tv/news",
    src = "https://player.twitch.tv/?channel=news&parent=old.example";
  const [channel] = mergeChannels([
    { name: "News", cc: "AL", page, src, type: "iframe" },
  ]);
  assert.ok(channel.sources.some((s) => s.url === page));
  assert.ok(channel.sources.some((s) => s.url === src));
});

test("country enrichment is stable when HTTP gains a secure candidate", () => {
  const items = mergeChannels([
    { name: "Stable TV", src: "http://example.test/live.m3u8" },
    { name: "Stable TV", cc: "GB", src: "https://example.test/live.m3u8" },
  ]);
  assert.equal(items.length, 1);
  assert.deepEqual(
    mergeChannels(items).map((c) => c.id),
    items.map((c) => c.id),
  );
});
