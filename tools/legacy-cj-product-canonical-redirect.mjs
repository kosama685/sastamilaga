/**
 * SEO migration: legacy /global/p/category/id/slug -> D1 canonical product.
 * Removes dead supplier media players without proxying CJ 403 media.
 * Does not touch /cart, /checkout, Merchant feeds, sitemaps or WordPress.
 * Preserve old route assignment as one-step rollback target.
 */
const ROOT='https://sastamilaga.com';
const URL_RE=/^\/global\/p\/([a-z0-9-]{1,140})\/([0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})(?:\/([a-z0-9-]{1,180}))?\/?$/i;
const ID_RE=/^(?:[0-9]{19}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i;
const slug=t=>String(t||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,130).replace(/-+$/,'')||'product';
const SNAPSHOT_VERSION='2026-11-05';
function bucket(id){let h=2166136261;for(let i=0;i<id.length;i++)h=Math.imul(h^id.charCodeAt(i),16777619)>>>0;return(h>>>0)&1023}
async function fromSnapshot(id){
 const url='https://kosama685.github.io/sastamilaga/data/cj/lookup/'+bucket(id).toString(16).padStart(3,'0')+'.json';
 const r=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),cf:{cacheEverything:true,cacheTtl:300}});
 if(!r.ok||Number(r.headers.get('content-length')||0)>350000)throw Error('snapshot_read_unavailable');
 const t=await r.text();if(t.length>350000)throw Error('oversized_catalog_snapshot');
 const d=JSON.parse(t);if(d.snapshot!==SNAPSHOT_VERSION)throw Error('snapshot_version_mismatch');
 const x=d.items?.[id];return Array.isArray(x)&&typeof x[1]==='string'&&x[1].trim()?x[1]:null;
}
async function fallbackRedirect(id,method){
 try{const name=await fromSnapshot(id);if(!name)return fail(404,'Product not found',method);
  return Response.redirect(ROOT+'/global-shop/p/'+id+'/'+slug(name)+'/',301);}
 catch(e){console.error(JSON.stringify({event:'legacy_product_snapshot_failed',type:e?.name||'Error'}));return fail(503,'Catalogue recovery temporarily unavailable',method)}
}

function fail(status,title,method){const body='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+title+' | Sasta Milaga</title><meta name="robots" content="noindex,follow"></head><body><main><h1>'+title+'</h1><p><a href="/c/global/index.html">Browse verified product categories</a></p></main></body></html>';return new Response(method==='HEAD'?null:body,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex,follow','x-content-type-options':'nosniff'}})}
export default {
 async fetch(req,env){
  if(!['GET','HEAD'].includes(req.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD','cache-control':'no-store'}});
  const u=new URL(req.url);
  const m=u.pathname.match(URL_RE);
  if(!m)return fail(404,'Product page not found',req.method);
  const id=m[2].toUpperCase();
  if(!ID_RE.test(id))return fail(404,'Product reference invalid',req.method);
  if(!env.DB)return fallbackRedirect(id,req.method);
  try{
   const p=await env.DB.prepare('SELECT cj_product_id,name FROM catalog_products_cj WHERE cj_product_id=? LIMIT 1').bind(id).first();
   if(!p||!p.name)return fail(404,'Product not found',req.method);
   const canonical=ROOT+'/global-shop/p/'+encodeURIComponent(String(p.cj_product_id).toUpperCase())+'/'+slug(p.name)+'/';
   return Response.redirect(canonical,301);
  }catch(e){
   console.error(JSON.stringify({event:'legacy_product_redirect_error',error_type:e?.name||'Error'}));
   return fallbackRedirect(id,req.method);
  }
 }
};
