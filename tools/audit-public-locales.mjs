#!/usr/bin/env node
/**
 * Public locale-route evidence. A currency/language dropdown is not proof that
 * an HTML locale exists. Read-only GET requests, never create hreflang for absent pages.
 */
import fs from 'node:fs';
import path from 'node:path';
const BASE='https://sastamilaga.com';
const routes=['/','/faq/','/shipping/','/ur/','/ur/faq/','/ur/shipping/','/ar/'];
const rows=[];
for(const route of routes){
 const result={path:route,http:null,lang:null,canonical:null,hreflang:[],robots:null,validHTML:false};
 try{
  const r=await fetch(BASE+route,{headers:{'User-Agent':'SastaLocaleReadiness/1.0'},redirect:'follow',signal:AbortSignal.timeout(16000)});
  result.http=r.status;result.finalURL=r.url;result.contentType=r.headers.get('content-type')||'';
  const html=await r.text();
  result.lang=html.match(/<html\b[^>]*\blang=["']([^"']+)/i)?.[1]||null;
  result.canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||null;
  result.robots=html.match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)/i)?.[1]||null;
  result.hreflang=[...html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)/gi)].map(m=>m[1]);
  result.validHTML=r.status===200&&/text\/html/i.test(result.contentType)&&/<html\b/i.test(html);
  result.selfCanonical=result.canonical===(BASE+route);
  result.indexCandidate=result.validHTML&&result.selfCanonical&&!/noindex/i.test(result.robots||'');
 }catch(e){result.error=String(e.message||e)}
 rows.push(result);
}
const report={checkedAt:new Date().toISOString(),checked:rows.length,source:'Public HTTP fetch, not authenticated Googlebot',criticalExpectation:'Do not promote unsupported /ar/ or noncanonical /ur/ homepage; real /ur/ help pages may exist',routes:rows,
observedSupportedLocales:rows.filter(x=>x.indexCandidate).map(x=>x.path)};
const dir='artifacts/market-readiness';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'public-locale-routes.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checked:rows.length,results:rows.map(x=>({p:x.path,http:x.http,index:x.indexCandidate,lang:x.lang}))}));
