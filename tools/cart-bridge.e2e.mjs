// Live end-to-end check of the cart bridge, BEFORE deploying: loads a live product page, swaps in the local assets/js/woo-bridge.js,
// presses the page's own Add to cart in a Pakistan session and in a Saudi session, reads the real WooCommerce cart back, then removes the test item.
// No order is ever created. Usage: node tools/cart-bridge.e2e.mjs [path/to/woo-bridge.js]   (needs puppeteer-core + Chrome)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const local=fs.readFileSync(process.argv[2]||new URL('../assets/js/woo-bridge.js',import.meta.url),'utf8');
const URL_='https://sastamilaga.com/p/7-wing-neck-fans-mini-portable-outdoor-fan-personal-fan-biggest-rechargeable-bat-hhc-3762503.html';
const b=await puppeteer.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:'new'});
let pass=0,fail=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); c?pass++:fail++;};
async function session(country){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage(); await p.setViewport({width:1280,height:900});
  await p.setRequestInterception(true);
  p.on('request',r=>{ if(/\/assets\/js\/woo-bridge\.js/.test(r.url())) r.respond({status:200,contentType:'text/javascript',body:local}); else r.continue(); });
  await p.evaluateOnNewDocument(c=>{try{localStorage.setItem('sm_market',JSON.stringify({country:c,currency:c==='PK'?'PKR':'SAR',lang:'en'}))}catch(e){}},country);
  await p.goto(URL_+'?v='+Date.now(),{waitUntil:'networkidle2',timeout:120000});
  return {ctx,p};
}
async function clickAdd(p){
  const h=await p.evaluateHandle(()=>[...document.querySelectorAll('main a,main button')].find(a=>/^add to cart/i.test((a.textContent||'').trim())));
  if(!h.asElement()) return false; await h.asElement().evaluate(e=>e.scrollIntoView({block:'center'})); await h.asElement().click(); return true;
}
const toast=p=>p.evaluate(()=>{const t=document.getElementById('sm-static-toast');return t?t.textContent.trim():''});
const guard=p=>p.evaluate(()=>!!document.getElementById('sm-woo-cart-notice'));
// Pakistan
{ const {ctx,p}=await session('PK');
  ok(await p.evaluate(()=>!!window.SMWoo&&typeof window.SMWoo.decide==='function'),'PK: patched woo-bridge loaded on the live page');
  ok(await clickAdd(p),'PK: found the page "Add to cart" control');
  await new Promise(r=>setTimeout(r,15000));
  const t=await toast(p); ok(/Added to your cart/.test(t),'PK: toast says added ("'+t+'")'); ok(!(await guard(p)),'PK: no "static cart" guard message');
  const cart=await p.evaluate(async()=>{const r=await fetch('/wp-json/wc/store/v1/cart',{credentials:'include'});return {nonce:r.headers.get('nonce'),j:await r.json()}});
  const item=(cart.j.items||[]).find(i=>/hhc-3762503/i.test(i.sku||'')||/neck fan/i.test(i.name||''));
  ok(!!item,'PK: item is in the REAL WooCommerce cart (items_count='+cart.j.items_count+', total '+(cart.j.totals?.total_price)+' '+(cart.j.totals?.currency_code)+')');
  await p.goto('https://sastamilaga.com/cart/?v='+Date.now(),{waitUntil:'networkidle2',timeout:120000});
  ok(await p.evaluate(()=>/neck fan/i.test(document.body.innerText)),'PK: /cart/ page shows the item');
  const badge=await p.evaluate(()=>[...document.querySelectorAll('.smh-cart__count')].map(e=>e.textContent));
  console.log('header badge on /cart/:',JSON.stringify(badge));
  if(item){ const rm=await p.evaluate(async(key,n)=>{const r=await fetch('/wp-json/wc/store/v1/cart/remove-item',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Nonce:n},body:JSON.stringify({key})});return r.status},item.key,cart.nonce); ok(rm===200,'PK: test item removed again (no order created)'); }
  await ctx.close(); }
// Saudi Arabia (outside Pakistan)
{ const {ctx,p}=await session('SA');
  ok(await clickAdd(p),'SA: found the page "Add to cart" control');
  await new Promise(r=>setTimeout(r,15000));
  const t=await toast(p); ok(/Pakistan only/.test(t),'SA: honest refusal ("'+t+'")'); ok(!(await guard(p)),'SA: no "static cart" guard message');
  ok(await p.evaluate(()=>{const t=document.getElementById('sm-static-toast');return !!t&&!!t.querySelector('a[href="/global-shop/"]')}),'SA: offers "See items that ship to you" -> /global-shop/');
  await ctx.close(); }
console.log(pass+' passed, '+fail+' failed'); await b.close();

