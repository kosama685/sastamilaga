/* Sasta Milaga — additive live CJ discovery in the EXISTING global homepage
 * section. Does not replace hero, travel, local categories, deals or footer.
 * Official CJ categories/listV2 are retrieved server-side via Cloudflare.
 * Sequential lazy fetches protect supplier API quotas and mobile LCP. */
(function(){
 'use strict';
 const API='https://sastamilaga-cj-shipping.usamaestonia.workers.dev';
 const MAX=100;
 const state={country:'',groups:[],queue:[],busy:false,timer:null,observer:null,requests:0};
 if(!/^(\/|\/sastamilaga\/|\/index\.html)$/.test(location.pathname))return;
 const media=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)');
 const $=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=String(text);return el};
 const slug=(str)=>String(str||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75)||'product';
 const imageOK=(str)=>{try{const u=new URL(str);return u.protocol==='https:'?u.href:''}catch{return ''}};
 const get=async(path)=>{
  const controller=new AbortController();
  const t=setTimeout(()=>controller.abort(),18000);
  try{const response=await fetch(API+path,{signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
    const json=await response.json();if(!response.ok)throw new Error(json.error||'Supplier service unavailable');
    return json;
  }finally{clearTimeout(t)}
 };
 function card(item){
  const a=$('a','sm-cj-rail-card');
  a.href='/global-shop/p/'+encodeURIComponent(item.id)+'/'+slug(item.title)+'/';
  a.setAttribute('aria-label','View '+item.title+' product details');
  const art=$('span','sm-cj-rail-image'),img=$('img');
  const src=imageOK(item.image);
  if(src){img.src=src;img.alt=item.title;img.loading='lazy';img.decoding='async';img.width=280;img.height=280;art.append(img)}
  else art.append($('span','sm-cj-no-photo','Photo unavailable'));
  a.append(art,$('strong','sm-cj-rail-title',item.title));
  if(Number.isFinite(item.priceMin)&&item.priceMin>0){
    const high=Number(item.priceMax)>item.priceMin?'–'+Number(item.priceMax).toFixed(2):'';
    a.append($('small','sm-cj-rail-price','Supplier reference US$'+item.priceMin.toFixed(2)+high));
  }else a.append($('small','sm-cj-rail-price','Request supplier price'));
  a.append($('small','sm-cj-rail-note','Final availability and delivery require confirmation'));
  return a;
 }
 function renderRail(section,data){
  const mount=section.querySelector('.sm-cj-rail-viewport'),status=section.querySelector('[role=status]');
  mount.replaceChildren();
  if(!Array.isArray(data.products)||!data.products.length){
   status.textContent=state.country?'No listed supplier products for this ship-from country. Try all countries.':'No products returned for this supplier category.';
   return;
  }
  const list=$('div','sm-cj-rail-track'),a=$('div','sm-cj-rail-set'),b=$('div','sm-cj-rail-set');
  for(const item of data.products)a.append(card(item));
  const shouldAnimate=data.products.length>=4&&!media?.matches;
  if(shouldAnimate){
   b.setAttribute('aria-hidden','true');b.inert=true;
   for(const item of data.products)b.append(card(item));
   list.classList.add('sm-cj-rail-auto');list.append(a,b);
  }else list.append(a);
  mount.append(list);
  section.dataset.loadedCountry=state.country||'ALL';
  status.textContent=data.count+' live supplier products from '+(data.leaf||data.category)+'. Supplier references are not final checkout prices.';
  const left=section.querySelector('[data-scroll=left]'),right=section.querySelector('[data-scroll=right]');
  for(const btn of [left,right])btn.disabled=data.products.length<2;
  const navigate=direction=>{list.classList.remove('sm-cj-rail-auto');mount.scrollBy({left:direction*300,behavior:media?.matches?'instant':'smooth'})};
  left.onclick=()=>navigate(-1);right.onclick=()=>navigate(1);
 }
 function schedule(section){
  if(!section||section.dataset.queued==='1')return;
  section.dataset.queued='1';state.queue.push(section);pump();
 }
 function pump(){
  if(state.busy||!state.queue.length)return;
  state.busy=true;
  const section=state.queue.shift(),group=section.dataset.group;
  const status=section.querySelector('[role=status]');
  status.textContent='Checking live CJ catalogue…';
  const p='/api/cj/home-rail?categoryId='+encodeURIComponent(group)+(state.country?'&countryCode='+encodeURIComponent(state.country):'');
  get(p).then(d=>{
   if(section.dataset.group!==d.categoryId&&section.dataset.group!==String(d.categoryId||'').toUpperCase())throw Error('Unexpected supplier category');
   renderRail(section,d);
  }).catch(e=>{
   status.textContent='Live supplier details are temporarily unavailable. Browse global categories or retry.';
   section.querySelector('.sm-cj-retry').hidden=false;
  }).finally(()=>{
   section.dataset.queued='';
   state.busy=false;
   // Keep upstream QPS low, even if the visitor scrolls through many rails.
   setTimeout(pump,1250);
  });
 }
 function groupSection(g){
  const sec=$('section','sm-cj-live-group');
  sec.dataset.group=g.id;
  const heading=$('div','sm-cj-group-heading'),left=$('div'),actions=$('div','sm-cj-group-actions');
  const h=$('h5','',g.name);
  left.append(h,$('p','sm-cj-group-summary','Live CJ supplier examples · up to 10 items'));
  const prev=$('button','sm-cj-arrow','Previous');prev.type='button';prev.dataset.scroll='left';prev.disabled=true;
  const next=$('button','sm-cj-arrow','Next');next.type='button';next.dataset.scroll='right';next.disabled=true;
  const explore=$('a','sm-cj-browse','Browse global categories');explore.href='/c/global/index.html';
  actions.append(prev,next,explore);heading.append(left,actions);
  const viewport=$('div','sm-cj-rail-viewport');viewport.setAttribute('aria-label',g.name+' supplier products');viewport.tabIndex=0;
  const status=$('p','sm-cj-status','Products load when you reach this category.');status.setAttribute('role','status');
  const retry=$('button','sm-cj-retry','Retry');retry.hidden=true;retry.type='button';retry.onclick=()=>{retry.hidden=true;schedule(sec)};
  sec.append(heading,viewport,status,retry);
  return sec;
 }
 function inject(){
  const existing=document.getElementById('sm-home-global');
  if(!existing||existing.querySelector('#sm-cj-live-rails'))return !!existing;
  const block=$('section','sm-cj-live');block.id='sm-cj-live-rails';block.setAttribute('aria-label','Live global supplier discoveries');
  const head=$('div','sm-cj-live-head'),intro=$('div'),ctrl=$('div','sm-cj-country-select');
  intro.append($('span','sm-cj-eyebrow','EXPLORE GLOBAL SUPPLIERS'),$('h4','','Live CJ discoveries by category'),
    $('p','','Explore real supplier catalogue selections. Existing local products and homepage sections remain unchanged.'));
  const label=$('label','', 'Ship from'),select=$('select');
  select.id='sm-cj-shipfrom';label.htmlFor=select.id;
  const all=$('option','', 'All warehouse countries');all.value='';select.append(all);
  ctrl.append(label,select);head.append(intro,ctrl);
  const shell=$('div','sm-cj-live-groups'),feedback=$('p','sm-cj-live-feedback','Loading current supplier categories…');
  feedback.setAttribute('role','status');
  block.append(head,feedback,shell);
  existing.append(block);
  // The country selector is *never* set implicitly from IP or market locale.
  select.addEventListener('change',()=>{
   state.country=/^[A-Z]{2}$/.test(select.value)?select.value:'';
   state.queue=[];state.busy=false;
   shell.querySelectorAll('.sm-cj-live-group').forEach(sec=>{
    sec.dataset.queued='';
    sec.dataset.loadedCountry='';
    sec.querySelector('.sm-cj-rail-viewport').replaceChildren();
    sec.querySelector('[role=status]').textContent='Updating the selected ship-from country…';
    sec.querySelector('.sm-cj-retry').hidden=true;
   });
   state.observer?.disconnect();
   watch(shell);
  });
  get('/api/cj/home-warehouses').then(d=>{
    if(!Array.isArray(d.countries))return;
    for(const w of d.countries){if(!/^[A-Z]{2}$/.test(w.code))continue;const option=$('option','',w.name);option.value=w.code;select.append(option)}
  }).catch(()=>{ctrl.title='Warehouse filters temporarily unavailable';});
  get('/api/cj/home-categories').then(d=>{
   if(!Array.isArray(d.groups)||!d.groups.length)throw Error('No live groups');
   state.groups=d.groups.slice(0,MAX);
   shell.replaceChildren(...state.groups.map(groupSection));
   feedback.textContent='Live CJ categories: '+state.groups.length+' · Product rows load as you browse. All warehouse countries included by default.';
   watch(shell);
  }).catch(()=>{
   feedback.replaceChildren(document.createTextNode('CJ categories are unavailable right now. '));
   const a=$('a','','Browse the existing global categories');a.href='/c/global/index.html';feedback.append(a);
  });
  return true;
 }
 function watch(shell){
  if('IntersectionObserver' in window){
   state.observer=new IntersectionObserver((entries)=>{
    for(const e of entries)if(e.isIntersecting){
     state.observer.unobserve(e.target);schedule(e.target)
    }
   },{rootMargin:'250px 0px'});
   shell.querySelectorAll('.sm-cj-live-group').forEach(s=>state.observer.observe(s));
  }else shell.querySelectorAll('.sm-cj-live-group').forEach(schedule);
 }
 if(!inject()){
  const observer=new MutationObserver(()=>{if(inject())observer.disconnect()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('sasta:rendered',inject,{once:true});
 }
})();
