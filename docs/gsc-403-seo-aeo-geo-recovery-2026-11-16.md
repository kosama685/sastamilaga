# Sasta Milaga — SEO / AEO / GEO Crawl Recovery (16 November 2026)

Canonical domain: https://sastamilaga.com/
GitHub Pages mirror: https://kosama685.github.io/sastamilaga/
Historical GSC export: 699 403 URLs, dated 27 October–14 November 2026. The complete inventory is preserved in reports/gsc-403-2026-11-16.txt.

## Verified historical inventory

| Group | Count | Safe response policy |
|---|---:|---|
| Shopping-action query URLs (add-to-cart, sm_buy_now) | 208 | Never GET while auditing; no indexing or fabricated page |
| Other filter/variant query URLs | 58 | Canonicalize appropriately; do not index automatically |
| Product lookup aliases (post_type=product) | 8 | Redirect only to a verified matching product |
| Clean product URLs | 176 | 200 with genuine product details, or accurate 301/404/410 |
| Urdu-prefixed clean URLs | 138 | Audit translation, canonical and hreflang per page |
| Clean video URLs | 49 | Keep only real, useful content or redirect/retire |
| Clean category URLs | 22 | Original category content and product links |
| Clean blog URLs | 10 | Original articles and accurate Article schema |
| Other clean URLs | 30 | Evaluate home, legal, visa, tags and related routes individually |

The first requirement is to separate public index-worthy pages from cart actions, duplicates and retired products. Forcing every historical 403 to HTTP 200 would generate soft-404 and low-value pages.

## Live architecture confirmed

Cloudflare zone is active. The proxied A record remains on the WordPress origin, with a proxied www CNAME. Its catch-all Worker sasta-public-github-recovery-v1 delegates to sasta-cj-storefront-v1 for public browsing and to sasta-canonical-sync-v11 for selected static recovery. The latter references the GitHub Pages mirror. Thus GitHub is connected without needing to repoint DNS or interrupt WooCommerce.

Cloudflare WAF was configured with a rule for verified Google crawlers requiring both cf.client.bot and a fixed published IP list. On 16 November the fixed IP-list dependency was removed from that specific enabled rule, preserving Cloudflare verification, safe GET/HEAD scope, and private/action exclusions. Other WAF rules remain active. The previous 403 source has not yet been proven from per-request security logs.

WordPress blog_public is 1. The Search Console connector currently fails with invalid_grant. Neither an observed browser HTTP 200 nor a simulated Googlebot User-Agent proves Google indexed the page.

## Changes implemented in this branch

- Version the exact 699 reported historical URLs as a reproducible audit input.
- Add a read-only Node crawler. It classifies every entry, never triggers add-to-cart or protected checkout paths, checks public response/redirect chains and records relevant title, canonical, H1, robots and structured data evidence.
- Add quick PR validation and full-on-main audit GitHub Actions, preserving a JSON report even when URLs fail.
- Enable strict static-link CI. Latest baseline before change: 21,131 HTML files, 78,816 distinct internal references, zero missing static references and zero chrome issues.
- Refine root robots.txt: allow ordinary public rendering resources rather than broadly disallowing wp-json and api; disallow checkout/private and action parameter paths.
- Add a dedicated exact-path Cloudflare robots.txt Worker generated from GitHub robots.txt, with an isolated deployment workflow. It does not change domain DNS, WooCommerce, payment, shipping or other Worker route assignments.

## SEO, AEO, GEO quality gates

A page is an indexing candidate only with authentic content, an HTTP 200 response accessible to real Googlebot, unique title/description/H1, correct canonical, an appropriate robots policy, useful crawlable HTML internal links, and accurate language alternates. Use schema.org Product, Article, BreadcrumbList, FAQPage or Organization only where actual page content supports it. Never invent reviews, availability, supplier brands, GTIN, price, images or shipping. Answer-first content, transparent product provenance and clearly defined entities can help answer-engine and generative discovery, but do not guarantee ranking or citations.

Qualified supplier pages must pass source enrichment, inventory, destination shipping, eligibility and checkout verification. Do not automatically make all 451,812 CJ records indexable.

## Open risks and dependencies

1. Google Search Console account: invalid_grant, requires owner reauthorization before URL Inspection and Validate Fix can run.
2. D1 free-tier row read capacity: issue #27 remains unresolved. The previously documented qualified-sitemap reviewed fallback expires on 17 November 2026 at 00:00 UTC. No stale fallback or unverified mass sitemap should be published.
3. WooCommerce SEO audit: 3,142 product images missing, 20 prices missing, 11,793 product meta descriptions missing, 1,968 duplicate titles, 1,221 thin descriptions. Counts may overlap. All bulk corrections require verified source data and bounded tests, not generated unsupported claims.
4. Historical GSC 403 list alone is not proof that the same URLs return 403 now. A GitHub Runner spoofing a Googlebot User-Agent is NOT a verified Google crawler. Compare real Google Search Console live inspection and Cloudflare Security Events.

## Verification and rollback

- After merging, GitHub Actions quick and full safe probes publish a gsc-403-url-ledger artifact. Action URLs are explicitly marked NOT_PROBED_INTENTIONALLY rather than silently skipped.
- The isolated Cloudflare robots deployment must return a live robots.txt byte-for-byte equal to GitHub policy.
- If the exact-path robots Worker causes an issue, revert only its exact Cloudflare route to the existing catch-all; preserve commerce/other Workers.
- The single WAF exception is ID 91bf9594ed6e409daf660a08ce063be5; use Cloudflare audit history for rollback without lowering overall security.
- Once verified, reconnect GSC, test live homepage/product/category/blog/Urdu sample URLs, re-submit https://sastamilaga.com/sitemap.xml and click Validate Fix. Google controls timing and index inclusion.
