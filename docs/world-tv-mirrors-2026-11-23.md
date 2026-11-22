# World TV mirrors and programme discovery — 23 November 2026

The player now exposes every supplied source as an accessible mirror tab, including its original URL, format, observed status, supplied quality and source-directory label. Tabs support arrow keys, Home and End. The dropdown, automatic failover and tabs stay synchronized. Copying a URL or opening an external player requires an explicit visitor action.

Channel programme guides retain now/next and add a full schedule with title/description search, device-timezone dates and incremental display of all supplied listings. Search excludes invalid or reversed timestamps. Listings describe broadcast schedules, not on-demand episodes. Missing schedules remain missing; titles, ratings, keyword volumes and show availability are never invented.

Country and category directories now paginate their complete matching records instead of showing only 24 highlights. A-Z, country and category cards provide channel-specific viewing/schedule links and alternate names. Their structured lists contain actual BroadcastService entities. The new `/live-tv/programmes/` page connects genuine schedule discovery with country, channel and category browsing. Search descriptions use the supplied channel names, countries, languages and categories rather than repeated keyword lists.

## Research and refresh results

Existing sources include [IPTV-org](https://github.com/iptv-org/iptv), [Free-TV](https://github.com/Free-TV/IPTV), supplemental metadata APIs and regional feeds. IPTV-org documents that its public playlists select preferred variants; our retained stream inventory and metadata reconciliation preserve distinct alternatives as well. [Its playlist documentation](https://github.com/iptv-org/iptv/blob/master/docs/playlists.md) explains this distinction.

Added the [FreeCastHub public playlist](https://github.com/freecasthub/public-iptv) to recurring refresh. Its maintainers describe it as a collection of public broadcaster streams; that statement is provenance, not independent proof of rights or local playback. The [cctvai/freeview resource](https://github.com/cctvai/iptv) was researched, but its advertised Malaysia playlist returned 404 during inspection and was not added as a working feed.

Observed release totals:

- 39,850 channel records; 250 country/territory entries.
- 35,189 source associations, covering 27,579 unique URLs.
- All previous source URLs retained; channel count grew from 39,844.
- 445 playlist feeds attempted: 444 responded successfully, one unavailable.
- 1,298 newly discovered URLs probed. All 27,579 URLs have dated observations, including earlier retained checks; older URLs were not all rechecked in this run.
- 935 indexed discovery pages, up from 531.
- Regional channel-status observations: 120 endpoint-observed OK, 14,666 dead, 4,564 needing another player/access conditions, and 20,500 with no public source supplied. A source passing a manifest/segment probe is not proof of uninterrupted browser playback.

## Validation

44 Node regression checks passed. The browser suite passed across the complete catalogue and country filters, last virtualized row, mobile layout, persisted preferences, explicit external app links, second/third-mirror recovery, exhausted-source fallback, IP-country selection and manual override. Added browser assertions check the mirror tabs, selected source URL, 50-listing schedule pagination and genuine programme-title search using deterministic fixtures.

Coverage checks linked all 39,850 records, retained 10,620 archived WordPress sources, validated the generated page schemas/canonicals and found zero missing prior stream URLs. Playback fixtures demonstrate application behavior; they are not claims that every upstream broadcast works. Existing adult-directory quarantine remains in place.

The release does not relay third-party media, circumvent regional restrictions, remove DRM or spoof access credentials. The existing restricted owned-stream proxy example and playback recovery guide remain available for sources the operator controls.
