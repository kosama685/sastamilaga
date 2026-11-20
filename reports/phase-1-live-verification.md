# Phase 1: repository and live verification (2026-11-20)

## Git state (observed with `git fetch` and `git log origin/main`)
| Item | Observed |
|---|---|
| `origin/main` head | `f257840` "test(seo): enforce expired qualified-sitemap fallback contract" |
| Branch `completion-2026-11-20` (tip `0edad7d`) merged into `main`? | **NO.** `git merge-base --is-ancestor 0edad7d origin/main` returns 1. Its five commits (6333310, bf4a726, 4104f7b, 9794997, 0edad7d) are not in `main`. |
| Branch `product-seo-dry-run` | Created from `origin/main`, tip `77b0f0a` (dry-run only; no production effect). |
| Worker preview / production version | **Not verified.** No Cloudflare access from this environment; the preview deploy is not observable from outside. Production responses do not carry a Worker version header. |

The brief states the completion branch is merged. It is not visible in `main`; whatever was merged elsewhere (another branch, repository, or an open pull request) has not reached `origin/main`. Status: **PENDING OWNER ACTION** (merge the pull request, or point me to where it was merged).

## Live pages
All 12 landing URLs return 200 with the expected canonical and one H1 (details in `reports/real-browser-verification.md`). The live hub still serves the old cards (text "prepaid checkout" present, no `sml-cty-link` class), consistent with the merge not having happened. GitHub Pages' own copy (`kosama685.github.io/sastamilaga/shipping-to/`) also still has the old cards, so the gap is the repository, not the Worker or cache.

## Which layer serves what (from response headers and HTML)
| Route | Layer |
|---|---|
| landing pages, hub, `/shipping/`, `/about/` | Worker in GitHub-static recovery mode (`x-sasta-recovery: github-readonly`, `x-sasta-checkout: disabled-during-origin-outage`) |
| `/faq/`, `/shop/`, product pages | Worker `edge/cj-storefront.mjs` (`X-Sasta-Renderer: cj-ssr-v1`) |
| `/cart/`, `/checkout/` | WordPress/WooCommerce (PHP, LiteSpeed, `private, no-store`) |

The static-pages recovery mode header suggests the Worker treats GitHub as the primary source for static content. Whether that is permanent or an outage leftover is **not known**.

## Not verified in this phase
Cloudflare cache rules, Worker deployment versions, the WooCommerce/CJ integration internals beyond what is visible through HTTP, and any production-vs-preview difference. Each needs Cloudflare or server access beyond what was used here.
