import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { localDb } from './local-db.mjs';
import worker from '../server/worker.js';

await mkdir('var/files', { recursive: true });
const bucketPath = key => 'var/files/' + encodeURIComponent(key);
const env = {
  DB: localDb('var/teams.sqlite'),
  TEAMS_MODE: process.env.TEAMS_MODE || 'public-demo',
  TEAMS_OWNER_EMAIL: process.env.TEAMS_OWNER_EMAIL,
  TEAMS_RESEND_API_KEY:process.env.TEAMS_RESEND_API_KEY,
  TEAMS_EMAIL_FROM:process.env.TEAMS_EMAIL_FROM,
  TEAMS_RESEND_WEBHOOK_SECRET:process.env.TEAMS_RESEND_WEBHOOK_SECRET,
  TEAMS_EMAIL_ROUTING:process.env.TEAMS_EMAIL_ROUTING,
  BUCKET: {
    put: async (key, body) => writeFile(bucketPath(key), new Uint8Array(await new Response(body).arrayBuffer())),
    get: async key => { try { return { body: await readFile(bucketPath(key)) }; } catch { return null; } },
    delete: async key => unlink(bucketPath(key)).catch(() => {}),
  },
};
const port = Number(process.env.PORT || 4173);
createServer(async (req, res) => {
  const base = 'http://' + req.headers.host;
  const path = new URL(req.url, base).pathname;
  try {
    const file = path === '/' ? 'index.html' : path.slice(1);
    const shared = ['server/invoice-fontkit.js','server/invoice-fonts.js','server/invoice-document.js','server/finance.js','server/seed.js', 'server/domain.js', 'server/mail-model.js', 'server/tender-estimating.js', 'server/xlsx-template.js', 'server/documents.js', 'server/presentation.js', 'server/letterhead-brand.js', 'server/letterhead.js'].includes(file);
    if(file==='mobile-preview.html'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(await readFile('scripts/mobile-preview.html'));}
    if(file==='sw.js'){res.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'});return res.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));");}
    if (shared || ['index.html', 'app.js', 'actions.js', 'demo.js', 'role-planning.js', 'role-session.js', 'style.css', 'localization.js', 'pwa.js', 'manifest.webmanifest', 'offline.html', 'deployment-guide.html', 'operating-model.js', 'boq.js', 'icons.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs', 'assets/teams-wordmark.webp', 'assets/teams-field.webp', 'assets/teams-mark.png', 'assets/pwa-192.png', 'assets/pwa-512.png', 'assets/pwa-180.png', 'assets/invoice-latin-regular.ttf','assets/invoice-latin-bold.ttf','assets/noto-khmer-regular.ttf', 'assets/noto-khmer-bold.ttf', 'assets/Noto-font-license.txt','assets/fontkit-license.txt'].includes(file)) {
      const mime = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', webp: 'image/webp', png: 'image/png', ttf:'font/ttf', txt:'text/plain', webmanifest:'application/manifest+json' };
      res.writeHead(200, { 'Content-Type': mime[file.split('.').at(-1)] });
      return res.end(await readFile(shared ? file : 'public/' + file));
    }
    const headers = new Headers(req.headers);
    headers.set('oai-authenticated-user-id', 'local-owner');
    headers.set('oai-authenticated-user-email', env.TEAMS_OWNER_EMAIL || 'operator@example.test');
    const request = new Request(base + req.url, {
      method: req.method, headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Readable.toWeb(req), duplex: 'half' }),
    });
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res); else res.end();
  } catch (error) { console.error(error); res.writeHead(500).end('Local preview error'); }
}).listen(port, '0.0.0.0', () => console.log('TEAMS Operations ready on port ' + port));
