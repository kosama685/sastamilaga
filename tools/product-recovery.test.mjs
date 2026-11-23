import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recover} from '../workers/product-recovery/worker.mjs';
const id='2111897917664645122';
const fetcher=async url=>String(url).includes('/lookup/')?Response.json({snapshot:'2026-11-05',items:{[id]:['CJ123','Smart Watch','Smart Watches','smart-watches','https://cf.cjdropshipping.com/watch.jpg']}}):new Response('',{status:404});
test('supplier outage renders exact catalog product without inventing a payable price',async()=>{
 const r=await recover(new Request('https://sastamilaga.com/product/'+id+'/smart-watch/'),{PRIMARY:{fetch:async()=>new Response('down',{status:503})}},fetcher);
 assert.equal(r.status,200);assert.equal(r.headers.get('X-Sasta-Recovery'),'verified-catalog-snapshot');
 const html=await r.text();assert.ok(html.includes('Smart Watch'));assert.ok(html.includes('https://sastamilaga.com/global-shop/p/'+id+'/smart-watch/'));assert.ok(!html.includes('"@type":"Offer"'));
});
test('healthy, missing, legacy and transactional responses remain owned by primary',async()=>{
 for(const [path,status,method] of [['/product/'+id+'/watch/',200,'GET'],['/product/'+id+'/watch/',404,'GET'],['/product/old-wordpress-slug/',301,'GET'],['/product/'+id+'/watch/',503,'POST']]){
  const original=new Response('original',{status});
  const r=await recover(new Request('https://sastamilaga.com'+path,{method}),{PRIMARY:{fetch:async()=>original}},()=>{throw Error('Unexpected snapshot call');});
  assert.equal(r,original);
 }
});
