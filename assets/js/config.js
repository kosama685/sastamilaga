/* Sasta Milaga site settings (public values only – never put secrets in this file).
   paypalClientId: your PayPal REST app *Client ID* (Live). It is public by design.
     Get it at https://developer.paypal.com/dashboard/applications/live → your app → Client ID.
     Leave empty to hide the PayPal option; cash on delivery and bank transfer still work.
   paypalCurrency: PayPal does not accept PKR, so the PKR total is converted with the
     live rate from https://open.er-api.com at checkout and shown to the customer first. */
window.SM_CONFIG = {
  paypalClientId: '',
  paypalCurrency: 'USD',
  /* PayPal payment-link checkout (works on GitHub Pages, no API keys): buyers pay this PayPal account by PayPal
     or debit/credit card. Orders are recorded first; check the payment in PayPal before dispatch. */
  paypalEmail: 'osamakhancv@gmail.com',
  /* URL of the deployed PayPal Worker (workers/paypal), e.g. 'https://sastamilaga-paypal.<account>.workers.dev'.
     PayPal stays hidden until both paypalClientId and paypalWorker are set. */
  paypalWorker: '',
  /* URL of the deployed CJ shipping Worker (workers/cj-shipping), e.g. 'https://sastamilaga-cj-shipping.<account>.workers.dev'.
     When set, global product pages show live supplier shipping prices. The CJ key stays in Cloudflare. */
  cjShippingWorker: '',
  /* WordPress store REST API (global-dropshipping-commerce plugin). Public, read-only: live CJ options (variations) with the store's own prices. The CJ key stays on the WordPress server. */
  wpApi: 'https://sastamilaga.com/wp-json/gdcs/v1',
  /* Google Sheets order log (apps-script/Code.gs). sheetEndpoint = the web app /exec URL; sheetToken = the same text as
     the script property ORDER_TOKEN. Orders still go to orderEndpoint (Formspree) too. Leave empty to disable. */
  sheetEndpoint: '',
  sheetToken: '',
  orderEndpoint: 'https://formspree.io/f/xwvzzjdl',
  whatsapp: '966510451995',
  deliveryFee: 250,
  freeDeliveryFrom: 5000,
  /* true = Live TV lists channels from data/livetv/channels.js (a full snapshot of the approved sltv list)
     instead of the WordPress API. Turn on only after that file has been built from all pages. */
  liveTvSnapshot: true   /* data/livetv/channels.js = Free-TV/IPTV playlist, rebuilt daily by tools/build-livetv.mjs */
};
