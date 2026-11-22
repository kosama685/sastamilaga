import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8');
function fixture(){
  const state=new Map();
  const localStorage={getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,String(v)),removeItem:k=>state.delete(k)};
  const window={localStorage,location:{href:'https://sastamilaga.com/request-cart/'},SM_CONFIG:{deliveryFee:250,freeDeliveryFrom:5000}};
  vm.runInNewContext(read('assets/js/order-cart.js'),{window,URL,CustomEvent:class{}});
  return {cart:window.SMOrderCart,state};
}
test('variation identity and attributes survive cart reload and appear in staff summary',()=>{
  const {cart}=fixture();
  assert.equal(cart.add({type:'cj',id:'p100',sku:'SKU-RED-M',vkey:'VID123',vname:'Violet / M',attributes:[{attribute:'Size',value:'M'},{attribute:'Colour',value:'Violet'}],unit:null,qty:2,url:'https://sastamilaga.com/global-shop/p/p100/item/'}).ok,true);
  const r=cart.get()[0];
  assert.equal(r.vkey,'VID123');
  assert.equal(r.unit,null);
  assert.equal(r.attributes[0].attribute,'Colour');
  assert.match(cart.message(),/Colour=Violet/);
  assert.match(cart.message(),/Size=M/);
  assert.match(cart.message(),/price\/stock\/shipping pending/);
  assert.equal(cart.totals().cj.finalTotal,null);
  assert.equal(cart.add({type:'cj',id:'p100',sku:'SKU-RED-M',vkey:'VID123',vname:'Violet / M',attributes:[{attribute:'Colour',value:'Violet'},{attribute:'Size',value:'M'}],unit:null,qty:1}).ok,true);
  assert.equal(cart.get().length,1);
  assert.equal(cart.count(),3);
});
test('request page conveys selected variation and quote status',()=>{
  const s=read('assets/js/request-cart-page.js');
  assert.match(s,/Variant: /);
  assert.match(s,/r\.attributes/);
  assert.match(s,/Quote required/);
});
test('checkout preserves order reference on ambiguous retries and marks unpaid',()=>{
  const s=read('assets/js/order-page.js');
  assert.match(s,/sessionStorage\.setItem\(REF_KEY/);
  assert.match(s,/sessionStorage\.getItem\(REF_KEY/);
  assert.match(s,/order_items_json/);
  assert.match(s,/referral_code_unverified/);
  assert.match(s,/payment_status','NOT_PAID'/);
  assert.match(s,/fulfilment_status','UNCONFIRMED'/);
  assert.match(s,/if\(!result\.ok\)throw/);
  assert.match(s,/cart\.clear\(\)/);
  assert.doesNotMatch(s,/paypal\.Buttons|payment_status','PAID'/);
});
test('unverified freight cannot enable paid checkout',()=>{
  const s=read('assets/js/global-pdp.js');
  assert.match(s,/No verified carrier quote/);
  assert.match(s,/function setOrderable\(yes\)/);
  assert.match(s,/var can=!!\(state\.option&&state\.option\.vid\)/);
  assert.match(s,/function requestFallback/);
  assert.match(s,/Add to Cart to request a quote/);
  assert.match(s,/requestCartReady\(\)\.then/);
  assert.doesNotMatch(s,/api\('\/wp-json\/gdcs\/v1\/live\/cart'/);
  assert.match(s,/gpdp-request-fallback/);
});

test('stored legacy variation rows normalize attributes safely on reload',()=>{
  const {cart,state}=fixture();
  state.set('sm_order_cart_v1',JSON.stringify([{type:'cj',id:'p100',sku:'CJ-100',vkey:'VID-1',vname:'Violet',unit:null,priceStatus:'pending',currency:'USD',qty:1,attributes:[null,{attribute:'Size',value:'M'},{attribute:'Colour',value:'Violet'}]}]));
  const rows=cart.get();
  assert.equal(rows.length,1);
  assert.equal(rows[0].attributes.length,2);
  assert.equal(rows[0].attributes[0].attribute,'Colour');
  assert.match(cart.message(),/Colour=Violet/);
  assert.equal(cart.totals().cj.finalTotal,null);
});
