/* Signed, eligible CJ media only. No origin storage and no whole-file buffering. */
const ORIGINS = new Set(['download-only-api.cjdropshipping.com', 'video-cf.cjdropshipping.com']);
const MAX = 128 * 1024 * 1024;
const encoder = new TextEncoder();
const fail = (status, message, headers = {}) => new Response(message, {status, headers: {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', ...headers}});
const unbase = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const hex = data => [...new Uint8Array(data)].map(b=>b.toString(16).padStart(2,'0')).join('');

export function range(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1] && !m[2])) throw new Error('Invalid range');
  let start, end;
  if (!m[1]) { const suffix = Number(m[2]); if (!Number.isSafeInteger(suffix) || suffix < 1) throw new Error('Invalid range'); start=Math.max(0,size-suffix); end=size-1; }
  else { start=Number(m[1]); end=m[2] ? Math.min(Number(m[2]),size-1) : size-1; }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>=size || end<start) throw new Error('Invalid range');
  return {start,end};
}
export async function authorize(request, env) {
  const u=new URL(request.url), match=/^\/cjv\/v1\/([A-Za-z0-9_-]{1,3000})\.([a-f0-9]{64})$/.exec(u.pathname);
  if (!match || u.search || !env.MEDIA_SIGNING_KEY) throw new Error('Unauthorized');
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.MEDIA_SIGNING_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const sig=Uint8Array.from(match[2].match(/../g),b=>parseInt(b,16));
  if (!await crypto.subtle.verify('HMAC',key,sig,encoder.encode(match[1]))) throw new Error('Unauthorized');
  const claim=JSON.parse(new TextDecoder().decode(unbase(match[1]))), now=Math.floor(Date.now()/1000);
  if (!Number.isSafeInteger(claim.exp) || claim.exp<now || claim.exp>now+172800 || !/^[A-Za-z0-9-]{1,100}$/.test(claim.pid) || !/^[A-Za-z0-9_-]{1,100}$/.test(claim.id)) throw new Error('Unauthorized');
  const source=new URL(claim.url);
  if (source.protocol!=='https:' || !ORIGINS.has(source.hostname) || source.port || source.username || source.password || source.hash || /%2e|%2f|%5c|\\/i.test(source.pathname)) throw new Error('Unsafe source');
  const ext=/\.(mp4|m4v|webm|jpg|jpeg|png|webp)$/i.exec(source.pathname)?.[1]?.toLowerCase();
  if (!ext || (claim.kind==='video' ? !['mp4','m4v','webm'].includes(ext) : claim.kind!=='image' || !['jpg','jpeg','png','webp'].includes(ext))) throw new Error('Unsafe source');
  return {...claim, url:source.href, ext};
}
function cleanHeaders(upstream, claim) {
  if(upstream.headers.has('Content-Encoding')&&upstream.headers.get('Content-Encoding')!=='identity')throw new Error('Encoded range source');
  const mime=(upstream.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
  const valid=claim.kind==='video' ? ['video/mp4','video/webm','video/x-m4v'] : ['image/jpeg','image/png','image/webp'];
  if (!valid.includes(mime)) throw new Error('Invalid media type');
  const h=new Headers({'Content-Type':mime,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-site','Content-Security-Policy':"default-src 'none'",'Cache-Control':'public, max-age=3600'});
  for (const name of ['Content-Length','Content-Range','ETag','Last-Modified']) if(upstream.headers.has(name))h.set(name,upstream.headers.get(name));
  return h;
}
export function ifRangeMatches(value, headers) {
  if(!value)return true;
  if(value.startsWith('"'))return value===headers.get('ETag');
  if(value.startsWith('W/'))return false;
  const date=Date.parse(value), modified=Date.parse(headers.get('Last-Modified')||'');
  return Number.isFinite(date)&&Number.isFinite(modified)&&modified<=date;
}
function slice(body, start, end) {
  const reader=body.getReader();let position=0;
  return new ReadableStream({async pull(controller){try{while(true){const {done,value}=await reader.read();if(done){controller.close();return;}const from=Math.max(0,start-position),to=Math.min(value.byteLength,end+1-position);position+=value.byteLength;if(to>from)controller.enqueue(value.subarray(from,to));if(position>end){controller.close();await reader.cancel();return;}if(to>from)return;}}catch(e){controller.error(e);await reader.cancel().catch(()=>{});}},cancel(reason){return reader.cancel(reason);}});
}

/* Dynamic signed playback links for entitled official CJ product videos.
 * Provider has the CJ token; this proxy alone owns MEDIA_SIGNING_KEY.
 * Video files are fetched with the provider-required Referer (above).
 * No direct source link is exposed as <video src>. */
const CJ_PID = /^(?:[0-9]{15,22}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i;
function playableSource(raw, kind='video') {
  try {
    const u=new URL(String(raw||''));
    if(u.protocol!=='https:'||!ORIGINS.has(u.hostname)||u.port||u.username||u.password||u.hash||u.search)return '';
    const re=kind==='video'?/\.(mp4|m4v|webm)$/i:/\.(jpg|jpeg|png|webp)$/i;
    return re.test(u.pathname)?u.href:'';
  }catch{return ''}
}
export async function signMediaUrl(item, pid, key, now=Math.floor(Date.now()/1000)) {
  const url=playableSource(item.url,item.kind);
  if(!CJ_PID.test(pid)||!/^[A-Za-z0-9_-]{6,100}$/.test(String(item.id))||!url)throw Error('Invalid media');
  const claim={pid,id:String(item.id),kind:item.kind,url,exp:now+43200};
  const b=Array.from(encoder.encode(JSON.stringify(claim)), x=>String.fromCharCode(x)).join('');
  const data=btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const mac=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=hex(await crypto.subtle.sign('HMAC',mac,encoder.encode(data)));
  return '/cjv/v1/'+data+'.'+signature;
}
export async function validateCJPlayableVideo(media, fetcher=fetch) {
  if(!playableSource(media?.url))return false;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try {
    const r=await fetcher(media.url,{method:'GET',redirect:'manual',headers:{
      'Referer':'https://developers.cjdropshipping.com/',
      'Range':'bytes=0-1','Accept':'video/*','Accept-Encoding':'identity'
    },signal:controller.signal,cf:{cacheEverything:false}});
    const mime=(r.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
    const good=[200,206].includes(r.status)&&['video/mp4','video/webm','video/x-m4v'].includes(mime);
    const bytes=Number(r.headers.get('Content-Length')||0);
    await r.body?.cancel().catch(()=>{});
    return good&&bytes<MAX;
  }catch{return false;}finally{clearTimeout(timer)}
}
export async function resolveCJVideo(request,env,ctx) {
  if(!['GET','HEAD'].includes(request.method))return fail(405,'Method not allowed',{'Allow':'GET, HEAD'});
  const url=new URL(request.url),pid=String(url.searchParams.get('pid')||'').toUpperCase();
  const send=(body,status=200)=>new Response(request.method==='HEAD'?null:JSON.stringify(body),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  if(url.pathname!=='/cjv/resolve'||url.searchParams.size!==1||!CJ_PID.test(pid))return send({error:'invalid_pid'},400);
  if(!env.MEDIA_SIGNING_KEY||!env.CJ_VIDEO_PROVIDER)return send({error:'service_unavailable'},503);
  const key=new Request('https://sastamilaga.com/cjv/resolve-cache/'+pid);
  const cache=caches.default;
  if(request.method==='GET'){
    const saved=await cache.match(key);
    if(saved){const data=await saved.json();return send({...data,cached:true});}
  }
  try{
    const r=await env.CJ_VIDEO_PROVIDER.fetch(new Request(
      'https://service-cj.internal/api/cj/videos?pid='+encodeURIComponent(pid),{
        headers:{'origin':'https://sastamilaga.com','accept':'application/json'}
      }));
    if(!r.ok)return send({pid,status:'provider_unavailable',video:null},503);
    const response=await r.json();
    const list=Array.isArray(response.videos)?response.videos.slice(0,8):[];
    let chosen=null;
    for(const v of list){
      if(!v||!playableSource(v.url)||!await validateCJPlayableVideo(v))continue;
      chosen=v;break;
    }
    const result={pid,status:chosen?'available':'unavailable',video:null,verifiedAt:new Date().toISOString()};
    if(chosen){
      const src=await signMediaUrl({url:chosen.url,id:chosen.id,kind:'video'},pid,env.MEDIA_SIGNING_KEY);
      let poster='';
      if(playableSource(chosen.poster,'image'))poster=await signMediaUrl(
        {url:chosen.poster,id:chosen.id,kind:'image'},pid,env.MEDIA_SIGNING_KEY);
      result.video={id:chosen.id,name:String(chosen.name||'Supplier product video').slice(0,120),
        duration:Number(chosen.duration)||null,src,poster};
    }
    ctx.waitUntil(cache.put(key,new Response(JSON.stringify(result),{
      headers:{'Cache-Control':'public, max-age='+(chosen?900:1800)}})).catch(()=>{}));
    return send(result);
  }catch(e){
    console.warn(JSON.stringify({event:'cj_video_resolver_failed',name:e?.name||'Error'}));
    return send({pid,status:'provider_unavailable',video:null},503);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (new URL(request.url).pathname === '/cjv/resolve') return resolveCJVideo(request, env, ctx);
    if (!['GET','HEAD'].includes(request.method)) return fail(405,'Method not allowed',{'Allow':'GET, HEAD'});
    let claim;try{claim=await authorize(request,env);}catch{return fail(403,'Media link is invalid or expired. Reopen the product video.');}
    const rangeValue=request.headers.get('Range');
    if(rangeValue && !/^bytes=(\d*)-(\d*)$/.test(rangeValue))return fail(416,'Only one byte range is supported.');
    const hash=hex(await crypto.subtle.digest('SHA-256',encoder.encode(claim.url)));
    const key=new URL(`/cjv/cache/${hash}.${claim.ext}`,request.url).href, cache=caches.default;
    const headers=new Headers();for(const n of ['Range','If-None-Match','If-Modified-Since','If-Range'])if(request.headers.has(n))headers.set(n,request.headers.get(n));
    // Cache API creates 206/304 from a complete cached object with Content-Length.
    let cached;
    if(rangeValue&&headers.has('If-Range')){
      const complete=await cache.match(new Request(key));
      if(complete&&!ifRangeMatches(headers.get('If-Range'),complete.headers))cached=complete;
      else{await complete?.body?.cancel();cached=await cache.match(new Request(key,{headers}));}
    }else cached=await cache.match(new Request(key,{headers}));
    if(cached){const h=new Headers(cached.headers);h.set('X-CJ-Media-Cache','HIT');return new Response(request.method==='HEAD'?null:cached.body,{status:cached.status,headers:h});}
    try {
      headers.set('Referer','https://developers.cjdropshipping.com/');headers.set('Accept',claim.kind==='video'?'video/*':'image/*');headers.set('Accept-Encoding','identity');
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),25000);let upstream;
      try{upstream=await fetch(claim.url,{method:request.method,headers,redirect:'manual',signal:controller.signal,cf:{cacheEverything:false}});}finally{clearTimeout(timer);}
      if(upstream.status===304)return new Response(null,{status:304,headers:{'Cache-Control':'public, max-age=3600'}});
      if(upstream.status===416)return fail(416,'Range not satisfiable',{'Content-Range':upstream.headers.get('Content-Range')||'bytes */*'});
      if(![200,206].includes(upstream.status)){await upstream.body?.cancel();return fail(502,'CJ media is temporarily unavailable.');}
      const h=cleanHeaders(upstream,claim), length=Number(h.get('Content-Length'));
      const contentRange=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(h.get('Content-Range')||'');
      const size=upstream.status===206 ? Number(contentRange?.[3]) : length;
      if(!Number.isSafeInteger(size)||size<1||size>MAX||!Number.isSafeInteger(length)||length<1||length>MAX || (upstream.status===206 && (!rangeValue||!contentRange||Number(contentRange[2])-Number(contentRange[1])+1!==length))){await upstream.body?.cancel();return fail(502,'CJ media size could not be validated.');}
      let selected;try{selected=ifRangeMatches(headers.get('If-Range'),upstream.headers)?range(rangeValue,size):null;}catch{await upstream.body?.cancel();return fail(416,'Range not satisfiable',{'Content-Range':`bytes */${size}`});}
      if(upstream.status===206&&(!selected||Number(contentRange[1])!==selected.start||Number(contentRange[2])!==selected.end)){await upstream.body?.cancel();return fail(502,'CJ returned an inconsistent byte range.');}
      h.set('X-CJ-Media-Cache','MISS');
      if(request.method==='HEAD'){await upstream.body?.cancel();return new Response(null,{status:upstream.status,headers:h});}
      if(upstream.status===206)return new Response(upstream.body,{status:206,headers:h}); // Never cache a partial object.
      if(selected){h.set('Content-Range',`bytes ${selected.start}-${selected.end}/${size}`);h.set('Content-Length',String(selected.end-selected.start+1));return new Response(slice(upstream.body,selected.start,selected.end),{status:206,headers:h});}
      const response=new Response(upstream.body,{status:200,headers:h});
      ctx.waitUntil(cache.put(new Request(key),response.clone()).catch(()=>console.warn('cj_media_cache_write_failed')));
      return response;
    } catch {return fail(502,'CJ media is temporarily unavailable. Please retry.');}
  }
};

