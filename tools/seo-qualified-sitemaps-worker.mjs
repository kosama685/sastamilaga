/**
 * Sasta Milaga: quality-gated D1 global product sitemaps.
 *
 * Safe scope: GET/HEAD XML endpoints only; never writes D1, offers, products or orders.
 * Serves only product URLs whose underlying public PDP Worker allows indexing:
 * cj_product_enrichment.seo_approved=1 and description_text length >= 100.
 *
 * Routes (attach to this Worker, leaving every commerce route unchanged):
 *   /sitemap-global-qualified.xml
 *   /sitemaps/global-qualified/*
 *
 * An index covers up to ceil(451812 / 5000)=91 child sitemaps when the whole source
 * is eligible. Being present in D1 alone does NOT make a record eligible.
 */
const ORIGIN = 'https://sastamilaga.com';
const INDEX_PATH = '/sitemap-global-qualified.xml';
const CHILD_PATH = /^\/sitemaps\/global-qualified\/([1-9][0-9]{0,3})\.xml$/;
const PAGE_SIZE = 5000;
const MAX_PAGES = 1000;
const FILTER = "FROM cj_product_enrichment e INNER JOIN catalog_products_cj p ON p.cj_product_id=e.cj_product_id WHERE e.seo_approved=1 AND LENGTH(COALESCE(e.description_text,''))>=100 AND LENGTH(TRIM(COALESCE(p.name,'')))>0 AND p.images LIKE 'https://%' AND ((LENGTH(p.cj_product_id)=19 AND p.cj_product_id NOT GLOB '*[^0-9]*') OR (LENGTH(p.cj_product_id)=36 AND SUBSTR(p.cj_product_id,9,1)='-' AND SUBSTR(p.cj_product_id,14,1)='-' AND SUBSTR(p.cj_product_id,19,1)='-' AND SUBSTR(p.cj_product_id,24,1)='-' AND REPLACE(p.cj_product_id,'-','') NOT GLOB '*[^0-9A-Fa-f]*'))";
const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>';
const XML_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';

function xmlEscape(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
}
function slugify(v) {
  return String(v || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')
    .slice(0,130).replace(/-+$/,'') || 'product';
}
function response(body, status=200, method='GET', contentType='application/xml; charset=utf-8') {
  return new Response(method==='HEAD'?null:body, {
    status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': status===200?'public, max-age=300, s-maxage=600':'no-store',
      'X-Content-Type-Options':'nosniff',
      ...(status!==200?{'X-Robots-Tag':'noindex'}:{})
    }
  });
}
async function eligibleCount(db) {
  const res = await db.prepare('SELECT COUNT(*) AS n ' + FILTER).first();
  const n=Number(res?.n);
  if(!Number.isSafeInteger(n) || n<0) throw Error('bad_count');
  return n;
}
export default {
  async fetch(request,env) {
    const u=new URL(request.url),method=request.method.toUpperCase();
    if(method!=='GET'&&method!=='HEAD') {
      return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
    }
    if(!env.DB) return response('Catalogue unavailable',503,method,'text/plain; charset=utf-8');
    const isIndex=u.pathname===INDEX_PATH;
    const match=u.pathname.match(CHILD_PATH);
    if(!isIndex&&!match) return response('Not found',404,method,'text/plain; charset=utf-8');
    try {
      const n=await eligibleCount(env.DB);
      const pages=Math.ceil(n/PAGE_SIZE);
      if(pages>MAX_PAGES) return response('Sitemap capacity exceeded',503,method,'text/plain; charset=utf-8');
      if(isIndex){
        const parts=[];
        for(let i=1;i<=pages;i++){
          parts.push('<sitemap><loc>'+ORIGIN+'/sitemaps/global-qualified/'+i+'.xml</loc></sitemap>');
        }
        return response(XML_DECL+'<sitemapindex xmlns="'+XML_NS+'">'+parts.join('')+'</sitemapindex>',200,method);
      }
      const page=Number(match[1]);
      if(page>pages || page<1) return response('Not found',404,method,'text/plain; charset=utf-8');
      const sql='SELECT p.cj_product_id AS id, p.name AS name '+FILTER+
        ' ORDER BY e.cj_product_id LIMIT ? OFFSET ?';
      const result=await env.DB.prepare(sql).bind(PAGE_SIZE,(page-1)*PAGE_SIZE).all();
      const records=result?.results || [];
      if(records.length>PAGE_SIZE) throw Error('too_many_rows');
      const urls=records.map(p=>{
        const id=String(p.id || '').toUpperCase();
        if(!/^(?:[A-F0-9]{8}-(?:[A-F0-9]{4}-){3}[A-F0-9]{12}|[0-9]{19})$/.test(id)){
          throw Error('bad_product_id');
        }
        return '<url><loc>'+xmlEscape(ORIGIN+'/global-shop/p/'+id+'/'+slugify(p.name)+'/')+'</loc></url>';
      });
      return response(XML_DECL+'<urlset xmlns="'+XML_NS+'">'+urls.join('')+'</urlset>',200,method);
    }catch(e){
      console.error(JSON.stringify({event:'qualified_sitemap_error',reason:String(e?.message||'unknown')}));
      return response('Catalogue temporarily unavailable',503,method,'text/plain; charset=utf-8');
    }
  }
};
