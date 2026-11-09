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
      }
      var per = db.perPage || 60, page = Math.max(1, +p.get('page') || 1), pages = Math.max(1, Math.ceil(items.length / per));
      return { total: items.length, pages: pages, items: items.slice((page - 1) * per, page * per) };
    });
  }

  function timed(input, init, ms) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms);
    return realFetch(input, Object.assign({}, init, { signal: c.signal })).finally(function () { clearTimeout(t); });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var u; try { u = new URL(url, location.href); } catch (e) { return realFetch(input, init); }
    if (/\/wp-json\/sm-travel\/v1\/suggest\/?$/.test(u.pathname)) return airports(u.searchParams.get('q') || '').then(json);
    var tvLocal = window.SM_CONFIG && window.SM_CONFIG.liveTvSnapshot;
    if (tvLocal && /\/wp-json\/sltv\/v1\/(channels|facets)\/?$/.test(u.pathname)) {
      if (u.searchParams.get('_refresh')) {
        return timed(input, init, 20000).then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
          .catch(function () { return channels(u).then(json); });
      }
      return channels(u).then(json);
    }
    return realFetch(input, init);
  };
  window.SMLocalApi = { airports: airports, channels: function (qs) { return channels(new URL('https://x/wp-json/sltv/v1/channels?' + (qs || ''))); } };
})();
