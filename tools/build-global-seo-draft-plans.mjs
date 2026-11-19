#!/usr/bin/env node
/**
 * Source-grounded, non-public SEO planning for every supplier record.
 * No HTML, robots changes, schema Offers, fabricated FAQs or public sitemaps.
 * Outputs proposed on-page keyword/title and sibling IDs; all require review.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {once} from 'node:events';
const root=process.cwd(),source=path.join(root,'data/cj/lookup');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
if(manifest.allow_indexing!==false)throw Error('Source snapshot must remain nonindexable');
const files=fs.readdirSync(source).filter(x=>/^[a-f0-9]{3}\.json$/.test(x)).sort();
const dirs=new Map(),ids=new Set();
const slugify=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90)||'unknown';
const title=x=>{let s=String(x||'').replace(/\s+/g,' ').trim();if(s.length<=60)return s;let a=s.slice(0,61);return a.slice(0,Math.max(20,a.lastIndexOf(' '))).trim()};
const label=x=>String(x||'').replace(/\s+/g,' ').trim();
let seen=0,skuless=0,imageless=0,missingTitles=0;
for(const file of files){
 const bucket=JSON.parse(fs.readFileSync(path.join(source,file),'utf8'));
 if(bucket.snapshot!==manifest.snapshot||Object.keys(bucket.items||{}).length!==bucket.count)throw Error('Bucket integrity failed: '+file);
 for(const [id,row] of Object.entries(bucket.items)){
  if(ids.has(id))throw Error('Repeated ID '+id);ids.add(id);seen++;
  const [sku,name,cat,rawSlug,img]=Array.isArray(row)?row:[];
  if(!sku)skuless++;if(!name)missingTitles++;if(!/^https:\/\/\S+$/i.test(String(img||'')))imageless++;
  const slug=slugify(rawSlug||cat),group=dirs.get(slug)||{category:label(cat)||'Uncategorized',slug,count:0,examples:[],sampleIds:[]};
  group.count++;
  // Bounded deterministic representative pool, not a claim of actual availability.
  // First 16 unique IDs is sufficient for suggestion-only links across shards.
  if(group.sampleIds.length<16)group.sampleIds.push(id);
  dirs.set(slug,group);
 }
}
if(seen!==manifest.source_catalogue_rows||ids.size!==manifest.unique_ids||files.length!==manifest.shards)throw Error('Manifest totals not met');
ids.clear();
const dir=path.join(root,'artifacts/global-seo');fs.mkdirSync(dir,{recursive:true});
const output=fs.createWriteStream(path.join(dir,'seo-draft-plans.jsonl.gz'));
const gzip=zlib.createGzip({level:6});gzip.pipe(output);
let written=0,withSuggestedTitles=0,withSiblingProposals=0;
async function write(text){if(!gzip.write(text))await once(gzip,'drain')}
for(const file of files){
 const bucket=JSON.parse(fs.readFileSync(path.join(source,file),'utf8'));
 for(const [id,row] of Object.entries(bucket.items)){
  const [sku,rawName,rawCategory,rawSlug,image]=Array.isArray(row)?row:[];
  const name=label(rawName),category=label(rawCategory),slug=slugify(rawSlug||rawCategory);
  const siblings=(dirs.get(slug)?.sampleIds||[]).filter(x=>x!==id).slice(0,6);
  const proposedTitle=title(name)||null;
  const record={
   supplierId:id,supplierSKU:sku||null,sourceCategory:category||null,
   categorySlug:slug,sourceTitle:name||null,sourceImage:/^https:\/\/\S+$/i.test(String(image||''))?image:null,
   // Suggested title / keyword only. No manufactured benefits, claims or search volume.
   titleDraft:proposedTitle,primaryKeywordHypothesis:proposedTitle,
   categoryLinkProposal:'/c/global/'+slug+'.html',
   relatedSupplierIdProposals:siblings,
   draftURL:'/global-shop/p/'+id+'/'+slugify(name)+'/',
   urlVerified:false,categoryURLVerified:false,relatedURLsVerified:false,
   imageRightsVerified:false,livePriceVerified:false,liveStockVerified:false,shippingVerified:false,
   bodyDescription:null,metaDescription:null,faqQuestions:[],faqAnswers:[],
   factualAttributesVerified:false,translationApproval:[],
   publishEligible:false,sitemapEligible:false,merchantEligible:false,
   qualityGates:['verify_authorized_media','verify_live_price_stock_shipping','verify_actual_canonical_url','verify_category_and_related_page_http_canonical','write_source_backed_unique_description','author_real_visible_faq_answers_if_useful','review_translation_and_market_checkout','human_editorial_approval']
  };
  if(proposedTitle)withSuggestedTitles++;
  if(siblings.length)withSiblingProposals++;
  written++;await write(JSON.stringify(record)+'\n');
 }
}
gzip.end();await once(output,'finish');
if(written!==manifest.source_catalogue_rows)throw Error('Draft plan count mismatch');
const summary={date:new Date().toISOString(),snapshot:manifest.snapshot,sourceProducts:seen,generatedDraftPlans:written,
 categories:dirs.size,titlesSuggested:withSuggestedTitles,internalLinkCandidates:withSiblingProposals,
 sourceMissing:{sku:skuless,title:missingTitles,image:imageless},
 publishedProductPages:0,verifiedFAQAnswers:0,verifiedTranslations:0,
 note:'Prepublication plans only: URL, keyword, links and title require real product/market checks; no search volume is implied.'};
fs.writeFileSync(path.join(dir,'seo-draft-plan-summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
