import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function cartFixture(){
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const w={localStorage:storage,location:{href:'https://sastamilaga.com/p/test'},SM_CONFIG:{deliveryFee:250,freeDeliveryFrom:5000}};
 vm.runInNewContext(read('assets/js/order-cart.js'),{window:w,URL,CustomEvent:class{}});
 return {cart:w.SMOrderCart,values};
}
test('local simple COD request can be stored without a fake verified price',()=>{
 const {cart}=cartFixture();
 assert.equal(cart.add({type:'local',id:'PK1',sku:'PK1',name:'Pakistan local',unit:null,qty:1}).ok,true);
 assert.equal(cart.get()[0].unit,null);
 assert.equal(cart.totals().local.totalEstimate,null);
 assert.equal(cart.totals().local.shippingEstimate,null);
 assert.equal(cart.totals().local.unpricedOptionCount,1);
});
test('Pakistan size and color variation survive refresh, update and removal',()=>{
 const {cart,values}=cartFixture();
 const row={type:'local',id:'SHIRT',sku:'SHIRT',unit:1200,qty:1,attributes:[{attribute:'Size',value:'M'},{attribute:'Colour',value:'Blue'}]};
 assert.equal(cart.add(row).ok,true);
 assert.equal(cart.get()[0].attributes.length,2);
 assert.equal(cart.quantity(cart.key(cart.get()[0]),3).ok,true);
 assert.equal(cart.totals().local.subtotal,3600);
 assert.equal(JSON.parse(values.get('sm_order_cart_v1'))[0].qty,3);
 assert.equal(cart.remove(cart.key(cart.get()[0])).ok,true);
 assert.equal(cart.count(),0);
});
test('Saudi CJ quote stays unpriced, exact variant survives, and local Pakistan restriction remains in form',()=>{
 const {cart}=cartFixture();
 cart.add({type:'cj',id:'CJ1',sku:'SKU-WHITE-200X230',vkey:'VID-1',vname:'White-200x230cm',qty:1,unit:null});
 assert.equal(cart.get()[0].vkey,'VID-1');
 assert.equal(cart.totals().cj.finalTotal,null);
 const form=read('assets/js/order-page.js');
 assert.match(form,/country==='PK'/);
 assert.match(form,/payment_status','NOT_PAID'/);
 assert.match(form,/fulfilment_status','UNCONFIRMED'/);
});
test('Formspree intake acknowledges but does not mark a paid/accepted order and preserves cart on failure',()=>{
 const code=read('assets/js/order-page.js');
 assert.match(code,/result\.ok/);
 assert.match(code,/RECEIPT_KEY/);
 assert.match(code,/INTAKE_ACKNOWLEDGED_UNPAID/);
 assert.match(code,/if\(receiptSaved\)cart\.clear\(\)/);
 assert.match(code,/Request NOT confirmed/);
 assert.match(code,/Items have been preserved/);
 assert.doesNotMatch(code,/payment_status','PAID'/);
});
test('request click bridge has no WordPress, WooCommerce or Cloudflare API dependency',()=>{
 const code=read('assets/js/woo-bridge.js');
 assert.doesNotMatch(code,/fetch\(['"`]\/wp-json|fetch\(['"`]https?:\/\/[^'"`]*workers\.dev|paypal\.Buttons/i);
 assert.match(code,/SMRequestBridge/);
 assert.match(code,/\/order\/\?country=PK/);
 assert.match(code,/\/request-cart\//);
 assert.match(code,/busy=true/);
 assert.match(code,/options\(\)/);
});
