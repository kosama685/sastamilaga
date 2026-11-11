/* Interface language for visitors who pick one of the machine-translated languages in the country/language chooser.
   - Only fixed interface text (menus, header, footer, buttons) is replaced, by exact match with the English text; product names,
     descriptions, prices and legal pages are never touched.
   - The translations are machine-made and NOT reviewed by a person: a notice says so and offers "Show in English".
   - Nothing changes for crawlers: URLs, titles, canonical and hreflang stay as they are (hreflang is only for the languages with reviewed pages). */
(function () {
  'use strict';
  if (window.SMI18n) return;
  var MT = 'ar hi bn fr es de tr id fa ps sd pa ru zh pt'.split(' '), RTL = { ar: 1, fa: 1, ps: 1, sd: 1 };
  var NOTE = {
    ar: ['ترجمة آلية للواجهة، لم تُراجَع من قبل شخص.', 'عرض بالإنجليزية'], hi: ['इंटरफ़ेस का मशीन अनुवाद, किसी व्यक्ति ने समीक्षा नहीं की है।', 'अंग्रेज़ी में देखें'], bn: ['ইন্টারফেসের মেশিন অনুবাদ, কোনো ব্যক্তি পর্যালোচনা করেননি।', 'ইংরেজিতে দেখুন'],
    fr: ['Interface traduite automatiquement, non relue par une personne.', 'Voir en anglais'], es: ['Interfaz traducida automáticamente, no revisada por una persona.', 'Ver en inglés'], de: ['Maschinell übersetzte Oberfläche, nicht von einer Person geprüft.', 'Auf Englisch anzeigen'],
    tr: ['Arayüz makine çevirisidir, bir kişi tarafından gözden geçirilmemiştir.', 'İngilizce göster'], id: ['Antarmuka diterjemahkan mesin, belum ditinjau oleh manusia.', 'Tampilkan dalam bahasa Inggris'], fa: ['ترجمه ماشینی رابط کاربری، توسط انسان بازبینی نشده است.', 'نمایش به انگلیسی'],
    ps: ['د انټرفیس ماشیني ژباړه، د یو کس لخوا نه ده کتل شوې.', 'په انګلیسي وښایه'], sd: ['انٽرفيس جو مشيني ترجمو، ڪنهن ماڻهو نه ڏٺو آهي.', 'انگريزي ۾ ڏيکاريو'], pa: ['ਇੰਟਰਫ਼ੇਸ ਦਾ ਮਸ਼ੀਨੀ ਅਨੁਵਾਦ, ਕਿਸੇ ਵਿਅਕਤੀ ਨੇ ਸਮੀਖਿਆ ਨਹੀਂ ਕੀਤੀ।', 'ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਵੇਖੋ'],
    ru: ['Интерфейс переведён машиной и не проверен человеком.', 'Показать на английском'], zh: ['界面为机器翻译，未经人工审核。', '显示英文'], pt: ['Interface traduzida automaticamente, não revisada por uma pessoa.', 'Ver em inglês']
  };
  var SELF = (document.currentScript && document.currentScript.src) || '';
  function cookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  function wanted() {
    var l = '';
    try { var s = window.SMMarket && window.SMMarket.state(); l = s && s.lang; } catch (e) { }
    if (!l) { try { l = (JSON.parse(localStorage.getItem('sm_market') || '{}') || {}).lang; } catch (e) { } }
    l = String(l || new URLSearchParams(location.search).get('gdcs_lang') || cookie('sm_lang') || 'en').toLowerCase();
    return MT.indexOf(l) >= 0 ? l : '';
  }
  var lang = '', map = null, busy = false, ATTRS = ['placeholder', 'aria-label', 'title'], SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|NOSCRIPT)$/;
  function key(s) { return s.replace(/\s+/g, ' ').trim(); }
  function walk(root) {
    if (!map || !root) return; busy = true;
    var base = root.nodeType === 1 ? root : document.body;
    var w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return p && !SKIP.test(p.nodeName) && !(p.closest && p.closest('[data-no-mt]')) && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } }), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) { var v = map[key(t.nodeValue)]; if (v) t.nodeValue = t.nodeValue.replace(t.nodeValue.trim(), v); });
    Array.prototype.forEach.call(base.querySelectorAll('[placeholder],[aria-label],[title]'), function (e) { ATTRS.forEach(function (a) { var v = e.getAttribute(a), t = v && map[key(v)]; if (t) e.setAttribute(a, t); }); });
    busy = false;
  }
  function banner() {
    if (document.getElementById('sm-mt-note')) return; var t = NOTE[lang]; if (!t) return;
    var d = document.createElement('div'); d.id = 'sm-mt-note'; d.setAttribute('role', 'status'); d.setAttribute('data-no-mt', ''); d.lang = lang; d.dir = RTL[lang] ? 'rtl' : 'ltr';
    d.style.cssText = 'position:fixed;z-index:99991;left:12px;right:12px;bottom:12px;max-width:560px;margin:0 auto;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;padding:10px 14px;border-radius:14px;background:#0B3B20;color:#fff;font:500 13px/1.5 system-ui,sans-serif;box-shadow:0 14px 30px -12px rgba(11,59,32,.6)';
    d.innerHTML = '<span></span><button type="button" style="min-height:34px;padding:0 14px;border:0;border-radius:999px;font:600 13px/1 inherit;cursor:pointer;background:#fff;color:#11261b"></button><button type="button" aria-label="Close" style="min-height:34px;width:34px;border:0;border-radius:50%;cursor:pointer;background:transparent;color:#fff;font-size:18px">×</button>';
    var b = d.querySelectorAll('button'); d.firstChild.textContent = t[0]; b[0].textContent = t[1];
    b[0].addEventListener('click', function () { try { var s = JSON.parse(localStorage.getItem('sm_market') || '{}'); s.lang = 'en'; localStorage.setItem('sm_market', JSON.stringify(s)); } catch (e) { } document.cookie = 'sm_lang=en;path=/;max-age=31536000'; var u = new URL(location.href); u.searchParams.delete('gdcs_lang'); location.href = u.toString(); });
    b[1].addEventListener('click', function () { d.remove(); });
    document.body.appendChild(d);
  }
  function start() {
    var l = wanted(); if (!l) return; lang = l;
    var base = SELF ? SELF.replace(/assets\/js\/i18n\.js.*$/, '') : location.origin + '/';
    fetch(base + 'data/i18n/mt/' + l + '.json', { cache: 'force-cache' })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
        if (!j || !j.strings) return; map = {}; Object.keys(j.strings).forEach(function (k) { map[key(k)] = j.strings[k]; });
        document.documentElement.setAttribute('data-mt', l); document.documentElement.setAttribute('lang', l); if (RTL[l]) document.documentElement.setAttribute('dir', 'rtl');
        walk(document.body); banner();
        var q = null; new MutationObserver(function () { if (busy) return; clearTimeout(q); q = setTimeout(function () { walk(document.body); }, 120); }).observe(document.body, { childList: true, subtree: true });
      }).catch(function () { });
  }
  window.SMI18n = { lang: function () { return lang; }, languages: MT.slice() };
  window.addEventListener('sm:market', function () { var l = wanted(); if (l !== lang) location.reload(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
