import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseHTML}=require(process.env.SM_DOM_MODULE||'linkedom');
const source=fs.readFileSync('assets/js/product-share.js','utf8');
const styles=fs.readFileSync('assets/css/product-share.css','utf8');

function createPage(withProduct=true, withSide=true) {
  const original='https://sastamilaga.com/p/test-local-product-hhc-100.html';
  const html='<!doctype html><html><head><link rel="canonical" href="'+original+'"><meta property="og:image" content="https://sastamilaga.com/assets/test.jpg"></head>'+
    '<body class="sm-static sm-page-static"><main>'+
    (withProduct?'<section class="pdp"><aside class="buy-panel">'+
      '<h1>Example Product</h1><div class="buy-actions"><a id="add" href="/cart/">Add to cart</a><a id="buy" href="/checkout/">Buy now</a></div>'+
      '<a class="sm-wa-btn" id="wa" href="https://wa.me/12345">Order on WhatsApp</a>'+
      '<ul class="sm-buy-facts"><li>Shipping</li></ul></aside>'+
      (withSide?'<div class="pdp-side"><section class="pdp-share"><h2>Share this product</h2><div class="sm-share"><a href="#old">WhatsApp</a></div></section></div>':'')+
      '</section>':'<section><h1>Not a product</h1></section>')+
    '</main></body></html>';
  const {document,window:domWindow}=parseHTML(html);
  // Linkedom shares its global window proxy across documents. Isolate the
  // module's one-time installation flag for each simulated browser page.
  const window={Event:domWindow.Event};
  Object.defineProperty(document,'readyState',{value:'loading'});
  let copied='',nativeCount=0;
  const navigator={clipboard:{writeText:async text=>{copied=text;}},share:async()=>{nativeCount++;}};
  const context={window,document,navigator,location:{href:original+'?utm_source=test#ignored'},URL,encodeURIComponent,console};
  vm.runInNewContext(source,context);
  document.dispatchEvent(new window.Event('DOMContentLoaded'));
  return {document,window,context,original,copied:()=>copied,nativeCount:()=>nativeCount};
}
test('product share: 14 visible branded options, canonical targets, and existing commerce unchanged',async()=>{
  const a=createPage(),d=a.document;
  assert.equal(d.querySelectorAll('[data-sm-product-share]').length,1);
  assert.equal(d.querySelectorAll('.smps-option').length,14);
  for(const title of ['WhatsApp','Facebook','X','Telegram','Pinterest','LinkedIn','Reddit','LINE','VK','Email','Instagram','TikTok','Copy link','More apps']){
    assert.ok([...d.querySelectorAll('.smps-label')].some(x=>x.textContent===title),title+' unavailable');
  }
  assert.ok(d.querySelector('.pdp-side > .pdp-share > .smps-panel'), 'full sharing widget belongs in the right-side card');
  assert.equal(d.querySelectorAll('.pdp-share [data-sm-product-share]').length,1);
  assert.equal(d.querySelectorAll('.pdp-share h2').length,1,'one heading only');
  assert.equal(d.querySelectorAll('.pdp-share .sm-share').length,0,'legacy four sharing pills removed');
  assert.equal(d.querySelectorAll('.buy-panel [data-sm-product-share]').length,0,'no share widget below purchase actions');
  assert.equal(d.querySelector('#add').getAttribute('href'),'/cart/');
  assert.equal(d.querySelector('#buy').getAttribute('href'),'/checkout/');
  assert.equal(d.querySelector('#wa').getAttribute('href'),'https://wa.me/12345');
  const whats=d.querySelector('.smps-option[aria-label="Share on WhatsApp"]');
  const fb=d.querySelector('.smps-option[aria-label="Share on Facebook"]');
  assert.ok(whats.getAttribute('href').includes(encodeURIComponent(a.original)));
  assert.ok(fb.getAttribute('href').includes(encodeURIComponent(a.original)));
  assert.equal(fb.getAttribute('rel'),'noopener noreferrer');
  assert.match(d.querySelector('.smps-heading h2').textContent,/Share this product/);
  d.querySelector('.smps-option[aria-label="Share on Copy link"]').click();
  await Promise.resolve();
  assert.equal(a.copied(),a.original);
  assert.match(d.querySelector('.smps-status').textContent,/copied/i);
  d.querySelector('.smps-option[aria-label="Share on Instagram"]').click();
  await Promise.resolve();
  assert.equal(a.nativeCount(),1);
  vm.runInNewContext(source,a.context);
  assert.equal(d.querySelectorAll('[data-sm-product-share]').length,1,'must not add duplicate widgets');
});
test('asynchronous PDP layout receives the social grid after sm:pdp-ready',()=>{
  const a=createPage(true,false),d=a.document;
  assert.equal(d.querySelectorAll('[data-sm-product-share]').length,0,'do not attach the share grid to the buying panel');
  const side=d.createElement('div'); side.className='pdp-side';
  const share=d.createElement('section');share.className='pdp-share';
  const legacy=d.createElement('h2');legacy.textContent='Share this product';
  share.appendChild(legacy);side.appendChild(share);
  d.querySelector('main .pdp').appendChild(side);
  d.dispatchEvent(new a.window.Event('sm:pdp-ready'));
  assert.equal(d.querySelectorAll('.pdp-share .smps-option').length,14);
  assert.equal(d.querySelectorAll('.buy-panel .smps-panel').length,0);
  d.dispatchEvent(new a.window.Event('sm:pdp-ready'));
  assert.equal(d.querySelectorAll('.smps-panel').length,1,'repeated PDP ready event must not duplicate widgets');
});

test('moves an older share widget out of the buy-panel without duplicating controls',()=>{
  const a=createPage(),d=a.document,old=d.querySelector('.smps-panel');
  d.querySelector('.buy-panel').appendChild(old);
  assert.equal(d.querySelectorAll('.buy-panel .smps-panel').length,1);
  d.dispatchEvent(new a.window.Event('sm:pdp-ready'));
  assert.equal(d.querySelectorAll('.pdp-share > .smps-panel').length,1);
  assert.equal(d.querySelectorAll('.smps-option').length,14);
  assert.equal(d.querySelectorAll('.buy-panel .smps-panel').length,0);
});

test('non-product pages have no share injection',()=>{
  const a=createPage(false);
  assert.equal(a.document.querySelector('[data-sm-product-share]'),null);
});
test('static and CJ buy-panel top alignment is 0px and social icons are visible',()=>{
  assert.match(styles,/body\.sm-page-static section\.pdp \.buy-panel\s*\{\s*top:\s*0px\s*!important/);
  assert.match(styles,/\.smps-mark\s*\{/);
  assert.match(styles,/\.smps-grid\s*\{/);
  assert.match(styles,/focus-visible/);
  assert.match(styles,/\.pdp-share\s*>\s*\.smps-panel/);
  assert.match(styles,/border:0/);
});
