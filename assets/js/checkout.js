/* PayPal for the local-products checkout (#/checkout).
   Active only when SM_CONFIG.paypalClientId is set (public Client ID – no secrets here).
   PayPal does not accept PKR: the PKR total (items + delivery) is converted to USD with today's
   rate from open.er-api.com and shown before the customer pays. After capture the order is sent
   to the order inbox (SM_CONFIG.orderEndpoint) with the PayPal order ID for fulfilment. */
(function () {
  'use strict';
  const A = window.SMApp, C = window.SM_CONFIG || {};
  /* Both are required: the public Client ID for the buttons and the Worker that creates, captures and verifies orders. */
  if (!A || !C.paypalClientId || !C.paypalWorker) return;
  const W = C.paypalWorker.replace(/\/$/, '');
  const post = (path, body) => fetch(W + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json().then(j => { if (!r.ok) throw new Error(j.error || 'Payment service error'); return j; }));
  let sdk = null, rate = null;

  function loadSdk() {
    return sdk || (sdk = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(C.paypalClientId)}&currency=${C.paypalCurrency || 'USD'}&intent=capture&components=buttons`;
      s.onload = () => res(window.paypal); s.onerror = () => { sdk = null; rej(new Error('PayPal could not load')); };
      document.head.appendChild(s);
    }));
  }
  function loadRate() {
    return rate ? Promise.resolve(rate) : fetch('https://open.er-api.com/v6/latest/PKR').then(r => r.json()).then(j => {
      const v = j && j.rates && j.rates[C.paypalCurrency || 'USD'];
      if (!v) throw new Error('No exchange rate'); rate = { v, at: j.time_last_update_utc }; return rate;
    });
  }
  function totals() {
    const rows = A.getCart().map(x => ({ p: A.products.find(p => p.id === x.id), qty: x.qty })).filter(x => x.p && A.price(x.p));
    const sub = rows.reduce((a, x) => a + A.price(x.p) * x.qty, 0);
    const delivery = sub > (C.freeDeliveryFrom || 5000) ? 0 : (C.deliveryFee || 250);
    return { rows, sub, delivery, total: sub + delivery };
  }

  function enhance() {
    if (!/^#\/checkout/.test(location.hash) && !(A.cleanRoute && A.cleanRoute(location.pathname) === 'checkout')) return;
    const form = document.getElementById('checkoutForm');
    if (!form || form.dataset.paypal) return;
    form.dataset.paypal = '1';
    const sel = form.querySelector('select[name="payment_method"]');
    const submit = form.querySelector('button[type="submit"]');
    sel.insertAdjacentHTML('beforeend', '<option value="PayPal">PayPal or card (pay now in USD)</option>');
    form.insertAdjacentHTML('beforeend', '<div class="sm-paypal" id="smPaypal" hidden><p class="sm-paypal__fx" id="smPaypalFx" role="status" aria-live="polite">Getting today\'s exchange rate…</p><div id="smPaypalButtons"></div></div>');
    const box = document.getElementById('smPaypal'), fx = document.getElementById('smPaypalFx');
    let rendered = false;
    sel.addEventListener('change', async () => {
      const on = sel.value === 'PayPal';
      box.hidden = !on; submit.hidden = on;
      if (!on || rendered) return;
      try {
        const [paypal, r] = await Promise.all([loadSdk(), loadRate()]);
        const t = totals();
        if (!t.rows.length) { fx.textContent = 'Your cart is empty.'; return; }
        const usd = Math.max(0.01, Math.round(t.total * r.v * 100) / 100).toFixed(2);
        fx.textContent = `You pay US$${usd} (Rs ${t.total.toLocaleString()} including delivery, at today's rate of 1 PKR = ${r.v} USD).`;
        rendered = true;
        paypal.Buttons({
          style: { layout: 'vertical', shape: 'pill', label: 'pay' },
          onClick: (data, actions) => form.reportValidity() ? actions.resolve() : actions.reject(),
          // The Worker prices the cart from the published price list and creates the PayPal order.
          createOrder: () => post('/api/paypal/orders', { items: A.getCart().map(x => ({ id: x.id, qty: x.qty })) }).then(o => {
            fx.textContent = `You pay US$${o.usd} (Rs ${Number(o.pkr).toLocaleString()} including delivery, at today's rate of 1 PKR = ${o.rate} USD).`;
            return o.id;
          }),
          // The Worker captures the payment, checks it with PayPal and records the order.
          onApprove: data => {
            const form_ = Object.fromEntries(new FormData(form)); form_.payment_method = 'PayPal';
            return post(`/api/paypal/orders/${data.orderID}/capture`, { form: form_ }).then(res => {
              try { localStorage.setItem('latestOrder', JSON.stringify({ total: t.total, currency: 'PKR', transactionId: res.id, timestamp: Date.now() })); } catch (e) { }
              A.setCart([]); A.toast('Payment received. We will confirm your delivery shortly.'); location.hash = '#/thank-you';
            }).catch(err => { fx.textContent = `${err.message}. If money was taken, contact us on WhatsApp with PayPal order ${data.orderID}.`; });
          },
          onError: () => { fx.textContent = 'PayPal could not complete the payment. No money was taken. Try again or choose cash on delivery.'; }
        }).render('#smPaypalButtons');
      } catch (e) {
        fx.textContent = 'PayPal is not available right now. Choose cash on delivery or bank transfer.';
      }
    });
  }
  document.addEventListener('sasta:rendered', enhance);
  enhance();
})();
