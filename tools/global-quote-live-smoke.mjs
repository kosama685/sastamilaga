import fs from 'node:fs';
const base='https://sastamilaga.com';
const checks=[
  {path:'/',test:html=>html.includes('assets/js/global.js?v=quote-checkout-20261122-1'),name:'home references the current global script'},
  {path:'/assets/js/global.js?v=quote-checkout-20261122-1',test:js=>js.includes('Request shipping &amp; total')&&js.includes('window.__gcAct =')&&!js.includes('Verifying your selection with secure WooCommerce checkout'),name:'global purchase buttons use request checkout, not legacy Woo'},
  {path:'/assets/js/global-quote-flow.js',test:js=>js.includes('SMGlobalQuote')&&js.includes('requestOnly:true'),name:'quote cart adapter published'},
  {path:'/assets/js/order-cart.js',test:js=>js.includes('SMOrderCart')&&js.includes('finalTotal:null'),name:'request cart published with unverified final'},
  {path:'/order/',test:html=>html.includes('id="sm-request-form"')&&html.includes('noindex,nofollow'),name:'request-only checkout page live'},
  {path:'/request-cart/',test:html=>html.includes('request-items')&&html.includes('noindex,nofollow'),name:'request-cart review page live'}
];
const report={at:new Date().toISOString(),base,checks:[]};
async function read(path){
  const url=base+path;
  const response=await fetch(url,{headers:{'Accept':'text/html,application/javascript;q=0.9,*/*;q=0.8','X-Sasta-Healthcheck':'1'},signal:AbortSignal.timeout(16000)});
  const text=await response.text();
  if(response.status!==200)throw Error('HTTP '+response.status);
  return text;
}
for(const check of checks){
  let last='unavailable',ok=false;
  for(let attempt=1;attempt<=4;attempt++){
    try{const content=await read(check.path);ok=!!check.test(content);last=ok?'verified':'unexpected HTML/script version';}
    catch(e){last=e.message;}
    if(ok)break;
    if(attempt<4)await new Promise(resolve=>setTimeout(resolve,4000));
  }
  report.checks.push({path:check.path,name:check.name,pass:ok,reason:ok?undefined:last});
  console.log((ok?'PASS ':'FAIL ')+check.name+' '+check.path+(ok?'':' ('+last+')'));
}
fs.mkdirSync('artifacts',{recursive:true});
fs.writeFileSync('artifacts/global-quote-live-smoke.json',JSON.stringify(report,null,2));
if(report.checks.some(c=>!c.pass))process.exitCode=1;
