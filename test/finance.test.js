import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { initialRecords, dateOffset } from '../server/seed.js';
import { allowed, applyOperation, roles, reportData, invoiceBalance } from '../server/domain.js';
import { invoiceTotals, hasFinanceAccess, invoiceProfile, financeAuditAllowed } from '../server/finance.js';
import { statePayload, visible, exportResponse, demoRoles } from '../server/presentation.js';
import { mailboxAccess, applyMailbox } from '../server/mail-model.js';
import { createDemoTransport } from '../public/demo.js';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';
const today=dateOffset(),finance={id:'demo:finance',roles:['finance'],demo:true},md={id:'demo:md',roles:['director'],demo:true};
const base=()=>({name:'Demo maintenance service',invoiceType:'commercial',clientId:'c0',currency:'USD',buyerName:'Fictional customer',buyerAddress:'Fictional Phnom Penh office',invoiceDate:today,due:dateOffset(30),items:[{description:'Service attendance',descriptionKh:'សេវាថែទាំ',unit:'visit',quantity:2,rate:100.25},{description:'Materials',descriptionKh:'សម្ភារៈ',unit:'lot',quantity:1,rate:25}],taxRate:10,discount:5});
function book(){let rows=initialRecords(true);return {get rows(){return rows;},act(action,data,actor=finance,demo=true){const result=applyOperation(rows,actor,action,data,demo,today);const index=new Map(rows.map(x=>[x.id,x]));result.changes.forEach(x=>index.set(x.id,x));rows=[...index.values()];return result.target;}};}

test('all role payloads protect receivables, cash, project finances, reports, nested mail and files including administrators',()=>{
  const rows=initialRecords(true);rows.find(x=>x.id==='settings').cashOpening={amount:987654321,date:today};rows.find(x=>x.id==='settings').invoiceProfile={tin:'PRIVATE-TIN'};
  rows.push({id:'financial-mail',kind:'mail',mailbox:'general',relatedId:'inv0',attachments:[]},{id:'financial-file',kind:'document',parentId:'inv0',name:'Invoice attachment'},{id:'forwarded-mail',kind:'mail',mailbox:'general',attachments:[{type:'message',id:'financial-mail',index:0}]});
  for(const role of roles){const actor={id:role,roles:[role]},state=statePayload({rows,version:1},actor,false),financial=hasFinanceAccess(actor);
    assert.equal(state.records.some(x=>x.id==='inv0'),financial,role);assert.equal(state.records.find(x=>x.id==='settings').cashOpening?.amount===987654321,financial,role);
    for(const id of ['financial-mail','financial-file','forwarded-mail'])assert.equal(visible(rows.find(x=>x.id===id),actor,rows),financial&& (id==='financial-file'||mailboxAccess(actor).includes('general')),role+' '+id);
    assert.equal('outstanding' in state.report,financial,role);assert.equal('weeks' in state.report,financial,role);assert.equal(!!state.records.find(x=>x.id==='p0')?.position,financial,role);
    if(!financial){assert.equal(state.permissions.includes('billing'),false);assert.equal(state.records.some(x=>['claim','invoice','payment','cash','milestone','cost'].includes(x.kind)),false);assert.equal(state.report.alerts.some(a=>['Billing','Collections','Projects'].includes(a.category)),false);assert.equal(allowed(actor,'invoice.pay'),false);assert.equal(mailboxAccess(actor).includes('finance'),false);assert.equal(financeAuditAllowed({action:'invoice.issue',target:'inv0'},actor,rows),false);assert.throws(()=>exportResponse({rows},actor,false,new URL('https://test/api/export?kind=report')),/cannot export/);}
  }
  assert.equal(hasFinanceAccess({roles:['admin','project']}),false);assert.equal(hasFinanceAccess({roles:['adminSupport','finance']}),true);
  assert.ok(statePayload({rows,version:1},{roles:['estimator']},false).records.find(x=>x.kind==='quote')?.totals,'Estimator quotation prices remain available');
});

test('native invoices round, sequence independently, freeze issued snapshots and preserve legacy invoices and project data',()=>{
  const b=book(),legacy=structuredClone(b.rows.find(x=>x.id==='inv0')),originalReport=reportData(b.rows),draft=b.act('invoice.draft',base());
  assert.equal(draft.status,'Draft');assert.equal(draft.code,undefined);assert.deepEqual(draft.totals,{subtotal:225.5,discount:5,taxable:220.5,tax:22.05,total:242.55});assert.equal(reportData(b.rows).outstanding,originalReport.outstanding);assert.equal(invoiceBalance(b.rows,draft).outstanding,0);
  assert.throws(()=>b.act('invoice.pay',{invoiceId:draft.id,amount:1,reference:'test',date:today}),/Only issued/);
  const issued=b.act('invoice.issue',{id:draft.id,confirm:true});assert.match(issued.code,/^CI-\d{2}-001$/);assert.equal(issued.snapshot.company.legalNameEn,'T E A M S Co., Ltd.');assert.equal(issued.snapshot.company.tin,'');assert.equal(issued.snapshot.demo,true);assert.equal(reportData(b.rows).outstanding,originalReport.outstanding+242.55);
  assert.throws(()=>b.act('invoice.edit',{...base(),id:issued.id}),/locked/);assert.throws(()=>b.act('invoice.issue',{id:issued.id,confirm:true}),/Only a native draft/);
  const tax=b.act('invoice.draft',{...base(),invoiceType:'tax'}),taxIssue=b.act('invoice.issue',{id:tax.id,confirm:true});assert.match(taxIssue.code,/^TI-\d{2}-001$/);
  b.act('invoice.void',{id:issued.id,reason:'Fictional entry correction'});const next=b.act('invoice.draft',base()),nextIssue=b.act('invoice.issue',{id:next.id,confirm:true});assert.match(nextIssue.code,/^CI-\d{2}-002$/);
  b.act('invoice.pay',{invoiceId:nextIssue.id,amount:100,reference:'Demo receipt',date:today});assert.throws(()=>b.act('invoice.void',{id:nextIssue.id,reason:'test'}),/credit-note/);
  assert.deepEqual(b.rows.find(x=>x.id===legacy.id),legacy);assert.deepEqual(b.rows.find(x=>x.id===tax.id).snapshot,taxIssue.snapshot);
  assert.deepEqual(invoiceTotals([{quantity:3,rate:0.335}], 'USD',10,0),{subtotal:1.01,discount:0,taxable:1.01,tax:0.1,total:1.11});
  assert.deepEqual(invoiceTotals([{quantity:2,rate:100.6}], 'KHR',10,0),{subtotal:201,discount:0,taxable:201,tax:20,total:221});
});

test('live issue blocks missing company, Khmer, customer TIN and daily FX and cannot be bypassed by demo flags',()=>{
  const b=book(),draft=b.act('invoice.draft',{...base(),invoiceType:'tax'});assert.throws(()=>b.act('invoice.issue',{id:draft.id,confirm:true,demo:true},finance,false),/verify/);
  const p={...invoiceProfile(b.rows.find(x=>x.kind==='settings')),legalNameKh:'ក្រុមហ៊ុនសាកល្បង',registeredAddress:'Fictional registered address',registeredAddressKh:'អាសយដ្ឋានសាកល្បង',tin:'TEST-NOT-A-REAL-TIN',taxpayerType:'medium',signatory:'Fictional test signatory',verificationReference:'Test fixture only',verified:true};
  b.act('invoiceProfile.update',p);assert.throws(()=>b.act('invoice.issue',{id:draft.id,confirm:true},finance,false),/Khmer customer/);
  const edited=b.act('invoice.edit',{...base(),id:draft.id,invoiceType:'tax',buyerNameKh:'អតិថិជនសាកល្បង',buyerAddressKh:'អាសយដ្ឋានសាកល្បង'});assert.throws(()=>b.act('invoice.issue',{id:edited.id,confirm:true},finance,false),/customer TIN/);
  b.act('invoice.edit',{...base(),id:draft.id,invoiceType:'tax',buyerNameKh:'អតិថិជនសាកល្បង',buyerAddressKh:'អាសយដ្ឋានសាកល្បង',buyerTin:'TEST-CUSTOMER-TIN'});assert.throws(()=>b.act('invoice.issue',{id:draft.id,confirm:true},finance,false),/daily KHR/);
  const ready={...base(),id:draft.id,invoiceType:'tax',buyerNameKh:'អតិថិជនសាកល្បង',buyerAddressKh:'អាសយដ្ឋានសាកល្បង',buyerTin:'TEST-CUSTOMER-TIN',fxRate:4000,fxDate:today,fxReference:'Fictional daily rate for tests only'};b.act('invoice.edit',ready);assert.equal(b.act('invoice.issue',{id:draft.id,confirm:true},finance,false).status,'Issued');
});

test('invoice PDFs embed shaped Khmer, letterhead and the locked company snapshot; finance mail cannot leak into shared mailboxes',async()=>{
  const b=book(),draft=b.act('invoice.draft',base()),issued=b.act('invoice.issue',{id:draft.id,confirm:true});const state={rows:b.rows,version:1};
  const response=exportResponse(state,finance,true,new URL('https://test/api/export?kind=invoice&id='+issued.id));assert.equal(response.headers.get('Content-Type'),'application/pdf');const bytes=new Uint8Array(await response.arrayBuffer());assert.ok(bytes.length>400000);const text=new TextDecoder().decode(bytes);assert.match(text,/FontFile2/);assert.match(text,/ActualText/);assert.match(text,/\/Logo/);writeFileSync('/tmp/teams-invoice-qa.pdf',bytes);
  assert.throws(()=>exportResponse(state,{roles:['admin']},true,new URL('https://test/api/export?kind=invoice&id='+issued.id)),/cannot export/);
  const message={mailbox:'general',relatedId:issued.id,subject:'Demo invoice',body:'Fictional test only',to:'client@example.test',attachments:[{type:'export',id:issued.id,format:'pdf'}]};assert.throws(()=>applyMailbox(b.rows,finance,'mail.save',message,true),/restricted Finance/);
  const saved=applyMailbox(b.rows,finance,'mail.save',{...message,mailbox:'finance'},true).target;assert.equal(saved.confidentiality,'finance');
  assert.equal(visible(saved,{roles:['admin']},[...b.rows,saved]),false);assert.equal(visible(saved,md,[...b.rows,saved]),true);
});

test('hosted endpoints and browser demo enforce financial snapshots, audit and integration export without deleting data',async()=>{
  const DB=localDb(),env={DB};const call=(path,role='admin')=>worker.fetch(new Request('https://test'+path,{headers:{'oai-authenticated-user-id':'test','X-Teams-Demo-Role':role}}),env);
  try{for(const role of demoRoles){assert.equal((await call('/api/backup',role)).status,hasFinanceAccess({roles:[role]})?200:403);assert.equal((await call('/api/invoice-accounting-export',role)).status,hasFinanceAccess({roles:[role]})?200:403);}
  const s=await(await call('/api/state','director')).json();assert.ok(s.records.some(x=>x.id==='inv0'));assert.equal(s.records.filter(x=>x.kind==='project').length,initialRecords(true).filter(x=>x.kind==='project').length);}finally{DB.close();}
  let state={rows:initialRecords(true),audit:[],files:{},version:1};const store={read:async()=>structuredClone(state),update:async fn=>{const copy=structuredClone(state),result=fn(copy);state=copy;return result;}};const transport=createDemoTransport(store,'https://demo.test');
  const post=(action,data,key=crypto.randomUUID())=>({method:'POST',headers:{'X-Teams-Demo-Role':'finance'},body:JSON.stringify({action,data,key})});
  const before=state.rows.length,res=await transport('/api/action',post('invoice.draft',base()));assert.equal(res.status,200);const id=(await res.json()).id,key=crypto.randomUUID(),input=post('invoice.issue',{id,confirm:true},key);assert.equal((await transport('/api/action',input)).status,200);assert.equal((await(await transport('/api/action',input)).json()).replayed,true);assert.ok(state.rows.length>before);assert.equal(state.audit.filter(x=>x.action==='invoice.issue').length,1);assert.equal((await transport('/api/backup')).status,403);assert.equal((await transport('/api/invoice-accounting-export', {headers:{'X-Teams-Demo-Role':'finance'}})).status,200);
});

test('a Platform Administrator can provision a Finance Manager account while financial data stays role-restricted',()=>{
  const admin={id:'admin',roles:['admin'],platformAdmin:true,demo:false};
  const input={name:'Finance test account',email:'finance@example.test',roles:['finance'],active:true};
  const out=applyOperation(initialRecords(false),admin,'employee.upsert',input,false);
  assert.equal(out.target.active,true);
  assert.deepEqual(out.target.roles,['finance']);
  assert.equal(hasFinanceAccess(admin),false);
  assert.throws(()=>applyOperation(initialRecords(false),admin,'employee.upsert',{...input,roles:['admin','finance']},false),/separate account/);
});
