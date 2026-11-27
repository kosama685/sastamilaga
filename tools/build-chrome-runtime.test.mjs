import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('runtime chrome contains exactly the four keys rendered on static pages',()=>{
 const src=JSON.parse(fs.readFileSync('partials/chrome.json','utf8'));
 const lite=JSON.parse(fs.readFileSync('partials/chrome-runtime.json','utf8'));
 assert.deepEqual(Object.keys(lite),['header','footer','boot','smh']);
 for(const k of Object.keys(lite))assert.equal(lite[k],src[k]);
 assert.ok(JSON.stringify(lite).length < JSON.stringify(src).length*0.75,'runtime header is smaller than monolithic source');
});
test('existing local static product pages retain SEO-rendered HTML independently of shared chrome',()=>{
 const h=fs.readFileSync('p/1-pc-foldable-traveling-hanger-hhc-890653.html','utf8');
 assert.match(h,/<h1(?:\\s|>)/);
 assert.match(h,/application\/ld\+json/);
 assert.match(h,/id="sm-chrome-header"/);
});

test('shared travel links use the same destinations as the storefront',()=>{
 const home=fs.readFileSync('index.html','utf8');
 const chrome=JSON.parse(fs.readFileSync('partials/chrome-runtime.json','utf8'));
 const links = markup => [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)]
  .map(([,href])=>href).filter(href=>/^(?:flights\/|travel\/|#\/travel\?tab=(?:flights|stays))$/.test(href)).sort();
 for(const [field,selector] of [
  ['header', /<header class="wp-block-template-part"[\s\S]*?<\/header>/],
  ['footer', /<footer class="smf"[\s\S]*?<\/footer>/]
 ]){
  const expected=links(home.match(selector)[0]);
  assert.ok(expected.includes('flights/'));
  assert.deepEqual(links(chrome[field]),expected);
 }
});
