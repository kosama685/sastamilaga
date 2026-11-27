#!/usr/bin/env node
/**
 * Sasta Milaga static SEO coverage scan.
 * READ-ONLY: scans all checked-in global category HTML and static product HTML.
 * It does not write product HTML, order data, sitemaps, meta tags or prices.
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE='https://sastamilaga.com';
const OUT='artifacts';
const scanTime=new Date().toISOString();
const summary={generated_utc:scanTime,scan_mode:'read_only',scope:{},issues:{},examples:{},shipping_schema_values:{}};
function increment(scope,code,file){
  const key=scope+':'+code;
  summary.issues[key]=(summary.issues[key]||0)+1;
  const arr=summary.examples[key]||(summary.examples[key]=[]);
  if(arr.length<12)arr.push(file);
}
function attr(tag,k) {
  const m=tag.match(new RegExp('\\b'+k+'\\s*=\\s*(["\\x27])(.*?)\\1','i'));
  return m?.[2]||'';
}
function meta(html,key,valueAttr='name'){
  for(const m of html.matchAll(/<meta\b[^>]*>/gi)){
    if(attr(m[0],valueAttr).toLowerCase()===key.toLowerCase())return attr(m[0],'content');
  }
  return '';
}
function canonical(html){
  for(const m of html.matchAll(/<link\b[^>]*>/gi)){
    if(attr(m[0],'rel').split(/\s+/i).includes('canonical'))return attr(m[0],'href');
  }
  return '';
}
function scanFile(rel,scope){
  const html=fs.readFileSync(rel,'utf8');
  const head=html.slice(0,Math.min(html.indexOf('</head>')>0?html.indexOf('</head>')+7:120000,150000));
  const title=(head.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||'';
  const desc=meta(head,'description').trim();
  const robots=meta(head,'robots').toLowerCase();
  const can=canonical(head);
  const expected=SITE+'/'+rel.replaceAll('\\','/');
  if(!title)increment(scope,'missing_title',rel);
  if(!desc || desc.length<35)increment(scope,'short_or_missing_description',rel);
  if(!can)increment(scope,'missing_canonical',rel);
  else if(can!==expected)increment(scope,'canonical_mismatch',rel);
  if(/\bnoindex\b/.test(robots))increment(scope,'noindex',rel);
  const h1=(html.match(/<h1(?:\s|>)/gi)||[]).length;
  if(h1!==1)increment(scope,'h1_not_one',rel);
  if(!meta(head,'og:title','property'))increment(scope,'missing_og_title',rel);
  if(!meta(head,'og:image','property'))increment(scope,'missing_og_image',rel);
  const schemas=[...head.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if(!schemas.length)increment(scope,'no_jsonld',rel);
  else for(const s of schemas)try{JSON.parse(s[1]);}catch{increment(scope,'invalid_jsonld',rel);}
  if(scope==='product'){
    const priceMatch=head.match(/"shippingRate"\s*:\s*\{[^}]*"value"\s*:\s*"?([0-9.]+)"?/i);
    if(priceMatch){
      const v=priceMatch[1];
      summary.shipping_schema_values[v]=(summary.shipping_schema_values[v]||0)+1;
    }
  }
  return {title,can};
}
function scanDir(dir,scope){
  if(!fs.existsSync(dir))throw new Error('Required repository directory missing: '+dir);
  const files=fs.readdirSync(dir).filter(x=>x.endsWith('.html')).sort();
  let n=0;
  for(const file of files){scanFile(path.posix.join(dir,file),scope);n++;}
  summary.scope[scope]=n;
  return files;
}
const categoryFiles=scanDir('c/global','global_category');
const productFiles=scanDir('p','product');
const sitemap=fs.readFileSync('sitemap-global.xml','utf8');
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
summary.scope.category_sitemap_urls=locs.length;
summary.scope.static_product_html_files=productFiles.length;
summary.scope.global_category_files=categoryFiles.length;
const paths=new Set(categoryFiles.map(x=>SITE+'/c/global/'+x));
for(const loc of locs) if(!paths.has(loc))increment('global_category','sitemap_url_without_file',loc);
for(const file of categoryFiles)if(!locs.includes(SITE+'/c/global/'+file))increment('global_category','file_not_in_sitemap',file);

fs.mkdirSync(OUT,{recursive:true});
fs.writeFileSync(OUT+'/seo-static-coverage.json',JSON.stringify(summary,null,2)+'\n');
const lines=[
'# Sasta Milaga — repository-wide static SEO audit',
'',
'Checked: '+scanTime,
'',
'**No site content or commerce configuration was modified by this scan.**',
'',
'## Complete inventory',
'',
...Object.entries(summary.scope).map(([k,v])=>'- '+k+': **'+v.toLocaleString('en-US')+'**'),
'',
'## SEO findings',
'',
'| Scope / test | Count |',
'|---|---:|',
...Object.entries(summary.issues).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'| '+k+' | '+v+' |'),
'',
'## Structured-data shipping rate values (reported, not judged against checkout)',
'',
...Object.entries(summary.shipping_schema_values).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'- '+k+': '+v.toLocaleString('en-US')+' product pages'),
'',
'Important: static Product Offer shipping schema must be cross-checked against live checkout charges and Merchant feed. This audit does not assert a correct shipping rate.',
'',
'## Examples (up to 12 per issue)',
'',
...Object.entries(summary.examples).map(([k,v])=>'### '+k+'\n'+v.map(s=>'- '+s).join('\n')),
''
];
const md=lines.join('\n');
fs.writeFileSync(OUT+'/seo-static-coverage.md',md);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,md.slice(0,30000));
console.log(JSON.stringify({scope:summary.scope,issues:summary.issues,shipping_schema_values:summary.shipping_schema_values},null,2));
