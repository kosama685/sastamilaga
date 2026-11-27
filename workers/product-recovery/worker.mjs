import {handle,lookup,slugify} from '../global-pdp/worker.js';
const LEGACY=/^\/global\/p\/[a-z0-9-]{1,140}\/([0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/[a-z0-9-]{1,180})?\/?$/i;
export async function resolveLegacyPath(pathname,fetcher=fetch){
 const m=LEGACY.exec(pathname);if(!m)return null;
 const p=await lookup(fetcher,m[1]);
 return p?'/global-shop/p/'+p.id+'/'+slugify(p.name)+'/':null;
}
function missing(method,status=404){
 return new Response(method==='HEAD'?null:'<!doctype html><meta charset="utf-8"><title>Product unavailable | Sasta Milaga</title><h1>This product is unavailable</h1><p><a href="/search/">Search the catalog</a></p>',{status,headers:{'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex,follow','Cache-Control':'no-store',...(status===503?{'Retry-After':'30'}:{})}});
}
export async function recover(request,env,fetcher=fetch){
 const u=new URL(request.url);
 if(u.pathname.startsWith('/global/p/')){
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  try{
   const target=await resolveLegacyPath(u.pathname,fetcher);
   return target?new Response(null,{status:301,headers:{Location:'https://sastamilaga.com'+target+u.search,'Cache-Control':'public,max-age=300,s-maxage=3600','X-Sasta-Recovery':'complete-catalog-legacy-link'}}):missing(request.method);
  }catch{return missing(request.method,503);}
 }
 if(u.pathname.startsWith('/global-shop/p/'))return handle(request,fetcher);
 let response;
 try {response=await env.PRIMARY.fetch(request);}catch{response=new Response('Supplier unavailable',{status:503});}
 const m=/^\/product\/([0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\/([^/]+)\/?$/i.exec(u.pathname);
 if(!['GET','HEAD'].includes(request.method)||!m||!(response.status===404||response.status===429||response.status>=500))return response;
 const fallbackUrl=new URL('/global-shop/p/'+m[1]+'/'+m[2]+'/',u.origin);
 const fallback=await handle(new Request(fallbackUrl,{method:request.method}),fetcher);
 if(fallback.status!==200)return response;
 await response.body?.cancel();
 const headers=new Headers(fallback.headers);headers.set('X-Sasta-Recovery','verified-catalog-snapshot');
 return new Response(fallback.body,{status:200,headers});
}
export default {fetch:(request,env)=>recover(request,env)};
