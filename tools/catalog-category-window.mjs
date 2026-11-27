// Read-only category window. Explicit index required; no fallback full-table scan.
// Each response examines at most 100 snapshot records. A short/empty result page
// may still have next: the cursor represents examined records, not matches.
export const SQL="SELECT sku,cj_product_id,name,categories FROM catalog_products_cj INDEXED BY idx_cj_category_pid_sku WHERE categories=? AND (cj_product_id,sku)>(?,?) ORDER BY cj_product_id,sku LIMIT ?";
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().trim();
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'};
const reply=(x,status=200)=>new Response(JSON.stringify(x),{status,headers});
export function validate(u){
 const allowed=new Set(['category','after_pid','after_sku','q']);
 for(const k of u.searchParams.keys())if(!allowed.has(k)||u.searchParams.getAll(k).length!==1)throw Error('invalid_params');
 const category=u.searchParams.get('category')||'',pid=u.searchParams.get('after_pid')||'',sku=u.searchParams.get('after_sku')||'',q=u.searchParams.get('q')||'';
 if(!category||category.length>160||pid.length>120||sku.length>120||q.length>160||Boolean(pid)!==Boolean(sku)||/[\u0000-\u001f]/.test(category+pid+sku+q))throw Error('invalid_scope');
 return {category,pid,sku,q};
}
export function selectWindow(rows,opts){
 const window=rows.slice(0,100),words=norm(opts.q).split(/\s+/).filter(Boolean),last=window.at(-1);
 const items=window.filter(r=>words.every(w=>norm(r.name+' '+r.sku).includes(w))).map(r=>({id:r.cj_product_id,sku:r.sku,title:r.name,category:r.categories,stockVerified:false,deliveryVerified:false,priceVerified:false,purchasable:false}));
 return {items,examined:window.length,next:rows.length>100&&last?{after_pid:last.cj_product_id,after_sku:last.sku}:null,scope:'source snapshot; filters apply within bounded window; no live price/stock/delivery claims'};
}
export default {async fetch(req,env){
 const u=new URL(req.url);if(u.pathname!=='/api/catalog-search/v1')return reply({error:'not_found'},404);if(req.method!=='GET')return reply({error:'method_not_allowed'},405);
 let opts;try{opts=validate(u)}catch{return reply({error:'invalid_params'},400)}
 if(env.CATALOG_SEARCH_ENABLED!=='true')return reply({error:'release_disabled'},503);
 try{const r=await env.DB.prepare(SQL).bind(opts.category,opts.pid,opts.sku,101).all();if(!r.success||!Array.isArray(r.results)||r.results.length>101)throw Error('invalid_rows');return reply(selectWindow(r.results,opts));}catch{return reply({error:'catalog_index_or_database_unavailable'},503)}
}};
