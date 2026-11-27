/**
 * Sastamilaga Products Apps Script Backend
 * 1) Import merged_products_complete.csv into a Google Sheet tab named Products.
 * 2) Extensions > Apps Script > paste this file.
 * 3) Deploy > New deployment > Web app > Execute as Me > Anyone with link.
 */
const CONFIG = {
  PRODUCTS_SHEET: 'Products',
  ORDERS_SHEET: 'Orders',
  SETTINGS_SHEET: 'Settings',
  DEFAULT_COMMISSION_PERCENT: 12,
  DEFAULT_COMMISSION_FIXED: 0,
  DEFAULT_DELIVERY_CHARGE: 150
};

function doGet(e) {
  try {
    const action = String((e.parameter.action || 'products')).toLowerCase();
    setupSheets_();
    if (action === 'health') return json_({ status: 'success', message: 'Sastamilaga Apps Script is running' });
    if (action === 'settings') return json_({ status: 'success', data: getSettings_() });
    if (action === 'products') return json_({ status: 'success', data: loadProducts_() });
    return json_({ status: 'error', message: 'Unknown action: ' + action });
  } catch (err) {
    return json_({ status: 'error', message: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    setupSheets_();
    const payload = JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
    const action = String(payload.action || '').toLowerCase();
    if (action === 'createorder') return json_(createOrder_(payload));
    if (action === 'updateproduct') return json_(updateProduct_(payload));
    if (action === 'setsettings') return json_(setSettings_(payload));
    if (action === 'bulkupdatecharges') return json_(bulkUpdateCharges_(payload));
    return json_({ status: 'error', message: 'Unknown POST action: ' + action });
  } catch (err) {
    return json_({ status: 'error', message: err.message, stack: err.stack });
  }
}

function setupSheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let settings = ss.getSheetByName(CONFIG.SETTINGS_SHEET);
  if (!settings) {
    settings = ss.insertSheet(CONFIG.SETTINGS_SHEET);
    settings.getRange(1, 1, 4, 2).setValues([
      ['default_commission_percent', CONFIG.DEFAULT_COMMISSION_PERCENT],
      ['default_commission_fixed', CONFIG.DEFAULT_COMMISSION_FIXED],
      ['default_delivery_charge', CONFIG.DEFAULT_DELIVERY_CHARGE],
      ['currency', 'PKR']
    ]);
  }
  let orders = ss.getSheetByName(CONFIG.ORDERS_SHEET);
  if (!orders) {
    orders = ss.insertSheet(CONFIG.ORDERS_SHEET);
    orders.appendRow(['timestamp', 'order_id', 'customer_name', 'customer_email', 'phone', 'address', 'product_id', 'sku', 'product_name', 'quantity', 'unit_price', 'commission_percent', 'commission_fixed', 'delivery_charge', 'line_total', 'notes', 'status']);
  }
  let products = ss.getSheetByName(CONFIG.PRODUCTS_SHEET);
  if (!products) {
    products = ss.insertSheet(CONFIG.PRODUCTS_SHEET);
    products.appendRow(['product_id','sku','handle','product_type','parent_id','variation_attributes','name','category_main','category_path','category_leaf','brand_or_store','source_price','base_price','commission_percent','commission_fixed','commission_amount','delivery_charge','final_price','stock_quantity','in_stock','published','status','weight','short_description','description','tags','primary_image','image_urls','video_urls','image_alt_tags','seo_meta_title','seo_meta_description','source_system','last_updated']);
  }
}

function loadProducts_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.PRODUCTS_SHEET);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  const settings = getSettings_();
  return data.slice(1).filter(r => r.join('').trim()).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.base_price = num_(obj.base_price || obj.source_price);
    obj.commission_percent = obj.commission_percent === '' ? num_(settings.default_commission_percent) : num_(obj.commission_percent);
    obj.commission_fixed = obj.commission_fixed === '' ? num_(settings.default_commission_fixed) : num_(obj.commission_fixed);
    obj.delivery_charge = obj.delivery_charge === '' ? num_(settings.default_delivery_charge) : num_(obj.delivery_charge);
    obj.commission_amount = round_(obj.base_price * obj.commission_percent / 100 + obj.commission_fixed);
    obj.final_price = round_(obj.base_price + obj.commission_amount + obj.delivery_charge);
    return obj;
  });
}

function updateProduct_(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.PRODUCTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('product_id');
  const skuCol = headers.indexOf('sku');
  if (idCol < 0 && skuCol < 0) throw new Error('Products sheet needs product_id or sku column.');
  const key = String(payload.product_id || payload.sku || '').trim();
  if (!key) throw new Error('product_id or sku required.');
  const rowIndex = data.findIndex((r, i) => i > 0 && (String(r[idCol]).trim() === key || String(r[skuCol]).trim() === key));
  if (rowIndex < 1) throw new Error('Product not found: ' + key);
  const editable = ['base_price', 'commission_percent', 'commission_fixed', 'delivery_charge', 'status', 'stock_quantity', 'seo_meta_title', 'seo_meta_description', 'image_alt_tags'];
  editable.forEach(name => {
    if (payload[name] !== undefined) {
      const col = headers.indexOf(name);
      if (col >= 0) sheet.getRange(rowIndex + 1, col + 1).setValue(payload[name]);
    }
  });
  recalculateRow_(sheet, headers, rowIndex + 1);
  return { status: 'success', message: 'Product updated', product_id: key };
}

function bulkUpdateCharges_(payload) {
  const percent = payload.commission_percent;
  const fixed = payload.commission_fixed;
  const delivery = payload.delivery_charge;
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.PRODUCTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const cols = {
    cp: headers.indexOf('commission_percent') + 1,
    cf: headers.indexOf('commission_fixed') + 1,
    del: headers.indexOf('delivery_charge') + 1
  };
  for (let r = 2; r <= data.length; r++) {
    if (percent !== undefined && cols.cp) sheet.getRange(r, cols.cp).setValue(percent);
    if (fixed !== undefined && cols.cf) sheet.getRange(r, cols.cf).setValue(fixed);
    if (delivery !== undefined && cols.del) sheet.getRange(r, cols.del).setValue(delivery);
    recalculateRow_(sheet, headers, r);
  }
  return { status: 'success', message: 'Bulk charges updated', rows: Math.max(0, data.length - 1) };
}

function createOrder_(payload) {
  const products = loadProducts_();
  const key = String(payload.product_id || payload.sku || '').trim();
  const product = products.find(p => String(p.product_id).trim() === key || String(p.sku).trim() === key);
  if (!product) throw new Error('Product not found for order: ' + key);
  const qty = Math.max(1, num_(payload.quantity || 1));
  const lineTotal = round_(num_(product.final_price) * qty);
  const orderId = 'ORD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 9000 + 1000);
  SpreadsheetApp.getActive().getSheetByName(CONFIG.ORDERS_SHEET).appendRow([
    new Date(), orderId, payload.customer_name || payload.customerName || '', payload.customer_email || payload.customerEmail || '', payload.phone || '', payload.address || '',
    product.product_id, product.sku, product.name, qty, product.final_price, product.commission_percent, product.commission_fixed, product.delivery_charge, lineTotal, payload.notes || '', 'New'
  ]);
  return { status: 'success', message: 'Order created', order_id: orderId, line_total: lineTotal };
}

function recalculateRow_(sheet, headers, rowNum) {
  const row = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
  const get = name => row[headers.indexOf(name)];
  const set = (name, value) => { const col = headers.indexOf(name); if (col >= 0) sheet.getRange(rowNum, col + 1).setValue(value); };
  const base = num_(get('base_price') || get('source_price'));
  const cp = num_(get('commission_percent'));
  const cf = num_(get('commission_fixed'));
  const del = num_(get('delivery_charge'));
  const com = round_(base * cp / 100 + cf);
  set('commission_amount', com);
  set('final_price', round_(base + com + del));
  set('last_updated', new Date());
}

function getSettings_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SETTINGS_SHEET);
  const values = sheet.getDataRange().getValues();
  const obj = {};
  values.forEach(r => { if (r[0]) obj[String(r[0]).trim()] = r[1]; });
  return obj;
}

function setSettings_(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SETTINGS_SHEET);
  const data = sheet.getDataRange().getValues();
  Object.keys(payload).forEach(key => {
    if (key === 'action') return;
    let row = data.findIndex(r => String(r[0]).trim() === key);
    if (row >= 0) sheet.getRange(row + 1, 2).setValue(payload[key]);
    else sheet.appendRow([key, payload[key]]);
  });
  return { status: 'success', message: 'Settings saved', data: getSettings_() };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function num_(v) { const n = Number(String(v || 0).replace(/,/g, '')); return isNaN(n) ? 0 : n; }
function round_(n) { return Math.round(Number(n || 0) * 100) / 100; }
