/* Sasta Milaga storefront: basket, WhatsApp checkout, search, currency, gallery. No dependencies. */
(function () {
  "use strict";
  var WHATSAPP = "966510451995";
  var RATES = { PKR: 1, SAR: 0.0134, AED: 0.0131, USD: 0.00357 };
  var SYM = { PKR: "Rs", SAR: "SAR", AED: "AED", USD: "$" };
  var FREE = 2500, FEE = 199;

  function currency() { return localStorage.getItem("sm_cur") || "PKR"; }
  function money(pkr, cur) {
    cur = cur || currency();
    var v = pkr * RATES[cur];
    if (cur === "PKR") return "Rs " + Math.round(v).toLocaleString("en-PK");
    var d = v >= 100 ? 0 : 2;
    return SYM[cur] + " " + v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function paintMoney() {
    var cur = currency();
    document.querySelectorAll("[data-pkr]").forEach(function (el) {
      var n = parseFloat(el.getAttribute("data-pkr"));
      if (!isNaN(n)) el.textContent = money(n, cur);
    });
    document.querySelectorAll("select[data-currency]").forEach(function (s) { s.value = cur; });
  }

  /* basket */
  function read() { try { return JSON.parse(localStorage.getItem("sm_cart") || "[]"); } catch (e) { return []; } }
  function write(items) { localStorage.setItem("sm_cart", JSON.stringify(items)); paintCart(); paintCartPage(); syncBadge(); }
  function count() { return read().reduce(function (n, i) { return n + i.qty; }, 0); }
  function subtotal() { return read().reduce(function (n, i) { return n + i.price * i.qty; }, 0); }
  function delivery(sub) { return sub === 0 ? 0 : (sub >= FREE ? 0 : FEE); }
  function syncBadge() {
    var n = count();
    document.querySelectorAll("[data-cart-count]").forEach(function (b) { b.textContent = n; b.hidden = n === 0; });
  }
  function add(item) {
    var items = read();
    var hit = items.filter(function (i) { return i.slug === item.slug; })[0];
    if (hit) hit.qty = Math.min(hit.qty + (item.qty || 1), 99);
    else items.push({ slug: item.slug, title: item.title, price: item.price, img: item.img, qty: item.qty || 1 });
    write(items); toast("Added to basket"); openDrawer();
  }
  function toast(msg) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }
  function openDrawer() {
    var d = document.querySelector("[data-drawer]"), s = document.querySelector("[data-scrim]");
    if (d) { d.classList.add("on"); d.setAttribute("aria-hidden", "false"); }
    if (s) { s.classList.add("on"); s.hidden = false; }
    document.documentElement.style.overflow = "hidden";
  }
  function closeDrawer() {
    var d = document.querySelector("[data-drawer]"), s = document.querySelector("[data-scrim]");
    if (d) { d.classList.remove("on"); d.setAttribute("aria-hidden", "true"); }
    if (s) s.classList.remove("on");
    document.documentElement.style.overflow = "";
  }
  function itemRow(i, idx) {
    return '<div class="line-item">' +
      '<a href="/product/' + i.slug + '/"><img src="' + i.img + '" alt="" loading="lazy" width="64" height="64"></a>' +
      '<div><a class="t" href="/product/' + i.slug + '/">' + i.title + '</a>' +
      '<div class="p">' + money(i.price) + '</div>' +
      '<button class="rm" type="button" data-rm="' + idx + '">Remove</button></div>' +
      '<div style="text-align:right"><b>' + money(i.price * i.qty) + '</b>' +
      '<div class="qty" style="margin-top:6px"><button type="button" data-dec="' + idx + '" aria-label="Reduce">−</button>' +
      '<input value="' + i.qty + '" readonly aria-label="Quantity"><button type="button" data-inc="' + idx + '" aria-label="Increase">+</button></div></div></div>';
  }
  function paintCart() {
    var body = document.querySelector("[data-drawer-body]");
    var foot = document.querySelector("[data-drawer-foot]");
    var items = read();
    if (body) {
      body.innerHTML = items.length
        ? items.map(itemRow).join("")
        : '<p class="empty">Your basket is empty.<br><br><a class="btn btn-primary" href="/categories/">Browse all categories</a></p>';
    }
    if (foot) {
      var sub = subtotal(), del = delivery(sub);
      foot.innerHTML = '<div class="totals"><span>Subtotal</span><b>' + money(sub) + '</b></div>' +
        '<div class="totals"><span>Delivery</span><span>' + (sub === 0 ? "—" : (del === 0 ? "Free" : money(del))) + '</span></div>' +
        '<div class="totals grand"><span>Total</span><b>' + money(sub + del) + '</b></div>' +
        '<a class="btn btn-primary btn-block" href="/cart/">Checkout · Cash on Delivery</a>';
    }
  }
  function paintCartPage() {
    var host = document.querySelector("[data-cart-page]");
    if (!host) return;
    var items = read();
    if (!items.length) {
      host.innerHTML = '<p class="empty">Your basket is empty.<br><br><a class="btn btn-primary" href="/categories/">Start shopping</a></p>';
      var side = document.querySelector("[data-cart-side]");
      if (side) side.hidden = true;
      return;
    }
    host.innerHTML = items.map(itemRow).join("") +
      '<p class="muted" style="margin-top:16px">Prices include applicable taxes. Cash is collected by the courier on delivery.</p>';
    var sum = document.querySelector("[data-sum]");
    if (sum) {
      var sub = subtotal(), del = delivery(sub);
      sum.innerHTML = '<div class="totals"><span>Subtotal</span><b>' + money(sub) + '</b></div>' +
        '<div class="totals"><span>Delivery</span><span>' + (del === 0 ? "Free" : money(del)) + '</span></div>' +
        '<div class="totals grand"><span>Total</span><b>' + money(sub + del) + '</b></div>' +
        '<p class="muted">Confirmed on WhatsApp before dispatch.</p>';
    }
  }

  /* order handoff */
  function placeOrder() {
    var items = read();
    if (!items.length) { toast("Your basket is empty"); return; }
    var f = document.querySelector("[data-order-form]");
    var get = function (n) { var el = f && f.querySelector('[name="' + n + '"]'); return el ? el.value.trim() : ""; };
    var name = get("name"), phone = get("phone"), city = get("city"), addr = get("address"), note = get("notes"), country = get("country") || "Pakistan";
    if (!name || !phone || !city || !addr) { toast("Please complete name, phone, city and address"); return; }
    if (phone.replace(/\D/g, "").length < 10) { toast("Please enter a valid phone number"); return; }
    var sub = subtotal(), del = delivery(sub), total = sub + del;
    var lines = ["*New COD order — sastamilaga.com*", "", "Name: " + name, "Phone: " + phone, "City: " + city, "Country: " + country, "Address: " + addr];
    if (note) lines.push("Note: " + note);
    lines.push("", "*Items*");
    items.forEach(function (i) { lines.push("• " + i.title + " ×" + i.qty + " — Rs " + (i.price * i.qty).toLocaleString("en-PK")); });
    lines.push("", "Subtotal: Rs " + sub.toLocaleString("en-PK"), "Delivery: " + (del === 0 ? "Free" : "Rs " + del));
    lines.push("*Total (COD): Rs " + total.toLocaleString("en-PK") + "*", "", "Payment: Cash on Delivery");
    window.open("https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
    toast("Order summary opened in WhatsApp — press send to confirm");
  }

  /* search */
  var idx = null, loading = null;
  function loadIndex() {
    if (idx) return Promise.resolve(idx);
    if (loading) return loading;
    loading = fetch("/assets/data/search-manifest.json").then(function (r) { return r.json(); })
      .then(function (man) {
        return Promise.all(man.shards.map(function (s) {
          return fetch("/assets/data/" + s).then(function (r) { return r.json(); });
        }));
      }).then(function (parts) {
        idx = parts.reduce(function (a, b) { return a.concat(b); }, []);
        return idx;
      }).catch(function () { idx = []; return idx; });
    return loading;
  }
  function runSearch(q, host) {
    q = (q || "").trim().toLowerCase();
    if (q.length < 2) { host.innerHTML = ""; return; }
    host.innerHTML = '<p class="muted">Searching…</p>';
    loadIndex().then(function (data) {
      var hits = [];
      for (var i = 0; i < data.length; i++) {
        var it = data[i], t = it.t.toLowerCase(), s = 0;
        if (t.indexOf(q) === 0) s = 3;
        else if (t.indexOf(q) > -1) s = 2;
        else if ((it.c || "").toLowerCase().indexOf(q) > -1) s = 1;
        if (s) hits.push({ it: it, s: s });
        if (hits.length > 800) break;
      }
      hits.sort(function (a, b) { return b.s - a.s; });
      hits = hits.slice(0, 36);
      if (!hits.length) { host.innerHTML = '<p class="muted">No matches for “' + q + '”. Try a shorter word or <a href="/categories/">browse categories</a>.</p>'; return; }
      host.innerHTML = hits.map(function (h) {
        return '<a class="card" href="/product/' + h.it.slug + '/">' +
          '<span class="card-media"><img src="' + h.it.img + '" alt="" loading="lazy" width="300" height="300"></span>' +
          '<span class="card-body"><span class="card-cat">' + (h.it.c || "") + '</span>' +
          '<span class="card-title">' + h.it.t + '</span>' +
          '<span class="card-price"><b>' + money(h.it.p) + '</b></span></span></a>';
      }).join("");
    });
  }

  /* events */
  document.addEventListener("click", function (e) {
    var el;
    if ((el = e.target.closest("[data-add]"))) {
      e.preventDefault();
      var qtyInput = document.querySelector("[data-qty-input]");
      add({
        slug: el.getAttribute("data-slug"), title: el.getAttribute("data-title"),
        price: parseFloat(el.getAttribute("data-price")), img: el.getAttribute("data-img"),
        qty: qtyInput ? (parseInt(qtyInput.value, 10) || 1) : 1
      });
      return;
    }
    if (e.target.closest("[data-open-cart]")) { e.preventDefault(); openDrawer(); return; }
    if (e.target.closest("[data-close-cart]") || e.target.closest("[data-scrim]")) { closeDrawer(); return; }
    if ((el = e.target.closest("[data-rm]"))) { var a = read(); a.splice(+el.getAttribute("data-rm"), 1); write(a); return; }
    if ((el = e.target.closest("[data-inc]"))) { var b = read(), bi = +el.getAttribute("data-inc"); b[bi].qty = Math.min(99, b[bi].qty + 1); write(b); return; }
    if ((el = e.target.closest("[data-dec]"))) {
      var c = read(), ci = +el.getAttribute("data-dec");
      c[ci].qty -= 1; if (c[ci].qty < 1) c.splice(ci, 1);
      write(c); return;
    }
    if ((el = e.target.closest("[data-qty-btn]"))) {
      var input = document.querySelector("[data-qty-input]");
      if (input) {
        var v = (parseInt(input.value, 10) || 1) + (el.getAttribute("data-qty-btn") === "+" ? 1 : -1);
        input.value = Math.max(1, Math.min(99, v));
      }
      return;
    }
    if (e.target.closest("[data-place-order]")) { e.preventDefault(); placeOrder(); return; }
    if ((el = e.target.closest("[data-filter]"))) {
      var key = el.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach(function (x) { x.classList.toggle("on", x === el); });
      document.querySelectorAll("[data-grid] .card").forEach(function (card) {
        card.hidden = key !== "all" && !card.classList.contains("f-" + key);
      });
      return;
    }
    if ((el = e.target.closest("[data-thumb]"))) {
      var main = document.querySelector("[data-gallery-main]");
      if (main) main.src = el.getAttribute("data-thumb");
      document.querySelectorAll("[data-thumb]").forEach(function (x) { x.classList.toggle("on", x === el); });
    }
  });

  document.addEventListener("change", function (e) {
    var s = e.target.closest("select[data-currency]");
    if (s) { localStorage.setItem("sm_cur", s.value); paintMoney(); paintCart(); paintCartPage(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDrawer();
  });

  document.addEventListener("DOMContentLoaded", function () {
    syncBadge(); paintCart(); paintCartPage(); paintMoney();
    var input = document.querySelector("[data-search-input]"), out = document.querySelector("[data-search-results]");
    if (input && out) {
      var params = new URLSearchParams(location.search);
      if (params.get("q")) { input.value = params.get("q"); runSearch(input.value, out); }
      var timer;
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () { runSearch(input.value, out); }, 170);
      });
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); location.href = "/search/?q=" + encodeURIComponent(input.value); }
      });
    }
  });
})();
