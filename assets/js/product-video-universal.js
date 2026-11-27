/* Sasta Milaga unified video UX. Optional media; no autoplay and no purchase changes. */
(()=>{'use strict';
 if(window.SMProductVideoUX)return;
 const validSigned=/^\/cjv\/v1\/[A-Za-z0-9_-]+\.[a-f0-9]{64}$/;
 const validPid=/^(?:[0-9]{15,22}|[0-9a-f-]{36})$/i;
 const style=document.createElement('style');
 style.id='sm-product-video-style';
 style.textContent=[
 '.sm-vux-control{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:12px 0}',
 '.sm-vux-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:10px 15px;border:1px solid #c1dfca;border-radius:24px;background:#eef8f0;color:#135a32;font:750 13px/1.25 system-ui;cursor:pointer;box-shadow:0 3px 9px #112f1410}',
 '.sm-vux-button:hover{background:#ddf1e3;border-color:#18834b}.sm-vux-button:focus-visible,.sm-vux-close:focus-visible{outline:3px solid #f79528;outline-offset:3px}',
 '.sm-vux-button svg{width:18px;height:18px;flex:none}.sm-vux-button:disabled{opacity:.6;cursor:wait}',
 '.sm-vux-card{position:absolute;top:10px;right:10px;z-index:6;background:#135934;color:white;border-color:#ffffff8c;min-height:36px;padding:7px 10px;box-shadow:0 4px 16px #0005}',
 '.sm-card:has(>.sm-vux-card),.sm-cj-rail-card:has(>.sm-vux-card){position:relative}',
 '.sm-vux-status{color:#526c5b;font:500 12px/1.4 system-ui}',
 '.sm-vux-modal{border:0;padding:0;width:min(880px,calc(100vw - 24px));max-height:calc(100dvh - 24px);border-radius:18px;background:#091911;color:#fff;overflow:hidden;box-shadow:0 22px 65px #0009}',
 '.sm-vux-modal::backdrop{background:#00180bc7}.sm-vux-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;gap:14px;background:#173f2a}',
 '.sm-vux-head h2{margin:0;color:#fff;font:750 clamp(17px,2vw,23px)/1.3 system-ui}.sm-vux-close{border:0;background:#fff;color:#145030;border-radius:50%;width:42px;height:42px;flex:none;font:24px system-ui;cursor:pointer}',
 '.sm-vux-modal video{display:block;width:100%;max-height:70dvh;aspect-ratio:16/9;background:#000;object-fit:contain}.sm-vux-note{padding:10px 16px;margin:0;color:#e5f3e8;font:12px system-ui}',
 '@media(max-width:480px){.sm-vux-card{right:7px;top:7px;font-size:11px;padding:6px 8px}}'
 ].join('');
 document.head.appendChild(style);
 const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none"/></svg>';
 let dialog,lastButton;
 function getDialog(){
   if(dialog)return dialog;
   dialog=document.createElement('dialog');dialog.className='sm-vux-modal';dialog.setAttribute('aria-labelledby','sm-vux-title');
   dialog.innerHTML='<div class="sm-vux-head"><h2 id="sm-vux-title"></h2><button class="sm-vux-close" type="button" aria-label="Close video">×</button></div><video controls playsinline preload="none"></video><p class="sm-vux-note">Media provided by the seller or supplier. Stock, prices and delivery are confirmed separately.</p>';
   document.body.appendChild(dialog);
   dialog.querySelector('button').addEventListener('click',()=>dialog.close());
   dialog.addEventListener('close',()=>{const v=dialog.querySelector('video');v.pause();v.removeAttribute('src');v.load();if(lastButton?.isConnected)lastButton.focus()});
   dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
   return dialog;
 }
 function safeLocal(src){
   try{const u=new URL(src,location.href);return u.protocol==='https:'||u.protocol==='http:'}catch{return false}
 }
 function media(el){
   const items=[];
   try{const x=JSON.parse(decodeURIComponent(el.dataset.localVideos||'[]'));if(Array.isArray(x))items.push(...x)}catch{}
   el.querySelectorAll('video[src],video source[src],[data-type="video"][data-gallery]').forEach(e=>items.push(e.getAttribute('src')||e.getAttribute('data-gallery')));
   return items.filter(v=>typeof v==='string'&&safeLocal(v)&&/\.(mp4|webm|ogg)(?:$|[?#])/i.test(new URL(v,location.href).pathname));
 }
 function open(src,title,button){
   const d=getDialog();lastButton=button;d.querySelector('h2').textContent=title||'Product video';
   d.querySelector('video').src=src;d.showModal();
 }
 function create(card){
   const b=document.createElement('button');b.type='button';b.className='sm-vux-button'+(card?' sm-vux-card':'');
   b.innerHTML=icon+'<span>'+(card?'Video':'Watch product video')+'</span>';return b;
 }
 function status(button,msg){
   let host=button.closest('.sm-vux-control')||button.parentElement;
   let el=host.querySelector('.sm-vux-status');
   if(!el){el=document.createElement('span');el.className='sm-vux-status';el.setAttribute('role','status');el.setAttribute('aria-live','polite');host.appendChild(el)}
   el.textContent=msg;
 }
 async function resolveCJ(pid,button,title){
  button.disabled=true;status(button,'Checking supplier video…');
  try{
   let v=null;
   if(window.SMCJVideo?.resolve)v=await window.SMCJVideo.resolve(pid);
   else{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
    try{const r=await fetch('/cjv/resolve?pid='+encodeURIComponent(pid),{credentials:'omit',signal:ctl.signal});if(r.ok){const j=await r.json();if(j.status==='available')v=j.video}}
    finally{clearTimeout(timer)}
   }
   if(!v||!validSigned.test(String(v.src||''))){status(button,'No authorized video is available for this product.');return}
   status(button,'Video available');open(v.src,title,button);
  }catch{status(button,'Video unavailable right now. Retry later.')}finally{button.disabled=false}
 }
 function attach(el,card){
  if(el.dataset.smVuxAttached)return;
  if(card&&el.matches('[data-cj-video][data-cj-video-hint="1"]'))return; // existing signed CJ card widget owns known media
  if(card&&el.querySelector('.sm-cj-video-button'))return;
  el.dataset.smVuxAttached='1';
  const pid=el.dataset.cjVideo||el.dataset.cjPid;
  const title=el.querySelector('h1,.sm-card__title,.sm-cj-rail-name')?.textContent?.trim()||'Product';
  const button=create(card);button.setAttribute('aria-label','Check product video for '+title);
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(pid&&validPid.test(pid))return resolveCJ(pid,button,title);
   const videos=media(el);
   if(videos.length)open(videos[0],title,button);else status(button,'No product video is currently available.');
  });
  if(card)el.appendChild(button);
  else{
   const wrap=document.createElement('div');wrap.className='sm-vux-control';wrap.appendChild(button);
   const gallery=el.querySelector('.gallery-panel');if(gallery)gallery.appendChild(wrap);else el.prepend(wrap);
  }
 }
 function scan(){
  document.querySelectorAll('.sm-card,.sm-cj-rail-card').forEach(e=>attach(e,true));
  document.querySelectorAll('.pdp').forEach(e=>{
   if(e.querySelector('.sm-video-check'))return; // Dedicated product Worker already has its own video modal
   const match=location.pathname.match(/^\/global-shop\/p\/([0-9a-f-]+)\//i)||location.hash.match(/^#\/global\/p\/[^/]+\/([0-9a-f-]+)/i);
   if(match)e.dataset.cjPid=match[1];
   attach(e,false);
  });
 }
 let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;scan()})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan,{once:true});else scan();
 new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('hashchange',schedule);addEventListener('popstate',schedule);
 window.SMProductVideoUX={scan};
})();
