import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareProductionWorker } from '../server/cloudflare-access.js';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';
import { dateOffset } from '../server/seed.js';

const host='ops.example.test',origin='https://'+host,owner='owner@example.test',manager='manager@example.test';
const jwkId='telegram-fixture';

async function nativeFixture(t){
  const DB=localDb();
  t.after(()=>DB.close());
  const env={DB,BUCKET:{},TEAMS_MODE:'team',TEAMS_APP_HOST:host,TEAMS_OWNER_EMAIL:owner,TEAMS_AUTH_MODE:'teams',
    TEAMS_AUTH_SECRET:'fixture-only-unshared-signing-credential',TEAMS_AUTH_RESEND_API_KEY:'resend-test-fixture',
    TEAMS_AUTH_EMAIL_FROM:'TEAMS Operations <auth@example.test>',TEAMS_TELEGRAM_CLIENT_ID:'123456789',
    TEAMS_TELEGRAM_CLIENT_SECRET:'telegram-test-fixture',TEAMS_TELEGRAM_BOT_TOKEN:'telegram-bot-fixture'};
  const gateway=cloudflareProductionWorker(worker),emailCodes=new Map(),notices=[];
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:jwkId,alg:'RS256',use:'sig'};
  const oauthIdentities=new Map();
  t.mock.method(globalThis,'fetch',async(input,opts={})=>{
    const url=new URL(input);
    if(url.href==='https://api.resend.com/emails'){
      assert.equal(opts.headers.Authorization,'Bearer '+env.TEAMS_AUTH_RESEND_API_KEY);
      const payload=JSON.parse(opts.body),match=payload.text.match(/\b\d{8}\b/);
      assert.ok(match);
      emailCodes.set(payload.to[0],match[0]);
      return Response.json({id:'mock-message'});
    }
    if(url.href==='https://oauth.telegram.org/token'){
      const params=new URLSearchParams(opts.body),identity=oauthIdentities.get(params.get('code'));
      assert.equal(params.get('redirect_uri'),origin+'/auth/telegram/callback');
      const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(params.get('code_verifier')))).toString('base64url');
      assert.equal(challenge,identity.challenge);
      const now=Math.floor(Date.now()/1000),encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
      const jwt=encode({alg:'RS256',kid:jwkId})+'.'+encode({iss:'https://oauth.telegram.org',aud:identity.aud??env.TEAMS_TELEGRAM_CLIENT_ID,
        iat:now,exp:now+600,sub:identity.subject,id:identity.id,name:'Verified Telegram fixture',preferred_username:'fixture'});
      const signature=Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(jwt))).toString('base64url');
      return Response.json({id_token:jwt+'.'+signature});
    }
    if(url.href==='https://oauth.telegram.org/.well-known/jwks.json')return Response.json({keys:[jwk]});
    assert.equal(url.href,'https://api.telegram.org/bot'+env.TEAMS_TELEGRAM_BOT_TOKEN+'/sendMessage');
    notices.push(JSON.parse(opts.body));
    return Response.json({ok:true,result:{message_id:1}});
  });
  const call=(path,{cookie,form,body,headers={}}={})=>gateway.fetch(new Request(origin+path,{
    method:form||body?'POST':'GET',headers:{...(cookie?{Cookie:cookie}:{}),...(form||body?{Origin:origin}:{}),...headers},
    body:form?new URLSearchParams(form):body?JSON.stringify(body):undefined,
  }),env,{});
  const takeCookie=(response,name)=>response.headers.getSetCookie().map(value=>value.split(';',1)[0]).find(value=>value.startsWith(name+'='));
  const startEmail=email=>call('/auth/email/start',{form:{email}});
  const verifyEmail=(cookie,code)=>call('/auth/email/verify',{cookie,form:{code}});
  async function emailLogin(email){
    const challenge=takeCookie(await startEmail(email),'__Host-teams-email');
    const response=await verifyEmail(challenge,emailCodes.get(email));
    assert.equal(response.status,303,await response.clone().text());
    return takeCookie(response,'__Host-teams-session');
  }
  const action=(cookie,action,data,key=crypto.randomUUID())=>call('/api/action',{cookie,body:{action,data,key}});
  async function save(cookie,actionName,data,key){
    const response=await action(cookie,actionName,data,key);
    assert.equal(response.status,200,await response.clone().text());
    return response.json();
  }
  const state=async cookie=>(await call('/api/state',{cookie})).json();
  const telegramAdmin=(cookie,data)=>call('/api/telegram/account',{cookie,body:data});
  async function telegramLogin(identity,{invite='',connectCookie='',wrongCookie=false}={}){
    const start=await call(connectCookie?'/auth/telegram/connect':'/auth/telegram/start',{cookie:connectCookie,form:{invite}});
    assert.equal(start.status,303,await start.clone().text());
    const authorize=new URL(start.headers.get('Location'));
    assert.equal(authorize.origin,'https://oauth.telegram.org');
    assert.equal(authorize.searchParams.get('scope'),'openid profile telegram:bot_access');
    const code=crypto.randomUUID();
    oauthIdentities.set(code,{...identity,challenge:authorize.searchParams.get('code_challenge')});
    const handshake=takeCookie(start,'__Host-teams-telegram'),callback='/auth/telegram/callback?'+new URLSearchParams({code,state:authorize.searchParams.get('state')});
    const response=await call(callback,{cookie:wrongCookie?'': [handshake,connectCookie].filter(Boolean).join('; ')});
    const cookie=takeCookie(response,'__Host-teams-session');
    return {response,cookie,callback,handshake};
  }
  return {env,DB,notices,call,state,startEmail,verifyEmail,emailLogin,takeCookie,action,save,telegramAdmin,telegramLogin,emailCodes,gateway};
}

test('Management codes are allowlisted, one-use, and logout revokes the server session',async t=>{
  const c=await nativeFixture(t);
  assert.equal((await c.call('/')).headers.get('Location'),'/sign-in');
  assert.equal((await c.call('/api/state',{headers:{'x-teams-native-account':'platform-owner','oai-authenticated-user-id':'forged'}})).status,401);
  assert.equal((await c.call('/sign-in')).status,200);
  const first=await c.startEmail(owner);
  assert.match(first.headers.get('Set-Cookie'),/Secure; HttpOnly; SameSite=Lax/);
  const emailCookie=c.takeCookie(first,'__Host-teams-email'),code=c.emailCodes.get(owner);
  assert.equal((await c.verifyEmail(emailCookie,code==='00000000'?'10000000':'00000000')).status,401);
  const verified=await c.verifyEmail(emailCookie,code);
  assert.equal(verified.status,303);
  assert.equal((await c.verifyEmail(emailCookie,code)).status,401);
  const admin=c.takeCookie(verified,'__Host-teams-session');
  assert.equal((await c.state(admin)).actor.platformAdmin,true);
  await c.save(admin,'employee.upsert',{name:'Staff fixture',email:'staff@example.test',roles:['estimator'],active:true});
  await c.startEmail('staff@example.test');
  assert.equal(c.emailCodes.has('staff@example.test'),false);
  const badLogout=await c.call('/auth/logout',{cookie:admin,form:{confirm:'yes'},headers:{Origin:'https://another.example'}});
  assert.equal(badLogout.status,403);
  assert.equal((await c.call('/auth/logout',{cookie:admin,form:{confirm:'yes'}})).headers.get('Location'),'/sign-in');
  assert.equal((await c.call('/api/state',{cookie:admin})).status,401);
});

test('Telegram invitations bind a verified account after review and preserve task, email and delivery permissions',async t=>{
  const c=await nativeFixture(t),admin=await c.emailLogin(owner);
  const leader=await c.save(admin,'employee.upsert',{name:'Project manager fixture',email:manager,roles:['manager'],active:true,mailboxGrants:['general']});
  const projectManager=await c.emailLogin(manager);
  assert.deepEqual((await c.state(projectManager)).mailboxes,['general']);
  const profile=await c.save(admin,'employee.upsert',{name:'Field staff fixture',roles:['installation_technician'],active:true});
  const denied=await c.telegramAdmin(admin,{employeeId:leader.id,operation:'invite'});
  assert.equal(denied.status,422);
  const {invite}=await(await c.telegramAdmin(admin,{employeeId:profile.id,operation:'invite'})).json();
  const token=invite.split('/').at(-1),person={id:987654321,subject:'verified-staff-subject'};
  assert.equal((await c.telegramLogin(person,{wrongCookie:true})).response.status,401);
  assert.equal((await c.telegramLogin({...person,aud:'another-client'})).response.status,401);
  const pending=await c.telegramLogin(person,{invite:token});
  assert.equal(pending.response.status,200);
  assert.match(await pending.response.text(),/supervisor will verify/);
  assert.equal(pending.cookie,undefined);
  assert.equal((await c.telegramLogin(person)).response.status,403);
  const approve=await c.telegramAdmin(admin,{employeeId:profile.id,operation:'approve',chatId:String(person.id)});
  assert.equal(approve.status,200,await approve.clone().text());
  const login=await c.telegramLogin(person);
  assert.equal(login.response.status,303,await login.response.clone().text());
  assert.equal((await c.call(login.callback,{cookie:login.handshake})).status,401);
  const staff=login.cookie;
  const staffState=await c.state(staff);
  assert.equal(staffState.actor.id,'employee:'+profile.id);
  assert.equal(staffState.actor.authMethod,'telegram');
  assert.deepEqual(staffState.mailboxes,[]);
  assert.equal((await c.action(staff,'mail.save',{mailbox:'general',subject:'Unauthorized mail'})).status,403);
  const client=await c.save(projectManager,'client.create',{name:'Private customer fixture'});
  const project=await c.save(projectManager,'project.create',{name:'Restricted site fixture',location:'Private address',clientId:client.id,
    service:'MEP',managerEmployeeId:leader.id,currency:'USD',value:40000,budget:12000,contract:'Fixture',start:dateOffset(),end:dateOffset(90)});
  await c.save(admin,'platform.telegram.update',{enabled:true,projects:'-1001234567890',reports:'-1001111111111'});
  assert.ok(!(await c.state(staff)).records.some(row=>row.id===project.id));
  const actionKey=crypto.randomUUID(),task={projectId:project.id,ownerEmployeeId:profile.id,name:'Sensitive task title fixture',due:dateOffset(1)};
  const taskRecord=await c.save(projectManager,'task.create',task,actionKey);
  assert.equal((await c.save(projectManager,'task.create',task,actionKey)).replayed,true);
  assert.ok((await c.state(staff)).records.some(row=>row.id===taskRecord.id));
  await Promise.all([c.gateway.scheduled({scheduledTime:Date.now()},c.env),c.gateway.scheduled({scheduledTime:Date.now()},c.env)]);
  const taskNotices=c.notices.filter(notice=>notice.text.includes('A project task was assigned.'));
  assert.deepEqual(taskNotices.map(notice=>String(notice.chat_id)).sort(),['-1001234567890',String(person.id)].sort());
  assert.doesNotMatch(JSON.stringify(c.notices),/Sensitive task title fixture|Restricted site fixture|40000|Private customer fixture/);
  await c.save(projectManager,'task.create',{...task,name:'Another fixture task'});
  await c.save(admin,'employee.remove',{id:profile.id,reason:'End pilot fixture'});
  assert.equal((await c.call('/api/state',{cookie:staff})).status,401);
  await c.gateway.scheduled({scheduledTime:Date.parse('2026-11-16T01:05:00Z')},c.env);
  assert.equal(c.notices.filter(notice=>String(notice.chat_id)===String(person.id)).length,1);
  assert.ok(c.DB.prepare("SELECT id FROM teams_telegram_outbox WHERE category='reports'").first());
});
