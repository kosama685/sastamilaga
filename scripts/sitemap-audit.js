#!/usr/bin/env node
/**
 * Public sitemap audit: no data mutations, no crawler impersonation claims.
 * Node 22 + saxes@6.0.0. Test from an independent CI runner, not origin fetch.
 * --out reports/sitemaps/live-verification-YYYY-MM-DD.json
 * --site https://sastamilaga.com
 */
import fs from 'node:fs';
import path from 'node:path';
import { SaxesParser } from 'saxes';

const args=process.argv.slice(2);
const opt=(flag,fallback)=>{const i=args.indexOf(flag);return i>=0?args[i+1]:fallback};
const SITE=new URL(opt('--site','https://sastamilaga.com'));
const DAY=new Date().toISOString().slice(0,10);
const REPORT=opt('--out',`reports/sitemaps/live-verification-${DAY}.json`);
const MAX_CHILDREN=250, MAX_URLS=50000, MAX_BYTES=50*1024*1024;
const ROOTS=['/sitemap.xml','/sitemap_index.xml','/sitemap-global-qualified.xml'];
const USER_AGENT='Mozilla/5.0 (compatible; SastaSitemapIntegrity/1.0; +https://sastamilaga.com/)';
const googUA='Googlebot/2.1 (+http://www.google.com/bot.html)';
const all=new Map(), errors=[], sitemapUrls=new Set(), duplicateCounts=new Map();
const expectedHost=SITE.hostname;

async function retrieve(url,agent=USER_AGENT){
  const u=new URL(url,SITE);
  if(u.hostname!==expectedHost||u.protocol!=='https:')throw Error('external URL refused');
  let response=await fetch(u,{headers:{'User-Agent':agent,Accept:'application/xml,text/xml,text/html;q=0.9,*/*;q=0.8'},redirect:'follow',signal:AbortSignal.timeout(20000)});
  if(new URL(response.url).hostname!==expectedHost)throw Error('offsite redirect');
  const sizeHeader=Number(response.headers.get('content-length')||0);
  if(sizeHeader>MAX_BYTES)throw Error('excessive Content-Length');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>MAX_BYTES)throw Error('sitemap exceeds 50 MB');
  return {status:response.status,contentType:response.headers.get('content-type')||'',bytes:bytes.length,text:bytes.toString('utf8'),url:response.url};
}
function parseXML(xml){
  const parser=new SaxesParser({xmlns:true});
  const state={root:null,locs:[],error:null,depth:0,capturing:false,loc:''};
  parser.on('opentag',node=>{
    state.depth++;
    if(state.depth===1)state.root=node.local;
    if(node.local==='loc'&&state.depth===3){state.capturing=true;state.loc=''}
  });
  parser.on('text',s=>{if(state.capturing)state.loc+=s});
  parser.on('cdata',s=>{if(state.capturing)state.loc+=s});
  parser.on('closetag',node=>{
    if(node.local==='loc'&&state.capturing){state.locs.push(state.loc.trim());state.capturing=false}
    state.depth--;
  });
  parser.on('error',e=>{state.error=String(e.message)});
  try{parser.write(xml).close()}catch(e){state.error=String(e.message)}
  if(state.error)throw Error('XML invalid: '+state.error);
  if(!['sitemapindex','urlset'].includes(state.root))throw Error('not sitemap XML: '+state.root);
  if(state.locs.length>MAX_URLS)throw Error('exceeds 50,000 URL entries');
  return state;
}
async function visit(url,depth=0){
  const absolute=new URL(url,SITE).href;
  if(all.has(absolute))return;
  if(all.size>=MAX_CHILDREN||depth>5){errors.push({url:absolute,error:'child limit/depth exceeded'});return}
  const row={url:absolute,depth,status:null,contentType:null,bytes:null,root:null,locs:0,sample:[]};
  all.set(absolute,row);
  try{
    const r=await retrieve(absolute);
    Object.assign(row,{status:r.status,contentType:r.contentType,bytes:r.bytes});
    if(r.status!==200)throw Error('HTTP '+r.status);
    if(!/\b(xml|text\/plain)\b/i.test(r.contentType))throw Error('non-XML content-type: '+r.contentType);
    const x=parseXML(r.text);
    row.root=x.root;row.locs=x.locs.length;
    if(x.root==='sitemapindex'){
      for(const loc of x.locs){
        const u=new URL(loc);
        if(u.protocol!=='https:'||u.hostname!==expectedHost)throw Error('off-domain child '+loc);
        await visit(u.href,depth+1);
      }
    }else{
      for(const loc of x.locs){
        const u=new URL(loc);
        if(u.protocol!=='https:'||u.hostname!==expectedHost)throw Error('off-domain product '+loc);
        duplicateCounts.set(u.href,(duplicateCounts.get(u.href)||0)+1);
        sitemapUrls.add(u.href);
      }
      // Deterministic first, median and last; larger audits need sampling stratified by type.
      const indices=[...new Set([0,Math.floor(x.locs.length/2),x.locs.length-1])].filter(i=>i>=0);
      row.sample=indices.map(i=>x.locs[i]);
    }
  }catch(e){row.error=String(e.message||e);errors.push({url:absolute,error:row.error,status:row.status})}
}
async function verifyDestination(url){
  const check={url,http:null,canonical:null,robots:null,ok:false};
  try{
    const r=await retrieve(url);
    check.http=r.status;
    if(!/text\/html/i.test(r.contentType))throw Error('not HTML');
    check.canonical=r.text.match(/<link\s+[^>]*rel=['"]canonical['"][^>]*href=['"]([^'"]+)/i)?.[1]||null;
    check.robots=r.text.match(/<meta\s+[^>]*name=['"]robots['"][^>]*content=['"]([^'"]+)/i)?.[1]||'';
    check.ok=r.status===200&&check.canonical===url&&!/noindex/i.test(check.robots);
    if(!check.ok)throw Error('HTTP/canonical/noindex failed');
  }catch(e){check.error=String(e.message||e);errors.push({url,error:check.error,status:check.http})}
  return check;
}
await Promise.all(ROOTS.map(u=>visit(u)));
const childRows=[...all.values()].filter(x=>x.root==='urlset');
const targets=[...new Set(childRows.flatMap(x=>x.sample))];
const destination=[];
for(let i=0;i<targets.length;i+=5)destination.push(...await Promise.all(targets.slice(i,i+5).map(verifyDestination)));
let robots;
try{
  const r=await retrieve('/robots.txt');
  robots={status:r.status,valid:r.status===200&&r.text.includes('User-agent:'),sitemapDeclared:/Sitemap:\s*https:\/\/sastamilaga\.com\/sitemap\.xml/i.test(r.text)};
  if(!robots.valid)errors.push({url:SITE.href+'robots.txt',error:'invalid robots.txt'});
}catch(e){robots={error:String(e)};errors.push({url:SITE.href+'robots.txt',error:String(e)})}
const head=[];
for(const p of ['/sitemap.xml','/sitemap_index.xml','/sitemap-global-qualified.xml']){
  try{
    const r=await fetch(new URL(p,SITE),{method:'HEAD',headers:{'User-Agent':googUA},redirect:'follow',signal:AbortSignal.timeout(15000)});
    head.push({path:p,status:r.status,contentType:r.headers.get('content-type'),userAgent:'Googlebot UA only, NOT verified crawler identity'});
    if(r.status!==200)errors.push({url:p,error:'simulated Googlebot UA HEAD '+r.status});
  }catch(e){head.push({path:p,error:String(e)});errors.push({url:p,error:String(e)})}
}
const duplicates=[...duplicateCounts].filter(([,n])=>n>1).map(([url,count])=>({url,count}));
const report={generatedAt:new Date().toISOString(),source:'Independent GitHub runner',note:'UA string does not prove authentic Googlebot identity; only authenticated Search Console or Cloudflare verified bot logs can do that',roots:ROOTS,sitemapChecks:[...all.values()],count:{sitemapFiles:all.size,uniqueURLs:sitemapUrls.size,duplicateURLs:duplicates.length,failedChecks:errors.length,sampledPages:destination.length,passingSampledPages:destination.filter(x=>x.ok).length},duplicates:duplicates.slice(0,100),destination,robots,googlebotUaHeads:head,errors};
fs.mkdirSync(path.dirname(REPORT),{recursive:true});
fs.writeFileSync(REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.count));
if(errors.length)process.exitCode=1;
