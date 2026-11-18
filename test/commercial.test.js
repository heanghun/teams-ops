import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRecords, dateOffset } from '../server/seed.js';
import { applyOperation, agreementSections, quotationTotals } from '../server/domain.js';
import { visible, exportResponse } from '../server/presentation.js';
import { quoteClientItems, documentContent } from '../server/documents.js';
import { createLetterheadPdf } from '../server/letterhead.js';
import { emailConnection } from '../server/email.js';
import { createDemoTransport } from '../public/demo.js';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';

const origin='https://test.example.test',actor=role=>({id:'user:'+role,roles:[role]});
function domain(){let rows=initialRecords(true);return {get rows(){return rows;},act(action,data,role='maintenance',who=actor(role)){
  const result=applyOperation(rows,who,action,data,false);const map=new Map(rows.map(x=>[x.id,x]));result.changes.forEach(x=>map.set(x.id,x));rows=[...map.values()];return result.target;
}};}
const contractInput=(extra={})=>({name:'Test maintenance',clientId:'c0',currency:'USD',value:900,site:'Fictional site',equipment:'Demo pump P-1',supervisor:'Supervisor',technician:'Technician',start:dateOffset(),end:dateOffset(365),frequency:90,billing:'Quarterly',...extra});
const filledAgreement=id=>({contractId:id,reason:'Fictional agreement for test',contractorParty:'Fictional TEAMS test party',clientParty:'Fictional client',contractorSignatory:'Demo authorized person',clientSignatory:'Demo client signatory',authorityReference:'Test-only delegation',...Object.fromEntries(Object.keys(agreementSections).map(k=>[k,'Fictional agreed '+k+' terms.']))});
function approvedAgreement(d,c){const a=d.act('agreement.create',filledAgreement(c.id));d.act('agreement.transition',{id:a.id,status:'Internal Review',reason:'Review ready'});return d.act('agreement.transition',{id:a.id,status:'Approved',reason:'Independent test approval',reviewConfirmed:true},'manager');}

test('service classification preserves visit-only legacy behavior, resident staffing is independent, O&M requires coverage',()=>{
  const d=domain();const legacy=structuredClone(d.rows.find(x=>x.id==='mc0'));
  assert.throws(()=>d.act('contract.create',contractInput({serviceType:'om'})),/onsite staffing/);
  for(const count of [1,2]){
    const c=d.act('contract.create',contractInput({serviceType:'scheduled',residentTechnicians:count,coverage:'Agreed daytime cover',staffingPlan:'Day roster with relief and overtime terms'}));
    assert.equal(c.serviceType,'scheduled');assert.equal(c.residentTechnicians,count);
  }
  const om=d.act('contract.create',contractInput({serviceType:'om',residentTechnicians:2,frequency:1,coverage:'Day shift',staffingPlan:'Relief roster'}));
  d.act('contract.schedule',{id:om.id,until:dateOffset(100)});
  const jobs=d.rows.filter(j=>j.kind==='job'&&j.contractId===om.id);assert.equal(jobs.length,101);assert.match(jobs[0].checklist[0],/operating/);
  assert.deepEqual(d.rows.find(x=>x.id==='mc0'),legacy);
});
test('one-time troubleshooting generates only one job and cannot silently recur',()=>{
  const d=domain(),c=d.act('contract.create',contractInput({serviceType:'troubleshooting',frequency:0}));assert.equal(c.frequency,null);
  const job=d.act('contract.schedule',{id:c.id,until:dateOffset(1)});assert.equal(job.kind,'job');assert.equal(job.contractId,c.id);
  assert.throws(()=>d.act('contract.schedule',{id:c.id,until:dateOffset(2)}),/already has a job/);
});
test('agreement review requires complete terms, independent authority and confirmation; approval locks a snapshot',()=>{
  const d=domain(),c=d.act('contract.create',contractInput({serviceType:'scheduled'}));
  const draft=d.act('agreement.create',{contractId:c.id,reason:'Initial draft'});d.act('agreement.transition',{id:draft.id,status:'Internal Review',reason:'Review'});
  assert.throws(()=>d.act('agreement.transition',{id:draft.id,status:'Approved',reason:'Decision',reviewConfirmed:true},'manager'),/required/);
  d.act('agreement.transition',{id:draft.id,status:'Draft',reason:'Complete missing sections'});d.act('agreement.edit',{id:draft.id,...filledAgreement(c.id)});
  d.act('agreement.transition',{id:draft.id,status:'Internal Review',reason:'Review'});
  assert.throws(()=>d.act('agreement.transition',{id:draft.id,status:'Approved',reason:'Decision',reviewConfirmed:true}),/authorized reviewer/);
  assert.throws(()=>d.act('agreement.transition',{id:draft.id,status:'Approved',reason:'Decision'},'manager'),/Confirm/);
  assert.throws(()=>d.act('agreement.transition',{id:draft.id,status:'Approved',reason:'Decision',reviewConfirmed:true},'manager',{...actor('manager'),previewEmployeeId:'named-manager',approvals:[]}),/separate authorization/);
  const approved=d.act('agreement.transition',{id:draft.id,status:'Approved',reason:'Reviewed',reviewConfirmed:true},'manager');
  d.act('contract.edit',{...contractInput({serviceType:'scheduled',equipment:'Changed pump P-2'}),id:c.id});
  assert.equal(approved.contractSnapshot.equipment,'Demo pump P-1');assert.throws(()=>d.act('agreement.edit',{id:draft.id}),/Only draft/);
  assert.equal(visible(approved,actor('technician'),d.rows),false);
  assert.equal(exportResponse({rows:d.rows},actor('manager'),false,new URL(origin+'/api/export?kind=agreement&id='+approved.id)).status,200);
  assert.throws(()=>exportResponse({rows:d.rows},actor('technician'),false,new URL(origin+'/api/export?kind=agreement&id='+approved.id)),/not found/);
});
test('client selling lines reconcile in USD and KHR without leaking internal costs into letterhead',()=>{
  for(const currency of ['USD','KHR']){
    const rows=initialRecords(true),q=rows.find(r=>r.kind==='quote');Object.assign(q,{currency,status:'Approved',indirect:511.32,risk:99.11,discount:8.02,margin:23.4});
    const lines=quoteClientItems(q),t=quotationTotals(q);assert.ok(Math.abs(lines.reduce((s,l)=>s+l.amount,0)-t.beforeDiscount)<0.001);
    const doc=documentContent(rows,'quote',q.id,true,false),pdf=new TextDecoder().decode(createLetterheadPdf(doc));
    assert.match(pdf,/XObject/);assert.match(pdf,/Signature/);assert.doesNotMatch(pdf,/Gross margin|Estimated cost|Material \/ unit|Labor rate/);
    assert.equal(doc.items.length,q.items.length);
  }
});
