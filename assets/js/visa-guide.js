/* Visa guides (tools/build-visa-pages.mjs): live filter for the country directory under the /visa/ tool. */
(function () {
  'use strict';
  function init() {
    var input = document.querySelector('[data-sv-filter]');
    if (!input || input.__sv) return; input.__sv = true;
    var norm = function (s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); };
    var alias = { dubai: 'united arab emirates', uae: 'united arab emirates', uk: 'united kingdom', england: 'united kingdom', usa: 'united states', america: 'united states', ksa: 'saudi arabia', turkey: 'turkiye', schengen: '' };
    input.addEventListener('input', function () {
      var q = norm(input.value.trim()); if (alias[q] !== undefined) q = alias[q] || q;
      document.querySelectorAll('[data-sv-region]').forEach(function (g) {
        var any = false;
        g.querySelectorAll('[data-sv-name]').forEach(function (li) { var hit = !q || norm(li.getAttribute('data-sv-name')).indexOf(q) >= 0 || (q === 'schengen' && /schengen/i.test(g.textContent)); li.hidden = !hit; any = any || hit; });
        g.hidden = !any;
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
