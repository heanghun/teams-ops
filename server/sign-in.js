import { DomainError, canManageEmployee, teamsEmployeeIdentity, usesManagementEmail } from './domain.js';
import { json } from './presentation.js';

const teamsSessionCookie='__Host-teams-session';
const teamsEmailCookie='__Host-teams-email';
const teamsTelegramCookie='__Host-teams-telegram';
const telegramIssuer='https://oauth.telegram.org';
const ownerAccountId='platform-owner';
const encodeAuthText=value=>new TextEncoder().encode(value);
const encodeAuthBytes=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decodeAuthBytes=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
const authHash=async value=>encodeAuthBytes(await crypto.subtle.digest('SHA-256',encodeAuthText(value)));
const authToken=()=>encodeAuthBytes(crypto.getRandomValues(new Uint8Array(32)));
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const validLoginEmail=value=>value.length<=254&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
const loginEmail=value=>String(value??'').trim().toLowerCase();
const authTime=()=>Math.floor(Date.now()/1000);
const authCookie=(name,value,maxAge)=>name+'='+value+'; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age='+maxAge;
const readAuthCookie=(request,name)=>(request.headers.get('Cookie')||'').split(/;\s*/).find(part=>part.startsWith(name+'='))?.slice(name.length+1)||'';
const authEscape=value=>String(value??'').replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const authRequire=(condition,message,status=403)=>{if(!condition)throw new DomainError(message,status);};
const telegramCallback=url=>url.origin+'/auth/telegram/callback';

export const hasNativeSignIn=env=>env.TEAMS_AUTH_MODE==='teams';
const authResendKey=env=>env.TEAMS_AUTH_RESEND_API_KEY||env.TEAMS_RESEND_API_KEY;
export function nativeAuthReady(env){
  return Boolean(env.TEAMS_AUTH_SECRET?.length>=32&&authResendKey(env)&&env.TEAMS_AUTH_EMAIL_FROM&&
    /^\d{1,20}$/.test(env.TEAMS_TELEGRAM_CLIENT_ID??'')&&env.TEAMS_TELEGRAM_CLIENT_SECRET);
}

function authRedirect(location,cookies=[]){
  const headers=new Headers({Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
  for(const value of cookies)headers.append('Set-Cookie',value);
  return new Response(null,{status:303,headers});
}

function signInPage(title,{message='',content='',status=200,cookie}={}){
  const headers=new Headers({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer',
    'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self' https://oauth.telegram.org; base-uri 'none'; frame-ancestors 'none'"});
  if(cookie)headers.append('Set-Cookie',cookie);
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>'+authEscape(title)+' | TEAMS Operations</title><style>'+
    'body{min-height:100svh;margin:0;display:grid;place-items:center;background:#eff1f4;font:16px system-ui,sans-serif;color:#152334}'+
    'main{box-sizing:border-box;width:min(100% - 32px,460px);margin:24px 16px;padding:clamp(20px,5vw,36px);border-radius:18px;background:#fff;border:1px solid #d8dce4;box-shadow:0 14px 48px #1d2a4220}'+
    'img{width:160px;height:auto}h1{margin:22px 0 10px;font-size:1.5rem}p{margin:0 0 18px;color:#4e5b69}label{font-weight:600}form{display:grid;gap:10px;margin-top:16px}'+
    'input,button{box-sizing:border-box;width:100%;min-height:48px;padding:10px 14px;border-radius:9px;font:inherit}input{border:1px solid #8895a3}button{background:#172638;color:#fff;border:0;font-weight:650;cursor:pointer}'+
    'form.primary button{background:#f9ce58;color:#172638}a{color:#183650}button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #185fa9;outline-offset:3px}'+
    '</style><main><img src="/assets/teams-wordmark.webp" alt="TEAMS"><h1>'+authEscape(title)+'</h1>'+
    (message?'<p role="status">'+authEscape(message)+'</p>':'')+content+'</main></html>',{status,headers});
}

const emailEntryForm='<form class="primary" method="post" action="/auth/email/start"><label for="address">Management email</label>'+
  '<input id="address" type="email" name="email" required autocomplete="email" maxlength="254"><button>Send sign-in code</button></form>';
const codeEntryForm='<form class="primary" method="post" action="/auth/email/verify"><label for="code">Eight-digit sign-in code</label>'+
  '<input id="code" name="code" inputmode="numeric" pattern="[0-9]{8}" autocomplete="one-time-code" required maxlength="8"><button>Sign in</button></form>'+
  '<p style="margin-top:16px"><a href="/sign-in">Use another email or request a new code</a></p>';
const telegramEntryForm=(invite='')=>'<form method="post" action="/auth/telegram/start">'+
  (invite?'<input type="hidden" name="invite" value="'+authEscape(invite)+'">':'')+
  '<button>Continue with Telegram</button></form>';

async function getTeamAccount(env,accountId){
  if(accountId===ownerAccountId){
    const email=loginEmail(env.TEAMS_OWNER_EMAIL);
    return {id:ownerAccountId,name:'Platform owner',email,roles:['admin'],active:true,bootstrapOwner:true};
  }
  const result=await env.DB.prepare("SELECT payload FROM records WHERE id=? AND kind='employee'").bind(accountId).first();
  return result?JSON.parse(result.payload):null;
}

async function accountForManagementEmail(env,email){
  if(email===loginEmail(env.TEAMS_OWNER_EMAIL))return getTeamAccount(env,ownerAccountId);
  const result=await env.DB.prepare("SELECT payload FROM records WHERE kind='employee' AND json_extract(payload,'$.email')=?").bind(email).first();
  const employee=result?JSON.parse(result.payload):null;
  return employee?.active&&!employee.removedOn&&usesManagementEmail(employee.roles)?employee:null;
}

async function readTeamSession(request,env){
  const token=readAuthCookie(request,teamsSessionCookie);
  if(!tokenPattern.test(token))return null;
  const session=await env.DB.prepare('SELECT account_id,method,binding FROM teams_sessions WHERE token_hash=? AND expires_at>?')
    .bind(await authHash(token),authTime()).first();
  if(!session)return null;
  const account=await getTeamAccount(env,session.account_id);
  if(!account?.active||account.removedOn||!account.roles.length)return null;
  if(session.method==='email')return usesManagementEmail(account.roles)&&account.email===session.binding?{account,method:'email'}:null;
  if(usesManagementEmail(account.roles))return null;
  const bound=await env.DB.prepare('SELECT subject FROM teams_telegram_accounts WHERE account_id=? AND approved_at IS NOT NULL').bind(account.id).first();
  return bound?.subject===session.binding?{account,method:'telegram'}:null;
}

async function createTeamSession(env,account,method,binding,clear){
  const token=authToken(),now=authTime(),duration=8*3600;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM teams_sessions WHERE expires_at<=?').bind(now),
    env.DB.prepare('INSERT INTO teams_sessions(token_hash,account_id,method,binding,expires_at) VALUES(?,?,?,?,?)')
      .bind(await authHash(token),account.id,method,binding,now+duration),
  ]);
  return authRedirect('/',[authCookie(teamsSessionCookie,token,duration),authCookie(clear,'',0)]);
}

async function limitAuth(env,label,value,seconds,limit){
  const scope=label+':'+await authHash(value),period=Math.floor(authTime()/seconds)*seconds;
  return Boolean(await env.DB.prepare('INSERT INTO teams_auth_limits(scope,period,hits) VALUES(?,?,1) ON CONFLICT(scope,period) '+
    'DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(scope,period,limit).first());
}

const authMacKey=env=>crypto.subtle.importKey('raw',encodeAuthText(env.TEAMS_AUTH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);

async function startManagementEmail(request,env,ctx,form){
  const email=loginEmail(form.get('email')),token=authToken(),now=authTime();
  const ip=(request.headers.get('CF-Connecting-IP')||'local').slice(0,64);
  const withinIpLimit=await limitAuth(env,'email-ip',ip,3600,40);
  const eligible=withinIpLimit&&validLoginEmail(email)&&await limitAuth(env,'email-address',email,3600,5)&&
    await limitAuth(env,'email-resend',email,60,1)&&await accountForManagementEmail(env,email);
  if(eligible){
    const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%100000000).padStart(8,'0');
    const tokenHash=await authHash(token);
    const codeHash=encodeAuthBytes(await crypto.subtle.sign('HMAC',await authMacKey(env),encodeAuthText(tokenHash+':'+code)));
    await env.DB.batch([
      env.DB.prepare('DELETE FROM teams_email_codes WHERE expires_at<=? OR account_id=?').bind(now,eligible.id),
      env.DB.prepare('DELETE FROM teams_auth_limits WHERE period<?').bind(now-86400),
      env.DB.prepare('INSERT INTO teams_email_codes(token_hash,account_id,email,code_hash,expires_at) VALUES(?,?,?,?,?)')
        .bind(tokenHash,eligible.id,email,codeHash,now+600),
    ]);
    const delivery=(async()=>{
      try{
        const response=await fetch('https://api.resend.com/emails',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
          headers:{Authorization:'Bearer '+authResendKey(env),'Content-Type':'application/json','Idempotency-Key':'teams-sign-in/'+tokenHash},
          body:JSON.stringify({from:env.TEAMS_AUTH_EMAIL_FROM,to:[email],subject:'TEAMS Operations sign-in code',
            text:'Your TEAMS Operations sign-in code is '+code+'. It expires in 10 minutes. Enter it only on '+new URL(request.url).origin+'.'})});
        if(!response.ok)console.warn('TEAMS sign-in email was rejected by the configured provider.');
      }catch{console.warn('TEAMS sign-in email delivery is unavailable.');}
    })();
    if(ctx?.waitUntil)ctx.waitUntil(delivery);else await delivery;
  }
  return signInPage('Enter your sign-in code',{message:'If the email is approved for management sign-in, TEAMS will send a code.',content:codeEntryForm,
    cookie:authCookie(teamsEmailCookie,token,600)});
}

async function verifyManagementEmail(request,env,form){
  const token=readAuthCookie(request,teamsEmailCookie),code=String(form.get('code')||'').trim();
  const invalid=()=>signInPage('Enter your sign-in code',{status:401,message:'This code is invalid or expired. Try again or request a new code.',content:codeEntryForm});
  if(!tokenPattern.test(token)||!/^\d{8}$/.test(code))return invalid();
  const hash=await authHash(token),now=authTime();
  const stored=await env.DB.prepare('UPDATE teams_email_codes SET attempts=attempts+1 WHERE token_hash=? AND expires_at>? AND attempts<5 RETURNING account_id,email,code_hash')
    .bind(hash,now).first();
  if(!stored||!await crypto.subtle.verify('HMAC',await authMacKey(env),decodeAuthBytes(stored.code_hash),encodeAuthText(hash+':'+code)))return invalid();
  const consumed=await env.DB.prepare('DELETE FROM teams_email_codes WHERE token_hash=? AND expires_at>? RETURNING account_id').bind(hash,now).first();
  const account=consumed&&await accountForManagementEmail(env,stored.email);
  return account?.id===stored.account_id?createTeamSession(env,account,'email',account.email,teamsEmailCookie):invalid();
}

async function startTelegramSignIn(request,env,form,connect){
  const url=new URL(request.url),now=authTime(),invite=String(form.get('invite')||'');
  const ip=(request.headers.get('CF-Connecting-IP')||'local').slice(0,64);
  authRequire(await limitAuth(env,'telegram-ip',ip,3600,60),'Please try Telegram sign-in again later.',429);
  const session=connect?await readTeamSession(request,env):null;
  if(connect)authRequire(session,'Sign in before connecting your Telegram account.',401);
  authRequire(!invite||tokenPattern.test(invite),'This invitation is unavailable.',404);
  const state=authToken(),verifier=authToken();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM teams_telegram_flows WHERE expires_at<=?').bind(now),
    env.DB.prepare('INSERT INTO teams_telegram_flows(state_hash,verifier,invite_hash,connect_id,expires_at) VALUES(?,?,?,?,?)')
      .bind(await authHash(state),verifier,invite?await authHash(invite):null,session?.account.id??null,now+600),
  ]);
  const target=new URL(telegramIssuer+'/auth');
  target.search=new URLSearchParams({client_id:env.TEAMS_TELEGRAM_CLIENT_ID,redirect_uri:telegramCallback(url),response_type:'code',
    scope:'openid profile telegram:bot_access',state,code_challenge:await authHash(verifier),code_challenge_method:'S256'}).toString();
  return authRedirect(target.href,[authCookie(teamsTelegramCookie,state,600)]);
}

export async function verifyTelegramIdentity(token,clientId,fetcher=fetch){
  authRequire(typeof token==='string'&&token.length<=8192,'Telegram did not return a valid identity.',401);
  const parts=token.split('.');
  authRequire(parts.length===3&&parts.every(part=>/^[A-Za-z0-9_-]+$/.test(part)),'Telegram did not return a valid identity.',401);
  let header,claims;
  try{
    const decoder=new TextDecoder();
    header=JSON.parse(decoder.decode(decodeAuthBytes(parts[0])));
    claims=JSON.parse(decoder.decode(decodeAuthBytes(parts[1])));
  }catch{throw new DomainError('Telegram did not return a valid identity.',401);}
  authRequire(header?.alg==='RS256'&&typeof header.kid==='string'&&header.kid.length<=180,'Telegram identity uses an unsupported signature.',401);
  const jwks=await fetcher(telegramIssuer+'/.well-known/jwks.json',{redirect:'error',signal:AbortSignal.timeout(10000)});
  authRequire(jwks.ok,'Telegram identity verification is unavailable.',503);
  const {keys}=await jwks.json();
  const key=Array.isArray(keys)&&keys.find(item=>item.kid===header.kid&&item.kty==='RSA'&&(!item.alg||item.alg==='RS256')&&(!item.use||item.use==='sig'));
  authRequire(key,'Telegram identity key could not be verified.',401);
  const rsa=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',rsa,decodeAuthBytes(parts[2]),encodeAuthText(parts.slice(0,2).join('.')));
  const now=authTime();
  authRequire(valid&&claims?.iss===telegramIssuer&&claims.aud===clientId&&Number.isInteger(claims.exp)&&claims.exp>now&&
    Number.isInteger(claims.iat)&&claims.iat<=now+60&&claims.iat>=now-600&&
    typeof claims.sub==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(claims.sub)&&
    /^\d{1,16}$/.test(String(claims.id))&&Number.isSafeInteger(Number(claims.id))&&Number(claims.id)>0,'Telegram identity could not be verified.',401);
  return {subject:claims.sub,chatId:String(claims.id),name:String(claims.name??'').slice(0,120),username:String(claims.preferred_username??'').slice(0,64)};
}

async function finishTelegramSignIn(request,env){
  const url=new URL(request.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'',now=authTime();
  authRequire(tokenPattern.test(state)&&state===readAuthCookie(request,teamsTelegramCookie)&&code&&code.length<=2048,'Start Telegram sign-in from TEAMS again.',401);
  const flow=await env.DB.prepare('DELETE FROM teams_telegram_flows WHERE state_hash=? AND expires_at>? RETURNING verifier,invite_hash,connect_id')
    .bind(await authHash(state),now).first();
  authRequire(flow,'This Telegram sign-in request expired.',401);
  const response=await fetch(telegramIssuer+'/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),
    headers:{Authorization:'Basic '+btoa(env.TEAMS_TELEGRAM_CLIENT_ID+':'+env.TEAMS_TELEGRAM_CLIENT_SECRET),'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'authorization_code',code,client_id:env.TEAMS_TELEGRAM_CLIENT_ID,redirect_uri:telegramCallback(url),code_verifier:flow.verifier})});
  authRequire(response.ok,'Telegram could not complete sign-in. Start again.',401);
  const identity=await verifyTelegramIdentity((await response.json()).id_token,env.TEAMS_TELEGRAM_CLIENT_ID);
  const db=env.DB,args=[identity.subject,identity.chatId,identity.name,identity.username,now];
  const clear=authCookie(teamsTelegramCookie,'',0);
  if(flow.connect_id){
    const session=await readTeamSession(request,env);
    authRequire(session?.account.id===flow.connect_id,'Sign in before linking Telegram.',401);
    const linked=await db.prepare('INSERT INTO teams_telegram_accounts(account_id,subject,chat_id,name,username,linked_at,approved_at,approved_by) '+
      'VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING account_id').bind(flow.connect_id,...args,now,teamsEmployeeIdentity(session.account)).first();
    const existing=linked||await db.prepare('SELECT account_id FROM teams_telegram_accounts WHERE account_id=? AND subject=? AND chat_id=? AND approved_at IS NOT NULL')
      .bind(flow.connect_id,identity.subject,identity.chatId).first();
    authRequire(existing,'This Telegram account is already linked. Contact your administrator.',409);
    return authRedirect('/',[clear]);
  }
  if(flow.invite_hash){
    const invite=await db.prepare('SELECT employee_id FROM teams_telegram_invites WHERE token_hash=? AND expires_at>?').bind(flow.invite_hash,now).first();
    const account=invite&&await getTeamAccount(env,invite.employee_id);
    authRequire(account?.active&&!account.removedOn&&account.roles.length&&!usesManagementEmail(account.roles),'This invitation is unavailable.',403);
    const linked=await db.prepare('INSERT INTO teams_telegram_accounts(account_id,subject,chat_id,name,username,linked_at) '+
      'SELECT employee_id,?,?,?,?,? FROM teams_telegram_invites WHERE token_hash=? AND expires_at>? ON CONFLICT DO NOTHING RETURNING account_id')
      .bind(...args,flow.invite_hash,now).first();
    authRequire(linked,'This invitation or Telegram account is already in use. Contact your administrator.',409);
    await db.prepare('DELETE FROM teams_telegram_invites WHERE token_hash=?').bind(flow.invite_hash).run();
    return signInPage('Telegram account received',{message:'Your supervisor will verify your Telegram account before you can sign in.',
      content:'<a href="/sign-in">Return to sign-in</a>',cookie:clear});
  }
  const bound=await db.prepare('SELECT account_id,approved_at FROM teams_telegram_accounts WHERE subject=? AND chat_id=?')
    .bind(identity.subject,identity.chatId).first();
  const account=bound?.approved_at&&await getTeamAccount(env,bound.account_id);
  authRequire(account?.active&&!account.removedOn&&account.roles.length&&!usesManagementEmail(account.roles),
    'Telegram sign-in requires an approved employee invitation.',403);
  return createTeamSession(env,account,'telegram',identity.subject,teamsTelegramCookie);
}

export async function manageTelegramAccount(request,env,actor,records){
  const url=new URL(request.url),db=env.DB;
  authRequire(hasNativeSignIn(env)&&nativeAuthReady(env),'Telegram onboarding is unavailable.',503);
  let body={};
  if(request.method==='POST'){
    const raw=await request.text();
    authRequire(raw.length<=4096,'Telegram account request is too large.',413);
    try{body=JSON.parse(raw);}catch{throw new DomainError('Invalid Telegram account request.',400);}
    authRequire(body&&typeof body==='object'&&!Array.isArray(body),'Invalid Telegram account request.',400);
  }
  const id=String(body.employeeId??url.searchParams.get('employeeId')??'');
  const target=records.find(row=>row.id===id&&row.kind==='employee');
  const ownerEmail=loginEmail(env.TEAMS_OWNER_EMAIL);
  authRequire(target&&!target.removedOn&&(!target.email||target.email!==ownerEmail)&&canManageEmployee(actor,target),'Employee access is restricted.',403);
  const now=authTime();
  if(request.method==='GET'){
    const account=await db.prepare('SELECT chat_id,name,username,approved_at FROM teams_telegram_accounts WHERE account_id=?').bind(id).first();
    return json({account,canInvite:target.active&&target.roles.length>0&&!usesManagementEmail(target.roles)});
  }
  if(body.operation==='invite'){
    authRequire(target.active&&target.roles.length&&!usesManagementEmail(target.roles),'Enable a staff account with a Telegram sign-in role first.',422);
    const existing=await db.prepare('SELECT account_id FROM teams_telegram_accounts WHERE account_id=?').bind(id).first();
    authRequire(!existing,'Review or remove the existing Telegram connection first.',409);
    const invite=authToken();
    await db.prepare('INSERT INTO teams_telegram_invites(employee_id,token_hash,expires_at) VALUES(?,?,?) '+
      'ON CONFLICT(employee_id) DO UPDATE SET token_hash=excluded.token_hash,expires_at=excluded.expires_at').bind(id,await authHash(invite),now+86400).run();
    return json({invite:url.origin+'/invite/'+invite});
  }
  if(body.operation==='approve'){
    authRequire(target.active&&target.roles.length&&!usesManagementEmail(target.roles),'This account is unavailable for Telegram sign-in.',422);
    const result=await db.prepare('UPDATE teams_telegram_accounts SET approved_at=?,approved_by=? '+
      'WHERE account_id=? AND chat_id=? AND approved_at IS NULL RETURNING account_id').bind(now,actor.id,id,String(body.chatId??'')).first();
    authRequire(result,'Refresh the pending Telegram connection.',409);
    return json({ok:true});
  }
  if(body.operation==='revoke'){
    await db.batch([
      db.prepare('DELETE FROM teams_telegram_accounts WHERE account_id=?').bind(id),
      db.prepare('DELETE FROM teams_telegram_invites WHERE employee_id=?').bind(id),
      db.prepare("DELETE FROM teams_sessions WHERE account_id=? AND method='telegram'").bind(id),
    ]);
    return json({ok:true});
  }
  throw new DomainError('Choose a Telegram account action.',400);
}

export async function nativeSignInFetch(request,env,ctx,worker,headers){
  const {pathname:path,origin}=new URL(request.url);
  if(!nativeAuthReady(env))return json({error:'The TEAMS sign-in service is being configured.'},503);
  try{
    if(path==='/sign-in'&&request.method==='GET'){
      return signInPage('Sign in to TEAMS Operations',{content:emailEntryForm+telegramEntryForm()});
    }
    const invite=path.match(/^\/invite\/([A-Za-z0-9_-]{43})$/)?.[1];
    if(invite&&request.method==='GET')return signInPage('Join TEAMS Operations',{message:'Continue with your Telegram account to accept your invitation.',content:telegramEntryForm(invite)});
    if((path==='/signout-with-chatgpt'||path==='/sign-out')&&request.method==='GET'){
      return signInPage('Sign out of TEAMS Operations',{content:'<form method="post" action="/auth/logout"><button>Sign out</button></form>'});
    }
    if(path==='/auth/telegram/callback'&&request.method==='GET')return await finishTelegramSignIn(request,env);
    if(path.startsWith('/auth/')){
      authRequire(request.method==='POST'&&request.headers.get('Origin')===origin,'Open the sign-in form from TEAMS.',403);
      if(path==='/auth/logout'){
        const token=readAuthCookie(request,teamsSessionCookie);
        if(tokenPattern.test(token))await env.DB.prepare('DELETE FROM teams_sessions WHERE token_hash=?').bind(await authHash(token)).run();
        return authRedirect('/sign-in',[authCookie(teamsSessionCookie,'',0),authCookie(teamsEmailCookie,'',0),authCookie(teamsTelegramCookie,'',0)]);
      }
      const body=await request.text();
      authRequire(body.length<=4096,'Sign-in request is too large.',413);
      const form=new URLSearchParams(body);
      if(path==='/auth/email/start')return await startManagementEmail(request,env,ctx,form);
      if(path==='/auth/email/verify')return await verifyManagementEmail(request,env,form);
      if(path==='/auth/telegram/start'||path==='/auth/telegram/connect')return await startTelegramSignIn(request,env,form,path.endsWith('/connect'));
      return json({error:'Sign-in route not found.'},404);
    }
    if(request.method==='GET'&&(path.startsWith('/assets/')||['/manifest.webmanifest','/sw.js','/offline.html'].includes(path))){
      return worker.fetch(new Request(request,{headers}),env,ctx);
    }
    const session=await readTeamSession(request,env);
    if(!session)return path.startsWith('/api/')?json({error:'Sign in to TEAMS Operations.'},401):authRedirect('/sign-in');
    headers.set('oai-authenticated-user-id',teamsEmployeeIdentity(session.account));
    headers.set('oai-authenticated-user-email',session.account.email||'');
    headers.set('x-teams-native-account',session.account.id);
    headers.set('x-teams-auth-method',session.method);
    return worker.fetch(new Request(request,{headers}),env,ctx);
  }catch(error){
    const expected=error instanceof DomainError;
    return signInPage('Sign-in could not be completed',{status:expected?error.status:503,
      message:expected?error.message:'The sign-in service is temporarily unavailable.',
      content:'<a href="/sign-in">Return to sign-in</a>',cookie:authCookie(teamsTelegramCookie,'',0)});
  }
}
