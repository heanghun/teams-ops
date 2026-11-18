import { DomainError, allowed } from './domain.js';
import { applyMailbox, mailboxAccess, plainMailText, cleanMailHtml } from './mail-model.js';
import { emailConnection } from './email.js';
import { json, visible, exportResponse, requestKey, downloadHeaders } from './presentation.js';

export function mailboxRouting(env){try{return Object.fromEntries(Object.entries(JSON.parse(env.TEAMS_EMAIL_ROUTING||'{}')).filter(([box,a])=>['installation','maintenance','general','finance'].includes(box)&&Array.isArray(a)).map(([box,a])=>[box,a.map(x=>String(x).trim().toLowerCase()).filter(x=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x))]));}catch{return {};}}
export function mailConnection(env,demo){return {...emailConnection(env,demo),receiving:demo?'simulation':env.TEAMS_RESEND_WEBHOOK_SECRET&&Object.values(mailboxRouting(env)).some(x=>x.length)?'configured':'unconfigured',addresses:demo?{}:mailboxRouting(env)};}
export async function submitMailboxEmail(env,message,objects,fetcher=fetch){
  if(emailConnection(env,false).mode!=='configured')throw new DomainError('Live email is not connected. Configure a verified sender and provider key.',503);
  if(Date.now()-Date.parse(message.createdAt)>23*3600000)throw new DomainError('Its retry window closed. Reconcile this attempt with the provider before creating a new send.',409);
  const attachments=[];let total=0;
  for(const file of objects){const bytes=new Uint8Array(await new Response(file.body).arrayBuffer());total+=bytes.length;if(total>10000000)throw new DomainError('Attachments must total no more than 10 MB.',413);let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));attachments.push({filename:file.name,content:btoa(binary)});}
  let response;try{response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.TEAMS_RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'teams-mail/'+message.id},body:JSON.stringify({...message.providerPayload,attachments}),signal:AbortSignal.timeout(20000)});}catch{return {status:'Delivery unknown',error:'No provider confirmation. Retry this same send within 23 hours or reconcile it with the provider.'};}
  const result=await response.json().catch(()=>({}));if(!response.ok||!result.id)return {status:response.status>=500?'Delivery unknown':'Provider rejected',error:'Provider did not accept the message (HTTP '+response.status+'). Check sender setup and provider logs.'};
  return {status:'Provider accepted',providerId:result.id,acceptedAt:new Date().toISOString(),error:null};
}
export async function verifyMailWebhook(raw,headers,secret,now=Date.now()){
  const id=headers.get('svix-id'),stamp=headers.get('svix-timestamp'),signatures=headers.get('svix-signature');
  if(!secret?.startsWith('whsec_')||!id||id.length>100||!/^\d+$/.test(stamp||'')||Math.abs(now/1000-Number(stamp))>300||!signatures)throw new DomainError('Invalid email webhook signature.',401);
  try{const key=await crypto.subtle.importKey('raw',Uint8Array.from(atob(secret.slice(6)),x=>x.charCodeAt(0)),{name:'HMAC',hash:'SHA-256'},false,['verify']),data=new TextEncoder().encode(id+'.'+stamp+'.'+raw);
    for(const s of signatures.split(' ')){if(s.startsWith('v1,')&&await crypto.subtle.verify('HMAC',key,Uint8Array.from(atob(s.slice(3)),x=>x.charCodeAt(0)),data))return id;}
  }catch{}throw new DomainError('Invalid email webhook signature.',401);
}
async function providerGet(env,path){const res=await fetch('https://api.resend.com'+path,{headers:{Authorization:'Bearer '+env.TEAMS_RESEND_API_KEY},signal:AbortSignal.timeout(20000)});if(!res.ok)throw new DomainError('Email provider data is unavailable. Retry this operation.',502);const raw=await res.text();if(raw.length>1000000)throw new DomainError('Incoming message exceeds the supported size.',413);return JSON.parse(raw);}
const providerId=value=>{if(!/^[a-zA-Z0-9_-]{1,100}$/.test(value||''))throw new DomainError('Invalid provider identifier.',400);return value;};
export async function mailboxRoute(request,env,ctx){
  const {db,state,actor,demo,mutate,loadRows,writeRows,auditStmt,isConflict}=ctx,url=new URL(request.url),path=url.pathname;
  if(path==='/api/mail/send'&&request.method==='POST'){
    if(!allowed(actor,'mail.send'))throw new DomainError('Your role cannot send email.',403);
    if(!demo&&emailConnection(env,false).mode!=='configured')throw new DomainError('Live email is not connected. Configure a verified sender and provider key.',503);
    const raw=await request.text();if(raw.length>1500)throw new DomainError('Submission request too large.',413);let input;try{input=JSON.parse(raw);}catch{throw new DomainError('Invalid email request.',400);}
    const key=requestKey(input.key),prior=await db.prepare('SELECT actor,action,target FROM audit WHERE request_id=?').bind(key).first();let result;const created=[];
    if(prior){if(prior.actor!==actor.id||prior.action!=='mail.send')throw new DomainError('Request identifier already used.',409);result={id:prior.target,replayed:true};}
    else{
      const draft=state.rows.find(x=>x.kind==='mail'&&x.id===input.id);applyMailbox(state.rows,actor,'mail.send',{id:input.id},demo);
      const frozenFiles=[];let total=0;
      try{
        if(!demo)for(const [index,file] of (draft.attachments||[]).entries()){
          const response=await mailboxRoute(new Request(new URL('/api/mail/file/'+encodeURIComponent(draft.id)+'/'+index,request.url)),env,ctx),blob=await response.blob();
          total+=blob.size;if(total>10000000)throw new DomainError('Attachments must total no more than 10 MB.',413);if(!env.BUCKET)throw new DomainError('Attachment storage unavailable.',503);
          const storageKey='mail-outbox/'+crypto.randomUUID();await env.BUCKET.put(storageKey,blob.stream());created.push(storageKey);frozenFiles.push({key:storageKey,name:file.name,size:blob.size});
        }
        const reply=state.rows.find(x=>x.id===draft.replyToId),messageId=reply?.internetMessageId;
        result=await mutate(db,env,request,'mail.send',{id:input.id,sendKey:key,emailFrom:demo?null:env.TEAMS_EMAIL_FROM,replyAddress:mailboxRouting(env)[draft.mailbox]?.[0],replyMessageId:messageId&&!/[\r\n]/.test(messageId)?messageId:null,frozenFiles},key,demo);
        if(result.replayed)for(const k of created)await env.BUCKET.delete(k);
      }catch(error){for(const k of created)await env.BUCKET?.delete(k).catch(()=>{});throw error;}
    }
    const latest=await loadRows(db),message=latest.rows.find(x=>x.id===result.id);if(!visible(message,actor,latest.rows))throw new DomainError('Message unavailable.',404);
    if(demo||['Provider accepted','Delivered','Bounced'].includes(message.status))return json({id:message.id,status:message.status,replayed:result.replayed});
    if(message.createdBy!==actor.id&&!actor.roles.includes('admin'))throw new DomainError('This send belongs to another author.',403);
    const files=[];for(const frozen of message.frozenFiles||[]){const file=await env.BUCKET?.get(frozen.key);if(!file)throw new DomainError('Frozen attachment unavailable. No submission was made.',404);files.push({...file,name:frozen.name});}
    const response=await submitMailboxEmail(env,message,files);
    for(let attempt=0;attempt<4;attempt++){
      const latest=await loadRows(db),old=latest.rows.find(x=>x.id===message.id),now=new Date().toISOString();if(['Provider accepted','Delivered','Bounced'].includes(old.status))return json({id:old.id,status:old.status});
      const saved={...old,...response},changes=[saved];
      if(response.status==='Provider accepted')for(const file of message.attachments||[]){const q=latest.rows.find(x=>x.id===file.id);if(file.type==='export'&&q?.kind==='quote'&&q.status==='Approved'&&q.revision===file.revision&&!changes.some(x=>x.id===q.id))changes.push({...q,status:'Sent',history:[...(q.history||[]),{status:'Sent',date:now.slice(0,10),actor:actor.id,reason:'Email provider accepted: '+response.providerId}]});}
      try{await db.batch([auditStmt(db,crypto.randomUUID(),latest.version+1,actor,'mail.result',saved,[{id:saved.id,before:old.status,after:response}],now),writeRows(db,changes,now)]);return json({id:saved.id,...response});}catch(error){if(!isConflict(error))throw error;}
    }throw new DomainError('Provider response received. Retry this same send to reconcile its log.',409);
  }
  if(path.startsWith('/api/mail/file/')&&request.method==='GET'){
    const parts=path.split('/'),message=state.rows.find(x=>x.id===decodeURIComponent(parts[4])&&x.kind==='mail'),i=Number(parts[5]);
    if(!visible(message,actor,state.rows)||!Number.isInteger(i)||i<0)throw new DomainError('Attachment not found.',404);const file=message.attachments?.[i];if(!file)throw new DomainError('Attachment not found.',404);let object;
    if(file.type==='message'){if((ctx.depth||0)>=10)throw new DomainError('Attachment forwarding chain is too deep.',422);return mailboxRoute(new Request(new URL('/api/mail/file/'+encodeURIComponent(file.id)+'/'+file.index,url)),env,{...ctx,depth:(ctx.depth||0)+1});}
    if(file.type==='incoming'){
      const meta=await providerGet(env,'/emails/receiving/'+providerId(message.providerId)+'/attachments/'+providerId(file.attachmentId)),remote=new URL(meta.download_url);
      if(remote.protocol!=='https:'||remote.hostname!=='inbound-cdn.resend.com'||Number(meta.size)>10000000)throw new DomainError('Attachment unavailable through this mailbox.',413);
      const res=await fetch(remote,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!res.ok)throw new DomainError('Attachment download failed.',502);object={body:res.body,name:meta.filename};
    }else if(message.frozenFiles?.[i]){const frozen=message.frozenFiles[i];object=await env.BUCKET?.get(frozen.key);if(object)object.name=frozen.name;}
    else if(file.type==='file'){const record=state.rows.find(x=>x.id===file.id);if(!visible(record,actor,state.rows))throw new DomainError('Attachment not found.',404);object=await env.BUCKET?.get(record.key);if(object)object.name=record.name;}
    else if(file.type==='export')return exportResponse(state,actor,demo,new URL('/api/export?'+new URLSearchParams({kind:file.kind,id:file.id,format:file.format}),url));
    if(!object)throw new DomainError('Attachment unavailable.',404);return new Response(object.body,{headers:downloadHeaders(object.name||file.name,'application/octet-stream')});
  }
  throw new DomainError('Mailbox endpoint not found.',404);
}
export async function receiveMailbox(request,env,ctx){
  const {db,seedDB,loadRows,writeRows,auditStmt,isConflict}=ctx;
  if(request.method!=='POST')throw new DomainError('Method not allowed.',405);if(!env.TEAMS_RESEND_WEBHOOK_SECRET||!env.TEAMS_RESEND_API_KEY||!db)throw new DomainError('Receiving email is not configured.',503);
  const raw=await request.text();if(raw.length>100000)throw new DomainError('Webhook too large.',413);const eventId=await verifyMailWebhook(raw,request.headers,env.TEAMS_RESEND_WEBHOOK_SECRET),event=JSON.parse(raw),key='mailhook_'+eventId.replace(/[^a-zA-Z0-9_-]/g,'_');
  if(await db.prepare('SELECT request_id FROM audit WHERE request_id=?').bind(key).first())return json({received:true,replayed:true});await seedDB(db,false);
  const content=event.type==='email.received'?await providerGet(env,'/emails/receiving/'+providerId(event.data?.email_id)+'?html_format=cid'):null;
  for(let attempt=0;attempt<4;attempt++){
    const state=await loadRows(db),now=new Date().toISOString();let message;
    if(content){
      const routing=mailboxRouting(env),recipients=[...(content.to||[]),...(content.received_for||[])].map(x=>String(x).toLowerCase()),boxes=Object.keys(routing).filter(box=>routing[box].some(email=>recipients.includes(email)));
      if(boxes.length!==1)return json({received:true,unrouted:true});if(state.rows.some(x=>x.kind==='mail'&&x.direction==='incoming'&&x.providerId===content.id))return json({received:true,replayed:true});
      const headers=content.headers||{},refs=[headers['in-reply-to'],headers.references].filter(Boolean).join(' '),reply=state.rows.find(x=>x.kind==='mail'&&x.mailbox===boxes[0]&&x.internetMessageId&&refs.includes(x.internetMessageId));
      const sender=String(content.from||'').slice(0,500),address=sender.match(/<([^>]+)>/)?.[1]||sender,clients=state.rows.filter(x=>x.kind==='client'&&x.contacts?.some(c=>c.email?.toLowerCase()===address.toLowerCase())),subject=String(content.subject||'(No subject)').slice(0,240);
      message={id:'received:'+content.id,kind:'mail',date:now.slice(0,10),createdBy:'email-provider',createdAt:content.created_at||now,status:'Received',direction:'incoming',folder:'inbox',read:false,mailbox:boxes[0],from:sender,to:content.to||[],cc:content.cc||[],subject,name:subject,body:String(content.text||plainMailText(cleanMailHtml(content.html))).slice(0,50000),providerId:content.id,internetMessageId:String(content.message_id||'').replace(/[\r\n]/g,'').slice(0,1000),threadId:reply?.threadId||reply?.id||null,replyToId:reply?.id||null,relatedId:reply?.relatedId||null,parentId:reply?.relatedId||null,projectId:reply?.projectId||null,clientId:reply?.clientId||(clients.length===1?clients[0].id:null),attachments:(content.attachments||[]).slice(0,30).map(a=>({type:'incoming',attachmentId:a.id,name:String(a.filename||'attachment').slice(0,220),size:a.size,mime:a.content_type}))};
    }else{
      const old=state.rows.find(x=>x.kind==='mail'&&x.providerId===event.data?.email_id);if(!old)return json({received:true,unmatched:true});
      const status={'email.sent':'Provider accepted','email.delivered':'Delivered','email.bounced':'Bounced','email.failed':'Failed','email.delivery_delayed':'Delayed'}[event.type];if(!status)return json({received:true,ignored:true});
      if(old.deliveryEventAt&&event.created_at<old.deliveryEventAt||['Delivered','Bounced'].includes(old.status)&&['Provider accepted','Delayed'].includes(status))return json({received:true,ignored:true});
      message={...old,status,internetMessageId:String(event.data.message_id||old.internetMessageId||'').replace(/[\r\n]/g,'').slice(0,1000),deliveryEventAt:event.created_at||now};
    }
    try{await db.batch([auditStmt(db,key,state.version+1,{id:'email-provider'},'mail.receive',message,[{id:message.id,event:event.type}],now),writeRows(db,[message],now)]);return json({received:true});}catch(error){if(!isConflict(error))throw error;if(await db.prepare('SELECT request_id FROM audit WHERE request_id=?').bind(key).first())return json({received:true,replayed:true});}
  }throw new DomainError('Mailbox changed during receipt. Retry the provider event.',409);
}
