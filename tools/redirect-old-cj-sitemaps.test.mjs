import {test} from 'node:test';import assert from 'node:assert/strict';import worker from './redirect-old-cj-sitemaps.mjs';
const root='https://sastamilaga.com',target=root+'/sitemap-global-qualified.xml';
test('old 451k unverified product sitemap index redirects to qualified only',async()=>{
 for(const path of ['/sitemap-global-products.xml','/global-shop/sitemap.xml','/sitemaps/global/woman-boots.xml']){
  const r=await worker.fetch(new Request(root+path));
  assert.equal(r.status,301);assert.equal(r.headers.get('Location'),target);
 }
});
test('does not intercept qualified sitemap, cart, product pages or Merchant feeds',async()=>{
 for(const path of ['/sitemaps/global-qualified/1.xml','/cart/','/global-shop/p/1830116277370114048/product/','/feeds/global/1.xml'])assert.equal((await worker.fetch(new Request(root+path))).status,404);
});
test('HEAD redirects and POST cannot publish',async()=>{
 assert.equal((await worker.fetch(new Request(root+'/sitemap-global-products.xml',{method:'HEAD'}))).status,301);
 assert.equal((await worker.fetch(new Request(root+'/sitemap-global-products.xml',{method:'POST'}))).status,405);
});
