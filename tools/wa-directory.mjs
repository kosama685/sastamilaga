/* The "Phone and WhatsApp worldwide" directory: one component, two looks (footer band, contact page panel).
 * The 13 regional teams and numbers are the ones published on sastamilaga.com. build-sections.mjs inserts this into the footer
 * (index.html and partials/chrome.json) and into the contact page, so every page shows the same, current list. */
export const REGIONS = [
  { k: 'au',   name: 'Australia / New Zealand', flag: 'au', n: '61415183156',   t: '+61 415 183 156' },
  { k: 'us',   name: 'USA / Canada',            flag: 'us', n: '12817489768',   t: '+1 (281) 748-9768' },
  { k: 'uk',   name: 'United Kingdom',          flag: 'gb', n: '447846109263',  t: '+44 7846 109263' },
  { k: 'ie',   name: 'Ireland / Europe',        flag: 'eu', n: '353852228885',  t: '+353 85 222 8885' },
  { k: 'hr',   name: 'Croatia',                 flag: 'hr', n: '385953532432',  t: '+385 95 353 2432' },
  { k: 'it',   name: 'Italy',                   flag: 'it', n: '393454677458',  t: '+39 345 467 7458' },
  { k: 'sg',   name: 'Singapore',               flag: 'sg', n: '6580138554',    t: '+65 8013 8554' },
  { k: 'cn',   name: 'China',                   flag: 'cn', n: '8619563055191', t: '+86 195 6305 5191' },
  { k: 'af',   name: 'Botswana / Africa',       flag: 'bw', n: '26772228229',   t: '+267 72 228 229' },
  { k: 'in',   name: 'India',                   flag: 'in', n: '918128425068',  t: '+91 81284 25068' },
  { k: 'pk',   name: 'Pakistan',                flag: 'pk', n: '923432601806',  t: '+92 343 2601806' },
  { k: 'gulf', name: 'Gulf',                    flag: 'sa', n: '966510451995',  t: '+966 51 045 1995' },
  { k: 'eg',   name: 'Egypt',                   flag: 'eg', n: '201028377512',  t: '+20 10 28377512' },
];
const WA = '<svg class="smwa__wa" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3a8.5 8.5 0 1 1 15.4-4.6Z"/><path d="M9 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2 0 .4-.1.6l-.5.6c-.1.1-.2.3 0 .5.6 1 1.5 1.8 2.6 2.3.2.1.4 0 .5-.1l.6-.7c.2-.2.4-.2.6-.1l1.7.8c.3.1.4.3.3.6-.2.9-1 1.4-1.8 1.4-2.9-.2-5.8-3-6-5.9 0-.6.2-1.1.5-1.7Z"/></svg>';
const PH = '<svg class="smwa__ph" aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>';
const ARROW = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const MSG = encodeURIComponent('Assalam o Alaikum! I need help with my order.');

export function waDirectory(variant) {
  const id = `smwa-h-${variant}`;
  const cards = REGIONS.map(r => `<li class="smwa__card" data-region="${r.k}"><img class="smwa__flag" src="https://flagcdn.com/w40/${r.flag}.png" srcset="https://flagcdn.com/w80/${r.flag}.png 2x" width="30" height="20" alt="" loading="lazy" decoding="async"><div class="smwa__txt"><strong>${r.name}</strong><a class="smwa__num" href="tel:+${r.n}" dir="ltr">${PH}<span>${r.t}</span></a></div><a class="smwa__btn" href="https://wa.me/${r.n}?text=${MSG}" target="_blank" rel="noopener" aria-label="Message the ${r.name} team on WhatsApp, ${r.t}">${WA}<span>Message on WhatsApp</span>${ARROW}</a></li>`).join('');
  const head = `<div class="smwa__head"><span class="smwa__badge">${WA.replace('width="18" height="18"', 'width="30" height="30"')}</span><div><h2 id="${id}">Phone and WhatsApp <em>worldwide</em></h2><p>We work with clients in every country. Choose your regional team below, or send an enquiry for any city.</p></div></div>`;
  return variant === 'footer'
    ? `<section id="sasta-regional-footer" class="smwa smwa--footer" aria-labelledby="${id}" data-no-swap><div class="smh-wrap smwa__in">${head}<ul class="smwa__grid" role="list">${cards}</ul></div></section>`
    : `<section class="smwa smwa--page" aria-labelledby="${id}" data-no-swap>${head}<ul class="smwa__grid" role="list">${cards}</ul></section>`;
}

export const WA_CSS = `
/* Phone and WhatsApp worldwide (footer band + contact page) */
.smwa{--smwa-g:var(--sm-brand-green,#0F7A3B);--smwa-o:var(--sm-brand-orange,#FF8A00);--smwa-deep:var(--sm-brand-deep,#0B3B20);--smwa-light:var(--sm-brand-light,#EAF6EE);font-size:15px;line-height:1.5}
.smwa *{box-sizing:border-box}
.smwa__head{display:flex;align-items:center;gap:1rem;margin:0 0 1.25rem}
.smwa__badge{flex:none;display:grid;place-items:center;width:3.4rem;height:3.4rem;border-radius:50%;background:var(--smwa-g);color:#fff;box-shadow:0 6px 18px -6px rgba(15,122,59,.55),0 2px 4px rgba(11,59,32,.2)}
.smwa__head h2{margin:0;font-size:clamp(1.4rem,2.6vw,2rem);line-height:1.15;letter-spacing:-.03em;font-weight:800}
.smwa__head h2 em{font-style:normal;color:var(--smwa-o)}
.smwa__head p{margin:.3rem 0 0;max-width:62ch;opacity:.85}
.smwa__grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,235px),1fr));gap:.8rem}
.smwa__card{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"f t" "b b";gap:.55rem .75rem;align-items:center;padding:.9rem;border-radius:14px;transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s cubic-bezier(.22,1,.36,1)}
.smwa__flag{grid-area:f;width:30px;height:20px;border-radius:3px;object-fit:cover;box-shadow:0 0 0 1px rgba(0,0,0,.12)}
.smwa__txt{grid-area:t;min-width:0}
.smwa__txt strong{display:block;font-size:.95rem;font-weight:700;line-height:1.25}
.smwa__num{display:inline-flex;align-items:center;gap:.4rem;margin-top:.1rem;font-variant-numeric:tabular-nums;text-decoration:none;font-weight:500;color:inherit;opacity:.92}
.smwa__num:hover{text-decoration:underline}
.smwa__ph{flex:none;color:var(--smwa-g)}
.smwa__btn{grid-area:b;display:inline-flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.5rem .8rem;border-radius:999px;background:var(--smwa-g);color:#fff;font-size:.82rem;font-weight:600;text-decoration:none;transition:transform .3s cubic-bezier(.22,1,.36,1),background-color .2s}
.smwa__btn span{flex:1;text-align:left}
.smwa__btn:hover{background:#0c6531;transform:translateY(-1px)}
.smwa__btn:active{transform:translateY(0)}
.smwa a:focus-visible{outline:2px solid var(--smwa-o);outline-offset:2px}
.smwa__card.is-mine::after{content:"Your team";position:absolute;top:.55rem;right:.7rem;padding:.1rem .5rem;border-radius:999px;background:var(--smwa-o);color:#1d1200;font-size:.68rem;font-weight:700}
.smwa__card:hover{transform:translateY(-2px)}
/* footer band: deep theme green, glass cards */
.smwa--footer{position:relative;padding:2.2rem 0;color:#eaf6ee;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0)),radial-gradient(900px 260px at 8% 0,rgba(255,138,0,.10),transparent 60%);border-top:1px solid rgba(255,255,255,.12)}
.smwa--footer .smwa__head h2{color:#fff}
.smwa--footer .smwa__card{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);box-shadow:0 10px 24px -14px rgba(0,0,0,.6)}
.smwa--footer .smwa__card:hover{box-shadow:0 16px 30px -14px rgba(0,0,0,.7),0 0 0 1px rgba(255,138,0,.35)}
.smwa--footer .smwa__ph{color:#7fe0a6}
.smwa--footer .smwa__num{color:#fff}
/* contact page panel: light mint card, theme green */
.smwa--page{padding:clamp(1.1rem,3vw,2rem);margin:0 0 2rem;border-radius:20px;color:#14291d;background:radial-gradient(700px 220px at 100% 0,rgba(255,138,0,.10),transparent 60%),linear-gradient(180deg,#fff,var(--smwa-light));border:1px solid rgba(15,122,59,.18);box-shadow:0 24px 40px -28px rgba(11,59,32,.45),0 2px 6px rgba(11,59,32,.08)}
.smwa--page .smwa__head h2{color:var(--smwa-deep)}
.smwa--page .smwa__card{background:#fff;border:1px solid rgba(15,122,59,.14);box-shadow:0 10px 22px -16px rgba(11,59,32,.5)}
.smwa--page .smwa__card:hover{box-shadow:0 16px 28px -16px rgba(11,59,32,.55)}
/* specificity: the page and footer themes style links and h2 inside their containers */
.smwa .smwa__btn,.smwa .smwa__btn:visited{color:#fff;text-decoration:none}
.smwa .smwa__btn span{color:#fff;font-weight:600;text-transform:none;letter-spacing:0}
.smwa .smwa__head h2{text-transform:none;letter-spacing:-.03em;font-size:clamp(1.4rem,2.6vw,2rem);font-weight:800;line-height:1.15;margin:0;padding:0;border:0}
.smwa .smwa__head h2 em{color:var(--smwa-o);font-style:normal}
.smwa .smwa__txt strong{text-transform:none;letter-spacing:0}
.smwa--page .smwa__num,.smwa--page .smwa__num:visited{color:var(--smwa-deep)}
.smwa--page .smwa__head p{color:#355243}
.smwa--page .smwa__head h2{color:var(--smwa-deep)}
.smwa--footer .smwa__head h2,.smwa--footer .smwa__num,.smwa--footer .smwa__num:visited{color:#fff}
.smwa--footer .smwa__head p{color:#cfe6d8}
.smwa .smwa__num span{white-space:nowrap}
.smwa .smwa__btn svg,.smwa .smwa__num svg{display:inline-block;flex:none;width:16px;height:16px;stroke:currentColor;fill:none}
.smwa .smwa__btn svg{color:#fff}
@media (max-width:560px){
.smwa__head{align-items:flex-start}.smwa__badge{width:2.8rem;height:2.8rem}
.smwa__grid{grid-template-columns:1fr;gap:.55rem}
.smwa__card{grid-template-columns:auto 1fr auto;grid-template-areas:"f t b";padding:.7rem .8rem}
.smwa .smwa__btn{width:2.7rem;height:2.7rem;padding:0;justify-content:center;border-radius:50%}
.smwa .smwa__btn span,.smwa .smwa__btn svg:last-child{display:none}
.smwa .smwa__btn svg:first-child{width:20px;height:20px}
.smwa__card.is-mine::after{top:.35rem;right:3.7rem}
.smwa .smwa__num{font-size:.86rem}
}
@media (prefers-reduced-motion:reduce){.smwa__card,.smwa__btn{transition:none}.smwa__card:hover{transform:none}}
`;

