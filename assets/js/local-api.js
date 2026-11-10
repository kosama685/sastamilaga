/* Local data layer for the static site.
 * - Flight airport suggestions (sm-travel/v1/suggest) are answered from data/travel/airports.js (OurAirports, public domain).
 * - Live TV listings (sltv/v1/channels, sltv/v1/facets) are answered from data/livetv/channels.js, a snapshot of the
 *   approved channel list published by sastamilaga.com. Stream-access refreshes still try the live API first.
 * Every other request goes to the network unchanged. Hotel city lookups stay on the live API because the booking
 * partner needs its own city IDs. */
(function () {
  'use strict';
  var base = (document.currentScript && document.currentScript.src.replace(/assets\/js\/local-api\.js.*$/, '')) || '';
  var realFetch = window.fetch.bind(window);
  var loads = {};
  function load(path, key) {
    if (window[key]) return Promise.resolve(window[key]);
    if (!loads[path]) loads[path] = new Promise(function (ok, fail) {
      var s = document.createElement('script'); s.src = base + path; s.async = true;
      s.onload = function () { window[key] ? ok(window[key]) : fail(new Error('empty ' + path)); };
      s.onerror = function () { delete loads[path]; fail(new Error('load ' + path)); };
      document.head.appendChild(s);
    });
    return loads[path];
  }
  function json(data) { return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } }); }
  function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  function airports(q) {
    return load('data/travel/airports.js', 'SM_AIRPORTS').then(function (rows) {
      var f = fold(q).trim(), up = q.trim().toUpperCase(), hits = [];
      rows.forEach(function (r) {
        var city = fold(r[1]), name = fold(r[2]), country = fold(r[3]), score;
        if (r[0] === up) score = 0;
        else if (city === f) score = 0.5;
        else if (city.indexOf(f) === 0) score = 1;
        else if (name.indexOf(f) === 0) score = 2;
        else if (city.indexOf(f) > 0 || name.indexOf(f) > 0) score = 3;
        else if (country.indexOf(f) === 0) score = 4;
        else return;
        hits.push([score, r[6], r]);
      });
      hits.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
      return hits.slice(0, 8).map(function (h) {
        var r = h[2], short = r[2].replace(/\s+(International\s+)?Airport$/i, '');
        return { code: r[0], label: r[1] + ' – ' + short + ' (' + r[0] + '), ' + r[3], name: r[1], latitude: r[4], longitude: r[5] };
      });
    });
  }

  function channels(u) {
    return load('data/livetv/channels.js', 'SM_LIVETV').then(function (db) {
      if (/\/facets\/?$/.test(u.pathname)) return db.facets;
      var p = u.searchParams, items = db.items;
      if (p.get('ids')) { var ids = p.get('ids').split(',').map(Number); items = items.filter(function (c) { return ids.indexOf(c.id) >= 0; }); }
      else {
        var q = fold(p.get('q')).trim(), cc = p.get('country'), cat = p.get('category');
        items = items.filter(function (c) { return (!cc || c.cc === cc) && (!cat || c.cat === cat) && (!q || fold(c.name).indexOf(q) >= 0); });
        // Unfiltered list: the visitor's chosen country first, then widely watched countries; channels that play in the
        // browser before external-only ones. Stable, so the playlist order is kept within each group.
        if (!cc && !q) {
          var home = 'PK'; try { home = (JSON.parse(localStorage.getItem('sm_market') || '{}').country || 'PK'); } catch (e) {}
          var pref = [home, 'PK', 'GB', 'US', 'AE', 'SA', 'IN', 'QA', 'TR'];
          // Within a country: channels that passed the browser test first, VLC-only next, unreachable (maybe offline) last.
          var rank = function (c) { var i = pref.indexOf(c.cc); return (i < 0 ? 99 : i) * 3 + (c.chk === 'fail' ? 2 : c.ext ? 1 : 0); };
          items = items.map(function (c, i) { return [rank(c), i, c]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; }).map(function (x) { return x[2]; });
        }
      }
      var per = db.perPage || 60, page = Math.max(1, +p.get('page') || 1), pages = Math.max(1, Math.ceil(items.length / per));
      return { total: items.length, pages: pages, items: items.slice((page - 1) * per, page * per) };
    });
  }

  function timed(input, init, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms), outer = init && init.signal;
    if (outer) { if (outer.aborted) c.abort(); else outer.addEventListener('abort', function () { c.abort(); }, { once: true }); }
    return realFetch(input, Object.assign({}, init, { signal: c.signal })).finally(function () { clearTimeout(t); });
  }

  /* Hotel city search depends on the booking partner's city IDs (live API). When it is unavailable, offer a
     WhatsApp hotel request with the typed city instead of inventing a city code. */
  function hotelNote(city) {
    var field = document.querySelector('.sm-hotel-suggest'); if (!field) return;
    var note = field.parentNode.querySelector('.sm-hotel-fallback');
    if (!city) { if (note) note.remove(); return; }
    if (!note) { note = document.createElement('p'); note.className = 'sm-hotel-fallback'; note.setAttribute('role', 'status'); field.insertAdjacentElement('afterend', note); }
    var form = field.closest('form'), val = function (n) { var e = form && form.querySelector('[name="' + n + '"]'); return e && e.value ? e.value : ''; };
    var msg = 'Assalam o Alaikum! I need a hotel.\nCity: ' + city + (val('checkin') ? '\nCheck-in: ' + val('checkin') : '') + (val('checkout') ? '\nCheck-out: ' + val('checkout') : '') + (val('adults') ? '\nAdults: ' + val('adults') : '');
    var num = (window.SM_CONFIG && window.SM_CONFIG.whatsapp) || '966510451995';
    note.innerHTML = 'City search is not responding right now. <a target="_blank" rel="noopener">Send your hotel request for “' + city.replace(/[<>&"]/g, '') + '” on WhatsApp</a> and we will reply with options.';
    note.querySelector('a').href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  }
  var hcss = document.createElement('style');
  hcss.textContent = '.sm-hotel-fallback{margin:6px 0 0;font-size:13px;line-height:1.5;color:#4b5563}.sm-hotel-fallback a{color:#128c4a;font-weight:600}.sm-hotel-fallback a:focus-visible{outline:2px solid #128c4a;outline-offset:2px}';
  document.head.appendChild(hcss);

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var u; try { u = new URL(url, location.href); } catch (e) { return realFetch(input, init); }
    if (/\/wp-json\/sm-travel\/v1\/suggest\/?$/.test(u.pathname)) return airports(u.searchParams.get('q') || '').then(json);
    if (/\/wp-json\/sm-travel\/v1\/hotel-suggest\/?$/.test(u.pathname)) {
      var city = u.searchParams.get('q') || '';
      hotelNote(null);
      return timed(input, init, 15000).then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
        .catch(function (e) { if (init && init.signal && init.signal.aborted) throw e; hotelNote(city); return json([]); });
    }
    var tvLocal = window.SM_CONFIG && window.SM_CONFIG.liveTvSnapshot;
    if (tvLocal && /\/wp-json\/sltv\/v1\/(channels|facets)\/?$/.test(u.pathname)) {
      // The local list (Free-TV playlist) is the source of truth: refresh requests are answered locally too.
      return channels(u).then(json);
    }
    return realFetch(input, init);
  };
  /* "Download playlist" links on the Live TV page pointed at the WordPress API (slow, often down). Build the .m3u here instead. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href*="/wp-json/sltv/v1/m3u"]'); if (!a) return;
    e.preventDefault();
    var q = new URL(a.href.replace(/&#038;/g, '&')).searchParams, cc = q.get('country'), cat = q.get('category');
    load('data/livetv/channels.js', 'SM_LIVETV').then(function (db) {
      var items = db.items.filter(function (c) { return c.src && (!cc || c.cc === cc) && (!cat || c.cat === cat); });
      var text = '#EXTM3U\n' + items.map(function (c) { return '#EXTINF:-1 tvg-logo="' + (c.logo || '') + '" group-title="' + (c.cat || '') + '",' + c.name + '\n' + (c.page || c.src); }).join('\n') + '\n';
      var b = document.createElement('a'); b.href = URL.createObjectURL(new Blob([text], { type: 'audio/x-mpegurl' }));
      b.download = 'sasta-milaga-' + (cc || cat || 'all').toLowerCase() + '.m3u'; document.body.appendChild(b); b.click(); b.remove();
    });
  });
  window.SMLocalApi = { airports: airports, channels: function (qs) { return channels(new URL('https://x/wp-json/sltv/v1/channels?' + (qs || ''))); } };
})();
