/* Sasta Milaga CJ shipping Worker (Cloudflare Workers).
 *
 * POST /api/cj/shipping  { country: "PK", zip?: "54000", items: [{ pid, sku?, qty }] }
 *   -> { country, currency: "USD", methods: [{ name, price, days }], unavailable?: [...] }
 * GET  /api/cj/health    -> configuration check (never returns the key)
 *
 * The CJ API key is a Cloudflare secret (CJ_API_KEY). It never reaches the browser or GitHub.
 * Access tokens (valid ~15 days, CJ rate-limits token requests) and product variant IDs are cached
 * with the Cache API so normal traffic makes one freight call per quote. */

const CJ = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_KEY = 'https://cache.internal/cj-token';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || 'https://kosama685.github.io').split(',').map(s => s.trim());
    const cors = { 'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0], 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' };
    const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      if (url.pathname === '/api/cj/health') return json({ key: !!env.CJ_API_KEY, origins: allowed });
      if (url.pathname === '/api/cj/product' && req.method === 'GET') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await product(url.searchParams.get('pid'), env, ctx, json);
      }
      if (url.pathname === '/api/cj/videos' && req.method === 'GET') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await productVideos(url.searchParams.get('pid'), env, ctx, json);
      }
      if (url.pathname === '/api/cj/home-categories' && req.method === 'GET') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await homeCategories(env, ctx, json);
      }
      if (url.pathname === '/api/cj/home-rail' && req.method === 'GET') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await homeRail(url.searchParams, env, ctx, json);
      }
      if (url.pathname === '/api/cj/shipping' && req.method === 'POST') {
        if (origin && !allowed.includes(origin)) return json({ error: 'Origin not allowed' }, 403);
        return await quote(await req.json(), env, ctx, json);
      }
      return json({ error: 'Not found' }, 404);
    } catch (e) {
      return json({ error: 'Shipping service error', detail: String(e.message || e).slice(0, 200) }, 502);
    }
  }
};

/* CJ allows 1 request per second per account: wait and retry when it answers with its QPS limit. */
async function cj(path, init = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(CJ + path, init); const d = await r.json().catch(() => ({}));
    const limited = r.status === 429 || /QPS limit|Too Many Requests/i.test(d.message || '');
    if (!limited || attempt >= 3) return { r, d };
    await new Promise(res => setTimeout(res, 1100 * (attempt + 1)));
  }
}

async function cached(key) { const r = await caches.default.match(key); return r ? r.json() : null; }
async function store(key, data, ttl, ctx) {
  ctx.waitUntil(caches.default.put(key, new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${ttl}` } })));
}

async function token(env, ctx) {
  const c = await cached(TOKEN_KEY);
  if (c && c.token && Date.parse(c.expires) - Date.now() > 3600e3) return c.token;
  if (!env.CJ_API_KEY) throw new Error('CJ_API_KEY is not configured');
  const { r, d } = await cj('/authentication/getAccessToken', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: env.CJ_API_KEY }) });
  if (!d.result || !d.data || !d.data.accessToken) throw new Error(`CJ auth failed: ${d.message || r.status}`);
  const expires = d.data.accessTokenExpiryDate || new Date(Date.now() + 14 * 864e5).toISOString();
  const ttl = Math.max(3600, Math.floor((Date.parse(expires) - Date.now()) / 1000) - 3600);
  await store(TOKEN_KEY, { token: d.data.accessToken, expires }, ttl, ctx);
  return d.data.accessToken;
}

/* Variants (colour, size …) of a CJ product, from CJ's variant API; cached 6 hours. */
async function variantsOf(pid, tok, ctx) {
  const key = `https://cache.internal/cj-variants/${encodeURIComponent(pid)}`;
  const c = await cached(key); if (c) return c;
  const { d } = await cj(`/product/variant/query?pid=${encodeURIComponent(pid)}`, { headers: { 'CJ-Access-Token': tok } });
  const list = ((d && d.data) || []).map(v => ({
    vid: v.vid, sku: v.variantSku, key: v.variantKey || '', name: v.variantNameEn || v.variantName || '',
    price: Number(v.variantSellPrice) || 0, image: v.variantImage || '', weight: Number(v.variantWeight) || 0
  })).filter(v => v.vid);
  if (list.length) await store(key, list, 6 * 3600, ctx);
  return list;
}
/* CJ freight needs a variant ID (vid): use the one the customer picked, else the variant with the product SKU, else the first. */
async function vidFor(it, tok, ctx) {
  if (it.vid && /^[A-Za-z0-9-]{8,64}$/.test(String(it.vid))) return String(it.vid);
  const list = await variantsOf(String(it.pid), tok, ctx);
  if (!list.length) throw new ItemError(`No CJ variants found for product ${it.pid}`);
  return ((it.sku && list.find(x => x.sku === it.sku)) || list[0]).vid;
}
class ItemError extends Error {}

async function product(pid, env, ctx, json) {
  if (!/^[A-Za-z0-9-]{8,64}$/.test(String(pid || ''))) return json({ error: 'Invalid product id' }, 400);
  const tok = await token(env, ctx), variants = await variantsOf(pid, tok, ctx);
  return json({ pid, currency: 'USD', variants, ...(variants.length ? {} : { error: 'No variants found for this product' }) });
}

async function quote(body, env, ctx, json) {
  const country = String(body.country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) return json({ error: 'Choose a destination country' }, 400);
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return json({ error: 'No items' }, 400);
  const tok = await token(env, ctx);
  let products;
  try {
    products = await Promise.all(items.map(async it => ({ quantity: Math.min(99, Math.max(1, Math.floor(Number(it.qty) || 1))), vid: await vidFor(it, tok, ctx) })));
  } catch (e) {
    if (e instanceof ItemError) return json({ country, methods: [], error: e.message }, 200);
    throw e;
  }
  const qkey = `https://cache.internal/cj-freight/${country}/${body.zip || ''}/${products.map(p => p.vid + 'x' + p.quantity).join(',')}`;
  const hit = await cached(qkey); if (hit) return json({ ...hit, cached: true });
  // Variant lookups for several items run in parallel above; pause so the freight call respects CJ's 1/s limit.
  if (products.length > 1) await new Promise(res => setTimeout(res, 1100));
  const { d } = await cj('/logistic/freightCalculate', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': tok },
    body: JSON.stringify({ startCountryCode: env.START_COUNTRY || 'CN', endCountryCode: country, ...(body.zip ? { zip: String(body.zip) } : {}), products })
  });
  const methods = ((d && d.data) || []).map(m => ({ name: m.logisticName, price: Number(m.logisticPrice), days: m.logisticAging })).filter(m => m.name && m.price >= 0).sort((a, b) => a.price - b.price);
  const out = { country, currency: 'USD', methods, ...(methods.length ? {} : { error: d && d.message ? `No shipping method: ${d.message}` : 'No shipping method to this country' }) };
  if (methods.length) await store(qkey, out, 6 * 3600, ctx);
  return json(out);
}


/* Official CJ Video API (POST): CJ returns code 0, unlike many product endpoints.
 * Never substitute videoList IDs for media URLs. Only listed free/purchased
 * supplier video sources are eligible. Empty results are cached too. */
const VIDEO_HOSTS = new Set(['download-only-api.cjdropshipping.com','video-cf.cjdropshipping.com']);
const VIDEO_ID = /^(?:[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}|[0-9]{15,22})$/i;
function safeVideoUrl(raw, image=false) {
  try {
    const u=new URL(String(raw||''));
    if(u.protocol!=='https:'||!VIDEO_HOSTS.has(u.hostname)||u.port||u.username||u.password||u.hash||u.search)return '';
    if(!new RegExp(image?'\\.(?:jpg|jpeg|png|webp)$':'\\.(?:mp4|m4v|webm)$','i').test(u.pathname))return '';
    return u.href;
  } catch { return ''; }
}
export function eligibleCJVideos(rows) {
  if(!Array.isArray(rows))return [];
  const seen=new Set(),out=[];
  for(const v of rows.slice(0,60)){
    if(!v||v.videoState!=='ON_STATE'||!(String(v.isFree)==='1'||v.isBuy===true))continue;
    const id=String(v.videoId||v.id||'');
    if(!/^[A-Za-z0-9_-]{6,100}$/.test(id)||seen.has(id))continue;
    const url=safeVideoUrl(v.videoUrl);
    if(!url)continue;
    seen.add(id);
    out.push({id,url,poster:safeVideoUrl(v.coverURL,true),name:String(v.videoName||'Product video').slice(0,120),
      duration:Number(v.duration)>0&&Number(v.duration)<7200?Number(v.duration):null,
      videoType:Number.isInteger(v.videoType)?v.videoType:null,free:String(v.isFree)==='1'});
    if(out.length>=8)break;
  }
  return out;
}
async function productVideos(pid,env,ctx,json){
  pid=String(pid||'').toUpperCase();
  if(!VIDEO_ID.test(pid))return json({error:'invalid_product_id'},400);
  const key='https://cache.internal/cj-product-videos/'+pid;
  const previous=await cached(key);
  if(previous)return json({...previous,cached:true});
  const access=await token(env,ctx);
  const {r,d}=await cj('/product/queryVideosByProductId',{
    method:'POST',headers:{'CJ-Access-Token':access,'Content-Type':'application/json'},
    body:JSON.stringify({productId:pid})
  });
  if(!r.ok||d.success!==true||Number(d.code)!==0||!Array.isArray(d.data))
    return json({error:'cj_video_query_unavailable'},503);
  const videos=eligibleCJVideos(d.data);
  const result={pid,videos,eligibleCount:videos.length,provider:'CJ',checkedAt:new Date().toISOString()};
  await store(key,result,videos.length?6*3600:3600,ctx);
  return json(result);
}


/* CJ live homepage rails.
 * This is an additive discovery feature; it never deletes existing local
 * homepage sections, changes local prices, or creates purchase orders.
 * Query scope is checked against CJ's real first-level category tree.
 * No countryCode is sent without an explicit ship-from selection. */
const SAFE_CATEGORY_ID=/^(?:[0-9]{15,22}|[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12})$/i;
export function normalizeCJCategoryGroups(rows){
 if(!Array.isArray(rows))return [];
 const out=[],seen=new Set();
 for(const group of rows){
  const name=String(group?.categoryFirstName||'').trim();
  if(!name||seen.has(name.toLowerCase()))continue;
  const leafs=[];
  for(const second of Array.isArray(group.categoryFirstList)?group.categoryFirstList:[]){
   for(const cat of Array.isArray(second.categorySecondList)?second.categorySecondList:[]){
    const id=String(cat.categoryId||'');
    if(SAFE_CATEGORY_ID.test(id)&&!leafs.some(x=>x.id===id))
     leafs.push({id,name:String(cat.categoryName||'').slice(0,100)});
   }
  }
  if(!leafs.length)continue;
  seen.add(name.toLowerCase());
  out.push({id:leafs[0].id,name:name.slice(0,110),leafCount:leafs.length,leaves:leafs.slice(0,5)});
  if(out.length>=100)break;
 }
 return out;
}
export function buildCJHomeListPath(categoryId,countryCode=''){
 if(!SAFE_CATEGORY_ID.test(categoryId))throw new Error('invalid CJ category');
 if(countryCode&&!/^[A-Z]{2}$/.test(countryCode))throw new Error('invalid country');
 const u=new URLSearchParams({categoryId,page:'1',size:'10',features:'enable_category'});
 if(countryCode)u.set('countryCode',countryCode);
 return '/product/listV2?'+u.toString();
}
export function normalizeCJHomeProducts(rows){
 if(!Array.isArray(rows))return [];
 const out=[],seen=new Set();
 for(const item of rows){
  const id=String(item?.id||'').toUpperCase(),title=String(item?.nameEn||'').trim();
  if(!SAFE_CATEGORY_ID.test(id)||!title||seen.has(id))continue;
  const image=String(item?.bigImage||'');
  if(!/^https:\/\/[A-Za-z0-9.-]+\/\S+$/.test(image))continue;
  const minMax=String(item.sellPrice||'').match(/\d+(?:\.\d+)?/g)||[];
  const lo=minMax.length?Number(minMax[0]):null,hi=minMax.length>1?Number(minMax[1]):lo;
  seen.add(id);
  out.push({id,title:title.slice(0,180),image,
   priceMin:lo!==null&&Number.isFinite(lo)&&lo>0?lo:null,
   priceMax:hi!==null&&Number.isFinite(hi)&&hi>0?hi:null,
   hasVideo:Boolean(item.isVideo===1||item.isVedio===1),
   category:String(item.threeCategoryName||'').slice(0,90),
   sku:String(item.sku||'').slice(0,90)});
  if(out.length===10)break;
 }
 return out;
}
async function cjCategoryTree(env,ctx){
 const key='https://cache.internal/cj-live-home-categories-v1';
 const existing=await cached(key);
 if(existing?.groups?.length)return existing;
 const tok=await token(env,ctx);
 const {r,d}=await cj('/product/getCategory',{headers:{'CJ-Access-Token':tok}});
 if(!r.ok||d.result!==true||!Array.isArray(d.data)){
  console.error(JSON.stringify({event:'cj_home_categories_error',status:r.status,code:d.code,message:String(d.message||'').slice(0,140),requestId:d.requestId||null}));
  return {error:'cj_category_unavailable',requestId:d.requestId||null};
 }
 const result={groups:normalizeCJCategoryGroups(d.data),checkedAt:new Date().toISOString(),source:'CJ API 2.0'};
 if(result.groups.length)await store(key,result,12*3600,ctx);
 return result;
}
async function homeCategories(env,ctx,json){
 const categories=await cjCategoryTree(env,ctx);
 return categories.error?json(categories,503):json(categories);
}
async function homeRail(search,env,ctx,json){
 const groupId=String(search.get('categoryId')||'').toUpperCase();
 const country=String(search.get('countryCode')||'').toUpperCase();
 if(!SAFE_CATEGORY_ID.test(groupId)||country&&!/^[A-Z]{2}$/.test(country))
  return json({error:'invalid_filters'},400);
 const categories=await cjCategoryTree(env,ctx);
 if(categories.error)return json(categories,503);
 const group=categories.groups.find(g=>g.id.toUpperCase()===groupId);
 if(!group)return json({error:'unknown_category'},404);
 const key='https://cache.internal/cj-home-rail-v1/'+groupId+'/'+(country||'ALL');
 const previous=await cached(key);
 if(previous)return json({...previous,cached:true});
 const tok=await token(env,ctx);
 let lastRequestId=null;
 // Try one additional known leaf only when the first leaf has no results.
 for(const leaf of group.leaves.slice(0,2)){
  const path=buildCJHomeListPath(leaf.id,country);
  const {r,d}=await cj(path,{headers:{'CJ-Access-Token':tok}});
  lastRequestId=d.requestId||null;
  if(!r.ok||d.result!==true||!d.data){
   console.error(JSON.stringify({event:'cj_home_rail_query_error',status:r.status,code:d.code,
     message:String(d.message||'').slice(0,140),requestId:lastRequestId,category:leaf.id}));
   return json({error:'cj_rail_unavailable',requestId:lastRequestId},503);
  }
  const rows=(Array.isArray(d.data.content)?d.data.content:[]).flatMap(x=>Array.isArray(x?.productList)?x.productList:[]);
  const products=normalizeCJHomeProducts(rows);
  if(products.length){
   const result={category:group.name,categoryId:group.id,leaf:leaf.name,countryCode:country||null,
    products,count:products.length,requested:10,source:'CJ API 2.0',checkedAt:new Date().toISOString()};
   await store(key,result,30*60,ctx);
   return json(result);
  }
 }
 const empty={category:group.name,categoryId:group.id,countryCode:country||null,
  products:[],count:0,requested:10,source:'CJ API 2.0',checkedAt:new Date().toISOString()};
 await store(key,empty,10*60,ctx);
 return json(empty);
}
