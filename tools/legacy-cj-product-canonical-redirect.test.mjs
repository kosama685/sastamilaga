import {test} from 'node:test';import assert from 'node:assert/strict';import app from './legacy-cj-product-canonical-redirect.mjs';
const base='https://sastamilaga.com';
const e={DB:{prepare(sql){assert.match(sql,/FROM catalog_products_cj/);return {bind(id){return {async first(){if(id==='1830116277370114048')return {cj_product_id:id,name:"Retro Square Heel Pointed Toe Ankle Boots Fashion Versatile Chelsea Boot Women's Shoes"};if(id==='C7D71805-6E93-45E7-87BB-81BEC63E129E')return {cj_product_id:id,name:'Mesh breathable student sneakers thick soles hidden heel shoes'};return null;}}}}}}};
test('numeric legacy video URL migrates to accurate D1 canonical with no player',async()=>{const r=await app.fetch(new Request(base+'/global/p/woman-boots/1830116277370114048/retro-square-heel/'),e);assert.equal(r.status,301);assert.equal(r.headers.get('location'),base+'/global-shop/p/1830116277370114048/retro-square-heel-pointed-toe-ankle-boots-fashion-versatile-chelsea-boot-women-s-shoes/');});
test('UUID legacy video URL migrates',async()=>{const r=await app.fetch(new Request(base+'/global/p/woman-boots/C7D71805-6E93-45E7-87BB-81BEC63E129E/'),e);assert.equal(r.status,301);assert.match(r.headers.get('location'),/global-shop\/p\/C7D71805-6E93-45E7-87BB-81BEC63E129E/);});
test('unknown items cannot return fake product 200',async()=>{const r=await app.fetch(new Request(base+'/global/p/shoes/1111111111111111111/fake'),e);assert.equal(r.status,404);assert.equal(r.headers.get('x-robots-tag'),'noindex,follow');});
test('checkout and invalid paths are not handled',async()=>{for(const p of ['/cart/','/checkout/','/global/p/woman-boots/invalid-id/foo'])assert.equal((await app.fetch(new Request(base+p),e)).status,404)});
test('D1 and static snapshot outage both fail closed, never a fake 200',async()=>{
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>{throw new Error('Test deliberately simulates a snapshot origin outage')};
 try{
  const r=await app.fetch(new Request(base+'/global/p/woman-boots/1830116277370114048/'),{});
  assert.equal(r.status,503);
  assert.match(r.headers.get('x-robots-tag')||'','noindex');
 }finally{globalThis.fetch=oldFetch}
});


test('D1 daily-limit failure uses real static catalog for legacy redirect, not a blank 200',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({snapshot:'2026-11-05',items:{'1830116277370114048':['SKU',"Retro Square Heel Pointed Toe Ankle Boots Fashion Versatile Chelsea Boot Women's Shoes",'Woman Boots','woman-boots','https://cf.cjdropshipping.com/image.jpg']}}),{status:200});
 try{
  const fake={DB:{prepare(){throw Error('D1 row read budget')}}};
  const r=await app.fetch(new Request(base+'/global/p/woman-boots/1830116277370114048/broken-video'),fake);
  assert.equal(r.status,301);assert.match(r.headers.get('location'),/global-shop\/p\/1830116277370114048\//);
 }finally{globalThis.fetch=old}
});
