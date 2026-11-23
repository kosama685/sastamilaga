import {handle} from '../global-pdp/worker.js';
export async function recover(request,env,fetcher=fetch){
 let response;
 try {response=await env.PRIMARY.fetch(request);}catch{response=new Response('Supplier unavailable',{status:503});}
 const u=new URL(request.url);
 const m=/^\/product\/([0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})\/([^/]+)\/?$/i.exec(u.pathname);
 if(!['GET','HEAD'].includes(request.method)||!m||response.status<500)return response;
 const fallbackUrl=new URL('/global-shop/p/'+m[1]+'/'+m[2]+'/',u.origin);
 const fallback=await handle(new Request(fallbackUrl,{method:request.method}),fetcher);
 if(fallback.status!==200)return response;
 const headers=new Headers(fallback.headers);headers.set('X-Sasta-Recovery','verified-catalog-snapshot');
 return new Response(fallback.body,{status:200,headers});
}
export default {fetch:(request,env)=>recover(request,env)};
