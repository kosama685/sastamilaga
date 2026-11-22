import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {parseHTML}=require(process.env.SM_DOM_MODULE||'linkedom');
const qrSource=fs.readFileSync('assets/js/order-reference-qr.js','utf8');
const orderPage=fs.readFileSync('order/index.html','utf8');
const verifyPage=fs.readFileSync('invoice/verify/index.html','utf8');
const ID='SM-REQ-0123456789ABCDEF0123';

function boot(){
  const {document}=parseHTML('<!doctype html><html><body><main>'+
    '<div id="sm-request-status">Your cart is empty.</div>'+
    '<div class="row-controls"><button id="sm-copy-reference">Copy request reference</button></div>'+
    '</main></body></html>');
  let callback, generated=null;
  class MutationObserverFake {constructor(cb){callback=cb} observe(){}}
  function QRCode(node,config){generated=config.text;node.textContent='QR image generated';}
  QRCode.CorrectLevel={M:0};
  const window={QRCode};
  vm.runInNewContext(qrSource,{window,document,navigator:{},MutationObserver:MutationObserverFake,URL,Promise,console});
  return {document,setStatus(txt){document.getElementById('sm-request-status').textContent=txt;callback()},generated:()=>generated};
}
test('QR remains hidden for unacknowledged or failed checkout requests',()=>{
 const b=boot(),panel=b.document.getElementById('sm-qr-reference');assert.ok(panel.hidden);
 b.setStatus('Request NOT confirmed ('+ID+').');
 assert.ok(panel.hidden,'unconfirmed request must not produce customer QR');
});
test('Formspree receipt enables reference-only QR and never marks an invoice paid',async()=>{
 const b=boot(),panel=b.document.getElementById('sm-qr-reference');
 b.setStatus('Formspree acknowledged request '+ID+'. NOT paid, accepted or confirmed.');
 assert.equal(panel.hidden,false);
 b.document.getElementById('sm-make-reference-qr').click();
 await new Promise(setImmediate);
 assert.equal(b.generated(),'https://sastamilaga.com/invoice/verify/?ref='+ID);
 assert.match(panel.textContent,/not confirm an invoice, payment/i);
 assert.match(verifyPage,/NOT VERIFIED/);
 assert.match(verifyPage,/not connected to authoritative merchant payment/i);
});
test('reference QR is loaded by the existing static checkout page',()=>{
 assert.match(orderPage,/assets\/js\/order-reference-qr\.js/);
 assert.match(qrSource,/assets\/vendor\/qrcode-1\.0\.0\.min\.js/);
 assert.match(orderPage,/noindex,nofollow/);
});
