/**
 * Legacy global product sitemap migration.
 * The 451,812-row 2026-11-05 snapshot cannot substantiate active inventory,
 * checkout availability or unique approved SEO content. Search engines should
 * use the quality-gated qualified product sitemap instead.
 * Commerce, customer sessions and Google Merchant feeds are untouched.
 */
const TARGET='https://sastamilaga.com/sitemap-global-qualified.xml';
const LEGACY=new Set(['/sitemap-global-products.xml','/global-shop/sitemap.xml']);
const OLD_CHILD=/^\/sitemaps\/global\/[a-z0-9-]+\.xml$/;
export default {async fetch(req){
 const u=new URL(req.url);
 if(!['GET','HEAD'].includes(req.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 if(LEGACY.has(u.pathname)||OLD_CHILD.test(u.pathname)){
  return new Response(null,{status:301,headers:{Location:TARGET,'Cache-Control':'public, max-age=300','X-Content-Type-Options':'nosniff'}});
 }
 return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});
}};
