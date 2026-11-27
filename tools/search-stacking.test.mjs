import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/search-suggest.js',import.meta.url),'utf8');

test('suggestions elevate main header above sibling navigation only while visible',()=>{
  assert.match(source,/\.smh-main\.smss-open\{z-index:5\}/);
  assert.match(source,/headerMain\.classList\.add\('smss-open'\)/);
  assert.match(source,/headerMain\.classList\.remove\('smss-open'\)/);
  assert.match(source,/box\.hidden = false; if \(headerMain\) headerMain\.classList\.add/);
  assert.match(source,/box\.hidden = true; if \(headerMain\) headerMain\.classList\.remove/);
});
test('existing keyboard, accessibility and search functionality stay intact',()=>{
  for(const token of ['aria-expanded','aria-activedescendant','ArrowDown','ArrowUp','Escape','Enter','function paint','function run','function close'])
    assert.ok(source.includes(token),token);
});
