import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fixture(){
  const data=new Map();
  const storage={
    getItem:k=>data.get(k)||null,
    setItem:(k,v)=>data.set(k,String(v)),
    removeItem:k=>data.delete(k)
  };
  const window={
    localStorage:storage,
    location:{href:'https://sastamilaga.com/global/p/fashion/id/abc/'},
    SMApp:{APP_BASE:'/'},
    SM_CONFIG:{deliveryFee:250,freeDeliveryFrom:5000},
    document:{dispatchEvent:()=>{}}
  };
  const context={window,URL,Promise,CustomEvent:class{}};
  vm.runInNewContext(read('assets/js/order-cart.js'),context);
  vm.runInNewContext(read('assets/js/global-quote-flow.js'),context);
  return {window,cart:window.SMOrderCart,adapter:window.SMGlobalQuote,data};
}
const product={id:'cj-abc',sku:'CJ-PARENT',name:'Global selected item'};
const url='https://sastamilaga.com/global/p/fashion/cj-abc/';
test('supplier variant Add to cart persists exact SKU, variant ID and estimated price',async()=>{
  const {adapter,cart}=fixture();
  const result=await adapter.save(product,{vid:'VID-G',sku:'SKU-VIOLET-G',key:'Violet G',price:1.375},1,'',url);
  assert.equal(result.ok,true);
  const rows=cart.get();
  assert.equal(rows.length,1);
  assert.equal(rows[0].type,'cj');
  assert.equal(rows[0].id,'cj-abc');
  assert.equal(rows[0].sku,'SKU-VIOLET-G');
  assert.equal(rows[0].vkey,'VID-G');
  assert.equal(rows[0].vname,'Violet G');
  assert.equal(rows[0].qty,1);
  assert.equal(rows[0].unit,1.65);
  assert.equal(rows[0].priceStatus,'estimate');
  assert.equal(cart.totals().cj.finalTotal,null);
  assert.match(cart.message(),/SKU-VIOLET-G/);
  assert.match(cart.message(),/Variant: Violet G/);
});
test('same supplier variation merges while different variation remains distinct',async()=>{
  const {adapter,cart}=fixture();
  const a={vid:'V-G',sku:'G-SKU',key:'G',price:1.375};
  const b={vid:'V-B',sku:'B-SKU',key:'Blue',price:1.50};
  assert.equal((await adapter.save(product,a,1,'',url)).ok,true);
  assert.equal((await adapter.save(product,a,2,'',url)).ok,true);
  assert.equal((await adapter.save(product,b,1,'',url)).ok,true);
  assert.equal(cart.count(),4);
  assert.equal(cart.get().length,2);
  assert.deepEqual(Array.from(cart.get(),r=>r.qty),[3,1]);
});
test('supplier API outage still permits manual exact-option quotation with no invented payable price',async()=>{
  const {adapter,cart}=fixture();
  const empty=await adapter.save(product,null,1,'',url);
  assert.equal(empty.ok,false);
  assert.match(empty.message,/describe/i);
  const result=await adapter.save(product,null,2,'Violet colour, size G',url);
  assert.equal(result.ok,true);
  assert.equal(cart.get()[0].unit,null);
  assert.equal(cart.get()[0].vkey,'');
  assert.equal(cart.get()[0].vname,'Violet colour, size G');
  assert.match(cart.message(),/price\/stock\/shipping pending/);
  assert.equal(cart.totals().cj.finalTotal,null);
});
test('invalid quantity, product, and destination cannot silently be fixed by truncation',async()=>{
  const {adapter,cart}=fixture();
  assert.equal((await adapter.save(product,null,0,'Violet G',url)).ok,false);
  assert.equal((await adapter.save({id:'',name:'X'},null,1,'Violet',url)).ok,false);
  assert.equal(cart.get().length,0);
  assert.equal(adapter.orderUrl('SA'),'/order/?country=SA');
  assert.equal(adapter.orderUrl('SAA'),'/order/');
  assert.equal(adapter.cartUrl(),'/request-cart/');
});
test('product actions no longer submit to broken WordPress cart',()=>{
  const s=read('assets/js/global.js');
  assert.doesNotMatch(s,/Verifying your selection with secure WooCommerce checkout/);
  assert.doesNotMatch(s,/fetch\('\/wp-json\/gdcs\/v1\/live\/cart'/);
  assert.match(s,/id="gadd">Add to request cart/);
  assert.match(s,/id="gbuy">Request shipping &amp; total/);
  assert.match(s,/window\.__gcAct = \{ add:/);
  assert.match(s,/requestBusy = true/);
  assert.match(s,/await adapter\.save\(source,chosen\.v,q,notes,ownUrl\(cs,r\)\)/);
  assert.match(s,/location\.assign\(adapter\.orderUrl\(cc\)\)/);
  assert.match(s,/button\.disabled = false/);
  assert.match(s,/No payment is taken/);
});
test('checkout auto-prefills chosen shipping destination and remains unpaid',()=>{
  const s=read('assets/js/order-page.js');
  assert.match(s,/new URLSearchParams\(location\.search\)\.get\('country'\)/);
  assert.match(s,/payment_status','NOT_PAID'/);
  assert.match(s,/fulfilment_status','UNCONFIRMED'/);
  assert.match(s,/order_items_json/);
});
test('production page loads cache-busted global product handler',()=>{
  const s=read('index.html');
  assert.match(s,/assets\/js\/global\.js\?v=quote-checkout-20261122-1/);
});
