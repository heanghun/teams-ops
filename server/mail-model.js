import { hasFinanceAccess, financialRecord } from './finance.js';
import { DomainError, allowed, hasFullModule } from './domain.js';
import { dateOffset } from './seed.js';
export const mailboxes={installation:'Projects & Installation',maintenance:'Maintenance Services',general:'Business & Support',finance:'Finance (restricted)'};
const mailEnsure=(condition,message,status=422)=>{if(!condition)throw new DomainError(message,status);};
export function mailboxAccess(actor){
  if(actor.platformAdmin)return [];
  const authorized=actor.roles.some(r=>['admin','manager','director','auditor'].includes(r))?
    Object.keys(mailboxes).filter(box=>box!=='finance'||hasFinanceAccess(actor)):
    [...new Set(actor.roles.flatMap(r=>r==='maintenance'?['maintenance']:['estimator','mep','project','procurement'].includes(r)?['installation']:r==='finance'?['general','finance']:r==='adminSupport'?['general']:[]))];
  return actor.mailboxGrants?authorized.filter(box=>actor.mailboxGrants.includes(box)):authorized;
}
export function mailRecordAllowed(record,actor,rows){
  if(!record||!hasFinanceAccess(actor)&&financialRecord(record,rows))return false;
  if(record.kind==='mail')return mailboxAccess(actor).includes(record.mailbox);
  if(record.kind==='document')return mailRecordAllowed(rows.find(x=>x.id===record.parentId),actor,rows);
  const module={quote:'quotes',agreement:'maintenance',contract:'maintenance',job:'maintenance',project:'projects',client:'clients',tender:'tenders',request:'procurement',requisition:'procurement',po:'procurement',claim:'billing',invoice:'billing'}[record.kind];
  return !!module&&hasFullModule(actor,module);
}
export function cleanMailHtml(value){
  return String(value||'').slice(0,50000).replace(/<(script|style|iframe|object)[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,tag=>{
    const match=tag.match(/^<\s*(\/?)\s*(p|div|br|b|strong|i|em|u|ul|ol|li|blockquote)\b[^>]*>$/i);return match?'<'+match[1]+match[2].toLowerCase()+'>':'';
  }).replace(/<(?!\/?(?:p|div|br|b|strong|i|em|u|ul|ol|li|blockquote)>)/gi,'&lt;');
}
export function plainMailText(value){return String(value||'').replace(/<br\s*\/?\s*>|<\/(?:p|div|li|blockquote)>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/g,"'").replace(/&amp;/gi,'&').trim();}
export function mailAddresses(value,required=false){
  const emails=(Array.isArray(value)?value:String(value||'').split(/[,;]/)).map(x=>String(x).trim()).filter(Boolean);
  mailEnsure(emails.length<=20&&(!required||emails.length>0),'Enter 1 to 20 recipient addresses.');
  for(const email of emails)mailEnsure(email.length<=254&&/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email),'Enter valid email addresses separated by commas.');
  return [...new Set(emails)];
}
export function validateMailAttachments(rows,actor,attachments){
  mailEnsure(Array.isArray(attachments)&&attachments.length<=20,'Choose up to 20 attachments.');
  let size=0;const results=attachments.map(source=>{
    const record=rows.find(x=>x.id===source.id);mailEnsure(mailRecordAllowed(record,actor,rows),'Attachment outside your authorized records.',403);
    if(source.type==='message'){mailEnsure(record.kind==='mail'&&record.status!=='Draft'&&Number.isInteger(source.index)&&source.index>=0,'Choose an attachment from a received or sent email.');const attachment=record.attachments?.[source.index];mailEnsure(attachment,'Email attachment unavailable.');size+=attachment.size||0;return {type:'message',id:record.id,index:source.index,name:attachment.name,size:attachment.size,mime:attachment.mime};}
    if(source.type==='file'){mailEnsure(record.kind==='document','Choose an existing document.');size+=record.size;return {type:'file',id:record.id,name:record.name,size:record.size,mime:record.type};}
    mailEnsure(source.type==='export'&&['invoice','quote','agreement','po','claim','job'].includes(record.kind),'Choose a supported client document.');
    mailEnsure(['pdf','xlsx'].includes(source.format)&&!(source.format==='xlsx'&&record.kind!=='quote'),'Choose an available client format.');
    if(record.kind==='invoice')mailEnsure(record.nativeInvoice&&record.status==='Issued','Only an issued native invoice can be attached.');
    if(record.kind==='quote')mailEnsure(['Approved','Sent','Accepted'].includes(record.status)&&record.validUntil>=dateOffset(),'Only an approved, current quotation can be sent as a final client document.');
    if(record.kind==='agreement')mailEnsure(record.status==='Approved'&&!rows.some(x=>x.kind==='agreement'&&x.contractId===record.contractId&&x.revision>record.revision),'Choose the latest approved agreement.');
    if(record.kind==='po')mailEnsure(!actor.roles.every(r=>['warehouse','technician','maintenance'].includes(r)),'Supplier prices require authorized access.',403);
    if(record.kind==='job')mailEnsure(record.status==='Completed','Complete the job before sending its report.');
    if(source.revision!=null)mailEnsure(source.revision===record.revision,'The document revision changed. Select the current approved revision.');
    return {type:'export',id:record.id,kind:record.kind,revision:record.revision,format:source.format,name:(record.code||record.name)+(record.revision?'-R'+record.revision:'')+'.'+source.format};
  });
  mailEnsure(size<=10000000,'Attachments must total no more than 10 MB.');return results;
}
export function applyMailbox(rows,actor,action,data,demo){
  mailEnsure(allowed(actor,action),'Your role cannot perform this email action.',403);
  const old=data.id?rows.find(x=>x.kind==='mail'&&x.id===data.id):null;
  if(data.id)mailEnsure(old&&mailRecordAllowed(old,actor,rows),'Message outside your mailbox.',403);
  const now=new Date().toISOString(),admin=actor.roles.includes('admin');let target;
  if(action==='mail.save'){
    if(old)mailEnsure(old.status==='Draft'&&(old.createdBy===actor.id||admin),'Only the draft author or administrator can edit this draft.',403);
    const mailbox=data.mailbox||old?.mailbox;mailEnsure(mailboxAccess(actor).includes(mailbox),'Choose an authorized mailbox.',403);
    const related=rows.find(x=>x.id===data.relatedId);if(data.relatedId)mailEnsure(mailRecordAllowed(related,actor,rows),'Choose an accessible linked record.',403);
    const reply=rows.find(x=>x.kind==='mail'&&x.id===data.replyToId);if(data.replyToId)mailEnsure(reply&&mailRecordAllowed(reply,actor,rows),'Choose an accessible reply.',403);
    const clientId=data.clientId||related?.clientId||(related?.kind==='client'?related.id:null);
    if(clientId)mailEnsure(rows.some(x=>x.kind==='client'&&x.id===clientId),'Choose a valid client.');
    const html=cleanMailHtml(data.bodyHtml),body=html?plainMailText(html):String(data.body||'').slice(0,30000),subject=String(data.subject||'').trim().replace(/[\r\n]/g,' ').slice(0,240);
    const validatedAttachments=validateMailAttachments(rows,actor,data.attachments||[]);
    if(financialRecord(related,rows)||validatedAttachments.some(a=>financialRecord(rows.find(x=>x.id===a.id),rows))||old?.confidentiality==='finance')mailEnsure(mailbox==='finance','Financial correspondence must use the restricted Finance mailbox.',403);
    target={...(old||{id:crypto.randomUUID(),kind:'mail',date:dateOffset(),createdBy:actor.id,createdAt:now}),mailbox,relatedId:related?.id||null,parentId:related?.id||null,projectId:related?.kind==='project'?related.id:related?.projectId||null,clientId:clientId||null,replyToId:reply?.id||null,threadId:reply?.threadId||reply?.id||old?.threadId||null,to:mailAddresses(data.to),cc:mailAddresses(data.cc),bcc:mailAddresses(data.bcc),subject,name:subject||'Untitled draft',body,bodyHtml:html,attachments:validatedAttachments,confidentiality:mailbox==='finance'?'finance':null,status:'Draft',direction:'outgoing',folder:'drafts',read:true,updatedAt:now};
  }else if(action==='mail.send'){
    mailEnsure(old&&(old.createdBy===actor.id||admin),'This draft is outside your authority.',403);mailEnsure(old.status==='Draft','Email is already locked for submission. Retry its existing send.');
    mailAddresses(old.to,true);mailEnsure(old.subject&&old.body,'Add a subject and message before sending.');
    const attachments=validateMailAttachments(rows,actor,old.attachments||[]);
    target={...old,attachments,status:demo?'Simulated':'Ready',folder:'sent',sendKey:data.sendKey,sentAt:now,createdAt:now,providerPayload:data.emailFrom?{from:data.emailFrom,to:old.to,...(old.cc.length?{cc:old.cc}:{}),...(old.bcc.length?{bcc:old.bcc}:{}),subject:old.subject,text:old.body,...(old.bodyHtml?{html:old.bodyHtml}:{}),...(data.replyAddress?{reply_to:data.replyAddress}:{}),...(data.replyMessageId?{headers:{'In-Reply-To':data.replyMessageId,References:data.replyMessageId}}:{})}:null,frozenFiles:demo?[]:data.frozenFiles||[]};
  }else if(action==='mail.update'){
    mailEnsure(old,'Choose a valid message.');const values={};
    if(typeof data.read==='boolean')values.read=data.read;if(typeof data.starred==='boolean')values.starred=data.starred;
    if(data.folder){mailEnsure(!actor.roles.includes('auditor')||admin,'Read-only audit access cannot move emails.',403);mailEnsure(['inbox','archive','trash','sent','drafts'].includes(data.folder),'Choose a valid folder.');mailEnsure(!['Ready','Delivery unknown'].includes(old.status),'Reconcile the pending send before moving it.');if(data.folder==='inbox')mailEnsure(old.direction==='incoming','Only incoming messages belong in Inbox.');if(data.folder==='drafts')mailEnsure(old.status==='Draft','Only drafts belong in Drafts.');values.folder=data.folder;}
    if('relatedId' in data){mailEnsure(!actor.roles.includes('auditor')||admin,'Read-only audit access cannot relink emails.',403);const related=rows.find(x=>x.id===data.relatedId);if(financialRecord(related,rows))mailEnsure(old.mailbox==='finance','Financial correspondence must use the restricted Finance mailbox.',403);mailEnsure(!data.relatedId||mailRecordAllowed(related,actor,rows),'Choose an accessible record.',403);Object.assign(values,{relatedId:related?.id||null,parentId:related?.id||null,projectId:related?.kind==='project'?related.id:related?.projectId||null,clientId:related?.kind==='client'?related.id:related?.clientId||null});}
    target={...old,...values,updatedAt:now};
  }else throw new DomainError('Unknown email action.',400);
  return {target,changes:[target]};
}
