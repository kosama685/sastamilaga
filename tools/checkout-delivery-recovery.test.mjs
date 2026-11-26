import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function cartInCur('),end=app.indexOf('let _payReq = 0;',start);
assert.ok(start>=0&&end>start);
const row={id:'product-123',name:'Example item',vkey:'RED-SKU',sku:'RED-SKU',unit:12,qty:2};
function fixture({rows=[row],country='GB',methods=[{name:'Economy',price:5},{name:'Express',price:9}],variants=[{vid:'variant-red',sku:'RED-SKU'},{vid:'variant-blue',sku:'BLUE-SKU'}],returnedCountry=country,rateAt=Math.floor(Date.now()/1000),localPkr=0,onQuote}={}){
 let currentRows=rows, currentCountry=country; const calls=[];
 const context={window:{SM_CONFIG:{cjShippingWorker:'https://example.test'},SMMarket:{state:()=>({country:currentCountry})}},document:{getElementById:()=>({elements:{delivery_country:{value:currentCountry}}})},localStorage:{getItem:()=>null},checkoutTotals:()=>({lines:localPkr?[{p:{id:'local',unit:localPkr},qty:1}]:[],totalPkr:localPkr}),price:p=>p.unit,gLines:()=>currentRows,paypalCurrency:()=> 'USD',PAYPAL_NO_DECIMALS:['JPY','HUF','TWD'],AbortSignal,Date,URLSearchParams,fetch:async(url,options)=>{
  calls.push({url,body:options?.body&&JSON.parse(options.body)});
  const qs=new URL(url).searchParams;
  const data=url.includes('/api/cj/variants')?{pid:'product-123',stale:false,variants}:url.includes('/api/cj/shipping')?{pid:qs.get('pid'),vid:qs.get('vid'),country:returnedCountry,quantity:Number(qs.get('quantity')),zip:qs.get('zip'),currency:'USD',source:'cj_api',checkedAt:Math.floor(Date.now()/1000),liveQuoteWithinTTL:true,rates:methods.map(m=>({carrier:m.name,shippingUsd:m.price}))}: {result:'success',rates:{USD:.004},time_last_update_unix:rateAt};
  if(url.includes('/api/cj/shipping')&&onQuote)onQuote(()=>currentCountry='SA');
  return {ok:true,json:async()=>data};
 }};
 runInNewContext(app.slice(start,end)+'\nthis.api={recoverCheckoutFreight,payAmount,paymentReady,prepare:q=>{preparedPayment=q}};',context);
 return {api:context.api,calls,setRows:v=>currentRows=v,setCountry:v=>currentCountry=v};
}
test('full checkout script compiles',()=>assert.doesNotThrow(()=>new Script(app)));
test('old cart with no shipping recovers exact SKU and full total',async()=>{const f=fixture();const a=await f.api.payAmount();assert.equal(a.amount,'29.00');assert.equal(a.globalRows[0].shipAmt,5);const q=new URL(f.calls[1].url).searchParams;assert.equal(q.get('vid'),'variant-red');assert.equal(q.get('quantity'),'2');assert.equal(q.get('country'),'GB');assert.equal(f.calls[1].body,undefined);});
test('retains selected carrier when still offered',async()=>{const f=fixture({rows:[{...row,vkey:'variant-red',ship:'Express · USD 9.00'}]});const a=await f.api.payAmount();assert.equal(a.amount,'33.00');assert.equal(a.globalRows[0].shipSelection,'retained');});
test('no carrier rates leaves payment blocked',async()=>{const f=fixture({methods:[]});await assert.rejects(f.api.payAmount(),/shipping/);});
test('no exact variation never calls freight',async()=>{const f=fixture({rows:[{...row,vkey:'unrecognized'}]});await assert.rejects(f.api.payAmount(),/shipping/);assert.equal(f.calls.length,1);});
test('null carrier price is not free shipping',async()=>{const f=fixture({methods:[{name:'Economy',price:null}]});await assert.rejects(f.api.payAmount(),/shipping/);});
test('genuine zero rate remains valid',async()=>{const f=fixture({methods:[{name:'Economy',price:0}]});assert.equal((await f.api.payAmount()).amount,'24.00');});
test('wrong shipping destination blocks payment',async()=>{const f=fixture({returnedCountry:'PK'});await assert.rejects(f.api.payAmount(),/shipping/);});
test('cart or country changed during quote blocks payment',async()=>{const f=fixture({onQuote:change=>change()});await assert.rejects(f.api.payAmount(),/cart_changed/);});
test('quote reviewed then changed quantity invalidates payment',async()=>{const f=fixture();const a=await f.api.payAmount();f.api.prepare(a);assert.equal(f.api.paymentReady(),true);f.setRows([{...row,qty:3}]);assert.equal(f.api.paymentReady(),false);});
test('expired quote is not reusable',async()=>{const f=fixture();const a=await f.api.payAmount();f.api.prepare({...a,checkedAt:Date.now()-16*60000});assert.equal(f.api.paymentReady(),false);});
test('local-only checkout needs no supplier quote',async()=>{const f=fixture({rows:[],localPkr:1250,country:'PK'});assert.equal((await f.api.payAmount()).amount,'5.00');assert.equal(f.calls.length,1);});
test('stale currency rate blocks payment',async()=>{const f=fixture({rateAt:Math.floor(Date.now()/1000)-4*86400});await assert.rejects(f.api.payAmount(),/rate/);});
test('mixed cart outside Pakistan stays on quotation hold',async()=>{const f=fixture({localPkr:1250});await assert.rejects(f.api.payAmount(),/shipping/);assert.equal(f.calls.length,0);});
test('order uses reviewed quote and existing PayPal handoff',()=>{assert.match(app,/wantsPayPal && !paymentReady\(\)/);assert.match(app,/GL = payment \? payment\.globalRows : gLines\(\)/);assert.match(app,/usd = payment\.amount/);assert.match(app,/response\.ok && response\.usd/);assert.match(app,/landing: landing \|\| 'Login'/);});
