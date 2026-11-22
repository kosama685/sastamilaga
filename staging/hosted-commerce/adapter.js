/* Sasta Milaga — opt-in managed commerce staging adapter.
 * Official Shopify Storefront Cart GraphQL API and hosted checkout.
 * This file is NOT loaded by the public storefront. Requires merchant-owned
 * Shopify shop, public Storefront token and approved variant mappings.
 * All prices, stock, shipping, tax and payment are decided at hosted checkout.
 */
(function (g) {
  'use strict';
  if (g.SMHostedCommerce) return;
  var KEY = 'sm_hosted_cart_preview_v1';
  var CART_QUERY = 'query ReadCart($id: ID!) { cart(id: $id) { id checkoutUrl totalQuantity lines(first: 100) { nodes { id quantity merchandise { ... on ProductVariant { id title availableForSale product { title } } } } } cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } } } }';
  var CREATE = 'mutation CreateCart($lines: [CartLineInput!]) { cartCreate(input: {lines: $lines}) { cart { id checkoutUrl totalQuantity } userErrors { field message } } }';
  var ADD = 'mutation AddLines($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart { id checkoutUrl totalQuantity } userErrors { field message } } }';
  var UPDATE = 'mutation UpdateLines($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { id checkoutUrl totalQuantity } userErrors { field message } } }';
  var busy = false, config = null;
  function loadConfig(input) {
    var cfg = input || {};
    var domain = String(cfg.shopDomain || '').trim().toLowerCase();
    var token = String(cfg.storefrontPublicToken || '').trim();
    var version = String(cfg.apiVersion || '2026-10');
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) throw new Error('A verified .myshopify.com store domain is required');
    if (!/^20[0-9]{2}-(01|04|07|10)$/.test(version)) throw new Error('A supported Shopify API version is required');
    if (!/^[A-Za-z0-9_-]{12,}$/.test(token)) throw new Error('Public Shopify Storefront token is missing or invalid');
    config = { shopDomain: domain, token: token, version: version };
    return { ready: true, shopDomain: domain };
  }
  function gid(value) { return /^gid:\/\/shopify\/ProductVariant\/[0-9]+$/.test(String(value||'')); }
  function line(variantId, quantity) {
    var q = Number(quantity);
    if (!gid(variantId) || !Number.isInteger(q) || q < 1 || q > 99)
      throw new Error('Choose a reviewed product variation and a quantity between 1 and 99');
    return { merchandiseId: variantId, quantity: q };
  }
  function remember(id) {
    try { if (id) g.localStorage.setItem(KEY, id); else g.localStorage.removeItem(KEY); }
    catch (e) { /* store checkout still works within current session */ }
  }
  function stored() { try { return g.localStorage.getItem(KEY) || null; } catch (e) { return null; } }
  function ensureReady() { if (!config) throw new Error('No approved managed-commerce shop configured; live checkout stays unchanged'); }
  function request(query, variables) {
    ensureReady();
    return g.fetch('https://' + config.shopDomain + '/api/' + config.version + '/graphql.json', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': config.token },
      body: JSON.stringify({ query: query, variables: variables })
    }).then(function (res) {
      return res.json().catch(function () { throw new Error('Commerce server returned invalid JSON'); })
        .then(function (j) {
          if (!res.ok) throw new Error('Commerce HTTP ' + res.status);
          if (Array.isArray(j.errors) && j.errors.length) throw new Error(j.errors.map(function(x){return x.message;}).join('; '));
          return j.data;
        });
    });
  }
  function accepted(p) {
    var errors = (p && p.userErrors) || [];
    if (errors.length) throw new Error(errors.map(function(x){return x.message;}).join('; '));
    if (!p || !p.cart || !p.cart.id || !p.cart.checkoutUrl) throw new Error('Commerce backend did not confirm cart update');
    remember(p.cart.id);
    return { ok: true, id: p.cart.id, checkoutUrl: p.cart.checkoutUrl, quantity: p.cart.totalQuantity };
  }
  function locked(fn) {
    if (busy) return Promise.reject(new Error('Your previous cart action is still processing'));
    busy = true;
    return Promise.resolve().then(fn).finally(function(){ busy = false; });
  }
  function read() {
    ensureReady();
    var id = stored();
    if (!id) return Promise.resolve({ cart:null, empty:true });
    return request(CART_QUERY, { id: id }).then(function(data){
      if (!data || !data.cart) { remember(null); return { cart:null, empty:true }; }
      return { cart: data.cart, empty: !data.cart.totalQuantity };
    });
  }
  function add(variantId, quantity) {
    return locked(function(){
      var requested = line(variantId, quantity), id = stored();
      if (!id) return request(CREATE, { lines:[requested] }).then(function(d){return accepted(d.cartCreate)});
      return request(ADD, { cartId:id, lines:[requested] }).then(function(d){return accepted(d.cartLinesAdd)});
    });
  }
  function setQuantity(cartLineId, quantity) {
    return locked(function(){
      var q = Number(quantity);
      if (!/^gid:\/\/shopify\/CartLine\/[A-Za-z0-9?=_:-]+$/.test(String(cartLineId||'')) || !Number.isInteger(q) || q < 0 || q > 99)
        throw new Error('Invalid cart line quantity');
      var id = stored(); if (!id) throw new Error('Cart expired or missing');
      return request(UPDATE,{cartId:id,lines:[{id:cartLineId,quantity:q}]}).then(function(d){return accepted(d.cartLinesUpdate)});
    });
  }
  function checkout() {
    return read().then(function (r) {
      var cart = r.cart;
      if (!cart || !cart.totalQuantity || !cart.checkoutUrl) throw new Error('No commerce-validated items in cart');
      // Only an official Shopify hosted checkout URL, never an arbitrary redirect.
      var url = new URL(cart.checkoutUrl);
      if (url.protocol !== 'https:' || !(url.hostname === config.shopDomain || url.hostname === 'checkout.shopify.com'))
        throw new Error('Checkout destination did not match the managed-commerce platform');
      return url.href;
    });
  }
  function status() { return { configured: !!config, busy:busy, hasSavedCart:!!stored(), previewOnly:true }; }
  g.SMHostedCommerce = { configure:loadConfig, add:add, read:read, setQuantity:setQuantity,
    checkout:checkout, status:status, clearSavedCart:function(){remember(null);} };
})(window);
