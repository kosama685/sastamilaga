import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/checkout-pricing.js',import.meta.url),'utf8');
const local={type:'local',id:'local',unit:1000,qty:2};
const cj={type:'cj',id:'product-123',vkey:'variant-red',qty:2};
function client(overrides={}){
 const calls=[],window={SM_CONFIG:{cjShippingWorker:'https://supplier.test',deliveryFee:250,freeDeliveryFrom:5000}};
 const fetch=async(url,options)=>{
  calls.push({url,body:options?.body&&JSON.parse(options.body)});
  let data=url.includes('/product?')?{variants:[{vid:'variant-red',sku:'RED',price:10}]}:
   url.includes('/shipping')?{country:'PK',currency:'USD',methods:[{name:'Fast',price:9},{name:'Standard',price:5}]}:
   {result:'success',rates:{USD:0.004},time_last_update_unix:Math.floor(Date.now()/1000)};
  data=overrides[url.includes('/product?')?'product':url.includes('/shipping')?'shipping':'fx']??data;
  return {ok:true,json:async()=>data};
 };
 vm.runInNewContext(source,{window,fetch,AbortSignal,URL,Date});
 return {quote:window.SMCheckoutPricing.quote,calls};
}
test('local delivery and PKR conversion produce a reviewed USD amount',async()=>{
 const {quote}=client();const q=await quote([local],'PK');
 assert.equal(q.localShipping,250);assert.equal(q.totalUSD,9);
 assert.equal((await quote([{...local,unit:2500}],'PK')).localShipping,0);
});
test('mixed local/CJ includes exact variant, quantity, postal code and one combined freight quote',async()=>{
 const {quote,calls}=client();const q=await quote([local,cj],'PK','54000');
 assert.equal(q.globalSubtotal,24);assert.equal(q.globalShipping,5);assert.equal(q.totalUSD,38);
 const body=calls.find(x=>x.url.includes('/shipping')).body;
 assert.equal(body.items[0].vid,'variant-red');assert.equal(body.items[0].qty,2);assert.equal(body.zip,'54000');
});
test('supplier rate unavailable does not produce a payable total',async()=>{
 await assert.rejects(client({shipping:{country:'PK',currency:'USD',methods:[]}}).quote([cj],'PK'),/Rate unavailable/);
});
test('partial quotes, wrong destination and non-USD freight cannot be charged',async()=>{
 for(const patch of [{country:'SA'},{currency:'PKR'},{unavailable:['missing-item']}])
  await assert.rejects(client({shipping:{country:'PK',currency:'USD',methods:[{name:'Carrier',price:5}],...patch}}).quote([cj],'PK'),/did not cover/);
});
test('exact option must exist; missing option never falls back to first variant',async()=>{
 await assert.rejects(client().quote([{...cj,vkey:'missing'}],'PK'),/no current price/);
 await assert.rejects(client().quote([{...cj,vkey:''}],'PK'),/exact supplier option/);
});
test('unpriced local options and unquoted international local delivery remain quotations',async()=>{
 await assert.rejects(client().quote([{...local,unit:null}],'PK'),/price quotation/);
 await assert.rejects(client().quote([local],'SA'),/outside Pakistan/);
});
test('stale exchange rates cannot enable payment',async()=>{
 await assert.rejects(client({fx:{result:'success',rates:{USD:0.004},time_last_update_unix:1}}).quote([local],'PK'),/recent PKR/);
});
test('PayPal decimal validation accepts ordinary cents and rejects fractional cents',()=>{
 const window={};vm.runInNewContext(readFileSync(new URL('../assets/js/paypal-payment-link.js',import.meta.url),'utf8'),{window,URL});
 const make=n=>window.SMPayPalLink.create({amountUSD:n,productName:'Order',reference:'SM-REQ-12345',confirmedFinalTotal:true,shippingVerified:true,card:true});
 for(const n of [17.35,16.97,19.99,0.29])assert.equal(make(n).ok,true);
 assert.equal(make(1.001).ok,false);
 const url=new URL(make(17.35).url);assert.equal(url.searchParams.get('landing_page'),'Billing');
 assert.match(url.searchParams.get('cancel_return'),/payment=cancelled&reference=SM-REQ-12345/);
});
