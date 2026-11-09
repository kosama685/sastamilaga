/* Adds a "Order on WhatsApp" icon button to every product card (.sm-card) and video card (.smhv-card),
 * including cards rendered later by the SPA. The message carries the product name, price and page link. */
(function () {
  'use strict';
  if (window.__smWaCards) return; window.__smWaCards = true;
  var NUMBER = (window.SM_CONFIG && window.SM_CONFIG.whatsapp) || '966510451995';
  var ICON = '<svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.9 5.2 2.2.9 3 1 4.1.8.7-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5 0-.2-.3-.3-.6-.4z"/></svg>';

  function abs(href) {
    if (!href) return location.href;
    try { return new URL(href, location.href).href; } catch (e) { return href; }
  }
  function hrefOf(a) { return a ? a.getAttribute('href') : ''; }
  function text(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function link(name, price, url) {
    var msg = 'Assalam o Alaikum! I want to order:\n' + name + (price ? '\nPrice: ' + price : '') + '\nQuantity: 1\n' + url;
    var a = document.createElement('a');
    a.className = 'sm-wa-card'; a.target = '_blank'; a.rel = 'noopener';
    a.href = 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(msg);
    a.setAttribute('aria-label', 'Order ' + name + ' on WhatsApp'); a.title = 'Order on WhatsApp';
    a.innerHTML = ICON + '<span>WhatsApp</span>';
    a.addEventListener('click', function (e) { e.stopPropagation(); });
    return a;
  }
  function decorate(card) {
    if (card.__wa || card.querySelector('.sm-wa-card')) return; card.__wa = true;
    if (card.classList.contains('smhv-card')) {
      var name = card.getAttribute('data-vm-name') || text(card.querySelector('.smhv-name, b, h3, strong'));
      if (!name) return;
      var a = link(name, card.getAttribute('data-vm-price') || text(card.querySelector('.smhv-price')), abs(card.getAttribute('data-vm-url') || hrefOf(card.querySelector('a[href]'))));
      a.classList.add('sm-wa-card--float'); card.appendChild(a); return;
    }
    var t = card.querySelector('.sm-card__title a, .sm-card__title, h3');
    if (!t) return;
    var price = text(card.querySelector('.sm-card__price'));
    var w = link(text(t), price === 'Price on request' ? '' : price, abs(hrefOf(card.querySelector('.sm-card__title a') || card.querySelector('a[href]'))));
    var host = card.querySelector('.smqb-actions');
    if (!host) { host = document.createElement('div'); host.className = 'smqb-actions'; (card.querySelector('.sm-card__body') || card).appendChild(host); }
    host.appendChild(w);
  }
  function scan(root) {
    if (!root || !root.querySelectorAll) return;
    if (root.matches && root.matches('.sm-card, .smhv-card')) decorate(root);
    root.querySelectorAll('.sm-card, .smhv-card').forEach(decorate);
  }
  function start() {
    scan(document.body);
    new MutationObserver(function (list) { list.forEach(function (m) { m.addedNodes.forEach(scan); }); }).observe(document.body, { childList: true, subtree: true });
  }
  var css = document.createElement('style');
  css.textContent = '.sm-wa-card{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;background:#25d366;color:#fff!important;font:600 13px/1 inherit;text-decoration:none;box-shadow:0 2px 6px rgba(18,140,74,.25);transition:transform .2s cubic-bezier(.34,1.56,.64,1),opacity .2s}' +
    '.sm-wa-card:hover{transform:translateY(-1px)}.sm-wa-card:active{transform:scale(.96)}.sm-wa-card:focus-visible{outline:2px solid #075e54;outline-offset:2px}' +
    '.smqb-actions .sm-wa-card{flex:0 0 auto}.smqb-actions .sm-wa-card span{display:none}.smqb-actions .sm-wa-card{width:36px;padding:0}' +
    '.smhv-card{position:relative}.sm-wa-card--float{position:absolute;top:8px;right:8px;z-index:3;width:36px;padding:0}.sm-wa-card--float span{display:none}';
  document.head.appendChild(css);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
