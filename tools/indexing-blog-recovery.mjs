// Cache public editorial output. An unavailable blog index may show the genuine
// existing static article archive; individual missing articles are never replaced.
export async function cachedBlogFetch(request,env,ctx,original){
 if(!['GET','HEAD'].includes(request.method))return original.fetch(request,env,ctx);
 const u=new URL(request.url),cache=globalThis.caches?.default;
 const key=new Request('https://sastamilaga.com/__blog_public_cache_v1'+u.pathname);
 const outward=r=>request.method==='HEAD'?new Response(null,r):r;
 if(cache){try{const saved=await cache.match(key);if(saved)return outward(saved);}catch{}}
 const getRequest=request.method==='HEAD'?new Request(request.url,{headers:request.headers}):request;
 let result=await original.fetch(getRequest,env,ctx);
 const snapshots={'/blog/':'index.html','/blog/sitemap.xml':'sitemap.xml','/blog/holiday-gift-budget-including-delivery-costs/':'holiday-gift-budget-including-delivery-costs.html','/blog/bluetooth-speaker-watts-vs-real-world-loudness/':'bluetooth-speaker-watts-vs-real-world-loudness.html'};
 if(result.status===503&&Object.hasOwn(snapshots,u.pathname)){
  try{
   const xml=u.pathname==='/blog/sitemap.xml';
   const r=await fetch('https://kosama685.github.io/sastamilaga/data/blog-fallback/'+snapshots[u.pathname],{cf:{cacheTtl:300,cacheEverything:true},signal:AbortSignal.timeout(8000)});
   if(r.ok){
    let html=await r.text();
    const valid=xml?html.startsWith('<?xml')&&html.includes('<urlset')&&html.includes('https://sastamilaga.com/blog/'):html.includes('Sasta Milaga')&&html.includes('<link rel="canonical" href="https://sastamilaga.com'+u.pathname+'">');
    if(html.length>200&&html.length<500000&&valid){
     result=new Response(html,{headers:{'Content-Type':xml?'application/xml; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'public,max-age=60,s-maxage=300','X-Sasta-Blog':'verified-published-snapshot','X-Content-Type-Options':'nosniff',"Content-Security-Policy":"default-src 'none';style-src 'unsafe-inline';img-src https: data:;font-src 'self';base-uri 'none';form-action 'none'"}});
    }
   }
  }catch{}
 }
 if(result.status===200&&cache&&!result.headers.has('set-cookie')){
  const saved=new Response(result.clone().body,result);saved.headers.set('Cache-Control','public,max-age=300');
  const writing=cache.put(key,saved).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(writing);else await writing;
 }
 return outward(result);
}
export function patchBlogRecovery(source){
 const anchor='export default {async fetch(request,env){';
 if(source.split(anchor).length!==2)throw Error('Blog source changed since review');
 return source.replace(anchor,'const blogReader = {async fetch(request,env){')+'\n'+cachedBlogFetch.toString()+'\nexport default {fetch(request,env,ctx){return cachedBlogFetch(request,env,ctx,blogReader)}};\n';
}
export function patchBlogSnapshot(source){
 const start=source.indexOf('async function cachedBlogFetch('),end=source.indexOf('\nexport default {fetch(request,env,ctx)');
 if(start<0||end<=start)throw Error('Reviewed blog wrapper not found');
 return source.slice(0,start)+cachedBlogFetch.toString()+source.slice(end);
}
