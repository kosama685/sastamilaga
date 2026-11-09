(() => {
  const root = document.querySelector('.sm-travel'); if (!root || !window.SMTravel) return;
  const travelFetch = async (url, options={}) => {
    const controller=new AbortController(), external=options.signal;
    const abort=()=>controller.abort();if(external?.aborted)abort();else external?.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(abort,18000);
    try{const response=await window.fetch(url,{...options,signal:controller.signal}),data=await response.json();return {ok:response.ok,status:response.status,json:async()=>data};}finally{clearTimeout(timeout);external?.removeEventListener('abort',abort);}
  };
  const tabs = [...root.querySelectorAll('.sm-travel-tab')];
  const forms = [...root.querySelectorAll('.sm-travel-form')];
  const setMinDates = form => {
    const departure = form.querySelector('[name="departure"]'); const ret = form.querySelector('[name="return"]');
    const today = new Date(); const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0,10);
    departure.min = localDate; if (!departure.value) departure.value = localDate;
    if (ret) { ret.min = localDate; if (!ret.value) { const d = new Date(); d.setDate(d.getDate() + 7); ret.value = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,10); } }
    departure.addEventListener('change', () => { if (ret) { const next = new Date(departure.value + 'T12:00:00'); next.setDate(next.getDate()+1); ret.min = new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,10); if (ret.value && ret.value <= departure.value) ret.value = ret.min; } });
  };
  forms.forEach(setMinDates);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => { const active = t === tab; t.classList.toggle('is-active',active); t.setAttribute('aria-selected', String(active)); });
    forms.forEach(form => form.classList.toggle('is-active', form.dataset.kind === tab.dataset.tab));
  }));
  const debounce = (fn, wait=220) => { let timer; return (...args) => { clearTimeout(timer); timer=setTimeout(()=>fn(...args),wait); }; };
  const attachSuggest = (field, route, hiddenName) => {
    const input=field.querySelector('input:not([type="hidden"])'),hidden=field.querySelector(`[name="${hiddenName}"]`),box=field.querySelector('.sm-suggestions'),latitude=field.querySelector('[name="city_lat"]'),longitude=field.querySelector('[name="city_lng"]');
    let generation=0,controller=null;
    const close=()=>{box.classList.remove('is-open');box.replaceChildren();input.setAttribute('aria-expanded','false');};
    input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
    const invalidate=()=>{generation++;controller?.abort();hidden.value='';if(latitude)latitude.value='';if(longitude)longitude.value='';close();};
    const lookup=debounce(async()=>{
      const q=input.value.trim(),id=generation;if(q.length<2)return;
      controller?.abort();controller=new AbortController();
      try{
        const response=await travelFetch(`${SMTravel.root}${route}?q=${encodeURIComponent(q)}`,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error();const items=await response.json();
        if(id!==generation||q!==input.value.trim()||hidden.value)return;
        box.replaceChildren();
        if(!Array.isArray(items)||!items.length){const empty=document.createElement('div');empty.className='sm-suggestion';empty.textContent=SMTravel.strings.noOptions;box.append(empty);}
        else items.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='sm-suggestion';button.setAttribute('role','option');button.textContent=item.label;button.addEventListener('click',()=>{generation++;controller?.abort();input.value=item.label;hidden.value=item.code||item.id;if(latitude)latitude.value=item.latitude??'';if(longitude)longitude.value=item.longitude??'';close();input.dispatchEvent(new Event('change',{bubbles:true}));});box.append(button);});
        box.classList.add('is-open');input.setAttribute('aria-expanded','true');
      }catch(_){if(id===generation)close();}
    });
    input.addEventListener('input',()=>{invalidate();lookup();});
    input.addEventListener('focus',()=>{if(!hidden.value&&input.value.trim().length>1)lookup();});
    field.addEventListener('keydown',e=>{const items=[...box.querySelectorAll('button')],index=items.indexOf(document.activeElement);if(e.key==='ArrowDown'&&items.length){e.preventDefault();items[(index+1)%items.length].focus();}if(e.key==='ArrowUp'&&items.length){e.preventDefault();items[(index-1+items.length)%items.length].focus();}if(e.key==='Escape'){generation++;controller?.abort();close();input.focus();}});
    document.addEventListener('click',e=>{if(!field.contains(e.target)){generation++;controller?.abort();close();}});
  };
  root.querySelectorAll('.sm-flight-grid .sm-suggest-field').forEach((field,i)=>attachSuggest(field,'suggest',i===0?'origin':'destination'));
  const hotelField=root.querySelector('.sm-hotel-suggest'); if(hotelField)attachSuggest(hotelField,'hotel-suggest','city');
  const ageFields=(container,count,name)=>{container.replaceChildren();const total=Math.max(0,Math.min(8,Number(count)||0));container.hidden=total===0;for(let i=0;i<total;i++){const label=document.createElement('label');label.className='sm-age-field';const title=document.createElement('span');title.textContent=`${name} ${i+1} age`;const select=document.createElement('select');select.name='ages[]';select.required=true;select.setAttribute('aria-label',title.textContent);const empty=document.createElement('option');empty.value='';empty.textContent='Select age';select.append(empty);for(let age=0;age<=17;age++){const option=document.createElement('option');option.value=String(age);option.textContent=age===0?'Under 1':`${age} years`;select.append(option);}label.append(title,select);container.append(label);}};
  const flightAgeWrap=root.querySelector('[data-flight-age-fields]');const hotelAgeWrap=root.querySelector('[data-hotel-age-fields]');const flightChildren=root.querySelector('#sm-flight-form [name="children"]');const hotelChildren=root.querySelector('#sm-hotel-form [name="children"]');
  if(flightChildren&&flightAgeWrap){flightChildren.addEventListener('change',()=>ageFields(flightAgeWrap,flightChildren.value,'Passenger'));ageFields(flightAgeWrap,flightChildren.value,'Passenger');}
  if(hotelChildren&&hotelAgeWrap){hotelChildren.addEventListener('change',()=>ageFields(hotelAgeWrap,hotelChildren.value,'Child'));ageFields(hotelAgeWrap,hotelChildren.value,'Child');}
  const swap=root.querySelector('.sm-swap'); if(swap)swap.addEventListener('click',()=>{const f=root.querySelector('#sm-flight-form'),a=f.elements.origin_label,b=f.elements.destination_label,ai=f.elements.origin,bi=f.elements.destination;[a.value,b.value]=[b.value,a.value];[ai.value,bi.value]=[bi.value,ai.value];});
  const renderFareResults=(results,currency)=>{
    const section=root.querySelector('[data-flight-results]');const list=section&&section.querySelector('[data-flight-result-list]');if(!section||!list)return false;const hd=section.querySelector('.sm-flight-results-heading');if(hd){hd.querySelector('.sm-travel-eyebrow').textContent='RECENT FARE INSIGHTS';hd.querySelector('h3').textContent='Lowest recent fares for your route';hd.querySelector('p').textContent='Based on recent Aviasales search data. Confirm the current total and availability with the booking partner.';}
    list.replaceChildren();
    const fmt=new Intl.NumberFormat(undefined,{style:'currency',currency:currency||SMTravel.currency,maximumFractionDigits:0});
    const dateFmt=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
    results.forEach(fare=>{
      const card=document.createElement('article');card.className='sm-fare-card';
      const top=document.createElement('div');top.className='sm-fare-top';
      const route=document.createElement('strong');route.textContent=`${fare.departureAirport||fare.origin||''} to ${fare.arrivalAirport||fare.destination||''}`.trim();top.append(route);
      const stops=document.createElement('span');stops.className='sm-fare-stops';stops.textContent=Number(fare.stops)===0?'Non-stop':`${fare.stops} stop${Number(fare.stops)===1?'':'s'}`;top.append(stops);card.append(top);
      const meta=document.createElement('p');meta.className='sm-fare-meta';meta.textContent=[fare.airline,fare.flightNumber?`Flight ${fare.flightNumber}`:''].filter(Boolean).join(' · ')||'Flight option';card.append(meta);
      const dates=document.createElement('p');dates.className='sm-fare-dates';
      const nice=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':dateFmt.format(date);};
      dates.textContent=[nice(fare.departureAt),fare.returnAt?`Return ${nice(fare.returnAt)}`:''].filter(Boolean).join(' · ');card.append(dates);
      const bottom=document.createElement('div');bottom.className='sm-fare-bottom';const price=document.createElement('strong');price.className='sm-fare-price';
      try{price.textContent=fmt.format(Number(fare.price));}catch(_){price.textContent=`${fare.currency||currency} ${fare.price}`;}bottom.append(price);
      const book=document.createElement('button');book.type='button';book.className='sm-fare-book';book.textContent='Check fare';
      book.addEventListener('click',async()=>{book.disabled=true;book.textContent='Opening...';try{if(typeof fare.book==='string'&&fare.book.indexOf('https://tp.media/r?')===0){window.location.assign(fare.book);return;}const response=await travelFetch(`${SMTravel.root}fare-link`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-WP-Nonce':SMTravel.nonce},body:JSON.stringify({link:fare.link})});const body=await response.json();if(!response.ok||!body.url)throw new Error(body.message||SMTravel.strings.noOptions);window.location.assign(body.url);}catch(error){book.disabled=false;book.textContent='Try again';const message=document.createElement('span');message.className='sm-fare-error';message.textContent=error.message||SMTravel.strings.noOptions;book.after(message);}});
      bottom.append(book);card.append(bottom);list.append(card);
    });
    section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'nearest'});return true;
  };
  const payloadFor=(form,data)=>({kind:form.dataset.kind,departure:data.get('departure'),return:form.dataset.kind==='flight'&&form.elements.oneway.checked?'':data.get('return'),oneway:form.dataset.kind==='flight'&&form.elements.oneway.checked,currency:root.querySelector('.sm-currency select').value,origin:data.get('origin'),destination:data.get('destination'),city:data.get('city'),city_label:data.get('city_label'),latitude:data.get('city_lat'),longitude:data.get('city_lng'),adults:data.get('adults'),children:Number(data.get('children')||0),ages:data.getAll('ages[]').filter(value=>value!=='' ).map(Number),rooms:Number(data.get('rooms')||1),cabin:data.get('cabin')||'economy'});
  const partnerSearch=async(kind,payload)=>{const response=await travelFetch(`${SMTravel.root}trip-request`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','X-WP-Nonce':SMTravel.nonce},body:JSON.stringify({...payload,kind})});const body=await response.json();if(!response.ok||!body.url)throw new Error(body.message||SMTravel.strings.noOptions);const form=root.querySelector(`#sm-${kind}-form`);const status=form&&form.querySelector('.sm-form-status');if(status)status.textContent=SMTravel.strings.requestSaved||'Request saved.';window.location.assign(body.url);};
  const directFlightResults=(results)=>{const section=root.querySelector('[data-flight-results]'),list=section&&section.querySelector('[data-flight-result-list]');if(!section||!list)return;const hd=section.querySelector('.sm-flight-results-heading');if(hd){hd.querySelector('.sm-travel-eyebrow').textContent='LIVE AIRLINE OFFERS';hd.querySelector('h3').textContent='Live fares for your dates';hd.querySelector('p').textContent='Live offers from airlines via Duffel, sorted by price. Fares can change until a booking is confirmed.';}list.replaceChildren();const fmt=(amount,currency)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(Number(amount));}catch(_){return `${currency||''} ${amount}`;}};if(!results.length){const empty=document.createElement('p');empty.className='sm-empty-results';empty.textContent='No live fares matched this search. Change your dates or route and try again.';list.append(empty);}const smSeen=new Map();results=results.filter(o=>{const k=[(o.carriers||[]).join(),o.price,o.currency,((o.journeys||[])[0]||[]).map(s=>s.origin+s.departingAt+s.destination).join()].join('|');const kept=smSeen.get(k);if(kept){kept.smMore=(kept.smMore||0)+1;return false;}smSeen.set(k,o);return true;});results.forEach(offer=>{const card=document.createElement('article');card.className='sm-fare-card sm-live-fare';const first=(offer.journeys||[]).flat()[0]||{};const carrier=document.createElement('strong');carrier.className='sm-live-carrier';carrier.textContent=(offer.carriers||[]).join(' · ')||first.carrier||'Operating airline shown in itinerary';card.append(carrier);if(offer.smMore){const more=document.createElement('p');more.className='sm-fare-meta sm-fare-more';more.textContent=`+${offer.smMore} other return time${offer.smMore>1?'s':''} at this price`;card.append(more);}(offer.journeys||[]).forEach((journey,index)=>{const line=document.createElement('p');line.className='sm-fare-meta';line.textContent=`${index===0?'Outbound':'Return'} · ${(journey||[]).length>0?`${journey.length-1} stop${journey.length===2?'':'s'} · `:''}`+(journey||[]).map(segment=>`${segment.origin} ${segment.departingAt?new Date(segment.departingAt).toLocaleString():''}${segment.originTimeZone?` (${segment.originTimeZone})`:''} → ${segment.destination} ${segment.arrivingAt?new Date(segment.arrivingAt).toLocaleString():''}${segment.destinationTimeZone?` (${segment.destinationTimeZone})`:''} · ${segment.carrier||''}`).join(' / ');card.append(line);});const extras=[];if(offer.taxAmount!==null&&offer.taxAmount!==undefined)extras.push(`Taxes included: ${fmt(offer.taxAmount,offer.taxCurrency||offer.currency)}`);if(offer.baggage&&offer.baggage.length)extras.push('Baggage: '+offer.baggage.map(b=>`${b.quantity} ${b.type}`).join(', '));if(extras.length){const detail=document.createElement('p');detail.className='sm-fare-meta';detail.textContent=extras.join(' · ');card.append(detail);}const foot=document.createElement('div');foot.className='sm-fare-bottom';const price=document.createElement('strong');price.className='sm-fare-price';price.textContent=fmt(offer.price,offer.currency);foot.append(price);const expiry=document.createElement('span');expiry.className='sm-live-expiry';expiry.textContent=offer.expiresAt?`Offer until ${new Date(offer.expiresAt).toLocaleTimeString()}`:'Live supplier offer';foot.append(expiry);card.append(foot);list.append(card);});section.querySelector('[data-direct-search-note]').textContent=SMTravel.strings.directBookingPending;const note=root.querySelector('[data-affiliate-note]');if(note)note.textContent='Prices are live search offers from Duffel. Direct checkout is not active yet; the partner search can be used to complete a booking.';section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'nearest'});};
  const directStayResults=(results)=>{const section=root.querySelector('[data-stays-results]'),list=section&&section.querySelector('[data-stays-result-list]');if(!section||!list)return;list.replaceChildren();const fmt=(amount,currency)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:currency||'USD',maximumFractionDigits:0}).format(Number(amount));}catch(_){return `${currency||''} ${amount}`;}};if(!results.length){const empty=document.createElement('p');empty.className='sm-empty-results';empty.textContent='No live stays matched this search. Try a nearby destination or different dates.';list.append(empty);}results.forEach(stay=>{const card=document.createElement('article');card.className='sm-stay-card';if(stay.photo){const photo=document.createElement('img');photo.src=stay.photo;photo.alt='';photo.loading='lazy';card.append(photo);}const body=document.createElement('div');body.className='sm-stay-card-body';const name=document.createElement('h4');name.textContent=stay.name||'Accommodation';body.append(name);const rating=document.createElement('p');rating.className='sm-fare-meta';rating.textContent=[stay.city,stay.rating?`${stay.rating} star rating`:'',stay.reviewScore?`Guest score ${stay.reviewScore}`:''].filter(Boolean).join(' · ');body.append(rating);const price=document.createElement('strong');price.className='sm-fare-price';price.textContent=stay.price!==null?`${fmt(stay.price,stay.currency)} total`:'Price unavailable';body.append(price);const terms=document.createElement('p');terms.className='sm-fare-meta';terms.textContent=[stay.paymentAt==='pay_at_property'?'Pay at property':stay.paymentAt==='pay_now'?'Payment required at booking':'Payment terms shown by supplier',stay.cancellation?`Cancellation deadline ${new Date(stay.cancellation).toLocaleDateString()}`:''].filter(Boolean).join(' · ');body.append(terms);card.append(body);list.append(card);});section.querySelector('[data-stays-search-note]').textContent=SMTravel.strings.directBookingPending;const note=root.querySelector('[data-affiliate-note]');if(note)note.textContent='Rates are live search results from Duffel. Direct checkout is not active yet; the partner search can be used to complete a booking.';section.hidden=false;section.scrollIntoView({behavior:'smooth',block:'nearest'});};
  const fareCalendar=async(form,payload)=>{
    const section=root.querySelector('[data-flight-results]');if(!section)return;
    let cal=section.querySelector('[data-fare-calendar]');
    if(!cal){cal=document.createElement('div');cal.className='sm-fare-cal';cal.dataset.fareCalendar='';section.querySelector('[data-flight-result-list]').before(cal);}
    cal.replaceChildren();cal.hidden=true;
    const month=String(payload.departure||'').slice(0,7);if(!/^\d{4}-\d{2}$/.test(month))return;
    try{
      const response=await travelFetch(`${SMTravel.root}fare-calendar`,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({origin:payload.origin,destination:payload.destination,month,currency:payload.currency})});
      const body=await response.json();const days=Array.isArray(body.days)?body.days:[];if(!response.ok||days.length<2)return;
      const low=Math.min(...days.map(d=>d.price));
      let money;try{money=new Intl.NumberFormat(undefined,{style:'currency',currency:body.currency||payload.currency,maximumFractionDigits:0,notation:'compact'});}catch(_){money={format:v=>String(Math.round(v))};}
      const dayFmt=new Intl.DateTimeFormat(undefined,{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
      const title=document.createElement('p');title.className='sm-fare-cal__title';title.id='sm-fare-cal-title';title.textContent='Cheapest one-way fare by departure day. Tap a day to search it.';
      const strip=document.createElement('div');strip.className='sm-fare-cal__strip';strip.setAttribute('role','group');strip.setAttribute('aria-labelledby','sm-fare-cal-title');
      days.forEach(day=>{
        const b=document.createElement('button');b.type='button';const on=day.date===payload.departure;b.className='sm-fare-cal__day'+(day.price===low?' is-low':'')+(on?' is-on':'');b.setAttribute('aria-pressed',String(on));
        const d=document.createElement('span');d.textContent=dayFmt.format(new Date(day.date+'T00:00:00Z'));const p=document.createElement('b');p.textContent=money.format(day.price);b.append(d,p);
        if(day.price===low){const tag=document.createElement('small');tag.textContent='Lowest';b.append(tag);}
        b.addEventListener('click',()=>{const dep=form.elements.departure,ret=form.elements.return;const gap=ret&&ret.value&&!ret.disabled?Math.round((new Date(ret.value)-new Date(dep.value))/864e5):0;dep.value=day.date;dep.dispatchEvent(new Event('change',{bubbles:true}));if(gap>0){const r=new Date(day.date+'T12:00:00Z');r.setUTCDate(r.getUTCDate()+gap);ret.value=r.toISOString().slice(0,10);}form.requestSubmit();});
        strip.append(b);
      });
      cal.append(title,strip);cal.hidden=false;
      const sel=strip.querySelector('.is-on');if(sel)strip.scrollLeft=sel.offsetLeft-strip.clientWidth/2+sel.clientWidth/2;
    }catch(_){/* The calendar is optional; fare results stay usable. */}
  };
  const pop=root.querySelector('[data-pop-routes]');
  if(pop){
    pop.querySelectorAll('[data-pop]').forEach(card=>card.addEventListener('click',()=>{
      const form=root.querySelector('#sm-flight-form');if(!form)return;
      const tab=root.querySelector('.sm-travel-tab[data-tab="flight"]');if(tab)tab.click();
      form.elements.origin_label.value=card.dataset.ol;form.elements.origin.value=card.dataset.o;form.elements.destination_label.value=card.dataset.dl;form.elements.destination.value=card.dataset.d;
      const cur=root.querySelector('.sm-currency select');if(cur&&[...cur.options].some(o=>o.value==='PKR'))cur.value='PKR';
      if(!form.elements.oneway.checked){const ow=form.querySelector('[data-trip="oneway"]');if(ow)ow.click();if(!form.elements.oneway.checked){form.elements.oneway.checked=true;form.elements.oneway.dispatchEvent(new Event('change',{bubbles:true}));}}
      const dep=form.elements.departure;
      if(card.dataset.date&&card.dataset.date>=dep.min){dep.value=card.dataset.date;dep.dispatchEvent(new Event('change',{bubbles:true}));}
      form.scrollIntoView({behavior:'smooth',block:'center'});form.requestSubmit();
    }));
    if(pop.querySelector('[data-pop]:not([data-date])'))travelFetch(`${SMTravel.root}popular-routes`,{headers:{Accept:'application/json'}}).then(r=>r.json()).then(rows=>{if(!Array.isArray(rows))return;rows.forEach(row=>{const card=pop.querySelector(`[data-pop][data-o="${row.origin}"][data-d="${row.destination}"]`);if(!card||!row.price||!row.date)return;card.dataset.date=row.date;card.querySelector('[data-pop-price]').textContent=row.label;});}).catch(()=>{});
  }
  root.querySelectorAll('.sm-travel-form').forEach(form=>form.addEventListener('submit',async e=>{
    e.preventDefault();const status=form.querySelector('.sm-form-status');const button=form.querySelector('.sm-submit');const data=new FormData(form);status.textContent='';
    if(form.dataset.kind==='flight'&&(!data.get('origin')||!data.get('destination'))){status.textContent=SMTravel.strings.flightError;return;}
    if(form.dataset.kind==='hotel'&&(!data.get('city_label')||data.get('city_label').trim().length<2)){status.textContent=SMTravel.strings.hotelError;return;}
    if(!data.get('departure')||(data.get('return')&&data.get('return')<=data.get('departure'))){status.textContent=SMTravel.strings.dateError;return;}
    if(data.getAll('ages[]').some(value=>value==='')){status.textContent='Choose the age for each child or infant.';return;}
    const payload=payloadFor(form,data);button.disabled=true;button.dataset.label=button.innerHTML;button.textContent=SMTravel.strings.searching;const headers={'Content-Type':'application/json','Accept':'application/json','X-WP-Nonce':SMTravel.nonce};
    try{
      if(form.dataset.kind==='flight'&&SMTravel.duffel&&SMTravel.duffel.flightsEnabled){const section=root.querySelector('[data-flight-results]');if(section)section.hidden=true;let body=null;try{const response=await travelFetch(`${SMTravel.root}duffel/flights`,{method:'POST',headers,body:JSON.stringify(payload)});body=await response.json();if(!response.ok)body=null;}catch(_){body=null;}if(body){directFlightResults(body.results||[]);const fallback=root.querySelector('[data-partner-fallback="flight"]');if(fallback)fallback.hidden=!['economy','business'].includes(payload.cabin);button.disabled=false;button.innerHTML=button.dataset.label;return;}}
      if(form.dataset.kind==='hotel'&&SMTravel.duffel&&SMTravel.duffel.staysEnabled){const section=root.querySelector('[data-stays-results]');if(section)section.hidden=true;let body=null;try{const response=await travelFetch(`${SMTravel.root}duffel/stays`,{method:'POST',headers,body:JSON.stringify(payload)});body=await response.json();if(!response.ok)body=null;}catch(_){body=null;}if(body){directStayResults(body.results||[]);const fallback=root.querySelector('[data-partner-fallback="hotel"]');if(fallback)fallback.hidden=payload.ages.length>0||payload.rooms!==1;button.disabled=false;button.innerHTML=button.dataset.label;return;}}
      
      
      await partnerSearch(form.dataset.kind,payload);
    }catch(error){status.textContent=error.message||SMTravel.strings.noOptions;button.disabled=false;button.innerHTML=button.dataset.label;}
  }));
  root.querySelectorAll('[data-partner-fallback]').forEach(button=>button.addEventListener('click',async()=>{const kind=button.dataset.partnerFallback;const form=root.querySelector(`#sm-${kind}-form`);if(!form)return;button.disabled=true;try{await partnerSearch(kind,payloadFor(form,new FormData(form)));}catch(error){button.disabled=false;form.querySelector('.sm-form-status').textContent=error.message||SMTravel.strings.noOptions;}}));
  const oneWay=root.querySelector('#sm-flight-form [name="oneway"]'); if(oneWay)oneWay.addEventListener('change',()=>{const ret=root.querySelector('#sm-flight-form [name="return"]');ret.disabled=oneWay.checked;ret.closest('.sm-field').style.opacity=oneWay.checked?'.48':'1';});
  root.querySelectorAll('[data-open-tab]').forEach(link=>link.addEventListener('click',()=>{
    const tab=root.querySelector(`.sm-travel-tab[data-tab="${link.dataset.openTab}"]`); if(tab)tab.click();
    requestAnimationFrame(()=>{const form=root.querySelector(link.getAttribute('href'));if(form)form.scrollIntoView({behavior:'smooth',block:'center'});});
  }));

  const planner=root.querySelector('.sm-itinerary');
  if(planner){
    const storageKey='sm-global-travel-itinerary-v1';
    const titleInput=planner.querySelector('[data-plan-title]');
    const daysInput=planner.querySelector('[data-plan-days]');
    const daysWrap=planner.querySelector('[data-itinerary-days]');
    let plan={title:'',days:3,items:[]};
    try{const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved==='object')plan={...plan,...saved};}catch(_){/* Storage can be disabled by browser policy. */}
    const save=()=>{plan.title=titleInput.value;plan.days=Number(daysInput.value);plan.items=[...daysWrap.querySelectorAll('.sm-day-card')].map(card=>({slots:[...card.querySelectorAll('[data-slot]')].map(input=>input.value),notes:card.querySelector('[data-notes]').value}));try{localStorage.setItem(storageKey,JSON.stringify(plan));}catch(_){planner.querySelector('[data-plan-saved]').textContent='Browser storage is unavailable. Print your plan to keep a copy.';}};
    const renderDays=()=>{
      const old=[...daysWrap.querySelectorAll('.sm-day-card')].map(card=>({slots:[...card.querySelectorAll('[data-slot]')].map(input=>input.value),notes:card.querySelector('[data-notes]').value}));
      const count=Math.min(14,Math.max(1,Number(daysInput.value)||3)); daysInput.value=String(count); daysWrap.replaceChildren();
      for(let i=0;i<count;i++){
        const card=document.createElement('article');card.className='sm-day-card';
        const header=document.createElement('div');header.className='sm-day-heading';
        const heading=document.createElement('h3');heading.textContent=`Day ${i+1}`;header.append(heading);
        const hint=document.createElement('span');hint.textContent='Add your own plans';header.append(hint);card.append(header);
        const slots=document.createElement('div');slots.className='sm-day-slots';
        [['Morning','A place to visit, meal, or idea'],['Afternoon','What would you like to do?'],['Evening','Dinner, a show, or free time']].forEach(([label,placeholder],slotIndex)=>{
          const field=document.createElement('label');field.className='sm-plan-slot';const caption=document.createElement('span');caption.textContent=label;
          const input=document.createElement('input');input.type='text';input.maxLength=180;input.placeholder=placeholder;input.dataset.slot='';input.value=(old[i]&&old[i].slots[slotIndex])||(plan.items[i]&&plan.items[i].slots&&plan.items[i].slots[slotIndex])||'';field.append(caption,input);slots.append(field);
        });card.append(slots);
        const noteField=document.createElement('label');noteField.className='sm-plan-notes';const noteLabel=document.createElement('span');noteLabel.textContent='Notes for the day';const notes=document.createElement('textarea');notes.rows=2;notes.maxLength=500;notes.placeholder='Reservations, addresses, reminders, or budget notes';notes.dataset.notes='';notes.value=(old[i]&&old[i].notes)||(plan.items[i]&&plan.items[i].notes)||'';noteField.append(noteLabel,notes);card.append(noteField);daysWrap.append(card);
      }
      save();
    };
    titleInput.value=typeof plan.title==='string'?plan.title:'';daysInput.value=String(Math.min(14,Math.max(1,Number(plan.days)||3)));renderDays();
    titleInput.addEventListener('input',save);daysWrap.addEventListener('input',save);daysInput.addEventListener('change',renderDays);
    planner.querySelector('[data-print-plan]').addEventListener('click',()=>window.print());
    planner.querySelector('[data-clear-plan]').addEventListener('click',()=>{titleInput.value='';daysInput.value='3';plan={title:'',days:3,items:[]};try{localStorage.removeItem(storageKey);}catch(_){}renderDays();});
  }
})();
