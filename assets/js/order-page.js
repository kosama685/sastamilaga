/* Unified request checkout is an opt-in preview, not a payment gateway. */
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
 if(!rows.length&&!confirmed)status.textContent='Your request cart is empty. No payment is taken.';
}
function hasCJ(){return cart.get().some(function(r){return r.type==='cj'})}
function validCountry(){return /^[A-Z]{2}$/.test(String(form.elements.country.value||'').toUpperCase())}
form.addEventListener('submit',async function(e){
 e.preventDefault();if(submitting||confirmed||!form.reportValidity())return;
 if(!cart.count()){status.textContent='Your request cart is empty.';return}
 if(!validCountry()){status.textContent='Enter a valid two-letter destination country code.';return}
 if(form.elements.website.value){status.textContent='Your request was not sent.';return}
 var endpoint=(window.SM_CONFIG||{}).orderEndpoint;
 if(!/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint||'')){status.textContent='Secure order receiver unavailable. No request was sent.';return}
 var id=reference(),values=new FormData(form);values.delete('website');
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
  confirmed=true;
  var receiptSaved=false;
  try { var receipts=JSON.parse(localStorage.getItem(RECEIPT_KEY)||'[]');if(!Array.isArray(receipts))receipts=[];
    receipts=receipts.filter(function(x){return x&&x.id!==id}).slice(-49);
    receipts.push({id:id,at:new Date().toISOString(),state:'INTAKE_ACKNOWLEDGED_UNPAID',itemCount:cart.count(),items:cart.get().map(function(r){return {sku:r.sku,variant_id:r.vkey,variant_name:r.vname,attributes:r.attributes,quantity:r.qty,price_status:r.priceStatus};})});
    localStorage.setItem(RECEIPT_KEY,JSON.stringify(receipts));receiptSaved=true;
  }catch(storageError){}
  if(receiptSaved)cart.clear();
  render();status.textContent='Formspree acknowledged request '+id+'. NOT paid, accepted or confirmed received by staff. '+(receiptSaved?'A reference was saved on this device.':'Local receipt could not be saved, so your cart was preserved.')+' Contact support with this reference for staff verification.';
  referenceHelp(id);
  if(receiptSaved){try{sessionStorage.removeItem(REF_KEY)}catch(e){}}
 }catch(error){status.textContent='Request NOT confirmed ('+id+'). Do not submit again blindly; contact support with the same reference. Items have been preserved. '+String(error.message||'Network issue');referenceHelp(id)}
 finally{submitting=false;submit.disabled=confirmed}
});
document.addEventListener('sm:order-cart-changed',render);
render();
})();
