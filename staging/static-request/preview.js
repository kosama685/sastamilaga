/* Isolated browser-only demo. No real SKU or customer record is created.
 * Uses sessionStorage 'sm_preview_cart_v1', deliberately NOT 'sm_order_cart_v1'.
 * Never sends a request or redirects to payment / production order routes.
 */
(function(){
'use strict';
var KEY='sm_preview_cart_v1',MAX_ROWS=30,pending=false;
var status=document.getElementById('request-status'),count=document.getElementById('cart-count'),
lines=document.getElementById('request-lines'),totals=document.getElementById('request-totals');
if(!status||!lines||!totals)return;
var PRODUCTS={
 local:{type:'local',id:'DEMO-LOCAL-SHIRT',sku:'DEMO-SHIRT',name:'Demonstration cotton shirt (NOT ORDERABLE)',unit:1200,currency:'PKR'},
 cj:{type:'cj',id:'DEMO-CJ-GADGET',sku:'DEMO-CJ',name:'Demonstration global gadget (NOT ORDERABLE)',unit:null,currency:'USD'}
};
function load(){
 try{var a=JSON.parse(sessionStorage.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(function(r){return r&&PRODUCTS[r.type]&&r.id===PRODUCTS[r.type].id&&Number.isInteger(r.qty)&&r.qty>0&&r.qty<=99}).slice(0,MAX_ROWS):[]}
 catch(e){return[]}
}
function save(a){
 try{sessionStorage.setItem(KEY,JSON.stringify(a));return true}
 catch(e){return false}
}
function announce(message){status.textContent=String(message||'')}
function render(){
 var rows=load(),quantity=rows.reduce(function(n,r){return n+r.qty},0);
 count.textContent=String(quantity);lines.replaceChildren();
 if(!rows.length)lines.textContent='No items in the demonstration basket.';
 var local=0,cjUnpriced=0;
 rows.forEach(function(r){
   if(r.type==='local')local+=r.unit*r.qty;
   else cjUnpriced++;
   var wrapper=document.createElement('div');wrapper.className='row';
   var name=document.createElement('b');name.textContent=r.name;
   var desc=document.createElement('p');desc.textContent=r.sku+' · '+r.variant+
     ' · quantity '+r.qty+' · '+(r.unit===null?'supplier quote required':r.currency+' '+r.unit.toFixed(2)+' each');
   var remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Remove';
   remove.addEventListener('click',function(){
     var next=load().filter(function(x){return !(x.id===r.id&&x.variant===r.variant)});
     if(save(next)){render();announce('Demo item removed. Live carts remain unchanged.')}
   });
   wrapper.append(name,desc,remove);lines.append(wrapper);
 });
 totals.textContent='Illustrative local subtotal: PKR '+local.toFixed(2)+
  '; CJ unpriced quotation variants: '+cjUnpriced+
  '; shipping, tax and stock are not verified. No checkout or order is created.';
}
function handle(button){
 if(pending)return;
 var root=button.closest('[data-request-product]');if(!root)return;
 var type=root.getAttribute('data-request-product'),template=PRODUCTS[type];
 if(!template){announce('Unknown demonstration product');return}
 var qtyInput=root.querySelector('[data-qty]'),qty=Number(qtyInput?.value);
 if(!Number.isInteger(qty)||qty<1||qty>99){announce('Quantity must be from 1 to 99.');qtyInput?.focus();return}
 var opts=Array.from(root.querySelectorAll('[data-option]')),missing=opts.find(function(o){return !o.value});
 if(missing){announce('Choose '+missing.getAttribute('data-option')+' before adding.');missing.focus();return}
 pending=true;button.disabled=true;
 try{
   var variant=opts.map(function(o){return o.getAttribute('data-option')+': '+o.value}).join(' / ');
   var rows=load(),r=rows.find(function(x){return x.type===type&&x.variant===variant});
   if(r)r.qty=Math.min(99,r.qty+qty);
   else if(rows.length>=MAX_ROWS){announce('Demonstration basket is full.');return}
   else rows.push({id:template.id,sku:template.sku,name:template.name,type:type,
     unit:template.unit,currency:template.currency,qty:qty,variant:variant});
   if(!save(rows)){announce('Session storage unavailable. No demo item saved.');return}
   render();
   announce(button.getAttribute('data-action')==='quick'?
    'Quick Request demonstrated. Review the local demo basket; no checkout or real request was submitted.':
    'Added to the demonstration basket. No live shopping cart or payment was touched.');
 }finally{pending=false;button.disabled=false}
}
document.querySelectorAll('[data-request-product] [data-action]').forEach(function(b){
 b.addEventListener('click',function(){handle(b)});
});
document.getElementById('refresh-request')?.addEventListener('click',render);
window.addEventListener('storage',function(e){if(e.key===KEY)render()});
render();
})();
