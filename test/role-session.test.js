import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoleSession,roleHome} from '../public/role-session.js';
import {createDemoTransport} from '../public/demo.js';
import {initialRecords} from '../server/seed.js';
const roleState=(role)=>({demoRoles:Object.keys(roleHome),actor:{roles:[role]},records:[{id:role}]});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('An older refresh cannot overwrite the identity or permissions after a role switch',async()=>{
  const pending=deferred(),state={role:'admin',picId:'',previewId:'',data:roleState('admin')},saved=[];
  const session=createRoleSession({state,fetchState:role=>role==='admin'?pending.promise:Promise.resolve(roleState(role)),persist:(...args)=>saved.push(args),people:role=>[{id:'pic-'+role}]});
  const old=session.read();assert.equal(await session.switch('warehouse'),true);
  pending.resolve(roleState('admin'));assert.equal(await old,false);
  assert.equal(state.role,'warehouse');assert.deepEqual(state.data.actor.roles,['warehouse']);assert.equal(state.picId,'pic-warehouse');assert.deepEqual(saved,[['warehouse','pic-warehouse']]);
});

test('Failed role loading preserves the current identity, data and saved preference',async()=>{
  const previous=roleState('admin'),state={role:'admin',picId:'original',previewId:'',data:previous},saved=[];
  const session=createRoleSession({state,fetchState:async()=>{throw Error('Connection failed');},persist:(...args)=>saved.push(args)});
  await assert.rejects(session.switch('maintenance'),/Connection failed/);
  assert.equal(state.role,'admin');assert.equal(state.picId,'original');assert.equal(state.data,previous);assert.deepEqual(saved,[]);assert.equal(session.switching,false);
});

test('A duplicate switch is ignored while the requested role is loading, and real-account mode cannot switch',async()=>{
  const pending=deferred(),state={role:'admin',previewId:'',data:roleState('admin')};let calls=0;
  const session=createRoleSession({state,fetchState:async()=>{calls++;return pending.promise;}});
  const first=session.switch('estimator');assert.equal(await session.switch('warehouse'),false);assert.equal(await session.read(),false);assert.equal(calls,1);assert.equal(state.role,'admin');
  pending.resolve(roleState('estimator'));assert.equal(await first,true);assert.equal(state.role,'estimator');
  const real=createRoleSession({state:{role:'admin',data:{demoRoles:[],actor:{roles:['admin']}}},fetchState:()=>{throw Error('Must not fetch');}});
  await assert.rejects(real.switch('director'),/unavailable/);
});

test('Every public role commits its own authorized state and named PIC without changing operational records',async()=>{
  let stored={version:1,rows:initialRecords(true),files:{},audit:[]};
  const store={read:async()=>structuredClone(stored),update:async update=>{const draft=structuredClone(stored),result=update(draft);stored=draft;return result;}};
  const api=createDemoTransport(store,'https://qa.example.test'),state={role:'admin',picId:'',previewId:'',data:null},session=createRoleSession({state,fetchState:async role=>(await api('/api/state',{headers:{'X-Teams-Demo-Role':role}})).json(),people:role=>state.data?.rolePlanning?.people.filter(person=>person.roles.includes(role))||[]});
  await session.read();const before=structuredClone(stored.rows),names=new Map(state.data.rolePlanning.people.map(person=>[person.id,person.name]));
  for(const role of state.data.demoRoles){assert.ok(roleHome[role],role);const person=state.data.rolePlanning.people.find(person=>person.roles.includes(role));assert.equal(await session.switch(role,person?.id),true,role);assert.equal(state.role,role);assert.deepEqual(state.data.actor.roles,[role]);if(person){assert.equal(state.picId,person.id);assert.equal(names.get(state.picId),person.name);}if(role==='warehouse')assert.ok(!state.data.records.some(record=>record.kind==='invoice'));}
  assert.deepEqual(stored.rows,before);
});

test('A response for another role never commits a partial identity change',async()=>{
  const state={role:'admin',picId:'old',data:roleState('admin')},session=createRoleSession({state,fetchState:async()=>roleState('admin')});
  await assert.rejects(session.switch('finance'),/was not applied/);assert.equal(state.role,'admin');assert.equal(state.picId,'old');assert.deepEqual(state.data.actor.roles,['admin']);
});
