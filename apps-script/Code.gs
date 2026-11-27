/**
 * Sasta Milaga – order recorder (Google Apps Script web app).
 *
 * Setup (once):
 *  1. Create a Google Sheet. Extensions → Apps Script. Paste this file as Code.gs.
 *  2. Project Settings → Script properties → add ORDER_TOKEN = any long random text (same value as
 *     SM_CONFIG.sheetToken in assets/js/config.js). This blocks casual spam; it is not a secret from site visitors.
 *  3. Optional script property NOTIFY_EMAIL = address that gets an email per order.
 *  4. Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → copy the /exec URL
 *     into SM_CONFIG.sheetEndpoint.
 *
 * The checkout posts FormData (no custom headers, so no CORS preflight). Duplicate order_id values are ignored.
 */
var ORDER_COLS = ['Received', 'Order ID', 'Status', 'Name', 'Phone', 'Email', 'Address', 'Payment method', 'Payment status',
  'Subtotal', 'Delivery', 'Total', 'Items', 'Notes', 'Page'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var p = (e && e.parameter) || {};
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('ORDER_TOKEN');
    if (token && p.sheet_token !== token) return out({ ok: false, error: 'Invalid token' });
    var id = String(p.order_id || '').trim();
    if (!/^SM-[A-Z0-9]{4,20}$/.test(id)) return out({ ok: false, error: 'Missing or invalid order_id' });
    if (!p.full_name || !p.phone || !p.address) return out({ ok: false, error: 'Missing name, phone or address' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var orders = sheet(ss, 'Orders', ORDER_COLS);
    var ids = orders.getLastRow() > 1 ? orders.getRange(2, 2, orders.getLastRow() - 1, 1).getValues() : [];
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return out({ ok: true, order_id: id, duplicate: true });

    var clip = function (v, n) { return String(v == null ? '' : v).slice(0, n || 500); };
    orders.appendRow([new Date(), id, 'New', clip(p.full_name, 120), "'" + clip(p.phone, 40), clip(p.email, 120), clip(p.address, 500),
      clip(p.payment_method, 60), clip(p.payment_status, 300), clip(p.order_subtotal, 40), clip(p.order_delivery, 40), clip(p.order_total, 40),
      clip(p.order_items, 5000), clip(p.notes, 1000), clip(p.page, 300)]);

    var items = sheet(ss, 'Order Items', ['Order ID', 'Line']);
    String(p.order_items || '').split(/\n\s*\n/).forEach(function (line) { if (line.trim()) items.appendRow([id, clip(line.trim(), 1000)]); });

    var to = props.getProperty('NOTIFY_EMAIL');
    if (to) MailApp.sendEmail(to, 'New Sasta Milaga order ' + id + ' – ' + clip(p.order_total, 40),
      ['Name: ' + p.full_name, 'Phone: ' + p.phone, 'Address: ' + p.address, 'Payment: ' + p.payment_method + ' ' + (p.payment_status || ''), 'Total: ' + p.order_total, '', p.order_items].join('\n'));
    return out({ ok: true, order_id: id });
  } catch (err) {
    return out({ ok: false, error: String(err).slice(0, 200) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return out({ ok: true, service: 'sasta-milaga-orders' }); }

function sheet(ss, name, header) {
  var s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(header); s.setFrozenRows(1); }
  return s;
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
