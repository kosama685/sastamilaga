// Real Chromium, actual global.js and catalog-facets.js, synthetic catalog/evidence only.
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const require=createRequire(process.env.SM_BROWSER_MODULES+'/package.json');
const {chromium}=require('playwright'),axePath=require.resolve('axe-core/axe.min.js');
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const src=await fs.readFile('assets/js/global.js','utf8'),core=await fs.readFile('assets/js/catalog-facets.js','utf8'),css=await fs.readFile('assets/theme/static-bundle.css','utf8');
 const rows=Array.from({length:65},(_,i)=>['id'+String(i).padStart(2,'0'),'SM-'+i,i===0?'Blue smart watch':i===1?'Red smart watch':'Watch accessory '+i,10+i,10+i,'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',i===0]);
 let fail=false;
 await page.route('https://fixture.test/**',async route=>{
 const u=new URL(route.request().url());
 if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Catalog fixture</title><link rel="stylesheet" href="/style.css"></head><body><main id="app"></main><script>window.SMApp={esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;"),slug:s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-"),renderApp:h=>document.getElementById("app").innerHTML=h,setSEO(){},pageHead:t=>"<h1>"+t+"</h1>",toast(){},waLink(){},LIVE_URL:location.origin,SITE_URL:location.origin,route(){}};window.SM_CJ={cats:[{s:"smart-watches",n:"Smart Watches",g:"Electronics",c:65,lo:10,v:1}],groups:[]};</script><script src="/assets/js/global.js"></script><script>SMGlobal.route(["c","smart-watches"],"country=PK");</script></body></html>'});
 if(u.pathname==='/style.css')return route.fulfill({contentType:'text/css',body:css});
 if(u.pathname==='/assets/js/global.js')return route.fulfill({contentType:'application/javascript',body:src});
 if(u.pathname==='/assets/js/catalog-facets.js')return route.fulfill({contentType:'application/javascript',body:core});
 if(u.pathname==='/data/cj/c/smart-watches.js')return route.fulfill({contentType:'application/javascript',body:'SM_CJ_SHARD("smart-watches",'+JSON.stringify(rows)+');'});
 if(u.pathname==='/api/catalog-facets/v1'){
 if(fail)return route.fulfill({status:503,contentType:'application/json',body:'{}'});
 const country=u.searchParams.get('country'),until=Date.now()+60000;
 const e=country==='PK'?[{id:'id00',country,brand:'example',model:'x1',attributeUntil:until,stock:true,stockUntil:until,delivery:true,deliveryUntil:until,both:true,bothUntil:until}]:[];
 return route.fulfill({contentType:'application/json',body:JSON.stringify({schema:1,category:'smart-watches',country,rows:e,next:null})});
 }
 return route.fulfill({status:200,body:''});
 });
 await page.route('**/*',route=>route.request().url().startsWith('https://fixture.test/')?route.fallback():route.abort());
 await page.goto('https://fixture.test/');
 await page.waitForFunction(()=>document.querySelector('#gevidence')?.textContent.startsWith('1 of'));
 const count=()=>page.locator('#ggrid .sm-card').count();
 assert.equal(await count(),60);
 await page.locator('#gmore').click();assert.equal(await count(),65);
 await page.locator('#gq').fill('smart watch');assert.equal(await count(),2);
 await page.locator('#gvid').check();assert.equal(await count(),1);
 await page.locator('#gactive button[aria-label="Remove Video-labelled"]').click();assert.equal(await count(),2);
 await page.locator('#gbrand').selectOption('example');assert.equal(await count(),1);
 await page.locator('#gmodel').selectOption('x1');assert.equal(await count(),1);
 await page.locator('#gstock').check();await page.locator('#gdelivery').check();assert.equal(await count(),1);
 await page.locator('#gcountry').fill('GB');await page.locator('#gcountry').press('Tab');
 await page.waitForFunction(()=>document.querySelector('#gevidence')?.textContent.startsWith('0 of'));assert.equal(await count(),0);
 await page.locator('#gclear').click();assert.equal(await count(),60);
 await page.locator('#gmin').fill('20');await page.locator('#gmax').fill('10');assert.match(await page.locator('#gcount').innerText(),/valid price range/);
 await page.locator('#gclear').click();
 await page.locator('#gsort').selectOption('high');assert.match(await page.locator('#ggrid .sm-card__title').first().innerText(),/64/);
 await page.locator('#gcountry').fill('PK');await page.locator('#gcountry').press('Tab');
 await page.waitForFunction(()=>document.querySelector('#gevidence')?.textContent.startsWith('1 of'));
 fail=true;await page.locator('#gretry').click();await page.waitForFunction(()=>document.querySelector('#gevidence')?.textContent.includes('unavailable'));
 await page.locator('#gdelivery').check();assert.equal(await count(),0);
 await page.locator('#gclear').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'mobile overflow');
 await page.locator('#gq').focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'gmin');
 await page.addScriptTag({path:axePath});const audit=await page.evaluate(()=>axe.run({include:[['.sm-global-live-sidebar'],['#gactive'],['#gcount']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 await fs.mkdir('artifacts',{recursive:true});await fs.writeFile('artifacts/sidebar-axe.json',JSON.stringify(audit.violations,null,2));await page.screenshot({path:'artifacts/sidebar-mobile.png',fullPage:true});
 assert.deepEqual(audit.violations.map(v=>v.id),[]);assert.deepEqual(errors,[]);
 console.log('PASS real Chromium sidebar interactions, mobile width, keyboard and scoped axe (fixture data)');
}finally{await browser.close();}
