// Small, reviewable patch for the existing bounded static HTML renderer.
export const ROBOTS = `User-agent: *
Allow: /
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /wp-login.php
Disallow: /wp-json/
Disallow: /api/
Disallow: /wc-api/
Disallow: /admin/
Disallow: /backup/
Disallow: /private/
Disallow: /staging/
Disallow: /test/
Disallow: /.git/

Sitemap: https://sastamilaga.com/sitemap.xml
`;

export function indexingRedirect(request) {
 if(!['GET','HEAD'].includes(request.method))return null;
 const u=new URL(request.url);
 // Leave session mutations, signed callbacks and all WooCommerce routes alone.
 if(['add-to-cart','wc-ajax','wc-api','key','order_key','preview'].some(k=>u.searchParams.has(k)))return null;
 if(/^\/(?:cart|checkout|my-account|wp-json|wp-admin|api|smcs-oauth)(?:\/|$)/i.test(u.pathname))return null;
 let path=u.pathname;
 if(path==='/index.html')path='/';
 if(['/global','/global/','/global-shop','/global-shop/'].includes(path))path='/c/global/index.html';
 if(/^\/(?:shop|about|contact|privacy|terms|returns|shipping|videos|visa|travel|tours|faq|wishlist|search)$/.test(path))path+='/';
 if(u.protocol==='https:'&&u.hostname==='sastamilaga.com'&&path===u.pathname)return null;
 if(!['sastamilaga.com','www.sastamilaga.com'].includes(u.hostname))return null;
 return new Response(null,{status:301,headers:{Location:'https://sastamilaga.com'+path+u.search,'Cache-Control':'public, max-age=300','X-Sasta-SEO':'canonical-url-v1'}});
}

export function indexingHead(html,url) {
 const canonical='https://sastamilaga.com'+url.pathname;
 // Static public HTML is already capped at 1.25 MB by the existing renderer.
 // Only the actual head is changed; no client request, script or stylesheet is added.
 return html.replace(/(<head\b[^>]*>)([\s\S]*?)(<\/head>)/i,(_,open,head,close)=>{
  head=head.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi,'');
  return open+head+'<link rel="canonical" href="'+canonical.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'">'+close;
 });
}

export function patchIndexingSource(source) {
 const replaceOnce=(from,to)=>{
  if(source.split(from).length!==2)throw Error('Live source changed; patch anchor is not unique');
  source=source.replace(from,to);
 };
 const robots=source.match(/^const ROBOTS_TEXT=.*;$/m)?.[0];
 if(!robots)throw Error('Live robots constant not found');
 replaceOnce(robots,'const ROBOTS_TEXT='+JSON.stringify(ROBOTS)+';');
 const sync=source.match(/^const SEO_CANONICAL_SYNC=.*;$/m)?.[0];
 if(!sync)throw Error('Canonical client synchronizer not found');
 replaceOnce(sync,'const SEO_CANONICAL_SYNC=""; // Canonicals are emitted in the response head.');
 replaceOnce("   headers.set('content-security-policy',", "   html=indexingHead(html,url);\n   headers.set('content-security-policy',");
 replaceOnce('export default {async fetch(request,env,ctx){',
  indexingRedirect.toString()+'\n'+indexingHead.toString()+'\nexport default {async fetch(request,env,ctx){\n const canonicalRedirect=indexingRedirect(request);if(canonicalRedirect)return canonicalRedirect;');
 return source;
}

export function patchIndexingLinks(source) {
 const old="if(path==='/global-shop'||path==='/global-shop/')path='/c/global/index.html';";
 const next="if(['/global','/global/','/global-shop','/global-shop/'].includes(path))path='/c/global/index.html';";
 if(source.split(old).length!==2)throw Error('Expected reviewed global alias guard missing');
 source=source.replace(old,next);
 // Handle literal HTML as well as JSON-encoded HTML constants in the live renderer.
 for(const from of ['/global-shop/','/global/']){
  source=source.replaceAll('href="'+from+'"','href="/c/global/index.html"');
  source=source.replaceAll('href=\\"'+from+'\\"','href=\\"/c/global/index.html\\"');
 }
 return source;
}
