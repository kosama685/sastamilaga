#!/usr/bin/env node
/** Detect discrepancies in existing static local product shipping offers.
 * Read-only: never replaces source shipping rules or rewrites product markup.
 * Run: node tools/audit-local-shipping-parity.mjs [--enforce]
 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT=process.cwd(),folder=path.join(ROOT,'p');
const output=path.join(ROOT,'reports','seo','local-shipping-parity.json');
const files=fs.readdirSync(folder).filter(f=>f.endsWith('.html'));
const groups=new Map(),samples=[],counts={files:files.length,withShippingSchema:0,withVisiblePolicyRate:0,conflicts:0,unparseable:0,unknown:0};
for(const name of files){
  const html=fs.readFileSync(path.join(folder,name),'utf8');
  const schema=html.match(/"shippingDetails"\s*:\s*\{[^}]*"shippingRate"\s*:\s*\{[^}]*"value"\s*:\s*"?(\d+(?:\.\d+)?)/);
  if(!schema){counts.unknown++;continue}
  counts.withShippingSchema++;
  const schemaRate=Number(schema[1]);
  const faq=html.match(/Delivery\s+in\s+Pakistan\s+is\s+Rs\s*(\d+(?:\.\d+)?)/i);
  const visiblyDeclared=faq?Number(faq[1]):null;
  if(visiblyDeclared===null){counts.unknown++;continue}
  counts.withVisiblePolicyRate++;
  if(schemaRate!==visiblyDeclared){
    counts.conflicts++;
    const k=schemaRate+' vs '+visiblyDeclared;
    groups.set(k,(groups.get(k)||0)+1);
    if(samples.length<30)samples.push({url:'https://sastamilaga.com/p/'+name,schemaRatePKR:schemaRate,visiblePolicyRatePKR:visiblyDeclared});
  }
}
const report={generatedAt:new Date().toISOString(),scope:"Static local /p/*.html shipping schema compared with visible delivery FAQ; checkout tariff and actual shipping methods are NOT verified",counts,conflictGroups:Object.fromEntries(groups),samples,action:"Confirm authoritative WooCommerce shipping method and customer-visible tariff before changing any Product Offer, feed, or payment totals",safe:true};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({counts,groups:Object.fromEntries(groups),report:output}));
if(process.argv.includes('--enforce')&&counts.conflicts)process.exitCode=1;
