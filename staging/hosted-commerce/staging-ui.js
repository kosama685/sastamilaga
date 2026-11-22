(function(){
 'use strict';
 var api=window.SMHostedCommerce, status=document.getElementById('status'),
 connect=document.getElementById('connect'), product=document.getElementById('product'),
 add=document.getElementById('add'), quick=document.getElementById('quick'),
 refresh=document.getElementById('refresh'), checkout=document.getElementById('checkout'),
 cartLines=document.getElementById('cartLines'), cartTotal=document.getElementById('cartTotal'),pilot=document.getElementById('pilot');
 if(!api){status.textContent='Staging integration did not load.';return}
 var configured=false;
 function say(msg){status.textContent=String(msg)}
 function lock(yes){[add,quick,refresh,checkout].forEach(function(b){b.disabled=yes})}
 function getDetails(){var f=new FormData(product);return{variantId:String(f.get('variantId')||'').trim(),quantity:Number(f.get('quantity'))}}
 function renderCart(){
  return api.read().then(function(r){
    cartLines.replaceChildren();
    if(!r.cart){cartTotal.textContent='No managed-commerce cart yet.';return}
    var c=r.cart;
    (c.lines&&c.lines.nodes||[]).forEach(function(line){
      var li=document.createElement('li'),v=line.merchandise||{};
      li.textContent=(v.product&&v.product.title||'Variant')+' / '+(v.title||'')+' × '+line.quantity;
      cartLines.append(li);
    });
    var cost=c.cost&&c.cost.totalAmount;
    cartTotal.textContent='Confirmed cart summary: '+(cost?cost.currencyCode+' '+cost.amount:'Amount at checkout')+'. Stock, shipping and tax are confirmed at hosted checkout.';
  }).catch(function(e){say('Could not read managed cart: '+e.message);throw e});
 }
 function action(quickBuy){
  lock(true);say('Waiting for provider cart acknowledgement…');
  var x=getDetails();
  return api.add(x.variantId,x.quantity).then(function(res){
    say('Managed provider confirmed cart update. '+res.quantity+' item(s) in cart. No order or payment has been created.');
    return renderCart().then(function(){
      if(quickBuy){if(!pilot.checked){say('Cart confirmed; Quick Buy checkout requires explicit sandbox pilot approval.');return}
        return api.checkout().then(function(url){window.location.assign(url)})}
    });
  }).catch(function(e){say('Cart NOT confirmed: '+e.message)})
    .finally(function(){lock(!configured)});
 }
 connect.addEventListener('submit',function(e){e.preventDefault();var f=new FormData(connect);
  try{api.configure({shopDomain:f.get('shopDomain'),storefrontPublicToken:f.get('token'),apiVersion:f.get('version')});configured=true;lock(false);
    say('Test store configuration validated locally. Provider access and product existence still need live verification.');renderCart().catch(function(){})}
  catch(e){configured=false;lock(true);say('Not connected: '+e.message)}
 });
 product.addEventListener('submit',function(e){e.preventDefault();action(false)});
 quick.addEventListener('click',function(){action(true)});
 refresh.addEventListener('click',function(){lock(true);renderCart().then(function(){say('Cart refreshed from managed-commerce provider.')}).catch(function(e){say('Refresh failed: '+e.message)}).finally(function(){lock(!configured)})});
 checkout.addEventListener('click',function(){
  if(!pilot.checked){say('Hosted checkout is disabled until an approved sandbox pilot is selected.');return}
  lock(true);api.checkout().then(function(url){window.location.assign(url)}).catch(function(e){say('Checkout unavailable: '+e.message)}).finally(function(){lock(!configured)});
 });
})();