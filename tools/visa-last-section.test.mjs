import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const js=readFileSync(new URL('../assets/js/pages.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
function fixture(hubPresent=true){
 const fields=new Map(); let lead=null,panel=null,inserted='',observe=null;
 const el=(id)=>{if(!fields.has(id))fields.set(id,{id,innerHTML:'',textContent:'',hidden:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},scrollIntoView(){this.scrolled=true;},setAttribute(name,value){this[name]=value;},classList:{add(){}}});return fields.get(id);};
 const app={parentElement:{},contains(x){return inserted==='app'&&x===panel;},querySelector(selector){return selector==='section.sm-page'?el('panel'):null;},insertBefore(x,y){lead=x;},__smVisaCleanup:null};
 const heading=el('heading');el('panel').querySelector=(selector)=>selector==='.sm-page-head'?heading:null; el('panel').insertAdjacentHTML=()=>{};el('panel').classList={add(){}};el('panel').setAttribute=()=>{};
 const hub={parentElement:app.parentElement,insertAdjacentElement(placement,x){assert.equal(placement,'afterend');panel=x;inserted='after-hub';}};
 const document={
  body:{dataset:{view:'app'}},
  createElement(){return {appendChild(){},insertAdjacentHTML(){},setAttribute(){},className:'',id:''};},
  getElementById(id){if(id==='app')return app;if(id==='sm-visa-enquiry')return panel;if(id==='sm-visa-lead')return lead;return el(id);},
  querySelector(selector){return selector==='#main > .sv-hub'&&hubPresent?hub:null;}
 };
 const market={list:()=>[{c:'PK',n:'Pakistan'},{c:'JP',n:'Japan'},{c:'SA',n:'Saudi Arabia'}],state:()=>({country:'PK'}),countryName:c=>c,flag:c=>c};
 const A={APP_BASE:'/',SITE_URL:'https://sastamilaga.com',esc:s=>String(s),pageHead:()=>'<header>Visa destinations</header>',waLink:s=>'https://wa.me/923343582295?text='+encodeURIComponent(s),setSEO(){},renderApp(){},cleanRoute:()=>''};
 const window={SMApp:A,SMMarket:market,SM_CONFIG:{}};
 class Obs{constructor(cb){observe=cb;}observe(){}}
 vm.runInNewContext(js,{window,document,MutationObserver:Obs,URL,URLSearchParams,Intl,console,location:{pathname:'/visa/',href:'https://sastamilaga.com/visa/',hash:''},history:{replaceState(){}},setTimeout:f=>f(),clearTimeout(){}});
 return {window,el,getPanel:()=>panel,getInsert:()=>inserted,header:()=>lead,mutation:()=>observe&&observe()};
}
test('Visa interactive cards are moved after the static guide hub',()=>{
 const x=fixture();x.window.SMPages.route('visa','');
 assert.equal(x.getInsert(),'after-hub');assert.equal(x.getPanel().id,'sm-visa-enquiry');
 assert.equal(x.header().id,'sm-visa-lead');
 assert.match(x.el('vgrid').innerHTML,/Japan/);
 x.el('vsq').handlers.input({target:{value:'Japan'}});
 assert.match(x.el('vcount').textContent,/1 destination/);
 assert.doesNotMatch(x.el('vgrid').innerHTML,/Saudi Arabia/);
 x.el('visa-jump').handlers.click();
 assert.equal(x.getPanel().scrolled,true);
});
test('Visa enquiry remains available on pages without the static guide hub',()=>{
 const x=fixture(false);x.window.SMPages.route('visa','');
 assert.match(x.el('vgrid').innerHTML,/Japan/);
});
test('Visa design is scoped, responsive and handles route changes',()=>{
 assert.match(css,/\.sm-visa-enquiry\s*\{/);
 assert.match(css,/\.sm-visa-enquiry \.sm-visa\s*\{/);
 assert.match(css,/@media \(max-width:640px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(js,/obs\.observe\(visaApp, \{ childList: true \}\)/);
});
