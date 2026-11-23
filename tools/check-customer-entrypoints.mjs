#!/usr/bin/env node
// Read-only verification. Never turns unknown URLs into 200 or creates fake redirects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const page=fs.readFileSync('404.html','utf8');
const route=fs.readFileSync('workers/redirects/worker.js','utf8');
const workflow=fs.readFileSync('.github/workflows/workers.yml','utf8');
for(const label of ['id="sm-recovery"','id="sm-recovery-search"','id="sm-recovery-query"','/shop/','/global-shop/','/contact/','/privacy/'])assert.ok(page.includes(label),'Missing recovery feature '+label);
assert.match(page,/<meta name="robots" content="noindex, follow">/);
assert.match(page,/name="q"/);
assert.match(page,/location\.href='\/#\/search\?q='/);
const aliases=['privacy-policy','terms-conditions','returns-refunds','shipping-delivery','track-order','sell-with-us','rewards-program','refer-and-earn'];
for(const alias of aliases)assert.ok(workflow.includes('"sastamilaga.com/'+alias+'*"'),'Missing no-slash route '+alias);
for(const alias of ['privacy-policy','terms-conditions','returns-refunds','shipping-delivery','sell-with-us'])assert.ok(workflow.includes('"sastamilaga.com/ur/'+alias+'*"'),'Missing no-slash Urdu route '+alias);
assert.match(route,/url\.pathname\.replace\(\/\\\/\+\$\/,\s*''\)/);
console.log('PASS: 404 gives search, navigation and help; site remains noindex on missing URLs; 13 known aliases match slash and no-slash');
if(!process.argv.includes('--live'))process.exit(0);
const checks=[
  ['/privacy-policy','/privacy/'],['/privacy-policy/','/privacy/'],
  ['/terms-conditions','/terms/'],['/returns-refunds','/returns/'],
  ['/shipping-delivery','/shipping/'],['/track-order','/track/'],
  ['/ur/privacy-policy','/ur/privacy/']
];
let failed=0;
for(const [from,to] of checks){
  try{
    let response=await fetch('https://sastamilaga.com'+from,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(16000),headers:{'User-Agent':'SastaMilaga-CustomerEntryMonitor/1.0'}});
    const dest=response.headers.get('location')||'';
    const pass=response.status===301 && new URL(dest,'https://sastamilaga.com').pathname===to;
    console.log(JSON.stringify({from,status:response.status,location:dest,pass}));
    if(!pass)failed++;
  }catch(error){failed++;console.error(from,error.message)}
}
try{const response=await fetch('https://sastamilaga.com/privacy/',{signal:AbortSignal.timeout(16000)});const html=await response.text();const pass=response.status===200&&/Privacy policy/i.test(html);console.log(JSON.stringify({page:'/privacy/',status:response.status,pass}));if(!pass)failed++;}catch(error){failed++;console.error('privacy target',error.message)}
if(failed){console.error(failed+' customer entrypoints failed; inspect edge and origin routing.');process.exitCode=1;}
