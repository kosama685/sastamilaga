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
 if(result.status===503&&u.pathname==='/blog/'){
  try{
   const r=await fetch('https://kosama685.github.io/sastamilaga/b/index.html',{headers:{Accept:'text/html'},cf:{cacheTtl:300,cacheEverything:true},signal:AbortSignal.timeout(8000)});
   if(r.ok&&r.headers.get('content-type')?.includes('text/html')){
    let html=await r.text();
    if(html.length>200&&html.length<500000&&html.includes('Sasta Milaga')&&/<\/head>/i.test(html)){
     html=html.replace(/<script\b(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,'');
     html=html.replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi,'');
     html=html.replace(/<\/head>/i,'<link rel="canonical" href="https://sastamilaga.com/blog/"></head>');
     result=new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60,s-maxage=300','X-Sasta-Blog':'published-archive-fallback','X-Content-Type-Options':'nosniff'}});
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
