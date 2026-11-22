/* GitHub Pages global-product request checkout.
 * No WooCommerce, Cloudflare or payment dependency for saving a quote request.
 * Supplier rates, payments, stock and final totals are NOT confirmed here.
 */
(function(g){
  'use strict';
  if(g.SMGlobalQuote) return;
  var cartLoading=null;
  function str(x,max){return String(x==null?'':x).trim().slice(0,max);}
  function base(){
    var p=String(g.SMApp&&g.SMApp.APP_BASE||'/');
    return p.endsWith('/')?p:p+'/';
  }
  function orderUrl(country){
    var cc=String(country==null?'':country).trim().toUpperCase();
    return base()+'order/'+(/^[A-Z]{2}$/.test(cc)?'?country='+encodeURIComponent(cc):'');
  }
  function cartUrl(){return base()+'request-cart/';}
  function build(product,variant,quantity,notes,url){
    var p=product||{},v=variant||null,q=Number(quantity),detail=str(notes,120);
    if(!str(p.id,128)||!str(p.name,240))return {ok:false,message:'Product information is missing. Please contact support.'};
    if(!Number.isInteger(q)||q<1||q>99)return {ok:false,message:'Choose a quantity between 1 and 99.'};
    var hasVariant=!!(v&&str(v.vid,128)&&str(v.sku,128));
    if(!hasVariant&&!detail)return {ok:false,message:'Please describe your required size, colour or model in the Notes field before requesting a quote.'};
    var price=hasVariant?Number(v.price):NaN;
    var unit=Number.isFinite(price)&&price>0?Math.round(price*1.2*100)/100:null;
    var label=hasVariant?str(v.key||v.name||v.sku,200):detail;
    var attrs=[];
    if(hasVariant)attrs.push({attribute:'Supplier option',value:label});
    if(detail)attrs.push({attribute:hasVariant?'Customer notes':'Requested option',value:detail});
    return {ok:true,row:{
      type:'cj',id:str(p.id,128),sku:hasVariant?str(v.sku,128):str(p.sku||p.id,128),
      name:str(p.name,240),vkey:hasVariant?str(v.vid,128):'',
      vname:label,attributes:attrs,qty:q,unit:unit,url:str(url||'',900)
    },quotedOnly:true};
  }
  function ensureCart(){
    if(g.SMOrderCart&&typeof g.SMOrderCart.add==='function')return Promise.resolve(g.SMOrderCart);
    if(cartLoading)return cartLoading;
    cartLoading=new Promise(function(resolve,reject){
      if(!g.document||!g.document.createElement)return reject(new Error('Request cart cannot load in this browser.'));
      var script=g.document.createElement('script');
      script.src=base()+'assets/js/order-cart.js?v=global-request-20261122';
      script.async=true;
      script.onload=function(){
        if(g.SMOrderCart&&typeof g.SMOrderCart.add==='function')resolve(g.SMOrderCart);
        else reject(new Error('Request cart did not initialize.'));
      };
      script.onerror=function(){reject(new Error('Request cart could not be loaded. Please use WhatsApp.'));};
      g.document.head.appendChild(script);
    }).catch(function(e){cartLoading=null;throw e;});
    return cartLoading;
  }
  async function save(product,variant,quantity,notes,url){
    var request=build(product,variant,quantity,notes,url);
    if(!request.ok)return request;
    try{
      var cart=await ensureCart();
      var response=cart.add(request.row);
      if(!response||!response.ok)return {ok:false,message:response&&response.message||'Request cart could not be updated.'};
      return {ok:true,quantity:cart.count(),row:request.row,requestOnly:true};
    }catch(e){
      return {ok:false,message:str(e&&e.message||'Request cart unavailable.',220)};
    }
  }
  g.SMGlobalQuote={build:build,save:save,cartUrl:cartUrl,orderUrl:orderUrl,requestOnly:true};
})(window);
