// Start node tools/serve-pages-like.mjs . 8797 first. All external requests are mocked; no real orders or payments.
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const puppeteer=require(process.env.SM_PUPPETEER_MODULE||'puppeteer-core');
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();let posts=[],failOrder=false,missingRate=false,errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.setViewport({width:390,height:844});
 await page.setRequestInterception(true);
 page.on('request',async r=>{
  const u=r.url();
  if(u.includes('/data/cj/c/qa.js'))return r.respond({status:200,contentType:'application/javascript',body:'SM_CJ_SHARD("qa",[["product-123","CJ123","CJ test product",10,10,"https://image.test/cover.jpg",""]]);'});
  if(u.includes('/api/cj/variants?'))return r.respond({status:200,contentType:'application/json',body:JSON.stringify({variants:[{vid:'variant-red',sku:'RED',key:'Red M',price:10},{vid:'variant-blue',sku:'BLUE',key:'Blue L',price:11}]})});
  if(u.startsWith('http://localhost:8797'))return r.continue();
  if(u.includes('open.er-api.com'))return r.respond({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},status:200,contentType:'application/json',body:JSON.stringify({result:'success',rates:{USD:.004},time_last_update_unix:Math.floor(Date.now()/1000)})});
  if(u.includes('/api/cj/product'))return r.respond({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},status:200,contentType:'application/json',body:JSON.stringify({variants:[{vid:'variant-red',sku:'RED',price:10}]})});
  if(u.includes('/api/cj/shipping'))return r.respond({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},status:200,contentType:'application/json',body:JSON.stringify({country:'PK',currency:'USD',methods:missingRate?[]:[{name:'Standard',price:5}]})});
  if(u.includes('formspree.io')){if(r.method()==='POST')posts.push(r.postData());return r.respond({headers:{'Access-Control-Allow-Origin':'*'},status:failOrder?503:200,contentType:'application/json',body:JSON.stringify({ok:!failOrder})});}
  if(u.startsWith('https://www.paypal.com/'))return r.respond({headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'},status:200,contentType:'text/html',body:'<h1>Test PayPal handoff</h1>'});
  return r.abort();
 });
 await page.goto('http://localhost:8797/order/');
 await page.evaluate(()=>{sessionStorage.clear();SMOrderCart.clear()});
 await page.setContent('<main><script type="application/ld+json">{"@type":"Product","sku":"LOCAL-SKU","name":"Local shirt","offers":{"@type":"Offer","priceCurrency":"PKR","price":"1000"}}</script><b id="qty">3</b><button data-add-cart="LOCAL-SKU">Add to cart</button><a aria-label="Buy now" href="#/checkout">Buy now</a></main>');
 await page.addScriptTag({url:'http://localhost:8797/assets/js/woo-bridge.js'});
 await page.click('[data-add-cart]');await page.waitForFunction(()=>SMOrderCart.count()===3);
 assert.equal(await page.evaluate(()=>SMOrderCart.get()[0].unit),1000);
 assert.equal(await page.evaluate(()=>SMOrderCart.get()[0].name),'Local shirt');
 await page.click('[aria-label="Buy now"]');await page.waitForFunction(()=>location.pathname==='/order/');
 assert.equal(await page.evaluate(()=>SMOrderCart.count()),6);
 await page.evaluate(()=>{sessionStorage.clear();SMOrderCart.clear()});
 await page.setContent('<base href="http://localhost:8797/"><main><div id="sm-cj-rails"></div></main>');
 await page.evaluate(()=>{window.SM_CJ={groups:[{n:'QA',s:'qa'}],cats:[{s:'qa',n:'QA',g:'QA',c:1}]}});
 await page.addScriptTag({url:'http://localhost:8797/assets/js/cj-home-rails.js'});
 await page.waitForSelector('[data-cj-order="buy"]');await page.click('[data-cj-order="buy"]');
 await page.waitForSelector('#sm-cj-order-variant option:nth-child(2)');
 await page.select('#sm-cj-order-variant','1');await page.$eval('#sm-cj-order-qty',e=>{e.value='4';e.dispatchEvent(new Event('input'))});
 await page.click('#sm-cj-order-confirm');await page.waitForFunction(()=>location.pathname==='/order/'&&window.SMOrderCart?.get()[0]?.sku==='BLUE');
 assert.equal(await page.evaluate(()=>SMOrderCart.get()[0].sku),'BLUE');
 assert.equal(await page.evaluate(()=>SMOrderCart.get()[0].vkey),'variant-blue');
 assert.equal(await page.evaluate(()=>SMOrderCart.get()[0].qty),4);
 const local={type:'local',id:'local',sku:'LOCAL',name:'Local test product',unit:1000,qty:2};
 const cj={type:'cj',id:'product-123',sku:'RED',vkey:'variant-red',vname:'Red M',name:'CJ test product',unit:12,qty:2};
 async function seed(rows){await page.goto('http://localhost:8797/order/');await page.evaluate(rows=>{sessionStorage.clear();SMOrderCart.clear();rows.forEach(r=>SMOrderCart.add(r));},rows);await page.reload();}
 async function fill(method){await page.evaluate(method=>{const f=document.getElementById('sm-request-form');Object.entries({full_name:'QA Test',phone:'+923001234567',email:'qa@example.test',address:'Test address',city:'Lahore',country:'PK',postal_code:'54000',payment_preference:method}).forEach(([k,v])=>f.elements[k].value=v);f.elements.confirm_request.checked=true;f.dispatchEvent(new Event('change',{bubbles:true}));},method);}
 await seed([local,cj]);await fill('card');await page.click('#sm-check-total');await page.waitForFunction(()=>!document.getElementById('sm-request-submit').disabled);
 assert.match(await page.$eval('#sm-payment-total',e=>e.textContent),/USD 38.00/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:path.join(process.env.SM_QA_OUTPUT||os.tmpdir(),'checkout-mobile.png'),fullPage:true});
 await page.click('#sm-request-submit');await page.waitForFunction(()=>location.hostname==='www.paypal.com');
 const url=new URL(page.url());assert.equal(url.searchParams.get('amount'),'38.00');assert.equal(url.searchParams.get('landing_page'),'Billing');assert.equal(posts.length,1);
 await page.goto('http://localhost:8797/order/?payment=cancelled');
 assert.equal(await page.evaluate(()=>SMOrderCart.count()),4);assert.match(await page.$eval('#sm-request-status',e=>e.textContent),/cancelled/);
 assert.equal(await page.$eval('[name=full_name]',e=>e.value),'QA Test');assert.equal(await page.$eval('#sm-resume-payment',e=>e.hidden),false);
 // Reload and submit the same pending invoice: no second Formspree request.
 await fill('card');await page.click('#sm-check-total');await page.waitForFunction(()=>!document.getElementById('sm-request-submit').disabled);await page.click('#sm-request-submit');
 assert.equal(posts.length,1);
 missingRate=true;await seed([cj]);await fill('paypal');await page.click('#sm-check-total');await page.waitForFunction(()=>document.getElementById('sm-payment-total').textContent.includes('Rate unavailable'));
 assert.equal(await page.$eval('#sm-request-submit',e=>e.disabled),true);
 await fill('quote');failOrder=true;await page.click('#sm-request-submit');await page.waitForFunction(()=>document.getElementById('sm-request-status').textContent.includes('NOT confirmed'));
 assert.equal(await page.evaluate(()=>SMOrderCart.count()),2);
 const failedRef=posts.at(-1).match(/SM-REQ-[A-F0-9]{20}/)[0];failOrder=false;await page.click('#sm-request-submit');await page.waitForFunction(()=>document.getElementById('sm-request-status').textContent.includes('acknowledged'));
 assert.ok(posts.at(-1).includes(failedRef));assert.equal(await page.evaluate(()=>SMOrderCart.count()),0);
 assert.deepEqual(errors,[]);console.log('PASS: mobile mixed-cart pricing, exact USD/card handoff, one saved invoice, cancellation, draft restoration, missing rate, failed intake preservation, retry reference and empty cart; no browser errors.');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
