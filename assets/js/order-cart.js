/* Sasta Milaga unified request cart, PREVIEW ONLY.
 * No WooCommerce/PayPal changes and no migration that deletes legacy carts.
 * Local PKR and CJ USD stay in separate totals; server must reconfirm prices.
 */
(function(g){
  'use strict';
  if(g.SMOrderCart) return;
  var KEY='sm_order_cart_v1',MAX_ROWS=40,MAX_QTY=99;
  function clean(v,max){return String(v==null?'':v).trim().slice(0,max);}
  function read(){
    try{
      var value=JSON.parse(g.localStorage.getItem(KEY)||'[]');
      if(!Array.isArray(value))return[];
      return value.filter(function(r){return r&&['local','cj'].includes(r.type)&&r.id&&
        (Number.isFinite(r.unit)&&r.unit>0||(r.type==='cj'&&r.unit===null&&r.priceStatus==='pending'))&&Number.isInteger(r.qty)&&r.qty>0&&r.qty<=MAX_QTY&&
        r.currency===(r.type==='cj'?'USD':'PKR');}).slice(0,MAX_ROWS).map(normalize).filter(Boolean);
    }catch(e){return[]}
  }
  function persist(rows){
    try{g.localStorage.setItem(KEY,JSON.stringify(rows))}catch(e){return {ok:false,message:'Browser storage unavailable. Please enable storage to save your request.'}}
    if(g.document)g.document.dispatchEvent(new CustomEvent('sm:order-cart-changed',{detail:{count:count(),rows:read()}}));
    return {ok:true,count:count()};
  }
  function normalize(r){
    if(!r||!['local','cj'].includes(r.type))return null;
    var unit=Number(r.unit),qty=Number(r.qty==null?1:r.qty);
    var quotePending=r.type==='cj'&&(r.unit===null||r.unit===undefined||r.unit==='');
    if(!clean(r.id,128)||(!quotePending&&(!Number.isFinite(unit)||unit<=0))||!Number.isInteger(qty)||qty<1||qty>MAX_QTY)return null;
    var attrs=Array.isArray(r.attributes)?r.attributes.slice(0,12).map(function(a){
      return {attribute:clean(a&&a.attribute,60),value:clean(a&&a.value,120)};
    }).filter(function(a){return a.attribute&&a.value;}).sort(function(a,b){return a.attribute.localeCompare(b.attribute)||a.value.localeCompare(b.value);}):[];
    var url=clean(r.url,900);
    try{var u=new URL(url,g.location.href);if(u.protocol!=='https:'||(u.hostname!=='sastamilaga.com'&&!u.hostname.endsWith('.sastamilaga.com')))url='';else url=u.href;}catch(e){url=''}
    return {type:r.type,id:clean(r.id,128),sku:clean(r.sku||r.id,128),name:clean(r.name||r.sku||r.id,240),
      vkey:clean(r.vkey,128),vname:clean(r.vname,200),attributes:attrs,
      qty:qty,unit:quotePending?null:Math.round(unit*100)/100,currency:r.type==='cj'?'USD':'PKR',url:url,
      priceStatus:quotePending?'pending':(r.type==='cj'?'estimate':'unconfirmed'),source:'request_cart_preview'};
  }
  function identity(r){return JSON.stringify([r.type,r.id,r.sku,r.vkey,r.attributes]);}
  function add(input){
    var row=normalize(input);
    if(!row)return {ok:false,message:'A valid product, source currency and quantity are required.'};
    var rows=read(),key=identity(row),found=rows.find(function(r){return identity(r)===key});
    if(found){found.qty=Math.min(MAX_QTY,found.qty+row.qty);found.unit=row.unit;}
    else{if(rows.length>=MAX_ROWS)return {ok:false,message:'Maximum 40 distinct items.'};rows.push(row)}
    return persist(rows);
  }
  function quantity(key,n){
    if(!Number.isInteger(n)||n<1||n>MAX_QTY)return {ok:false,message:'Invalid quantity.'};
    var rows=read(),found=rows.find(function(r){return identity(r)===key});
    if(!found)return {ok:false,message:'Cart row not found.'};
    found.qty=n;return persist(rows);
  }
  function remove(key){return persist(read().filter(function(r){return identity(r)!==key}));}
  function clear(){return persist([]);}
  function count(){return read().reduce(function(a,r){return a+r.qty},0);}
  function totals(){
    var rows=read(),local=0,global=0;
    rows.forEach(function(r){if(r.type==='cj'){if(Number.isFinite(r.unit))global+=r.unit*r.qty;}else local+=r.unit*r.qty});
    var cfg=g.SM_CONFIG||{},fee=Number(cfg.deliveryFee),threshold=Number(cfg.freeDeliveryFrom);
    if(!Number.isFinite(fee)||fee<0)fee=250;
    if(!Number.isFinite(threshold)||threshold<0)threshold=5000;
    var localShipping=local>0&&local<threshold?fee:0;
    return {local:{subtotal:local,shippingEstimate:localShipping,totalEstimate:local+localShipping,currency:'PKR'},
      cj:{productSubtotalEstimate:global,currency:'USD',unpricedOptionCount:rows.filter(function(r){return r.type==='cj'&&r.unit===null}).length,shippingEstimate:null,finalTotal:null},
      requestOnly:true};
  }
  function summary(){
    var t=totals();
    var lines=read().map(function(r,i){return (i+1)+'. '+r.name+' | SKU: '+r.sku+
      (r.vname?' | Variant: '+r.vname:'')+(r.attributes.length?' | Options: '+r.attributes.map(function(a){return a.attribute+'='+a.value;}).join(', '):'')+' | '+r.qty+' × '+(r.unit===null?'price/stock/shipping pending':r.currency+' '+r.unit.toFixed(2))+
      (r.url?' | '+r.url:'');});
    return lines.join('\n')+'\nLocal PKR subtotal: '+t.local.subtotal.toFixed(2)+
      '\nLocal delivery indication (Pakistan only): '+t.local.shippingEstimate.toFixed(2)+
      '\nCJ USD product estimate: '+t.cj.productSubtotalEstimate.toFixed(2)+
      '\nUnpriced CJ options: '+t.cj.unpricedOptionCount+'\nCJ freight, tax, duties, inventory and final price: NOT CONFIRMED. No payment collected.';
  }
  function legacyInventory(){
    var result=[];
    ['sm_cart','sm_gcart'].forEach(function(key){
      try{var value=JSON.parse(g.localStorage.getItem(key)||'[]');if(Array.isArray(value))result.push({key:key,items:value.length});}
      catch(e){result.push({key:key,error:true})}
    });
    return result;
  }
  g.SMOrderCart={read:read,get:read,add:add,remove:remove,quantity:quantity,clear:clear,
    count:count,totals:totals,key:identity,message:summary,legacyInventory:legacyInventory,
    previewOnly:true};
})(window);
