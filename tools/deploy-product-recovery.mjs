import fs from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID,name='sasta-product-recovery-v2';
if(!token||!account)throw Error('Existing Cloudflare CI credentials required');
async function api(path,init={}){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(30000)});
 const j=await r.json();if(!r.ok||!j.success)throw Error('Cloudflare HTTP '+r.status);return j.result;
}
const zones=await api('/zones?name=sastamilaga.com');if(zones.length!==1)throw Error('Exact zone required');
const base='/zones/'+zones[0].id+'/workers/routes';
const before=await api(base);
const allowed={
 'sastamilaga.com/product/*':['sasta-cj-storefront-v1','sasta-product-recovery-v1',name],
 'sastamilaga.com/global/p/*':['sasta-global-legacy-resilient-v2','sasta-global-legacy-canonical-v1',name],
 'sastamilaga.com/global-shop/p/*':['sasta-global-pdp-v6',name]
};
const routes=Object.entries(allowed).map(([pattern,owners])=>{
 const r=before.find(r=>r.pattern===pattern);
 if(!r||!owners.includes(r.script))throw Error('Unexpected route owner for '+pattern+': '+r?.script);
 return r;
});
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/product-route-backup.json',JSON.stringify(routes,null,2));
const form=new FormData();
form.append('metadata',JSON.stringify({main_module:'worker.mjs',compatibility_date:'2026-11-23',bindings:[{type:'service',name:'PRIMARY',service:'sasta-cj-storefront-v1'}],observability:{enabled:true,logs:{enabled:true,invocation_logs:true},traces:{enabled:true}}}));
form.append('worker.mjs',new Blob([fs.readFileSync('workers/product-recovery/worker.mjs','utf8').replace("'../global-pdp/worker.js'","'./snapshot.mjs'")],{type:'application/javascript+module'}),'worker.mjs');
form.append('snapshot.mjs',new Blob([fs.readFileSync('workers/global-pdp/worker.js','utf8')],{type:'application/javascript+module'}),'snapshot.mjs');
const deployed=await api(`/accounts/${account}/workers/scripts/${name}`,{method:'PUT',body:form});
const put=(route,script)=>api(base+'/'+route.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:route.id,pattern:route.pattern,script,request_limit_fail_open:route.request_limit_fail_open??true})});
for(const route of routes)await put(route,name);
try{
 const probes=[
  ['/global/p/headband-and-hair-band-and-hairpin/1386583701764313088','1386583701764313088'],
  ['/global/p/garden-tools/1992883421086261249','1992883421086261249'],
  ['/global/p/coats/0af026c6-b83f-4fc8-85b5-cd638a556ef7','0AF026C6-B83F-4FC8-85B5-CD638A556EF7'],
  ['/product/2111897917664645122/catalog-product/','2111897917664645122'],
  ['/global-shop/p/1386583701764313088/mori-girl-s-moving-butterfly-hairpin-headdress/','1386583701764313088']
 ];
 for(const [path,id] of probes){
  let ok=false;
  for(let attempt=0;attempt<8;attempt++){
   const r=await fetch('https://sastamilaga.com'+path+'?recovery_check='+Date.now(),{signal:AbortSignal.timeout(40000)}),html=await r.text();
   ok=r.status===200&&html.includes(id)&&!html.includes('Supplier data is temporarily unavailable');
   console.log(JSON.stringify({probe:id,attempt,status:r.status,renderer:r.headers.get('x-sasta-renderer'),recovery:r.headers.get('x-sasta-recovery')}));
   if(ok)break;
   await new Promise(resolve=>setTimeout(resolve,4000));
  }
  if(!ok)throw Error('Product smoke failed after bounded propagation retries');
  console.log('PASS verified product '+id+': HTTP 200');
 }
 const after=await api(base);
 for(const old of before.filter(r=>!routes.some(x=>x.id===r.id)))if(JSON.stringify(after.find(r=>r.id===old.id))!==JSON.stringify(old))throw Error('Another route changed during deployment');
 fs.writeFileSync('artifacts/product-recovery-receipt.json',JSON.stringify({at:new Date().toISOString(),deployment:deployed.deployment_id,routes:routes.map(r=>({pattern:r.pattern,previous_script:r.script})),script:name},null,2));
}catch(e){for(const route of routes)await put(route,route.script);throw e;}
