#!/usr/bin/env node
// Read-only production guard for GitHub Pages as static primary and
// Namecheap as independent WooCommerce backend. No DNS, Worker, order or payment mutations.
const HOST='sastamilaga.com';
const GITHUB=new Set(['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153']);
const CART=['cart*','checkout*','my-account*','order-pay*','order-received*','wp-login.php*','wp-admin*','wp-json*','wp-content*','wp-includes*','wc-api*'];
async function api(path){
 const token=process.env.CLOUDFLARE_API_TOKEN;
 if(!token)throw new Error('CLOUDFLARE_API_TOKEN not configured');
 const res=await fetch('https://api.cloudflare.com/client/v4'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(20000)});
 const body=await res.json().catch(()=>({}));
 if(!res.ok||body.success!==true)throw new Error('Cloudflare API HTTP '+res.status);
 return body.result;
}
function check(label,ok,detail){console.log((ok?'PASS ':'FAIL ')+label+' — '+detail);if(!ok)process.exitCode=1;}
const zones=await api('/zones?name='+HOST),zone=zones[0];
if(!zone){console.error('Zone not found');process.exit(1);}
const [records,routes]=await Promise.all([api('/zones/'+zone.id+'/dns_records?per_page=100'),api('/zones/'+zone.id+'/workers/routes?per_page=100')]);
const apex=records.filter(r=>r.name===HOST&&r.type==='A');
check('GitHub-primary four verified A records',apex.length===4&&apex.every(r=>GITHUB.has(r.content)&&r.proxied),apex.map(r=>r.content).join(', '));
const origin=records.find(r=>r.name==='origin.'+HOST&&r.type==='A');
check('Namecheap backend preserved',origin?.content==='162.0.232.232'&&origin?.proxied,'Proxied origin host exists: '+Boolean(origin));
const www=records.find(r=>r.name==='www.'+HOST&&r.type==='CNAME');
check('GitHub www mapping',www?.content==='kosama685.github.io',www?.content||'(missing)');
check('Email MX records retained',records.filter(r=>r.name===HOST&&r.type==='MX').length===3,'Existing MX count '+records.filter(r=>r.name===HOST&&r.type==='MX').length);
check('Legacy global Worker not intercepting GitHub static',!routes.some(r=>r.pattern===HOST+'/*'||r.pattern==='www.'+HOST+'/*'),'No global Worker routes');
const protectedRoutes=CART.map(p=>routes.find(r=>r.pattern===HOST+'/'+p));
check('Private WooCommerce paths remain fail-closed',protectedRoutes.every(r=>r&&r.script==='sasta-woo-namecheap-bridge-v1'&&r.request_limit_fail_open===false),CART.length+' required dedicated routes');
for(const p of ['shop','shop/*','p/*','c/global/*'])check('Static GitHub route '+p,!routes.some(r=>r.pattern===HOST+'/'+p),'No interfering Worker');
console.log('GitHub static primary route audit complete. Database/paid-checkout functionality is a separate verification.');
