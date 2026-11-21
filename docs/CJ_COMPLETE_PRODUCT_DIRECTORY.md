# Sasta Milaga — Complete CJ Product Directory Index

**Source snapshot:** 2026-11-05 | **Unique supplier products:** 451,812 | **Category files:** 572 | **Lookup shards:** 1024

**Scope and evidence:** The entries below are the entire checked-in category directory (`data/cj/c/*.js`) reconciled against `data/cj/manifest.js` and `data/cj/lookup/manifest.json`. Every category file in the repository is included, and the category counts sum to the full 451,812 supplier IDs with no missing category files. The source snapshot is not evidence of current stock or product SEO approval.

## Where all supplier records are stored

- `data/cj/c/<category-slug>.js` — **572 category data files**, linked below.
- `data/cj/lookup/000.json` through `data/cj/lookup/3ff.json` — **1,024** hashed ID lookup shards; these are files, not one physical GitHub file per SKU.
- `tools/export-cj-product-evidence.mjs` — exports **one source-evidence JSON per supplier ID** into `seo-structured-data/cj/<category-hash>/<supplier-id>.json` paths inside an archive; the archive is a scheduled GitHub Actions artifact, not 451,812 separate committed GitHub files.
- `.github/workflows/cj-category-seo-evidence.yml` — weekly verified full export and manual dispatch.
- `.github/workflows/catalog-live-coverage.yml` — daily structural checks with representative live-page sampling.
- `.github/workflows/public-sitemap-health.yml` — every 6 hours for public sitemap HTTP/XML checks.
- `p/` — separate local static product HTML directory; validated by `.github/workflows/local-catalog-integrity.yml`.

**Google SEO gate:** Do not submit all 451,812 offline records as an XML sitemap until each canonical public product page has real indexable content and market-specific availability. `allow_indexing` is explicitly `false` for the snapshot. A successful file count is not evidence of eligibility or Google indexing.

## All category file paths and product totals

All category data paths are linked to the repository's default branch; the archive includes a corresponding separate JSON source record for each supplier ID.

### Fashion & Apparel — 114,141 supplier products / 141 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| 3D | [`data/cj/c/3d.js`](../data/cj/c/3d.js) | 702 |
| 3D Pens | [`data/cj/c/3d-pens.js`](../data/cj/c/3d-pens.js) | 31 |
| 3D Printers | [`data/cj/c/3d-printers.js`](../data/cj/c/3d-printers.js) | 9 |
| Baseball Caps | [`data/cj/c/baseball-caps.js`](../data/cj/c/baseball-caps.js) | 2,831 |
| Basic Jacket | [`data/cj/c/basic-jacket.js`](../data/cj/c/basic-jacket.js) | 333 |
| Belts | [`data/cj/c/belts.js`](../data/cj/c/belts.js) | 979 |
| Belts & Cummerbunds | [`data/cj/c/belts-and-cummerbunds.js`](../data/cj/c/belts-and-cummerbunds.js) | 2,579 |
| Berets | [`data/cj/c/berets.js`](../data/cj/c/berets.js) | 432 |
| Bikini Sets | [`data/cj/c/bikini-sets.js`](../data/cj/c/bikini-sets.js) | 3,727 |
| Blazers | [`data/cj/c/blazers.js`](../data/cj/c/blazers.js) | 790 |
| Blouses & Shirts | [`data/cj/c/blouses-and-shirts.js`](../data/cj/c/blouses-and-shirts.js) | 572 |
| Bomber Hats | [`data/cj/c/bomber-hats.js`](../data/cj/c/bomber-hats.js) | 184 |
| Boxers | [`data/cj/c/boxers.js`](../data/cj/c/boxers.js) | 1,635 |
| Bridesmaid Dresses | [`data/cj/c/bridesmaid-dresses.js`](../data/cj/c/bridesmaid-dresses.js) | 22 |
| Briefs | [`data/cj/c/briefs.js`](../data/cj/c/briefs.js) | 616 |
| Cargo Pants | [`data/cj/c/cargo-pants.js`](../data/cj/c/cargo-pants.js) | 1,396 |
| Casual Pants | [`data/cj/c/casual-pants.js`](../data/cj/c/casual-pants.js) | 461 |
| Clothing & Wardrobe Storage | [`data/cj/c/clothing-and-wardrobe-storage.js`](../data/cj/c/clothing-and-wardrobe-storage.js) | 1,034 |
| Cocktail Dresses | [`data/cj/c/cocktail-dresses.js`](../data/cj/c/cocktail-dresses.js) | 24 |
| Cover-Ups | [`data/cj/c/cover-ups.js`](../data/cj/c/cover-ups.js) | 181 |
| Cycling Jerseys | [`data/cj/c/cycling-jerseys.js`](../data/cj/c/cycling-jerseys.js) | 471 |
| Down Jackets | [`data/cj/c/down-jackets.js`](../data/cj/c/down-jackets.js) | 1,410 |
| Evening Dresses | [`data/cj/c/evening-dresses.js`](../data/cj/c/evening-dresses.js) | 826 |
| Family Matching Outfits | [`data/cj/c/family-matching-outfits.js`](../data/cj/c/family-matching-outfits.js) | 185 |
| Fedoras | [`data/cj/c/fedoras.js`](../data/cj/c/fedoras.js) | 1,186 |
| Fish Tank Cleaning Supplies | [`data/cj/c/fish-tank-cleaning-supplies.js`](../data/cj/c/fish-tank-cleaning-supplies.js) | 172 |
| Fish Tank Decorations | [`data/cj/c/fish-tank-decorations.js`](../data/cj/c/fish-tank-decorations.js) | 89 |
| Fish Tanks | [`data/cj/c/fish-tanks.js`](../data/cj/c/fish-tanks.js) | 69 |
| Genuine Leather | [`data/cj/c/genuine-leather.js`](../data/cj/c/genuine-leather.js) | 728 |
| Geometric | [`data/cj/c/geometric.js`](../data/cj/c/geometric.js) | 773 |
| Harem Pants | [`data/cj/c/harem-pants.js`](../data/cj/c/harem-pants.js) | 377 |
| Hiking Jackets | [`data/cj/c/hiking-jackets.js`](../data/cj/c/hiking-jackets.js) | 90 |
| Human Hair Lace Wigs | [`data/cj/c/human-hair-lace-wigs.js`](../data/cj/c/human-hair-lace-wigs.js) | 51 |
| Jerseys | [`data/cj/c/jerseys.js`](../data/cj/c/jerseys.js) | 129 |
| Jumpsuits | [`data/cj/c/jumpsuits.js`](../data/cj/c/jumpsuits.js) | 2,397 |
| Lace | [`data/cj/c/lace.js`](../data/cj/c/lace.js) | 285 |
| Ladies Short Sleeve | [`data/cj/c/ladies-short-sleeve.js`](../data/cj/c/ladies-short-sleeve.js) | 415 |
| Lady Dresses | [`data/cj/c/lady-dresses.js`](../data/cj/c/lady-dresses.js) | 1,231 |
| Leather & Suede | [`data/cj/c/leather-and-suede.js`](../data/cj/c/leather-and-suede.js) | 785 |
| Leggings | [`data/cj/c/leggings.js`](../data/cj/c/leggings.js) | 2,301 |
| Long Johns | [`data/cj/c/long-johns.js`](../data/cj/c/long-johns.js) | 150 |
| Man Gloves & Mittens | [`data/cj/c/man-gloves-and-mittens.js`](../data/cj/c/man-gloves-and-mittens.js) | 1,079 |
| Man Hoodies & Sweatshirts | [`data/cj/c/man-hoodies-and-sweatshirts.js`](../data/cj/c/man-hoodies-and-sweatshirts.js) | 572 |
| Man Jeans | [`data/cj/c/man-jeans.js`](../data/cj/c/man-jeans.js) | 4,244 |
| Man Pajama Sets | [`data/cj/c/man-pajama-sets.js`](../data/cj/c/man-pajama-sets.js) | 362 |
| Man Prescription Glasses | [`data/cj/c/man-prescription-glasses.js`](../data/cj/c/man-prescription-glasses.js) | 1,513 |
| Man Shorts | [`data/cj/c/man-shorts.js`](../data/cj/c/man-shorts.js) | 254 |
| Man Trench | [`data/cj/c/man-trench.js`](../data/cj/c/man-trench.js) | 2,159 |
| Men's Jackets | [`data/cj/c/men-s-jackets.js`](../data/cj/c/men-s-jackets.js) | 3,572 |
| Men's Long-Sleeved | [`data/cj/c/men-s-long-sleeved.js`](../data/cj/c/men-s-long-sleeved.js) | 854 |
| Men's Shirts | [`data/cj/c/men-s-shirts.js`](../data/cj/c/men-s-shirts.js) | 3,674 |
| Men's Sleep & Lounge | [`data/cj/c/men-s-sleep-and-lounge.js`](../data/cj/c/men-s-sleep-and-lounge.js) | 205 |
| Men's Suits | [`data/cj/c/men-s-suits.js`](../data/cj/c/men-s-suits.js) | 1,834 |
| Men's Sweaters | [`data/cj/c/men-s-sweaters.js`](../data/cj/c/men-s-sweaters.js) | 4,890 |
| Men's Swimwear | [`data/cj/c/men-s-swimwear.js`](../data/cj/c/men-s-swimwear.js) | 257 |
| Men's Ties | [`data/cj/c/men-s-ties.js`](../data/cj/c/men-s-ties.js) | 101 |
| Motor Brake System | [`data/cj/c/motor-brake-system.js`](../data/cj/c/motor-brake-system.js) | 42 |
| Necklace & Pendants | [`data/cj/c/necklace-and-pendants.js`](../data/cj/c/necklace-and-pendants.js) | 1,482 |
| One-Piece Suits | [`data/cj/c/one-piece-suits.js`](../data/cj/c/one-piece-suits.js) | 3,332 |
| Outdoor Shorts | [`data/cj/c/outdoor-shorts.js`](../data/cj/c/outdoor-shorts.js) | 190 |
| Outerwear & Coats | [`data/cj/c/outerwear-and-coats.js`](../data/cj/c/outerwear-and-coats.js) | 252 |
| Pajama Sets | [`data/cj/c/pajama-sets.js`](../data/cj/c/pajama-sets.js) | 331 |
| Pants | [`data/cj/c/pants.js`](../data/cj/c/pants.js) | 450 |
| Pants & Capris | [`data/cj/c/pants-and-capris.js`](../data/cj/c/pants-and-capris.js) | 4,919 |
| Parkas | [`data/cj/c/parkas.js`](../data/cj/c/parkas.js) | 1,488 |
| Pet Down & Parkas | [`data/cj/c/pet-down-and-parkas.js`](../data/cj/c/pet-down-and-parkas.js) | 327 |
| Pet Necklaces | [`data/cj/c/pet-necklaces.js`](../data/cj/c/pet-necklaces.js) | 167 |
| Pre-Colored Hair Weave | [`data/cj/c/pre-colored-hair-weave.js`](../data/cj/c/pre-colored-hair-weave.js) | 96 |
| Pre-Colored One Pack | [`data/cj/c/pre-colored-one-pack.js`](../data/cj/c/pre-colored-one-pack.js) | 359 |
| Print | [`data/cj/c/print.js`](../data/cj/c/print.js) | 582 |
| Printer Supplies | [`data/cj/c/printer-supplies.js`](../data/cj/c/printer-supplies.js) | 60 |
| Printers | [`data/cj/c/printers.js`](../data/cj/c/printers.js) | 106 |
| Prom Dresses | [`data/cj/c/prom-dresses.js`](../data/cj/c/prom-dresses.js) | 227 |
| Real Fur | [`data/cj/c/real-fur.js`](../data/cj/c/real-fur.js) | 111 |
| Robes | [`data/cj/c/robes.js`](../data/cj/c/robes.js) | 107 |
| Rompers | [`data/cj/c/rompers.js`](../data/cj/c/rompers.js) | 533 |
| Scarves | [`data/cj/c/scarves.js`](../data/cj/c/scarves.js) | 555 |
| Scarves & Wraps | [`data/cj/c/scarves-and-wraps.js`](../data/cj/c/scarves-and-wraps.js) | 5,255 |
| Shorts | [`data/cj/c/shorts.js`](../data/cj/c/shorts.js) | 548 |
| Skirts | [`data/cj/c/skirts.js`](../data/cj/c/skirts.js) | 463 |
| Skullies & Beanies | [`data/cj/c/skullies-and-beanies.js`](../data/cj/c/skullies-and-beanies.js) | 369 |
| Sleepwear & Robes | [`data/cj/c/sleepwear-and-robes.js`](../data/cj/c/sleepwear-and-robes.js) | 207 |
| Socks | [`data/cj/c/socks.js`](../data/cj/c/socks.js) | 1,938 |
| Solid | [`data/cj/c/solid.js`](../data/cj/c/solid.js) | 515 |
| Steel Tongue Drum | [`data/cj/c/steel-tongue-drum.js`](../data/cj/c/steel-tongue-drum.js) | 42 |
| Striped | [`data/cj/c/striped.js`](../data/cj/c/striped.js) | 1,294 |
| Suits & Blazer | [`data/cj/c/suits-and-blazer.js`](../data/cj/c/suits-and-blazer.js) | 233 |
| Suits & Sets | [`data/cj/c/suits-and-sets.js`](../data/cj/c/suits-and-sets.js) | 880 |
| Sweaters | [`data/cj/c/sweaters.js`](../data/cj/c/sweaters.js) | 600 |
| Sweatpants | [`data/cj/c/sweatpants.js`](../data/cj/c/sweatpants.js) | 1,714 |
| Swimming Goggles | [`data/cj/c/swimming-goggles.js`](../data/cj/c/swimming-goggles.js) | 42 |
| Synthetic Lace Wigs | [`data/cj/c/synthetic-lace-wigs.js`](../data/cj/c/synthetic-lace-wigs.js) | 27 |
| Tops & Tees | [`data/cj/c/tops-and-tees.js`](../data/cj/c/tops-and-tees.js) | 2,337 |
| Two-Piece Suits | [`data/cj/c/two-piece-suits.js`](../data/cj/c/two-piece-suits.js) | 1,582 |
| Wearable Devices | [`data/cj/c/wearable-devices.js`](../data/cj/c/wearable-devices.js) | 272 |
| Wedding Dresses | [`data/cj/c/wedding-dresses.js`](../data/cj/c/wedding-dresses.js) | 282 |
| Wide Leg Pants | [`data/cj/c/wide-leg-pants.js`](../data/cj/c/wide-leg-pants.js) | 309 |
| Woman Gloves & Mittens | [`data/cj/c/woman-gloves-and-mittens.js`](../data/cj/c/woman-gloves-and-mittens.js) | 1,400 |
| Woman Hats & Caps | [`data/cj/c/woman-hats-and-caps.js`](../data/cj/c/woman-hats-and-caps.js) | 512 |
| Woman Hoodies & Sweatshirts | [`data/cj/c/woman-hoodies-and-sweatshirts.js`](../data/cj/c/woman-hoodies-and-sweatshirts.js) | 637 |
| Woman Jeans | [`data/cj/c/woman-jeans.js`](../data/cj/c/woman-jeans.js) | 323 |
| Woman Prescription Glasses | [`data/cj/c/woman-prescription-glasses.js`](../data/cj/c/woman-prescription-glasses.js) | 734 |
| Woman Shorts | [`data/cj/c/woman-shorts.js`](../data/cj/c/woman-shorts.js) | 437 |
| Woman Socks | [`data/cj/c/woman-socks.js`](../data/cj/c/woman-socks.js) | 5,655 |
| Woman Trench | [`data/cj/c/woman-trench.js`](../data/cj/c/woman-trench.js) | 2,435 |
| Women's Activewear Sets | [`data/cj/c/women-s-activewear-sets.js`](../data/cj/c/women-s-activewear-sets.js) | 40 |
| Women's Blazers | [`data/cj/c/women-s-blazers.js`](../data/cj/c/women-s-blazers.js) | 63 |
| Women's Camis | [`data/cj/c/women-s-camis.js`](../data/cj/c/women-s-camis.js) | 1,728 |
| Women's Capes | [`data/cj/c/women-s-capes.js`](../data/cj/c/women-s-capes.js) | 225 |
| Women's Cardigans | [`data/cj/c/women-s-cardigans.js`](../data/cj/c/women-s-cardigans.js) | 88 |
| Women's Cargo Pants | [`data/cj/c/women-s-cargo-pants.js`](../data/cj/c/women-s-cargo-pants.js) | 30 |
| Women's Casual Jackets | [`data/cj/c/women-s-casual-jackets.js`](../data/cj/c/women-s-casual-jackets.js) | 9 |
| Women's Coats | [`data/cj/c/women-s-coats.js`](../data/cj/c/women-s-coats.js) | 50 |
| Women's Denim Jackets | [`data/cj/c/women-s-denim-jackets.js`](../data/cj/c/women-s-denim-jackets.js) | 9 |
| Women's Denim Skirts | [`data/cj/c/women-s-denim-skirts.js`](../data/cj/c/women-s-denim-skirts.js) | 1 |
| Women's Denim Tops | [`data/cj/c/women-s-denim-tops.js`](../data/cj/c/women-s-denim-tops.js) | 1 |
| Women's Flare Pants | [`data/cj/c/women-s-flare-pants.js`](../data/cj/c/women-s-flare-pants.js) | 30 |
| Women's Fur Coats | [`data/cj/c/women-s-fur-coats.js`](../data/cj/c/women-s-fur-coats.js) | 2 |
| Women's Fur-Paneled Jackets | [`data/cj/c/women-s-fur-paneled-jackets.js`](../data/cj/c/women-s-fur-paneled-jackets.js) | 1 |
| Women's Long-Sleeved Shirts | [`data/cj/c/women-s-long-sleeved-shirts.js`](../data/cj/c/women-s-long-sleeved-shirts.js) | 233 |
| Women's Outerwear | [`data/cj/c/women-s-outerwear.js`](../data/cj/c/women-s-outerwear.js) | 318 |
| Women's Padded Jackets | [`data/cj/c/women-s-padded-jackets.js`](../data/cj/c/women-s-padded-jackets.js) | 1,550 |
| Women's Shell Jackets | [`data/cj/c/women-s-shell-jackets.js`](../data/cj/c/women-s-shell-jackets.js) | 2 |
| Women's Sherpa Jackets | [`data/cj/c/women-s-sherpa-jackets.js`](../data/cj/c/women-s-sherpa-jackets.js) | 12 |
| Women's Short-Sleeved Shirts | [`data/cj/c/women-s-short-sleeved-shirts.js`](../data/cj/c/women-s-short-sleeved-shirts.js) | 284 |
| Women's Skirts | [`data/cj/c/women-s-skirts.js`](../data/cj/c/women-s-skirts.js) | 42 |
| Women's Sleeveless Tops | [`data/cj/c/women-s-sleeveless-tops.js`](../data/cj/c/women-s-sleeveless-tops.js) | 27 |
| Women's Straight-Leg Pants | [`data/cj/c/women-s-straight-leg-pants.js`](../data/cj/c/women-s-straight-leg-pants.js) | 96 |
| Women's Suit Pants | [`data/cj/c/women-s-suit-pants.js`](../data/cj/c/women-s-suit-pants.js) | 20 |
| Women's Suit Sets | [`data/cj/c/women-s-suit-sets.js`](../data/cj/c/women-s-suit-sets.js) | 22 |
| Women's Sweater Dresses | [`data/cj/c/women-s-sweater-dresses.js`](../data/cj/c/women-s-sweater-dresses.js) | 6 |
| Women's Sweatpants | [`data/cj/c/women-s-sweatpants.js`](../data/cj/c/women-s-sweatpants.js) | 1 |
| Women's Sweatshirt Dresses | [`data/cj/c/women-s-sweatshirt-dresses.js`](../data/cj/c/women-s-sweatshirt-dresses.js) | 5 |
| Women's Sweatsuit Sets | [`data/cj/c/women-s-sweatsuit-sets.js`](../data/cj/c/women-s-sweatsuit-sets.js) | 8 |
| Women's Tube Tops | [`data/cj/c/women-s-tube-tops.js`](../data/cj/c/women-s-tube-tops.js) | 24 |
| Women's Vests | [`data/cj/c/women-s-vests.js`](../data/cj/c/women-s-vests.js) | 710 |
| Women's Wool Coats | [`data/cj/c/women-s-wool-coats.js`](../data/cj/c/women-s-wool-coats.js) | 43 |
| Women's Zip-Up Hoodies | [`data/cj/c/women-s-zip-up-hoodies.js`](../data/cj/c/women-s-zip-up-hoodies.js) | 576 |
| Wool & Blend | [`data/cj/c/wool-and-blend.js`](../data/cj/c/wool-and-blend.js) | 2,129 |
| Wool & Blends | [`data/cj/c/wool-and-blends.js`](../data/cj/c/wool-and-blends.js) | 690 |
| Workplace Safety Supplies | [`data/cj/c/workplace-safety-supplies.js`](../data/cj/c/workplace-safety-supplies.js) | 80 |

### Health & Beauty — 54,645 supplier products / 46 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Adult Wellness | [`data/cj/c/adult-wellness.js`](../data/cj/c/adult-wellness.js) | 483 |
| Bathroom Storage | [`data/cj/c/bathroom-storage.js`](../data/cj/c/bathroom-storage.js) | 706 |
| Body & Frame | [`data/cj/c/body-and-frame.js`](../data/cj/c/body-and-frame.js) | 94 |
| Body Care | [`data/cj/c/body-care.js`](../data/cj/c/body-care.js) | 1,425 |
| Body Jewelry | [`data/cj/c/body-jewelry.js`](../data/cj/c/body-jewelry.js) | 297 |
| Crossbody Bags | [`data/cj/c/crossbody-bags.js`](../data/cj/c/crossbody-bags.js) | 2,105 |
| Curling Iron | [`data/cj/c/curling-iron.js`](../data/cj/c/curling-iron.js) | 565 |
| Electric Face Cleanser | [`data/cj/c/electric-face-cleanser.js`](../data/cj/c/electric-face-cleanser.js) | 291 |
| Essential Oil | [`data/cj/c/essential-oil.js`](../data/cj/c/essential-oil.js) | 4,884 |
| Eyebrow Pencil | [`data/cj/c/eyebrow-pencil.js`](../data/cj/c/eyebrow-pencil.js) | 503 |
| Eyeshadow | [`data/cj/c/eyeshadow.js`](../data/cj/c/eyeshadow.js) | 1,185 |
| Eyewear & Accessories | [`data/cj/c/eyewear-and-accessories.js`](../data/cj/c/eyewear-and-accessories.js) | 2,422 |
| Face Masks | [`data/cj/c/face-masks.js`](../data/cj/c/face-masks.js) | 1,437 |
| Face Skin Care Tools | [`data/cj/c/face-skin-care-tools.js`](../data/cj/c/face-skin-care-tools.js) | 509 |
| Facial Care | [`data/cj/c/facial-care.js`](../data/cj/c/facial-care.js) | 1,041 |
| Facial Steamer | [`data/cj/c/facial-steamer.js`](../data/cj/c/facial-steamer.js) | 389 |
| False Eyelashes | [`data/cj/c/false-eyelashes.js`](../data/cj/c/false-eyelashes.js) | 1,268 |
| Fitness & Bodybuilding | [`data/cj/c/fitness-and-bodybuilding.js`](../data/cj/c/fitness-and-bodybuilding.js) | 3,249 |
| Flashlights & Torches | [`data/cj/c/flashlights-and-torches.js`](../data/cj/c/flashlights-and-torches.js) | 1,136 |
| Hair Braids | [`data/cj/c/hair-braids.js`](../data/cj/c/hair-braids.js) | 99 |
| Hair Styling | [`data/cj/c/hair-styling.js`](../data/cj/c/hair-styling.js) | 222 |
| Hair Weaving | [`data/cj/c/hair-weaving.js`](../data/cj/c/hair-weaving.js) | 875 |
| Headband & Hair Band & Hairpin | [`data/cj/c/headband-and-hair-band-and-hairpin.js`](../data/cj/c/headband-and-hair-band-and-hairpin.js) | 4,897 |
| Health Care Products | [`data/cj/c/health-care-products.js`](../data/cj/c/health-care-products.js) | 275 |
| Human Hair | [`data/cj/c/human-hair.js`](../data/cj/c/human-hair.js) | 393 |
| Human Hair Wigs | [`data/cj/c/human-hair-wigs.js`](../data/cj/c/human-hair-wigs.js) | 552 |
| Lipstick | [`data/cj/c/lipstick.js`](../data/cj/c/lipstick.js) | 2,313 |
| Makeup Brushes | [`data/cj/c/makeup-brushes.js`](../data/cj/c/makeup-brushes.js) | 980 |
| Makeup Set | [`data/cj/c/makeup-set.js`](../data/cj/c/makeup-set.js) | 3,272 |
| Man Slippers | [`data/cj/c/man-slippers.js`](../data/cj/c/man-slippers.js) | 1,309 |
| Nail Art Kits | [`data/cj/c/nail-art-kits.js`](../data/cj/c/nail-art-kits.js) | 3,719 |
| Nail Decorations | [`data/cj/c/nail-decorations.js`](../data/cj/c/nail-decorations.js) | 605 |
| Nail Dryers | [`data/cj/c/nail-dryers.js`](../data/cj/c/nail-dryers.js) | 131 |
| Nail Gel | [`data/cj/c/nail-gel.js`](../data/cj/c/nail-gel.js) | 1,298 |
| Nail Glitters | [`data/cj/c/nail-glitters.js`](../data/cj/c/nail-glitters.js) | 654 |
| Paint Care | [`data/cj/c/paint-care.js`](../data/cj/c/paint-care.js) | 959 |
| Razor | [`data/cj/c/razor.js`](../data/cj/c/razor.js) | 683 |
| Salon Bundle Hair | [`data/cj/c/salon-bundle-hair.js`](../data/cj/c/salon-bundle-hair.js) | 120 |
| Spark Plugs & Ignition System | [`data/cj/c/spark-plugs-and-ignition-system.js`](../data/cj/c/spark-plugs-and-ignition-system.js) | 131 |
| Straightening Irons | [`data/cj/c/straightening-irons.js`](../data/cj/c/straightening-irons.js) | 401 |
| Sun Care | [`data/cj/c/sun-care.js`](../data/cj/c/sun-care.js) | 521 |
| Synthetic Hair Pieces | [`data/cj/c/synthetic-hair-pieces.js`](../data/cj/c/synthetic-hair-pieces.js) | 188 |
| Synthetic Wigs | [`data/cj/c/synthetic-wigs.js`](../data/cj/c/synthetic-wigs.js) | 1,740 |
| Wedding Hair Jewelry | [`data/cj/c/wedding-hair-jewelry.js`](../data/cj/c/wedding-hair-jewelry.js) | 736 |
| Woman Slippers | [`data/cj/c/woman-slippers.js`](../data/cj/c/woman-slippers.js) | 475 |
| Women's Crossbody Bags | [`data/cj/c/women-s-crossbody-bags.js`](../data/cj/c/women-s-crossbody-bags.js) | 3,108 |

### Electronics & Appliances — 47,524 supplier products / 77 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| 2 in 1 Tablets | [`data/cj/c/2-in-1-tablets.js`](../data/cj/c/2-in-1-tablets.js) | 1 |
| Action Cameras | [`data/cj/c/action-cameras.js`](../data/cj/c/action-cameras.js) | 134 |
| Air Conditioning Appliances | [`data/cj/c/air-conditioning-appliances.js`](../data/cj/c/air-conditioning-appliances.js) | 197 |
| Audio Amplifiers | [`data/cj/c/audio-amplifiers.js`](../data/cj/c/audio-amplifiers.js) | 517 |
| Audio & Video Cables | [`data/cj/c/audio-and-video-cables.js`](../data/cj/c/audio-and-video-cables.js) | 192 |
| Batteries | [`data/cj/c/batteries.js`](../data/cj/c/batteries.js) | 245 |
| Briefcases | [`data/cj/c/briefcases.js`](../data/cj/c/briefcases.js) | 482 |
| Cables | [`data/cj/c/cables.js`](../data/cj/c/cables.js) | 1,210 |
| Camcorders | [`data/cj/c/camcorders.js`](../data/cj/c/camcorders.js) | 384 |
| Camera & Photo Accessories | [`data/cj/c/camera-and-photo-accessories.js`](../data/cj/c/camera-and-photo-accessories.js) | 549 |
| Cases For iPhone 6 & 6 Plus | [`data/cj/c/cases-for-iphone-6-and-6-plus.js`](../data/cj/c/cases-for-iphone-6-and-6-plus.js) | 486 |
| Cases For iPhone 7 & 7 Plus | [`data/cj/c/cases-for-iphone-7-and-7-plus.js`](../data/cj/c/cases-for-iphone-7-and-7-plus.js) | 245 |
| Cases For iPhone 8 & 8 Plus | [`data/cj/c/cases-for-iphone-8-and-8-plus.js`](../data/cj/c/cases-for-iphone-8-and-8-plus.js) | 676 |
| Chandeliers | [`data/cj/c/chandeliers.js`](../data/cj/c/chandeliers.js) | 488 |
| Charger | [`data/cj/c/charger.js`](../data/cj/c/charger.js) | 910 |
| Chargers | [`data/cj/c/chargers.js`](../data/cj/c/chargers.js) | 1,369 |
| Cleaning Appliances | [`data/cj/c/cleaning-appliances.js`](../data/cj/c/cleaning-appliances.js) | 651 |
| Computer Tablet Accessories | [`data/cj/c/computer-tablet-accessories.js`](../data/cj/c/computer-tablet-accessories.js) | 175 |
| Digital Cables | [`data/cj/c/digital-cables.js`](../data/cj/c/digital-cables.js) | 399 |
| Digital Cameras | [`data/cj/c/digital-cameras.js`](../data/cj/c/digital-cameras.js) | 185 |
| Earphones & Headphones | [`data/cj/c/earphones-and-headphones.js`](../data/cj/c/earphones-and-headphones.js) | 4,736 |
| External Hard Drives | [`data/cj/c/external-hard-drives.js`](../data/cj/c/external-hard-drives.js) | 99 |
| Flex Cables | [`data/cj/c/flex-cables.js`](../data/cj/c/flex-cables.js) | 18 |
| Flip Cases | [`data/cj/c/flip-cases.js`](../data/cj/c/flip-cases.js) | 367 |
| Galaxy S7 Cases | [`data/cj/c/galaxy-s7-cases.js`](../data/cj/c/galaxy-s7-cases.js) | 48 |
| Galaxy S8 Cases | [`data/cj/c/galaxy-s8-cases.js`](../data/cj/c/galaxy-s8-cases.js) | 98 |
| Gaming Laptops | [`data/cj/c/gaming-laptops.js`](../data/cj/c/gaming-laptops.js) | 31 |
| Guitars | [`data/cj/c/guitars.js`](../data/cj/c/guitars.js) | 166 |
| Holders & Stands | [`data/cj/c/holders-and-stands.js`](../data/cj/c/holders-and-stands.js) | 2,780 |
| Home Appliance Parts | [`data/cj/c/home-appliance-parts.js`](../data/cj/c/home-appliance-parts.js) | 1,369 |
| Home Audio & Video | [`data/cj/c/home-audio-and-video.js`](../data/cj/c/home-audio-and-video.js) | 259 |
| Home Electronic Accessories | [`data/cj/c/home-electronic-accessories.js`](../data/cj/c/home-electronic-accessories.js) | 1,593 |
| Housings | [`data/cj/c/housings.js`](../data/cj/c/housings.js) | 239 |
| Huawei Cases | [`data/cj/c/huawei-cases.js`](../data/cj/c/huawei-cases.js) | 136 |
| IPhone X Cases | [`data/cj/c/iphone-x-cases.js`](../data/cj/c/iphone-x-cases.js) | 824 |
| Key Case for Car | [`data/cj/c/key-case-for-car.js`](../data/cj/c/key-case-for-car.js) | 156 |
| Kitchen Appliances | [`data/cj/c/kitchen-appliances.js`](../data/cj/c/kitchen-appliances.js) | 864 |
| Laptop Bags & Cases | [`data/cj/c/laptop-bags-and-cases.js`](../data/cj/c/laptop-bags-and-cases.js) | 225 |
| Laptop Batteries | [`data/cj/c/laptop-batteries.js`](../data/cj/c/laptop-batteries.js) | 12 |
| Laptops | [`data/cj/c/laptops.js`](../data/cj/c/laptops.js) | 22 |
| Leather Cases | [`data/cj/c/leather-cases.js`](../data/cj/c/leather-cases.js) | 1,947 |
| LED Spotlights | [`data/cj/c/led-spotlights.js`](../data/cj/c/led-spotlights.js) | 1,270 |
| Lenses | [`data/cj/c/lenses.js`](../data/cj/c/lenses.js) | 184 |
| Memory Cards | [`data/cj/c/memory-cards.js`](../data/cj/c/memory-cards.js) | 64 |
| Microphones | [`data/cj/c/microphones.js`](../data/cj/c/microphones.js) | 285 |
| Mobile Batteries | [`data/cj/c/mobile-batteries.js`](../data/cj/c/mobile-batteries.js) | 34 |
| Modem-Router Combos | [`data/cj/c/modem-router-combos.js`](../data/cj/c/modem-router-combos.js) | 4 |
| Musical Instruments | [`data/cj/c/musical-instruments.js`](../data/cj/c/musical-instruments.js) | 378 |
| Patterned Cases | [`data/cj/c/patterned-cases.js`](../data/cj/c/patterned-cases.js) | 1,851 |
| Personal Care Appliances | [`data/cj/c/personal-care-appliances.js`](../data/cj/c/personal-care-appliances.js) | 789 |
| Phone Call Tablets | [`data/cj/c/phone-call-tablets.js`](../data/cj/c/phone-call-tablets.js) | 5 |
| Power Bank | [`data/cj/c/power-bank.js`](../data/cj/c/power-bank.js) | 802 |
| Projectors | [`data/cj/c/projectors.js`](../data/cj/c/projectors.js) | 286 |
| Projectors & Acessories | [`data/cj/c/projectors-and-acessories.js`](../data/cj/c/projectors-and-acessories.js) | 198 |
| Screen Protectors | [`data/cj/c/screen-protectors.js`](../data/cj/c/screen-protectors.js) | 389 |
| Silicone Cases | [`data/cj/c/silicone-cases.js`](../data/cj/c/silicone-cases.js) | 275 |
| Smart Home Appliances | [`data/cj/c/smart-home-appliances.js`](../data/cj/c/smart-home-appliances.js) | 1,256 |
| Smart Watches | [`data/cj/c/smart-watches.js`](../data/cj/c/smart-watches.js) | 1,728 |
| Smart Wearable Accessories | [`data/cj/c/smart-wearable-accessories.js`](../data/cj/c/smart-wearable-accessories.js) | 584 |
| Smart Wristbands | [`data/cj/c/smart-wristbands.js`](../data/cj/c/smart-wristbands.js) | 236 |
| Solar Lamps | [`data/cj/c/solar-lamps.js`](../data/cj/c/solar-lamps.js) | 1,712 |
| Speakers | [`data/cj/c/speakers.js`](../data/cj/c/speakers.js) | 631 |
| Storage Bags & Cases & Boxes | [`data/cj/c/storage-bags-and-cases-and-boxes.js`](../data/cj/c/storage-bags-and-cases-and-boxes.js) | 3,354 |
| Surveillance Products | [`data/cj/c/surveillance-products.js`](../data/cj/c/surveillance-products.js) | 134 |
| Tablet Accessories | [`data/cj/c/tablet-accessories.js`](../data/cj/c/tablet-accessories.js) | 918 |
| Tablet Cases | [`data/cj/c/tablet-cases.js`](../data/cj/c/tablet-cases.js) | 138 |
| Tablet LCD Screens | [`data/cj/c/tablet-lcd-screens.js`](../data/cj/c/tablet-lcd-screens.js) | 21 |
| Tablets | [`data/cj/c/tablets.js`](../data/cj/c/tablets.js) | 76 |
| TV Receivers | [`data/cj/c/tv-receivers.js`](../data/cj/c/tv-receivers.js) | 56 |
| TV Sticks | [`data/cj/c/tv-sticks.js`](../data/cj/c/tv-sticks.js) | 13 |
| USB Flash Drives | [`data/cj/c/usb-flash-drives.js`](../data/cj/c/usb-flash-drives.js) | 100 |
| VR & AR Devices | [`data/cj/c/vr-and-ar-devices.js`](../data/cj/c/vr-and-ar-devices.js) | 46 |
| Wall Lamps | [`data/cj/c/wall-lamps.js`](../data/cj/c/wall-lamps.js) | 2,089 |
| Wallet Cases | [`data/cj/c/wallet-cases.js`](../data/cj/c/wallet-cases.js) | 392 |
| Waterptoof Cases | [`data/cj/c/waterptoof-cases.js`](../data/cj/c/waterptoof-cases.js) | 1,628 |
| Wireless Routers | [`data/cj/c/wireless-routers.js`](../data/cj/c/wireless-routers.js) | 72 |
| Xiaomi Cases | [`data/cj/c/xiaomi-cases.js`](../data/cj/c/xiaomi-cases.js) | 42 |

### Jewelry & Watches — 37,169 supplier products / 32 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| 925 Silver Jewelry | [`data/cj/c/925-silver-jewelry.js`](../data/cj/c/925-silver-jewelry.js) | 1,535 |
| Anklets | [`data/cj/c/anklets.js`](../data/cj/c/anklets.js) | 100 |
| Bracelets & Bangles | [`data/cj/c/bracelets-and-bangles.js`](../data/cj/c/bracelets-and-bangles.js) | 1,023 |
| Bridal Jewelry Sets | [`data/cj/c/bridal-jewelry-sets.js`](../data/cj/c/bridal-jewelry-sets.js) | 266 |
| Brooches | [`data/cj/c/brooches.js`](../data/cj/c/brooches.js) | 3,300 |
| Charms | [`data/cj/c/charms.js`](../data/cj/c/charms.js) | 3,765 |
| Creative Watches | [`data/cj/c/creative-watches.js`](../data/cj/c/creative-watches.js) | 578 |
| Digital Watches | [`data/cj/c/digital-watches.js`](../data/cj/c/digital-watches.js) | 449 |
| Dress Watches | [`data/cj/c/dress-watches.js`](../data/cj/c/dress-watches.js) | 1,966 |
| Earrings | [`data/cj/c/earrings.js`](../data/cj/c/earrings.js) | 1,237 |
| Engagement Rings | [`data/cj/c/engagement-rings.js`](../data/cj/c/engagement-rings.js) | 280 |
| Fashion Jewelry Sets | [`data/cj/c/fashion-jewelry-sets.js`](../data/cj/c/fashion-jewelry-sets.js) | 4,699 |
| Fine Earrings | [`data/cj/c/fine-earrings.js`](../data/cj/c/fine-earrings.js) | 2,164 |
| Fine Jewelry Sets | [`data/cj/c/fine-jewelry-sets.js`](../data/cj/c/fine-jewelry-sets.js) | 120 |
| K-Gold | [`data/cj/c/k-gold.js`](../data/cj/c/k-gold.js) | 118 |
| Keychains | [`data/cj/c/keychains.js`](../data/cj/c/keychains.js) | 3,328 |
| Lovers' Watches | [`data/cj/c/lovers-watches.js`](../data/cj/c/lovers-watches.js) | 233 |
| Mechanical Watches | [`data/cj/c/mechanical-watches.js`](../data/cj/c/mechanical-watches.js) | 1,556 |
| Men's Cuff Links | [`data/cj/c/men-s-cuff-links.js`](../data/cj/c/men-s-cuff-links.js) | 457 |
| Men's Fine Jewelry | [`data/cj/c/men-s-fine-jewelry.js`](../data/cj/c/men-s-fine-jewelry.js) | 102 |
| Men Sports Watches | [`data/cj/c/men-sports-watches.js`](../data/cj/c/men-sports-watches.js) | 1,143 |
| Pearls Jewelry | [`data/cj/c/pearls-jewelry.js`](../data/cj/c/pearls-jewelry.js) | 157 |
| Pendant Lights | [`data/cj/c/pendant-lights.js`](../data/cj/c/pendant-lights.js) | 284 |
| Pocket Watches | [`data/cj/c/pocket-watches.js`](../data/cj/c/pocket-watches.js) | 16 |
| Quartz Watches | [`data/cj/c/quartz-watches.js`](../data/cj/c/quartz-watches.js) | 4,389 |
| Rings | [`data/cj/c/rings.js`](../data/cj/c/rings.js) | 1,217 |
| String Lights | [`data/cj/c/string-lights.js`](../data/cj/c/string-lights.js) | 200 |
| Various Gemstones | [`data/cj/c/various-gemstones.js`](../data/cj/c/various-gemstones.js) | 219 |
| Watch Accessories | [`data/cj/c/watch-accessories.js`](../data/cj/c/watch-accessories.js) | 708 |
| Welding & Soldering Supplies | [`data/cj/c/welding-and-soldering-supplies.js`](../data/cj/c/welding-and-soldering-supplies.js) | 78 |
| Women's Bracelet Watches | [`data/cj/c/women-s-bracelet-watches.js`](../data/cj/c/women-s-bracelet-watches.js) | 1,101 |
| Women Sports Watches | [`data/cj/c/women-sports-watches.js`](../data/cj/c/women-sports-watches.js) | 381 |

### Bags & Shoes — 31,833 supplier products / 34 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Backpacks & Carriers | [`data/cj/c/backpacks-and-carriers.js`](../data/cj/c/backpacks-and-carriers.js) | 376 |
| Bag Accessories | [`data/cj/c/bag-accessories.js`](../data/cj/c/bag-accessories.js) | 93 |
| Basketball Shoes | [`data/cj/c/basketball-shoes.js`](../data/cj/c/basketball-shoes.js) | 94 |
| Casual Shoes | [`data/cj/c/casual-shoes.js`](../data/cj/c/casual-shoes.js) | 491 |
| Clutches | [`data/cj/c/clutches.js`](../data/cj/c/clutches.js) | 4,444 |
| Dance Shoes | [`data/cj/c/dance-shoes.js`](../data/cj/c/dance-shoes.js) | 30 |
| Digital Gear Bags | [`data/cj/c/digital-gear-bags.js`](../data/cj/c/digital-gear-bags.js) | 382 |
| Evening Bags | [`data/cj/c/evening-bags.js`](../data/cj/c/evening-bags.js) | 1,795 |
| Fashion Backpacks | [`data/cj/c/fashion-backpacks.js`](../data/cj/c/fashion-backpacks.js) | 416 |
| Flats | [`data/cj/c/flats.js`](../data/cj/c/flats.js) | 216 |
| Formal Shoes | [`data/cj/c/formal-shoes.js`](../data/cj/c/formal-shoes.js) | 2,149 |
| Hiking Shoes | [`data/cj/c/hiking-shoes.js`](../data/cj/c/hiking-shoes.js) | 114 |
| Inflatable Raft | [`data/cj/c/inflatable-raft.js`](../data/cj/c/inflatable-raft.js) | 29 |
| Luggage & Travel Bags | [`data/cj/c/luggage-and-travel-bags.js`](../data/cj/c/luggage-and-travel-bags.js) | 538 |
| Man Boots | [`data/cj/c/man-boots.js`](../data/cj/c/man-boots.js) | 2,138 |
| Man Sandals | [`data/cj/c/man-sandals.js`](../data/cj/c/man-sandals.js) | 721 |
| Man Wallets | [`data/cj/c/man-wallets.js`](../data/cj/c/man-wallets.js) | 1,595 |
| Men's Backpacks | [`data/cj/c/men-s-backpacks.js`](../data/cj/c/men-s-backpacks.js) | 4,226 |
| Men's Insoles | [`data/cj/c/men-s-insoles.js`](../data/cj/c/men-s-insoles.js) | 154 |
| Pumps | [`data/cj/c/pumps.js`](../data/cj/c/pumps.js) | 360 |
| Running Shoes | [`data/cj/c/running-shoes.js`](../data/cj/c/running-shoes.js) | 659 |
| Shoulder Bags | [`data/cj/c/shoulder-bags.js`](../data/cj/c/shoulder-bags.js) | 3,882 |
| Skateboarding Shoes | [`data/cj/c/skateboarding-shoes.js`](../data/cj/c/skateboarding-shoes.js) | 31 |
| Soccer Shoes | [`data/cj/c/soccer-shoes.js`](../data/cj/c/soccer-shoes.js) | 48 |
| Sports Bags | [`data/cj/c/sports-bags.js`](../data/cj/c/sports-bags.js) | 553 |
| Totes | [`data/cj/c/totes.js`](../data/cj/c/totes.js) | 481 |
| Trainers | [`data/cj/c/trainers.js`](../data/cj/c/trainers.js) | 188 |
| Vulcanize Shoe | [`data/cj/c/vulcanize-shoe.js`](../data/cj/c/vulcanize-shoe.js) | 753 |
| Vulcanize Shoes | [`data/cj/c/vulcanize-shoes.js`](../data/cj/c/vulcanize-shoes.js) | 1,182 |
| Waist Bags | [`data/cj/c/waist-bags.js`](../data/cj/c/waist-bags.js) | 766 |
| Woman Boots | [`data/cj/c/woman-boots.js`](../data/cj/c/woman-boots.js) | 405 |
| Woman Sandals | [`data/cj/c/woman-sandals.js`](../data/cj/c/woman-sandals.js) | 419 |
| Woman Wallets | [`data/cj/c/woman-wallets.js`](../data/cj/c/woman-wallets.js) | 2,072 |
| Women's Insoles | [`data/cj/c/women-s-insoles.js`](../data/cj/c/women-s-insoles.js) | 33 |

### Pets & Animals — 30,376 supplier products / 61 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Bird Accessories | [`data/cj/c/bird-accessories.js`](../data/cj/c/bird-accessories.js) | 13 |
| Bird Cages | [`data/cj/c/bird-cages.js`](../data/cj/c/bird-cages.js) | 125 |
| Bird Feeders | [`data/cj/c/bird-feeders.js`](../data/cj/c/bird-feeders.js) | 95 |
| Bird Swings | [`data/cj/c/bird-swings.js`](../data/cj/c/bird-swings.js) | 30 |
| Bird Toys | [`data/cj/c/bird-toys.js`](../data/cj/c/bird-toys.js) | 102 |
| Bird Travel Bags | [`data/cj/c/bird-travel-bags.js`](../data/cj/c/bird-travel-bags.js) | 12 |
| Cat Scratching Posts | [`data/cj/c/cat-scratching-posts.js`](../data/cj/c/cat-scratching-posts.js) | 394 |
| Cat Trees & Condos | [`data/cj/c/cat-trees-and-condos.js`](../data/cj/c/cat-trees-and-condos.js) | 394 |
| Custom Pet tags, Collars, Leashes & Harnesses | [`data/cj/c/custom-pet-tags-collars-leashes-and-harnesses.js`](../data/cj/c/custom-pet-tags-collars-leashes-and-harnesses.js) | 186 |
| Dog Stairs & Steps | [`data/cj/c/dog-stairs-and-steps.js`](../data/cj/c/dog-stairs-and-steps.js) | 111 |
| Dog Training Pads & Diapers | [`data/cj/c/dog-training-pads-and-diapers.js`](../data/cj/c/dog-training-pads-and-diapers.js) | 191 |
| Electronic Pets | [`data/cj/c/electronic-pets.js`](../data/cj/c/electronic-pets.js) | 290 |
| Pet Bags | [`data/cj/c/pet-bags.js`](../data/cj/c/pet-bags.js) | 962 |
| Pet Beds | [`data/cj/c/pet-beds.js`](../data/cj/c/pet-beds.js) | 265 |
| Pet Blankets & Quilts | [`data/cj/c/pet-blankets-and-quilts.js`](../data/cj/c/pet-blankets-and-quilts.js) | 140 |
| Pet Bowls | [`data/cj/c/pet-bowls.js`](../data/cj/c/pet-bowls.js) | 1,214 |
| Pet Bows & Ties | [`data/cj/c/pet-bows-and-ties.js`](../data/cj/c/pet-bows-and-ties.js) | 180 |
| Pet Car Mats | [`data/cj/c/pet-car-mats.js`](../data/cj/c/pet-car-mats.js) | 165 |
| Pet Chase Toys | [`data/cj/c/pet-chase-toys.js`](../data/cj/c/pet-chase-toys.js) | 940 |
| Pet Chew Toys | [`data/cj/c/pet-chew-toys.js`](../data/cj/c/pet-chew-toys.js) | 474 |
| Pet Clothing Sets | [`data/cj/c/pet-clothing-sets.js`](../data/cj/c/pet-clothing-sets.js) | 95 |
| Pet Clothings | [`data/cj/c/pet-clothings.js`](../data/cj/c/pet-clothings.js) | 3,517 |
| Pet Coats & Jackets | [`data/cj/c/pet-coats-and-jackets.js`](../data/cj/c/pet-coats-and-jackets.js) | 131 |
| Pet Collar, Leash & Harness Sets | [`data/cj/c/pet-collar-leash-and-harness-sets.js`](../data/cj/c/pet-collar-leash-and-harness-sets.js) | 211 |
| Pet Collars | [`data/cj/c/pet-collars.js`](../data/cj/c/pet-collars.js) | 1,781 |
| Pet Dresses | [`data/cj/c/pet-dresses.js`](../data/cj/c/pet-dresses.js) | 170 |
| Pet Drinking Tools | [`data/cj/c/pet-drinking-tools.js`](../data/cj/c/pet-drinking-tools.js) | 555 |
| Pet Feeding Tools | [`data/cj/c/pet-feeding-tools.js`](../data/cj/c/pet-feeding-tools.js) | 704 |
| Pet Functional Clothings | [`data/cj/c/pet-functional-clothings.js`](../data/cj/c/pet-functional-clothings.js) | 170 |
| Pet Furniture Protectors | [`data/cj/c/pet-furniture-protectors.js`](../data/cj/c/pet-furniture-protectors.js) | 48 |
| Pet Furniture Tools | [`data/cj/c/pet-furniture-tools.js`](../data/cj/c/pet-furniture-tools.js) | 453 |
| Pet Glasses | [`data/cj/c/pet-glasses.js`](../data/cj/c/pet-glasses.js) | 61 |
| Pet Guardrails | [`data/cj/c/pet-guardrails.js`](../data/cj/c/pet-guardrails.js) | 195 |
| Pet Hair Accessories | [`data/cj/c/pet-hair-accessories.js`](../data/cj/c/pet-hair-accessories.js) | 62 |
| Pet Hair Removers & Combs | [`data/cj/c/pet-hair-removers-and-combs.js`](../data/cj/c/pet-hair-removers-and-combs.js) | 825 |
| Pet Hammocks | [`data/cj/c/pet-hammocks.js`](../data/cj/c/pet-hammocks.js) | 153 |
| Pet Harnesses | [`data/cj/c/pet-harnesses.js`](../data/cj/c/pet-harnesses.js) | 859 |
| Pet Headwears | [`data/cj/c/pet-headwears.js`](../data/cj/c/pet-headwears.js) | 218 |
| Pet Houses & Cages | [`data/cj/c/pet-houses-and-cages.js`](../data/cj/c/pet-houses-and-cages.js) | 902 |
| Pet Jumpsuits | [`data/cj/c/pet-jumpsuits.js`](../data/cj/c/pet-jumpsuits.js) | 83 |
| Pet Leashes | [`data/cj/c/pet-leashes.js`](../data/cj/c/pet-leashes.js) | 1,330 |
| Pet Mats | [`data/cj/c/pet-mats.js`](../data/cj/c/pet-mats.js) | 791 |
| Pet Muzzles | [`data/cj/c/pet-muzzles.js`](../data/cj/c/pet-muzzles.js) | 80 |
| Pet Nail Polishers | [`data/cj/c/pet-nail-polishers.js`](../data/cj/c/pet-nail-polishers.js) | 226 |
| Pet Nests | [`data/cj/c/pet-nests.js`](../data/cj/c/pet-nests.js) | 2,210 |
| Pet Pajamas | [`data/cj/c/pet-pajamas.js`](../data/cj/c/pet-pajamas.js) | 63 |
| Pet Plush Toys | [`data/cj/c/pet-plush-toys.js`](../data/cj/c/pet-plush-toys.js) | 588 |
| Pet Scarves | [`data/cj/c/pet-scarves.js`](../data/cj/c/pet-scarves.js) | 382 |
| Pet Seat Belts | [`data/cj/c/pet-seat-belts.js`](../data/cj/c/pet-seat-belts.js) | 129 |
| Pet Shoes & Socks | [`data/cj/c/pet-shoes-and-socks.js`](../data/cj/c/pet-shoes-and-socks.js) | 241 |
| Pet Shower Products | [`data/cj/c/pet-shower-products.js`](../data/cj/c/pet-shower-products.js) | 1,879 |
| Pet Snacks | [`data/cj/c/pet-snacks.js`](../data/cj/c/pet-snacks.js) | 363 |
| Pet Sound Toys | [`data/cj/c/pet-sound-toys.js`](../data/cj/c/pet-sound-toys.js) | 84 |
| Pet Sweaters | [`data/cj/c/pet-sweaters.js`](../data/cj/c/pet-sweaters.js) | 388 |
| Pet Sweatshirts & Hoodies | [`data/cj/c/pet-sweatshirts-and-hoodies.js`](../data/cj/c/pet-sweatshirts-and-hoodies.js) | 458 |
| Pet Tents | [`data/cj/c/pet-tents.js`](../data/cj/c/pet-tents.js) | 100 |
| Pet Tops | [`data/cj/c/pet-tops.js`](../data/cj/c/pet-tops.js) | 539 |
| Pet Towels | [`data/cj/c/pet-towels.js`](../data/cj/c/pet-towels.js) | 81 |
| Pet Toy Set | [`data/cj/c/pet-toy-set.js`](../data/cj/c/pet-toy-set.js) | 1,364 |
| Pet Training and Educational Toys | [`data/cj/c/pet-training-and-educational-toys.js`](../data/cj/c/pet-training-and-educational-toys.js) | 1,486 |
| Pet Tunnel Toys | [`data/cj/c/pet-tunnel-toys.js`](../data/cj/c/pet-tunnel-toys.js) | 118 |

### Home & Living — 29,515 supplier products / 26 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Bakeware | [`data/cj/c/bakeware.js`](../data/cj/c/bakeware.js) | 206 |
| Barking Control Equipments | [`data/cj/c/barking-control-equipments.js`](../data/cj/c/barking-control-equipments.js) | 201 |
| Barware | [`data/cj/c/barware.js`](../data/cj/c/barware.js) | 708 |
| Bedding Sets | [`data/cj/c/bedding-sets.js`](../data/cj/c/bedding-sets.js) | 5,704 |
| Cake Decorating Supplies | [`data/cj/c/cake-decorating-supplies.js`](../data/cj/c/cake-decorating-supplies.js) | 256 |
| Car Mirror Video | [`data/cj/c/car-mirror-video.js`](../data/cj/c/car-mirror-video.js) | 184 |
| Ceiling Lights | [`data/cj/c/ceiling-lights.js`](../data/cj/c/ceiling-lights.js) | 1,892 |
| Comforters | [`data/cj/c/comforters.js`](../data/cj/c/comforters.js) | 397 |
| Curtains | [`data/cj/c/curtains.js`](../data/cj/c/curtains.js) | 740 |
| Cushion Covers | [`data/cj/c/cushion-covers.js`](../data/cj/c/cushion-covers.js) | 2,426 |
| Dinnerware | [`data/cj/c/dinnerware.js`](../data/cj/c/dinnerware.js) | 240 |
| Downlights | [`data/cj/c/downlights.js`](../data/cj/c/downlights.js) | 241 |
| Drinkware | [`data/cj/c/drinkware.js`](../data/cj/c/drinkware.js) | 724 |
| Floodlights | [`data/cj/c/floodlights.js`](../data/cj/c/floodlights.js) | 472 |
| Furniture | [`data/cj/c/furniture.js`](../data/cj/c/furniture.js) | 177 |
| Home Improvement Materials | [`data/cj/c/home-improvement-materials.js`](../data/cj/c/home-improvement-materials.js) | 355 |
| Kitchen Knives & Accessories | [`data/cj/c/kitchen-knives-and-accessories.js`](../data/cj/c/kitchen-knives-and-accessories.js) | 2,933 |
| Kitchen Storage | [`data/cj/c/kitchen-storage.js`](../data/cj/c/kitchen-storage.js) | 1,422 |
| Lighting | [`data/cj/c/lighting.js`](../data/cj/c/lighting.js) | 164 |
| Mirrors | [`data/cj/c/mirrors.js`](../data/cj/c/mirrors.js) | 129 |
| Night Lights | [`data/cj/c/night-lights.js`](../data/cj/c/night-lights.js) | 5,382 |
| Pillows | [`data/cj/c/pillows.js`](../data/cj/c/pillows.js) | 3,171 |
| Storage Bottles & Jars | [`data/cj/c/storage-bottles-and-jars.js`](../data/cj/c/storage-bottles-and-jars.js) | 409 |
| Stowing Tidying | [`data/cj/c/stowing-tidying.js`](../data/cj/c/stowing-tidying.js) | 233 |
| Towels | [`data/cj/c/towels.js`](../data/cj/c/towels.js) | 703 |
| Underwater Lights | [`data/cj/c/underwater-lights.js`](../data/cj/c/underwater-lights.js) | 46 |

### Tools & DIY — 26,284 supplier products / 16 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Alarm Systems & Security | [`data/cj/c/alarm-systems-and-security.js`](../data/cj/c/alarm-systems-and-security.js) | 30 |
| Cooking Tools | [`data/cj/c/cooking-tools.js`](../data/cj/c/cooking-tools.js) | 5,312 |
| Decor Paintings | [`data/cj/c/decor-paintings.js`](../data/cj/c/decor-paintings.js) | 3,166 |
| Diagnostic Tools | [`data/cj/c/diagnostic-tools.js`](../data/cj/c/diagnostic-tools.js) | 148 |
| Diamond Painting Cross Stitch | [`data/cj/c/diamond-painting-cross-stitch.js`](../data/cj/c/diamond-painting-cross-stitch.js) | 3,106 |
| Garden Tools | [`data/cj/c/garden-tools.js`](../data/cj/c/garden-tools.js) | 5,866 |
| Hand Tools | [`data/cj/c/hand-tools.js`](../data/cj/c/hand-tools.js) | 3,791 |
| Machine Tools & Accessories | [`data/cj/c/machine-tools-and-accessories.js`](../data/cj/c/machine-tools-and-accessories.js) | 261 |
| Measurement & Analysis | [`data/cj/c/measurement-and-analysis.js`](../data/cj/c/measurement-and-analysis.js) | 433 |
| Networking Tools | [`data/cj/c/networking-tools.js`](../data/cj/c/networking-tools.js) | 109 |
| Power Tools | [`data/cj/c/power-tools.js`](../data/cj/c/power-tools.js) | 1,085 |
| SIM Card & Tools | [`data/cj/c/sim-card-and-tools.js`](../data/cj/c/sim-card-and-tools.js) | 39 |
| Tool Sets | [`data/cj/c/tool-sets.js`](../data/cj/c/tool-sets.js) | 1,604 |
| Tools Storage | [`data/cj/c/tools-storage.js`](../data/cj/c/tools-storage.js) | 852 |
| Welding Equipment | [`data/cj/c/welding-equipment.js`](../data/cj/c/welding-equipment.js) | 109 |
| Woodworking Machinery | [`data/cj/c/woodworking-machinery.js`](../data/cj/c/woodworking-machinery.js) | 373 |

### Kids Accessories — 19,277 supplier products / 26 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Boy Accessories | [`data/cj/c/boy-accessories.js`](../data/cj/c/boy-accessories.js) | 442 |
| Boy Clothing Sets | [`data/cj/c/boy-clothing-sets.js`](../data/cj/c/boy-clothing-sets.js) | 3,038 |
| Boy Hoodies & Sweatshirts | [`data/cj/c/boy-hoodies-and-sweatshirts.js`](../data/cj/c/boy-hoodies-and-sweatshirts.js) | 578 |
| Boy Jeans | [`data/cj/c/boy-jeans.js`](../data/cj/c/boy-jeans.js) | 433 |
| Boy T-Shirts | [`data/cj/c/boy-t-shirts.js`](../data/cj/c/boy-t-shirts.js) | 583 |
| Boys Bags | [`data/cj/c/boys-bags.js`](../data/cj/c/boys-bags.js) | 369 |
| Boys Shoes | [`data/cj/c/boys-shoes.js`](../data/cj/c/boys-shoes.js) | 594 |
| Children's Shoes | [`data/cj/c/children-s-shoes.js`](../data/cj/c/children-s-shoes.js) | 442 |
| Children's Swimwear | [`data/cj/c/children-s-swimwear.js`](../data/cj/c/children-s-swimwear.js) | 181 |
| Children's Watches | [`data/cj/c/children-s-watches.js`](../data/cj/c/children-s-watches.js) | 180 |
| Couple&Parent -Child Jackets | [`data/cj/c/coupleandparent-child-jackets.js`](../data/cj/c/coupleandparent-child-jackets.js) | 15 |
| Couple&Parent-Child Pants | [`data/cj/c/coupleandparent-child-pants.js`](../data/cj/c/coupleandparent-child-pants.js) | 17 |
| Couple&Parent-Child Short-Sleeves | [`data/cj/c/coupleandparent-child-short-sleeves.js`](../data/cj/c/coupleandparent-child-short-sleeves.js) | 45 |
| Couple&Parent-Child Suits | [`data/cj/c/coupleandparent-child-suits.js`](../data/cj/c/coupleandparent-child-suits.js) | 460 |
| Couple&Parent-Child Sweatshirts | [`data/cj/c/coupleandparent-child-sweatshirts.js`](../data/cj/c/coupleandparent-child-sweatshirts.js) | 37 |
| Couple&Parent-Child Tops | [`data/cj/c/coupleandparent-child-tops.js`](../data/cj/c/coupleandparent-child-tops.js) | 12 |
| Flower Girl Dresses | [`data/cj/c/flower-girl-dresses.js`](../data/cj/c/flower-girl-dresses.js) | 124 |
| Girl Accessories | [`data/cj/c/girl-accessories.js`](../data/cj/c/girl-accessories.js) | 833 |
| Girl Clothing Sets | [`data/cj/c/girl-clothing-sets.js`](../data/cj/c/girl-clothing-sets.js) | 4,629 |
| Girl Dresses | [`data/cj/c/girl-dresses.js`](../data/cj/c/girl-dresses.js) | 4,719 |
| Girls Bags | [`data/cj/c/girls-bags.js`](../data/cj/c/girls-bags.js) | 99 |
| Girls' Pants | [`data/cj/c/girls-pants.js`](../data/cj/c/girls-pants.js) | 122 |
| Girls Shoes | [`data/cj/c/girls-shoes.js`](../data/cj/c/girls-shoes.js) | 837 |
| Girls Underwear | [`data/cj/c/girls-underwear.js`](../data/cj/c/girls-underwear.js) | 39 |
| Kids Wallets | [`data/cj/c/kids-wallets.js`](../data/cj/c/kids-wallets.js) | 85 |
| School Bags | [`data/cj/c/school-bags.js`](../data/cj/c/school-bags.js) | 364 |

### Automotive — 16,540 supplier products / 32 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Automobiles Seat Covers | [`data/cj/c/automobiles-seat-covers.js`](../data/cj/c/automobiles-seat-covers.js) | 191 |
| Automobiles Sensors | [`data/cj/c/automobiles-sensors.js`](../data/cj/c/automobiles-sensors.js) | 170 |
| Bicycle Frames | [`data/cj/c/bicycle-frames.js`](../data/cj/c/bicycle-frames.js) | 631 |
| Bicycle Helmets | [`data/cj/c/bicycle-helmets.js`](../data/cj/c/bicycle-helmets.js) | 235 |
| Bicycle Lights | [`data/cj/c/bicycle-lights.js`](../data/cj/c/bicycle-lights.js) | 367 |
| Bicycles | [`data/cj/c/bicycles.js`](../data/cj/c/bicycles.js) | 695 |
| Car Aromatherapy | [`data/cj/c/car-aromatherapy.js`](../data/cj/c/car-aromatherapy.js) | 71 |
| Car Brake System | [`data/cj/c/car-brake-system.js`](../data/cj/c/car-brake-system.js) | 193 |
| Car Covers | [`data/cj/c/car-covers.js`](../data/cj/c/car-covers.js) | 63 |
| Car Lights | [`data/cj/c/car-lights.js`](../data/cj/c/car-lights.js) | 683 |
| Car Monitors | [`data/cj/c/car-monitors.js`](../data/cj/c/car-monitors.js) | 49 |
| Car Perfume | [`data/cj/c/car-perfume.js`](../data/cj/c/car-perfume.js) | 50 |
| Car Radios | [`data/cj/c/car-radios.js`](../data/cj/c/car-radios.js) | 27 |
| Car Washer | [`data/cj/c/car-washer.js`](../data/cj/c/car-washer.js) | 124 |
| Cycling Eyewear | [`data/cj/c/cycling-eyewear.js`](../data/cj/c/cycling-eyewear.js) | 587 |
| Cycling Gloves | [`data/cj/c/cycling-gloves.js`](../data/cj/c/cycling-gloves.js) | 124 |
| DVR & Dash Camera | [`data/cj/c/dvr-and-dash-camera.js`](../data/cj/c/dvr-and-dash-camera.js) | 34 |
| Exterior Parts | [`data/cj/c/exterior-parts.js`](../data/cj/c/exterior-parts.js) | 1,721 |
| Floor Mats | [`data/cj/c/floor-mats.js`](../data/cj/c/floor-mats.js) | 443 |
| GPS Trackers | [`data/cj/c/gps-trackers.js`](../data/cj/c/gps-trackers.js) | 36 |
| Helmet Headset | [`data/cj/c/helmet-headset.js`](../data/cj/c/helmet-headset.js) | 368 |
| Interior Parts | [`data/cj/c/interior-parts.js`](../data/cj/c/interior-parts.js) | 3,850 |
| Motorcycle Seat Covers | [`data/cj/c/motorcycle-seat-covers.js`](../data/cj/c/motorcycle-seat-covers.js) | 69 |
| Other Exterior Accessories | [`data/cj/c/other-exterior-accessories.js`](../data/cj/c/other-exterior-accessories.js) | 859 |
| Other Maintenance Products | [`data/cj/c/other-maintenance-products.js`](../data/cj/c/other-maintenance-products.js) | 2,306 |
| Other Motorcycle Accessories | [`data/cj/c/other-motorcycle-accessories.js`](../data/cj/c/other-motorcycle-accessories.js) | 992 |
| Other Replacement Parts | [`data/cj/c/other-replacement-parts.js`](../data/cj/c/other-replacement-parts.js) | 135 |
| Steering Covers | [`data/cj/c/steering-covers.js`](../data/cj/c/steering-covers.js) | 182 |
| Stickers & Decals | [`data/cj/c/stickers-and-decals.js`](../data/cj/c/stickers-and-decals.js) | 777 |
| Vehicle Camera | [`data/cj/c/vehicle-camera.js`](../data/cj/c/vehicle-camera.js) | 186 |
| Vehicle GPS | [`data/cj/c/vehicle-gps.js`](../data/cj/c/vehicle-gps.js) | 52 |
| Windscreen Wipers & Windows | [`data/cj/c/windscreen-wipers-and-windows.js`](../data/cj/c/windscreen-wipers-and-windows.js) | 270 |

### Baby & Kids Accessories — 11,857 supplier products / 10 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Baby Accessories | [`data/cj/c/baby-accessories.js`](../data/cj/c/baby-accessories.js) | 1,133 |
| Baby Care | [`data/cj/c/baby-care.js`](../data/cj/c/baby-care.js) | 1,523 |
| Baby Clothing Sets | [`data/cj/c/baby-clothing-sets.js`](../data/cj/c/baby-clothing-sets.js) | 3,911 |
| Baby Dresses | [`data/cj/c/baby-dresses.js`](../data/cj/c/baby-dresses.js) | 366 |
| Baby Outerwear | [`data/cj/c/baby-outerwear.js`](../data/cj/c/baby-outerwear.js) | 378 |
| Baby Pants | [`data/cj/c/baby-pants.js`](../data/cj/c/baby-pants.js) | 466 |
| Baby Rompers | [`data/cj/c/baby-rompers.js`](../data/cj/c/baby-rompers.js) | 2,119 |
| Baby's First Walkers | [`data/cj/c/baby-s-first-walkers.js`](../data/cj/c/baby-s-first-walkers.js) | 1,712 |
| Maternity | [`data/cj/c/maternity.js`](../data/cj/c/maternity.js) | 118 |
| Nappy Changing | [`data/cj/c/nappy-changing.js`](../data/cj/c/nappy-changing.js) | 131 |

### Events & Gifting — 9,139 supplier products / 6 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Christmas Decoration Supplies | [`data/cj/c/christmas-decoration-supplies.js`](../data/cj/c/christmas-decoration-supplies.js) | 3,961 |
| Decorative Flowers & Wreaths | [`data/cj/c/decorative-flowers-and-wreaths.js`](../data/cj/c/decorative-flowers-and-wreaths.js) | 407 |
| Event & Party Supplies | [`data/cj/c/event-and-party-supplies.js`](../data/cj/c/event-and-party-supplies.js) | 698 |
| Party Masks | [`data/cj/c/party-masks.js`](../data/cj/c/party-masks.js) | 533 |
| Seasonal products | [`data/cj/c/seasonal-products.js`](../data/cj/c/seasonal-products.js) | 3,458 |
| Wedding & Engagement | [`data/cj/c/wedding-and-engagement.js`](../data/cj/c/wedding-and-engagement.js) | 82 |

### Books & Stationery — 8,284 supplier products / 11 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Apparel Sewing & Fabric | [`data/cj/c/apparel-sewing-and-fabric.js`](../data/cj/c/apparel-sewing-and-fabric.js) | 1,545 |
| Car Stickers | [`data/cj/c/car-stickers.js`](../data/cj/c/car-stickers.js) | 439 |
| Cross-Stitch | [`data/cj/c/cross-stitch.js`](../data/cj/c/cross-stitch.js) | 515 |
| Fabric | [`data/cj/c/fabric.js`](../data/cj/c/fabric.js) | 1,374 |
| Home Office Storage | [`data/cj/c/home-office-storage.js`](../data/cj/c/home-office-storage.js) | 697 |
| Invitation Cards | [`data/cj/c/invitation-cards.js`](../data/cj/c/invitation-cards.js) | 141 |
| Office & School Supplies | [`data/cj/c/office-and-school-supplies.js`](../data/cj/c/office-and-school-supplies.js) | 2,660 |
| Stationeries | [`data/cj/c/stationeries.js`](../data/cj/c/stationeries.js) | 646 |
| Stickers | [`data/cj/c/stickers.js`](../data/cj/c/stickers.js) | 222 |
| Women's Knit Bottoms | [`data/cj/c/women-s-knit-bottoms.js`](../data/cj/c/women-s-knit-bottoms.js) | 1 |
| Women's Knit Sets | [`data/cj/c/women-s-knit-sets.js`](../data/cj/c/women-s-knit-sets.js) | 44 |

### Toys & Games — 7,403 supplier products / 14 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| 5-inch Display | [`data/cj/c/5-inch-display.js`](../data/cj/c/5-inch-display.js) | 106 |
| Action & Toy Figures | [`data/cj/c/action-and-toy-figures.js`](../data/cj/c/action-and-toy-figures.js) | 1,391 |
| Blocks | [`data/cj/c/blocks.js`](../data/cj/c/blocks.js) | 3,436 |
| Camera Drones | [`data/cj/c/camera-drones.js`](../data/cj/c/camera-drones.js) | 245 |
| Car Multimedia Player | [`data/cj/c/car-multimedia-player.js`](../data/cj/c/car-multimedia-player.js) | 120 |
| Cosplay Wigs | [`data/cj/c/cosplay-wigs.js`](../data/cj/c/cosplay-wigs.js) | 384 |
| Dual Display Watches | [`data/cj/c/dual-display-watches.js`](../data/cj/c/dual-display-watches.js) | 87 |
| Gamepads | [`data/cj/c/gamepads.js`](../data/cj/c/gamepads.js) | 423 |
| Handheld Game Players | [`data/cj/c/handheld-game-players.js`](../data/cj/c/handheld-game-players.js) | 84 |
| MP3 Players | [`data/cj/c/mp3-players.js`](../data/cj/c/mp3-players.js) | 268 |
| RC Helicopters | [`data/cj/c/rc-helicopters.js`](../data/cj/c/rc-helicopters.js) | 305 |
| Smart Remote Controls | [`data/cj/c/smart-remote-controls.js`](../data/cj/c/smart-remote-controls.js) | 163 |
| Stuffed & Plush Animals | [`data/cj/c/stuffed-and-plush-animals.js`](../data/cj/c/stuffed-and-plush-animals.js) | 353 |
| Video Game Consoles | [`data/cj/c/video-game-consoles.js`](../data/cj/c/video-game-consoles.js) | 38 |

### Sports & Outdoor — 7,067 supplier products / 12 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| Activity & Gear | [`data/cj/c/activity-and-gear.js`](../data/cj/c/activity-and-gear.js) | 386 |
| Camping & Hiking | [`data/cj/c/camping-and-hiking.js`](../data/cj/c/camping-and-hiking.js) | 3,260 |
| Fishing Lines | [`data/cj/c/fishing-lines.js`](../data/cj/c/fishing-lines.js) | 234 |
| Fishing Lures | [`data/cj/c/fishing-lures.js`](../data/cj/c/fishing-lures.js) | 898 |
| Fishing Reels | [`data/cj/c/fishing-reels.js`](../data/cj/c/fishing-reels.js) | 153 |
| Fishing Rods | [`data/cj/c/fishing-rods.js`](../data/cj/c/fishing-rods.js) | 189 |
| Fishing Tackle Boxes | [`data/cj/c/fishing-tackle-boxes.js`](../data/cj/c/fishing-tackle-boxes.js) | 99 |
| Golf | [`data/cj/c/golf.js`](../data/cj/c/golf.js) | 376 |
| Hunting | [`data/cj/c/hunting.js`](../data/cj/c/hunting.js) | 209 |
| Rod Combos | [`data/cj/c/rod-combos.js`](../data/cj/c/rod-combos.js) | 438 |
| Skiing & Snowboarding | [`data/cj/c/skiing-and-snowboarding.js`](../data/cj/c/skiing-and-snowboarding.js) | 118 |
| Sports Accessories | [`data/cj/c/sports-accessories.js`](../data/cj/c/sports-accessories.js) | 707 |

### More Global Finds — 758 supplier products / 28 categories

| Category | GitHub category file | Supplier IDs |
|---|---|---:|
| 3G Modems | [`data/cj/c/3g-modems.js`](../data/cj/c/3g-modems.js) | 7 |
| 3GB RAM | [`data/cj/c/3gb-ram.js`](../data/cj/c/3gb-ram.js) | 3 |
| Alarm & Sensor | [`data/cj/c/alarm-and-sensor.js`](../data/cj/c/alarm-and-sensor.js) | 59 |
| Door Intercom | [`data/cj/c/door-intercom.js`](../data/cj/c/door-intercom.js) | 37 |
| Dual SIM Card | [`data/cj/c/dual-sim-card.js`](../data/cj/c/dual-sim-card.js) | 14 |
| Exhaust & Exhaust Systems | [`data/cj/c/exhaust-and-exhaust-systems.js`](../data/cj/c/exhaust-and-exhaust-systems.js) | 19 |
| Fire Protection | [`data/cj/c/fire-protection.js`](../data/cj/c/fire-protection.js) | 28 |
| First Aid Supplies | [`data/cj/c/first-aid-supplies.js`](../data/cj/c/first-aid-supplies.js) | 17 |
| HDD Enclosures | [`data/cj/c/hdd-enclosures.js`](../data/cj/c/hdd-enclosures.js) | 62 |
| Joysticks | [`data/cj/c/joysticks.js`](../data/cj/c/joysticks.js) | 28 |
| Jump Starter | [`data/cj/c/jump-starter.js`](../data/cj/c/jump-starter.js) | 58 |
| LCDs | [`data/cj/c/lcds.js`](../data/cj/c/lcds.js) | 29 |
| Network Cards | [`data/cj/c/network-cards.js`](../data/cj/c/network-cards.js) | 26 |
| Octa Core | [`data/cj/c/octa-core.js`](../data/cj/c/octa-core.js) | 9 |
| Photo Studio | [`data/cj/c/photo-studio.js`](../data/cj/c/photo-studio.js) | 37 |
| Quad Core | [`data/cj/c/quad-core.js`](../data/cj/c/quad-core.js) | 10 |
| Ribbons | [`data/cj/c/ribbons.js`](../data/cj/c/ribbons.js) | 80 |
| Scanners | [`data/cj/c/scanners.js`](../data/cj/c/scanners.js) | 14 |
| Scooters | [`data/cj/c/scooters.js`](../data/cj/c/scooters.js) | 42 |
| Single SIM Card | [`data/cj/c/single-sim-card.js`](../data/cj/c/single-sim-card.js) | 12 |
| SSD | [`data/cj/c/ssd.js`](../data/cj/c/ssd.js) | 42 |
| Television | [`data/cj/c/television.js`](../data/cj/c/television.js) | 22 |
| Touch Panel | [`data/cj/c/touch-panel.js`](../data/cj/c/touch-panel.js) | 45 |
| Uncategorized | [`data/cj/c/uncategorized.js`](../data/cj/c/uncategorized.js) | 6 |
| Violins | [`data/cj/c/violins.js`](../data/cj/c/violins.js) | 4 |
| Women's Casual Sets | [`data/cj/c/women-s-casual-sets.js`](../data/cj/c/women-s-casual-sets.js) | 40 |
| Women's Overalls | [`data/cj/c/women-s-overalls.js`](../data/cj/c/women-s-overalls.js) | 2 |
| Women's Three-Piece Sets | [`data/cj/c/women-s-three-piece-sets.js`](../data/cj/c/women-s-three-piece-sets.js) | 6 |

## Completeness controls

- Category files reconciled: **572 / 572**.
- Total category counts: **451,812 / 451,812**.
- Unmapped category files: **0**.
- Duplicate supplier IDs in the lookup manifest: **0**.
- A separate local catalog audit runs on GitHub; local WooCommerce reconciliation requires a fresh authenticated export.

*Generated from actual repository manifests, not a manually shortened category sample.*
