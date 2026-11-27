#!/usr/bin/env node
// Candidate-only local Merchant feed validation. NEVER submits a feed to Google,
// changes live prices/stock, or marks items Merchant approved.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const xml=fs.readFileSync(path.join(root,'feeds/google-merchant.xml'),'utf8');
const report=JSON.parse(fs.readFileSync(path.join(root,'feeds/merchant-report.json'),'utf8'));
const problems=[],seen=new Set();
if(!xml.startsWith('<?xml')||!xml.includes('xmlns:g="http://base.google.com/ns/1.0"'))problems.push('invalid_feed_envelope');
const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>m[1]);
if(items.length!==report.inFeed)problems.push('feed_count_differs_from_report');
if(report.productPages!==report.inFeed+report.excluded)problems.push('report_counts_do_not_balance');
for(const row of items){
 const field=name=>(row.match(new RegExp('<g:'+name+'>([\\s\\S]*?)<\\/g:'+name+'>'))||[])[1]||'';
 const id=field('id'),link=field('link'),price=field('price'),image=field('image_link'),shipping=field('shipping');
 if(!id||seen.has(id))problems.push('duplicate_or_missing_sku_'+id);else seen.add(id);
 if(!/^https:\/\/sastamilaga\.com\/p\/[a-z0-9-]+\.html$/.test(link))problems.push('unexpected_landing_url_'+id);
 else if(!fs.existsSync(path.join(root,new URL(link).pathname.slice(1))))problems.push('missing_landing_html_'+id);
 if(!/^[0-9]+(?:\.[0-9]{2}) PKR$/.test(price)||Number.parseFloat(price)<=0)problems.push('invalid_pkr_price_'+id);
 if(!/^https:\/\//.test(image))problems.push('missing_https_image_'+id);
 if(!row.includes('<g:shipping>'))problems.push('missing_shipping_data_'+id);
 if(problems.length>60)break;
}
const result={generatedAt:new Date().toISOString(),candidateOnly:true,source:'checked-in local Product/Offer structured data',productPages:report.productPages,candidateItems:items.length,excluded:report.excluded,rejectionReasons:report.excludedByReason||{},basicFormatChecks:problems.length?'fail':'pass',issues:problems.slice(0,30),merchantEligibility:'UNVERIFIED',checkoutAndPayment:'NOT_TESTED',stockFreshness:'UNVERIFIED',productIdentifiers:'NOT_VERIFIED',gscAuthentication:'NOT_TESTED',autoSubmittedToMerchantCenter:false};
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/merchant-candidate-preflight.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
if(problems.length)process.exit(1);
