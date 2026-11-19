/* Sasta Milaga — static product related cards, 2026-11.
 * For local PDP pages only. Loads the linked product's own og:image,
 * not an unrelated recommendation or stock picture.
 * No cart, pricing, stock or payment modifications.
 */
(function(){
'use strict';
if(!document.body.classList.contains('sm-page-static')||!document.querySelector('main .pdp'))return;
const section=Array.from(document.querySelectorAll('main section.section')).find(s=>s.querySelector(':scope > .section-head')&&s.querySelector(':scope > ul.sm-static-links'));
if(!section)return;
const list=section.querySelector('ul.sm-static-links');
const PLACEHOLDER='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 440"><rect width="440" height="440" fill="#edf6f0"/><rect x="105" y="120" width="230" height="173" rx="15" fill="none" stroke="#6c997d" stroke-width="8"/><path d="m125 260 70-70 60 55 40-30 25 45" fill="none" stroke="#6c997d" stroke-width="8"/><text x="220" y="335" font-size="20" fill="#315841" text-anchor="middle" font-family="Arial">Image unavailable</text></svg>');
const cache=new Map();
function safe(url){try{const u=new URL(url,location.href);return u.origin===location.origin&&/^\/p\/[a-z0-9-]+\.html$/i.test(u.pathname)?u.href:null}catch{return null}}
function lookup(url){
 if(cache.has(url))return cache.get(url);
 const work=fetch(url,{credentials:'omit',headers:{Accept:'text/html'},signal:undefined}).then(r=>{
  if(!r.ok||!(r.headers.get('content-type')||'').includes('html'))throw Error('Product HTML unavailable');
  return r.text()
 }).then(html=>{
  const doc=new DOMParser().parseFromString(html,'text/html');
  const raw=doc.querySelector('meta[property="og:image"]')?.content||doc.querySelector('.gallery-main img')?.getAttribute('src')||'';
  const absolute=new URL(raw,url);
  if(absolute.protocol!=='https:'||!['sastamilaga.com','admin.yourmart.pk','hhcnewapp.blr1.cdn.digitaloceanspaces.com'].includes(absolute.hostname))return '';
  return absolute.href
 }).catch(()=> '');
 cache.set(url,work);return work
}
const cards=Array.from(list.children).filter(li=>li.querySelector('a[href]')).slice(0,12);
for(const li of cards){
 const a=li.querySelector('a[href]'); const url=safe(a.href);
 if(!url)continue;
 const name=a.textContent.trim();
 const originalImage=a.querySelector('img[src]')?.getAttribute('src')||li.dataset.productImage||'';
 const price=li.querySelector('span');
 a.textContent='';
 const label=document.createElement('span');label.className='sm-related-name';label.textContent=name;
 const frame=document.createElement('span');frame.className='sm-related-media';frame.setAttribute('aria-hidden','true');
 const img=new Image();img.loading='lazy';img.decoding='async';img.width=380;img.height=380;img.alt='';img.referrerPolicy='strict-origin-when-cross-origin';
 frame.append(img);a.append(frame,label);a.classList.add('sm-related-link');
 if(originalImage){img.src=originalImage;}
 if(price){price.classList.add('sm-related-price');a.append(price)}
 li.classList.add('sm-related-card');
 li.dataset.productHref=url;
 const load=()=>lookup(url).then(src=>{
  const source=src||originalImage;
  if(!source){img.src=PLACEHOLDER;img.dataset.failed='1';return}
  img.onerror=()=>{
    img.onerror=null;
    if(originalImage&&source!==originalImage){img.onerror=()=>{img.onerror=null;img.src=PLACEHOLDER;img.dataset.failed='1'};img.src=originalImage;return}
    img.src=PLACEHOLDER;img.dataset.failed='1';
  };
  img.src=source;
 });
 li._smLoad=load;
}
list.classList.add('sm-related-grid');
const valid=cards.filter(li=>li._smLoad);
if(!valid.length)return;
// Recommendation images are part of product selection, not optional below-fold
// decoration. Begin fetching immediately for this bounded list (max 12).
// Individual <img> elements retain native loading=lazy to protect bandwidth.
valid.forEach(li=>li._smLoad());
})();