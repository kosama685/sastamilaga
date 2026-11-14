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
