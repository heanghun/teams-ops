import { build } from 'esbuild';
import { embedBrowserStartup, versionBrowserAssets } from './browser-assets.mjs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';

const files = ['index.html', 'app.js', 'actions.js', 'demo.js', 'role-planning.js', 'role-session.js', 'style.css', 'localization.js', 'pwa.js', 'manifest.webmanifest', 'offline.html', 'deployment-guide.html', 'assets/Noto-font-license.txt', 'assets/fontkit-license.txt', 'operating-model.js', 'boq.js', 'master-import.js', 'icons.js', 'vendor/pdf.min.mjs', 'vendor/pdf.worker.min.mjs'];
let assets = Object.fromEntries(await Promise.all(files.map(async name => [
  name === 'index.html' ? '/' : '/' + name, await readFile('public/' + name, 'utf8'),
])));
const images = { 'teams-wordmark.webp':'image/webp', 'teams-field.webp':'image/webp', 'teams-mark.png':'image/png', 'pwa-192.png':'image/png', 'pwa-512.png':'image/png', 'pwa-180.png':'image/png', 'invoice-latin-regular.ttf':'font/ttf', 'invoice-latin-bold.ttf':'font/ttf', 'noto-khmer-regular.ttf':'font/ttf', 'noto-khmer-bold.ttf':'font/ttf' };
for (const [file,type] of Object.entries(images)) {
  assets['/assets/' + file] = { type, base64:(await readFile('public/assets/' + file)).toString('base64') };
}
const modules = ['invoice-fontkit','invoice-fonts','invoice-document','finance','seed', 'domain', 'mail-model', 'tender-estimating', 'xlsx-template', 'documents', 'letterhead-brand', 'letterhead', 'presentation', 'email', 'mail-service', 'roster', 'ai-review', 'platform', 'worker', 'cloudflare-access'];
const source = await Promise.all(modules.map(name => readFile('server/' + name + '.js', 'utf8')));
modules.forEach((name, index) => { if(!['email','mail-service','roster','ai-review','platform','worker','cloudflare-access'].includes(name))assets['/server/' + name + '.js'] = source[index]; });
const {outputFiles}=await build({
  entryPoints:['public/app.js'],bundle:true,format:'esm',platform:'browser',
  target:'es2022',minify:true,write:false,external:['./demo.js','/vendor/pdf.min.mjs'],
});
const bundledScript=outputFiles[0].text;
const buildId=createHash('sha256').update(JSON.stringify(assets)).update(bundledScript).digest('hex').slice(0,16);
const versioned=versionBrowserAssets(assets,buildId);
assets=versioned.assets;
// The authorized HTML carries the startup code. Offline guidance can be installed
// without fetching the individual JavaScript modules again.
const {html,scriptHash}=embedBrowserStartup(assets,bundledScript,buildId);
assets['/']=html;
const shellAssets=versioned.precache.filter(path=>!/\.m?js\?/.test(path));
assets['/sw.js']=(await readFile('public/sw.js','utf8')).replace('__TEAMS_BUILD__',buildId).replace('__TEAMS_ASSETS__',JSON.stringify(shellAssets));
const bundle = 'const assets = ' + JSON.stringify(assets) + ';\n' +
  'const startupScriptHash = ' + JSON.stringify(scriptHash) + ';\n' +
  source.map(part => part.replace(/^import .*\n/gm, '').replace(/^export default (invoiceFontkit|operationsWorker);$/gm,'').replace(/^export (?=(const|function|class) )/gm, '')).join('\n') +
  '\nexport default cloudflareProductionWorker(operationsWorker);\n';
await rm('dist', { recursive: true, force: true });
await mkdir('dist/server', { recursive: true });
await writeFile('dist/server/index.js', bundle);
