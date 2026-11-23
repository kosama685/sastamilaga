import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recover} from '../workers/product-recovery/worker.mjs';
import {bucketOf} from '../workers/global-pdp/worker.js';
const id='2111897917664645122';
const fetcher=async url=>String(url).includes('/lookup/')?Response.json({snapshot:'2026-11-05',items:{[id]:['CJ123','Smart Watch','Smart Watches','smart-watches','https://cf.cjdropshipping.com/watch.jpg']}}):new Response('',{status:404});
test('supplier outage renders exact catalog product without inventing a payable price',async()=>{
 const r=await recover(new Request('https://sastamilaga.com/product/'+id+'/smart-watch/'),{PRIMARY:{fetch:async()=>new Response('down',{status:503})}},fetcher);
 assert.equal(r.status,200);assert.equal(r.headers.get('X-Sasta-Recovery'),'verified-catalog-snapshot');
 const html=await r.text();assert.ok(html.includes('Smart Watch'));assert.ok(html.includes('https://sastamilaga.com/global-shop/p/'+id+'/smart-watch/'));assert.ok(!html.includes('"@type":"Offer"'));
});
test('healthy, missing, legacy and transactional responses remain owned by primary',async()=>{
 for(const [path,status,method] of [['/product/'+id+'/watch/',200,'GET'],['/product/old-wordpress-slug/',301,'GET'],['/product/'+id+'/watch/',503,'POST']]){
  const original=new Response('original',{status});
  const r=await recover(new Request('https://sastamilaga.com'+path,{method}),{PRIMARY:{fetch:async()=>original}},()=>{throw Error('Unexpected snapshot call');});
  assert.equal(r,original);
 }
});
test('a partial live catalog 404 recovers the exact product from the complete snapshot',async()=>{
 const r=await recover(new Request('https://sastamilaga.com/product/'+id+'/smart-watch/'),{PRIMARY:{fetch:async()=>new Response('missing',{status:404})}},fetcher);
 assert.equal(r.status,200);assert.ok((await r.text()).includes('Smart Watch'));
 const unknown=await recover(new Request('https://sastamilaga.com/product/9999999999999999999/unknown/'),{PRIMARY:{fetch:async()=>new Response('missing',{status:404})}},fetcher);
 assert.equal(unknown.status,404);
});
test('fresh legacy link redirects without using a session or incomplete database',async()=>{
 const requested='1386583701764313088';
 const f=async url=>Response.json({items:{[requested]:['CJH','Mori Girl\'s Moving Butterfly Hairpin Headdress','Headband & Hair Band & Hairpin','headband-and-hair-band-and-hairpin','']}});
 for(const method of ['GET','HEAD']){
  const r=await recover(new Request('https://sastamilaga.com/global/p/headband-and-hair-band-and-hairpin/'+requested+'?utm_source=shared',{method}),{PRIMARY:{fetch(){throw Error('Must not use database renderer');}}},f);
  assert.equal(r.status,301);assert.equal(await r.text(),'');
  assert.equal(r.headers.get('location'),'https://sastamilaga.com/global-shop/p/'+requested+'/mori-girl-s-moving-butterfly-hairpin-headdress/?utm_source=shared');
 }
});
test('lowercase UUID reads the canonical uppercase bucket, preserving product identity',async()=>{
 const pid='0AF026C6-B83F-4FC8-85B5-CD638A556EF7';
 const f=async url=>{
  assert.ok(String(url).endsWith('/'+bucketOf(pid).toString(16).padStart(3,'0')+'.json'));
  return Response.json({items:{[pid]:['CJ1','Rainbow Coat','Coats','coats','']}});
 };
 const r=await recover(new Request('https://sastamilaga.com/global/p/coats/'+pid.toLowerCase()),{},f);
 assert.equal(r.headers.get('location'),'https://sastamilaga.com/global-shop/p/'+pid+'/rainbow-coat/');
});
test('unknown and malformed legacy links remain genuine 404, not homepage redirects',async()=>{
 for(const path of ['/global/p/toys/9999999999999999999','/global/p/toys/not-an-id','/global/p/toys/1386583701764313088/unexpected/extra']){
  const r=await recover(new Request('https://sastamilaga.com'+path),{},async()=>Response.json({items:{}}));
  assert.equal(r.status,404);assert.equal(r.headers.get('Location'),null);
 }
});
