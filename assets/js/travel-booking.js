/* Sasta Milaga travel booking sheets, loaded on demand by assets/js/travel.js (no page markup needed).
 *
 *  SMTB.request(kind, payload, offer?)  "Get your best fare": trip + name / WhatsApp / email → POST sm-travel/v1/request.
 *                                        Works with no supplier key; the team replies with the price and a payment link.
 *  SMTB.book(offer, payload)            Live Duffel fare: GET booking/offer (fresh price, passenger slots, rules) → passenger
 *                                        form → POST booking/start → the WooCommerce order-pay page with the same PayPal /
 *                                        card buttons as the shop checkout.
 *  SMTB.config()                         GET booking/config: which mode the site is in (cached for 5 minutes).
 *
 * Button and link texts avoid the words the edge click guard swallows (checkout, pay now, PayPal, order now …).
 * All customer text is set with textContent; nothing from the network is parsed as HTML. */
(() => {
  if (window.SMTB) return;
  const T = window.SMTravel || {};
  const ROOT = (T.root || '/wp-json/sm-travel/v1/').replace(/\/?$/, '/');
  const HOURS = '9 AM to 9 PM Pakistan time, Monday to Saturday';
  const COUNTRIES = 'AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FK FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'.split(' ');

  /* ---------- tiny helpers ---------- */
  const h = (tag, props = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (k in n && typeof v !== 'string') n[k] = v; else n.setAttribute(k, v === true ? '' : String(v));
    }
    kids.flat().forEach(c => c !== null && c !== undefined && c !== false && n.append(c.nodeType ? c : document.createTextNode(String(c))));
    return n;
  };
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12));
  const money = (amount, cur) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 2 }).format(Number(amount)); } catch (_) { return `${cur || ''} ${amount}`; } };
  const day = d => { if (!d) return ''; const x = new Date(/T/.test(d) ? d : d + 'T12:00:00'); return Number.isNaN(x.getTime()) ? d : new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(x); };
  const clock = d => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(x); };
  const duration = iso => { const m = /PT?(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || ''); if (!m) return ''; const hrs = (Number(m[1] || 0) * 24) + Number(m[2] || 0); return [hrs ? hrs + 'h' : '', m[3] ? Number(m[3]) + 'm' : ''].filter(Boolean).join(' '); };
  const today = () => { const t = new Date(); return new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  const regionName = (() => { try { const dn = new Intl.DisplayNames([document.documentElement.lang || 'en', 'en'], { type: 'region' }); return c => dn.of(c) || c; } catch (_) { return c => c; } })();

  async function call(path, { method = 'GET', body = null, timeout = 30000 } = {}) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(ROOT + path, { method, signal: ctl.signal, headers: body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' }, body: body ? JSON.stringify(body) : null, credentials: 'omit' });
      let data = null; try { data = await r.json(); } catch (_) { /* non-JSON error page */ }
      if (!r.ok) { const e = new Error((data && data.message) || 'Something went wrong. Please try again.'); e.status = r.status; e.code = data && data.code; throw e; }
      return data;
    } catch (e) {
      if (e.name === 'AbortError') { const t = new Error('The connection is slow. Please try again.'); t.status = 0; throw t; }
      throw e;
    } finally { clearTimeout(timer); }
  }

  let cfgPromise = null;
  function config() {
    if (cfgPromise) return cfgPromise;
    cfgPromise = (async () => {
      try { const c = JSON.parse(sessionStorage.getItem('smtb-cfg') || 'null'); if (c && c.at > Date.now() - 300000) return c.v; } catch (_) { /* storage blocked */ }
      try {
        const v = await call('booking/config', { timeout: 6000 });
        try { sessionStorage.setItem('smtb-cfg', JSON.stringify({ at: Date.now(), v })); } catch (_) { /* storage blocked */ }
        return v;
      } catch (_) { cfgPromise = null; return { mode: 'request', search: false, booking: false, currencies: [] }; }
    })();
    return cfgPromise;
  }

  /* ---------- the sheet (native <dialog>, full screen on phones) ---------- */
  let dlg = null, lastFocus = null;
  function sheet(title) {
    if (!dlg) {
      dlg = h('dialog', { class: 'smtb', 'aria-labelledby': 'smtb-title' });
      dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
      dlg.addEventListener('close', () => { document.documentElement.classList.remove('smtb-lock'); if (lastFocus && lastFocus.focus) lastFocus.focus(); });
      document.body.append(dlg);
    }
    lastFocus = document.activeElement;
    const body = h('div', { class: 'smtb__body' });
    dlg.replaceChildren(h('div', { class: 'smtb__panel' },
      h('header', { class: 'smtb__head' }, h('h2', { id: 'smtb-title', text: title }), h('button', { type: 'button', class: 'smtb__x', 'aria-label': 'Close', onclick: close }, '×')),
      body));
    document.documentElement.classList.add('smtb-lock');
    if (!dlg.open) { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); }
    return body;
  }
  function close() { if (!dlg) return; if (typeof dlg.close === 'function' && dlg.open) dlg.close(); else { dlg.removeAttribute('open'); document.documentElement.classList.remove('smtb-lock'); } }

  const field = (label, input, hint) => h('label', { class: 'smtb-f' }, h('span', { class: 'smtb-f__l', text: label }), input, hint ? h('small', { class: 'smtb-f__h', text: hint }) : null);
  const honeypot = () => h('label', { class: 'smtb-hp', 'aria-hidden': 'true' }, 'Company', h('input', { name: 'company', tabindex: '-1', autocomplete: 'off' }));
  const status = () => h('p', { class: 'smtb-status', role: 'status', 'aria-live': 'polite' });
  const clearOnInput = (form, st) => form.addEventListener('input', () => { if (st.classList.contains('is-error')) { st.textContent = ''; st.classList.remove('is-error'); } });
  const busy = (btn, on, label) => { btn.disabled = on; btn.classList.toggle('is-busy', on); if (label) btn.textContent = label; };

  function tripSummary(kind, p) {
    const who = (() => { const a = Number(p.adults || 1), c = (p.ages || []).length; return `${a} adult${a > 1 ? 's' : ''}${c ? `, ${c} child${c > 1 ? 'ren' : ''}` : ''}`; })();
    if (kind === 'hotel') return [p.city_label || 'Hotel', `${day(p.departure)} – ${day(p.return)}`, `${who} · ${p.rooms || 1} room${Number(p.rooms) > 1 ? 's' : ''}`];
    const cabin = String(p.cabin || 'economy').replace('_', ' ');
    return [`${p.origin_label || p.origin} → ${p.destination_label || p.destination}`, p.return ? `${day(p.departure)} – ${day(p.return)}` : `${day(p.departure)} · one way`, `${who} · ${cabin.charAt(0).toUpperCase() + cabin.slice(1)}`];
  }

  /* ---------- 1) request: works with no API key ---------- */
  function request(kind, payload, offer) {
    const body = sheet(kind === 'hotel' ? 'Get the best hotel rate' : 'Get your best fare');
    const [l1, l2, l3] = tripSummary(kind, payload);
    const st = status();
    const name = h('input', { name: 'name', required: true, autocomplete: 'name', maxlength: '80' });
    const phone = h('input', { name: 'phone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', placeholder: '+92 300 1234567', maxlength: '22' });
    const email = h('input', { name: 'email', type: 'email', autocomplete: 'email', maxlength: '120', placeholder: 'you@example.com' });
    const notes = h('textarea', { name: 'notes', rows: '2', maxlength: '600', placeholder: kind === 'hotel' ? 'Area, budget, breakfast, near Haram…' : 'Flexible dates, preferred airline, extra baggage…' });
    const consent = h('input', { type: 'checkbox', name: 'consent', required: true });
    const send = h('button', { type: 'submit', class: 'smtb-btn smtb-btn--go', text: 'Send my request' });
    const key = uid();
    try { const saved = JSON.parse(localStorage.getItem('smtb-contact') || 'null'); if (saved) { name.value = saved.name || ''; phone.value = saved.phone || ''; email.value = saved.email || ''; } } catch (_) { /* storage blocked */ }
    const form = h('form', { class: 'smtb-form', novalidate: true },
      h('div', { class: 'smtb-trip' }, h('strong', { text: l1 }), h('span', { text: l2 }), h('span', { text: l3 }), offer && offer.summary ? h('span', { class: 'smtb-trip__fare', text: `Selected fare: ${offer.summary}${offer.price ? ' · ' + money(offer.price, offer.currency) : ''}` }) : null),
      h('p', { class: 'smtb-lead', text: 'Leave your details and our travel team sends you the confirmed price and a secure payment link on WhatsApp or email. Nothing is charged until you approve the price.' }),
      h('div', { class: 'smtb-grid' },
        field('Full name', name),
        field('WhatsApp or mobile number', phone, 'With country code, e.g. +92 or +966'),
        field('Email (optional)', email, 'For your quote, payment link and e-ticket'),
        field('Anything we should know? (optional)', notes)),
      h('label', { class: 'smtb-check' }, consent, h('span', {}, 'Sasta Milaga travel may contact me on WhatsApp, phone or email about this trip. ', h('a', { href: '/privacy/', target: '_blank', rel: 'noopener', text: 'Privacy policy' }))),
      honeypot(), st,
      h('div', { class: 'smtb-actions' }, send, h('small', { class: 'smtb-note', text: `We reply ${HOURS}.` })));
    form.addEventListener('submit', async e => {
      e.preventDefault(); st.textContent = ''; st.classList.remove('is-error');
      const bad = (msg, input) => { st.textContent = msg; st.classList.add('is-error'); if (input) input.focus(); };
      if (name.value.trim().length < 2) return bad('Please enter your name.', name);
      if (phone.value.replace(/\D/g, '').length < 9) return bad('Please enter your WhatsApp or mobile number with the country code.', phone);
      if (email.value.trim() && !email.checkValidity()) return bad('Please check your email address, or leave it empty.', email);
      if (!consent.checked) return bad('Please tick the box so our team can contact you.', consent);
      busy(send, true, 'Sending…');
      try {
        const res = await call('request', { method: 'POST', body: { ...payload, kind, name: name.value.trim(), phone: phone.value.trim(), email: email.value.trim(), notes: notes.value.trim(), consent: true, hp: form.elements.company.value, key, offer: offer || null } });
        try { localStorage.setItem('smtb-contact', JSON.stringify({ name: name.value.trim(), phone: phone.value.trim(), email: email.value.trim() })); } catch (_) { /* storage blocked */ }
        requestDone(res, kind);
      } catch (err) { busy(send, false, 'Send my request'); bad(err.message); }
    });
    clearOnInput(form, st);
    body.append(form);
    requestAnimationFrame(() => (name.value ? (phone.value ? send : phone) : name).focus());
  }

  function requestDone(res, kind) {
    const body = sheet('Request received');
    const steps = [
      kind === 'hotel' ? 'We check live hotel rates and availability for your dates.' : 'We check live fares and seats with the airlines.',
      `You receive the price and a secure payment link on WhatsApp${res.email ? ' and by email' : ''}.`,
      'Pay with PayPal or a debit / credit card on our secure payment page. Your e-ticket or voucher follows by email and WhatsApp.',
    ];
    body.append(
      h('div', { class: 'smtb-done' },
        h('div', { class: 'smtb-done__mark', 'aria-hidden': 'true' }, '✓'),
        h('p', { class: 'smtb-done__ref' }, 'Your request number is ', h('strong', { text: res.ref || '' })),
        h('p', { text: res.email ? 'We emailed you a copy. Keep the number for any question.' : 'Keep this number for any question.' }),
        h('ol', { class: 'smtb-steps' }, steps.map(s => h('li', { text: s }))),
        h('p', { class: 'smtb-note', text: `Our travel team replies ${HOURS}. Want an answer sooner? Send the request on WhatsApp too.` }),
        h('div', { class: 'smtb-actions' },
          res.whatsapp ? h('a', { class: 'smtb-btn smtb-btn--wa', href: res.whatsapp, target: '_blank', rel: 'noopener', text: 'Continue on WhatsApp' }) : null,
          h('button', { type: 'button', class: 'smtb-btn smtb-btn--ghost', text: 'Done', onclick: close }))));
  }

  /* ---------- 2) book: live Duffel fare → order-pay page ---------- */
  async function book(offer, payload) {
    let body = sheet('Book this fare');
    body.append(h('p', { class: 'smtb-loading', role: 'status', text: 'Checking the latest price and seats with the airline…' }));
    let v;
    try { v = await call('booking/offer?id=' + encodeURIComponent(offer.id), { timeout: 30000 }); } catch (err) { return fareGone(body, err.message, offer, payload); }
    if (!v || !v.bookable) return fareGone(body, 'This fare can no longer be booked online.', offer, payload);
    body = sheet('Book this fare');
    const st = status();
    const itinerary = h('div', { class: 'smtb-itin' }, v.slices.map((s, i) => h('div', { class: 'smtb-slice' },
      h('p', { class: 'smtb-slice__h' }, h('span', { class: 'smtb-tag', text: i === 0 ? 'Outbound' : 'Return' }), h('strong', { text: `${s.fromName || s.from} (${s.from}) → ${s.toName || s.to} (${s.to})` }), s.duration ? h('span', { text: duration(s.duration) }) : null),
      h('ul', {}, s.segments.map(g => h('li', { text: `${g.flight} · ${g.carrier} · ${day(g.dep)} ${clock(g.dep)} → ${clock(g.arr)} · ${g.from} → ${g.to}` }))))));
    const rule = (r, label) => !r ? null : h('li', { text: r.allowed ? `${label}: allowed${r.penalty === null ? '' : r.penalty > 0 ? ` (airline fee ${money(r.penalty, r.currency)})` : ' (no airline fee)'}` : `${label}: not allowed` });
    const changed = Math.abs(Number(v.price) - Number(offer.price)) > 0.009;
    const priceBox = h('div', { class: 'smtb-price' },
      h('span', { text: changed ? 'Updated total' : 'Total for all passengers' }), h('strong', { text: money(v.price, v.currency) }), h('small', { text: 'Includes airline taxes and our service fee' }),
      h('ul', { class: 'smtb-rules' }, rule(v.refund, 'Refund before departure'), rule(v.change, 'Change before departure'),
        h('li', { text: v.hold ? 'The airline holds your seats while you pay.' : 'The airline issues your ticket right after payment.' })));
    const typeLabel = p => p.type === 'infant_without_seat' ? 'Infant (on lap)' : p.type === 'child' ? 'Child' : 'Adult';
    const pax = v.passengers.map((p, i) => {
      const title = h('select', { name: `title${i}`, required: true }, h('option', { value: '', text: 'Title' }), [['mr', p.type === 'adult' ? 'Mr' : 'Mr / Master'], ['mrs', 'Mrs'], ['ms', 'Ms'], ['miss', 'Miss']].filter(([val]) => p.type === 'adult' || val === 'mr' || val === 'miss').map(([val, t]) => h('option', { value: val, text: t })));
      const given = h('input', { name: `given${i}`, required: true, maxlength: '60', pattern: "[A-Za-z][A-Za-z '\\-]*", autocomplete: i === 0 ? 'given-name' : 'off', spellcheck: 'false' });
      const family = h('input', { name: `family${i}`, required: true, maxlength: '60', pattern: "[A-Za-z][A-Za-z '\\-]*", autocomplete: i === 0 ? 'family-name' : 'off', spellcheck: 'false' });
      const born = h('input', { name: `born${i}`, type: 'date', required: true, max: today(), min: '1900-01-01' });
      const kids = [field('Title', title), field('First and middle names', given, 'English letters, exactly as in the passport'), field('Last name', family), field('Date of birth', born)];
      let doc = null, country = null, expiry = null;
      if (v.idsRequired) {
        doc = h('input', { name: `passport${i}`, required: true, maxlength: '20', autocomplete: 'off', spellcheck: 'false' });
        country = h('select', { name: `pcountry${i}`, required: true }, h('option', { value: '', text: 'Choose' }), COUNTRIES.map(c => ({ c, n: regionName(c) })).sort((a, b) => a.n.localeCompare(b.n)).map(({ c, n }) => h('option', { value: c, text: n, selected: c === 'PK' })));
        expiry = h('input', { name: `pexpiry${i}`, type: 'date', required: true, min: today() });
        kids.push(field('Passport number', doc), field('Passport issued by', country), field('Passport expiry date', expiry));
      }
      return { slot: p, title, given, family, born, doc, country, expiry, node: h('fieldset', { class: 'smtb-pax' }, h('legend', { text: `Passenger ${i + 1} · ${typeLabel(p)}` }), h('div', { class: 'smtb-grid' }, kids)) };
    });
    let saved = {}; try { saved = JSON.parse(localStorage.getItem('smtb-contact') || '{}') || {}; } catch (_) { /* storage blocked */ }
    const email = h('input', { name: 'email', type: 'email', required: true, autocomplete: 'email', maxlength: '120', value: saved.email || '' });
    const phone = h('input', { name: 'phone', type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', placeholder: '+92 300 1234567', maxlength: '22', value: saved.phone || '' });
    const consent = h('input', { type: 'checkbox', required: true });
    const go = h('button', { type: 'submit', class: 'smtb-btn smtb-btn--go', text: 'Continue to secure payment' });
    const key = uid();
    const form = h('form', { class: 'smtb-form', novalidate: true },
      itinerary, priceBox, pax.map(p => p.node),
      h('fieldset', { class: 'smtb-pax' }, h('legend', { text: 'Contact for this booking' }), h('div', { class: 'smtb-grid' },
        field('Email', email, 'Your e-ticket and booking reference are sent here'),
        field('Mobile number with country code', phone, 'For flight changes from the airline'))),
      h('label', { class: 'smtb-check' }, consent, h('span', {}, 'The names match the passports exactly. I accept the fare rules above and the ', h('a', { href: '/terms/', target: '_blank', rel: 'noopener', text: 'terms' }), '.')),
      honeypot(), st,
      h('div', { class: 'smtb-actions' }, go, h('small', { class: 'smtb-note', text: 'Next: pay with PayPal or a debit / credit card on our secure payment page.' })));
    form.addEventListener('submit', async e => {
      e.preventDefault(); st.textContent = ''; st.classList.remove('is-error');
      const bad = (msg, input) => { st.textContent = msg; st.classList.add('is-error'); if (input && input.focus) input.focus(); };
      const latin = /^[A-Za-z][A-Za-z '\-]*$/;
      for (const [i, p] of pax.entries()) {
        if (!p.title.value) return bad(`Choose a title for passenger ${i + 1}.`, p.title);
        if (!latin.test(p.given.value.trim()) || !latin.test(p.family.value.trim())) return bad(`Enter passenger ${i + 1}'s names in English letters, exactly as in the passport.`, latin.test(p.given.value.trim()) ? p.family : p.given);
        if (!p.born.value || p.born.value >= today()) return bad(`Enter passenger ${i + 1}'s date of birth.`, p.born);
        if (p.doc && (!/^[A-Za-z0-9 ]{5,20}$/.test(p.doc.value.trim()) || !p.country.value || !p.expiry.value || p.expiry.value <= today())) return bad(`Enter passenger ${i + 1}'s passport number, country and expiry date.`, p.doc);
      }
      if (!email.checkValidity() || !email.value.trim()) return bad('Enter the email address for your e-ticket.', email);
      if (!/^\+?[1-9][\d ]{7,18}$/.test(phone.value.trim()) || !phone.value.trim().startsWith('+')) return bad('Enter your mobile number starting with the country code, e.g. +92.', phone);
      if (!consent.checked) return bad('Please confirm the names and accept the fare rules.', consent);
      busy(go, true, 'Securing your fare…');
      try {
        const res = await call('booking/start', { method: 'POST', timeout: 60000, body: {
          offer_id: v.id, key, hp: form.elements.company.value,
          contact: { email: email.value.trim(), phone: phone.value.trim() },
          passengers: pax.map(p => ({ id: p.slot.id, title: p.title.value, given_name: p.given.value.trim(), family_name: p.family.value.trim(), born_on: p.born.value, passport: p.doc ? p.doc.value.trim() : undefined, passport_country: p.country ? p.country.value : undefined, passport_expiry: p.expiry ? p.expiry.value : undefined })),
        } });
        try { localStorage.setItem('smtb-contact', JSON.stringify({ ...saved, email: email.value.trim(), phone: phone.value.trim() })); } catch (_) { /* storage blocked */ }
        go.textContent = 'Opening the secure payment page…';
        window.location.assign(res.pay_url);
      } catch (err) {
        busy(go, false, 'Continue to secure payment');
        if (err.status === 409) { st.textContent = ''; return fareGone(sheet('Book this fare'), err.message, offer, payload); }
        bad(err.message);
      }
    });
    clearOnInput(form, st);
    body.append(form);
  }

  function fareGone(body, message, offer, payload) {
    body.replaceChildren(h('div', { class: 'smtb-done' },
      h('p', { class: 'smtb-lead', text: message || 'This fare is no longer available.' }),
      h('p', { text: 'Airline prices change quickly. Search again for the latest fares, or send this trip to our team and we find the best available option for you.' }),
      h('div', { class: 'smtb-actions' },
        h('button', { type: 'button', class: 'smtb-btn smtb-btn--go', text: 'Send as a request', onclick: () => request('flight', payload, { id: offer.id, price: offer.price, currency: offer.currency, summary: (offer.carriers || []).join(', ') }) }),
        h('button', { type: 'button', class: 'smtb-btn smtb-btn--ghost', text: 'Search again', onclick: close }))));
  }

  /* ---------- 3) compare: live Duffel fares (bookable with us) next to recent Aviasales market prices ---------- */
  // Flight times are airport-local: read them from the string instead of converting to the visitor's time zone.
  const localDay = s => (s ? day(String(s).slice(0, 10)) : '');
  const localTime = s => ((String(s || '').match(/T(\d{2}:\d{2})/) || [])[1] || '');
  const mins = m => { m = Number(m) || 0; return m ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}` : ''; };
  const stopsText = n => (Number(n) === 0 ? 'Non-stop' : `${n} stop${Number(n) === 1 ? '' : 's'}`);
  const travellers = p => Number(p.adults || 1) + (p.ages || []).length;

  function compare(section, payload, cfg, opts = {}) {
    if (!section) return;
    const list = section.querySelector('[data-flight-result-list]');
    const head = section.querySelector('.sm-flight-results-heading');
    const note = section.querySelector('[data-direct-search-note]');
    section.querySelectorAll('[data-partner-fallback],[data-fare-calendar]').forEach(n => { n.hidden = true; });
    if (head) {
      const eb = head.querySelector('.sm-travel-eyebrow'), h3 = head.querySelector('h3'), pp = head.querySelector('p');
      if (eb) eb.textContent = 'COMPARE FARES';
      if (h3) h3.textContent = `${(payload.origin_label || payload.origin || '').split(/[–(,]/)[0].trim()} → ${(payload.destination_label || payload.destination || '').split(/[–(,]/)[0].trim()}`;
      if (pp) pp.textContent = 'Live airline fares you can book with Sasta Milaga, next to recent prices travellers found on Aviasales.';
    }
    const n = travellers(payload);
    const state = { live: null, market: null, liveErr: '', marketErr: '', meta: null, filter: 'all' };
    const tile = (kind, title) => { const price = h('strong', { class: 'smc-tile__price', text: '…' }), sub = h('span', { class: 'smc-tile__sub', text: 'Checking…' }), extra = h('div', { class: 'smc-tile__extra' }); return { price, sub, extra, node: h('div', { class: `smc-tile smc-tile--${kind}` }, h('span', { class: 'smc-tile__k' }, h('i', { class: 'smc-dot', 'aria-hidden': 'true' }), title), price, sub, extra) }; };
    const tLive = tile('live', cfg.search ? 'Live fare · book with Sasta Milaga' : 'Book with Sasta Milaga');
    const tMarket = tile('market', 'Recent market price · Aviasales');
    const chip = (key, label) => h('button', { type: 'button', class: 'smc-chip', 'aria-pressed': String(key === 'all'), 'data-k': key, onclick: () => { state.filter = key; chips.querySelectorAll('.smc-chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.k === key))); render(); } }, label);
    const chips = h('div', { class: 'smc-chips', role: 'group', 'aria-label': 'Show fares' }, chip('all', 'All'), chip('live', 'Bookable now'), chip('market', 'Market prices'));
    const strip = h('div', { class: 'smc-days', hidden: true });
    const out = h('div', { class: 'smc-list', 'aria-live': 'polite' });
    const foot = h('div', { class: 'smc-foot' }, h('div', {}, h('strong', { text: 'Prefer a person to book it?' }), h('p', { text: 'Our travel team checks every airline, confirms the price and sends you a secure payment link (PayPal or debit / credit card).' })), h('button', { type: 'button', class: 'smtb-btn smtb-btn--go', text: 'Send my trip to the team', onclick: () => request('flight', payload) }));
    list.replaceChildren(h('div', { class: 'smc' }, h('div', { class: 'smc-tiles' }, tLive.node, tMarket.node), chips, strip, out, foot));
    if (note) note.textContent = 'Market prices come from recent Aviasales searches (economy, per adult) and can change. Live fares are checked with the airline again before you pay.';
    section.hidden = false; section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (!cfg.search) {
      tLive.price.textContent = 'Confirmed fare';
      tLive.sub.textContent = 'Our team books any airline for you and sends a secure payment link.';
      tLive.extra.append(h('button', { type: 'button', class: 'smtb-btn smtb-btn--go smc-tile__btn', text: 'Get a confirmed fare', onclick: () => request('flight', payload) }));
      state.live = [];
    }
    if (!cfg.market) { tMarket.price.textContent = '—'; tMarket.sub.textContent = 'Not available right now'; state.market = []; }

    const skeleton = k => h('div', { class: 'smc-card smc-card--skel', 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
    function group(title, items, kind) {
      const box = h('section', { class: `smc-group smc-group--${kind}` }, h('h4', { class: 'smc-group__h', text: title }));
      items.forEach(x => box.append(x));
      return box;
    }
    function liveCard(o) {
      const legs = (o.journeys || []).map((j, i) => { const a = j[0] || {}, z = j[j.length - 1] || {}; return h('div', { class: 'smc-leg' },
        h('span', { class: 'smc-leg__t', text: i === 0 ? 'Out' : 'Back' }),
        h('strong', { text: `${localTime(a.departingAt)} ${a.origin}` }), h('span', { class: 'smc-leg__line', 'aria-hidden': 'true' }), h('strong', { text: `${localTime(z.arrivingAt)} ${z.destination}` }),
        h('small', { text: `${localDay(a.departingAt)} · ${stopsText(Math.max(0, j.length - 1))}` })); });
      const summary = [(o.carriers || []).join(', '), (o.journeys || []).map(j => ((j || [])[0] || {}).origin + ' → ' + ((j || [])[(j || []).length - 1] || {}).destination).join(' / ')].filter(Boolean).join(' · ');
      const actions = h('div', { class: 'smc-actions' });
      if (cfg.booking && (cfg.currencies || []).includes(o.currency)) actions.append(h('button', { type: 'button', class: 'smtb-btn smtb-btn--go smc-btn', text: 'Book this fare', onclick: () => book(o, payload) }));
      actions.append(h('button', { type: 'button', class: 'smtb-btn smtb-btn--ghost smc-btn', text: cfg.booking ? 'Ask our team' : 'Request this fare', onclick: () => request('flight', payload, { id: o.id, price: o.price, currency: o.currency, summary }) }));
      return h('article', { class: 'smc-card smc-card--live' },
        h('div', { class: 'smc-card__top' }, h('span', { class: 'smc-badge smc-badge--live', text: 'Live · airline price' }), h('span', { class: 'smc-card__air', text: (o.carriers || []).join(' · ') || 'Airline shown at booking' })),
        h('div', { class: 'smc-legs' }, legs),
        h('div', { class: 'smc-card__bottom' }, h('div', { class: 'smc-price' }, h('strong', { text: money(o.price, o.currency) }), h('small', { text: `total · ${n} traveller${n > 1 ? 's' : ''} · taxes incl.` })), actions));
    }
    function marketCard(r) {
      const back = r.returnAt ? h('small', { text: `Return ${localDay(r.returnAt)} ${localTime(r.returnAt)} · ${stopsText(r.returnStops)}` }) : null;
      const summary = `${r.airlineName}${r.flightNumber ? ' ' + r.airline + r.flightNumber : ''} · ${r.from} → ${r.to} · ${localDay(r.departureAt)}`;
      const actions = h('div', { class: 'smc-actions' },
        h('button', { type: 'button', class: 'smtb-btn smtb-btn--go smc-btn', text: 'Book with our team', onclick: () => request('flight', { ...payload, departure: String(r.departureAt || payload.departure).slice(0, 10) || payload.departure, return: r.returnAt ? String(r.returnAt).slice(0, 10) : payload.return }, { price: r.price, currency: r.currency, summary: summary + ' (seen on Aviasales)' }) }),
        r.url ? h('a', { class: 'smc-link', href: r.url, target: '_blank', rel: 'nofollow sponsored noopener', text: 'See on Aviasales ↗' }) : null);
      return h('article', { class: 'smc-card smc-card--market' },
        h('div', { class: 'smc-card__top' }, h('span', { class: 'smc-badge smc-badge--market', text: 'Recently seen · Aviasales' }), h('span', { class: 'smc-card__air', text: `${r.airlineName}${r.flightNumber ? ' · ' + r.airline + r.flightNumber : ''}` })),
        h('div', { class: 'smc-legs' }, h('div', { class: 'smc-leg' }, h('span', { class: 'smc-leg__t', text: 'Out' }), h('strong', { text: `${localTime(r.departureAt)} ${r.from}` }), h('span', { class: 'smc-leg__line', 'aria-hidden': 'true' }), h('strong', { text: r.to }), h('small', { text: `${localDay(r.departureAt)} · ${stopsText(r.stops)}${r.durationTo ? ' · ' + mins(r.durationTo) : ''}` })), back),
        h('div', { class: 'smc-card__bottom' }, h('div', { class: 'smc-price' }, h('strong', { text: money(r.price, r.currency) }), h('small', { text: `${r.returnAt ? 'return trip, ' : ''}per adult · may have changed` })), actions));
    }
    function render() {
      const parts = [];
      const showLive = state.filter !== 'market', showMarket = state.filter !== 'live';
      if (showLive && cfg.search) parts.push(state.live === null ? group('Bookable now', [skeleton(), skeleton()], 'live') : state.live.length ? group(`Bookable now · ${state.live.length} live fare${state.live.length > 1 ? 's' : ''}`, state.live.slice(0, 15).map(liveCard), 'live') : h('p', { class: 'smc-empty', text: state.liveErr || 'No live airline fares for these exact dates. Try nearby dates or send the trip to our team.' }));
      if (showMarket && cfg.market) parts.push(state.market === null ? group('Recent market prices', [skeleton(), skeleton()], 'market') : state.market.length ? group(state.meta && state.meta.exact === false ? `Recent prices on nearby dates (${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(payload.departure + 'T12:00:00'))})` : `Recent market prices · ${state.market.length}`, state.market.map(marketCard), 'market') : h('p', { class: 'smc-empty', text: state.marketErr || (state.meta && state.meta.note) || 'No recent Aviasales prices for this route.' }));
      if (!parts.length) parts.push(h('p', { class: 'smc-empty', text: 'Nothing to show for this filter.' }));
      out.replaceChildren(...parts);
      chips.querySelector('[data-k="live"]').textContent = `Bookable now${state.live && state.live.length ? ` (${state.live.length})` : ''}`;
      chips.querySelector('[data-k="market"]').textContent = `Market prices${state.market && state.market.length ? ` (${state.market.length})` : ''}`;
      chips.hidden = !(cfg.search && cfg.market);
    }
    function days(meta) {
      const d = (meta && meta.days) || [];
      if (d.length < 2) return;
      const low = Math.min(...d.map(x => x.price));
      let fmt; try { fmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: meta.currency, maximumFractionDigits: 0, notation: 'compact' }); } catch (_) { fmt = { format: v => String(Math.round(v)) }; }
      const row = h('div', { class: 'smc-days__row', role: 'group', 'aria-label': 'Cheapest day' }, d.map(x => h('button', { type: 'button', class: 'smc-day' + (x.price === low ? ' is-low' : '') + (x.date === payload.departure ? ' is-on' : ''), 'aria-pressed': String(x.date === payload.departure), onclick: () => opts.pickDate && opts.pickDate(x.date) },
        h('span', { text: new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(x.date + 'T12:00:00')) }), h('b', { text: fmt.format(x.price) }), x.price === low ? h('small', { text: 'Lowest' }) : null)));
      strip.replaceChildren(h('p', { class: 'smc-days__t', text: 'Cheapest one-way price by day on Aviasales. Tap a day to compare it.' }), row);
      strip.hidden = false;
      const on = row.querySelector('.is-on'); if (on) row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.clientWidth / 2;
    }
    render();
    if (cfg.search) call('duffel/flights', { method: 'POST', body: payload, timeout: 45000 }).then(r => {
      const seen = new Map();
      state.live = (r.results || []).filter(o => { const k = [(o.carriers || []).join(), o.price, ((o.journeys || [])[0] || []).map(s => s.origin + s.departingAt).join()].join('|'); if (seen.has(k)) return false; seen.set(k, 1); return true; }).sort((a, b) => a.price - b.price);
      const lo = state.live[0];
      tLive.price.textContent = lo ? money(lo.price, lo.currency) : 'No live fares';
      tLive.sub.textContent = lo ? `total for ${n} traveller${n > 1 ? 's' : ''} · airline-confirmed before you pay` : 'Try nearby dates, or our team finds one for you.';
    }).catch(e => { state.live = []; state.liveErr = e.status === 429 ? e.message : 'Live airline fares are unavailable right now.'; tLive.price.textContent = '—'; tLive.sub.textContent = state.liveErr; }).finally(render);
    if (cfg.market) call('market-prices', { method: 'POST', body: payload, timeout: 25000 }).then(r => {
      state.meta = r; state.market = r.results || [];
      const lo = state.market[0];
      tMarket.price.textContent = lo ? money(lo.price, lo.currency) : 'No recent prices';
      tMarket.sub.textContent = lo ? `${lo.returnAt ? 'return trip, ' : ''}per adult · ${lo.airlineName}${r.exact === false ? ' · nearby date' : ''} · may have changed` : (r.note || 'No recent Aviasales prices for this route.');
      days(r);
    }).catch(e => { state.market = []; state.marketErr = e.status === 429 ? e.message : 'Market prices are unavailable right now.'; tMarket.price.textContent = '—'; tMarket.sub.textContent = state.marketErr; }).finally(render);
  }

  window.SMTB = { config, request, book, close, compare };
})();
