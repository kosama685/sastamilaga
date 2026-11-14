import {test} from 'node:test';import assert from 'node:assert/strict';import {probeAll,BASE} from './external-commerce-health.mjs';
function mock(statuses={}){return async url=>{const u=new URL(url),k=u.pathname;let status=statuses[k]||200,body='<html><title>Cart</title><link rel="canonical" href="'+BASE+'/global-shop/p/"></html>',location='';
if(k==='/checkout/')status=302;
if(k.startsWith('/global/p/')){status=301;location=BASE+'/global-shop/p/1830116277370114048/retro-square-heel/'}
if(k==='/sitemap-global-qualified.xml')body='<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></sitemapindex>';
if(k==='/__ops-health.json')body='{"route_checks":{"cart_http":0}}';
return new Response(status===200?body:null,{status,headers:{'content-type':'text/html','location':location}})}}
test('external routes pass with legal checkout redirect and no purchase',async()=>{const v=await probeAll(mock());assert.equal(v.passed,true);assert.equal(v.checks.length,6);assert.equal(v.checks[1].http_status,302);assert.match(v.caveats.join(' '),/does not confirm session persistence/);});
test('cart outage fails workflow even if internal guard says reachable',async()=>{const v=await probeAll(mock({'/cart/':503}));assert.equal(v.passed,false);assert.equal(v.checks[0].http_status,503);});
test('legacy redirect must target D1 canonical path',async()=>{const f=async url=>{const r=await mock()(url);if(url.includes('/global/p/'))return new Response(null,{status:301,headers:{location:BASE+'/unrelated/'}});return r;};const v=await probeAll(f);assert.equal(v.passed,false);assert.equal(v.checks.find(x=>x.check==='legacy_shoe').passed,false)});
