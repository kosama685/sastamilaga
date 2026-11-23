import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const routes=JSON.parse(fs.readFileSync('data/legacy-root-routes.json','utf8'));
const reported=JSON.parse(fs.readFileSync('data/legacy-reported-urls.json','utf8'));
test('every reported root content URL has a real, matching destination',()=>{
 for(const path of reported.filter(p=>/^\/[a-z0-9-]+\.html$/.test(p))){
  assert.ok(routes[path],path);
  assert.ok(fs.existsSync('.'+routes[path]),routes[path]);
 }
});
test('all aliases lead directly to canonical content and survive without JavaScript',()=>{
 assert.ok(Object.keys(routes).length>800);
 for(const [alias,target] of Object.entries(routes)){
  assert.match(target,/^\/(?:c\/(?:global\/)?|b\/)[a-z0-9-]+\.html$/);
  assert.ok(!routes[target]);
  const source=fs.readFileSync('.'+target,'utf8');
  assert.ok(source.includes('href="https://sastamilaga.com'+target+'"'),target);
  const html=fs.readFileSync('.'+alias,'utf8');
  assert.ok(html.includes('content="0;url='+target+'"'),alias);
  assert.ok(html.includes('href="'+target+'"'),alias);
  assert.ok(html.includes('+location.search+location.hash'),alias);
 }
});
test('browser redirect preserves query and fragment; unknown paths have no invented mappings',()=>{
 const html=fs.readFileSync('wool-and-blend.html','utf8');
 const script=/<script>([\s\S]*?)<\/script>/.exec(html)[1];
 let destination;
 vm.runInNewContext(script,{location:{search:'?utm_source=google',hash:'#products',replace:v=>{destination=v;}}});
 assert.equal(destination,'/c/global/wool-and-blend.html?utm_source=google#products');
 for(const p of ['/webmail','/cpanel','/missing-invented.html','/p/existing.html','/search/'])assert.equal(routes[p],undefined);
});
test('search suggestions use existing canonical pages rather than page-local hash routes',()=>{
 const src=fs.readFileSync('assets/js/search-suggest.js','utf8');
 const functions=src.slice(src.indexOf('      search: function'),src.indexOf('      lp: function'));
 const L=vm.runInNewContext('({'+functions+'})',{BASE:'https://sastamilaga.com/'});
 assert.equal(L.search('smart watches'),'https://sastamilaga.com/search/?q=smart%20watches');
 assert.equal(L.cat('wool-and-blend'),'https://sastamilaga.com/c/global/wool-and-blend.html');
 assert.equal(L.gp('old-category','ABC-123','Warm Wool Coat'),'https://sastamilaga.com/global-shop/p/ABC-123/warm-wool-coat/');
});
test('rendered search product cards use the working supplier product page',()=>{
 const src=fs.readFileSync('assets/js/global.js','utf8');
 const block=src.slice(src.indexOf('  const liveUrl ='),src.indexOf('  const fallback ='));
 const url=vm.runInNewContext(block+'detailHash("smart-watches",["2111897917664645122",null,"Smart Watch"]);',{
  A:{LIVE_URL:'https://sastamilaga.com'},slug:s=>s.toLowerCase().replace(/ /g,'-'),encodeURIComponent
 });
 assert.equal(url,'https://sastamilaga.com/global-shop/p/2111897917664645122/smart-watch/');
 const card=src.slice(src.indexOf('  function card('),src.indexOf('  function globalNote('));
 assert.equal((card.match(/detailHash\(cat, r\)/g)||[]).length,3);
});
