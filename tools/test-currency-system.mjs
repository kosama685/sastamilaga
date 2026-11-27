#!/usr/bin/env node
/**
 * Sasta Milaga cross-market FX contract tests.
 * Read-only: does not modify cart, checkout, products or remote configuration.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const market=fs.readFileSync('assets/js/market.js','utf8');
const worker=fs.readFileSync('tools/global-product-uuid-and-numeric-worker.mjs','utf8');
const mapText=market.match(/var CUR = (\{[^;]+\});/);
assert.ok(mapText,'ISO country-to-currency mapping must exist');
const mapping=vm.runInNewContext('('+mapText[1]+')');
const codes=Object.values(mapping),countries=Object.keys(mapping);
assert.ok(countries.length>=240,'Unexpected reduction in country/territory list');
assert.equal(mapping.SA,'SAR');
assert.equal(mapping.PK,'PKR');
assert.equal(mapping.AE,'AED');
assert.equal(mapping.GB,'GBP');
assert.ok(new Set(codes).size>=150,'Unexpected loss of mapped currencies');
const required=['sm_fx_pkr_v2','open.er-api.com/v6/latest/PKR','open.er-api.com/v6/latest/USD','@fawazahmed0/currency-api','rateRequest','72 * 3600e3','SMMarket =','ready: getRates','sm-total dd','.sm-related-price','sm-static-links > li > span','setInterval(function ()'];
for (const part of required) assert.ok(market.includes(part),'Missing market FX feature: '+part);
for (const part of ['window.SMMarket','window.SMCJCurrency','sm:fx-rates','backup_exchange_http_','currencies/usd.min.json','Checkout currency and final amount confirmed separately']) {
 assert.ok(worker.includes(part),'Missing global FX feature: '+part);
}
assert.ok(!/localStorage\.clear\s*\(/.test(market+worker),'FX code must never clear browser storage');
assert.ok(!/fallbackRates\s*:\s*\{\s*USD/.test(market+worker),'No fixed currency rate table allowed');
const rates={PKR:1,USD:1/280,SAR:3.75/280,AED:3.6725/280,GBP:.76/280};
function fx(amount,from,to){return amount/rates[from]*rates[to]}
assert.ok(Math.abs(fx(280,'PKR','SAR')-3.75)<1e-9);
assert.ok(Math.abs(fx(10,'USD','AED')-36.725)<1e-9);
assert.ok(Math.abs(fx(fx(1234,'PKR','GBP'),'GBP','PKR')-1234)<1e-7);
const result={passed:true,mappedCountries:countries.length,mappedCurrencies:new Set(codes).size,formats:['PKR','SAR','AED','GBP','USD'],contract:'display estimates only; no browser storage, checkout or product data writes'};
console.log(JSON.stringify(result,null,2));
