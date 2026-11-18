import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { translate,khmer } from '../public/localization.js';
import worker from '../server/worker.js';
const origin='https://operations.example.test';
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
const allowlist=['/offline.html','/style.css','/app.js','/assets/pwa-192.png'];
function serviceWorker({offline=false,stored=null,list=allowlist}={}){
  const events={},calls=[],self={location:{origin},clients:{claim:async()=>calls.push('claim')},skipWaiting:()=>calls.push('skip'),addEventListener:(name,callback)=>events[name]=callback};
  const cache={addAll:async requests=>calls.push(['precache',requests.map(x=>new URL(x.url).pathname)]),match:async req=>{calls.push(['cache',typeof req==='string'?req:new URL(req.url).pathname]);return stored;}};
  const caches={open:async()=>cache,keys:async()=>['teams-shell-old','unrelated-cache'],delete:async key=>calls.push(['delete',key]),match:async path=>new Response('Bilingual offline guidance')};
  const requests=async req=>{calls.push(['network',req.url||req]);if(offline)throw Error('network offline');return new Response('public asset');};
  class ShellRequest extends Request{constructor(url,opts){super(new URL(url,origin),opts);}}
  runInNewContext(source.replace('__TEAMS_BUILD__','qa').replace('__TEAMS_ASSETS__',JSON.stringify(list)),{self,caches,fetch:requests,Request:ShellRequest,Response,URL,Set});
  async function fetchEvent(path,options={}){let response;events.fetch({request:{url:new URL(path,origin).href,method:'GET',mode:'cors',...options},respondWith:p=>response=p});return response?await response:null;}
  return {events,calls,fetchEvent};
}

test('Khmer translates workflow labels while names, leading-zero IDs and typed content keep original values',()=>{
  for(const key of ['Home','Request purchase','Create requisition','Approved for Bid','Maintenance Supervisor','Stock count','Email','Production readiness'])assert.match(translate(key,'km'),/[\u1780-\u17ff]/);
  for(const text of ['00019','Demo Estimator','MAT-0034 / Ball Valve - DN40','Client entered Khmer: សួស្ដី','MEP-031']){assert.equal(translate(text,'km'),text);assert.equal(translate(text,'en'),text);}
  assert.equal(translate('Quantity line 2','km'),khmer.Quantity+' បន្ទាត់ 2');
  assert.equal(translate('3 material lines','km'),'3 បន្ទាត់សម្ភារៈ');
});

test('Manifest launches the same scoped application and provides real large and Apple launcher icons',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/#home');
  for(const icon of manifest.icons){const bytes=await readFile(new URL('../public'+icon.src,import.meta.url));assert.equal(bytes.readUInt32BE(16),Number(icon.sizes.split('x')[0]));assert.equal(bytes.readUInt32BE(20),Number(icon.sizes.split('x')[1]));}
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');assert.match(html,/apple-touch-icon/);assert.match(html,/viewport-fit=cover/);assert.match(html,/<link rel="manifest"[^>]*crossorigin="use-credentials"/);assert.doesNotMatch(JSON.stringify(manifest),/private|personnel|emailFrom|token/i);
});

test('Service worker never intercepts operational writes, private APIs, identity or non-allowlisted files',async()=>{
  const sw=serviceWorker();
  for(const [path,options]of [['/api/state',{}],['/api/mail/file/private/0',{}],['/api/action',{method:'POST'}],['/signin-with-chatgpt',{}],['/api/file/a',{}],['/assets/pwa-192.png?token=private',{}],['https://external.example.test/app.js',{}],['/private-document.pdf',{}]])assert.equal(await sw.fetchEvent(path,options),null,path);
  assert.equal(sw.calls.length,0);
});

test('Offline navigation shows guidance and cannot return cached business data; public assets use only the allowlist',async()=>{
  const sw=serviceWorker({offline:true});const res=await sw.fetchEvent('/',{mode:'navigate'});assert.equal(await res.text(),'Bilingual offline guidance');
  const cached=serviceWorker({stored:new Response('static shell')});assert.equal(await(await cached.fetchEvent('/style.css')).text(),'static shell');
  let pending;cached.events.install({waitUntil:p=>pending=p});await pending;
  const precached=cached.calls.find(x=>Array.isArray(x)&&x[0]==='precache')[1];assert.deepEqual([...precached],allowlist);assert.ok(!cached.calls.includes('skip'));
});

test('Service worker updates wait for an explicit action and only retire their own old caches',async()=>{
  const sw=serviceWorker();sw.events.message({data:{type:'other'}});assert.ok(!sw.calls.includes('skip'));sw.events.message({data:{type:'ACTIVATE_UPDATE'}});assert.ok(sw.calls.includes('skip'));
  let pending;sw.events.activate({waitUntil:p=>pending=p});await pending;assert.ok(sw.calls.some(x=>Array.isArray(x)&&x[0]==='delete'&&x[1]==='teams-shell-old'));assert.ok(!sw.calls.some(x=>Array.isArray(x)&&x[0]==='delete'&&x[1]==='unrelated-cache'));
});

test('Liveness is no-store and does not access employee records or initialize a database',async()=>{
  const env={TEAMS_MODE:'public-demo',DB:{prepare(){throw Error('must not access database');}}};
  const res=await worker.fetch(new Request(origin+'/api/health'),env);assert.equal(res.status,200);assert.deepEqual(await res.json(),{status:'ok',service:'teams-operations'});assert.match(res.headers.get('Cache-Control'),/no-store/);
});


test('Service worker uses only explicitly versioned public scripts and rejects stale or private query variants',async()=>{
  const url='/app.js?v=0123456789abcdef',sw=serviceWorker({stored:new Response('current release'),list:[url,'/offline.html']});
  assert.equal(await(await sw.fetchEvent(url)).text(),'current release');
  for(const path of ['/app.js','/app.js?v=old','/app.js?token=private','/api/state?v=0123456789abcdef'])assert.equal(await sw.fetchEvent(path),null,path);
});
