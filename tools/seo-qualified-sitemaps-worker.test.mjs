import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from './seo-qualified-sitemaps-worker.mjs';

const id='87FD613D-EEC7-474A-A408-02C9DCC6E9E2';
const name='Solar simulation anti-theft warning light';
function env(n=1,row={id,name}){
  const calls=[];
  const db={prepare(sql) {
    calls.push(sql);
    return {
      async first(){return {n}},
      bind(...args){
        assert.deepEqual(args,[5000,0]);
        return {async all(){return {results:[row]}}};
      }
    };
  }};
  return {DB:db,calls};
}
const url='https://sastamilaga.com';
test('sitemap index lists only actual reviewed page chunks',async()=>{
  const e=env(1);
  const r=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml'),e);
  assert.equal(r.status,200);
  const xml=await r.text();
  assert.match(xml,/sitemapindex/);
  assert.match(xml,/global-qualified\/1\.xml/);
  assert.doesNotMatch(xml,/global-qualified\/2\.xml/);
});
test('eligible product XML uses exact canonical URL and 5000 max per chunk',async()=>{
  const r=await worker.fetch(new Request(url+'/sitemaps/global-qualified/1.xml'),env(1));
  assert.equal(r.status,200);
  const xml=await r.text();
  assert.match(xml,new RegExp('global-shop/p/'+id+'/solar-simulation-anti-theft-warning-light/'));
  assert.match(xml,/<urlset/);
});
test('unapproved catalog cannot be mass-published by accidental sitemap call',async()=>{
  const r=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml'),env(0));
  assert.equal(r.status,200);
  assert.doesNotMatch(await r.text(),/<loc>/);
});
test('out of range sitemap has 404 noindex',async()=>{
  const r=await worker.fetch(new Request(url+'/sitemaps/global-qualified/2.xml'),env(1));
  assert.equal(r.status,404);
  assert.equal(r.headers.get('x-robots-tag'),'noindex');
});
test('malformed and unsupported method fail safely',async()=>{
  const e=env(1);
  assert.equal((await worker.fetch(new Request(url+'/sitemaps/global-qualified/bad.xml'),e)).status,404);
  assert.equal((await worker.fetch(new Request(url+'/sitemap-global-qualified.xml',{method:'POST'}),e)).status,405);
});
test('HEAD omits body',async()=>{
  const r=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml',{method:'HEAD'}),env(1));
  assert.equal(r.status,200);
  assert.equal(await r.text(),'');
});

test('scales to all 451,812 records only if each record passes D1 approval gate',async()=>{
  const r=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml'),env(451812));
  assert.equal(r.status,200);
  const xml=await r.text();
  assert.match(xml,/global-qualified\/91\.xml/);
  assert.doesNotMatch(xml,/global-qualified\/92\.xml/);
  assert.equal((xml.match(/<sitemap>/g)||[]).length,91);
});

test('approved numeric CJ product IDs are eligible for sitemap XML when D1 gate passes',async()=>{
 const numeric='1449637195303489536';
 const row={id:numeric,name:'Simulation Flame Mute Aroma Diffuser Humidifier'};
 const e=env(1,row);
 const res=await worker.fetch(new Request(url+'/sitemaps/global-qualified/1.xml'),e);
 assert.equal(res.status,200);
 assert.match(await res.text(),/global-shop\/p\/1449637195303489536\/simulation-flame-mute-aroma-diffuser-humidifier\//);
 assert.ok(e.calls.every(q=>q.includes('cj_product_id')||q.includes('COUNT')));
});


test('D1 free tier quota error serves only last-reviewed supplier URLs as temporary XML',async()=>{
 const db={prepare(){throw new Error("Your account has exceeded D1 free tier daily row read limit")}};
 const e={DB:db};
 const a=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml'),e);
 assert.equal(a.status,200);
 assert.equal(a.headers.get('x-sasta-sitemap-source'),'last-reviewed-2026-11-14');
 const ix=await a.text();assert.match(ix,/<sitemapindex/);assert.match(ix,/global-qualified\/1.xml/);
 const page=await worker.fetch(new Request(url+'/sitemaps/global-qualified/1.xml'),e);
 assert.equal(page.status,200);
 const xml=await page.text();
 assert.equal((xml.match(/<url>/g)||[]).length,2);
 assert.match(xml,/solar-simulation-anti-theft-warning-light/);
 assert.match(xml,/simulation-flame-mute-aroma-diffuser-humidifier/);
 assert.doesNotMatch(xml,/1111111111111111111/);
 const extraPage=await worker.fetch(new Request(url+'/sitemaps/global-qualified/2.xml'),e);
 assert.equal(extraPage.status,404);
});
test('missing DB no longer breaks the last-reviewed qualified sitemap index',async()=>{
 const r=await worker.fetch(new Request(url+'/sitemap-global-qualified.xml'),{});
 assert.equal(r.status,200);
 assert.match(await r.text(),/sitemapindex/);
});
