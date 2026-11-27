/* Promotion publication requires explicit evidence and bounded eligibility. */
export function eligiblePromotions(entries,market,now=Date.now()){
 const localUrl=value=>{try{return new URL(value,'https://sastamilaga.com').origin==='https://sastamilaga.com'&&!String(value).startsWith('//');}catch{return false;}};
 return entries.filter(p=>p.market===market&&p.verified===true&&typeof p.title==='string'&&p.title.trim().length>3&&typeof p.evidenceUrl==='string'&&/^https:\/\//.test(p.evidenceUrl)&&localUrl(p.termsUrl)&&localUrl(p.url)&&p.termsUrl&&p.url&&Date.parse(p.startsAt)<=now&&Date.parse(p.endsAt)>now&&Date.parse(p.endsAt)>Date.parse(p.startsAt));
}
