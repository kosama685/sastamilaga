import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/wordpress-checkout.js',import.meta.url),'utf8');
function fixture({reject=false,timeout=false}={}){
 const storage=new Map(),calls=[],items=[];
 const window={location:{hostname:'sastamilaga.com'},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
 const fetch=async(path,options={})=>{
  const body=options.body&&JSON.parse(options.body);calls.push({path,body});
  let data=path.includes('product-ids')?{SKU:101}:path.includes('/context')?{country:'PK',csrf:'csrf'}:{items:[...items],items_count:items.length};
  if(path.endsWith('/add-item')||path.endsWith('/live/cart')){
   if(timeout)throw Error('Network timeout');
   if(reject)return {ok:false,status:400,json:async()=>({message:'Select a required option'})};
   items.push({id:body.id||body.pid,quantity:body.quantity});data={items:[...items],items_count:items.length,added:true};
  }
  return {ok:true,status:200,json:async()=>data,headers:{get:()=> 'nonce'}};
 };
 vm.runInNewContext(source,{window,fetch,AbortSignal});
 return {api:window.SMWordPressCheckout,calls,items};
}
const local={type:'local',id:'id',sku:'SKU',qty:3,attributes:[{attribute:'pa_size',value:'M'}]};
test('native WooCommerce receives exact product, variation and quantity; repeat handoff does not add twice',async()=>{
 const {api,calls}=fixture();const result=await api.handoff([local],'PK');
 assert.equal(result.checkout,'/checkout/');
 const add=calls.find(x=>x.path.endsWith('/add-item'));
 assert.equal(add.body.id,101);assert.equal(add.body.quantity,3);assert.equal(add.body.variation[0].value,'M');
 await api.handoff([local],'PK');assert.equal(calls.filter(x=>x.path.endsWith('/add-item')).length,1);
});
test('CJ handoff preserves exact supplier variant',async()=>{
 const {api,calls}=fixture();await api.handoff([{type:'cj',id:'PID',vkey:'VID',qty:2}],'PK');
 const add=calls.find(x=>x.path.endsWith('/live/cart'));assert.equal(add.body.vid,'VID');assert.equal(add.body.quantity,2);
});
test('unmapped product cannot silently be omitted',async()=>{
 const {api,calls}=fixture();await assert.rejects(api.handoff([{...local,sku:'missing'}],'PK'),/No WordPress product mapping/);
 assert.equal(calls.some(x=>x.path.endsWith('/add-item')),false);
});
test('known Woo rejection remains an error, never a checkout success',async()=>{
 await assert.rejects(fixture({reject:true}).api.handoff([local],'PK'),/required option/);
});
test('changed selection after successful transfer requires cart review',async()=>{
 const {api}=fixture();await api.handoff([local],'PK');
 await assert.rejects(api.handoff([{...local,qty:4}],'PK'),/selection changed/);
});
test('uncertain add is not blindly repeated while the WordPress cart contains items',async()=>{
 const {api,items,calls}=fixture({timeout:true});
 await assert.rejects(api.handoff([local],'PK'),/timeout/);items.push({id:101});
 await assert.rejects(api.handoff([local],'PK'),/interrupted/);
 assert.equal(calls.filter(x=>x.path.endsWith('/add-item')).length,1);
});
