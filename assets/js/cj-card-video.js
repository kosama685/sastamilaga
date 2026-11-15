/* Progressive CJ supplier video enhancement. Never requests CJ API or raw media URLs.
 * Signed media resolved only by /cjv/resolve; no autoplay; existing product cards unchanged. */
(()=>{
 'use strict';
 const RESOLVER='/cjv/resolve?pid=';
 const validPid=/^(?:[0-9]{15,22}|[a-f0-9-]{36})$/i;
 const validMedia=/^\/cjv\/v1\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/;
 const pending=new Map(),negativeKey='sm_cjv_negative_v2';
 let negative={};
 try{negative=JSON.parse(sessionStorage.getItem(negativeKey)||'{}')}catch{}
 const unavailable=pid=>negative[pid]&&negative[pid]>Date.now();
 const remember=pid=>{negative[pid]=Date.now()+30*60*1000;try{sessionStorage.setItem(negativeKey,JSON.stringify(negative))}catch{}};
 let nextAt=0, sequence=Promise.resolve();
 const fetchSlow=pid=>{
   if(unavailable(pid))return Promise.resolve(null);
   if(pending.has(pid))return pending.get(pid);
   const operation=sequence.then(async()=>{
     const pause=Math.max(0,nextAt-Date.now());
     if(pause)await new Promise(resolve=>setTimeout(resolve,pause));
     nextAt=Date.now()+1250;
     const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12500);
     try{
       const r=await fetch(RESOLVER+encodeURIComponent(pid),{headers:{Accept:'application/json'},signal:ctrl.signal,credentials:'omit'});
       if(!r.ok)return null;
       const d=await r.json();
       if(d?.status==='unavailable'){remember(pid);return null;}
       if(d?.status!=='available'||!validMedia.test(String(d.video?.src||'')))return null;
       return {src:d.video.src,poster:/^https:\/\//.test(d.video.poster||'')?d.video.poster:'',name:String(d.video.name||'Supplier product video').slice(0,180),duration:Number(d.video.duration)||null};
     }catch{return null}finally{clearTimeout(timer)}
   });
   sequence=operation.catch(()=>{});
   pending.set(pid,operation);
   return operation;
 };
 const style=document.createElement('style');
 style.id='sm-cj-card-video-css';
 style.textContent='.sm-card[data-cj-video],.sm-cj-rail-card[data-cj-video]{position:relative}'
 +'.sm-cj-video-button{position:absolute;top:12px;right:12px;z-index:2;display:inline-flex;align-items:center;gap:5px;background:rgba(10,62,32,.94);border:1px solid #fff;border-radius:24px;color:#fff;padding:7px 10px;font:700 12px/1.2 system-ui;cursor:pointer;box-shadow:0 2px 8px #0003}'
 +'.sm-cj-video-button:focus-visible{outline:3px solid #ffa53b;outline-offset:3px}'
 +'.sm-cj-player{border:0;border-radius:18px;padding:22px;width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;background:#fff;color:#153f27;box-shadow:0 18px 75px #0006}'
 +'.sm-cj-player::backdrop{background:#09261bd9}'
 +'.sm-cj-player header{display:flex;align-items:start;justify-content:space-between;gap:12px;margin-bottom:12px}'
 +'.sm-cj-player header h2{margin:0;font-size:19px;line-height:1.4}'
 +'.sm-cj-player header button{background:#eff5f0;color:#123b29;border:0;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:24px;flex-shrink:0}'
 +'.sm-cj-player video{display:block;width:100%;aspect-ratio:16/9;max-height:65vh;background:#000;border-radius:12px;object-fit:contain}'
 +'.sm-cj-player p{font-size:12px;color:#5b6e61;margin:12px 0 0}'
 +'@media(prefers-reduced-motion:reduce){.sm-cj-video-button{transition:none!important}}';
 document.head.appendChild(style);
 let player;
 function showVideo(video,productName){
   if(!player){
     player=document.createElement('dialog');player.className='sm-cj-player';
     player.innerHTML='<header><h2 id="sm-cj-play-title"></h2><button type="button" aria-label="Close video player">×</button></header><video playsinline controls preload="none"></video><p>Supplier product video · Playback and product availability depend on the supplier. Price and delivery are confirmed before payment.</p>';
     document.body.appendChild(player);
     player.querySelector('header button').addEventListener('click',()=>player.close());
     player.addEventListener('close',()=>{const v=player.querySelector('video');v.pause();v.removeAttribute('src');v.load()});
     player.addEventListener('click',e=>{if(e.target===player)player.close()});
   }
   player.querySelector('h2').textContent=productName||video.name;
   const v=player.querySelector('video');v.poster=video.poster||'';v.src=video.src;
   player.showModal(); // user-initiated, never autoplay
 }
 window.SMCJVideo={resolve:fetchSlow,open:showVideo};
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
   for(const entry of entries){
     if(!entry.isIntersecting)continue;
     observer.unobserve(entry.target);
     const card=entry.target,pid=card.dataset.cjVideo;
     if(card.dataset.cjVideoHint!=='1')continue; // snapshot explicitly reports a video
     fetchSlow(pid).then(video=>{
       if(!video||!card.isConnected||card.querySelector('.sm-cj-video-button'))return;
       const button=document.createElement('button');button.type='button';
       button.className='sm-cj-video-button';button.textContent='▶ Video';
       button.setAttribute('aria-label','Play supplier video for '+(card.querySelector('.sm-cj-rail-name,.sm-card__title')?.textContent||'product'));
       button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();showVideo(video,card.querySelector('.sm-cj-rail-name,.sm-card__title')?.textContent)});
       card.appendChild(button);
     });
   }
 },{rootMargin:'500px 0px'}):null;
 const scan=()=>{
   if(!observer)return;
   document.querySelectorAll('.sm-card[data-cj-video],.sm-cj-rail-card[data-cj-video]').forEach(card=>{
     if(card.dataset.cjVideoObserved)return;
     card.dataset.cjVideoObserved='1';observer.observe(card);
   });
 };
 scan();
 let scheduled=false;
 new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})}}).observe(document.body,{childList:true,subtree:true});
 window.addEventListener('popstate',scan);
 window.addEventListener('hashchange',scan);
})();