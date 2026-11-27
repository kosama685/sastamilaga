/* Utilities: no fabricated authentication, rewards or deployment attestation. */
(function(g){'use strict';
 function requireAuth(){return {ok:false,status:'PROTECTED_BACKEND_REQUIRED',
   message:'Secure customer accounts require authenticated server-side authorization.'}}
 function rewards(){return {available:false,balance:null,reason:'Verified completed orders require a server-side ledger'}}
 function referral(code){return {code:/^[A-Za-z0-9_-]{4,64}$/.test(code||'')?code:null,verified:false,payout:null}}
 function money(amount,currency){if(amount==null||!Number.isFinite(amount))return 'Quote required';
   return new Intl.NumberFormat('en',{style:'currency',currency}).format(amount)}
 /* A GitHub API main SHA does NOT prove what the customer domain serves.
  * Compare an immutable revision embedded in the deployed document to the active response. */
 function releaseCheck(meta,expected){
   let embedded=String(meta||''),commit=String(expected||'');
   return {verified:!!(embedded&&commit&&embedded===commit),embeddedCommit:embedded||null,
     message:'Live-domain content and deployed artifact must be compared; the GitHub API alone is insufficient.'}
 }
 function mobileGuard(){/* Do not override pointer-events or scroll during user interaction.
   Correct real obstructions in responsive CSS, then test at 360/390/768px. */}
 g.SMUtils=Object.freeze({requireAuth,rewards,referral,money,releaseCheck,mobileGuard});
})(window);
