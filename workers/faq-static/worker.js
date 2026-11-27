// Sasta Milaga FAQ availability bridge. Isolated to /faq; never proxies cart, checkout or other URLs.
const BACKUP='https://kosama685.github.io/sastamilaga/faq/';
const RAW='https://raw.githubusercontent.com/kosama685/sastamilaga/main/faq/index.html';
const expectedTitle='Shopping FAQs: Payments, Shipping &amp; Returns | Sasta Milaga';
addEventListener('fetch',event=>event.respondWith(handle(event.request)));
async function handle(request){
 const u=new URL(request.url),p=u.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{'Allow':'GET, HEAD','Cache-Control':'no-store'}});
 if(p==='/faq')return Response.redirect('https://sastamilaga.com/faq/',301);
 if(p!=='/faq/')return new Response('Page not found',{status:404,headers:{'X-Robots-Tag':'noindex','Cache-Control':'no-store'}});
 for(const [url,source] of [[BACKUP,'github-pages'],[RAW,'github-raw']]){
  try{
   const r=await fetch(url,{method:'GET',redirect:'follow',headers:{Accept:'text/html'},cf:{cacheEverything:true,cacheTtl:300},signal:AbortSignal.timeout(8500)});
   if(!r.ok)continue;
   const h=await r.text();
   // Never return homepage, 404 template, or an empty/broken upstream as a successful FAQ.
   if(h.length<10000||h.length>1000000||!h.includes(expectedTitle)||!h.includes('<link rel="canonical" href="https://sastamilaga.com/faq/"')||!h.includes('</html>'))continue;
   const body=request.method==='HEAD'?null:h;
   return new Response(body,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=120,s-maxage=300','X-Content-Type-Options':'nosniff','X-Sasta-FAQ-Source':source}});
  }catch(e){console.warn('FAQ_STATIC_UPSTREAM',source,String(e).slice(0,130))}
 }
 return new Response('FAQ temporarily unavailable. Contact support via https://sastamilaga.com/contact/',{status:503,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
}
