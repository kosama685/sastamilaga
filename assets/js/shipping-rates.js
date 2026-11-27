/*!
 * Sasta Milaga — shipping rate engine.
 *
 * Reads data/shipping/couriers.json (published rate-card snapshots for PostEx, TCS,
 * Leopards, M&P, Trax, Blue-EX, SMSA, Aramex, Naqel) and answers two questions:
 *   1. what will the courier cost us for this weight and destination, and
 *   2. what do we charge the customer, given the store rules
 *      (free over Rs 2,500, otherwise Rs 199 in Pakistan, COD fee included).
 *
 * The estimate is for display and for the checkout preview. Before capturing payment
 * the server must re-quote against the carrier API — see quoteShipping()'s `binding`
 * flag and data/shipping/couriers.json → authoritativeNote.
 */
(function (root) {
  "use strict";

  var CACHE_KEY = "sm.shipping.rates.v1";
  var CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  var DATA_URL = "/data/shipping/couriers.json";
  var table = null;
  var loading = null;

  function now() { return Date.now(); }

  function readCache() {
    try {
      var raw = root.localStorage && root.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var hit = JSON.parse(raw);
      if (!hit || now() - hit.at > CACHE_TTL_MS) return null;
      return hit.data;
    } catch (e) { return null; }
  }

  function writeCache(data) {
    try { root.localStorage && root.localStorage.setItem(CACHE_KEY, JSON.stringify({ at: now(), data: data })); } catch (e) { }
  }

  function load() {
    if (table) return Promise.resolve(table);
    var cached = readCache();
    if (cached) { table = cached; return Promise.resolve(table); }
    if (loading) return loading;
    loading = fetch(DATA_URL, { credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("shipping table " + r.status); return r.json(); })
      .then(function (json) { table = json; writeCache(json); loading = null; return json; })
      .catch(function (err) { loading = null; throw err; });
    return loading;
  }

  function norm(s) {
    return String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  /** Map a city to a courier zone; unknown cities fall to the widest zone so we never under-quote. */
  function zoneFor(country, city) {
    var c = String(country || "PK").toUpperCase();
    var zones = (table && table.zones && table.zones[c]) || null;
    if (!zones) return "D";
    var key = norm(city);
    var order = ["A", "B", "C", "D"];
    for (var i = 0; i < order.length; i++) {
      var list = zones[order[i]] || [];
      for (var j = 0; j < list.length; j++) if (norm(list[j]) === key) return order[i];
    }
    return "D";
  }

  function slabFor(carrier, weightKg) {
    var w = Math.max(0.1, Number(weightKg) || 0.5);
    var slabs = carrier.slabs || [];
    for (var i = 0; i < slabs.length; i++) if (w <= slabs[i].maxKg) return slabs[i];
    // Above the last published slab: bill the last slab plus excess at its per-kg rate.
    var last = slabs[slabs.length - 1];
    if (!last) return null;
    var perKg = (last.A || 0) / last.maxKg;
    var copy = Object.assign({}, last);
    copy.excessKg = w - last.maxKg;
    copy.excessRate = Math.round(perKg);
    return copy;
  }

  function carrierCost(carrier, zone, weightKg) {
    var slab = slabFor(carrier, weightKg);
    if (!slab) return null;
    var base = Number(slab[zone] != null ? slab[zone] : slab.D) || 0;
    var excess = slab.excessKg ? Math.round(slab.excessKg * slab.excessRate) : 0;
    return { freight: base + excess, excess: excess };
  }

  /**
   * Quote every carrier for a shipment and return them cheapest-first.
   * @param {{country?:string, city:string, weightKg:number, subtotal?:number, cod?:boolean}} opts
   * @returns {Promise<{country:string, zone:string, options:Array, storeCharge:number|null, cheapest:Object|null, binding:boolean}>}
   */
  function quoteShipping(opts) {
    opts = opts || {};
    return load().then(function (data) {
      var country = String(opts.country || "PK").toUpperCase();
      var zone = zoneFor(country, opts.city);
      var weight = Number(opts.weightKg) || 0.5;
      var isPk = country === "PK";
      var carriers = isPk ? (data.domesticPk || []) : (data.gulf || []).filter(function (c) { return c.country === country || country === "GCC"; });

      var options = carriers.map(function (c) {
        var cost = carrierCost(c, zone, weight);
        if (!cost) return null;
        var codFee = 0;
        if (opts.cod && c.supportsCod) {
          var declared = Number(opts.subtotal) || 0;
          codFee = Math.max(Number(c.codFeeMin) || 0, Math.round(declared * (Number(c.codFeePercent) || 0) / 100));
        }
        return {
          id: c.id,
          name: c.name,
          currency: c.currency || data.currency || "PKR",
          zone: zone,
          freight: cost.freight,
          codFee: codFee,
          total: cost.freight + codFee,
          supportsCod: !!c.supportsCod,
          hasApi: !!c.api,
          api: c.api || null
        };
      }).filter(Boolean).sort(function (a, b) { return a.total - b.total; });

      var rules = data.storeRules || {};
      var storeCharge = null;
      if (isPk) {
        var subtotal = Number(opts.subtotal);
        storeCharge = isNaN(subtotal) ? null
          : (subtotal >= (rules.freeShippingThresholdPk || 2500) ? 0 : (rules.flatBelowThresholdPk || 199));
      }

      return {
        country: country,
        zone: zone,
        weightKg: weight,
        options: options,
        cheapest: options[0] || null,
        storeCharge: storeCharge,
        binding: false,
        note: "Estimate from the published rate card. The binding rate is the carrier API response at booking."
      };
    });
  }

  /** Honest margin check: does the flat fee still cover the cheapest carrier after the COD cut? */
  function checkFlatFee(opts) {
    return quoteShipping(opts).then(function (q) {
      if (!q.cheapest || q.storeCharge == null) return { ok: null, quote: q };
      var margin = q.storeCharge - q.cheapest.total;
      return {
        ok: margin >= 0,
        margin: margin,
        charged: q.storeCharge,
        courierCost: q.cheapest.total,
        carrier: q.cheapest.name,
        note: margin >= 0
          ? "The flat fee covers the cheapest carrier."
          : "The flat fee is below the cheapest carrier cost — raise the fee or require a basket minimum."
      };
    });
  }

  function reset() { table = null; loading = null; try { root.localStorage.removeItem(CACHE_KEY); } catch (e) { } }

  var api = { load: load, zoneFor: zoneFor, quoteShipping: quoteShipping, checkFlatFee: checkFlatFee, reset: reset };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.SMShipping = api;
})(typeof window !== "undefined" ? window : globalThis);
