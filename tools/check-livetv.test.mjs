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

test("encrypted HLS is not marked playable and never probes media keys", async () => {
  const urls = [];
  const result = await probeSource(source, {
    fetcher: async (url) => {
      urls.push(url);
      return response(
        '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="https://public.example/secret.key"\n#EXTINF:2,\nsegment.ts',
        url,
      );
    },
  });
  assert.equal(result.status, "needs-player");
  assert.match(result.reason, /Encrypted HLS/);
  assert.equal(urls.length, 1);
});
test("HTTP 200 HTML response never counts as successful MP4 playback", async () => {
  const result = await probeSource(
    { url: "https://public.example/not-video.mp4", type: "mp4" },
    { fetcher: async () => new Response("<html>not a stream</html>", {
      headers: { "content-type": "text/html", "access-control-allow-origin": "*" },
    }) },
  );
  assert.equal(result.status, "dead");
  assert.match(result.reason, /not an MP4/);
});
test("embedded private-like endpoints are excluded from the probe", () => {
  assert.equal(publicURL("https://example.internal/stream.m3u8"), false);
  assert.equal(publicURL("http://localhost/stream.m3u8"), false);
});
