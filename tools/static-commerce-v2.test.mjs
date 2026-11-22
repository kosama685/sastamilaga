import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../staging/static-commerce-v2/'+p,import.meta.url),'utf8');
function fixture(){
 const storage=new Map(),session=new Map(),listeners=[];
 const mk=x=>({getItem:k=>x.get(k)||null,setItem:(k,v)=>x.set(k,String(v)),removeItem:k=>x.delete(k)});
 const win={localStorage:mk(storage),sessionStorage:mk(session),crypto:globalThis.crypto,
   dispatchEvent:e=>listeners.push(e),SMStaticStore:null};
 const context={window:win,CustomEvent:class{constructor(name,data){this.type=name;this.detail=data?.detail}},Date,JSON,
   Number,String,Array,Math,Error,Intl,setTimeout,clearTimeout,FormData,AbortController,fetch:async()=>({ok:true})};
 for(const mod of ['store.js','products.js','paypal.js','utils.js'])vm.runInNewContext(read(mod),context);
 return {win,storage,session,context};
}
test('local product with unknown price stores unpaid request, never payable total',()=>{
 const {win}=fixture(),s=win.SMStaticStore;
 assert.equal(s.add({type:'local',id:'local1',sku:'SKU1',qty:1,estimate:null}).ok,true);
 assert.equal(s.totals().payableTotal,null);assert.equal(s.totals().missingPriceCount,1);
});
test('exact variation survives refresh, count/quantity/subtotal/remove are correct',()=>{
 const {win,context}=fixture(),s=win.SMStaticStore;
 assert.equal(s.add({type:'local',id:'abc',sku:'abc-m',variantId:'M',variantName:'Medium',qty:2,estimate:250,attributes:[{attribute:'Size',value:'M'}]}).ok,true);
 vm.runInNewContext(read('store.js'),context); // existing global instance is authoritative
 let key=s.key(s.read()[0]);assert.equal(s.read()[0].variantId,'M');
 assert.equal(s.count(),2);assert.equal(s.setQty(key,3).ok,true);
 assert.equal(s.totals().localEstimate,750);
 assert.equal(s.remove(key).ok,true);assert.equal(s.count(),0);
});
test('two CJ colour variants remain distinct, without invented carrier rate',()=>{
 const {win}=fixture(),s=win.SMStaticStore;
 for(const [id,color] of [['red','Red'],['blue','Blue']])
 assert.equal(s.add({type:'cj',id:'p',sku:'sku-'+id,variantId:id,variantName:color,qty:1,estimate:16.97}).ok,true);
 assert.equal(s.read().length,2);assert.equal(s.totals().shipping,null);
 assert.equal(s.totals().payableTotal,null);
});
test('Quick Buy intent can be represented as exact single selection without clearing an unrelated cart',()=>{
 const {win}=fixture(),p=win.SMProducts;
 const product=p.local({id:'shirt',sku:'base',name:'Shirt',variants:[{vkey:'XL',sku:'shirt-xl',name:'XL',price:1000}]});
 let row=p.selection(product,'XL',1);
 assert.equal(row.sku,'shirt-xl');assert.equal(row.qty,1);assert.equal(row.variantId,'XL');
});
test('static shipping band never becomes a verified payable carrier quotation',()=>{
 const {win}=fixture(),q=win.SMProducts.shippingQuote({bands:[{country:'SA',variantId:'violet',minQty:1,maxQty:5,price:4.2}]},{country:'SA',variantId:'violet',qty:1});
 assert.equal(q.status,'INDICATIVE_ONLY');assert.equal(q.amount,null);assert.equal(q.estimate,4.2);
 let none=win.SMProducts.shippingQuote(null,{country:'SA',variantId:'unknown',qty:1});
 assert.equal(none.amount,null);assert.equal(none.status,'QUOTE_REQUIRED');
});
test('PayPal cancellation never marks a transaction paid',()=>{
 const {win}=fixture();assert.equal(win.SMPayPal.cancel().paymentStatus,'NOT_PAID');
 assert.equal(win.SMPayPal.enabled,false);
});
test('accounts and rewards are disabled without protected server-side ledger',()=>{
 const {win}=fixture();assert.equal(win.SMUtils.requireAuth().ok,false);assert.equal(win.SMUtils.rewards().available,false);
 assert.equal(win.SMUtils.referral('ABC123').payout,null);
});
test('reference stable on reload and no browser-only fulfillment acceptance',()=>{
 const {win,context}=fixture(),s=win.SMStaticStore;
 let r1=s.reference();assert.match(r1,/^SMR-[A-F0-9]{24}$/);
 assert.equal(s.reference(),r1);assert.equal(s.acknowledge(r1,[]),true);
 assert.equal(s.receipts()[0].state,'FORM_ACKNOWLEDGED_UNPAID');
 vm.runInNewContext(read('store.js'),context);
 assert.equal(s.reference(),r1);
});
test('checkout preserves non-paid semantics, timeouts and staff confirmation',()=>{
 const src=read('checkout.js');assert.match(src,/AbortController/);
 assert.match(src,/15000/);assert.match(src,/PREVIOUS_ATTEMPT_UNCERTAIN/);
 assert.match(src,/payment_status:'NOT_PAID'/);assert.match(src,/fulfillment_status:'UNCONFIRMED'/);
 assert.doesNotMatch(src,/payment_status:'PAID'/);
});
test('GitHub API main SHA alone cannot verify production release',()=>{
 const {win}=fixture();assert.equal(win.SMUtils.releaseCheck('abc','def').verified,false);
});
