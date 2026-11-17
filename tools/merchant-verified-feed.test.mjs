import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
const script=new URL('./build-merchant-verified-feed.mjs',import.meta.url).pathname;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'merchant-gate-'));
const env={...process.env,GMC_TARGET_COUNTRY:'PK',GMC_TARGET_CURRENCY:'PKR',GMC_VERIFIED_OFFERS_FILE:path.join(tmp,'approved.ndjson')};
function run(){return spawnSync(process.execPath,[script],{cwd:tmp,env,encoding:'utf8'})}
test('Missing independent verified retail data fails closed',()=>{
 const p=run();assert.notEqual(p.status,0);assert.match(p.stderr,/missing/);});
test('Only verified and fresh checkout offers enter XML, not supplier estimates',()=>{
 const now=new Date().toISOString();
 const good={id:'verified-test-1',title:'Test item',description:'Fictional test fixture only',link:'https://sastamilaga.com/p/fixture.html',
 image_link:'https://example.com/test.jpg',price:1200,condition:'new',currency:'PKR',country:'PK',availability:'in_stock',identifier_exists:false,offer_kind:'verified_retail',
 evidence:{exact_variant_checkout:true,price_matches_page_and_checkout:true,stock_matches_page_and_checkout:true,shipping_reviewed:true,
 indexable_landing:true,merchant_policy_reviewed:true,price_checked_at:now,stock_checked_at:now,landing_checked_at:now,
 shipping_checked_at:now,checkout_tested_at:now,reference:'mock-test-record'}};
 fs.writeFileSync(env.GMC_VERIFIED_OFFERS_FILE,JSON.stringify(good)+'\n'+JSON.stringify({...good,id:'supplier-1',offer_kind:'supplier_estimate'})+'\n');
 const p=run();assert.equal(p.status,0,p.stderr);
 const xml=fs.readFileSync(path.join(tmp,'feeds/merchant-verified.xml'),'utf8');
 const report=JSON.parse(fs.readFileSync(path.join(tmp,'artifacts/merchant-verified-report.json')));
 assert.match(xml,/<g:id>verified-test-1<\/g:id>/);
 assert.doesNotMatch(xml,/supplier-1/);
 assert.equal(report.stats.eligible,1);assert.equal(report.stats.excluded,1);
});
