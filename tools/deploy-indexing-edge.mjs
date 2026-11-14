// Uses only the repository's existing CI credentials. Never changes zone routes,
// payment/shipping Workers, WAF rules, secrets, sessions or origin configuration.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {patchIndexingSource,patchIndexingLinks} from './indexing-edge-policy.mjs';
import {patchBlogRecovery} from './indexing-blog-recovery.mjs';
const token=process.env.CLOUDFLARE_API_TOKEN,account=process.env.CLOUDFLARE_ACCOUNT_ID;
if(!token||!account)throw Error('Existing Cloudflare CI credentials required');
const hash=s=>createHash('sha256').update(s).digest('hex');
async function api(path,options={}){
 const r=await fetch('https://api.cloudflare.com/client/v4'+path,{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(40000)});
 if(!r.ok)throw Error('Cloudflare request failed: HTTP '+r.status+' '+path);
 return r;
}
const receipts=[];
async function update(name,patch,expected){
 const base=`/accounts/${account}/workers/scripts/${name}`;
 const before=await api(base),modules=await before.formData();
 const entry=modules.get('worker.js');if(!entry)throw Error('Expected worker.js module missing');
 const source=typeof entry==='string'?entry:await entry.text();
 if(expected&&hash(source)!==expected)throw Error('Live source changed since review: '+name+' sha256='+hash(source));
 const next=patch(source);if(next===source)throw Error('Patch produced no change');
 fs.mkdirSync('artifacts',{recursive:true});fs.writeFileSync('artifacts/check-source.mjs',next);
 const {spawnSync}=await import('node:child_process');
 if(spawnSync(process.execPath,['--check','artifacts/check-source.mjs']).status!==0)throw Error('Patched source syntax check failed');
 const settings=(await (await api(base+'/settings')).json()).result;
 if(settings.bindings.some(b=>b.type==='secret_text'))throw Error('Refusing to rewrite secret bindings');
 const metadata={main_module:'worker.js',compatibility_date:settings.compatibility_date,compatibility_flags:settings.compatibility_flags||[],bindings:settings.bindings,
  observability:settings.observability||{enabled:true,logs:{enabled:true,invocation_logs:true},traces:{enabled:true}}};
 const form=new FormData();form.append('metadata',JSON.stringify(metadata));
 for(const [key,value]of modules.entries())form.append(key,new Blob([key==='worker.js'?next:typeof value==='string'?value:await value.arrayBuffer()],{type:'application/javascript+module'}),key);
 const result=await (await api(base,{method:'PUT',body:form})).json();
 if(!result.success)throw Error('Cloudflare did not confirm upload');
 receipts.push({worker:name,before_sha256:hash(source),after_sha256:hash(next),deployment_id:result.result?.deployment_id,at:new Date().toISOString()});
}
if(process.env.INDEXING_STAGE==='blog'){
 await update('sasta-static-blog-reader',patchBlogRecovery,'ce09400a869c48995e44c26f7ddef9d41bca779a0c4f95fc01cf2d4b78d34faf');
}else if(process.env.INDEXING_STAGE==='links'){
 await update('sasta-canonical-sync-v11',patchIndexingLinks,'3602fd1a699444ff9b006827249554f602008dc3a09d820689f320b0c3496c1d');
}else{
await update('sasta-canonical-sync-v11',patchIndexingSource,'2b9f07e05ccf408745345708511a6beea8f53e34bb2b5805d225c08133e69959');
// A genuine SKU match, verified HTTP 200 before this commit. No WooCommerce PDP.
await update('sastamilaga-redirects',source=>{
 const anchor='    let m0;';if(source.split(anchor).length!==2)throw Error('Redirect Worker changed; inspect before applying');
 const fixes=`    if(q==='/videos/ronin-flexin-1-2m-braided-usb-to-micro-usb-fast-charging')return go('/p/ronin-flexin-1-2m-braided-usb-to-micro-usb-fast-charging-data-cable-compatible-w-hhc-3756405.html');
    if(q==='/product-category/fashion-apparel/mens-fashion/jeans-trousers/feed')return go('/c/men-s-fashion.html');
`;
 return source.replace(anchor,fixes+anchor);
});
}
fs.writeFileSync('artifacts/indexing-deployment.json',JSON.stringify({receipts},null,2));
console.log(JSON.stringify({receipts}));
