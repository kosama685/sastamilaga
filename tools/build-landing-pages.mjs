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
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data/landing/markets.json'), 'utf8'));
const ORIGIN = data.siteOrigin, WA = data.whatsapp, FEE = data.pakistan.delivery_fee_pkr, FREE = data.pakistan.free_delivery_from_pkr;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const num = n => new Intl.NumberFormat('en-US').format(n);
const prefixFor = rel => '../'.repeat(rel.split('/').filter(Boolean).length);
const ROBOTS_ON = 'index, follow, max-image-preview:large', ROBOTS_OFF = 'noindex, follow';
const written = [];

function write(rel, html) {
  const file = path.join(root, rel, 'index.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, html);
  written.push(rel);
}

function shell({rel, lang, dir, title, desc, indexable, alternates, graph, body}) {
  const pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`;
  const hreflang = indexable && alternates.length
    ? alternates.map(a => `<link rel="alternate" hreflang="${a.lang}" href="${ORIGIN}/${a.rel}/">`).join('') + `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/${alternates[0].rel}/">` : '';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${indexable ? ROBOTS_ON : ROBOTS_OFF}">
<link rel="canonical" href="${url}">
${hreflang}
<meta property="og:type" content="website"><meta property="og:site_name" content="Sasta Milaga"><meta property="og:locale" content="${lang === 'ur' ? 'ur_PK' : 'en_PK'}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${ORIGIN}/assets/brand/og-default-1200x630.jpg">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}">
<meta name="theme-color" content="#0F7A3B">
<link rel="icon" href="${pre}assets/brand/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="${pre}assets/brand/apple-touch-icon.png">
<link rel="preload" href="${pre}assets/fonts/host-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${pre}assets/theme/static-bundle.css">
<link rel="stylesheet" href="${pre}assets/css/landing.css">
<script type="application/ld+json">${JSON.stringify({'@context': 'https://schema.org', '@graph': graph}).replace(/</g, '\\u003c')}</script>
</head>
<body class="sm-static sm-page-static">
<div id="sm-chrome-header" data-prefix="${pre}"><header class="sm-fallback-head"><a href="${pre}"><img src="${pre}assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<main id="main" class="sm-main"><div id="app" class="sm-app">
${body}
</div></main>
<div id="sm-chrome-footer"></div>
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

/* ---------------- International market page ---------------- */
function renderMarket(m) {
  const rel = `shipping-to/${m.slug}`, pre = prefixFor(rel), url = `${ORIGIN}/${rel}/`, nm = m.name, label = m.short || m.name;
  const title = `Shop global items for delivery to ${nm} | Sasta Milaga`;
  const desc = `Choose an item, check shipping and the full total for delivery to ${nm}, then pay by prepaid checkout. Taxes and duties are not included in the price.`;
  const faq = [
    [m.question, m.answer],
    ['How do I know the total before I pay?', `Sasta Milaga confirms the item option, quantity, shipping method and total with you before you pay. The price on a product page is an estimate in US dollars before shipping, taxes and duties.`],
    ['Can I return an item ordered for delivery to ' + nm + '?', 'Return eligibility depends on the item and the reason. Read the returns and refunds page before you order and ask us about a specific item if you are unsure.'],
    ['Is this page available in my language?', 'Not yet. Sasta Milaga publishes English and Urdu pages. Other-language pages will be added only after they are properly translated and reviewed.'],
    ['Do you list every product for ' + nm + '?', 'No. The global collection is a supplier catalogue. Whether a given item can be shipped to ' + nm + ' depends on the item, its option and the available shipping methods, so it is checked for your order.']
  ];
  const others = data.markets.filter(x => x.slug !== m.slug).map(x => [pre + 'shipping-to/' + x.slug + '/', 'Delivery to ' + (x.short || x.name)]);
  const graph = [pageSchema(title, desc, url, 'en'),
    crumbSchema([['Home', ORIGIN + '/'], ['Shipping by country', ORIGIN + '/shipping-to/'], [label, url]]), faqSchema(faq)];
  const body = `<div class="sml" dir="ltr"><div class="sml-wrap">
<nav class="sml-crumbs" aria-label="Breadcrumb"><a href="${pre}">Home</a> <span aria-hidden="true">&rsaquo;</span> <a href="${pre}shipping-to/">Shipping by country</a> <span aria-hidden="true">&rsaquo;</span> <span aria-current="page">${esc(label)}</span></nav>
<header class="sml-hero"><span class="sml-pill">Global collection &middot; ${esc(m.region)}</span>
<h1>Global items, delivered to ${esc(nm)}</h1>
<p class="sml-answer">${esc(m.intro)}</p>
<div class="sml-actions"><a class="sml-btn sml-btn--go" href="${pre}c/global/index.html">Browse the global collection</a><a class="sml-btn sml-btn--ghost" href="#order">Check my order</a></div></header>

<div class="sml-grid sml-grid--2">
<section class="sml-card" aria-labelledby="how"><h2 id="how">How an order to ${esc(label)} works</h2>
<ol class="sml-steps"><li><div><b>Choose the item and option</b>Pick the colour, size or model on the product page. Each option can differ in price and stock.</div></li>
<li><div><b>Check shipping to ${esc(label)}</b>Shipping depends on the option, quantity and your address. We confirm the method and cost with you.</div></li>
<li><div><b>Review the full total</b>You see item price, shipping and what is not included before you pay.</div></li>
<li><div><b>Pay by prepaid checkout</b>Global items are not cash on delivery. Nothing is ordered until your payment is confirmed.</div></li></ol></section>
<section class="sml-card" aria-labelledby="price"><h2 id="price">What you pay, and what is not included</h2>
<table class="sml-table"><tbody>
<tr><th scope="row">Item price</th><td>Estimate in US dollars on the product page; confirmed before you pay <span class="sml-chip sml-chip--ok">shown</span></td></tr>
<tr><th scope="row">Shipping</th><td>Quoted for your option, quantity and address <span class="sml-chip sml-chip--wait">confirmed with you</span></td></tr>
<tr><th scope="row">Delivery time</th><td>An estimate from the carrier, not a promise <span class="sml-chip sml-chip--wait">estimate only</span></td></tr>
<tr><th scope="row">Taxes and duties</th><td>Not included in our price <span class="sml-chip sml-chip--wait">you may owe more</span></td></tr>
<tr><th scope="row">Payment</th><td>Prepaid checkout; no cash on delivery</td></tr></tbody></table></section></div>

<section class="sml-card" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="tax"><h2 id="tax">Customs, taxes and product rules for ${esc(label)}</h2>
<p>${esc(m.tax)}</p><p>${esc(m.safety)}</p>
<p class="sml-note">This is general guidance, not legal or tax advice. Rules change; check the official source for your country.</p></section>

<section id="order" class="sml-card sml-order" style="margin-top:clamp(16px,2vw,26px)" aria-labelledby="orderh"><h2 id="orderh">Check your order before you send it</h2>
<p>Fill in what a supplier order needs. The button unlocks when the essentials are there, and opens WhatsApp with your details so we can confirm the shipping and total.</p>
<form id="sml-order" class="sml-form" novalidate>
<label>Product link or name<input name="product" type="text" required placeholder="Paste the product page link or type its name" autocomplete="off"></label>
<label>Option (colour, size, model)<input name="option" type="text" placeholder="For example: black, size 42"></label>
<label>Quantity<input name="quantity" type="number" min="1" max="99" value="1" inputmode="numeric"></label>
<label>Delivery country<select name="country"><option value="${esc(nm)}" selected>${esc(nm)}</option></select></label>
<label>Town or city, and postcode<input name="city" type="text" required placeholder="Used to quote shipping" autocomplete="address-level2"></label>
<label class="sml-check"><input name="tax" type="checkbox" required><span>I understand that taxes and duties may be charged in ${esc(label)} and are not included in the price.</span></label>
<label class="sml-check"><input name="paid" type="checkbox" required><span>I understand this is a prepaid order, not cash on delivery.</span></label>
<div class="sml-ready" data-ready data-ok="0"><i aria-hidden="true"></i><b role="status" aria-live="polite"></b></div>
<button class="sml-btn sml-btn--solid" type="submit" data-go disabled>Send my order details on WhatsApp</button></form></section>

<div class="sml-grid sml-grid--2" style="margin-top:clamp(16px,2vw,26px)">
<section class="sml-card" aria-labelledby="faq"><h2 id="faq">Questions about delivery to ${esc(label)}</h2>${faqHtml(faq)}</section>
<section class="sml-card" aria-labelledby="more"><h2 id="more">Keep reading</h2><p>Policies, guides and the rest of the global collection.</p>${chips(SHARED_LINKS(pre))}
<h3 style="margin-top:18px">Other destinations</h3>${chips(others.concat([[pre + 'pakistan/', 'Shopping in Pakistan']]))}</section></div>

<div class="sml-band"><div><b>Not sure an item can reach ${esc(label)}?</b><small>Send us the link. We check the options and shipping before you pay.</small></div><a class="sml-btn sml-btn--go" href="${pre}contact/">Contact Sasta Milaga</a></div>
</div></div>
${orderScript({required: ['product', 'quantity', 'city', 'tax', 'paid'], ready: 'Ready to send', notReady: 'Add the item, quantity, city and tick both confirmations',
    greeting: 'Assalam o Alaikum! I would like a shipping quote for a global item.',
    lines: [['Country', '@country'], ['Item', '@product'], ['Option', '@option'], ['Quantity', '@quantity'], ['City / postcode', '@city'], ['Taxes and duties understood', 'yes'], ['Payment', 'prepaid'], ['Page', '@url']]})}`;
  write(rel, shell({rel, lang: 'en', dir: 'ltr', title, desc, indexable: m.indexable, alternates: [{lang: 'en', rel}], graph, body}));
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
  write(rel, shell({rel, lang: 'en', dir: 'ltr', title, desc, indexable: true, alternates: [{lang: 'en', rel}, {lang: 'ur', rel: 'ur/pakistan'}], graph, body}));
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
  write(rel, shell({rel, lang: 'ur', dir: 'rtl', title, desc, indexable: true, alternates: [{lang: 'en', rel: 'pakistan'}, {lang: 'ur', rel}], graph, body}));
}

/* ---------------- Hub ---------------- */
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
<a class="sml-card" style="text-decoration:none" href="${pre}pakistan/"><h2>Pakistan</h2><p>Cash on delivery on local products. Rs ${num(FEE)} delivery, free from Rs ${num(FREE)}.</p></a>
${data.markets.map(x => `<a class="sml-card" style="text-decoration:none" href="${pre}shipping-to/${x.slug}/"><h2>${esc(x.short || x.name)}</h2><p>Global supplier items, prepaid checkout, shipping and total confirmed before you pay.</p></a>`).join('\n')}
</div>
<p class="sml-note" style="margin-top:18px">More countries are added only after delivery, payment and returns are checked for them.</p>
${chips(SHARED_LINKS(pre))}
</div></div>`;
  write(rel, shell({rel, lang: 'en', dir: 'ltr', title, desc, indexable: false, alternates: [], graph, body}));
}

for (const m of data.markets) renderMarket(m);
renderPK(); renderPKur(); renderHub();

/* sitemap of indexable landing pages only (not yet referenced from sitemap.xml: add it there when the owner approves) */
const indexable = ['pakistan', 'ur/pakistan', ...data.markets.filter(m => m.indexable).map(m => 'shipping-to/' + m.slug)];
fs.writeFileSync(path.join(root, 'sitemap-landing.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${indexable.map(r => `<url><loc>${ORIGIN}/${r}/</loc>${r.includes('pakistan') ? `<xhtml:link rel="alternate" hreflang="en" href="${ORIGIN}/pakistan/"/><xhtml:link rel="alternate" hreflang="ur" href="${ORIGIN}/ur/pakistan/"/>` : ''}</url>`).join('\n')}\n</urlset>\n`);
console.log(JSON.stringify({pages: written.length, written, indexable}));
