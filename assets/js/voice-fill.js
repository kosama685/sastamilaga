/* Voice fill: a microphone button inside every text field of every form, plus a "Fill this form by voice" guided mode that walks the fields one by one.
   Uses the browser's own speech recognition (Chrome, Edge, Safari, Samsung Internet). Nothing is recorded or sent by this site.
   Browsers without it (for example Firefox) simply do not show the buttons; typing keeps working. Card, password, OTP and passport fields are never voice-filled. */
(function () {
  'use strict';
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR || window.__smVoiceFill) return;
  window.__smVoiceFill = true;

  var BLOCK = /pass(word|port)?|card|cvv|cvc|otp|pin\b|iban|secret|token|captcha|cc-/i;
  var SKIP_TYPES = /^(hidden|password|checkbox|radio|file|submit|button|reset|image|range|color|date|datetime-local|month|week|time|number)$/i;
  var LANGS = { ar: 'ar-SA', ur: 'ur-PK', en: 'en-PK', hi: 'hi-IN', fr: 'fr-FR', es: 'es-ES', de: 'de-DE', tr: 'tr-TR' };
  var MIC = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
  var active = null, guide = null;

  function lang() {
    var h = (document.documentElement.getAttribute('lang') || '').slice(0, 2).toLowerCase();
    try { var m = JSON.parse(localStorage.getItem('sm_market') || '{}'); if (!h && m.lang) h = String(m.lang).slice(0, 2); } catch (e) {}
    return LANGS[h] || (navigator.language || 'en-PK');
  }
  function eligible(el) {
    if (!el || el.disabled || el.readOnly || el.hasAttribute('data-no-voice') || el.closest('[data-no-voice]')) return false;
    var t = (el.getAttribute('type') || 'text').toLowerCase();
    if (el.tagName === 'INPUT' && SKIP_TYPES.test(t)) return false;
    if (BLOCK.test([el.name, el.id, el.getAttribute('autocomplete'), el.getAttribute('placeholder')].join(' '))) return false;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    // Anti-spam honeypots are hidden from people: a mic there is visible clutter and filling it gets the message rejected as spam.
    if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]') || el.getAttribute('tabindex') === '-1' || /honeypot|hpot|\bhp\b/i.test(el.className + ' ' + el.name + ' ' + el.id)) return false;
    // One mic per field: if the field's own form or search box already has a voice button (header search, chat), do not add a second.
    if (ownVoice(el)) return false;
    return true;
  }
  function ownVoice(el) {
    var box = el.closest('form, [role="search"]') || el.parentElement;
    if (!box) return false;
    return Array.prototype.some.call(box.querySelectorAll('button, [role="button"]'), function (b) {
      if (b.classList.contains('sm-vf__mic') || b.classList.contains('sm-vf-fill')) return false;
      return /voice|mic\b|microphone|speak|dictat/i.test([b.getAttribute('aria-label'), b.title, b.className, b.getAttribute('data-action')].join(' '));
    });
  }
  function labelOf(el) {
    var l = el.id && document.querySelector('label[for="' + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id) + '"]');
    var txt = (l && l.textContent) || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || 'this field';
    return txt.replace(/\s*\*+\s*$/, '').replace(/\s+/g, ' ').trim();
  }
  /* tidy what was heard so it fits the field */
  function shape(el, s) {
    var t = (el.getAttribute('type') || 'text').toLowerCase(), hint = (el.name + ' ' + el.id + ' ' + (el.getAttribute('autocomplete') || '')).toLowerCase();
    s = String(s || '').trim();
    if (t === 'email' || /email/.test(hint)) return s.toLowerCase().replace(/\s+at\s+(the\s+rate\s+)?/g, '@').replace(/\s+dot\s+/g, '.').replace(/\s+/g, '').replace(/[.,;]+$/, '');
    if (t === 'tel' || /phone|mobile|whatsapp|tel/.test(hint)) {
      var map = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
      s = s.toLowerCase().replace(/\bplus\b/g, '+').replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, function (w) { return map[w]; });
      return s.replace(/[^\d+]/g, '');
    }
    if (t === 'url') return s.toLowerCase().replace(/\s+dot\s+/g, '.').replace(/\s+/g, '');
    return el.tagName === 'TEXTAREA' ? s : s.replace(/[.]+$/, '');
  }
  function setValue(el, v) {
    if (el.tagName === 'SELECT') {
      var low = v.toLowerCase(), hit = null;
      Array.prototype.forEach.call(el.options, function (o) { if (!hit && o.text.trim() && o.text.toLowerCase().indexOf(low) > -1) hit = o; });
      if (!hit) Array.prototype.forEach.call(el.options, function (o) { if (!hit && o.text.trim() && low.indexOf(o.text.toLowerCase()) > -1) hit = o; });
      if (!hit) return false; el.value = hit.value;
    } else {
      var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, d = Object.getOwnPropertyDescriptor(proto, 'value');
      var next = (el.tagName === 'TEXTAREA' && el.value && el.dataset.smVoiceAppend ? el.value + ' ' : '') + v;
      if (d && d.set) d.set.call(el, next); else el.value = next;
    }
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  function status(msg) {
    var s = document.getElementById('sm-vf-status');
    if (!s) { s = document.createElement('div'); s.id = 'sm-vf-status'; s.setAttribute('role', 'status'); s.setAttribute('aria-live', 'polite'); document.body.appendChild(s); }
    s.textContent = msg || ''; s.classList.toggle('on', !!msg);
  }
  function stop() { if (active) { try { active.rec.abort(); } catch (e) {} active.btn && active.btn.classList.remove('listening'); active = null; } }

  /* listen once for one field; done(ok) is called when it ends */
  function listen(el, btn, done) {
    stop();
    var rec = new SR(); rec.lang = lang(); rec.interimResults = false; rec.maxAlternatives = 1; rec.continuous = false;
    var got = false; active = { rec: rec, btn: btn };
    if (btn) { btn.classList.add('listening'); btn.setAttribute('aria-pressed', 'true'); }
    status('Listening for ' + labelOf(el) + '…');
    rec.onresult = function (e) { var r = e.results[0] && e.results[0][0]; if (r && r.transcript) { got = setValue(el, shape(el, r.transcript)); } };
    rec.onerror = function (e) { status(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microphone is blocked. Allow it in the browser address bar, or type instead.' : (e.error === 'no-speech' ? 'I did not hear anything. Tap the mic to try again.' : '')); };
    rec.onend = function () { if (btn) { btn.classList.remove('listening'); btn.setAttribute('aria-pressed', 'false'); } if (active && active.rec === rec) active = null; if (!guide) setTimeout(function () { status(''); }, got ? 0 : 2500); if (done) done(got); };
    try { rec.start(); } catch (e) { if (done) done(false); }
  }

  function decorate(el) {
    if (el.__smvf || !eligible(el)) return; el.__smvf = true;
    var wrap = document.createElement('span'); wrap.className = 'sm-vf'; if (el.tagName === 'TEXTAREA') wrap.classList.add('sm-vf--area');
    el.parentNode.insertBefore(wrap, el); wrap.appendChild(el);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sm-vf__mic'; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Speak to fill: ' + labelOf(el)); b.title = 'Speak to fill'; b.innerHTML = MIC;
    b.addEventListener('click', function (e) { e.preventDefault(); if (active && active.btn === b) { stop(); status(''); } else { el.dataset.smVoiceAppend = '1'; listen(el, b); } });
    wrap.appendChild(b);
  }

  /* guided mode: asks for each empty field in turn */
  function guided(form) {
    var list = Array.prototype.filter.call(form.querySelectorAll('input,textarea,select'), function (el) { return (el.tagName === 'SELECT' ? !el.disabled && el.offsetParent !== null : eligible(el)) && !el.value; });
    if (!list.length) { status('Every field already has an answer.'); setTimeout(function () { status(''); }, 2500); return; }
    var i = 0; guide = { stopped: false };
    var bar = document.createElement('div'); bar.className = 'sm-vf-guide'; bar.innerHTML = '<b></b><span></span><button type="button" data-a="skip">Skip</button><button type="button" data-a="stop">Stop</button>';
    document.body.appendChild(bar);
    function end() { guide = null; stop(); bar.remove(); status(''); }
    function step() {
      if (!guide || guide.stopped || i >= list.length) { end(); status('Voice fill finished. Please check the answers.'); setTimeout(function () { status(''); }, 3500); return; }
      var el = list[i]; try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); } catch (e) {}
      bar.firstChild.textContent = (i + 1) + ' / ' + list.length; bar.children[1].textContent = 'Say: ' + labelOf(el);
      listen(el, el.parentNode && el.parentNode.querySelector && el.parentNode.querySelector('.sm-vf__mic'), function () { i++; setTimeout(step, 350); });
    }
    bar.addEventListener('click', function (e) { var a = e.target.getAttribute && e.target.getAttribute('data-a'); if (a === 'stop') { guide.stopped = true; end(); } else if (a === 'skip') { stop(); } });
    step();
  }
  function banner(form) {
    if (form.__smvfb || form.hasAttribute('data-no-voice') || form.getAttribute('role') === 'search' || form.matches('.search-form,.sm-search,[class*="search"]')) return;
    var fields = form.querySelectorAll('input:not([type=hidden]):not([type=password]):not([type=checkbox]):not([type=radio]):not([type=submit]),textarea,select');
    if (fields.length < 3) return; form.__smvfb = true;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'sm-vf-fill'; b.innerHTML = MIC + '<span>Fill this form by voice</span>';
    b.addEventListener('click', function () { guided(form); });
    /* Never make the button a layout cell. The WooCommerce checkout form is a two-column grid (main | order summary): a button inserted
       as its first child took the first cell and pushed billing to the right and "Your order" to the bottom left (2026-11-21). */
    var wcFields = form.querySelector('.woocommerce-billing-fields__field-wrapper');
    if (wcFields) { b.classList.add('sm-vf-fill--inline'); wcFields.parentNode.insertBefore(b, wcFields); return; }
    var display = ''; try { display = getComputedStyle(form).display; } catch (e) {}
    if (/grid|flex/.test(display)) {
      var top = fields[0]; while (top && top.parentNode !== form) top = top.parentNode;
      if (top && top !== fields[0]) { b.classList.add('sm-vf-fill--inline'); top.insertBefore(b, top.firstChild); return; }
      if (/grid/.test(display)) b.style.gridColumn = '1 / -1';   // a field that is itself a grid cell: span the full row instead of taking one
    }
    form.insertBefore(b, form.firstChild);
  }

  function scan(root) {
    (root || document).querySelectorAll('form input, form textarea').forEach(decorate);
    (root || document).querySelectorAll('form').forEach(banner);
  }
  var pending = 0;
  function later() { if (pending) return; pending = setTimeout(function () { pending = 0; scan(); }, 250); }
  function init() { scan(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
