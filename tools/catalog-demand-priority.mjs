// Demand prioritizes research/enrichment; never overrides SEO or commerce eligibility.
export const WEIGHTS=Object.freeze({demand:25,intent:20,feasibility:20,differentiation:15,ranking:10,conversion:10});
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
export function prioritizeDemand(input){
 const r=input??{},factors=r.factors??{},missing=[],invalid=[],known=[];
 for(const [key,weight] of Object.entries(WEIGHTS)){
  const f=factors[key];
  if(f==null||f.value==null){missing.push(key);continue}
  if(!Number.isFinite(f.value)||f.value<0||f.value>100||!nonempty(f.evidenceRef)){invalid.push(key);continue}
  known.push({key,weight,value:f.value});
 }
 const coverage=known.reduce((s,f)=>s+f.weight,0);
 const weighted=known.reduce((s,f)=>s+f.weight*f.value/100,0);
 const hardBlocks=Array.isArray(r.hardBlocks)?r.hardBlocks.filter(nonempty):[];
 const observed=Number.isFinite(r.pageImpressions28d)&&r.pageImpressions28d>=0?r.pageImpressions28d:null;
 const score=coverage===100&&invalid.length===0?weighted:null;
 let state='RESEARCH_BACKLOG';
 if(hardBlocks.length)state='BLOCKED';
 else if(score!==null)state=score>=80?'PRIORITY_GROWTH':score>=60?'VALIDATED_DEVELOPMENT':score>=40?'FURTHER_RESEARCH':'LOW_PRIORITY';
 return {state,score,coverage,scoreBounds:[weighted,weighted+100-coverage],missing,invalid,hardBlocks,ctrScreen:observed===null?'UNKNOWN':observed>=50?'REVIEW':'LOW_SAMPLE',publicationApproved:false};
}
