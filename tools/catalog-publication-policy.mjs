// Shared publication policy for future staged renderer and sitemap integration.
// Pure decision function. Callers must supply trusted evidence and release context.
// No live writes, indexing switches, or merchant submissions.
export function evaluatePublication(record, context){
  const r=record??{}, c=context??{}, reasons=[];
  const require=(condition,reason)=>{if(!condition)reasons.push(reason)};
  const fresh=(from,to)=>Number.isSafeInteger(from)&&Number.isSafeInteger(to)&&Number.isSafeInteger(c.nowMs)&&from>0&&from<=c.nowMs&&to>c.nowMs&&to>from;
  const validText=s=>typeof s==="string"&&s.trim().length>0;
  require(c.releaseApproved===true,"release_not_approved");
  require(validText(c.activeVersion)&&r.publicationVersion===c.activeVersion,"publication_version_mismatch");
  require(validText(c.productId)&&r.productId===c.productId,"product_identity_mismatch");
  require(validText(c.locale)&&r.locale===c.locale,"locale_mismatch");
  require(validText(r.contentRevision)&&r.contentRevision===c.contentRevision,"content_revision_mismatch");
  // Expected canonical must come from the independently verified URL registry.
  // Accept only canonical HTTPS paths on the storefront, never arbitrary origins.
  const canonical=typeof r.canonicalUrl==="string"&&/^https:\/\/sastamilaga\.com\/[A-Za-z0-9/_%-]+$/.test(r.canonicalUrl)&&!r.canonicalUrl.slice(24).includes("//")&&!/%(?:2e|2f|5c|00)/i.test(r.canonicalUrl)&&!/%(?![0-9a-f]{2})/i.test(r.canonicalUrl)&&r.canonicalUrl===c.canonicalUrl;
  require(canonical,"canonical_mismatch");
  require(fresh(r.evidenceUpdatedAt,r.evidenceExpiresAt),"evidence_missing_or_expired");
  require(validText(r.evidenceRef),"evidence_reference_missing");
  for(const key of ["contentApproved","identityVerified","mediaVerified","canonicalVerified","translationVerified","crawlAllowed","routeVerified"]){
    require(r[key]===true,key+"_not_verified");
  }
  const seoReasons=[...reasons];
  const seoIndexEligible=seoReasons.length===0;
  const merchantReasons=[...seoReasons];
  const mr=(condition,reason)=>{if(!condition)merchantReasons.push(reason)};
  mr(r.pageType==="purchasable","not_purchasable_page");
  mr(validText(c.market)&&r.market===c.market&&/^[A-Z]{2}$/.test(c.market),"market_mismatch");
  mr(fresh(r.offerUpdatedAt,r.offerExpiresAt),"offer_evidence_missing_or_expired");
  mr(validText(r.offerEvidenceRef),"offer_evidence_reference_missing");
  for(const key of ["priceVerified","availabilityVerified","shippingVerified","checkoutVerified","merchantPolicyVerified"]){
    mr(r[key]===true,key+"_not_verified");
  }
  return {seoIndexEligible,merchantEligible:merchantReasons.length===0,seoReasons,merchantReasons};
}
