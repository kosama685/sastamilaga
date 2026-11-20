import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {eligiblePromotions} from './campaign-promotions.mjs';
const root=process.cwd(),require=createRequire(import.meta.url),{parseHTML}=require(process.env.SM_DOM_MODULE||'linkedom');
const {routes}=JSON.parse(fs.readFileSync('data/campaigns/routes.json','utf8'));
const landing=JSON.parse(fs.readFileSync('data/landing/routes.json','utf8')).routes.filter(r=>r.market!=='hub');
const registry=JSON.parse(fs.readFileSync('data/campaigns/registry.json','utf8'));
const read=r=>fs.readFileSync(path.join(r.rel,'index.html'),'utf8');
const sitemap=fs.readFileSync('sitemap-campaigns.xml','utf8');
test('all six markets and all existing language variants have complete hubs and two occasion pages',()=>{
 assert.equal(routes.length,58);assert.equal(routes.filter(r=>r.market==='hub').length,3);
 for(const v of landing){const rs=routes.filter(r=>r.market===v.market&&r.lang===v.lang);for(const kind of ['offers','events','special-days'])assert.ok(rs.some(r=>r.kind===kind));for(const topic of registry.countries[v.market].featured)assert.ok(rs.some(r=>r.topic===topic));}
 assert.equal((fs.readFileSync('sitemap.xml','utf8').match(/sitemap-campaigns\.xml/g)||[]).length,1);
});
for(const r of routes){
 test(r.rel+': canonical, indexability, language, schema and reciprocal alternates',()=>{
  const h=read(r),{document}=parseHTML(h);
  assert.equal(document.querySelectorAll('h1').length,1);assert.equal(document.documentElement.lang,r.lang);
  assert.equal(document.documentElement.getAttribute('dir'),r.dir);assert.equal(document.querySelector('link[rel=canonical]').getAttribute('href'),r.url);
  assert.match(document.querySelector('meta[name=robots]').getAttribute('content'),/^index, follow/);
  assert.ok(document.title.length>20&&document.title.length<95);assert.ok(document.querySelector('meta[name=description]').getAttribute('content').length>=60);
  assert.ok(h.includes('sm-chrome-header')&&h.includes('sm-chrome-footer')&&h.includes('assets/js/chrome.js'));
  const graph=JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];assert.ok(graph.some(n=>n['@type']==='CollectionPage'));assert.ok(graph.some(n=>n['@type']==='BreadcrumbList'));assert.ok(graph.some(n=>n['@type']==='FAQPage'));
  assert.ok(!graph.some(n=>['Offer','Event','AggregateOffer'].includes(n['@type'])),'no invented sale or official event schema');
  const faq=graph.find(n=>n['@type']==='FAQPage');for(const q of faq.mainEntity)assert.ok(document.body.textContent.includes(q.acceptedAnswer.text));
  for(const s of routes.filter(s=>s.market===r.market&&s.kind===r.kind&&s.topic===r.topic))assert.ok(h.includes(`hreflang="${s.lang}" href="${s.url}"`));
  assert.ok(sitemap.includes('<loc>'+r.url+'</loc>'));assert.doesNotMatch(h,/\{(?:country|to|label|loc|region|то|лабел|лоц|регион)\}/);
 });
 test(r.rel+': internal URLs, fragment anchors and merchandising are real',()=>{
  const {document}=parseHTML(read(r));
  for(const node of document.querySelectorAll('[href],[src]'))for(const attr of ['href','src']){
   const v=node.getAttribute(attr);if(!v||/^(https?:|mailto:|tel:|data:)/.test(v))continue;
   const u=new URL(v,r.url);if(/^\/global-shop\/p\/(?:[A-Fa-f0-9-]{36}|\d{19})\//.test(u.pathname))continue;
   let target=path.join(root,u.pathname);if(u.pathname.endsWith('/'))target=path.join(target,'index.html');assert.ok(fs.existsSync(target),r.rel+' -> '+v);
   if(u.hash&&/\.html$/.test(target)){const {document:other}=parseHTML(fs.readFileSync(target,'utf8'));assert.ok(other.getElementById(decodeURIComponent(u.hash.slice(1))),r.rel+' missing anchor '+v);}
  }
  if(r.market!=='hub'){assert.ok(document.querySelectorAll('[data-sx-category]').length>=8);assert.equal(document.querySelectorAll('.smx-promos .smx-promo').length,3);}
 });
}
test('event and special-day hubs include every configured occasion, fixed dates and source references',()=>{
 for(const r of routes.filter(r=>r.kind!=='occasion'&&r.market!=='hub')){const {document}=parseHTML(read(r));const ids=r.kind==='special-days'?registry.specialDays:registry.countries[r.market].events;for(const id of ids){const card=document.getElementById(id);assert.ok(card,r.rel+' lacks '+id);assert.ok(card.querySelectorAll('.smc-category-links a').length>=2);if(registry.topics[id].source)assert.ok(card.querySelector('.smc-source'));}}
});
test('there are no synthetic discounts, false countdowns or environmental certifications',()=>{
 for(const r of routes){const {document}=parseHTML(read(r)),text=document.body.textContent.replace(/not a guaranteed arrival/g,'not promised');assert.doesNotMatch(text,/\b(?:\d+% off|lowest price|guaranteed arrival|official partner|verified sustainable)\b/i);if(r.kind==='offers'&&r.market!=='hub')assert.ok(document.querySelector('.smc-offer-status'));}
});
test('expired promotions are hidden on cached pages',()=>{
 const {document}=parseHTML('<div data-promotion-end="2000-01-01T00:00:00Z">Expired</div><div data-promotion-end="2999-01-01T00:00:00Z">Future</div>');vm.runInNewContext(fs.readFileSync('assets/js/campaigns.js','utf8'),{document,Date,Number,setInterval(){}});const cards=document.querySelectorAll('[data-promotion-end]');assert.equal(cards[0].hidden,true);assert.equal(cards[1].hidden,false);
});
test('all new catalog interfaces initialize and filter',()=>{
 for(const r of routes.filter(r=>r.market!=='hub')){const {document,Event}=parseHTML(read(r));Object.defineProperty(document.querySelector('[data-sort]'),'value',{writable:true,value:'featured'});vm.runInNewContext(fs.readFileSync('assets/js/landing-storefront.js','utf8'),{document,Intl,Date,window:{matchMedia:()=>({matches:true,addEventListener(){}})},setInterval(){},clearInterval(){},setTimeout(){}});assert.equal([...document.querySelectorAll('[data-sx-category]')].filter(c=>!c.hidden).length,8,r.rel);const search=document.querySelector('[data-product-search]');search.value='no-match-0123456789';search.dispatchEvent(new Event('input'));assert.equal(document.querySelector('[data-empty]').hidden,false);}
});
test('campaign generation is deterministic and the keyword map covers every page',()=>{
 const before=routes.map(read).join('')+fs.readFileSync('sitemap-campaigns.xml','utf8');execFileSync(process.execPath,['tools/build-landing-pages.mjs']);assert.equal(routes.map(read).join('')+fs.readFileSync('sitemap-campaigns.xml','utf8'),before);
 const map=fs.readFileSync('data/campaigns/keyword-map.csv','utf8');for(const r of routes)assert.ok(map.includes(r.url));
});
test('promotion publication rejects expired, future, unsupported, undocumented and unsafe offers',()=>{
 const now=Date.parse('2026-11-20T12:00:00Z'),valid={market:'germany',verified:true,title:'Documented campaign',url:'/shipping-to/germany/offers/',termsUrl:'/terms/',evidenceUrl:'https://example.com/evidence',startsAt:'2026-11-19T00:00:00Z',endsAt:'2026-11-21T00:00:00Z'};
 assert.equal(eligiblePromotions([valid],'germany',now).length,1);
 for(const patch of [{verified:false},{evidenceUrl:''},{termsUrl:''},{termsUrl:'javascript:alert(1)'},{url:'https://example.com'},{market:'usa'},{startsAt:'2026-11-21T00:00:00Z'},{endsAt:'2026-11-19T00:00:00Z'}])assert.equal(eligiblePromotions([{...valid,...patch}],'germany',now).length,0);
});
