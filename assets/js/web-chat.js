/* Sasta Milaga website assistant v2: English only; safe chat, product, travel and support paths. */
(function () {
  'use strict';
  var root=document.querySelector('[data-smwa-webchat]'),cfg=window.SMWA_WEBCHAT;
  if(!root||!cfg||typeof window.fetch!=='function')return;
  var launcher=root.querySelector('.smwa-web__launcher'),panel=root.querySelector('.smwa-web__panel');
  var close=root.querySelector('.smwa-web__close'),log=root.querySelector('.smwa-web__messages');
  var form=root.querySelector('.smwa-web__composer'),input=form&&form.querySelector('[name="message"]');
  var slot=root.querySelector('.smwa-web__form-slot'),sendButton=form&&form.querySelector('[type="submit"]');
  if(!launcher||!panel||!close||!log||!form||!input||!slot)return;
  var STORAGE='smwa.website.chat.v1',session=null,lastId=0,poller=null,busy=false,opening=false;
  var BASE='https://sastamilaga.com',WA='https://wa.me/966510451995';
  root.lang='en';root.dir='ltr';
  var languages=root.querySelector('.smwa-web__language');if(languages)languages.remove();
  launcher.setAttribute('aria-label','Chat with Sasta Milaga');
  var words=['Find products','Plan travel','My orders','Talk to support'];
  root.querySelectorAll('[data-smwa-action]').forEach(function(b,i){if(words[i])b.textContent=words[i]});
  input.placeholder='Ask about products, travel or orders…';
  var privacy=root.querySelector('.smwa-web__privacy');
  if(privacy)privacy.textContent='Chat messages may be stored for up to '+String(cfg.retentionDays||90)+' days when connected to our team. Do not send payment-card or passport details.';
  function safeUrl(x){
    try{var u=new URL(x,location.origin);return (u.protocol==='https:'||u.protocol==='http:')&&u.origin===location.origin?u.href:''}catch(e){return ''}
  }
  function bubble(message,visitor){
    var el=document.createElement('div');
    el.className='smwa-web__bubble smwa-web__bubble--'+(visitor?'visitor':'assistant');
    el.textContent=String(message||'');
    log.appendChild(el);log.scrollTop=log.scrollHeight;
    return el;
  }
  function actionLink(label,url,external){
    var a=document.createElement('a');a.textContent=label;a.href=url;
    a.className='smwa-web__help-link';
    if(external){a.target='_blank';a.rel='noopener noreferrer'}
    log.appendChild(a);log.scrollTop=log.scrollHeight;return a;
  }
  function whatsapp(text){
    return WA+'?text='+encodeURIComponent(String(text||'Hello Sasta Milaga support.').slice(0,1100));
  }
  function supportFallback(context){
    bubble('Our live-agent connection is currently unavailable. Your message was not delivered through chat. You can contact our support team directly:',false);
    actionLink('Continue with WhatsApp',whatsapp(context),'external');
    actionLink('Visit contact and support','/contact/');
  }
  function request(url,options){
    options=options||{};
    var controller=new AbortController(),timeout=setTimeout(function(){controller.abort()},9000);
    var headers=Object.assign({'Accept':'application/json','Content-Type':'application/json'},options.headers||{});
    return fetch(url,Object.assign({credentials:'same-origin',cache:'no-store'},options,{headers:headers,signal:controller.signal}))
      .then(function(r){return r.text().then(function(t){
        var j;try{j=JSON.parse(t)}catch(e){throw Error('Invalid response from the chat service')}
        if(!r.ok)throw Error(String(j.message||'Chat service unavailable'));
        return j;
      })}).finally(function(){clearTimeout(timeout)});
  }
  function store(){try{if(session)localStorage.setItem(STORAGE,JSON.stringify(session))}catch(e){}}
  function clearSession(){session=null;lastId=0;try{localStorage.removeItem(STORAGE)}catch(e){}}
  function headers(){return {'X-SMWA-Session-Id':session.id,'X-SMWA-Session':session.token}}
  function ensureSession(){
    if(session)return Promise.resolve(session);
    try{var s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s&&/^[a-f0-9-]{36}$/i.test(s.id)&&/^[a-f0-9]{64}$/i.test(s.token))session=s}catch(e){}
    if(session)return Promise.resolve(session);
    return request(cfg.api+'web-session',{method:'POST',body:'{}'}).then(function(x){
      if(!/^[a-f0-9-]{36}$/i.test(x.session_id||'')||!/^[a-f0-9]{64}$/i.test(x.session_token||''))throw Error('Chat session missing');
      session={id:x.session_id,token:x.session_token};store();return session;
    });
  }
  function poll(){
    if(!session||panel.hidden)return Promise.resolve();
    return request(cfg.api+'web-messages?after='+lastId,{method:'GET',headers:headers()}).then(function(j){
      (j.messages||[]).forEach(function(m){if(Number(m.id)>lastId){bubble(m.body,m.direction==='in');lastId=Number(m.id)}});
    }).catch(function(e){if(/session|refresh|403/i.test(e.message||''))clearSession()});
  }
  function beginPoll(){if(!poller)poller=setInterval(poll,12000)}
  function openChat(){
    panel.hidden=false;launcher.hidden=true;launcher.setAttribute('aria-expanded','true');
    if(!log.childElementCount){
      bubble('Welcome to Sasta Milaga. Find products, request travel assistance, check your orders or contact our team.',false);
    }
    input.focus();
    if(opening||session){if(session)beginPoll();return}
    opening=true;
    ensureSession().then(function(){beginPoll();return poll()}).catch(function(){
      bubble('Live team messaging is unavailable right now. Product search and travel enquiry options remain accessible.',false);
    }).finally(function(){opening=false});
  }
  function closeChat(){
    panel.hidden=true;launcher.hidden=false;launcher.setAttribute('aria-expanded','false');
    if(poller){clearInterval(poller);poller=null}
    launcher.focus();
  }
  launcher.addEventListener('click',openChat);close.addEventListener('click',closeChat);
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!panel.hidden)closeChat()});
  function slug(v){return String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,130).replace(/-+$/g,'')||'product'}
  function cards(products){
    if(!products||!products.length)return;
    var wrap=document.createElement('div');wrap.className='smwa-web__products';
    products.slice(0,5).forEach(function(p){
      var url=safeUrl(p.url);if(!url)return;
      var card=document.createElement('article');card.className='smwa-web__product';
      if(p.image&&/^https:\/\//i.test(String(p.image))){
        var img=document.createElement('img');img.src=String(p.image);img.loading='lazy';img.alt=String(p.name||'Product');img.width=60;img.height=60;card.appendChild(img);
      }
      var body=document.createElement('div'),title=document.createElement('a'),description=document.createElement('small');
      title.href=url;title.textContent=String(p.name||'View product');
      description.textContent=String(p.note||'View product details and confirm availability');
      body.append(title,description);
      var go=document.createElement('a');go.href=url;go.className='smwa-web__product-action';go.textContent='View';
      card.append(body,go);wrap.appendChild(card);
    });
    if(wrap.childElementCount){log.appendChild(wrap);log.scrollTop=log.scrollHeight}
  }
  function productSearch(query){
    var q=String(query||'').replace(/^(find|show|search|buy|need|looking for)\s+/i,'').trim().slice(0,110);
    if(!q){bubble('What product would you like to find? Enter the item name, brand or category.',false);input.focus();return Promise.resolve()}
    bubble('Searching for "'+q+'". Exact variants, price, stock and shipping must be confirmed on the product page.',false);
    var links='/search/?q='+encodeURIComponent(q);
    actionLink('Search local products',links);
    actionLink('Browse global categories','/c/global/index.html');
    var S=window.SMCJSearch;
    if(!S||typeof S.products!=='function')return Promise.resolve();
    var terms=(typeof S.words==='function'?S.words(q):q.toLowerCase().split(/\W+/)).filter(function(w){return w.length>2}).slice(0,5);
    if(!terms.length)return Promise.resolve();
    return Promise.resolve(S.products(terms,3,3)).then(function(hits){
      var items=(hits||[]).filter(function(h){
        return h&&h.r&&/^(?:\d{19}|[a-f0-9-]{36})$/i.test(String(h.r[0]||''))
      }).slice(0,3).map(function(h){
        return {name:String(h.r[2]||'Supplier product'),url:'/global-shop/p/'+String(h.r[0]).toUpperCase()+'/'+slug(h.r[2])+'/',image:h.r[5],note:'Global product — confirm delivery and final price'}
      });
      if(items.length){bubble('Related global products:',false);cards(items)}
    }).catch(function(){ /* Search links remain available even if supplier lookup fails. */ });
  }
  function submitSupport(message){
    return ensureSession().then(function(){
      return request(cfg.api+'web-message',{method:'POST',headers:headers(),body:JSON.stringify({
        message:message,language:'en',request_id:window.crypto&&crypto.randomUUID?crypto.randomUUID():('sm-'+Date.now()+'-'+Math.floor(Math.random()*1e8))
      })});
    }).then(function(j){
      if(j.message||j.reply)bubble(j.message||j.reply,false);
      return poll();
    }).catch(function(){supportFallback(message)});
  }
  function send(text){
    text=String(text||'').trim().slice(0,600);if(!text||busy)return Promise.resolve();
    busy=true;sendButton.disabled=true;bubble(text,true);
    var lower=text.toLowerCase(),task;
    if(/\b(flight|hotel|stay|travel|tour|visa|umrah|trip|airport|ticket)\b/.test(lower)){
      showTravelForm(text);task=Promise.resolve();
    }else if(/\b(order|tracking|refund|return|payment)\b/.test(lower)){
      bubble('For order status, use your secure account. If you need a person, contact support with the order reference only. Never send payment-card details.',false);
      actionLink('Open my orders','/my-account/');
      actionLink('Ask support on WhatsApp',whatsapp('Order support request: '+text),'external');
      task=Promise.resolve();
    }else if(/\b(support|agent|human|complaint|help me|contact)\b/.test(lower)){
      task=submitSupport(text);
    }else{
      task=productSearch(text);
    }
    return task.finally(function(){busy=false;sendButton.disabled=false});
  }
  form.addEventListener('submit',function(e){
    e.preventDefault();if(form.elements.website&&form.elements.website.value)return;
    var text=input.value.trim();if(!text||busy)return;
    input.value='';send(text);
  });
  root.querySelectorAll('[data-smwa-action]').forEach(function(btn){
    btn.addEventListener('click',function(){
      switch(btn.getAttribute('data-smwa-action')){
        case 'travel':showTravelForm('');break;
        case 'shop':bubble('Tell me which product or category you are looking for.',false);input.focus();break;
        case 'orders':bubble('Use your account to see existing orders or contact support with an order reference.',false);actionLink('My orders','/my-account/');actionLink('Order support on WhatsApp',whatsapp('Hello, I need help with an order.'),'external');break;
        case 'support':bubble('Describe what you need, or contact our team directly on WhatsApp.',false);actionLink('Talk to support on WhatsApp',whatsapp('Hello, I need help from Sasta Milaga.'),'external');input.focus();break;
      }
    });
  });
  function showTravelForm(prefill){
    slot.replaceChildren();
    bubble('Send a travel enquiry. Availability, fares, visa requirements and bookings are confirmed separately by our team.',false);
    var card=document.createElement('form');card.className='smwa-web__travel';card.setAttribute('aria-label','Travel enquiry');
    function field(label,key,type,required){
      var l=document.createElement('label');l.textContent=label;
      var el=type==='select'?document.createElement('select'):type==='textarea'?document.createElement('textarea'):document.createElement('input');
      el.name=key;if(type!=='select'&&type!=='textarea')el.type=type;
      el.required=!!required;l.appendChild(el);card.appendChild(l);return el;
    }
    var service=field('Travel service','service','select',true);
    [['flights','Flights'],['stays','Hotels and accommodation'],['umrah','Umrah'],['visa','Visa enquiry'],['tours','Tours and packages'],['other','Other travel']].forEach(function(p){
      var o=document.createElement('option');o.value=p[0];o.textContent=p[1];service.appendChild(o);
    });
    var name=field('Your name','name','text',true);name.maxLength=120;
    var email=field('Email address','email','email',true);email.maxLength=190;
    var details=field('Destination, travel dates, travellers and preferences','details','textarea',true);
    details.maxLength=2500;details.rows=3;if(prefill)details.value=prefill;
    var note=document.createElement('small');note.textContent='Do not include payment-card or passport information.';card.appendChild(note);
    var btn=document.createElement('button');btn.type='submit';btn.textContent='Send travel request';card.appendChild(btn);
    var status=document.createElement('p');status.className='smwa-web__travel-status';status.setAttribute('role','status');card.appendChild(status);
    card.addEventListener('submit',function(e){
      e.preventDefault();if(!card.reportValidity())return;btn.disabled=true;status.textContent='Submitting your enquiry…';
      var summary='Sasta Milaga travel enquiry\nService: '+service.options[service.selectedIndex].text+
        '\nName: '+name.value+'\nEmail: '+email.value+'\nDetails: '+details.value;
      function alternative(){
        status.textContent='The website could not confirm receipt. Nothing has been submitted through the chat service. Send your enquiry directly using WhatsApp:';
        var link=document.createElement('a');link.className='smwa-web__help-link';link.href=whatsapp(summary);link.textContent='Open WhatsApp with travel details';
        link.target='_blank';link.rel='noopener noreferrer';status.appendChild(link);
      }
      if(!cfg.travelApi){alternative();btn.disabled=false;return}
      ensureSession().then(function(){
        return request(cfg.api+'web-travel-nonce',{method:'GET',headers:headers()});
      }).then(function(n){
        if(!n.nonce)throw Error('No travel authorization');
        return request(cfg.travelApi,{method:'POST',headers:{'X-WP-Nonce':n.nonce},body:JSON.stringify({
          service:service.options[service.selectedIndex].text,name:name.value,email:email.value,details:details.value
        })});
      }).then(function(j){
        status.textContent=String(j.message||'Travel request received. The team will confirm availability and pricing.');card.reset();
      }).catch(alternative).finally(function(){btn.disabled=false});
    });
    slot.appendChild(card);service.focus();
  }
})();