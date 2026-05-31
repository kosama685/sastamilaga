/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  SASTA MILAGA — Google Apps Script v2.0                        ║
 * ║  Products REST API + Admin Panel (Google Sheets Backend)        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  SETUP GUIDE (5 Steps):                                         ║
 * ║  1. Open your Google Sheet                                       ║
 * ║  2. Extensions → Apps Script → paste this entire file           ║
 * ║  3. Save (Ctrl+S)                                               ║
 * ║  4. Run onOpen(), then Sasta Milaga → Setup Sheet               ║
 * ║  5. Deploy → New Deployment → Web App                           ║
 * ║     • Execute as: Me                                             ║
 * ║     • Who has access: Anyone                                     ║
 * ║  6. Copy the /exec URL                                           ║
 * ║  7. In Blogger theme: set SHEETS_API_URL = "paste-url-here"     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  SHEET COLUMNS (Row 1 = Headers, auto-created by Setup Sheet):  ║
 * ║  id | n | m | leaf | store | path | tags | fp | sp | bp |      ║
 * ║  img | imgs | vids | sd | d | seoT | seoD | sku | status |     ║
 * ║  in | stock | updated | h                                        ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* ─── CONFIG ─── */
const SS_         = SpreadsheetApp.getActiveSpreadsheet();
const SHEET_NAME_ = 'Products';
const CACHE_TTL_  = 300; // seconds (5 minutes)

/* ─── COLUMN INDICES (0-based, maps to sheet columns A,B,C...) ─── */
const C_ = {
  id:0, n:1, m:2, leaf:3, store:4, path:5, tags:6,
  fp:7, sp:8, bp:9, img:10, imgs:11, vids:12,
  sd:13, d:14, seoT:15, seoD:16, sku:17, status:18,
  'in':19, stock:20, updated:21, h:22
};
const HEADERS_ = Object.keys(C_); // 23 columns total


/* ══════════════════════════════════════════════════════════════════
   HTTP ENTRY POINTS
══════════════════════════════════════════════════════════════════ */

/**
 * doGet: Handles all GET requests to the web app
 *
 * Supported actions (via ?action=xxx):
 *   products   → Returns all active products as JSON
 *   categories → Returns category list
 *   product    → Returns single product (?id=xxx)
 *   ping       → Health check
 *
 * Supports JSONP via ?callback=fnName for cross-origin fallback
 */
function doGet(e) {
  const p        = (e && e.parameter) || {};
  const action   = p.action   || 'products';
  const callback = p.callback || null;
  let result;

  try {
    switch (action) {
      case 'products':
        result = apiGetProducts_(p.status || null);
        break;
      case 'categories':
        result = apiGetCategories_();
        break;
      case 'product':
        result = p.id
          ? apiGetProduct_(p.id)
          : { error: 'Missing required parameter: id' };
        break;
      case 'ping':
        result = {
          ok      : true,
          service : 'Sasta Milaga API',
          sheet   : SHEET_NAME_,
          ts      : new Date().toISOString()
        };
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
    Logger.log('[doGet] Error: ' + err.stack);
  }

  const json = JSON.stringify(result);

  // JSONP support (cross-origin fallback)
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost: Handles product mutations (add, update, delete)
 *
 * Request body (JSON):
 *   { action: 'add',    product: {...} }
 *   { action: 'update', id: 'xxx', product: {...} }
 *   { action: 'delete', id: 'xxx' }
 *   { action: 'bulk',   products: [...] }
 */
function doPost(e) {
  let result;
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'add':
        if (!body.product) throw new Error('product object required');
        result = apiAddProduct_(body.product);
        break;
      case 'update':
        if (!body.id)      throw new Error('id required for update');
        if (!body.product) throw new Error('product object required');
        result = apiUpdateProduct_(body.id, body.product);
        break;
      case 'delete':
        if (!body.id) throw new Error('id required for delete');
        result = apiDeleteProduct_(body.id);
        break;
      case 'bulk':
        if (!Array.isArray(body.products)) throw new Error('products array required');
        result = apiBulkAdd_(body.products);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }

    clearApiCache_(); // Always bust cache after mutations
  } catch (err) {
    result = { error: err.message };
    Logger.log('[doPost] Error: ' + err.stack);
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}


/* ══════════════════════════════════════════════════════════════════
   API DATA FUNCTIONS
══════════════════════════════════════════════════════════════════ */

function apiGetProducts_(statusFilter) {
  const cacheKey = 'sm_prods_' + (statusFilter || 'active');
  const cache    = CacheService.getScriptCache();
  const cached   = cache.get(cacheKey);

  if (cached) {
    try { return JSON.parse(cached); } catch(_){}
  }

  const sheet = getProductsSheet_();
  if (!sheet) {
    return { products: [], count: 0, error: 'Sheet not found. Run: Sasta Milaga → Setup Sheet' };
  }

  const allData = sheet.getDataRange().getValues();
  if (allData.length < 2) return { products: [], count: 0 };

  const headers  = allData[0];
  const products = allData.slice(1)
    .filter(row => {
      const id     = String(row[C_.id] || '').trim();
      const status = String(row[C_.status] || '').toLowerCase();
      if (!id) return false;
      if (statusFilter) return status === statusFilter.toLowerCase();
      return status !== 'trash' && status !== 'draft';
    })
    .map(row => rowToProductObj_(headers, row));

  const result = {
    products,
    count  : products.length,
    status : statusFilter || 'active',
    ts     : new Date().toISOString()
  };

  try {
    cache.put(cacheKey, JSON.stringify(result), CACHE_TTL_);
  } catch (e) {
    Logger.log('[Cache] Skipped — payload too large: ' + e.message);
  }

  return result;
}

function apiGetProduct_(id) {
  const sheet   = getProductsSheet_();
  if (!sheet)   return { error: 'Sheet not found' };
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const row     = data.slice(1).find(r => String(r[C_.id]) === String(id));
  if (!row)     return { error: 'Product not found: ' + id };
  return rowToProductObj_(headers, row);
}

function apiGetCategories_() {
  const { products } = apiGetProducts_(null);
  const catMap = {};

  products.forEach(p => {
    if (!p.m) return;
    if (!catMap[p.m]) catMap[p.m] = { name: p.m, count: 0, image: null, leaves: new Set() };
    catMap[p.m].count++;
    if (p.leaf) catMap[p.m].leaves.add(p.leaf);
    if (!catMap[p.m].image && p.img) catMap[p.m].image = p.img;
  });

  return Object.values(catMap)
    .map(c => ({ name: c.name, count: c.count, image: c.image, leaves: [...c.leaves] }))
    .sort((a, b) => b.count - a.count);
}


/* ══════════════════════════════════════════════════════════════════
   CRUD OPERATIONS
══════════════════════════════════════════════════════════════════ */

function apiAddProduct_(p) {
  if (!p)   return { error: 'Product data required' };
  if (!p.n) return { error: 'Field required: n (product name)' };

  const sheet = getProductsSheet_();
  if (!sheet) return { error: 'Sheet not found. Run Setup Sheet first.' };
  ensureSheetHeaders_(sheet);

  const id = p.id || ('SM' + Date.now() + Math.floor(Math.random() * 999));
  const h  = p.h  || slugify_(p.n + ' ' + id.slice(-4));

  const row = HEADERS_.map(col => {
    if (col === 'id')      return id;
    if (col === 'h')       return h;
    if (col === 'status')  return p.status  || 'active';
    if (col === 'updated') return todayStr_();
    const v = p[col];
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return JSON.stringify(v);
    return v;
  });

  sheet.appendRow(row);
  clearApiCache_();
  return { success: true, id, h };
}

function apiUpdateProduct_(id, updates) {
  if (!updates) return { error: 'Updates object required' };

  const sheet  = getProductsSheet_();
  if (!sheet)  return { error: 'Sheet not found' };
  const data   = sheet.getDataRange().getValues();
  const rowIdx = data.findIndex((r, i) => i > 0 && String(r[C_.id]) === String(id));
  if (rowIdx === -1) return { error: 'Product not found: ' + id };

  const sheetRow = rowIdx + 1; // Convert to 1-indexed

  HEADERS_.forEach((col, colIdx) => {
    if (updates[col] === undefined) return;
    const v = updates[col];
    sheet.getRange(sheetRow, colIdx + 1)
         .setValue(Array.isArray(v) ? JSON.stringify(v) : v);
  });

  // Always stamp updated date
  sheet.getRange(sheetRow, C_.updated + 1).setValue(todayStr_());
  clearApiCache_();
  return { success: true, id };
}

function apiDeleteProduct_(id) {
  // Soft-delete: set status to 'trash'
  return apiUpdateProduct_(id, { status: 'trash' });
}

function apiBulkAdd_(products) {
  const results = products.map(p => {
    try { return apiAddProduct_(p); }
    catch(e) { return { error: e.message, name: p.n || 'unknown' }; }
  });
  const added = results.filter(r => r.success).length;
  return { success: true, added, total: products.length };
}


/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

function getProductsSheet_() {
  return SS_.getSheetByName(SHEET_NAME_);
}

function ensureSheetHeaders_(sheet) {
  const firstCell = sheet.getRange(1, 1).getValue();
  if (String(firstCell) === 'id') return; // Already set up

  // Write headers
  sheet.getRange(1, 1, 1, HEADERS_.length).setValues([HEADERS_]);
  sheet.setFrozenRows(1);

  // Style headers: dark green background
  const hRange = sheet.getRange(1, 1, 1, HEADERS_.length);
  hRange.setBackground('#1a6b3a');
  hRange.setFontColor('#ffffff');
  hRange.setFontWeight('bold');
  hRange.setFontSize(10);

  Logger.log('[Setup] Headers written to row 1.');
}

function rowToProductObj_(headers, row) {
  const p = {};
  headers.forEach((h, i) => {
    const raw = row[i];
    const val = raw === null || raw === undefined ? '' : raw;

    if (['tags', 'imgs', 'vids', 'alt'].includes(h)) {
      const str = String(val).trim();
      if (str.startsWith('[')) {
        try { p[h] = JSON.parse(str); return; } catch(_){}
      }
      p[h] = str ? str.split(/[,|]/).map(s => s.trim()).filter(Boolean) : [];

    } else if (h === 'in') {
      p[h] = val === true || String(val).toUpperCase() === 'TRUE' || Number(val) === 1;

    } else if (['fp','sp','bp','stock'].includes(h)) {
      p[h] = Number(val) || 0;

    } else {
      p[h] = val !== '' ? val : null;
    }
  });
  return p;
}

function slugify_(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function todayStr_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function clearApiCache_() {
  const c = CacheService.getScriptCache();
  ['sm_prods_active', 'sm_prods_null', 'sm_prods_draft', 'sm_prods_all'].forEach(k => {
    try { c.remove(k); } catch(_){}
  });
}


/* ══════════════════════════════════════════════════════════════════
   SHEETS ADMIN MENU
══════════════════════════════════════════════════════════════════ */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛒 Sasta Milaga')
    .addItem('📋 Product Manager',     'openProductManager')
    .addItem('🔧 Setup Sheet',          'runSetupSheet')
    .addSeparator()
    .addItem('➕ Add Sample Product',  'runAddSample')
    .addItem('📊 Product Statistics',  'runShowStats')
    .addItem('🔄 Clear API Cache',     'runClearCache')
    .addSeparator()
    .addItem('❓ Help / Column Guide', 'runShowHelp')
    .addToUi();
}

function openProductManager() {
  const html = HtmlService
    .createHtmlOutput(buildSidebarHtml_())
    .setTitle('🛒 Sasta Milaga — Product Manager')
    .setWidth(440);
  SpreadsheetApp.getUi().showSidebar(html);
}

function runSetupSheet() {
  const ui    = SpreadsheetApp.getUi();
  let sheet   = SS_.getSheetByName(SHEET_NAME_);

  if (!sheet) {
    sheet = SS_.insertSheet(SHEET_NAME_);
    ui.alert('✅ Created sheet: "' + SHEET_NAME_ + '"');
  }

  ensureSheetHeaders_(sheet);
  sheet.autoResizeColumns(1, HEADERS_.length);

  ui.alert(
    '✅ Sheet setup complete!\n\n' +
    'Columns (' + HEADERS_.length + '):\n' +
    HEADERS_.join(' | ') + '\n\n' +
    'Next step: Add products, then run\n' +
    '"Clear API Cache" to refresh the website.'
  );
}

function runClearCache() {
  clearApiCache_();
  SpreadsheetApp.getUi().alert(
    '✅ API cache cleared!\n\n' +
    'Product changes will now appear on your\n' +
    'website within 30 seconds.'
  );
}

function runShowStats() {
  const { products, count } = apiGetProducts_(null);
  if (!count) {
    SpreadsheetApp.getUi().alert('No active products found in sheet.');
    return;
  }

  const cats    = {};
  let inStock   = 0;
  let withDisc  = 0;
  let withImg   = 0;
  let withVideo = 0;

  products.forEach(p => {
    cats[p.m || 'Uncategorised'] = (cats[p.m || 'Uncategorised'] || 0) + 1;
    if (p['in'] || p.stock > 0) inStock++;
    if ((p.sp || 0) > (p.fp || 0) && p.fp > 0) withDisc++;
    if (p.img) withImg++;
    if (p.vids && p.vids.length > 0) withVideo++;
  });

  const topCats = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => '  • ' + k + ': ' + v)
    .join('\n');

  SpreadsheetApp.getUi().alert(
    '📊 SASTA MILAGA PRODUCT STATS\n' +
    '══════════════════════════════\n' +
    'Total Active    : ' + count + '\n' +
    'In Stock        : ' + inStock + '\n' +
    'With Discounts  : ' + withDisc + '\n' +
    'With Images     : ' + withImg + '\n' +
    'With Videos     : ' + withVideo + '\n\n' +
    'TOP CATEGORIES:\n' + topCats
  );
}

function runAddSample() {
  const r = apiAddProduct_({
    n     : '✏️ Sample Product — Edit Me',
    m     : 'Fashion & Apparel',
    leaf  : 'T-Shirts',
    store : 'Sasta Store',
    tags  : ['sample', 'new-arrival', 'trending'],
    fp    : 999,
    sp    : 1800,
    bp    : 0,
    img   : 'https://placehold.co/800x800/1a6b3a/ffffff?text=Sasta+Milaga',
    imgs  : [],
    vids  : [],
    sd    : 'A sample product to test your website setup.',
    d     : 'This is a sample product. Replace this description with real content.',
    seoT  : 'Sample Product | Sasta Milaga Pakistan',
    seoD  : 'Buy sample product at the best price in Pakistan.',
    status: 'active',
    'in'  : true,
    stock : 100
  });
  SpreadsheetApp.getUi().alert(
    '✅ Sample product added!\n\nID: ' + r.id + '\n\n' +
    'Edit it directly in the spreadsheet, then\n' +
    'run "Clear API Cache" to see it on your website.'
  );
}

function runShowHelp() {
  SpreadsheetApp.getUi().alert(
    'COLUMN GUIDE\n' +
    '═══════════════════════════════\n\n' +
    'id      → Auto-generated (leave blank)\n' +
    'n       → Product name (REQUIRED)\n' +
    'm       → Main category\n' +
    'leaf    → Sub-category\n' +
    'store   → Brand / store name\n' +
    'tags    → Comma-separated: tag1,tag2\n' +
    'fp      → Selling price PKR (REQUIRED)\n' +
    'sp      → Crossed-out price PKR\n' +
    'bp      → Base cost (optional)\n' +
    'img     → Main product image URL\n' +
    'imgs    → More images, comma-separated\n' +
    'vids    → Video URLs, comma-separated\n' +
    'sd      → Short description (< 200 chars)\n' +
    'd       → Full HTML or text description\n' +
    'seoT    → SEO page title\n' +
    'seoD    → SEO meta description\n' +
    'sku     → Stock code\n' +
    'status  → active / draft / trash\n' +
    'in      → TRUE / FALSE (in stock)\n' +
    'stock   → Quantity number\n' +
    'updated → Auto-filled by script\n' +
    'h       → URL slug (auto-generated)\n\n' +
    'AFTER EDITS: Always run "Clear API Cache"\n' +
    'so your website shows the latest data!'
  );
}


/* ══════════════════════════════════════════════════════════════════
   SIDEBAR HTML (Product Manager UI)
══════════════════════════════════════════════════════════════════ */

function buildSidebarHtml_() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--gr:#1a6b3a;--gr2:#2a9d5c;--glt:#d4edde;--gold:#d4a017;--red:#e53935;--blue:#1565c0;--bd:#e0e7e4;--bg:#f0f7f3;--bg2:#fff;--tx:#111;--mu:#5a7564}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;background:var(--bg);color:var(--tx);min-height:100vh;display:flex;flex-direction:column}
.header{background:linear-gradient(135deg,var(--gr),var(--gr2));color:#fff;padding:14px 16px;flex-shrink:0}
.header h2{font-size:14px;font-weight:800;letter-spacing:.02em}
.header p{font-size:10px;opacity:.8;margin-top:2px}
.tabs{display:flex;background:var(--bg2);border-bottom:2px solid var(--bd);flex-shrink:0}
.tab{flex:1;padding:10px 6px;text-align:center;cursor:pointer;font-size:11px;font-weight:700;color:var(--mu);border-bottom:2px solid transparent;margin-bottom:-2px;transition:.15s;user-select:none}
.tab.on{color:var(--gr);border-bottom-color:var(--gr);background:var(--glt)}
.scroll{flex:1;overflow-y:auto;padding:12px}
.card{background:var(--bg2);border:1px solid var(--bd);border-radius:8px;padding:13px;margin-bottom:10px}
.card-title{font-size:12px;font-weight:800;color:var(--gr);margin-bottom:10px;padding-bottom:7px;border-bottom:1px solid var(--bd)}
label{display:block;font-size:10px;font-weight:700;color:var(--mu);margin-bottom:3px;letter-spacing:.04em;text-transform:uppercase}
input,select,textarea{width:100%;border:1.5px solid var(--bd);padding:7px 9px;border-radius:6px;font-size:12px;margin-bottom:8px;outline:none;color:var(--tx);background:var(--bg2);transition:border-color .15s}
input:focus,select:focus,textarea:focus{border-color:var(--gr);background:#fff}
.r2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.r2>div{display:flex;flex-direction:column}
.r2 input,.r2 select{margin-bottom:0}
.chk{display:flex;align-items:center;gap:6px;margin-bottom:8px;cursor:pointer;font-size:12px;font-weight:600}
.chk input{width:auto;margin:0}
.btn{border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;transition:all .15s;display:inline-flex;align-items:center;gap:5px}
.gr{background:var(--gr);color:#fff}.gr:hover{background:#134f2b}
.rd{background:var(--red);color:#fff}.rd:hover{background:#b71c1c}
.bl{background:var(--blue);color:#fff}.bl:hover{background:#0d47a1}
.ou{background:#fff;border:1.5px solid var(--bd);color:var(--tx)}.ou:hover{border-color:var(--gr);color:var(--gr)}
.w100{width:100%;justify-content:center}
.mb6{margin-bottom:6px}
.toast{padding:8px 12px;border-radius:6px;font-size:12px;margin-bottom:10px;display:none}
.toast.ok{background:var(--glt);color:#155724;border:1px solid #b8dac8;display:block}
.toast.err{background:#fde8e8;color:#7b1a1a;border:1px solid #f5c6c6;display:block}
.pane{display:none}.pane.on{display:block}
.search-row{display:flex;gap:6px;margin-bottom:10px}
.search-row input{margin:0;flex:1}
.plist{display:flex;flex-direction:column;gap:5px;max-height:320px;overflow-y:auto}
.pi{background:var(--bg2);border:1px solid var(--bd);border-radius:6px;padding:8px 10px;display:flex;align-items:center;gap:7px}
.pi-info{flex:1;min-width:0}
.pi-name{font-weight:700;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-sub{font-size:10px;color:var(--mu);margin-top:1px}
.pi-price{font-weight:800;color:var(--gr);font-size:11px;white-space:nowrap}
.pi-acts{display:flex;gap:4px;flex-shrink:0}
.pi-acts .btn{padding:4px 8px;font-size:10px}
.badge{display:inline-block;padding:2px 6px;border-radius:8px;font-size:9px;font-weight:700;margin-right:4px}
.ba{background:var(--glt);color:#155724}
.bd2{background:#fff3cd;color:#856404}
.bt{background:#fde8e8;color:#7b1a1a}
.edit-box{background:var(--bg);border:1px solid var(--bd);border-radius:7px;padding:12px;margin-top:10px;display:none}
.edit-box.on{display:block}
.edit-box .card-title{margin-bottom:8px}
.sep{height:1px;background:var(--bd);margin:12px 0}
.stat{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px}
.stat:last-child{border:none}
.stat b{color:var(--gr);font-weight:800}
.footer{background:var(--bg2);border-top:1px solid var(--bd);padding:8px 14px;font-size:10px;color:var(--mu);text-align:center;flex-shrink:0}
.empty{text-align:center;padding:24px;color:var(--mu);font-size:12px}
</style>
</head>
<body>
<div class="header">
  <h2>🛒 Sasta Milaga — Product Manager</h2>
  <p>Add, edit, and delete products directly from your Google Sheet</p>
</div>

<div class="tabs">
  <div class="tab on" onclick="switchTab('add',this)">➕ Add</div>
  <div class="tab" onclick="switchTab('manage',this)">✏️ Manage</div>
  <div class="tab" onclick="switchTab('tools',this)">⚙️ Tools</div>
</div>

<div class="scroll">

  <!-- ─ ADD PRODUCT ─ -->
  <div class="pane on" id="pane-add">
    <div id="addToast" class="toast"></div>
    <div class="card">
      <div class="card-title">New Product</div>
      <label>Product Name *</label>
      <input id="an" placeholder="e.g. Casual Cotton T-Shirt — Navy Blue">
      <div class="r2">
        <div><label>Category *</label><input id="am" placeholder="Fashion & Apparel"></div>
        <div><label>Sub-category</label><input id="aleaf" placeholder="T-Shirts"></div>
      </div>
      <label>Store / Brand</label>
      <input id="astore" placeholder="Brand name">
      <div class="r2">
        <div><label>Final Price PKR *</label><input id="afp" type="number" placeholder="999" min="0"></div>
        <div><label>Original Price</label><input id="asp" type="number" placeholder="1800" min="0"></div>
      </div>
      <label>Main Image URL</label>
      <input id="aimg" placeholder="https://...image.jpg">
      <label>Extra Images (comma-separated URLs)</label>
      <input id="aimgs" placeholder="https://img1.jpg, https://img2.jpg">
      <label>Video URLs (comma-separated)</label>
      <input id="avids" placeholder="https://video.mp4">
      <label>Tags (comma-separated)</label>
      <input id="atags" placeholder="sale,trending,summer,new-arrival">
      <label>Short Description</label>
      <textarea id="asd" rows="2" placeholder="Brief product description (under 200 chars)..."></textarea>
      <label>SKU</label>
      <input id="asku" placeholder="SKU-001">
      <div class="r2">
        <div><label>Stock Quantity</label><input id="astock" type="number" placeholder="100" min="0"></div>
        <div><label>Status</label>
          <select id="astatus"><option value="active">Active</option><option value="draft">Draft</option></select>
        </div>
      </div>
      <label class="chk"><input type="checkbox" id="ain" checked> In Stock</label>
      <button class="btn gr w100" onclick="doAdd()">➕ Add Product</button>
    </div>
  </div>

  <!-- ─ MANAGE PRODUCTS ─ -->
  <div class="pane" id="pane-manage">
    <div id="manToast" class="toast"></div>
    <div class="card">
      <div class="card-title">Search Products</div>
      <div class="search-row">
        <input id="sq" placeholder="Name, ID, category..." onkeyup="if(event.key==='Enter')doSearch()">
        <button class="btn gr" onclick="doSearch()">Search</button>
      </div>
      <div id="plist" class="plist">
        <div class="empty">Search above to find products</div>
      </div>

      <div class="edit-box" id="editBox">
        <div class="card-title">Edit Product</div>
        <input type="hidden" id="eid">
        <label>Name</label><input id="en">
        <div class="r2">
          <div><label>Final Price</label><input id="efp" type="number"></div>
          <div><label>Original Price</label><input id="esp" type="number"></div>
        </div>
        <label>Category</label><input id="em">
        <label>Image URL</label><input id="eimg">
        <label>Tags</label><input id="etags" placeholder="tag1,tag2,tag3">
        <label>Short Description</label>
        <textarea id="esd" rows="2"></textarea>
        <label>Status</label>
        <select id="estatus">
          <option value="active">Active (visible)</option>
          <option value="draft">Draft (hidden)</option>
          <option value="trash">Trash (deleted)</option>
        </select>
        <div style="display:flex;gap:6px;margin-top:4px">
          <button class="btn gr" onclick="doSaveEdit()" style="flex:1">💾 Save</button>
          <button class="btn ou" onclick="closeEdit()" style="flex:1">✕ Cancel</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ─ TOOLS ─ -->
  <div class="pane" id="pane-tools">
    <div class="card">
      <div class="card-title">Quick Actions</div>
      <button class="btn bl w100 mb6" onclick="doSetup()">🔧 Setup Sheet Headers</button>
      <button class="btn bl w100 mb6" onclick="doClearCache()">🔄 Clear API Cache</button>
      <button class="btn bl w100 mb6" onclick="doStats()">📊 View Statistics</button>
      <button class="btn gr w100" onclick="doSample()">➕ Add Sample Product</button>
    </div>
    <div class="card">
      <div class="card-title">Tips</div>
      <p style="font-size:11px;color:var(--mu);line-height:1.7">
        • After editing products in the sheet, always click <b>"Clear API Cache"</b> so changes appear on your website immediately.<br><br>
        • Use <b>status: draft</b> to hide a product without deleting it.<br><br>
        • Array columns (tags, imgs, vids) accept comma-separated values OR JSON arrays.<br><br>
        • The <b>in</b> column accepts TRUE or FALSE.
      </p>
    </div>
    <div id="statsBox" class="card" style="display:none">
      <div class="card-title">Product Statistics</div>
      <div id="statsContent"></div>
    </div>
  </div>

</div>
<div class="footer">Sasta Milaga Admin v2.0 — Google Apps Script</div>

<script>
function switchTab(id, el) {
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.getElementById('pane-' + id).classList.add('on');
  el.classList.add('on');
}

function toast(id, msg, ok) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'toast ' + (ok ? 'ok' : 'err');
  setTimeout(() => { el.className = 'toast'; }, 4000);
}

function gv(id) { return document.getElementById(id).value.trim(); }
function sv(id, v) { document.getElementById(id).value = v != null ? v : ''; }

function doAdd() {
  const n = gv('an');
  if (!n) return toast('addToast', '❌ Product name is required', false);
  if (!gv('afp')) return toast('addToast', '❌ Final price is required', false);

  toast('addToast', '⏳ Adding product...', true);

  const p = {
    n, m: gv('am'), leaf: gv('aleaf'), store: gv('astore'),
    fp: Number(gv('afp')) || 0,
    sp: Number(gv('asp')) || 0,
    img:  gv('aimg'),
    imgs: gv('aimgs').split(',').map(s=>s.trim()).filter(Boolean),
    vids: gv('avids').split(',').map(s=>s.trim()).filter(Boolean),
    tags: gv('atags').split(',').map(s=>s.trim()).filter(Boolean),
    sd: gv('asd'), sku: gv('asku'),
    stock: Number(gv('astock')) || 0,
    'in': document.getElementById('ain').checked,
    status: gv('astatus') || 'active'
  };

  google.script.run
    .withSuccessHandler(r => {
      toast('addToast', '✅ Product added! ID: ' + r.id, true);
      ['an','am','aleaf','astore','afp','asp','aimg','aimgs','avids','atags','asd','asku','astock']
        .forEach(id => sv(id, ''));
      document.getElementById('ain').checked = true;
      sv('astatus', 'active');
    })
    .withFailureHandler(e => toast('addToast', '❌ ' + e.message, false))
    .apiAddProduct_(p);
}

function doSearch() {
  const q = gv('sq').toLowerCase();
  toast('manToast', '🔍 Searching...', true);

  google.script.run
    .withSuccessHandler(data => {
      const ps = (data.products || [])
        .filter(p => !q ||
          (p.n||'').toLowerCase().includes(q) ||
          String(p.id||'').toLowerCase().includes(q) ||
          (p.m||'').toLowerCase().includes(q) ||
          (p.store||'').toLowerCase().includes(q)
        ).slice(0, 40);

      const list = document.getElementById('plist');
      document.getElementById('manToast').className = 'toast';

      if (!ps.length) {
        list.innerHTML = '<div class="empty">No products found for "' + q + '"</div>';
        return;
      }

      list.innerHTML = ps.map(p => {
        const st = (p.status || 'active').toLowerCase();
        const bc = st === 'active' ? 'ba' : st === 'draft' ? 'bd2' : 'bt';
        const pStr = JSON.stringify(p).replace(/\\\\/g,'\\\\').replace(/"/g,'&quot;');
        return '<div class="pi">' +
          '<div class="pi-info">' +
            '<div class="pi-name">' + (p.n || 'Unnamed') + '</div>' +
            '<div class="pi-sub"><span class="badge ' + bc + '">' + st + '</span>ID:' + p.id + ' · ' + (p.m||'—') + '</div>' +
          '</div>' +
          '<span class="pi-price">PKR ' + ((p.fp||0).toLocaleString()) + '</span>' +
          '<div class="pi-acts">' +
            '<button class="btn bl" data-p="' + pStr + '" onclick="loadEdit(this)">✏️</button>' +
            '<button class="btn rd" onclick="doDelete(\'' + p.id + '\')">🗑️</button>' +
          '</div>' +
        '</div>';
      }).join('');
    })
    .withFailureHandler(e => toast('manToast', '❌ ' + e.message, false))
    .apiGetProducts_(null);
}

function loadEdit(btn) {
  const p = JSON.parse(btn.dataset.p.replace(/&quot;/g,'"'));
  sv('eid', p.id);
  sv('en',  p.n);
  sv('efp', p.fp || '');
  sv('esp', p.sp || '');
  sv('em',  p.m || '');
  sv('eimg', p.img || '');
  sv('etags', (p.tags||[]).join(', '));
  sv('esd', p.sd || '');
  sv('estatus', p.status || 'active');
  document.getElementById('editBox').classList.add('on');
}

function closeEdit() {
  document.getElementById('editBox').classList.remove('on');
}

function doSaveEdit() {
  const id = gv('eid');
  const updates = {
    n: gv('en'), fp: Number(gv('efp'))||0, sp: Number(gv('esp'))||0,
    m: gv('em'), img: gv('eimg'),
    tags: gv('etags').split(',').map(s=>s.trim()).filter(Boolean),
    sd: gv('esd'), status: gv('estatus')
  };
  toast('manToast', '⏳ Saving...', true);
  google.script.run
    .withSuccessHandler(() => {
      toast('manToast', '✅ Saved successfully!', true);
      closeEdit();
      doSearch();
    })
    .withFailureHandler(e => toast('manToast', '❌ ' + e.message, false))
    .apiUpdateProduct_(id, updates);
}

function doDelete(id) {
  if (!confirm('Move "' + id + '" to trash?\n(Can be restored by setting status=active)')) return;
  google.script.run
    .withSuccessHandler(() => { toast('manToast', '✅ Moved to trash', true); doSearch(); })
    .withFailureHandler(e => toast('manToast', '❌ ' + e.message, false))
    .apiDeleteProduct_(id);
}

function doSetup() {
  google.script.run.withSuccessHandler(() => alert('✅ Sheet setup done!')).runSetupSheet();
}

function doClearCache() {
  google.script.run.withSuccessHandler(() => alert('✅ Cache cleared! Website will update shortly.')).runClearCache();
}

function doSample() {
  google.script.run
    .withSuccessHandler(r => alert('✅ Sample product added!\nID: ' + r.id))
    .runAddSample();
}

function doStats() {
  google.script.run
    .withSuccessHandler(data => {
      const ps = data.products || [];
      const cats = {};
      let inStock=0, disc=0;
      ps.forEach(p => {
        cats[p.m||'Unknown'] = (cats[p.m||'Unknown']||0)+1;
        if(p['in']||p.stock>0) inStock++;
        if(p.sp>p.fp&&p.fp>0) disc++;
      });
      const box = document.getElementById('statsBox');
      const con = document.getElementById('statsContent');
      con.innerHTML =
        '<div class="stat"><span>Total Products</span><b>'+ps.length+'</b></div>' +
        '<div class="stat"><span>In Stock</span><b>'+inStock+'</b></div>' +
        '<div class="stat"><span>With Discounts</span><b>'+disc+'</b></div>' +
        Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>
          '<div class="stat"><span style="color:var(--mu);font-size:11px">'+k+'</span><b>'+v+'</b></div>'
        ).join('');
      box.style.display = 'block';
    })
    .withFailureHandler(e => alert('Error: ' + e.message))
    .apiGetProducts_(null);
}

window.onload = () => doSearch();
</script>
</body>
</html>`;
}
