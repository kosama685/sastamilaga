/* Payment safety guard. Browser-only JS must NEVER mark PayPal as paid. */
(function(g){'use strict';
 function cancel(){return {ok:false,paymentStatus:'NOT_PAID',cartPreserved:true,
  message:'PayPal cancelled. No payment was recorded; your cart is preserved.'}}
 function unavailable(){return {ok:false,paymentStatus:'NOT_PAID',
  message:'PayPal is unavailable until a verified merchant payment integration is installed. Request a quote instead.'}}
 // No client-side capture action: provider capture requires authenticated server verification/webhooks.
 g.SMPayPal=Object.freeze({cancel,unavailable,enabled:false});
})(window);
