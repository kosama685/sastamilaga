#!/usr/bin/env node
/**
 * Sasta Milaga global-supplier catalogue structural audit.
 * READ ONLY. This does NOT create a Merchant feed, approve offers, assign stock,
 * estimate a final checkout price, or change Google Merchant Center settings.
 * All lookup buckets are scanned: every supplier ID is accounted for.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const dataDir=path.join(ROOT,'data/cj/lookup');
const manifest=JSON.parse(fs.readFileSync(path.join(dataDir,'manifest.json'),'utf8'));
const files=fs.readdirSync(dataDir).filter(f=>/^[a-f0-9]{3}\.json$/.test(f)).sort();
const validId=/^(?:[0-9]{19}|[A-Fa-f0-9]{8}-(?:[A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12})$/;
const seen=new Set();
const counts={records:0,uniqueIDs:0,missingTitles:0,missingPrimaryImages:0,invalidImageURLs:0,missingSupplierSkus:0,invalidIDs:0,duplicateIDs:0,badBuckets:0};
const failures=[],byCategory={};
function note(kind,file,id){if(failures.length<60)failures.push({kind,file,id})}
for(const f of files){
  let bucket;
  try{bucket=JSON.parse(fs.readFileSync(path.join(dataDir,f),'utf8'))}catch(e){counts.badBuckets++;note('invalid_json',f,'');continue}
  const rows=Object.entries(bucket.items||{});
  if(rows.length!==bucket.count||bucket.snapshot!==manifest.snapshot){counts.badBuckets++;note('bucket_count_or_snapshot_mismatch',f,'')}
  for(const [id,row] of rows){
    counts.records++;
    if(seen.has(id)){counts.duplicateIDs++;note('duplicate_id',f,id)}else seen.add(id);
    if(!validId.test(id)){counts.invalidIDs++;note('invalid_id',f,id)}
    if(!Array.isArray(row)){counts.badBuckets++;note('invalid_row',f,id);continue}
    const [sku,title,category,slug,image]=row;
    if(!sku)counts.missingSupplierSkus++;
    if(!String(title||'').trim())counts.missingTitles++;
    if(!String(image||'').trim())counts.missingPrimaryImages++;
    else if(!/^https:\/\/[^\s]+$/i.test(String(image)))counts.invalidImageURLs++;
    const cat=String(slug||category||'uncategorized').slice(0,150);
    byCategory[cat]=(byCategory[cat]||0)+1;
  }
}
counts.uniqueIDs=seen.size;
const expected=Number(manifest.unique_ids);
const complete=files.length===Number(manifest.shards)&&counts.records===expected&&counts.uniqueIDs===expected&&counts.badBuckets===0&&counts.invalidIDs===0&&counts.duplicateIDs===0;
const result={
  generatedAt:new Date().toISOString(),sourceSnapshot:manifest.snapshot,
  source:'data/cj/lookup/*.json',sourceProductsExpected:expected,lookupShardsExpected:manifest.shards,
  lookupShardsScanned:files.length,counts,categoryCount:Object.keys(byCategory).length,structuralCoveragePass:complete,
  merchantStatus:'NOT VERIFIED - DO NOT SUBMIT AS APPROVED INVENTORY',
  googleAccountMisrepresentationReview:'NOT VERIFIED',
  retailPricesVerified:0,liveInventoryVerified:0,productCheckoutsVerified:0,
  sourceRecordsAssessedForRetailEligibility:counts.records,
  restrictions:[
    'Supplier snapshot is discovery inventory, not confirmed retail offers.',
    'No confirmed checkout price, live stock or reliable country-specific shipping per supplier record is present in the lookup buckets.',
    'This scan does not verify live product URLs, Googlebot crawling, images at their source, GTIN, product claims or Merchant Center approval.',
    'Global XML feeds must not be marked Merchant-ready based solely on structural coverage.'
  ],
  feedLocations:{
    globalIndex:'https://sastamilaga.com/feeds/global/index.json',
    globalXMLFirst:'https://sastamilaga.com/feeds/global/1.xml',
    localCandidate:'https://sastamilaga.com/feeds/google-merchant.xml',
    qualifiedSitemap:'https://sastamilaga.com/sitemap-global-qualified.xml'
  },
  issuesSample:failures,
  categories:byCategory
};
fs.mkdirSync(path.join(ROOT,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'artifacts/global-merchant-readiness-audit.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({expected,scanned:counts.records,shards:files.length,unique:counts.uniqueIDs,missingImages:counts.missingPrimaryImages,invalidImages:counts.invalidImageURLs,missingTitles:counts.missingTitles,complete,merchantStatus:result.merchantStatus}));
if(!complete)process.exitCode=1;
