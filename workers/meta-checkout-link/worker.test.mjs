import test from 'node:test';
import assert from 'node:assert/strict';
import handler from './worker.mjs';

function service(status=302) {
  const calls=[];
  return { calls, env:{PRIMARY:{async fetch(req){
    calls.push(req);
    return new Response(null,{status,headers:{Location:'/checkout/?session=example','Set-Cookie':'woocommerce_session=example; Path=/; HttpOnly','Cache-Control':'public, max-age=100'}});
  }}} };
}

test('two Sabawoon units and optional coupon reach WooCommerce unmodified',async()=>{
  const x=service();
  const url='https://sastamilaga.com/checkout-link/?products=10030%3A2&coupon=TEST10&fbclid=fb-demo&utm_source=facebook';
  const resp=await handler.fetch(new Request(url,{headers:{Cookie:'wp_woocommerce_session_demo=local'}}),x.env);
  assert.equal(x.calls.length,1);
  assert.equal(x.calls[0].url,url);
  assert.equal(x.calls[0].headers.get('cookie'),'wp_woocommerce_session_demo=local');
  assert.equal(x.calls[0].redirect,'manual');
  assert.equal(resp.status,302);
  assert.equal(resp.headers.get('location'),'/checkout/?session=example');
  assert.match(resp.headers.get('set-cookie'),/woocommerce_session=example/);
  assert.match(resp.headers.get('cache-control'),/no-store/);
});

test('multiple products, quantities and coupons are forwarded without silent truncation',async()=>{
  const x=service();
  const resp=await handler.fetch(new Request('https://sastamilaga.com/checkout-link/?products=10030:2,10031:1&coupon=SAVE10'),x.env);
  assert.equal(resp.status,302);
  assert.equal(x.calls.length,1);
  assert.equal(new URL(x.calls[0].url).searchParams.get('products'),'10030:2,10031:1');
});

test('sku= syntax is forwarded as accepted by WooCommerce native checkout-link',async()=>{
  const x=service();
  const resp=await handler.fetch(new Request('https://sastamilaga.com/checkout-link/?products=hhc-3759842:2'),x.env);
  assert.equal(resp.status,302);
  assert.equal(x.calls.length,1);
});

test('no products and invalid quantities fail closed without creating a session',async()=>{
  for(const q of ['', '?products=10030:0', '?products=10030:100', '?products=10030:2,10030:3', '?products=10030:two','?products=10030:1&products=10030:2']) {
    const x=service();
    const res=await handler.fetch(new Request('https://sastamilaga.com/checkout-link/'+q),x.env);
    assert.equal(res.status,400, q);
    assert.equal(x.calls.length,0,q);
    assert.match(res.headers.get('cache-control'),/no-store/);
  }
});

test('non checkout requests and unsafe methods do not touch WooCommerce',async()=>{
  const x=service();
  for(const [url,method,status] of [
    ['https://sastamilaga.com/checkout-link-experimental','GET',404],
    ['https://sastamilaga.com/checkout-link/','POST',405],
    ['https://evil.example/checkout-link/','GET',404],
  ]) {
    const r=await handler.fetch(new Request(url,{method}),x.env);
    assert.equal(r.status,status);
  }
  assert.equal(x.calls.length,0);
});

test('downstream failure never falls back to a static empty cart',async()=>{
 const r=await handler.fetch(new Request('https://sastamilaga.com/checkout-link/?products=10030:2'),
 {PRIMARY:{async fetch(){throw Error('origin down');}}});
 assert.equal(r.status,502);
 assert.match(await r.text(),/temporarily unavailable/);
});

test('HEAD is nonmutating and passed to WooCommerce for health checks',async()=>{
 const x=service(200);
 const resp=await handler.fetch(new Request('https://sastamilaga.com/checkout-link/',{method:'HEAD'}),x.env);
 assert.equal(resp.status,200);
 assert.equal(x.calls[0].method,'HEAD');
 assert.match(resp.headers.get('cache-control'),/no-store/);
});
