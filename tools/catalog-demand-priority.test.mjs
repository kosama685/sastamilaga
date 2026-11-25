import test from 'node:test';import assert from 'node:assert/strict';import {WEIGHTS,prioritizeDemand} from './catalog-demand-priority.mjs';
const full=Object.fromEntries(Object.keys(WEIGHTS).map(k=>[k,{value:90,evidenceRef:'synthetic-test'}]));
test('all verified dimensions',()=>{const r=prioritizeDemand({factors:full,pageImpressions28d:50});assert.equal(r.score,90);assert.equal(r.state,'PRIORITY_GROWTH');assert.equal(r.ctrScreen,'REVIEW');assert.equal(r.publicationApproved,false)});
test('missing demand is unknown not zero',()=>{const {demand,...factors}=full;const r=prioritizeDemand({factors});assert.equal(r.score,null);assert.equal(r.coverage,75);assert.deepEqual(r.scoreBounds,[67.5,92.5]);assert.equal(r.ctrScreen,'UNKNOWN')});
test('invalid evidence cannot produce final score',()=>{const r=prioritizeDemand({factors:{...full,demand:{value:100}}});assert.equal(r.score,null);assert.deepEqual(r.invalid,['demand'])});
test('hard gate overrides score',()=>assert.equal(prioritizeDemand({factors:full,hardBlocks:['unverified_media']}).state,'BLOCKED'));
test('low sample screens CTR only',()=>{const r=prioritizeDemand({factors:full,pageImpressions28d:29});assert.equal(r.ctrScreen,'LOW_SAMPLE');assert.equal(r.state,'PRIORITY_GROWTH')});
test('actual zero is not missing when evidenced',()=>{const r=prioritizeDemand({factors:{...full,demand:{value:0,evidenceRef:'fixture'}}});assert.equal(r.coverage,100);assert.equal(r.score,67.5)});
