(function(){'use strict';
var cart=window.SMOrderCart,target=document.getElementById('request-items'),
totals=document.getElementById('request-totals'),next=document.getElementById('request-next'),
message=document.getElementById('request-message');
if(!cart||!target)return;
function render(){
 target.replaceChildren();
 var list=cart.read();next.hidden=list.length===0;
 if(!list.length){target.textContent='No separate request items yet.';totals.textContent='Your existing carts have not been changed.';return}
 list.forEach(function(r){
  var box=document.createElement('div');box.className='row';
  var name=document.createElement('strong');name.textContent=r.name;
  var meta=document.createElement('p');var options=(r.attributes||[]).map(function(a){return a.attribute+': '+a.value;}).join(', ');meta.textContent=r.sku+' · '+r.type.toUpperCase()+(r.vname?' · Variant: '+r.vname:'')+(options?' · '+options:'')+' · '+(r.unit===null?'Quote required':r.currency+' '+r.unit.toFixed(2))+' per unit (subject to final confirmation)';
  var control=document.createElement('div');control.className='controls';
  var qty=document.createElement('input');qty.type='number';qty.min=1;qty.max=99;qty.step=1;qty.value=r.qty;
  qty.setAttribute('aria-label','Quantity for '+r.name);
  qty.addEventListener('change',function(){var response=cart.quantity(cart.key(r),Number(qty.value));if(!response.ok)message.textContent=response.message;render()});
  var remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove';
  remove.addEventListener('click',function(){cart.remove(cart.key(r));render()});
  control.append(qty,remove);box.append(name,meta,control);target.append(box);
 });
 var t=cart.totals();
 totals.textContent='Local subtotal: PKR '+t.local.subtotal.toFixed(2)+'; indicative Pakistan delivery: PKR '+(t.local.shippingEstimate===null?'Pending confirmation':t.local.shippingEstimate.toFixed(2))+
 '; Unpriced local items: '+t.local.unpricedOptionCount+'; CJ product subtotal estimate: USD '+t.cj.productSubtotalEstimate.toFixed(2)+'; unpriced CJ options: '+(t.cj.unpricedOptionCount||0)+'; international freight, duties and final amount require confirmation.';
}
document.addEventListener('sm:order-cart-changed',render);render();
})();