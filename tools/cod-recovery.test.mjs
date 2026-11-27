import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/js/cod-recovery.js',import.meta.url),'utf8');
function harness(product, catalog=[],attrs=[],blocked=false){
  const saved=new Map();
  const storage={
    getItem(k){return saved.get(k)||null;},
    setItem(k,v){if(blocked)throw new Error('no storage');saved.set(k,v);},
    removeItem(k){saved.delete(k);}
  };
  const page={textContent:JSON.stringify({'@context':'https://schema.org','@graph':product?[{
    '@type':'Product',sku:product.sku,name:product.name,
    url:'https://sastamilaga.com/p/sample.html',
    offers:{priceCurrency:'PKR',price:String(product.price)}
  }]:[]})};
  const document={
    readyState:'loading',addEventListener(){},
    querySelectorAll(sel){if(sel.startsWith('script[type'))return [page];if(sel.startsWith('main select'))return attrs;return[];},
    getElementById(){return null}
  };
  const location={origin:'https://sastamilaga.com',href:'https://sastamilaga.com/p/sample.html',hostname:'sastamilaga.com'};
  const window={SASTA_PRODUCTS:catalog,SM_CONFIG:{deliveryFee:250,freeDeliveryFrom:5000}};
  const ctx={window,document,location,localStorage:storage,sessionStorage:storage,console,JSON,Date,Number,Array,Math,parseInt,String,URL,Intl,crypto:{getRandomValues(a){a.fill(5);return a;}}};
  vm.runInNewContext(source,ctx);
  return {cod:window.SMCOD,saved};
}
test('COD fallback stores published SKU, price and quantity; not an accepted WooCommerce order',()=>{
  const {cod}=harness({sku:'hhc-2096968',name:'Blush',price:844});
  assert.equal(cod.add('hhc-2096968',2).ok,true);
  assert.equal(cod.add('hhc-2096968',1).ok,true);
  assert.equal(cod.cart().length,1);
  assert.equal(cod.cart()[0].qty,3);
  assert.equal(cod.amount(cod.cart()).total,844*3+250);
  assert.equal(cod.add('hhc-2096968',1).checkout,'/cod-checkout/');
});
test('fallback works from the local published product catalogue, not CJ',()=>{
  const {cod}=harness(null,[{id:'hhc-3141',n:'Local pillow',fp:5500}]);
  assert.equal(cod.add('hhc-3141',1).ok,true);
  assert.equal(cod.amount(cod.cart()).shipping,0);
});
test('a missing SKU, unpublished price or unknown product never becomes an order request',()=>{
  const {cod}=harness(null,[]);
  assert.equal(cod.add('unknown-111',1).ok,false);
  assert.equal(cod.add('<script>',1).ok,false);
  assert.equal(cod.cart().length,0);
});
test('required Woo variation prevents submission without selecting that option',()=>{
  const {cod}=harness({sku:'hhc-var',name:'Local variant',price:800},[],[{name:'attribute_pa_color',required:true,value:''}]);
  assert.equal(cod.add('hhc-var',1).ok,false);
  assert.equal(cod.cart().length,0);
});
test('browser storage failure never claims a successful cart operation',()=>{
  const {cod}=harness({sku:'hhc-10',name:'Local item',price:750},[],[],true);
  assert.equal(cod.add('hhc-10',1).ok,false);
});
test('COD module does not invoke PayPal, WordPress or CJ for request submission',()=>{
  assert.match(source,/fetch\(endpoint,\{method:'POST'/);
  assert.match(source,/https:\/\/formspree\.io\/f\/xwvzzjdl/);
  assert.doesNotMatch(source,/fetch\(['"]\/wp-json/);
  assert.doesNotMatch(source,/fetch\(['"]\/api\/cj/);
  assert.doesNotMatch(source,/paypal\.Buttons|paypalLink\(/);
});
