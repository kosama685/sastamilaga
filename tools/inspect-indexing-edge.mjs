// Read-only. Encrypt diagnostics to the operator's public key before artifact upload.
import fs from 'node:fs';
import {randomBytes,createCipheriv,publicEncrypt,constants} from 'node:crypto';
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account)throw Error('Existing Cloudflare repository secrets are unavailable');
const records={};
async function get(key,path){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(25000)});
 const text=await r.text();records[key]={status:r.status,type:r.headers.get('content-type'),text};
 if(!r.ok)console.log(key+': HTTP '+r.status);
 return r.headers.get('content-type')?.includes('json')?JSON.parse(text):null;
}
const zones=await get('zones','/zones?name=sastamilaga.com');
const zone=zones?.result?.[0]?.id;
if(zone){
 await get('routes',`/zones/${zone}/workers/routes`);
 const sets=await get('rulesets',`/zones/${zone}/rulesets`);
 for(const item of sets?.result||[])if(['http_request_firewall_custom','http_ratelimit','http_request_firewall_managed','http_request_dynamic_redirect'].includes(item.phase))await get('ruleset-'+item.id,`/zones/${zone}/rulesets/${item.id}`);
 await get('firewall-rules',`/zones/${zone}/firewall/rules?per_page=100`);
 await get('security-settings',`/zones/${zone}/settings/security_level`);
 await get('bot-settings',`/zones/${zone}/bot_management`);
}
const queue=['sasta-canonical-sync-v11','sasta-account-links-v10','sastamilaga-redirects'],seen=new Set();
while(queue.length&&seen.size<8){
 const name=queue.shift();if(seen.has(name))continue;seen.add(name);
 await get(name+'-source',`/accounts/${account}/workers/scripts/${name}`);
 const settings=await get(name+'-settings',`/accounts/${account}/workers/scripts/${name}/settings`);
 for(const binding of settings?.result?.bindings||[])if(binding.type==='service'&&binding.service)queue.push(binding.service);
}
const key=randomBytes(32),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
const body=Buffer.concat([cipher.update(JSON.stringify(records)),cipher.final()]);
const wrapped=publicEncrypt({key:fs.readFileSync('tools/indexing-diagnostic-public.pem'),padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256'},key);
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/indexing-diagnostic.enc.json',JSON.stringify({key:wrapped.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:body.toString('base64')}));
console.log('Read-only diagnostic encrypted. No credentials or source printed.');
