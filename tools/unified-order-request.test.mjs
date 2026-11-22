import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
function client(){
 const values=new Map([['sm_cart','[{"id":"legacy-local","qty":2}]'],['sm_gcart','[{"id":"legacy-cj","qty":1}]']]);
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const window={localStorage:storage,location:{href:'https://sastamilaga.com/request-cart/'},SM_CONFIG:{deliveryFee:250,freeDeliveryFrom:5000}};
 vm.runInNewContext(read('assets/js/order-cart.js'),{window,URL,CustomEvent:class {}});
 return {cart:window.SMOrderCart,values};
}
test('local and supplier request prices remain distinct, preserving legacy carts',()=>{
 const {cart,values}=client();
 assert.equal(cart.add({type:'local',id:'123',sku:'PK-123',name:'Local item',unit:4200,qty:2,url:'https://sastamilaga.com/p/sample.html'}).ok,true);
 assert.equal(cart.add({type:'cj',id:'global123',vkey:'red',name:'Supplier item',unit:17.35,qty:1,url:'https://sastamilaga.com/global-shop/p/global123/item/'}).ok,true);
 assert.equal(cart.totals().local.subtotal,8400);
 assert.equal(cart.totals().local.shippingEstimate,0);
 assert.equal(cart.totals().cj.productSubtotalEstimate,17.35);
 assert.equal(cart.totals().cj.finalTotal,null);
 assert.equal(cart.count(),3);
 assert.equal(cart.legacyInventory().length,2);
 cart.clear();
 assert.equal(cart.count(),0);
 assert.ok(values.get('sm_cart').includes('legacy-local'));
 assert.ok(values.get('sm_gcart').includes('legacy-cj'));
});
test('duplicate line merges and invalid unpriced products are rejected',()=>{
 const {cart}=client();
 assert.equal(cart.add({type:'cj',id:'sku1',unit:3,qty:1}).ok,true);
 assert.equal(cart.add({type:'cj',id:'sku1',unit:4,qty:2}).ok,true);
 assert.equal(cart.read().length,1);
 assert.equal(cart.count(),3);
 assert.equal(cart.read()[0].unit,4);
 assert.equal(cart.add({type:'cj',id:'invalid',unit:0}).ok,false);
 assert.equal(cart.add({type:'local',id:'invalid',unit:-5}).ok,false);
 assert.equal(cart.add({type:'local',id:'invalid',unit:12,qty:100}).ok,false);
});
test('cart URLs cannot reference unrelated external domains',()=>{
 const {cart}=client();
 assert.equal(cart.add({type:'local',id:'1',unit:100,url:'https://evilsastamilaga.com/steal'}).ok,true);
 assert.equal(cart.read()[0].url,'');
 assert.equal(cart.add({type:'local',id:'2',unit:100,url:'https://sastamilaga.com/p/valid.html'}).ok,true);
 assert.equal(cart.read()[1].url,'https://sastamilaga.com/p/valid.html');
});
test('separate order page uses Formspree only and never assumes payment',()=>{
 const code=read('assets/js/order-page.js'),html=read('order/index.html');
 assert.match(code,/formspree\\.io/);
 assert.match(code,/payment_status','NOT_PAID'/);
 assert.match(code,/fulfilment_status','UNCONFIRMED'/);
 assert.match(code,/if\(!result\.ok\)throw/);
 assert.match(code,/cart\.clear\(\)/);
 assert.match(code,/if\(!validCountry\(\)\)/);
 assert.doesNotMatch(code,/wp-json\/wc\/store/);
 assert.doesNotMatch(code,/localStorage\.clear\(/);
 assert.match(html,/noindex,nofollow/);
 assert.match(html,/order-cart\.js/);
});

test('unpriced CJ requests survive reloads without a manufactured offer price',()=>{
 const {cart,values}=client();
 assert.equal(cart.add({type:'cj',id:'cj-187',sku:'CJ187',name:'Supplier dress',vname:'black medium',
   unit:null,qty:2,url:'https://sastamilaga.com/global-shop/p/187/dress/'}).ok,true);
 assert.equal(cart.read().length,1);
 assert.equal(cart.read()[0].unit,null);
 assert.equal(cart.read()[0].priceStatus,'pending');
 assert.equal(cart.totals().cj.unpricedOptionCount,1);
 assert.equal(cart.totals().cj.productSubtotalEstimate,0);
 assert.match(cart.message(),/price\/stock\/shipping pending/);
 assert.ok(values.get('sm_cart'));
 assert.ok(values.get('sm_gcart'));
});
test('global quota fallback does not assert payment success or retry a blocked backend',()=>{
 const product=read('assets/js/global-pdp.js');
 const form=read('assets/js/order-page.js');
 assert.match(product,/function requestFallback\(message\)/);
 assert.match(product,/Save quotation request/);
 assert.match(product,/unit:null/);
 assert.match(product,/if \(r.status === 429 \|\| r.status >= 500\)/);
 assert.match(product,/No item was added/);
 assert.match(form,/payment_status','NOT_PAID'/);
 assert.match(form,/if\(!result\.ok\)throw/);
 assert.doesNotMatch(product,/localStorage\.clear\(/);
});
