/* Sasta Milaga site settings (public values only – never put secrets in this file).
   paypalClientId: your PayPal REST app *Client ID* (Live). It is public by design.
     Get it at https://developer.paypal.com/dashboard/applications/live → your app → Client ID.
     Leave empty to hide the PayPal option; cash on delivery and bank transfer still work.
   paypalCurrency: PayPal does not accept PKR, so the PKR total is converted with the
     live rate from https://open.er-api.com at checkout and shown to the customer first. */
window.SM_CONFIG = {
  paypalClientId: '',
  paypalCurrency: 'USD',
  orderEndpoint: 'https://formspree.io/f/xwvzzjdl',
  whatsapp: '966510451995',
  deliveryFee: 250,
  freeDeliveryFrom: 5000
};
