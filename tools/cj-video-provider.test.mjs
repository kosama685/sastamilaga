import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eligibleCJVideos} from './cj-video-provider.mjs';
const base={id:'abc39e6946dc4aa6b53f1813b53cfcb1',videoState:'ON_STATE',videoUrl:'https://download-only-api.cjdropshipping.com/a/x.mp4',isFree:'1',isBuy:false,videoName:'Product demo'};
test('only listed, licensed, source-allowlisted video records survive',()=>{
 const result=eligibleCJVideos([
  base,{...base,id:'down0002',videoState:'DOWN_STATE'},
  {...base,id:'paid0003',isFree:'0',isBuy:false},
  {...base,id:'paid0004',isFree:'0',isBuy:true},
  {...base,id:'host0005',videoUrl:'https://attacker.test/x.mp4'},
  {...base,id:'insecure6',videoUrl:'http://download-only-api.cjdropshipping.com/a/x.mp4'},
  {...base,id:'query007',videoUrl:'https://download-only-api.cjdropshipping.com/a/x.mp4?tracking=1'},
  base
 ]);
 assert.deepEqual(result.map(x=>x.id),[base.id,'paid0004']);
 assert.equal(result[0].url,base.videoUrl);
 assert.equal(result[1].free,false);
});
test('missing or unlicensed videos return an empty, truthful list',()=>{
 assert.deepEqual(eligibleCJVideos(null),[]);
 assert.deepEqual(eligibleCJVideos([{...base,videoState:'DELETE_STATE'}]),[]);
});