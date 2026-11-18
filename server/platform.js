import { DomainError } from './domain.js';
import { mailboxRouting, mailConnection } from './mail-service.js';

const platformSettingsId = 'platform-settings';
const mailboxNames = ['installation', 'maintenance', 'general', 'finance'];
const megabyte = 1_000_000;
const slowRequestMs = 1500;
const logRetentionMinutes = 7 * 24 * 60;
const validEmail = value => /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value) && value.length <= 254;

function platformText(value, label, limit, required = false) {
  const text = String(value ?? '').trim();
  if (text.length > limit || (required && !text)) throw new DomainError(`${label} is required or exceeds ${limit} characters.`);
  return text;
}

function platformInteger(value, label, min, max) {
  const number = Number(value);
  if (value == null || value === '' || !Number.isInteger(number) || number < min || number > max) {
    throw new DomainError(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function storageLimit(value) {
  return value == null || value === '' ? null : platformInteger(value, 'Storage limit', 0, 1_000_000);
}

function savedPlatformSettings(rows) {
  return rows.find(row => row.id === platformSettingsId) ?? {id:platformSettingsId, kind:'platformSettings'};
}

function directorSetupAvailable(rows) {
  return !savedPlatformSettings(rows).directorInitialized && !rows.some(row => row.kind === 'employee' && row.roles.includes('director'));
}

export function applyPlatformOperation(rows, actor, action, data, today) {
  if (!actor.platformAdmin) throw new DomainError('Platform Administrator access is required.', 403);
  const settings = savedPlatformSettings(rows);
  const save = values => {
    const target = {...settings, ...values, updated:today};
    return {target, changes:[target]};
  };

  switch (action) {
    case 'platform.director.initialize': {
      if (!actor.bootstrapOwner) throw new DomainError('The configured platform owner must initialize the Managing Director.', 403);
      if (!directorSetupAvailable(rows)) throw new DomainError('Managing Director setup has already been completed.', 409);
      const email = platformText(data.email, 'Sign-in email', 254, true).toLowerCase();
      if (!validEmail(email) || email === actor.email) throw new DomainError('Enter the Managing Director\'s own verified sign-in email.');
      const name = platformText(data.name, 'Employee name', 220, true);
      const authorizationReference = platformText(data.reference, 'Authorization reference', 500, true);
      const prior = rows.find(row => row.kind === 'employee' && row.email === email);
      if (prior?.roles.includes('admin')) throw new DomainError('Use a separate account for the Managing Director.', 403);
      const target = {
        ...(prior ?? {id:crypto.randomUUID(), kind:'employee', date:today, createdBy:actor.id}),
        name, email, roles:[...new Set([...(prior?.roles ?? []), 'director'])], active:true, authorizationReference, updated:today,
      };
      return {target, changes:[target, {...settings, directorInitialized:true, updated:today}]};
    }
    case 'platform.storage.default':
      return save({defaultStorageMb:storageLimit(data.limitMb)});
    case 'platform.storage.user': {
      const employee = rows.find(row => row.kind === 'employee' && row.id === data.id);
      if (!employee) throw new DomainError('Select a valid employee account.', 404);
      const target = {...employee, storageLimitMb:storageLimit(data.limitMb), updated:today};
      return {target, changes:[target]};
    }
    case 'platform.email.update': {
      const fromName = platformText(data.fromName, 'Sender display name', 120);
      const fromEmail = platformText(data.fromEmail, 'Sender email', 254).toLowerCase();
      if (/[<>\r\n"]/u.test(fromName)) throw new DomainError('Enter a plain sender display name.');
      if ((fromEmail || data.outbound) && !validEmail(fromEmail)) throw new DomainError('Enter a verified sender email.');
      const seen = new Set();
      const routing = Object.fromEntries(mailboxNames.map(box => {
        const addresses = [...new Set(String(data[box] ?? '').trim().toLowerCase().split(/[\s,;]+/).filter(Boolean))];
        if (addresses.length > 20 || addresses.some(email => !validEmail(email) || seen.has(email))) {
          throw new DomainError('Enter up to 20 valid addresses per mailbox and route each address to one mailbox.');
        }
        for (const email of addresses) seen.add(email);
        return [box, addresses];
      }));
      if (data.inbound && !seen.size) throw new DomainError('Add at least one receiving address to enable inbound email.');
      return save({email:{outbound:data.outbound === true, inbound:data.inbound === true, fromName, fromEmail, routing}});
    }
    case 'platform.ai.update': {
      const model = platformText(data.model, 'OpenAI model', 100, data.enabled === true);
      if (model && !/^[\w.:-]+$/.test(model)) throw new DomainError('Enter a valid OpenAI model identifier.');
      return save({ai:{enabled:data.enabled === true, model,
        dailyLimit:platformInteger(data.dailyLimit, 'Team daily limit', 1, 200),
        userDailyLimit:platformInteger(data.userDailyLimit, 'User daily limit', 1, 50)}});
    }
    default:
      throw new DomainError('Unknown platform operation.', 400);
  }
}

export function platformRuntimeEnv(env, rows) {
  const {email, ai} = savedPlatformSettings(rows);
  if (!email && !ai) return env;
  return {...env,
    ...(email && {
      TEAMS_EMAIL_OUTBOUND_ENABLED:String(email.outbound), TEAMS_EMAIL_INBOUND_ENABLED:String(email.inbound),
      TEAMS_EMAIL_FROM:email.fromEmail && (email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail),
      TEAMS_EMAIL_ROUTING:JSON.stringify(email.routing),
    }),
    ...(ai && {TEAMS_AI_ENABLED:String(ai.enabled), TEAMS_OPENAI_MODEL:ai.model,
      TEAMS_AI_DAILY_LIMIT:String(ai.dailyLimit), TEAMS_AI_USER_DAILY_LIMIT:String(ai.userDailyLimit)}),
  };
}

function storageUsage(rows) {
  const usage = new Map();
  for (const row of rows) {
    const owner = row.storageOwnerId ?? row.createdBy;
    if (!owner) continue;
    const bytes = row.kind === 'document' ? Number(row.size) || 0 : row.kind === 'mail' ?
      (row.frozenFiles ?? []).reduce((total, file) => total + (Number(file.size) || 0), 0) : 0;
    if (bytes) usage.set(owner, (usage.get(owner) ?? 0) + bytes);
  }
  return usage;
}

export function checkUserStorage(rows, actor, additionalBytes) {
  if (!additionalBytes) return;
  const employee = rows.find(row => row.kind === 'employee' && row.email === actor.email);
  const limit = employee?.storageLimitMb ?? savedPlatformSettings(rows).defaultStorageMb;
  if (limit != null && (storageUsage(rows).get(actor.id) ?? 0) + additionalBytes > limit * megabyte) {
    throw new DomainError('This file exceeds your storage limit. Contact your Platform Administrator.', 413);
  }
}

const platformRequestAreas = {
  '/api/state':'Workspace load', '/api/action':'Record update', '/api/upload':'Document upload',
  '/api/export':'Document export', '/api/tender-estimate':'Tender estimate', '/api/ai/review':'AI review',
  '/api/mail/send':'Email submission', '/api/mail/webhook':'Email webhook', '/api/backup':'Data snapshot',
};

export async function recordPlatformIssue(db, request, status, durationMs) {
  const path = new URL(request.url).pathname;
  const area = platformRequestAreas[path] ?? (path.startsWith('/api/file/') || path.startsWith('/api/mail/file/') ? 'File download' : null);
  const actor = request.headers.get('oai-authenticated-user-id') || (path === '/api/mail/webhook' ? 'email-provider' : null);
  const slow = Number(durationMs >= slowRequestMs);
  if (!db || !area || !actor || !(status >= 500 || status === 429 || (status >= 400 && request.method === 'POST') || slow)) return;
  const at = new Date(), minute = Math.floor(at.getTime() / 60000);
  try {
    await db.batch([
      db.prepare(`INSERT INTO platform_events (minute,actor,area,status,last_seen,max_ms,hits,slow_hits)
        VALUES (?,?,?,?,?,?,1,?) ON CONFLICT (minute,actor,area,status) DO UPDATE SET
        last_seen=MAX(last_seen,excluded.last_seen), max_ms=MAX(max_ms,excluded.max_ms),
        hits=hits+1, slow_hits=slow_hits+excluded.slow_hits`).bind(minute, actor, area, status, at.toISOString(), durationMs, slow),
      db.prepare('DELETE FROM platform_events WHERE minute < ?').bind(minute - logRetentionMinutes),
    ]);
  } catch {
    console.warn('TEAMS could not record a platform diagnostic event.');
  }
}

async function platformActivity(db) {
  const minute = Math.floor(Date.now() / 60000);
  const {results:audit} = await db.prepare(`SELECT action, actor, created_at,
    CASE WHEN action='platform.director.initialize' THEN json_extract(summary,'$[0].reason') END AS authorization_reference
    FROM audit ORDER BY version DESC LIMIT 100`).all();
  try {
    const {results:issues} = await db.prepare(`SELECT actor, area, status, last_seen, max_ms, hits, slow_hits
      FROM platform_events WHERE minute >= ? ORDER BY minute DESC,last_seen DESC LIMIT 100`).bind(minute-logRetentionMinutes).all();
    const counts = await db.prepare(`SELECT COALESCE(SUM(CASE WHEN status >= 400 THEN hits ELSE 0 END),0) AS failures,
      COALESCE(SUM(slow_hits),0) AS slow FROM platform_events WHERE minute >= ?`).bind(minute-24*60).first();
    return {available:true, issues, audit, counts};
  } catch {
    return {available:false, issues:[], audit, counts:{failures:null,slow:null}};
  }
}

export async function platformState(state, actor, env, permissions, actions) {
  const config = savedPlatformSettings(state.rows);
  const runtime = platformRuntimeEnv(env, state.rows);
  const from = String(env.TEAMS_EMAIL_FROM ?? '');
  const sender = from.match(/^\s*([^<>]*?)\s*<([^<>]+)>\s*$/);
  const defaultStorageMb = config.defaultStorageMb ?? null;
  const usage = storageUsage(state.rows);
  const ownerEmail = env.TEAMS_OWNER_EMAIL?.trim().toLowerCase();
  const accounts = state.rows.filter(row => row.kind === 'employee' && row.email !== ownerEmail).map(row => ({
    id:row.id, kind:row.kind, name:row.name, email:row.email, roles:row.roles.includes('admin') ? ['admin'] : row.roles,
    active:row.active, storageLimitMb:row.storageLimitMb ?? null, storageUsedBytes:usage.get('cloudflare-access:'+row.email) ?? 0,
    protectedAccess:row.roles.some(role=>role === 'director' || role === 'finance'),
  }));
  accounts.unshift({id:'platform-owner',kind:'employee',name:'Platform owner',email:ownerEmail,roles:['admin'],active:true,bootstrapOwner:true,
    storageUsedBytes:usage.get('cloudflare-access:'+ownerEmail) ?? 0,storageLimitMb:null});

  return {version:state.version, actor, permissions, actions, demoRoles:[], records:accounts, platform:{
    directorSetupAvailable:Boolean(actor.bootstrapOwner && directorSetupAvailable(state.rows)),
    defaultStorageMb, storageBound:Boolean(env.BUCKET), storageUsedBytes:[...usage.values()].reduce((sum, bytes)=>sum+bytes,0),
    email:config.email ?? {outbound:runtime.TEAMS_EMAIL_OUTBOUND_ENABLED !== 'false' && Boolean(env.TEAMS_EMAIL_FROM),
      inbound:runtime.TEAMS_EMAIL_INBOUND_ENABLED !== 'false' && Object.values(mailboxRouting(env)).some(addresses=>addresses.length),
      fromName:sender?.[1]?.trim() ?? '', fromEmail:sender?.[2]?.trim() ?? from, routing:mailboxRouting(env)},
    emailConnection:mailConnection(runtime,false), mailKeySet:Boolean(env.TEAMS_RESEND_API_KEY), webhookKeySet:Boolean(env.TEAMS_RESEND_WEBHOOK_SECRET),
    ai:config.ai ?? {enabled:env.TEAMS_AI_ENABLED === 'true', model:env.TEAMS_OPENAI_MODEL ?? '',
      dailyLimit:Number(env.TEAMS_AI_DAILY_LIMIT) || 30, userDailyLimit:Number(env.TEAMS_AI_USER_DAILY_LIMIT) || 8},
    aiKeySet:Boolean(env.TEAMS_OPENAI_API_KEY), activity:await platformActivity(env.DB),
  }};
}
