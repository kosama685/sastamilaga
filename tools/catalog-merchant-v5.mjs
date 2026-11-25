import {evaluatePublication} from './catalog-publication-policy.mjs';
// Internal conservative release screening, not a guarantee of Google approval.
const text=x=>typeof x==='string'&&x.trim().length>0;
export function validGTIN(value){
 if(typeof value!=='string'||!/^\d{8}$|^\d{12,14}$/.test(value)||/^0+$/.test(value))return false;
 let sum=0;
 for(let i=value.length-2,w=3;i>=0;i--,w=4-w)sum+=Number(value[i])*w;
 return (10-sum%10)%10===Number(value.at(-1));
}
export function evaluateMerchantV5(record,context,detail){
 const base=evaluatePublication(record,context),d=detail??{},c=context??{};
 const errors=[...base.merchantReasons];
 const check=(v,reason)=>{if(!v)errors.push(reason)};
 check(text(c.variantId)&&d.variantId===c.variantId,'variant_mismatch');
 check(text(c.destination)&&d.destination===c.destination,'destination_mismatch');
 for(const key of ['productId','locale','publicationVersion','contentRevision','market'])check(text(record?.[key])&&d[key]===record[key],key+'_evidence_mismatch');
 check(text(c.policyVersion)&&d.policyVersion===c.policyVersion,'policy_version_mismatch');
 check(Number.isSafeInteger(d.verifiedAt)&&Number.isSafeInteger(d.expiresAt)&&d.verifiedAt>0&&d.verifiedAt<=c.nowMs&&d.expiresAt>c.nowMs,'destination_evidence_expired');
 check(text(d.evidenceRef)&&d.destinationReviewed===true,'destination_not_reviewed');
 check(text(d.identifierEvidenceRef)&&d.identifierVerified===true,'identifier_not_verified');
 switch(d.identifierStatus){
 case 'ASSIGNED_GTIN':check(validGTIN(d.gtin)&&d.identifierExists===true&&d.gtinAssignmentVerified===true,'invalid_or_unverified_gtin');break;
 case 'BRAND_MPN':check(!d.gtin&&text(d.brand)&&text(d.mpn)&&d.identifierExists===true,'brand_mpn_invalid');break;
 case 'NO_ASSIGNED_IDENTIFIERS':check(!d.gtin&&!d.mpn&&!d.brand&&d.identifierExists===false,'no_identifier_claim_conflicts');break;
 default:errors.push('identifier_status_unknown_or_missing');
 }
 const states=['APPLICABLE_VERIFIED','ACCOUNT_LEVEL_INHERITED','NOT_APPLICABLE'];
 for(const [key,validator] of [
 ['cutoff',()=>/^([01]\d|2[0-3]):[0-5]\d$/.test(d.cutoffTime||'')&&validTimezone(d.cutoffTimezone)],
 ['minimumOrder',()=>Number.isSafeInteger(d.minimumOrderMinor)&&d.minimumOrderMinor>=0&&/^[A-Z]{3}$/.test(d.minimumOrderCurrency||'')],
 ['loyalty',()=>text(d.loyaltyProgramLabel)&&text(d.loyaltyTierLabel)]
 ]){
  const state=d[key+'State'];
  check(states.includes(state)&&text(d[key+'EvidenceRef']),key+'_applicability_unknown');
  if(state==='APPLICABLE_VERIFIED')check(validator(),key+'_invalid');
  if(state==='ACCOUNT_LEVEL_INHERITED')check(d[key+'InheritanceVerified']===true,key+'_inheritance_unverified');
 }
 if(d.productShippingOverride===true&&d.minimumOrderRequired===true)check(d.minimumOrderState==='APPLICABLE_VERIFIED','minimum_order_override_missing');
 check(typeof d.productShippingOverride==='boolean'&&typeof d.minimumOrderRequired==='boolean','shipping_scope_unknown');
 return {...base,merchantEligible:errors.length===0,merchantReasons:errors};
}
function validTimezone(v){if(!text(v))return false;try{new Intl.DateTimeFormat('en',{timeZone:v});return true}catch{return false}}
