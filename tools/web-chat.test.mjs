import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/js/web-chat.js',import.meta.url),'utf8');
class Node {
  constructor(tag='div') {this.tagName=tag;this.children=[];this.handlers={};this.attributes={};this.hidden=false;this.textContent='';this.value='';this.options=[];this.selectedIndex=0;}
  append(...nodes){nodes.forEach(x=>this.appendChild(x))}
  appendChild(node){this.children.push(node);if(this.tagName==='select'&&node.tagName==='option')this.options.push(node);return node}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(k,v){this.attributes[k]=v}
  getAttribute(k){return this.attributes[k]||null}
  remove(){this.removed=true}
  addEventListener(k,fn){this.handlers[k]=fn}
  focus(){this.focused=true}
  reportValidity(){return true}
  get text(){return this.textContent}
  get childElementCount(){return this.children.length}
  get lastElementChild(){return this.children[this.children.length-1]}
  get scrollHeight(){return 100}
  set scrollTop(v){this._scrollTop=v}
  get scrollTop(){return this._scrollTop||0}
}
function harness(available=true){
  const launch=new Node('button'),panel=new Node('section'),close=new Node('button'),log=new Node('div');
  panel.hidden=true;
  const input=new Node('input'),sendButton=new Node('button'),form=new Node('form');form.elements={website:{value:''}};
  form.querySelector=()=>input;
  const composerSubmit=form.querySelector.bind(form);
  form.querySelector=q=>q==='[name="message"]'?input:sendButton;
  const slot=new Node('div'),language=new Node('div'),privacy=new Node('p');
  const actions=['shop','travel','orders','support'].map(a=>{const el=new Node('button');el.getAttribute=k=>k==='data-smwa-action'?a:null;return el});
  const elements={'.smwa-web__launcher':launch,'.smwa-web__panel':panel,'.smwa-web__close':close,'.smwa-web__messages':log,'.smwa-web__composer':form,'.smwa-web__form-slot':slot,'.smwa-web__language':language,'.smwa-web__privacy':privacy};
  const root=new Node('div');
  root.querySelector=q=>elements[q]||null;
  root.querySelectorAll=q=>q==='[data-smwa-action]'?actions:[];
  const document={querySelector:q=>q==='[data-smwa-webchat]'?root:null,createElement:q=>new Node(q),addEventListener:()=>{}};
  let posted=0;
  const fetch=(url,options={})=>{
    const u=String(url);
    if(!available)return Promise.reject(Error('origin down'));
    if(u.includes('web-session'))return Promise.resolve({ok:true,text:async()=>JSON.stringify({session_id:'00000000-0000-4000-8000-000000000000',session_token:'a'.repeat(64)})});
    if(u.includes('web-messages'))return Promise.resolve({ok:true,text:async()=>JSON.stringify({messages:[]})});
    if(u.includes('web-travel-nonce'))return Promise.resolve({ok:true,text:async()=>JSON.stringify({nonce:'validnonce'})});
    if(u.includes('/smts/v1/request'))return Promise.resolve({ok:true,text:async()=>JSON.stringify({message:'Travel request received'})});
    if(u.includes('web-message')){posted++;return Promise.resolve({ok:true,text:async()=>JSON.stringify({message:'Your message was received'})})}
    return Promise.reject(Error('Unknown endpoint '+url));
  };
  const stored={};
  const localStorage={getItem:k=>stored[k]||null,setItem:(k,v)=>{stored[k]=v},removeItem:k=>{delete stored[k]}};
  const window={fetch,SMWA_WEBCHAT:{api:'https://sastamilaga.com/wp-json/sm-wa/v1/',travelApi:'https://sastamilaga.com/wp-json/smts/v1/request',retentionDays:90},setInterval:()=>1,clearInterval:()=>{}};
  const context={window,document,location:{origin:'https://sastamilaga.com'},localStorage,fetch,setTimeout,clearTimeout,setInterval:()=>1,clearInterval:()=>{},URL,AbortController,crypto:null,console};
  vm.runInNewContext(source,context);
  function allText(){
    const dive=n=>[n.textContent||'',...(n.children||[]).flatMap(dive)].join(' ');
    return dive(log)+' '+dive(slot);
  }
  return {launch,panel,close,log,input,form,slot,actions,privacy,language,allText,get posted(){return posted}};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('English-only UI; product and order workflows remain actionable without server or search index',async()=>{
 const h=harness(false);
 assert.equal(h.language.removed,true);
 assert.match(h.privacy.textContent,/90 days/);
 h.launch.handlers.click();await tick();
 assert.equal(h.panel.hidden,false);
 h.actions[0].handlers.click();
 h.input.value='wireless headphones';h.form.handlers.submit({preventDefault(){}});await tick();
 assert.match(h.allText(),/Search local products/);
 assert.match(h.allText(),/Browse global categories/);
 h.actions[2].handlers.click();
 assert.match(h.allText(),/My orders/);
 h.actions[3].handlers.click();
 assert.match(h.allText(),/WhatsApp/);
 assert.doesNotMatch(h.allText(),/العربية/);
});
test('Authenticated support can send, while unavailable support offers explicit WhatsApp fallback',async()=>{
 const ok=harness(true);ok.launch.handlers.click();await tick();
 ok.input.value='I need human support';ok.form.handlers.submit({preventDefault(){}});await tick();await tick();
 assert.equal(ok.posted,1);assert.match(ok.allText(),/Your message was received/);
 const fail=harness(false);fail.launch.handlers.click();await tick();
 fail.input.value='I need human support';fail.form.handlers.submit({preventDefault(){}});await tick();await tick();
 assert.match(fail.allText(),/Your message was not delivered/);
 assert.match(fail.allText(),/Continue with WhatsApp/);
});
test('Travel enquiry fields render in English and offer a fallback if origin fails',async()=>{
 const h=harness(false);h.launch.handlers.click();await tick();h.actions[1].handlers.click();
 assert.match(h.allText(),/Destination, travel dates/);
 const fields=h.slot.children[0].children;
 const travelForm=h.slot.children[0];assert.equal(travelForm.tagName,'form');
 const name=fields.find(x=>x.tagName==='label'&&x.textContent==='Your name').children[0];
 const email=fields.find(x=>x.tagName==='label'&&x.textContent==='Email address').children[0];
 const detail=fields.find(x=>x.tagName==='label'&&x.textContent.includes('Destination')).children[0];
 name.value='Customer';email.value='customer@example.com';detail.value='Hotel stay next month';
 travelForm.handlers.submit({preventDefault(){}});await tick();await tick();
 assert.match(h.allText(),/could not confirm receipt/);
 assert.match(h.allText(),/Open WhatsApp with travel details/);
});
