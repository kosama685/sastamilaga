import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync(new URL('../staging/hosted-commerce/adapter.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../staging/hosted-commerce/index.html',import.meta.url),'utf8');
function client(responses){
 const values=new Map([
  ['sm_cart','[{"sku":"LOCAL-1","qty":2}]'],
  ['sm_gcart','[{"sku":"CJ-1","qty":1}]'],
  ['sm_order_cart_v1','[{"id":"request","qty":3}]']
 ]);
 let calls=[];
 let g={localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},
   fetch:(url,opts)=>{calls.push({url,opts});return Promise.resolve((responses||[]).shift()||{ok:true,status:200,json:async()=>({data:{cart:null}})})}};
 vm.runInNewContext(js,{window:g,URL,Promise,Number,String,Error,Array,JSON,RegExp});
 return{api:g.SMHostedCommerce,values,calls};
}
const reply=data=>({ok:true,status:200,json:async()=>({data})});
const variant='gid://shopify/ProductVariant/123456789';
const config={shopDomain:'test-shop.myshopify.com',storefrontPublicToken:'abcdefghijklmnopqr',apiVersion:'2026-10'};
function cart(id='gid://shopify/Cart/abc?key=123',amount='150.00'){
 return{id,checkoutUrl:'https://test-shop.myshopify.com/cart/c/abc?key=123',totalQuantity:2,
 lines:{nodes:[{id:'gid://shopify/CartLine/abc',quantity:2,merchandise:{id:variant,title:'Blue / M',product:{title:'Test Product'}}}]},
 cost:{totalAmount:{amount,currencyCode:'PKR'}}};
}
test('unconfigured storefront fails closed and never contacts WordPress',async()=>{
 const {api,calls}=client();
 await assert.rejects(api.add(variant,1),/configured/);
 assert.equal(calls.length,0);
 assert.equal(api.status().configured,false);
});
test('create exact mapped variation and use provider confirmation',async()=>{
 const {api,values,calls}=client([reply({cartCreate:{cart:cart(),userErrors:[]}})]);
 api.configure(config);
 const r=await api.add(variant,2);
 assert.equal(r.ok,true);
 assert.equal(r.quantity,2);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://test-shop.myshopify.com/api/2026-10/graphql.json');
 assert.deepEqual(JSON.parse(calls[0].opts.body).variables.lines,[{merchandiseId:variant,quantity:2}]);
 assert.equal(values.get('sm_cart'),'[{"sku":"LOCAL-1","qty":2}]');
 assert.equal(values.get('sm_gcart'),'[{"sku":"CJ-1","qty":1}]');
 assert.equal(values.get('sm_order_cart_v1'),'[{"id":"request","qty":3}]');
 assert.equal(values.get('sm_hosted_cart_preview_v1'),cart().id);
});
test('provider cart persistence and official checkout URL',async()=>{
 const {api,values}=client([reply({cart:{...cart(),totalQuantity:2}}),reply({cart:{...cart(),totalQuantity:2}})]);
 api.configure(config);values.set('sm_hosted_cart_preview_v1',cart().id);
 let c=await api.read();
 assert.equal(c.cart.lines.nodes[0].merchandise.title,'Blue / M');
 assert.equal(await api.checkout(),'https://test-shop.myshopify.com/cart/c/abc?key=123');
});
test('cart errors do not claim success or overwrite legacy cart',async()=>{
 const {api,values}=client([reply({cartCreate:{cart:null,userErrors:[{message:'Unavailable inventory'}]}})]);
 api.configure(config);
 await assert.rejects(api.add(variant,1),/Unavailable inventory/);
 assert.equal(values.has('sm_hosted_cart_preview_v1'),false);
 assert.ok(values.has('sm_cart'));
});
test('reject missing variant, quantity outside limits, and unsafe checkout domain',async()=>{
 const {api,values}=client([reply({cart:{...cart(),checkoutUrl:'https://example.com/payment'}})]);
 api.configure(config);
 await assert.rejects(api.add('wrong',1),/reviewed product variation/);
 await assert.rejects(api.add(variant,0),/reviewed product variation/);
 values.set('sm_hosted_cart_preview_v1',cart().id);
 await assert.rejects(api.checkout(),/did not match/);
});
test('repeat click while provider call is outstanding fails safely',async()=>{
 let release;
 const wait=new Promise(resolve=>{release=resolve});
 const {api,calls}=client();
 api.configure(config);
 const g=await (async()=>{
  // Replace the initial mocked fetch with a deferred request by re-evaluating a fresh client.
  const vals=new Map();
  let count=0;
  const g={localStorage:{getItem:k=>vals.get(k)||null,setItem:(k,v)=>vals.set(k,v),removeItem:k=>vals.delete(k)},
    fetch:()=>{count++;return wait}};
  vm.runInNewContext(js,{window:g,URL,Promise,Number,String,Error,Array,JSON,RegExp});
  g.SMHostedCommerce.configure(config);
  return{api:g.SMHostedCommerce,count:()=>count};
 })();
 const first=g.api.add(variant,1);
 await Promise.resolve();await Promise.resolve();
 await assert.rejects(g.api.add(variant,1),/previous cart action is still processing/);
 release(reply({cartCreate:{cart:cart(),userErrors:[]}}));
 assert.equal((await first).ok,true);
 assert.equal(g.count(),1);
});
test('staging page cannot access real payments, accounts or legacy carts',()=>{
 assert.match(html,/noindex,nofollow,noarchive/);
 assert.match(html,/Not connected to production checkout/);
 assert.doesNotMatch(js,/paypal.*secret|adminApiToken|localStorage\.clear\(/i);
 const ui=fs.readFileSync(new URL('../staging/hosted-commerce/staging-ui.js',import.meta.url),'utf8');
 assert.match(ui,/Cart confirmed; Quick Buy checkout requires explicit sandbox pilot approval/);
 assert.doesNotMatch(ui,/wp-json|woocommerce|formspree/i);
});

test('reject malicious provider checkout redirect before accepting a new cart',async()=>{
 const {api,values}=client([reply({cartCreate:{cart:{...cart(),checkoutUrl:'https://evil.example/cart/c/abc'},userErrors:[]}})]);
 api.configure(config);
 await assert.rejects(api.add(variant,1),/did not match/);
 assert.equal(values.has('sm_hosted_cart_preview_v1'),false);
});
test('reject insecure or credential-bearing checkout URL returned on cart read',async()=>{
 const {api,values}=client([
  reply({cart:{...cart(),checkoutUrl:'http://test-shop.myshopify.com/cart/c/abc'}}),
  reply({cart:{...cart(),checkoutUrl:'https://user:pass@test-shop.myshopify.com/cart/c/abc'}})
 ]);
 api.configure(config);values.set('sm_hosted_cart_preview_v1',cart().id);
 await assert.rejects(api.read(),/did not match/);
 await assert.rejects(api.read(),/did not match/);
});
