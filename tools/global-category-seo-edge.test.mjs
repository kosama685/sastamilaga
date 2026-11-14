import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './global-category-seo-edge.mjs';
const url='https://sastamilaga.com';
const page='<html><head><title>Garden Tools | Sasta Milaga</title><meta name="description" content="All items ship worldwide"><meta property="og:description" content="All items ship worldwide"><link rel="canonical" href="'+url+'/c/global/garden-tools.html"></head><body><main><h1>Garden Tools</h1><p>Global items ship worldwide from our supplier network.</p><p>'+('Supplier category details and current market selection. '.repeat(10))+'</p></main></body></html>';
function env(html=page){
 let calls=0;
 return {UPSTREAM:{async fetch(){calls++;return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'public,max-age=30'}})}},count:()=>calls};
}
test('factual semantic rewrite and same-group category links',async()=>{
 const e=env();
 const r=await worker.fetch(new Request(url+'/c/global/garden-tools.html'),e);
 const h=await r.text();
 assert.equal(r.status,200);assert.equal(e.count(),1);
 assert.match(h,/check destination availability/i);
 assert.match(h,/International delivery depends on the selected item and destination/);
 assert.match(h,/id="sasta-global-qa-linking-v2"/);
 assert.match(h,/href="https:\/\/sastamilaga.com\/c\/global\//);
 assert.equal((h.match(/<h1/g)||[]).length,1);
 assert.equal(r.headers.get('x-sasta-semantic-seo'),'verified-category-v1');
});
test('cart and checkout bypass transform and are never rewritten',async()=>{
 for(const p of ['/cart/','/checkout/','/api/cj/variants']){
  const r=await worker.fetch(new Request(url+p),env());
  assert.equal(r.headers.get('x-sasta-semantic-seo'),null);
 }
});
test('no duplicate guide is generated when the upstream Pages artifact is updated',async()=>{
 const h=page.replace('</main>','<section id="sasta-global-qa-linking-v2"></section></main>');
 const r=await worker.fetch(new Request(url+'/c/global/garden-tools.html'),env(h));
 assert.equal((await r.text()).match(/sasta-global-qa-linking-v2/g)?.length,1);
});
