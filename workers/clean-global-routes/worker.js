/* Hash-free CJ group/product URLs. Static group pages retain existing site template;
 * product routes use existing homepage SPA shell with a root base so refresh works.
 * Checkout, payment, cart, product inventory are not modified. */
export default {
 async fetch(request,env) {
  const u=new URL(request.url),p=u.pathname;
  const g=/^\/global\/g\/([a-z0-9-]+)\/?$/i.exec(p);
  const pr=/^\/global\/p\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/i.exec(p);
  if(!['GET','HEAD'].includes(request.method)||(!g&&!pr))return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
  try{
   const source='https://sastamilaga.com'+(g?'/global/g/'+g[1]+'/':'/');
   const upstream=await env.STATIC.fetch(new Request(source,{headers:{Accept:'text/html'}}));
   if(!upstream.ok)return new Response('Catalogue page temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
   let html=await upstream.text();
   if(pr){
    // The shell's default base is derived from the current path. Direct deep links must use root assets.
    html=html.replace(/<script>\/\* Relative URLs[\s\S]*?<\/script>/,'<base href="/">');
    html=html.replace(/<title>[\s\S]*?<\/title>/,'<title>Global product | Sasta Milaga</title>');
    html=html.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="noindex, follow">');
    // Keep source HTML metadata consistent with the actual browser URL until product SSR is available.
    const canonical='https://sastamilaga.com'+(p.endsWith('/')?p.slice(0,-1):p);
    html=html.replace(/<link rel="canonical"[^>]*>/,'<link rel="canonical" href="'+canonical+'">');
    html=html.replace(/<meta property="og:url"[^>]*>/,'<meta property="og:url" content="'+canonical+'">');
   }
   return new Response(request.method==='HEAD'?null:html,{status:200,headers:{
    'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=0,s-maxage=60',
    'X-Sasta-Global-Route':pr?'dynamic-product':'static-group',
    ...(pr?{'X-Robots-Tag':'noindex, follow'}:{})
   }});
  }catch(e){console.error('global_route_error',String(e));return new Response('Catalogue route temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}
 }
};