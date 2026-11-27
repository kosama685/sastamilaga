import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './legacy-global-category-redirect.mjs';
const go=(path,method='GET')=>worker.fetch(new Request('https://sastamilaga.com'+path,{method}));
test('known category permanent clean canonical',async()=>{const r=await go('/global/c/smart-watches/');assert.equal(r.status,301);assert.equal(r.headers.get('location'),'https://sastamilaga.com/c/global/smart-watches.html');assert.equal(r.headers.get('x-robots-tag'),null)});
test('filters retain customer state in fragment, noindex',async()=>{const r=await go('/global/c/smart-watches/?q=watch&min=10');assert.equal(r.status,302);assert.equal(r.headers.get('location'),'https://sastamilaga.com/#/global/c/smart-watches?q=watch&min=10');assert.match(r.headers.get('x-robots-tag'),/noindex/)});
test('unknown, unrelated and write requests fail closed',async()=>{for(const p of ['/global/c/nonexistent-unknown-slug-9876/','/checkout/','/global/g/electronics/'])assert.equal((await go(p)).status,404);assert.equal((await go('/global/c/smart-watches/','POST')).status,404)});
test('HEAD and mixed case preserve canonical identity',async()=>assert.equal((await go('/global/c/Smart-Watches','HEAD')).headers.get('location'),'https://sastamilaga.com/c/global/smart-watches.html'));
