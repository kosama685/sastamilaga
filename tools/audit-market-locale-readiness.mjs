#!/usr/bin/env node
/** Market display != verified shopping destination != published language.
 * Report every destination in the market picker; do not fabricate translations,
 * shipping eligibility, hreflang alternates, or support-language coverage.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=process.cwd();
const code=fs.readFileSync(path.join(root,'assets/js/market.js'),'utf8');
const m=code.match(/var CUR = (\{[^;]+\});/);
if(!m)throw Error('Country/currency map not found');
const map=vm.runInNewContext('('+m[1]+')');
const countries=Object.keys(map).sort();
if(countries.length<240)throw Error('Market dropdown has unexpectedly lost countries');
const knownLocales=[
 {locale:'en',route:'/',status:'english_primary_market_website_only',reviewedForAllProducts:false},
 {locale:'ur',route:'/ur/',status:'policy_help_pages_partial; home_not_verified_self_canonical',reviewedForAllProducts:false},
 {locale:'ar',route:'/ar/',status:'home_unavailable_on_last_public_audit',reviewedForAllProducts:false},
 {locale:'bn',route:'/bn/',status:'not_verified_as_published_locale',reviewedForAllProducts:false},
 {locale:'sw',route:'/sw/',status:'not_verified_as_published_locale',reviewedForAllProducts:false}
];
const flags=['shipping_eligibility_not_verified','local_taxes_duties_not_verified','payment_method_not_verified','support_language_not_verified','return_policy_not_verified','market_checkout_not_verified'];
const rows=countries.map(country=>({country,currency:map[country],displayCurrencyMapped:true,
 validExchangeRateNow:'not_tested',verifiedGlobalShipping:false,verifiedLocalisedCheckout:false,
 verifiedProductTranslations:false,verifiedLocalisedReturns:false,publicHreflangEligible:false,
 indexableCountryLandingAllowed:false,blockers:flags}));
const output={generatedAt:new Date().toISOString(),source:'assets/js/market.js',countries:rows.length,distinctCurrencies:new Set(rows.map(x=>x.currency)).size,
 note:'Country/currency chooser coverage is not equivalent to country shipping eligibility or website localization.',
 languageLocales:knownLocales,summary:{displayMapped:rows.length,qualifiedMarketsFromThisEvidence:0,verifiedAllLanguageRollout:false},
 markets:rows};
const dest=path.join(root,'artifacts/market-readiness');
fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(path.join(dest,'countries.json'),JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(dest,'README.md'),[
'# Worldwide market and language readiness',
'',`Display destinations: ${rows.length} · distinct display currencies: ${output.distinctCurrencies}.`,
'', '**None of these destinations is confirmed as a fully supported product-fulfilment market by the currency table alone.**',
'', 'Publish translated category/product URLs and reciprocal hreflang only after actual translated pages, delivery, payment, legal and support requirements are verified.',
'', '| Locale | URL convention | Verified status |',
'|---|---|---|',
...knownLocales.map(x=>`| ${x.locale} | ${x.route} | ${x.status} |`),
'', 'Do not present a currency dropdown as proof of all-country shipping. Do not create untranslated language URL placeholders or cloned SEO paragraphs.'
].join('\n')+'\n');
console.log(JSON.stringify(output.summary));
