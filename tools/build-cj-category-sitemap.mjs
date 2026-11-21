#!/usr/bin/env node
/**
 * Complete, source-backed global CJ CATEGORY sitemap only.
 * Never publish all supplier ID records as product URLs: source snapshot
 * allow_indexing=false and no product checkout/stock evidence is implied.
 *
 * node tools/build-cj-category-sitemap.mjs
 * node tools/build-cj-category-sitemap.mjs --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'data/cj/manifest.js'),'utf8');
const catalogue=JSON.parse(source.slice(source.indexOf('{'),source.lastIndexOf('}')+1));
const lookup=JSON.parse(fs.readFileSync(path.join(root,'data/cj/lookup/manifest.json'),'utf8'));
const filenames=fs.readdirSync(path.join(root,'data/cj/c')).filter(x=>x.endsWith('.js'));
const categories=catalogue.cats||[];
const slugs=new Set(categories.map(x=>x.s));
const total=categories.reduce((n,x)=>n+Number(x.c||0),0);
if(categories.length!==572||slugs.size!==572||filenames.length!==572||
  catalogue.total!==451812||lookup.unique_ids!==451812||lookup.duplicates!==0||
  lookup.allow_indexing!==false||total!==lookup.unique_ids||
  categories.some(x=>!x.s||!/^[-a-z0-9]+$/.test(x.s)||!Number.isSafeInteger(x.c)||x.c<1)||
  filenames.some(f=>!slugs.has(f.slice(0,-3)))||
  [...slugs].some(s=>!filenames.includes(s+'.js'))) {
  throw Error('CJ source/category inventory mismatch: do NOT publish incomplete XML');
}
const groups=new Map();
for(const c of categories)groups.set(c.g,(groups.get(c.g)||0)+c.c);
if((catalogue.groups||[]).some(g=>groups.get(g.n)!==g.c)||
  groups.size!==catalogue.groups.length)throw Error('CJ department counts mismatch');
const lines=[
 '<?xml version="1.0" encoding="UTF-8"?>',
 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
 ...[...slugs].sort().map(s=>'<url><loc>https://sastamilaga.com/c/global/'+s+'.html</loc></url>'),
 '</urlset>',
 ''
];
const expected=lines.join('\n');
const target=path.join(root,'sitemap-cj-global-categories.xml');
if(process.argv.includes('--check')){
 if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==expected)
   throw Error('Committed category sitemap differs from source; rebuild and review before merging');
 console.log('PASS: 572 category URLs accounted for in XML; 451812 source supplier IDs; no product URL implied');
}else{
 fs.writeFileSync(target,expected);
 console.log('Wrote 572 canonical category locations to '+target);
}
