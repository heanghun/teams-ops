import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareProductionWorker } from '../server/cloudflare-access.js';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';

const host = 'ops.teams.com.kh';
const audience = 'test-audience';
const headers = {
  'oai-authenticated-user-id':'claimed-admin',
  'oai-authenticated-user-email':'owner@example.test',
  'X-Teams-Demo-Role':'director',
};
const devEnv = {TEAMS_MODE:'team',TEAMS_APP_HOST:host,TEAMS_ACCESS_AUD:audience,TEAMS_OWNER_EMAIL:'owner@example.test',DB:{},BUCKET:{}};
const cfAccess = (email, aud=audience) => ({access:{aud,getIdentity:async()=>({email})}});

test('Standalone Worker denies unverified identity, an incorrect app audience and other hosts',async()=>{
  const protectedWorker=cloudflareProductionWorker({fetch:()=>assert.fail('Unverified traffic reached the app')});
  const req=(url='https://'+host+'/api/state')=>new Request(url,{headers});
  assert.equal((await protectedWorker.fetch(req(),devEnv,{})).status,401);
  assert.equal((await protectedWorker.fetch(req(),devEnv,cfAccess('owner@example.test','another-app'))).status,401);
  assert.equal((await protectedWorker.fetch(req(),devEnv,cfAccess(''))).status,401);
  assert.equal((await protectedWorker.fetch(req(),{...devEnv,TEAMS_MODE:'public-demo'},cfAccess('owner@example.test'))).status,503);
  assert.equal((await protectedWorker.fetch(req(),{...devEnv,TEAMS_ACCESS_AUD:''},cfAccess('owner@example.test'))).status,503);
  assert.equal((await protectedWorker.fetch(req('https://preview.workers.dev/api/state'),devEnv,cfAccess('owner@example.test'))).status,404);
});

test('A verified employee identity replaces supplied headers and team roles remain enforced',async t=>{
  const DB=localDb();
  t.after(()=>DB.close());
  const protectedWorker=cloudflareProductionWorker(worker);
  const env={...devEnv,DB};
  const request=()=>new Request('https://'+host+'/api/state',{headers});
  assert.equal((await protectedWorker.fetch(request(),env,cfAccess('other@example.test'))).status,403);
  const response=await protectedWorker.fetch(request(),env,cfAccess(' Owner@example.test '));
  assert.equal(response.status,200);
  const result=await response.json();
  assert.equal(result.actor.id,'cloudflare-access:owner@example.test');
  assert.equal(result.actor.email,'owner@example.test');
  assert.deepEqual(result.actor.roles,['admin']);
  assert.deepEqual(result.demoRoles,[]);
  assert.deepEqual(result.records.map(record=>record.kind),['employee']);
  assert.equal(result.actor.platformAdmin,true);
  assert.equal(result.platform.directorSetupAvailable,true);
});

test('Receiving mail still requires its provider signature',async()=>{
  const protectedWorker=cloudflareProductionWorker(worker);
  const env={...devEnv,TEAMS_RESEND_API_KEY:'test-only',TEAMS_RESEND_WEBHOOK_SECRET:'whsec_dGVzdC1vbmx5'};
  const path='https://'+host+'/api/mail/webhook';
  const response=await protectedWorker.fetch(new Request(path,{method:'POST',headers,body:'{}'}),env,{});
  assert.equal(response.status,401);
  assert.equal((await protectedWorker.fetch(new Request(path,{headers}),env,{})).status,401);
});

test('Old sign-out links hand off only to the Cloudflare Access logout on this host',async()=>{
  const protectedWorker=cloudflareProductionWorker({fetch:()=>assert.fail('Sign-out is handled by the Access gateway')});
  const response=await protectedWorker.fetch(new Request('https://'+host+'/signout-with-chatgpt?return_to=https%3A%2F%2Fother.example'),devEnv,{});
  assert.equal(response.status,302);
  assert.equal(response.headers.get('Location'),'/cdn-cgi/access/logout');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
});
