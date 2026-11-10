/* Country-aware Shipping and Returns pages, a searchable Visa destinations page, and Rewards & lowest prices.
 * The visitor's country comes from SMMarket (detected automatically, changeable). Policy wording follows the live
 * sastamilaga.com theme (FAQ, footer and return policy); nothing here invents rules, prices or visa requirements. */
(function () {
  'use strict';
  const A = window.SMApp; if (!A) return;
  const { esc, renderApp, setSEO, pageHead, waLink } = A;
  const BASE = A.APP_BASE;
  const C = () => window.SM_CONFIG || {};
  const M = () => window.SMMarket;
  const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const country = () => (M() && M().state().country) || 'PK';
  const cname = c => (M() && M().countryName(c)) || c;
  const flag = (c, w) => (M() ? M().flag(c, w || 32) : '');
  const all = () => (M() ? M().list() : [{ c: 'PK', n: 'Pakistan' }]);
  const selectHtml = (id, value, label) => `<label class="sm-pg__sel" for="${id}"><span>${esc(label)}</span><select id="${id}">${all().map(x => `<option value="${x.c}"${x.c === value ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}</select></label>`;
  const rs = n => 'Rs ' + Number(n).toLocaleString('en');
  const neutral = s => String(s || '').replace(/\bCJ\s*Packet\b/gi, 'Packet').replace(/\bCJ\s*/gi, '');   /* supplier names are not shown to customers */
  let shipP = null;
  const shipData = () => shipP || (shipP = fetch(BASE + 'data/shipping/cj-sample.json').then(r => (r.ok ? r.json() : null)).catch(() => null));
  const fee = () => C().deliveryFee || 250, free = () => C().freeDeliveryFrom || 5000;

  /* ---------------- Shipping ---------------- */
  async function shipping(qs) {
    const q = new URLSearchParams(qs || '').get('country');
    let cc = (q && String(q).toUpperCase()) || country();
    setSEO({ title: 'Shipping and delivery by country', description: `Delivery in Pakistan is Rs ${fee()}, free above Rs ${free()}. Global items ship worldwide: see supplier shipping methods, prices and transit times for your country.`, url: `${A.SITE_URL}/shipping/` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Shipping and delivery', 'Rates and delivery times for your country. We detect your country automatically; change it any time.')}
      <div class="sm-pg__bar">${selectHtml('pg-cc', cc, 'Delivering to')}<p class="sm-pg__hint">Detected from your location. Local products are delivered in Pakistan; global products ship worldwide.</p></div>
      <div id="pg-body" aria-live="polite"><p class="sm-pg__load">Loading shipping details…</p></div></section>`);
    const data = await shipData();
    const draw = () => {
      const name = cname(cc), local = cc === 'PK', ctry = data && data.countries && data.countries[cc];
      const rows = ctry ? ctry.map(m => `<tr><th scope="row">${esc(neutral(m.name))}</th><td>${USD.format(m.price)}</td><td>${esc(m.days)} days</td></tr>`).join('') : '';
      document.getElementById('pg-body').innerHTML = `<div class="sm-pg__cards">
        <article class="sm-pg__card"><h2>Local products</h2>${local
          ? `<ul class="sm-pg__facts"><li>Delivery in Pakistan is <b>${rs(fee())}</b>, <b>free above ${rs(free())}</b>.</li><li>Cash on delivery is available.</li><li>Delivery charges are shown before you order.</li></ul>`
          : `<p>Sasta Milaga Local products are delivered within <b>Pakistan only</b>. You can order them for an address in Pakistan, for example for family. Delivery there is ${rs(fee())}, free above ${rs(free())}.</p>`}</article>
        <article class="sm-pg__card"><h2>Global products to ${esc(name)} <span class="sm-pg__flag">${flag(cc, 28)}</span></h2>
          <ul class="sm-pg__facts"><li>Shipping is calculated for your products and destination.</li><li>Global orders are paid in advance${local ? ', including deliveries to Pakistan' : ''}.</li><li>We confirm stock, options, shipping and the final total with you before you pay.</li></ul></article></div>
        <section class="sm-pg__tbl"><h2>Supplier shipping to ${esc(name)}</h2>${rows
          ? `<div class="sm-pg__scroll"><table><thead><tr><th scope="col">Method</th><th scope="col">From</th><th scope="col">Transit</th></tr></thead><tbody>${rows}</tbody></table></div>
             <p class="sm-pg__note">Sample: one small parcel (about ${esc(data.sample.weightG)} g) from China, supplier data of ${esc(data.generated)}. Heavier or larger items cost more. Open any <a href="global/">global product</a> to get the exact price for that item: it uses your country automatically.</p>`
          : `<p class="sm-pg__note">${data ? `The supplier had no shipping method to ${esc(name)} when we last checked.` : 'Supplier shipping data is not available right now.'} <a href="${esc(waLink(`Assalam o Alaikum! Can you ship to ${name}? Please tell me the options.`))}" target="_blank" rel="noopener">Ask us on WhatsApp</a> and we will check for you.</p>`}</section>
        <section class="sm-pg__faq"><h2>Questions</h2>
          <details><summary>How much is delivery?</summary><p>Local delivery in Pakistan is ${rs(fee())}, free on orders above ${rs(free())}. Global shipping is calculated for your products and destination.</p></details>
          <details><summary>Can I pay cash on delivery?</summary><p>Cash on delivery is available for Sasta Milaga Local products delivered in Pakistan. Global products require prepaid payment, including deliveries to Pakistan.</p></details>
          <details><summary>How long will it take?</summary><p>Delivery options and estimated times depend on your supplier and address. The table above shows the supplier's transit times for ${esc(name)}.</p></details>
          <details><summary>Will I pay customs duties?</summary><p>Shipping prices do not include import duties or taxes your country may charge on arrival.</p></details></section></div>`;
    };
    draw();
    document.getElementById('pg-cc').addEventListener('change', e => { cc = e.target.value; draw(); });
  }

  /* ---------------- Returns ---------------- */
  function returns() {
    let cc = country();
    setSEO({ title: 'Returns and refunds by country', description: '7-day returns for Sasta Milaga Local products in Pakistan; return terms for global products depend on the supplier and your country.', url: `${A.SITE_URL}/returns/` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Returns and refunds', 'What applies in your country. We detect it automatically; change it any time.')}
      <div class="sm-pg__bar">${selectHtml('pg-cc', cc, 'Your country')}</div><div id="pg-body" aria-live="polite"></div></section>`);
    const draw = () => {
      const name = cname(cc), local = cc === 'PK';
      const wa = waLink(`Assalam o Alaikum! I want to return an item.\nCountry: ${name}\nOrder ID: \nReason: `);
      document.getElementById('pg-body').innerHTML = `<div class="sm-pg__cards">
        <article class="sm-pg__card"><h2>Local products${local ? '' : ' (delivered in Pakistan)'}</h2><ul class="sm-pg__facts">
          <li><b>7-day window:</b> request a return within 7 days of delivery.</li>
          <li><b>Return cost:</b> standard return shipping is ${rs(250)}. Returns are free if the item is defective, damaged or incorrect.</li>
          <li><b>Refunds:</b> to your original payment method within 7 to 10 business days.</li>
          <li>The item must be unused, in its original packaging, with tags attached.</li></ul>
          ${local ? '' : `<p class="sm-pg__note">Local products are delivered in Pakistan only, so this applies to orders delivered there.</p>`}</article>
        <article class="sm-pg__card"><h2>Global products to ${esc(name)} <span class="sm-pg__flag">${flag(cc, 28)}</span></h2><ul class="sm-pg__facts">
          <li>Return eligibility, time limits and fees depend on the supplier and destination.</li>
          <li>If an item arrives damaged or incorrect, contact us straight away with photos.</li>
          <li>We confirm what is possible for your order before you send anything back.</li></ul></article></div>
        <p class="sm-pg__cta"><a class="sm-wa-btn" href="${esc(wa)}" target="_blank" rel="noopener">Start a return on WhatsApp</a> <span>+966510451995, or email ${esc('info@sastamilaga.com')} with your order ID.</span></p>
        <section class="sm-pg__faq"><h2>How a return works</h2><ol class="sm-pg__steps"><li>Message us with your order ID and the reason.</li><li>We confirm whether the item is eligible and who pays for return shipping.</li><li>Send the item back as we explain; we process the refund when it arrives.</li></ol></section>`;
    };
    draw();
    document.getElementById('pg-cc').addEventListener('change', e => { cc = e.target.value; draw(); });
  }

  /* ---------------- Visa destinations ---------------- */
  const VISA_TYPES = ['Tourist / visit', 'Umrah', 'Work', 'Business', 'Family visit', 'Study'];
  const POPULAR = ['SA', 'AE', 'RS', 'TR', 'EU', 'GB', 'MY', 'AZ', 'QA', 'TH'];
  function visa(qs) {
    const sp = new URLSearchParams(qs || '');
    const dests = all().map(x => ({ c: x.c, n: x.n })).concat([{ c: 'EU', n: 'Schengen (Europe)' }]).sort((a, b) => a.n.localeCompare(b.n));
    const st = { q: sp.get('q') || '', type: sp.get('type') || VISA_TYPES[0], from: (sp.get('from') || country()).toUpperCase(), shown: 48 };
    setSEO({ title: 'Visa destinations: check requirements with our team', description: `Choose a destination from ${dests.length} countries and regions. Our team checks the visa requirements for your passport with you; free first check of your documents.`, url: `${A.SITE_URL}/visa/` });
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Visa destinations', 'Search a destination, choose your visa type and send the request. Free first check of your documents. Visa decisions belong to the embassy; we never guarantee approval.')}
      <form class="sm-pg__bar sm-pg__bar--visa" id="visaForm" role="search" onsubmit="return false">
        <label class="sm-pg__sel sm-pg__sel--grow" for="vsq"><span>Search destination</span><input id="vsq" type="search" placeholder="e.g. Japan, Schengen, Türkiye" value="${esc(st.q)}" autocomplete="off"></label>
        <label class="sm-pg__sel" for="vtype"><span>Visa type</span><select id="vtype">${VISA_TYPES.map(t => `<option${t === st.type ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        ${selectHtml('vnat', st.from, 'Passport country')}
      </form>
      <p class="sm-pg__count" id="vcount" role="status" aria-live="polite"></p>
      <ul class="sm-visa" id="vgrid" role="list"></ul><div class="sm-pg__more"><button type="button" class="sm-btn sm-btn--ghost" id="vmore" hidden>Show more destinations</button></div></section>`);
    const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const msg = d => `Assalam o Alaikum! Please check visa requirements for me.\nDestination: ${d.n}\nVisa type: ${st.type}\nPassport: ${cname(st.from)}\n${A.SITE_URL}/visa/`;
    const draw = () => {
      const f = fold(st.q).trim();
      let list = dests.filter(d => !f || fold(d.n).includes(f) || d.c.toLowerCase() === f);
      if (!f) list = POPULAR.map(c => dests.find(d => d.c === c)).filter(Boolean).concat(list.filter(d => !POPULAR.includes(d.c)));
      document.getElementById('vcount').textContent = f ? `${list.length} destination${list.length === 1 ? '' : 's'} match “${st.q}”` : `${dests.length} destinations. Popular ones first.`;
      document.getElementById('vgrid').innerHTML = list.length ? list.slice(0, st.shown).map(d => `<li><a class="sm-visa__card" href="${esc(waLink(msg(d)))}" target="_blank" rel="noopener"><span class="sm-visa__flag">${flag(d.c, 40)}</span><span><b>${esc(d.n)}</b><small>Request a visa check</small></span></a></li>`).join('')
        : `<li class="sm-visa__none">No destination matches “${esc(st.q)}”. Try another spelling, or <a href="${esc(waLink('Assalam o Alaikum! I need a visa for: ' + st.q))}" target="_blank" rel="noopener">ask us on WhatsApp</a>.</li>`;
      document.getElementById('vmore').hidden = list.length <= st.shown;
    };
    let t; const sync = () => { try { const u = new URL(location.href); st.q ? u.searchParams.set('q', st.q) : u.searchParams.delete('q'); history.replaceState(history.state, '', u); } catch (e) { } };
    document.getElementById('vsq').addEventListener('input', e => { st.q = e.target.value; st.shown = 48; clearTimeout(t); t = setTimeout(() => { draw(); sync(); }, 120); });
    document.getElementById('vtype').addEventListener('change', e => { st.type = e.target.value; draw(); });
    document.getElementById('vnat').addEventListener('change', e => { st.from = e.target.value; draw(); });
    document.getElementById('vmore').addEventListener('click', () => { st.shown += 48; draw(); });
    draw();
  }

  /* ---------------- Rewards & lowest prices ---------------- */
  let cheap = null;
  function rewards(qs) {
    const band = Number(new URLSearchParams(qs || '').get('under')) || 0;
    setSEO({ title: 'Rewards and lowest prices', description: 'The lowest-priced products at Sasta Milaga, cheapest first, with price bands from Rs 300. Prices in PKR, cash on delivery in Pakistan.', url: `${A.SITE_URL}/rewards/` });
    if (!cheap) cheap = A.products.filter(p => A.price(p) > 0 && (p.in || Number(p.stock) > 0)).sort((a, b) => A.price(a) - A.price(b));
    const st = { band, shown: 60 };
    renderApp(`<section class="sm-page sm-page--wide">${pageHead('Rewards and lowest prices', `Points, the daily spin and referral rewards are run on <a href="https://sastamilaga.com/rewards-program/" rel="noopener">sastamilaga.com</a>. Here are our lowest prices, cheapest first.`)}
      <div class="sm-pg__bar"><label class="sm-pg__sel" for="rwband"><span>Show</span><select id="rwband"><option value="0">Lowest price first (all)</option>${[300, 500, 1000, 2000].map(n => `<option value="${n}"${n === band ? ' selected' : ''}>Under ${rs(n)}</option>`).join('')}</select></label></div>
      <p class="sm-pg__count" id="rwcount" role="status" aria-live="polite"></p><div id="rwgrid" class="products-row"></div><div class="sm-pg__more"><button type="button" class="sm-btn sm-btn--ghost" id="rwmore" hidden>Show more</button></div></section>`);
    const draw = () => {
      const list = st.band ? cheap.filter(p => A.price(p) <= st.band) : cheap;
      document.getElementById('rwcount').textContent = `${list.length.toLocaleString('en')} products${st.band ? ` under ${rs(st.band)}` : ', lowest price first'}`;
      document.getElementById('rwgrid').innerHTML = list.slice(0, st.shown).map(A.productCard).join('');
      document.getElementById('rwmore').hidden = list.length <= st.shown;
    };
    document.getElementById('rwband').addEventListener('change', e => { st.band = Number(e.target.value); st.shown = 60; draw(); });
    document.getElementById('rwmore').addEventListener('click', () => { st.shown += 60; draw(); });
    draw();
  }

  const PAGES = { shipping, returns, visa, rewards };
  window.SMPages = { route(name, qs) { (PAGES[name] || PAGES.shipping)(qs); } };
  const cur = (A.cleanRoute && A.cleanRoute(location.pathname)) || ((location.hash.match(/^#\/([^/?]+)/) || [])[1] || '');
  if (['shipping', 'returns', 'return-policy', 'visa', 'rewards'].includes(cur)) A.route();
})();
