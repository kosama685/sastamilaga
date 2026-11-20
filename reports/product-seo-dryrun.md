# Product SEO dry run (2026-11-20)

**Nothing in the shop was changed.** Source: one read-only SELECT over SSH on the live WooCommerce database (11,763 published products). Tool: `tools/product-seo-dryrun.mjs` (6 tests). Full per-product output: `reports/product-seo-resolution.csv` (6,583 issue rows); counts: `reports/product-seo-dryrun-summary.json`.

| Issue | Products | Proposal | State |
|---|---|---|---|
| Missing featured image | 2,889 | 58 have a gallery: promote its first genuine image. 2,831 have none: re-fetch the supplier image by supplier ID; keep out of indexing until fixed. No stock images. | 58 PROPOSED_SAFE, 2,831 EXTERNAL_DEPENDENCY |
| Missing SKU | 2,175 | Assign collision-checked internal SKU `SM-<post ID>`; existing SKUs untouched | PROPOSED_SAFE |
| Missing or zero price | 19 | Mark out of stock and exclude from sitemaps until a verified supplier price exists; no price is invented | PROPOSED_SAFE |
| Thin content (<100 chars) | 43 | Enrich from real supplier attributes; do not index until done | EXTERNAL_DEPENDENCY |
| Duplicate titles | 1,457 products in 522 groups | No automatic retitling. Same-SKU pairs are flagged as likely double listings (merge or 301 review). Different-SKU groups need real attributes (model, size, colour, pack) pulled before unique titles are written. | NEEDS_ATTRIBUTE_DATA |
| Duplicate SKUs | 0 | none | n/a |

Products with at least one issue: 3,816 of 11,763 (a product can have several issues).

## Reconciliation with the earlier audit
Images 2,889, SKUs 2,175, prices 19 and thin content 43 match `data/landing/catalog-audit-2026-11-20.json` exactly. Duplicate titles: the audit counted 506 groups by exact title; this run normalises case, punctuation and spacing and finds 522 groups (1,457 products). The difference is the normalisation, not a data change.

## What this does not do
- It is not an apply step. Applying needs: a verified backup, batched writes with checkpoints and a retry queue, and a rollback file; none is built. Applying SKUs and gallery-to-featured images would be the first, lowest-risk batch.
- It does not read supplier attributes, so it cannot write unique titles, descriptions, alt text or per-product schema yet. The attribute pull from the CJ and local supplier data is the next step.
- 2,831 products have no image anywhere in the shop; whether the supplier still has one is unknown until it is re-fetched.
- Product-level Search Console data and keyword research were not used.
