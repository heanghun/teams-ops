import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { embedBrowserStartup, versionBrowserAssets } from '../scripts/browser-assets.mjs';
const version='0123456789abcdef';
test('A new HTML document and its complete module graph bypass an old cache-first PWA release',()=>{
  const input={
    '/':'<link rel="stylesheet" href="/style.css"><script type="module" src="/app.js"></script>',
    '/app.js':"import {x} from './localization.js'; const load=()=>import('./demo.js'); const worker='/vendor/pdf.worker.min.mjs';",
    '/localization.js':'export const x=1;',
    '/demo.js':"import {x} from '../server/domain.js';",
    '/server/domain.js':"import {x} from './seed.js';",
    '/server/seed.js':'export const x=1;',
    '/vendor/pdf.worker.min.mjs':'export const worker=1;',
    '/style.css':'body{color:black}',
    '/offline.html':'<link rel="stylesheet" href="/style.css">Offline',
    '/assets/icon.png':{type:'image/png',base64:'AA=='},
  };
  const result=versionBrowserAssets(input,version);
  assert.match(result.assets['/'],/app\.js\?v=0123456789abcdef/);
  assert.match(result.assets['/app.js'],/localization\.js\?v=0123456789abcdef/);
  assert.match(result.assets['/app.js'],/import\('\.\/demo\.js\?v=0123456789abcdef'\)/);
  assert.match(result.assets['/app.js'],/pdf\.worker\.min\.mjs\?v=0123456789abcdef/);
  assert.match(result.assets['/demo.js'],/domain\.js\?v=0123456789abcdef/);
  assert.match(result.assets['/server/domain.js'],/seed\.js\?v=0123456789abcdef/);
  assert.match(result.assets['/offline.html'],/style\.css\?v=0123456789abcdef/);
  assert.equal(result.assets['/assets/icon.png'],input['/assets/icon.png']);
  for(const path of result.precache)assert.ok(!path.startsWith('/api/'));
  assert.ok(!result.precache.includes('/app.js'));assert.ok(result.precache.includes('/app.js?v='+version));
  // V13's worker ignores query URLs, so the new graph goes to the current server.
  for(const path of result.precache.filter(x=>/\.(?:m?js|css)\?/.test(x)))assert.ok(new URL(path,'https://qa.example.test').search);
});
test('Asset versioning preserves external integrations and rejects an invalid release identifier',()=>{
  const source="import x from 'external-package'; const remote='https://provider.example.test/sdk.js';";
  assert.equal(versionBrowserAssets({'/app.js':source},version).assets['/app.js'],source);
  assert.throws(()=>versionBrowserAssets({},'bad build'),/Invalid browser build/);
});

test('The production page includes its startup assets and hashes the exact inline JavaScript',()=>{
  const {assets}=versionBrowserAssets({
    '/':'<link rel="stylesheet" href="/style.css"><script type="module" src="/app.js"></script>',
    '/style.css':'body{color:black}',
    '/app.js':"import './actions.js';",
    '/actions.js':'export const action=1;',
    '/vendor/pdf.min.mjs':'export const pdf=1;',
  },version);
  const shell=embedBrowserStartup(assets,"const load=()=>import('/vendor/pdf.min.mjs');",version);
  assert.match(shell.html,/<style>body\{color:black\}<\/style>/);
  assert.doesNotMatch(shell.html,/(?:src|href)=/);
  const script=shell.html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
  assert.match(script,/pdf\.min\.mjs\?v=0123456789abcdef/);
  assert.equal(shell.scriptHash,createHash('sha256').update(script).digest('base64'));
});
