import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const script=fs.readFileSync(new URL('../staging/static-request/preview.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../staging/static-request/index.html',import.meta.url),'utf8');
function harness(){
 const store=new Map([['sm_cart','legacy-local'],['sm_gcart','legacy-global'],['sm_order_cart_v1','existing-requests']]);
 const changes=[];
 const sessionStorage={
  getItem:k=>store.get(k)||null,
  setItem:(k,v)=>{changes.push(k);store.set(k,String(v))},
  removeItem:k=>{changes.push(k);store.delete(k)}
 };
 function element(){
  return {textContent:'',className:'',disabled:false,children:[],handlers:{},
   append(...items){this.children.push(...items)},
   replaceChildren(){this.children=[];this.textContent=''},
   addEventListener(name,fn){this.handlers[name]=fn},
   getAttribute(name){return this.attrs?.[name]||null}
  };
 }
 const status=element(),count=element(),lines=element(),totals=element(),refresh=element();
 const buttons=[];
 function button(type,action,qty,color,size){
  const qtyInput={value:String(qty),focused:false,focus(){this.focused=true}};
  const opts=[{value:color,attrs:{'data-option':'colour'},getAttribute(name){return this.attrs[name]},focus(){this.focused=true}}];
  if(type==='local')opts.push({value:size,attrs:{'data-option':'size'},getAttribute(name){return this.attrs[name]},focus(){this.focused=true}});
  if(type==='cj')opts[0].attrs['data-option']='model';
  const scope={getAttribute:()=>type,querySelector:()=>qtyInput,querySelectorAll:()=>opts};
  const b=element();b.attrs={'data-action':action};b.closest=()=>scope;
  buttons.push(b);return{b,opts,qtyInput};
 }
 const nodes={'request-status':status,'cart-count':count,'request-lines':lines,'request-totals':totals,'refresh-request':refresh};
 const document={getElementById:id=>nodes[id],querySelectorAll:()=>buttons,createElement:element};
 const window={addEventListener(){}};
 return{button,run(){vm.runInNewContext(script,{window,document,sessionStorage,Array,Number,String,JSON,Error,Object,Map,console})},store,changes,nodes,buttons};
}
test('staging prototype uses only a demo-specific session cart and never calls remote commerce endpoints',()=>{
 const h=harness();
 const local=h.button('local','add',2,'Black','M'),cj=h.button('cj','quick',1,'Pro');
 h.run();
 local.b.handlers.click();cj.b.handlers.click();
 const rows=JSON.parse(h.store.get('sm_preview_cart_v1'));
 assert.equal(rows.length,2);
 assert.equal(rows[0].variant,'colour: Black / size: M');
 assert.equal(rows[0].qty,2);
 assert.equal(rows[1].unit,null);
 assert.equal(rows[1].variant,'model: Pro');
 assert.equal(h.nodes['cart-count'].textContent,'3');
 assert.equal(h.store.get('sm_cart'),'legacy-local');
 assert.equal(h.store.get('sm_gcart'),'legacy-global');
 assert.equal(h.store.get('sm_order_cart_v1'),'existing-requests');
 assert.deepEqual(h.changes,['sm_preview_cart_v1','sm_preview_cart_v1']);
});
test('required variation and invalid quantity fail without modifying any cart',()=>{
 const h=harness();
 const missing=h.button('local','add',1,'','M');
 const badQty=h.button('cj','add',0,'Pro');
 h.run();
 missing.b.handlers.click();badQty.b.handlers.click();
 assert.equal(h.changes.length,0);
 assert.match(h.nodes['request-status'].textContent,/Quantity must/);
});
test('repeated same variation is merged and cart persists through a second renderer',()=>{
 const h=harness(),item=h.button('local','add',1,'White','L');
 h.run();item.b.handlers.click();item.b.handlers.click();
 assert.equal(JSON.parse(h.store.get('sm_preview_cart_v1')).length,1);
 assert.equal(JSON.parse(h.store.get('sm_preview_cart_v1'))[0].qty,2);
 h.nodes['refresh-request'].handlers.click();
 assert.equal(h.nodes['cart-count'].textContent,'2');
});
test('no production checkout, Formspree, WooCommerce, passwords or reward balances appear in the demo',()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/fictitious demonstration products/);
 assert.doesNotMatch(html,/<script[^>]+order-cart\.js/i);
 assert.doesNotMatch(html,/<a[^>]+href="\/(order|request-cart|checkout)\//i);
 assert.doesNotMatch(script,/fetch\(|wp-json|woocommerce|formspree|paypalWorker|login\(|password|authRegister|rewardsLedger|localStorage\.clear\(/i);
 assert.match(script,/sessionStorage\.setItem\(KEY/);
 assert.match(script,/sm_preview_cart_v1/);
});
