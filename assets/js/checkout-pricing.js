/* Public catalogue + destination-specific freight, with no PayPal SDK or keys.
 * Browser prices are reviewable estimates; PayPal settlement is verified by staff.
 */
(function(g){
'use strict';
const cents=n=>Math.round((n+Number.EPSILON)*100)/100;
async function json(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(18000)});
 if(!r.ok)throw Error('Pricing service unavailable. Request a quotation or try again.');
 return r.json();
}
async function quote(rows,country,postalCode=''){
 country=String(country||'').toUpperCase();
 if(!/^[A-Z]{2}$/.test(country)||!rows.length)throw Error('Choose a destination and add products.');
 const cfg=g.SM_CONFIG||{},local=rows.filter(r=>r.type==='local'),cj=rows.filter(r=>r.type==='cj');
 if(local.length&&country!=='PK')throw Error('Delivery for local items outside Pakistan needs a quotation. You can still submit the combined cart.');
 if(local.some(r=>!Number.isFinite(r.unit)||r.unit<=0))throw Error('A selected local option needs a price quotation.');
 const localSubtotal=cents(local.reduce((sum,r)=>sum+r.unit*r.qty,0));
 const fee=Number(cfg.deliveryFee??250),threshold=Number(cfg.freeDeliveryFrom??5000);
 if(!Number.isFinite(fee)||fee<0||!Number.isFinite(threshold)||threshold<0)throw Error('Local delivery settings unavailable.');
 const localShipping=local.length&&localSubtotal<threshold?fee:0;
 let globalSubtotal=0,globalShipping=0,service='',items=[];
 if(cj.length){
  if(cj.length>20)throw Error('Please request a combined shipping quotation for more than 20 global options.');
  const worker=String(cfg.cjShippingWorker||'').replace(/\/$/,'');
  if(!/^https:\/\//.test(worker))throw Error('Supplier shipping is unavailable. Request a quotation.');
  // Sequential lookups respect the supplier rate limit. Never substitute the first option.
  for(const row of cj){
   if(!row.vkey)throw Error('An exact supplier option is required for payment. Request a quotation for the described option.');
   const data=await json(worker+'/api/cj/product?pid='+encodeURIComponent(row.id));
   const variant=(data.variants||[]).find(v=>String(v.vid)===row.vkey);
   if(!variant||!Number.isFinite(Number(variant.price))||Number(variant.price)<=0)
    throw Error('The selected supplier option has no current price. Request a quotation.');
   const unit=cents(Number(variant.price)*1.2);
   globalSubtotal=cents(globalSubtotal+unit*row.qty);
   items.push({pid:row.id,vid:row.vkey,sku:variant.sku,qty:row.qty,unitUSD:unit});
  }
  const freight=await json(worker+'/api/cj/shipping',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({country,zip:postalCode,items:items.map(({pid,vid,sku,qty})=>({pid,vid,sku,qty}))})});
  if(freight.currency!=='USD'||freight.country!==country||freight.unavailable?.length)
   throw Error('Supplier shipping did not cover this destination and every item. Request a quotation.');
  const methods=(freight.methods||[]).filter(m=>m.name&&typeof m.price==='number'&&Number.isFinite(m.price)&&m.price>=0).sort((a,b)=>a.price-b.price);
  if(!methods.length)throw Error('Rate unavailable for this destination. Request a quotation; no payment total was created.');
  globalShipping=cents(methods[0].price);service=String(methods[0].name);
 }
 let rate=null,rateAt=null,localUSD=0;
 if(local.length){
  const fx=await json('https://open.er-api.com/v6/latest/PKR');
  rate=Number(fx.rates?.USD);rateAt=Number(fx.time_last_update_unix)*1000;
  if(fx.result!=='success'||!Number.isFinite(rate)||rate<=0||!Number.isFinite(rateAt)||Date.now()-rateAt>72*3600000||rateAt>Date.now()+3600000)
   throw Error('A recent PKR to USD rate is unavailable. Request a quotation or choose COD.');
  localUSD=cents((localSubtotal+localShipping)*rate);
 }
 const totalUSD=cents(localUSD+globalSubtotal+globalShipping);
 if(totalUSD<=0)throw Error('A payable total is unavailable.');
 return {totalUSD,localSubtotal,localShipping,localUSD,rate,rateAt,globalSubtotal,globalShipping,service,items,
  country,postalCode,checkedAt:Date.now(),cart:JSON.stringify(rows)};
}
g.SMCheckoutPricing=Object.freeze({quote});
})(window);
