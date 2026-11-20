// Live check of the mega-menu counts before deploy: swaps in the local assets/js/market.js and data/market-counts.json on a live page.
// Usage: node tools/market-counts.e2e.mjs [repoRoot]   (needs puppeteer-core + Chrome)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const repo=process.argv[2]||new URL('..',import.meta.url).pathname.replace(/^\/(\w:)/,'$1').replace(/\/$/,''); const mjs=fs.readFileSync(repo+'/assets/js/market.js','utf8'), json=fs.readFileSync(repo+'/data/market-counts.json','utf8');
const b=await puppeteer.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:'new'});
let pass=0,fail=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); c?pass++:fail++;};
async function open(cc,url='https://sastamilaga.com/shipping-to/'){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.setViewport({width:1280,height:900});
  await p.setRequestInterception(true);
  p.on('request',r=>{const u=r.url(); if(/\/assets\/js\/market\.js/.test(u)) r.respond({status:200,contentType:'text/javascript',body:mjs}); else if(/\/data\/market-counts\.json/.test(u)) r.respond({status:200,contentType:'application/json',body:json}); else r.continue();});
  if(cc) await p.evaluateOnNewDocument(c=>{try{localStorage.setItem('sm_market',JSON.stringify({country:c,currency:c==='PK'?'PKR':'SAR',lang:'en'}))}catch(e){}},cc);
  else await p.evaluateOnNewDocument(()=>{Object.defineProperty(navigator,'webdriver',{get:()=>false});});
  await p.goto(url+'?v='+Date.now(),{waitUntil:'networkidle2',timeout:120000}); await new Promise(r=>setTimeout(r,2500));
  return {ctx,p};
}
const menu=p=>p.evaluate(()=>({items:[...document.querySelectorAll('a.smh-item')].filter(a=>/c\/[a-z-]+\.html$|global\/g\//.test(a.getAttribute('href')||'')).map(a=>[a.querySelector('strong')?.textContent,a.querySelector('small')?.textContent,a.getAttribute('href')]),all:[...document.querySelectorAll('a')].map(a=>[a.textContent.trim(),a.getAttribute('href')]).find(x=>/^Shop (all )?[\d,]+/.test(x[0]))}));
// Saudi
{ const {ctx,p}=await open('SA'); const m=await menu(p);
  const home=m.items.find(i=>/Home/.test(i[0])), fash=m.items.find(i=>/Fashion/.test(i[0])), trav=m.items.find(i=>/Outdoor/.test(i[0]));
  ok(home&&home[1]==='29,515 global products'&&/global\/g\/home-and-living\/$/.test(home[2]),'SA: Home & Living -> '+JSON.stringify(home));
  ok(fash&&fash[1]==='114,141 global products','SA: Fashion -> '+JSON.stringify(fash));
  ok(trav&&trav[0]==='Sports & Outdoor'&&/sports-and-outdoor/.test(trav[2]),'SA: Travel & Outdoor becomes Sports & Outdoor -> '+JSON.stringify(trav));
  ok(m.all&&/^Shop 451,812 global products/.test(m.all[0])&&/c\/global\/index\.html$/.test(m.all[1]),'SA: '+JSON.stringify(m.all));
  ok(m.items.length===7,'SA: all 7 categories updated ('+m.items.length+')');
  // click through
  await p.evaluate(h=>{location.href=h},home[2]); await p.waitForNavigation({waitUntil:'networkidle2',timeout:90000}).catch(()=>{}); await new Promise(r=>setTimeout(r,2500));
  ok(await p.evaluate(()=>/29,515 products/.test(document.body.innerText)),'SA: landing page shows the same 29,515 ('+(await p.evaluate(()=>location.pathname))+')');
  // switch to Pakistan without reload
  await p.goto('https://sastamilaga.com/shipping-to/?v='+Date.now(),{waitUntil:'networkidle2'}); await new Promise(r=>setTimeout(r,2000));
  await p.evaluate(()=>{localStorage.setItem('sm_market',JSON.stringify({country:'PK',currency:'PKR',lang:'en'}));window.dispatchEvent(new CustomEvent('sm:market',{detail:{country:'PK'}}));}); await new Promise(r=>setTimeout(r,800));
  const back=await menu(p); const h2=back.items.find(i=>/Home/.test(i[0]));
  ok(h2&&h2[1]==='4,933 products'&&/c\/home-and-living\.html$/.test(h2[2])&&/^Shop all 20,165 products/.test(back.all[0]),'SA->PK switch restores local: '+JSON.stringify(h2)+' '+back.all[0]);
  await ctx.close(); }
// Pakistan
{ const {ctx,p}=await open('PK'); const m=await menu(p); const h=m.items.find(i=>/Home/.test(i[0]));
  ok(h&&h[1]==='4,933 products'&&/c\/home-and-living\.html$/.test(h[2])&&/^Shop all 20,165 products/.test(m.all[0]),'PK: local counts unchanged '+JSON.stringify(h)); await ctx.close(); }
// No destination yet (crawler-like): markup untouched
{ const {ctx,p}=await open(null); const cc=await p.evaluate(()=>localStorage.getItem('sm_market')); const m=await menu(p); const h=m.items.find(i=>/Home/.test(i[0]));
  console.log('  (no-destination visitor; market.js auto-detect stored:',cc,')');
  ok(!!h,'no-destination: menu present -> '+JSON.stringify(h)); await ctx.close(); }
console.log(pass+' passed, '+fail+' failed'); await b.close();

