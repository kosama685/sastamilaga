/* Isolated offline Add/Quick Request harness. Existing SMOrderCart is the sole
 * cart state. No Woo APIs, remote product prices or payment calls are made. */
(function(){
 'use strict';
 var cart=window.SMOrderCart, status=document.getElementById('request-status');
 var count=document.getElementById('cart-count'), lines=document.getElementById('request-lines');
 var totals=document.getElementById('request-totals');
 if(!cart||!status||!lines){if(status)status.textContent='Request cart library unavailable';return}
 var DEMOS={
  local:{type:'local',id:'DEMO-LOCAL-SHIRT',sku:'DEMO-SHIRT',name:'Demonstration cotton shirt (NOT ORDERABLE)',unit:1200},
  cj:{type:'cj',id:'DEMO-CJ-GADGET',sku:'DEMO-CJ',name:'Demonstration global gadget (NOT ORDERABLE)',unit:null}
 };
 var pending=false;
 function announce(msg){status.textContent=String(msg||'')}
 function rowText(r){return r.name+' — '+r.vname+' × '+r.qty+' — '+(r.unit===null?'price pending':r.currency+' '+r.unit.toFixed(2))}
 function render(){
  var rows=cart.read();count.textContent=String(cart.count());
  lines.replaceChildren();
  if(!rows.length){lines.textContent='No items in the separate request cart.'}
  rows.forEach(function(r){
   var el=document.createElement('div');el.className='row';
   var name=document.createElement('b');name.textContent=r.name;
   var desc=document.createElement('p');desc.textContent=(r.sku||r.id)+' · '+rowText(r);
   el.append(name,desc);lines.append(el);
  });
  var t=cart.totals();totals.textContent='Pakistan products: PKR '+t.local.subtotal.toFixed(2)+
    ' (indicative shipping PKR '+t.local.shippingEstimate.toFixed(2)+
    '); CJ priced estimates: USD '+t.cj.productSubtotalEstimate.toFixed(2)+
    '; CJ unpriced options: '+t.cj.unpricedOptionCount+' — no payment or confirmed stock.';
 }
 function handle(button){
  if(pending)return;
  var root=button.closest('[data-request-product]');
  if(!root)return;
  var type=root.getAttribute('data-request-product'),template=DEMOS[type],qty=Number(root.querySelector('[data-qty]').value);
  if(!template){announce('Unrecognized demo item');return}
  if(!Number.isInteger(qty)||qty<1||qty>99){announce('Quantity must be 1 to 99');root.querySelector('[data-qty]').focus();return}
  var options=Array.from(root.querySelectorAll('[data-option]')),missing=options.find(function(o){return !o.value});
  if(missing){announce('Choose '+missing.getAttribute('data-option')+' before adding this item.');missing.focus();return}
  pending=true;button.disabled=true;
  try{
   var name=options.map(function(o){return o.getAttribute('data-option')+': '+o.value}).join(' / ');
   var response=cart.add(Object.assign({},template,{qty:qty,vkey:name,vname:name,
     attributes:options.map(function(o){return{attribute:o.getAttribute('data-option'),value:o.value}}),
     url:'https://sastamilaga.com/staging/static-request/'}));
   if(!response.ok){announce(response.message||'Cart not updated');return}
   render();announce('Saved to the separate request cart. This is not a paid or accepted order.');
   if(button.getAttribute('data-action')==='quick')announce('Quick request saved. Review the request basket before submitting an enquiry.');
  }catch(e){announce('Cart not updated: '+String(e.message||e))}
  finally{pending=false;button.disabled=false}
 }
 document.querySelectorAll('[data-request-product] [data-action]').forEach(function(button){
  button.addEventListener('click',function(){handle(button)});
 });
 document.getElementById('refresh-request')?.addEventListener('click',render);
 document.addEventListener('sm:order-cart-changed',render);
 window.addEventListener('storage',function(e){if(e.key==='sm_order_cart_v1')render()});
 render();
})();
