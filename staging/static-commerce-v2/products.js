/* Product normalization and quotation UI. Read-only catalog data is NOT authoritative stock. */
(function(g){'use strict';
 const clip=(x,n=160)=>String(x==null?'':x).trim().slice(0,n);
 const amount=x=>{if(x===null||x===''||x===undefined)return null;let n=Number(x);return Number.isFinite(n)&&n>0?Math.round(n*100)/100:null};
 function local(p){
   if(!p||!p.id&&!p.sku)throw Error('Missing local product ID');
   let variants=Array.isArray(p.variants)?p.variants.map(v=>({
     id:clip(v.id||v.vkey||v.sku,128),sku:clip(v.sku,128),name:clip(v.name||v.label,120),
     estimate:amount(v.price),attributes:Array.isArray(v.attributes)?v.attributes:[]
   })).filter(v=>v.id&&v.sku):[];
   return {type:'local',id:clip(p.id||p.sku,128),sku:clip(p.sku||p.id,128),
     name:clip(p.name||p.title,240),variants,estimate:amount(p.price),currency:'PKR'};
 }
 function cj(row){
   if(!Array.isArray(row)||row.length<6)throw Error('Invalid CJ manifest row');
   return {type:'cj',id:clip(row[0],128),sku:clip(row[1],128),name:clip(row[2],240),
     estimate:amount(row[3]),currency:'USD',image:clip(row[5],900),
     variants:Array.isArray(row[7])?row[7].map(v=>({
       id:clip(v.id||v.vkey||v.vid,128),sku:clip(v.sku,128),name:clip(v.name,120),estimate:amount(v.price),
       attributes:Array.isArray(v.attributes)?v.attributes:[]
     })).filter(v=>v.id&&v.sku):[]};
 }
 function selection(p,variantId,quantity){
   if(!p)throw Error('Choose a product');
   if(!Number.isInteger(quantity)||quantity<1||quantity>99)throw Error('Choose quantity 1–99');
   let v=null;
   if(p.variants.length){v=p.variants.find(v=>v.id===variantId);if(!v)throw Error('Select a specific size, colour or variation')}
   return {type:p.type,id:p.id,sku:v?v.sku:p.sku,name:p.name,variantId:v?.id||'',
     variantName:v?.name||'',attributes:v?.attributes||[],qty:quantity,estimate:v?v.estimate:p.estimate};
 }
 /* Only a signed/validated server quotation can establish real shipping. Static bands are indicative only. */
 function shippingQuote(data,{country,variantId,qty}){
   if(!data||!Array.isArray(data.bands))return {status:'QUOTE_REQUIRED',amount:null};
   const found=data.bands.find(x=>x.country===country&&x.variantId===variantId&&qty>=x.minQty&&qty<=x.maxQty);
   if(!found)return {status:'QUOTE_REQUIRED',amount:null};
   const estimate=amount(found.price);
   return {status:'INDICATIVE_ONLY',amount:null,estimate,
     label:'Indicative shipping only — final carrier quote required'};
 }
 g.SMProducts=Object.freeze({local,cj,selection,shippingQuote});
})(window);
