// DOM regression tests. Set SM_DOM_MODULE to an isolated linkedom installation.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {parseHTML}=require(process.env.SM_DOM_MODULE || 'linkedom');
const html=readFileSync(process.env.SM_MARKET_HTML || new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(process.env.SM_MARKET_SOURCE || new URL('../assets/js/market.js',import.meta.url),'utf8');
function boot(country,currency,manifest=true) {
 const {document,window:domWindow}=parseHTML(html);
 const window={Event:domWindow.Event,addEventListener(){},dispatchEvent(){}};
 Object.defineProperty(document,'readyState',{value:'loading'});
 Object.defineProperty(document,'baseURI',{value:'https://sastamilaga.com/'});
 document.cookie='';
 const store=new Map([['sm_market',JSON.stringify({country,currency,lang:'en'})]]);
 const callbacks=[];
 const context={window,document,Intl,URL,URLSearchParams,WeakMap,NodeFilter:{SHOW_TEXT:4,FILTER_REJECT:2,FILTER_ACCEPT:1,FILTER_SKIP:3},
   navigator:{userAgent:'Mozilla/5.0',language:'en-US'},location:{search:'',pathname:'/',href:'https://sastamilaga.com/'},
   localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},sessionStorage:{getItem:()=>null},
   MutationObserver:class {observe(){}},requestAnimationFrame:f=>callbacks.push(f),setTimeout,clearTimeout,AbortController,
   fetch:()=>Promise.reject(Error('No network permitted in regression test'))};
 window.SM_CJ=manifest?{cats:[{s:'garden-tools',n:'Garden Tools',img:'https://example.com/tools.jpg'}]}:null;
 const stack=document.querySelector('[data-fill="stack"]');
 stack.innerHTML='<a class="sm-stack__card" href="p/local.html">Local item</a>';
 document.getElementById('home-view').insertAdjacentHTML('beforeend','<a id="normalized-shop-test" href="/shop/" data-route="shop">Shop</a>');
 vm.runInNewContext(source,context);
 document.dispatchEvent(new window.Event('DOMContentLoaded'));
 return {document,window,callbacks};
}
for(const [country,currency,name] of [['SA','SAR','Saudi Arabia'],['AE','AED','United Arab Emirates'],['US','USD','United States'],['PK','SAR','Pakistan']]) {
 test(`${country}/${currency}: destination copy and eligible catalog`,()=>{
  const {document:d,window:w}=boot(country,currency);
  assert.match(d.querySelector('[data-market-copy="title"]').textContent,new RegExp(name));
  assert.doesNotMatch(d.querySelector('.smh-top__trust').textContent,/Pakistan store/);
  const local=country==='PK';
  assert.equal(d.querySelector('.smh-search__cat').hidden,!local);
  for(const e of d.querySelectorAll('[data-market-local-home]'))assert.equal(e.hidden,!local);
  if(!local){
   for(const e of d.querySelectorAll('[data-market-copy]'))assert.doesNotMatch(e.textContent,/Pakistan|cash on delivery/i);
   assert.match(d.querySelector('[data-fill="stack"] a').href,/\/c\/global\/garden-tools.html$/);
   assert.match(d.querySelector('.sm-hero a[href]')?.href || d.querySelector('a[href="https://sastamilaga.com/c/global/index.html"]').href,/c\/global\/index.html/);
   assert.match(w.SMMarket.experience(country,currency).payment,/prepaid/);
   assert.equal(d.getElementById('normalized-shop-test').getAttribute('data-route'),null);
   assert.match(d.getElementById('normalized-shop-test').href,/c\/global\/index.html$/);
  } else assert.equal(d.querySelector('[data-fill="stack"] a').getAttribute('href'),'p/local.html');
  assert.equal(d.querySelector('link[rel="canonical"]').href,'https://sastamilaga.com/');
 });
}
test('global manifest unavailable: local-only hero stays hidden',()=>{
 const {document:d}=boot('SA','SAR',false);
 assert.equal(d.querySelector('[data-fill="stack"]').hidden,true);
});
test('same page can return from Saudi Arabia to Pakistan without stale copy or links',()=>{
 const {document:d,window:w,callbacks}=boot('SA','SAR');
 Object.assign(w.SMMarket.state(),{country:'PK',currency:'PKR'});
 d.dispatchEvent(new w.Event('sasta:rendered'));
 callbacks.splice(0).forEach(f=>f());
 assert.match(d.querySelector('[data-market-copy="title"]').textContent,/Shopping for Pakistan/);
 assert.match(d.querySelector('[data-market-copy="payment"]').textContent,/Cash on delivery/);
 assert.equal(d.querySelector('[data-fill="stack"] a').getAttribute('href'),'p/local.html');
 assert.equal(d.querySelector('[data-fill="cats"]').hidden,false);
 assert.ok(d.querySelector('a[href="shop/"]'));
 assert.equal(d.getElementById('normalized-shop-test').getAttribute('data-route'),'shop');
 assert.equal(d.getElementById('normalized-shop-test').getAttribute('href'),'/shop/');
});
test('homepage has raw canonical, factual schema and crawlable help links',()=>{
 const {document:d}=parseHTML(html);
 for(const script of d.querySelectorAll('script[type="application/ld+json"]'))if(script.textContent.trim())JSON.parse(script.textContent);
 for(const href of ['shipping/','returns/','how-to-order/'])assert.ok(d.querySelector(`a[href="${href}"]`));
 assert.equal(d.querySelectorAll('link[rel="canonical"]').length,1);
 assert.doesNotMatch(source,/Shop our Pakistan store from/);
});
test('global directory links load the real index instead of an invented category',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const fn=app.slice(app.indexOf('function cleanToRoute('),app.indexOf('/* Navigate inside the app'));
 const context={APP_BASE:'/'};
 vm.runInNewContext(fn,context);
 assert.equal(context.cleanToRoute('/c/global/index.html'),null);
 assert.equal(context.cleanToRoute('/c/global/garden-tools.html'),'global/c/garden-tools');
});
test('every supported international destination avoids Pakistan-store and COD promises',()=>{
 const {window:w}=boot('SA','SAR');
 for(const [country,currency] of Object.entries(w.SMMarket.currencies)){
  const view=w.SMMarket.experience(country,currency);
  if(country!=='PK')for(const key of ['title','trust','lead','order','payment','cta'])assert.doesNotMatch(view[key],/Pakistan|cash on delivery/i,country+': '+key);
 }
});
