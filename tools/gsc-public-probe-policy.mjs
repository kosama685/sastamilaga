// Conservative, read-only URL admission for the historical SEO audit.
const ACTION=new Set(['add-to-cart','sm_buy_now','wc-ajax','order_key','remove_item','undo_item','_wpnonce','pay_for_order','cancel_order','action','rest_route','key']);
const PUBLIC_QUERY=new Set(['p','page_id','post_type','orderby','min_price','max_price','paged','product-page','s','lang','currency','utm_source','utm_medium','utm_campaign','utm_content','utm_term']);
export const SKIP=new Set(['UNTRUSTED_EXTERNAL_URL','NON_LITERAL_URL_PATTERN','SHOPPING_ACTION_DO_NOT_CRAWL','PRIVATE_COMMERCE_DO_NOT_INDEX','ASSET_NOT_WEB_PAGE','UNKNOWN_QUERY_DO_NOT_PROBE']);
export function classify(url){
 let u,p;
 try{u=new URL(url);if(u.protocol!=='https:'||u.host!=='sastamilaga.com'||u.username||u.password)return 'UNTRUSTED_EXTERNAL_URL';p=decodeURIComponent(u.pathname).toLowerCase();if(p.includes('%')||p.includes('*')||p.includes('\\')||u.hash||/[\u0000-\u0020]/.test(p))return 'NON_LITERAL_URL_PATTERN';}catch{return 'NON_LITERAL_URL_PATTERN';}
 for(const [raw] of u.searchParams){const k=raw.toLowerCase();if(ACTION.has(k)||k.includes('%')||k.includes('['))return 'SHOPPING_ACTION_DO_NOT_CRAWL';}
 const segments=p.split('/').filter(Boolean);
 if(segments.some(x=>['cart','checkout','my-account','account','wp-admin','wp-login.php','wp-json','api','order-pay','order-received','thank-you','logout'].includes(x)))return 'PRIVATE_COMMERCE_DO_NOT_INDEX';
 if(p.startsWith('/wp-content/')||/\.(?:jpg|jpeg|png|gif|webp|svg|ico|css|js|woff2?|pdf|zip)$/i.test(p))return 'ASSET_NOT_WEB_PAGE';
 for(const [raw] of u.searchParams){const k=raw.toLowerCase();if(!PUBLIC_QUERY.has(k)&&!/^attribute_[a-z0-9_-]+$/.test(k))return 'UNKNOWN_QUERY_DO_NOT_PROBE';}
 if(u.search)return 'QUERY_VARIANT_REVIEW_CANONICAL';
 if(p.startsWith('/ur/'))return 'URDU_CONTENT';
 for(const [prefix,kind] of [['/product/','PRODUCT_PAGE'],['/product-category/','CATEGORY_PAGE'],['/product-tag/','TAG_PAGE'],['/videos/','VIDEO_PAGE'],['/blog/','BLOG_PAGE'],['/visa/','VISA_PAGE']])if(p.startsWith(prefix))return kind;
 return 'OTHER_PUBLIC_PAGE';
}
export function redirectReview(original,final,htmlLang=''){
 const a=new URL(original),b=new URL(final);
 if(a.pathname.startsWith('/ur/')&&!b.pathname.startsWith('/ur/')&&!/^ur(?:-|$)/i.test(htmlLang))return 'REDIRECT_LANGUAGE_REVIEW';
 if(a.pathname!=='/'&&['/','/blog/','/visa/','/shop/','/live-tv/'].includes(b.pathname)&&a.pathname!==b.pathname)return 'REDIRECT_BROAD_TARGET_REVIEW';
 return 'REDIRECT_EQUIVALENCE_REVIEW';
}
