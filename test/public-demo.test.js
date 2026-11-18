import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRecords } from '../server/seed.js';
import worker from '../server/worker.js';
import { createDemoTransport } from '../public/demo.js';

const origin='https://demo.example.test';
function browserStore(){
  let data={version:1,rows:initialRecords(true),files:{},audit:[]};
  return {
    read:async()=>structuredClone(data),
    update:async update=>{
      const draft=structuredClone(data),result=update(draft);
      data=draft;
      return result;
    },
  };
}
const post=(action,data,key=crypto.randomUUID())=>({method:'POST',body:JSON.stringify({action,data,key})});

test('public demo mode cannot reach hosted business records, attachments or mutations',async()=>{
  const untouched=new Proxy({}, {get(){throw Error('Public requests must never touch storage');}});
  const env={TEAMS_MODE:'public-demo',DB:untouched,BUCKET:untouched};
  const request=(path,method='GET',headers={})=>worker.fetch(new Request(origin+path,{method,headers}),env);
  const mode=await request('/api/mode');
  assert.deepEqual(await mode.json(),{publicDemo:true});
  for(const [path,method] of [['/api/state','GET'],['/api/action','POST'],['/api/upload','POST'],['/api/file/sample','GET'],['/api/backup','GET']]){
    assert.equal((await request(path,method)).status,404);
    assert.equal((await request(path,method,{'oai-authenticated-user-id':'signed-in-visitor'})).status,404);
  }
});

test('public demo transactions are isolated per browser and persist in the same browser',async()=>{
  const firstStore=browserStore(), firstBase=createDemoTransport(firstStore,origin),secondBase=createDemoTransport(browserStore(),origin);
  const first=(path,options={})=>firstBase(path,{...options,headers:options.headers||{'X-Teams-Demo-Role':'finance'}}),second=(path,options={})=>secondBase(path,{...options,headers:options.headers||{'X-Teams-Demo-Role':'finance'}});
  const start=await (await first('/api/state')).json();
  assert.equal(start.publicDemo,true);
  assert.equal(start.report.activeProjects,6);
  const input=post('invoice.pay',{invoiceId:'inv0',amount:100,date:start.report.today,reference:'DEMO-BROWSER-100'});
  const result=await first('/api/action',input);
  assert.equal(result.status,200);
  const replay=await (await first('/api/action',input)).json();
  assert.equal(replay.replayed,true);
  const [a,b]=await Promise.all([createDemoTransport(firstStore,origin)('/api/state',{headers:{'X-Teams-Demo-Role':'finance'}}).then(r=>r.json()),second('/api/state').then(r=>r.json())]);
  assert.equal(a.records.find(r=>r.id==='inv0').balance.outstanding,b.records.find(r=>r.id==='inv0').balance.outstanding-100);
  assert.equal((await first('/api/action',{...input,headers:{'X-Teams-Demo-Role':'warehouse'}})).status,409);
  const warehouse=await (await first('/api/state',{headers:{'X-Teams-Demo-Role':'warehouse'}})).json();
  assert.equal(warehouse.records.some(r=>r.kind==='invoice'),false);
  assert.equal((await first('/api/export?kind=quote&id=q4',{headers:{'X-Teams-Demo-Role':'estimator'}})).headers.get('Content-Type'),'application/pdf');
});

test('public demo attachments and resets stay local',async()=>{
  const first=createDemoTransport(browserStore(),origin),second=createDemoTransport(browserStore(),origin);
  const form=new FormData();
  form.set('file',new File(['fictional evidence'],'sample.txt',{type:'text/plain'}));
  form.set('parentId','t0');
  form.set('key',crypto.randomUUID());
  const upload=await first('/api/upload',{method:'POST',body:form});
  assert.equal(upload.status,200);
  const id=(await upload.json()).id,path='/api/file/'+id;
  assert.equal(await (await first(path)).text(),'fictional evidence');
  assert.equal((await second(path)).status,404);
  assert.equal((await first(path,{headers:{'X-Teams-Demo-Role':'warehouse'}})).status,404);
  assert.equal((await first('/api/action',post('demo.reset',{confirm:'RESET'}))).status,200);
  assert.equal((await first(path)).status,404);
});

test('named role proposals persist with audit history while permissions and operational records stay consistent',async()=>{
  const store=browserStore(),demo=createDemoTransport(store,origin);
  const baseline=await (await demo('/api/state')).json();
  const person=baseline.rolePlanning.people.find(row=>row.roles.includes('mep'));
  const body={operation:'person.save',key:crypto.randomUUID(),reason:'Discuss a second profile',
    data:{...person,roles:['mep','project']}};
  const submit=()=>demo('/api/demo-planning',{method:'POST',body:JSON.stringify(body),headers:{'X-Teams-Demo-Role':'installation_technician'}});
  assert.equal((await submit()).status,200);
  assert.equal((await (await submit()).json()).replayed,true);
  const reopened=createDemoTransport(store,origin);
  const result=await (await reopened('/api/state',{headers:{'X-Teams-Demo-Role':'installation_technician'}})).json();
  assert.deepEqual(result.rolePlanning.people.find(row=>row.id===person.id).roles,['mep','project']);
  assert.deepEqual(result.actor.roles,['installation_technician']);
  assert.equal(result.actions.includes('quote.transition'),false);
  assert.equal(result.rolePlanning.audit.length,1);
  assert.deepEqual(result.rolePlanning.audit[0].before.roles,['mep']);
  assert.deepEqual(result.rolePlanning.audit[0].after.roles,['mep','project']);
  const all=await (await reopened('/api/state')).json();
  assert.deepEqual(all.records,baseline.records);
  const other=await (await createDemoTransport(browserStore(),origin)('/api/state')).json();
  assert.deepEqual(other.rolePlanning.people.find(row=>row.id===person.id).roles,['mep']);
  assert.equal((await reopened('/api/action',post('demo.reset',{confirm:'RESET'}))).status,200);
  assert.equal((await (await reopened('/api/state')).json()).rolePlanning.audit.length,1);
});

test('employee planning import is atomic and retains string identifiers and explicit profile changes on repeat imports',async()=>{
  const store=browserStore(),demo=createDemoTransport(store,origin);
  const source={employees:[{source_row:1,employee_id:'0001',english_name:'Example One',position_source:'Technician',proposed_app_role:'installation_technician'},
    {source_row:2,employee_id:'',english_name:'Example Two',position_source:'Intern',proposed_app_role:'no_access'}]};
  const send=(operation,data)=>demo('/api/demo-planning',{method:'POST',body:JSON.stringify({operation,data,key:crypto.randomUUID(),reason:'Planning import test'})});
  assert.equal((await send('source.import',{source})).status,200);
  const imported=await (await demo('/api/state')).json();
  const first=imported.rolePlanning.people.find(person=>person.name==='Example One');
  assert.equal(first.employeeId,'0001');
  assert.deepEqual(imported.rolePlanning.people.find(person=>person.name==='Example Two').roles,[]);
  assert.equal((await send('person.save',{...first,roles:['installation_lead','project']})).status,200);
  assert.equal((await send('source.import',{source})).status,200);
  const again=await (await demo('/api/state')).json();
  assert.equal(again.rolePlanning.people.filter(person=>person.name==='Example One').length,1);
  assert.deepEqual(again.rolePlanning.people.find(person=>person.id===first.id).roles,['installation_lead','project']);
  const invalid=structuredClone(source);invalid.employees[0].english_name='Changed';invalid.employees[1].proposed_app_role='unknown';
  assert.equal((await send('source.import',{source:invalid})).status,422);
  assert.deepEqual((await (await demo('/api/state')).json()).rolePlanning,again.rolePlanning);
});

test('HR manages employee job functions with audit history while other profiles cannot change HR details',async()=>{
  const store=browserStore(),demo=createDemoTransport(store,origin);
  const baseline=await (await demo('/api/state')).json();
  const person=baseline.rolePlanning.people.find(person=>person.roles.includes('estimator'));
  const save={operation:'employee.save',key:crypto.randomUUID(),reason:'Record responsibilities for the HR demonstration',
    data:{...person,department:'Engineering',team:'Design and QS',jobFunctions:'Prepare estimates\nPrepare quotations from verified prices'}};
  const submit=role=>demo('/api/demo-planning',{method:'POST',body:JSON.stringify(save),headers:{'X-Teams-Demo-Role':role}});
  assert.equal((await submit('estimator')).status,403);
  assert.equal((await submit('adminSupport')).status,200);
  const result=await (await createDemoTransport(store,origin)('/api/state')).json();
  const employee=result.rolePlanning.people.find(row=>row.id===person.id);
  assert.equal(employee.jobFunctions,save.data.jobFunctions);
  assert.equal(employee.department,'Engineering');
  assert.deepEqual(employee.roles,person.roles);
  assert.equal(result.rolePlanning.audit[0].action,'planning.employee.save');
  assert.equal(result.records.some(row=>row.kind==='employee'||row.kind==='personnel'),false);
  assert.deepEqual(result.records,baseline.records);
});

test('An estimator generates an editable quotation from an approved demo tender and preserves its source record',async()=>{
  const store=browserStore(),demo=createDemoTransport(store,origin);
  const headers={'X-Teams-Demo-Role':'estimator'};
  const initial=await (await demo('/api/state',{headers})).json();
  const tender=initial.records.find(row=>row.id==='t-ai-approved-demo');
  assert.equal(tender.status,'Approved for Bid');
  const estimateResponse=await demo('/api/tender-estimate?id='+tender.id,{headers});
  assert.equal(estimateResponse.status,200);
  const estimate=await estimateResponse.json();
  assert.equal(estimate.ready,true);
  assert.equal(estimate.quote.items.length,tender.boq.length);
  assert.equal(estimate.quote.items.length,10);
  assert.equal(estimate.generation.mode,'simulation');
  for(const [index,line] of estimate.quote.items.entries()){
    const material=initial.records.find(row=>row.id===line.materialId);
    assert.equal(line.quantity,tender.boq[index].quantity);
    assert.equal(line.material,material.price);
    assert.ok(line.sourceRef);
  }
  const saved=await demo('/api/action',{...post('tender.quote',{...estimate.quote,tenderId:tender.id,generation:estimate.generation}),headers});
  assert.equal(saved.status,200);
  const id=(await saved.json()).id;
  const after=await (await createDemoTransport(store,origin)('/api/state',{headers})).json();
  const quote=after.records.find(row=>row.id===id);
  assert.equal(quote.status,'Draft');
  assert.equal(quote.tenderId,tender.id);
  assert.equal(quote.items.length,10);
  assert.deepEqual(quote.generation,estimate.generation);
  assert.deepEqual(after.records.find(row=>row.id===tender.id),tender);
  assert.equal((await demo('/api/tender-estimate?id=t0',{headers})).status,422);
  assert.equal((await demo('/api/tender-estimate?id='+tender.id,{headers:{'X-Teams-Demo-Role':'technician'}})).status,403);
  assert.equal((await demo('/api/action',{...post('tender.quote',{...estimate.quote,tenderId:'t0'}),headers})).status,422);
  await demo('/api/action',post('demo.reset',{confirm:'RESET'}));
  const reset=await (await demo('/api/state',{headers})).json();
  assert.equal(reset.records.filter(row=>row.id===tender.id).length,1);
});

test('the public role switcher offers all 17 profiles and useful scoped assignments',async()=>{
  const store=browserStore(),demo=createDemoTransport(store,origin);
  const roleHeaders=role=>({'X-Teams-Demo-Role':role});
  const state=async role=>(await demo('/api/state',{headers:roleHeaders(role)})).json();
  const act=(role,action,data)=>demo('/api/action',{...post(action,data),headers:roleHeaders(role)});
  const baseline=await state('admin');
  assert.equal(new Set(baseline.demoRoles).size,17);
  assert.equal(baseline.records.some(row=>row.kind==='personnel'),false);
  assert.equal(baseline.people.every(row=>row.id.startsWith('demo-person:')),true);
  for(const role of baseline.demoRoles)assert.deepEqual((await state(role)).actor.roles,[role]);

  const technician=await state('installation_technician');
  assert.deepEqual(technician.records.filter(row=>row.kind==='project').map(row=>row.id),['p0']);
  assert.equal(technician.permissions.includes('billing'),false);
  assert.equal((await act('installation_technician','task.update',{id:'demo-role-task',status:'In Progress'})).status,200);
  assert.equal((await act('installation_technician','project.assign',{id:'p0'})).status,403);

  const lead=await state('installation_lead');
  assert.ok(lead.records.some(row=>row.kind==='task'&&row.status==='In Progress'));
  assert.equal(lead.actions.includes('task.create'),true);
  assert.equal(lead.actions.includes('quote.transition'),false);

  const service=await state('maintenance_lead');
  assert.deepEqual(service.records.filter(row=>row.kind==='job').map(row=>row.id),['job0']);
  assert.equal(service.actions.includes('job.assign'),true);
  assert.equal(service.records.find(row=>row.kind==='contract').value,undefined);

  const logistics=await state('logistics');
  assert.deepEqual(logistics.records.filter(row=>row.kind==='po').map(row=>row.id),['po0','po-generator-demo']);
  assert.equal(logistics.records.find(row=>row.kind==='po').price,undefined);
  assert.equal((await act('logistics','delivery.proof',{id:'po0',reference:'Fictional delivery ticket'})).status,200);
  assert.equal((await act('logistics','delivery.proof',{id:'po1',reference:'Fictional delivery ticket'})).status,403);
  assert.equal((await act('logistics','stock.adjust',{id:'opening-m0'})).status,403);
  assert.equal((await store.read()).rows.filter(row=>row.kind==='demo-person').length,15);
  assert.equal((await state('admin')).records.filter(row=>row.kind==='quote').length,baseline.records.filter(row=>row.kind==='quote').length);
});

test('the old workspace link redirects publicly and public requests cannot reach employee data',async()=>{
  const untouched=new Proxy({}, {get(){throw Error('Public requests must never touch storage');}});
  const env={TEAMS_MODE:'public-demo',TEAMS_OWNER_EMAIL:'admin@example.test',TEAMS_PERSONNEL_BOOTSTRAP:'enabled',DB:untouched,BUCKET:untouched};
  const headers={'X-Teams-Workspace':'private','oai-authenticated-user-id':'owner','oai-authenticated-user-email':'admin@example.test'};
  const old=await worker.fetch(new Request(origin+'/?workspace=private#employees'),env);
  assert.equal(old.status,302);
  assert.equal(old.headers.get('Location'),'/#home');
  assert.deepEqual(await (await worker.fetch(new Request(origin+'/api/mode',{headers}),env)).json(),{publicDemo:true});
  for(const path of ['/api/state','/api/personnel-audit','/api/personnel-provision'])
    assert.equal((await worker.fetch(new Request(origin+path,{headers}),env)).status,404);
});
