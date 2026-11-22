import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const context = { URL };
vm.runInNewContext(
  fs.readFileSync(
    new URL("../assets/js/live-tv-core.js", import.meta.url),
    "utf8",
  ),
  context,
);
const C = context.SLTVCore;
const ch = {
  name: "News",
  country: "PK",
  group: "News",
  language: "Urdu",
  sources: [
    { url: "https://a.test/a.m3u8", type: "hls", status: "dead" },
    { url: "https://b.test/b.m3u8", type: "hls", status: "ok" },
  ],
};
test("working second source is reached and playing is reported", async () => {
  const attempts = [],
    events = [];
  const f = C.failover({
    attempt: (item, callback) => {
      attempts.push(item.url);
      if (attempts.length === 1) callback.failed();
      else callback.playing();
      return () => {};
    },
    onState: (...x) => events.push(x),
    onExhausted: () => assert.fail("Should play second source"),
  });
  f.start(C.plan(ch));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(attempts.length, 2);
  assert.equal(events.at(-1)[3], "playing");
});
test("all failed sources exhaust in the external panel without removing the channel", async () => {
  let exhausted = 0;
  const f = C.failover({
    attempt: (_, cb) => {
      cb.failed();
      return () => {};
    },
    onExhausted: () => exhausted++,
  });
  f.start(C.plan(ch));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(exhausted, 1);
  assert.equal(ch.sources.length, 2);
  assert.equal(C.matches({ ...ch, status: "dead" }, "news"), true);
});
test("a stale failed player cannot advance the new channel", async () => {
  const callbacks = [];
  let exhausted = 0;
  const f = C.failover({
    attempt: (_, cb) => {
      callbacks.push(cb);
      return () => {};
    },
    onExhausted: () => exhausted++,
  });
  f.start(C.plan(ch));
  f.start(C.plan(ch));
  callbacks[0].failed();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(callbacks.length, 2);
  assert.equal(exhausted, 0);
});
test("virtualization reaches the last of 27000 entries without rendering the whole catalog", () => {
  const range = C.windowRange(27000, 27000 * 88 - 600, 600, 88, 10);
  assert.equal(range.end, 27000);
  assert.ok(range.end - range.start < 50);
  assert.equal(range.bottom, 0);
});
test("search covers country names, category and language, including dead channels", () => {
  assert.equal(
    C.matches(ch, "Pakistan", "", "", (cc) => (cc === "PK" ? "Pakistan" : cc)),
    true,
  );
  assert.equal(C.matches(ch, "urdu"), true);
  assert.equal(C.matches(ch, "missing"), false);
});
test("HTTPS candidates precede HTTP external-only sources and native HLS can be forced", () => {
  const plans = C.plan(
    { sources: [{ url: "http://example.test/a.m3u8", type: "hls" }] },
    0,
    "auto",
    true,
  );
  assert.equal(plans.length, 2);
  assert.ok(plans.every((p) => p.url.startsWith("https:")));
  assert.equal(C.plan(ch, 0, "native", true)[0].engine, "native");
});
test("external links are platform-aware, named, and reject executable URLs", () => {
  const urls = C.externalLinks(ch.sources[0].url, "News HD", "Android");
  assert.match(urls.vlc, /org.videolan.vlc/);
  assert.match(urls.mx, /com.mxtech.videoplayer.ad/);
  assert.match(
    C.externalLinks(ch.sources[0].url, "News", "iPhone").vlc,
    /vlc-x-callback/,
  );
  assert.equal(
    Object.keys(C.externalLinks("javascript:alert(1)", "bad")).length,
    0,
  );
});

test("canonical saved channel IDs take precedence over legacy alias collisions", () => {
  const list = [
    { id: "older", aliases: ["canonical"] },
    { id: "canonical", aliases: ["123"] },
  ];
  assert.equal(C.resolve(list, "canonical").id, "canonical");
  assert.equal(C.resolve(list, "123").id, "canonical");
});
