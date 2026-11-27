/* Unified local/CJ checkout: Formspree intake followed by a PayPal-hosted payment link. */
(function(){
'use strict';
var cart=window.SMOrderCart,form=document.getElementById('sm-request-form'),
 rowsEl=document.getElementById('sm-request-rows'),totalsEl=document.getElementById('sm-request-totals'),
 status=document.getElementById('sm-request-status'),submit=document.getElementById('sm-request-submit');
if(!cart||!form||!rowsEl||!totalsEl||!status)return;
// Preserve the selected shipping destination from the product-page request handoff.
var selectedCountry=new URLSearchParams(location.search).get('country');
if(/^[A-Za-z]{2}$/.test(selectedCountry||'')&&!form.elements.country.value)
  form.elements.country.value=selectedCountry.toUpperCase();
var submitting=false,confirmed=false,ref=null,REF_KEY='sm_order_request_ref_v2',RECEIPT_KEY='sm_order_request_receipts_v1';
var pricing=null,pricingBusy=false,paymentLink=null;
var preference=form.elements.payment_preference,checkTotal=document.getElementById('sm-check-total'),paymentTotal=document.getElementById('sm-payment-total'),resume=document.getElementById('sm-resume-payment');
var DRAFT_KEY='sm_checkout_draft_v1',PENDING_KEY='sm_checkout_payment_v1',FINGERPRINT_KEY='sm_checkout_fingerprint_v1';
function paying(){return preference.value==='paypal'||preference.value==='card'}
function destination(){return String(form.elements.country.value||'').toUpperCase()}
function postcode(){return String(form.elements.postal_code.value||'').trim()}
function currentPrice(){return pricing&&pricing.cart===JSON.stringify(cart.get())&&pricing.country===destination()&&pricing.postalCode===postcode()&&Date.now()-pricing.checkedAt<10*60000}
function saveDraft(){try{var draft={};new FormData(form).forEach(function(v,k){if(!['website','confirm_request'].includes(k))draft[k]=v});sessionStorage.setItem(DRAFT_KEY,JSON.stringify(draft))}catch(e){}}
try{var draft=JSON.parse(sessionStorage.getItem(DRAFT_KEY)||'{}');Object.keys(draft).forEach(function(k){if(form.elements[k]&&!['website','confirm_request'].includes(k))form.elements[k].value=String(draft[k])});if(selectedCountry)form.elements.country.value=selectedCountry.toUpperCase()}catch(e){}
function paymentUI(){
 if(!checkTotal)return;
 checkTotal.hidden=!paying();checkTotal.disabled=pricingBusy||submitting;
 submit.disabled=submitting||confirmed||pricingBusy||(paying()&&!currentPrice());
 submit.textContent=paying()?(preference.value==='card'?'Save order and pay by card':'Save order and pay with PayPal'):'Send order request';
}
form.addEventListener('input',function(){saveDraft();paymentUI()});
form.addEventListener('change',function(){saveDraft();if(paymentTotal&&paying()&&!currentPrice())paymentTotal.textContent='Calculate your current shipping and USD total before payment.';paymentUI()});
if(checkTotal)checkTotal.addEventListener('click',async function(){
 if(pricingBusy||submitting)return;
 if(!validCountry()){paymentTotal.textContent='Enter your two-letter destination country.';return}
 if(hasCJ()&&!postcode()){paymentTotal.textContent='Enter your postal code for international shipping.';form.elements.postal_code.focus();return}
 pricingBusy=true;pricing=null;paymentUI();paymentTotal.textContent='Checking selected supplier options, shipping and exchange rate…';
 try{
  var rows=cart.get(),cc=destination(),zip=postcode();
  var result=await window.SMCheckoutPricing.quote(rows,cc,zip);
  if(JSON.stringify(cart.get())!==result.cart||destination()!==cc||postcode()!==zip)throw Error('Your cart or destination changed. Calculate again.');
  pricing=result;
  paymentTotal.textContent='Total to pay: USD '+result.totalUSD.toFixed(2)+'. Local products PKR '+result.localSubtotal.toFixed(2)+' + delivery PKR '+result.localShipping.toFixed(2)+
   (result.rate?' (1 PKR = '+result.rate+' USD). ':'. ')+'Global products USD '+result.globalSubtotal.toFixed(2)+' + shipping USD '+result.globalShipping.toFixed(2)+(result.service?' via '+result.service:'')+'. Customs duties, if charged, are paid separately. Stock is confirmed before dispatch.';
 }catch(error){paymentTotal.textContent=String(error.message||error)+' You can select a quotation to submit your items without payment.'}
 finally{pricingBusy=false;paymentUI()}
});
// Cancel/return never proves payment. Preserve the basket and offer the same invoice.
function showPending(){
 try{var pending=JSON.parse(sessionStorage.getItem(PENDING_KEY)||'null');
  if(!pending||pending.cart!==JSON.stringify(cart.get()))return false;
  var u=new URL(pending.url);if(u.origin!=='https://www.paypal.com'||u.pathname!=='/cgi-bin/webscr'||u.searchParams.get('business')!=='osamakhancv@gmail.com')return false;
  if(resume){resume.hidden=false;resume.href=u.href;resume.textContent='Continue payment for '+pending.id+' (USD '+pending.amountUSD+')'}
  var outcome=new URLSearchParams(location.search).get('payment');
  status.textContent=(outcome==='cancelled'?'PayPal payment cancelled. ':outcome==='unverified'?'Returned from PayPal; payment is awaiting verification. ':'Order details saved. Payment is pending. ')+pending.id+'. Your items are preserved. Staff must verify payment receipt before dispatch.';
  referenceHelp(pending.id);return true;
 }catch(e){return false}
}
var copyRef=document.getElementById('sm-copy-reference'),helpRef=document.getElementById('sm-help-reference');
function referenceHelp(id){
 if(copyRef){copyRef.hidden=false;copyRef.onclick=function(){if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(id).then(function(){copyRef.textContent='Reference copied'}).catch(function(){copyRef.textContent='Reference: '+id})}else copyRef.textContent='Reference: '+id;};}
 if(helpRef){var number=String((window.SM_CONFIG||{}).whatsapp||'').replace(/\D/g,'');if(/^\d{8,15}$/.test(number)){helpRef.hidden=false;helpRef.href='https://wa.me/'+number+'?text='+encodeURIComponent('Please check my unpaid Sasta Milaga request '+id+'. Confirm whether staff received it.');}}
}
// Receipt records contain no customer contact details. A Formspree 2xx is an intake acknowledgment, not staff acceptance.
function money(n,c){return new Intl.NumberFormat('en-US',{style:'currency',currency:c,currencyDisplay:'code'}).format(n)}
function reference(){if(ref)return ref;try{var saved=sessionStorage.getItem(REF_KEY);if(/^SM-REQ-[A-F0-9]{20}$/.test(saved||'')){ref=saved;return ref}}catch(e){}var a=new Uint8Array(10);crypto.getRandomValues(a);ref='SM-REQ-'+Array.from(a).map(function(x){return x.toString(16).padStart(2,'0')}).join('').toUpperCase();try{sessionStorage.setItem(REF_KEY,ref)}catch(e){}return ref}
function element(tag,text){var e=document.createElement(tag);if(text!=null)e.textContent=String(text);return e}
function render(){
 var rows=cart.get(),totals=cart.totals();rowsEl.replaceChildren();
 rows.forEach(function(r){
   var wrap=element('div');wrap.className='request-row';
   var title=element('strong',r.name);var meta=element('p',r.sku+(r.vname?' · '+r.vname:'')+' · '+(r.unit===null?'Quote required':money(r.unit,r.currency))+' each ('+(r.type==='cj'?'unconfirmed USD estimate':'PKR listing estimate')+')');
   var controls=element('div');controls.className='row-controls';var qty=element('input');qty.type='number';qty.min='1';qty.max='99';qty.step='1';qty.value=r.qty;qty.setAttribute('aria-label','Quantity for '+r.name);
   qty.addEventListener('change',function(){var n=Number(qty.value);var done=cart.quantity(cart.key(r),n);if(!done.ok)status.textContent=done.message;render()});
   var remove=element('button','Remove');remove.type='button';remove.addEventListener('click',function(){cart.remove(cart.key(r));render()});
   controls.append(qty,remove);wrap.append(title,meta,controls);rowsEl.append(wrap);
 });
 totalsEl.textContent='Pakistan items: '+money(totals.local.subtotal,'PKR')+' + indicative delivery '+(totals.local.shippingEstimate===null?'requires confirmation':money(totals.local.shippingEstimate,'PKR'))+
   ' · Unpriced Pakistan items: '+totals.local.unpricedOptionCount+' · Global quoted products: '+(totals.cj.unpricedOptionCount||0)+' option(s) requiring individual pricing; priced-product estimate '+money(totals.cj.productSubtotalEstimate,'USD')+' before shipping, taxes and supplier confirmation.';
 form.hidden=rows.length===0||confirmed;
 if(!rows.length&&!confirmed)status.textContent='Your cart is empty.';
 else if(!confirmed&&!submitting)status.textContent='Review your items and delivery details, then choose your payment method.';
 paymentUI();
}
function hasCJ(){return cart.get().some(function(r){return r.type==='cj'})}
function validCountry(){return /^[A-Z]{2}$/.test(String(form.elements.country.value||'').toUpperCase())}
form.addEventListener('submit',async function(e){
 e.preventDefault();if(submitting||confirmed||!form.reportValidity())return;
 if(!cart.count()){status.textContent='Your request cart is empty.';return}
 if(!validCountry()){status.textContent='Enter a valid two-letter destination country code.';return}
 if(form.elements.website.value){status.textContent='Your request was not sent.';return}
 if(preference.value==='cod'&&(hasCJ()||destination()!=='PK')){status.textContent='COD is available for local delivery in Pakistan. Choose PayPal/card or request a quotation for this cart.';return}
 if(paying()&&!currentPrice()){status.textContent='Calculate shipping and the current USD total before payment.';paymentUI();return}
 // An acknowledged PayPal invoice can be resumed without submitting a second order.
 if(paying()&&showPending()){status.textContent+=' Use Continue payment above to resume the saved invoice.';return}
 var endpoint=(window.SM_CONFIG||{}).orderEndpoint;
 if(!/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint||'')){status.textContent='Secure order receiver unavailable. No request was sent.';return}
 var fingerprint=JSON.stringify({rows:cart.get(),customer:Array.from(new FormData(form)).filter(function(x){return !['website','confirm_request'].includes(x[0])}),total:paying()?pricing.totalUSD:null});
 try{if(sessionStorage.getItem(FINGERPRINT_KEY)!==fingerprint){ref=null;sessionStorage.removeItem(REF_KEY);sessionStorage.setItem(FINGERPRINT_KEY,fingerprint)}}catch(e){}
 var submittedCart=JSON.stringify(cart.get());
 var id=reference(),values=new FormData(form);values.delete('website');
 paymentLink=null;
 if(paying()){
  paymentLink=window.SMPayPalLink.create({amountUSD:pricing.totalUSD,productName:'Sasta Milaga order '+id,reference:id,confirmedFinalTotal:true,shippingVerified:true,card:preference.value==='card'});
  if(!paymentLink.ok){status.textContent=paymentLink.error;return}
  values.set('payment_amount_usd',pricing.totalUSD.toFixed(2));values.set('checkout_pricing_json',JSON.stringify(pricing));
  values.set('payment_invoice',id);values.set('payment_verification','PAYPAL_PENDING_MANUAL_RECEIPT_VERIFICATION');
 }
 var totals=cart.totals();
 values.set('order_id',id);values.set('subject','Sasta Milaga order request '+id);
 // Customer-submitted values are evidence for staff review, never authoritative prices or stock.
 values.set('order_items_json',JSON.stringify(cart.get().map(function(r){return {id:r.id,sku:r.sku,name:r.name,type:r.type,variant_id:r.vkey,variant_name:r.vname,attributes:r.attributes,quantity:r.qty,unit_estimate:r.unit,currency:r.currency,price_status:r.priceStatus,url:r.url};})));
 values.set('shipping_quote_status',hasCJ()?'SUPPLIER_QUOTE_REQUIRED':'LOCAL_RATE_INDICATIVE_STAFF_VERIFICATION_REQUIRED');
 var destination=String(form.elements.country.value||'').toUpperCase();
 var incompatibleLocal=cart.get().some(function(r){return r.type==='local'})&&destination!=='PK';
 values.set('destination_eligibility',incompatibleLocal?'LOCAL_ITEMS_OUTSIDE_PAKISTAN_REQUIRE_MANUAL_AVAILABILITY_CHECK':'DELIVERY_PENDING_STAFF_CONFIRMATION');
 values.set('customer_requested_payment',String(form.elements.payment_preference&&form.elements.payment_preference.value||'quote'));
 values.set('payment_method_eligibility',incompatibleLocal?'COD_NOT_AVAILABLE_FOR_LOCAL_ITEMS_OUTSIDE_PAKISTAN':'STAFF_TO_CONFIRM');
 values.set('requested_delivery_country',String(form.elements.country.value||'').toUpperCase());
 var referral=new URLSearchParams(location.search).get('ref');
 if(referral&&/^[A-Za-z0-9_-]{4,64}$/.test(referral))values.set('referral_code_unverified',referral);
 values.set('source','Sasta Milaga opt-in static request page');values.set('order_items',cart.message());
 values.set('order_local_subtotal_pkr',totals.local.subtotal.toFixed(2));
 values.set('order_local_delivery_estimate_pkr',totals.local.shippingEstimate===null?'UNVERIFIED':totals.local.shippingEstimate.toFixed(2));
 values.set('order_global_product_estimate_usd',totals.cj.productSubtotalEstimate.toFixed(2));
 values.set('order_global_unpriced_option_count',String(totals.cj.unpricedOptionCount||0));
 values.set('payment_status','NOT_PAID');
 values.set('fulfilment_status','UNCONFIRMED');
 values.set('request_type',hasCJ()?'Mixed local/CJ enquiry: verify each shipment before quote or payment':'Pakistan local enquiry: COD only if staff accepts');
 submitting=true;submit.disabled=true;status.textContent='Sending request securely…';
 try{
  var result=await fetch(endpoint,{method:'POST',body:values,headers:{Accept:'application/json'},signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(18000):undefined});
  if(!result.ok)throw new Error(result.status===429?'Request receiver temporarily busy.':'Request receiver declined the message.');
  if(paymentLink){
   // Save before redirect; a cancellation or interrupted navigation retains this invoice and cart.
   var pending={id:id,url:paymentLink.url,amountUSD:paymentLink.amountUSD,cart:submittedCart,status:'paypal_pending'};
   try{sessionStorage.setItem(PENDING_KEY,JSON.stringify(pending))}catch(e){
    confirmed=true;status.textContent='Order '+id+' saved; browser storage is unavailable. Use the payment link below. Your cart is preserved.';
    if(resume){resume.hidden=false;resume.href=paymentLink.url;resume.textContent='Pay USD '+paymentLink.amountUSD+' on PayPal'}
    referenceHelp(id);return;
   }
   confirmed=true;showPending();location.assign(paymentLink.url);return;
  }
  confirmed=true;
  var receiptSaved=false;
  try { var receipts=JSON.parse(localStorage.getItem(RECEIPT_KEY)||'[]');if(!Array.isArray(receipts))receipts=[];
    receipts=receipts.filter(function(x){return x&&x.id!==id}).slice(-49);
    receipts.push({id:id,at:new Date().toISOString(),state:'INTAKE_ACKNOWLEDGED_UNPAID',itemCount:cart.count(),items:cart.get().map(function(r){return {sku:r.sku,variant_id:r.vkey,variant_name:r.vname,attributes:r.attributes,quantity:r.qty,price_status:r.priceStatus};})});
    localStorage.setItem(RECEIPT_KEY,JSON.stringify(receipts));receiptSaved=true;
  }catch(storageError){}
  if(receiptSaved&&JSON.stringify(cart.get())===submittedCart)cart.clear();
  render();status.textContent='Formspree acknowledged request '+id+'. NOT paid, accepted or confirmed received by staff. '+(receiptSaved?'A reference was saved on this device.':'Local receipt could not be saved, so your cart was preserved.')+' Contact support with this reference for staff verification.';
  referenceHelp(id);
  if(receiptSaved){try{sessionStorage.removeItem(REF_KEY)}catch(e){}}
 }catch(error){status.textContent='Request NOT confirmed ('+id+'). Do not submit again blindly; contact support with the same reference. Items have been preserved. '+String(error.message||'Network issue');referenceHelp(id)}
 finally{submitting=false;paymentUI()}
});
document.addEventListener('sm:order-cart-changed',render);
render();
showPending();
})();
