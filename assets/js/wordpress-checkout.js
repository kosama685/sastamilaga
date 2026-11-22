/* Optional WooCommerce test handoff. Never replaces the static cart or submits an order.
 * Successful rows are checkpointed; uncertain writes require cart review, not blind replay.
 */
(function(g){
'use strict';
const KEY='sm_woo_handoff_v1';
async function request(path,options={}){
 const response=await fetch(path,{...options,credentials:'include',signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>null);
 if(!response.ok||!data){const error=Error(String(data?.message||'WordPress returned HTTP '+response.status).replace(/<[^>]*>/g,''));error.httpStatus=response.status;throw error}
 return {response,data};
}
async function handoff(rows,country){
 if(!rows.length)throw Error('Add items before testing WordPress checkout.');
 if(!/(^|\.)sastamilaga\.com$/.test(g.location.hostname)&&!(g.SM_CONFIG||{}).wordpressLocalTest)
  throw Error('WordPress checkout uses the store session. Test it on sastamilaga.com, or a local WordPress installation with wordpressLocalTest enabled.');
 const fingerprint=JSON.stringify({rows,country});
 let state={fingerprint,done:[],uncertain:null};
 let saved=null;try{saved=JSON.parse(g.sessionStorage.getItem(KEY)||'null');if(saved?.fingerprint===fingerprint)state=saved}catch(e){}
 if(saved&&(saved.uncertain!==null||saved.done?.length)){
  const existing=await request('/wp-json/wc/store/v1/cart');
  if(Array.isArray(existing.data.items)&&!existing.data.items.length){state={fingerprint,done:[],uncertain:null}}
  else if(saved.fingerprint!==fingerprint)throw Error('Your selection changed after a previous transfer. Review or empty the WordPress test cart before transferring another selection.');
 }
 if(state.uncertain!==null)throw Error('The previous add response was interrupted. Review the WordPress cart before another handoff; your static cart is preserved.');
 const persist=()=>{g.sessionStorage.setItem(KEY,JSON.stringify(state))};
 const map=rows.some(r=>r.type==='local')?(await request('/data/wp/product-ids.json')).data:{};
 for(const row of rows){
  if(row.type==='local'&&!map[row.sku]&&!map[row.id])throw Error('No WordPress product mapping for '+row.sku+'. The static checkout remains available.');
  if(row.type==='cj'&&!row.vkey)throw Error('Choose an exact supplier option before testing WordPress checkout.');
 }
 const context=(await request('/wp-json/gdcs/v1/context?light=1')).data;
 if(context.country!==country){
  if(!context.csrf)throw Error('WordPress destination session is unavailable.');
  await request('/wp-json/gdcs/v1/context',{method:'POST',headers:{'Content-Type':'application/json','X-GDCS-CSRF':context.csrf},
   body:JSON.stringify({country,currency:context.currency||'USD',language:context.language||'en',csrf:context.csrf})});
 }
 const latestContext=(await request('/wp-json/gdcs/v1/context?light=1')).data;
 if(latestContext.country!==country)throw Error('WordPress did not save your selected delivery country.');
 for(let index=0;index<rows.length;index++){
  if(state.done.includes(index))continue;
  const row=rows[index];
  const cart=await request('/wp-json/wc/store/v1/cart');
  if(!Array.isArray(cart.data.items))throw Error('WordPress did not return a WooCommerce cart.');
  let path,body,headers={'Content-Type':'application/json'};
  if(row.type==='local'){
   const nonce=cart.response.headers.get('Nonce');if(!nonce)throw Error('WordPress cart nonce unavailable.');
   headers.Nonce=nonce;path='/wp-json/wc/store/v1/cart/add-item';
   body={id:Number(map[row.sku]||map[row.id]),quantity:row.qty,
    variation:(row.attributes||[]).map(a=>({attribute:a.attribute,value:a.value}))};
  }else{
   if(!latestContext.csrf)throw Error('Supplier checkout session unavailable.');
   headers['X-GDCS-CSRF']=latestContext.csrf;path='/wp-json/gdcs/v1/live/cart';
   body={pid:row.id,vid:row.vkey,quantity:row.qty,origin:'',service:''};
  }
  // Persist BEFORE the mutation; a network timeout may conceal a successful add.
  state.uncertain=index;persist();
  let result;
  try{result=await request(path,{method:'POST',headers,body:JSON.stringify(body)})}
  catch(error){if(error.httpStatus>=400&&error.httpStatus<500){state.uncertain=null;persist()}throw error}
  if(row.type==='local'?!Array.isArray(result.data.items):result.data.added!==true)
   throw Error('WordPress did not acknowledge this item. Review its cart before retrying.');
  state.done.push(index);state.uncertain=null;persist();
 }
 const final=await request('/wp-json/wc/store/v1/cart');
 if(!Array.isArray(final.data.items)||!final.data.items.length)throw Error('WordPress cart is empty after the handoff.');
 return {ok:true,cart:'/cart/',checkout:'/checkout/',count:final.data.items_count};
}
g.SMWordPressCheckout=Object.freeze({handoff});
const button=g.document?.getElementById('sm-wordpress-test'),status=g.document?.getElementById('sm-wordpress-status');
if(button&&status)button.addEventListener('click',async()=>{
 const form=g.document.getElementById('sm-request-form'),country=String(form?.elements.country.value||'').toUpperCase();
 if(!/^[A-Z]{2}$/.test(country)){status.textContent='Enter your delivery country in the form first.';return}
 button.disabled=true;status.textContent='Checking the WordPress session and transferring selected items…';
 try{const result=await handoff(g.SMOrderCart.get(),country);status.textContent='WordPress cart verified. Opening its checkout; no order has been submitted.';g.location.assign(result.checkout)}
 catch(e){status.textContent=String(e.message||e)+' Use the WordPress cart link to inspect its state. Your static cart is preserved.'}
 finally{button.disabled=false}
});
})(window);
