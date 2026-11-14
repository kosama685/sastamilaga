import assert from 'node:assert/strict';
import {test} from 'node:test';
import worker from './sasta-ops-guard-worker.mjs';

function fakeEnv(){
 const writes=[];
 return {writes,DB:{
  prepare(sql){
   return {
    async first(){
     if(sql.includes('catalog_products_cj'))return {n:451812};
     if(sql.includes('cj_product_enrichment'))return {n:1};
     if(sql.includes('ORDER BY recorded_at DESC'))return {recorded_at:'2026-11-14T06:00:00.000Z',catalog_total:451812,seo_approved:1,sitemap_status:200,product_status:200,cart_status:200,feed_status:200,healthy:1,errors_json:'[]'};
     return {};
    },
    bind(...args){writes.push({sql,args});return {async run(){return {success:true}}}}
   };
  }
 }};
}
test('health endpoint is read only and caveats avoid asserting checkout success',async()=>{
 const e=fakeEnv();
 const res=await worker.fetch(new Request('https://sastamilaga.com/__ops-health.json'),e);
 assert.equal(res.status,200);
 const json=await res.json();
 assert.equal(json.supplier_records,451812);
 assert.ok(json.caveats.some(x=>x.includes('does not prove')));
 assert.equal(e.writes.length,0);
});
test('unknown routes are not proxied and cannot trigger commerce',async()=>{
 const r=await worker.fetch(new Request('https://sastamilaga.com/checkout/'),fakeEnv());
 assert.equal(r.status,404);
});
test('scheduled guard records only one audit row; never calls WordPress cron',async()=>{
 const old=globalThis.fetch;
 const urls=[];
 globalThis.fetch=async(url)=>{urls.push(String(url));return new Response(null,{status:200})};
 const e=fakeEnv();
 const pending=[];
 try{
 await worker.scheduled({scheduledTime:Date.parse('2026-11-14T06:00:00.000Z')},e,{waitUntil:p=>pending.push(p)});
 await Promise.all(pending);
 assert.equal(e.writes.length,1);
 assert.equal(e.writes[0].args[2],451812);
 assert.equal(e.writes[0].args[3],1);
 assert.ok(urls.every(x=>!x.includes('wp-cron.php')));
 assert.equal(urls.length,4);
 }finally{globalThis.fetch=old}
});
