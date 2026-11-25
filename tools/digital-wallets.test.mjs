import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const source=readFileSync(new URL('../assets/js/digital-wallets.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const configSource=readFileSync(new URL('../assets/js/config.js',import.meta.url),'utf8');
const config={walletCheckoutEnabled:true,walletClientId:'fixture',walletEnvironment:'sandbox'};
const review={amount:'29.00',cur:'USD',country:'US'};
function node(tag){return {tag,children:[],hidden:true,isConnected:true,style:{},events:{},setAttribute(){},appendChild(x){this.children.push(x);if(x.tag==='script')x.onload();},replaceChildren(...x){this.children=x;},addEventListener(n,fn){this.events[n]=fn;},remove(){}}}
function fixture({method='paylater',capturePatch={},quotePatch={},eligible=true,configPatch={},createError=false}={}){
 const root=node('root'),calls=[],events=[];
 const q={protocol:'sm-wallet-v1',environment:'sandbox',authoritative:true,orderPersistence:true,captureVerification:true,quoteId:'fixture-quote-id-123',amount:'29.00',currency:'USD',country:'US',merchantCountry:'US',expiresAt:Date.now()+60000,methods:[method],...quotePatch};
 let callbacks,googleCallbacks,appleSession,googleRequest,valid=true;
 class Apple {static STATUS_SUCCESS=1;static STATUS_FAILURE=0;static canMakePayments(){return true}static supportsVersion(){return true}constructor(version,request){this.request=request;appleSession=this}begin(){}completePayment(v){events.push(['apple',v.status])}completeMerchantValidation(){}completePaymentMethodSelection(){}abort(){}}
 class Google {constructor(options){googleCallbacks=options.paymentDataCallbacks}async isReadyToPay(){return {result:eligible}}createButton(opts){const b=node('google');b.events.click=opts.onClick;return b}async loadPaymentData(req){googleRequest=req}}
 const window={isSecureContext:true,crypto:{randomUUID:()=> 'attempt-123'},ApplePaySession:Apple,google:{payments:{api:{PaymentsClient:Google}}}};
 const document={createElement:node,head:node('head')};
 runInNewContext(source,{window,document,Date,Promise,Map});
 const api=window.SMDigitalWallets;
 const alternate=opts=>{callbacks=opts;return {start:async(o,p)=>{await p;}}};
 const pp={findEligibleMethods:async()=>({isEligible:()=>eligible,getDetails:()=>({countryCode:'US',productCode:'PAY_IN_4'})}),createPayLaterOneTimePaymentSession:alternate,createVenmoOneTimePaymentSession:alternate,createPayPalCreditOneTimePaymentSession:alternate,createApplePayOneTimePaymentSession:async()=>({config:async()=>({supportedNetworks:['visa'],merchantCapabilities:['supports3DS']}),validateMerchant:async()=>({merchantSession:{}}),confirmOrder:async()=>({status:'APPROVED'})}),createGooglePayOneTimePaymentSession:()=>({getGooglePayConfig:async()=>({allowedPaymentMethods:[{}],apiVersion:2,apiVersionMinor:0,merchantInfo:{},countryCode:'US'}),confirmOrder:async()=>({status:'APPROVED'})})};
 const order={orderId:'ORDER1',reference:'REF1',persisted:true,amount:'29.00',currency:'USD'};
 async function transport(path,body){calls.push({path,body});if(path==='/quote')return q;if(path==='/orders'){if(createError)throw Error('network');return order}return {status:'COMPLETED',verified:true,persisted:true,orderId:'ORDER1',captureId:'CAP1',amount:'29.00',currency:'USD',...capturePatch};}
 const options={root,review,cart:{local:[],global:[{pid:'p',vid:'v',qty:2,carrier:'Economy'}]},valid:()=>valid,begin:id=>{events.push(['begin',id]);return true},finish:(ok,ref)=>events.push(['finish',ok,ref]),uncertain:ref=>events.push(['hold',ref]),customer:()=>({full_name:'QA'}),config:{...config,...configPatch},transport,getSdk:async()=>pp};
 return {api,root,q,calls,events,options,setInvalid:()=>{valid=false},get callbacks(){return callbacks},get googleCallbacks(){return googleCallbacks},get appleSession(){return appleSession},get googleRequest(){return googleRequest},button:()=>root.children[1].children[0]};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('scripts compile and native feature is disabled by default',()=>{new Script(source);new Script(app);assert.match(configSource,/walletCheckoutEnabled:\s*false/);assert.match(configSource,/walletClientId:\s*''/);});
test('disabled feature makes no network requests',async()=>{const f=fixture({configPatch:{walletCheckoutEnabled:false}});assert.equal(await f.api.mount(f.options),false);assert.equal(f.calls.length,0);});
test('no public client ID makes no network requests',async()=>{const f=fixture({configPatch:{walletClientId:''}});assert.equal(await f.api.mount(f.options),false);assert.equal(f.calls.length,0);});
for(const patch of [{amount:'28.00'},{currency:'EUR'},{country:'GB'},{orderPersistence:false},{captureVerification:false},{authoritative:false},{expiresAt:1},{environment:'live'}])test('reject quote '+JSON.stringify(patch),async()=>{const f=fixture({quotePatch:patch});assert.equal(await f.api.mount(f.options),false);assert.equal(f.root.hidden,true);assert.equal(f.calls.length,1);});
test('Venmo excluded when either country is outside US',async()=>{const f=fixture({method:'venmo',quotePatch:{merchantCountry:'GB'}});assert.equal(await f.api.mount(f.options),false);});
test('provider ineligible option is not shown',async()=>{const f=fixture({eligible:false});assert.equal(await f.api.mount(f.options),false);});
test('Pay Later creates one persisted order, then verifies exact capture',async()=>{const f=fixture();assert.equal(await f.api.mount(f.options),true);f.button().events.click();f.button().events.click();await tick();assert.equal(f.calls.filter(x=>x.path==='/orders').length,1);assert.equal(f.calls[1].body.attemptId,'attempt-123');assert.equal('amount' in f.calls[1].body,false);await f.callbacks.onApprove({orderId:'ORDER1'});assert.equal(f.events.at(-1)[1],true);});
test('ambiguous order creation locks further payments',async()=>{const f=fixture({createError:true});await f.api.mount(f.options);f.button().events.click();await tick();assert.equal(f.events.at(-1)[0],'hold');});
test('wrong captured amount never confirms payment',async()=>{const f=fixture({capturePatch:{amount:'1.00'}});await f.api.mount(f.options);f.button().events.click();await tick();await assert.rejects(f.callbacks.onApprove({orderId:'ORDER1'}));assert.equal(f.events.at(-1)[0],'hold');});
test('changed checkout before clicking wallet makes no order',async()=>{const f=fixture();await f.api.mount(f.options);f.setInvalid();f.button().events.click();await tick();assert.equal(f.calls.length,1);});
test('Apple Pay validates merchant and captures confirmed order',async()=>{const f=fixture({method:'applepay'});assert.equal(await f.api.mount(f.options),true);f.button().events.click();assert.equal(f.appleSession.request.total.amount,'29.00');await f.appleSession.onvalidatemerchant({validationURL:'https://apple.test'});await f.appleSession.onpaymentauthorized({payment:{token:{},billingContact:{}}});assert.ok(f.events.some(x=>x[0]==='finish'&&x[1]===true));assert.deepEqual(f.events.at(-1),['apple',1]);});
test('Google Pay uses provider wallet data and exact quote',async()=>{const f=fixture({method:'googlepay'});assert.equal(await f.api.mount(f.options),true);f.button().events.click();assert.equal(f.googleRequest.transactionInfo.totalPrice,'29.00');const result=await f.googleCallbacks.onPaymentAuthorized({paymentMethodData:{}});assert.equal(result.transactionState,'SUCCESS');assert.equal(f.events.at(-1)[1],true);});
