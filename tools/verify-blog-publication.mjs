#!/usr/bin/env node
/**
 * Verify the pre-existing, deterministic blog build with no new posts.
 * --local: validate all listed HTML files before commit/deploy (no network).
 * --live: bounded concurrent GET checks for every published GitHub Pages mirror URL.
 * This tests status, full HTML, and matching canonical rather than an SPA 200 fallback.
 */
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('.');
const mode=process.argv.includes('--live')?'live':'local';
const filename=path.join(root,'b-published.txt');
if(!fs.existsSync(filename))throw Error('b-published.txt is missing');
const urls=fs.readFileSync(filename,'utf8').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const seen=new Set();
if(urls.length===0)throw Error('No published posts listed; refusing to report success');
const targets=urls.map(url=>{
  const u=new URL(url);
  if(u.origin!=='https://sastamilaga.com'||!/^\/b\/[a-z0-9-]+\.html$/.test(u.pathname))
    throw Error('Invalid canonical blog URL: '+url);
  if(seen.has(url))throw Error('Duplicate blog URL: '+url);
  seen.add(url);
  return {canonical:url,filename:path.basename(u.pathname),mirror:'https://kosama685.github.io/sastamilaga'+u.pathname};
});
const errors=[];
const assertHtml=(html,entry,where)=>{
  if(!/<html\b/i.test(html)||!/<h1\b/i.test(html)||
     !html.includes('rel="canonical" href="'+entry.canonical+'"'))
    errors.push(where+': missing HTML/H1/exact canonical for '+entry.filename);
};
if(mode==='local'){
  for(const e of targets){
    const file=path.join(root,'b',e.filename);
    if(!fs.existsSync(file)){errors.push('Missing built page '+e.filename);continue;}
    assertHtml(fs.readFileSync(file,'utf8'),e,'local');
  }
}else{
  let cursor=0,checked=0;
  const worker=async()=>{
    for(;;){
      const i=cursor++;
      if(i>=targets.length)return;
      const entry=targets[i];
      try{
        const response=await fetch(entry.mirror,{
          signal:AbortSignal.timeout(15000),
          headers:{'Accept':'text/html'}
        });
        if(response.status!==200){
          errors.push('HTTP '+response.status+' '+entry.mirror);
        }else{
          const html=await response.text();
          assertHtml(html,entry,'live');
        }
      }catch(err){errors.push('Fetch error '+entry.mirror+' ('+(err?.name||'unknown')+')');}
      checked++;
      if(checked%10===0)console.log('Verified '+checked+'/'+targets.length);
    }
  };
  await Promise.all(Array.from({length:Math.min(6,targets.length)},worker));
}
const result={mode,expected:targets.length,checked:targets.length,failed:errors.length,errors:errors.slice(0,35)};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
