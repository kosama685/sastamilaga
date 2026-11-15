/* Sasta Milaga: additive, progressively loaded CJ category product rails.
   Preserves every existing section, site navigation and all commerce handlers.
   Source is the dated GitHub CJ catalogue snapshot; live variant and freight
   verification remain in the existing product detail flow. */
(()=>{'use strict';
  const host=document.getElementById('sm-cj-rails');if(!host)return;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
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
    return '<article class="sm-cj-rail-card" data-cj-card="'+escape(groupKey)+'"><a class="sm-cj-card-link" href="'+escape(url)+'" aria-label="View '+escape(name)+'">'
      +'<img src="'+escape(r[5])+'" alt="'+escape(name)+'" width="280" height="280" loading="lazy" decoding="async">'
      +'<span class="sm-cj-rail-name">'+escape(name)+'</span></a>'
      +'<span class="sm-cj-rail-price">'+escape(amt)+' <small>catalogue estimate · final total confirmed</small></span>'
      +'<div class="sm-cj-card-actions"><button type="button" class="sm-cj-add" data-cj-order="add" data-cj-key="'+escape(groupKey)+'">Add to cart</button>'
      +'<button type="button" class="sm-cj-quick" data-cj-order="buy" data-cj-key="'+escape(groupKey)+'" title="Quick Buy">Buy now</button>'
      +'<a class="sm-cj-wa" href="'+escape(waHref(name,url))+'" target="_blank" rel="noopener noreferrer" aria-label="Ask to order '+escape(name)+' on WhatsApp" title="Order on WhatsApp">WA</a>'
      +'</div><a class="sm-cj-rail-view" href="'+escape(url)+'">View options &amp; delivery</a></article>';
  };
  const waHref=(name,url,variant='')=>{
    const number=String((window.SM_CONFIG||{}).whatsapp||'').replace(/\D/g,'');
    const message='Assalam o Alaikum! I want to order '+name+(variant?'\nOption: '+variant:'')+'\nProduct: '+location.origin+url+'\nPlease confirm current stock, exact shipping and final price before payment.';
    return number?'https://wa.me/'+number+'?text='+encodeURIComponent(message):location.origin+url;
  };
  const modal=()=>{
    let element=document.getElementById('sm-cj-order-dialog');
    if(!element){
      element=document.createElement('dialog');element.id='sm-cj-order-dialog';element.className='sm-cj-order-dialog';
      element.innerHTML='<form method="dialog" class="sm-cj-order-shell"><button type="submit" class="sm-cj-close" aria-label="Close dialog">×</button>'
        +'<h2 id="sm-cj-order-title">Choose your option</h2><p id="sm-cj-order-message" role="status" aria-live="polite">Checking the supplier…</p>'
        +'<div id="sm-cj-order-controls" hidden><label>Product option<select id="sm-cj-order-variant" required></select></label>'
        +'<label>Quantity<input id="sm-cj-order-qty" type="number" min="1" max="99" value="1" required></label>'
        +'<p id="sm-cj-order-estimate" class="sm-cj-order-estimate"></p>'
        +'<p class="sm-cj-order-disclaimer">Supplier price estimate only. Delivery, inventory and final total are confirmed before payment.</p>'
        +'<div class="sm-cj-order-buttons"><button type="button" id="sm-cj-order-confirm" class="sm-cj-add">Add to cart</button><a id="sm-cj-order-whatsapp" class="sm-cj-wa" target="_blank" rel="noopener noreferrer">WhatsApp order</a></div></div>'
        +'<p><a id="sm-cj-order-full" href="/c/global/index.html">View full product details and delivery</a></p></form>';
      document.body.appendChild(element);
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
      const update=()=>{
        const v=variants[Number(selector.value)]||variants[0];
        estimate.textContent='Estimated '+money.format(Number(v.price)*1.2)+' each · '+money.format(Number(v.price)*1.2*(Math.min(99,Math.max(1,Number(qty.value)||1))))+' items subtotal, excluding delivery';
        wa.href=waHref(r[2],url,String(v.key||v.name||v.sku));
      };
      selector.onchange=update;qty.oninput=update;update();
      confirm.textContent=action==='buy'?'Quick Buy — continue to checkout':'Add to cart';
      onConfirm=async()=>{
        const v=variants[Number(selector.value)]||variants[0],n=Number(qty.value);
        if(!Number.isInteger(n)||n<1||n>99){status.textContent='Please enter a quantity between 1 and 99.';return;}
        if(!v?.sku||!v?.vid){status.textContent='This supplier option cannot be verified. Please use WhatsApp.';return;}
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
            status.textContent=reason+' No order has been created. Select WhatsApp order to request stock, shipping and the final price.';
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