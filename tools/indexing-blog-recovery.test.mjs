import test from 'node:test';import assert from 'node:assert/strict';
import {cachedBlogFetch,patchBlogRecovery} from './indexing-blog-recovery.mjs';
test('database outage uses a genuine archive with an immediate canonical',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<html><head><link rel="canonical" href="https://sastamilaga.com/b/"><script src="/app.js"></script></head><body>Sasta Milaga published archive with real guides and existing content. '+'.'.repeat(200)+'</body></html>',{headers:{'Content-Type':'text/html'}});
 try{const r=await cachedBlogFetch(new Request('https://sastamilaga.com/blog/'),{},null,{fetch:async()=>new Response('unavailable',{status:503})});assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('href="https://sastamilaga.com/blog/"'));assert.ok(!html.includes('src="/app.js"'));}finally{globalThis.fetch=old;}
});
test('individual missing articles remain unavailable instead of showing unrelated content',async()=>{
 const r=await cachedBlogFetch(new Request('https://sastamilaga.com/blog/unknown-article/'),{},null,{fetch:async()=>new Response('unavailable',{status:503})});assert.equal(r.status,503);
});
test('writes and unsupported source fail closed',async()=>{
 const r=await cachedBlogFetch(new Request('https://sastamilaga.com/blog/',{method:'POST'}),{},null,{fetch:async()=>new Response('Method not allowed',{status:405})});assert.equal(r.status,405);assert.throws(()=>patchBlogRecovery('unknown'));
});
