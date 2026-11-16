#!/usr/bin/env node
/**
 * Read-only GSC 403 audit. Historical URLs come from the owner's export.
 * Never GET action URLs (add-to-cart/buy-now), log into the site, or create orders.
 * A spoofed User-Agent is NOT a verified Googlebot; use GSC URL Inspection for confirmation.
 */
import fs from 'node:fs';
import path from 'node:path';
const SOURCE = 'reports/gsc-403-2026-11-16.txt';
const OUTPUT = 'artifacts/gsc-403-audit-2026-11-16.json';
const ROOT = 'https://sastamilaga.com';
const UA_BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const UA_BROWSER = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const urls = [...new Set(fs.readFileSync(SOURCE, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s.startsWith(ROOT + '/')))];
if (urls.length !== 699) throw Error('GSC report must contain exactly 699 unique URLs, not ' + urls.length);
const limit = Math.max(0, Number(process.env.SM_GSC_PROBE_LIMIT || 0));
const compare = Math.max(0, Number(process.env.SM_GSC_COMPARE_BROWSER || 20));
const concurrency = Math.min(3, Math.max(1, Number(process.env.SM_GSC_CONCURRENCY || 2)));
const save = JSON.parse(JSON.stringify({}));

function classify(url) {
  const u = new URL(url);
  if (u.hostname !== 'sastamilaga.com') return 'UNTRUSTED_EXTERNAL_URL';
  if (u.pathname.includes('*')) return 'NON_LITERAL_URL_PATTERN';
  const q = u.searchParams;
  if (['add-to-cart', 'sm_buy_now', 'wc-ajax', 'order_key', 'remove_item'].some(k => q.has(k))) return 'SHOPPING_ACTION_DO_NOT_CRAWL';
  if (/^\/(?:cart|checkout|my-account|account|ur\/(?:cart|checkout|my-account))\/?/i.test(u.pathname)) return 'PRIVATE_COMMERCE_DO_NOT_INDEX';
  if (u.pathname.startsWith('/wp-content/')) return 'ASSET_NOT_WEB_PAGE';
  if (q.has('post_type') || q.has('p') || u.search) return 'QUERY_VARIANT_REVIEW_CANONICAL';
  if (u.pathname.startsWith('/ur/')) return 'URDU_CONTENT';
  if (u.pathname.startsWith('/product/')) return 'PRODUCT_PAGE';
  if (u.pathname.startsWith('/product-category/')) return 'CATEGORY_PAGE';
  if (u.pathname.startsWith('/product-tag/')) return 'TAG_PAGE';
  if (u.pathname.startsWith('/videos/')) return 'VIDEO_PAGE';
  if (u.pathname.startsWith('/blog/')) return 'BLOG_PAGE';
  if (u.pathname.startsWith('/visa/')) return 'VISA_PAGE';
  return 'OTHER_PUBLIC_PAGE';
}
const SKIP = new Set(['UNTRUSTED_EXTERNAL_URL','NON_LITERAL_URL_PATTERN','SHOPPING_ACTION_DO_NOT_CRAWL','PRIVATE_COMMERCE_DO_NOT_INDEX','ASSET_NOT_WEB_PAGE']);
function attr(tag, name) {
  const m = tag.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*([\"\x27])([\\s\\S]*?)\\1','i'));
  return m ? m[2] : '';
}
function meta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find(t => attr(t,'name').toLowerCase() === name.toLowerCase());
  return tag ? attr(tag,'content') : '';
}
function canonical(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const el = tags.find(t => attr(t,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  return el ? attr(el,'href') : '';
}
async function oneRequest(url, ua) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {method:'GET', redirect:'manual',headers:{'User-Agent':ua, 'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.5', 'X-Sasta-Healthcheck':'gsc-403-review'},signal:controller.signal});
    const headers = {content_type:res.headers.get('content-type')||'',x_robots:res.headers.get('x-robots-tag')||'',location:res.headers.get('location')||'',cf_mitigated:res.headers.get('cf-mitigated')||'',cf_ray:res.headers.get('cf-ray')||''};
    let html='';
    if (res.status === 200 && /html|xml|text/i.test(headers.content_type)) {
      if (Number(res.headers.get('content-length')||0) <= 500000) {
        html=(await res.text()).slice(0,500000);
      } else await res.body?.cancel();
    } else await res.body?.cancel();
    return {status:res.status,headers,html};
  } catch(e) {return {status:0,error:e?.name==='AbortError'?'timeout':String(e?.message||e).slice(0,140),headers:{}};}
  finally {clearTimeout(timer);}
}
async function followForEvidence(first, url) {
  let current = first, redirects = [], response = null;
  for(let i=0;i<4;i++){
    response=await oneRequest(current,UA_BOT);
    if(![301,302,303,307,308].includes(response.status)) break;
    const target=response.headers.location;
    if(!target)break;
    let next;try{next=new URL(target,current);}catch{break;}
    redirects.push({status:response.status,location:next.href});
    if(next.protocol!=='https:'||next.hostname!=='sastamilaga.com'||SKIP.has(classify(next.href)))break;
    if(redirects.some((r,j)=>j<redirects.length-1 && r.location===next.href))break;
    current=next.href;
  }
  const noindex=/(?:^|[,;\s])noindex(?:$|[,;\s])/i.test((response?.headers?.x_robots||'')+' '+meta(response?.html||'','robots'));
  const text=response?.html||'';
  const title=(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
  const h1=(text.match(/<h1\b/gi)||[]).length;
  const canonicalHref=canonical(text);
  const structured=/(?:\"@type\"\s*:\s*\"(?:Product|BreadcrumbList|FAQPage|Article|Organization)\")/i.test(text);
  const goodResponse=response?.status===200;
  const outcome=response?.status===403?'STILL_403':response?.status>=500?'SERVER_ERROR':response?.status===404?'NOT_FOUND_REVIEW':response?.status===410?'GONE_OR_RETIRED':response?.status===429?'RATE_LIMITED':!goodResponse?'OTHER_HTTP_ERROR':noindex?'NOINDEX':!title||!canonicalHref?'MISSING_SEO_METADATA':redirects.length?'REDIRECT_RESOLVED':'CANONICAL_HTML_200';
  return {original:url,observed_url:current,original_status:redirects[0]?.status??response?.status,final_status:response?.status,redirects,outcome,metadata:{title_present:!!title,h1_count:h1,canonical:canonicalHref,meta_robots:meta(text,'robots'),x_robots:response?.headers?.x_robots||'',structured_data_present:structured,html_bytes:text.length,cf_mitigated:response?.headers?.cf_mitigated||''},error:response?.error||null};
}
const items=urls.map(url=>({url,category:classify(url)}));
const probeIndices=items.map((x,i)=>i).filter(i=>!SKIP.has(items[i].category)).slice(0,limit||undefined);
const results=items.map((x,i)=>({url:x.url,category:x.category,outcome:SKIP.has(x.category)?'NOT_PROBED_INTENTIONALLY':'NOT_PROBED_LIMITED'}));
let cursor=0;
async function runner(){
 while(cursor<probeIndices.length){
  const id=probeIndices[cursor++];
  const v=await followForEvidence(items[id].url,items[id].url);
  results[id]={...v,category:items[id].category};
  if(id<compare && !new URL(items[id].url).search){
    const normal=await oneRequest(items[id].url,UA_BROWSER);
    results[id].browser_status=normal.status;
  }
  await delay(400);
 }
}
await Promise.all(Array.from({length:concurrency},()=>runner()));
const counts={};for(const r of results)counts[r.outcome]=(counts[r.outcome]||0)+1;
const summary={generated_at:new Date().toISOString(),scope:'All 699 historical GSC 403 URLs classified. Read-only probes exclude shopping-action and private URLs.',total:urls.length,probed:probeIndices.length,skipped_intentionally:results.filter(r=>r.outcome==='NOT_PROBED_INTENTIONALLY').length,not_probed_due_limit:results.filter(r=>r.outcome==='NOT_PROBED_LIMITED').length,counts,warning:'A GitHub Runner with Googlebot User-Agent is NOT an authenticated Googlebot. GSC live URL inspection is required. HTTP 200 does not guarantee Google indexing.'};
const output={summary,results};
fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
fs.writeFileSync(OUTPUT,JSON.stringify(output,null,2));
console.log(JSON.stringify(summary));
if(results.some(r=>r.outcome==='STILL_403'||r.outcome==='SERVER_ERROR'))process.exitCode=1;
