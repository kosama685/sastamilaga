// Proves assets/js/pdp-static.js leaves LOCAL product pages unchanged: compares a live local page with the live script and with the local file.
// Usage: node tools/pdp-static-local-regression.mjs [path/to/pdp-static.js]
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const mine = fs.readFileSync(process.argv[2] || new URL('../assets/js/pdp-static.js', import.meta.url), 'utf8');
const b = await puppeteer.launch({executablePath: process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new'});
async function snap(useMine) {
  const p = await b.newPage(); await p.setViewport({width: 1280, height: 900});
  if (useMine) { await p.setRequestInterception(true); p.on('request', r => /\/assets\/js\/pdp-static\.js/.test(r.url()) ? r.respond({status: 200, contentType: 'text/javascript', body: mine}) : r.continue()); }
  await p.goto('https://sastamilaga.com/p/7-wing-neck-fans-mini-portable-outdoor-fan-personal-fan-biggest-rechargeable-bat-hhc-3762503.html?v=' + Date.now(), {waitUntil: 'networkidle2', timeout: 120000}); await new Promise(r => setTimeout(r, 4000));
  const s = await p.evaluate(() => ({side: (document.querySelector('.pdp-side .sm-del')?.innerText || '').replace(/\s+/g, ' '), trust: (document.querySelector('.sm-trust')?.innerText || '').replace(/\s+/g, ' '), qty: !!document.getElementById('pdpQty'), total: (document.getElementById('pdpTotal')?.innerText || '').replace(/\s+/g, ' '), thumbs: document.querySelectorAll('.gallery-thumbs button').length, tabR: (document.getElementById('tab-r')?.innerText || '').slice(0, 60), descTab: (document.getElementById('tab-d')?.innerText || '').length}));
  await p.close(); return s;
}
const before = await snap(false), after = await snap(true);
console.log('live  :', JSON.stringify(before)); console.log('edited:', JSON.stringify(after));
console.log(JSON.stringify(before) === JSON.stringify(after) ? 'PASS local product page identical with the edited pdp-static.js' : 'FAIL local page changed');
await b.close();

