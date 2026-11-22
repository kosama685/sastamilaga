# World TV: complete discovery and public delivery

Live entrypoint: https://sastamilaga.com/live-tv/

This extends the [player release](world-tv-release-2026-11-22.md). The corporate navy/emerald interface, custom studio photograph, site navigation and both existing checkout options remain available. Channel logos and programme artwork use supplied upstream images with graceful missing-image handling. The generated studio image is illustrative; its exact prompt and provenance are in the player release guide.

## Published inventory and accounting

| Measure | Release snapshot |
|---|---:|
| Retained directory records with unique canonical IDs | 39,844 |
| Records with at least one source | 19,313 |
| Records without a supplied public stream | 20,531 |
| Source entries, including mirrors and repeated cross-channel URLs | 33,386 |
| Distinct stream URLs | 26,281 |
| Countries and territories in upstream metadata | 250 |
| Region groups | 42 |
| Languages represented in channel metadata | 301 |
| Populated category guides | 29 |
| Crawlable indexed directory/guide pages | 531 |

These are directory records, not a claim that 39,844 distinct television stations are broadcasting now. Legacy records, regional names and unassigned streams are conservatively retained rather than aggressively merged. Primary IDs take precedence during JSON reconciliation; original IDs, feed identifiers, aliases, signed URLs and source provenance are preserved.

The import accounts for all 31,850 metadata IDs: 374 adult channel metadata records are listed in quarantine because this general directory has no age-controlled viewing surface. The two stream APIs supplied 35,533 rows: 35,527 were retained or reconciled with an existing URL, and six rows were recorded with exclusion reasons (three adult-associated rows and three unsupported/missing URLs). There are zero unaccounted eligible metadata IDs. Failed stream probes do not remove records. All 10,620 archived WordPress stream entries and the earlier snapshot's 11,955 distinct URLs remain represented.

The playlist pipeline attempted 444 feeds; 443 succeeded. The original fanmingming `v6.m3u` URL remains in the failed-source report, alongside its successful documented `ipv6.m3u` replacement. The additional 17 metadata/supplemental endpoints all responded during this import. The [source registry](../data/livetv/source-registry.json), [reconciliation report](../data/livetv/reconciliation-report.json), [build report](../data/livetv/build-report.json), [discovery report](../data/livetv/discovery-report.json) and [all-mirror playlist](../data/livetv/playlist.m3u) provide the detailed inventory.

## Playback and availability

Browser playback uses self-hosted HLS.js/DASH.js, native HLS where supported, direct video and allowlisted embeds. The player tries alternate HTTPS sources after bounded retries; installed players never launch automatically. Source selection, Next source, Previous channel, favourites, recent viewing, quality, live edge, fullscreen, picture-in-picture, sharing, broadcaster websites, issue reporting and single/full M3U exports remain available where applicable.

All 26,281 distinct URLs received dated regional observations. The release audit classified 95 channel records with a source passing the browser-origin endpoint probe, 14,652 not reached within the probe limits, 4,566 requiring player options, and 20,531 with no supplied stream. Zero URLs remain unchecked. These are endpoint observations, not proof of worldwide playback or permanent offline status. Browser decode tests are separate: France 24 HLS decoded at 1920×1080 and a test-only DASH sample decoded at 768×432. Deterministic browser tests exercise successful second and third mirrors and an all-failed recovery panel.

Provider referrer/user-agent requirements, quality, feed IDs and upstream health are retained separately. JavaScript cannot freely override browser-controlled headers, and the service does not bypass DRM, subscription access or geographic restrictions. A missing or inaccessible stream remains clearly labeled. Rights-holder concerns link to the existing contact channel.

## Countries, languages, programmes and location

All 250 country/territory entries remain visible, including zero-channel entries. `UK` is normalized to `GB` for filtering while preserving the original upstream code. Regions, languages, categories, observed-reachable and alternative-player views use supplied metadata rather than a hand-picked country list.

JavaScript reads the country code from Cloudflare's same-origin `/cdn-cgi/trace`. It does not persist the IP address or request precise device location. An explicit country/channel/search URL and a saved manual choice take precedence. Visitors can change Country or reset to the full world directory. Failed detection leaves the directory usable.

Selecting a matched channel requests its supplied programme guide from IPTV Nexus. Current and next titles, descriptions, artwork and local device times are shown only when provided. Guides are cached for 15 minutes and refreshed while the page is visible. Missing guides show a clear empty state. Programme requests do not delay starting the player. BBC News returned real programme data during verification; other tested channel guide URLs returned 404 and were handled as missing. No fictional show schedules are generated.

## SEO, AEO, geographic discovery and viewing experience

- The [complete A–Z index](https://sastamilaga.com/live-tv/directory/) contains a normal HTML watch link for every retained record, with accessible pagination.
- All [country/territory entries](https://sastamilaga.com/live-tv/countries/) have a guide. Country/category guides contain factual highlights and link to their complete player filters; the complete channel index remains available for every record. Empty country guides remain visible and use `noindex,follow`.
- Populated category guides, language and region indexes provide meaningful links using actual names and classifications. Country/channel names, live TV, public broadcasts, player options and programme-guide wording are used naturally. No search-volume figures or ranking promises are invented.
- Server-rendered titles, descriptions, canonical URLs, Open Graph imagery, CollectionPage/ItemList and breadcrumb data, visible answers, a dedicated sitemap and `/live-tv/llms.txt` support machine-readable discovery.
- Canonicalization avoids indexing thousands of duplicate filter URLs or manufacturing thin individual station pages. The JSON-LD hook in the two actual entrypoints has a valid server-rendered fallback.
- Virtualized browsing retains the final record while rendering only the visible window. Empty searches, unavailable channels, programme gaps and source failures remain actionable. Manual country preferences, keyboard navigation, mobile wrapping and source/player persistence are covered by browser checks.

The existing shared header, commerce flows and service links are preserved. Internal `backup/` source files remain in Git and are excluded from the Pages artifact to leave hosting capacity for the expanded public directory; public channel data and customer-facing assets remain included.

## Delivery and maintenance

The old dedicated Live TV Worker injected the retired WordPress bootstrap and could serve stale assets despite a successful Pages deployment. The replacement serves only committed static TV pages and explicitly listed dependencies from a validated Git revision. It never relays television streams. Exact route ownership is checked before deployment; checkout/payment, DNS and unrelated service routes are untouched. Successful central Pages deployments refresh the static-delivery revision automatically.

`livetv-refresh.yml` synchronizes sources at 00:30, 06:30, 12:30 and 18:30 UTC (03:30, 09:30, 15:30 and 21:30 Riyadh). The 00:30 run performs the daily full audit; the others audit newly observed URLs. Manual dispatch performs a full audit. Timings are scheduled targets; GitHub may delay scheduled jobs. Builds preserve prior channels when an upstream fails, generate reports and discovery pages, verify coverage and dispatch the central Pages deployment.

To add a legitimate source, add a metadata endpoint to `registry` in `tools/enrich-livetv.mjs`, or a playlist to `tools/build-livetv.mjs`, preserve its provenance, run reconciliation and inspect any quarantine/failure records. Do not mark a stream playing from a playlist response alone.

```sh
node tools/build-livetv.mjs
node tools/enrich-livetv.mjs
node tools/check-livetv.mjs
node tools/build-livetv-discovery.mjs
node tools/verify-livetv-coverage.mjs
node tools/verify-livetv-discovery.mjs
node --test tools/build-livetv.test.mjs tools/check-livetv.test.mjs tools/live-tv-hub.test.mjs tools/livetv-discovery.test.mjs tools/livetv-edge.test.mjs
```

The browser suite additionally checks every country filter, full-list reachability, saved favourites/source/player settings, second/third-source recovery, YouTube failure recovery, external choices, IP country detection, manual override, mobile overflow and both actual URL surfaces. Deployment success and public browser playback are verified separately from unit-test success. See [the changed-file inventory](world-tv-discovery-files-2026-11-22.txt) for source and generated outputs.
