#!/usr/bin/env node
/** Read-only publisher-side Google Ads destination and Search sitemap checks.
 *  Cannot establish Google Ads approval, live shipping or Google indexing.
 */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), host='https://sastamilaga.com';
const routes=JSON.parse(fs.readFileSync('data/landing/routes.json','utf8')).routes;
const xml=fs.readFileSync('sitemap-landing.xml','utf8'), main=fs.readFileSync('sitemap.xml','utf8');
const locs=new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&')));
const published=routes.filter(r=>r.indexable), errors=[], checks=[];
const read=(h,re)=>(h.match(re)||[])[1]||'';
const assert=(ok,msg)=>{if(!ok)errors.push(msg)};
assert(main.includes(host+'/sitemap-landing.xml'),'Root sitemap index omits sitemap-landing.xml');
assert(routes.length===12,'Expected 12 current market/hub landing routes; got '+routes.length);
assert(locs.size===published.length,'Sitemap cardinality differs from indexable routes');
for(const u of locs)assert(u.startsWith(host+'/'),'Foreign URL in landing sitemap: '+u);
for(const r of routes){
 const url=host+'/'+r.rel+'/',file=path.join(root,r.rel,'index.html');
 if(!fs.existsSync(file)){errors.push('Missing HTML: '+r.rel);continue}
 const h=fs.readFileSync(file,'utf8');
 const title=read(h,/<title>([\s\S]*?)<\/title>/i);
 const desc=read(h,/<meta name="description" content="([^"]+)"/i);
 const canonical=read(h,/<link rel="canonical" href="([^"]+)"/i);
 const robots=read(h,/<meta name="robots" content="([^"]+)"/i);
 const lang=read(h,/<html lang="([^"]+)"/i);
 const placeholders=/\{(?:to|label|loc|region|то|лабел|лоц|регион)\}/i;
 assert(canonical===url,'Canonical mismatch: '+r.rel);
 assert(lang===r.lang,'Language mismatch: '+r.rel);
 assert(title.length>12,'Missing/short title: '+r.rel);
 assert(desc.length>45,'Missing/short description: '+r.rel);
 assert(!placeholders.test(h),'Unresolved translation placeholder: '+r.rel);
 assert((h.match(/<h1\b/gi)||[]).length===1,'H1 count not 1: '+r.rel);
 assert(h.includes('sm-chrome-footer')&&h.includes('chrome.js'),'Footer runtime missing: '+r.rel);
 if(r.indexable){
  assert(!/\bnoindex\b/i.test(robots)&&/\bindex\b/i.test(robots),'Robots noindex: '+r.rel);
  assert(locs.has(url),'Indexable page absent from sitemap: '+r.rel);
 }else{
  assert(/\bnoindex\b/i.test(robots),'Disabled page not noindex: '+r.rel);
  assert(!locs.has(url),'Disabled page in sitemap: '+r.rel);
 }
 checks.push({url,lang:r.lang,indexable:r.indexable,title,canonicalOk:canonical===url});
}
for(const u of locs)assert(published.some(r=>r.url===u),'Unknown sitemap URL: '+u);
async function probe(url){
 let error='unknown';
 for(let n=0;n<2;n++){
  try{
   const r=await fetch(url,{redirect:'follow',headers:{'user-agent':'SastaMilaga-LandingReadiness/1.0'},signal:AbortSignal.timeout(16000)});
   if(r.status===200)return {status:r.status,url:r.url,headers:r.headers,html:await r.text()};
   error='HTTP '+r.status;await r.body?.cancel();
  }catch(e){error=String(e?.name||e)}
 }
 return {error};
}
if(process.argv.includes('--live')){
 for(const r of published){
  const x=await probe(r.url);
  if(x.status!==200){errors.push('Live HTTP check failed: '+r.url+' '+x.error);continue}
  assert(x.url===r.url,'Live redirect: '+r.url+' -> '+x.url);
  assert(!/\bnoindex\b/i.test(x.headers.get('x-robots-tag')||''),'Live X-Robots noindex: '+r.url);
  assert(read(x.html,/<link rel="canonical" href="([^"]+)"/i)===r.url,'Live canonical mismatch: '+r.url);
  assert(!/\{(?:to|label|loc|region|то|лабел|лоц|регион)\}/i.test(x.html),'Live placeholder: '+r.url);
 }
}
const warnings=['Search indexing and Google Ads approval are external and cannot be inferred from a passing check.','Merchant identity/misrepresentation review and verified market payment, shipping and translated content need independent approval.'];
const report={testedAt:new Date().toISOString(),mode:process.argv.includes('--live')?'live':'static',routes:routes.length,indexable:published.length,sitemapUrls:locs.size,checks,errors,warnings};
fs.mkdirSync('reports',{recursive:true});
fs.writeFileSync('reports/paid-landing-readiness.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({mode:report.mode,routes:report.routes,indexable:report.indexable,sitemapUrls:report.sitemapUrls,errors,warnings}));
if(errors.length)process.exitCode=1;
