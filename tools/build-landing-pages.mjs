#!/usr/bin/env node
/**
 * Verified-first landing pages: Pakistan (English + Urdu) and the first international markets.
 * Source of facts: data/landing/markets.json. Nothing is invented: no transit days, no shipping prices, no guarantees.
 * A market page is indexable only when its `indexable` flag is true (set after the evidence gate passes).
 * Writes: pakistan/, ur/pakistan/, shipping-to/ (hub), shipping-to/<slug>/ and sitemap-landing.xml (indexable URLs only).
 * Idempotent. Does not touch chrome.js, build-chrome-runtime.mjs or the audit tools.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {S, M, fmt, cyrillicStrings} from './landing-i18n.mjs';
import {buildShowcase} from './landing-showcase.mjs';
import {scenicHero} from './landing-storefront.mjs';
import {buildCampaignPages} from './build-campaign-pages.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8'));
const ORIGIN = data.siteOrigin, WA = data.whatsapp, FEE = data.pakistan.delivery_fee_pkr, FREE = data.pakistan.free_delivery_from_pkr;
// The country pages are independent HTML documents, not cloned from index.html.
// Emit one static Clarity project loader in each generated page's <head>.
const CLARITY_SCRIPT = `<!-- Microsoft Clarity project zh6iif5boz -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "zh6iif5boz");
</script>
`;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = n => new Intl.NumberFormat('en-US').format(n);
const prefixFor = rel => '../'.repeat(rel.split('/').filter(Boolean).length);
const ROBOTS_ON = 'index, follow, max-image-preview:large', ROBOTS_OFF = 'noindex, follow';
const written = [], routes = [];

function write(rel, html, meta = {}) {
  const file = path.join(root, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
  written.push(rel);
  routes.push({rel, url: ORIGIN + '/' + rel + '/', lang: (html.match(/<html lang="([^"]+)"/) || [])[1], dir: (html.match(/<html lang="[^"]+" dir="([^"]+)"/) || [])[1], robots: (html.match(/name="robots" content="([^"]+)"/) || [])[1], ...meta});
}

function shell({rel, lang, dir, title, desc, indexable, alternates, graph, body, enhance = true}) {
  const pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
  const hreflang = indexable && alternates.length
    ? alternates.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${ORIGIN}/${a.rel}/">`).join('') + `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${alternates[0].rel}/">` : '';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
${CLARITY_SCRIPT}<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${indexable ? ROBOTS_ON : ROBOTS_OFF}">
<link rel="canonical" href="${url}">
${hreflang}
<meta property="og:type" content="website"><meta property="og:site_name" content="Sasta Milaga"><meta property="og:locale" content="${ogLocale(lang)}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/assets/brand/og-default-1200x630.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<meta name="theme-color" content="#0F7A3B">
<link rel="icon" href="${pre}assets/brand/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="${pre}assets/brand/apple-touch-icon.png">
<link rel="preload" href="${pre}assets/fonts/host-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${pre}assets/theme/static-bundle.css">
<link rel="stylesheet" href="${pre}assets/css/landing.css">
<link rel="stylesheet" href="${pre}assets/css/country-showcase.css">
<link rel="stylesheet" href="${pre}assets/css/campaigns.css">
<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replace(/</g, '\\u003c')}</script>
</head>
<body class="sm-static sm-page-static">
<div id="sm-chrome-header" data-prefix="${pre}"><header class="sm-fallback-head"><a href="${pre}"><img src="${pre}assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<main id="main" class="sm-main"><div id="app" class="sm-app">
${enhance ? body.replace(/<header class="sml-hero">([\s\S]*?)<\/header>/, (_, original) => scenicHero({rel,lang,dir}) + buildShowcase({rel,lang,dir}) + '<section id="delivery-guide" class="sml-overview">' + original.replace('<h1>', '<h2>').replace('</h1>', '</h2>') + '</section>') : body}
</div></main>
<div id="sm-chrome-footer"></div>
<script src="${pre}assets/js/landing-storefront.js" defer></script>
<script src="${pre}assets/js/campaigns.js" defer></script>
<script src="${pre}assets/js/chrome.js" defer></script>
</body>
</html>
`;
}

const crumbSchema = (items) => ({'@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({'@type': 'ListItem', position: i + 1, name: it[0], item: it[1]}))});
const faqSchema = (items) => ({'@type': 'FAQPage', mainEntity: items.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))});
const pageSchema = (name, desc, url, lang) => ({'@type': 'WebPage', '@id': url + '#webpage', name, description: desc, url, inLanguage: lang, isPartOf: {'@type': 'WebSite', name: 'Sasta Milaga', url: ORIGIN + '/'}});

const faqHtml = items => items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
const chips = list => `<div class="sml-links">${list.map(([href, label]) => `<a href="${esc(href)}">${esc(label)}</a>`).join('')}</div>`;

/* The qualified-order panel: the button stays disabled until the facts a supplier order needs are present. */
function orderScript(cfg) {
  return `<script>(function(){var f=document.getElementById('sml-order');if(!f)return;var b=f.querySelector('[data-go]'),s=f.querySelector('[data-ready]'),t=s.querySelector('b');
var need=${JSON.stringify(cfg.required)},WA=${JSON.stringify(WA)},C=${JSON.stringify(cfg.lines)};
function v(n){var e=f.elements[n];return e?(e.type==='checkbox'?(e.checked?'yes':''):String(e.value||'').trim()):''}
function ok(){for(var i=0;i<need.length;i++){var n=need[i];if(n==='quantity'){var q=+v('quantity');if(!(q>=1&&q<=99&&q%1===0))return false}else if(n==='product'){if(v(n).length<3)return false}else if(!v(n))return false}return true}
function sync(){var r=ok();b.disabled=!r;s.setAttribute('data-ok',r?'1':'0');t.textContent=r?${JSON.stringify(cfg.ready)}:${JSON.stringify(cfg.notReady)}}
f.addEventListener('input',sync);f.addEventListener('change',sync);
f.addEventListener('submit',function(e){e.preventDefault();if(!ok())return;var m=C.map(function(l){var val=l[1]==='@url'?location.href.split('#')[0]:(l[1].charAt(0)==='@'?v(l[1].slice(1)):l[1]);return val?l[0]+': '+val:''}).filter(Boolean);
m.unshift(${JSON.stringify(cfg.greeting)});window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(m.join('\\n')),'_blank','noopener')});sync()})();</script>`;
}

const SHARED_LINKS = (pre) => [
  [pre + 'c/global/index.html', 'Global categories'], [pre + 'shipping/', 'Shipping and delivery'], [pre + 'returns/', 'Returns and refunds'],
  [pre + 'how-to-order/', 'How to order'], [pre + 'safe-shopping/', 'Safe shopping'], [pre + 'faq/', 'FAQ'],
  [pre + 'b/shopping-from-the-cj-supplier-collection.html', 'Guide: shopping the global collection'], [pre + 'contact/', 'Contact us']
];


/* Live shipping estimate: CJ variants then CJ freight, through the store's own /api/cj endpoints (same origin on sastamilaga.com).
 * Rates are shown exactly as returned; any failure falls back to the WhatsApp hand-off. Nothing is ordered here. */
function quoteBlock(T, f, cc) {
  return `<div id="sml-quote" class="sml-quote" data-cc="${esc(cc)}"><h3>${esc(T.qH)}</h3><p class="sml-note">${esc(f(T.qP))}</p>
<label>${esc(T.qVariant)}<select name="qvid" disabled><option value="">&mdash;</option></select></label>
<button type="button" class="sml-btn sml-btn--line" data-quote disabled>${esc(f(T.qBtn))}</button>
<p role="status" aria-live="polite" data-status class="sml-note">${esc(T.qNeedLink)}</p><div data-out></div>
<p class="sml-note">${esc(T.qNote)}</p></div><input type="hidden" name="quote" value="">`;
}
function quoteScript(T, f) {
  const S2 = {qLoadingV: T.qLoadingV, qNoV: T.qNoV, qLoading: T.qLoading, qFail: T.qFail, qNone: T.qNone, qNeedLink: T.qNeedLink, qThCarrier: T.qThCarrier, qThShip: T.qThShip, qThTotal: T.qThTotal, qThEta: T.qThEta};
  return `<script>(function(){var f=document.getElementById('sml-order'),q=document.getElementById('sml-quote');if(!f||!q)return;
var API='https://sastamilaga.com/api/cj/',CC=q.getAttribute('data-cc'),T=${JSON.stringify(S2)};
var sel=q.querySelector('select'),btn=q.querySelector('[data-quote]'),out=q.querySelector('[data-out]'),st=q.querySelector('[data-status]'),hid=f.elements.quote;
var pid='',busy=false,timer=0;
function pidOf(){var m=String(f.elements.product.value).match(/\\/global-shop\\/p\\/([A-Fa-f0-9-]{36}|\\d{19})(?:\\/|$|\\?)/);return m?m[1]:''}
function qtyOk(){var n=+f.elements.quantity.value;return n>=1&&n<=99&&n%1===0}
function sync(){btn.disabled=busy||!pid||!sel.value||!qtyOk()}
function say(t){st.textContent=t}
function get(u,ms){var c=new AbortController(),t=setTimeout(function(){c.abort()},ms||15000);return fetch(u,{credentials:'omit',signal:c.signal}).then(function(r){clearTimeout(t);if(!r.ok)throw Error('http '+r.status);return r.json()},function(e){clearTimeout(t);throw e})}
function reset(){sel.replaceChildren();var o=document.createElement('option');o.value='';o.textContent='\\u2014';sel.appendChild(o);sel.disabled=true;out.replaceChildren();hid.value=''}
function loadVariants(p){reset();say(T.qLoadingV);get(API+'variants?pid='+encodeURIComponent(p)).then(function(d){if(pidOf()!==p)return;var vs=((d&&d.variants)||[]).filter(function(v){return v&&/^[A-Za-z0-9-]{8,64}$/.test(String(v.vid))}).slice(0,300);if(!vs.length){say(T.qNoV);return}sel.replaceChildren();vs.forEach(function(v){var o=document.createElement('option');o.value=v.vid;o.textContent=String(v.name||v.key||v.sku||v.vid).slice(0,80);sel.appendChild(o)});sel.disabled=false;say('');sync()}).catch(function(){if(pidOf()===p)say(T.qFail)})}
function onProduct(){var p=pidOf();if(p===pid){sync();return}pid=p;if(!p){reset();say(T.qNeedLink);sync();return}loadVariants(p)}
f.elements.product.addEventListener('input',function(){clearTimeout(timer);timer=setTimeout(onProduct,350)});f.elements.product.addEventListener('change',onProduct);
f.elements.quantity.addEventListener('input',sync);sel.addEventListener('change',function(){out.replaceChildren();hid.value='';sync()});
function money(n){return (Math.round(+n*100)/100).toFixed(2)}
function render(rs){var w=document.createElement('div');w.style.overflowX='auto';var t=document.createElement('table');t.className='sml-table';var h=t.createTHead().insertRow();[T.qThCarrier,T.qThShip,T.qThTotal,T.qThEta].forEach(function(x){var c=document.createElement('th');c.scope='col';c.textContent=x;h.appendChild(c)});var b=t.createTBody();
rs.slice(0,8).forEach(function(r){var row=b.insertRow();var tot=r.indicativeTotalUsd!=null?money(r.indicativeTotalUsd):'\\u2014';[r.carrier,money(r.shippingUsd),tot,String(r.eta||'\\u2014')].forEach(function(x){row.insertCell().textContent=x});row.style.cursor='pointer';row.tabIndex=0;
function pick(){hid.value=r.carrier+' | '+T.qThShip+' '+money(r.shippingUsd)+' | '+T.qThTotal+' '+tot+' | '+T.qThEta+' '+(r.eta||'\\u2014');[].forEach.call(b.rows,function(x){x.style.outline=''});row.style.outline='2px solid #0F7A3B'}
row.addEventListener('click',pick);row.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}})});
w.appendChild(t);out.appendChild(w);if(b.rows[0])b.rows[0].click()}
btn.addEventListener('click',function(){if(btn.disabled)return;busy=true;sync();out.replaceChildren();hid.value='';say(T.qLoading);
var url=API+'shipping?pid='+encodeURIComponent(pid)+'&vid='+encodeURIComponent(sel.value)+'&country='+encodeURIComponent(CC)+'&quantity='+encodeURIComponent(+f.elements.quantity.value);
get(url,20000).then(function(d){var rs=((d&&d.rates)||[]).filter(function(r){return r&&r.carrier&&isFinite(+r.shippingUsd)});if(!rs.length){say(T.qNone);return}say('');render(rs)}).catch(function(){say(T.qFail)}).then(function(){busy=false;sync()})});
onProduct();sync()})();</script>`;
}

/* ---------------- International market pages (one renderer, many locales) ---------------- */
const VARIANTS = {
  germany: [{id: 'en', rel: 'shipping-to/germany', S: 'en', lang: 'en', native: 'English'}, {id: 'de', rel: 'shipping-to/germany/de', S: 'de', lang: 'de-DE', native: 'Deutsch'}],
  uk: [{id: 'en', rel: 'shipping-to/uk', S: 'en', lang: 'en-GB', native: 'English (UK)'}],
  usa: [{id: 'en', rel: 'shipping-to/usa', S: 'en', lang: 'en-US', native: 'English (US)'}],
  serbia: [{id: 'en', rel: 'shipping-to/serbia', S: 'en', lang: 'en', native: 'English'},
    {id: 'sr-latn', rel: 'shipping-to/serbia/sr-latn', S: 'sr', lang: 'sr-Latn-RS', native: 'Srpski (latinica)'},
    {id: 'sr-cyrl', rel: 'shipping-to/serbia/sr-cyrl', S: 'sr', cyr: true, lang: 'sr-Cyrl-RS', native: 'Српски (ћирилица)'}],
  'saudi-arabia': [{id: 'en', rel: 'shipping-to/saudi-arabia', S: 'en', lang: 'en-SA', native: 'English'}, {id: 'ar', rel: 'shipping-to/saudi-arabia/ar', S: 'ar', dir: 'rtl', lang: 'ar-SA', native: 'العربية'}]
};
const ogLocale = lang => { const p = lang.split('-'); if (p.length === 1) return p[0] === 'en' ? 'en_PK' : p[0]; return p[0] + '_' + p[p.length - 1]; };

function marketText(m, v) {
  if (v.S === 'en') return {to: m.name, label: m.short || m.name, loc: m.name, region: m.region, intro: m.intro, tax: m.tax, safety: m.safety, question: m.question, answer: m.answer, nom: m.name};
  const base = M[m.slug][v.S];
  const out = {...base, nom: S[v.S].names[m.slug]};
  return v.cyr ? cyrillicStrings(out) : out;
}

function renderMarket(m) {
  const variants = VARIANTS[m.slug];
  for (const v of variants) {
    const T = v.cyr ? cyrillicStrings(S.sr) : S[v.S], X = marketText(m, v), dir = v.dir || 'ltr', rel = v.rel, pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
    const f = s => fmt(s, {to: X.to, label: X.label, loc: X.loc, region: X.region});
    const title = f(T.title), desc = f(T.desc);
    const faq = [[X.question, X.answer], ...T.faq.map(([q, a]) => [f(q), f(a)])];
    const sib = Object.keys(VARIANTS).filter(s => s !== m.slug);
    const nameOf = s => T.names[s];
    const others = sib.map(s => [pre + 'shipping-to/' + s + '/', fmt(T.deliveryTo, {x: nameOf(s)})]);
    const alternates = variants.map(x => ({lang: x.lang, rel: x.rel}));
    const graph = [pageSchema(title, desc, url, v.lang), crumbSchema([[T.home, ORIGIN + '/'], [T.hub, ORIGIN + '/shipping-to/'], [X.nom, url]]), faqSchema(faq)];
    const switcher = variants.length > 1 ? `<nav class="sml-links" aria-label="${esc(T.langLabel)}" style="margin:0 0 8px">${variants.map(x => x.id === v.id
      ? `<a href="${pre}${x.rel}/" lang="${x.lang}" hreflang="${x.lang}" aria-current="true" style="background:var(--g);color:#fff">${esc(x.native)}</a>`
      : `<a href="${pre}${x.rel}/" lang="${x.lang}" hreflang="${x.lang}">${esc(x.native)}</a>`).join('')}</nav>` : '';
    const body = `<div class="sml" dir="${dir}"><div class="sml-wrap">
<nav class="sml-crumbs" aria-label="Breadcrumb"><a href="${pre}">${esc(T.home)}</a> <span aria-hidden="true">${dir === 'rtl' ? '&lsaquo;' : '&rsaquo;'}</span> <a href="${pre}shipping-to/">${esc(T.hub)}</a> <span aria-hidden="true">${dir === 'rtl' ? '&lsaquo;' : '&rsaquo;'}</span> <span aria-current="page">${esc(X.nom)}</span></nav>
${switcher}<header class="sml-hero"><span class="sml-pill">${esc(f(T.pill))}</span>
<h1>${esc(f(T.h1))}</h1>
<p class="sml-answer">${esc(X.intro)}</p>
<div class="sml-actions"><a class="sml-btn sml-btn--go" href="${pre}c/global/index.html">${esc(T.browse)}</a><a class="sml-btn sml-btn--ghost" href="#order">${esc(T.check)}</a></div></header>

<div class="sml-grid sml-grid--2">
<section class="sml-card" aria-labelledby="how"><h2 id="how">${esc(f(T.howH))}</h2>
<ol class="sml-steps">${T.steps.map(([h, p]) => `<li><div><b>${esc(f(h))}</b>${esc(f(p))}</div></li>`).join('')}</ol></section>
<section class="sml-card" aria-labelledby="price"><h2 id="price">${esc(T.priceH)}</h2>
<table class="sml-table"><tbody>
${T.rows.map(([a, b, kind, chip]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}${kind ? ` <span class="sml-chip sml-chip--${kind}">${esc(chip)}</span>` : ''}</td></tr>`).join('\n')}</tbody></table></section></div>

<section class="sml-card" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="tax"><h2 id="tax">${esc(f(T.taxH))}</h2>
<p>${esc(X.tax)}</p><p>${esc(X.safety)}</p>
<p class="sml-note">${esc(T.note)}</p></section>

<section id="order" class="sml-card sml-order" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="orderh"><h2 id="orderh">${esc(T.orderH)}</h2>
<p>${esc(T.orderP)}</p>
<form id="sml-order" class="sml-form" novalidate>
<label>${esc(T.fProduct)}<input name="product" type="text" required placeholder="${esc(T.fProductPh)}" autocomplete="off"></label>
<label>${esc(T.fOption)}<input name="option" type="text" placeholder="${esc(T.fOptionPh)}"></label>
<label>${esc(T.fQty)}<input name="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label>
<label>${esc(T.fCountry)}<select name="country"><option value="${esc(X.nom)}" selected>${esc(X.nom)}</option></select></label>
<label>${esc(T.fCity)}<input name="city" type="text" required placeholder="${esc(T.fCityPh)}" autocomplete="address-level2"></label>
${quoteBlock(T, f, m.code)}
<label class="sml-check"><input name="tax" type="checkbox" required><span>${esc(f(T.cTax))}</span></label>
<label class="sml-check"><input name="paid" type="checkbox" required><span>${esc(T.cPaid)}</span></label>
<div class="sml-ready" data-ready data-ok="0"><i aria-hidden="true"></i><b role="status" aria-live="polite"></b></div>
<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>${esc(T.send)}</button></form></section>

<div class="sml-grid sml-grid--2" style="margin-top:clamp(16px,2vw,26px)">
<section class="sml-card" aria-labelledby="faq"><h2 id="faq">${esc(f(T.faqH))}</h2>${faqHtml(faq)}</section>
<section class="sml-card" aria-labelledby="more"><h2 id="more">${esc(T.moreH)}</h2><p>${esc(T.moreP)}</p>${chips(SHARED_LINKS(pre).map(([h], i) => [h, T.links[i]]))}
<h3 style="margin-top:18px">${esc(T.otherDest)}</h3>${chips(others.concat([[pre + 'pakistan/', T.shopPK]]))}</section></div>

<div class="sml-band"><div><b>${esc(f(T.bandH))}</b><small>${esc(T.bandP)}</small></div><a class="sml-btn sml-btn--go" href="${pre}contact/">${esc(T.bandBtn)}</a></div>
</div></div>
${orderScript({required: ['product', 'quantity', 'city', 'tax', 'paid'], ready: T.readyOk, notReady: T.readyNot, greeting: T.wa.greeting,
      lines: [[T.wa.country, '@country'], [T.wa.item, '@product'], [T.wa.option, '@option'], [T.wa.qty, '@quantity'], [T.wa.city, '@city'], [T.wa.quote, '@quote'], [T.wa.tax, T.wa.yes], [T.wa.pay, T.wa.prepaid], [T.wa.page, '@url']]})}
${quoteScript(T, f)}`;
    write(rel, shell({rel, lang: v.lang, dir, title, desc, indexable: m.indexable, alternates, graph, body}), {market: m.slug, locale: v.lang, variant: v.id, indexable: !!m.indexable, dir, S: v.S + (v.cyr ? '-cyrl' : '')});
  }
}

/* ---------------- Pakistan: English ---------------- */
function renderPK() {
  const rel = 'pakistan', pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
  const title = `Online shopping in Pakistan with cash on delivery | Sasta Milaga`;
  const desc = `Delivery in Pakistan is Rs ${num(FEE)}, free from Rs ${num(FREE)}. Cash on delivery on local products, clear totals and WhatsApp support.`;
  const faq = [
    [`How much is delivery in Pakistan?`, `Delivery is Rs ${num(FEE)} per order and free for orders of Rs ${num(FREE)} or more.`],
    ['Can I pay cash on delivery?', 'Yes, for local products delivered in Pakistan. Global supplier items use a prepaid checkout instead.'],
    ['How do I place an order?', 'Add items to your basket on the shop and check out, or fill in the order check below and send it on WhatsApp.'],
    ['What if I want to return something?', 'Read the returns and refunds page first. Eligibility depends on the item and the reason.'],
    ['Is there an Urdu version of this page?', 'Yes. The Urdu version is linked below and uses right-to-left layout.']
  ];
  const graph = [pageSchema(title, desc, url, 'en'), crumbSchema([['Home', ORIGIN + '/'], ['Pakistan', url]]), faqSchema(faq)];
  const links = [[pre + 'shop/', 'Shop local products'], [pre + 'c/global/index.html', 'Global collection'], [pre + 'shipping/', 'Shipping and delivery'], [pre + 'returns/', 'Returns and refunds'],
    [pre + 'how-to-order/', 'How to order'], [pre + 'safe-shopping/', 'Safe shopping'], [pre + 'faq/', 'FAQ'], [pre + 'contact/', 'Contact us'], [pre + 'ur/pakistan/', 'اردو میں پڑھیں']];
  const body = `<div class="sml" dir="ltr"><div class="sml-wrap">
<nav class="sml-crumbs" aria-label="Breadcrumb"><a href="${pre}">Home</a> <span aria-hidden="true">&rsaquo;</span> <span aria-current="page">Pakistan</span></nav>
<header class="sml-hero"><span class="sml-pill">Pakistan &middot; Cash on delivery</span>
<h1>Online shopping in Pakistan, paid on delivery</h1>
<p class="sml-answer">Order from Sasta Milaga for delivery in Pakistan. Delivery is Rs ${num(FEE)} and free from Rs ${num(FREE)}. Local products can be paid for in cash when they arrive, and you see the total before you confirm.</p>
<div class="sml-actions"><a class="sml-btn sml-btn--go" href="${pre}shop/">Start shopping</a><a class="sml-btn sml-btn--ghost" href="#order">Check my order</a></div></header>
<div class="sml-grid sml-grid--2">
<section class="sml-card" aria-labelledby="how"><h2 id="how">How ordering works</h2>
<ol class="sml-steps"><li><div><b>Pick a product</b>Browse the shop and check the options and photos.</div></li>
<li><div><b>Add it to your basket</b>Set the quantity and enter your delivery address.</div></li>
<li><div><b>See the total</b>Item price and delivery are shown before you confirm.</div></li>
<li><div><b>Pay when it arrives</b>Cash on delivery applies to local products.</div></li></ol></section>
<section class="sml-card" aria-labelledby="price"><h2 id="price">Prices and delivery</h2>
<table class="sml-table"><tbody>
<tr><th scope="row">Item price</th><td>Shown on each product page in rupees</td></tr>
<tr><th scope="row">Delivery</th><td>Rs ${num(FEE)} per order</td></tr>
<tr><th scope="row">Free delivery</th><td>Orders of Rs ${num(FREE)} or more</td></tr>
<tr><th scope="row">Payment</th><td>Cash on delivery for local products</td></tr>
<tr><th scope="row">Global items</th><td>Prepaid checkout, shipping confirmed per order</td></tr></tbody></table></section></div>
<section id="order" class="sml-card sml-order" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="orderh"><h2 id="orderh">Check your order before you send it</h2>
<p>Add what we need to confirm an order. The button unlocks when the essentials are there and opens WhatsApp with your details.</p>
<form id="sml-order" class="sml-form" novalidate>
<label>Product link or name<input name="product" type="text" required placeholder="Paste the product page link or type its name" autocomplete="off"></label>
<label>Option (colour, size)<input name="option" type="text"></label>
<label>Quantity<input name="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label>
<label>City<input name="city" type="text" required autocomplete="address-level2"></label>
<label class="sml-check"><input name="addr" type="checkbox" required><span>I will share my full delivery address and phone number on WhatsApp.</span></label>
<div class="sml-ready" data-ready data-ok="0"><i aria-hidden="true"></i><b role="status" aria-live="polite"></b></div>
<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>Send my order details on WhatsApp</button></form></section>
<div class="sml-grid sml-grid--2" style="margin-top:clamp(16px,2vw,26px)">
<section class="sml-card" aria-labelledby="faq"><h2 id="faq">Questions about shopping in Pakistan</h2>${faqHtml(faq)}</section>
<section class="sml-card" aria-labelledby="more"><h2 id="more">Keep reading</h2>${chips(links)}<h3 style="margin-top:18px">Ordering from abroad</h3>${chips(data.markets.map(x => [pre + 'shipping-to/' + x.slug + '/', 'Delivery to ' + (x.short || x.name)]))}</section></div>
</div></div>
${orderScript({required: ['product', 'quantity', 'city', 'addr'], ready: 'Ready to send', notReady: 'Add the item, quantity and city, and tick the confirmation',
    greeting: 'Assalam o Alaikum! I want to order from Sasta Milaga.',
    lines: [['Item', '@product'], ['Option', '@option'], ['Quantity', '@quantity'], ['City', '@city'], ['Page', '@url']]})}`;
  write(rel, shell({rel, lang: 'en', dir: 'ltr', title, desc, indexable: true, alternates: [{lang: 'en', rel}, {lang: 'ur', rel: 'ur/pakistan'}], graph, body}), {market: 'pakistan', locale: 'en-PK', variant: 'en', indexable: true});
}

/* ---------------- Pakistan: Urdu (native copy; review by a native speaker is recommended) ---------------- */
function renderPKur() {
  const rel = 'ur/pakistan', pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
  const title = 'پاکستان میں آن لائن خریداری، کیش آن ڈیلیوری | ساسٹا ملاگا';
  const desc = `پاکستان میں ڈیلیوری کا خرچ ${num(FEE)} روپے ہے اور ${num(FREE)} روپے یا اس سے زیادہ کے آرڈر پر ڈیلیوری مفت ہے۔ لوکل پروڈکٹس پر کیش آن ڈیلیوری۔`;
  const faq = [
    ['ڈیلیوری کا خرچ کتنا ہے؟', `ڈیلیوری ہر آرڈر پر ${num(FEE)} روپے ہے، اور ${num(FREE)} روپے یا اس سے زیادہ کے آرڈر پر مفت ہے۔`],
    ['کیا کیش آن ڈیلیوری دستیاب ہے؟', 'جی ہاں، پاکستان میں لوکل پروڈکٹس پر کیش آن ڈیلیوری دستیاب ہے۔ گلوبل پروڈکٹس کے لیے پیشگی ادائیگی ہوتی ہے۔'],
    ['آرڈر کیسے کروں؟', 'شاپ سے پروڈکٹ چنیں اور چیک آؤٹ کریں، یا نیچے دیا گیا فارم بھر کر واٹس ایپ پر آرڈر کی تفصیل بھیجیں۔'],
    ['واپسی یا رقم کی واپسی کیسے ہوگی؟', 'پہلے واپسی اور رقم کی واپسی کا صفحہ پڑھیں۔ شرائط پروڈکٹ اور وجہ پر منحصر ہیں۔']
  ];
  const graph = [pageSchema(title, desc, url, 'ur'), crumbSchema([['ہوم', ORIGIN + '/ur/'], ['پاکستان', url]]), faqSchema(faq)];
  const links = [[pre + 'shop/', 'شاپ'], [pre + 'ur/shipping/', 'شپنگ اور ڈیلیوری'], [pre + 'ur/returns/', 'واپسی اور رقم کی واپسی'], [pre + 'ur/how-to-order/', 'آرڈر کیسے کریں'], [pre + 'ur/faq/', 'عمومی سوالات'], [pre + 'ur/contact/', 'ہم سے رابطہ کریں'], [pre + 'pakistan/', 'Read in English']];
  const body = `<div class="sml" dir="rtl"><div class="sml-wrap">
<nav class="sml-crumbs" aria-label="نیویگیشن"><a href="${ORIGIN}/ur/">ہوم</a> <span aria-hidden="true">&lsaquo;</span> <span aria-current="page">پاکستان</span></nav>
<header class="sml-hero"><span class="sml-pill">پاکستان &middot; کیش آن ڈیلیوری</span>
<h1>پاکستان میں آن لائن خریداری، ادائیگی ڈیلیوری پر</h1>
<p class="sml-answer">ساسٹا ملاگا سے پاکستان میں آرڈر کریں۔ ڈیلیوری ${num(FEE)} روپے ہے اور ${num(FREE)} روپے یا اس سے زیادہ پر مفت۔ لوکل پروڈکٹس کی رقم سامان ملنے پر ادا کریں، اور کل رقم تصدیق سے پہلے آپ کے سامنے ہوتی ہے۔</p>
<div class="sml-actions"><a class="sml-btn sml-btn--go" href="${pre}shop/">خریداری شروع کریں</a><a class="sml-btn sml-btn--ghost" href="#order">اپنا آرڈر چیک کریں</a></div></header>
<div class="sml-grid sml-grid--2">
<section class="sml-card" aria-labelledby="how"><h2 id="how">آرڈر کیسے کام کرتا ہے</h2>
<ol class="sml-steps"><li><div><b>پروڈکٹ چنیں</b>شاپ میں پروڈکٹ کی تصاویر اور آپشن دیکھیں۔</div></li>
<li><div><b>ٹوکری میں ڈالیں</b>تعداد لکھیں اور ڈیلیوری کا پتہ درج کریں۔</div></li>
<li><div><b>کل رقم دیکھیں</b>پروڈکٹ کی قیمت اور ڈیلیوری تصدیق سے پہلے نظر آتی ہے۔</div></li>
<li><div><b>سامان ملنے پر ادائیگی</b>لوکل پروڈکٹس پر کیش آن ڈیلیوری ہے۔</div></li></ol></section>
<section class="sml-card" aria-labelledby="price"><h2 id="price">قیمت اور ڈیلیوری</h2>
<table class="sml-table"><tbody>
<tr><th scope="row">پروڈکٹ کی قیمت</th><td>ہر پروڈکٹ کے صفحے پر روپوں میں درج ہے</td></tr>
<tr><th scope="row">ڈیلیوری</th><td>ہر آرڈر پر ${num(FEE)} روپے</td></tr>
<tr><th scope="row">مفت ڈیلیوری</th><td>${num(FREE)} روپے یا اس سے زیادہ کے آرڈر پر</td></tr>
<tr><th scope="row">ادائیگی</th><td>لوکل پروڈکٹس پر کیش آن ڈیلیوری</td></tr>
<tr><th scope="row">گلوبل پروڈکٹس</th><td>پیشگی ادائیگی، شپنگ ہر آرڈر پر تصدیق کے بعد</td></tr></tbody></table></section></div>
<section id="order" class="sml-card sml-order" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="orderh"><h2 id="orderh">بھیجنے سے پہلے اپنا آرڈر چیک کریں</h2>
<p>آرڈر کی تصدیق کے لیے ضروری تفصیل لکھیں۔ ضروری خانے مکمل ہوتے ہی بٹن کھل جاتا ہے اور واٹس ایپ آپ کی تفصیل کے ساتھ کھلتا ہے۔</p>
<form id="sml-order" class="sml-form" novalidate>
<label>پروڈکٹ کا لنک یا نام<input name="product" type="text" required placeholder="پروڈکٹ کا لنک چسپاں کریں یا نام لکھیں" autocomplete="off"></label>
<label>آپشن (رنگ، سائز)<input name="option" type="text"></label>
<label>تعداد<input name="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label>
<label>شہر<input name="city" type="text" required autocomplete="address-level2"></label>
<label class="sml-check"><input name="addr" type="checkbox" required><span>میں مکمل پتہ اور فون نمبر واٹس ایپ پر بھیجوں گا/گی۔</span></label>
<div class="sml-ready" data-ready data-ok="0"><i aria-hidden="true"></i><b role="status" aria-live="polite"></b></div>
<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>آرڈر کی تفصیل واٹس ایپ پر بھیجیں</button></form></section>
<div class="sml-grid sml-grid--2" style="margin-top:clamp(16px,2vw,26px)">
<section class="sml-card" aria-labelledby="faq"><h2 id="faq">پاکستان میں خریداری کے سوالات</h2>${faqHtml(faq)}</section>
<section class="sml-card" aria-labelledby="more"><h2 id="more">مزید پڑھیں</h2>${chips(links)}</section></div>
</div></div>
${orderScript({required: ['product', 'quantity', 'city', 'addr'], ready: 'بھیجنے کے لیے تیار', notReady: 'پروڈکٹ، تعداد اور شہر لکھیں اور تصدیق پر نشان لگائیں',
    greeting: 'السلام علیکم! میں ساسٹا ملاگا سے آرڈر کرنا چاہتا/چاہتی ہوں۔',
    lines: [['پروڈکٹ', '@product'], ['آپشن', '@option'], ['تعداد', '@quantity'], ['شہر', '@city'], ['صفحہ', '@url']]})}`;
  write(rel, shell({rel, lang: 'ur', dir: 'rtl', title, desc, indexable: true, alternates: [{lang: 'en', rel: 'pakistan'}, {lang: 'ur', rel}], graph, body}), {market: 'pakistan', locale: 'ur-PK', variant: 'ur', indexable: true});
}

/* ---------------- Hub ---------------- */
const HUB_CC = {germany: 'DE', uk: 'GB', usa: 'US', serbia: 'RS', 'saudi-arabia': 'SA'};
const HUB_LANGS = {
  germany: [['de', 'Deutsch', 'shipping-to/germany/de/']],
  serbia: [['sr-Latn', 'Srpski', 'shipping-to/serbia/sr-latn/'], ['sr-Cyrl', 'Српски', 'shipping-to/serbia/sr-cyrl/']],
  'saudi-arabia': [['ar', 'العربية', 'shipping-to/saudi-arabia/ar/']]
};
/* One card = one stretched link (the country name) plus separate language links. The link text stays free of cart/payment words: the edge click guard swallows clicks on those. */
function hubCard({pre, cc, name, href, mode, text, langs}) {
  const l = langs.length ? `<p class="sml-langs"><span>Also in</span>${langs.map(([code, label, to]) => `<a lang="${code}" hreflang="${code}" href="${pre}${to}">${label}</a>`).join('')}</p>` : '';
  return `<article class="sml-card sml-cty"><span class="sml-cc" aria-hidden="true">${cc}</span><h2><a class="sml-cty-link" href="${pre}${href}">${esc(name)}</a></h2><p>${esc(text)}</p><p class="sml-mode">${esc(mode)}</p>${l}<span class="sml-go" aria-hidden="true">View delivery details &rarr;</span></article>`;
}
function renderHub() {
  const rel = 'shipping-to', pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
  const title = 'Shipping by country | Sasta Milaga';
  const desc = 'Where Sasta Milaga delivers: Pakistan with cash on delivery, and global supplier items for Germany, the UK, the USA, Serbia and Saudi Arabia.';
  const graph = [pageSchema(title, desc, url, 'en'), crumbSchema([['Home', ORIGIN + '/'], ['Shipping by country', url]])];
  const body = `<div class="sml" dir="ltr"><div class="sml-wrap">
<nav class="sml-crumbs" aria-label="Breadcrumb"><a href="${pre}">Home</a> <span aria-hidden="true">&rsaquo;</span> <span aria-current="page">Shipping by country</span></nav>
<header class="sml-hero"><span class="sml-pill">Delivery guide</span><h1>Shipping by country</h1>
<p class="sml-answer">Pick your destination to see how ordering, pricing and delivery work there. Taxes, duties and delivery times depend on your country and the item, so each page says what is confirmed and what is not.</p></header>
<div class="sml-grid sml-grid--3">
${hubCard({pre, cc: 'PK', name: 'Pakistan', href: 'pakistan/', mode: 'Pay when it arrives', text: `Local products, delivered across Pakistan. Rs ${num(FEE)} delivery, free from Rs ${num(FREE)}.`, langs: [['ur', 'اردو', 'ur/pakistan/']]})}
${data.markets.map(x => hubCard({pre, cc: HUB_CC[x.slug], name: x.short || x.name, href: `shipping-to/${x.slug}/`, mode: 'Paid in advance', text: 'Global supplier items. We confirm shipping and the full total before you pay.', langs: HUB_LANGS[x.slug] || []})).join('\n')}
</div>
<p class="sml-note" style="margin-top:18px">More countries are added only after delivery, payment and returns are checked for them.</p>
${chips(SHARED_LINKS(pre))}
</div></div>`;
  write(rel, shell({rel, lang: 'en', dir: 'ltr', title, desc, indexable: true, alternates: [{lang: 'en', rel}], graph, body}), {market: 'hub', locale: 'en', variant: 'hub', indexable: true});
}

for (const m of data.markets) renderMarket(m);
renderPK(); renderPKur(); renderHub();

/* sitemap of indexable landing pages only (not yet referenced from sitemap.xml: add it there when the owner approves) */
const indexable = routes.filter(r => r.indexable).map(r => r.rel);
fs.writeFileSync(path.join(root, 'sitemap-landing.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${indexable.map(rel => { const r = routes.find(x => x.rel === rel), sibs = routes.filter(x => x.market === r.market && x.indexable); const alts = sibs.length > 1 ? sibs.map(x => `<xhtml:link rel="alternate" hreflang="${x.lang}" href="${ORIGIN}/${x.rel}/"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/${sibs[0].rel}/"/>` : ''; return `<url><loc>${ORIGIN}/${rel}/</loc>${alts}</url>`; }).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(root, 'data/landing/routes.json'), JSON.stringify({generator: 'tools/build-landing-pages.mjs', routes}, null, 2) + '\n');
console.log(JSON.stringify({pages: written.length, written, indexable}));
buildCampaignPages({shell,landingRoutes:routes});
