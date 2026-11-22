/* Sasta Milaga order-reference QR. A QR is NOT an invoice/payment verification.
   Display only after Formspree has acknowledged a request, or PayPal payment is pending.
   No personal data, customer address, item list or card information enters the QR. */
(function () {
  'use strict';
  const status = document.getElementById('sm-request-status');
  const control = document.getElementById('sm-copy-reference');
  if (!status || !control) return;
  const REF = /^SM-REQ-[A-F0-9]{20}$/;
  const VALID_IN_STATUS = /SM-REQ-[A-F0-9]{20}/;
  const VERIFIED_PAGE = 'https://sastamilaga.com/invoice/verify/';
  const area = document.createElement('section');
  area.id = 'sm-qr-reference';
  area.className = 'sm-qr-reference';
  area.hidden = true;
  area.setAttribute('aria-label', 'Order reference QR');
  area.innerHTML = '<h3>Generate invoice/reference QR</h3>'+
    '<p class="note">Scannable request reference only. This does not confirm an invoice, payment, stock or order acceptance.</p>'+
    '<button type="button" id="sm-make-reference-qr">Generate QR code</button>'+
    '<div id="sm-qr-output" hidden><div id="sm-qr-image" role="img" aria-label="QR code containing the order verification link"></div>'+
    '<p class="note" id="sm-qr-reference-code"></p>'+
    '<p class="note">Scanning opens a verification page. Only an authenticated merchant record can confirm payment.</p>'+
    '<button type="button" id="sm-copy-verification-url">Copy verification link</button></div>'+
    '<p id="sm-qr-error" role="status" aria-live="polite"></p>';
  control.parentNode.insertAdjacentElement('afterend', area);
  const drawButton = area.querySelector('#sm-make-reference-qr');
  const copyButton = area.querySelector('#sm-copy-verification-url');
  const output = area.querySelector('#sm-qr-output');
  const image = area.querySelector('#sm-qr-image');
  const refLabel = area.querySelector('#sm-qr-reference-code');
  const error = area.querySelector('#sm-qr-error');
  let active = '', loaded = null;
  function acknowledged() {
    const text = status.textContent || '';
    if (!/Formspree acknowledged request|Order details saved|Payment is pending|payment cancelled|payment is awaiting verification/i.test(text)) return '';
    const match = text.match(VALID_IN_STATUS);
    return match && REF.test(match[0]) ? match[0] : '';
  }
  function update() {
    const value = acknowledged();
    area.hidden = !value;
    if (value !== active) {
      active = value; output.hidden = true; image.replaceChildren(); error.textContent = '';
    }
  }
  function loadQr() {
    if (window.QRCode) return Promise.resolve();
    if (loaded) return loaded;
    loaded = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/assets/vendor/qrcode-1.0.0.min.js';
      script.onload = () => window.QRCode ? resolve() : reject(Error('QRCode library unavailable'));
      script.onerror = () => reject(Error('QR library could not load'));
      document.head.append(script);
    }).catch(e => { loaded = null; throw e; });
    return loaded;
  }
  function url() { return VERIFIED_PAGE + '?ref=' + encodeURIComponent(active); }
  drawButton.addEventListener('click', async () => {
    if (!active || !REF.test(active)) return;
    drawButton.disabled = true;
    error.textContent = '';
    try {
      await loadQr();
      image.replaceChildren();
      new QRCode(image, { text: url(), width: 180, height: 180, colorDark: '#0b3b20', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
      refLabel.textContent = 'Reference: ' + active;
      output.hidden = false;
    } catch (_) {
      error.textContent = 'QR display unavailable. Use Copy reference or ask support. No payment status is changed.';
    } finally { drawButton.disabled = false; }
  });
  copyButton.addEventListener('click', () => {
    if (!active) return;
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(url()).then(() => { error.textContent = 'Verification link copied.'; }).catch(() => { error.textContent = 'Copy: '+url(); });
    else error.textContent = 'Copy: '+url();
  });
  new MutationObserver(update).observe(status, {childList:true,subtree:true,characterData:true});
  update();
})();
