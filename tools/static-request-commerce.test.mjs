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
 assert.match(form,/destination_eligibility/);
 assert.match(form,/payment_status','NOT_PAID'/);
 assert.match(form,/fulfilment_status','UNCONFIRMED'/);
});
test('Formspree intake acknowledges but does not mark a paid/accepted order and preserves cart on failure',()=>{
 const code=read('assets/js/order-page.js');
 assert.match(code,/result\.ok/);
 assert.match(code,/RECEIPT_KEY/);
 assert.match(code,/INTAKE_ACKNOWLEDGED_UNPAID/);
 assert.match(code,/if\(receiptSaved&&JSON\.stringify\(cart\.get\(\)\)===submittedCart\)cart\.clear\(\)/);
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

test('unpriced Pakistan quote does not crash Formspree payload and copyable reference is available',()=>{
 const js=read('assets/js/order-page.js');
 const html=read('order/index.html');
 assert.match(js,/shippingEstimate===null\?'UNVERIFIED'/);
 assert.match(js,/referenceHelp\(id\)/);
 assert.match(html,/id="sm-copy-reference"/);
 assert.match(html,/id="sm-help-reference"/);
});

test('mixed local and CJ request cart allows both line types',()=>{
 const {cart}=cartFixture();
 assert.equal(cart.add({type:'local',id:'L1',sku:'PK-M',unit:1500,qty:1,attributes:[{attribute:'Size',value:'M'}]}).ok,true);
 assert.equal(cart.add({type:'cj',id:'CJ1',sku:'VIOLET',vkey:'VID-1',unit:null,qty:1}).ok,true);
 assert.equal(cart.count(),2);
 assert.equal(cart.totals().cj.finalTotal,null);
 const order=read('assets/js/order-page.js');
 assert.match(order,/MIXED|Mixed local\/CJ enquiry|hasCJ\(\)/);
 assert.doesNotMatch(order,/Remove local items for another destination/);
});
test('legacy PayPal link composer permits only reviewed USD totals and never claims payment',()=>{
 let code=read('assets/js/paypal-payment-link.js'),ctx={URL,window:{}};
 vm.runInNewContext(code,ctx);
 let make=ctx.window.SMPayPalLink.create;
 assert.equal(make({amountUSD:15,productName:'Product name',reference:'SM-REQ-1234'}).ok,false);
 let ok=make({amountUSD:15,productName:'Product name',reference:'SM-REQ-1234',confirmedFinalTotal:true,shippingVerified:true});
 assert.equal(ok.ok,true);
 let link=new URL(ok.url);
 assert.equal(link.hostname,'www.paypal.com');
 assert.equal(link.searchParams.get('business'),'osamakhancv@gmail.com');
 assert.equal(link.searchParams.get('amount'),'15.00');
 assert.equal(link.searchParams.get('item_name'),'Product name');
 assert.equal(link.searchParams.get('invoice'),'SM-REQ-1234');
 assert.equal(ok.status,'PAYMENT_LINK_NOT_YET_PAID');
});
test('request checkout collects PayPal/card preference but never claims paid for Formspree 2xx',()=>{
 const h=read('order/index.html'),js=read('assets/js/order-page.js');
 assert.match(h,/name="payment_preference"/);
 assert.match(js,/values.set\('payment_status','NOT_PAID'\)/);
 assert.match(js,/values.set\('customer_requested_payment'/);
 assert.doesNotMatch(js,/payment_status','PAID'/);
});

test('global product PDP sends chosen CJ SKU and quantity to same request cart',()=>{
 const code=read('assets/js/global-pdp.js');
 assert.match(code,/requestCartReady\(\)\.then\(function \(cart\)/);
 assert.match(code,/sku:String\(o\.sku\|\|P\.sku\|\|P\.pid\)/);
 assert.match(code,/vkey:String\(o\.vid\|\|''\)/);
 assert.match(code,/qty:qty\(\),url:location\.href/);
 assert.match(code,/location\.href='\/order\/\?country='/);
 assert.doesNotMatch(code,/api\('\/wp-json\/gdcs\/v1\/live\/cart'/);
 assert.match(code,/var can=!!\(state\.option&&state\.option\.vid\)/);
});

test('late-loaded edge global product header cart and checkout links route to same request basket',()=>{
 const code=read('assets/js/global-pdp.js');
 assert.match(code,/a\[href="\/cart\/"\],a\[href="\/checkout\/"\]/);
 assert.match(code,/link\.href='\/request-cart\/'/);
 assert.match(code,/link\.href='\/order\/'/);
});
