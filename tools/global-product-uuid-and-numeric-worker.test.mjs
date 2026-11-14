import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './global-product-uuid-and-numeric-worker.mjs';
const BASE='https://sastamilaga.com/global-shop/p/';
const numeric='1449637195303489536';
const uuid='87FD613D-EEC7-474A-A408-02C9DCC6E9E2';
const samples={
 [numeric]:{sku:'CJJT1321500',name:'Simulation Flame Mute Aroma Diffuser Humidifier',images:'https://cf.cjdropshipping.com/e10e4ad0-e931-4b43-a087-014b287c136b.jpeg',categories:'Home Office Storage',cj_product_id:numeric},
 [uuid]:{sku:'CJQCQCQC00732',name:'Solar simulation anti-theft warning light',images:'https://cf.cjdropshipping.com/20200515/3329770986844.jpg',categories:'Car Alarm Systems',cj_product_id:uuid}
};
function env(){
 const e={DB:{prepare(sql){return {bind(id){return {async first(){if(sql.includes('FROM catalog_products_cj'))return samples[id]||null;if(sql.includes('FROM cj_product_enrichment'))return id===uuid?{seo_approved:1,description_text:'Solar-powered decorative anti-theft warning light for cars. Supplier describes red and blue LED options, SMD light source and dimensions. Confirm the live variation and shipping before purchasing.',specification_json:'{"power":"Solar"}'}:null;throw Error('unexpected SQL')}}},async all(){return {results:[]}}}}}};
 return e;
}
test('numeric 19-digit supplier ID becomes a real 200 canonical detail page but remains noindex until reviewed',async()=>{
 const url=BASE+numeric+'/simulation-flame-mute-aroma-diffuser-humidifier/';
 const res=await worker.fetch(new Request(url),env());
 const html=await res.text();
 assert.equal(res.status,200);
 assert.equal(res.headers.get('x-robots-tag'),'noindex, follow');
 assert.match(html,/<meta name="robots" content="noindex, follow"/);
 assert.match(html,/canonical/);
 assert.match(html,/Simulation Flame Mute Aroma Diffuser Humidifier/);
 assert.match(html,/No payment is collected on this page/);
});
test('existing approved UUID URLs remain indexable unchanged',async()=>{
 const u=BASE+uuid+'/solar-simulation-anti-theft-warning-light/';
 const res=await worker.fetch(new Request(u),env());
 assert.equal(res.status,200);
 const body=await res.text();
 assert.match(body,/index, follow/);
 assert.equal(res.headers.get('x-robots-tag'),null);
});
test('slug normalization 301 preserves product ID and canonical',async()=>{
 const res=await worker.fetch(new Request(BASE+numeric+'/wrong-slug/'),env());
 assert.equal(res.status,301);
 assert.equal(res.headers.get('location'),BASE+numeric+'/simulation-flame-mute-aroma-diffuser-humidifier/');
});
test('unknown IDs and invalid IDs are not published',async()=>{
 assert.equal((await worker.fetch(new Request(BASE+'1111111111111111111/unknown/'),env())).status,404);
 assert.equal((await worker.fetch(new Request(BASE+'1234/not-valid/'),env())).status,404);
});
test('noncommerce endpoints reject unrecognized paths',async()=>{
 const res=await worker.fetch(new Request('https://sastamilaga.com/checkout/'),env());
 assert.equal(res.status,404);
});

test('canonical product HTML offers verified CJ variant gallery, shipping and useful AEO links without blocked video',async()=>{
 const res=await worker.fetch(new Request(BASE+numeric+'/simulation-flame-mute-aroma-diffuser-humidifier/'),env());
 assert.equal(res.status,200);
 const h=await res.text();
 assert.match(h,/sasta-verified-gallery-v1/);
 assert.match(h,/sasta:cjvariants/);
 assert.match(h,/cj-quote/);
 assert.match(h,/Buying guide and product questions/);
 assert.match(h,/BreadcrumbList/);
 assert.match(h,/\/worldwide-shopping\//);
 assert.doesNotMatch(h,/<video[^>]+src=/i);
 assert.doesNotMatch(h,/"@type":"Offer"/);
 assert.doesNotMatch(h,/VideoObject/);
 assert.match(h,/noindex, follow/);
});
