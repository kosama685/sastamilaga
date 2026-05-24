/**
 * Corporate Product Ordering Backend for Google Sheets
 * Sheet ID is already set from your provided spreadsheet URL.
 * Run setup() once, then deploy as a Web App.
 */
const SPREADSHEET_ID = '1zlupdxEyaOhuurdvYi5DhRduXVszY5plN7UFqEfO0X4';
const PRODUCTS_SHEET = 'Products';
const ALL_ORDERS_SHEET = 'All_Orders';
const AUTO_DEDUCT_STOCK = false;
const REQUIRE_ACTIVE_PRODUCTS = true;

const PRODUCT_HEADERS = ["Product ID", "Product Name", "Category", "Brand", "SKU", "Price", "Stock", "Status", "Featured", "Image URL", "Description", "Tags", "Created At", "Updated At"];
const ORDER_HEADERS = ["Order ID", "Timestamp", "Product ID", "Product Name", "Category", "Unit Price", "Quantity", "Total Amount", "Customer Name", "Customer Email", "Customer Phone", "Company", "Address", "Notes", "Status", "Source"];

const SAMPLE_PRODUCTS = [
  [
    "PRD-0001",
    "Aeron Executive Ergonomic Chair",
    "Furniture",
    "Herman Miller",
    "HM-AER-EXE",
    1250.0,
    15,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80",
    "Premium ergonomic task chair with breathable mesh, posture support, and executive finish.",
    "chair,ergonomic,office,premium",
    "2026-05-01",
    "2026-05-24"
  ],
  [
    "PRD-0002",
    "Velocity 16 Pro Laptop",
    "Electronics",
    "Apex Systems",
    "APX-V16-32",
    2499.0,
    28,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    "High-performance workstation laptop for design, development, analytics, and enterprise workloads.",
    "laptop,workstation,computer,pro",
    "2026-05-02",
    "2026-05-23"
  ],
  [
    "PRD-0003",
    "MX Master 3S Wireless Mouse",
    "Accessories",
    "Logitech",
    "LOG-MX3S-BLK",
    99.99,
    120,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=900&q=80",
    "Silent click productivity mouse with ergonomic grip and multi-device controls.",
    "mouse,wireless,accessory",
    "2026-05-03",
    "2026-05-22"
  ],
  [
    "PRD-0004",
    "NoiseFocus ANC Headset",
    "Electronics",
    "Sony",
    "SONY-NF-ANC",
    398.0,
    8,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=900&q=80",
    "Enterprise-grade active noise cancelling headset for focused calls and travel.",
    "headset,audio,noise cancelling",
    "2026-05-04",
    "2026-05-21"
  ],
  [
    "PRD-0005",
    "RisePro Standing Desk Converter",
    "Furniture",
    "FlexiDesk",
    "FD-RISE-PRO",
    199.5,
    35,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1595514535313-09756b107cb5?auto=format&fit=crop&w=900&q=80",
    "Adjustable sit-stand desk riser with smooth pneumatic lift and cable slots.",
    "desk,standing,furniture",
    "2026-05-05",
    "2026-05-20"
  ],
  [
    "PRD-0006",
    "Smart Meeting Notebook Pack",
    "Stationery",
    "Moleskine",
    "MOL-SMART-3",
    34.9,
    200,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1531346878377-244bb1c855a8?auto=format&fit=crop&w=900&q=80",
    "Premium notebooks for meeting notes, action items, sketches, and planning.",
    "notebook,stationery,meeting",
    "2026-05-06",
    "2026-05-19"
  ],
  [
    "PRD-0007",
    "UltraSharp 32 4K Monitor",
    "Electronics",
    "Dell",
    "DEL-U32-4K",
    749.0,
    18,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80",
    "Color-accurate 32-inch 4K monitor for executive desks and creative teams.",
    "monitor,display,4k",
    "2026-05-07",
    "2026-05-18"
  ],
  [
    "PRD-0008",
    "Executive Desk Organizer Set",
    "Stationery",
    "Nexus Office",
    "NX-DESK-ORG",
    47.5,
    88,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    "Minimal metal-and-wood organizer set for clean executive workstations.",
    "organizer,desk,stationery",
    "2026-05-08",
    "2026-05-17"
  ],
  [
    "PRD-0009",
    "Conference Room Camera 4K",
    "Electronics",
    "Logitech",
    "LOG-MEET-4K",
    899.0,
    12,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?auto=format&fit=crop&w=900&q=80",
    "Smart 4K conference camera with auto-framing and integrated room audio.",
    "camera,conference,meeting,4k",
    "2026-05-09",
    "2026-05-16"
  ],
  [
    "PRD-0010",
    "Modular Collaboration Sofa",
    "Furniture",
    "WorkLounge",
    "WL-SOFA-MOD",
    1399.0,
    6,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
    "Modular seating for breakout areas, visitor lounges, and collaborative spaces.",
    "sofa,lounge,furniture",
    "2026-05-10",
    "2026-05-15"
  ],
  [
    "PRD-0011",
    "Secure USB-C Docking Station",
    "Networking",
    "Anker",
    "ANK-DOCK-11",
    219.0,
    55,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1625842268584-8f3296236761?auto=format&fit=crop&w=900&q=80",
    "Multi-port USB-C dock with dual display support and enterprise charging.",
    "dock,usb-c,networking,accessory",
    "2026-05-11",
    "2026-05-14"
  ],
  [
    "PRD-0012",
    "Enterprise Wi-Fi 7 Access Point",
    "Networking",
    "Ubiquiti",
    "UBQ-WIFI7-AP",
    329.0,
    24,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1606765962248-7ff407b51667?auto=format&fit=crop&w=900&q=80",
    "High-density access point for offices, meeting zones, and campus networks.",
    "wifi,networking,access point",
    "2026-05-12",
    "2026-05-13"
  ],
  [
    "PRD-0013",
    "Privacy Screen 14-inch",
    "Accessories",
    "3M",
    "3M-PRIV-14",
    39.0,
    96,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
    "Laptop privacy filter for travel, shared desks, and confidential work.",
    "privacy,screen,laptop,accessory",
    "2026-05-13",
    "2026-05-12"
  ],
  [
    "PRD-0014",
    "AI Presentation Clicker",
    "Accessories",
    "Kensington",
    "KEN-AI-CLICK",
    69.0,
    44,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=900&q=80",
    "Wireless presenter with laser pointer, timer alerts, and USB-C receiver.",
    "presenter,clicker,meeting",
    "2026-05-14",
    "2026-05-11"
  ],
  [
    "PRD-0015",
    "Acoustic Focus Panel Kit",
    "Workspace",
    "SoundFrame",
    "SF-PANEL-12",
    289.0,
    22,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    "Premium acoustic wall panel kit for meeting rooms and open offices.",
    "acoustic,workspace,panel",
    "2026-05-15",
    "2026-05-10"
  ],
  [
    "PRD-0016",
    "Air Quality Desk Sensor",
    "Workspace",
    "Kaiterra",
    "KAI-AQ-DESK",
    159.0,
    31,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=900&q=80",
    "Compact indoor air quality monitor with CO2, temperature, and humidity tracking.",
    "sensor,air quality,workspace",
    "2026-05-16",
    "2026-05-09"
  ],
  [
    "PRD-0017",
    "Magnetic Whiteboard Pro",
    "Stationery",
    "Quartet",
    "QRT-MAG-PRO",
    249.0,
    17,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=900&q=80",
    "Large magnetic glass board for planning, workshops, and agile ceremonies.",
    "whiteboard,planning,stationery",
    "2026-05-17",
    "2026-05-08"
  ],
  [
    "PRD-0018",
    "Secure Shredder 20-Sheet",
    "Workspace",
    "Fellowes",
    "FEL-SHRED-20",
    299.0,
    9,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1586282391129-76a6df230234?auto=format&fit=crop&w=900&q=80",
    "Cross-cut shredder for departments handling confidential documents.",
    "shredder,security,workspace",
    "2026-05-18",
    "2026-05-07"
  ],
  [
    "PRD-0019",
    "Executive Laptop Backpack",
    "Accessories",
    "Targus",
    "TAR-BAG-EXE",
    119.0,
    67,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    "Professional waterproof backpack with laptop protection and organizer pockets.",
    "bag,backpack,laptop,travel",
    "2026-05-19",
    "2026-05-06"
  ],
  [
    "PRD-0020",
    "Premium Paper Ream Box",
    "Stationery",
    "Hammermill",
    "HAM-PAPER-10",
    52.0,
    150,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1517697471339-4aa32003c11a?auto=format&fit=crop&w=900&q=80",
    "Bright white multipurpose paper for office printing and documentation.",
    "paper,stationery,printing",
    "2026-05-20",
    "2026-05-05"
  ],
  [
    "PRD-0021",
    "Hybrid Work Desk Lamp",
    "Workspace",
    "BenQ",
    "BEN-LAMP-HYB",
    189.0,
    40,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80",
    "Auto-dimming desk lamp optimized for video calls and late work sessions.",
    "lamp,desk,lighting,workspace",
    "2026-05-21",
    "2026-05-04"
  ],
  [
    "PRD-0022",
    "Compact Label Printer",
    "Electronics",
    "Brother",
    "BRO-LABEL-CMP",
    149.0,
    30,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1607083206968-13611e3d76db?auto=format&fit=crop&w=900&q=80",
    "Fast label printer for assets, inventory, shipping, and office organization.",
    "printer,label,inventory",
    "2026-05-22",
    "2026-05-03"
  ],
  [
    "PRD-0023",
    "Ergo Keyboard Low Profile",
    "Accessories",
    "Keychron",
    "KEY-ERGO-LP",
    129.0,
    51,
    "Active",
    "Yes",
    "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=80",
    "Low-profile mechanical keyboard designed for long-form productivity.",
    "keyboard,mechanical,ergonomic",
    "2026-05-23",
    "2026-05-02"
  ],
  [
    "PRD-0024",
    "Boardroom HDMI Matrix",
    "Networking",
    "Aten",
    "ATN-HDMI-MX",
    429.0,
    11,
    "Active",
    "No",
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    "Reliable HDMI matrix switch for boardrooms, training rooms, and demo spaces.",
    "hdmi,boardroom,networking,av",
    "2026-05-24",
    "2026-05-01"
  ]
];

function doGet(e) {
  try {
    const action = String((e && e.parameter && e.parameter.action) || 'products').toLowerCase();
    if (action === 'health') return json_({ status: 'success', message: 'Apps Script backend is online', timestamp: new Date().toISOString() });
    if (action === 'setup') {
      setup();
      return json_({ status: 'success', message: 'Setup completed' });
    }
    const payload = getCatalogPayload_();
    return json_(payload);
  } catch (err) {
    return json_({ status: 'error', message: err.message, stack: err.stack });
  }
}

function doPost(e) {
  try {
    const payload = parseBody_(e);
    const action = String(payload.action || 'createOrder').toLowerCase();
    if (action !== 'createorder' && action !== 'order' && action !== 'submit') {
      throw new Error('Unsupported action: ' + action);
    }
    const result = createOrder_(payload);
    return json_({ status: 'success', data: result });
  } catch (err) {
    return json_({ status: 'error', message: err.message });
  }
}

function setup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const productSheet = getOrCreateSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  ensureHeaders_(productSheet, PRODUCT_HEADERS);
  if (productSheet.getLastRow() < 2) {
    productSheet.getRange(2, 1, SAMPLE_PRODUCTS.length, PRODUCT_HEADERS.length).setValues(SAMPLE_PRODUCTS);
  }
  styleSheet_(productSheet, PRODUCT_HEADERS.length);

  const allOrders = getOrCreateSheet_(ss, ALL_ORDERS_SHEET, ORDER_HEADERS);
  ensureHeaders_(allOrders, ORDER_HEADERS);
  styleSheet_(allOrders, ORDER_HEADERS.length);

  const todaySheet = getOrCreateSheet_(ss, getDailySheetName_(), ORDER_HEADERS);
  ensureHeaders_(todaySheet, ORDER_HEADERS);
  styleSheet_(todaySheet, ORDER_HEADERS.length);
}

function getCatalogPayload_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = getOrCreateSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  ensureHeaders_(sheet, PRODUCT_HEADERS);
  if (sheet.getLastRow() < 2) setup();

  let values = sheet.getDataRange().getValues();
  const map = getHeaderMap_(values[0]);
  repairMissingProductIds_(sheet, values, map);
  values = sheet.getDataRange().getValues();
  const products = [];
  const categories = {};

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const item = normalizeProduct_(row, map, r + 1);
    if (!item.name) continue;
    if (REQUIRE_ACTIVE_PRODUCTS && item.status && item.status.toLowerCase() !== 'active') continue;
    products.push(item);
    categories[item.category || 'Uncategorized'] = (categories[item.category || 'Uncategorized'] || 0) + 1;
  }

  return {
    status: 'success',
    meta: {
      spreadsheetId: SPREADSHEET_ID,
      totalProducts: products.length,
      generatedAt: new Date().toISOString(),
      orderSheetToday: getDailySheetName_()
    },
    categories: Object.keys(categories).sort().map(name => ({ name, count: categories[name] })),
    data: products
  };
}

function createOrder_(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const productSheet = getOrCreateSheet_(ss, PRODUCTS_SHEET, PRODUCT_HEADERS);
  ensureHeaders_(productSheet, PRODUCT_HEADERS);

  const productId = required_(payload.productId, 'Product ID');
  const quantity = Math.max(1, parseInt(payload.quantity || payload.qty || 1, 10));
  const product = findProductById_(productSheet, productId);

  if (!product) throw new Error('Product not found: ' + productId);
  if (REQUIRE_ACTIVE_PRODUCTS && product.status && product.status.toLowerCase() !== 'active') throw new Error('Product is not active: ' + product.name);
  if (Number(product.stock) > 0 && quantity > Number(product.stock)) throw new Error('Requested quantity exceeds available stock. Available: ' + product.stock);

  const orderId = makeOrderId_();
  const timestamp = new Date();
  const unitPrice = Number(product.price || 0);
  const total = unitPrice * quantity;

  const orderRow = [
    orderId,
    timestamp,
    product.id,
    product.name,
    product.category,
    unitPrice,
    quantity,
    total,
    required_(payload.customerName, 'Customer name'),
    required_(payload.customerEmail, 'Customer email'),
    required_(payload.customerPhone, 'Customer phone'),
    payload.company || '',
    required_(payload.address, 'Address'),
    payload.notes || '',
    'New',
    payload.source || 'Website'
  ];

  const allOrders = getOrCreateSheet_(ss, ALL_ORDERS_SHEET, ORDER_HEADERS);
  ensureHeaders_(allOrders, ORDER_HEADERS);
  allOrders.appendRow(orderRow);
  styleNewOrderRow_(allOrders);

  const daily = getOrCreateSheet_(ss, getDailySheetName_(), ORDER_HEADERS);
  ensureHeaders_(daily, ORDER_HEADERS);
  daily.appendRow(orderRow);
  styleNewOrderRow_(daily);

  if (AUTO_DEDUCT_STOCK) deductStock_(productSheet, product.rowNumber, product.headerMap, quantity);

  return {
    orderId,
    productId: product.id,
    productName: product.name,
    quantity,
    totalAmount: total,
    dailySheet: getDailySheetName_(),
    allOrdersSheet: ALL_ORDERS_SHEET
  };
}

function findProductById_(sheet, productId) {
  const values = sheet.getDataRange().getValues();
  const map = getHeaderMap_(values[0]);
  const needle = String(productId).trim().toLowerCase();
  for (let r = 1; r < values.length; r++) {
    const item = normalizeProduct_(values[r], map, r + 1);
    if (String(item.id).trim().toLowerCase() === needle) {
      item.headerMap = map;
      return item;
    }
  }
  return null;
}

function normalizeProduct_(row, map, rowNumber) {
  return {
    rowNumber,
    id: String(getCell_(row, map, ['Product ID','ID','ProductID']) || '').trim(),
    name: String(getCell_(row, map, ['Product Name','Name','Title']) || '').trim(),
    category: String(getCell_(row, map, ['Category','Product Category']) || 'Uncategorized').trim(),
    brand: String(getCell_(row, map, ['Brand']) || '').trim(),
    sku: String(getCell_(row, map, ['SKU']) || '').trim(),
    price: Number(getCell_(row, map, ['Price','Unit Price','Amount']) || 0),
    stock: Number(getCell_(row, map, ['Stock','Qty','Quantity Available']) || 0),
    status: String(getCell_(row, map, ['Status']) || 'Active').trim(),
    featured: normalizeBoolean_(getCell_(row, map, ['Featured','Is Featured'])),
    image: String(getCell_(row, map, ['Image URL','Image','Image Url','Photo']) || '').trim(),
    description: String(getCell_(row, map, ['Description','Details']) || '').trim(),
    tags: String(getCell_(row, map, ['Tags','Keywords']) || '').trim(),
    createdAt: formatDateValue_(getCell_(row, map, ['Created At','Created'])),
    updatedAt: formatDateValue_(getCell_(row, map, ['Updated At','Updated','Modified At']))
  };
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  const raw = e.postData.contents;
  try { return JSON.parse(raw); } catch (err) {}
  const obj = {};
  raw.split('&').forEach(part => {
    const pieces = part.split('=');
    if (!pieces[0]) return;
    obj[decodeURIComponent(pieces[0])] = decodeURIComponent((pieces[1] || '').replace(/\+/g, ' '));
  });
  return obj;
}

function repairMissingProductIds_(sheet, values, map) {
  const idIndex = map[normalizeHeader_('Product ID')];
  const categoryIndex = map[normalizeHeader_('Category')];
  if (idIndex === undefined) return;
  const updates = [];
  for (let r = 1; r < values.length; r++) {
    if (!values[r][idIndex] && values[r].join('').trim()) {
      const category = categoryIndex !== undefined ? String(values[r][categoryIndex] || 'PRD') : 'PRD';
      const prefix = category.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'PRD';
      updates.push({ row: r + 1, value: prefix + '-' + Utilities.formatString('%04d', r) });
    }
  }
  updates.forEach(u => sheet.getRange(u.row, idIndex + 1).setValue(u.value));
}

function deductStock_(sheet, rowNumber, map, quantity) {
  const stockIndex = map[normalizeHeader_('Stock')];
  if (stockIndex === undefined) return;
  const cell = sheet.getRange(rowNumber, stockIndex + 1);
  const current = Number(cell.getValue() || 0);
  cell.setValue(Math.max(0, current - quantity));
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function ensureHeaders_(sheet, headers) {
  const current = sheet.getLastRow() >= 1 ? sheet.getRange(1, 1, 1, Math.max(headers.length, sheet.getLastColumn())).getValues()[0] : [];
  const map = getHeaderMap_(current);
  let changed = false;
  headers.forEach((h, i) => {
    if (map[normalizeHeader_(h)] === undefined) {
      sheet.getRange(1, i + 1).setValue(h);
      changed = true;
    }
  });
  if (changed || sheet.getFrozenRows() !== 1) styleSheet_(sheet, Math.max(headers.length, sheet.getLastColumn()));
}

function styleSheet_(sheet, colCount) {
  if (sheet.getLastRow() === 0) return;
  sheet.setFrozenRows(1);
  const header = sheet.getRange(1, 1, 1, colCount);
  header.setBackground('#0f172a').setFontColor('#ffffff').setFontWeight('bold').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);
  sheet.autoResizeColumns(1, colCount);
  try { sheet.getFilter() || sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), colCount).createFilter(); } catch (err) {}
}

function styleNewOrderRow_(sheet) {
  const row = sheet.getLastRow();
  if (row < 2) return;
  sheet.getRange(row, 2).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange(row, 6, 1, 3).setNumberFormat('#,##0.00');
  sheet.autoResizeColumns(1, Math.min(sheet.getLastColumn(), ORDER_HEADERS.length));
}

function getHeaderMap_(headers) {
  const map = {};
  headers.forEach((h, i) => { if (h !== '') map[normalizeHeader_(h)] = i; });
  return map;
}

function normalizeHeader_(h) { return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function getCell_(row, map, names) {
  for (let i = 0; i < names.length; i++) {
    const idx = map[normalizeHeader_(names[i])];
    if (idx !== undefined) return row[idx];
  }
  return '';
}
function normalizeBoolean_(value) { return ['yes','true','1','featured'].indexOf(String(value).toLowerCase().trim()) >= 0; }
function required_(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') throw new Error(label + ' is required');
  return String(value).trim();
}
function makeOrderId_() {
  const tz = Session.getScriptTimeZone();
  return 'ORD-' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd-HHmmss') + '-' + Math.floor(1000 + Math.random() * 9000);
}
function getDailySheetName_() {
  return 'Orders_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}
function formatDateValue_(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
