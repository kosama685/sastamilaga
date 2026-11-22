/* Formspree is an UNPAID REQUEST receiver, not a payment gateway or order database. */
(function(g){'use strict';
 const refStore=g.SMStaticStore, ENDPOINT=/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i;
 let active=false;
 function countryAllowed(rows,country){return rows.every(x=>x.type!=='local'||country==='PK')}
 function readValues(form){let f=new FormData(form),value=k=>String(f.get(k)||'').trim();
   return {name:value('full_name'),phone:value('phone'),email:value('email'),address:value('address'),city:value('city'),
    country:value('country').toUpperCase(),notes:value('notes'),payment:value('payment')}}
 function msg(text){let el=document.getElementById('request-status');if(el)el.textContent=text}
 function formatPayload(ref,customer,rows){
   return {request_reference:ref,full_name:customer.name,phone:customer.phone,email:customer.email,
    address:customer.address,city:customer.city,country:customer.country,notes:customer.notes,
    requested_payment:customer.payment==='cod'?'COD_PENDING_STAFF_ACCEPTANCE':'QUOTE_ONLY',
    payment_status:'NOT_PAID',fulfillment_status:'UNCONFIRMED',
    request_items_json:JSON.stringify(rows.map(x=>({id:x.id,sku:x.sku,name:x.name,variant_id:x.variantId,
      variant_name:x.variantName,attributes:x.attributes,quantity:x.qty,unit_estimate:x.estimate,
      currency:x.currency,shipping_quote:'UNVERIFIED'}))),
    quote_status:'SHIPPING_STOCK_PRICES_REQUIRE_STAFF_CONFIRMATION',
    requested_at:new Date().toISOString(),source:'Sasta Milaga static staging request form'};
 }
 async function send(form,endpoint){
   if(active)return {ok:false,status:'IN_PROGRESS'};
   if(!ENDPOINT.test(endpoint||''))return {ok:false,status:'CONFIGURATION_ERROR'};
   if(!form||!form.reportValidity())return {ok:false,status:'VALIDATION_ERROR'};
   let customer=readValues(form),rows=refStore.read(),ref=refStore.reference();
   if(!rows.length)return {ok:false,status:'EMPTY_CART'};
   if(!/^[A-Z]{2}$/.test(customer.country)||!countryAllowed(rows,customer.country))
     return {ok:false,status:'INVALID_DESTINATION'};
   if(customer.payment==='cod'&&(customer.country!=='PK'||rows.some(x=>x.type!=='local')))
     return {ok:false,status:'COD_NOT_AVAILABLE'};
   // No attempt to infer successful dispatch from a browser timeout: do not auto-resend.
   if(g.sessionStorage.getItem('sm_request_uncertain_v2')===ref)
     return {ok:false,status:'PREVIOUS_ATTEMPT_UNCERTAIN',ref};
   active=true;let btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
   let ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
   msg('Sending unpaid request. Do not close this page…');
   try{
     let f=new FormData();let obj=formatPayload(ref,customer,rows);
     Object.entries(obj).forEach(([k,v])=>f.set(k,v));
     let r=await fetch(endpoint,{method:'POST',body:f,headers:{Accept:'application/json'},signal:ctrl.signal});
     if(!r.ok)throw Object.assign(new Error('Receiver declined request'),{httpStatus:r.status});
     if(!refStore.acknowledge(ref,rows)){msg('Receiver acknowledged your request but local receipt could not be saved. Cart preserved. Contact staff with '+ref);
       return {ok:false,status:'ACKNOWLEDGED_NOT_PERSISTED',ref};}
     if(!refStore.clear().ok){msg('Receiver acknowledged request '+ref+'. Cart could not be cleared. Do not resubmit.');
       return {ok:true,status:'ACKNOWLEDGED_CART_RETAINED',ref}}
     try{g.sessionStorage.removeItem('sm_pending_request_v2');g.sessionStorage.removeItem('sm_request_uncertain_v2')}catch{}
     msg('Formspree acknowledged request '+ref+'. NOT paid or accepted by staff. Keep this reference.');
     return {ok:true,status:'INTAKE_ACKNOWLEDGED_UNPAID',ref};
   }catch(e){
     let uncertain=e.name==='AbortError'||!Number.isInteger(e.httpStatus)||e.httpStatus>=500;
     if(uncertain){try{g.sessionStorage.setItem('sm_request_uncertain_v2',ref)}catch{}}
     msg('Request '+ref+' not confirmed. Your cart and entered details are preserved. '+(uncertain?'Please check with staff before resubmitting; a timed-out request may have arrived.':'Correct the request and try again.'));
     return {ok:false,status:uncertain?'UNCERTAIN_DELIVERY':'REJECTED',ref};
   }finally{clearTimeout(timer);active=false;if(btn)btn.disabled=false}
 }
 g.SMCheckout=Object.freeze({send,formatPayload,isBusy:()=>active});
})(window);
