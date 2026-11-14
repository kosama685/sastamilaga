#!/usr/bin/env node
/**
 * Sasta Milaga: product-to-product semantic internal links at build time.
 *
 * Read all checked-in static pages under /p. Link ONLY verified, indexable
 * static product URLs within the same real category/leaf group. Natural
 * anchors are product titles; no fabricated facts, keywords, ratings or prices.
 *
 * Does not change purchase routes, Product/Offer schema or Merchant feeds.
 * Idempotent and --check = never write files.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),'..');
const DIR=path.join(ROOT,'p');
const SITE='https://sastamilaga.com';
const MARK='sasta-related-product-links-v1';
const CHECK=process.argv.includes('--check');
const STOP=new Set('with from for the your their an and into size small large extra fashion wear pack packs pcs pc piece pieces type types pairs pair new latest color colour colors colours original quality premium product men mens women womens girl girls boy boys baby kids accessories items item single double three four of is are on to a in at it by or all this as set home good high'.split(' '));
function clean(s){return String(s??'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function short(s,n=95){return s.length>n?s.slice(0,n+1).replace(/\s+\S*$/,'').replace(/[.,;:| -]+$/,'')+'…':s;}
function tokens(s){return [...new Set(s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(w=>w.length>=4&&!STOP.has(w)&&!(/^\d+$/.test(w))))].slice(0,23);}
const files=fs.readdirSync(DIR).filter(x=>x.endsWith('.html')).sort();
if(files.length<19000)throw Error('Static product tree unexpectedly small; refusing partial coverage');
const records=[],groups=new Map(),byFile=new Map();
for(const file of files){
 const original=fs.readFileSync(path.join(DIR,file),'utf8');
 const canonical=SITE+'/p/'+file;
 const meta=original.slice(0,original.indexOf('</head>')>0?original.indexOf('</head>'):5000);
 if(!meta.includes('rel="canonical" href="'+canonical+'"'))throw Error('Canonical mismatch in '+file);
 const title=clean(original.match(/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const crumbs=original.match(/<nav class="sm-crumbs"[\s\S]*?<\/nav>/i)?.[0]||'';
 const broad=crumbs.match(/href="\.\.\/c\/([a-z0-9-]+)\.html"/i)?.[1]||'';
 const leaf=crumbs.match(/[?&]leaf=([a-z0-9-]+)/i)?.[1]||'';
 const indexable=!/<meta\s+name="robots"\s+content="[^"]*\bnoindex\b/i.test(meta);
 const usable=indexable&&title.length>4&&broad!==''&&fs.existsSync(path.join(ROOT,'c',broad+'.html'));
 const group=leaf?broad+'/'+leaf:broad;
 const r={file,original,canonical,title,words:tokens(title),broad,group,usable};
 const ix=records.length;records.push(r);byFile.set(file,ix);
 if(usable){if(!groups.has(group))groups.set(group,[]);groups.get(group).push(ix);}
}
const postings=new Map();
for(const [group,indices] of groups){
 const lookup=new Map();
 for(const i of indices)for(const w of records[i].words){
   if(!lookup.has(w))lookup.set(w,[]);lookup.get(w).push(i);
 }
 postings.set(group,lookup);
}
function related(r){
 const lookup=postings.get(r.group),scores=new Map();
 if(!lookup)return [];
 for(const w of r.words)for(const i of (lookup.get(w)||[])){
  if(records[i].file===r.file)continue;
  scores.set(i,(scores.get(i)||0)+1);
 }
 return [...scores.entries()].filter(([i,n])=>n>=2).sort((a,b)=>b[1]-a[1]||records[a[0]].file.localeCompare(records[b[0]].file)).slice(0,4).map(([i])=>records[i]);
}
function guide(r,rec){
 const links=rec.length?'<nav aria-label="Related products in the same category"><h3>Compare related products</h3><ul>'+
  rec.map(x=>'<li><a href="'+esc(x.canonical)+'">'+esc(short(x.title))+'</a></li>').join('')+'</ul></nav>':'';
 return '<section id="'+MARK+'" class="sm-page sm-page--wide" aria-label="Related items and shopping guidance"><div class="sm-prose">'+
  '<h2>More in '+esc(r.broad.replace(/-/g,' '))+'</h2>'+
  '<p>Explore similar items, compare product details and check the availability of the exact option before purchasing.</p>'+
  links+
  '<p><a href="'+SITE+'/c/'+r.broad+'.html">Browse this category</a> · <a href="'+SITE+'/shipping/">Delivery information</a> · <a href="'+SITE+'/returns/">Returns information</a></p>'+
  '</div></section>';
}
let touched=0,withRelated=0,linked=0,unindexed=0,noCategory=0;
const rx=new RegExp('<section id="'+MARK+'"[\\s\\S]*?<\\/section>\\s*','i');
for(const r of records){
 if(!r.usable){if(!r.broad)noCategory++;if(!r.usable)unindexed++;continue;}
 const peers=related(r);
 let s=r.original.replace(rx,'');
 if(!s.includes('</main>'))throw Error('main missing '+r.file);
 s=s.replace(/<\/main>/,guide(r,peers)+'</main>');
 if((s.match(/<h1(?:\s|>)/gi)||[]).length!==1)throw Error('Incorrect headings '+r.file);
 if(s!==r.original){touched++;if(!CHECK)fs.writeFileSync(path.join(DIR,r.file),s);}
 if(peers.length){withRelated++;linked+=peers.length;}
}
console.log(JSON.stringify({mode:CHECK?'check':'deploy',total_products:records.length,indexable_with_category:records.length-unindexed,excluded_from_enhancement:unindexed,missing_category:noCategory,rewritten:touched,products_with_semantically_related_links:withRelated,product_to_product_links:linked,category_to_product_backlinks:records.length-unindexed,version:MARK}));
