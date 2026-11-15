// Additive, reversible deployment. Does not rewrite checkout or payment services.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID,stage=process.env.CJ_STAGE||'preview';
if(!token||!account)throw Error('Existing Cloudflare deployment credentials are required');
const worker=stage==='preview'?'sasta-cj-storefront-preview-v1':'sasta-cj-storefront-v1';
async function api(path,init={}){const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error('Cloudflare HTTP '+r.status+' '+path+' '+(await r.text()).slice(0,250));return r.json();}
const zone=(await api('/zones?name=sastamilaga.com')).result[0];if(!zone)throw Error('Exact zone is unavailable');
const routes=(await api('/zones/'+zone.id+'/workers/routes')).result;
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/cj-route-backup.json',JSON.stringify({at:new Date().toISOString(),routes},null,2));
if(stage==='rollback'){
 const installed=routes.filter(r=>r.script===worker&&!r.pattern.includes('/__cj-preview/')&&!r.pattern.includes('/assets/js/'));
 const originals={'sastamilaga.com/*':'sasta-canonical-sync-v11','sastamilaga.com/product/*':'sastamilaga-redirects','sastamilaga.com/global/p/*':'sasta-global-legacy-resilient-v2','sastamilaga.com/global-shop/p/*':'sasta-global-product-design-v6','sastamilaga.com/c/global/*':'sasta-global-category-seo-edge-v1','sastamilaga.com/sitemap-global-qualified.xml':'sasta-qualified-sitemaps-quota-v2','sastamilaga.com/sitemaps/global-qualified/*':'sasta-qualified-sitemaps-quota-v2'};
 for(const r of installed){if(originals[r.pattern])await api(`/zones/${zone.id}/workers/routes/${r.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:r.id,pattern:r.pattern,script:originals[r.pattern]})});else await api(`/zones/${zone.id}/workers/routes/${r.id}`,{method:'DELETE'});}
 fs.writeFileSync('artifacts/cj-rollback.json',JSON.stringify({at:new Date().toISOString(),routes:installed.map(r=>r.pattern)},null,2));console.log('Previous storefront routing restored; checkout routes were not changed.');process.exit(0);
}
const modules=[['worker.js','edge/cj-storefront.mjs'],['cj-render.mjs','edge/cj-render.mjs'],['cj-assets.mjs','edge/cj-assets.mjs']];
const form=new FormData();form.append('metadata',JSON.stringify({main_module:'worker.js',compatibility_date:'2026-11-15',bindings:[{type:'service',name:'ORIGIN',service:'sasta-wp-cron-autopilot'},{type:'service',name:'FALLBACK',service:'sasta-canonical-sync-v11'},{type:'service',name:'LEGACY_PRODUCTS',service:'sastamilaga-redirects'}],observability:{enabled:true,logs:{enabled:true,invocation_logs:true},traces:{enabled:true}}}));
const hashes={};for(const[name,file]of modules){const source=fs.readFileSync(file,'utf8');hashes[name]=createHash('sha256').update(source).digest('hex');form.append(name,new Blob([source],{type:'application/javascript+module'}),name);}
const deployment=await api(`/accounts/${account}/workers/scripts/${worker}`,{method:'PUT',body:form});
const patterns=stage==='production'?['sastamilaga.com/*','sastamilaga.com/shop/*','sastamilaga.com/shop','sastamilaga.com/search*','sastamilaga.com/category/*','sastamilaga.com/product/*','sastamilaga.com/global/p/*','sastamilaga.com/global-shop/p/*','sastamilaga.com/c/global/*','sastamilaga.com/ships-from/*','sastamilaga.com/brand/*','sastamilaga.com/guides/*','sastamilaga.com/faq/*','sastamilaga.com/account/*','sastamilaga.com/shipping-policy/','sastamilaga.com/assets/js/cj-storefront.js*','sastamilaga.com/sitemap-cj.xml','sastamilaga.com/sitemap-cj-products.xml','sastamilaga.com/sitemap-cj-categories.xml','sastamilaga.com/sitemap-cj-guides.xml','sastamilaga.com/sitemap-cj-images.xml','sastamilaga.com/sitemap-global-qualified.xml','sastamilaga.com/sitemaps/global-qualified/*','sastamilaga.com/feed-cj.*','sastamilaga.com/llms.txt','sastamilaga.com/llms-full.txt']:['sastamilaga.com/__cj-preview/*'];
const changed=[];for(const pattern of patterns){if(/cart|checkout|wp-json|paypal|api\/cj/.test(pattern))throw Error('Transactional route is excluded');const existing=routes.find(r=>r.pattern===pattern);if(existing?.script===worker)continue;
 const payload=JSON.stringify({...(existing?{id:existing.id}:{}),pattern,script:worker,request_limit_fail_open:pattern==='sastamilaga.com/*'});
 const r=await api(`/zones/${zone.id}/workers/routes${existing?'/'+existing.id:''}`,{method:existing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:payload});changed.push({pattern,before:existing?.script||null,route_id:r.result.id});
}
const receipt={at:new Date().toISOString(),stage,worker,deployment_id:deployment.result.deployment_id,hashes,changed_routes:changed};fs.writeFileSync('artifacts/cj-deployment.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
