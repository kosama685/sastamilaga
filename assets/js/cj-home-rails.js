/* Sasta Milaga: additive, progressively loaded CJ category product rails.
   Preserves every existing section, site navigation and all commerce handlers.
   Source is the dated GitHub CJ catalogue snapshot; live variant and freight
   verification remain in the existing product detail flow. */
(()=>{'use strict';
  const host=document.getElementById('sm-cj-rails');if(!host)return;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
  // Icon is inline so the purchase controls never depend on an external icon font.
  const waIcon="<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"currentColor\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M20.52 3.48A11.88 11.88 0 0 0 12.05 0C5.46 0 .1 5.35.1 11.95c0 2.1.55 4.15 1.6 5.95L0 24l6.25-1.64a11.9 11.9 0 0 0 5.79 1.48h.01c6.59 0 11.95-5.35 11.95-11.95 0-3.2-1.25-6.2-3.48-8.41ZM12.05 21.8a9.85 9.85 0 0 1-5.02-1.37l-.36-.22-3.71.97.99-3.62-.24-.37a9.8 9.8 0 0 1-1.5-5.24c0-5.44 4.43-9.87 9.87-9.87a9.8 9.8 0 0 1 6.98 2.89 9.79 9.79 0 0 1 2.89 6.98c0 5.44-4.43 9.85-9.9 9.85Zm5.42-7.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.29-.77.97-.94 1.17-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.37-1.46-.88-.78-1.47-1.74-1.64-2.03-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.64.72.23 1.37.2 1.88.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z\"/></svg>";
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,72);
  const base=()=>new URL('data/cj/',document.baseURI);
  const timeout=ms=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms));
  const fetchRows=async cat=>{
    const u=new URL('c/'+encodeURIComponent(cat.s)+'.js',base());
    const res=await Promise.race([fetch(u,{credentials:'omit',cache:'force-cache'}),timeout(14000)]);
    if(!res.ok)throw new Error('category HTTP '+res.status);
    const script=await res.text();
    const match=script.match(/^\s*(?:window\.)?SM_CJ_SHARD\s*\(\s*"([^"]+)"\s*,([\s\S]*)\);\s*$/);
    if(!match||match[1]!==cat.s)throw new Error('invalid category snapshot');
    const rows=JSON.parse(match[2]);
    if(!Array.isArray(rows))throw new Error('invalid catalogue rows');
    return rows.filter(r=>Array.isArray(r)&&r.length>=6&&r[0]&&r[2]&&/^https:\/\//.test(String(r[5]))).slice(0,10);
  };
  const records=new Map();
  const card=(cat,r)=>{
    const name=String(r[2]),url='/global/p/'+encodeURIComponent(cat.s)+'/'+encodeURIComponent(r[0]);
    const groupKey=cat.s+'|'+String(r[0]);records.set(groupKey,{cat,r,url});
    const price=Number(r[3]),amt=price>0?money.format(price*1.2):'Confirm price';
    return '<article class="sm-cj-rail-card" data-cj-video="'+escape(String(r[0]))+'" data-cj-video-hint="'+(r[6] ? '1' : '0')+'" data-cj-card="'+escape(groupKey)+'"><a class="sm-cj-card-link" href="'+escape(url)+'" aria-label="View '+escape(name)+'">'
      +'<img src="'+escape(r[5])+'" alt="'+escape(name)+'" width="280" height="280" loading="lazy" decoding="async">'
      +'<span class="sm-cj-rail-name">'+escape(name)+'</span></a>'
      +'<span class="sm-cj-rail-price">'+escape(amt)+' <small>catalogue estimate · final total confirmed</small></span>'
      +'<div class="sm-cj-card-actions"><button type="button" class="sm-cj-add" data-cj-order="add" data-cj-key="'+escape(groupKey)+'">Add to cart</button>'
      +'<button type="button" class="sm-cj-quick" data-cj-order="buy" data-cj-key="'+escape(groupKey)+'" aria-label="Quick buy '+escape(name)+'" title="Quick Buy">Buy now</button>'
      +'<a class="sm-cj-wa" href="'+escape(waHref(name,url))+'" target="_blank" rel="noopener noreferrer" aria-label="Ask to order '+escape(name)+' on WhatsApp" title="Order on WhatsApp">'+waIcon+'</a>'
      +'</div><a class="sm-cj-rail-view" href="'+escape(url)+'">View options &amp; delivery</a></article>';
  };
  const waHref=(name,url,variant='')=>{
    const number=String((window.SM_CONFIG||{}).whatsapp||'').replace(/\D/g,'');
    const message='Assalam o Alaikum! I want to order '+name+(variant?'\nOption: '+variant:'')+'\nProduct: '+location.origin+url+'\nPlease confirm current stock, exact shipping and final price before payment.';
    return number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):location.origin+url;
  };

  const uiStyle=document.createElement('style');uiStyle.id='sm-cj-quickview-v2';
  uiStyle.textContent=`
  #sm-cj-order-dialog.sm-cj-order-dialog{width:min(980px,calc(100vw - 32px));max-width:980px;max-height:calc(100dvh - 32px);overflow:auto;overscroll-behavior:contain}
  #sm-cj-order-dialog .sm-cj-order-shell{padding:clamp(16px,2.5vw,28px);display:block}
  #sm-cj-order-dialog .sm-cj-order-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:clamp(18px,3vw,32px);align-items:start}
  .sm-cj-order-gallery{min-width:0}.sm-cj-order-image-zoom{width:100%;position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1;background:#f4f7f3;border:1px solid #e1e9e3;border-radius:15px;overflow:hidden;padding:12px;cursor:zoom-in}
  .sm-cj-order-image-zoom img{height:100%;width:100%;object-fit:contain;transition:transform .2s ease}.sm-cj-order-image-zoom.is-zoomed{cursor:zoom-out}.sm-cj-order-image-zoom.is-zoomed img{transform:scale(1.7)}
  .sm-cj-order-image-hint{position:absolute;bottom:10px;right:10px;background:#fff;color:#14482e;padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700;box-shadow:0 1px 5px #0002}
  .sm-cj-order-gallery-note{margin:10px 2px 0!important;font-size:12px!important;line-height:1.5}
  #sm-cj-order-dialog .sm-cj-order-details{min-width:0;display:grid;gap:12px}.sm-cj-order-eyebrow{font-size:11px;font-weight:800;letter-spacing:.11em;color:#147a41}
  #sm-cj-order-dialog .sm-cj-order-shell h2{font-size:clamp(20px,2.1vw,26px);line-height:1.3;padding-right:36px;overflow-wrap:break-word;word-break:normal}
  #sm-cj-order-controls{display:grid;gap:12px}#sm-cj-order-controls[hidden]{display:none}
  #sm-cj-order-dialog .sm-cj-order-buttons{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(125px,.9fr);gap:10px;margin-top:6px;position:sticky;bottom:-16px;padding:12px 0;background:#fff;z-index:2}
  .sm-cj-order-buttons .sm-cj-add{min-height:46px;padding:10px 14px;line-height:1.35}.sm-cj-order-buttons .sm-cj-add:disabled{opacity:.58;cursor:wait}
  .sm-cj-order-buttons .sm-cj-wa{display:flex;align-items:center;justify-content:center;gap:8px;background:#128c49;color:#fff!important;text-decoration:none;border-radius:30px;padding:10px 12px;min-height:46px;font-size:13px;font-weight:800}
  .sm-cj-order-detail-link{font-weight:700;font-size:13px;color:#116e3c;text-decoration:underline;text-underline-offset:3px}
  .sm-cj-order-dialog :is(button,a,select,input):focus-visible{outline:3px solid #ff8a00;outline-offset:3px}
  .sm-cj-card-actions .sm-cj-wa svg{width:18px;height:18px}.sm-cj-card-actions .sm-cj-wa{min-width:39px;min-height:39px}
  @media(max-width:650px){#sm-cj-order-dialog.sm-cj-order-dialog{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);border-radius:16px}#sm-cj-order-dialog .sm-cj-order-layout{grid-template-columns:minmax(0,1fr);gap:12px}.sm-cj-order-image-zoom{aspect-ratio:16/10;max-height:240px}#sm-cj-order-dialog .sm-cj-order-shell{padding:16px}.sm-cj-order-gallery-note{font-size:11px!important}#sm-cj-order-dialog .sm-cj-order-buttons{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}}
  @media(max-width:390px){#sm-cj-order-dialog .sm-cj-order-buttons{grid-template-columns:minmax(0,1fr)}}
  @media(prefers-reduced-motion:reduce){.sm-cj-order-image-zoom img{transition:none}}
  `;
  document.head.appendChild(uiStyle);
  const modal=()=>{
    let element=document.getElementById('sm-cj-order-dialog');
    if(!element){
      element=document.createElement('dialog');element.id='sm-cj-order-dialog';element.className='sm-cj-order-dialog';
      element.setAttribute('aria-labelledby','sm-cj-order-title');
      element.setAttribute('aria-describedby','sm-cj-order-message');
      element.innerHTML='<form method="dialog" class="sm-cj-order-shell"><button type="submit" class="sm-cj-close" aria-label="Close quick buy">×</button>'
        +'<div class="sm-cj-order-layout"><div class="sm-cj-order-gallery"><button class="sm-cj-order-image-zoom" type="button" aria-label="Enlarge product photo" title="Enlarge photo"><img id="sm-cj-order-image" alt="" width="720" height="720"><span class="sm-cj-order-image-hint">Click to enlarge</span></button>'
        +'<p class="sm-cj-order-gallery-note">Supplier catalogue photo. The exact colour and options must be checked before ordering.</p></div>'
        +'<div class="sm-cj-order-details"><span class="sm-cj-order-eyebrow">QUICK PRODUCT VIEW</span><h2 id="sm-cj-order-title">Choose your option</h2>'
        +'<p id="sm-cj-order-message" role="status" aria-live="polite">Checking the supplier…</p>'
        +'<div id="sm-cj-order-controls" hidden><label>Product option<select id="sm-cj-order-variant" required></select></label>'
        +'<label>Quantity<input id="sm-cj-order-qty" type="number" min="1" max="99" inputmode="numeric" value="1" required></label>'
        +'<p id="sm-cj-order-estimate" class="sm-cj-order-estimate"></p>'
        +'<p class="sm-cj-order-disclaimer">Supplier price estimate only. Delivery, inventory and the final total are verified before payment.</p>'
        +'<div class="sm-cj-order-buttons"><button type="button" id="sm-cj-order-confirm" class="sm-cj-add">Add to cart</button><a id="sm-cj-order-whatsapp" class="sm-cj-wa" target="_blank" rel="noopener noreferrer">'+waIcon+'<span>WhatsApp</span></a></div></div>'
        +'<a id="sm-cj-order-full" class="sm-cj-order-detail-link" href="/c/global/index.html">View full product page, photos &amp; delivery →</a></div></div></form>';
      document.body.appendChild(element);
      const zoom=element.querySelector('.sm-cj-order-image-zoom');
      zoom.addEventListener('click',()=>{const enlarged=zoom.classList.toggle('is-zoomed');zoom.setAttribute('aria-label',enlarged?'Fit product photo':'Enlarge product photo')});
      element.addEventListener('close',()=>{++activeRequest;onConfirm=null;zoom.classList.remove('is-zoomed')});
    }
    return element;
  };
  let activeRequest=0, onConfirm=null;
  async function openOrder(key,action){
    const item=records.get(key);if(!item)return;
    const {cat,r,url}=item, dialog=modal(),status=dialog.querySelector('#sm-cj-order-message'),controls=dialog.querySelector('#sm-cj-order-controls');
    const selector=dialog.querySelector('#sm-cj-order-variant'),qty=dialog.querySelector('#sm-cj-order-qty'),estimate=dialog.querySelector('#sm-cj-order-estimate');
    const confirm=dialog.querySelector('#sm-cj-order-confirm'),wa=dialog.querySelector('#sm-cj-order-whatsapp'),full=dialog.querySelector('#sm-cj-order-full');
    const id=++activeRequest;status.textContent='Checking live supplier options…';controls.hidden=true;
    dialog.querySelector('#sm-cj-order-title').textContent=r[2];
    const photo=dialog.querySelector('#sm-cj-order-image');
    photo.src=/^https:\/\//i.test(String(r[5]))?String(r[5]):'/assets/brand/no-image.svg';
    photo.alt='Product photo of '+String(r[2]);
    dialog.querySelector('.sm-cj-order-image-zoom').classList.remove('is-zoomed');
    full.href=url;
    if(!dialog.open)dialog.showModal();
    const endpoint=String((window.SM_CONFIG||{}).cjShippingWorker||(window.SM_CONFIG||{}).cjImageWorker||'').replace(/\/$/,'');
    if(!endpoint){status.textContent='Live product options are not configured. Open the product page to continue.';return;}
    try{
      // CJ rate limits are intermittent. Retry only transient responses; never invent options.
      let result=null,lastError=null;
      for(let attempt=0;attempt<3;attempt++){
        if(attempt)await new Promise(resolve=>setTimeout(resolve,1600*(attempt+1)));
        if(id!==activeRequest||!dialog.open)return;
        try{
          const response=await Promise.race([fetch(endpoint+'/api/cj/product?pid='+encodeURIComponent(r[0]),{headers:{Accept:'application/json'},cache:'no-store'}),timeout(10000)]);
          if(response.status===429||response.status>=500){lastError=new Error('Supplier temporarily busy: '+response.status);continue;}
          if(!response.ok)throw new Error('Supplier returned HTTP '+response.status);
          const data=await response.json();
          if(!Array.isArray(data?.variants)||!data.variants.length)throw new Error('No verified supplier options available');
          result=data;break;
        }catch(e){lastError=e;if(!/timeout|network|fetch|busy|5\d\d/i.test(String(e?.message||e)))break;}
      }
      if(id!==activeRequest||!dialog.open)return;
      if(!result)throw (lastError||new Error('Supplier options unavailable'));
      const variants=result.variants.filter(v=>v&&v.vid&&v.sku&&Number(v.price)>0);
      if(!variants.length)throw new Error('No purchasable supplier option is currently available');
      selector.innerHTML='';
      variants.forEach((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=String(v.key||v.name||v.sku);selector.add(o);});
      qty.value='1';controls.hidden=false;status.textContent='Choose the exact supplier option before ordering.';
      let isMapped=null, optionSeq=0;
      const update=()=>{
        const v=variants[Number(selector.value)]||variants[0],seq=++optionSeq;
        // Use a verified supplier option photo when available; otherwise keep the product cover.
        const variantPhoto=String(v.image||v.imageUrl||v.img||'');
        photo.src=/^https:\/\//i.test(variantPhoto)?variantPhoto:String(r[5]);
        isMapped=null;
        estimate.textContent='Estimated '+money.format(Number(v.price)*1.2)+' each · '+money.format(Number(v.price)*1.2*(Math.min(99,Math.max(1,Number(qty.value)||1))))+' items subtotal, excluding delivery';
        wa.href=waHref(r[2],url,String(v.key||v.name||v.sku));
        confirm.disabled=true;
        confirm.textContent='Checking checkout availability…';
        if(!window.SMWoo?.active||typeof window.SMWoo?.hasSKU!=='function'){
          isMapped=false;confirm.disabled=false;confirm.textContent='Request this option on WhatsApp';
          status.textContent='This variation is not connected to secure checkout. Please request availability on WhatsApp.';
          return;
        }
        window.SMWoo.hasSKU(v.sku).then(mapped=>{
          if(seq!==optionSeq||!dialog.open)return;
          isMapped=mapped;
          confirm.disabled=false;
          confirm.textContent=mapped===true?(action==='buy'?'Quick Buy — continue to checkout':'Add to cart'):'Request this option on WhatsApp';
          status.textContent=mapped===true
            ? 'This option is linked to WooCommerce. The cart will confirm the final availability.'
            : 'This option is not linked to checkout. Request the exact option on WhatsApp, or view the full product page.';
        });
      };
      selector.onchange=update;qty.oninput=update;update();
      onConfirm=async()=>{
        const v=variants[Number(selector.value)]||variants[0],n=Number(qty.value);
        if(!Number.isInteger(n)||n<1||n>99){status.textContent='Please enter a quantity between 1 and 99.';return;}
        if(!v?.sku||!v?.vid){status.textContent='This supplier option cannot be verified. Please use WhatsApp.';return;}
        // An unmapped supplier item cannot be silently inserted into WooCommerce.
        // Route this *direct click* to the existing prefilled WhatsApp order.
        if(isMapped!==true){
          if(isMapped===null){status.textContent='Checking checkout availability. Please retry.';return;}
          window.open(wa.href,'_blank','noopener,noreferrer');
          return;
        }
        const woo=window.SMWoo;
        if(!woo?.active||typeof woo.add!=='function'){
          status.textContent='WooCommerce checkout is only available on the main store. Use WhatsApp to request this exact variation.';
          return;
        }
        confirm.disabled=true;confirm.setAttribute('aria-busy','true');
        status.textContent='Verifying this variation with the WooCommerce cart…';
        try{
          // WooCommerce is the single source of truth for cart, price and availability.
          // Never fall back to localStorage or claim an order when the server rejects a SKU.
          const saved=await woo.add(String(v.sku),n);
          if(!saved?.ok){
            const reason=saved?.reason==='unmapped'
              ? 'This CJ variation has not been synchronized with WooCommerce.'
              : (saved?.message||'WooCommerce could not accept this variation.');
            status.textContent=reason+' No order has been created. Request this variation on WhatsApp for stock, shipping and final price.';
            if(saved?.reason==='unmapped'){isMapped=false;confirm.textContent='Request this option on WhatsApp';}
            return;
          }
          dialog.close();
          if(action==='buy')location.assign('/checkout/');
          else{
            const label=document.createElement('span');
            label.className='sm-cj-feedback';label.setAttribute('role','status');
            label.textContent='Added to WooCommerce cart';
            const original=[...host.querySelectorAll('[data-cj-order="add"]')].find(b=>b.dataset.cjKey===key);
            if(original){original.after(label);setTimeout(()=>label.remove(),4500);}
          }
        }catch(err){
          status.textContent='The secure WooCommerce cart is unavailable. No order was created. Please use WhatsApp or retry.';
          console.warn('WooCommerce add-item failed',String(err?.message||err));
        }finally{confirm.disabled=false;confirm.removeAttribute('aria-busy');}
      };
    }catch(e){if(id!==activeRequest)return;status.textContent='Live supplier options are unavailable right now. Open the product page or ask on WhatsApp. We will not add an unverified option to the cart.';controls.hidden=true;console.warn('CJ card option verification failed',String(e.message||e));}
  }
  // Capture above document-level recovery listeners that can swallow commerce clicks.
  window.addEventListener('click',e=>{
    const target=e.target;
    if(!(target instanceof Element))return;
    const confirm=target.closest('#sm-cj-order-confirm');
    if(confirm&&document.getElementById('sm-cj-order-dialog')?.open){
      e.preventDefault();e.stopImmediatePropagation();
      if(!confirm.disabled&&onConfirm)onConfirm();
      return;
    }
    const btn=target.closest('[data-cj-order]');
    if(!btn||!host.contains(btn))return;
    e.preventDefault();e.stopImmediatePropagation();
    openOrder(btn.dataset.cjKey,btn.dataset.cjOrder);
  },true);
  const section=(group,cat)=>{
    const sec=document.createElement('section');sec.className='sm-cj-rail';sec.dataset.category=cat.s;
    sec.innerHTML='<div class="sm-cj-rail-top"><div><h3>'+escape(group.n)+'</h3><p>Browse international finds. Final stock, price and shipping are checked for your destination.</p></div>'
      +'<a href="/global/g/'+encodeURIComponent(group.s)+'/">View all '+escape(group.n)+'</a></div>'
      +'<div class="sm-cj-rail-track" tabindex="0" aria-label="'+escape(group.n)+' product selection"><p class="sm-cj-rail-status" role="status">Loading products…</p></div>';
    return sec;
  };
  const render=async(section,group,categories)=>{
    const track=section.querySelector('.sm-cj-rail-track');
    let lastError=null;
    // The largest two eligible subcategories are attempted; never fabricate products.
    for(const cat of categories.slice(0,3)){
      try{
        const rows=await fetchRows(cat);
        if(!rows.length)continue;
        section.dataset.category=cat.s;
        track.innerHTML=rows.map(r=>card(cat,r)).join('');
        section.classList.add('is-ready');
        return;
      }catch(e){lastError=e}
    }
    track.innerHTML='<p class="sm-cj-rail-status">Products are temporarily unavailable in this category. '
      +'<a href="/global/g/'+encodeURIComponent(group.s)+'/">Browse the category</a></p>';
    if(lastError)console.warn('CJ category snapshot failed',group.s,lastError.message);
  };
  async function start(){
    const manifest=window.SM_CJ||(await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src=new URL('manifest.js',base()).href;
      script.onload=()=>resolve(window.SM_CJ);script.onerror=()=>reject(new Error('manifest unavailable'));document.head.appendChild(script);
    }));
    if(!manifest||!Array.isArray(manifest.groups)||!Array.isArray(manifest.cats))throw new Error('invalid CJ manifest');
    host.innerHTML='<div class="sm-cj-rails-heading"><div><p class="sm-cj-eyebrow">INTERNATIONAL PRODUCT DISCOVERY</p><h2>Explore global products by category</h2>'
      +'<p>All '+manifest.groups.length+' catalogue groups. Product cards are drawn from the '+escape(manifest.snapshot||'saved')+' CJ catalogue snapshot, not a live inventory claim.</p></div>'
      +'<a href="/c/global/index.html">Explore all categories</a></div><div id="sm-cj-rails-list"></div>';
    const container=host.querySelector('#sm-cj-rails-list');
    let observer;
    const load=new WeakSet();
    const pending=[];
    let busy=false;
    const pump=async()=>{
      if(busy)return;busy=true;
      while(pending.length){const [el,group,cats]=pending.shift();await render(el,group,cats);}
      busy=false;
    };
    observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const el=entry.target;observer.unobserve(el);
        if(load.has(el))return;load.add(el);
        const group=manifest.groups.find(g=>g.s===el.dataset.group);
        const cats=manifest.cats.filter(c=>c.g===group.n).sort((a,b)=>b.c-a.c);
        pending.push([el,group,cats]);pump();
      });
    },{rootMargin:'700px 0px'}):null;
    manifest.groups.forEach(group=>{
      const cats=manifest.cats.filter(c=>c.g===group.n).sort((a,b)=>b.c-a.c);
      if(!cats.length)return;
      const el=section(group,cats[0]);el.dataset.group=group.s;
      container.appendChild(el);
      if(observer)observer.observe(el);else pending.push([el,group,cats]);
    });
    if(!observer)pump();
  }
  start().catch(e=>{console.error('CJ rails unavailable:',e.message);host.innerHTML='<div class="sm-cj-rails-heading"><h2>Explore global products by category</h2><p>Category product rows are temporarily unavailable. <a href="/c/global/index.html">Browse the global catalogue</a>.</p></div>'});
})();