// Read only: inspect the dedicated existing Live TV delivery worker.
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account)throw Error('Existing Cloudflare deployment credentials unavailable');
const headers={Authorization:'Bearer '+token};
const base='https://api.cloudflare.com/client/v4';
const z=await fetch(base+'/zones?name=sastamilaga.com',{headers}).then(r=>r.json());if(!z.success)throw Error('Zone lookup failed');const zone=z.result[0].id;
const routes=await fetch(base+'/zones/'+zone+'/workers/routes',{headers}).then(r=>r.json());
console.log(JSON.stringify(routes.result.filter(r=>/live-tv|assets\/|data\/|app\.js/.test(r.pattern)),null,2));
const r=await fetch(base+'/accounts/'+account+'/workers/scripts/sasta-live-tv-static-v2',{headers});if(!r.ok)throw Error('Worker read failed '+r.status);let text=await r.text();if(text.length>30000)throw Error('Unexpected worker size');text=text.replaceAll(token,'[REDACTED]').replace(/Bearer [A-Za-z0-9._-]+/g,'Bearer [REDACTED]').replace(/[A-Za-z0-9_-]{48,}/g,'[LONG_VALUE_REDACTED]');console.log(text);
