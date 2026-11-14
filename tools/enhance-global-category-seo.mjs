#!/usr/bin/env node
/**
 * Semantic SEO / AEO / user-experience enhancement for ALL checked-in
 * Sasta Milaga global category pages, with verified navigation only.
 *
 * Runs in GitHub Pages deployment before artifact upload. Idempotent.
 * --check validates every generated edit but does NOT write any HTML.
 *
 * Never asserts worldwide shipping, live stock, fixed freight or final price.
 * Never alters product availability, checkout, Product/Offer schema or orders.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/,'$1')),'..');
const SITE='https://sastamilaga.com';
const CATDIR=path.join(ROOT,'c/global');
const MARKER='sasta-global-qa-linking-v2';
const CHECK=process.argv.includes('--check');
const raw=fs.readFileSync(path.join(ROOT,'data/cj/manifest.js'),'utf8');
const start=raw.indexOf('{'),end=raw.lastIndexOf('}');
if(start<0||end<start)throw Error('Invalid supplier manifest');
const manifest=JSON.parse(raw.slice(start,end+1));
if(!Array.isArray(manifest.cats)||manifest.cats.length<500)throw Error('Insufficient category manifest; refusing bulk changes');
const all=manifest.cats;
const bySlug=new Map(all.map(c=>[c.s,c]));
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function xmlText(s){return String(s).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function truncate(s,max){const t=String(s).replace(/\s+/g,' ').trim();if(t.length<=max)return t;return t.slice(0,max+1).replace(/\s+\S*$/,'').replace(/[.,;:!? -]+$/,'');}
function description(c){return truncate('Explore '+c.n+' supplier listings at Sasta Milaga. Compare options, check destination availability and confirm stock, shipping and final price before ordering.',159);}
function related(c){
 const words=new Set(c.n.toLowerCase().match(/[a-z]{4,}/g)||[]);
 return all.filter(x=>x.s!==c.s&&x.g===c.g)
  .map(x=>({x,rel:[...(x.n.toLowerCase().match(/[a-z]{4,}/g)||[])].filter(w=>words.has(w)).length}))
  .sort((a,b)=>b.rel-a.rel||b.x.c-a.x.c||a.x.s.localeCompare(b.x.s))
  .slice(0,6).map(x=>x.x);
}
function guide(c){
 const rel=related(c);
 const links=rel.map(x=>'<li><a href="'+SITE+'/c/global/'+encodeURIComponent(x.s)+'.html">'+esc(x.n)+'</a></li>').join('');
 return '<section id="'+MARKER+'" class="sm-page sm-page--wide" aria-labelledby="'+MARKER+'-heading">'+
 '<div class="sm-prose"><h2 id="'+MARKER+'-heading">'+esc(c.n)+': product comparison and ordering guide</h2>'+
 '<p>The '+esc(c.n)+' catalogue contains supplier listings. Availability and specifications can vary by item and variant. Compare the details shown on each product page and request a current quote before paying.</p>'+
 '<h3>Can I order from my country?</h3><p>Delivery depends on the product, selected variant, supplier and destination. Check the destination and shipping options for the exact item; not every product can ship to every country.</p>'+
 '<h3>Are the displayed prices final?</h3><p>Supplier catalogue prices are estimates, not an all-inclusive checkout quote. Verify the product price, available variants, freight, taxes where applicable and the final currency before confirming an order.</p>'+
 '<h3>What should I check before ordering?</h3><p>Confirm the real item images, dimensions, materials where supplied, variant selection, current stock, destination shipping and the returns policy. Contact the store if important product details are missing.</p>'+
 '<nav aria-label="Related global shopping categories"><h3>Related categories</h3><ul>'+links+'</ul></nav>'+
 '<p><a href="'+SITE+'/worldwide-shopping/">Worldwide shopping guidance</a> · <a href="'+SITE+'/shipping/">Shipping by destination</a> · <a href="'+SITE+'/returns/">Returns and refunds</a> · <a href="'+SITE+'/c/global/index.html">All global categories</a></p>'+
 '</div></section>';
}
function replaceContentAttr(h,identity,value){
 const rx=new RegExp('(<meta\\s+(?:name|property)="'+identity+'"\\s+content=")([^"]*)(")','i');
 if(!rx.test(h))throw Error('Missing '+identity);
 return h.replace(rx,(_m,start,_old,end)=>start+esc(value)+end);
}
function update(h,c){
 const expected=SITE+'/c/global/'+c.s+'.html';
 if(!h.includes('rel="canonical" href="'+expected+'"'))throw Error('Wrong canonical in '+c.s);
 if(!/<h1(?:\s|>)/i.test(h)||!h.includes('</main>'))throw Error('Invalid page structure '+c.s);
 const oldGuide=new RegExp('<section id="'+MARKER+'"[\\s\\S]*?<\\/section>\\s*','i');
 h=h.replace(oldGuide,'');
 const d=description(c);
 h=replaceContentAttr(h,'description',d);
 h=replaceContentAttr(h,'og:description',d);
 if(h.includes('name="twitter:description"'))h=replaceContentAttr(h,'twitter:description',d);
 h=h.replace(/Global items ship worldwide from our supplier network\./g,'International delivery depends on the selected item and destination.');
 h=h.replace(/Global items are prepaid and delivered worldwide\./g,'Order and delivery methods depend on the supplier, product and destination.');
 h=h.replace(/<\/main>/,guide(c)+'</main>');
 if(!h.includes('id="'+MARKER+'"'))throw Error('Guide insertion failed '+c.s);
 const links=related(c);
 if(!links.length)throw Error('No related categories '+c.s);
 if((h.match(/<h1(?:\s|>)/gi)||[]).length!==1)throw Error('Unexpected H1 count '+c.s);
 return {html:h,description:d,related:links.length};
}
let count=0,changed=0,links=0;const errors=[];
for(const c of all){
 const f=path.join(CATDIR,c.s+'.html');
 if(!fs.existsSync(f)){errors.push('missing category '+c.s);continue;}
 const original=fs.readFileSync(f,'utf8');
 try{
  const next=update(original,c);
  if(next.description.length>160)throw Error('Meta description too long');
  count++;links+=next.related;
  if(next.html!==original){changed++;if(!CHECK)fs.writeFileSync(f,next.html);}
 }catch(e){errors.push(c.s+': '+e.message);}
}
if(errors.length){console.error(JSON.stringify({errors:errors.slice(0,35),total_errors:errors.length}));process.exit(1);}
if(count!==all.length)throw Error('Category coverage incomplete');
console.log(JSON.stringify({mode:CHECK?'check':'deploy',categories:count,pages_rewritten:changed,related_category_links:links,shipping_claims:'reworded_to_conditional',source:'checked-in_supplier_category_manifest',version:MARKER}));
