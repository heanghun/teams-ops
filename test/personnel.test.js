import assert from 'node:assert/strict';
import test from 'node:test';
import { localDb } from '../scripts/local-db.mjs';
import worker from '../server/worker.js';
import { dateOffset } from '../server/seed.js';

const owner='admin@example.test';
const token='synthetic-secret-for-integration-testing-only-0123456789abcdef';
const scope={'X-Teams-Workspace':'private'};
const ownerHeaders={...scope,'oai-authenticated-user-id':'authenticated-owner','oai-authenticated-user-email':owner};
const profiles=['installation_lead','installation_technician','maintenance_lead','logistics','director','finance','warehouse','technician'];
const fixture={as_of:'2026-11-11',employees:Array.from({length:69},(_,i)=>({
  source_row:i+2,employee_id:i===0?'':i<67?String(i).padStart(4,'0'):'INT-'+String(i).padStart(4,'0'),
  english_name:'Fixture Employee '+i,position_source:'Source Job Title '+i,department_source:'MEP',team_source:i<26?'':'Team A',
  employment_group:i<67?'Regular':'Intern',proposed_app_role:i<67?profiles[i%profiles.length]:'no_access',
  access_status:'directory_only_inactive',review_notes:i===0?'Missing ID and team':'',
}))};
const id=i=>'personnel:'+String(i).padStart(4,'0');
const url='https://example.test';
function workspace(){
  const DB=localDb(),env={TEAMS_MODE:'staff-demo',TEAMS_OWNER_EMAIL:owner,TEAMS_PERSONNEL_IMPORT_TOKEN:token,TEAMS_PERSONNEL_BOOTSTRAP:'enabled',DB};
  const call=(path,headers={},body)=>worker.fetch(new Request(url+path,{
    method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,
  }),env);
  const action=(action,data,employee)=>call('/api/action',employee?{...ownerHeaders,'X-Teams-Preview-Employee':employee}:ownerHeaders,{action,data,key:crypto.randomUUID()});
  const privateState=async employee=>{
    const result=await call('/api/state',employee?{...ownerHeaders,'X-Teams-Preview-Employee':employee}:ownerHeaders);
    assert.equal(result.status,200);
    return result.json();
  };
  const bootstrap=async()=>{
    await privateState();
    const result=await call('/api/personnel-provision',{'X-Teams-Roster-Import':token},fixture);
    assert.equal(result.status,201,await result.clone().text());
    return result.json();
  };
  return {DB,env,call,action,privateState,bootstrap};
}

test('imports 69 private employees with exact source values and preserves the complete operational snapshot',async()=>{
  const w=workspace();
  try{
    await w.privateState();
    const verify=()=>w.call('/api/personnel-provision',{'X-Teams-Roster-Import':token}).then(r=>r.json());
    const baseline=await verify();
    const imported=await w.bootstrap();
    assert.equal(imported.total,69);
    assert.equal(imported.regular,67);
    assert.equal(imported.interns,2);
    assert.equal(imported.leadingZeroIds,66);
    assert.equal(imported.missingIds,1);
    assert.equal(imported.loginAccountsCreated,0);
    assert.equal(imported.separateApprovalGrants,0);
    assert.equal(imported.operationalFingerprint,baseline.operationalFingerprint);
    const state=await w.privateState(),directory=state.records.filter(row=>row.kind==='personnel');
    assert.deepEqual(directory.map(row=>row.source),fixture.employees);
    assert.ok(directory.find(row=>row.source.source_row===2).id.match(/^personnel:[a-f0-9-]{36}$/));
    assert.deepEqual(directory.filter(row=>row.employmentGroup==='Intern').flatMap(row=>row.roles),[]);
    assert.equal(state.records.some(row=>row.kind==='employee'),false);
    assert.equal(state.demoRoles.length,0);
    assert.equal((await w.call('/api/state')).status,401);
    assert.equal((await w.call('/api/state',scope)).status,401);
    assert.equal((await w.call('/api/state',{...ownerHeaders,'oai-authenticated-user-email':'another@example.test'})).status,403);
    assert.equal((await w.call('/api/personnel-provision',{},fixture)).status,404);
    assert.equal((await w.action('demo.reset',{confirm:'RESET'})).status,403);
    assert.equal((await w.call('/api/personnel-provision',{'X-Teams-Roster-Import':token},fixture)).status,200);
    const audit=await (await w.call('/api/personnel-audit',ownerHeaders)).json();
    assert.equal(audit[0].summary.length,69);
    delete w.env.TEAMS_PERSONNEL_BOOTSTRAP;
    assert.equal((await w.call('/api/personnel-provision',{'X-Teams-Roster-Import':token})).status,404);
  }finally{w.DB.close();}
});

test('profiles, organization edits and approval decisions remain separate and auditable',async()=>{
  const w=workspace();
  try{
    await w.bootstrap();
    const employee=id(4);
    let result=await w.action('personnel.roles',{id:employee,roles:['director','finance'],reason:'Verified mapping'});
    assert.equal(result.status,200,await result.clone().text());
    result=await w.action('personnel.edit',{id:employee,position:'Corrected title',department:'Confirmed department',team:'Confirmed team',reviewResolved:true,reason:'HR confirmation'});
    assert.equal(result.status,200);
    const current=(await w.privateState()).records.find(row=>row.id===employee);
    assert.deepEqual(current.roles,['director','finance']);
    assert.equal(current.source.position_source,fixture.employees[4].position_source);
    assert.deepEqual(current.approvals,[]);
    const preview=await w.privateState(employee);
    assert.ok(preview.permissions.includes('billing')&&preview.permissions.includes('tenders'));
    assert.equal(preview.records.some(row=>row.kind==='personnel'),false);
    assert.equal((await w.action('quote.transition',{id:'q0',status:'Approved'},employee)).status,403);
    assert.equal((await w.action('personnel.roles',{id:employee,roles:['admin'],reason:'Rejected'},employee)).status,403);
    assert.equal((await w.action('personnel.approvals',{id:employee,approvals:['stock'],reason:'Rejected'})).status,422);
    assert.equal((await w.action('personnel.approvals',{id:employee,approvals:['quote'],reason:'Approved authority reference'})).status,200);
    result=await w.action('quote.transition',{id:'q0',status:'Approved'},employee);
    assert.equal(result.status,200,await result.clone().text());
    const audit=await (await w.call('/api/personnel-audit',ownerHeaders)).json();
    const change=audit.find(event=>event.action==='personnel.roles').summary[0];
    assert.deepEqual(change.before.roles,['director']);
    assert.deepEqual(change.after.roles,['director','finance']);
    assert.equal(change.reason,'Verified mapping');
    assert.equal((await w.call('/api/personnel-audit',{...ownerHeaders,'X-Teams-Preview-Employee':employee})).status,403);
  }finally{w.DB.close();}
});

test('limited field roles see assigned work and cannot bypass approvals or stock controls',async()=>{
  const w=workspace();
  try{
    await w.bootstrap();
    const lead=id(8),tech=id(1),maintenance=id(2),logistics=id(3),serviceTech=id(7);
    assert.equal((await w.action('project.assign',{id:'p0',managerEmployeeId:lead,staffEmployeeIds:[tech],reason:'Test allocation'})).status,200);
    assert.equal((await w.action('project.assign',{id:'p1',managerEmployeeId:'fake',staffEmployeeIds:[],reason:'Rejected'})).status,404);
    const task=await w.action('task.create',{projectId:'p0',ownerEmployeeId:tech,name:'Fictional task',due:dateOffset(5)},lead);
    assert.equal(task.status,200,await task.clone().text());
    const taskId=(await task.json()).id;
    const state=await w.privateState(tech);
    assert.ok(state.permissions.includes('projects'));
    assert.equal(state.permissions.includes('billing'),false);
    assert.deepEqual(state.records.filter(row=>row.kind==='project').map(row=>row.id),['p0']);
    assert.equal(state.records.find(row=>row.id==='p0').value,undefined);
    assert.equal((await w.action('task.update',{id:taskId,status:'Completed'},tech)).status,200);
    assert.equal((await w.action('request.create',{projectId:'p1',materialId:'m1',quantity:1,needed:dateOffset(5),reason:'Rejected'},tech)).status,403);
    assert.equal((await w.action('delivery.assign',{id:'po0',deliveryEmployeeId:logistics,reason:'Test dispatch'})).status,200);
    assert.equal((await w.action('delivery.proof',{id:'po0',reference:'Signed ticket'},logistics)).status,200);
    assert.equal((await w.action('delivery.proof',{id:'po1',reference:'Rejected'},logistics)).status,403);
    assert.equal((await w.action('stock.adjust',{id:'x'},logistics)).status,403);
    const courier=await w.privateState(logistics);
    assert.deepEqual(courier.records.filter(row=>row.kind==='po').map(row=>row.id),['po0']);
    assert.equal(courier.records.find(row=>row.id==='po0').price,undefined);
    const initial=await w.privateState();
    const jobs=initial.records.filter(row=>row.kind==='job');
    const j=jobs[0];
    assert.equal((await w.action('job.assign',{id:j.id,technicianEmployeeId:serviceTech,leadEmployeeId:maintenance,scheduled:j.scheduled,reason:'Test service allocation'})).status,200);
    const service=await w.privateState(maintenance);
    assert.deepEqual(service.records.filter(row=>row.kind==='job').map(row=>row.id),[j.id]);
    assert.equal(service.records.find(row=>row.kind==='contract').value,undefined);
    assert.equal((await w.action('job.update',{id:jobs[1].id,status:'In Progress'},maintenance)).status,403);
    assert.equal((await w.action('job.update',{id:j.id,status:'In Progress'},maintenance)).status,200);
  }finally{w.DB.close();}
});
