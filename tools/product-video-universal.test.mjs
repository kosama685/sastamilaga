import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const universal=get('assets/js/product-video-universal.js'),app=get('app.js');
const staticChrome=get('assets/js/chrome.js'),html=get('index.html');
const existingCJ=get('assets/js/cj-card-video.js'),worker=get('tools/global-product-uuid-and-numeric-worker.mjs');
test('universal video module is valid JavaScript',()=>assert.doesNotThrow(()=>new Function(universal)));
test('shared video asset is loaded by static and dynamic layouts',()=>{
 assert.match(html,/assets\/js\/product-video-universal\.js/);
 assert.match(staticChrome,/assets\/js\/product-video-universal\.js/);
});
test('every local SPA product card and detail section carries seller media',()=>{
 assert.equal((app.match(/data-local-videos/g)||[]).length,3);
 assert.match(app,/JSON\.stringify\(p\.vids \|\| \[\]\)/);
});
test('CJ video checks use authorized signed media without autoplay',()=>{
 assert.match(universal,/\/cjv\/resolve/);
 assert.match(universal,/validSigned/);
 assert.match(universal,/SMCJVideo\?\.resolve/);
 assert.doesNotMatch(universal,/\.play\(\)|autoplay\s*=/);
 assert.match(existingCJ,/new IntersectionObserver/);
 assert.match(worker,/sm-video-modal/);
});
test('missing product media reports unavailable rather than creating fake playback',()=>{
 assert.match(universal,/No product video is currently available/);
 assert.match(universal,/No authorized video is available/);
 assert.match(universal,/dialog\.addEventListener\('close'/);
});
test('video controls do not hijack cart, payments, or supplier keys',()=>{
 assert.doesNotMatch(universal,/add-to-cart|\/checkout\/|PayPal|CJ_API_KEY|MEDIA_SIGNING_KEY/);
});
