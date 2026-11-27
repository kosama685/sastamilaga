# Test results

**Date:** 2026-11-20. Exact commands and counts from this session. Skipped and failing items are listed, not hidden.

## Automated suites (Node test runner, local clone)
| Suite | Command | Tests | Pass | Fail |
|---|---|---|---|---|
| Landing pages (12 pages, 11 locales) | `node --test tools/build-landing-pages.test.mjs` | 86 | 86 | 0 |
| City-page gates | `node --test tools/build-city-pages.test.mjs` | 5 | 5 | 0 |
| Coverage reports | `node --test tools/build-global-coverage.test.mjs` | 8 | 8 | 0 |
| Chrome runtime (existing suite) | `node --test tools/build-chrome-runtime.test.mjs` | 2 | 1 | **1** |

**The one failure** is "existing local static product pages retain SEO-rendered HTML independently of shared chrome". It opens `p/1-pc-foldable-traveling-hanger-hhc-890653.html`, which is not in this sparse local clone (`ENOENT`). It fails the same way with the footer change stashed, so it is environmental, not caused by this work. It was not re-run in a full checkout, so its real status on `main` is unverified here.
`node tools/build-chrome-runtime.mjs --check` (the CI gate): **passed** (130,616 bytes).

## Live checks (read-only, against sastamilaga.com)
| Check | Result |
|---|---|
| `node tools/validate-landing-live.mjs` | 12 pages, 0 hreflang issues, 0 sitemap issues (reports/hreflang-validation.md, reports/sitemap-validation.md) |
| Live same-origin quote test, 8 pages (2026-11-19) | 8 of 8 loaded 36 CJ variants, sent the right country code and quantity, rendered rates, put the chosen rate in the WhatsApp message; 0 JS errors; the two Serbian "carrier name" assertions failed only because my test pattern omitted "DHL Official" |
| Footer link, real Chrome, desktop and mobile, 5 page types (2026-11-20) | 8 of 10 pass: home, blog guide, landing page and Pakistan page each show exactly one link in the same style as its sibling and clicking reaches `/shipping-to/` with HTTP 200. **2 of 10 fail: `/shipping/` on desktop and mobile has no link yet** (its committed HTML is a stale generated copy; fix pending authorization, see remaining-blockers.md) |
| CJ shipping survey, 246 countries | 246 requests, 0 failed; options returned for 239, none for 7 (AX, BL, PS, SJ, TM, UM, XK). Indicative quote for one sample item only |

## Not run or not possible
| Item | Reason |
|---|---|
| `tools/market-experience.test.mjs` (existing CI gate) | needs the `linkedom` module and the full repository; not run |
| `static.yml` gates end to end | local clone is sparse; relied on the GitHub Actions deploy, whose log was not readable (connector unavailable). Deploys were confirmed by live responses |
| 246 x 127 country/language route tests | no such routes exist; only the 12 live routes are tested |
| Language switching, RTL, Serbian scripts, order panel | tested earlier in real Chrome (14 order-panel cases and the live-estimate cases); not re-run today |
| Accessibility audit (axe/Lighthouse), Core Web Vitals | not run |
| Checkout and cart regression | no order was placed; cart and checkout files were not changed; the global virtual checkout and native WooCommerce checkout were not exercised |
| Translation pipeline tests, translation memory | no pipeline for the landing system exists (see remaining-blockers.md) |
| Rich Results Test, Search Console URL Inspection | no access |
