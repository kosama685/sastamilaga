#!/usr/bin/env node
// No network writes. Guard SEO, canonical identity, source provenance and performance optimization.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const text=p=>fs.readFileSync(p,'utf8');
const home=text('index.html'),faq=text('faq/index.html'),llms=text('llms.txt');
const market=text('assets/js/market.js'),supplier=JSON.parse(text('data/cj/lookup/manifest.json'));
assert.match(home, /rel="canonical" href="https:\/\/sastamilaga\.com\/"/);
assert.match(home, /name="robots" content="index, follow/);
assert.match(faq, /rel="canonical" href="https:\/\/sastamilaga\.com\/faq\/"/);
assert.match(faq, /Shopping FAQs: Payments/);
assert.match(llms, /^# Sasta Milaga/m);
assert.equal(supplier.allow_indexing,false,'Unverified CJ snapshot must not become indexable');
assert.equal(supplier.unique_ids,451812);
assert.ok(market.includes('if (state.country === \'PK\' && state.currency === \'PKR\') return;'), 'PKR observer must skip irrelevant reflows');
assert.equal((home.match(/<h1\\b/g)||[]).length,1,'Homepage must have one visible semantic H1');
assert.match(home, /id="sm-shopping-answer"/);
assert.match(home, /How do local and global Sasta Milaga orders work\?/);
assert.match(market, /lastSweep = Date\.now\(\)/);
assert.match(text('assets\/theme\/live-tv-hub.css'), /\.sltv-hero :is\(h1,h2\)/);
assert.ok(market.includes("countryInput.addEventListener('focus', fillCountryOptions"),'Country options must hydrate only upon form use');
const worker=text('workers/faq-static/worker.js');
assert.ok(worker.includes("p!=='/faq/'"),'FAQ worker must reject unrelated URLs');
assert.ok(worker.includes('expectedTitle'),'FAQ must not return a false 200');
console.log(JSON.stringify({ok:true,homepage_canonical:'/',faq_canonical:'/faq/',llms_txt:true,cj_source_records:supplier.unique_ids,cj_snapshot_indexable:false,country_dropdown_deferred:true,default_currency_mutation_reflow_skipped:true}));
