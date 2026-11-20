import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseHTML}=require(process.env.SM_DOM_MODULE||'linkedom');
const routes=JSON.parse(fs.readFileSync('data/landing/routes.json','utf8')).routes;
const script=fs.readFileSync('assets/js/landing-storefront.js','utf8');
function load(route,reduced=false){
 const {document,Event}=parseHTML(fs.readFileSync(route.rel+'/index.html','utf8'));
 const q=s=>document.querySelector(s);let scheduled=0,callback;
 // Supply the standard select/checkbox APIs not implemented by Linkedom.
 Object.defineProperty(q('[data-sort]'),'value',{writable:true,value:'featured'});
 document.querySelectorAll('[data-category-filter]').forEach(e=>Object.defineProperty(e,'checked',{get(){return this.hasAttribute('checked')},set(v){this.toggleAttribute('checked',v)}}));
 const motion={matches:reduced,addEventListener(type,fn){callback=fn;}};
 vm.runInNewContext(script,{document,Intl,Date,window:{matchMedia:()=>motion},setInterval(){scheduled++;return 1},clearInterval(){scheduled=0},setTimeout(fn){fn();}});
 return {document,Event,q,scheduled:()=>scheduled,motionChanged:()=>callback(),motion,cards:()=>[...document.querySelectorAll('[data-sx-category]')].filter(c=>!c.hidden)};
}
for(const route of routes){
 test(route.rel+': slider controls and motion preference',()=>{
  const a=load(route),slides=[...a.document.querySelectorAll('[data-hero-slide]')];
  assert.equal(slides.filter(s=>!s.hidden).length,1);assert.equal(a.scheduled(),1);
  a.q('[data-slide-next]').click();assert.equal(slides[0].hidden,true);assert.equal(slides[1].hidden,false);assert.equal(slides[1].inert,false);
  a.q('[data-slide-prev]').click();assert.equal(slides[0].hidden,false);
  a.q('[data-slide-to="1"]').click();assert.equal(a.q('[data-slide-to="1"]').getAttribute('aria-pressed'),'true');
  a.q('[data-slide-pause]').click();assert.equal(a.scheduled(),0);
  a.q('[data-slide-pause]').click();assert.equal(a.scheduled(),1);
  a.motion.matches=true;a.motionChanged();assert.equal(a.scheduled(),0);
  const reduced=load(route,true);assert.equal(reduced.scheduled(),0,'no autoplay for reduced motion');
 });
 test(route.rel+': search, filters, sorting, daily edit and pagination',()=>{
  const a=load(route),{q,Event,cards}=a;
  assert.equal(cards().length,8);q('[data-show-more]').click();assert.equal(cards().length,route.market==='pakistan'?10:16);
  q('[data-product-search]').value='no-matching-product-123';q('[data-product-search]').dispatchEvent(new Event('input'));assert.equal(cards().length,0);assert.equal(q('[data-empty]').hidden,false);
  q('[data-clear]').click();assert.equal(cards().length,8);
  const box=q('[data-category-filter]');box.checked=true;box.dispatchEvent(new Event('change'));assert.ok(cards().length>0);assert.ok(cards().every(c=>c.dataset.sxCategory===box.value));q('[data-clear]').click();
  q('[data-sort]').value='az';q('[data-sort]').dispatchEvent(new Event('change'));const names=cards().map(c=>c.querySelector('h3').textContent);assert.deepEqual(names,[...names].sort((x,y)=>x.localeCompare(y,route.lang)));
  q('[data-clear]').click();q('[data-view="list"]').click();assert.ok(q('.smx-products').classList.contains('smx-products--list'));
  const before=cards().map(c=>c.dataset.original).join(',');q('[data-period="weekend"]').click();assert.notEqual(cards().map(c=>c.dataset.original).join(','),before);
  if(q('[data-min-price]')){q('[data-min-price]').value='1000';q('[data-min-price]').dispatchEvent(new Event('input'));assert.ok(cards().every(c=>Number(c.dataset.sxPrice)>=1000));}
 });
 test(route.rel+': reference sections replace duplicate blocks',()=>{
  const {q,document}=load(route);
  assert.equal(document.querySelectorAll('.smx-promos .smx-promo').length,3);
  assert.equal(document.querySelectorAll('.smx-category-grid .smx-category-card').length,8);
  assert.equal(q('.smx-time'),null);assert.equal(q('.smx-explore'),null);
  for(const img of document.querySelectorAll('.smx-promos img'))assert.ok(fs.existsSync('.'+img.getAttribute('src')));
 });
}
