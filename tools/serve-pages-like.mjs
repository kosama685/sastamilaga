// Local static server that behaves like GitHub Pages: /dir -> /dir/, /dir/ -> index.html, and any unknown address gets
// 404.html with a genuine 404 status. Usage: node tools/serve-pages-like.mjs [rootDir] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || '.'), PORT = Number(process.argv[3]) || 8791;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.csv': 'text/csv', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const send = (res, status, file) => {
  const buf = fs.readFileSync(file); res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': buf.length, 'Cache-Control': 'no-store' }); res.end(buf);
};
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname), f = path.join(ROOT, p);
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    let st = fs.statSync(f);
    if (st.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' + u.search }); return res.end(); }
      f = path.join(f, 'index.html'); st = fs.statSync(f);
    }
    return send(res, 200, f);
  } catch (e) { return send(res, 404, path.join(ROOT, '404.html')); }
}).listen(PORT, () => console.log(`serving ${ROOT} on http://localhost:${PORT} (404.html fallback, like GitHub Pages)`));
