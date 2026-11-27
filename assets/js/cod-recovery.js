/* Sasta Milaga Pakistan COD request cart. This is NOT WooCommerce and does
 * NOT alter PayPal. Its direct Formspree submission bypasses Cloudflare Workers.
 * Prices and inventory are quotations only until independently confirmed. */
(function () {
  'use strict';
  var KEY = 'sm_cod_request_cart_v1', ORDER = 'sm_cod_request_id_v1';
  var PKR = new Intl.NumberFormat('en-PK', {style:'currency',currency:'PKR',maximumFractionDigits:0});
  var MAX_ROWS = 25, MAX_QTY = 99;
  function validSku(s) { return /^[a-z0-9_.-]{3,72}$/i.test(String(s || '')); }
  function safeStr(s,n) { return String(s || '').trim().slice(0,n || 200); }
  function money(n) { return PKR.format(n); }
  function cart() {
    try {
      var rows = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(function(x){return validSku(x.sku) && Number.isFinite(x.unit) && x.unit > 0 && x.qty > 0;}).slice(0,MAX_ROWS) : [];
    } catch(e) { return []; }
  }
  function store(rows) {
    try { localStorage.setItem(KEY,JSON.stringify(rows)); return true; }
    catch(e) { return false; }
  }
  function safeUrl(u) {
    try {
      var v = new URL(String(u || location.href),location.origin);
      return /(^|\.)sastamilaga\.com$/.test(v.hostname) || v.hostname === 'kosama685.github.io'
        ? v.href.slice(0,400) : location.href.slice(0,400);
    } catch(e) { return location.href.slice(0,400); }
  }
  function fromSchema(sku) {
    var scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for(var i=0;i<scripts.length;i++){
      try {
        var d=JSON.parse(scripts[i].textContent);
        var graph=Array.isArray(d)?d:Array.isArray(d['@graph'])?d['@graph']:[d];
        for(var j=0;j<graph.length;j++){
          var p=graph[j],o=Array.isArray(p.offers)?p.offers[0]:p.offers;
          if(p['@type']==='Product' && String(p.sku).toLowerCase()===String(sku).toLowerCase() && o &&
             String(o.priceCurrency).toUpperCase()==='PKR' && Number(o.price)>0){
            return {sku:String(sku),name:safeStr(p.name,200),unit:Number(o.price),
              url:safeUrl(p.url||location.href)};
          }
        }
      } catch(e){}
    }
    return null;
  }
  function fromCatalogue(sku) {
    var items=window.SASTA_PRODUCTS;
    if(!Array.isArray(items))return null;
    var p=items.find(function(x){return String(x.id||'').toLowerCase()===String(sku).toLowerCase() ||
      String(x.sku||'').toLowerCase()===String(sku).toLowerCase();});
    if(!p)return null;
    var unit=Number(p.fp||p.bp||p.sp);
    if(!Number.isFinite(unit)||unit<=0)return null;
    return {sku:String(sku),name:safeStr(p.n||p.name||sku,200),unit:unit,
      url:safeUrl('/#/product/'+encodeURIComponent(p.h||p.id||sku))};
  }
  function attributes() {
    var out=[];
    document.querySelectorAll('main select[name^="attribute_"]').forEach(function(s){
      if(s.required&&!s.value)out.push({missing:true});
      else if(s.value)out.push({attribute:s.name.slice(10),value:safeStr(s.value,100)});
    });
    return out;
  }
  function add(sku,quantity) {
    if(!validSku(sku))return {ok:false,message:'This local product has no valid SKU.'};
    var product=fromSchema(sku)||fromCatalogue(sku);
    if(!product)return {ok:false,message:'We could not verify this product against the published Pakistan catalogue. Please contact support.'};
    if(!product.name || product.unit>10000000)return {ok:false,message:'The published product price requires confirmation.'};
    var attrs=attributes();
    if(attrs.some(function(x){return x.missing;}))return {ok:false,message:'Please select a colour, size or other required option before requesting COD.'};
    var qty=Math.max(1,Math.min(MAX_QTY,parseInt(quantity,10)||1));
    var rows=cart(),variant=JSON.stringify(attrs),existing=rows.find(function(x){
      return x.sku.toLowerCase()===product.sku.toLowerCase() && JSON.stringify(x.attributes||[])===variant;
    });
    if(existing) existing.qty=Math.min(MAX_QTY,existing.qty+qty);
    else {
      if(rows.length>=MAX_ROWS)return {ok:false,message:'The COD request cart has reached its item limit.'};
      rows.push({...product,qty:qty,attributes:attrs,addedAt:new Date().toISOString()});
    }
    if(!store(rows))return {ok:false,message:'Your browser could not save the COD request. Please enable site storage or use WhatsApp.'};
    return {ok:true,count:rows.reduce(function(n,x){return n+x.qty;},0),checkout:'/cod-checkout/'};
  }
  function remove(index){var r=cart();if(!Number.isInteger(index)||index<0||index>=r.length)return false;r.splice(index,1);return store(r);}
  function clear(){try{localStorage.removeItem(KEY);sessionStorage.removeItem(ORDER);}catch(e){}}
  function amount(rows){
    var c=window.SM_CONFIG||{},sub=rows.reduce(function(n,x){return n+x.unit*x.qty;},0);
    var threshold=Number(c.freeDeliveryFrom)||5000,fee=Number(c.deliveryFee)||250;
    var shipping=sub>=threshold?0:fee;
    return {subtotal:sub,shipping:shipping,total:sub+shipping,threshold:threshold};
  }
  function newOrderId() {
    try{
      var old=sessionStorage.getItem(ORDER);
      if(old && /^SM-[A-Z0-9_-]{5,65}$/i.test(old))return old;
      var bytes=new Uint8Array(8);
      crypto.getRandomValues(bytes);
      var id='SM-'+Date.now().toString(36).toUpperCase()+'-'+Array.from(bytes).map(function(x){return x.toString(16).padStart(2,'0');}).join('').toUpperCase();
      sessionStorage.setItem(ORDER,id);
      return id;
    }catch(e){return 'SM-'+Date.now().toString(36).toUpperCase()+'-REQUEST';}
  }
  function initCheckout() {
    var root=document.getElementById('sm-cod-checkout');
    if(!root)return;
    var rowsEl=document.getElementById('sm-cod-items'),totals=document.getElementById('sm-cod-totals');
    var form=document.getElementById('sm-cod-order-form'),status=document.getElementById('sm-cod-status');
    if(!rowsEl||!totals||!form||!status)return;
    function render(){
      var rows=cart(); rowsEl.textContent='';
      rows.forEach(function(x,i){
        var row=document.createElement('div');row.className='sm-cod-item';
        var label=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small');
        strong.textContent=x.name;small.textContent='SKU: '+x.sku+' · '+(x.attributes||[]).map(function(a){return a.attribute+': '+a.value;}).join(', ');
        var p=document.createElement('p');p.textContent=x.qty+' × '+money(x.unit)+' = '+money(x.unit*x.qty)+' (estimate)';
        label.appendChild(strong);label.appendChild(small);label.appendChild(p);
        var removeButton=document.createElement('button');removeButton.type='button';removeButton.className='sm-cod-remove';removeButton.textContent='Remove';removeButton.setAttribute('aria-label','Remove '+x.name);
        removeButton.addEventListener('click',function(){remove(i);render();});
        row.appendChild(label);row.appendChild(removeButton);rowsEl.appendChild(row);
      });
      var a=amount(rows);
      totals.textContent=rows.length?'Published subtotal '+money(a.subtotal)+' + estimated delivery '+money(a.shipping)+' = estimated total '+money(a.total)+'. Final stock, delivery and prices require confirmation.':'Your COD request cart is empty. Choose a Pakistan local product first.';
      form.hidden=!rows.length;
    }
    render();
    var sending=false,confirmed=false;
    form.addEventListener('submit',async function(e){
      e.preventDefault();
      if(sending||confirmed||!form.reportValidity())return;
      var rows=cart();
      if(!rows.length){status.textContent='Your cart is empty.';render();return;}
      if(String(form.elements.country.value)!=='PK'){status.textContent='This COD service is available for Pakistan delivery only.';return;}
      if(form.elements.website.value){status.textContent='Your request was not submitted.';return;}
      var fd=new FormData(form),a=amount(rows),id=newOrderId();
      fd.delete('website');
      fd.set('order_id',id);fd.set('subject','Pakistan COD order request '+id);
      fd.set('payment_method','Cash on Delivery (COD)');
      fd.set('payment_status','Awaiting stock, delivery and COD confirmation — unpaid');
      fd.set('source','GitHub Pages Pakistan COD checkout, not WooCommerce');
      fd.set('order_items',rows.map(function(x){return x.qty+' x '+x.name+' (SKU '+x.sku+')'+
        (x.attributes.length?' ['+x.attributes.map(function(a){return a.attribute+'='+a.value;}).join(', ')+']':'')+
        ' @ '+money(x.unit)+' = '+money(x.unit*x.qty)+'; '+x.url;}).join('\n\n'));
      fd.set('order_subtotal',money(a.subtotal));fd.set('order_delivery',money(a.shipping));
      fd.set('order_total',money(a.total));fd.set('items_quantity',String(rows.reduce(function(n,x){return n+x.qty;},0)));
      sending=true;var button=form.querySelector('button[type=submit]');if(button)button.disabled=true;
      status.textContent='Sending your COD order request securely…';
      try{
        var c=window.SM_CONFIG||{},endpoint=c.orderEndpoint||'https://formspree.io/f/xwvzzjdl';
        if(!/^https:\/\/formspree\.io\/f\/[a-z0-9]+$/i.test(endpoint))throw new Error('The order receiver is not configured securely.');
        var response=await fetch(endpoint,{method:'POST',body:fd,headers:{Accept:'application/json'},signal:typeof AbortSignal!=='undefined'&&AbortSignal.timeout?AbortSignal.timeout(18000):undefined});
        if(!response.ok)throw new Error(response.status===429?'The order form is busy. Please try later.':'Formspree could not accept this request (HTTP '+response.status+').');
        confirmed=true; status.textContent='COD request received by Formspree. Reference '+id+'. The team will confirm items, stock and final cost before accepting the order. No payment was collected.';
        form.hidden=true;clear();rowsEl.textContent='';totals.textContent='You can keep this reference for tracking: '+id;
      }catch(error){
        status.textContent='Request not confirmed: '+String(error.message||'Network failure')+'. Your details remain here. If you retry, use the same reference '+id+' and check for duplicates with support.';
      }finally{sending=false;if(button)button.disabled=confirmed;}
    });
  }
  window.SMCOD={add:add,cart:cart,remove:remove,clear:clear,amount:amount,initCheckout:initCheckout};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initCheckout);
  else initCheckout();
})();
