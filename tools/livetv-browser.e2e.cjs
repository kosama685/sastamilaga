// Run a local Pages-like server on port 8798 first. External apps are never launched.
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const puppeteer = require(process.env.SM_PUPPETEER_MODULE || "puppeteer-core");
const BASE = process.env.SM_TV_BASE || "http://localhost:8798";
(async () => {
  const browser = await puppeteer.launch({
    executablePath:
      process.env.CHROME ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.setViewport({ width: 1440, height: 1100 });
    await page.goto(BASE + "/live-tv/", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.SLTVHub?.all().length > 10000, {
      timeout: 60000,
    });
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    const originalURL = page.url();
    await page.click(".sltv-hero .sltv-btn");
    assert.equal(page.url(), originalURL);
    const count = await page.evaluate(() => SLTVHub.all().length);
    assert.ok((await page.$$eval(".sltv-channel", (rows) => rows.length)) < 50);
    await page.$eval("#sltv-viewport", (e) => (e.scrollTop = e.scrollHeight));
    await page.waitForFunction(() => {
      const rows = [...document.querySelectorAll(".sltv-channel")];
      return (
        rows.at(-1)?.getAttribute("aria-posinset") ===
        String(SLTVHub.filtered().length)
      );
    });
    assert.equal(await page.evaluate(() => SLTVHub.filtered().length), count);
    await page.select("#sltv-country", "PK");
    assert.ok(
      await page.evaluate(() =>
        SLTVHub.filtered().every((c) => (c.country || c.cc) === "PK"),
      ),
    );
    const countryFacets = await page.evaluate(() => SM_LIVETV.facets.countries);
    for (const c of countryFacets) {
      await page.select("#sltv-country", c.k);
      assert.equal(
        await page.evaluate(() => SLTVHub.filtered().length),
        c.n,
        c.k,
      );
    }
    await page.click('[data-tab="countries"]');
    assert.ok(
      (await page.$$eval("#sltv-groups button", (b) => b.length)) > 180,
    );
    await page.click("#sltv-reset");
    await page.$eval("#sltv-viewport", (e) => (e.scrollTop = 0));
    await page.waitForFunction(() =>
      document.querySelector('[data-index="0"]'),
    );
    await page.click(".sltv-favorite");
    await page.click('[data-tab="favorites"]');
    assert.equal(await page.evaluate(() => SLTVHub.filtered().length), 1);
    await page.click("#sltv-reset");
    const channel = await page.evaluate(() => {
      const c = SLTVHub.all().find(
        (c) => c.sources.length > 1 && c.country === "PK",
      );
      const prefs = {};
      prefs[c.id] = { player: "vlc", sourceIndex: 0 };
      localStorage.setItem("sltv_player_v2", JSON.stringify(prefs));
      SLTVHub.select(c.id);
      return c.id;
    });
    await page.waitForSelector("#sltv-external:not([hidden])");
    assert.ok(
      await page.$eval('.sltv-external-actions a[href^="vlc:"]', (a) =>
        a.href.startsWith("vlc:"),
      ),
    );
    assert.ok(page.url().startsWith(BASE));
    await page.select("#sltv-source-choice", "1");
    assert.equal(await page.$eval("#sltv-source-choice", (e) => e.value), "1");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        window.SLTVHub &&
        document.getElementById("sltv-source-choice").value === "1",
    );
    assert.ok(
      page.url().includes(encodeURIComponent(channel)) ||
        page.url().includes(channel),
    );
    await page.click('[data-tab="recent"]');
    assert.ok((await page.evaluate(() => SLTVHub.filtered().length)) > 0);
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.click("#sltv-reset");
    await page.evaluate(() => document.getElementById("sltv").scrollIntoView());
    const output = process.env.SM_QA_OUTPUT || os.tmpdir();
    await page.screenshot({ path: path.join(output, "world-tv-mobile.png") });
    assert.deepEqual(errors, []);
    // Actual hub, deterministic media engine. Exercises failed and successful mirrors, not a real broadcast.
    const fixture = await browser.newPage();
    const fixtureErrors = [];
    fixture.on("pageerror", (e) => fixtureErrors.push(e.message));
    const db = {
      snapshot: new Date().toISOString(),
      facets: {
        countries: [{ k: "PK", n: 2 }],
        categories: [{ k: "News", n: 2 }],
      },
      items: [
        {
          id: "fixture",
          name: "Mirror test",
          country: "PK",
          group: "News",
          sources: [
            { url: "https://fixture.test/dead.m3u8", type: "hls" },
            { url: "https://fixture.test/good.m3u8", type: "hls" },
          ],
        },
        {
          id: "dead",
          name: "Unavailable channel",
          country: "PK",
          group: "News",
          status: "dead",
          sources: [{ url: "https://fixture.test/dead.m3u8", type: "hls" }],
        },
      ],
    };
    db.items.push({
      id: "youtube-error",
      name: "YouTube mirror error",
      country: "PK",
      group: "News",
      sources: [
        { url: "https://www.youtube.com/watch?v=aaaaaaaaaaa", type: "youtube" },
        { url: "https://fixture.test/good.m3u8", type: "hls" },
      ],
    });
    db.items.push({
      id: "third-mirror",
      name: "Three mirrors",
      country: "PK",
      group: "News",
      sources: [
        { url: "https://fixture.test/dead-one.m3u8", type: "hls" },
        { url: "https://fixture.test/dead-two.m3u8", type: "hls" },
        { url: "https://fixture.test/good.m3u8", type: "hls" },
      ],
    });
    db.items[0].upstreamId = "Fixture.test";
    await fixture.setRequestInterception(true);
    fixture.on("request", request => request.url().includes("/epg/channels/Fixture.test.json")
      ? request.respond({status:200,contentType:"application/json",headers:{"Access-Control-Allow-Origin":"*"},body:JSON.stringify({channel:"Fixture.test",programmes:Array.from({length:52},(_,i)=>({title:i===51?"Evening World News":"Programme "+i,description:"Supplied test listing",start:new Date(Date.now()+i*3600000).toISOString(),stop:new Date(Date.now()+(i+1)*3600000).toISOString()}))})}) : request.continue());
    db.facets.countries[0].n = 4;
    db.facets.categories[0].n = 4;
    await fixture.evaluateOnNewDocument((db) => (window.SM_LIVETV = db), db);
    await fixture.goto(BASE + "/live-tv/", { waitUntil: "domcontentloaded" });
    await fixture.waitForFunction(() => window.SLTVHub);
    await fixture.evaluate(() => {
      window.Hls = class {
        static Events = { MANIFEST_PARSED: "manifest", ERROR: "error" };
        static ErrorTypes = { NETWORK_ERROR: "network", MEDIA_ERROR: "media" };
        static isSupported() {
          return true;
        }
        constructor() {
          this.handlers = {};
          this.levels = [];
          this.dead = false;
        }
        on(e, fn) {
          this.handlers[e] = fn;
        }
        loadSource(url) {
          this.url = url;
        }
        attachMedia(video) {
          this.video = video;
          this.startLoad();
        }
        startLoad() {
          setTimeout(() => {
            if (this.dead) return;
            if (this.url.includes("/dead"))
              this.handlers.error?.(null, { fatal: true, type: "network" });
            else this.video.dispatchEvent(new Event("playing"));
          }, 1);
        }
        recoverMediaError() {}
        destroy() {
          this.dead = true;
        }
      };
      window.events = [];
      document
        .getElementById("sltv")
        .addEventListener("sltv:playback", (e) => events.push(e.detail));
      SLTVHub.select("fixture");
    });
    await fixture.waitForFunction(
      () => document.querySelector(".sltv-player").dataset.state === "playing",
    );
    assert.equal(
      await fixture.$eval("#sltv-source-choice", (e) => e.value),
      "1",
    );
    assert.ok(
      await fixture.evaluate(() =>
        events.some((e) => e.outcome === "playing" && e.sourceIndex === 1),
      ),
    );
    assert.equal(await fixture.$$eval('#sltv-mirror-tabs [role="tab"]', rows=>rows.length),2);
    assert.equal(await fixture.$eval('#sltv-mirror-tabs [aria-selected="true"]', el=>el.id),"sltv-mirror-1");
    assert.equal(await fixture.$eval('.sltv-source-url', el=>el.textContent),"https://fixture.test/good.m3u8");
    await fixture.waitForSelector('.sltv-schedule');
    await fixture.$eval('.sltv-schedule', el=>el.open=true);
    assert.equal(await fixture.$$eval('.sltv-schedule-item',rows=>rows.length),50);
    await fixture.type('.sltv-schedule input','evening world');
    assert.equal(await fixture.$$eval('.sltv-schedule-item',rows=>rows.length),1);
    assert.ok(await fixture.$eval('.sltv-schedule-item',el=>el.textContent.includes('Evening World News')));
    await fixture.evaluate(() => SLTVHub.select("third-mirror"));
    await fixture.waitForFunction(
      () =>
        document.querySelector(".sltv-player").dataset.state === "playing" &&
        document.getElementById("sltv-source-choice").value === "2",
    );
    assert.ok(
      await fixture.evaluate(() =>
        events.some((e) => e.outcome === "playing" && e.sourceIndex === 2),
      ),
    );
    await fixture.evaluate(() => {
      window.YT = {
        Player: class {
          constructor(element, options) {
            setTimeout(() => options.events.onError(), 0);
          }
          destroy() {}
        },
      };
      SLTVHub.select("youtube-error");
    });
    await fixture.waitForFunction(
      () =>
        document.querySelector(".sltv-player").dataset.state === "playing" &&
        document.getElementById("sltv-source-choice").value === "1",
    );
    assert.ok(
      await fixture.evaluate(() =>
        events.some(
          (e) => e.player === "youtube" && e.outcome === "source_failed",
        ),
      ),
    );
    await fixture.evaluate(() => SLTVHub.select("dead"));
    await fixture.waitForFunction(
      () => document.querySelector(".sltv-player").dataset.state === "external",
    );
    assert.equal(await fixture.evaluate(() => SLTVHub.all().length), 4);
    assert.ok(
      await fixture.$eval(".sltv-external-hint", (e) =>
        e.textContent.includes("remains listed"),
      ),
    );
    assert.deepEqual(fixtureErrors, []);
    // The index SPA route mounts the exact same hub and full catalogue.
    const spa = await browser.newPage();
    await spa.goto(BASE + "/#/live-tv", { waitUntil: "domcontentloaded" });
    await spa.waitForFunction(() => window.SLTVHub?.all().length > 10000, {
      timeout: 60000,
    });
    assert.equal(await spa.evaluate(() => SLTVHub.all().length), count);
    const geoContext = await browser.createBrowserContext();
    const geo = await geoContext.newPage();
    await geo.setRequestInterception(true);
    geo.on("request", (r) =>
      r.url().includes("/cdn-cgi/trace")
        ? r.respond({
            status: 200,
            contentType: "text/plain",
            body: "ip=192.0.2.1\nloc=SA\n",
          })
        : r.continue(),
    );
    await geo.goto(BASE + "/live-tv/", { waitUntil: "domcontentloaded" });
    await geo.waitForFunction(
      () =>
        window.SLTVHub &&
        document.getElementById("sltv-country").value === "SA",
      { timeout: 60000 },
    );
    await geo.select("#sltv-country", "PK");
    await geo.reload({ waitUntil: "domcontentloaded" });
    await geo.waitForFunction(
      () =>
        window.SLTVHub &&
        document.getElementById("sltv-country").value === "PK",
      { timeout: 60000 },
    );
    await geoContext.close();
    console.log(
      "PASS: full catalogue, last virtual row, complete country directory, country filters, favourites, recent, persisted source/player, mobile layout, explicit external apps, working second and third mirrors, IP country selection and manual override, all-dead fallback, playback events and both page surfaces.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
