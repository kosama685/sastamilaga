import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const routes={};
// Prefer the original global category if local/category slugs overlap.
for(const dir of ['c/global','c','b'])for(const file of fs.readdirSync(path.join(root,dir)).sort()){
 if(!/^[a-z0-9-]+\.html$/.test(file)||file==='index.html')continue;
 const alias='/'+file,target='/'+dir+'/'+file;
 if(routes[alias])continue;
 const existing=path.join(root,file);
 if(fs.existsSync(existing)&&!fs.readFileSync(existing,'utf8').includes('sm-legacy-alias-v1'))continue;
 routes[alias]=target;
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
for(const [alias,target] of Object.entries(routes)){
 const html=fs.readFileSync(path.join(root,target),'utf8');
 if(!html.includes('https://sastamilaga.com'+target))throw Error('Missing target canonical: '+target);
 const title=/<title>([^<]+)<\/title>/.exec(html)?.[1]||'Sasta Milaga';
 // Native Pages remains usable even if an edge Worker reaches its quota.
 // Immediate refresh and canonical both identify the same verified destination.
 const out=`<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><!-- sm-legacy-alias-v1 -->\n<title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="https://sastamilaga.com${target}"><meta http-equiv="refresh" content="0;url=${esc(target)}"><script>location.replace(${JSON.stringify(target)}+location.search+location.hash)</script></head><body><main><h1>${title}</h1><p>This page has moved to its permanent address.</p><a href="${esc(target)}">Continue to ${title}</a></main></body></html>\n`;
 fs.writeFileSync(path.join(root,alias),out);
}
fs.writeFileSync(path.join(root,'data/legacy-root-routes.json'),JSON.stringify(routes,null,2)+'\n');
console.log(`Built ${Object.keys(routes).length} verified category/article aliases; no homepage fallbacks.`);
