import test from 'node:test';
import assert from 'node:assert/strict';
import app,{xmlClean} from './sitemap-pages-dedupe-worker.mjs';
const URL='https://sastamilaga.com/sitemap-pages.xml';
const valid='<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 '<url><loc>https://sastamilaga.com/</loc></url>'+
 '<url><loc>https://sastamilaga.com/visa/</loc><lastmod>2026-11-21</lastmod></url>'+
 '<url><loc>https://sastamilaga.com/c/global/garden-tools.html</loc></url>'+
 '<url><loc>https://sastamilaga.com/b/</loc></url></urlset>';
function env(body=valid,status=200){return {UPSTREAM:{async fetch(req){
 assert.equal(req.method,'GET');
 return new Response(body,{status,headers:{'content-type':'application/xml'}});
}}};}
test('keeps actual canonical product/category pages while excluding urls owned by dedicated blog and visa sitemaps',async()=>{
 const r=await app.fetch(new Request(URL),env());
 assert.equal(r.status,200);
 const xml=await r.text();
 assert.match(xml,/garden-tools\.html/);assert.match(xml,/sastamilaga\.com\/</);
 assert.doesNotMatch(xml,/<loc>https:\/\/sastamilaga\.com\/(?:visa|b)\/<\/loc>/);
 assert.equal(r.headers.get('X-Sasta-Duplicate-Sitemap-URLs-Removed'),'2');
 assert.equal(r.headers.get('X-Sasta-Pages-Listed'),'2');
});
test('idempotent when upstream already cleaned',async()=>{
 const once=xmlClean(valid).clean,twice=xmlClean(once);
 assert.equal(twice.removed,0);assert.equal(twice.clean,once);
});
test('does not impact checkout or other urls and does not mutate GET',async()=>{
 assert.equal((await app.fetch(new Request('https://sastamilaga.com/cart/'),env())).status,404);
 assert.equal((await app.fetch(new Request(URL,{method:'POST'}),env())).status,405);
});
test('HEAD has valid headers but no content',async()=>{
 const r=await app.fetch(new Request(URL,{method:'HEAD'}),env());
 assert.equal(r.status,200);assert.equal(await r.text(),'');
});
test('failure propagates safely instead of fictitious XML',async()=>{
 for(const source of ['broken','<urlset/>'])assert.equal((await app.fetch(new Request(URL),env(source))).status,503);
 assert.equal((await app.fetch(new Request(URL),env('Bad Gateway',503))).status,503);
 assert.equal((await app.fetch(new Request(URL),{})).status,503);
});
