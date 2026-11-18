#!/usr/bin/env node
/**
 * Sasta Milaga: enrich static local product recommendation cards with
 * their target product's own image from canonical GitHub HTML.
 *
 * Usage:
 *   node tools/enrich-static-related-images.mjs --check  # read-only summary
 *   node tools/enrich-static-related-images.mjs --write  # modify p/*.html
 *
 * Does not create fake media, change offers, pricing, inventory, links
 * outside related-product cards, canonical URLs or checkout.
 * Safe to rerun. Requires the complete /p directory.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const DIR=path.join(ROOT,'p');
const write=process.argv.includes('--write');
const files=fs.readdirSync(DIR).filter(x=>x.endsWith('.html')).sort();
if(files.length<19000)throw Error('Product tree unexpectedly incomplete; refusing bulk operation');
const index=new Map();
const allowed=new Set(['sastamilaga.com','hhcnewapp.blr1.cdn.digitaloceanspaces.com']);
function safeImage(value){
 try{const u=new URL(value,'https://sastamilaga.com/');return u.protocol==='https:'&&allowed.has(u.hostname)?u.href:''}catch{return''}
}
function escapeAttr(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
for(const f of files){
 const html=fs.readFileSync(path.join(DIR,f),'utf8');
 const image=html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1]||html.match(/<div class="gallery-main"><img src="([^"]+)"/i)?.[1]||'';
 index.set(f,safeImage(image));
}
let scanned=0,eligible=0,withImage=0,unresolved=0,changes=0,relatedMissing=0,dupeNames=0;
for(const f of files){
 let html=fs.readFileSync(path.join(DIR,f),'utf8');scanned++;
 const match=html.match(/<ul class="sm-static-links"[^>]*>[\s\S]*?<\/ul>/i);
 if(!match){relatedMissing++;continue}
 const original=match[0];let here=0;
 const used=new Set();
 const updated=original.replace(/(<li>\s*<a\s+href="\.\.\/p\/([^"?#]+\.html)"[^>]*>)([\s\S]*?)(<\/a>\s*<span>[\s\S]*?<\/span>\s*<\/li>)/g,(whole,start,target,content,end)=>{
   here++;eligible++;
   const key=content.replace(/<[^>]*>/g,'').toLowerCase().trim();
   if(used.has(key))dupeNames++;else used.add(key);
   if(/<img\b/i.test(content)){withImage++;return whole}
   const src=index.get(target)||'';
   if(!src){unresolved++;return whole}
   const pic='<img src="'+escapeAttr(src)+'" alt="" width="360" height="360" loading="lazy" decoding="async"> ';
   changes++;return start+pic+content+end;
 });
 if(here&&original!==updated&&write){
   html=html.replace(original,updated);
   fs.writeFileSync(path.join(DIR,f),html);
 }
}
const results={mode:write?'write':'check',scanned,filesIndexed:index.size,eligible,alreadyWithImage:withImage,unresolved,changesNeeded:changes,relatedMissing,duplicateDisplayNames:dupeNames};
process.stdout.write(JSON.stringify(results,null,2)+'\n');
