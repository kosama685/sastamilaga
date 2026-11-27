import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const base=process.env.CJ_AUDIT_BASE||'https://sastamilaga.com/__cj-preview';
fs.mkdirSync('artifacts/lighthouse',{recursive:true});
const paths=['/','/shop/','/product/4978336F-15C5-476B-BFE8-C907659B70BB/temporary-metal-waterproof-key-box-at-the-door/'];let failed=false;const rows=[];
for(const [i,path]of paths.entries()){
 const url=base+path,start=performance.now();const warm=await fetch(url,{signal:AbortSignal.timeout(60000)});await warm.text();const prime_ms=Math.round(performance.now()-start);if(!warm.ok)throw Error('Audit page HTTP '+warm.status);
 const file='artifacts/lighthouse/page-'+i;
 const r=spawnSync('npx',['--yes','lighthouse@12',url,'--quiet','--chrome-flags=--headless=new --no-sandbox','--only-categories=performance,accessibility,best-practices,seo','--output=json','--output=html','--output-path='+file],{stdio:'inherit',timeout:150000});
 if(r.status!==0){failed=true;rows.push({url,error:'Lighthouse failed',prime_ms});continue;}
 const j=JSON.parse(fs.readFileSync(file+'.report.json')),a=j.audits;const metrics={lcp_ms:a['largest-contentful-paint'].numericValue,tbt_ms:a['total-blocking-time'].numericValue,cls:a['cumulative-layout-shift'].numericValue};
 const pass=metrics.lcp_ms<=2000&&metrics.tbt_ms<=200&&metrics.cls<=0.05;failed ||= !pass;rows.push({url,prime_ms,metrics,pass,scores:Object.fromEntries(Object.entries(j.categories).map(([k,v])=>[k,v.score])),environment:'Lighthouse default mobile, simulated throttling; INP requires interaction/field evidence'});
}
fs.writeFileSync('artifacts/lighthouse/summary.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows,null,2));if(failed)process.exitCode=1;
