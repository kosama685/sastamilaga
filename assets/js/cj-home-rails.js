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
  const card=(cat,r)=>{
    const name=String(r[2]),url='/#/global/p/'+encodeURIComponent(cat.s)+'/'+encodeURIComponent(r[0]);
    const price=Number(r[3]),amt=price>0?money.format(price*1.2):'Confirm price';
    return '<article class="sm-cj-rail-card"><a href="'+escape(url)+'" aria-label="View '+escape(name)+'">'
      +'<img src="'+escape(r[5])+'" alt="'+escape(name)+'" width="280" height="280" loading="lazy" decoding="async">'
      +'<span class="sm-cj-rail-name">'+escape(name)+'</span></a>'
      +'<span class="sm-cj-rail-price">'+escape(amt)+' <small>catalogue estimate</small></span>'
      +'<a class="sm-cj-rail-view" href="'+escape(url)+'">View options and delivery</a></article>';
  };
  const section=(group,cat)=>{
    const sec=document.createElement('section');sec.className='sm-cj-rail';sec.dataset.category=cat.s;
    sec.innerHTML='<div class="sm-cj-rail-top"><div><h3>'+escape(group.n)+'</h3><p>Browse international finds. Final stock, price and shipping are checked for your destination.</p></div>'
      +'<a href="/#/global/g/'+encodeURIComponent(group.s)+'">View all '+escape(group.n)+'</a></div>'
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
      +'<a href="/#/global/g/'+encodeURIComponent(group.s)+'">Browse the category</a></p>';
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
      +'<a href="/#/global">Explore all categories</a></div><div id="sm-cj-rails-list"></div>';
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
  start().catch(e=>{console.error('CJ rails unavailable:',e.message);host.innerHTML='<div class="sm-cj-rails-heading"><h2>Explore global products by category</h2><p>Category product rows are temporarily unavailable. <a href="/#/global">Browse the global catalogue</a>.</p></div>'});
})();