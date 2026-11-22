/* Unified request checkout is an opt-in preview, not a payment gateway. */
(function(){
'use strict';
var cart=window.SMOrderCart,form=document.getElementById('sm-request-form'),
 rowsEl=document.getElementById('sm-request-rows'),totalsEl=document.getElementById('sm-request-totals'),
 status=document.getElementById('sm-request-status'),submit=document.getElementById('sm-request-submit');
if(!cart||!form||!rowsEl||!totalsEl||!status)return;
var submitting=false,confirmed=false,ref=null;
function money(n,c){return new Intl.NumberFormat('en-US',{style:'currency',currency:c,currencyDisplay:'code'}).format(n)}
function reference(){if(ref)return ref;var a=new Uint8Array(10);crypto.getRandomValues(a);ref='SM-REQ-'+Array.from(a).map(function(x){return x.toString(16).padStart(2,'0')}).join('').toUpperCase();return ref}
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
 totalsEl.textContent='Pakistan items: '+money(totals.local.subtotal,'PKR')+' + indicative delivery '+money(totals.local.shippingEstimate,'PKR')+
   ' · Global quoted products: '+(totals.cj.unpricedOptionCount||0)+' option(s) requiring individual pricing; priced-product estimate '+money(totals.cj.productSubtotalEstimate,'USD')+' before shipping, taxes and supplier confirmation.';
 form.hidden=rows.length===0||confirmed;
 if(!rows.length)status.textContent='Your separate request cart is empty. Existing WooCommerce and COD carts are unchanged.';
}
function hasCJ(){return cart.get().some(function(r){return r.type==='cj'})}
function validCountry(){var country=String(form.elements.country.value||'').toUpperCase();if(!/^[A-Z]{2}$/.test(country))return false;return !cart.get().some(function(r){return r.type==='local'})||country==='PK'}
form.addEventListener('submit',async function(e){
 e.preventDefault();if(submitting||confirmed||!form.reportValidity())return;
 if(!cart.count()){status.textContent='Your request cart is empty.';return}
 if(!validCountry()){status.textContent='Pakistan retail items can only be requested for Pakistan delivery. Remove local items for another destination.';return}
 if(form.elements.website.value){status.textContent='Your request was not sent.';return}
 var endpoint=(window.SM_CONFIG||{}).orderEndpoint;
 if(!/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint||'')){status.textContent='Secure order receiver unavailable. No request was sent.';return}
 var id=reference(),values=new FormData(form);values.delete('website');
 var totals=cart.totals();
 values.set('order_id',id);values.set('subject','Sasta Milaga order request '+id);
 values.set('source','Sasta Milaga opt-in static request page');values.set('order_items',cart.message());
 values.set('order_local_subtotal_pkr',totals.local.subtotal.toFixed(2));
 values.set('order_local_delivery_estimate_pkr',totals.local.shippingEstimate.toFixed(2));
 values.set('order_global_product_estimate_usd',totals.cj.productSubtotalEstimate.toFixed(2));
 values.set('order_global_unpriced_option_count',String(totals.cj.unpricedOptionCount||0));
 values.set('payment_status','NOT_PAID');
 values.set('fulfilment_status','UNCONFIRMED');
 values.set('request_type',hasCJ()?'CJ and/or Pakistan local enquiry; full final quote required':'Pakistan COD request pending manual acceptance');
 submitting=true;submit.disabled=true;status.textContent='Sending request securely…';
 try{
  var result=await fetch(endpoint,{method:'POST',body:values,headers:{Accept:'application/json'},signal:typeof AbortSignal.timeout==='function'?AbortSignal.timeout(18000):undefined});
  if(!result.ok)throw new Error(result.status===429?'Request receiver temporarily busy.':'Request receiver declined the message.');
  confirmed=true;status.textContent='Order request recorded under '+id+'. This is NOT a paid or accepted order. Stock, shipping and final total require confirmation. Keep this reference.';
  cart.clear();render();status.textContent='Order request recorded under '+id+'. NOT paid or accepted. Wait for confirmation before paying.';
 }catch(error){status.textContent='Request NOT confirmed ('+id+'). Do not submit again blindly; contact support with the same reference. Items have been preserved. '+String(error.message||'Network issue')}
 finally{submitting=false;submit.disabled=confirmed}
});
document.addEventListener('sm:order-cart-changed',render);
render();
})();
