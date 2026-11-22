# World TV: implementation, coverage and verification

This release upgrades the existing static Sasta Milaga Live TV service. It uses the site's shared header, navigation, fonts and footer, with a dedicated midnight-blue broadcast surface and emerald accents. Both `/live-tv/` and `#/live-tv` mount the same player and directory. The checkout comparison draft is separate and is not part of this deployment.

## What visitors can do

- Search the complete directory by channel, country name/code, category and language.
- Browse All channels, Countries, Categories, Favourites and Recent. No paging cap hides later channels. The windowed list renders approximately 20–35 rows and can reach the last of more than 17,000 entries.
- Choose a source and player before or after a playback problem. A checked HTTP source remains available to installed players; browser playback only attempts HTTPS alternatives.
- Use HLS.js with two network recoveries and one media recovery, native HLS where supported, locally bundled DASH.js, direct video, or allowlisted broadcaster frames. A failed source advances to the next browser candidate. Each attempt has a 25-second no-start deadline. Autoplay restrictions prompt for a click instead of claiming failure.
- For YouTube, the official iframe API observes playback/error events; embedding errors advance to the next source. Twitch receives the actual page hostname as its required parent. Frames that cannot expose playback events are explicitly labelled unverified.
- Open VLC, MX Player/Pro or IINA; download a single-channel playlist for Kodi/IPTV apps; copy the selected stream or the full playlist URL. Apps never launch automatically. Availability depends on the installed app and broadcaster access.
- Save favourites and recent viewing locally, remember player/source preferences, retry, choose HLS quality, go to the live edge, use picture-in-picture/fullscreen, and share channel links. Canonical channel IDs take precedence over legacy alias collisions.

## Data coverage

The release snapshot contains **17,463 channel records**, **191 countries**, **23,738 source entries**, and **19,191 distinct stream URLs**. The builder fetched **444 playlist URLs**, including the iptv-org global/country/category/language registry, Free-TV, all six specified epg.pw packs, and the regional lists. **443 responded successfully**. The supplied fanmingming `v6.m3u` path returned 404; it remains in the failure inventory and the provider's documented `ipv6.m3u` replacement was fetched successfully.

The first merge contained 27,420 records. Resolving missing country metadata against an unambiguous exact named stream removed genuine duplicate records, preserving their mirrors and legacy ID aliases. This is why the final channel count is smaller; it is not a playback-based removal. All **10,620 archived WordPress stream entries** remain represented. Coverage assertions run before deployment. A separate comparison against the prior deployed snapshot retained all 11,955 distinct URLs from its 11,973 records, including the six original embed addresses alongside their broadcaster page links.

Sources are never removed because a probe fails. Full provenance and upstream failures are recorded in `data/livetv/build-report.json`. Source URLs retain signed query strings. IDs are deterministic rather than row-number dependent. The public `data/livetv/playlist.m3u` includes every retained mirror.

## Availability: what was actually verified

The complete distinct-URL inventory was audited from this execution region, with 19,191 URLs classified and zero unchecked URLs remaining. HLS observations inspect the manifest, a variant where needed, and the first media segment; encryption-key reachability and CORS are checked. Unsupported/non-public protocols and browser-restricted sources are classified as needing another player. A DASH manifest response is not represented as proof that video decoded.

At the recorded audit, 57 channel records had a source passing the browser-origin endpoint probe, 4,059 required player options, and 13,347 were not reachable within the probe limits. **These observations do not mean that every other channel is permanently offline or playable elsewhere.** Network region, CORS, codec support, IPv6 access and upstream outages affect results. Browser fallbacks cannot revive a dead broadcaster or bypass geographic restrictions. The UI preserves and labels these records.

Separate real Chrome playback checks decoded France 24 English at **1920×1080** and a DASH reference sample at **768×432**, with advancing playback and no script errors. The DASH sample is test-only and was not inserted into the channel catalogue. Deterministic browser fixtures also verify a working second mirror, YouTube error-to-HLS fallback and the all-sources-failed external-player panel.

## Automated verification

All 23 catalogue, probe and player contract tests pass.

```sh
node --test tools/build-livetv.test.mjs tools/check-livetv.test.mjs tools/live-tv-hub.test.mjs
node tools/verify-livetv-coverage.mjs
node tools/check-github-actions-runtime.mjs
```

The browser suite in `tools/livetv-browser.e2e.cjs` checks the last virtual row, country filtering, all country groups, favourites, recent channels, saved source/player choices, mobile overflow, explicit external-app links, source failure, playback events and both URL surfaces. Start `node tools/serve-pages-like.mjs . 8798`, provide `puppeteer-core` through `SM_PUPPETEER_MODULE`, and set `CHROME` if needed. Screenshots go to the OS temp directory or `SM_QA_OUTPUT`.

## Daily maintenance

`.github/workflows/livetv-refresh.yml` runs daily at 03:30 UTC (06:30 Riyadh). It rebuilds the full source inventory, observes every distinct URL, verifies retained coverage, commits only channel data and dispatches the central Pages deployment. It does not create a second competing Pages deployment. Source failures preserve prior records and appear in the report. Maintenance remains a static build; no streaming proxy or server runtime was added.

## Visual asset and bundled libraries

The custom project image is `assets/images/livetv/broadcast-studio.png`, generated with the built-in imagegen tool. It is an illustrative studio photograph, not a photograph of Sasta Milaga premises. Channel logos come from their upstream directory records and fall back to a monogram when unavailable.

Final image prompt:

> Create a premium editorial photograph for a global free-to-air television streaming website hero. Ultra-wide cinematic composition, a sophisticated modern broadcast control room at evening, wall of softly glowing monitors showing abstract world news, natural landscapes, sport field and music stage (no readable text, no station logos), foreground elegant dark control console, deep midnight navy atmosphere with restrained emerald and warm amber practical lights. Real photographic materials, realistic camera and shallow depth of field, subtle light bloom, high-end corporate broadcast photography. No people, no typography, no UI mockup. Main visual concentrated toward center-right, left third dark and quiet for white HTML headline overlay. Landscape 16:9, crisp professional photo, not an illustration.

HLS.js 1.5.17 and DASH.js 4.7.4 are pinned and self-hosted under `assets/vendor/`, with their licence notices, so media-engine startup does not depend on a third-party CDN. Broadcaster streams and YouTube/Twitch services remain upstream dependencies.
