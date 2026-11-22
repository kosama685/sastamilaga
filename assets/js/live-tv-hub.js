/* Sasta Milaga World TV: static directory, source failover and explicit external-player choices. */
(function () {
  "use strict";
  const root = document.getElementById("sltv");
  if (!root || root.dataset.worldTv) return;
  root.dataset.worldTv = "1";
  const asset = (p) => new URL(p, document.baseURI).href;
  function script(path, key) {
    if (window[key]) return Promise.resolve(window[key]);
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = asset(path);
      s.onload = () =>
        window[key] ? resolve(window[key]) : reject(Error("Empty " + path));
      s.onerror = () => reject(Error("Could not load " + path));
      document.head.appendChild(s);
    });
  }
  root.innerHTML = `<header class="sltv-hero"><div class="sltv-hero-content"><p class="sltv-eyebrow">SASTA MILAGA / WORLD TV</p><h1>The world.<br><em>Live on your screen.</em></h1><p>News, culture, sport and discovery. Explore free-to-air television from around the world, with more ways to watch.</p><a class="sltv-btn" href="#sltv-directory">Explore channels</a></div><div class="sltv-hero-stats" aria-live="polite"><span><b id="sltv-total">—</b>channels</span><span><b id="sltv-countries-count">—</b>countries</span><span><b id="sltv-source-count">—</b>sources &amp; mirrors</span></div></header>
<div class="sltv-workspace"><section class="sltv-stage" aria-label="Television player"><div class="sltv-stage-top"><span class="sltv-onair">WORLD TV</span><span id="sltv-now">Your window to the world</span><button type="button" id="sltv-fav-current" aria-label="Save current channel" disabled>☆ Save</button></div><div class="sltv-player" data-state="idle"><video id="sltv-video" controls playsinline preload="none" poster="${asset("assets/images/livetv/broadcast-studio.png")}"></video><div id="sltv-frame" hidden></div><div class="sltv-welcome"><span class="sltv-welcome-icon">▶</span><h2>Something worth watching.</h2><p>Choose a channel to start. Your next perspective is one click away.</p></div><p class="sltv-msg" role="status" aria-live="polite"></p></div>
<div class="sltv-controls"><span class="sltv-status" role="status" aria-live="polite">Ready when you are</span><div class="sltv-selects"><label>Player<select id="sltv-player-choice"><option value="auto">Browser / Auto</option><option value="native">Native / Safari</option><option value="vlc">VLC app</option><option value="mx">MX Player</option><option value="kodi">Kodi / IPTV app</option><option value="iina">IINA / macOS</option><option value="download">Download playlist</option></select></label><label>Source<select id="sltv-source-choice" disabled><option>Choose a channel first</option></select></label></div><div class="sltv-player-buttons"><label class="sltv-sr" for="sltv-quality">Quality</label><select id="sltv-quality" aria-label="Stream quality" hidden></select><button type="button" id="sltv-next-source" disabled>Next source</button><button type="button" id="sltv-previous" disabled>Previous channel</button><button type="button" id="sltv-live-edge">Go live</button><button type="button" id="sltv-retry" disabled>Retry</button><button type="button" id="sltv-pip">Picture in picture</button><button type="button" id="sltv-fullscreen">Fullscreen</button><button type="button" id="sltv-share" disabled>Share channel</button></div></div>
<section id="sltv-guide" class="sltv-guide" aria-live="polite"><h3>On TV now &amp; next</h3><p>Choose a channel to check its supplied programme guide.</p></section><div id="sltv-external" class="sltv-external" hidden><h3>More ways to watch</h3><p class="sltv-external-hint">Choose a channel to see its player options.</p><div class="sltv-external-actions"></div><p class="sltv-player-note">External apps open only when you choose a link. An installed app and a broadcaster-accessible source are required.</p></div>
<aside class="sltv-insight"><span>MADE FOR YOUR WORLD</span><h2>One directory. Every perspective.</h2><p>Switch mirrors without losing your place. Keep favourites on this device, discover another country, or take your channel to an installed TV player.</p><div class="sltv-insight-features"><b>Browser playback</b><b>Multiple mirrors</b><b>VLC &amp; IPTV apps</b></div></aside></section>
<section class="sltv-directory" id="sltv-directory" aria-label="Channel directory"><div class="sltv-directory-head"><div><p class="sltv-eyebrow">FIND YOUR NEXT CHANNEL</p><h2>Discover live TV</h2></div><button type="button" id="sltv-reset">Reset</button></div><label class="sltv-search"><span class="sltv-sr">Search channels, countries, categories or languages</span><input id="sltv-q" type="search" placeholder="Channel, country or language…" autocomplete="off"></label><div class="sltv-tabs" role="tablist" aria-label="Browse channels"><button type="button" role="tab" data-tab="all" aria-selected="true">All channels</button><button type="button" role="tab" data-tab="countries" aria-selected="false">Countries</button><button type="button" role="tab" data-tab="categories" aria-selected="false">Categories</button><button type="button" role="tab" data-tab="regions" aria-selected="false">Regions</button><button type="button" role="tab" data-tab="languages" aria-selected="false">Languages</button><button type="button" role="tab" data-tab="working" aria-selected="false">Observed OK</button><button type="button" role="tab" data-tab="unavailable" aria-selected="false">Player / availability</button><button type="button" role="tab" data-tab="favorites" aria-selected="false">Favourites</button><button type="button" role="tab" data-tab="recent" aria-selected="false">Recent</button></div><p id="sltv-location" class="sltv-location" role="status"></p><div class="sltv-filters"><label><span class="sltv-sr">Country</span><select id="sltv-country"><option value="">All countries</option></select></label><label><span class="sltv-sr">Category</span><select id="sltv-category"><option value="">All categories</option></select></label><label><span class="sltv-sr">Language</span><select id="sltv-language"><option value="">All languages</option></select></label><label><span class="sltv-sr">Region</span><select id="sltv-region"><option value="">All regions</option></select></label><label><span class="sltv-sr">Channel sorting</span><select id="sltv-sort"><option value="recommended">Recommended</option><option value="name">A–Z</option><option value="working">Working first</option><option value="mirrors">Most mirrors</option></select></label></div><div id="sltv-count" role="status" aria-live="polite">Loading the complete channel directory…</div><div id="sltv-groups" class="sltv-groups" hidden></div><div id="sltv-viewport" class="sltv-viewport" tabindex="0" aria-label="Scrollable channel list"><ul id="sltv-list" aria-label="All matching channels"></ul></div><p class="sltv-directory-foot">Every retained channel stays searchable, including sources that are currently unavailable. Scroll to browse the full list.</p></section></div>
<section class="sltv-world"><div><p class="sltv-eyebrow">THERE IS MORE TO EXPLORE</p><h2>Choose a country.<br>Find a different point of view.</h2><p>Local voices. Global stories. Open a country to discover its complete channel directory.</p></div><div id="sltv-world-countries" class="sltv-world-countries"></div></section><footer class="sltv-footnote"><p>Free-to-air source directory. Broadcasters control availability, formats and regional access. A reachable stream is not a guarantee of playback in every country.</p><p id="sltv-updated"></p><a href="${asset("data/livetv/playlist.m3u")}" download>Download full IPTV playlist</a> &middot; <a href="${asset("live-tv/directory/")}">Complete A-Z channel index</a> &middot; <a href="${asset("live-tv/countries/")}">Country guides</a> &middot; <a href="${asset("contact/")}">Rights-holder contact / removal</a> · <a id="sltv-epg" href="https://iptv-org.github.io/api/guides.json" target="_blank" rel="noopener">EPG source directory</a></footer>`;
  const $ = (id) => root.querySelector("#" + id),
    video = $("sltv-video"),
    frame = $("sltv-frame"),
    player = root.querySelector(".sltv-player"),
    status = root.querySelector(".sltv-status"),
    message = root.querySelector(".sltv-msg"),
    sourceSel = $("sltv-source-choice"),
    playerSel = $("sltv-player-choice"),
    viewport = $("sltv-viewport"),
    list = $("sltv-list"),
    country = $("sltv-country"),
    category = $("sltv-category"),
    groups = $("sltv-groups"),
    ext = $("sltv-external");
  let discovery,
    catalogue,
    guideToken = 0,
    manualCountry = false;
  let core,
    channels = [],
    filtered = [],
    current = null,
    sourceIndex = 0,
    tab = "all",
    runner,
    activeEngine = null,
    lastPlaybackProblem = null,
    activeCleanup = () => {},
    blobs = [],
    renderedStart = -1,
    renderedEnd = -1;
  const displayNames = (() => {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      return null;
    }
  })();
  const region = (cc) => {
    try {
      return cc ? displayNames?.of(cc) || cc : "Worldwide / unspecified";
    } catch {
      return cc;
    }
  };
  function read(key, fallback = []) {
    try {
      const value = JSON.parse(localStorage.getItem("sltv_" + key));
      return value &&
        (Array.isArray(fallback)
          ? Array.isArray(value)
          : typeof value === "object")
        ? value
        : fallback;
    } catch {
      return fallback;
    }
  }
  function write(key, value) {
    try {
      localStorage.setItem("sltv_" + key, JSON.stringify(value));
    } catch {}
  }
  function node(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = String(text);
    return e;
  }
  function event(outcome, extra = {}) {
    root.dispatchEvent(
      new CustomEvent("sltv:playback", {
        bubbles: true,
        detail: {
          channelId: current?.id,
          sourceIndex,
          player: activeEngine || playerSel.value,
          outcome,
          ...extra,
        },
      }),
    );
  }
  function copy(text) {
    if (navigator.clipboard?.writeText)
      return navigator.clipboard.writeText(text);
    window.prompt("Copy this link", text);
    return Promise.resolve();
  }
  function preferences() {
    const p = read("player_v2", {});
    return typeof p === "object" && !Array.isArray(p) ? p : {};
  }
  function remember(playerName = playerSel.value) {
    if (!current) return;
    const p = preferences();
    p[current.id] = { sourceIndex, player: playerName };
    write("player_v2", p);
  }
  function clearMedia() {
    $("sltv-quality").hidden = true;
    activeCleanup();
    activeCleanup = () => {};
    video.pause();
    video.removeAttribute("src");
    video.load();
    frame.replaceChildren();
    frame.hidden = true;
    video.hidden = false;
  }
  function favorite(id) {
    const ids = read("favorites");
    write(
      "favorites",
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
    updateFavorite();
    filter(false);
  }
  function updateFavorite() {
    const b = $("sltv-fav-current");
    b.disabled = !current;
    b.textContent =
      current && read("favorites").includes(current.id) ? "★ Saved" : "☆ Save";
    b.setAttribute(
      "aria-pressed",
      String(!!current && read("favorites").includes(current.id)),
    );
  }
  function setExternal(reason) {
    if (!current) return;
    ext.hidden = false;
    ext.querySelector(".sltv-external-hint").textContent =
      reason ||
      "Open the selected source in another player, or download it for your IPTV app.";
    const actions = ext.querySelector(".sltv-external-actions");
    actions.replaceChildren();
    blobs.forEach((u) => URL.revokeObjectURL(u));
    blobs = [];
    const source = core.sources(current)[sourceIndex];
    if (/^https?:\/\//.test(current.website || "")) {
      const official = node(
        "a",
        "sltv-btn sltv-btn--ghost",
        "Broadcaster website",
      );
      official.href = current.website;
      official.target = "_blank";
      official.rel = "noopener";
      actions.appendChild(official);
    }
    const report = node(
      "a",
      "sltv-btn sltv-btn--ghost",
      "Report a channel / rights concern",
    );
    report.href =
      asset("contact/") + "?channel=" + encodeURIComponent(current.id);
    actions.appendChild(report);
    if (!source) {
      ext.querySelector(".sltv-external-hint").textContent =
        "No public stream is currently supplied for this channel. Its directory record remains available.";
      return;
    }
    const links = core.externalLinks(
      source.url,
      current.name,
      navigator.userAgent,
    );
    function link(label, href, download) {
      if (!href) return;
      const a = node("a", "sltv-btn sltv-btn--ghost", label);
      a.href = href;
      a.rel = "nofollow noopener";
      if (download) a.download = download;
      actions.appendChild(a);
    }
    function button(label, fn) {
      const b = node("button", "sltv-btn sltv-btn--ghost", label);
      b.type = "button";
      b.onclick = fn;
      actions.appendChild(b);
    }
    button("Try browser again", () => {
      playerSel.value = "auto";
      startCurrent();
    });
    if (core.sources(current).length > 1)
      button("Next available source", () => {
        $("sltv-next-source").click();
      });
    link("Open VLC", links.vlc);
    link("MX Player", links.mx);
    link("MX Player Pro", links.mxPro);
    link("IINA / macOS", links.iina);
    const clean = (s) => String(s || "").replace(/[\r\n"]/g, "");
    const content =
      '#EXTM3U\n#EXTINF:-1 tvg-id="' +
      clean(current.id) +
      '" tvg-logo="' +
      clean(current.logo) +
      '",' +
      clean(current.name) +
      "\n" +
      source.url +
      "\n";
    const blob = URL.createObjectURL(
      new Blob([content], { type: "audio/x-mpegurl" }),
    );
    blobs.push(blob);
    link("Kodi / IPTV playlist", blob, current.id + ".m3u");
    button("Copy stream link", () =>
      copy(source.url)
        .then(() => (status.textContent = "Stream link copied"))
        .catch(
          () =>
            (status.textContent =
              "Copy unavailable; use the playlist download."),
        ),
    );
    button("Copy full playlist URL", () =>
      copy(asset("data/livetv/playlist.m3u")).then(
        () => (status.textContent = "Full playlist URL copied"),
      ),
    );
  }
  let youtubeLoading;
  function loadYouTube() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (youtubeLoading) return youtubeLoading;
    youtubeLoading = new Promise((resolve, reject) => {
      const prior = window.onYouTubeIframeAPIReady;
      const timer = setTimeout(
        () => reject(Error("YouTube API did not respond")),
        15000,
      );
      window.onYouTubeIframeAPIReady = () => {
        try {
          prior?.();
        } catch {}
        clearTimeout(timer);
        resolve(window.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        clearTimeout(timer);
        reject(Error("YouTube API unavailable"));
      };
      document.head.appendChild(tag);
    }).catch((error) => {
      youtubeLoading = null;
      throw error;
    });
    return youtubeLoading;
  }
  function embedURL(item) {
    try {
      const u = new URL(item.url);
      if (item.engine === "youtube") {
        const id =
          u.hostname === "youtu.be"
            ? u.pathname.slice(1)
            : u.searchParams.get("v") ||
              u.pathname.match(/(?:embed|live)\/([\w-]{11})/)?.[1];
        return /^[\w-]{11}$/.test(id || "")
          ? "https://www.youtube-nocookie.com/embed/" +
              id +
              "?autoplay=1&rel=0&enablejsapi=1&origin=" +
              encodeURIComponent(location.origin)
          : null;
      }
      if (item.engine === "twitch") {
        const channel =
          u.searchParams.get("channel") ||
          u.pathname.split("/").filter(Boolean)[0];
        return /^[\w-]+$/.test(channel || "")
          ? "https://player.twitch.tv/?channel=" +
              encodeURIComponent(channel) +
              "&parent=" +
              encodeURIComponent(location.hostname) +
              "&autoplay=true"
          : null;
      }
      if (
        u.hostname === "www.dailymotion.com" &&
        /^\/video\/[\w]+/.test(u.pathname)
      )
        return "https://www.dailymotion.com/embed" + u.pathname + "?autoplay=1";
      const allowed = window.SLTV_CFG?.frames || [];
      return u.protocol === "https:" && allowed.includes(u.hostname)
        ? u.href
        : null;
    } catch {
      return null;
    }
  }
  const dashLoad = () => script("assets/vendor/dash-4.7.4.min.js", "dashjs");
  function attempt(item, callbacks) {
    clearMedia();
    sourceIndex = item.sourceIndex;
    sourceSel.value = String(sourceIndex);
    activeEngine = item.engine;
    player.dataset.state = "loading";
    message.textContent = "Connecting to " + current.name + "…";
    let ended = false,
      networkRetries = 0,
      mediaRetries = 0,
      hls = null,
      dash = null,
      youtube = null;
    const valid = () => !ended;
    const fail = (reason, httpCode = 0) => {
      if (!valid()) return;
      const classified = core.diagnose(reason, httpCode);
      lastPlaybackProblem = { code: classified.code, summary: classified.summary, next: classified.next, engine: item.engine };
      event("source_failed", { code: classified.code, reason: classified.summary });
      callbacks.failed();
    };
    const played = () => {
      if (!valid()) return;
      clearTimeout(timer);
      message.textContent = "";
      player.dataset.state = "playing";
      status.textContent = "Playing · " + current.name;
      remember();
      callbacks.playing();
      event("playing");
    };
    let timer = setTimeout(() => fail("No playback within 25 seconds"), 25000);
    const failed = () => {
      if (hls) return;
      const code = video.error?.code;
      fail(code === 2 ? "Native media network failure" :
           code === 3 ? "Media decoding failed" :
           code === 4 ? "Unsupported media format" : "Native media playback failed");
    };
    const stalled = () => {
      if (valid()) {
        status.textContent = "Buffering…";
        clearTimeout(timer);
        timer = setTimeout(() => fail("Playback stalled"), 25000);
      }
    };
    video.addEventListener("playing", played);
    video.addEventListener("error", failed);
    video.addEventListener("waiting", stalled);
    function play() {
      const p = video.play();
      p?.catch((e) => {
        if (!valid() || e.name === "AbortError") return;
        if (e.name === "NotAllowedError") {
          clearTimeout(timer);
          message.textContent = "Press play to begin";
          status.textContent = "Ready · press play";
        } else fail(e.message);
      });
    }
    if (["youtube", "twitch", "iframe"].includes(item.engine)) {
      const url = embedURL(item);
      const allowedFrames = window.SLTV_CFG?.frames || [];
      if (!url || !allowedFrames.includes(new URL(url).hostname)) {
        Promise.resolve().then(() => fail("Embedded host is not allowed"));
      } else {
        video.hidden = true;
        frame.hidden = false;
        const iframe = node("iframe");
        iframe.title = current.name + " broadcaster player";
        iframe.allow = "autoplay; fullscreen; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        iframe.src = url;
        iframe.onload = () => {
          if (!valid()) return;
          if (item.engine === "youtube") return;
          clearTimeout(timer);
          message.textContent = "";
          status.textContent =
            "Broadcaster player opened · press play if prompted";
          player.dataset.state = "embedded";
          event("embedded_unverified");
        };
        iframe.onerror = () => fail("Broadcaster frame unavailable");
        frame.appendChild(iframe);
        if (item.engine === "youtube")
          loadYouTube()
            .then((YT) => {
              if (!valid()) return;
              youtube = new YT.Player(iframe, {
                events: {
                  onReady: (event) => {
                    if (valid()) event.target.playVideo();
                  },
                  onStateChange: (event) => {
                    if (!valid()) return;
                    if (event.data === 1) played();
                    else if (event.data === 2) {
                      clearTimeout(timer);
                      status.textContent = "Broadcaster player paused";
                    } else if (event.data === 0)
                      fail("Broadcaster stream ended");
                  },
                  onError: () =>
                    fail("YouTube broadcaster embedding is unavailable"),
                  onAutoplayBlocked: () => {
                    if (valid()) {
                      clearTimeout(timer);
                      message.textContent =
                        "Press play in the broadcaster player";
                      status.textContent = "Ready - press play";
                    }
                  },
                },
              });
            })
            .catch(() => fail("YouTube player API unavailable"));
      }
    } else if (item.engine === "dash") {
      dashLoad()
        .then(() => {
          if (!valid()) return;
          dash = window.dashjs.MediaPlayer().create();
          dash.updateSettings({
            streaming: { delay: { liveDelayFragmentCount: 3 } },
          });
          dash.on(window.dashjs.MediaPlayer.events.ERROR, () =>
            fail("DASH playback failed"),
          );
          dash.initialize(video, item.url, true);
        })
        .catch(() => fail("DASH player could not load"));
    } else if (item.engine === "hls" && window.Hls?.isSupported()) {
      hls = new window.Hls({ maxBufferLength: 20, backBufferLength: 20 });
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (!valid()) return;
        const q = $("sltv-quality");
        q.replaceChildren();
        const automatic = node("option", "", "Auto quality");
        automatic.value = "-1";
        q.appendChild(automatic);
        hls.levels.forEach((level, i) => {
          const o = node(
            "option",
            "",
            level.height ? level.height + "p" : "Quality " + (i + 1),
          );
          o.value = String(i);
          q.appendChild(o);
        });
        q.hidden = hls.levels.length < 2;
        q.onchange = () => {
          if (valid()) hls.currentLevel = Number(q.value);
        };
        play();
      });
      hls.on(window.Hls.Events.ERROR, (_, data) => {
        if (!valid() || !data.fatal) return;
        const httpCode = Number(data.response?.code || data.response?.status || 0);
        if (
          data.type === window.Hls.ErrorTypes.NETWORK_ERROR &&
          ![401,403,404,410].includes(httpCode) &&
          networkRetries++ < 2
        ) {
          hls.startLoad();
          return;
        }
        if (
          data.type === window.Hls.ErrorTypes.MEDIA_ERROR &&
          mediaRetries++ < 1
        ) {
          hls.recoverMediaError();
          return;
        }
        fail(data.details || data.type || "HLS source unavailable", httpCode);
      });
      hls.loadSource(item.url);
      hls.attachMedia(video);
    } else if (
      item.engine === "mp4" ||
      item.engine === "native" ||
      video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      video.src = item.url;
      play();
    } else
      Promise.resolve().then(() =>
        fail("This browser does not support the stream format"),
      );
    const cleanup = () => {
      ended = true;
      clearTimeout(timer);
      video.removeEventListener("playing", played);
      video.removeEventListener("error", failed);
      video.removeEventListener("waiting", stalled);
      hls?.destroy();
      try {
        youtube?.destroy();
      } catch {}
      try {
        dash?.reset();
      } catch {}
      activeCleanup = () => {};
    };
    activeCleanup = cleanup;
    return cleanup;
  }
  function startCurrent() {
    if (!current) return;
    lastPlaybackProblem = null;
    root.querySelector(".sltv-welcome").hidden = true;
    runner.stop();
    clearMedia();
    setExternal();
    if (!["auto", "native"].includes(playerSel.value)) {
      remember();
      video.hidden = true;
      message.textContent = "Choose an installed player below";
      status.textContent =
        "Ready for " + playerSel.options[playerSel.selectedIndex].text;
      event("external_choice");
      return;
    }
    runner.start(
      core.plan(
        current,
        sourceIndex,
        playerSel.value,
        !!video.canPlayType("application/vnd.apple.mpegurl"),
      ),
    );
  }
  function refreshGuide(ch) {
    const token = ++guideToken,
      guide = $("sltv-guide");
    guide.replaceChildren(
      node("h3", "", "On TV now & next"),
      node("p", "", "Checking the supplied programme guide..."),
    );
    discovery?.programmes(ch).then((data) => {
      if (token !== guideToken) return;
      const times = discovery.nowNext(data.programmes);
      guide.replaceChildren(node("h3", "", "On TV now & next"));
      for (const [label, p] of [
        ["Now", times.now],
        ["Next", times.next],
      ]) {
        const row = node("div", "sltv-programme");
        if (p?.icon && /^https:\/\//.test(p.icon)) {
          const image = node("img", "sltv-programme-art");
          image.src = p.icon;
          image.alt = "";
          image.width = 240;
          image.height = 135;
          image.loading = "lazy";
          image.onerror = () => image.remove();
          row.append(image);
        }
        row.append(
          node("small", "", label),
          node("strong", "", p ? p.title : "No current listing supplied"),
        );
        if (p) {
          row.append(
            node(
              "span",
              "",
              new Date(p.start).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) +
                " - " +
                new Date(p.stop).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
            ),
          );
          if (p.description)
            row.append(node("p", "", p.description.slice(0, 350)));
        }
        guide.append(row);
      }
      guide.append(
        node(
          "small",
          "",
          "Times use your device timezone. Listings are provided upstream and may be missing or delayed.",
        ),
      );
    });
  }
  function select(ch) {
    current = ch;
    refreshGuide(ch);
    const saved = preferences()[ch.id] || {};
    sourceIndex = Math.min(
      Math.max(
        0,
        Number.isInteger(saved.sourceIndex)
          ? saved.sourceIndex
          : Math.max(
              0,
              core.sources(ch).findIndex((s) => s.status === "ok"),
            ),
      ),
      core.sources(ch).length - 1,
    );
    playerSel.value = [
      "auto",
      "native",
      "vlc",
      "mx",
      "kodi",
      "iina",
      "download",
    ].includes(saved.player)
      ? saved.player
      : "auto";
    sourceSel.replaceChildren();
    core.sources(ch).forEach((s, i) => {
      let host = "";
      try {
        host = new URL(s.url).hostname;
      } catch {}
      const o = node(
        "option",
        "",
        `Mirror ${i + 1} · ${s.type.toUpperCase()} · ${s.status || "unchecked"} · ${host}`,
      );
      o.value = String(i);
      sourceSel.appendChild(o);
    });
    sourceSel.disabled = !core.sources(ch).length;
    sourceSel.value = String(sourceIndex);
    $("sltv-now").textContent = ch.name;
    $("sltv-retry").disabled = $("sltv-share").disabled = false;
    const recent = read("recent").filter((x) => x !== ch.id);
    write("recent", [ch.id, ...recent].slice(0, 100));
    $("sltv-next-source").disabled = core.sources(ch).length < 2;
    $("sltv-previous").disabled = !recent.some((id) =>
      core.resolve(channels, id),
    );
    updateFavorite();
    renderedStart = -1;
    render();
    const url = new URL(location.href);
    url.searchParams.set("channel", ch.id);
    history.replaceState(null, "", url);
    startCurrent();
  }
  function render() {
    const range = core.windowRange(
      filtered.length,
      viewport.scrollTop,
      viewport.clientHeight || 600,
      88,
      10,
    );
    if (range.start === renderedStart && range.end === renderedEnd) return;
    renderedStart = range.start;
    renderedEnd = range.end;
    list.replaceChildren();
    const spacer = (h) => {
      const li = node("li", "sltv-spacer");
      li.style.height = h + "px";
      li.setAttribute("aria-hidden", "true");
      return li;
    };
    list.appendChild(spacer(range.top));
    for (let i = range.start; i < range.end; i++) {
      const ch = filtered[i],
        li = node("li", "sltv-channel");
      li.dataset.status = ch.status || "unchecked";
      li.setAttribute("aria-setsize", String(filtered.length));
      li.setAttribute("aria-posinset", String(i + 1));
      const b = node("button", "sltv-channel-main");
      b.type = "button";
      b.dataset.index = String(i);
      if (current?.id === ch.id) b.setAttribute("aria-current", "true");
      const mark = node("span", "sltv-channel-logo");
      if (/^https?:\/\//.test(ch.logo || "")) {
        const img = node("img");
        img.src = ch.logo.replace(/^http:/, "https:");
        img.alt = "";
        img.loading = "lazy";
        img.onerror = () => {
          mark.textContent = ch.name.slice(0, 2).toUpperCase();
        };
        mark.appendChild(img);
      } else mark.textContent = ch.name.slice(0, 2).toUpperCase();
      const text = node("span", "sltv-channel-text");
      text.append(
        node("strong", "", ch.name),
        node(
          "small",
          "",
          [region(ch.country || ch.cc), ch.group || ch.cat, ch.language]
            .filter(Boolean)
            .join(" · "),
        ),
      );
      const badge = node(
        "span",
        "sltv-channel-badge",
        ch.status === "ok"
          ? "Observed OK"
          : ch.status === "dead"
            ? "Try player"
            : ch.status === "needs-player"
              ? "Player options"
              : ch.status === "no-source"
                ? "No public stream"
                : "Unchecked",
      );
      badge.title = core.sources(ch).length + " source(s)";
      b.append(
        node("span", "sltv-channel-number", String(i + 1).padStart(2, "0")),
        mark,
        text,
        badge,
      );
      b.onclick = () => select(ch);
      const fav = node(
        "button",
        "sltv-favorite",
        read("favorites").includes(ch.id) ? "★" : "☆",
      );
      fav.type = "button";
      fav.setAttribute("aria-label", "Save " + ch.name);
      fav.setAttribute(
        "aria-pressed",
        String(read("favorites").includes(ch.id)),
      );
      fav.onclick = () => favorite(ch.id);
      li.append(b, fav);
      list.appendChild(li);
    }
    list.appendChild(spacer(range.bottom));
    if (!filtered.length)
      list.appendChild(
        node(
          "li",
          "sltv-empty",
          tab === "favorites"
            ? "Save channels with the star to build your favourites."
            : tab === "recent"
              ? "Channels you watch will appear here."
              : country.value
                ? "No public channels are currently supplied for this country with these filters. Choose All countries to continue."
                : "No channels match. Reset filters to browse the full directory.",
        ),
      );
  }
  function filter(reset = true) {
    let ids =
      tab === "favorites"
        ? read("favorites")
        : tab === "recent"
          ? read("recent")
          : null;
    const wanted = ids
      ? new Set(ids.map((id) => core.resolve(channels, id)?.id).filter(Boolean))
      : null;
    filtered = channels.filter(
      (ch) =>
        (!wanted || wanted.has(ch.id)) &&
        (!$("sltv-language").value ||
          ch.languages?.includes($("sltv-language").value) ||
          String(ch.language || "")
            .split(/[,;\s]+/)
            .includes($("sltv-language").value)) &&
        (!$("sltv-region").value ||
          catalogue.regions
            ?.find((r) => r.code === $("sltv-region").value)
            ?.countries.includes(ch.country || ch.cc)) &&
        (tab !== "working" || ch.status === "ok") &&
        (tab !== "unavailable" || ch.status !== "ok") &&
        core.matches(
          ch,
          $("sltv-q").value.trim(),
          country.value,
          category.value,
          region,
        ),
    );
    if (tab === "recent")
      filtered.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    else if ($("sltv-sort").value === "recommended") {
      const names = [
        "al jazeera english",
        "france 24 english",
        "dw english",
        "nhk world-japan",
        "trt world",
        "ary news",
        "geo news",
      ];
      const rank = (c) => {
        const i = names.indexOf(c.name.toLowerCase());
        return (
          (i < 0 ? 100 : i) +
          (c.status === "no-source" ? 2000 : c.status === "dead" ? 1000 : 0)
        );
      };
      filtered.sort(
        (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
      );
    } else if ($("sltv-sort").value === "working") {
      const rank = { ok: 0, unchecked: 1, "needs-player": 2, dead: 3 };
      filtered.sort(
        (a, b) =>
          (rank[a.status] ?? 1) - (rank[b.status] ?? 1) ||
          a.name.localeCompare(b.name),
      );
    } else if ($("sltv-sort").value === "mirrors")
      filtered.sort((a, b) => core.sources(b).length - core.sources(a).length);
    if (reset) viewport.scrollTop = 0;
    renderedStart = -1;
    render();
    $("sltv-count").textContent =
      filtered.length.toLocaleString() +
      " matching / " +
      channels.length.toLocaleString() +
      " total · " +
      channels.filter((c) => c.status === "ok").length.toLocaleString() +
      " observed OK · " +
      channels
        .filter((c) => c.status === "needs-player")
        .length.toLocaleString() +
      " need player options";
    renderGroups();
  }
  function renderGroups() {
    groups.hidden = ![
      "countries",
      "categories",
      "regions",
      "languages",
    ].includes(tab);
    if (groups.hidden) return;
    groups.replaceChildren();
    let entries;
    if (tab === "countries")
      entries = catalogue.facets.countries.map((c) => ({
        key: c.k,
        name: region(c.k),
        n: c.n,
      }));
    else if (tab === "regions")
      entries = (catalogue.regions || []).map((r) => ({
        key: r.code,
        name: r.name,
        n: channels.filter((c) => r.countries.includes(c.country || c.cc))
          .length,
      }));
    else if (tab === "languages")
      entries = [...$("sltv-language").options]
        .filter((o) => o.value)
        .map((o) => ({
          key: o.value,
          name: o.textContent,
          n: channels.filter((c) => c.languages?.includes(o.value)).length,
        }));
    else {
      const map = new Map();
      channels.forEach((c) =>
        map.set(
          c.group || c.cat || "General",
          (map.get(c.group || c.cat || "General") || 0) + 1,
        ),
      );
      entries = [...map].map(([key, n]) => ({ key, name: key, n }));
    }
    entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(({ key, name, n }) => {
        const b = node("button", "", name + " - " + n);
        b.type = "button";
        b.onclick = () => {
          if (tab === "countries") {
            country.value = key;
            manualCountry = true;
            try {
              localStorage.setItem("sltv_country_v2", key);
            } catch {}
          } else if (tab === "regions") $("sltv-region").value = key;
          else if (tab === "languages") $("sltv-language").value = key;
          else category.value = key;
          setTab("all");
        };
        groups.appendChild(b);
      });
  }
  root.querySelector(".sltv-hero .sltv-btn").onclick = (e) => {
    e.preventDefault();
    $("sltv-directory").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };
  function setTab(value) {
    tab = value;
    root.querySelectorAll("[data-tab]").forEach((b) => {
      b.setAttribute("aria-selected", String(b.dataset.tab === value));
      b.tabIndex = b.dataset.tab === value ? 0 : -1;
    });
    filter();
  }
  viewport.addEventListener("scroll", () => requestAnimationFrame(render));
  list.addEventListener("keydown", (e) => {
    const b = e.target.closest("[data-index]");
    if (!b || !["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let n = Number(b.dataset.index) + (e.key === "ArrowDown" ? 1 : -1);
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = filtered.length - 1;
    n = Math.min(Math.max(0, n), filtered.length - 1);
    viewport.scrollTop = n * 88;
    renderedStart = -1;
    render();
    list.querySelector('[data-index="' + n + '"]')?.focus();
  });
  root.querySelectorAll("[data-tab]").forEach((b) => {
    b.onclick = () => setTab(b.dataset.tab);
    b.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const tabs = [...root.querySelectorAll("[data-tab]")],
        i = tabs.indexOf(b),
        next =
          tabs[
            (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length
          ];
      next.focus();
      setTab(next.dataset.tab);
    });
  });
  let searchTimer;
  $("sltv-q").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => filter(), 120);
  });
  [
    country,
    category,
    $("sltv-sort"),
    $("sltv-language"),
    $("sltv-region"),
  ].forEach((s) => (s.onchange = () => filter()));
  $("sltv-reset").onclick = () => {
    $("sltv-q").value = "";
    country.value = "";
    manualCountry = true;
    try {
      localStorage.setItem("sltv_country_v2", "__all");
    } catch {}
    $("sltv-language").value = "";
    $("sltv-region").value = "";
    $("sltv-location").textContent = "";
    category.value = "";
    setTab("all");
  };
  $("sltv-fav-current").onclick = () => {
    if (current) favorite(current.id);
  };
  playerSel.onchange = startCurrent;
  sourceSel.onchange = () => {
    sourceIndex = Number(sourceSel.value);
    startCurrent();
  };
  $("sltv-retry").onclick = startCurrent;
  $("sltv-live-edge").onclick = () => {
    if (video.seekable.length) {
      video.currentTime = Math.max(
        0,
        video.seekable.end(video.seekable.length - 1) - 2,
      );
      video.play().catch(() => {});
    } else status.textContent = "A live seek range is not available yet";
  };
  $("sltv-share").onclick = () =>
    copy(location.href).then(
      () => (status.textContent = "Channel link copied"),
    );
  $("sltv-next-source").onclick = () => {
    if (!current || core.sources(current).length < 2) return;
    sourceIndex = (sourceIndex + 1) % core.sources(current).length;
    sourceSel.value = String(sourceIndex);
    playerSel.value = "auto";
    startCurrent();
  };
  $("sltv-previous").onclick = () => {
    const ch = read("recent")
      .map((id) => core.resolve(channels, id))
      .find((ch) => ch && ch.id !== current?.id);
    if (ch) select(ch);
  };
  $("sltv-fullscreen").onclick = () => {
    if (player.requestFullscreen)
      player
        .requestFullscreen()
        .catch(() => (status.textContent = "Fullscreen unavailable"));
    else video.webkitEnterFullscreen?.();
  };
  $("sltv-pip").hidden = !document.pictureInPictureEnabled;
  $("sltv-pip").onclick = () => {
    if (video.readyState < 2) {
      status.textContent = "Start browser playback first";
      return;
    }
    (document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : video.requestPictureInPicture()
    ).catch(() => (status.textContent = "Picture in picture unavailable"));
  };
  Promise.all([
    script("assets/js/live-tv-core.js?v=world-tv-20261122", "SLTVCore"),
    script(
      "data/livetv/channels.js?v=world-tv-discovery-20261122",
      "SM_LIVETV",
    ),
    script(
      "assets/js/live-tv-discovery.js?v=world-tv-discovery-20261122",
      "SLTVDiscovery",
    ),
  ])
    .then(([C, db, D]) => {
      core = C;
      discovery = D;
      catalogue = db;
      channels = db.items;
      let languageNames;
      try {
        languageNames = new Intl.DisplayNames(["en"], { type: "language" });
      } catch {}
      channels.forEach((ch) => {
        ch.languageDisplay = String(ch.language || "")
          .split(/[,;\s]+/)
          .map((code) => {
            try {
              return languageNames?.of(code) || code;
            } catch {
              return code;
            }
          })
          .join(", ");
      });
      runner = core.failover({
        attempt,
        onExhausted: () => {
          clearMedia();
          video.hidden = true;
          player.dataset.state = "external";
          message.textContent = "This channel is not playing in the browser.";
          status.textContent =
            "All browser mirrors tried · " + (lastPlaybackProblem?.code || "PLAYER_FAILURE");
          setExternal(
            (lastPlaybackProblem ? lastPlaybackProblem.summary + " " + lastPlaybackProblem.next + " " : "") +
            "This channel remains listed. Try the broadcaster's official player or another supported source.",
          );
          const actions = ext.querySelector(".sltv-external-actions");
          if (actions) {
            const help = node("a", "sltv-btn sltv-btn--ghost", "Playback troubleshooting");
            help.href = asset("live-tv/troubleshooting/");
            actions.appendChild(help);
            const copyIssue = node("button", "sltv-btn sltv-btn--ghost", "Copy diagnostic code");
            copyIssue.type = "button";
            copyIssue.onclick = () => copy([
              "World TV browser diagnostic",
              "Channel reference: " + String(current?.id || ""),
              "Engine: " + String(lastPlaybackProblem?.engine || activeEngine || "unknown"),
              "Reason: " + String(lastPlaybackProblem?.code || "PLAYER_FAILURE"),
              "No source URL or private token included."
            ].join("\\n"));
            actions.appendChild(copyIssue);
          }
          event("failed");
        },
        onState: (item, n, total, outcome) => {
          if (outcome !== "playing")
            status.textContent =
              "Trying mirror " +
              (item.sourceIndex + 1) +
              " · " +
              item.engine +
              " (" +
              n +
              "/" +
              total +
              ")";
        },
      });
      $("sltv-total").textContent = channels.length.toLocaleString();
      $("sltv-countries-count").textContent =
        db.facets.countries.length.toLocaleString();
      $("sltv-source-count").textContent = channels
        .reduce((n, c) => n + (c.sources?.length || core.sources(c).length), 0)
        .toLocaleString();
      const addOption = (select, value, label) => {
        const o = node("option", "", label);
        o.value = value;
        select.appendChild(o);
      };
      db.facets.countries
        .sort((a, b) => region(a.k).localeCompare(region(b.k)))
        .forEach((c) =>
          addOption(country, c.k, region(c.k) + " (" + c.n + ")"),
        );
      [
        ...new Map(
          [
            ...(db.facets.categories || []),
            ...(db.categoryDirectory || []).map((c) => ({
              k: c.id,
              n: channels.filter((ch) => ch.categories?.includes(c.id)).length,
            })),
          ].map((c) => [c.k, c]),
        ).values(),
      ]
        .filter((c) => c.n)
        .forEach((c) => addOption(category, c.k, c.k + " (" + c.n + ")"));
      (db.languageDirectory || []).forEach((l) =>
        addOption($("sltv-language"), l.code, l.name),
      );
      (db.regions || []).forEach((r) =>
        addOption($("sltv-region"), r.code, r.name),
      );
      if (channels.some((c) => !c.country && !c.cc))
        addOption(country, "__world", "Worldwide / unspecified");
      const qs = new URLSearchParams(location.hash.split("?")[1] || "");
      new URLSearchParams(location.search).forEach((value, key) =>
        qs.set(key, value),
      );
      $("sltv-epg").href =
        window.SM_CONFIG?.liveTvEpgDirectory ||
        db.epg ||
        "https://iptv-org.github.io/api/guides.json";
      country.value =
        qs.get("country") === "UK" ? "GB" : qs.get("country") || "";
      category.value = qs.get("category") || "";
      $("sltv-language").value = qs.get("language") || "";
      $("sltv-region").value = qs.get("region") || "";
      country.addEventListener("change", () => {
        manualCountry = true;
        try {
          localStorage.setItem("sltv_country_v2", country.value || "__all");
        } catch {}
        $("sltv-location").textContent = "";
      });
      if (
        !["country", "channel", "q", "category", "language", "region"].some(
          (k) => qs.has(k),
        )
      ) {
        let saved;
        try {
          saved = localStorage.getItem("sltv_country_v2");
        } catch {}
        if (saved) {
          if (saved !== "__all") country.value = saved;
        } else
          discovery.detectCountry().then((cc) => {
            if (
              manualCountry ||
              !cc ||
              ![...country.options].some((o) => o.value === cc)
            )
              return;
            country.value = cc;
            filter();
            $("sltv-location").textContent =
              "Showing " +
              region(cc) +
              " from your approximate connection location. Change Country or choose Reset for the world. Your IP address is not stored.";
          });
      }
      $("sltv-q").value = qs.get("q") || "";
      $("sltv-updated").textContent =
        "Catalogue updated " +
        new Date(db.snapshot).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }) +
        " · " +
        (db.health
          ? "Health observations: " +
            new Date(db.health.at).toLocaleDateString("en-GB")
          : "Health checks pending");
      const world = $("sltv-world-countries");
      db.facets.countries
        .sort((a, b) => region(a.k).localeCompare(region(b.k)))
        .forEach((c) => {
          const a = node("a", "sltv-country-link");
          a.href = asset(
            "live-tv/country/" +
              (c.name || region(c.k))
                .normalize("NFKD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") +
              "/",
          );
          const flag = node("span", "sltv-country-code", c.k);
          a.append(
            flag,
            node("strong", "", region(c.k)),
            node("small", "", c.n + " channels"),
          );
          world.appendChild(a);
        });
      filter();
      const ch = core.resolve(channels, qs.get("channel") || "");
      if (ch) select(ch);
      window.SLTVHub = {
        select: (id) => {
          const ch = core.resolve(channels, id);
          if (ch) select(ch);
        },
        all: () => channels,
        filtered: () => filtered,
        stop: () => {
          runner.stop();
          clearMedia();
        },
      };
    })
    .catch((e) => {
      $("sltv-count").textContent =
        "The channel directory could not load. Refresh to try again.";
      status.textContent = e.message;
    });
  document.addEventListener("sasta:view", (event) => {
    if (event.detail?.view !== "tv" && runner) {
      runner.stop();
      clearMedia();
      if (current)
        status.textContent =
          "Paused while browsing the site. Choose Retry to continue.";
    }
  });
  const guideRefresh = setInterval(
    () => {
      if (current && document.visibilityState === "visible" && !root.closest("[hidden]"))
        refreshGuide(current);
    },
    15 * 60 * 1000,
  );
  window.addEventListener("beforeunload", () => {
    clearInterval(guideRefresh);
    runner?.stop();
    blobs.forEach((u) => URL.revokeObjectURL(u));
  });
})();
