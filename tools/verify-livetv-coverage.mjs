import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(
    new URL("../data/livetv/channels.js", import.meta.url),
    "utf8",
  ),
  context,
  { timeout: 5000 },
);
const db = context.window.SM_LIVETV,
  items = db.items,
  ids = new Set();
for (const ch of items) {
  assert.ok(
    ch.id && ch.name && (ch.sources.length || ch.catalogueOnly),
    "Every channel needs an identity and sources",
  );
  assert.ok(!ids.has(ch.id), "IDs must be unique");
  ids.add(ch.id);
  assert.equal(
    new Set(ch.sources.map((s) => s.url)).size,
    ch.sources.length,
    "Do not repeat source URLs within a channel",
  );
}
assert.equal(db.facets.total, items.length);
assert.equal(
  db.facets.countries.reduce((n, c) => n + c.n, 0),
  items.filter((c) => c.country).length,
);
const legacy = JSON.parse(
  fs.readFileSync(
    new URL("../data/livetv/wp-channels.json", import.meta.url),
    "utf8",
  ),
);
const urls = new Set(items.flatMap((c) => c.sources.map((s) => s.url)));
const missing = legacy.filter((c) => c.src && !urls.has(c.src));
assert.equal(
  missing.length,
  0,
  "Every archived WordPress stream must remain in the directory",
);
const report = JSON.parse(
  fs.readFileSync(
    new URL("../data/livetv/build-report.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(items.length, report.channels);
console.log(
  JSON.stringify({
    channels: items.length,
    countries: db.facets.countries.length,
    sourceEntries: items.reduce((n, c) => n + c.sources.length, 0),
    legacySourcesRetained: legacy.filter((c) => c.src).length,
    feeds: report.feeds.length,
    unavailableFeeds: report.failedFeeds,
  }),
);
