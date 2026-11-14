import test from 'node:test';
import assert from 'node:assert/strict';
import {ROBOTS,indexingHead,indexingRedirect,patchIndexingSource,patchIndexingLinks} from './indexing-edge-policy.mjs';
test('public and transactional pages can be crawled to read their index policy',()=>{
 assert.ok(ROBOTS.includes('Sitemap: https://sastamilaga.com/sitemap.xml'));
 for(const route of ['/assets/','/cart/','/checkout/','/my-account/','/p/','/c/'])assert.ok(!ROBOTS.includes('Disallow: '+route));
 assert.ok(!/^Disallow: \/\s*$/m.test(ROBOTS));
});
test('one canonical is emitted inside head without changing body or scripts',()=>{
 const body='<body><a href="/cart/">Cart</a></body>';
 const html='<html><head><script defer src="/app.js"></script><link rel="canonical" href="https://old.test/"><link href="https://wrong.test/" rel="canonical"></head>'+body+'</html>';
 const result=indexingHead(html,new URL('https://sastamilaga.com/p/a.html?utm_source=test'));
 assert.equal((result.match(/rel="canonical"/g)||[]).length,1);
 assert.ok(result.includes('<link rel="canonical" href="https://sastamilaga.com/p/a.html"></head>'));
 assert.ok(result.includes('<script defer src="/app.js"></script>'));
 assert.ok(result.includes(body));
});
test('aliases consolidate in one step and retain filters',()=>{
 for(const [from,to] of [['/global/','/c/global/index.html'],['/global-shop/','/c/global/index.html'],['/index.html','/'],['/shop?sort=price','/shop/?sort=price']]){
  const r=indexingRedirect(new Request('http://www.sastamilaga.com'+from));
  assert.equal(r.status,301);assert.equal(r.headers.get('Location'),'https://sastamilaga.com'+to);
 }
 assert.equal(indexingRedirect(new Request('https://sastamilaga.com/c/global/index.html')),null);
});
test('checkout, callbacks, sessions and non-GET requests are untouched',()=>{
 for(const path of ['/cart/','/checkout/','/my-account/','/wp-json/gdcs/v1/context','/api/cj/shipping','/?add-to-cart=15','/?wc-ajax=update_order_review','/global-shop/p/123/name/'])
  assert.equal(indexingRedirect(new Request('https://sastamilaga.com'+path)),null);
 assert.equal(indexingRedirect(new Request('https://sastamilaga.com/global-shop/',{method:'POST',body:'test'})),null);
});
test('patch fails closed against an unknown live source',()=>assert.throws(()=>patchIndexingSource('export default {}')));
test('link patch preserves product paths and modifies only known HTML aliases',()=>{
 const source="if(path==='/global-shop'||path==='/global-shop/')path='/c/global/index.html';"+'<a href="/global-shop/">Global</a><a href="/global-shop/p/123/item/">Item</a>';
 const result=patchIndexingLinks(source);
 assert.ok(result.includes('href="/c/global/index.html"'));
 assert.ok(result.includes('href="/global-shop/p/123/item/"'));
});
