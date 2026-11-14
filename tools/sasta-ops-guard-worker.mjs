/**
 * Sasta Milaga — production-safe SEO / commerce visibility guard.
 * Runs on Cloudflare Cron. It ONLY observes the D1 supplier catalogue and
 * public HTTPS routes. The only database mutation is one small health row.
 *
 * It deliberately DOES NOT:
 * - execute wp-cron.php while 31,913 Action Scheduler entries are overdue;
 * - change stock/prices, submit Merchant offers or alter checkout;
 * - claim that HTTP 200 means cart persistence or successful payment;
 * - auto-enable noindex products or generate unsupported supplier claims.
 */
const ORIGIN='https://sastamilaga.com';
const DB_TABLE='sasta_ops_guard_runs';
const VER='2026-11-14.1';
const MONITOR_URLS={
 sitemap: '/sitemap-global-qualified.xml',
 product: '/global-shop/p/87FD613D-EEC7-474A-A408-02C9DCC6E9E2/solar-simulation-anti-theft-warning-light/',
 cart: '/cart/',
 feed: '/wp-content/uploads/smcs/google-feed-x9hdgtc1hvxydimmdmc5aakd.xml'
};

async function readCount(db,sql){
 const r=await db.prepare(sql).first();
 const n=Number(r?.n);
 if(!Number.isSafeInteger(n)||n<0)throw Error('invalid_D1_count');
 return n;
}
async function probe(path,method='GET'){
 try{
  const r=await fetch(ORIGIN+path,{method,redirect:'manual',headers:{'Accept':'text/html,application/xml;q=0.9,*/*;q=0.8','User-Agent':'SastaMilaga-CF-Guard/1.0'},signal:AbortSignal.timeout(10000),cf:{cacheEverything:false,cacheTtl:0}});
  const status=r.status;
  try{await r.body?.cancel();}catch{}
  return {status};
 }catch(e){return {status:0,error:e?.name==='TimeoutError'?'timeout':'network_error'};}
}
function safeJson(obj,status=200){
 return Response.json(obj,{status,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow','Access-Control-Allow-Origin':'https://sastamilaga.com','X-Content-Type-Options':'nosniff'}});
}
async function observe(env,date){
 if(!env.DB)throw Error('D1_binding_missing');
 const [total,approved,checks]=await Promise.all([
  readCount(env.DB,'SELECT COUNT(*) AS n FROM catalog_products_cj'),
  readCount(env.DB,"SELECT COUNT(*) AS n FROM cj_product_enrichment WHERE seo_approved=1 AND LENGTH(COALESCE(description_text,''))>=100"),
  Promise.all(Object.entries(MONITOR_URLS).map(async([key,url])=>[key,await probe(url,key==='feed'?'HEAD':'GET')]))
 ]);
 const results=Object.fromEntries(checks);
 const errors=[];
 if(total<1||approved>total)errors.push('catalogue_count_anomaly');
 if(results.sitemap.status!==200)errors.push('sitemap_http_'+results.sitemap.status);
 if(results.product.status!==200)errors.push('sample_product_http_'+results.product.status);
 if(results.cart.status!==200)errors.push('cart_route_http_'+results.cart.status);
 if(![200,304].includes(results.feed.status))errors.push('merchant_feed_http_'+results.feed.status);
 const healthy=errors.length===0?1:0;
 const runId=new Date(date||Date.now()).toISOString().replace(/[^0-9TZ]/g,'');
 await env.DB.prepare("INSERT OR REPLACE INTO "+DB_TABLE+
 "(run_id,recorded_at,catalog_total,seo_approved,sitemap_status,product_status,cart_status,feed_status,healthy,errors_json) VALUES(?,?,?,?,?,?,?,?,?,?)")
 .bind(runId,new Date(date||Date.now()).toISOString(),total,approved,
  results.sitemap.status,results.product.status,results.cart.status,results.feed.status,healthy,JSON.stringify(errors)).run();
 console.log(JSON.stringify({event:'sasta_ops_guard',runId,total,approved,healthy,results,errors,version:VER}));
 // Deliberately no wp-cron or bulk Merchant sync while the backlog is unsafe.
 return {runId,total,approved,healthy,errors};
}
export default {
 async scheduled(controller,env,ctx){
  ctx.waitUntil(observe(env,controller?.scheduledTime||Date.now()));
 },
 async fetch(request,env){
  const url=new URL(request.url);
  if(request.method!=='GET'&&request.method!=='HEAD')return safeJson({error:'method_not_allowed'},405);
  if(url.pathname!=='/__ops-health.json')return safeJson({error:'not_found'},404);
  if(!env.DB)return safeJson({status:'unavailable',reason:'d1_not_bound'},503);
  try{
   const row=await env.DB.prepare("SELECT recorded_at,catalog_total,seo_approved,sitemap_status,product_status,cart_status,feed_status,healthy,errors_json FROM "+DB_TABLE+" ORDER BY recorded_at DESC LIMIT 1").first();
   if(!row)return safeJson({status:'awaiting_first_cron_run',version:VER},200);
   const body={version:VER,status:row.healthy?'routes_reachable':'investigation_required',last_run_utc:row.recorded_at,
     supplier_records:row.catalog_total,seo_approved_product_pages:row.seo_approved,
     route_checks:{sitemap_http:row.sitemap_status,product_http:row.product_status,cart_http:row.cart_status,merchant_feed_http:row.feed_status},
     errors:JSON.parse(row.errors_json||'[]'),
     caveats:['Cart HTTP 200 does not prove session persistence or a completed order.','Sitemaps do not guarantee Google indexing.','Merchant approval and Search Console authorization are not checked by this cron.','WordPress Action Scheduler is deliberately not replayed by this monitor.']};
   return safeJson(body);
  }catch(e){return safeJson({status:'monitor_unavailable',reason:'database_query_failed'},503)}
 }
};
