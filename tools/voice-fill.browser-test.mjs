// Browser test for assets/js/voice-fill.js. Serve the repo root (e.g. node serve.mjs . 8137), then: node tools/voice-fill.browser-test.mjs
// Needs puppeteer-core and Chrome (CHROME env var or the default Windows path).
import puppeteer from 'puppeteer-core';
const b=await puppeteer.launch({executablePath:process.env.CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:'new'});
let pass=0,fail=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); c?pass++:fail++;};
// A) local fixture with the fixed voice-fill.js
const p=await b.newPage(); await p.goto('http://localhost:'+(process.env.PORT||8137)+'/tools/fixtures/voice-fill.html',{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,800));
const r=await p.evaluate(()=>{const n=s=>document.querySelectorAll(s).length;return {search:document.querySelector('form.smh-search').querySelectorAll('.sm-vf__mic').length, chat:document.querySelector('.smwa-web__composer').querySelectorAll('.sm-vf__mic').length, honeypot:!!document.querySelector('[name=website]').closest('.sm-vf'), contact:document.querySelector('#contact').querySelectorAll('.sm-vf__mic').length, card:!!document.querySelector('[name=card]').closest('.sm-vf')}});
ok(r.search===0,'header search: voice-fill adds no second mic (has its own "Search by voice")');
ok(r.chat===1,'chat: exactly one mic, on the message field ('+r.chat+')');
ok(!r.honeypot,'chat honeypot field gets no mic');
ok(r.contact===2,'ordinary form: name and email still get a mic ('+r.contact+')');
ok(!r.card,'card field still never voice-filled');
const g=await p.evaluate(()=>{const co=document.getElementById('co'),fill=co.querySelector('.sm-vf-fill'),main=co.querySelector('.gdcs-checkout-main'),aside=co.querySelector('.gdcs-checkout-aside'),gp=document.getElementById('gridplain');
  return {coFirst:co.firstElementChild.className, fillParent:fill&&fill.parentNode.className, fillBeforeFields:!!fill&&fill.nextElementSibling&&fill.nextElementSibling.className, sameRow:Math.abs(main.getBoundingClientRect().top-aside.getBoundingClientRect().top)<2&&aside.getBoundingClientRect().left>main.getBoundingClientRect().left,
    gpFirst:gp.firstElementChild.className, gpFillIn:!!gp.querySelector('.sec > .sm-vf-fill')};});
ok(g.coFirst==='gdcs-checkout-main'&&g.sameRow,'checkout grid: main column stays first and "Your order" stays beside it ('+g.coFirst+')');
ok(g.fillParent==='woocommerce-billing-fields'&&g.fillBeforeFields==='woocommerce-billing-fields__field-wrapper','checkout: voice button sits inside the billing card, above the fields');
ok(g.gpFirst==='sec'&&g.gpFillIn,'any grid form: the voice button goes inside the first section, never a grid cell');
await p.click('.smwa-web__composer .sm-vf__mic'); ok(await p.evaluate(()=>window.__started>=1),'chat mic starts speech recognition');
await p.close();
console.log(pass + ' passed, ' + fail + ' failed'); await b.close(); process.exit(fail ? 1 : 0);

