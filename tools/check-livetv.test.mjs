import test from "node:test";
import assert from "node:assert/strict";
import { probeSource, publicURL } from "./check-livetv.mjs";
const source = { url: "https://public.example/live.m3u8", type: "hls" };
function response(body, url, allow = "*") {
  const r = new Response(body, {
    headers: { "access-control-allow-origin": allow },
  });
  Object.defineProperty(r, "url", { value: url });
  return r;
}
test("HLS health checks a manifest and actual first segment", async () => {
  const urls = [];
  const result = await probeSource(source, {
    fetcher: async (url) => {
      urls.push(url);
      return response(
        url.endsWith("m3u8") ? "#EXTM3U\n#EXTINF:2,\nsegment.ts" : "media",
        url,
      );
    },
  });
  assert.equal(result.status, "ok");
  assert.equal(urls.length, 2);
});
test("reachable source without CORS remains available as needs-player", async () => {
  const result = await probeSource(source, {
    fetcher: async (url) =>
      response(
        url.endsWith("m3u8") ? "#EXTM3U\n#EXTINF:2,\na.ts" : "media",
        url,
        "",
      ),
  });
  assert.equal(result.status, "needs-player");
});
test("dead endpoint is recorded, never removed or reported playing", async () => {
  assert.equal(
    (
      await probeSource(source, {
        fetcher: async () => new Response("gone", { status: 404 }),
      })
    ).status,
    "dead",
  );
});
test("private, embedded and HTTP sources are not silently relayed", async () => {
  assert.equal(publicURL("http://127.0.0.1/"), false);
  assert.equal(publicURL("http://192.168.0.1/"), false);
  assert.equal(
    (await probeSource({ ...source, url: "http://public.example/a" })).status,
    "needs-player",
  );
});
