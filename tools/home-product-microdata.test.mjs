import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const card=app.slice(app.indexOf('function productCard(p) {'),app.indexOf('\nfunction masonryCard',app.indexOf('function productCard(p) {')));
const homepage=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('homepage/category merchandising cards never declare Product or Offer microdata',()=>{
 assert.ok(card.includes('class="sm-card'), 'Product card must retain its existing layout');
 assert.ok(card.includes('class="smqb-add"'), 'Purchase interaction must remain');
 for(const unwanted of ['itemscope','itemtype=','itemprop=','https://schema.org/Product','https://schema.org/Offer']){
  assert.ok(!card.includes(unwanted), 'Invalid rich result declaration in collection card: '+unwanted);
 }
});
test('homepage retains Organization, WebSite, canonical, and individual product links',()=>{
 assert.match(homepage, /<link rel="canonical" href="https:\/\/sastamilaga\.com\/"/);
 assert.match(homepage, /"OnlineStore"/);
 assert.match(app, /function productLdJson\(p\)/);
 assert.match(card, /class="sm-card__price"/);
});
const reported=[
 'glass-cooking-oil-sprayer-bottle-refillable-oil-spray-for-kitchen-bbq-baking-gri-ho-97-00-00-974.html',
 'electric-food-chopper-vegetable-cutter-multifunctional-usb-rechargeable-food-pro-ho-96-00-00-969.html',
 'limid-knee-support-model-yc-7201-seamless-compression-knee-sleeve-sports-knee-br-pe-96-00-00-968.html',
 'electric-super-micro-bubble-beauty-blackhead-remover-pore-vacuum-cleaner-facial-pe-96-00-00-964.html',
 'transparent-hair-oil-applicator-comb-refillable-scalp-massage-comb-with-built-in-pe-96-00-00-963.html',
 'double-spring-resistance-training-tummy-trimmer-abdominal-exercise-full-body-wor-ho-96-00-00-962.html',
 'aloe-vera-pore-refining-dr-rashel-face-wash-deep-cleansing-hydrating-facial-clea-pe-97-00-00-973.html',
 'adjustable-open-patella-knee-support-brace-compression-knee-cap-for-gym-running-ho-96-00-00-961.html',
 '3s-lulur-black-with-niacinamide-body-scrub-brightening-exfoliating-body-scrub-fo-pe-96-00-00-960.html',
 'mashallah-tabarakallah-premium-acrylic-wall-hanging-large-12x24-inch-islamic-wal-hhc-3759874.html',
 'raf-professional-electric-coffee-spice-grinder-300w-high-power-stainless-steel-m-hhc-3759872.html',
 'manual-citrus-juicer-squeezer-portable-hand-press-fruit-juicer-with-built-in-str-hhc-3759871.html',
 '16-color-rgb-crystal-diamond-touch-lamp-rechargeable-touch-control-led-lamp-with-hhc-3759869.html',
 'gradient-insulated-sports-water-bottle-leak-proof-flask-with-motivational-time-m-hhc-3759868.html',
 'eotia-manual-food-chopper-high-speed-3-blade-hand-cutter-for-vegetables-fruits-h-hhc-3759831.html',
 'heavy-duty-mouse-trap-high-sensitivity-quick-catch-reusable-rat-traps-for-home-a-hhc-3759829.html',
 'eotia-3-blade-manual-food-chopper-high-speed-compact-vegetable-fruit-cutter-hhc-3759828.html',
 'black-charcoal-purifying-dr-rashel-face-wash-deep-cleansing-oil-control-100g-pe-97-00-00-972.html',
 'acrylic-mirror-believe-wall-decoration-large-3d-inspirational-wall-art-sticker-d-hhc-3759821-3756711.html',
 'bismillah-wooden-key-holder-arabic-islamic-wall-decor-golden-3d-calligraphy-orga-hhc-3759820.html',
 'colorful-nature-themed-canvas-art-prints-12-pcs-set-wooden-sticky-tiles-5x7-inch-hhc-3759810.html',
 'urdu-and-english-motivational-quote-frames-12-pcs-set-wooden-sticky-tiles-5x7-in-hhc-3759797.html',
 'vitamin-c-brightening-dr-rashel-face-wash-anti-aging-skin-brightening-cleanser-1-pe-97-00-00-971.html',
 '24k-gold-anti-aging-dr-rashel-face-wash-deep-cleansing-brightening-skin-firming-pe-97-00-00-970.html'
];
test('all 24 reported product URLs have dedicated server-side Product/Offer markup',()=>{
 assert.equal(reported.length,24);
 for(const file of reported){
  const full=path.join(root,'p',file);
  assert.ok(fs.existsSync(full), 'Missing dedicated product page: '+file);
  const html=fs.readFileSync(full,'utf8');
  assert.ok(html.includes('https://sastamilaga.com/p/'+file), 'Canonical missing: '+file);
  const scripts=[...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  const nodes=scripts.flatMap(x=>{let data=JSON.parse(x[1]);return data['@graph']||[data]});
  const products=nodes.filter(x=>x['@type']==='Product');
  assert.equal(products.length,1,'Need exactly one dedicated Product node: '+file);
  const x=products[0],offer=x.offers;
  assert.equal(x.url,'https://sastamilaga.com/p/'+file,'Product URL mismatch: '+file);
  assert.ok(x.name&&x.sku&&x.image?.length,'Missing product name/SKU/image: '+file);
  assert.equal(offer?.['@type'],'Offer','Missing Offer: '+file);
  assert.equal(offer?.priceCurrency,'PKR','Missing currency: '+file);
  assert.ok(Number(offer?.price)>0,'Invalid product price: '+file);
  assert.ok(/^https:\/\/schema\.org\/(InStock|OutOfStock|PreOrder|SoldOut|BackOrder)$/.test(offer?.availability||''),'Invalid stock enum: '+file);
 }
});
