# Hreflang and head validation (live)

Validated 2026-11-20T04:15:57.354Z against https://sastamilaga.com with `tools/validate-landing-live.mjs` (read-only GETs). This checks what the pages say; it does **not** show that Google has crawled or indexed them.

Pages checked: **12**. Issues found: **0**.

| URL | HTTP | html lang | dir | robots | canonical ok | hreflang entries | H1 | JSON-LD |
|---|---|---|---|---|---|---|---|---|
| /shipping-to/germany/ | 200 | en | ltr | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /shipping-to/germany/de/ | 200 | de-DE | ltr | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /shipping-to/uk/ | 200 | en-GB | ltr | index, follow, max-image-preview:large | yes | 2 | 1 | ok |
| /shipping-to/usa/ | 200 | en-US | ltr | index, follow, max-image-preview:large | yes | 2 | 1 | ok |
| /shipping-to/serbia/ | 200 | en | ltr | index, follow, max-image-preview:large | yes | 4 | 1 | ok |
| /shipping-to/serbia/sr-latn/ | 200 | sr-Latn-RS | ltr | index, follow, max-image-preview:large | yes | 4 | 1 | ok |
| /shipping-to/serbia/sr-cyrl/ | 200 | sr-Cyrl-RS | ltr | index, follow, max-image-preview:large | yes | 4 | 1 | ok |
| /shipping-to/saudi-arabia/ | 200 | en-SA | ltr | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /shipping-to/saudi-arabia/ar/ | 200 | ar-SA | rtl | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /pakistan/ | 200 | en | ltr | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /ur/pakistan/ | 200 | ur | rtl | index, follow, max-image-preview:large | yes | 3 | 1 | ok |
| /shipping-to/ | 200 | en | ltr | index, follow, max-image-preview:large | yes | 2 | 1 | ok |

## Reciprocity rules checked
- every hreflang target is a known landing page and is indexable
- the target lists the source back (reciprocal) and its own language code equals the hreflang value
- each page has a self-referencing hreflang equal to its `html lang`
- exactly one `x-default` per page that has hreflang
- no duplicate titles or descriptions across the 12 pages

## Issues

None.
