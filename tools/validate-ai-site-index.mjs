#!/usr/bin/env node
// Validate public llms site navigation; does not claim special Google ranking signals.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['llms.txt','llms-full.txt'],issues=[];
const NONCANONICAL_NAV = new Set(['/shop/','/global-shop/','/ur/','/ar/']);
let links=0;
for(const name of files){
 const body=fs.readFileSync(path.join(root,name),'utf8');
 if(/https:\/\/sastamilaga\.com\/#\//i.test(body))issues.push(name+': legacy hash URL');
 const urls=[...body.matchAll(/https:\/\/sastamilaga\.com\/[a-zA-Z0-9/_.-]+/g)].map(m=>m[0]);
 for(const value of new Set(urls)){
  const u=new URL(value),pathname=u.pathname,rel=decodeURIComponent(pathname).replace(/^\/+/,'');
  if (NONCANONICAL_NAV.has(pathname) || pathname.startsWith('/category/')) {
   issues.push(name+': noncanonical or unavailable navigation target '+pathname);
   continue;
  }
  if(['sitemap-global-qualified.xml'].includes(rel)){links++;continue;} // live Cloudflare D1-backed endpoint
  if(rel.includes('..')){issues.push(name+': unsafe relative link '+rel);continue}
  const target=path.join(root,rel.endsWith('/')?rel+'index.html':rel||'index.html');
  if(!fs.existsSync(target))issues.push(name+': missing '+rel);
  links++;
 }
}
if(issues.length){console.error(JSON.stringify({status:'failed',issues}));process.exit(1)}
console.log(JSON.stringify({status:'passed',documents:files.length,verified_canonical_site_links:links,deprecated_fragment_links:0}));
