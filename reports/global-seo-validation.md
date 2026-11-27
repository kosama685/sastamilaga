# Global SEO validation

**Date:** 2026-11-20. Scope: the 12 deployed landing pages and the registries. Nothing here is a Google measurement.

## Technical (validated, live)
- 12 pages: HTTP 200, self canonical, expected robots, `html lang` equals the locale, one H1, JSON-LD parses, no duplicate titles or descriptions (reports/hreflang-validation.md; 0 issues).
- Hreflang is reciprocal, self-referencing, with one `x-default`; `sitemap-landing.xml` carries the same sets (reports/sitemap-validation.md).
- Internal links: the pages are linked from the shopping guide, the English and Urdu shipping pages and, after 2026-11-20, from the shared footer (home, blog, product and category chrome, landing pages).

## Semantic, AEO, GEO, SXO
- Answer-first intros and visible FAQs with matching FAQPage markup on every page; WebPage and BreadcrumbList markup; no Offer, rating or review markup.
- **No keyword research evidence exists.** reports/keyword-and-internal-link-map.csv records search volume and difficulty as "not measured". No Search Console, Keyword Planner or dataset was available. Do not treat any keyword as validated.
- GEO: business identity in the pages is limited to the site name, WhatsApp number and published policies; no addresses or offices were invented.
- SXO: mobile layouts, RTL, keyboard focus and a working order panel were tested; Core Web Vitals and accessibility audits (axe/Lighthouse) were not run.

## Risks (see also reports/seo-technical-validation.md)
Foreign-market pages are indexed by owner override without per-country evidence or native review of non-English copy; the footer link now gives all 12 pages a sitewide inbound link, which raises the exposure if search engines judge them thin.
