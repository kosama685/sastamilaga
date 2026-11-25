// Read-only sparse evidence feed; not a catalog or checkout API.
const SQL=`WITH keys AS (
 SELECT product_id FROM catalog_facet_attributes WHERE category_slug=?1 AND product_id>?3 AND observed_at<=?4 AND expires_at>?4
 UNION
 SELECT product_id FROM catalog_facet_variant_market WHERE category_slug=?1 AND country=?2 AND product_id>?3 AND ((stock_observed_at<=?4 AND stock_expires_at>?4) OR (delivery_observed_at<=?4 AND delivery_expires_at>?4))
 ORDER BY product_id LIMIT 201
), market AS (
 SELECT v.product_id,
 MAX(CASE WHEN stock_state='WAREHOUSE_POSITIVE' AND stock_observed_at<=?4 AND stock_expires_at>?4 THEN stock_expires_at END) stock_until,
 MAX(CASE WHEN delivery_state='QUOTED' AND delivery_observed_at<=?4 AND delivery_expires_at>?4 THEN delivery_expires_at END) delivery_until,
 MAX(CASE WHEN stock_state='WAREHOUSE_POSITIVE' AND delivery_state='QUOTED' AND stock_observed_at<=?4 AND delivery_observed_at<=?4 AND stock_expires_at>?4 AND delivery_expires_at>?4 THEN MIN(stock_expires_at,delivery_expires_at) END) both_until
 FROM catalog_facet_variant_market v JOIN keys k ON k.product_id=v.product_id
 WHERE v.category_slug=?1 AND v.country=?2 GROUP BY v.product_id
)
 SELECT k.product_id id,a.brand,a.model,a.expires_at attribute_until,m.stock_until,m.delivery_until,m.both_until
 FROM keys k LEFT JOIN catalog_facet_attributes a ON a.category_slug=?1 AND a.product_id=k.product_id AND a.observed_at<=?4 AND a.expires_at>?4
 LEFT JOIN market m ON m.product_id=k.product_id ORDER BY k.product_id`;
export {SQL};
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'};
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.pathname!=='/api/catalog-facets/v1')return respond({error:'not_found'},404);
 if(req.method!=='GET')return respond({error:'method_not_allowed'},405);
 const cat=u.searchParams.get('category')||'',country=u.searchParams.get('country')||'',after=u.searchParams.get('after')||'';
 if(!/^[a-z0-9-]{1,120}$/.test(cat)||!/^[A-Z]{2}$/.test(country)||!/^[A-Za-z0-9-]{0,64}$/.test(after)||[...u.searchParams.keys()].some(k=>!['category','country','after'].includes(k)))return respond({error:'invalid_scope'},400);
 try{
 const now=Date.now(),result=await env.DB.prepare(SQL).bind(cat,country,after,now).all(),all=result.results;
 if(!Array.isArray(all)||all.length>201)throw Error('invalid_result');
 const rows=all.slice(0,200).map(x=>({id:x.id,country,brand:x.brand||'',model:x.model||'',attributeUntil:x.attribute_until||0,stock:x.stock_until>now,stockUntil:x.stock_until||0,delivery:x.delivery_until>now,deliveryUntil:x.delivery_until||0,both:x.both_until>now,bothUntil:x.both_until||0}));
 return respond({schema:1,category:cat,country,rows,next:all.length>200?rows.at(-1).id:null});
 }catch{return respond({error:'evidence_unavailable'},503);}
}};
