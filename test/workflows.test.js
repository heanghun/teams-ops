import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../server/worker.js';
import { localDb } from '../scripts/local-db.mjs';
import { dateOffset } from '../server/seed.js';
import { bidAssessment, quotationTotals } from '../server/domain.js';

function context(envOverrides={}) {
  const DB=envOverrides.DB||localDb(),files=new Map();
  const env={DB,BUCKET:{
    async put(key,body){files.set(key,await new Response(body).arrayBuffer());},
    async get(key){return files.has(key)?{body:files.get(key)}:null;},
    async delete(key){files.delete(key);},
  },...envOverrides};
  const send=(path,{role='admin',actor='owner',email='owner@example.test',body,method=body?'POST':'GET',headers={}}={})=>{
    const requestHeaders=new Headers({'X-Teams-Demo-Role':role,...headers});
    if(actor)requestHeaders.set('oai-authenticated-user-id',actor);
    if(email)requestHeaders.set('oai-authenticated-user-email',email);
    const form=body instanceof FormData;
    if(body&&!form)requestHeaders.set('Content-Type','application/json');
    return worker.fetch(new Request('https://local.test'+path,{method,headers:requestHeaders,body:body?(form?body:JSON.stringify(body)):undefined}),env);
  };
  const act=(action,data,role='admin',key=crypto.randomUUID(),other={})=>send('/api/action',{role,body:{action,data,key},...other});
  const ok=async (...args)=>{
    const result=await act(...args),value=await result.json();
    assert.equal(result.status,200,JSON.stringify(value));return value;
  };
  const state=async (role='director')=>{
    const result=await send('/api/state',{role}),body=await result.json();
    assert.equal(result.status,200,JSON.stringify(body));return body;
  };
  return {DB,send,act,ok,state,files,env};
}
const record=(state,id)=>state.records.find(x=>x.id===id);
const docString=async response=>new TextDecoder().decode(await response.arrayBuffer());

test('anonymous requests, foreign origins and unauthorized role writes are blocked',async()=>{
  const c=context();
  assert.equal((await c.send('/api/state',{actor:null})).status,401);
  assert.equal((await c.act('project.create',{},'technician')).status,403);
  assert.equal((await c.act('project.create',{},'admin',crypto.randomUUID(),{headers:{Origin:'https://unrelated.test'}})).status,403);
  const state=await c.state('warehouse');
  assert.equal(state.records.some(x=>x.kind==='invoice'||x.kind==='quote'),false);
  assert.equal('price' in record(state,'m1'),false);
  assert.equal('value' in record(state,'p0'),false);
  assert.equal((await c.send('/api/export?kind=po&id=po0',{role:'warehouse'})).status,403);
  c.DB.close();
});

test('tender, estimate, approval snapshot, client exports, award and initial requirements',async()=>{
  const c=context();
  const tender=(await c.ok('tender.create',{name:'Test HVAC retrofit',clientId:'c0',currency:'USD',due:dateOffset(15),value:19000,cost:14000,upfront:5500,duration:4,advance:15,delay:1,guarantee:10,collateral:20,retention:5,fee:120,terms:'Tender PDF, page 3: retention 5%.'},'estimator')).id;
  await c.ok('tender.transition',{id:tender,status:'Under Evaluation'},'manager');
  await c.ok('tender.transition',{id:tender,status:'Pending Review'},'manager');
  await c.ok('tender.transition',{id:tender,status:'Approved for Bid',reason:'Bid approval reference'},'manager');
  const assessment=record(await c.state(),tender).assessment;
  assert.equal(assessment.decision,'Proceed to Bid');
  assert.equal(assessment.collateral,380);
  assert.equal(assessment.profit,4880);
  assert.equal(assessment.cash.at(-1).balance,4880);
  const q=(await c.ok('tender.quote',{tenderId:tender,name:'Test HVAC quote',currency:'USD',margin:20,tax:10,indirect:100,risk:50,discount:10,validUntil:dateOffset(20),terms:'30 days',warranty:'12 months',
    items:[{description:'Refrigerant pipe',unit:'m',quantity:50,materialId:'m1',material:1,laborHours:1,laborRate:4,other:2}]},'estimator')).id;
  let quote=record(await c.state(),q);
  assert.equal(quote.items[0].material,14.63);
  assert.equal(quote.totals.cost,1181.5);
  assert.equal(quote.totals.total,1613.57);
  assert.ok(quote.totals.margin<20);
  assert.ok(quote.totals.markup>quote.totals.margin);
  assert.equal((await c.send('/api/export?kind=quote&id='+q)).status,422);
  await c.ok('quote.transition',{id:q,status:'Internal Review'},'estimator');
  assert.equal((await c.act('quote.transition',{id:q,status:'Approved'},'estimator')).status,403);
  await c.ok('quote.transition',{id:q,status:'Approved'},'manager');
  assert.equal((await c.act('quote.edit',{id:q},'estimator')).status,422);
  const pdf=await c.send('/api/export?kind=quote&id='+q);
  assert.equal(pdf.status,200);
  const pdfText=await docString(pdf);
  assert.match(pdfText,/1,613\.57/);
  assert.doesNotMatch(pdfText,/Gross margin|Estimated cost|Material \/ unit/);
  const xlsx=await c.send('/api/export?kind=quote&id='+q+'&format=xlsx');
  assert.equal(xlsx.status,200);
  assert.match(xlsx.headers.get('Content-Type'),/spreadsheetml/);
  assert.match(await docString(xlsx),/xl\/worksheets\/sheet1.xml/);
  await c.ok('quote.transition',{id:q,status:'Sent'},'estimator');
  assert.equal(record(await c.state(),q).sentBy,'demo:owner:estimator');
  await c.ok('quote.transition',{id:q,status:'Accepted',reason:'Client award letter'},'manager');
  const project=(await c.ok('project.award',{id:q,name:'Awarded retrofit',location:'Phnom Penh',service:'HVAC',manager:'Test PM',contract:'TEST-AWARD',start:dateOffset(),end:dateOffset(90),retention:5},'project')).id;
  const snapshot=await c.state();
  assert.equal(record(snapshot,project).budget,1181.5);
  assert.equal(record(snapshot,project).value,1466.88);
  assert.ok(snapshot.records.some(x=>x.kind==='requirement'&&x.projectId===project&&x.quantity===50));
  assert.ok(snapshot.records.some(x=>x.kind==='quoteVersion'&&x.quoteId===q&&x.snapshot.status==='Approved'));
  assert.equal((await c.act('project.award',{id:q},'project')).status,422);
  c.DB.close();
});

test('stale quotation prices identify the exact line and quote-specific evidence leaves catalog verification intact',async()=>{
  const c=context();
  try{
    const original=await c.state();
    const material=record(original,'m0');
    const input={name:'Quotation with price evidence',clientId:'c1',projectId:'p1',currency:'USD',margin:25,tax:0,indirect:100,risk:200,discount:0,validUntil:dateOffset(14),
      items:['m0','m6','m12'].map((id,index)=>{
        const row=record(original,id);
        return {description:row.name,unit:row.unit,quantity:index===0?50:20,materialId:id,material:row.price,laborHours:0,laborRate:0,other:0,override:''};
      })};
    const rejected=await c.act('quote.create',input,'estimator');
    assert.equal(rejected.status,422);
    const error=(await rejected.json()).error;
    assert.match(error,/Quotation line 1 - MAT-0001/);
    assert.match(error,/90 days/);
    input.items[0].override='Public demo sample rate acknowledged for this quotation.';
    const quotation=(await c.ok('quote.create',input,'estimator')).id;
    const result=await c.state();
    assert.equal(record(result,quotation).items.length,3);
    assert.equal(record(result,quotation).items[0].quantity,50);
    assert.equal(record(result,quotation).items[0].material,material.price);
    assert.equal(record(result,'m0').priceDate,material.priceDate);
    assert.deepEqual(record(result,'m0').priceHistory,material.priceHistory);
  }finally{c.DB.close();}
});

test('live tender preparation uses explicit BOQ quantities and reports unmatched materials and unit conflicts',async()=>{
  const c=context();
  try{
    const input={name:'Structured tender',clientId:'c0',currency:'USD',due:dateOffset(15),value:19000,cost:14000,upfront:5000,duration:3,
      boq:[{materialCode:'MAT-0002',description:'Copper pipe',quantity:34,unit:'m',laborHours:.2,laborRate:12,sourceRef:'Tender BOQ row 8'},
        {description:'Unlisted equipment',quantity:2,unit:'ea',sourceRef:'Tender BOQ row 9'},
        {materialCode:'MAT-0003',description:'Pipe in wrong unit',quantity:4,unit:'roll'}]};
    const id=(await c.ok('tender.create',input,'estimator')).id;
    await c.ok('tender.transition',{id,status:'Under Evaluation'},'manager');
    await c.ok('tender.transition',{id,status:'Pending Review'},'manager');
    await c.ok('tender.transition',{id,status:'Approved for Bid',reason:'Test approval'},'manager');
    const response=await c.send('/api/tender-estimate?id='+id,{role:'estimator'});
    assert.equal(response.status,200);
    const result=await response.json();
    assert.equal(result.ready,false);
    assert.equal(result.generation.mode,'boq_match');
    assert.equal(result.quote.items.length,1);
    assert.equal(result.quote.items[0].quantity,34);
    assert.equal(result.unmatched.length,2);
    assert.match(result.unmatched[0].reason,/No catalog match/);
    assert.match(result.unmatched[1].reason,/unit/);
    assert.equal((await c.send('/api/tender-estimate?id=t0',{role:'estimator'})).status,422);
    assert.equal((await c.send('/api/tender-estimate?id='+id,{role:'warehouse'})).status,403);
  }finally{c.DB.close();}
});

test('approved shortage, supplier selection, partial receipt, issue, return and transfer',async()=>{
  const c=context();
  const p0=record(await c.state(),'p0');
  const requisition=(await c.ok('request.create',{projectId:'p0',materialId:'m1',quantity:100,needed:dateOffset(4),reason:'Site supply',price:16},'project')).id;
  await c.ok('request.transition',{id:requisition,status:'Reviewed',reason:'Verified shortage'},'procurement');
  const offer=(await c.ok('supplier.offer',{requestId:requisition,supplierId:'s0',price:15,due:dateOffset(4),terms:'30 days'},'procurement')).id;
  await c.ok('request.transition',{id:requisition,status:'Approved'},'manager');
  const po=(await c.ok('po.create',{requestId:requisition,supplierId:'s0',offerId:offer,due:dateOffset(5),location:'Central Warehouse'},'procurement')).id;
  const order=record(await c.state(),po);
  assert.equal(order.quantity,93);
  assert.equal(order.price,15);
  const posted={id:po,warehouseId:'w0',quantity:20,condition:'Usable',reference:'FICT-DO-0001'};
  const key=crypto.randomUUID();
  const receipt=await c.ok('po.receive',posted,'warehouse',key);
  assert.deepEqual(await c.ok('po.receive',posted,'warehouse',key),{id:receipt.id,replayed:true});
  assert.equal((await c.act('po.receive',posted,'warehouse')).status,422);
  assert.equal(record(await c.state(),po).status,'Partially Received');
  assert.equal(record(await c.state(),'m1').stock.onHand,27);
  assert.equal((await c.act('po.receive',{...posted,quantity:74,reference:'Too much'},'warehouse')).status,422);
  await c.ok('po.receive',{...posted,quantity:73,reference:'FICT-DO-0002'},'warehouse');
  assert.equal(record(await c.state(),po).status,'Received');
  const issue=(await c.ok('stock.move',{type:'Issue',materialId:'m1',warehouseId:'w0',quantity:4,projectId:'p0',recipient:'Site PM',reason:'Install pipe'},'warehouse')).id;
  let snapshot=await c.state();
  assert.equal(record(snapshot,'m1').stock.onHand,96);
  assert.ok(record(snapshot,'p0').position.actual>p0.position.actual);
  await c.ok('stock.move',{type:'Return',materialId:'m1',warehouseId:'w0',quantity:1,projectId:'p0',issueId:issue,condition:'Usable',reason:'Unused'},'warehouse');
  await c.ok('stock.move',{type:'Transfer',materialId:'m1',warehouseId:'w0',quantity:2,toWarehouseId:'w1',transferConfirmation:'Site Store',reason:'Stock redistribution'},'warehouse');
  snapshot=await c.state();
  assert.equal(record(snapshot,'m1').stock.onHand,97);
  assert.equal(record(snapshot,'m1').bins.find(x=>x.id==='w1').onHand,2);
  assert.equal((await c.act('stock.move',{type:'Issue',materialId:'m1',warehouseId:'w0',quantity:200,projectId:'p0',recipient:'Site PM',reason:'Excess'},'warehouse')).status,422);
  c.DB.close();
});

test('one multi-material requisition commits atomically and its lines keep independent approval and receipt workflows',async()=>{
  const c=context();
  try{
    const input={projectId:'p0',name:'Grouped site supply',needed:dateOffset(8),reason:'Combined site request',
      items:[{materialId:'m1',quantity:100},{materialId:'m2',quantity:100}]};
    const groupId=(await c.ok('request.create',input,'project')).id;
    const snapshot=await c.state();
    const group=record(snapshot,groupId);
    assert.equal(group.kind,'requisition');
    assert.equal(group.lineIds.length,2);
    assert.deepEqual(group.lineIds.map(id=>record(snapshot,id).materialId),['m1','m2']);
    assert.ok(group.lineIds.every(id=>record(snapshot,id).requisitionId===groupId));
    const first=group.lineIds[0];
    await c.ok('request.transition',{id:first,status:'Reviewed',reason:'Line checked'},'procurement');
    await c.ok('request.transition',{id:first,status:'Approved'},'admin');
    const po=(await c.ok('po.create',{requestId:first,supplierId:'s0',due:dateOffset(8),location:'Site store'},'procurement')).id;
    await c.ok('po.receive',{id:po,warehouseId:'w0',quantity:2,condition:'Usable',reference:'GROUPED-RECEIPT'},'warehouse');
    const received=await c.state();
    assert.equal(record(received,first).status,'Partially Received');
    assert.equal(record(received,group.lineIds[1]).status,'Requested');
    const before=await c.state();
    const bad={...input,needed:dateOffset(10),items:[{materialId:'m1',quantity:101},{materialId:'missing',quantity:1}]};
    assert.equal((await c.act('request.create',bad,'project')).status,404);
    assert.deepEqual((await c.state()).records,before.records);
    const duplicate={...input,items:[{materialId:'m1',quantity:2},{materialId:'m1',quantity:3}]};
    assert.equal((await c.act('request.create',duplicate,'project')).status,422);
  }finally{c.DB.close();}
});

test('parallel issues cannot overspend stock, and a stale count cannot overwrite movements',async()=>{
  const c=context();
  await c.state();
  const count=(await c.ok('stock.count',{materialId:'m2',warehouseId:'w0',counted:10,reason:'Cycle count'},'warehouse')).id;
  const issue={type:'Issue',materialId:'m2',warehouseId:'w0',quantity:6,projectId:'p2',recipient:'PM',reason:'Parallel test'};
  const result=await Promise.all([c.act('stock.move',issue,'warehouse'),c.act('stock.move',issue,'warehouse')]);
  assert.deepEqual(result.map(x=>x.status).sort(),[200,422]);
  assert.equal(record(await c.state(),'m2').stock.onHand,1);
  assert.equal((await c.act('stock.adjust',{id:count,reason:'Correction'})).status,422);
  const fresh=(await c.ok('stock.count',{materialId:'m2',warehouseId:'w0',counted:3,reason:'Recount'},'warehouse')).id;
  await c.ok('stock.adjust',{id:fresh,reason:'Approved variance'});
  assert.equal(record(await c.state(),'m2').stock.onHand,3);
  c.DB.close();
});

test('maintenance recurrence is unique and completed job produces a PDF',async()=>{
  const c=context();
  const contract=(await c.ok('contract.create',{name:'Fictional clinic service',clientId:'c2',currency:'USD',value:12000,start:dateOffset(),end:dateOffset(90),site:'Phnom Penh',frequency:30,billing:'Monthly',equipment:'Air handlers',supervisor:'Supervisor',technician:'Assigned technician'},'maintenance')).id;
  await c.ok('contract.schedule',{id:contract,until:dateOffset(60)},'maintenance');
  assert.equal((await c.act('contract.schedule',{id:contract,until:dateOffset(60)},'maintenance')).status,422);
  const jobs=(await c.state()).records.filter(x=>x.kind==='job'&&x.contractId===contract);
  assert.equal(jobs.length,3);
  const j=jobs[0];
  await c.ok('job.assign',{id:j.id,scheduled:dateOffset(1),technician:'Field tech',reason:'Site asked for next day'},'maintenance');
  await c.ok('stock.move',{type:'Issue',materialId:'m5',warehouseId:'w0',quantity:1,jobId:j.id,recipient:'Field tech',reason:'Filter replacement'},'warehouse');
  assert.equal((await c.act('job.update',{id:j.id,status:'Completed',completed:[],minutes:45,findings:'Complete',ack:'Site client'},'technician')).status,422);
  await c.ok('job.update',{id:j.id,status:'Completed',completed:j.checklist,minutes:45,findings:'Complete',ack:'Site client'},'technician');
  const response=await c.send('/api/export?kind=job&id='+j.id,{role:'technician'});
  assert.equal(response.status,200);
  const pdf=await docString(response);
  assert.match(pdf,/Customer acknowledgment: Site client/);
  assert.match(pdf,/Materials issued/);
  c.DB.close();
});

test('approved progress, distinct billing records, partial collections, reversal and forecast',async()=>{
  const c=context();
  await c.ok('project.progress',{id:'p0',progress:70,remaining:50000,notes:'Progress witnessed on site'},'project');
  const milestone=(await c.ok('milestone.create',{projectId:'p0',name:'MEP commissioning',amount:12000,due:dateOffset(5),criteria:'Signed commissioning sheet'},'finance')).id;
  const claim=(await c.ok('claim.create',{projectId:'p0',milestoneId:milestone,name:'Commissioning claim',evidence:'Signed commissioning sheet'},'finance')).id;
  await c.ok('claim.transition',{id:claim,status:'Submitted',reason:'Submission ID'},'finance');
  await c.ok('claim.transition',{id:claim,status:'Certified',reason:'Certified by consultant',certified:10000},'finance');
  const inv=(await c.ok('invoice.create',{claimId:claim,reference:'TEST-INV',due:dateOffset(1)},'finance')).id;
  const payment=(await c.ok('invoice.pay',{invoiceId:inv,amount:3500,date:dateOffset(),reference:'DEMO-PARTIAL'},'finance')).id;
  const initial=record(await c.state(),inv);
  assert.equal(initial.amount,9500);
  assert.deepEqual(initial.balance,{paid:3500,outstanding:6000});
  assert.equal((await c.act('invoice.pay',{invoiceId:inv,amount:6500,date:dateOffset(),reference:'Too high'},'finance')).status,422);
  await c.ok('invoice.reverse',{id:payment,reason:'Entered against wrong account'},'finance');
  const revised=record(await c.state(),inv);
  assert.deepEqual(revised.balance,{paid:0,outstanding:9500});
  await c.ok('cash.update',{type:'Opening cash',amount:45000,due:dateOffset()},'finance');
  const report=(await c.state()).report;
  assert.equal(report.weeks.length,13);
  assert.ok(report.weeks[0].balance>0);
  const pdf=await c.send('/api/export?kind=report',{role:'finance'});
  assert.equal(pdf.status,200);
  assert.match(await docString(pdf),/Weekly operations summary/);
  c.DB.close();
});

test('documents use scoped storage, remain downloadable, and audit records survive demo reset',async()=>{
  const c=context();
  const form=new FormData();
  form.set('parentId','t0');
  form.set('key',crypto.randomUUID());
  form.set('file',new File(['Fictional tender evidence'],'test-evidence.txt',{type:'text/plain'}));
  const response=await c.send('/api/upload',{role:'estimator',body:form});
  assert.equal(response.status,200);
  const {id}=await response.json();
  const r=record(await c.state(),id);
  assert.equal(r.name,'test-evidence.txt');
  assert.equal('key' in r,false);
  assert.equal((await c.send('/api/file/'+id,{role:'warehouse'})).status,404);
  const file=await c.send('/api/file/'+id,{role:'estimator'});
  assert.equal(await file.text(),'Fictional tender evidence');
  await c.ok('demo.reset',{confirm:'RESET'});
  assert.equal((await c.send('/api/file/'+id)).status,404);
  const log=await (await c.send('/api/audit')).json();
  assert.ok(log.some(x=>x.action==='document.attach'));
  assert.ok(log.some(x=>x.action==='demo.reset'));
  c.DB.close();
});

test('team identity uses an allowlist, role switching does not escalate privileges and mode changes fail closed',async()=>{
  const c=context({TEAMS_MODE:'team',TEAMS_OWNER_EMAIL:'owner@example.test'});
  assert.equal((await c.state()).records.length,1);
  await c.ok('employee.upsert',{name:'Stock employee',email:'stock@example.test',roles:['warehouse'],active:true});
  const request={role:'admin',actor:'stock-person',email:'stock@example.test'};
  const s=await (await c.send('/api/state',request)).json();
  assert.deepEqual(s.actor.roles,['warehouse']);
  assert.equal((await c.act('settings.update',{},'admin',crypto.randomUUID(),request)).status,403);
  assert.equal((await c.send('/api/state',{email:'unlisted@example.test'})).status,403);
  c.env.TEAMS_MODE='demo';
  assert.equal((await c.send('/api/state')).status,503);
  c.DB.close();
});

test('SQLite-backed records survive reopen',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'teams-test-')),filename=join(dir,'db.sqlite');
  try{
    const c=context({DB:localDb(filename)});
    const created=await c.ok('client.create',{name:'Persistence test'});
    c.DB.close();
    const next=context({DB:localDb(filename)});
    assert.equal(record(await next.state(),created.id).name,'Persistence test');
    next.DB.close();
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('bid calculation flags missing terms and KHR margins round to whole riel',()=>{
  const result=bidAssessment({value:100000,cost:87000,currency:'USD',duration:3,upfront:50000,delay:2,advance:0,guarantee:10,collateral:20,fee:200,retention:5}, {currency:'USD',cashLimit:25000,minMargin:15});
  assert.equal(result.decision,'Requires Management Review');
  assert.equal(result.exposure,76866.67);
  assert.ok(result.missing.includes('Verified terms and source references'));
  const total=quotationTotals({currency:'KHR',items:[{quantity:3,material:1000,laborHours:0,laborRate:0,other:0}],indirect:0,risk:0,margin:20,discount:0,tax:0});
  assert.equal(total.total,3750);
  assert.equal(total.markup,25);
});

test('master import commits as a batch and preserves verified stock cutoff',async()=>{
  const c=context();
  await c.state();
  const invalid=await c.act('master.import',{type:'client',source:'clients.csv',entries:[{name:'Atomic import'},{name:'Mekong Commercial Properties'}]});
  assert.equal(invalid.status,422);
  assert.equal((await c.state()).records.some(x=>x.name==='Atomic import'),false);
  const valid=await c.ok('master.import',{type:'client',source:'clients.csv',entries:[{name:'Atomic import'},{name:'Second imported client'}]});
  assert.equal(record(await c.state('admin'),valid.id).count,2);
  const opening=await c.ok('master.import',{type:'opening',source:'verified-count.xlsx',cutoff:dateOffset(-2),entries:[{materialCode:'MAT-0002',warehouseCode:'WH-02',quantity:8,cost:13}]});
  assert.equal(record(await c.state('admin'),opening.id).cutoff,dateOffset(-2));
  assert.equal((await c.act('master.import',{type:'opening',source:'repeat.xlsx',cutoff:dateOffset(-2),entries:[{materialCode:'MAT-0002',warehouseCode:'WH-02',quantity:8,cost:13}]})).status,422);
  c.DB.close();
});
