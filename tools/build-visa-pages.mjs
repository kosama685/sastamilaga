#!/usr/bin/env node
/**
 * Visa guides: one page per destination (/visa/<country>/), nine visa-type guides (/visa/guides/<type>/), a guides index,
 * the server-rendered directory shown under the /visa/ tool (data/visa/hub.html, inserted by tools/build-sections.mjs)
 * and sitemap-visa.xml.
 *
 * Facts used: entry status for Pakistani passports from data/visa/pk-requirements.json (passport-index-dataset, dated),
 * Schengen/GCC membership and regions, official portals that answered tools/check-visa-links.mjs, and the curated investment list in
 * tools/visa-content.mjs. No fees, processing times or investment amounts are published.
 * Usage: node tools/build-visa-pages.mjs   (after node tools/check-visa-links.mjs)
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SCHENGEN, GCC, REGION, REGIONS, NAME_OVERRIDES, PORTALS, SCHENGEN_INFO, PK_BEOE, NUSUK, INVESTMENT, TYPES, GUIDES} from './visa-content.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://sastamilaga.com', WA = '966510451995';
const rd = p => fs.readFileSync(path.join(root, p), 'utf8').replace(/^﻿/, '');
const DATA = JSON.parse(rd('data/visa/pk-requirements.json'));
const LINKS = fs.existsSync(path.join(root, 'data/visa/link-check.json')) ? JSON.parse(rd('data/visa/link-check.json')).results : {};
export const okLink = u => !!(u && LINKS[u] && LINKS[u].ok);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const regionNames = new Intl.DisplayNames(['en'], {type: 'region'});
export const nameOf = code => NAME_OVERRIDES[code] || regionNames.of(code) || code;
const MONTH = d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', {month: 'long', year: 'numeric', timeZone: 'UTC'});
const DATA_MONTH = MONTH(DATA.dataDate);
const TODAY = new Date().toISOString().slice(0, 10);
/* Country-code badge instead of flag emoji: Windows does not draw flag emoji and showed bare letters. */
const flag = code => `<span class="sv-cc" aria-hidden="true">${code}</span>`;
const jsonSafe = o => JSON.stringify(o).replace(/</g, '\\u003c');

/* ---- entry status for Pakistani passports ---- */
export function status(raw) {
  const v = String(raw || '').trim().toLowerCase();
  if (/^\d+$/.test(v)) return {key: 'free', tone: 'ok', label: `Visa-free up to ${v} days`, sentence: `can enter without a visa for up to ${v} days`, first: 'Check the entry conditions'};
  if (v === 'visa free') return {key: 'free', tone: 'ok', label: 'Visa-free', sentence: 'can enter without a visa', first: 'Check the entry conditions'};
  if (v === 'e-visa') return {key: 'evisa', tone: 'ok', label: 'e-Visa', sentence: 'can apply online for an electronic visa (e-Visa) before travel', first: 'Apply online for the e-Visa'};
  if (v === 'eta') return {key: 'eta', tone: 'ok', label: 'Electronic travel authorisation', sentence: 'need an electronic travel authorisation (ETA) before travel', first: 'Apply online for the travel authorisation'};
  if (v === 'visa on arrival') return {key: 'voa', tone: 'warn', label: 'Visa on arrival', sentence: 'can get a visa on arrival, subject to conditions at the border', first: 'Prepare documents for the visa on arrival'};
  if (v === 'no admission') return {key: 'none', tone: 'bad', label: 'Entry not permitted', sentence: 'were listed as not admitted', first: 'Do not plan travel on a Pakistani passport'};
  return {key: 'required', tone: 'bad', label: 'Visa required', sentence: 'need a visa before travel, applied for through the embassy, consulate or official visa centre', first: 'Book an embassy or visa-centre appointment'};
}

/* ---- destinations ---- */
export const COUNTRIES = Object.entries(DATA.requirements).map(([code, raw]) => ({code, raw, name: nameOf(code), slug: slugify(nameOf(code)), region: REGION[code] || 'Other destinations', st: status(raw)}))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
const bySlug = new Map(COUNTRIES.map(c => [c.slug, c]));
if (bySlug.size !== COUNTRIES.length) throw new Error('duplicate country slug');

/* ---- shared shell (same chrome as the rest of the site: chrome.js header/footer, static-bundle.css) ---- */
const ICON = {
  plane: '<path d="M2.5 13.5 21 6l-4.5 14-3.5-6-6-2.5z"/><path d="m13 14 3.5-3.5"/>', brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>', cap: '<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>', route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>', flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', shield: '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="m5 12 4.5 4.5L19 7"/>', doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  wa: '<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3a8.5 8.5 0 1 1 15.4-4.6Z"/>', warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'
};
const ic = (k, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ''}</svg>`;
const waLink = text => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

function shell({rel, title, desc, robots = 'index, follow, max-image-preview:large', body, graph}) {
  const url = `${SITE}/${rel}`;
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Sasta Milaga"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0F7A3B">
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/host-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/theme/static-bundle.css">
<link rel="stylesheet" href="/assets/css/visa.css?v=20261121">
<script type="application/ld+json">${jsonSafe({'@context': 'https://schema.org', '@graph': graph})}</script>
</head>
<body class="sm-static sm-page-static sv-page">
<div id="sm-chrome-header" data-prefix="/"><header class="sm-fallback-head"><a href="/"><img src="/assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div>
<main id="main" class="sm-main"><div class="sv">
${body}
</div></main>
<div id="sm-chrome-footer"></div>
<script src="/assets/js/chrome.js" defer></script>
<script src="/assets/js/visa-guide.js?v=20261121" defer></script>
</body>
</html>
`;
}
const crumbs = items => `<nav class="sv-crumbs" aria-label="Breadcrumb">${items.map(([n, h], i) => i === items.length - 1 ? `<span aria-current="page">${esc(n)}</span>` : `<a href="${h}">${esc(n)}</a>`).join(' <span aria-hidden="true">/</span> ')}</nav>`;
const crumbLd = items => ({'@type': 'BreadcrumbList', itemListElement: items.map(([name, h], i) => ({'@type': 'ListItem', position: i + 1, name, item: SITE + h}))});
const faqHtml = faq => `<section class="sv-card sv-faq" id="faq"><h2>${ic('doc')} Frequently asked questions</h2>${faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
const faqLd = faq => ({'@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({'@type': 'Question', name: q, acceptedAnswer: {'@type': 'Answer', text: a}}))});
const steps = list => `<ol class="sv-steps">${list.map(([t, d], i) => `<li><span class="sv-steps__n" aria-hidden="true">${i + 1}</span><div><h3>${esc(t)}</h3><p>${esc(d)}</p></div></li>`).join('')}</ol>`;
const checklist = list => `<ul class="sv-check" role="list">${list.map(x => `<li>${ic('check', 18)}<span>${esc(x)}</span></li>`).join('')}</ul>`;
const ctaBand = (text, label = 'Check my documents on WhatsApp') => `<section class="sv-cta"><div><h2>Not sure which visa or document you need?</h2><p>Send your destination and visa type. We check your documents first, free. Visa decisions belong to the embassy; nobody can guarantee approval.</p></div><a class="sv-btn sv-btn--wa" href="${esc(waLink(text))}" target="_blank" rel="noopener">${ic('wa', 20)} ${label}</a></section>`;

/* ---- country page ---- */
function regionBlock(c) {
  const n = c.name;
  if (c.code === 'KE') return {title: 'Kenya eTA and immigration permissions', paras: ['For ordinary short visits, check eligibility and apply through the official Kenya eTA portal. An eTA authorises travel; immigration officers determine the permitted stay on arrival.', 'Work, study and longer-term residence require the appropriate permits or passes; an eTA alone is not permission to work or study.'], link: ['https://immigration.go.ke/work-permits-and-passes/', 'Kenya Directorate of Immigration Services: permits and passes']};
  if (SCHENGEN.has(c.code)) return {title: `${n} and the Schengen visa`, paras: [`${n} is part of the Schengen area. A short-stay Schengen visa (type C) issued by ${n} is valid for travel across all Schengen countries for up to 90 days in any 180-day period.`, `Apply to ${n}'s consulate or its official visa centre if ${n} is your main destination (where you spend the most days), or your first point of entry when stays are equal. Travel medical insurance with at least €30,000 cover for the whole Schengen area is mandatory.`, `Stays longer than 90 days, for work, study or family, need a national (type D) visa or residence permit from ${n} itself.`], link: okLink(SCHENGEN_INFO) ? [SCHENGEN_INFO, 'European Commission: Schengen area'] : null};
  if (GCC.has(c.code)) return {title: `How visas work in ${n}`, paras: [`${n} is a Gulf Cooperation Council (GCC) country. Visit visas are often issued electronically, through the official portal, airlines, hotels or a sponsor.`, `Work and long-term residence are sponsor-based: an employer or family sponsor applies, you complete a GCC-approved medical test (booked through the Wafid system, formerly GAMCA), and you receive a residence permit after arrival.`, ...(c.code === 'SA' ? ['Umrah and Hajj have their own procedures. Umrah visas and permits are arranged through the official Nusuk platform or an approved travel provider.'] : [])], link: c.code === 'SA' && okLink(NUSUK) ? [NUSUK, 'Nusuk (official Umrah platform)'] : null};
  if (['GB', 'IE', 'US', 'CA', 'AU', 'NZ'].includes(c.code)) return {title: `How visas work in ${n}`, paras: [`${n} runs its visa system online: you create an account on the official government portal, apply and pay there, then give fingerprints and a photo at an official visa application centre${c.code === 'US' ? ' and attend an interview at the US embassy or consulate' : ''}.`, `Decisions rest on strong, consistent evidence: funds that match your income, a clear purpose, and ties that bring you back. Previous travel and previous refusals matter.`]};
  if (c.region === 'Caribbean') return {title: `Travelling to ${n}`, paras: [`Many Caribbean countries offer visa-free entry or simple online authorisations, but rules differ island by island and change often. Your route also matters: transit through the US, UK or Canada needs the right visa or authorisation for that country.`]};
  return {title: `How to get a ${n} visa`, paras: [`For ${n} you apply ${c.st.key === 'evisa' ? 'online for the e-Visa, or through the embassy for longer stays and other purposes' : c.st.key === 'voa' ? 'on arrival for short visits where conditions allow, or in advance through the embassy for other purposes' : c.st.key === 'free' ? 'only for stays beyond the visa-free period or for work, study or residence' : 'through the embassy, consulate or official visa centre that covers Pakistan'}. Work, study and residence always need the matching visa from ${n}'s authorities.`]};
}
function workText(c) {
  const n = c.name;
  if (c.code === 'KE') return 'Employment in Kenya requires the applicable work permit. Check the employment permit class and submit the required documents through the official eFNS portal. Verify the employer and the permit before working.';
  if (GCC.has(c.code)) return `An employer in ${n} sponsors your work visa and residence permit. Expect a signed contract, attested degrees, a police certificate and a GCC-approved medical test.`;
  if (c.code === 'GB') return 'Most UK work visas, such as the Skilled Worker visa, need a job offer from an employer licensed by the Home Office to sponsor workers, who issues a Certificate of Sponsorship.';
  if (c.code === 'US') return 'Most US work visas start with a petition filed by the employer with USCIS (for example H-1B or L-1); you then apply for the visa at the embassy. Some categories have annual caps.';
  if (c.code === 'CA') return 'Canadian work permits are usually employer-specific and may need a Labour Market Impact Assessment, or come through permanent-residence routes such as Express Entry and the provincial nominee programmes.';
  if (c.code === 'AU') return 'Australian work visas are mostly employer-sponsored or skilled points-based; occupation lists and skills assessments apply.';
  if (SCHENGEN.has(c.code)) return `To work in ${n} you need a job offer and a national work visa or work-and-residence permit from ${n}. A Schengen visit visa never allows work.`;
  return `To work in ${n} you normally need a job offer and an employer-arranged work permit, followed by a work visa. Check the official rules and verify the employer.`;
}
function studyText(c) {
  if (c.code === 'KE') return 'Students admitted to an institution in Kenya must check and obtain the appropriate student pass. Apply through eFNS using the current official student-pass checklist.';
  if (c.code === 'GB') return 'UK student visas need an unconditional offer and a Confirmation of Acceptance for Studies (CAS) from a licensed sponsor, plus proof of funds and English level.';
  if (c.code === 'US') return 'US study starts with an I-20 from a SEVP-certified school, payment of the SEVIS fee and an F-1 visa interview.';
  if (c.code === 'CA') return 'A Canadian study permit needs a letter of acceptance from a designated learning institution, proof of funds and any provincial documents currently required.';
  if (c.code === 'AU') return 'An Australian student visa (subclass 500) needs a Confirmation of Enrolment (CoE), health insurance (OSHC) and proof of funds and English level.';
  return `Study in ${c.name} needs admission to a recognised institution, proof of funds and usually a language test, followed by a student visa or residence permit.`;
}
function countryPage(c, all) {
  const rel = `visa/${c.slug}/`, n = c.name, st = c.st;
  const portal = okLink(PORTALS[c.code]) ? PORTALS[c.code] : null;
  const progs = INVESTMENT[c.code] || [];
  const rb = regionBlock(c), ke = c.code === 'KE';
  const answer = ke ? 'Ordinary Pakistani passport holders visiting Kenya generally need an approved electronic travel authorisation (eTA) before departure, unless an official exemption applies. Check your circumstances on the official eligibility portal. Admission remains subject to immigration checks.' : `Pakistani passport holders ${st.sentence} for ${n}, according to the last published data (${DATA_MONTH}). Rules change: confirm with ${portal ? 'the official portal' : `the embassy of ${n}`} before you travel.`;
  const visitSteps = ke ? [
    ['Check eTA eligibility', 'Use the official Kenya eTA eligibility information to check your passport, purpose and any exemption.'],
    ['Check your passport', 'The official checklist requires at least six months of validity from planned arrival and at least one blank page.'],
    ['Prepare the online application', 'Gather your photo, contact details, itinerary, accommodation and purpose-specific supporting documents.'],
    ['Submit on the official portal', 'Complete the online form and pay using a supported payment method. Check the current amount on the official portal.'],
    ['Wait for the decision', 'Do not treat a submitted application as approved. Check the official status and any requests for additional documents.'],
    ['Check your approved eTA before travel', 'Confirm the details and validity. The immigration officer determines the permitted stay on arrival.']
  ] : [
    [st.first, st.key === 'evisa' ? `Use ${n}'s official e-Visa portal only. Third-party sites charge extra and some are scams.` : st.key === 'voa' ? `Carry the documents below; officers decide at the border and may refuse entry.` : st.key === 'free' ? `Check passport validity, onward ticket, funds and any registration rules for ${n}.` : st.key === 'none' ? `The last published data lists Pakistani passports as not admitted. Do not book until you have confirmed the current position officially.` : `Find the embassy, consulate or official visa centre that handles applications from Pakistan and book the earliest suitable date.`],
    ['Check your passport', 'At least six months of validity beyond your trip and blank pages are commonly required.'],
    ['Prepare the documents', `Follow the checklist below; every document should support the same purpose, budget and return plan.`],
    ['Submit and pay the fee', portal ? 'Apply and pay on the official portal, then upload or present your documents.' : 'Submit at the embassy or official visa centre and keep the receipt.'],
    ['Biometrics or interview', 'Bring originals and answer consistently with your documents.'],
    ['Check the visa and travel', 'Verify names, dates, entries and allowed stay before you fly.']
  ];
  const visitDocs = ke ? ['Passport valid for at least six months after planned arrival, with at least one blank page','Passport-type photo or selfie','Email address, telephone and contact information','Arrival and departure itinerary','Accommodation booking or host information','Supported payment method','Purpose-specific evidence when requested, such as business or family invitation and vaccination documentation'] : [...GUIDES['visit-visa'].docs.slice(0, 7), ...(SCHENGEN.has(c.code) ? [`Travel medical insurance with at least €30,000 cover, valid across the Schengen area`] : ['Travel insurance for the whole stay (recommended, mandatory in some countries)']), 'Polio vaccination certificate, required for travellers leaving Pakistan'];
  const kindsKnown = new Set(progs.map(p => p.kind));
  const cards = TYPES.map(t => {
    let note = t.blurb;
    if (t.slug === 'residence-by-investment') note = kindsKnown.has('residence') ? 'Programme information below' : 'No programme we know of';
    if (t.slug === 'citizenship-by-investment') note = kindsKnown.has('citizenship') ? 'Programme information below' : 'No programme we know of';
    const anchor = {'visit-visa': '#visit', 'work-visa': '#work', 'study-visa': '#study', 'residence-by-investment': '#investment', 'citizenship-by-investment': '#investment'}[t.slug];
    return `<a class="sv-type" href="${anchor || `/visa/guides/${t.slug}/`}">${ic(t.icon)}<b>${esc(n)} ${esc(t.short.toLowerCase())}</b><small>${esc(note)}</small></a>`;
  }).join('');
  const progHtml = progs.length ? `<div class="sv-progs">${progs.map(p => `<article class="sv-prog sv-prog--${p.status}"><span class="sv-badge sv-badge--${p.status}">${p.status === 'open' ? 'Running at last review' : p.status === 'closed' ? 'Closed' : 'Check current status'}</span><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p><p class="sv-small">${p.kind === 'citizenship' ? 'Citizenship' : 'Residence'} route.${okLink(p.url) ? ` <a href="${esc(p.url)}" target="_blank" rel="noopener">Official information</a>` : ' Confirm the current rules with the government authority.'}</p></article>`).join('')}</div>`
    : `<p>We are not aware of a residence- or citizenship-by-investment programme for ${esc(n)}. Long-term residence here usually follows work, study or family routes. See our guides to <a href="/visa/guides/residence-by-investment/">residence by investment</a> and <a href="/visa/guides/citizenship-by-investment/">citizenship by investment</a> for countries that offer them.</p>`;
  const neighbours = all.filter(x => x.region === c.region && x.code !== c.code).slice(0, 12);
  const faq = [
    [`Do Pakistanis need a visa for ${n}?`, answer],
    [`How do I apply for a ${n} visit visa from Pakistan?`, ke ? 'Check eligibility, prepare the official eTA checklist, apply online and wait for approval before travel. Extra documents may depend on your reason for visiting.' : `${visitSteps[0][0]}, check your passport, prepare bank statements, an employment or business letter, bookings and travel insurance, then submit ${portal ? 'online on the official portal' : 'at the embassy or official visa centre'} and attend biometrics or an interview if asked.`],
    [`Can I get a ${n} work visa from Pakistan?`, workText(c) + (ke ? ' Check the current Pakistani protector-clearance requirements with the Bureau of Emigration & Overseas Employment before departure.' : ' Pakistani workers also need protector clearance from the Bureau of Emigration & Overseas Employment before departure.')],
    [`Does ${n} offer residence or citizenship by investment?`, progs.length ? `Known routes: ${progs.map(p => `${p.name} (${p.status === 'closed' ? 'closed' : p.status === 'open' ? 'running at our last review' : 'check current status'})`).join('; ')}. Programmes change often; confirm with the official authority.` : `We are not aware of an investment programme for ${n}. Residence usually follows work, study or family routes.`],
    [`How long does a ${n} visa take?`, `Processing time depends on the visa type, the season and your documents. Apply as early as allowed and check the current estimate ${portal ? 'on the official portal' : 'with the embassy'}.`],
    ['Can Sasta Milaga guarantee my visa?', 'No. Visa decisions belong to the embassy or immigration authority. We help you prepare a complete, consistent application and check your documents first.']
  ];
  const tone = {ok: 'ok', warn: 'warn', bad: 'bad'}[st.tone];
  const body = `${crumbs([['Home', '/'], ['Visa', '/visa/'], [`${n} visa`, '/' + rel]])}
<header class="sv-hero">
 <div class="sv-hero__main">
  <span class="sv-eyebrow">${esc(c.region)} · Visa guide</span>
  <h1>${flag(c.code)} ${esc(n)} visa for Pakistani passport holders</h1>
  <p class="sv-lead">Visit, business, work, study, family and investment routes for ${esc(n)}: who needs what, the documents, and the steps in order.</p>
  <div class="sv-actions"><a class="sv-btn sv-btn--wa" href="${esc(waLink(`Assalam o Alaikum! Please check visa requirements for me.\nDestination: ${n}\nPassport: Pakistan\n${SITE}/${rel}`))}" target="_blank" rel="noopener">${ic('wa', 20)} Check my documents on WhatsApp</a>${portal ? `<a class="sv-btn sv-btn--ghost" href="${esc(portal)}" target="_blank" rel="noopener">${ic('globe', 20)} Official visa portal</a>` : ''}</div>
 </div>
 <aside class="sv-status sv-status--${tone}" aria-label="Entry status">
  <span class="sv-status__k">Pakistani passport</span>
  <strong>${esc(st.label)}</strong>
  <span class="sv-status__d">Last published status, ${esc(DATA_MONTH)}${ke ? ' · Official eTA guidance checked 25 November 2026' : ''}</span>
  <a href="#source">How we know this</a>
 </aside>
</header>
<section class="sv-answer" id="answer"><h2>Quick answer: do Pakistanis need a visa for ${esc(n)}?</h2><p>${esc(answer)}</p></section>
<section class="sv-card"><h2>${ic('doc')} Which ${esc(n)} visa do you need?</h2><div class="sv-types">${cards}</div></section>
<section class="sv-card"><h2>${ic('globe')} ${esc(rb.title)}</h2>${rb.paras.map(p => `<p>${esc(p)}</p>`).join('')}${rb.link ? `<p><a href="${esc(rb.link[0])}" target="_blank" rel="noopener">${esc(rb.link[1])}</a></p>` : ''}</section>
<section class="sv-card" id="visit"><h2>${ic('plane')} ${esc(n)} visit visa: step by step</h2>${steps(visitSteps)}</section>
<section class="sv-grid2">
 <div class="sv-card"><h2>${ic('check')} Documents checklist for a ${esc(n)} visit visa</h2>${checklist(visitDocs)}<p class="sv-small">${ke ? 'Check the current <a href="https://etakenya.go.ke/form/apply/how-to-apply" target="_blank" rel="noopener">official Kenya eTA checklist</a> for your purpose of travel. General guidance:' : 'The embassy may ask for more. Full guide:'} <a href="/visa/guides/visit-visa/">visit visa guide</a>.</p></div>
 <div class="sv-card sv-tips"><h2>${ic('warn')} Avoid refusal</h2>${checklist(ke ? ['Use the official application portal and keep your reference.','Enter accurate passport, itinerary and contact details.','Submit genuine supporting documents and respond to official requests.','Confirm approval and travel eligibility before departing.'] : GUIDES['visit-visa'].tips)}</div>
</section>
<section class="sv-grid2">
 <div class="sv-card" id="work"><h2>${ic('tool')} ${esc(n)} work visa</h2><p>${esc(workText(c))}</p><p>${ke ? 'Apply through <a href="https://fns.immigration.go.ke/" target="_blank" rel="noopener">official eFNS</a>. Check current Pakistani protector-clearance requirements with the Bureau of Emigration & Overseas Employment before departure.' : 'From Pakistan, register and obtain protector clearance with the Bureau of Emigration & Overseas Employment before departure, ideally through a licensed Overseas Employment Promoter.'}${okLink(PK_BEOE) ? ` <a href="${PK_BEOE}" target="_blank" rel="noopener">Bureau of Emigration</a>` : ''}</p><p><a href="/visa/guides/work-visa/">Work visa guide, step by step</a></p></div>
 <div class="sv-card" id="study"><h2>${ic('cap')} ${esc(n)} study visa</h2><p>${esc(studyText(c))}${ke ? ' <a href="https://immigration.go.ke/students-pass/" target="_blank" rel="noopener">Official student-pass requirements</a>.' : ''}</p><p><a href="/visa/guides/study-visa/">Student visa guide, step by step</a></p></div>
</section>
<section class="sv-card" id="investment"><h2>${ic('key')} ${esc(n)} residence and citizenship by investment</h2>${progHtml}<p class="sv-small">Investment programmes open, change and close often. We do not publish amounts; always confirm the current rules and costs with the official authority and a licensed adviser.</p></section>
<section class="sv-card"><h2>${ic('home')} Family, business and transit visas for ${esc(n)}</h2><ul class="sv-links"><li><a href="/visa/guides/family-visa/">Joining family in ${esc(n)}: family visa guide</a></li><li><a href="/visa/guides/business-visa/">Meetings and conferences: business visa guide</a></li><li><a href="/visa/guides/transit-visa/">Changing flights: transit visa guide</a></li><li><a href="/visa/guides/permanent-residence/">Settling long term: permanent residence guide</a></li></ul></section>
${faqHtml(faq)}
${neighbours.length ? `<section class="sv-card"><h2>${ic('globe')} More ${esc(c.region)} visa guides</h2><ul class="sv-chips">${neighbours.map(x => `<li><a href="/visa/${x.slug}/">${flag(x.code)} ${esc(x.name)}</a></li>`).join('')}</ul></section>` : ''}
<section class="sv-source" id="source"><h2>Sources and how to use this page</h2><p>Entry status for Pakistani passports comes from the public <a href="${esc(DATA.sourceUrl)}" target="_blank" rel="noopener">passport-index dataset</a> (MIT licence), last updated ${esc(DATA_MONTH)}. Visa rules change without notice, so treat it as a starting point and confirm with ${portal ? `the <a href="${esc(portal)}" target="_blank" rel="noopener">official portal</a> or ` : ''}the embassy of ${esc(n)} before booking. ${ke ? 'Short-visit eTA, employment permit and student-pass guidance checked against the linked official sources on 25 November 2026. The historical dataset is not the authority for current eligibility. Other visa categories still require individual confirmation.' : `Guidance on this page was reviewed ${esc(MONTH(TODAY))}.`} Sasta Milaga is not a government agency and cannot guarantee any visa.</p></section>
${ctaBand(`Assalam o Alaikum! Please check visa requirements for me.\nDestination: ${n}\nPassport: Pakistan\n${SITE}/${rel}`)}`;
  const title = `${n} Visa for Pakistanis: Visit, Work, Study & Investment Guide | Sasta Milaga`;
  const desc = ke ? 'Kenya visa guide for Pakistani passport holders: check eTA eligibility, the official application checklist, work permits and student passes before travel.' : `${n} visa for Pakistani passport holders: ${st.label.toLowerCase()} (last published ${DATA_MONTH}). Step-by-step visit, work, study, family and investment routes, documents checklist and FAQ.`;
  const graph = [{'@type': 'WebPage', '@id': `${SITE}/${rel}#webpage`, url: `${SITE}/${rel}`, name: title, description: desc, inLanguage: 'en', dateModified: TODAY, about: {'@type': 'Country', name: n}}, crumbLd([['Home', '/'], ['Visa', '/visa/'], [`${n} visa`, '/' + rel]]), faqLd(faq)];
  return {rel, html: shell({rel, title, desc, body, graph})};
}

/* ---- guide pages ---- */
function guidePage(t) {
  const g = GUIDES[t.slug], rel = `visa/guides/${t.slug}/`;
  const kind = t.slug === 'residence-by-investment' ? 'residence' : t.slug === 'citizenship-by-investment' ? 'citizenship' : null;
  let extra = '';
  if (kind) {
    const rows = COUNTRIES.flatMap(c => (INVESTMENT[c.code] || []).filter(p => p.kind === kind).map(p => ({c, p})));
    extra = `<section class="sv-card"><h2>${ic('globe')} Countries with known ${kind === 'residence' ? 'residence' : 'citizenship'}-by-investment routes</h2><p class="sv-small">Status as we last reviewed it. Programmes change often; open the country guide and confirm with the official authority.</p><div class="sv-progs">${rows.map(({c, p}) => `<article class="sv-prog sv-prog--${p.status}"><span class="sv-badge sv-badge--${p.status}">${p.status === 'open' ? 'Running at last review' : p.status === 'closed' ? 'Closed' : 'Check current status'}</span><h3><a href="/visa/${c.slug}/#investment">${flag(c.code)} ${esc(c.name)}</a></h3><p><b>${esc(p.name)}.</b> ${esc(p.note)}</p></article>`).join('')}</div></section>`;
  } else {
    extra = `<section class="sv-card"><h2>${ic('globe')} ${esc(t.short)} guides by country</h2><p class="sv-small">Open a country for its entry status, official portal and country-specific steps.</p><ul class="sv-chips sv-chips--dense">${COUNTRIES.map(c => `<li><a href="/visa/${c.slug}/${t.slug === 'work-visa' ? '#work' : t.slug === 'study-visa' ? '#study' : t.slug === 'visit-visa' ? '#visit' : ''}">${flag(c.code)} ${esc(c.name)}</a></li>`).join('')}</ul></section>`;
  }
  const body = `${crumbs([['Home', '/'], ['Visa', '/visa/'], ['Guides', '/visa/guides/'], [t.short, '/' + rel]])}
<header class="sv-hero sv-hero--guide"><div class="sv-hero__main"><span class="sv-eyebrow">Visa guide</span><h1>${esc(g.h1)}</h1><p class="sv-lead">${esc(g.intro)}</p><div class="sv-actions"><a class="sv-btn sv-btn--wa" href="${esc(waLink(`Assalam o Alaikum! I need help with a ${t.short.toLowerCase()}.\n${SITE}/${rel}`))}" target="_blank" rel="noopener">${ic('wa', 20)} Ask our team</a><a class="sv-btn sv-btn--ghost" href="/visa/">${ic('globe', 20)} Choose a country</a></div></div><div class="sv-hero__icon" aria-hidden="true">${ic(t.icon, 96)}</div></header>
<section class="sv-card"><h2>${ic('doc')} Step by step</h2>${steps(g.steps)}</section>
<section class="sv-grid2"><div class="sv-card"><h2>${ic('check')} Documents you will usually need</h2>${checklist(g.docs)}</div><div class="sv-card sv-tips"><h2>${ic('warn')} Tips and warnings</h2>${checklist(g.tips)}</div></section>
${extra}
${faqHtml(g.faq)}
<section class="sv-card"><h2>${ic('doc')} Other visa guides</h2><div class="sv-types">${TYPES.filter(x => x.slug !== t.slug).map(x => `<a class="sv-type" href="/visa/guides/${x.slug}/">${ic(x.icon)}<b>${esc(x.short)}</b><small>${esc(x.blurb)}</small></a>`).join('')}</div></section>
${ctaBand(`Assalam o Alaikum! I need help with a ${t.short.toLowerCase()}.\n${SITE}/${rel}`, 'Ask our team on WhatsApp')}`;
  const title = `${g.title} | Sasta Milaga`, desc = g.intro.slice(0, 155).replace(/\s+\S*$/, '') + '…';
  const graph = [{'@type': 'WebPage', '@id': `${SITE}/${rel}#webpage`, url: `${SITE}/${rel}`, name: title, description: desc, inLanguage: 'en', dateModified: TODAY}, crumbLd([['Home', '/'], ['Visa', '/visa/'], ['Guides', '/visa/guides/'], [t.short, '/' + rel]]), faqLd(g.faq)];
  return {rel, html: shell({rel, title, desc, body, graph})};
}
function guidesIndex() {
  const rel = 'visa/guides/';
  const body = `${crumbs([['Home', '/'], ['Visa', '/visa/'], ['Guides', '/' + rel]])}
<header class="sv-hero sv-hero--guide"><div class="sv-hero__main"><span class="sv-eyebrow">Visa guides</span><h1>Visa guides: visit, work, study, family and investment</h1><p class="sv-lead">Plain-language, step-by-step guides for every common visa type, with document checklists and the mistakes that cause refusals. Then open your destination for country-specific steps.</p></div><div class="sv-hero__icon" aria-hidden="true">${ic('doc', 96)}</div></header>
<section class="sv-card"><div class="sv-types sv-types--big">${TYPES.map(t => `<a class="sv-type" href="/visa/guides/${t.slug}/">${ic(t.icon, 28)}<b>${esc(t.short)}</b><small>${esc(t.blurb)}</small></a>`).join('')}</div></section>
${ctaBand(`Assalam o Alaikum! I need help choosing the right visa.\n${SITE}/${rel}`)}`;
  const title = 'Visa Guides: Visit, Work, Study, Family & Investment Visas | Sasta Milaga', desc = 'Step-by-step visa guides for visit, business, work, study, family and transit visas, residence and citizenship by investment and permanent residence.';
  return {rel, html: shell({rel, title, desc, body, graph: [{'@type': 'CollectionPage', url: `${SITE}/${rel}`, name: title, description: desc}, crumbLd([['Home', '/'], ['Visa', '/visa/'], ['Guides', '/' + rel]])]})};
}

/* ---- directory for the /visa/ tool page (inserted after #app by build-sections) ---- */
export function hubHtml() {
  const groups = REGIONS.concat(['Other destinations']).map(r => [r, COUNTRIES.filter(c => c.region === r)]).filter(([, l]) => l.length);
  return `<section class="sv sv-hub" aria-labelledby="sv-hub-h">
<link rel="stylesheet" href="/assets/css/visa.css?v=20261121">
<div class="sv-card"><h2 id="sv-hub-h">${ic('doc')} Visa guides by type</h2><div class="sv-types">${TYPES.map(t => `<a class="sv-type" href="/visa/guides/${t.slug}/">${ic(t.icon)}<b>${esc(t.short)}</b><small>${esc(t.blurb)}</small></a>`).join('')}</div></div>
<div class="sv-card"><h2>${ic('globe')} Visa guides by country (${COUNTRIES.length} destinations)</h2><p class="sv-small">Entry status for Pakistani passports, last published ${esc(DATA_MONTH)}. Always confirm with the embassy or official portal.</p>
<label class="sv-filter"><span>Find a country</span><input type="search" data-sv-filter placeholder="Type a country, e.g. Dubai, UK, Türkiye" autocomplete="off"></label>
${groups.map(([r, list]) => `<div class="sv-region" data-sv-region><h3>${esc(r)}</h3><ul class="sv-dir">${list.map(c => `<li data-sv-name="${esc((c.name + ' ' + c.code).toLowerCase())}"><a href="/visa/${c.slug}/"><span class="sv-dir__name">${flag(c.code)} ${esc(c.name)}</span><span class="sv-pill sv-pill--${c.st.tone}">${esc(c.st.label)}</span></a></li>`).join('')}</ul></div>`).join('')}
</div>
<script src="/assets/js/visa-guide.js?v=20261121" defer></script>
</section>`;
}

function sitemap(rels) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rels.map(r => `<url><loc>${SITE}/${r}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`;
}

export function buildAll() {
  const pages = [guidesIndex(), ...TYPES.map(guidePage), ...COUNTRIES.map(c => countryPage(c, COUNTRIES))];
  return {pages, hub: hubHtml(), sitemap: sitemap(['visa/', ...pages.map(p => p.rel)])};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const {pages, hub, sitemap: sm} = buildAll();
  for (const p of pages) { const f = path.join(root, p.rel, 'index.html'); fs.mkdirSync(path.dirname(f), {recursive: true}); fs.writeFileSync(f, p.html); }
  fs.writeFileSync(path.join(root, 'data/visa/hub.html'), hub);
  fs.writeFileSync(path.join(root, 'sitemap-visa.xml'), sm);
  const idx = path.join(root, 'sitemap.xml'); let s = fs.readFileSync(idx, 'utf8');
  if (!s.includes('/sitemap-visa.xml</loc>')) { s = s.replace('</sitemapindex>', `<sitemap><loc>${SITE}/sitemap-visa.xml</loc></sitemap>\n</sitemapindex>`); fs.writeFileSync(idx, s); }
  console.log(JSON.stringify({countryPages: COUNTRIES.length, guidePages: TYPES.length + 1, sitemapUrls: pages.length + 1, officialLinksUsed: Object.values(PORTALS).filter(okLink).length}));
}
