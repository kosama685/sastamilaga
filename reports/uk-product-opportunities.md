# UK product opportunities: evidence status

**Observation date:** 2026-11-19. **Source file:** `data/research/uk-ebay-candidates-2026-11-19.json` (candidate list supplied by the owner, with cost scenarios; refreshed by another session on `main`).

## Result

**Verified top 10: 0.** Candidates in the file: 10. None passes the evidence gate, so none is presented as a confirmed opportunity. The ten items below are a **watchlist**, not a ranking.

## Evidence gates (counted from the JSON, 10 candidates)

| Gate required by the brief | Verified | Of |
|---|---|---|
| Exact SKU / stable source identity (`productSkuVerified`) | 0 | 10 |
| Comparable eBay UK active-listing price (`ebayPriceVerified`) | 0 | 10 |
| eBay UK sold / completed evidence (`marketSoldEvidence`) | 0 | 10 |
| UK shipping quote (`ukShippingQuoteVerified`) | 0 | 10 |
| UK warehouse or origin confirmed (`ukWarehouseVerified`) | 0 | 10 |
| Stock (`ukStockVerified`) | 0 | 10 |

The file itself states: *"These are scenario estimates, NOT competitive sold eBay prices or contracted shipping rates"* and *"Do not publish listings or feed any candidate until current merchant seller fee, VAT treatment and compliance are verified."*

## Watchlist (claimed values are unverified inputs, not findings)

| Candidate | Source cost (PKR, owner-supplied) | Claimed eBay UK buyer price (GBP, unverified) | Blocking risk gate |
|---|---|---|---|
| Star Master Projector Night Lamp | 1,091 | 15.99 | electrical compliance |
| Kansa Wand Face/Foot Massager | 423 | 14.99 | source authenticity |
| 3D Wooden Wall Clock | 523 | 15.99 | fragile |
| 6-in-1 Baby Nail Trimmer | 948 | 13.99 | child safety, electrical |
| Smart Visual Ear Cleaner 1080P | 1,434 | 15.99 | medical claims, battery |
| Remington hair dryer | 1,620 | 24.99 | brand authenticity, UK plug |
| Neck massager | 6,425 | 39.99 | retail proxy, not supplier cost; battery, weight |
| Spin mop | 2,867 | 23.99 | bulky, weight |
| Nano tape | 478 | 8.99 | bundle price not verified |
| Cordless car gun | 4,455 | 59.99 | lithium battery, heavy |

## Why no profit table is published as a result

The brief's formula needs verified inputs for every line:

`Net contribution = revenue excl. collected VAT − product cost − supplier shipping/handling − marketplace fees − payment fees − fulfilment/packaging − advertising per order − expected return loss − other variable cost`

`Contribution margin = net contribution ÷ net revenue × 100` and `ROI = net contribution ÷ cash invested per order × 100`.

Today the verified inputs are: **none**. The other session's scenario (PKR 375/GBP, PKR 7,300 first kg via the Pakistan Post UK tariff effective 2026-03-12 and PKR 3,000 per extra kg, 12.9% fee on buyer total + GBP 0.40, 20% VAT) is explicitly a labelled hypothetical. A margin computed from it would be a scenario, not a finding, so this report does not rank by it.

## Inputs needed to produce a confirmed list

1. For each item: the exact product page and SKU on SastaMilaga and the current cost at checkout.
2. A carrier quote or contracted rate to a UK postcode, with weight and dimensions, plus delivery estimate and date of quote.
3. At least 5 exact-match eBay UK **sold** listings per item (date range, price, shipping, condition), and the median.
4. Current eBay UK fee table for the category (source and date) and promoted-listing assumption.
5. The seller's VAT registration and importer-of-record position (not assumed here).
6. Compliance evidence for the gate named in the table (UKCA/CE, battery transport, medical-claim wording, brand authorization).

## Confidence

Evidence quality: **none verified**. No demand claim (Google Trends or marketplace trend data) was checked in this run; none is reported.
