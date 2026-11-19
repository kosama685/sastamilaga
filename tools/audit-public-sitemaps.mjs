#!/usr/bin/env node
/** Read-only crawlability audit for canonical XML sitemaps.
 * GET both ordinary and simulated Googlebot user agents. A user-agent string alone does not prove verified Googlebot identity. Never bypass a challenge
 * or alter the site, sitemap submissions, robots, products or offers.
 * node tools/audit-public-sitemaps.mjs --out reports/sitemaps/live-audit.json
 */
import fs from 'node:fs';
import path from 'node:path';
const SITE='https://sastamilaga.com';
const outArg=process.argv.indexOf('--out');
const outfile=outArg>=0?process.argv[outArg+1]:null;
const userAgents={
 browser:'Mozilla/5.0 (compatible; SastaSitemapAudit/1.0)',
 googlebot:'Googlebot/2.1 (+http://www.google.com/bot.html)'
};
const START=['/robots.txt','/sitemap.xml','/sitemap_index.xml','/sitemap-global-qualified.xml'];
const TIMEOUT=15000,MAX_BYTES=50*1024*1024,MAX_CHILDREN=120;
async function fetchOne(p,ua){
 let response,body='';
 const url=new URL(p,SITE).href;
 try{
  response=await fetch(url,{headers:{'user-agent':ua,'accept':'application/xml,text/xml,text/plain;q=0.9,*/*;q=0.1'},redirect:'follow',signal:AbortSignal.timeout(TIMEOUT)});
  const n=Number(response.headers.get('content-length')||0);
  if(n>MAX_BYTES)throw Error('exceeds_sitemap_size_limit');
  body=await response.text();
  if(Buffer.byteLength(body)>MAX_BYTES)throw Error('body_too_large');
  const isRobots=p==='/robots.txt';
  const xml=isRobots?null:(body.match(/<sitemapindex\b|<urlset\b/)?.[0]||null);
  const locs=[...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map(m=>m[1].replace(/&amp;/g,'&'));
  const offsite=locs.filter(x=>{try{return new URL(x).origin!==SITE}catch{return true}}).length;
  return {path:p,userAgent:ua===userAgents.googlebot?'googlebot-ua-simulation':'browser',http:response.status,finalUrl:response.url,contentType:response.headers.get('content-type'),bytes:Buffer.byteLength(body),root:xml,urls:xml==='<urlset'?locs.length:0,children:xml==='<sitemapindex'?locs.length:0,offsite,valid:response.ok&&(isRobots?body.includes('User-agent:'):!!xml)&&offsite===0&&locs.length<=50000,childPaths:xml==='<sitemapindex'?locs.map(u=>new URL(u).pathname):[],error:null};
 }catch(e){return {path:p,userAgent:ua===userAgents.googlebot?'googlebot-ua-simulation':'browser',valid:false,http:response?.status||null,error:String(e?.message||e).slice(0,200),childPaths:[]}}
}
const result=[];
for(const [label,ua] of Object.entries(userAgents)){
 const base=[];
 for(const p of START)base.push(await fetchOne(p,ua));
 result.push(...base);
 const children=[...new Set(base.filter(x=>x.valid).flatMap(x=>x.childPaths))].slice(0,MAX_CHILDREN);
 for(const p of children)result.push(await fetchOne(p,ua));
}
const report={checkedAt:new Date().toISOString(),origin:SITE,checks:result.length,failures:result.filter(x=>!x.valid),results:result.map(({childPaths,...rest})=>rest)};
if(outfile){fs.mkdirSync(path.dirname(outfile),{recursive:true});fs.writeFileSync(outfile,JSON.stringify(report,null,2)+'\n')}
const summary={checks:report.checks,failed:report.failures.length,failures:report.failures.map(x=>({path:x.path,ua:x.userAgent,http:x.http,error:x.error}))};
console.log(JSON.stringify(summary,null,2));
if(report.failures.length)process.exitCode=1;
