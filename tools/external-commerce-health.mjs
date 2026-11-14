#!/usr/bin/env node
/**
 * Independent GitHub-runner external route probes. No customer cookies, carts,
 * transactions, credentials, POSTs, callbacks, Google indexing claims or writes.
 * Scheduled separately from Cloudflare's half-hour D1 ops guard.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const BASE='https://sastamilaga.com';
export const SAMPLES=[
 {id:'cart',path:'/cart/',accept:[200],pattern:/Cart|basket|shopping/i},
 {id:'checkout',path:'/checkout/',accept:[200,301,302,303,307,308]},
 {id:'canonical_shoe',path:'/global-shop/p/1830116277370114048/retro-square-heel-pointed-toe-ankle-boots-fashion-versatile-chelsea-boot-women-s-shoes/',accept:[200],pattern:/<link rel="canonical" href="https:\/\/sastamilaga\.com\/global-shop\/p\//},
 {id:'legacy_shoe',path:'/global/p/woman-boots/1830116277370114048/old-video-slug',accept:[301],location:'/global-shop/p/1830116277370114048/'},
 {id:'qualified_sitemap',path:'/sitemap-global-qualified.xml',accept:[200],pattern:/<sitemapindex\b/},
 {id:'guard',path:'/__ops-health.json',accept:[200],pattern:/"route_checks"\s*:/}
];
export async function probeAll(fetcher=fetch,base=BASE){
 const events=[];for(const x of SAMPLES){
  const url=base+x.path;
  let code=0,detail='',duration=0,location='',body='';const started=Date.now();
  try{
   const r=await fetcher(url,{method:'GET',redirect:'manual',headers:{accept:'text/html,application/xml,application/json','user-agent':'SastaMilaga-External-Safety-Probe/1.0'},signal:AbortSignal.timeout(14000)});
   code=r.status;location=r.headers.get('location')||'';
   if(Number(r.headers.get('content-length')||0)>300000){detail='response_size_exceeded';await r.body?.cancel();}
   else if([200].includes(code)){body=(await r.text()).slice(0,300000);}
   else await r.body?.cancel();
  }catch(e){detail=e?.name==='TimeoutError'?'timeout':'network_exception';}
  duration=Date.now()-started;
  const ok=x.accept.includes(code)&&(!x.pattern||x.pattern.test(body))&&(!x.location||location.startsWith(base+x.location)||location.startsWith(x.location));
  events.push({check:x.id,http_status:code,passed:ok,reason:detail||(!ok?'unexpected_response':''),location:x.id==='legacy_shoe'?location:undefined,duration_ms:duration});
 }
 return {created_utc:new Date().toISOString(),scope:'external_http_route_reachability_only',checks:events,passed:events.every(e=>e.passed),caveats:['HTTP 200 cart/checkout does not confirm session persistence, tax, freight, order placement or payment.','Cloudflare internal Worker fetch may fail even when an independent external probe is reachable.','This check does not query Google Search Console or Merchant Center.']};
}
const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){const result=await probeAll();fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/external-commerce-health.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;}
