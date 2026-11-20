/* Refresh the landing selection from the repository's supplier snapshot. No live stock claims. */
import fs from 'node:fs';
import vm from 'node:vm';
const file='data/landing/showcase.json';
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const selected=[['earphones-and-headphones','Electronics & Appliances'],['shoulder-bags','Bags & Shoes'],['night-lights','Home & Living'],['bedding-sets','Home & Living'],['fitness-and-bodybuilding','Health & Beauty'],['garden-tools','Tools & DIY']];
data.global=[];
for(const [slug,category] of selected){
  const rows=[];
  vm.runInNewContext(fs.readFileSync('data/cj/c/'+slug+'.js','utf8'),{SM_CJ_SHARD:(_,items)=>rows.push(...items)});
  for(const row of rows.filter(r=>r[0]&&r[2]&&/^https:\/\//.test(r[5]||'')).slice(0,4)){
    const urlSlug=row[2].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    data.global.push({id:row[0],name:row[2],category,image:row[5],url:'/global-shop/p/'+row[0]+'/'+urlSlug+'/',source:'Repository supplier snapshot: '+slug});
  }
}
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Prepared '+data.global.length+' actual supplier products.');
