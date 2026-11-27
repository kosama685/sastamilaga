import test from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../examples/owned-hls-proxy/worker.mjs';
const ENV={OWNED_STREAM_ORIGIN:'https://media.example.net',OWNED_STREAM_BEARER:'licensed-demo-token'};
function req(url='https://sastamilaga.com/owned-media/live/demo/index.m3u8',origin='https://sastamilaga.com'){
  return new Request(url,{headers:{Origin:origin}});
}
test('restricted owned HLS proxy rewrites same-host manifests and retains secret on backend only',async()=>{
  let got;
  const result=await handle(req(),ENV,async (url,opt)=>{
    got={url,authorization:opt.headers.get('Authorization'),referer:opt.headers.get('Referer')};
    return new Response('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nsub/720.m3u8\n#EXT-X-KEY:METHOD=AES-128,URI="key/license.key?t=1&n=2"\nseg-000.ts\n',{headers:{'Content-Type':'application/vnd.apple.mpegurl'}});
  });
  assert.equal(result.status,200);
  assert.equal(got.url,'https://media.example.net/live/demo/index.m3u8');
  assert.equal(got.authorization,'Bearer licensed-demo-token');
  assert.equal(result.headers.get('Access-Control-Allow-Origin'),'https://sastamilaga.com');
  const s=await result.text();
  assert.match(s,/\/owned-media\/live\/demo\/sub\/720.m3u8/);
  assert.match(s,/URI="\/owned-media\/live\/demo\/key\/license.key\?t=1&n=2"/);
  assert.match(s,/\/owned-media\/live\/demo\/seg-000.ts/);
  assert.ok(!s.includes('media.example.net'));
});
test('refuses all third-party and open proxy targets',async()=>{
  assert.equal((await handle(req('https://sastamilaga.com/owned-media//evil.example/a.ts'),ENV)).status,503);
  assert.equal((await handle(req('https://sastamilaga.com/owned-media/live/a.m3u8','https://evil.example'),ENV)).status,403);
  assert.equal((await handle(req(),{},async()=>new Response('never'))).status,503);
});
test('fails closed on cross-origin child playlists and upstream redirects',async()=>{
  const manifest=await handle(req(),ENV,async()=>new Response('#EXTM3U\nhttps://others.example/live.ts',{status:200}));
  assert.equal(manifest.status,502);
  const redirect=await handle(req(),ENV,async()=>new Response(null,{status:302,headers:{location:'https://others.example'}}));
  assert.equal(redirect.status,502);
});
