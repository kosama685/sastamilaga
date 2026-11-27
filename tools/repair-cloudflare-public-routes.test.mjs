import test from 'node:test';
import assert from 'node:assert/strict';
import {isSafePublicRoute, publicFailClosed} from './repair-cloudflare-public-routes.mjs';
const route=(pattern,flag=false)=>({id:'a'.repeat(32),script:'sasta-redirects',pattern,request_limit_fail_open:flag});
test('public shop/catalog/media routes are fail-open candidates',()=>{
 for(const p of ['sastamilaga.com/shop/*','sastamilaga.com/p/*','sastamilaga.com/product/*','sastamilaga.com/global-shop/p/*','sastamilaga.com/blog/*','sastamilaga.com/robots.txt','sastamilaga.com/feeds/global/*'])
  assert.equal(isSafePublicRoute(route(p)),true,p);
 assert.equal(publicFailClosed([route('sastamilaga.com/shop/*'),route('sastamilaga.com/blog/*',true)]).length,1);
});
test('account, checkout, OAuth, API and operational routes are always excluded',()=>{
 for(const p of ['sastamilaga.com/api/cj/*','sastamilaga.com/smcs-oauth/*','sastamilaga.com/account/*','sastamilaga.com/__ops-health.json','sastamilaga.com/__cj-preview/*','sastamilaga.com/cart/','sastamilaga.com/checkout/','sastamilaga.com/wp-login.php','sastamilaga.com/payment/*','sastamilaga.com/webhook/*'])
  assert.equal(isSafePublicRoute(route(p)),false,p);
 assert.equal(isSafePublicRoute(route('other-site.com/shop/*')),false);
 assert.equal(isSafePublicRoute({...route('sastamilaga.com/shop/*'),id:'bad'}),false);
});
