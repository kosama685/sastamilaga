#!/usr/bin/env node
/**
 * Scenario-only UK eBay screening. Never auto-lists, buys, changes Merchant
 * products, or implies an eBay sold-price / carrier quote was verified.
 */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const input=path.join(root,'data/research/uk-ebay-candidates-2026-11-19.json');
const data=JSON.parse(fs.readFileSync(input,'utf8'));
const {pkrPerGbp,pkrFirstKgShipping,pkrPacking,feeRateOnBuyerTotal,feeFixedGbp,vatRate}=data.scenario;
if(![pkrPerGbp,pkrFirstKgShipping,pkrPacking,feeRateOnBuyerTotal,feeFixedGbp,vatRate].every(x=>Number.isFinite(x)&&x>=0)||!pkrPerGbp)throw Error('Invalid scenario');
const round=x=>Math.round(x*100)/100;
const tested=data.products.map(p=>{
 const buyer=Number(p.claimedEbayBuyerPriceGbp),cost=Number(p.sourceCostPkr)/pkrPerGbp;
 if(!Number.isFinite(buyer)||buyer<0||!Number.isFinite(cost)||cost<0)throw Error('Invalid source costs: '+p.id);
 const delivery=(pkrFirstKgShipping+pkrPacking)/pkrPerGbp;
 const exVat=buyer/(1+vatRate),fees=buyer*feeRateOnBuyerTotal+feeFixedGbp;
 const contribution=exVat-fees-cost-delivery;
 const breakEven=(cost+delivery+feeFixedGbp)/(1/(1+vatRate)-feeRateOnBuyerTotal);
 const evidenceReady=Boolean(p.ebayPriceVerified&&p.ukWarehouseVerified&&p.ukShippingQuoteVerified&&p.ukStockVerified&&p.productSkuVerified&&p.marketSoldEvidence&&!p.complianceGate);
 return {id:p.id,name:p.name,sourceUrl:p.productUrl,costBasis:p.costBasis,claimedBuyerPriceGbp:buyer,sourceCostGbp:round(cost),shippingPackGbp:round(delivery),estimatedProfitGbp:round(contribution),estimatedBreakEvenGbp:round(breakEven),marginPositive:contribution>0,qualifiedForUKListing:evidenceReady&&contribution>0,decision:evidenceReady&&contribution>0?'READY_FOR_MANUAL_REVIEW':contribution<=0?'NOT_PROFITABLE_UNDER_ASSUMPTIONS':'BLOCKED_UNVERIFIED',gates:{eBaySoldPrice:p.ebayPriceVerified,UKInventory:p.ukWarehouseVerified,UKCarrierQuote:p.ukShippingQuoteVerified,liveStock:p.ukStockVerified,skuIdentity:p.productSkuVerified,marketDemand:p.marketSoldEvidence,compliance:!p.complianceGate},warning:p.complianceGate};
});
const output={generatedAt:new Date().toISOString(),type:'SCENARIO_ONLY',sourceSnapshot:input,assumptions:data.scenario,assumptionsNotVerified:data.caveats,summary:{evaluated:tested.length,profitableUnderAssumptions:tested.filter(p=>p.marginPositive).length,qualifiedForUKListing:tested.filter(p=>p.qualifiedForUKListing).length,notProfitable:tested.filter(p=>p.estimatedProfitGbp<=0).length},products:tested};
const dest=path.join(root,'reports','research');fs.mkdirSync(dest,{recursive:true});
const jsonPath=path.join(dest,'uk-ebay-feasibility-2026-11-19.json');
const mdPath=path.join(dest,'uk-ebay-feasibility-2026-11-19.md');
fs.writeFileSync(jsonPath,JSON.stringify(output,null,2)+'\n');
const header='# UK eBay candidate screening — scenario only\n\n**No verified winning products.** Do not list any item from this report without a real sold-price history, UK warehouse stock and carrier quote, and compliance proof.\n\n';
const table='| Candidate | Historical claimed eBay price | Scenario profit | Break-even | Gate |\n|---|---:|---:|---:|---|\n'+tested.map(p=>'| ['+p.name+']('+p.sourceUrl+') | £'+p.claimedBuyerPriceGbp.toFixed(2)+' | '+(p.estimatedProfitGbp<0?'−£':'£')+Math.abs(p.estimatedProfitGbp).toFixed(2)+' | £'+p.estimatedBreakEvenGbp.toFixed(2)+' | '+p.decision+' |').join('\n');
fs.writeFileSync(mdPath,header+'Assumptions: '+JSON.stringify(data.scenario)+'\n\n'+table+'\n\nAll fee, VAT, shipping and prices are scenarios. UK sale fulfilment and VAT treatment must be separately established for every offer.\n');
console.log(JSON.stringify(output.summary));
if(tested.length!==10||tested.some(p=>p.qualifiedForUKListing))throw Error('Unexpectedly approved product; review evidence');
