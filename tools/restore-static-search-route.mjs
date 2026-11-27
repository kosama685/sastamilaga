// Remove only the obsolete supplier SSR search route. Preserve every other route.
import fs from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN;
if(!token)throw Error('Existing repository Cloudflare credential required');
async function api(path,method='GET'){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{method,headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
 const j=await r.json();if(!r.ok||!j.success)throw Error('Cloudflare '+method+' '+path+' HTTP '+r.status);return j.result;
}
const zones=await api('/zones?name=sastamilaga.com');
if(zones.length!==1||zones[0].name!=='sastamilaga.com')throw Error('Expected exact production zone');
const base='/zones/'+zones[0].id;
const routes=await api(base+'/workers/routes');
if(routes.some(r=>r.pattern==='sastamilaga.com/*'))throw Error('Unexpected catch-all; inspect routing before changing search');
const dns=await api(base+'/dns_records?type=A&name=sastamilaga.com');
if(!dns.length||!dns.every(r=>['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153'].includes(r.content)))throw Error('Static GitHub origin not verified');
const selected=routes.filter(r=>['sastamilaga.com/search*','sastamilaga.com/search/*','sastamilaga.com/search'].includes(r.pattern));
if(selected.some(r=>r.script!=='sasta-cj-storefront-v1'))throw Error('Search owner changed; refuse unreviewed route edit');
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/search-route-backup.json',JSON.stringify({at:new Date().toISOString(),routes:selected},null,2));
for(const r of selected)await api(base+'/workers/routes/'+r.id,'DELETE');
const after=await api(base+'/workers/routes');
if(JSON.stringify(after.filter(r=>!selected.some(s=>s.id===r.id)))!==JSON.stringify(routes.filter(r=>!selected.some(s=>s.id===r.id))))throw Error('Other route inventory changed during deployment');
if(after.some(r=>selected.some(s=>s.id===r.id)))throw Error('Search route removal unconfirmed');
for(const q of ['smart watches','bicycle lights']){
 const r=await fetch('https://sastamilaga.com/search/?q='+encodeURIComponent(q),{signal:AbortSignal.timeout(30000)});
 const html=await r.text();
 if(r.status!==200||!html.includes('Search results')||html.includes('X-Sasta-Renderer')||html.includes('Supplier information unavailable'))throw Error('Static search not healthy: '+r.status);
 console.log('PASS search '+q+': HTTP 200 static catalog');
}
fs.writeFileSync('artifacts/search-route-receipt.json',JSON.stringify({at:new Date().toISOString(),removed:selected.map(r=>r.pattern),remaining_routes:after.length},null,2));
console.log('Only obsolete search routing removed; all other routes preserved.');
