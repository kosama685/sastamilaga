import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
const root = process.cwd(),
  context = { window: {} };
vm.runInNewContext(fs.readFileSync("data/livetv/channels.js", "utf8"), context);
const db = context.window.SM_LIVETV;
const xml = fs.readFileSync("sitemap-livetv.xml", "utf8"),
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]),
  ids = new Set(),
  known = new Set(db.items.map((c) => c.id));
assert.equal(new Set(urls).size, urls.length);
for (const url of urls) {
  assert.ok(url.startsWith("https://sastamilaga.com/live-tv/"));
  const file = path.join(root, new URL(url).pathname, "index.html"),
    html = fs.readFileSync(file, "utf8");
  assert.ok(html.includes('rel="canonical" href="' + url + '"'));
  assert.ok(/<h1>[^<]+<\/h1>/.test(html));
  assert.ok(html.includes('id="sm-chrome-header" data-prefix="/"'), "Shared header: " + url);
  assert.ok(html.includes('id="sm-chrome-footer"'), "Shared footer: " + url);
  assert.ok(html.includes('src="/assets/js/chrome.js" defer'), "Shared chrome runtime: " + url);
  for (const m of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ))
    JSON.parse(m[1]);
  for (const m of html.matchAll(/\/live-tv\/\?channel=([^"<]+)/g)) {
    const id = decodeURIComponent(m[1]);
    assert.ok(known.has(id), "Linked channel exists: " + id);
    ids.add(id);
  }
}
assert.equal(
  ids.size,
  db.items.length,
  "Every retained channel has a crawlable watch link",
);
const report = JSON.parse(
  fs.readFileSync("data/livetv/discovery-report.json", "utf8"),
);
assert.equal(report.channels, db.items.length);
assert.equal(report.countries, db.countryDirectory.length);
console.log(
  JSON.stringify({
    status: "passed",
    pages: urls.length,
    linkedChannels: ids.size,
    countries: report.countries,
  }),
);
