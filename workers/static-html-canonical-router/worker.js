/* Normalize only trailing slashes after existing *.html URLs. All other requests
 * are passed to the previously installed production handlers without changing
 * HTML, scripts, header, footer or any checkout functionality. */
export default {async fetch(request, env) {
 const u=new URL(request.url),p=u.pathname;
 if((request.method==='GET'||request.method==='HEAD') &&
    (/^\/c\/global\/[a-z0-9-]+\.html\/+$/i.test(p) ||
     /^\/p\/[a-z0-9-]+\.html\/+$/i.test(p))) {
   return new Response(null,{status:301,headers:{
      Location:'https://sastamilaga.com'+p.replace(/\/+$/,'')+u.search,
      'Cache-Control':'public,max-age=3600,s-maxage=86400',
      'X-Sasta-Route':'normalize-static-html'
   }});
 }
 const upstream=p.startsWith('/c/global/')?env.CATEGORY:env.FALLBACK;
 if(!upstream)return new Response('Upstream unavailable',{status:503,headers:{'Cache-Control':'no-store'}});
 return upstream.fetch(request);
}};