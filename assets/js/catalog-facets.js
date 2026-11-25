/* Evidence-aware catalog filters. No price/stock/brand claims are inferred from names. */
(function(root){
'use strict';
const fold=v=>String(v??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const validCountry=v=>/^[A-Z]{2}$/.test(v);
const money=v=>v===''||v==null?null:(Number.isFinite(Number(v))&&Number(v)>=0?Number(v):NaN);
function normalize(input={}){
 const country=String(input.country||'').trim().toUpperCase();
 const min=money(input.min),max=money(input.max);
 return {q:String(input.q||'').trim().slice(0,160),min,max,sort:['low','high','az'].includes(input.sort)?input.sort:'',video:input.video===true,country:validCountry(country)?country:'',delivery:input.delivery===true,stock:input.stock===true,brand:fold(input.brand).slice(0,120),model:fold(input.model).slice(0,120),error:Number.isNaN(min)||Number.isNaN(max)||(min!==null&&max!==null&&min>max)?'Enter a valid price range.':((input.delivery||input.stock)&&!validCountry(country)?'Select a delivery country first.':'')};
}
function flags(e,country,now=Date.now()){
 if(!e||e.country!==country)return {stock:false,delivery:false,both:false};
 const fresh=v=>Number.isSafeInteger(v)&&v>now;
 return {stock:e.stock===true&&fresh(e.stockUntil),delivery:e.delivery===true&&fresh(e.deliveryUntil),both:e.both===true&&fresh(e.bothUntil)&&e.stock===true&&e.delivery===true&&fresh(e.stockUntil)&&fresh(e.deliveryUntil)};
}
function attributes(e,now=Date.now()){
 return e&&Number.isSafeInteger(e.attributeUntil)&&e.attributeUntil>now?{brand:fold(e.brand),model:fold(e.model)}:{brand:'',model:''};
}
function select(items,raw,evidence=new Map(),now=Date.now()){
 const f=normalize(raw);
 if(f.error)return {items:[],error:f.error};
 const words=fold(f.q).split(' ').filter(Boolean);
 const list=items.filter(p=>{
  const e=evidence.get(String(p.id)),a=attributes(e,now),v=flags(e,f.country,now);
  const hay=fold([p.title,p.sku,a.brand,a.model].join(' '));
  if(!words.every(w=>hay.includes(w)))return false;
  if(f.video&&!p.video)return false;
  if(f.min!==null&&(!Number.isFinite(p.price)||p.price<f.min))return false;
  if(f.max!==null&&(!Number.isFinite(p.price)||p.price>f.max))return false;
  if(f.brand&&a.brand!==f.brand||f.model&&a.model!==f.model)return false;
  if(f.stock&&f.delivery&&!v.both)return false;
  if(f.stock&&!v.stock||f.delivery&&!v.delivery)return false;
  return true;
 });
 if(f.sort==='az')list.sort((a,b)=>String(a.title).localeCompare(String(b.title)));
 if(f.sort==='low'||f.sort==='high')list.sort((a,b)=>{
  const x=Number.isFinite(a.price),y=Number.isFinite(b.price);
  if(x!==y)return x?-1:1;
  return x?(f.sort==='low'?a.price-b.price:b.price-a.price):0;
 });
 return {items:list,error:''};
}
function chips(raw){
 const f=normalize(raw),out=[];
 for(const [key,label] of [['q','Search'],['min','Min USD'],['max','Max USD'],['country','Destination'],['brand','Brand'],['model','Model'],['sort','Sort']]){
  if(f[key]!==null&&f[key]!==''&&!Number.isNaN(f[key]))out.push({key,label:label+': '+f[key]});
 }
 for(const [key,label] of [['video','Video-labelled'],['delivery','Delivery checked'],['stock','Warehouse stock checked']])if(f[key])out.push({key,label});
 return out;
}
function clear(raw,key){
 const next={...raw};delete next[key];
 if(key==='country'){delete next.stock;delete next.delivery;}
 return next;
}
async function loadEvidence({category,country,fetcher=fetch,signal,endpoint='/api/catalog-facets/v1',maxPages=50}){
 const data=new Map();let cursor='';
 if(!/^[a-z0-9-]{1,120}$/.test(category)||!validCountry(country))throw Error('Invalid evidence scope');
 for(let i=0;i<maxPages;i++){
  const p=new URLSearchParams({category,country,after:cursor});
  const res=await fetcher(endpoint+'?'+p,{signal,cache:'no-store',credentials:'omit',redirect:'error'});
  if(!res.ok||!String(res.headers.get('content-type')).includes('application/json'))throw Error('Evidence service unavailable');
  const b=await res.json();
  if(b.schema!==1||b.category!==category||b.country!==country||!Array.isArray(b.rows)||b.rows.length>200)throw Error('Evidence scope mismatch');
  let prev=cursor;
  for(const r of b.rows){if(typeof r.id!=='string'||r.id<=prev||r.country!==country||data.has(r.id))throw Error('Invalid evidence pagination');data.set(r.id,r);prev=r.id;}
  if(b.next===null)return data;
  if(!b.rows.length||b.next!==prev||b.next<=cursor)throw Error('Invalid evidence cursor');
  cursor=b.next;
 }
 throw Error('Evidence coverage limit; narrow scope');
}
const api={normalize,flags,attributes,select,chips,clear,loadEvidence};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SMCatalogFacets=api;
})(typeof window!=='undefined'?window:globalThis);
