import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('four commerce workflows use supported actions runtime',()=>{
  for(const name of ['github-only-commerce','hosted-commerce-staging','unified-order-production-contract','unified-order-request-preview']){
    const w=read('.github/workflows/'+name+'.yml');
    assert.match(w,/actions\/checkout@v7/);
    assert.match(w,/actions\/setup-node@v7/);
    assert.doesNotMatch(w,/actions\/(checkout|setup-node)@v4/);
  }
});
test('flight sitemap destination exists with its own indexable canonical',()=>{
  const html=read('flights/index.html');
  assert.match(html,/<title>Flight Search/);
  assert.match(html,/<link rel="canonical" href="https:\/\/sastamilaga.com\/flights\/">/);
  assert.match(html,/<meta name="robots" content="index, follow/);
  assert.match(html,/href="\/travel\/"/);
  assert.match(html,/No ticket or price is guaranteed/);
  assert.match(html,/width=device-width/);
});
test('blog publishing delegates to central Pages deployment instead of parallel artifact',()=>{
  const w=read('.github/workflows/blog-schedule.yml');
  assert.match(w,/gh workflow run static.yml --ref main/);
  assert.match(w,/actions: write/);
  assert.doesNotMatch(w,/actions\/upload-pages-artifact/);
  assert.doesNotMatch(w,/actions\/deploy-pages/);
  assert.match(w,/if: steps.commit.outputs.changed == 'true'/);
});
test('order requests cannot be confused with settled payments',()=>{
  const s=read('assets/js/order-page.js');
  assert.match(s,/payment_status','NOT_PAID'/);
  assert.match(s,/fulfilment_status','UNCONFIRMED'/);
  assert.match(s,/order_items_json/);
  assert.match(s,/sessionStorage\.getItem\(REF_KEY/);
});
