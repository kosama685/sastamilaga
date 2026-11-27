import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import { reconcile } from "./enrich-livetv.mjs";
import {
  mergeChannels,
  snapshotText,
  makeSnapshot,
} from "./livetv-catalog.mjs";
const ctx = {};
vm.runInNewContext(
  fs.readFileSync(
    new URL("../assets/js/live-tv-discovery.js", import.meta.url),
    "utf8",
  ),
  ctx,
);
const D = ctx.SLTVDiscovery;
test("location detection reads only the country and ignores IP address", () => {
  assert.equal(D.countryFromTrace("ip=192.0.2.1\nloc=SA\n"), "SA");
  assert.equal(D.countryFromTrace("loc=undefined"), "");
});
test("programme guide selects genuine current and next listings with missing data fallback", () => {
  const now = Date.parse("2026-11-22T10:20:00Z"),
    rows = [
      {
        title: "Current",
        start: "2026-11-22T10:00:00Z",
        stop: "2026-11-22T10:30:00Z",
      },
      {
        title: "Next",
        start: "2026-11-22T10:30:00Z",
        stop: "2026-11-22T11:00:00Z",
      },
    ];
  assert.equal(D.nowNext(rows, now).now.title, "Current");
  assert.equal(D.nowNext(rows, now).next.title, "Next");
  assert.equal(D.nowNext([], now).now, null);
});
test("metadata without streams remains visible and multiple APIs preserve distinct mirrors by channel ID", () => {
  const report = {};
  const items = reconcile(
    [],
    {
      channels: [
        { id: "A.pk", name: "A", country: "PK" },
        { id: "B.sa", name: "B", country: "SA" },
      ],
      streams: [{ channel: "A.pk", url: "https://a.test/live.m3u8" }],
      nexusStreams: [{ channel: "A.pk", url: "https://b.test/live.m3u8" }],
    },
    report,
  );
  assert.equal(items.length, 2);
  assert.equal(items.find((c) => c.upstreamId === "A.pk").sources.length, 2);
  assert.equal(items.find((c) => c.upstreamId === "B.sa").status, "no-source");
  assert.equal(report.missingMetadataIds.length, 0);
  const merged = mergeChannels(items);
  assert.equal(merged.length, 2);
});
test("all supplied countries remain in facets even with no channel", () => {
  const db = makeSnapshot([], {
    countryDirectory: [
      { code: "PK", name: "Pakistan" },
      { code: "AQ", name: "Antarctica" },
    ],
  });
  assert.equal(db.facets.countries.length, 2);
  assert.equal(db.facets.countries[1].n, 0);
});
test("compact source metadata restores original signed URLs, labels and provenance", () => {
  const item = {
    id: "a",
    name: "A",
    country: "PK",
    sources: [
      {
        url: "https://a.test/live?token=abc&v=2",
        label: "Provider",
        provenance: ["https://provider.test/feed"],
      },
    ],
  };
  const c = { window: {} };
  vm.runInNewContext(snapshotText(makeSnapshot([item])), c);
  assert.equal(c.window.SM_LIVETV.items[0].sources[0].url, item.sources[0].url);
  assert.deepEqual(
    JSON.parse(JSON.stringify(c.window.SM_LIVETV.items[0].sources[0])),
    item.sources[0],
  );
});

test("metadata UK codes normalize to the existing GB identity without losing its ID", () => {
  const [c] = reconcile(
    [],
    { channels: [{ id: "BBC.uk", name: "BBC", country: "UK" }] },
    {},
  );
  assert.equal(c.country, "GB");
  assert.equal(c.upstreamId, "BBC.uk");
});

test("matching stream APIs retain request requirements and quality without overwriting observed health", () => {
  const url = "https://video.test/live.m3u8";
  const items = reconcile(
    [
      {
        id: "old",
        name: "A",
        country: "PK",
        tvgIds: ["A.pk"],
        sources: [{ url, type: "hls", status: "dead" }],
      },
    ],
    {
      channels: [{ id: "A.pk", name: "A", country: "PK" }],
      streams: [
        {
          channel: "A.pk",
          url,
          quality: "1080p",
          referrer: "https://broadcaster.test/",
          user_agent: "BroadcasterPlayer",
        },
      ],
    },
    {},
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].sources.length, 1);
  assert.equal(items[0].sources[0].status, "dead");
  assert.equal(items[0].sources[0].quality, "1080p");
  assert.equal(items[0].sources[0].referrer, "https://broadcaster.test/");
});


test("full schedules search genuine titles and descriptions, normalize accents and reject invalid times", () => {
  const rows = [
    {title:"Evening News", description:"World headlines", start:"2026-11-23T18:00:00Z", stop:"2026-11-23T19:00:00Z"},
    {title:"Cafe cinema", description:"Drama", start:"2026-11-23T15:00:00Z", stop:"2026-11-23T16:00:00Z"},
    {title:"Invalid", start:"bad", stop:"bad"},
    {title:"Reversed", start:"2026-11-23T19:00:00Z", stop:"2026-11-23T18:00:00Z"}
  ];
  assert.equal(D.scheduleRows(rows).length,2);
  assert.equal(D.scheduleRows(rows)[0].title,"Cafe cinema");
  assert.equal(D.scheduleRows(rows,"world news")[0].title,"Evening News");
  assert.equal(D.scheduleRows(rows,"nonexistent").length,0);
  assert.equal(D.scheduleRows(null).length,0);
});
