# QA and release report

**Date:** 2026-11-19. **Branch:** `landing-pages`. **Base:** `main`. Production was **not** deployed.

## Commands run and results

| Command | Result |
|---|---|
| `node tools/build-landing-pages.mjs` | 12 pages written; `indexable: ["pakistan","ur/pakistan"]` |
| `node --test tools/build-landing-pages.test.mjs` | tests 75, pass 75, fail 0, skipped 0 |
| `node --check` on the four new tool files | ok |
| `node tools/build-locale-registry.mjs` | 246 countries, 127 overlay languages, 11 landing locales (2 indexable, 0 human-reviewed) |
| Real Chrome run (puppeteer-core 23, system Chrome, localhost) | 14 cases, 14 pass (see below) |
| `git diff origin/main` on chrome.js, build-chrome-runtime*, audit tools, woo-bridge.js | 0 files changed |

### Real-browser cases (390px mobile unless noted)
Pakistan EN, Pakistan UR (rtl), Germany EN (1280px), Germany DE (390 and 1280), UK, USA, Serbia EN, Serbia Latin, Serbia Cyrillic, Saudi EN, Saudi AR (390 and 1280, rtl), hub. For each: no horizontal overflow, 0 JavaScript errors, one H1, white hero heading, correct `dir`. Order panel (11 pages): button locked at start; stays locked until both confirmations are ticked; unlocks; opens exactly one `https://wa.me/966510451995?text=...` URL with the expected country, quantity, city and "prepaid" in the page language; re-locks when a confirmation is unticked.

## Defects found by the browser pass (fixed before release)
1. Hero heading was dark green on dark green (site stylesheet overrode the colour). Fixed with higher specificity.
2. A form field named `item` collided with `form.elements.item()`, so the button could never unlock. Renamed `product`.
3. Test-design issues (not product defects): the "no Cyrillic" check ignored the legitimate Cyrillic script name in the Serbian Latin language switcher; fixed in the test.

## Skipped, blocked or not run
| Item | Reason |
|---|---|
| Pull request | GitHub connector returned 403 for PR creation; `gh` not installed. Branch is pushed; the PR must be opened by the owner |
| Existing `static.yml` gates after merge | local clone is sparse (missing `track/`, `travel/`, `live-tv/`); `validate-ai-site-index.mjs` and the chrome runtime check failed there for that reason only |
| Preview / staging deploy | none configured that I could use safely; nothing deployed |
| Accessibility audit (contrast, screen reader) | keyboard focus styles and aria labels exist, but no axe/Lighthouse run |
| Core Web Vitals | not measured |
| Rich Results, Search Console, Merchant Center | no access |
| Native-speaker review (ur, de, sr, ar) | not available |
| Live CJ shipping quote in the order panel | needs the CJ freight Worker; the panel hands the quote to WhatsApp instead |
| Analytics events | no analytics wiring was found that I could reuse without touching protected files; none added |

## Completion dashboard (each with its denominator)
| Measure | Value | Calculation |
|---|---|---|
| Initial locale pages built | 11 of 11 | the 11 locales in the brief's matrix (en-PK, ur-PK, de-DE, en-GB, en-US, sr-Latn-RS, sr-Cyrl-RS, ar-SA, en-SA) plus English variants for DE and RS |
| Locale copy human-reviewed | 0 of 11 | no reviewer available |
| Markets configured for commerce (verified shipping, payment, tax, returns) | 0 of 6 | evidence gate not passed; Pakistan config matches `config.js` but checkout not tested here |
| Automated tests | 75 of 75 pass | |
| Real-browser cases | 14 of 14 pass | |
| Pages indexable and listed in the sitemap | 2 of 12 | by design |
| Sitemap / index submission | 0 of 2 | nothing deployed; no Search Console access |
| Countries with a landing page | 6 of 246 | market picker count |
| Languages with dedicated URLs | 4 (en, ur, de, sr, ar = 5 incl. both Serbian scripts as one language) of 127 overlay languages | |
