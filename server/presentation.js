import { createInvoicePdf } from './invoice-document.js';
import { hasFinanceAccess, financialRecord } from './finance.js';
import { mailboxAccess } from './mail-model.js';
import { createLetterheadPdf } from './letterhead.js';
import { DomainError, roles, hasNamedAssignments, approvalLabels, eligibleApprovals, actionAccess, allowed, hasFullModule, projectAssigned, jobAssigned, viewAccess, reportData, bidAssessment, quotationTotals, availableStock, projectPosition, invoiceBalance } from './domain.js';
import { createPdf, createXlsx, createClientXlsx, documentContent } from './documents.js';

export const protection = {
  'Cache-Control':'private, no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'same-origin',
};
export const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{...protection,'Content-Type':'application/json; charset=utf-8'}});
const typeMap={client:'clients',project:'clients',tender:'tenders',quote:'quotes',quoteVersion:'quotes',supplier:'procurement',offer:'procurement',requisition:'procurement',
  material:'inventory',warehouse:'inventory',movement:'inventory',reservation:'inventory',count:'inventory',
  requirement:'projects',request:'procurement',po:'procurement',cost:'projects',progress:'projects',variation:'projects',milestone:'billing',claim:'billing',invoice:'billing',payment:'billing',cash:'billing',
  contract:'maintenance',agreement:'maintenance',dispatch:'documents',job:'maintenance',document:'documents',employee:'settings',importLog:'settings',task:'projects'};
const canView=(actor,module)=>viewAccess(actor).some(v=>v==='*'||v===module);
const isFinancial=hasFinanceAccess;
export const demoRoles=['admin',...roles.filter(x=>x!=='admin')];
export const attachmentTypes = new Set(['application/pdf','text/plain','text/csv','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/zip','application/x-zip-compressed','application/vnd.ms-excel','application/msword','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/vnd.dwg','application/acad','application/x-dwg','application/dwg','image/vnd.dxf','application/dxf','application/x-dxf','image/gif','application/rtf','application/octet-stream']);

function ownedJob(row, actor) {
  return row.kind!=='job'||actor.demo||!actor.roles.includes('technician')||actor.roles.some(x=>x==='admin'||x==='maintenance'||x==='auditor')||row.technicianEmail===actor.email;
}
export function visible(row,actor,rows){
  if(!row)return false;
  if(actor.platformAdmin)return row.kind==='employee';
  if(row.kind==='platformSettings')return false;
  if(!hasFinanceAccess(actor)&&financialRecord(row,rows))return false;
  if(row.kind==='mail')return mailboxAccess(actor).includes(row.mailbox);
  if(row.kind==='personnel')return actor.personnelAdmin===true;
  if(row.kind==='task'&&!hasNamedAssignments(actor))return false;
  if(actor.previewEmployeeId){
    const employeeId=actor.previewEmployeeId;
    const fieldTeam=actor.roles.some(role=>['installation_lead','installation_technician'].includes(role));
    if(['project','task','progress','requirement','cost','variation'].includes(row.kind)&&!hasFullModule(actor,'projects')){
      if(!fieldTeam||['cost','variation'].includes(row.kind))return false;
      if(row.kind==='task'&&!actor.roles.includes('installation_lead'))return row.ownerEmployeeId===employeeId;
      return projectAssigned(rows,row.kind==='project'?row.id:row.projectId,employeeId);
    }
    if(['po','request','requisition','offer','supplier'].includes(row.kind)&&!hasFullModule(actor,'procurement')){
      if(row.kind==='po'&&actor.roles.includes('logistics')&&row.deliveryEmployeeId===employeeId)return true;
      if(fieldTeam&&['po','request','requisition'].includes(row.kind))return projectAssigned(rows,row.projectId,employeeId);
      return false;
    }
    if(row.kind==='job'&&!hasFullModule(actor,'maintenance')&&(actor.roles.includes('technician')||actor.roles.includes('maintenance_lead')))return jobAssigned(rows,row,employeeId);
    if(row.kind==='contract'&&!hasFullModule(actor,'maintenance')&&(actor.roles.includes('technician')||actor.roles.includes('maintenance_lead')))
      return row.supervisorEmployeeId===employeeId||row.technicianEmployeeId===employeeId||
        rows.some(job=>job.kind==='job'&&job.contractId===row.id&&jobAssigned(rows,job,employeeId));
    if(['movement','count','reservation','warehouse'].includes(row.kind)&&!hasFullModule(actor,'inventory'))return false;
  }
  if(row.kind==='settings')return true;
  if(row.kind==='project'&&(canView(actor,'projects')||canView(actor,'clients')||canView(actor,'procurement')||canView(actor,'inventory')||canView(actor,'billing')))return true;
  if(row.kind==='material'&&(canView(actor,'procurement')||canView(actor,'quotes')||canView(actor,'maintenance')))return true;
  if(row.kind==='job'&&actor.roles.includes('warehouse')&&!canView(actor,'maintenance'))return row.status!=='Completed';
  if(row.kind==='agreement')return hasFullModule(actor,'maintenance')&&canView(actor,'maintenance');
  if(row.kind==='dispatch')return canView(actor,'documents')&&visible(rows.find(x=>x.id===row.parentId),actor,rows);
  if(row.kind==='document')return canView(actor,'documents')&&visible(rows.find(x=>x.id===row.parentId),actor,rows);
  return canView(actor,typeMap[row.kind])&&ownedJob(row,actor);
}
function mask(row,actor,rows){
  const data={...row};
  if(!hasFinanceAccess(actor)){
    if(row.kind==='settings')for(const key of ['cashOpening','cashInputs','invoiceProfile'])delete data[key];
    if(row.kind==='progress')delete data.remaining;
    if(row.kind==='variation')for(const key of ['value','cost'])delete data[key];
    if(row.kind==='employee'&&row.roles?.some(r=>['director','finance'].includes(r)))return {id:row.id,kind:row.kind,name:row.name,roles:row.roles,active:row.active};
  }
  if(row.kind==='mail'){delete data.frozenFiles;delete data.providerPayload;if(row.direction==='incoming')delete data.bcc;}
  if(actor.previewEmployeeId){
    if(row.kind==='contract'&&!hasFullModule(actor,'maintenance')){
      delete data.value;delete data.billing;delete data.technicianEmail;
      return data;
    }
    if(row.kind==='job'&&!hasFullModule(actor,'maintenance'))delete data.technicianEmail;
    if(['po','request'].includes(row.kind)&&!hasFullModule(actor,'procurement')){
      for(const field of ['price','currency','terms','approver','buyerEmployeeId','buyerName','offerId','supplierId'])delete data[field];
    }
    if(row.kind==='material'&&!hasFullModule(actor,'inventory')){
      for(const field of ['price','priceDate','priceHistory','currency','cost'])delete data[field];
    }
    if(row.kind==='progress'&&!hasFullModule(actor,'projects'))delete data.remaining;
  }
  if(row.kind==='document')delete data.key;
  if(row.kind==='job'&&!canView(actor,'maintenance')) {
    return Object.fromEntries(['id','kind','name','code','date','status','technician','scheduled','checklist','completed','minutes'].map(key=>[key,row[key]]));
  }
  if(row.kind==='settings'&&!canView(actor,'settings')&&!hasFinanceAccess(actor)) {
    delete data.cashOpening; delete data.cashInputs; delete data.email;
  }
  if(row.kind==='project'){
    if(isFinancial(actor)&&canView(actor,'projects'))data.position=projectPosition(rows,row);
    else for(const field of ['value','budget','remaining','terms','retention'])delete data[field];
  }
  if(row.kind==='material') {
    const {onHand,reserved,free,value}=availableStock(rows,row.id);
    const moves=rows.filter(x=>x.kind==='movement'&&x.materialId===row.id);
    data.stock={onHand,reserved,free,...(hasFinanceAccess(actor)?{value}:{})};
    data.lastMovement=moves.map(x=>x.date).sort().at(-1)||null;
    data.bins=rows.filter(x=>x.kind==='warehouse').map(w=>({id:w.id,name:w.name,...(({onHand,reserved,free})=>({onHand,reserved,free}))(availableStock(rows,row.id,w.id))}));
  }
  const sensitiveStock=actor.roles.every(x=>['warehouse','technician','maintenance','adminSupport'].includes(x));
  if(sensitiveStock && ['material','movement','po','request'].includes(row.kind)){
    for(const field of ['price','priceDate','priceHistory','cost','currency','approver'])delete data[field];
  }
  if(row.kind==='po' && !canView(actor,'billing')&&!canView(actor,'quotes')&&!actor.roles.some(x=>['procurement','admin','project'].includes(x)))delete data.price;
  if(row.kind==='quote')data.totals=quotationTotals(row);
  if(row.kind==='tender')data.assessment=bidAssessment(row,rows.find(x=>x.kind==='settings'));
  if(row.kind==='invoice')data.balance=invoiceBalance(rows,row);
  if(row.kind==='request'){
    const stock=availableStock(rows,row.materialId,undefined,row.projectId);
    const openOrders=rows.filter(x=>x.kind==='po'&&x.projectId===row.projectId&&x.materialId===row.materialId&&x.requestId!==row.id&&!['Cancelled','Received','Closed'].includes(x.status)).reduce((s,x)=>s+x.quantity-x.received,0);
    data.shortage=Math.max(0,Math.round((row.quantity-stock.free-openOrders)*1000)/1000);
  }
  if(row.kind==='contract'&&hasFinanceAccess(actor)){
    const jobs=rows.filter(x=>x.kind==='job'&&x.contractId===row.id);
    data.materialCost=rows.filter(x=>x.kind==='movement'&&jobs.some(j=>j.id===x.jobId)).reduce((s,x)=>s+x.cost*x.quantity,0);
    if(actor.roles.length===1&&actor.roles[0]==='technician'){delete data.value;delete data.materialCost;}
  }
  return data;
}
export const requestKey=value=>{
  if(!/^[a-zA-Z0-9_-]{12,100}$/.test(value??''))throw new DomainError('A valid request identifier is required.',400);
  return value;
};
export const downloadHeaders=(name,type)=>({...protection,'Content-Type':type,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(name)});
export function statePayload(state,actor,demo){
    const records=state.rows.filter(r=>visible(r,actor,state.rows)).map(r=>mask(r,actor,state.rows));
    const reports=reportData(state.rows);
    const directory=state.rows.filter(row=>row.kind===(actor.demoAssignments?'demo-person':'personnel'));
    const assignmentActions=['project.assign','project.create','project.award','request.create','task.create','task.assign','po.create','delivery.assign','po.receive','stock.move','contract.create','job.assign'];
    const people=hasNamedAssignments(actor)&&(actor.personnelAdmin||assignmentActions.some(action=>allowed(actor,action)))?
      directory.map(({id,name,position})=>({id,name,position})):[];
    const restricted={today:reports.today,currency:reports.currency,alerts:reports.alerts.filter(a=>(hasFinanceAccess(actor)||!['Collections','Billing','Projects'].includes(a.category))&&canView(actor,a.view)&&visible(state.rows.find(x=>x.id===a.id),actor,state.rows)),activeProjects:canView(actor,'projects')?(actor.previewEmployeeId&&!hasFullModule(actor,'projects')?records.filter(x=>x.kind==='project'&&['Awarded','Active','On Hold'].includes(x.status)).length:reports.activeProjects):null,
      openTenders:canView(actor,'tenders')?reports.openTenders:null};
    return {version:state.version,actor,permissions:viewAccess(actor),actions:actionAccess(actor),
      demoRoles:demo&&!actor.privateWorkspace?demoRoles:[],privateWorkspace:!!actor.privateWorkspace,namedAssignments:hasNamedAssignments(actor),people,
      mailboxes:mailboxAccess(actor),roleCatalog:actor.personnelAdmin?roles.map(role=>({role,actions:actionAccess({roles:[role]}),modules:viewAccess({roles:[role]}),approvals:eligibleApprovals([role])})):undefined,
      approvalLabels:actor.personnelAdmin?approvalLabels:undefined,records,report:hasFinanceAccess(actor)&&canView(actor,'reports')?{...reports,alerts:restricted.alerts}:restricted};
}

export function exportResponse(state,actor,demo,url){
    const kind=url.searchParams.get('kind'),id=url.searchParams.get('id'),format=url.searchParams.get('format')||'pdf',internal=url.searchParams.get('internal')==='1';
    const module={invoice:'billing',agreement:'maintenance',report:'reports',quote:'quotes',po:'procurement',claim:'billing',job:'maintenance',inventory:'inventory'}[kind];
    if(!module||!canView(actor,module))throw new DomainError('You cannot export this document.',403);
    if(id&&!visible(state.rows.find(x=>x.id===id),actor,state.rows))throw new DomainError('Document not found.',404);
    if(internal&&actor.roles.every(x=>!['admin','manager','director','auditor','mep','estimator'].includes(x)))throw new DomainError('Internal cost export requires authorized access.',403);
    const record=state.rows.find(x=>x.id===id);
    if(kind==='quote'&&!internal&&!['Approved','Sent','Accepted','Rejected','Expired','Superseded'].includes(record?.status))throw new DomainError('Approve the quotation before exporting a client copy.',422);
    if(kind==='agreement'&&record?.status!=='Approved')throw new DomainError('Approve this agreement before printing the client copy.',422);
    if(kind==='po'&&(!hasFullModule(actor,'procurement')||actor.roles.every(x=>['warehouse','technician','maintenance'].includes(x))))throw new DomainError('Supplier prices require authorized access.',403);
    if(kind==='inventory'&&actor.previewEmployeeId&&!hasFullModule(actor,'inventory'))throw new DomainError('The stock ledger export is outside your assignment.',403);
    if(kind==='invoice'){
      if(!hasFinanceAccess(actor))throw new DomainError('Financial export is restricted.',403);
      if(!record?.nativeInvoice||record.status!=='Issued'||!record.snapshot)throw new DomainError('Issue the native invoice before exporting a final client copy. Legacy references retain their original attachments.',422);
      if(format!=='pdf')throw new DomainError('Use PDF for client invoices or the accounting JSON export for integration.',400);
      return new Response(createInvoicePdf(record),{headers:downloadHeaders(record.code+'.pdf','application/pdf')});
    }
    const doc=documentContent(state.rows,kind,id,demo,internal);
    if(!doc)throw new DomainError('This document is not available.',404);
    const name=(doc.title.toLowerCase().replaceAll(' ','-')+(record?.code?'-'+record.code:'')+(['quote','agreement'].includes(kind)?'-R'+record.revision:''));
    if(format==='xlsx'&&doc.sheet)return new Response(doc.letterhead&&kind==='quote'?createClientXlsx(doc):createXlsx(doc.sheet),{headers:downloadHeaders(name+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')});
    if(format!=='pdf'||kind==='inventory')throw new DomainError('Choose an available export format.',400);
    return new Response(doc.letterhead?createLetterheadPdf(doc):createPdf(doc.company,doc.title,doc.subtitle,doc.lines,doc.demo),{headers:downloadHeaders(name+'.pdf','application/pdf')});
}
