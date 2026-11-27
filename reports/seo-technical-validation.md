# SEO technical validation: landing pages

**Date:** 2026-11-19. **Scope:** the 12 generated pages (11 locale pages + the `/shipping-to/` hub), deployed on `main`; live status checked with read-only GETs. **Method:** `node --test tools/build-landing-pages.test.mjs` against the generated HTML (86 tests, 86 pass), plus a real Chrome run. Nothing here is validated against Google tools.

## Validated by tests (observed)

| Check | Result |
|---|---|
| Exactly one H1, one canonical, self-referencing, on every page | pass (12/12) |
| `<html lang>` equals the locale (en, en-GB, en-US, en-SA, de-DE, sr-Latn-RS, sr-Cyrl-RS, ar-SA, ur, en) and `dir` is rtl for ar and ur | pass |
| Title 20-80 chars, description 60-190 chars | pass |
| Robots: all 12 pages `index, follow, max-image-preview:large` (Pakistan EN/UR from the start; the five foreign markets, their variants and the hub from 2026-11-20 by owner override) | pass |
| hreflang: emitted only for indexable pages; Pakistan EN and UR list each other plus x-default; noindex pages are never listed in anyone's hreflang set | pass |
| `sitemap-landing.xml` lists exactly the 12 indexable pages, with reciprocal `xhtml:link` hreflang clusters and `x-default` for every multi-language market | pass |
| JSON-LD parses; `inLanguage` equals the page locale; WebPage, BreadcrumbList, FAQPage present | pass |
| No Offer, price, aggregateRating or Review markup anywhere | pass |
| FAQ answers in JSON-LD are visible in the page text | pass |
| Every internal `href` / `src` resolves to a file in the repository | pass |
| No transit-day claims, guarantees, ratings, rupee prices on foreign pages; cash on delivery mentioned only to refuse it | pass |
| Serbian Latin has no Cyrillic (outside the language switcher); Serbian Cyrillic has no leftover Latin UI text | pass |
| Build is idempotent | pass |

## Observed gaps

| Gap | Detail |
|---|---|
| Inbound links from the rest of the site | Added on 2026-11-19 from the shopping guide post and the English and Urdu shipping pages (see QA report). Not added to the footer or home page (protected chrome file). Only 2 existing pages link in, so authority flow is small. |
| Localized pages receive few internal links even inside the system | German and Arabic variants: 1 link in from other landing pages (the language switcher). Serbian variants: 2. English market pages: 10. |
| Sitemap reference | `sitemap-landing.xml` is now listed once in `sitemap.xml` (added 2026-11-19); it lists only the 2 indexable Pakistan pages. Not yet submitted to Search Console. |
| `/ur/` home has no file in this repository | The Urdu breadcrumb links to the live URL, served by a Cloudflare route. Its canonical status was reported "not verified" by the repository's own audit. |
| Google tools | Not run: Rich Results Test, Search Console URL Inspection, Merchant Center. No Search Console access. |
| Redirects | None needed (no existing URL changed). Redirect-chain test not applicable. |
| Crawl / live status | Live status checked 2026-11-19: 12 of 12 pages and `sitemap-landing.xml` return 200 with the expected canonical and robots tags; `sitemap.xml` lists the landing sitemap. Not tested: Googlebot rendering, robots.txt crawl simulation, Search Console. |

## Not validated here

Core Web Vitals (lab or field), index coverage, real-user metrics, rankings.

## Risk register: indexing by owner override (2026-11-20)
The five foreign markets (Germany, UK, USA, Serbia, Saudi Arabia), their language variants and the hub were made indexable at the site owner's instruction, although the repository's own audit (	ools/audit-market-locale-readiness.mjs) records no qualified market and no verified shipping, checkout, tax or returns evidence exists. Known risks, not mitigated by code: (1) German, Serbian (Latin, Cyrillic) and Arabic copy was drafted by the assistant and has not been reviewed by a native speaker; (2) pages for countries without verified fulfilment can be judged thin or doorway-like by search engines, which can affect the rest of the domain; (3) the audit workflows on main may keep reporting these markets as unqualified. Withdraw any market by setting indexable to false in data/landing/markets.json and rebuilding.
