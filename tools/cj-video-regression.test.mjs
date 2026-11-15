import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const card=read('assets/js/cj-card-video.js');
const rail=read('assets/js/cj-home-video-rail.js');
const global=read('assets/js/global.js');
const home=read('assets/js/cj-home-rails.js');
const html=read('index.html');
test('new video modules parse and contain no CJ token or raw supplier media URL',()=>{
 for(const src of [card,rail,global,home])assert.doesNotThrow(()=>new Function(src));
 for(const src of [card,rail]) {
  assert.doesNotMatch(src,/CJ_API_KEY|CJ-Access-Token|MEDIA_SIGNING_KEY|download-only-api\.cjdropshipping\.com|video-cf\.cjdropshipping/);
  if(src===card)assert.match(src,/\/cjv\/resolve/);
 }
});
test('videos are signed, lazy, throttled, and never autoplay',()=>{
 assert.ok(card.includes('cjv') && card.includes('v1'), 'signed media path validation must be present');
 assert.match(card,/nextAt=Date\.now\(\)\+1250/);
 assert.match(card,/new IntersectionObserver/);
 assert.match(card,/preload="none"/);
 assert.doesNotMatch(card,/\.play\(\)|\bautoplay\s*=/gi);
 assert.match(card,/pending=new Map/);
 assert.match(card,/player\.addEventListener\('close'/);
 assert.match(card,/if\(card\.dataset\.cjVideoHint!=='1'\)continue/);
});
test('existing CJ cards are additive and still link to product options',()=>{
 assert.match(global,/data-cj-video/);
 assert.match(global,/data-cj-video-hint/);
 assert.match(home,/data-cj-video/);
 assert.match(home,/data-cj-order="add"/);
 assert.match(home,/data-cj-order="buy"/);
 assert.match(home,/\/global\/p\//);
});
test('homepage has exactly one lazy video rail and clean link, without removing category rails',()=>{
 assert.equal(html.split('id="sm-cj-video-rail"').length-1,1);
 assert.match(html,/id="sm-cj-rails"/);
 assert.match(html,/href="\/global\/videos\/"/);
 assert.match(html,/assets\/js\/cj-card-video\.js/);
 assert.match(html,/assets\/js\/cj-home-video-rail\.js/);
 assert.match(rail,/new IntersectionObserver/);
 assert.match(rail,/SMCJVideo\.resolve/);
 assert.match(rail,/Supplier video/);
 assert.doesNotMatch(rail,/\.play\(\)|\bautoplay\s*=/gi);
});
