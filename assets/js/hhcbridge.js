/* Sasta Milaga product media repair v2 — static and search journeys.
 * Uses only photographs already linked to the SAME product.
 * Never substitutes another product, makes inventory claims or changes checkout.
 */
(function(){
'use strict';
if(window.SM_HHCBridge&&window.SM_HHCBridge.version==='20261118-2')return;
const PLACEHOLDER='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" rx="24" fill="#eef6f0"/><rect x="160" y="170" width="320" height="250" rx="18" fill="none" stroke="#66987b" stroke-width="12"/><path d="M195 384l85-92 68 65 53-47 45 74" fill="none" stroke="#66987b" stroke-width="12"/><text x="320" y="487" text-anchor="middle" fill="#305c40" font-family="Arial,sans-serif" font-size="29">Product image unavailable</text></svg>');
const once=new WeakSet(), verified=new Map();
const clean=u=>{try{const v=new URL(u,location.href);return v.protocol==='https:'?v.href:''}catch(e){return''}};
function probe(url){url=clean(url);if(!url)return Promise.resolve(false);if(verified.has(url))return verified.get(url);const p=new Promise(resolve=>{let img=new Image(),done=false;const timer=setTimeout(()=>finish(false),7500);function finish(ok){if(done)return;done=true;clearTimeout(timer);img.onload=img.onerror=null;resolve(ok)}img.onload=()=>finish(img.naturalWidth>2);img.onerror=()=>finish(false);img.src=url;if(img.complete&&img.naturalWidth>2)finish(true)});verified.set(url,p);return p}
function sku(){const m=location.pathname.match(/-hhc-(\d+)\.html$/i);return m?m[1]:''}
function recorded(){try{const x=JSON.parse(sessionStorage.getItem('sm-product-photo')||'{}');return x.id===sku()&&Date.now()-x.at<600000?(x.images||[]):[]}catch(e){return[]}}
function saveRouteProduct(event){const link=event.target.closest&&event.target.closest('a[data-sm-product-image]');if(!link)return;const id=link.dataset.smProductId||'';const images=[link.dataset.smProductImage||''].filter(Boolean);try{sessionStorage.setItem('sm-product-photo',JSON.stringify({id,images,at:Date.now()}))}catch(e){}}
document.addEventListener('pointerdown',saveRouteProduct,true);
document.addEventListener('click',saveRouteProduct,true);
function galleryCandidates(img){const panel=img.closest('.gallery-panel');if(!panel)return[];const out=recorded();panel.querySelectorAll('.gallery-thumbs img,.sm-static-thumbs img').forEach(i=>out.push(i.currentSrc||i.getAttribute('src')));panel.querySelectorAll('.gallery-thumbs button[data-u]').forEach(b=>out.push(b.dataset.u));return out}
async function recover(img){if(once.has(img))return;once.add(img);const source=img.currentSrc||img.getAttribute('src')||'';let candidates=galleryCandidates(img);if(!img.closest('.gallery-main')){const container=img.closest('a[data-sm-product-image]');if(container)candidates.push(container.dataset.smProductImage||'')}
const known=new Set([clean(source)]);for(const url of candidates){const u=clean(url);if(!u||known.has(u))continue;known.add(u);if(await probe(u)){img.onerror=null;img.src=u;img.dataset.smPhotoRecovered='true';return}}
img.onerror=null;img.src=PLACEHOLDER;img.alt='Product image unavailable';img.dataset.smPhotoUnavailable='true';
}
document.addEventListener('error',e=>{const img=e.target;if(!(img instanceof HTMLImageElement))return;if(img.closest('.gallery-main,.gallery-thumbs,.smss,.sm-card,.sm-static-thumbs'))recover(img)},true);
window.SM_HHCBridge={version:'20261118-2',recover,probe,placeholder:PLACEHOLDER};
})();