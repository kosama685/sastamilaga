#!/usr/bin/env node
/* Non-mutating static-site URL and shared-chrome audit.
 * Run: node tools/audit-internal-urls.mjs
 * Optional: --strict fails CI when internal static references are missing.
 * Excludes API/dynamic routes and does not claim these respond successfully.
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(), LIMIT=300;
const SKIP=new Set(['node_modules','.git','.next','coverage','.cache']);
const validFiles=new Set(),htmlFiles=[];
function walk(dir='') {
 for(const d of fs.readdirSync(path.join(ROOT,dir),{withFileTypes:true})){
  const p=path.posix.join(dir,d.name);
  if(d.isDirectory()){if(!SKIP.has(d.name))walk(p);}
  else if(d.isFile()) {validFiles.add('/'+p);if(/\.html?$/i.test(p))htmlFiles.push(p);}
 }
}
walk();
const knownDynamic=/^\/(?:api\/|wp-json\/|wp-admin\/|global-shop\/p\/|global\/p\/|product\/|category\/|sitemaps\/|cart\/|checkout\/|my-account\/|wc-api\/|shop\/search\/|wp-content\/plugins\/woocommerce\/assets\/client\/blocks\/)/i;
const knownHash=/#\/(?:global|product|category|cart|checkout|shop|search|travel)/i;
const problems=[],chromeIssues=[],oldCategoryLinks=[],internalRefs=new Set();
const slashNormalize=s=>s.replace(/\/{2,}/g,'/');
function staticTarget(u) {
 const p=decodeURIComponent(u.pathname).replace(/\/{2,}/g,'/');
 if(validFiles.has(p))return true;
 if(p==='/'&&validFiles.has('/index.html'))return true;
 if(p.endsWith('/')&&validFiles.has(p+'index.html'))return true;
 if(!/\.[a-z0-9]{1,8}$/i.test(p)&&validFiles.has(p+'/index.html'))return true;
 return false;
}
const htmlAttrs=/<(?:a|link|script|img|source|form)\b[^>]*?\b(href|src|action)=["']([^"']+)["']/gi;
for(const filename of htmlFiles){
 const full=path.join(ROOT,filename);
 let data;
 try{data=fs.readFileSync(full,'utf8');}catch{continue;}
 const page=new URL('https://sastamilaga.com/'+filename);
 const match=data.match(/<base\b[^>]*href=["']([^"']+)/i);
 let base=page;
 if(match)try{base=new URL(match[1],page)}catch{}
 const hasFallback=data.includes('sm-chrome-header'), hasFooterPlaceholder=data.includes('sm-chrome-footer');
 if((hasFallback||hasFooterPlaceholder)&&(!hasFallback||!hasFooterPlaceholder||!data.includes('chrome.js')))
  chromeIssues.push({source:filename,problem:'incomplete dynamic header/footer chrome'});
 // First party pages should contain either shared header and footer, or both placeholders.
 if(/^(p\/|c\/|b\/)/.test(filename) && !(hasFallback&&hasFooterPlaceholder) && !(/<header\b/i.test(data)&&/<footer\b/i.test(data)))
  chromeIssues.push({source:filename,problem:'no shared chrome or matching placeholders'});
 htmlAttrs.lastIndex=0;
 let m;
 while((m=htmlAttrs.exec(data))!==null) {
  const raw=m[2].trim();
  if(!raw||/^(?:#|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(raw)||knownHash.test(raw))continue;
  let url;try{url=new URL(raw,base)}catch{continue}
  if(!['sastamilaga.com','www.sastamilaga.com','kosama685.github.io'].includes(url.hostname))continue;
  // GitHub Pages prefix is an alternate deployment, not a different asset tree.
  if(url.hostname==='kosama685.github.io')url.pathname=url.pathname.replace(/^\/sastamilaga(?=\/)/,'');
  internalRefs.add(url.pathname);
  const p=slashNormalize(url.pathname);
  if(/^\/shop\/[a-z0-9-]+\.html\/?$/i.test(p)) {
    oldCategoryLinks.push({source:filename,target:p});
    // handled by verified Cloudflare category-alias worker, not a missing file
    continue;
  }
  if(knownDynamic.test(p))continue;
  if(p.startsWith('/#/'))continue;
  if(staticTarget(url))continue;
  // An extensionless route can be an intentional app route; report only exact asset/html references.
  if(!/\.(?:html?|css|js|json|svg|png|jpe?g|gif|webp|ico|woff2?|xml|txt|webmanifest)(?:\/)?$/i.test(p))continue;
  if(problems.length<LIMIT)problems.push({source:filename,target:p,attribute:m[1]});
 }
}
const result={generatedAt:new Date().toISOString(),htmlFiles:htmlFiles.length,repoFiles:validFiles.size,distinctInternalPaths:internalRefs.size,legacyShopCategoryLinks:oldCategoryLinks.length,missingStaticReferences:problems.length,missingIsTruncated:problems.length===LIMIT,chromeIssues:chromeIssues.length,notes:['Dynamic supplier/API/checkout routes and WordPress-served WooCommerce block CSS are excluded from repository-only existence checks. The WooCommerce CSS returned HTTP 200 on production on 2026-11-15.','A static audit does not prove live HTTP status or working checkout.','Legacy /shop/category.html links are redirected only when a corresponding category exists.'],sampleMissing:problems.slice(0,100),sampleChrome:chromeIssues.slice(0,70),sampleLegacy:oldCategoryLinks.slice(0,30)};
fs.mkdirSync(path.join(ROOT,'reports'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'reports','url-audit-ci.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({htmlFiles:result.htmlFiles,distinctInternalPaths:result.distinctInternalPaths,missingStaticReferences:result.missingStaticReferences,chromeIssues:result.chromeIssues,legacyShopCategoryLinks:result.legacyShopCategoryLinks}));
if(process.argv.includes('--strict')&&(problems.length||chromeIssues.length))process.exitCode=1;
