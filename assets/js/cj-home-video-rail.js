/* Additive supplier-video rail. Uses existing 5,804-entry catalogue for cover images,
 * but never renders raw supplier video URLs; signed stream is requested on user click. */
(()=>{
 'use strict';
 const host=document.getElementById('sm-cj-video-rail');
 if(!host)return;
 const track=host.querySelector('.sm-cj-rail-track');
 const validPid=/^(?:[0-9]{15,22}|[a-f0-9-]{36})$/i;
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const load=()=>window.SM_CJ_VIDEOS?Promise.resolve(window.SM_CJ_VIDEOS):new Promise((resolve,reject)=>{
   const el=document.createElement('script');el.src=new URL('data/cj/videos.js',document.baseURI).href;
   el.onload=()=>resolve(window.SM_CJ_VIDEOS||[]);el.onerror=()=>reject(Error('Supplier video catalogue unavailable'));
   document.head.appendChild(el);
 });
 const href=r=>'/global/p/'+encodeURIComponent(String(r[1]))+'/'+encodeURIComponent(String(r[0]));
 function choose(rows){
   if(!Array.isArray(rows))return [];
   const picks=[],seen=new Set(),categoryCounts=new Map();
   // Spread selected videos across source categories, avoid first-page bias.
   for(let offset=0;offset<rows.length&&picks.length<12;offset++){
     const r=rows[(offset*397)%rows.length];
     const pid=String(r?.[0]||''),category=String(r?.[1]||'');
     const name=String(r?.[2]||''),cover=String(r?.[5]||'');
     if(!validPid.test(pid)||!name||!/^https:\/\//i.test(cover)||seen.has(pid)||!category)continue;
     if((categoryCounts.get(category)||0)>=3)continue;
     seen.add(pid);categoryCounts.set(category,(categoryCounts.get(category)||0)+1);
     picks.push(r);
   }
   return picks;
 }
 function make(r){
   const article=document.createElement('article');article.className='sm-cj-rail-card sm-cj-video-card';
   const media=document.createElement('div');media.className='sm-cj-video-thumb';
   const img=document.createElement('img');img.loading='lazy';img.decoding='async';img.width=400;img.height=225;img.src=String(r[5]);img.alt='Supplier video poster for '+String(r[2]);
   const button=document.createElement('button');button.type='button';button.className='sm-cj-video-watch';button.textContent='▶ Watch supplier video';
   button.setAttribute('aria-label','Watch supplier product video for '+String(r[2]));
   const note=document.createElement('small');note.className='sm-cj-video-status';note.textContent='Supplier video · verify on play';
   button.addEventListener('click',async()=>{
     if(!window.SMCJVideo){note.textContent='Player is unavailable. Open the product page.';return}
     button.disabled=true;note.textContent='Checking supplier video…';
     try{
       const video=await window.SMCJVideo.resolve(String(r[0]));
       if(!video){note.textContent='Video unavailable from the supplier right now';button.textContent='Video unavailable';button.disabled=true;return}
       note.textContent='Supplier video · verified';window.SMCJVideo.open(video,String(r[2]));
     }catch{note.textContent='Video temporarily unavailable. Try the product details.'}
     finally{if(!button.textContent.includes('unavailable'))button.disabled=false}
   });
   media.append(img,button);
   const link=document.createElement('a');link.href=href(r);link.className='sm-cj-rail-name';link.textContent=String(r[2]);link.title=String(r[2]);
   const details=document.createElement('a');details.href=href(r);details.className='sm-cj-rail-view';details.textContent='Product options & delivery';
   article.append(media,link,note,details);
   return article;
 }
 async function init(){
   try{
     const rows=await load(),selected=choose(rows);
     if(!selected.length){track.textContent='No supplier videos are available in the saved catalogue.';return}
     track.replaceChildren(...selected.map(make));
   }catch{
     track.textContent='Supplier videos are temporarily unavailable. Product browsing remains available.';
   }
 }
 if('IntersectionObserver' in window){
   const watcher=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){watcher.disconnect();init()}},{rootMargin:'600px 0px'});
   watcher.observe(host);
 }else init();
})();