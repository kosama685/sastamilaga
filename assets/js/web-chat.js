(function () {
	'use strict';
	var root = document.querySelector('[data-smwa-webchat]'), cfg = window.SMWA_WEBCHAT;
	if (!root || !cfg || !window.fetch) return;
	var launcher = root.querySelector('.smwa-web__launcher'), panel = root.querySelector('.smwa-web__panel');
	var close = root.querySelector('.smwa-web__close'), log = root.querySelector('.smwa-web__messages');
	var form = root.querySelector('.smwa-web__composer'), input = form.querySelector('[name="message"]');
	var slot = root.querySelector('.smwa-web__form-slot'), state = null, lastId = 0, poller = null, busy = false;
	var storageKey = 'smwa.website.chat.v1', languageKey = 'smwa.website.chat.lang';
	var copy = { en: { launcher:'Chat with us', close:'Close chat', hello:cfg.text.hello, actions:['Find products','Plan travel','My orders','Talk to support'], placeholder:'Type a message…', privacy:'Messages are stored for up to '+cfg.retentionDays+' days so our team can reply. Do not send payment-card or passport details.', travelIntro:'Send a request to our travel team. Availability, fare, and booking are confirmed separately.', service:'Service', name:'Your name', email:'Email for the travel team', details:'Trip details (route or destination, dates, travellers, preferences)', note:'Do not include payment card or passport numbers.', submit:'Send travel request', sending:'Sending…', submitted:'Travel request received. The team will confirm availability and price.' }, ar: { launcher:'تواصل معنا', close:'إغلاق المحادثة', hello:'أهلًا بك في سستا ميلاجا. يمكنني مساعدتك في العثور على منتجات أو إرسال طلب سفر إلى فريقنا.', actions:['ابحث عن المنتجات','خطط لرحلتك','طلباتي','تواصل مع الدعم'], placeholder:'اكتب رسالتك…', privacy:'نحتفظ بالرسائل لمدة تصل إلى '+cfg.retentionDays+' يومًا كي يتمكن فريقنا من الرد. لا ترسل بيانات البطاقة أو جواز السفر.', travelIntro:'أرسل طلبًا إلى فريق السفر. سيتم تأكيد التوفر والسعر والحجز بشكل منفصل.', service:'الخدمة', name:'الاسم', email:'البريد الإلكتروني لفريق السفر', details:'تفاصيل الرحلة (المسار أو الوجهة والتواريخ وعدد المسافرين والتفضيلات)', note:'لا تكتب رقم البطاقة أو جواز السفر.', submit:'إرسال طلب السفر', sending:'جارٍ الإرسال…', submitted:'تم استلام طلب السفر. سيؤكد الفريق التوفر والسعر.' } };
	var lang = 'en'; try { var savedLang = localStorage.getItem(languageKey), mk = JSON.parse(localStorage.getItem('sm_market') || '{}'), bl = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase(); lang = savedLang ? (savedLang === 'ar' ? 'ar' : 'en') : ((/^ar(-|$)/.test(bl) || mk.lang === 'ar') ? 'ar' : 'en'); } catch (e) {}
	function setLanguage(next) { lang = next === 'ar' ? 'ar' : 'en'; var d = copy[lang]; root.lang = lang; root.dir = lang === 'ar' ? 'rtl' : 'ltr'; launcher.setAttribute('aria-label', d.launcher); launcher.lastElementChild.textContent = d.launcher; close.setAttribute('aria-label', d.close); input.placeholder = d.placeholder; root.querySelector('.smwa-web__privacy').textContent = d.privacy; root.querySelectorAll('[data-smwa-action]').forEach(function (b,i) { b.textContent = d.actions[i]; }); root.querySelectorAll('[data-smwa-lang]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.smwaLang === lang ? 'true' : 'false'); }); try { localStorage.setItem(languageKey, lang); } catch(e) {} }
	setLanguage(lang);
	root.querySelectorAll('[data-smwa-lang]').forEach(function (button) { button.addEventListener('click', function () { setLanguage(button.dataset.smwaLang); }); });
	function safeUrl(value) { try { var u = new URL(value, window.location.href); return u.origin === window.location.origin && u.protocol === 'https:' || u.origin === window.location.origin && u.protocol === 'http:' ? u.href : ''; } catch (e) { return ''; } }
	function bubble(text, direction) {
		var item = document.createElement('div'); item.className = 'smwa-web__bubble smwa-web__bubble--' + (direction === 'in' ? 'visitor' : 'assistant');
		var re = /https?:\/\/[^\s<>"']+/g, start = 0, match;
		while ((match = re.exec(String(text || '')))) {
			if (match.index > start) item.appendChild(document.createTextNode(String(text).slice(start, match.index)));
			var raw = match[0], tail = '';
			while (/[),.;!?]$/.test(raw)) { tail = raw.slice(-1) + tail; raw = raw.slice(0, -1); }
			var link = safeUrl(raw);
			if (link) { var a = document.createElement('a'); a.href = link; a.textContent = raw; a.rel = 'noopener'; item.appendChild(a); }
			else item.appendChild(document.createTextNode(raw));
			if (tail) item.appendChild(document.createTextNode(tail));
			start = match.index + match[0].length;
		}
		if (start < String(text || '').length) item.appendChild(document.createTextNode(String(text).slice(start)));
		log.appendChild(item); log.scrollTop = log.scrollHeight;
	}
	function productCards(products) {
		if (!Array.isArray(products) || !products.length) return;
		var wrap = document.createElement('div'); wrap.className = 'smwa-web__products';
		products.forEach(function (p) {
			var card = document.createElement('article'); card.className = 'smwa-web__product';
			var detailUrl = safeUrl(p.url); if (!detailUrl) return;
			if (p.image) { var imgUrl = safeUrl(p.image) || (/^https:\/\//.test(String(p.image)) ? String(p.image) : ''); if (imgUrl) { var img = document.createElement('img'); img.src = imgUrl; img.alt = String(p.name || ''); img.loading = 'lazy'; img.width = 72; img.height = 72; card.appendChild(img); } }
			var body = document.createElement('div'), title = document.createElement('a'), price = document.createElement('small');
			title.href = detailUrl; title.textContent = String(p.name || 'Product'); price.textContent = String(p.price || ''); body.append(title, price);
			var action = document.createElement('a'); action.className = 'smwa-web__product-action'; action.href = safeUrl(p.cart_url) || detailUrl; action.textContent = String(p.cart_label || 'View product');
			if (action.href.indexOf('add-to-cart=') !== -1) action.setAttribute('rel', 'nofollow');
			card.append(body, action); wrap.appendChild(card);
		});
		if (wrap.childElementCount) { log.appendChild(wrap); log.scrollTop = log.scrollHeight; }
	}
	function request(url, options) { options = options || {}; var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {}); return fetch(url, Object.assign({ credentials: 'same-origin' }, options, { headers: headers })).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || cfg.text.error); return j; }); }); }
	function saveState() { try { if (state) localStorage.setItem(storageKey, JSON.stringify(state)); } catch (e) {} }
	function sessionHeaders() { return { 'X-SMWA-Session-Id': state.id, 'X-SMWA-Session': state.token }; }
	function ensureSession() {
		try { var old = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (old && /^[a-f0-9-]{36}$/.test(old.id) && /^[a-f0-9]{64}$/.test(old.token)) state = old; } catch (e) {}
		if (state) return Promise.resolve(state);
		return request(cfg.api + 'web-session', { method: 'POST', body: '{}' }).then(function (j) { state = { id: j.session_id, token: j.session_token }; saveState(); return state; });
	}
	function poll() {
		if (!state || !panel || panel.hidden) return Promise.resolve();
		return request(cfg.api + 'web-messages?after=' + encodeURIComponent(lastId), { method: 'GET', headers: sessionHeaders() }).then(function (j) {
			(j.messages || []).forEach(function (m) { if (m.id > lastId) { bubble(m.body, m.direction); lastId = m.id; } });
		}).catch(function () {});
	}
	function openChat() {
		panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); launcher.hidden = true;
		if (!log.childElementCount) bubble(cfg.text.hello, 'out');
		ensureSession().then(function () { return poll(); }).then(function () { input.focus(); if (!poller) poller = window.setInterval(poll, 7000); }).catch(function () { bubble(cfg.text.error, 'out'); });
	}
	function closeChat() { panel.hidden = true; launcher.hidden = false; launcher.setAttribute('aria-expanded', 'false'); if (poller) { window.clearInterval(poller); poller = null; } launcher.focus(); }
	launcher.addEventListener('click', openChat); close.addEventListener('click', closeChat);
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closeChat(); });
	/* The server's product list is empty for many messages: answer from the real catalogue (Pakistan products and the global shop). */
	function catalogueAnswer(text) {
		var S = window.SMCJSearch; if (!S || String(text).trim().length < 3) return Promise.resolve();
		var ws = S.words(text).filter(function (w) { return w.length > 2; }); if (!ws.length) return Promise.resolve();
		var out = [], usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
		try { if (window.SMApp && window.SMApp.products) window.SMApp.products.filter(function (p) { return ws.every(function (w) { return p._search.indexOf(w) >= 0; }); }).slice(0, 2).forEach(function (p) { out.push({ name: p.n, price: window.SMApp.PKR.format(window.SMApp.price(p)), url: location.origin + '/#/product/' + p._slug, image: p.img || (p.imgs && p.imgs[0]) || '' }); }); } catch (e) {}
		return S.products(ws, 3, 3).then(function (hits) {
			hits.forEach(function (h) { out.push({ name: h.r[2], price: 'Global item, est. ' + usd.format((h.r[3] || 0) * 1.2), url: location.origin + '/global/p/' + h.cat + '/' + encodeURIComponent(h.r[0]), image: h.r[5], cart_label: 'View options' }); });
			if (out.length) { bubble(lang === 'ar' ? 'هذه منتجات مطابقة لبحثك:' : 'Here are products that match "' + String(text).trim().slice(0, 60) + '":', 'out'); productCards(out); }
		}).catch(function () {});
	}
	function send(text) {
		text = String(text || '').trim(); if (!text || busy) return Promise.resolve(); busy = true;
		return ensureSession().then(function () { return request(cfg.api + 'web-message', { method: 'POST', headers: sessionHeaders(), body: JSON.stringify({ message: text, language: lang, request_id: (window.crypto && crypto.randomUUID ? crypto.randomUUID() : ('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g, function(c){var r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)})) }) }); }).then(function (j) {
			return poll().then(function () { if (j.products && j.products.length) productCards(j.products); else if (j.action !== 'travel') return catalogueAnswer(text); if (j.action === 'travel') showTravelForm(); });
		}).catch(function () { bubble(cfg.text.error, 'out'); }).finally(function () { busy = false; });
	}
	form.addEventListener('submit', function (e) { e.preventDefault(); if (form.elements.website.value) return; var text = input.value.trim(); if (!text) return; input.value = ''; send(text); });
	root.querySelectorAll('[data-smwa-action]').forEach(function (button) { button.addEventListener('click', function () {
		var action = button.getAttribute('data-smwa-action');
		if (action === 'travel') { showTravelForm(); return; }
		if (action === 'shop') { bubble('Tell me the product name or a few words describing what you need.', 'out'); input.focus(); return; }
		send(action === 'orders' ? 'My orders' : 'Talk to support');
	}); });
	function showTravelForm() {
		slot.replaceChildren(); var d = copy[lang], card = document.createElement('form'); card.className = 'smwa-web__travel';
		var intro = document.createElement('p'); intro.textContent = d.travelIntro; card.appendChild(intro);
		function field(label, name, type, required) { var l = document.createElement('label'); l.textContent = label; var el = type === 'select' ? document.createElement('select') : type === 'textarea' ? document.createElement('textarea') : document.createElement('input'); el.name = name; if (type !== 'select' && type !== 'textarea') el.type = type; if (required) el.required = true; l.appendChild(el); card.appendChild(l); return el; }
		var service = field(d.service, 'service', 'select', true); (lang === 'ar' ? [['flights','رحلات الطيران'],['stays','الفنادق والإقامة'],['umrah','العمرة'],['visa','استفسار تأشيرة'],['tours','الجولات والباقات'],['other','سفر آخر']] : [['flights','Flights'],['stays','Hotels or stays'],['umrah','Umrah'],['visa','Visa enquiry'],['tours','Tours and packages'],['other','Other travel']]).forEach(function (pair) { var opt = document.createElement('option'); opt.value = pair[0]; opt.textContent = pair[1]; service.appendChild(opt); });
		var name = field(d.name, 'name', 'text', true); name.maxLength = 120;
		var email = field(d.email, 'email', 'email', true); email.maxLength = 190;
		var details = field(d.details, 'details', 'textarea', true); details.maxLength = 2500; details.rows = 3;
		var note = document.createElement('small'); note.textContent = d.note; card.appendChild(note);
		var submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = d.submit; card.appendChild(submit);
		var status = document.createElement('p'); status.className = 'smwa-web__travel-status'; status.setAttribute('role','status'); card.appendChild(status);
		card.addEventListener('submit', function (e) { e.preventDefault(); if (!cfg.travelApi) { status.textContent = 'Travel request form is unavailable. Please use the Travel page.'; return; } submit.disabled = true; status.textContent = d.sending;
			var summary = 'Travel request submitted: ' + service.value;
			ensureSession().then(function () { return request(cfg.api + 'web-travel-nonce', { method: 'GET', headers: sessionHeaders() }); }).then(function (n) { return request(cfg.travelApi, { method: 'POST', headers: { 'X-WP-Nonce': n.nonce }, body: JSON.stringify({ service: service.options[service.selectedIndex].text, name: name.value, email: email.value, details: details.value }) }); }).then(function (j) { status.textContent = j.message || d.submitted; card.reset(); send(summary); }).catch(function (err) { status.textContent = err.message || cfg.text.error; }).finally(function () { submit.disabled = false; });
		});
		slot.appendChild(card); card.scrollIntoView({ block: 'nearest' }); service.focus();
	}
})();

