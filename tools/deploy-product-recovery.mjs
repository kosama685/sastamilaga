import fs from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID,name='sasta-product-recovery-v1';
if(!token||!account)throw Error('Existing Cloudflare CI credentials required');
async function api(path,init={}){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...init,headers:{Authorization:'Bearer '+token,...init.headers},signal:AbortSignal.timeout(30000)});
 const j=await r.json();if(!r.ok||!j.success)throw Error('Cloudflare HTTP '+r.status);return j.result;
}
const zones=await api('/zones?name=sastamilaga.com');if(zones.length!==1)throw Error('Exact zone required');
const base='/zones/'+zones[0].id+'/workers/routes';
const before=await api(base),route=before.find(r=>r.pattern==='sastamilaga.com/product/*');
if(!route||!['sasta-cj-storefront-v1',name].includes(route.script))throw Error('Unexpected product route owner');
fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/product-route-backup.json',JSON.stringify(route,null,2));
const form=new FormData();
form.append('metadata',JSON.stringify({main_module:'worker.mjs',compatibility_date:'2026-11-23',bindings:[{type:'service',name:'PRIMARY',service:'sasta-cj-storefront-v1'}],observability:{enabled:true,logs:{enabled:true,invocation_logs:true},traces:{enabled:true}}}));
form.append('worker.mjs',new Blob([fs.readFileSync('workers/product-recovery/worker.mjs','utf8').replace("'../global-pdp/worker.js'","'./snapshot.mjs'")],{type:'application/javascript+module'}),'worker.mjs');
form.append('snapshot.mjs',new Blob([fs.readFileSync('workers/global-pdp/worker.js','utf8')],{type:'application/javascript+module'}),'snapshot.mjs');
const deployed=await api(`/accounts/${account}/workers/scripts/${name}`,{method:'PUT',body:form});
const put=script=>api(base+'/'+route.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:route.id,pattern:route.pattern,script,request_limit_fail_open:route.request_limit_fail_open??true})});
await put(name);
try{
 for(const id of ['2111897917664645122','0AF026C6-B83F-4FC8-85B5-CD638A556EF7']){
  const r=await fetch('https://sastamilaga.com/product/'+id+'/catalog-product/',{signal:AbortSignal.timeout(40000)}),html=await r.text();
  if(r.status!==200||!html.includes(id)||html.includes('Supplier data is temporarily unavailable'))throw Error('Product smoke failed: '+r.status);
  console.log('PASS verified product '+id+': HTTP 200');
 }
 const after=await api(base);
 for(const old of before.filter(r=>r.id!==route.id))if(JSON.stringify(after.find(r=>r.id===old.id))!==JSON.stringify(old))throw Error('Another route changed during deployment');
 fs.writeFileSync('artifacts/product-recovery-receipt.json',JSON.stringify({at:new Date().toISOString(),deployment:deployed.deployment_id,pattern:route.pattern,previous_script:route.script,script:name},null,2));
}catch(e){await put(route.script);throw e;}
