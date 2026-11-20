/* Sasta Milaga country showcase. Static, evidence-backed merchandising.
 * Headers and footers belong exclusively to shared chrome.js; no cart replacement.
 * Never manufacture discounts, review counts, delivery windows, local events or cross-border availability.
 */
import fs from 'node:fs';
import {toCyrillic} from './landing-i18n.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {storefrontText,catalogControls,filterControls,dailyControls} from './landing-storefront.mjs';
import {promoSections,sectionText} from './landing-sections.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataset=JSON.parse(fs.readFileSync(path.join(root,'data/landing/showcase.json'),'utf8'));
const ORIGIN='https://sastamilaga.com';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const i18n={
 en:{browse:'Explore products',categories:'Explore popular categories',products:'Featured collection',selected:'Selected from our catalog',travel:'Travel & destinations',tv:'Live TV',travelNote:'Explore travel planning guides and compare options before you book.',tvNote:'Explore channels and viewing options on Sasta Milaga.',visit:'Explore',details:'View details',deals:'Offers & collections',today:'Today',weekend:'Weekend',week:'This week',current:'Explore current collections — prices and availability are confirmed on item pages.',events:'Events & travel inspiration',eventNote:'Explore destination guides. Event dates and promotional packages appear only after verification.',shop:'Browse collection',notice:'Prices, availability and shipping eligibility are confirmed before purchase. Global supplier items are not automatically available in every country.',filters:'Shop by category',all:'All categories',next:'Browse products',global:'Global supplier collection',verified:'Supplier product preview',local:'Local Pakistan products',localInfo:'Local products can only be ordered for delivery in Pakistan. Prices below are in PKR.',more:'Explore more products',country:'Country collection',hub:'Choose your destination',hubNote:'Explore countries and verified shopping information before placing an order.',view:'Open country page'},
 de:{browse:'Produkte entdecken',categories:'Beliebte Kategorien entdecken',products:'Ausgewählte Kollektion',selected:'Aus unserem Katalog',travel:'Reisen & Reiseziele',tv:'Live-TV',travelNote:'Reiseinformationen und Optionen vor der Buchung vergleichen.',tvNote:'Sender und Streamingangebote entdecken.',visit:'Entdecken',details:'Details ansehen',deals:'Angebote & Kollektionen',today:'Heute',weekend:'Wochenende',week:'Diese Woche',current:'Aktuelle Kollektionen entdecken. Preis und Verfügbarkeit sind auf der Produktseite zu prüfen.',events:'Veranstaltungen & Reiseideen',eventNote:'Reiseziele entdecken. Veranstaltungen werden erst nach Prüfung veröffentlicht.',shop:'Kollektion ansehen',notice:'Preise, Verfügbarkeit und Lieferfähigkeit werden vor dem Kauf bestätigt.',filters:'Nach Kategorie',all:'Alle Kategorien',next:'Produkte entdecken',global:'Globaler Lieferantenkatalog',verified:'Produktvorschau',local:'Lokale Produkte in Pakistan',localInfo:'Lokale Produkte sind nur für Pakistan bestimmt. Preise in PKR.',more:'Weitere Produkte',country:'Länderkollektion',hub:'Lieferland wählen',hubNote:'Wählen Sie ein Land und prüfen Sie die Bedingungen.',view:'Land ansehen'},
 sr:{browse:'Istražite proizvode',categories:'Popularne kategorije',products:'Odabrani proizvodi',selected:'Iz našeg kataloga',travel:'Putovanja i destinacije',tv:'TV uživo',travelNote:'Istražite vodiče i uporedite opcije pre rezervacije.',tvNote:'Istražite kanale i mogućnosti gledanja.',visit:'Istražite',details:'Detalji',deals:'Ponude i kolekcije',today:'Danas',weekend:'Vikend',week:'Ove nedelje',current:'Pregledajte kolekcije. Cene i dostupnost se proveravaju na stranicama proizvoda.',events:'Događaji i putovanja',eventNote:'Pronađite vodiče. Događaji i ponude se objavljuju tek nakon provere.',shop:'Pogledajte kolekciju',notice:'Cena, dostupnost i isporuka potvrđuju se pre kupovine.',filters:'Po kategoriji',all:'Sve kategorije',next:'Pogledajte proizvode',global:'Globalni katalog dobavljača',verified:'Pregled proizvoda',local:'Lokalni proizvodi u Pakistanu',localInfo:'Lokalni proizvodi dostupni su za dostavu samo u Pakistanu.',more:'Više proizvoda',country:'Ponuda po zemlji',hub:'Izaberite destinaciju',hubNote:'Pogledajte zemlje i uslove poručivanja.',view:'Stranica zemlje'},
 ar:{browse:'استكشف المنتجات',categories:'تصفح الفئات الشائعة',products:'مجموعة منتجات مختارة',selected:'اختيارات من الكتالوج',travel:'السفر والوجهات',tv:'التلفزيون المباشر',travelNote:'استكشف أدلة السفر وقارن الخيارات قبل الحجز',tvNote:'تصفح القنوات وخيارات المشاهدة',visit:'استكشف',details:'عرض التفاصيل',deals:'العروض والمجموعات',today:'اليوم',weekend:'نهاية الأسبوع',week:'هذا الأسبوع',current:'تصفح المجموعات الحالية وتأكد من السعر والتوفر في صفحة المنتج',events:'الفعاليات وإلهام السفر',eventNote:'استكشف أدلة الوجهات ولا تُعرض الفعاليات إلا بعد التحقق منها',shop:'تصفح المجموعة',notice:'يتم تأكيد الأسعار والتوفر وإمكانية الشحن قبل الشراء ولا تتوفر جميع منتجات الموردين لكل بلد',filters:'حسب الفئة',all:'جميع الفئات',next:'تصفح المنتجات',global:'كتالوج الموردين العالمي',verified:'معاينة المنتج',local:'منتجات باكستان المحلية',localInfo:'المنتجات المحلية متاحة للتوصيل داخل باكستان فقط',more:'المزيد من المنتجات',country:'مجموعة الدولة',hub:'اختر وجهتك',hubNote:'استكشف الدول وشروط الشراء قبل تقديم الطلب',view:'عرض صفحة الدولة'},
 ur:{browse:'مصنوعات دیکھیں',categories:'مشہور اقسام',products:'منتخب مصنوعات',selected:'ہمارے کیٹلاگ سے',travel:'سفر اور مقامات',tv:'لائیو ٹی وی',travelNote:'بکنگ سے پہلے سفر کی معلومات اور اختیارات دیکھیں',tvNote:'چینلز اور دیکھنے کے اختیارات دیکھیں',visit:'دیکھیں',details:'تفصیلات دیکھیں',deals:'پیشکشیں اور مجموعے',today:'آج',weekend:'ہفتہ وار',week:'اس ہفتے',current:'موجودہ مجموعے دیکھیں، قیمت اور دستیابی پروڈکٹ صفحے پر چیک کریں',events:'تقریبات اور سفری رہنمائی',eventNote:'منزلوں کے رہنما دیکھیں، تصدیق شدہ تقریبات ہی دکھائی جائیں گی',shop:'مجموعہ دیکھیں',notice:'قیمت، دستیابی اور ترسیل خریداری سے پہلے تصدیق کی جاتی ہے',filters:'قسم کے مطابق',all:'تمام اقسام',next:'مصنوعات دیکھیں',global:'عالمی سپلائر کلیکشن',verified:'مصنوعات کا جائزہ',local:'پاکستان میں مقامی مصنوعات',localInfo:'مقامی مصنوعات کی ترسیل صرف پاکستان میں ہے، قیمتیں پاکستانی روپے میں ہیں',more:'مزید مصنوعات',country:'ملکی کلیکشن',hub:'اپنی منزل منتخب کریں',hubNote:'خریداری سے پہلے ملک اور ترسیل کی شرائط دیکھیں',view:'ملک کا صفحہ'}
};
const flags={pakistan:'🇵🇰',germany:'🇩🇪',uk:'🇬🇧',usa:'🇺🇸',serbia:'🇷🇸','saudi-arabia':'🇸🇦',hub:'🌍'};
const countries=[['pakistan','Pakistan','/pakistan/'],['germany','Germany','/shipping-to/germany/'],['uk','United Kingdom','/shipping-to/uk/'],['usa','United States','/shipping-to/usa/'],['serbia','Serbia','/shipping-to/serbia/'],['saudi-arabia','Saudi Arabia','/shipping-to/saudi-arabia/']];
const categoriesLocal=[['Fashion & Apparel','/c/fashion-and-apparel.html','👗'],['Health & Beauty','/c/health-and-beauty.html','✨'],['Electronics','/c/electronics-and-appliances.html','💻'],['Home & Living','/c/home-and-living.html','🛋️'],['Automotive','/c/automotive.html','🚗']];
const num=n=>Number(n).toLocaleString('en-PK',{maximumFractionDigits:0});
function header(title,text,href,label){return '<div class="smx-title"><div><span class="smx-eyebrow">Sasta Milaga · Discover</span><h2>'+escape(title)+'</h2><p>'+escape(text)+'</p></div><a href="'+escape(href)+'" class="smx-link">'+escape(label)+' <span aria-hidden="true">↗</span></a></div>';}
function photo(src,name){return '<img src="'+escape(src)+'" alt="'+escape(name)+'" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.src=\'/assets/brand/no-image.svg\'">';}
function productCard(p,t,isLocal){
 let price=isLocal&&p.price>0?'<span class="smx-price">Rs '+num(p.price)+'</span>':'<span class="smx-quote">'+escape(t.verified)+'</span>';
 let link=escape(p.url);
 return '<article class="smx-product" data-sx-category="'+escape(p.category)+'" data-sx-price="'+(isLocal?p.price:0)+'"><a class="smx-product-image" href="'+link+'" aria-label="'+escape(p.name)+'">'+photo(p.image,p.name)+'</a><div class="smx-prod-body"><span class="smx-prod-category">'+escape(p.category)+'</span><h3><a href="'+link+'">'+escape(p.name)+'</a></h3><div class="smx-prod-bottom">'+price+'<a href="'+link+'" class="smx-prod-btn">'+escape(t.details)+' <span aria-hidden="true">↗</span></a></div></div></article>';
}
export function buildShowcase({rel,lang,dir}){
 const code=lang.split('-')[0], t=i18n[code]||i18n.en, cyr=lang.startsWith('sr-Cyrl');
 // Serbian Cyrillic is a script, not a new translation; use deterministic transliteration after compiling.
 const market=rel==='shipping-to'?'hub':rel.includes('serbia')?'serbia':rel.includes('germany')?'germany':rel.includes('saudi-arabia')?'saudi-arabia':rel.includes('/uk')?'uk':rel.includes('/usa')?'usa':'pakistan';
 const local=market==='pakistan',hub=market==='hub', flag=flags[market];
 const merchandise=local?dataset.local:dataset.global;
 const ui=storefrontText(lang);
 const intro=local?t.localInfo:t.notice;
 let markup='<div class="smxc" data-smx-market="'+escape(market)+'" data-smx-lang="'+escape(lang)+'" dir="'+dir+'">';
 markup+='<div class="smx-trust" aria-label="Store guidance"><span>'+flag+' '+escape(market==='hub'?t.hub:t.country)+'</span><span>✓ '+escape(intro)+'</span><a href="/safe-shopping/">'+escape(t.details)+' ↗</a></div>';
 if(hub){
  markup+='<section class="smx-section smx-countries">'+header(t.hub,t.hubNote,'/shipping-to/',t.view)+'<div class="smx-country-grid">'+countries.map(([slug,name,url])=>'<a class="smx-country" href="'+url+'"><span class="smx-flag">'+flags[slug]+'</span><strong>'+escape(name)+'</strong><small>'+escape(t.view)+' ↗</small></a>').join('')+'</div></section>';
 }
 const sections=sectionText(lang);
 let categoryMarkup='<section class="smx-section smx-categories">'+header(sections.category,t.selected,local?'/shop/':'/c/global/index.html',t.all)+'<div class="smx-category-grid">';
 categoryMarkup+=dataset.categoryStrip.map((c,i)=>'<a class="smx-category-card" href="'+(local?c.localUrl:c.globalUrl)+'">'+(c.image?photo(c.image,sections.categories[i]):'<svg class="smx-category-book" viewBox="0 0 80 60" aria-hidden="true"><path d="M40 12Q22 2 5 9v43q18-7 35 2 17-9 35-2V9q-17-7-35 3Z" fill="#fff8e4" stroke="#7b5b30" stroke-width="3"/><path d="M40 12v42M12 18l21 4m-21 6 21 4m-21 6 21 4m14-20 21-4m-21 14 21-4m-21 14 21-4" fill="none" stroke="#bca675" stroke-width="2"/></svg>')+'<strong>'+escape(sections.categories[i])+'</strong></a>').join('');
 categoryMarkup+='<a class="smx-category-card" href="'+(local?'/shop/':'/c/global/index.html')+'"><span class="smx-category-more" aria-hidden="true">&bull;&bull;&bull;</span><strong>'+escape(sections.more)+'</strong></a></div></section>';
 markup+='<section id="smx-featured" class="smx-section smx-catalog" aria-label="'+escape(t.products)+'">';
 markup+=dailyControls(ui);
 markup+='<div class="smx-shop-layout"><aside class="smx-filter" aria-label="'+escape(ui.filter)+'"><strong>'+escape(ui.filter)+'</strong>'+filterControls(ui,merchandise,local)+'<details class="smx-category-directory"><summary>'+escape(t.all)+'</summary><div class="smx-filter-links">'+
 (local?categoriesLocal.map(([name,url])=>'<a href="'+url+'">'+escape(name)+' <span>↗</span></a>'):dataset.globalCategories.slice(0,8).map(c=>'<a href="'+escape(c.url)+'">'+escape(c.name)+' <span>↗</span></a>')).join('')+
 '</div></details><p>'+escape(t.notice)+'</p></aside><div class="smx-results">'+catalogControls(ui,merchandise,local)+'<div class="smx-products">'+merchandise.map(x=>productCard(x,t,local)).join('')+'</div><p class="smx-empty" data-empty hidden>'+escape(ui.empty)+'</p><button type="button" class="smx-more" data-show-more hidden>'+escape(ui.more)+'</button></div></div></section>';
 markup+=promoSections({lang,market,ui});
 markup+=categoryMarkup;
 markup+='<p class="smx-disclaimer">'+escape(t.notice)+'</p></div>';
 if(cyr){
  // Preserve link URLs, tags and existing non-Serbian names while transliterating user-facing labels only.
  // The categories are established English product taxonomy names and should retain their identifiers.
  markup=markup.replace(/>([^<>]+)</g, (m,text)=>'>'+toCyrillic(text)+'<');
 }
 return markup;
}
