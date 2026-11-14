import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorize, signMediaUrl, validateCJPlayableVideo} from './cj-video-proxy.mjs';
const pid='1964955178105954305',secret='test-only-signer-secret';
const url='https://download-only-api.cjdropshipping.com/a/video.mp4';
test('generated signing claim passes existing proxy HMAC verification',async()=>{
 const path=await signMediaUrl({id:'abc1234567',url,kind:'video'},pid,secret);
 assert.match(path,/^\/cjv\/v1\//);
 const claim=await authorize(new Request('https://sastamilaga.com'+path),{MEDIA_SIGNING_KEY:secret});
 assert.equal(claim.pid,pid);assert.equal(claim.url,url);assert.equal(claim.kind,'video');
});
test('signed URL validation refuses an arbitrary upstream host',async()=>{
 await assert.rejects(()=>signMediaUrl({id:'abc1234567',url:'https://example.org/a.mp4',kind:'video'},pid,secret));
});
test('probe sends CJ Referer with byte Range and requires video MIME',async()=>{
 const requests=[];
 const fetcher=async (target,opts)=>{requests.push({target,opts});return new Response(new Uint8Array([0,1]),{status:206,headers:{'Content-Type':'video/mp4','Content-Length':'2','Content-Range':'bytes 0-1/100'}})};
 assert.equal(await validateCJPlayableVideo({url},fetcher),true);
 assert.equal(requests[0].opts.headers['Referer'],'https://developers.cjdropshipping.com/');
 assert.equal(requests[0].opts.headers['Range'],'bytes=0-1');
 const bad=async()=>new Response('Blocked',{status:403,headers:{'Content-Type':'text/plain'}});
 assert.equal(await validateCJPlayableVideo({url},bad),false);
});