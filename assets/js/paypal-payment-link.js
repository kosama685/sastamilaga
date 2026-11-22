/* Sasta Milaga PayPal payment-link composer.
 * Use for the reviewed checkout amount after destination-specific pricing and shipping lookup.
 * PayPal Payments Standard xclick is a legacy feature. Prefer PayPal-hosted modern Buy Buttons
 * when the merchant enables them. Client redirects never prove payment, and customer values are untrusted.
 */
(function(g){'use strict';
const MERCHANT='osamakhancv@gmail.com';
const RX=/^[A-Z0-9][A-Z0-9_-]{7,79}$/i;
function create({amountUSD,productName,reference,confirmedFinalTotal=false,shippingVerified=false,card=false}={}){
  const amount=Number(amountUSD);
  if(!confirmedFinalTotal||!shippingVerified)return {ok:false,error:'Shipping and the reviewed total are required before a payment link is issued.'};
  if(!Number.isFinite(amount)||amount<=0||Math.abs(Math.round(amount*100)-amount*100)>0.000001||amount>100000)
    return {ok:false,error:'Enter a valid final USD amount (two decimal places maximum).'};
  const name=String(productName||'').trim().slice(0,120);
  const ref=String(reference||'').trim().slice(0,80);
  if(!name||!RX.test(ref))return {ok:false,error:'A validated item name and order reference are required.'};
  const url=new URL('https://www.paypal.com/cgi-bin/webscr');
  const q={cmd:'_xclick',business:MERCHANT,currency_code:'USD',
    amount:amount.toFixed(2),item_name:name,item_number:ref,invoice:ref,quantity:'1',
    no_shipping:'1',no_note:'1',charset:'utf-8',landing_page:card?'Billing':'Login',
    cancel_return:'https://sastamilaga.com/order/?payment=cancelled&reference='+encodeURIComponent(ref),
    return:'https://sastamilaga.com/order/?payment=unverified&reference='+encodeURIComponent(ref)};
  Object.entries(q).forEach(([k,v])=>url.searchParams.set(k,v));
  return {ok:true,url:url.toString(),amountUSD:amount.toFixed(2),reference:ref,
    status:'PAYMENT_LINK_NOT_YET_PAID',
    note:'PayPal hosts any card entry. The operator must separately verify settlement and exact invoice before fulfillment.'};
}
g.SMPayPalLink=Object.freeze({create,merchant:MERCHANT});
})(window);
