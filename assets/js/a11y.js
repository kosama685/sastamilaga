/* Accessibility repairs for markup produced by the theme scripts (applied now and to anything rendered later). */
(function () {
  'use strict';
  function fix() {
    var i, el, list;
    // search-as-you-type inputs use aria-expanded: that attribute needs the combobox role
    list = document.querySelectorAll('input[aria-autocomplete][aria-expanded]:not([role])'); for (i = 0; i < list.length; i++) list[i].setAttribute('role', 'combobox');
    // a hidden panel must not be reachable with the keyboard
    list = document.querySelectorAll('#chatbot, .chatbot'); for (i = 0; i < list.length; i++) { el = list[i]; var hidden = el.getAttribute('aria-hidden') === 'true'; if (hidden && !el.inert) el.inert = true; else if (!hidden && el.inert) el.inert = false; }
    // icon-only links need a name
    list = document.querySelectorAll('a.smh-tool--acc, a.smh-tool--cart, a.smh-tool--wish'); for (i = 0; i < list.length; i++) { el = list[i]; if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.classList.contains('smh-tool--acc') ? 'Account' : el.classList.contains('smh-tool--cart') ? 'Cart' : 'Saved items'); }
  }
  var q = false; function run() { if (q) return; q = true; (window.requestAnimationFrame || setTimeout)(function () { q = false; fix(); }); }
  run(); document.addEventListener('DOMContentLoaded', run);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden'] });
})();
