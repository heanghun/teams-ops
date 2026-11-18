import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareProductionWorker } from '../server/cloudflare-access.js';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';
import { recordPlatformIssue } from '../server/platform.js';

const host = 'ops.example.test';
const origin = 'https://' + host;
const owner = 'owner@example.test';
const secondAdmin = 'admin@example.test';
const director = 'director@example.test';
const estimator = 'estimator@example.test';
const finance = 'finance@example.test';

function platformTest(t, overrides = {}) {
  const DB = localDb(), files = new Map(), protectedWorker = cloudflareProductionWorker(worker);
  const env = {TEAMS_MODE:'team',TEAMS_APP_HOST:host,TEAMS_ACCESS_AUD:'test-aud',TEAMS_OWNER_EMAIL:owner,DB,
    BUCKET:{async put(key,body){files.set(key,await new Response(body).arrayBuffer());},async get(key){return files.has(key)?{body:files.get(key)}:null;},async delete(key){files.delete(key);}},
    ...overrides};
  t.after(()=>DB.close());
  const call = (path, email = owner, body) => protectedWorker.fetch(new Request(origin+path, {
    method:body?'POST':'GET',body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
  }),env,email?{access:{aud:'test-aud',getIdentity:async()=>({email})}}:{});
  const action = (name, data, email = owner) => call('/api/action',email,{action:name,data,key:crypto.randomUUID()});
  const saved = async (name, data, email) => {
    const response = await action(name,data,email);
    assert.equal(response.status,200,await response.clone().text());
    return response.json();
  };
  const add = (email, roles, by) => saved('employee.upsert',{name:'Test user',email,roles,active:true},by);
  const state = async email => (await call('/api/state',email)).json();
  const upload = (parentId, size, email = estimator, key = crypto.randomUUID()) => {
    const body = new FormData();
    body.set('parentId',parentId);
    body.set('key',key);
    body.set('file',new Blob([new Uint8Array(size)],{type:'text/plain'}),'test.txt');
    return call('/api/upload',email,body);
  };
  return {DB, files, call, action, saved, add, state, upload};
}

test('Production administrator receives only platform controls and redacted diagnostics', async t => {
  const c = platformTest(t,{TEAMS_RESEND_API_KEY:'secret-test-key'});
  await c.add(estimator,['estimator']);
  const client = await c.saved('client.create',{name:'Private client example'},estimator);
  assert.equal((await c.upload(client.id,12,owner)).status,403);
  assert.equal((await c.action('client.create',{name:'Blocked client'})).status,403);
  assert.equal((await c.action('master.import',{type:'client',source:'example.csv',entries:[{name:'Blocked client'}]})).status,403);
  for(const path of ['/api/audit','/api/backup','/api/export?kind=inventory','/api/tender-estimate','/api/file/secret-id']) {
    assert.equal((await c.call(path)).status,403,path);
  }
  await recordPlatformIssue(c.DB,new Request(origin+'/api/state?private=business-record',{headers:{'oai-authenticated-user-id':'cloudflare-access:'+estimator}}),200,2100);
  const platform = await c.state(owner);
  assert.deepEqual(platform.permissions,['home','platform-users','platform-settings','platform-activity']);
  assert.ok(platform.records.every(record=>record.kind==='employee'));
  assert.ok(platform.platform.activity.counts.failures>=3);
  assert.equal(platform.platform.activity.counts.slow,1);
  assert.ok(platform.platform.activity.audit.some(entry=>entry.action==='client.create'));
  assert.doesNotMatch(JSON.stringify(platform),/secret-test-key|Private client example|business-record|secret-id|"summary"|"target"/);
  const business = await c.state(estimator);
  assert.ok(business.records.some(record=>record.id===client.id));
  assert.equal(business.platform,undefined);
  assert.equal((await c.action('platform.storage.default',{limitMb:1},estimator)).status,403);
  assert.equal((await c.call('/api/state',null)).status,401);
});

test('First Managing Director setup is authorized once, auditable and safe under retries', async t => {
  const c = platformTest(t);
  await c.add(secondAdmin,['admin']);
  const data={name:'Approved director',email:director,reference:'Signed appointment reference'};
  assert.equal((await c.action('platform.director.initialize',data,secondAdmin)).status,403);
  assert.equal((await c.action('platform.director.initialize',{...data,email:owner})).status,422);
  assert.equal((await c.action('employee.upsert',{...data,roles:['director']})).status,403);
  const a=await Promise.all([c.action('platform.director.initialize',data),c.action('platform.director.initialize',data)]);
  assert.deepEqual(a.map(response=>response.status).sort(),[200,409]);
  assert.equal((await c.state(owner)).platform.directorSetupAvailable,false);
  const entry = c.DB.prepare("SELECT actor, summary FROM audit WHERE action='platform.director.initialize'").first();
  assert.equal(entry.actor,'cloudflare-access:'+owner);
  assert.equal(JSON.parse(entry.summary)[0].reason,data.reference);
  assert.deepEqual((await c.state(director)).actor.roles,['director']);
  assert.ok((await c.state(director)).permissions.includes('settings'));
  assert.equal((await c.action('employee.upsert',{name:'Temporary administrator',email:'other@example.test',roles:['admin']},director)).status,403);
  assert.equal((await c.action('employee.upsert',{name:'Disabling last director',email:director,roles:['director'],active:false},director)).status,409);
  await c.add(finance,['finance'],director);
  assert.deepEqual((await c.state(finance)).actor.roles,['finance']);
  assert.equal((await c.action('employee.upsert',{name:'Separate account',email:'other@example.test',roles:['admin','manager']})).status,422);
});

test('Storage limits apply to concurrent uploads, duplicate submissions and email attachment copies', async t => {
  const c = platformTest(t,{TEAMS_RESEND_API_KEY:'mock-mail-key'});
  const estimatorAccount = await c.add(estimator,['estimator']);
  const client = await c.saved('client.create',{name:'Example company'},estimator);
  await c.saved('platform.storage.default',{limitMb:1});
  const uploadKey=crypto.randomUUID();
  const uploads = await Promise.all([c.upload(client.id,600_000,estimator,uploadKey),c.upload(client.id,600_000)]);
  assert.deepEqual(uploads.map(response=>response.status).sort(),[200,413]);
  assert.equal(c.files.size,1);
  const first=uploads.find(response=>response.ok);
  const document=(await first.json()).id;
  const originalKey=c.DB.prepare('SELECT request_id FROM audit WHERE target=?').bind(document).first().request_id;
  assert.equal((await(await c.upload(client.id,600_000,estimator,originalKey)).json()).replayed,true);

  await c.saved('platform.email.update',{outbound:true,fromName:'TEAMS Operations',fromEmail:'sender@example.test'});
  const draft=await c.saved('mail.save',{mailbox:'installation',to:'recipient@example.test',subject:'Quota test',body:'Test',
    relatedId:client.id,attachments:[{type:'file',id:document}]},estimator);
  const provider=t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');
    assert.equal(JSON.parse(options.body).from,'TEAMS Operations <sender@example.test>');
    return Response.json({id:'provider-fixture'});
  });
  const send={id:draft.id,key:crypto.randomUUID()};
  assert.equal((await c.call('/api/mail/send',estimator,send)).status,413);
  assert.equal(provider.mock.callCount(),0);
  await c.saved('platform.storage.user',{id:estimatorAccount.id,limitMb:2});
  assert.equal((await(await c.call('/api/mail/send',estimator,send)).json()).status,'Provider accepted');
  assert.equal(provider.mock.callCount(),1);
  assert.equal(c.files.size,2);
  assert.equal((await c.state(owner)).records.find(record=>record.id===estimatorAccount.id).storageUsedBytes,1_200_000);
  await c.saved('platform.storage.user',{id:estimatorAccount.id,limitMb:0});
  assert.equal((await c.upload(client.id,1)).status,413);
  assert.equal((await c.call('/api/file/'+document,estimator)).status,200);
});

test('Platform integration settings validate and take effect without exposing provider secrets', async t => {
  const c=platformTest(t,{TEAMS_OPENAI_API_KEY:'mock-ai-secret',TEAMS_RESEND_API_KEY:'mock-resend-secret',TEAMS_RESEND_WEBHOOK_SECRET:'mock-webhook-secret'});
  await c.add(estimator,['estimator']);
  assert.equal((await c.action('platform.email.update',{inbound:true,installation:'route@example.test',general:'route@example.test'})).status,422);
  await c.saved('platform.email.update',{inbound:true,maintenance:'service@example.test'});
  await c.saved('platform.ai.update',{enabled:true,model:'configured-model',dailyLimit:8,userDailyLimit:2});
  assert.equal((await c.state(estimator)).aiReview,true);
  const p=await c.state(owner);
  assert.equal(p.platform.emailConnection.receiving,'configured');
  assert.deepEqual(p.platform.email.routing.maintenance,['service@example.test']);
  assert.equal(p.platform.ai.model,'configured-model');
  assert.doesNotMatch(JSON.stringify(p),/mock-ai-secret|mock-resend-secret|mock-webhook-secret/);
  await c.saved('platform.ai.update',{enabled:false,model:'configured-model',dailyLimit:8,userDailyLimit:2});
  assert.equal((await c.state(estimator)).aiReview,false);
});
