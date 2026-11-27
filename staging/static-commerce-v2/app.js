/* Staging UI only. Product data must be supplied from reviewed real catalog records. */
(function(g){'use strict';
 const store=g.SMStaticStore,checkout=g.SMCheckout;
 const form=document.getElementById('product-form'),cartEl=document.getElementById('cart'),totalsEl=document.getElementById('totals');
 const addStatus=document.getElementById('add-status'),countEl=document.getElementById('count');
 const endpoint='https://formspree.io/f/xwvzzjdl'; // Public Formspree form identifier, not a secret.
 const node=(t,v)=>{let e=document.createElement(t);if(v!=null)e.textContent=String(v);return e};
 function render(){
  const rows=store.read();cartEl.replaceChildren();countEl.textContent=String(store.count());
  if(!rows.length){cartEl.appendChild(node('p','Your request cart is empty.'));totalsEl.textContent='No payment is collected.';return}
  for(const r of rows){
   const item=node('div');item.className='item';
   item.appendChild(node('strong',r.name));
   item.appendChild(node('p',r.sku+(r.variantName?' · '+r.variantName:'')+' · '+r.type.toUpperCase()+' · '+(r.estimate===null?'Price pending quote':r.currency+' '+r.estimate.toFixed(2)+' estimated each')));
   let actions=node('div');actions.className='tools';
   let field=node('input');field.type='number';field.min='1';field.max='99';field.step='1';field.value=String(r.qty);field.setAttribute('aria-label','Quantity for '+r.name);
   field.addEventListener('change',()=>{let n=Number(field.value),result=store.setQty(store.key(r),n);if(!result.ok)addStatus.textContent=result.error;render()});
   let remove=node('button','Remove');remove.type='button';remove.className='secondary';
   remove.addEventListener('click',()=>{let result=store.remove(store.key(r));if(!result.ok)addStatus.textContent=result.error;render()});
   actions.append(field,remove);item.appendChild(actions);cartEl.appendChild(item);
  }
  const t=store.totals();
  totalsEl.textContent='Estimated local product subtotal PKR '+t.localEstimate.toFixed(2)+
    ' · Estimated CJ product subtotal USD '+t.cjEstimate.toFixed(2)+
    ' · Items requiring pricing '+t.missingPriceCount+
    ' · Shipping unverified · Final amount NOT available.';
 }
 form.addEventListener('submit',e=>{
   e.preventDefault();if(!form.reportValidity())return;
   let f=new FormData(form),type=String(f.get('type')),variant=String(f.get('variantname')||'').trim();
   const estimateRaw=String(f.get('estimate')||'').trim();
   let result=store.add({
     type,id:String(f.get('pid')),sku:String(f.get('sku')),name:String(f.get('pname')),
     variantId:String(f.get('variant')||''),variantName:variant,
     attributes:variant?[{attribute:'Selected option',value:variant}]:[],
     qty:Number(f.get('qty')),estimate:estimateRaw?Number(estimateRaw):null
   });
   addStatus.textContent=result.ok?'Item saved in unpaid request cart; supplier/stock confirmation still required.':result.error;
   if(result.ok)render();
 });
 document.getElementById('checkout-form').addEventListener('submit',async e=>{
   e.preventDefault();
   let country=document.getElementById('country').value,payment=document.getElementById('payment').value;
   if(store.read().some(r=>r.type==='local')&&country!=='PK'){
     document.getElementById('request-status').textContent='Pakistan local requests can only be delivered within Pakistan.';return
   }
   if(payment==='cod'&&(country!=='PK'||store.read().some(r=>r.type==='cj'))){
     document.getElementById('request-status').textContent='COD is only an unpaid request for eligible Pakistan local items. Select quotation for other items.';return
   }
   const result=await checkout.send(e.currentTarget,endpoint);
   if(result.ok){render();addStatus.textContent='Intake acknowledged; no payment or fulfillment confirmed.'}
 });
 g.addEventListener('sm:static-cart-changed',render);render();
})(window);
