#!/usr/bin/env node
// Read-only cutover gate: GitHub Pages primary / Namecheap WooCommerce origin.
// This script NEVER edits DNS, GitHub Pages settings, orders, or Cloudflare routes.
// Failing any gate means "do not cut over" and leaves the existing site unchanged.
const DOMAIN = 'sastamilaga.com';
const REPO = 'kosama685/sastamilaga';
const GH_IPS = new Set(['185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153']);
const NAMECHEAP_IP = '162.0.232.232';
const out = [];
function gate(name, ok, reason) { out.push({name, ok: Boolean(ok), reason}); }
async function jsonGet(url, token) {
  const headers = {Accept:'application/json'};
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(url,{headers,signal:AbortSignal.timeout(18000),redirect:'error'});
  const body = await r.json().catch(()=>({}));
  if (!r.ok || body.success === false) throw Error('HTTP ' + r.status + ' ' + String(body.message || body.errors?.[0]?.message || '').slice(0,140));
  return body;
}
async function probe(url, expectedBrand, requireNoRedirect=true) {
  try {
    const r=await fetch(url,{redirect:requireNoRedirect?'manual':'follow',signal:AbortSignal.timeout(15000),headers:{'user-agent':'SastaPrimaryCutoverPreflight/1.0'}});
    const html=await r.text();
    return {ok:r.status===200 && (!expectedBrand || /Sasta Milaga/i.test(html)),status:r.status,redirect:r.headers.get('location'),bytes:html.length,source:r.headers.get('x-sasta-recovery')};
  } catch(e){return {ok:false,error:e.name==='TimeoutError'?'timeout':String(e.message||e).slice(0,140)};}
}
const ghToken=process.env.GITHUB_TOKEN;
const cfToken=process.env.CLOUDFLARE_API_TOKEN;
const ghAPI='https://api.github.com/repos/'+REPO+'/pages';
let pages;
try {
  pages=await jsonGet(ghAPI,ghToken);
  gate('GitHub Pages custom domain bound',pages.cname===DOMAIN,'Current CNAME: '+String(pages.cname||'(none)'));
  const cert=pages.https_certificate?.state||'(unknown)';
  gate('GitHub Pages HTTPS certificate approved',cert==='approved','Certificate: '+cert);
} catch(e){gate('GitHub Pages settings are readable',false,String(e.message||e));}
try {
  const x=await probe('https://kosama685.github.io/sastamilaga/',true);
  gate('Independent GitHub Pages source healthy',x.ok,'HTTP '+String(x.status||x.error||'?')+', '+String(x.bytes||0)+' bytes');
} catch(e){gate('Independent GitHub Pages source healthy',false,String(e.message||e));}
if(!cfToken){gate('Cloudflare read access',false,'CLOUDFLARE_API_TOKEN missing from Actions secrets');}
else try{
  const zoneList=await jsonGet('https://api.cloudflare.com/client/v4/zones?name='+DOMAIN,cfToken);
  const zone=zoneList.result?.[0];
  if(!zone)throw Error('Zone not found');
  const records=(await jsonGet('https://api.cloudflare.com/client/v4/zones/'+zone.id+'/dns_records?per_page=100',cfToken)).result||[];
  const apex=records.filter(r=>r.name===DOMAIN&&(r.type==='A'||r.type==='CNAME'));
  const pointsGithub=apex.length>0 && apex.every(r=>r.type==='A'?GH_IPS.has(r.content):r.content==='kosama685.github.io');
  gate('Public apex DNS points to GitHub Pages',pointsGithub,'Apex: '+apex.map(r=>r.type+' '+r.content).join(', '));
  const origin=records.filter(r=>r.name==='origin.'+DOMAIN && r.type==='A');
  gate('Namecheap origin remains independently addressable',origin.some(r=>r.content===NAMECHEAP_IP&&r.proxied),'origin hostname configured and proxied: '+String(origin.some(r=>r.content===NAMECHEAP_IP&&r.proxied)));
  const mx=records.filter(r=>r.type==='MX'&&r.name===DOMAIN);
  gate('Namecheap email MX preserved',mx.length>=1,'MX records: '+mx.length);
  const routes=(await jsonGet('https://api.cloudflare.com/client/v4/zones/'+zone.id+'/workers/routes?per_page=100',cfToken)).result||[];
  const catchall=routes.find(r=>r.pattern===DOMAIN+'/*');
  gate('Static pages do not consume catch-all Workers quota',!catchall,'Catch-all Worker: '+String(catchall?.script||'(none)'));
  const commerce=['cart','checkout','my-account','wp-json','wc-api','wp-admin','wp-login.php'];
  const missing=commerce.filter(p=>!routes.some(r=>r.pattern===DOMAIN+'/'+p+'*'||r.pattern===DOMAIN+'/'+p+'/*'));
  gate('WooCommerce routes remain explicitly protected',missing.length===0,'Missing dedicated paths: '+(missing.join(', ')||'(none)'));
}catch(e){gate('Cloudflare configuration readable',false,String(e.message||e));}
const site=await probe('https://'+DOMAIN+'/',true);
gate('Production homepage stays on apex with HTTP 200',site.ok,'HTTP '+String(site.status||site.error||'?')+(site.redirect?', Location: '+site.redirect:'')+(site.source?', source: '+site.source:''));
const shop=await probe('https://'+DOMAIN+'/shop/',true);
gate('Production shop stays on apex with HTTP 200',shop.ok,'HTTP '+String(shop.status||shop.error||'?')+(shop.redirect?', Location: '+shop.redirect:''));
console.log('\nSTATIC-PRIMARY / NAMECHEAP-PRESERVED CUTOVER PREFLIGHT');
for(const g of out)console.log((g.ok?'PASS ':'BLOCK ')+g.name+' — '+g.reason);
console.log('\nGate result: '+out.filter(g=>g.ok).length+'/'+out.length+' passed. NO DNS / hosting / payment changes performed.');
if(out.some(g=>!g.ok))process.exitCode=1;
