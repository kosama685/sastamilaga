// Serve committed static site files only. Never proxy a broadcaster stream.
const SITE='https://sastamilaga.com';
const SOURCE='https://raw.githubusercontent.com/kosama685/sastamilaga/main';
export function sourcePath(path){
 if(/%2f|%5c|%2e|\\/i.test(path))return null;
 if(path==='/live-tv/playlist.m3u')return '/data/livetv/playlist.m3u';
 if(path.startsWith('/live-tv/'))return path.endsWith('/')?path+'index.html':/\.[a-z0-9]+$/i.test(path)?path:null;
 if(/^\/assets\/js\/(?:live-tv-[a-z0-9-]+|config|local-api)\.js$/i.test(path)||path==='/app.js'||path==='/assets/theme/live-tv-hub.css'||/^\/(?:data\/livetv|assets\/images\/livetv|assets\/vendor)\/[a-z0-9_./-]+$/i.test(path)||path==='/sitemap-livetv.xml')return path;
 return null;
}
export async function handle(request,fetcher=fetch){
 const u=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 if(u.pathname==='/live-tv'||(/^\/live-tv\//.test(u.pathname)&&!u.pathname.endsWith('/')&&!/\.[a-z0-9]+$/i.test(u.pathname)))return Response.redirect(SITE+u.pathname+'/'+u.search,308);
 const path=sourcePath(u.pathname);if(!path)return new Response('Not found',{status:404});
 let upstream;try{upstream=await fetcher(SOURCE+path+'?release=world-tv-discovery-20261122',{method:request.method,redirect:'manual',signal:AbortSignal.timeout(18000),cf:{cacheEverything:true,cacheTtl:60}});}catch(error){console.log(JSON.stringify({event:'world_tv_static_fetch_failure',name:error.name,message:String(error.message).slice(0,180)}));return new Response('Static directory temporarily unavailable. Please retry.',{status:502,headers:{'Cache-Control':'no-store'}});}
 const types={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json; charset=utf-8',png:'image/png',jpg:'image/jpeg',webp:'image/webp',svg:'image/svg+xml',m3u:'audio/x-mpegurl; charset=utf-8',xml:'application/xml; charset=utf-8',txt:'text/plain; charset=utf-8'};
 const headers=new Headers({'Content-Type':types[path.split('.').pop()]||'application/octet-stream','Cache-Control':upstream.ok?'public,max-age=60,s-maxage=60':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Sasta-TV-Config':'static-world-tv','X-Sasta-Static-Source':'github-main-world-tv'});
 if(request.cf?.country)headers.set('X-Sasta-Country',request.cf.country);
 if(!upstream.ok)headers.set('X-Robots-Tag','noindex');
 return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status,headers});
}
export default {fetch(request){return handle(request);}};
