/**
 * One-path crawl hygiene for /sitemap-pages.xml.
 * Calls the EXISTING canonical-sync Worker over a same-account Service Binding,
 * retains its real public pages, and strips only URLs already owned by dedicated
 * blog / visa sitemaps. Does not modify origin, routes, catalog, carts or orders.
 */
const PATH='/sitemap-pages.xml';
const MAX_BYTES=300000;
const DEDICATED=new Set(['https://sastamilaga.com/b/','https://sastamilaga.com/visa/']);
function xmlClean(xml) {
 if(typeof xml!=='string'||xml.length<60||xml.length>MAX_BYTES||
   !/<urlset\b/.test(xml)||!/<\/urlset>\s*$/.test(xml))throw Error('invalid_pages_sitemap');
 let removed=0;
 const clean=xml.replace(/<url>\s*<loc>([^<]*)<\/loc>(?:\s*<lastmod>[^<]*<\/lastmod>)?\s*<\/url>\s*/g,(full,link)=>{
   if(DEDICATED.has(link)){removed++;return '';}
   return full;
 });
 if(!clean.includes('</urlset>'))throw Error('invalid_result');
 return {clean,removed,urls:(clean.match(/<loc>/g)||[]).length};
}
function reply(body,status=200,method='GET',extra={}) {
 return new Response(method==='HEAD'?null:body,{status,headers:{
  'Content-Type':status===200?'application/xml; charset=utf-8':'text/plain; charset=utf-8',
  'Cache-Control':status===200?'public, max-age=120, s-maxage=120':'no-store',
  'X-Content-Type-Options':'nosniff',
  ...extra,
  ...(status!==200?{'X-Robots-Tag':'noindex'}:{})
 }});
}
export default {
 async fetch(request,env) {
  const method=request.method.toUpperCase(),url=new URL(request.url);
  if(url.pathname!==PATH)return reply('Not found',404,method);
  if(!['GET','HEAD'].includes(method))return reply('Method not allowed',405,method,{'Allow':'GET, HEAD'});
  if(!env.UPSTREAM||typeof env.UPSTREAM.fetch!=='function')return reply('Sitemap origin unavailable',503,method);
  try {
   // Force GET to examine XML even when incoming client requests HEAD.
   const upstream=await env.UPSTREAM.fetch(new Request(request.url,{method:'GET',headers:{Accept:'application/xml,text/xml'}}));
   if(upstream.status!==200)return reply('Sitemap origin unavailable',503,method);
   const len=Number(upstream.headers.get('content-length')||0);
   if(len>MAX_BYTES)return reply('Sitemap too large',503,method);
   const xml=await upstream.text(),result=xmlClean(xml);
   return reply(result.clean,200,method,{'X-Sasta-Sitemap-Source':'canonical-sync-dedup-v1',
     'X-Sasta-Pages-Listed':String(result.urls),
     'X-Sasta-Duplicate-Sitemap-URLs-Removed':String(result.removed)});
  }catch(error){
   console.error(JSON.stringify({event:'sitemap_pages_clean_error',type:error?.name||'Error'}));
   return reply('Sitemap origin temporarily unavailable',503,method);
  }
 }
};
export {xmlClean};
