import assert from 'node:assert/strict';
const base='https://sastamilaga.com';
for(const [path,status,location] of [
 ['/global/c/smart-watches/',301,base+'/c/global/smart-watches.html'],
 ['/global/c/smart-watches/?q=watch',302,base+'/#/global/c/smart-watches?q=watch'],
 ['/global/c/not-a-real-category-987654/',404,null],
 ['/c/global/smart-watches.html',200,null],
 ['/api/catalog-facets/v1?category=smart-watches&country=PK',200,null]
]){
 const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(25000),headers:{'User-Agent':'SastaCatalogReleaseQA/2.0'}});
 console.log(JSON.stringify({path,status:r.status,location:r.headers.get('location'),robots:r.headers.get('x-robots-tag')}));
 assert.equal(r.status,status);if(location)assert.equal(r.headers.get('location'),location);
 if(path.includes('?q='))assert.match(r.headers.get('x-robots-tag')||'',/noindex/);
 if(path.startsWith('/api/')){assert.match(r.headers.get('content-type')||'',/application\/json/);assert.equal((await r.json()).country,'PK');}
}
