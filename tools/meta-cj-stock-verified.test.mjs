import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const script=new URL('./build-meta-cj-stock-verified.mjs',import.meta.url).pathname;
const mk=()=>fs.mkdtempSync(path.join(os.tmpdir(),'meta-cj-stock-'));
const run=(cwd,mode,extra={})=>spawnSync(process.execPath,[script,mode],{cwd,encoding:'utf8',env:{...process.env,META_CJ_COUNTRY:'PK',META_CJ_CURRENCY:'PKR',...extra}});
const current=()=>new Date().toISOString();
const fixture=(id,stock=2)=>({id,title:'Verified test fixture - do not advertise',description:'Unit test only, not a real supplier offer',link:'https://sastamilaga.com/global-shop/p/1234567890123456789/test/',
 image_link:'https://example.com/test.jpg',variant_id:'1650744900742291456',currency:'PKR',country:'PK',retail_price:1250,condition:'new',price_kind:'final_retail',
 stock:{source:'cj_api',checked_at:current(),cj_warehouse_units:stock,factory_units:500},
 retail:{exact_variant_checkout:true,price_matches_checkout:true,page_matches_checkout:true,shipping_confirmed:true,merchant_policy_reviewed:true,
  price_checked_at:current(),checkout_checked_at:current(),shipping_checked_at:current(),factory_order_verified:true,reference:'checkout-fixture-do-not-publish'}});
test('audit with no inventory file reports missing evidence and produces no feed',()=>{const dir=mk();try{
 const r=run(dir,'--audit');assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(fs.readFileSync(path.join(dir,'artifacts/meta-cj-stock-readiness.json')));
 assert.equal(report.sourceCatalogAtObservation,451812);assert.equal(report.stockFlagsPopulatedAtObservation,0);assert.equal(report.currentStockFlagsNotRequeried,true);assert.equal(report.eligible,0);assert.equal(report.liveFeedReady,false);
 assert.equal(fs.existsSync(path.join(dir,'feeds/meta-verified')),false);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
test('building with no independently verified data fails closed',()=>{const dir=mk();try{
 const r=run(dir,'--build');assert.notEqual(r.status,0);assert.match(r.stderr,/No independent CJ inventory/);
 assert.equal(fs.existsSync(path.join(dir,'feeds/meta-verified/1.xml')),false);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
test('Meta native availability states require fresh CJ and retail evidence',()=>{const dir=mk();try{
 const file=path.join(dir,'checked.ndjson'),now=current();
 const yes=fixture('cj-warehouse-1',7),factory=fixture('factory-only-1',0),stale=fixture('stale-1',1),falsePrice=fixture('estimated-1',2),zero=fixture('empty-stock-1',0),noCheckout=fixture('no-checkout-1',1);
 factory.stock.factory_units=14;
 stale.stock.checked_at='2026-01-01T00:00:00Z';
 falsePrice.price_kind='supplier_estimate';
 zero.stock.factory_units=0;
 noCheckout.retail.exact_variant_checkout=false;
 fs.writeFileSync(file,[yes,factory,stale,falsePrice,zero,noCheckout].map(x=>JSON.stringify(x)).join('\n')+'\n');
 const r=run(dir,'--build',{META_CJ_VERIFIED_OFFERS_FILE:file});assert.equal(r.status,0,r.stderr);
 const xml=fs.readFileSync(path.join(dir,'feeds/meta-verified/1.xml'),'utf8'),report=JSON.parse(fs.readFileSync(path.join(dir,'artifacts/meta-cj-stock-readiness.json')));
 assert.equal(report.eligible,2);assert.equal(report.excluded,4);assert.equal(report.liveFeedReady,true);
 assert.equal((xml.match(/<item>/g)||[]).length,2);
 assert.match(xml,/<g:availability>in stock<\/g:availability>/);
 assert.match(xml,/<g:availability>available for order<\/g:availability>/);
 assert.doesNotMatch(xml,/stale-1|estimated-1|empty-stock-1|no-checkout-1|backorder/);
 assert.equal(report.reasons.missing_or_stale_cj_inventory,1);
 assert.equal(report.reasons.supplier_estimate_not_retail,1);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
test('verified positive supplier quantity without checkout is excluded',()=>{const dir=mk();try{
 const file=path.join(dir,'checked.ndjson'),x=fixture('no-checkout-2',200);
 x.retail.shipping_confirmed=false;
 fs.writeFileSync(file,JSON.stringify(x)+'\n');
 const r=run(dir,'--build',{META_CJ_VERIFIED_OFFERS_FILE:file});
 assert.notEqual(r.status,0);assert.match(r.stderr,/Zero verified orderable CJ offers/);
 assert.equal(fs.existsSync(path.join(dir,'feeds/meta-verified/1.xml')),false);
}finally{fs.rmSync(dir,{recursive:true,force:true})}});
