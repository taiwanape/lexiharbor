import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.ico': 'image/x-icon', '.css': 'text/css', '.svg': 'image/svg+xml' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (pathname === '/' || pathname === '/lexiharbor') { res.writeHead(302, { Location: '/lexiharbor/' }); res.end(); return; }
    const file = path.resolve(root, pathname.replace(/^\/lexiharbor\//, '').replace(/^\//, '') || 'index.html');
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8081, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:8081/lexiharbor/\n'));
