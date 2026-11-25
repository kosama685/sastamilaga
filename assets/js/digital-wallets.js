/* Optional PayPal v6 digital wallets. Fail closed until the same-origin wallet order service is implemented and enabled.
 * Never send a browser price as an authoritative order total. Never collect or log card or wallet tokens.
 */
(function(g){
'use strict';
const PATH='/api/wallet-checkout';
const methods=['applepay','googlepay','paylater','venmo','credit'];
const scripts=new Map();
function load(src){
 if(scripts.has(src))return scripts.get(src);
 const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('SDK unavailable'))};document.head.appendChild(s)});
 scripts.set(src,p);p.catch(()=>scripts.delete(src));return p;
}
function enabled(c){return c?.walletCheckoutEnabled===true&&typeof c.walletClientId==='string'&&c.walletClientId.trim().length>0&&['sandbox','live'].includes(c.walletEnvironment)&&g.isSecureContext===true;}
function quoteValid(q,review,env,now=Date.now()){
 return !!q&&q.protocol==='sm-wallet-v1'&&q.environment===env&&q.authoritative===true&&q.orderPersistence===true&&q.captureVerification===true&&typeof q.quoteId==='string'&&q.quoteId.length>=16&&q.amount===review.amount&&q.currency===review.cur&&q.country===review.country&&/^[A-Z]{2}$/.test(q.merchantCountry||'')&&Number.isFinite(q.expiresAt)&&q.expiresAt>now&&q.expiresAt<=now+15*60000&&Array.isArray(q.methods);
}
function captureValid(c,o,q){return !!c&&c.status==='COMPLETED'&&c.verified===true&&c.persisted===true&&c.orderId===o.orderId&&typeof c.captureId==='string'&&c.captureId.length>0&&c.amount===q.amount&&c.currency===q.currency;}
function available(q,m){return methods.includes(m)&&q.methods.includes(m)&&(m!=='venmo'||(q.country==='US'&&q.merchantCountry==='US'));}
async function post(path,body){
 const r=await fetch(PATH+path,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 if(!r.ok||!String(r.headers.get('content-type')).includes('application/json'))throw Error('Wallet service unavailable');
 return r.json();
}
let instancePromise=null;
async function sdk(c){
 if(!instancePromise){instancePromise=(async()=>{await load(c.walletEnvironment==='live'?'https://www.paypal.com/web-sdk/v6/core':'https://www.sandbox.paypal.com/web-sdk/v6/core');return g.paypal.createInstance({clientId:c.walletClientId,components:['applepay-payments','googlepay-payments','paypal-payments','venmo-payments'],pageType:'checkout'});})();instancePromise.catch(()=>{instancePromise=null});}
 return instancePromise;
}
async function mount({root,review,cart,valid,begin,finish,uncertain,customer,config=g.SM_CONFIG,transport=post,getSdk=sdk}){
 if(!enabled(config)||!root||!valid())return false;
 let q;try{q=await transport('/quote',{cart,country:review.country,currency:review.cur});}catch{return false;}
 if(!quoteValid(q,review,config.walletEnvironment)||!valid()||!root.isConnected)return false;
 const supported=methods.filter(m=>available(q,m));if(!supported.length)return false;
 let pp;try{pp=await getSdk(config)}catch{return false;}
 if(!valid()||!root.isConnected)return false;
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const buttons=document.createElement('div');buttons.style.cssText='display:grid;gap:10px;margin-top:12px';
 let active=false,attempt=null,created=null,finished=false;
 function ready(){return valid()&&Date.now()<q.expiresAt&&root.isConnected;}
 function start(){if(active||finished||!ready()||!begin())return false;active=true;attempt=g.crypto.randomUUID();created=null;status.textContent='Opening secure payment…';return true;}
 function cancel(){if(finished)return;if(created||attempt&&active&&orderStarted){hold();return;}active=false;attempt=null;finish(false);status.textContent='Payment cancelled. No new payment was started.';}
 let orderStarted=false;
 function hold(){if(finished)return;active=false;finished=true;status.textContent='Payment status needs verification. Do not pay again. Contact support with your order reference.';uncertain(created?.reference||attempt);}
 async function create(method){
  if(!active||!ready()||!attempt||!available(q,method)||orderStarted)throw Error('Payment no longer ready');
  orderStarted=true;
  const o=await transport('/orders',{quoteId:q.quoteId,method,attemptId:attempt,customer:customer()});
  if(!o||!o.orderId||!o.reference||o.persisted!==true||o.amount!==q.amount||o.currency!==q.currency)throw Error('Order not verified');
  created=o;return {orderId:o.orderId};
 }
 async function capture(id){
  if(!active||!created||id!==created.orderId)throw Error('Order mismatch');
  const c=await transport('/capture',{orderId:id,attemptId:attempt});
  if(!captureValid(c,created,q))throw Error('Capture needs verification');
  finished=true;active=false;status.textContent='Payment verified. Order reference: '+created.reference;
  finish(true,created.reference);
 }
 function fail(){if(orderStarted)hold();else{active=false;attempt=null;finish(false);status.textContent='Payment is unavailable. Choose another eligible method.';}}
 function add(node){buttons.appendChild(node);}
 async function apple(){
  if(!g.ApplePaySession?.canMakePayments?.()||!g.ApplePaySession.supportsVersion(4))return;
  const a=await pp.createApplePayOneTimePaymentSession(),cfg=await a.config();
  if(!Array.isArray(cfg.supportedNetworks)||!cfg.supportedNetworks.length||!Array.isArray(cfg.merchantCapabilities)||cfg.isEligible===false)return;
  await load('https://applepay.cdn-apple.com/jsapi/v1/apple-pay-sdk.js');
  const b=document.createElement('apple-pay-button');b.setAttribute('buttonstyle','black');b.setAttribute('type','pay');b.setAttribute('locale','en');b.style.cssText='width:100%;height:44px';
  b.addEventListener('click',()=>{if(!start())return;try{
   const total={label:'Sasta Milaga',amount:q.amount,type:'final'};
   const session=new g.ApplePaySession(4,{countryCode:q.merchantCountry,currencyCode:q.currency,merchantCapabilities:cfg.merchantCapabilities,supportedNetworks:cfg.supportedNetworks,requiredBillingContactFields:['name','postalAddress'],total});
   session.onvalidatemerchant=async e=>{try{const v=await a.validateMerchant({validationUrl:e.validationURL});session.completeMerchantValidation(v.merchantSession)}catch{session.abort();fail()}};
   session.onpaymentmethodselected=()=>session.completePaymentMethodSelection({newTotal:total});
   session.oncancel=cancel;
   session.onpaymentauthorized=async e=>{try{const o=await create('applepay');await a.confirmOrder({orderId:o.orderId,token:e.payment.token,billingContact:e.payment.billingContact});await capture(o.orderId);session.completePayment({status:g.ApplePaySession.STATUS_SUCCESS});}catch{session.completePayment({status:g.ApplePaySession.STATUS_FAILURE});fail();}};
   session.begin();
  }catch{fail();}});add(b);
 }
 async function google(){
  await load('https://pay.google.com/gp/p/js/pay.js');
  const a=pp.createGooglePayOneTimePaymentSession(),cfg=await a.getGooglePayConfig();
  if(!Array.isArray(cfg.allowedPaymentMethods)||!cfg.allowedPaymentMethods.length||cfg.isEligible===false)return;
  const client=new g.google.payments.api.PaymentsClient({environment:config.walletEnvironment==='live'?'PRODUCTION':'TEST',paymentDataCallbacks:{onPaymentAuthorized:async data=>{
   try{const o=await create('googlepay'),confirmed=await a.confirmOrder({orderId:o.orderId,paymentMethodData:data.paymentMethodData});if(confirmed.status!=='APPROVED')throw Error('Additional payer action required');await capture(o.orderId);return {transactionState:'SUCCESS'};}catch{fail();return {transactionState:'ERROR',error:{intent:'PAYMENT_AUTHORIZATION',reason:'OTHER_ERROR',message:'Payment could not be verified. Check order status before retrying.'}};}
  }}});
  const base={apiVersion:cfg.apiVersion,apiVersionMinor:cfg.apiVersionMinor,allowedPaymentMethods:cfg.allowedPaymentMethods};
  if(!(await client.isReadyToPay(base)).result)return;
  const b=client.createButton({buttonType:'pay',buttonColor:'black',onClick:()=>{if(!start())return;client.loadPaymentData({...base,merchantInfo:cfg.merchantInfo,transactionInfo:{countryCode:cfg.countryCode||q.merchantCountry,currencyCode:q.currency,totalPriceStatus:'FINAL',totalPrice:q.amount,totalPriceLabel:'Total'},callbackIntents:['PAYMENT_AUTHORIZATION']}).catch(cancel);}});add(b);
 }
 async function alternate(m){
  const eligible=await pp.findEligibleMethods({currencyCode:q.currency,amount:q.amount,countryCode:q.country});
  if(!eligible.isEligible(m))return;
  const defs={paylater:['createPayLaterOneTimePaymentSession','paypal-pay-later-button'],venmo:['createVenmoOneTimePaymentSession','venmo-button'],credit:['createPayPalCreditOneTimePaymentSession','paypal-credit-button']};
  const [factory,tag]=defs[m];if(typeof pp[factory]!=='function')return;
  const session=pp[factory]({onApprove:async d=>{try{await capture(d.orderId)}catch{fail();throw Error('Capture needs verification')}},onCancel:cancel,onError:fail});
  const b=document.createElement(tag);if(m!=='venmo'){const d=eligible.getDetails(m);if(!d?.countryCode)return;b.countryCode=d.countryCode;if(m==='paylater'){if(!d.productCode)return;b.productCode=d.productCode;}}
  b.addEventListener('click',()=>{if(!start())return;session.start({presentationMode:'popup'},create(m)).catch(fail);});add(b);
 }
 await Promise.allSettled(supported.map(m=>m==='applepay'?apple():m==='googlepay'?google():alternate(m)));
 if(!ready()||!buttons.children.length)return false;
 const title=document.createElement('p');title.textContent='More secure payment options';title.style.fontWeight='700';
 root.replaceChildren(title,buttons,status);root.hidden=false;return true;
}
g.SMDigitalWallets=Object.freeze({mount,enabled,quoteValid,captureValid,available});
})(window);
