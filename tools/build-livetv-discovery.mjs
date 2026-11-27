// Crawlable factual directory pages. No invented shows, search volumes or playback claims.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  site = "https://sastamilaga.com";
const context = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(root, "data/livetv/channels.js"), "utf8"),
  context,
);
const db = context.window.SM_LIVETV;
const meta = JSON.parse(
  fs.readFileSync(path.join(root, "data/livetv/metadata.json"), "utf8"),
);
export const slug = (s) =>
  String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const links = [],
  coverage = new Set();
function page(url, title, description, body, items = [], index = true) {
  const full = site + url;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": full + "#page",
        url: full,
        name: title,
        description,
        isPartOf: { "@id": site + "/live-tv/#webpage" },
        mainEntity: { "@id": full + "#list" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: site + "/" },
          {
            "@type": "ListItem",
            position: 2,
            name: "World TV",
            item: site + "/live-tv/",
          },
          { "@type": "ListItem", position: 3, name: title, item: full },
        ],
      },
      {
        "@type": "ItemList",
        "@id": full + "#list",
        numberOfItems: items.length,
        itemListElement: items.map((channel, i) => ({
          "@type": "ListItem", position: i + 1,
          item: {"@type": "BroadcastService", name: channel.name,
            alternateName: channel.alternateNames || [],
            url: site + "/live-tv/?channel=" + encodeURIComponent(channel.id),
            broadcastDisplayName: channel.name,
            ...(channel.languages?.length ? {inLanguage: channel.languages} : {}),
            ...(channel.country ? {areaServed: {"@type":"Country", identifier:channel.country}} : {})}
        })),
      },
    ],
  };
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | Sasta Milaga</title><meta name="description" content="${esc(description)}"><meta name="robots" content="${index ? "index,follow" : "noindex,follow"}"><link rel="canonical" href="${full}"><link rel="stylesheet" href="/assets/theme/static-bundle.css"><link rel="stylesheet" href="/assets/theme/live-tv-discovery.css"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${full}"><meta property="og:image" content="${site}/assets/images/livetv/broadcast-studio.png"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script></head><body class="sm-static tv-discovery"><div id="sm-chrome-header" data-prefix="/"><header class="sm-fallback-head"><a href="/"><img src="/assets/brand/logo-46.png" width="171" height="46" alt="Sasta Milaga"></a></header></div><main id="main" class="tv-directory"><nav class="tv-directory-nav" aria-label="World TV directory"><a href="/live-tv/">Watch live TV</a><a href="/live-tv/countries/">Countries</a><a href="/live-tv/directory/">All channels</a><a href="/travel/">Travel services</a><a href="/shop/">Shop</a></nav><section class="tv-hero"><p>WORLD TV / BROADCAST DIRECTORY</p><h1>${esc(title)}</h1><p>${esc(description)}</p><a class="tv-button" href="/live-tv/">Open the streaming player</a></section>${body}<section class="tv-help"><h2>How to watch and find programme listings</h2><p>Select a channel to open its browser player. Choose a source or let automatic failover try the next available mirror. If a browser cannot play the feed, use its supplied broadcaster link or choose an installed player such as VLC or MX Player.</p><h3>Are all channels live and available everywhere?</h3><p>No. Directory inclusion and a reachable playlist do not guarantee playback. Broadcasters control regional access, codecs and availability. Records without a public stream stay visible so coverage remains transparent.</p><h3>Where can I find TV shows and today's schedule?</h3><p>The player checks the channel's supplied programme guide and shows current and next programmes in your device timezone where listings exist. Missing guides are labeled; programme titles and schedules are never invented.</p><p>Explore <a href="/live-tv/categories/">news, sports, movies, music, kids and other TV categories</a>, <a href="/live-tv/languages/">language filters</a> or <a href="/live-tv/regions/">world regions</a>.</p></section><section class="tv-directory-note" aria-label="Directory information"><p>Sasta Milaga is a directory linking to public broadcasts. Television content is delivered by its upstream providers.</p><a href="/contact/">Support and rights-holder removal requests</a> · <a href="/live-tv/playlist.m3u">Complete M3U playlist</a><p>Directory snapshot: ${esc(new Date(db.snapshot).toISOString())}</p></section></main><div id="sm-chrome-footer"></div><script src="/assets/js/chrome.js" defer></script></body></html>`;
  const file = path.join(root, url, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (index) links.push(url);
}
const state = (c) =>
  !c.sources.length
    ? "No public stream supplied"
    : c.status === "ok"
      ? "Endpoint observed reachable"
      : c.status === "dead"
        ? "Not reached at last check"
        : "Playback / player options";
function listings(
  base,
  title,
  description,
  rows,
  watch = "",
  overview = false,
) {
  const per = overview ? 24 : 150,
    pages = overview ? 1 : Math.max(1, Math.ceil(rows.length / per));
  for (let p = 0; p < pages; p++) {
    const subset = rows.slice(p * per, (p + 1) * per);
    const url = p ? base + "page/" + (p + 1) + "/" : base;
    const pager = `<nav class="tv-pages" aria-label="Directory pagination">${p ? `<a href="${p === 1 ? base : base + "page/" + p + "/"}">Previous</a>` : ""}<span>Page ${p + 1} of ${pages}</span>${p < pages - 1 ? `<a href="${base}page/${p + 2}/">Next</a>` : ""}</nav>`;
    const cards = subset
      .map((c) => {
        coverage.add(c.id);
        return `<li><a class="tv-channel" href="/live-tv/?channel=${encodeURIComponent(c.id)}"><strong>${esc(c.name)}</strong><span>${esc(c.languageDisplay || c.language || c.country || "International")} · ${c.sources.length} source${c.sources.length === 1 ? "" : "s"}</span></a><small>${esc(state(c))}</small>${c.alternateNames?.length ? `<p>Also known as ${esc(c.alternateNames.join(", "))}</p>` : ""}<details><summary>Channel sources and programme guide</summary><p>${esc(c.name)} live broadcast, available mirrors and supplied TV schedule. ${esc(c.sources.length ? "Open the player to compare every supplied source URL and search the channel programme guide." : "No public source has been supplied; broadcaster availability may change.")}</p><a href="/live-tv/?channel=${encodeURIComponent(c.id)}">Watch ${esc(c.name)} and view its TV schedule</a></details></li>`;
      })
      .join("");
    page(
      url,
      title + (p ? " — page " + (p + 1) : ""),
      description,
      `<section class="tv-section"><h2>${rows.length.toLocaleString()} channel records</h2>${watch ? `<a class="tv-button" href="/live-tv/?${watch}">Browse these channels in the player</a>` : ""}${rows.length ? (overview ? "<p>Highlights from this directory. Use the complete player filter above or the A-Z index for every matching record.</p>" : pager) + '<ul class="tv-channels">' + cards + "</ul>" + pager : "<p>No verified public channels currently available. This country remains in the directory; check again after the next source update.</p>"}</section>`,
      subset,
      !!rows.length,
    );
  }
}
listings(
  "/live-tv/directory/",
  "All TV channels: complete A–Z directory",
  "Browse every retained channel by name, including international broadcasts, alternate streams and records without a current public source.",
  db.items,
);
const countryLinks = [];
for (const c of meta.countries) {
  const rows = db.items.filter((x) => (x.country || x.cc) === c.code);
  const url = "/live-tv/country/" + slug(c.name) + "/";
  countryLinks.push(
    `<li><a href="${url}"><strong>${esc(c.flag || c.code)} ${esc(c.name)}</strong><span>${rows.length.toLocaleString()} channel records</span></a></li>`,
  );
  listings(
    url,
    c.name + " live TV channels and programme guide",
    `Explore ${c.name} television channels, public live-stream sources, available programme listings and player alternatives. Availability depends on the broadcaster.`,
    rows,
    "country=" + c.code,
    false,
  );
}
page(
  "/live-tv/countries/",
  "Live TV by country and territory",
  "Explore all " +
    meta.countries.length +
    " country and territory entries. Every entry remains visible, including countries without a supplied public stream.",
  '<section class="tv-section"><h2>Countries and territories</h2><ul class="tv-grid">' +
    countryLinks.join("") +
    "</ul></section>",
);
const cats = [];
for (const cat of meta.categories.filter((c) => c.id !== "xxx")) {
  const rows = db.items.filter(
    (c) =>
      c.categories?.includes(cat.id) ||
      String(c.group || c.cat).toLowerCase() === cat.id,
  );
  if (!rows.length) continue;
  const url = "/live-tv/category/" + cat.id + "/";
  cats.push(
    `<li><a href="${url}"><strong>${esc(cat.name)}</strong><span>${rows.length} channel records</span></a></li>`,
  );
  listings(
    url,
    cat.name + " TV channels: live streams and viewing guide",
    `Browse ${cat.name.toLowerCase()} television channels. ${cat.description || ""} Compare available sources and find supplied programme listings.`,
    rows,
    "category=" + cat.id,
    false,
  );
}
page(
  "/live-tv/categories/",
  "Browse TV channels by category",
  "Find news, sports, entertainment, movies, music, kids, documentary, religious, culture and lifestyle television from the actual channel metadata.",
  '<section class="tv-section"><h2>Television categories</h2><ul class="tv-grid">' +
    cats.join("") +
    "</ul></section>",
);
for (const [type, rows, param, key] of [
  ["languages", meta.languages, "language", "code"],
  ["regions", meta.regions, "region", "code"],
])
  page(
    "/live-tv/" + type + "/",
    "Live TV by " + type,
    "Explore the channel directory using its supplied " +
      type +
      " metadata. Each link opens the matching filter without hiding other retained channels.",
    '<section class="tv-section"><h2>Choose ' +
      type +
      '</h2><ul class="tv-grid">' +
      rows
        .map(
          (r) =>
            `<li><a href="/live-tv/?${param}=${encodeURIComponent(r[key])}"><strong>${esc(r.name)}</strong><span>Open matching channels</span></a></li>`,
        )
        .join("") +
      "</ul></section>",
  );
page("/live-tv/programmes/", "TV shows and programme guides by channel and country",
  "Find supplied TV schedules, current and upcoming programmes, and channel-specific show searches. Browse television by country, channel, language and category.",
  '<section class="tv-section"><h2>Find a programme on your channel</h2><p>Open any channel in the player, expand its full TV schedule, and search genuine upstream programme titles and descriptions. Times are shown in your device timezone. A listing describes a broadcast schedule; it is not an on-demand replay.</p><ul class="tv-grid"><li><a href="/live-tv/countries/">Browse TV schedules by country</a></li><li><a href="/live-tv/directory/">Find a channel A-Z</a></li><li><a href="/live-tv/categories/">News, sport, films, series, documentary and other supplied categories</a></li></ul><h2>Why is a TV show missing?</h2><p>Some broadcasters do not supply programme data. Missing schedules are labeled in the player. We do not invent TV show titles, broadcast times, episode availability or search-volume claims.</p></section>');
fs.writeFileSync(
  path.join(root, "sitemap-livetv.xml"),
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    links
      .map(
        (u) =>
          "<url><loc>" +
          site +
          u +
          "</loc><lastmod>" +
          db.snapshot.slice(0, 10) +
          "</lastmod></url>",
      )
      .join("") +
    "</urlset>",
);
const sitemap = path.join(root, "sitemap.xml");
let xml = fs.readFileSync(sitemap, "utf8");
if (!xml.includes("/sitemap-livetv.xml"))
  fs.writeFileSync(
    sitemap,
    xml.replace(
      "</sitemapindex>",
      "<sitemap><loc>" +
        site +
        "/sitemap-livetv.xml</loc></sitemap>\n</sitemapindex>",
    ),
  );
fs.writeFileSync(
  path.join(root, "data/livetv/discovery-report.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      channels: db.items.length,
      linkedChannels: coverage.size,
      countries: meta.countries.length,
      indexedPages: links.length,
      categoryPages: cats.length,
      languages: meta.languages.length,
      regions: meta.regions.length,
    },
    null,
    2,
  ),
);
if (coverage.size !== db.items.length) throw Error("Unlinked channel records");
console.log(
  JSON.stringify({
    channels: coverage.size,
    countries: meta.countries.length,
    indexedPages: links.length,
  }),
);

const intro =
  '<!-- TV-DISCOVERY-START --><section id="tv-discovery-index" style="max-width:1260px;margin:30px auto;padding:24px"><h2>Worldwide live TV and channel guides</h2><p>Browse the complete channel index, country and territory directories, news, sports, entertainment and supplied TV programme listings. Public stream availability varies by broadcaster and location.</p><nav aria-label="TV discovery"><a href="/live-tv/directory/">Every channel A-Z</a> &middot; <a href="/live-tv/countries/">All countries and territories</a> &middot; <a href="/live-tv/categories/">TV categories</a> &middot; <a href="/live-tv/programmes/">TV shows &amp; schedules</a> &middot; <a href="/live-tv/languages/">Languages</a> &middot; <a href="/live-tv/regions/">World regions</a></nav><p>Automatic source switching tries alternate browser-compatible streams. VLC, MX Player and playlist downloads are available where a source is supplied. Programme listings appear only when upstream guide data exists.</p></section><!-- TV-DISCOVERY-END -->';
for (const name of ["index.html", "live-tv/index.html"]) {
  const file = path.join(root, name);
  let html = fs.readFileSync(file, "utf8");
  if (html.includes("<!-- TV-DISCOVERY-START -->"))
    html = html.replace(
      /<!-- TV-DISCOVERY-START -->[\s\S]*?<!-- TV-DISCOVERY-END -->/,
      intro,
    );
  else
    html = html.replace(
      "</noscript></div></div></main>",
      "</noscript></div>" + intro + "</div></main>",
    );
  const fallback = {
    "@context": "https://schema.org",
    "@type": name === "index.html" ? "WebSite" : "CollectionPage",
    url: site + (name === "index.html" ? "/" : "/live-tv/"),
    name:
      name === "index.html"
        ? "Sasta Milaga"
        : "World TV - worldwide channel directory",
  };
  html = html.replace(
    /(<script[^>]*id=["']ld-dynamic["'][^>]*>)[\s\S]*?<\/script>/i,
    "$1" + JSON.stringify(fallback) + "</script>",
  );
  fs.writeFileSync(file, html);
}
fs.writeFileSync(
  path.join(root, "live-tv/llms.txt"),
  "# Sasta Milaga World TV\nStatic public channel directory: " +
    site +
    "/live-tv/\nComplete A-Z index: " +
    site +
    "/live-tv/directory/\nCountries: " +
    site +
    "/live-tv/countries/\nCategories: " +
    site +
    "/live-tv/categories/\n" +
    db.items.length +
    " retained channel records; " +
    meta.countries.length +
    " countries and territories. Directory inclusion is not proof of playback. Missing guides are not invented.\nCoverage: " +
    site +
    "/data/livetv/discovery-report.json\nDated health observations: " +
    site +
    "/data/livetv/playback-report.json\nRights-holder contact: " +
    site +
    "/contact/\n",
);

const feeds = JSON.parse(
  fs.readFileSync(path.join(root, "data/livetv/build-report.json"), "utf8"),
).feeds;
const reconciliation = JSON.parse(
  fs.readFileSync(
    path.join(root, "data/livetv/reconciliation-report.json"),
    "utf8",
  ),
);
fs.writeFileSync(
  path.join(root, "data/livetv/source-registry.json"),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      catalogueSources: [...feeds, ...reconciliation.sources],
      programmeGuideTemplate:
        "https://dearbulut.github.io/iptv/epg/channels/{upstream-channel-id}.json",
      streamInventory: site + "/data/livetv/playlist.m3u",
      note: "Feed reachability and dated stream probes are separate observations; neither guarantees playback.",
    },
    null,
    2,
  ),
);

// Keep the legacy sitemap-index URL byte-for-byte aligned with the primary index.
fs.writeFileSync(path.join(root,'sitemap_index.xml'),fs.readFileSync(path.join(root,'sitemap.xml')));
