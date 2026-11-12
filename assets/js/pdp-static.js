/* Product pages (p/*.html, 20,165 generated files): upgrades the page in the browser to the three-column product layout
   (gallery with thumbnails | buying panel with live total | delivery information), adds a quantity selector, tabs, share and trust icons.
   Everything shown comes from the page itself (name, price, description, tags, SKU) and the site config (delivery fee, free-delivery limit).
   The Add to cart / Buy now buttons themselves are handled in chrome.js. Pages without this script keep working as plain pages. */
(function () {
  'use strict';
  var pdp = document.querySelector('main .pdp'), buy = pdp && pdp.querySelector('.buy-panel');
  if (!pdp || !buy || !buy.querySelector('.buy-actions') || pdp.classList.contains('pdp3')) return;
  var holder = document.getElementById('sm-chrome-header'), prefix = (holder && holder.getAttribute('data-prefix')) || '../';
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function ic(d, s) { s = s || 22; return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var TRUCK = '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/>';
  function run() {
    var C = window.SM_CONFIG || {}, free = C.freeDeliveryFrom || 5000, fee = C.deliveryFee || 250;
    var PKR = new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 });
    var bp = buy.querySelector('.big-price'), pm = bp && /Rs\s*([\d,]+(?:\.\d+)?)/.exec(bp.textContent), unit = pm ? Number(pm[1].replace(/,/g, '')) : 0;   /* only the rupee amount: the currency converter appends another price to this element */
    var first = pdp.firstElementChild, gallery = first && first.querySelector('.gallery-panel'), detail = first && first.querySelector('.detail-panel');
    if (!gallery) return;
    pdp.classList.add('pdp3'); pdp.insertBefore(gallery, buy);
    /* thumbnails: the main photo plus the others, all clickable */
    var main = gallery.querySelector('.gallery-main img'), strip = gallery.querySelector('.gallery-thumbs'), urls = [];
    if (main) urls.push({ u: main.getAttribute('src'), a: main.getAttribute('alt') || '' });
    if (strip) strip.querySelectorAll('img').forEach(function (i) { urls.push({ u: i.getAttribute('src'), a: i.getAttribute('alt') || '' }); });
    if (strip && main && urls.length > 1) {
      strip.className = 'gallery-thumbs'; strip.innerHTML = urls.map(function (x, i) { return '<button type="button" class="' + (i ? '' : 'active') + '" data-u="' + x.u.replace(/"/g, '&quot;') + '" aria-label="Show image ' + (i + 1) + '"><img src="' + x.u.replace(/"/g, '&quot;') + '" alt="" width="70" height="70" loading="lazy"></button>'; }).join('');
      strip.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[data-u]'); if (!b) return; e.preventDefault(); main.src = b.getAttribute('data-u'); strip.querySelectorAll('button').forEach(function (x) { x.classList.toggle('active', x === b); }); });
    } else if (strip) strip.remove();
    /* quantity + live total */
    var actions = buy.querySelector('.buy-actions');
    var qtyBox = el('<div class="sm-qty" role="group" aria-label="Quantity"><span>Quantity</span><button type="button" data-q="-1" aria-label="Decrease quantity">−</button><b id="pdpQty" aria-live="polite">1</b><button type="button" data-q="1" aria-label="Increase quantity">+</button></div>');
    var total = unit ? el('<div class="sm-total" id="pdpTotal" role="status" aria-live="polite"></div>') : null;
    buy.insertBefore(qtyBox, actions); if (total) buy.insertBefore(total, actions);
    function qty() { return Math.max(1, Number((document.getElementById('pdpQty') || {}).textContent) || 1); }
    function paint() {
      if (!total) return; var q = qty(), sub = unit * q, del = sub > free ? 0 : fee;
      total.innerHTML = '<dl><div><dt>Price × ' + q + '</dt><dd>' + PKR.format(sub) + '</dd></div><div><dt>Delivery in Pakistan</dt><dd>' + (del ? PKR.format(del) : 'Free') + '</dd></div><div class="sm-total__sum"><dt>Total</dt><dd>' + PKR.format(sub + del) + '</dd></div></dl><small>Cash on delivery. ' + (sub > free ? 'Your order qualifies for free delivery.' : 'Add ' + PKR.format(free - sub + 1) + ' more for free delivery.') + '</small>';
    }
    qtyBox.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('button[data-q]'); if (!b) return; e.preventDefault(); document.getElementById('pdpQty').textContent = Math.max(1, qty() + Number(b.getAttribute('data-q'))); paint(); });
    paint();
    /* trust icons replace the generated facts list (which still quoted an old delivery charge) */
    var facts = buy.querySelector('.sm-buy-facts');
    var trust = el('<ul class="sm-trust" role="list"><li>' + ic('<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>', 24) + '<span>Cash on delivery</span></li><li>' + ic('<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>', 24) + '<span>7-day return requests</span></li><li>' + ic(TRUCK, 24) + '<span>Delivery across Pakistan</span></li><li>' + ic('<path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3a8.5 8.5 0 1 1 15.4-4.6Z"/>', 24) + '<span>WhatsApp support</span></li></ul>');
    if (facts) facts.replaceWith(trust); else buy.appendChild(trust);
    /* side column */
    var url = (document.querySelector('link[rel=canonical]') || {}).href || location.href, title = (buy.querySelector('h1') || {}).textContent || document.title;
    var side = el('<div class="pdp-side"><section class="sm-del" aria-labelledby="del-h"><h2 id="del-h">' + ic(TRUCK) + ' Delivery information</h2><div class="sm-del__row">' + ic(TRUCK, 24) + '<b>Standard delivery</b><small>Across Pakistan. Free on orders over ' + PKR.format(free) + ', otherwise ' + PKR.format(fee) + '. Delivery time is confirmed on WhatsApp.</small></div><div class="sm-del__row">' + ic('<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>', 24) + '<b>Pay on delivery</b><small>Cash on delivery across Pakistan, or bank transfer and PayPal at checkout.</small></div><div class="sm-del__row">' + ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', 24) + '<b>Outside Pakistan?</b><small>Browse the <a href="' + prefix + 'global-shop/">Global shop</a> for worldwide delivery with the carrier price for your country.</small></div></section>' +
      '<section class="pdp-share"><h2>Share this product</h2><div class="sm-share"><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(title + ' ' + url) + '">WhatsApp</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">Facebook</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title) + '">X</a><a class="sm-btn sm-btn--ghost" target="_blank" rel="noopener" href="https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title) + '">Telegram</a></div></section>' +
      '<a class="pdp-promo" href="' + prefix + 'travel/"><b>Book your next adventure</b><small>Flights · Hotels · Umrah packages</small><span>Book now ›</span></a></div>');
    pdp.appendChild(side);
    /* tabs: the description and tags move out of the grid into a tabbed block */
    if (detail) {
      var desc = detail.querySelector('p:not(.product-meta)'), tags = detail.querySelector('.tags-wrap'), meta = detail.querySelector('.product-meta');
      var tabs = el('<section class="sm-tabs" aria-label="Product information"><div role="tablist" aria-label="Product information tabs"><button type="button" role="tab" aria-selected="true" data-tab="tab-d">Description</button><button type="button" role="tab" aria-selected="false" data-tab="tab-s">Details</button><button type="button" role="tab" aria-selected="false" data-tab="tab-r">Delivery &amp; returns</button></div><div role="tabpanel" id="tab-d"></div><div role="tabpanel" id="tab-s" hidden></div><div role="tabpanel" id="tab-r" hidden><p style="margin:0">Cash on delivery across Pakistan. Delivery is free on orders over ' + PKR.format(free) + ', otherwise ' + PKR.format(fee) + '. If an item arrives damaged or wrong, send us a return request within 7 days on WhatsApp.</p></div></section>');
      if (desc) tabs.querySelector('#tab-d').appendChild(desc); else tabs.querySelector('#tab-d').textContent = 'Full product details at Sasta Milaga.';
      var s = tabs.querySelector('#tab-s'); if (meta) { meta.style.margin = '0 0 .6rem'; s.appendChild(meta); } if (tags) s.appendChild(tags);
      pdp.parentNode.insertBefore(tabs, pdp.nextSibling);
    }
    if (first) first.remove();
    document.dispatchEvent(new CustomEvent('sm:pdp-ready'));
  }
  if (window.SM_CONFIG) run(); else { var s = document.createElement('script'); s.src = prefix + 'assets/js/config.js'; s.onload = run; s.onerror = run; document.head.appendChild(s); }
})();
