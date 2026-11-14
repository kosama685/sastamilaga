import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const require=createRequire(import.meta.url);
const {priceNumber,filterCards}=require('../assets/js/global-static-facets.js');
const items=[
 {title:'Multi-color 3D Printing Pen',price:76.2,video:false},
 {title:'Plastic 3D Pen Kit',price:14.5,video:true},
 {title:'3D Pen Accessories',price:NaN,video:false},
 {title:'Other Item',price:4.4,video:true}
];
test('parse existing USD estimates only; do not invent missing prices',()=>{
 assert.equal(priceNumber('US$76.20 – US$80.00 est.'),76.2);
 assert.equal(priceNumber('US$1,200.80 est.'),1200.8);
 assert.ok(Number.isNaN(priceNumber('Price on request')));
});
test('global filters search, min/max, video and sort',()=>{
 assert.deepEqual(filterCards(items,{q:'pen',min:'10',max:'80',sort:'low',video:true}).map(x=>x.title),['Plastic 3D Pen Kit']);
 assert.deepEqual(filterCards(items,{q:'3d',min:'',max:'',sort:'az',video:false}).map(x=>x.title),
 ['3D Pen Accessories','Multi-color 3D Printing Pen','Plastic 3D Pen Kit'].sort((a,b)=>a.localeCompare(b)));
});
test('unpriced records are not misrepresented as below max price',()=>{
 assert.equal(filterCards(items,{min:'',max:'99',sort:'original',video:false}).length,3);
 assert.equal(filterCards(items,{min:'',max:'',sort:'original',video:false}).length,4);
});
