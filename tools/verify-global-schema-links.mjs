#!/usr/bin/env node
// Check every checked-in supplier category after the SEO generator runs.
// Prevent a Pages deployment with structured product URLs unlike visible cards.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const raw=fs.readFileSync(path.join(root,'data/cj/manifest.js'),'utf8');
const manifest=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1));
if(!Array.isArray(manifest.cats)||manifest.cats.length<500)throw Error('Supplier category manifest incomplete');
let pages=0,items=0,emptyCategories=0,relatedLinks=0;
const errors=[];
for(const cat of manifest.cats){
 const name=cat.s,file=path.join(root,'c/global',name+'.html');
 if(!fs.existsSync(file)){errors.push('missing file '+name);continue;}
 const html=fs.readFileSync(file,'utf8');
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 let list=null;
 for(const block of blocks){
  let data;try{data=JSON.parse(block[1])}catch(e){errors.push(name+': invalid JSON-LD');continue}
  const nodes=Array.isArray(data['@graph'])?data['@graph']:[data];
  const catNode=nodes.find(n=>n?.['@type']==='CollectionPage');
  if(catNode?.mainEntity?.['@type']==='ItemList')list=catNode.mainEntity;
 }
 if(!list){errors.push(name+': no CollectionPage ItemList');continue}
 const entries=Array.isArray(list.itemListElement)?list.itemListElement:[];
 if(!entries.length)emptyCategories++;
 for(const entry of entries){
  const u=String(entry?.url||'');
  if(!/^https:\/\/sastamilaga\.com\/global-shop\/p\/(?:[A-Za-z0-9-]+)\/[a-z0-9-]+\/$/.test(u)){
   errors.push(name+': invalid schema URL '+u.slice(0,110));continue;
  }
  if(!html.includes('href="'+u+'"'))errors.push(name+': structured URL lacks a visible canonical product link: '+u);
  items++;
 }
 const nav=html.match(/<nav aria-label="Semantically related global shopping categories">([\s\S]*?)<\/nav>/);
 if(nav)relatedLinks+=(nav[1].match(/href="https:\/\/sastamilaga\.com\/c\/global\/[^"]+\.html"/g)||[]).length;
 pages++;
}
if(errors.length){console.error(JSON.stringify({result:'failed',pages,items,errorCount:errors.length,errors:errors.slice(0,30)}));process.exit(1)}
if(pages!==manifest.cats.length)throw Error('Category coverage mismatch');
const pens=fs.readFileSync(path.join(root,'c/global/3d-pens.html'),'utf8');
const nav=pens.match(/<nav aria-label="Semantically related global shopping categories">([\s\S]*?)<\/nav>/)?.[1]||'';
if(!nav.includes('/c/global/3d-printers.html')||nav.includes('/c/global/woman-socks.html')){
 throw Error('3D Pens internal linking is not semantically relevant');
}
console.log(JSON.stringify({result:'passed',categories:pages,verified_itemlist_links:items,related_category_links:relatedLinks,empty_itemlists:emptyCategories,legacy_fragment_urls:0}));
