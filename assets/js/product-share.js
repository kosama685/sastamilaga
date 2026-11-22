/* Sasta Milaga — dependency-free, accessible PDP sharing (static local + edge CJ).
 * Display only on actual product-detail pages. Never touches cart, payment or pricing.
 */
(function () {
  'use strict';
  if (window.SMProductShareV1) return;
  window.SMProductShareV1 = true;

  var svg = {
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.1 11.6a8.1 8.1 0 0 1-12 7.1L4 20l1.3-4a8.1 8.1 0 1 1 14.8-4.4Z"/><path d="M9.2 8.5c.4 2.2 2.2 4.2 4.6 5.1l1.4-1.3 2 1.2c-.6 1.8-2.3 2.5-4.1 1.7-2.6-1.1-4.6-3.2-5.4-5.8-.4-1.4.1-2.5 1.5-3.1l1.6 1.4-1 2Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-4 18-6.2-5.4-3.3 2.6.8-4.7L3 11.2 21 3Z"/><path d="m8.3 13.5 9-7.3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.6" r=".6" fill="currentColor" stroke="none"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.1 1.1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1.1-1.1"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 11 7.7-4.8M8 13l7.7 4.8"/></svg>'
  };

  function cleanUrl() {
    var canonical = document.querySelector('link[rel="canonical"]');
    var proposed = canonical && canonical.href ? canonical.href : location.href;
    try {
      var u = new URL(proposed, location.href);
      if (u.protocol !== 'https:' || (u.hostname !== 'sastamilaga.com' && u.hostname !== 'www.sastamilaga.com')) {
        u = new URL(location.href);
      }
      u.search = '';
      u.hash = '';
      return u.href;
    } catch (_) { return location.href.split(/[?#]/)[0]; }
  }

  function productImage() {
    var meta = document.querySelector('meta[property="og:image"]');
    var img = document.querySelector('main .pdp .gallery-main img');
    var v = (meta && meta.content) || (img && img.currentSrc) || (img && img.src) || '';
    try {
      var u = new URL(v, location.href);
      return u.protocol === 'https:' ? u.href : '';
    } catch (_) { return ''; }
  }

  function init() {
    var panel = document.querySelector('main .pdp .buy-panel');
    if (!panel || panel.querySelector('[data-sm-product-share]')) return;
    var h = panel.querySelector('h1');
    if (!h) return;
    var title = (h.textContent || '').trim().slice(0, 200) || 'Sasta Milaga product';
    var url = cleanUrl(), image = productImage();
    var enc = encodeURIComponent;
    var msg = title + '\n' + url;

    var targets = [
      {label:'WhatsApp', mark:svg.whatsapp, color:'#128c45', href:'https://api.whatsapp.com/send?text='+enc(msg)},
      {label:'Facebook', mark:'f', color:'#1877f2', href:'https://www.facebook.com/sharer/sharer.php?u='+enc(url)},
      {label:'X', mark:'𝕏', color:'#111827', href:'https://twitter.com/intent/tweet?text='+enc(title)+'&url='+enc(url)},
      {label:'Telegram', mark:svg.telegram, color:'#229ed9', href:'https://t.me/share/url?url='+enc(url)+'&text='+enc(title)},
      {label:'Pinterest', mark:'P', color:'#bd081c', href:image?'https://www.pinterest.com/pin/create/button/?url='+enc(url)+'&media='+enc(image)+'&description='+enc(title):null, fallback:'copy'},
      {label:'LinkedIn', mark:'in', color:'#0a66c2', href:'https://www.linkedin.com/sharing/share-offsite/?url='+enc(url)},
      {label:'Reddit', mark:'r/', color:'#ff4500', href:'https://www.reddit.com/submit?url='+enc(url)+'&title='+enc(title)},
      {label:'LINE', mark:'LINE', color:'#06c755', href:'https://social-plugins.line.me/lineit/share?url='+enc(url)},
      {label:'VK', mark:'vk', color:'#0077ff', href:'https://vk.com/share.php?url='+enc(url)+'&title='+enc(title)},
      {label:'Email', mark:svg.mail, color:'#475467', href:'mailto:?subject='+enc(title)+'&body='+enc(msg)},
      {label:'Instagram', mark:svg.instagram, color:'#bd327e', fallback:'native'},
      {label:'TikTok', mark:'♪', color:'#141414', fallback:'native'},
      {label:'Copy link', mark:svg.link, color:'#176548', fallback:'copy'},
      {label:'More apps', mark:svg.more, color:'#344054', fallback:'native'}
    ];

    var outer = document.createElement('section');
    outer.className = 'smps-panel';
    outer.setAttribute('data-sm-product-share', '');
    outer.setAttribute('aria-label', 'Share this product');
    var head = document.createElement('div'); head.className = 'smps-heading';
    var headline = document.createElement('h2'); headline.textContent = 'Share this product';
    var note = document.createElement('p'); note.textContent = 'Send the product link to friends and family';
    head.appendChild(headline); head.appendChild(note);
    var grid = document.createElement('div'); grid.className = 'smps-grid';
    grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'Share options');
    var status = document.createElement('p'); status.className = 'smps-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.hidden = true;

    function feedback(message) { status.hidden = false; status.textContent = message; }
    function copy(targetName) {
      function fallbackCopy() {
        var field = document.createElement('textarea');
        field.value = url; field.setAttribute('readonly', '');
        field.style.cssText = 'position:fixed;left:-10000px;top:0';
        document.body.appendChild(field); field.select();
        var success = false;
        try { success = !!document.execCommand('copy'); } catch (_) {}
        field.remove();
        feedback(success ? 'Product link copied for ' + targetName + '.' : 'Copy this URL to share: ' + url);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          feedback('Product link copied for ' + targetName + '.');
        }).catch(fallbackCopy);
      } else fallbackCopy();
    }
    function nativeShare(label) {
      if (navigator.share) {
        navigator.share({title:title,text:title,url:url}).catch(function (error) {
          if (!error || error.name !== 'AbortError') copy(label);
        });
      } else copy(label);
    }

    targets.forEach(function (item) {
      var el = item.href ? document.createElement('a') : document.createElement('button');
      if (item.href) {
        el.href = item.href;
        if (!item.href.startsWith('mailto:')) {
          el.target = '_blank'; el.rel = 'noopener noreferrer';
        }
      } else el.type = 'button';
      el.className = 'smps-option';
      el.style.setProperty('--smps-color', item.color);
      el.setAttribute('aria-label', 'Share on ' + item.label);
      var mark = document.createElement('span'); mark.className = 'smps-mark';
      mark.setAttribute('aria-hidden', 'true');
      if (item.mark && item.mark.startsWith('<svg')) mark.innerHTML = item.mark;
      else mark.textContent = item.mark;
      var label = document.createElement('span'); label.className = 'smps-label'; label.textContent = item.label;
      el.appendChild(mark); el.appendChild(label);
      if (!item.href) {
        el.addEventListener('click', function () {
          if (item.fallback === 'native') nativeShare(item.label);
          else copy(item.label);
        });
      }
      grid.appendChild(el);
    });

    var foot = document.createElement('p');
    foot.className = 'smps-footnote';
    foot.textContent = 'Instagram, TikTok and unsupported apps use your device share menu or a copied link.';
    outer.appendChild(head); outer.appendChild(grid); outer.appendChild(status); outer.appendChild(foot);
    var wa = panel.querySelector('.sm-wa-btn');
    if (wa) wa.insertAdjacentElement('afterend', outer);
    else panel.appendChild(outer);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
