/* Sasta Milaga static commerce v2 — REQUEST CART ONLY.
 * Browser storage is never the source of authoritative stock, payable price, orders or payment.
 */
(function(g){'use strict';
 const KEY='sm_static_cart_v2', RECEIPTS='sm_static_receipts_v2', MAX=99;
 const storage=g.localStorage;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const get=(k,otherwise)=>{try{let x=JSON.parse(storage.getItem(k)||'null');return x===null?otherwise:x}catch{return otherwise}};
 const save=(k,v)=>{try{storage.setItem(k,JSON.stringify(v));return true}catch{return false}};
 function clean(v,n=160){return String(v==null?'':v).trim().slice(0,n)}
 function normalize(o){
   if(!o||!['local','cj'].includes(o.type))throw Error('Invalid product source');
   let id=clean(o.id,128),sku=clean(o.sku,128),qty=Number(o.qty);
   if(!id||!sku||!Number.isInteger(qty)||qty<1||qty>MAX)throw Error('Invalid product, variation or quantity');
   let attrs=Array.isArray(o.attributes)?o.attributes.slice(0,12).map(x=>({attribute:clean(x?.attribute,64),value:clean(x?.value,128)})).filter(x=>x.attribute&&x.value).sort((a,b)=>a.attribute.localeCompare(b.attribute)): [];
   let variant=clean(o.variantId,128),name=clean(o.name,240),hint=Number(o.estimate);
   let estimate=Number.isFinite(hint)&&hint>0?Math.round(hint*100)/100:null;
   return {id,sku,qty,type:o.type,variantId:variant,variantName:clean(o.variantName,160),attributes:attrs,name:name||sku,estimate,currency:o.type==='cj'?'USD':'PKR',verifiedShipping:null};
 }
 const key=i=>JSON.stringify([i.type,i.id,i.sku,i.variantId,i.attributes]);
 function read(){let rows=get(KEY,[]);if(!Array.isArray(rows))return [];return rows.slice(0,40).flatMap(x=>{try{return [normalize(x)]}catch{return []}})}
 function write(rows){if(!save(KEY,rows))return {ok:false,error:'Unable to save cart on this device. No request was placed.'};
   g.dispatchEvent?.(new CustomEvent('sm:static-cart-changed',{detail:{count:count()}}));return {ok:true,count:rows.reduce((s,x)=>s+x.qty,0)}}
 function add(input){let row;try{row=normalize(input)}catch(e){return {ok:false,error:e.message}};
   let rows=read(),existing=rows.find(x=>key(x)===key(row));
   if(existing){if(existing.qty+row.qty>MAX)return {ok:false,error:'Maximum quantity is 99 per variation.'};existing.qty+=row.qty;existing.estimate=row.estimate}
   else{if(rows.length>=40)return {ok:false,error:'Your request cart is full.'};rows.push(row)}
   return write(rows)}
 function setQty(k,q){if(!Number.isInteger(q)||q<1||q>MAX)return {ok:false,error:'Quantity must be 1–99'};
   let rows=read(),item=rows.find(x=>key(x)===k);if(!item)return {ok:false,error:'Item not found'};item.qty=q;return write(rows)}
 function remove(k){return write(read().filter(x=>key(x)!==k))}
 function count(){return read().reduce((s,x)=>s+x.qty,0)}
 function totals(){let local=0,cj=0,missing=0;for(const x of read()){if(x.estimate===null){missing++;continue}(x.type==='local'?(()=>local+=x.estimate*x.qty):(()=>cj+=x.estimate*x.qty))())}
  return {localEstimate:local,cjEstimate:cj,missingPriceCount:missing,shipping:null,payableTotal:null,unpaid:true}}
 function clear(){return write([])}
 function reference(){let old='';try{old=g.sessionStorage.getItem('sm_pending_request_v2')||''}catch{}
  if(/^SMR-[A-F0-9]{24}$/.test(old))return old;
  let bytes=new Uint8Array(12);g.crypto.getRandomValues(bytes);
  let id='SMR-'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
  try{g.sessionStorage.setItem('sm_pending_request_v2',id)}catch{}return id}
 function acknowledge(ref,rows){let list=get(RECEIPTS,[]);if(!Array.isArray(list))list=[];let item={ref,at:new Date().toISOString(),state:'FORM_ACKNOWLEDGED_UNPAID',items:rows.map(r=>({sku:r.sku,variantId:r.variantId,qty:r.qty}))};let ok=save(RECEIPTS,list.filter(x=>x.ref!==ref).slice(-49).concat(item));return ok}
 function receipts(){return clone(get(RECEIPTS,[]))}
 g.SMStaticStore=Object.freeze({read,add,setQty,remove,count,totals,clear,reference,acknowledge,receipts,key});
})(window);
