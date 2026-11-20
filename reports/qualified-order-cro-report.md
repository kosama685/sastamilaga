# Qualified-order and conversion report

**Date:** 2026-11-20. Based on what is deployed on the 12 landing pages and on the WooCommerce configuration observed on 2026-11-20.

## Implemented and tested (landing pages)
- Answer-first hero, "how an order works" steps, a "what you pay and what is not included" table, customs and product-rule note, localized FAQ with matching JSON-LD, related links and a contact band, in the site's theme colors.
- **Qualified-order panel:** product link or name, option, quantity, delivery country, town/city and postcode, two required confirmations (taxes and duties may apply; prepaid, not cash on delivery for global items). The send button stays disabled until the essentials are present, prevents duplicate sends and opens WhatsApp with the details. Verified in a real browser on all pages.
- **Live shipping estimate** for the five foreign markets: CJ variants then CJ freight through the store's own `/api/cj/*` endpoints; rates shown unchanged as indicative US dollars; any failure falls back to WhatsApp. Verified live on 2026-11-19 on eight pages.
- Footer link "Shipping by country" and links from the shopping guide and the shipping pages.

## Not implemented (and why)
| Requested | Status |
|---|---|
| Postcode-based eligibility check | The postcode is collected but not sent to the freight API; shipping is quoted by country |
| Total payable amount | Only item plus shipping, indicative; taxes and duties are not calculated |
| Working checkout route from the landing pages | Hand-off is WhatsApp. Native WooCommerce checkout accepts Pakistan only; the plugin's virtual checkout reports ready but was not wired to the landing pages or tested with an order |
| Featured products, category highlights, trust section | Not built; no verified product feed per country |
| Pricing | No prices are published on the landing pages (no verified retail price or stock for supplier items) |
| Analytics events (engagement, CTA clicks, delivery checks, add-to-cart, checkout, orders) | Not added; no landing-page analytics integration was found that could be reused without touching protected files |
| Measured conversion and qualified-order rates | No data exists. Do not infer any rate |

## Measurement plan (needs the owner)
Define a qualified order, add privacy-compliant events to the panel (CTA click, quote success, send), and record a 30-day baseline before setting targets.
