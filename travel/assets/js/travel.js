/* TravelHub — search, comparison, voice fill, quote hand-off.
   No API key required for anything in this file: partner comparison uses official
   deep links, and indicative fares are generated locally and labelled DEMO.
   Live supplier fares activate the moment a key is configured in the Worker. */
(function () {
  "use strict";

  var BASE = document.documentElement.getAttribute("data-base") || "/travel";
  BASE = BASE.replace(/\/$/, "");
  var WHATSAPP = "966510451995";
  var MARKUP = 0.20; // 20% service markup, applied before display

  var AIRPORTS = [
    ["KHI", "Karachi", "Pakistan", "🇵🇰"], ["LHE", "Lahore", "Pakistan", "🇵🇰"],
    ["ISB", "Islamabad", "Pakistan", "🇵🇰"], ["PEW", "Peshawar", "Pakistan", "🇵🇰"],
    ["MUX", "Multan", "Pakistan", "🇵🇰"], ["SKT", "Sialkot", "Pakistan", "🇵🇰"],
    ["DXB", "Dubai", "UAE", "🇦🇪"], ["AUH", "Abu Dhabi", "UAE", "🇦🇪"],
    ["SHJ", "Sharjah", "UAE", "🇦🇪"], ["RUH", "Riyadh", "Saudi Arabia", "🇸🇦"],
    ["JED", "Jeddah", "Saudi Arabia", "🇸🇦"], ["DMM", "Dammam", "Saudi Arabia", "🇸🇦"],
    ["MED", "Madinah", "Saudi Arabia", "🇸🇦"], ["DOH", "Doha", "Qatar", "🇶🇦"],
    ["KWI", "Kuwait City", "Kuwait", "🇰🇼"], ["BAH", "Manama", "Bahrain", "🇧🇭"],
    ["MCT", "Muscat", "Oman", "🇴🇲"], ["IST", "Istanbul", "Turkey", "🇹🇷"],
    ["SAW", "Istanbul Sabiha", "Turkey", "🇹🇷"], ["AYT", "Antalya", "Turkey", "🇹🇷"],
    ["LHR", "London Heathrow", "UK", "🇬🇧"], ["MAN", "Manchester", "UK", "🇬🇧"],
    ["CDG", "Paris", "France", "🇫🇷"], ["FRA", "Frankfurt", "Germany", "🇩🇪"],
    ["AMS", "Amsterdam", "Netherlands", "🇳🇱"], ["BCN", "Barcelona", "Spain", "🇪🇸"],
    ["BKK", "Bangkok", "Thailand", "🇹🇭"], ["KUL", "Kuala Lumpur", "Malaysia", "🇲🇾"],
    ["SIN", "Singapore", "Singapore", "🇸🇬"], ["CGK", "Jakarta", "Indonesia", "🇮🇩"],
    ["MNL", "Manila", "Philippines", "🇵🇭"], ["DEL", "Delhi", "India", "🇮🇳"],
    ["BOM", "Mumbai", "India", "🇮🇳"], ["DAC", "Dhaka", "Bangladesh", "🇧🇩"],
    ["CMB", "Colombo", "Sri Lanka", "🇱🇰"], ["KTM", "Kathmandu", "Nepal", "🇳🇵"],
    ["CAI", "Cairo", "Egypt", "🇪🇬"], ["ADD", "Addis Ababa", "Ethiopia", "🇪🇹"],
    ["NBO", "Nairobi", "Kenya", "🇰🇪"], ["JNB", "Johannesburg", "South Africa", "🇿🇦"],
    ["JFK", "New York", "USA", "🇺🇸"], ["YYZ", "Toronto", "Canada", "🇨🇦"],
    ["SYD", "Sydney", "Australia", "🇦🇺"], ["PEK", "Beijing", "China", "🇨🇳"],
    ["CAN", "Guangzhou", "China", "🇨🇳"], ["HKG", "Hong Kong", "Hong Kong", "🇭🇰"],
    ["NRT", "Tokyo", "Japan", "🇯🇵"], ["ICN", "Seoul", "South Korea", "🇰🇷"]
  ].map(function (a) { return { code: a[0], city: a[1], country: a[2], flag: a[3] }; });

  var AIRLINES = [
    ["EK", "Emirates", "full"], ["QR", "Qatar Airways", "full"], ["EY", "Etihad Airways", "full"],
    ["SV", "Saudia", "full"], ["TK", "Turkish Airlines", "full"], ["PK", "PIA", "full"],
    ["FZ", "flydubai", "low"], ["G9", "Air Arabia", "low"], ["WY", "Oman Air", "full"],
    ["GF", "Gulf Air", "full"], ["EK2", "Emirates (flex)", "full"], ["XY", "flynas", "low"],
    ["J9", "Jazeera Airways", "low"], ["UL", "SriLankan", "full"], ["AI", "Air India", "full"],
    ["6E", "IndiGo", "low"], ["OD", "Batik Air", "low"], ["MH", "Malaysia Airlines", "full"]
  ].map(function (a) { return { code: a[0], name: a[1], type: a[2] }; });

  var FLIGHTS = [
    ["Google Flights", "https://www.google.com/travel/flights?q=Flights%20from%20{from}%20to%20{to}%20on%20{dep}", "Multi"],
    ["Skyscanner", "https://www.skyscanner.net/transport/flights/{froml}/{tol}/{yymd}/?adults={pax}", "Blue"],
    ["Kiwi.com", "https://www.kiwi.com/en/search/results/{from}/{to}/{dep}/{ret}?adults={pax}", "Green"],
    ["Momondo", "https://www.momondo.com/flight-search/{from}-{to}/{dep}?sort=price_a", "Navy"]
  ];

  var HOTELS = [
    ["Booking.com", "https://www.booking.com/searchresults.html?ss={city}&checkin={in}&checkout={out}&group_adults={pax}&no_rooms=1&selected_currency=USD", "Blue"],
    ["Agoda", "https://www.agoda.com/search?city={city}&checkIn={in}&checkOut={out}&adults={pax}", "Purple"],
    ["Trivago", "https://www.trivago.com/?aDateRange%5Barr%5D={in}&aDateRange%5Bdep%5D={out}&aPriceRange%5Bmin%5D=0&aPriceRange%5Bmax%5D=0&iPathId=0&aGeoCode%5Blat%5D=0&aGeoCode%5Blng%5D=0&iGeoDistanceItem=0&aCategoryRange=0&aOverallLiking=1%2C2%2C3%2C4%2C5&sOrderBy=relevance", "Red"],
    ["Google Hotels", "https://www.google.com/travel/hotels?q={city}&checkin={in}&checkout={out}&adults={pax}", "Multi"],
    ["Expedia", "https://www.expedia.com/Hotel-Search?destination={city}&startDate={in}&endDate={out}&adults={pax}", "Navy"],
    ["Hotels.com", "https://www.hotels.com/Hotel-Search?destination={city}&startDate={in}&endDate={out}&adults={pax}", "Red"]
  ];

  var CARS = [
    ["DiscoverCars", "https://www.discovercars.com/?location={city}&pickupDate={in}&dropoffDate={out}", "Orange"],
    ["Rentalcars", "https://www.rentalcars.com/SearchResults.do?location={city}&dropoffLocation={city}&pickUpDate={in}&dropOffDate={out}", "Blue"],
    ["Kayak Cars", "https://www.kayak.com/cars/{city}/{in}/{out}?sort=price_a", "Orange"]
  ];

  var TOURS = [
    ["Viator", "https://www.viator.com/searchResults/all?text={city}", "Green"],
    ["GetYourGuide", "https://www.getyourguide.com/s/?q={city}", "Orange"],
    ["Klook", "https://www.klook.com/en-US/search/result/?query={city}", "Red"]
  ];

  var ESIM = [
    ["Airalo", "https://www.airalo.com/{country}-esim", "Blue"],
    ["Holafly", "https://esim.holafly.com/esim-{country}/", "Green"],
    ["Saily", "https://saily.com/esim-{country}/", "Navy"]
  ];

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n, cur) { cur = cur || "USD"; return (cur === "USD" ? "$" : cur + " ") + Math.round(n).toLocaleString("en-US"); }
  function hash(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return Math.abs(h); }
  function rnd(seed, min, max) { return min + (hash(seed) % (max - min + 1)); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function fmtDate(s) { if (!s) return ""; var d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  function cityOf(code) { for (var i = 0; i < AIRPORTS.length; i++) if (AIRPORTS[i].code === code) return AIRPORTS[i]; return { code: code, city: code, country: "", flag: "🌍" }; }
  function price(base) { return Math.ceil((base * (1 + MARKUP)) / 1); } // markup applied before display
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  /* ---------- form (home + vertical pages) ---------- */
  function initSearchForm(form) {
    if (!form) return;
    var trip = form.dataset.trip || "round";
    var type = form.dataset.type || "flights";

    function syncFields() {
      var service = form.dataset.type;
      var isFlight = service === "flights";
      var hasEnd = isFlight || service === "stays" || service === "cars";
      form.elements.from.disabled = !isFlight;
      form.elements.cabin.disabled = !isFlight;
      form.elements.ret.disabled = !hasEnd || (isFlight && form.dataset.trip === "one");
      form.elements.ret.closest(".field").style.opacity = isFlight && form.dataset.trip === "one" ? ".5" : "";
    }
    syncFields();

    /* tabs on home */
    $$("[data-tab]").forEach(function (t) {
      t.addEventListener("click", function () {
        $$("[data-tab]").forEach(function (x) { x.classList.toggle("on", x === t); });
        var v = t.getAttribute("data-tab");
        form.dataset.type = v;
        form.elements.type.value = v;
        form.setAttribute("action", BASE + (v === "visa" || v === "umrah" ? "/" + v + "/" : "/compare/"));
        var flightOnly = ["from", "to", "dep", "ret", "pax", "cabin", "trip"];
        flightOnly.forEach(function (k) {
          var el = form.querySelector('[name="' + k + '"]');
          if (!el) return;
          var wrap = el.closest(".field") || el;
          var hide = (v === "tours" || v === "cars" || v === "visa" || v === "esim" || v === "umrah") &&
                     (k === "from" || k === "cabin");
          wrap.style.display = hide ? "none" : "";
        });
        var tripRow = form.querySelector(".trip-row");
        if (tripRow) tripRow.style.display = (v === "flights") ? "" : "none";
        var toLabel = form.querySelector('[name="to"]') && form.querySelector('[name="to"]').closest(".field");
        if (toLabel) {
          var lab = toLabel.querySelector("label");
          if (lab) lab.textContent = v === "stays" ? "City / hotel area" : v === "cars" ? "Pick-up city" : v === "flights" ? "Arrive to" : "Destination";
        }
        var depLab = form.querySelector('[name="dep"]') && form.querySelector('[name="dep"]').closest(".field").querySelector("label");
        if (depLab) depLab.textContent = v === "stays" || v === "cars" ? "Check-in / pick-up" : "Departure date";
        var retField = form.querySelector('[name="ret"]') && form.querySelector('[name="ret"]').closest(".field");
        if (retField) retField.style.display = (v === "tours" || v === "visa" || v === "esim" || v === "umrah") ? "none" : "";
        syncFields();
      });
    });

    /* trip type */
    $$("[data-triptype]", form).forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        $$("[data-triptype]", form).forEach(function (x) { x.classList.toggle("on", x === b); });
        form.dataset.trip = b.getAttribute("data-triptype");
        var ret = form.querySelector('[name="ret"]');
        syncFields();
        if (ret && form.dataset.trip === "one") ret.value = "";
      });
    });
    if (form.dataset.trip === "one") {
      var r = form.querySelector('[name="ret"]');
      if (r) r.value = "";
    }

    /* swap */
    var swap = $(".swap", form);
    if (swap) swap.addEventListener("click", function () {
      var a = form.querySelector('[name="from"]'), b = form.querySelector('[name="to"]');
      if (!a || !b) return;
      var t = a.value; a.value = b.value; b.value = t;
    });

    /* default dates */
    var dep = form.querySelector('[name="dep"]'), ret = form.querySelector('[name="ret"]');
    var today = new Date();
    if (dep && !dep.value) dep.value = iso(addDays(today, 21));
    if (ret && !ret.value && form.dataset.trip !== "one") ret.value = iso(addDays(today, 28));
    if (dep) dep.min = iso(today);

    /* submit */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var service = form.dataset.type || type;
      var flight = service === "flights";
      var needsReturn = (flight && form.dataset.trip !== "one") || service === "stays" || service === "cars";
      var origin = form.elements.from;
      var destination = form.elements.to;
      var departure = form.elements.dep;
      var returning = form.elements.ret;
      function invalid(field, message) {
        field.setCustomValidity(message);
        field.reportValidity();
        field.setCustomValidity("");
      }
      function airport(value) {
        value = value.trim();
        var code = value.match(/^([A-Za-z]{3})(?:\s*[-\u2013(]|$)/);
        if (code) return code[1].toUpperCase();
        var city = value.toLowerCase();
        var match = AIRPORTS.find(function (a) { return a.city.toLowerCase() === city; });
        if (!match) {
          var matches = AIRPORTS.filter(function (a) { return a.city.toLowerCase().indexOf(city + " ") === 0; });
          if (matches.length === 1) match = matches[0];
        }
        return match ? match.code : "";
      }
      var from = flight ? airport(origin.value) : "";
      var to = flight ? airport(destination.value) : destination.value.trim();
      if (flight && !from) return invalid(origin, "Enter a departure city or a three-letter airport code.");
      if (!to) return invalid(destination, flight ? "Enter an arrival city or a three-letter airport code." : "Enter a destination.");
      if (flight && from === to) return invalid(destination, "Choose a different arrival airport.");
      if (!departure.value) return invalid(departure, "Choose a travel date.");
      if (needsReturn && (!returning.value || returning.value < departure.value ||
          (!flight && returning.value === departure.value))) {
        return invalid(returning, "Choose a valid return or end date.");
      }
      var q = new URLSearchParams({type: service, to: to, dep: departure.value});
      var place = cityOf(flight ? to : airport(to) || to.toUpperCase());
      q.set("city", place.city === place.code ? destination.value.trim() : place.city);
      if (place.country) q.set("country", place.country);
      if (flight) {
        q.set("from", from);
        q.set("trip", form.dataset.trip || trip);
        q.set("cabin", form.elements.cabin.value);
      }
      if (needsReturn) q.set("ret", returning.value);
      if (form.elements.pax.value) q.set("pax", form.elements.pax.value);
      if (form.elements.cur && form.elements.cur.value) q.set("cur", form.elements.cur.value);
      if (service === "visa" || service === "umrah") {
        location.assign(BASE + "/" + service + "/?" + q + "#travel-quote");
        return;
      }
      location.assign(BASE + "/compare/?" + q + "#" + service);
    });

    initVoice(form);
  }

  /* ---------- voice fill ---------- */
  function parseTranscript(text) {
    var out = {}, t = " " + text.toLowerCase() + " ";
    AIRPORTS.forEach(function (a) {
      if (t.indexOf(a.city.toLowerCase()) > -1 && !out.to) out.to = a.code;
      if (t.indexOf(a.code.toLowerCase() + " ") > -1 && !out.to) out.to = a.code;
    });
    var fromM = t.match(/(?:from|departing|leaving)\s+([a-z\s]+?)(?:\s+to\b|\s+on\b|,|$)/);
    if (fromM) {
      var name = fromM[1].trim();
      AIRPORTS.forEach(function (a) { if (a.city.toLowerCase() === name) out.from = a.code; });
      if (!out.from) AIRPORTS.forEach(function (a) { if (name.indexOf(a.city.toLowerCase()) > -1) out.from = a.code; });
    }
    var toM = t.match(/\bto\s+([a-z\s]+?)(?:\s+on\b|\s+from\b|\s+for\b|,|$)/);
    if (toM) {
      var nm = toM[1].trim();
      AIRPORTS.forEach(function (a) { if (nm.indexOf(a.city.toLowerCase()) > -1) out.to = a.code; });
    }
    var paxM = t.match(/(\d+)\s*(?:adult|passenger|person|people|pax)/);
    if (paxM) out.pax = Math.max(1, Math.min(9, parseInt(paxM[1], 10)));
    if (/business/.test(t)) out.cabin = "business";
    else if (/first class/.test(t)) out.cabin = "first";
    else if (/premium/.test(t)) out.cabin = "premium";
    else if (/economy/.test(t)) out.cabin = "economy";
    if (/one way|one-way|single/.test(t)) out.trip = "one";
    if (/round trip|return trip|coming back|return/.test(t)) out.trip = "round";
    var months = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    var dm = t.match(/(\d{1,2})\s*(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(\s+(\d{4}))?/);
    if (dm) {
      var y = dm[4] ? +dm[4] : new Date().getFullYear();
      var mm = months[dm[2]];
      var dd = +dm[1];
      var dt = new Date(y, mm - 1, dd);
      if (!dm[4] && dt < new Date()) dt = new Date(y + 1, mm - 1, dd);
      out.dep = iso(dt);
    } else {
      var rel = t.match(/in\s+(\d+)\s+(day|week|month)s?/);
      if (rel) {
        var n = +rel[1], unit = rel[2];
        var days = unit === "day" ? n : unit === "week" ? n * 7 : n * 30;
        out.dep = iso(addDays(new Date(), days));
      }
    }
    if (/next month/.test(t) && !out.dep) out.dep = iso(addDays(new Date(), 35));
    if (/next week/.test(t) && !out.dep) out.dep = iso(addDays(new Date(), 8));
    return out;
  }

  function initVoice(form) {
    var btn = $("[data-voice]", form);
    var hint = $("[data-voice-hint]", form);
    if (!btn) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.title = "Voice is not supported in this browser — use the mic on each field"; btn.disabled = true; btn.textContent = "🎙 Voice needs Chrome/Edge"; return; }
    var rec = null;
    function applyAndConfirm(parsed) {
      var applied = [];
      if (parsed.from) { form.querySelector('[name="from"]').value = parsed.from; applied.push("from " + cityOf(parsed.from).city); }
      if (parsed.to) { form.querySelector('[name="to"]').value = parsed.to; applied.push("to " + cityOf(parsed.to).city); }
      if (parsed.dep) { form.querySelector('[name="dep"]').value = parsed.dep; applied.push(fmtDate(parsed.dep)); }
      if (parsed.ret && form.querySelector('[name="ret"]')) form.querySelector('[name="ret"]').value = parsed.ret;
      if (parsed.pax && form.querySelector('[name="pax"]')) form.querySelector('[name="pax"]').value = parsed.pax;
      if (parsed.cabin && form.querySelector('[name="cabin"]')) form.querySelector('[name="cabin"]').value = parsed.cabin;
      if (parsed.trip) {
        var b = form.querySelector('[data-triptype="' + parsed.trip + '"]');
        if (b) b.click();
      }
      if (hint) {
        hint.innerHTML = applied.length
          ? "Filled: <b>" + esc(applied.join(" · ")) + "</b> — check the details, then search."
          : "I did not catch a city or date. Try: <b>“Karachi to Dubai on 12 December, two adults, economy”</b>.";
      }
      var missing = [];
      if (!form.querySelector('[name="from"]').value) missing.push("departure");
      if (!form.querySelector('[name="to"]').value) missing.push("destination");
      if (missing.length && hint) hint.innerHTML += ' <span style="color:#8a4a00">Missing: ' + missing.join(", ") + "</span>";
    }
    btn.addEventListener("click", function () {
      if (rec) { try { rec.stop(); } catch (e) {} rec = null; btn.classList.remove("listening"); return; }
      rec = new SR();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      btn.classList.add("listening");
      if (hint) hint.innerHTML = "Listening… say the route and the date.";
      rec.onresult = function (ev) {
        var text = ev.results[0][0].transcript;
        applyAndConfirm(parseTranscript(text));
      };
      rec.onerror = function () {
        if (hint) hint.innerHTML = 'Could not hear that. Type it instead, or try: <b>“Karachi to Dubai on 12 December”</b>.';
      };
      rec.onend = function () { btn.classList.remove("listening"); rec = null; };
      try { rec.start(); } catch (e) { btn.classList.remove("listening"); }
    });
    $$("[data-mic]", form).forEach(function (m) {
      m.addEventListener("click", function () {
        var field = m.closest(".field").querySelector("input,select");
        if (!field) return;
        if (!SR) { field.focus(); return; }
        var r2 = new SR(); r2.lang = "en-US"; r2.interimResults = false;
        m.classList.add("listening");
        r2.onresult = function (ev) {
          var txt = ev.results[0][0].transcript.trim();
          if (field.name === "from" || field.name === "to") {
            var found = null;
            AIRPORTS.forEach(function (a) { if (txt.toLowerCase().indexOf(a.city.toLowerCase()) > -1 && !found) found = a.code; });
            if (found) field.value = found;
          } else if (field.name === "dep" || field.name === "ret") {
            var p = parseTranscript(txt);
            if (p.dep) field.value = p.dep;
          } else field.value = txt;
        };
        r2.onend = function () { m.classList.remove("listening"); };
        try { r2.start(); } catch (e) { m.classList.remove("listening"); }
      });
    });
  }

  /* ---------- results ---------- */
  function partnerLink(tpl, q) {
    var dep = q.dep || "";
    var ymd = dep.replace(/-/g, "").slice(2);
    return tpl.replace(/\{city\}/g, encodeURIComponent(q.city || q.to || ""))
      .replace(/\{from\}/g, q.from || "")
      .replace(/\{to\}/g, q.to || "")
      .replace(/\{froml\}/g, (q.from || "").toLowerCase())
      .replace(/\{tol\}/g, (q.to || "").toLowerCase())
      .replace(/\{yymd\}/g, ymd)
      .replace(/\{dep\}/g, dep)
      .replace(/\{ret\}/g, q.ret || dep)
      .replace(/\{in\}/g, dep)
      .replace(/\{out\}/g, q.ret || dep)
      .replace(/\{pax\}/g, q.pax || "1")
      .replace(/\{country\}/g, (q.country || "saudi-arabia").toLowerCase().replace(/\s+/g, "-"));
  }

  function demoFlights(q) {
    var seed = q.from + q.to + q.dep + q.cabin;
    var rows = [];
    var count = 7 + (hash(seed) % 4);
    for (var i = 0; i < count; i++) {
      var al = AIRLINES[(hash(seed + i) % AIRLINES.length)];
      var depH = rnd(seed + "h" + i, 0, 23);
      var depM = [0, 10, 15, 25, 35, 45, 55][rnd(seed + "m" + i, 0, 6)];
      var durMin = rnd(seed + "d" + i, q.from && q.to && rnd(seed, 0, 1) ? 180 : 240, 900);
      var stops = durMin > 600 ? 1 : (hash(seed + "s" + i) % 5 === 0 ? 1 : 0);
      if (q.cabin === "business" || q.cabin === "first") durMin += 0;
      var arrival = depH * 60 + depM + durMin;
      var base = rnd(seed + "b" + i, 205, 780) + (stops ? -45 : 35);
      if (q.cabin === "business") base *= 2.6;
      if (q.cabin === "first") base *= 4.1;
      if (q.cabin === "premium") base *= 1.7;
      rows.push({
        provider: al.name, code: al.code, dep: depH * 60 + depM, arr: arrival % 1440,
        dur: durMin, stops: stops, base: Math.max(165, Math.round(base)),
        price: price(Math.max(165, Math.round(base))),
        bags: al.type === "low" ? "Cabin bag only" : "1 × 23kg + cabin",
        refund: al.code === "EK" || al.code === "QR" || al.code === "SV"
      });
    }
    return rows.sort(function (a, b) { return a.price - b.price; });
  }

  function demoStays(q) {
    var seed = (q.to || q.city || "") + q.dep;
    var names = ["City Centre Hotel", "Grand Residence", "Airport Suites", "Boutique Stay", "Business Tower Hotel", "Family Apartments", "Riverside Inn", "Metro Hotel"];
    var rows = [];
    for (var i = 0; i < 8; i++) {
      var stars = 3 + (hash(seed + i) % 3);
      var base = rnd(seed + "h" + i, 45, 260) * (stars - 1.4);
      rows.push({
        provider: names[i], stars: stars, dur: 0, stops: 0,
        base: Math.round(base), price: price(Math.round(base)),
        bags: stars >= 4 ? "Breakfast + free cancellation" : "Room only",
        refund: stars >= 4, area: ["Downtown", "Marina", "Airport", "Old City"][hash(seed + "a" + i) % 4]
      });
    }
    return rows.sort(function (a, b) { return a.price - b.price; });
  }

  function renderOffers(rows, vertical, q) {
    if (!rows.length) return '<div class="empty">No indicative fares for this route. Try a different city pair or date.</div>';
    return rows.map(function (r, i) {
      var badge = vertical === "flights"
        ? '<span class="badge ours">Our price · fee included</span>'
        : '<span class="badge ours">Our rate · fee included</span>';
      var logo = vertical === "flights" ? r.code : String(r.provider).slice(0, 2).toUpperCase();
      var title = vertical === "flights"
        ? '<div class="route">' + esc(q.from) + ' <span style="color:#9aa8a1">→</span> ' + esc(q.to) + '</div>'
        : '<div class="route">' + esc(r.provider) + " " + "★".repeat(r.stars) + '</div>';
      var times = vertical === "flights"
        ? '<div class="times"><b>' + pad(Math.floor(r.dep / 60)) + ":" + pad(r.dep % 60) + '</b>' +
          '<span class="dur">' + Math.floor(r.dur / 60) + "h " + (r.dur % 60) + "m</span>" +
          '<b>' + pad(Math.floor(r.arr / 60)) + ":" + pad(r.arr % 60) + (r.arr < r.dep ? " +1" : "") + "</b></div>"
        : '<div class="times"><span class="dur">' + esc(r.area) + '</span></div>';
      var meta = '<div class="meta"><span>' + esc(r.bags) + "</span><span>" + (r.stops ? "1 stop" : "Direct") + "</span><span>" + (r.refund ? "Refundable" : "Non-refundable") + "</span><span>" + badge + "</span></div>";
      if (vertical !== "flights") meta = '<div class="meta"><span>' + esc(r.bags) + "</span><span>" + (r.refund ? "Free cancellation" : "Non-refundable") + "</span><span>" + badge + "</span></div>";
      var msg = waMessage(vertical, q, r);
      return '<article class="offer" data-price="' + r.price + '" data-dur="' + r.dur + '" data-stops="' + r.stops + '" data-refund="' + (r.refund ? 1 : 0) + '">' +
        '<div class="logo">' + esc(logo) + "</div>" +
        "<div>" + title + times + meta + "</div>" +
        '<div class="right"><div class="price">' + money(r.price) + '<small>per person, incl. service fee</small></div>' +
        '<a class="btn btn-primary btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + WHATSAPP + "?text=" + encodeURIComponent(msg) + '">Book on WhatsApp</a></div>' +
        "</article>";
    }).join("");
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function waMessage(vertical, q, r) {
    var lines = ["*TravelHub quote request*", ""];
    if (vertical === "flights") {
      lines.push("Route: " + q.from + " → " + q.to);
      lines.push("Trip: " + (q.trip === "one" ? "One way" : "Round trip"));
      lines.push("Depart: " + q.dep + (q.ret && q.trip !== "one" ? "  Return: " + q.ret : ""));
      lines.push("Passengers: " + (q.pax || 1) + " · " + (q.cabin || "economy"));
      lines.push("Selected: " + r.provider + (r.stops ? " (1 stop)" : " (direct)"));
    } else if (vertical === "stays") {
      lines.push("City: " + (q.to || q.city));
      lines.push("Check-in: " + q.dep + "  Check-out: " + (q.ret || q.dep));
      lines.push("Guests: " + (q.pax || 2));
      lines.push("Selected: " + r.provider + " (" + r.stars + " star, " + r.area + ")");
    } else {
      lines.push("Service: " + vertical);
      lines.push("Destination: " + (q.to || q.city || ""));
      lines.push("Dates: " + (q.dep || "") + (q.ret ? " → " + q.ret : ""));
    }
    lines.push("Indicative price shown: " + money(r.price));
    lines.push("");
    lines.push("Please confirm availability and the final fare.");
    return lines.join("\n");
  }

  function initResults() {
    var host = $("[data-results]");
    if (!host) return;
    var q = {};
    new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; });
    q.type = q.type || "flights";
    var vertical = q.type === "stays" ? "stays" : q.type === "cars" ? "cars" : "flights";

    var rows = vertical === "stays" ? demoStays(q) : demoFlights(q);
    var cheapest = rows.reduce(function (m, r) { return r.price < m ? r.price : m; }, Infinity);

    /* header */
    var title = $("[data-res-title]"), sub = $("[data-res-sub]");
    if (vertical === "flights") {
      title.textContent = cityOf(q.from).city + " → " + cityOf(q.to).city;
      sub.innerHTML = "<span>" + fmtDate(q.dep) + (q.ret && q.trip !== "one" ? " – " + fmtDate(q.ret) : "") + "</span>" +
        "<span>" + (q.pax || 1) + " passenger" + ((q.pax || 1) > 1 ? "s" : "") + "</span>" +
        "<span>" + esc((q.cabin || "economy")) + "</span>" +
        "<span>from <b>" + money(cheapest) + "</b></span>";
    } else {
      title.textContent = (q.to || "City") + " stays";
      sub.innerHTML = "<span>" + fmtDate(q.dep) + " – " + fmtDate(q.ret || q.dep) + "</span><span>" + (q.pax || 2) + " guests</span><span>from <b>" + money(cheapest) + "</b></span>";
    }

    /* partner comparison (real, no key needed) */
    var partners = vertical === "stays" ? HOTELS : vertical === "cars" ? CARS : FLIGHTS;
    var pq = { from: q.from, to: q.to, city: cityOf(q.to).city, dep: q.dep, ret: q.ret, pax: q.pax, country: cityOf(q.to).country };
    $("[data-partners]").innerHTML = partners.map(function (p) {
      return '<a class="offer" style="grid-template-columns:44px minmax(0,1fr) auto;text-decoration:none" href="' + esc(partnerLink(p[1], pq)) + '" target="_blank" rel="noopener">' +
        '<div class="logo" style="background:#fff;border:1px solid var(--line);font-size:.62rem">' + esc(p[0].slice(0, 6)) + "</div>" +
        '<div><div class="route">' + esc(p[0]) + ' <span class="badge partner" style="margin-left:6px">Partner price</span></div>' +
        '<div class="meta"><span>You pay ' + esc(p[0]) + ' directly — no fee added by us</span></div></div>' +
        '<div class="right"><div class="price" style="font-size:1rem">Open</div><span class="btn btn-ghost btn-sm">Compare</span></div></a>';
    }).join("");

    $("[data-offers]").innerHTML = renderOffers(rows, vertical, q);
    var cnt0 = $("[data-count]");
    if (cnt0) cnt0.textContent = rows.length + " fares shown · cheapest " + money(cheapest);

    /* sort + filters */
    var sortSel = $("[data-sort]");
    function applySort() {
      var cards = $$("[data-offers] .offer");
      var mode = sortSel.value;
      cards.sort(function (a, b) {
        if (mode === "price") return +a.dataset.price - +b.dataset.price;
        if (mode === "duration") return +a.dataset.dur - +b.dataset.dur;
        if (mode === "stops") return +a.dataset.stops - +b.dataset.stops;
        if (mode === "refund") return +b.dataset.refund - +a.dataset.refund;
        return 0;
      });
      var box = $("[data-offers]");
      cards.forEach(function (c) { box.appendChild(c); });
    }
    if (sortSel) sortSel.addEventListener("change", applySort);
    $$("[data-filter]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var cards = $$("[data-offers] .offer");
        var direct = $('[data-filter="direct"]').checked;
        var refund = $('[data-filter="refund"]').checked;
        var maxEl = $('[data-filter="max"]');
        var max = maxEl ? +maxEl.value || Infinity : Infinity;
        var shown = 0;
        cards.forEach(function (c) {
          var hide = (direct && c.dataset.stops !== "0") || (refund && c.dataset.refund !== "1") || (+c.dataset.price > max);
          c.style.display = hide ? "none" : "";
          if (!hide) shown++;
        });
        var cnt = $("[data-count]");
        if (cnt) cnt.textContent = shown + " of " + cards.length + " fares shown";
      });
    });

    /* price calendar */
    var calHost = $("[data-calendar]");
    if (calHost) {
      var base0 = new Date(q.dep + "T00:00:00");
      if (isNaN(base0)) base0 = addDays(new Date(), 21);
      var html = "";
      for (var d = -2; d <= 5; d++) {
        var dt = addDays(base0, d);
        var p = price(rnd(q.from + q.to + iso(dt), 150, 720));
        html += '<button type="button" class="' + (d === 0 ? "on" : "") + '" data-day="' + iso(dt) + '" data-price="' + p + '">' +
          '<span class="d">' + dt.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }) + "</span>" +
          '<span class="p">' + money(p) + "</span></button>";
      }
      calHost.innerHTML = html;
      calHost.addEventListener("click", function (e) {
        var b = e.target.closest("[data-day]");
        if (!b) return;
        $$("[data-day]", calHost).forEach(function (x) { x.classList.toggle("on", x === b); });
        var u = new URL(location.href);
        u.searchParams.set("dep", b.getAttribute("data-day"));
        location.href = u.toString();
      });
    }

    var stamp = $("[data-stamp]");
    if (stamp) stamp.textContent = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
    if (window.TravelDemo) window.TravelDemo.done = true;
  }

  /* ---------- AI planner (rules engine, no key needed) ---------- */
  function initPlanner() {
    var form = $("[data-planner]");
    if (!form) return;
    var out = $("[data-plan-out]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (form.querySelector('[name="brief"]').value || "").toLowerCase();
      var budget = parseInt(form.querySelector('[name="budget"]').value || "0", 10);
      var days = parseInt(form.querySelector('[name="days"]').value || "5", 10);
      var to = "";
      AIRPORTS.forEach(function (a) { if (text.indexOf(a.city.toLowerCase()) > -1 && !to) to = a.code; });
      var vibes = [];
      ["family", "beach", "shopping", "umrah", "business", "honeymoon", "adventure", "budget"].forEach(function (v) {
        if (text.indexOf(v) > -1) vibes.push(v);
      });
      if (!to) {
        var m = text.match(/to\s+([a-z\s]{3,20})/);
        if (m) {
          var guess = m[1].trim();
          AIRPORTS.forEach(function (a) { if (a.city.toLowerCase().indexOf(guess.split(" ")[0]) > -1 && !to) to = a.code; });
        }
      }
      if (!to) { out.innerHTML = '<div class="notice">I could not find a destination. Try: “5 days in Dubai in December for a family of four, budget $900”.</div>'; return; }
      var c = cityOf(to);
      var perDay = budget ? Math.round(budget / Math.max(1, days)) : 120;
      var plan = {
        to: c.code,
        dep: iso(addDays(new Date(), 21)),
        ret: iso(addDays(new Date(), 21 + days)),
        hotel: vibes.indexOf("budget") > -1 ? "3-star city hotel" : vibes.indexOf("honeymoon") > -1 ? "5-star with a view" : "4-star central hotel",
        nightly: Math.max(35, Math.round(perDay * 0.55))
      };
      var acts = {
        beach: ["Beach morning + sunset walk", "Boat trip or snorkelling", "Seafront dinner"],
        shopping: ["Mall of the Emirates / Dubai Mall", "Gold souk", "Local market walk"],
        family: ["Theme park day", "Aquarium or zoo", "Park + picnic evening"],
        umrah: ["Umrah with a licensed operator", "Ziyarat tour", "Rest day near the Haram"],
        business: ["Client meetings downtown", "Co-working morning", "Airport transfer buffer"],
        honeymoon: ["Couples spa", "Rooftop dinner", "Desert sunset"],
        adventure: ["Desert safari", "Hiking or dune drive", "Water sports"],
        budget: ["Free walking tour", "Public transport day pass", "Street food evening"]
      };
      var chosen = [];
      vibes.forEach(function (v) { if (acts[v]) chosen = chosen.concat(acts[v]); });
      if (!chosen.length) chosen = acts.beach.concat(acts.shopping).slice(0, 4);
      var fare = price(rnd("plan" + c.code + days, 180, 560));
      var hotelTotal = price(plan.nightly * days);
      var left = budget - fare - hotelTotal;
      var leftLabel = left < 0 ? "Over budget by" : "Budget left for food &amp; activities";
      var leftValue = money(Math.abs(left));
      out.innerHTML = '<div class="card" style="border-color:#cfe0d5">' +
        "<h3>" + c.flag + " " + esc(c.city) + " · " + days + " days</h3>" +
        '<p style="margin-bottom:10px">A starting plan built from your brief. Prices are indicative and become firm only after a supplier confirms.</p>' +
        '<div class="grid-3" style="margin:14px 0">' +
        '<div><div class="hint">Flights (return)</div><b style="font-family:var(--display);font-size:1.1rem">' + money(fare) + "</b></div>" +
        '<div><div class="hint">Stay · ' + esc(plan.hotel) + "</div><b style=\"font-family:var(--display);font-size:1.1rem\">" + money(hotelTotal) + " total</b></div>" +
        '<div><div class="hint">' + leftLabel + '</div><b style="font-family:var(--display);font-size:1.1rem;color:' + (left < 0 ? "var(--sale)" : "var(--teal)") + '">' + leftValue + "</b></div>" +
        "</div><h3 style=\"font-size:.95rem\">Suggested days</h3><ol>" +
        chosen.slice(0, days).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ol>" +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
        '<a class="btn btn-primary" href="' + BASE + "/results/?type=flights&from=KHI&to=" + plan.to + "&dep=" + plan.dep + "&ret=" + plan.ret + "&pax=2&cabin=economy&trip=round" + '">Search these flights</a>' +
        '<a class="btn btn-ghost" href="' + BASE + "/results/?type=stays&to=" + plan.to + "&dep=" + plan.dep + "&ret=" + plan.ret + "&pax=2" + '">Compare stays</a>' +
        "</div></div>";
    });
  }

  /* ---------- quote forms ---------- */
  function initQuote() {
    var search = new URLSearchParams(location.search);
    $$("[data-quote]").forEach(function (f) {
      if (location.hash === "#travel-quote") {
        f.id = "travel-quote";
        [["Country", search.get("city")], ["Travel", search.get("dep")],
          ["Travellers", search.get("pax")], ["Month", (search.get("dep") || "").slice(0, 7)]].forEach(function (entry) {
          if (f.elements[entry[0]] && entry[1]) f.elements[entry[0]].value = entry[1];
        });
        f.scrollIntoView();
      }
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var d = new FormData(f);
        var lines = ["*" + (f.dataset.quote || "Travel") + " request*", ""];
        d.forEach(function (v, k) { if (v) lines.push(k + ": " + v); });
        lines.push("", "Sent from sastamilaga.com/travel");
        window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    $$("[data-search-form]").forEach(initSearchForm);
    initResults();
    initPlanner();
    initQuote();
  });
})();
