/* Progressive enhancement: products and links remain crawlable without JavaScript. */
(function(){
  'use strict';
  var root=document.querySelector('[data-smx-market]');if(!root)return;
  var grid=root.querySelector('.smx-products'),cards=Array.from(root.querySelectorAll('[data-sx-category]'));
  if(!grid||!cards.length)return;
  var search=root.querySelector('[data-product-search]'),sort=root.querySelector('[data-sort]'),count=root.querySelector('[data-count]');
  var more=root.querySelector('[data-show-more]'),empty=root.querySelector('[data-empty]'),limit=8,period='today';
  var min=root.querySelector('[data-min-price]'),max=root.querySelector('[data-max-price]');
  var locale=root.getAttribute('data-smx-lang')||'en',market=root.getAttribute('data-smx-market');
  var zone={pakistan:'Asia/Karachi',germany:'Europe/Berlin',uk:'Europe/London',usa:'America/New_York',serbia:'Europe/Belgrade','saudi-arabia':'Asia/Riyadh',hub:'UTC'}[market];
  var date=new Date(),day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
  var seed=Array.from(day+market).reduce(function(a,c){return (a*31+c.charCodeAt(0))>>>0},0);
  cards.forEach(function(c,i){c.dataset.original=i;});
  root.querySelectorAll('[data-catalog-controls]').forEach(function(e){e.hidden=false;});
  root.querySelector('[data-edit-date]').textContent=new Intl.DateTimeFormat(locale,{timeZone:zone,day:'numeric',month:'long'}).format(date);
  function update(){
    var term=search.value.trim().toLocaleLowerCase(),cats=Array.from(root.querySelectorAll('[data-category-filter]:checked')).map(function(e){return e.value;});
    var lo=min&&min.value!==''?Number(min.value):0,hi=max&&max.value!==''?Number(max.value):Infinity;
    var matching=cards.filter(function(c){var price=Number(c.dataset.sxPrice);return (!cats.length||cats.includes(c.dataset.sxCategory))&&c.textContent.toLocaleLowerCase().includes(term)&&price>=lo&&price<=hi;});
    var offset=period==='weekend'?7:period==='week'?13:0;
    matching.sort(function(a,b){if(sort.value==='az')return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent,locale);if(sort.value==='low')return Number(a.dataset.sxPrice)-Number(b.dataset.sxPrice);if(sort.value==='high')return Number(b.dataset.sxPrice)-Number(a.dataset.sxPrice);return ((Number(a.dataset.original)+seed+offset)%cards.length)-((Number(b.dataset.original)+seed+offset)%cards.length);});
    cards.forEach(function(c){c.hidden=true;});
    matching.forEach(function(c,i){grid.appendChild(c);c.hidden=i>=limit;});
    count.textContent=count.dataset.template.replace('{n}',new Intl.NumberFormat(locale).format(matching.length));
    empty.hidden=matching.length!==0;more.hidden=matching.length<=limit;
  }
  [search,sort,min,max].filter(Boolean).forEach(function(e){e.addEventListener(e===sort?'change':'input',function(){limit=8;update();});});
  root.querySelectorAll('[data-category-filter]').forEach(function(e){e.addEventListener('change',function(){limit=8;update();});});
  root.querySelector('[data-clear]').addEventListener('click',function(){search.value='';sort.value='featured';if(min)min.value='';if(max)max.value='';root.querySelectorAll('[data-category-filter]').forEach(function(e){e.checked=false;});limit=8;update();});
  more.addEventListener('click',function(){limit+=8;update();});
  root.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){grid.classList.toggle('smx-products--list',b.dataset.view==='list');root.querySelectorAll('[data-view]').forEach(function(v){v.setAttribute('aria-pressed',String(v===b));});});});
  root.querySelectorAll('[data-period]').forEach(function(b){b.addEventListener('click',function(){period=b.dataset.period;limit=8;root.querySelectorAll('[data-period]').forEach(function(v){v.setAttribute('aria-pressed',String(v===b));});update();});});
  update();
})();
