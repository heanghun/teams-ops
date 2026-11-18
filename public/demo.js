import { hasFinanceAccess, financeAuditAllowed, invoiceAccountingExport } from '../server/finance.js';
import { mailboxAccess } from '../server/mail-model.js';
import { dateOffset, initialRecords } from '../server/seed.js';
import { DomainError, allowed, applyOperation, limitedRoles, agreementDefaults } from '../server/domain.js';
import { attachmentTypes, demoRoles, downloadHeaders, exportResponse, json, requestKey, statePayload, visible } from '../server/presentation.js';
import { rolePlanning, applyPlanning, sourceRepresentatives } from './role-planning.js';
import { simulationBoq, tenderEstimate } from '../server/tender-estimating.js';

const emptyDemo = () => ({
  rows: initialRecords(true),
  files: {},
  audit: [],
  version: 1,
});
const requireDemo = (condition,message,status=403) => {
  if(!condition)throw new DomainError(message,status);
};

const sampleProfiles = {
  installation_lead:'Installation Lead',
  installation_technician:'Installation Technician',
  maintenance_lead:'Maintenance Team Leader',
  logistics:'Logistics Coordinator',
  project:'Project Manager',
  procurement:'Purchasing Coordinator',
  warehouse:'Stock Controller',
  maintenance:'Maintenance Supervisor',
  technician:'Maintenance Technician',
};
const samplePersonId = role => 'demo-person:'+role;

function addRoleScenarios(state) {
  if(state.roleScenariosVersion===1)return state;
  const index=new Map(state.rows.map(row=>[row.id,row]));
  const append=row=>{if(!index.has(row.id)){state.rows.push(row);index.set(row.id,row);}};
  for(const [role,position] of Object.entries(sampleProfiles))
    append({id:samplePersonId(role),kind:'demo-person',name:'Demo '+position,position});
  const project=index.get('p0');
  if(project?.kind==='project'){
    project.staffEmployeeIds??=[samplePersonId('installation_lead'),samplePersonId('installation_technician')];
    append({id:'demo-role-task',kind:'task',projectId:project.id,parentId:project.id,name:'Check installation materials before site work',
      status:'Open',date:project.date,due:project.end||project.date,ownerEmployeeId:samplePersonId('installation_technician'),ownerName:'Demo Installation Technician'});
  }
  const job=index.get('job0');
  if(job?.kind==='job')job.leadEmployeeId??=samplePersonId('maintenance_lead');
  const order=index.get('po0');
  if(order?.kind==='po'&&!order.deliveryEmployeeId){
    order.deliveryEmployeeId=samplePersonId('logistics');
    order.deliveryName='Demo Logistics Coordinator';
  }
  state.roleScenariosVersion=1;
  return state;
}

function addServiceScenarios(state) {
  if(state.serviceScenariosVersion===1)return state;
  const index=new Map(state.rows.map(row=>[row.id,row]));
  const add=(kind,id,values)=>{
    if(index.has(id))return;
    const row={kind,id,date:dateOffset(),...values};
    state.rows.push(row);
    index.set(id,row);
  };
  const services=[
    {key:'solar',code:'SOL-DEMO-01',name:'Tonle Logistics Rooftop Solar',clientId:'c4',service:'Solar Power Systems',status:'Active',value:42800,budget:34000,progress:60,remaining:24000,
      line:'Rooftop PV supply, installation and commissioning',quantity:1,material:24600,laborHours:360,other:60},
    {key:'consult',code:'CON-DEMO-01',name:'Sovann Clinic MEP Condition Assessment',clientId:'c2',service:'Consultancy & Project Management',status:'Completed',value:7800,budget:5700,progress:100,remaining:0,
      line:'Site assessment, technical recommendations and client report',quantity:1,material:0,laborHours:180,other:680},
    {key:'generator',code:'GEN-DEMO-01',name:'Bassac Hotel Standby Generator Supply',clientId:'c3',service:'Generator Trading',status:'Awarded',value:22900,budget:18300,progress:0,remaining:3500,
      line:'100 kVA standby generator with transfer switch',quantity:1,material:14800,laborHours:24,other:2224},
  ];
  for(const service of services){
    if(!index.has(service.clientId))continue;
    const id='p-'+service.key+'-demo',quoteId='q-'+service.key+'-demo';
    add('project',id,{name:service.name,code:service.code,clientId:service.clientId,parentId:service.clientId,service:service.service,status:service.status,
      value:service.value,budget:service.budget,progress:service.progress,remaining:service.remaining,retention:0,terms:'30 days after acceptance',
      currency:'USD',manager:service.key==='consult'?'Design & QS':'Demo Project Manager',location:'Phnom Penh',start:dateOffset(-24),
      end:dateOffset(service.key==='consult'?-2:30),history:[{status:service.status,date:dateOffset(-2)}],quoteId});
    add('quote',quoteId,{code:'Q-'+service.code,name:service.name,clientId:service.clientId,parentId:service.clientId,projectId:id,currency:'USD',
      status:'Accepted',revision:1,validUntil:dateOffset(30),margin:100*(1-service.budget/service.value),indirect:450,risk:250,discount:0,tax:0,terms:'30 days after acceptance',warranty:'Per agreed scope',
      items:[{section:'Scope',description:service.line,unit:'lot',quantity:service.quantity,material:service.material,laborHours:service.laborHours,laborRate:24,other:service.other}]});
  }
  if(index.has('p-generator-demo')&&index.has('s4')){
    add('material','m-generator-demo',{code:'MAT-GEN-DEMO',barcode:'MAT-GEN-DEMO',name:'100 kVA standby generator',category:'Power equipment',unit:'ea',minimum:0,
      currency:'USD',price:14800,priceDate:dateOffset(-7),supplierId:'s4',priceHistory:[{price:14800,currency:'USD',date:dateOffset(-7)}]});
    add('request','pr-generator-demo',{code:'PR-GEN-DEMO',name:'Standby generator purchase',projectId:'p-generator-demo',materialId:'m-generator-demo',
      parentId:'m-generator-demo',quantity:1,approvedQty:1,price:14800,currency:'USD',status:'Ordered',needed:dateOffset(9)});
    add('po','po-generator-demo',{code:'PO-GEN-DEMO',name:'Standby generator delivery',projectId:'p-generator-demo',parentId:'pr-generator-demo',requestId:'pr-generator-demo',
      materialId:'m-generator-demo',supplierId:'s4',quantity:1,received:0,price:14800,currency:'USD',due:dateOffset(9),location:'Bassac Hotel loading dock',
      status:'Ordered',terms:'30 days',deliveryEmployeeId:samplePersonId('logistics'),deliveryName:'Demo Logistics Coordinator'});
  }
  const job=index.get('job0');
  if(job?.kind==='job')job.technicianEmployeeId??=samplePersonId('technician');
  state.serviceScenariosVersion=1;
  return state;
}

function addDemoScenarios(state){
  addServiceScenarios(addRoleScenarios(state));
  if(!state.aiTenderScenarioVersion){
    if(state.rows.some(row=>row.id==='c0')&&!state.rows.some(row=>row.id==='t-ai-approved-demo')){
      const boq=simulationBoq('MEP');
      const tender={id:'t-ai-approved-demo',kind:'tender',code:'T-AI-DEMO-01',name:'Office MEP Materials Package - AI Demo',
        clientId:'c0',parentId:'c0',currency:'USD',status:'Approved for Bid',date:dateOffset(),due:dateOffset(14),scope:'Sample office material package covering HVAC, electrical, ELV, plumbing and fire protection.',
        boq,estimateMargin:20,estimateIndirect:950,estimateRisk:400,quoteTax:0,paymentTerms:'30 days after certification',warranty:'12 months',
        exclusions:'Sample material package only. Confirm the final installation scope and drawings.',value:0,cost:0,upfront:0,duration:2,advance:10,retention:5,delay:1,
        guarantee:0,collateral:0,fee:0,terms:'Fictional tender approved for the quotation-generation demonstration.',
        history:[{status:'Approved for Bid',date:dateOffset(),reason:'Demonstration approval fixture'}]};
      const estimate=tenderEstimate([...state.rows,tender],{roles:['estimator']},tender.id,{simulation:true});
      tender.cost=estimate.totals.cost;tender.value=estimate.totals.total;tender.upfront=Math.round(tender.cost*.35*100)/100;
      state.rows.push(tender);
    }
    state.aiTenderScenarioVersion=1;
  }
  addMaintenanceExamples(state);
  addDemoMail(state);
  addAgreementExample(state);
  const people=rolePlanning(state).people;
  const index=new Map(state.rows.map(row=>[row.id,row]));
  for(const person of people){
    const role=sourceRepresentatives.find(example=>example.id===person.id)?.roles[0];
    const id=sampleProfiles[role]?samplePersonId(role):'demo-person:employee:'+person.id;
    const existing=index.get(id);
    const row={...existing,id,kind:'demo-person',name:person.name,position:person.position};
    if(existing)state.rows[state.rows.indexOf(existing)]=row;
    else state.rows.push(row);
    index.set(id,row);
  }
  return state;
}

export function openDemoStore() {
  const database = new Promise((resolve,reject)=>{
    const opening=indexedDB.open('teams-operations-public-v1',1);
    opening.onupgradeneeded=()=>opening.result.createObjectStore('workspace');
    opening.onsuccess=()=>resolve(opening.result);
    opening.onerror=()=>reject(opening.error);
    opening.onblocked=()=>reject(Error('Close other TEAMS tabs and reload to open the demonstration workspace.'));
  });
  async function access(update) {
    const db=await database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('workspace',update?'readwrite':'readonly'),store=tx.objectStore('workspace');
      const get=store.get('current');
      let result,error;
      get.onsuccess=()=>{
        const state=get.result??emptyDemo();
        try{
          result=update?update(state):state;
          if(update)store.put(state,'current');
        }catch(cause){error=cause;tx.abort();}
      };
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(error??tx.error??Error('Unable to save this browser workspace.'));
      tx.onerror=()=>reject(tx.error??Error('Unable to access this browser workspace.'));
    });
  }
  return {read:()=>access(),update:fn=>access(fn)};
}

export function createDemoTransport(store=openDemoStore(),origin=location.origin) {
  function mutate(state,actor,action,data,key,attachment) {
    addDemoScenarios(state);
    const duplicate=state.audit.find(event=>event.request_id===key);
    if(duplicate){
      requireDemo(duplicate.actor===actor.id&&duplicate.action===action,'This request identifier was already used.',409);
      return {id:duplicate.target,replayed:true};
    }
    const reset=action==='demo.reset';
    let target;
    if(reset){
      requireDemo(allowed(actor,'settings.update')&&data.confirm==='RESET','Demo reset requires administrator access and confirmation.');
      state.rows=initialRecords(true);
      state.files={};
      delete state.roleScenariosVersion;
      delete state.serviceScenariosVersion;
      delete state.aiTenderScenarioVersion;
      delete state.maintenanceExamplesVersion;
      delete state.agreementExampleVersion;
      delete state.mailExampleVersion;
      addDemoScenarios(state);
    }else{
      const result=applyOperation(state.rows,actor,action,data,true);
      target=result.target;
      const records=new Map(state.rows.map(record=>[record.id,record]));
      result.changes.forEach(record=>records.set(record.id,record));
      state.rows=[...records.values()];
      if(attachment)state.files[data.key]=attachment;
    }
    state.version++;
    state.audit.push({request_id:key,actor:actor.id,action,target:target?.id??null,created_at:new Date().toISOString(),version:state.version});
    return {id:target?.id??null};
  }

  return async (path,options={})=>{
    const url=new URL(path,origin),method=options.method??'GET';
    const role=new Headers(options.headers).get('X-Teams-Demo-Role')??'admin';
    try {
      requireDemo(url.origin===origin&&demoRoles.includes(role),'Unknown demonstration request.',400);
      const actor={id:'demo:browser:'+role,roles:[role],demo:true,demoAssignments:true};
      if(limitedRoles.includes(role)||role==='technician'){
        actor.previewEmployeeId=samplePersonId(role);
        actor.approvals=[];
      }
      if(url.pathname==='/api/demo-planning'&&method==='POST'){
        const body=JSON.parse(options.body),key=requestKey(body.key);
        if(body.operation==='employee.save')requireDemo(['admin','adminSupport'].includes(role),'Employee and job-function editing requires HR or administrator access.');
        return json(await store.update(state=>{
          addDemoScenarios(state);
          const plan=rolePlanning(state),action='planning.'+body.operation;
          const replay=plan.audit.find(event=>event.key===key);
          if(replay){
            requireDemo(replay.actor===actor.id&&replay.action===action,'This request identifier was already used.',409);
            return {id:replay.target,replayed:true};
          }
          const reason=String(body.reason??'').trim();
          requireDemo(reason.length>0&&reason.length<=4000,'Record a reason for this planning change.',422);
          const result=applyPlanning(plan,body.operation,body.data??{});
          const event={key,action,actor:actor.id,target:result.id,created_at:new Date().toISOString(),reason,before:result.before,after:result.after};
          plan.audit.push(event);
          state.version++;
          state.audit.push({request_id:key,action,actor:actor.id,target:result.id,created_at:event.created_at,version:state.version});
          return {id:result.id,count:result.count};
        }));
      }
      if(url.pathname==='/api/action'&&method==='POST'){
        const body=JSON.parse(options.body);
        requireDemo(!['document.attach','dispatch.create','mail.send'].includes(body.action),'Use the file attachment form.',400);
        return json(await store.update(state=>mutate(state,actor,body.action,body.data??{},requestKey(body.key))));
      }
      if(url.pathname==='/api/send-email')return json({error:'Use the Email workspace. Scans are no longer required.'},400);
      if(url.pathname==='/api/mail/send'&&method==='POST'){
        const body=JSON.parse(options.body);return json(await store.update(state=>mutate(state,actor,'mail.send',{id:body.id,sendKey:body.key},requestKey(body.key))));
      }
      if(url.pathname==='/api/mail/demo-receive'&&method==='POST'){
        const body=JSON.parse(options.body);requireDemo(allowed(actor,'mail.save')&&mailboxAccess(actor).includes(body.mailbox),'Choose an authorized mailbox.');
        return json(await store.update(state=>{
          addDemoScenarios(state);const previous=state.audit.find(x=>x.request_id===body.key);if(previous)return {id:previous.target,replayed:true};
          const id=crypto.randomUUID(),now=new Date().toISOString(),row={id,kind:'mail',name:'Demo client - follow-up request',subject:'Demo client - follow-up request',body:'This is a simulated incoming client email. Please confirm the next site visit and attach the relevant project documents in your reply. No real email was received.',mailbox:body.mailbox,from:'Demo Client <client@example.test>',to:['demo@example.test'],cc:[],status:'Received',direction:'incoming',folder:'inbox',read:false,createdAt:now,date:dateOffset(),attachments:[]};
          state.rows.push(row);state.version++;state.audit.push({request_id:requestKey(body.key),actor:actor.id,action:'mail.demo-receive',target:id,created_at:now,version:state.version});return {id};
        }));
      }
      if(url.pathname==='/api/upload'&&method==='POST'){
        const form=options.body,file=form.get('file'),parentId=String(form.get('parentId')??'');
        requireDemo(allowed(actor,'document.attach'),'Your role cannot attach documents.');
        requireDemo(file instanceof Blob&&file.size>0&&file.size<=10000000,'Choose a file up to 10 MB.',400);
        const type=file.type||'application/octet-stream';
        requireDemo(attachmentTypes.has(type),'Choose a PDF, image, Office document or text file.',415);
        const purpose=String(form.get('purpose')||'');

        const data={name:file.name,parentId,key:crypto.randomUUID(),size:file.size,type,purpose};
        return json(await store.update(state=>{
          addDemoScenarios(state);
          requireDemo(visible(state.rows.find(record=>record.id===parentId),actor,state.rows),'Select an accessible record.');
          const total=Object.values(state.files).reduce((sum,blob)=>sum+blob.size,0);
          requireDemo(total+file.size<=30000000,'This browser demo can store up to 30 MB of attachments.',413);
          return mutate(state,actor,'document.attach',data,requestKey(form.get('key')),file);
        }));
      }
      requireDemo(method==='GET','Method not allowed.',405);
      const state=addDemoScenarios(await store.read());
      if(url.pathname==='/api/tender-estimate')return json(tenderEstimate(state.rows,actor,url.searchParams.get('id'),{simulation:true}));
      if(url.pathname==='/api/state')return json({...statePayload(state,actor,true),publicDemo:true,emailConnection:{mode:'simulation',receiving:'simulation',addresses:{},sender:null},rolePlanning:rolePlanning(state)});
      if(url.pathname==='/api/demo-planning-export')return new Response(JSON.stringify(rolePlanning(state),null,2),
        {headers:downloadHeaders('TEAMS_Roles_PICs_and_Function_Requests.json','application/json')});
      if(url.pathname.startsWith('/api/mail/file/')){
        const parts=url.pathname.split('/'),message=state.rows.find(x=>x.id===decodeURIComponent(parts[4])&&x.kind==='mail'),index=Number(parts[5]);
        requireDemo(visible(message,actor,state.rows)&&Number.isInteger(index)&&index>=0,'Attachment not found.',404);let file=message.attachments?.[index];requireDemo(file,'Attachment not found.',404);
        for(let depth=0;file.type==='message';depth++){requireDemo(depth<10,'Attachment forwarding chain is too deep.',422);const source=state.rows.find(x=>x.id===file.id&&x.kind==='mail');requireDemo(visible(source,actor,state.rows),'Attachment not found.',404);file=source.attachments?.[file.index];requireDemo(file,'Attachment not found.',404);}
        if(file.type==='export')return exportResponse(state,actor,true,new URL('/api/export?'+new URLSearchParams({kind:file.kind,id:file.id,format:file.format}),origin));
        const record=state.rows.find(x=>x.id===file.id);requireDemo(visible(record,actor,state.rows)&&state.files[record.key],'Attachment not found.',404);return new Response(state.files[record.key],{headers:downloadHeaders(record.name,'application/octet-stream')});
      }
      if(url.pathname==='/api/export')return exportResponse(state,actor,true,url);
      if(url.pathname==='/api/audit'){
        requireDemo(['admin','auditor','director','finance'].includes(role),'Audit history requires authorized access.');
        return json(state.audit.filter(event=>financeAuditAllowed(event,actor,state.rows)).slice(-100).reverse());
      }
      if(url.pathname==='/api/invoice-accounting-export'){
        requireDemo(hasFinanceAccess(actor),'Financial export is restricted.');
        return new Response(JSON.stringify(invoiceAccountingExport(state.rows),null,2),{headers:downloadHeaders('teams-invoices-accounting.json','application/json')});
      }
      if(url.pathname==='/api/backup'){
        requireDemo(hasFinanceAccess(actor),'Full snapshots contain financial data and are restricted to MD and Finance Manager.');
        const records=state.rows.map(record=>{const {key,...rest}=record;return rest;});
        return new Response(JSON.stringify({format:1,mode:'fictional',version:state.version,records,audit:state.audit}),
          {headers:downloadHeaders('teams-operations-demo.json','application/json')});
      }
      if(url.pathname.startsWith('/api/file/')){
        const id=url.pathname.split('/').at(-1),record=state.rows.find(row=>row.kind==='document'&&row.id===id);
        requireDemo(visible(record,actor,state.rows)&&state.files[record.key],'File not found.',404);
        return new Response(state.files[record.key],{headers:downloadHeaders(record.name,'application/octet-stream')});
      }
      return json({error:'This endpoint does not exist.'},404);
    }catch(error){
      if(error instanceof DomainError)return json({error:error.message},error.status);
      if(error?.name==='QuotaExceededError')return json({error:'This browser has reached its local storage limit.'},413);
      return json({error:error?.message||'The browser workspace could not complete this operation.'},500);
    }
  };
}

function addMaintenanceExamples(state){
  if(state.maintenanceExamplesVersion)return;
  const examples=[
    {id:'mc-om-demo',name:'Demo Facility - Onsite MEP Operations',serviceType:'om',residentTechnicians:2,frequency:1,coverage:'Demo: two daytime technicians, Monday to Friday; no 24-hour coverage.',staffingPlan:'Demo roster: two onsite technicians. Supervisor arranges leave relief. Overtime requires a separate written instruction.'},
    {id:'mc-scheduled-demo',name:'Demo Office - Scheduled Maintenance with Resident Support',serviceType:'scheduled',residentTechnicians:1,frequency:90,coverage:'Demo: one resident technician during agreed business hours; planned quarterly specialist visits.',staffingPlan:'Demo resident support: one technician. Holiday cover and overtime require agreement. This is scheduled maintenance, not full facility operations.'},
    {id:'mc-troubleshoot-demo',name:'Demo Clinic - One-time Fault Diagnosis',serviceType:'troubleshooting',residentTechnicians:0,frequency:null,coverage:'Single agreed attendance only.',staffingPlan:'Call-out team only. No resident staffing or recurring service.'},
  ];
  for(const example of examples){if(state.rows.some(x=>x.id===example.id))continue;
    state.rows.push({kind:'contract',date:dateOffset(),code:'MC-DEMO-'+example.serviceType.toUpperCase(),clientId:'c0',parentId:'c0',currency:'USD',value:0,billing:'Demonstration only - fees not agreed',site:'Fictional demonstration site, Phnom Penh',equipment:'Demo HVAC, distribution panels and pumps; final asset register requires agreement.',supervisor:'Demo Maintenance Supervisor',technician:'Demo Maintenance Technician',supervisorEmployeeId:samplePersonId('maintenance'),technicianEmployeeId:samplePersonId('technician'),technicianEmail:'',start:dateOffset(),end:dateOffset(365),status:'Active',sla:'Demonstration only. Agree response and attendance targets by severity; restoration depends on diagnosis, safe access and approved parts.',safety:'Client-approved isolation and permit to work before intervention.',...example});
  }
  state.maintenanceExamplesVersion=1;
}

function addAgreementExample(state){
  if(state.agreementExampleVersion)return;
  const c=state.rows.find(x=>x.id==='mc-scheduled-demo');
  if(c&&!state.rows.some(x=>x.id==='sa-scheduled-demo'))state.rows.push({id:'sa-scheduled-demo',kind:'agreement',code:'SA-MC-DEMO-SCHEDULED',name:'Demo scheduled maintenance - agreement drafting example',parentId:c.id,contractId:c.id,clientId:c.clientId,contractSnapshot:structuredClone(c),revision:1,status:'Draft',date:dateOffset(),createdBy:'demo:template',
    ...agreementDefaults(c),
    contractorParty:'Fictional TEAMS contracting party - demonstration only; registered details must be verified for real use.',clientParty:'Fictional office client - demonstration only.',contractorSignatory:'Demo TEAMS authorized signatory (not an employee appointment)',clientSignatory:'Demo client authorized signatory',authorityReference:'Fictional delegation for demonstration only; no real authority is conferred.',
    scope:'Demo asset schedule: two office air-conditioning units and one water pump at a fictional site. Quarterly preventive checks and business-hours resident support only. Daily facility operating control remains with the client.',
    staffing:'Demo: one resident technician Monday to Friday, 08:00-17:00, excluding public holidays. The supervisor arranges like-for-like leave cover. Additional staff and overtime require a written priced variation.',
    sla:'Fictional service targets: acknowledge critical incidents within 30 minutes during coverage; agree the safe attendance time with the client contact. Record call receipt and access delays. No repair completion guarantee: restoration depends on diagnosis, safe isolation, parts availability and written approval. Out-of-hours attendance is separately agreed.',
    payment:'Demonstration exercise only: no commercial fee has been agreed in this example. Complete the contract price, VAT treatment, invoice evidence, due date and dispute process before real use. No billing or legal commitment is created by this sample.',
    warranty:'Demo: report a suspected workmanship defect within 30 days of service. Inspect and correct defects attributable to the performed work. Existing defects, misuse, third-party work and manufacturer parts warranties are handled separately. Confirm these terms for a real agreement.',
    liability:'Demonstration drafting example: each party remains responsible for loss caused by its breach or negligence, subject to applicable law. Agree any monetary liability cap, excluded losses, exceptions and required insurance limits before real use. No actual cap or insurance coverage is represented here.',
    termination:'Demo process: written notice identifies the default and gives 15 days to remedy it where remediable. Either party may request termination by 30 days written notice. Agree payment for completed services, approved commitments, safe demobilization, asset records and key handover. These example notice periods require agreement before real use.',
    dispute:'Demo working language: English. Cambodian law is the intended drafting basis; final jurisdiction, dispute procedure and authorized notice addresses must be agreed by the parties. Escalate an unresolved operational issue to the designated representatives before formal dispute action.',
    revisionReason:'Fictional example derived from document structure only; not a live contract.',reviewConfirmed:false});
  state.agreementExampleVersion=1;
}

function addDemoMail(state){
  if(state.mailExampleVersion)return;
  const examples=[
    {id:'mail-install-demo',mailbox:'installation',subject:'Office MEP package - revised scope for your quotation',relatedId:'t-ai-approved-demo',clientId:'c0',body:'Dear TEAMS,\n\nPlease review the office MEP package and include the material quantities from the approved scope. Send the client quotation as PDF and Excel when it is approved.\n\nRegards,\nDemo Client'},
    {id:'mail-maint-demo',mailbox:'maintenance',subject:'Quarterly maintenance - site access and resident support',relatedId:'mc-scheduled-demo',clientId:'c0',body:'Dear Maintenance Team,\n\nPlease confirm the quarterly preventive maintenance visit. We also need one resident technician during the agreed business hours. Please send the service scope and agreement for review.\n\nRegards,\nDemo Facilities Contact'},
    {id:'mail-general-demo',mailbox:'general',subject:'Client contact details and project correspondence',relatedId:'c0',clientId:'c0',body:'Dear TEAMS,\n\nPlease keep project correspondence linked to our client profile so the relevant teams can follow the discussion.\n\nRegards,\nDemo Client'}
  ];
  for(const [i,item] of examples.entries()){
    if(state.rows.some(x=>x.id===item.id))continue;
    const now=new Date(Date.parse(dateOffset()+'T03:00:00Z')-i*3600000).toISOString(),docId=item.id+'-attachment',key='demo-email-file-'+i,blob=new Blob(['Demonstration site notes\nConfirm the asset scope, access arrangements and approved quotation revision.'],{type:'text/plain'});
    state.files[key]=blob;state.rows.push({id:docId,kind:'document',parentId:item.id,parentKind:'mail',name:'Demo-site-notes.txt',key,size:blob.size,type:'text/plain',date:dateOffset()});
    state.rows.push({kind:'mail',name:item.subject,date:dateOffset(),createdAt:now,status:'Received',direction:'incoming',folder:'inbox',read:false,from:'Demo Client <client@example.test>',to:['demo@example.test'],cc:[],attachments:[{type:'file',id:docId,name:'Demo-site-notes.txt',size:blob.size,mime:'text/plain'}],...item,parentId:item.relatedId});
  }
  state.mailExampleVersion=1;
}
