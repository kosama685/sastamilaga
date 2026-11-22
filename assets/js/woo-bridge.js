/* Sasta Milaga static request-commerce bridge.
 * No WooCommerce, WordPress, Cloudflare, payment capture or server-side order creation.
 * On every listing the result is an unpaid REQUEST until staff verify it in Formspree.
 * This file replaces the historical woo-bridge.js while preserving old HTML script references.
 */
(function(g){
'use strict';
if(g.SMRequestBridge)return;
var loading=null,busy=false,vmCard=null,MAX_QTY=99;
function clean(s,n){return String(s==null?'':s).trim().slice(0,n)}
function getCart(){
 if(g.SMOrderCart)return Promise.resolve(g.SMOrderCart);
 if(loading)return loading;
 loading=new Promise(function(resolve,reject){
   var script=document.createElement('script');script.src='/assets/js/order-cart.js?v=request-commerce-20261122';
   script.async=true;script.onload=function(){g.SMOrderCart?resolve(g.SMOrderCart):reject(new Error('Request cart did not initialize'))};
   script.onerror=function(){reject(new Error('Request cart could not be loaded'))};
   document.head.appendChild(script);
 }).catch(function(e){loading=null;throw e});
 return loading;
}
function product(sku){
 var A=g.SMApp||{},list=Array.isArray(A.products)?A.products:[];
 var p=list.find(function(x){return x&&[x.id,x.sku,x.code].some(function(y){return String(y||'').toLowerCase()===String(sku).toLowerCase()})});
 return p||null;
}
function options(){
 var attrs=[],incomplete=false;
 document.querySelectorAll('main select[name^="attribute_"],main input[type="radio"][name^="attribute_"]:checked').forEach(function(x){
   if(x.tagName==='SELECT'&&x.required&&!x.value)incomplete=true;
   if(x.value)attrs.push({attribute:clean(x.name.replace(/^attribute_/,''),60),value:clean(x.value,120)});
 });
 return {attrs:attrs,incomplete:incomplete};
}
function money(p,A){
 if(!p)return null;
 var value=typeof A.price==='function'?Number(A.price(p)):Number(p.fp||p.bp||p.sp||p.price);
 return Number.isFinite(value)&&value>0?value:null;
}
function qty(){
 var e=document.getElementById('pdpQty')||document.getElementById('qty')||document.querySelector('main input[name="quantity"]');
 var n=e?Number(e.value||e.textContent):1;
 return Number.isInteger(n)&&n>=1&&n<=MAX_QTY?n:1;
}
function updateBadge(count){
 document.querySelectorAll('.smh-cart__count').forEach(function(el){el.textContent=String(count);el.setAttribute('data-n',String(count))});
}
function notice(message,link){
 var t=document.getElementById('sm-request-feedback');
 if(!t){t=document.createElement('div');t.id='sm-request-feedback';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.style.cssText='position:fixed;bottom:15px;left:12px;right:12px;max-width:620px;margin:auto;z-index:2147483000;background:#123f2a;color:white;padding:16px;border-radius:12px;box-shadow:0 10px 30px #0004;font:600 15px/1.5 system-ui';document.body.appendChild(t)}
 t.replaceChildren(document.createTextNode(message));
 if(link){var a=document.createElement('a');a.href=link;a.style.cssText='color:#fff;text-decoration:underline;margin-left:10px';a.textContent='Review request';t.appendChild(a)}
}
function schemaProduct(){
 var sku='',name='',unit=null;
 document.querySelectorAll('script[type="application/ld+json"]').forEach(function(el){
  try{var j=JSON.parse(el.textContent||'{}'),nodes=Array.isArray(j)?j:(j['@graph']||[j]);
   nodes.forEach(function(x){if(x&&x['@type']==='Product'){sku=sku||clean(x.sku,100);name=name||clean(x.name,240);var o=x.offers;if(o&&!Array.isArray(o)&&o['@type']==='Offer'&&o.priceCurrency==='PKR'&&Number(o.price)>0)unit=Number(o.price)}})
  }catch(e){}
 });
 return {sku:sku,name:name,unit:unit};
}
function details(sku,attrs,source){
 var A=g.SMApp||{},p=product(sku),schema=schemaProduct();
 if(schema.sku!==sku)schema={};
 var el=source&&source.closest?source.closest('article,[data-product],.pdp,.product-card'):null;
 var heading=el&&el.querySelector('h2,h3,.product-title');
 var name=clean((p&&(p.n||p.name))||schema.name||(heading&&heading.textContent)||sku,240);
 var variation=attrs.map(function(x){return x.attribute+': '+x.value}).join(', ');
 return {type:'local',id:clean((p&&(p.id||p.sku))||sku,128),
  sku:clean(sku,128),name:name,qty:qty(),unit:attrs.length?null:(money(p,A)||schema.unit||null),
  vkey:variation,vname:variation,attributes:attrs,url:location.href};
}
function add(sku,amount,variation,buyNow,source){
 if(busy)return Promise.resolve({ok:false,message:'The previous request-cart action is still processing.'});
 sku=clean(sku,128);if(!sku)return Promise.resolve({ok:false,message:'Product SKU is missing.'});
 var selected=variation||options();
 if(selected.incomplete){notice('Please select the required size or colour before continuing.');return Promise.resolve({ok:false,message:'Choose a required option.'})}
 if(amount!=null&&(!Number.isInteger(Number(amount))||Number(amount)<1||Number(amount)>MAX_QTY))
   return Promise.resolve({ok:false,message:'Invalid quantity.'});
 busy=true;
 var row=details(sku,selected.attrs,source);
 row.qty=amount==null?row.qty:Number(amount);
 notice('Saving your selection as an unpaid request…');
 return getCart().then(function(cart){
   var r=cart.add(row);
   if(!r.ok)throw new Error(r.message||'Cannot save the request');
   updateBadge(cart.count());
   if(buyNow){location.assign('/order/?country=PK');}
   else notice('Saved in your request cart. Final price, stock and delivery are confirmed by staff; no payment taken.','/request-cart/');
   return {ok:true,requestOnly:true,count:cart.count(),row:row};
 }).catch(function(e){notice('Could not save selection: '+clean(e.message||e,200)+'. No order was placed.');return {ok:false,message:String(e.message||e)}})
 .finally(function(){busy=false});
}
function productSku(){
 return schemaProduct().sku || clean((document.querySelector('main [data-sku]')||{}).dataset?.sku,128);
}
function onClick(e){
 var opener=e.target&&e.target.closest?e.target.closest('[data-vm-src]'):null;
 if(opener){vmCard=opener;return}
 var target=e.target&&e.target.closest?e.target.closest('[data-add-cart],#smvm-cart,#smvm-buy,main a[href*="#/product/"],main a[aria-label="Buy now"]'):null;
 if(!target)return;
 var quick=target.id==='smvm-buy',local=false,sku='',q=null,selected;
 if(target.hasAttribute('data-add-cart')){local=true;sku=target.getAttribute('data-add-cart');}
 else if(target.id==='smvm-cart'||target.id==='smvm-buy'){
   local=true;var sel=document.getElementById('smvm-opt');
   var opts=[];try{opts=JSON.parse(vmCard&&vmCard.getAttribute('data-vm-opts')||'[]')}catch(e){}
   var selectedOption=sel&&sel.selectedIndex>=0?opts[sel.selectedIndex]:null;
   sku=(selectedOption&&selectedOption.q)||(vmCard&&vmCard.getAttribute('data-vm-q'))||'';
   q=Number((document.getElementById('smvm-qty')||{}).value)||1;
 }else{
   var label=clean(target.textContent,80).toLowerCase();
   if(!/^add to cart|^buy now/.test(label))return;
   quick=/^buy now/.test(label);local=true;sku=productSku();
 }
 if(!local||!sku)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(busy){notice('Your earlier click is still processing.');return}
 selected=options();
 if(target.id==='smvm-cart'||target.id==='smvm-buy'){
  var sel=document.getElementById('smvm-opt');
  if(sel&&sel.value)selected.attrs.push({attribute:'Selected option',value:clean(sel.options[sel.selectedIndex]?.text||sel.value,120)});
 }
 add(sku,q,selected,quick,target);
}
g.addEventListener('click',onClick,true);
g.addEventListener('click',function(e){
 var link=e.target&&e.target.closest?e.target.closest('a[href="#/cart"],a[href="#/checkout"]'):null;
 if(!link)return;
 e.preventDefault();e.stopImmediatePropagation();
 location.assign(link.getAttribute('href')==='#/cart'?'/request-cart/':'/order/');
},true);
 // Preserve the existing HTML links while routing to the unified request cart.
 // This modifies only in-page links, not server DNS or payment/checkout routes.
 function updateCartLinks(){
   document.querySelectorAll('a.smh-cart,a.smh-cart__link,a[href="/cart/"]').forEach(function(a){
     a.href='/request-cart/';a.setAttribute('aria-label','Review one combined local and CJ request cart');
   });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',updateCartLinks);
 else updateCartLinks();
 document.addEventListener('sm:order-cart-changed',function(e){updateBadge(e.detail&&e.detail.count||0)});
 getCart().then(function(c){updateBadge(c.count())}).catch(function(){});
g.SMRequestBridge={add:add,requestOnly:true,status:function(){return {busy:busy,receiver:'Formspree via /order/',payment:'NOT_PAID'}}};
})(window);
