// Live check of the product-video quick-buy dialog with the local woo-bridge.js swapped in (adds to the real cart, then removes; no order).
// Usage: node tools/video-quickbuy.e2e.mjs [path/to/woo-bridge.js]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const local=fs.readFileSync(process.argv[2]||new URL('../assets/js/woo-bridge.js',import.meta.url),'utf8');
const map=await (await fetch('https://sastamilaga.com/data/wp/product-ids.json')).json();
const b=await puppeteer.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:'new'});
let pass=0,fail=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); c?pass++:fail++;};
async function open(cc){const ctx=await b.createBrowserContext();const p=await ctx.newPage();await p.setViewport({width:1280,height:900});
 await p.setRequestInterception(true); p.on('request',r=>{if(/\/assets\/js\/woo-bridge\.js/.test(r.url()))r.respond({status:200,contentType:'text/javascript',body:local});else r.continue();});
 await p.evaluateOnNewDocument(c=>localStorage.setItem('sm_market',JSON.stringify({country:c,currency:c==='PK'?'PKR':'SAR',lang:'en'})),cc);
 await p.goto('https://sastamilaga.com/?v='+Date.now(),{waitUntil:'networkidle2',timeout:120000}); await new Promise(r=>setTimeout(r,4000)); return {ctx,p};}
async function openCard(p,mapped){
  const ids=await p.evaluate(()=>[...document.querySelectorAll('[data-vm-src][data-vm-q]')].filter(c=>{const r=c.getBoundingClientRect();return r.width>0&&r.height>0}).map(c=>c.getAttribute('data-vm-q')));
  const pick=ids.find(id=>mapped?map[id]:!map[id]); if(!pick) return null;
  await p.evaluate(id=>{const c=[...document.querySelectorAll('[data-vm-src][data-vm-q]')].find(x=>x.getAttribute('data-vm-q')===id);c.scrollIntoView({block:'center'});},pick);
  const el=await p.evaluateHandle(id=>[...document.querySelectorAll('[data-vm-src][data-vm-q]')].find(x=>x.getAttribute('data-vm-q')===id),pick);
  await el.asElement().click(); await new Promise(r=>setTimeout(r,1500));
  return {id:pick,open:await p.evaluate(()=>!!document.getElementById('smvm')?.open)};
}
const toast=p=>p.evaluate(()=>(document.getElementById('sm-static-toast')||{}).textContent||'');
const guard=p=>p.evaluate(()=>!!document.getElementById('sm-woo-cart-notice'));
{ const {ctx,p}=await open('PK'); const c=await openCard(p,true);
  ok(c&&c.open,'PK: video card opens the quick-buy dialog ('+(c&&c.id)+')');
  if(c&&c.open){ await p.click('#smvm-cart'); await new Promise(r=>setTimeout(r,15000));
    const t=await toast(p); ok(/Added to your cart/.test(t),'PK: "'+t+'"'); ok(!(await guard(p)),'PK: no static-cart guard message');
    const cart=await p.evaluate(async()=>{const r=await fetch('/wp-json/wc/store/v1/cart',{credentials:'include'});return {n:r.headers.get('nonce'),j:await r.json()}});
    const item=(cart.j.items||[]).find(i=>String(i.id)===String(map[c.id])||(i.sku||'').toLowerCase()===c.id.toLowerCase());
    ok(!!item,'PK: item in the REAL WooCommerce cart (items='+cart.j.items_count+')');
    if(item){const rm=await p.evaluate(async(k,n)=>(await fetch('/wp-json/wc/store/v1/cart/remove-item',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json',Nonce:n},body:JSON.stringify({key:k})})).status,item.key,cart.n);ok(rm===200,'PK: test item removed (no order)');} }
  await ctx.close(); }
{ const {ctx,p}=await open('SA'); const c=await openCard(p,true);
  if(c&&c.open){ await p.click('#smvm-cart'); await new Promise(r=>setTimeout(r,15000)); const t=await toast(p); ok(/Pakistan only/.test(t)&&!(await guard(p)),'SA: honest refusal "'+t+'"'); }
  else { const n=await p.evaluate(()=>[...document.querySelectorAll('[data-vm-src][data-vm-q]')].filter(c=>c.getBoundingClientRect().width>0).length); console.log('  SA: '+n+' visible local video cards (local products are hidden outside Pakistan), so the local dialog is not reachable there'); }
  await ctx.close(); }
{ const {ctx,p}=await open('PK'); const c=await openCard(p,false);
  if(c&&c.open){ await p.click('#smvm-cart'); await new Promise(r=>setTimeout(r,6000)); const t=await toast(p); ok(/WhatsApp/.test(t)&&!(await guard(p)),'PK unmapped item ('+c.id+'): WhatsApp fallback "'+t+'"'); }
  else console.log('  (no unmapped video card on the home page to test)');
  await ctx.close(); }
console.log(pass+' passed, '+fail+' failed'); await b.close();


