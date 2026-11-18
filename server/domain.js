import { hasFinanceAccess, financeAction, receivableInvoice, applyInvoiceOperation } from './finance.js';
import { applyMailbox } from './mail-model.js';
import { dateOffset, roundMoney } from './seed.js';

export class DomainError extends Error {
  constructor(message, status = 422) { super(message); this.status = status; }
}
const ensure = (condition, message, status) => { if (!condition) throw new DomainError(message, status); };
const field = (value, label, max = 220) => {
  const result = String(value ?? '').trim();
  ensure(result.length > 0 && result.length <= max, label + ' is required (up to ' + max + ' characters).');
  return result;
};
const note = (value, max = 4000) => String(value ?? '').trim().slice(0, max);
const numeric = (value, label, minimum = 0, maximum = 1e10) => {
  ensure(value !== '' && value != null && Number.isFinite(Number(value)) && Number(value) >= minimum && Number(value) <= maximum, label + ' must be between ' + minimum + ' and ' + maximum + '.');
  return Number(value);
};
const optionalNumber = (value, label, max) => value == null || value === '' ? 0 : numeric(value, label, 0, max);
const quantityOf = value => Math.round(numeric(value,'Quantity',0.001,1000000)*1000)/1000;
const roundQty = n => Math.round(n * 1000) / 1000;
const choose = (value, options, label) => { ensure(options.includes(value), 'Choose a valid ' + label + '.'); return value; };
const validDate = (value, label) => {
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value, 'Enter a valid ' + label + '.');
  return value;
};
const curr = value => choose(value, ['USD','KHR'], 'currency');
const sameCurrency = (a,b) => ensure(a === b, 'Currencies must match. Record an explicitly converted price before posting.');
const point = (v,label) => numeric(v,label,0,100);
const addDays = (date, days) => dateOffset(days,date);
const dayGap = (from,to) => Math.round((Date.parse(to)-Date.parse(from))/86400000);
const absolute = n => Math.abs(n);
const money = (v,label,currency) => roundMoney(numeric(v,label,0,1e10),currency);
const operations = {
  estimator: ['client.create','tender.create','tender.update','tender.quote','quote.create','quote.edit','quote.transition','quote.revise','document.attach','dispatch.create'],
  mep: ['tender.transition','quote.transition','variation.transition','document.attach','project.progress'],
  manager: ['client.create','project.create','tender.create','tender.update','tender.transition','tender.quote','quote.transition','project.award','project.assign','task.create','task.assign','task.update','request.transition','document.attach','variation.transition','agreement.transition','dispatch.create'],
  director: ['tender.transition','quote.transition','request.transition','variation.transition','agreement.transition'],
  project: ['project.progress','project.status','project.cost','project.award','project.assign','task.create','task.assign','task.update','delivery.ack','request.create','variation.create','milestone.create','claim.create','document.attach','stock.reserve'],
  procurement: ['supplier.create','material.create','material.price','request.create','request.transition','supplier.offer','po.create','po.cancel','delivery.assign','delivery.proof','document.attach'],
  warehouse: ['stock.move','stock.reserve','stock.count','po.receive','document.attach'],
  maintenance: ['client.create','client.update','contract.create','contract.edit','contract.schedule','agreement.create','agreement.edit','agreement.transition','dispatch.create','job.assign','job.update','request.create','document.attach'],
  technician: ['job.update','document.attach'],
  installation_lead: ['task.create','task.assign','task.update','request.create','delivery.ack'],
  installation_technician: ['task.update','request.create','delivery.ack'],
  maintenance_lead: ['job.assign','job.update'],
  logistics: ['delivery.proof'],
  finance: ['claim.create','claim.transition','invoice.create','invoice.pay','invoice.reverse','cash.update','document.attach'],
  adminSupport: ['client.create','document.attach'],
  auditor: [],
  hr_head: ['employee.upsert','employee.remove','employee.restore'],
  admin: ['*'],
};
for(const role of ['estimator','mep','manager','director','project','procurement','maintenance','finance','adminSupport'])operations[role].push('mail.save','mail.send','mail.update');
operations.finance.push('client.create','client.update','milestone.create','project.cost','invoice.draft','invoice.edit','invoice.issue','invoice.void','invoiceProfile.update');
operations.director.push('employee.upsert','personnel.roles');
operations.auditor.push('mail.update');operations.manager.push('client.update');
export const roles = Object.keys(operations);
export const limitedRoles = ['installation_lead','installation_technician','maintenance_lead','logistics'];
export const approvalLabels = {
  tender:'Tender authorization', quote:'Quotation and acceptance authorization', purchasing:'Purchase requisition approval',
  agreement:'Service agreement authorization', variation:'Variation decision', stock:'Stock adjustment approval', claim:'Claim certification',
};
export function approvalFor(action, status){
  if(action==='tender.transition'&&['Approved for Bid','Submitted','Awarded','Do Not Bid'].includes(status))return 'tender';
  if(action==='quote.transition'&&['Approved','Accepted'].includes(status))return 'quote';
  if(action==='request.transition'&&status==='Approved')return 'purchasing';
  if(action==='variation.transition')return 'variation';
  if(action==='agreement.transition'&&status==='Approved')return 'agreement';
  if(action==='stock.adjust')return 'stock';
  if(action==='claim.transition'&&status==='Certified')return 'claim';
  return null;
}
const platformActions = ['employee.upsert','employee.remove','employee.restore','master.import','platform.director.initialize','platform.email.update','platform.ai.update','platform.storage.default','platform.storage.user'];
const directorSettingsActions = ['settings.update','warehouse.create','master.import','stock.adjust','employee.remove','employee.restore'];
export const actionAccess = actor => actor.platformAdmin ? platformActions : [...new Set([
  ...actor.roles.flatMap(role=>operations[role]??[]),
  ...(actor.demo===false&&actor.roles.includes('director')?directorSettingsActions:[]),
  ...(actor.roles.some(role=>role!=='auditor'&&modules[role]?.includes('documents'))?['folder.create','document.store']:[]),
])];
export function eligibleApprovals(assigned){
  return Object.keys(approvalLabels).filter(key=>{
    const eligible={tender:['mep','manager','director'],quote:['mep','manager','director'],purchasing:['procurement','manager','director'],variation:['mep','manager','director'],agreement:['manager','director'],stock:['admin'],claim:['finance']};
    return assigned.some(role=>role==='admin'||eligible[key].includes(role));
  });
}
const has = (actor, ...wanted) => wanted.some(role => actor.roles.includes(role));
export function employeeRoleChoices(actor){
  if(actor.platformAdmin)return roles;
  if(has(actor,'director'))return roles.filter(role=>role!=='admin');
  if(has(actor,'hr_head'))return roles.filter(role=>!['admin','director','finance','hr_head'].includes(role));
  return [];
}
export function canManageEmployee(actor,employee){
  const choices=employeeRoleChoices(actor);
  return choices.length>0&&!employee?.bootstrapOwner&&(employee?.roles??[]).every(role=>choices.includes(role));
}
export const employeeMatchesEmail = (actor,email) => Boolean(email&&(actor.email===email||actor.formerSignInEmails?.includes(email)));
export const allowed = (actor, action) => {
  if(financeAction(action)&&!hasFinanceAccess(actor))return false;
  const actions=actionAccess(actor);
  return actions.includes('*')||actions.includes(action);
};
export const modules = {
  admin:['*'], director:['home','clients','tenders','quotes','procurement','projects','maintenance','billing','reports','documents'],
  manager:['home','clients','tenders','quotes','procurement','projects','maintenance','billing','reports','documents'],
  mep:['home','clients','tenders','quotes','inventory','projects','documents'],
  estimator:['home','clients','tenders','quotes','inventory','documents'],
  project:['home','clients','quotes','procurement','inventory','projects','billing','documents'],
  procurement:['home','clients','procurement','inventory','projects','documents'],
  warehouse:['home','procurement','inventory','projects','documents'],
  maintenance:['home','clients','maintenance','inventory','procurement','documents'],
  technician:['home','clients','maintenance','inventory','documents'],
  installation_lead:['home','projects','procurement','inventory'],
  installation_technician:['home','projects','procurement','inventory'],
  maintenance_lead:['home','maintenance'],
  logistics:['home','procurement'],
  finance:['home','clients','quotes','maintenance','projects','billing','reports','documents'],
  adminSupport:['home','clients','documents'], auditor:['home','clients','tenders','quotes','procurement','inventory','projects','maintenance','billing','reports','documents'],
  hr_head:['home'],
};
for(const role of ['estimator','mep','manager','director','project','procurement','maintenance','finance','adminSupport','auditor'])modules[role].push('mail');
export const viewAccess = actor => {
  if(actor.platformAdmin)return ['home','platform-users','platform-settings','platform-activity'];
  const access=[...new Set(actor.roles.flatMap(role => modules[role] ?? []))];
  if(actor.demo===false&&actor.roles.includes('director'))access.push('settings','inventory');
  if(actor.demo===false&&has(actor,'director','hr_head'))access.push('team-employees');
  if(hasFinanceAccess(actor))return access;
  return (access.includes('*')?[...new Set(['settings',...Object.values(modules).flat()])]:access).filter(module=>!['*','billing','reports'].includes(module));
};
export const hasNamedAssignments = actor => !!(actor.privateWorkspace||actor.demoAssignments);
export function hasFullModule(actor,module){
  if(actor.platformAdmin)return viewAccess(actor).includes(module);
  if(['billing','reports'].includes(module)&&!hasFinanceAccess(actor))return false;
  return actor.roles.some(role=>!limitedRoles.includes(role)&&!(role==='technician'&&module==='maintenance')&&
    (modules[role]?.includes('*')||modules[role]?.includes(module)));
}
export function projectAssigned(rows,id,employeeId){
  const project=rows.find(r=>r.kind==='project'&&r.id===id);
  return !!project&&(project.managerEmployeeId===employeeId||project.staffEmployeeIds?.includes(employeeId)||
    rows.some(r=>r.kind==='task'&&r.projectId===id&&r.ownerEmployeeId===employeeId));
}
export function jobAssigned(rows,job,employeeId){
  const contract=rows.find(r=>r.id===job.contractId&&r.kind==='contract');
  return job.technicianEmployeeId===employeeId||job.leadEmployeeId===employeeId||
    (!job.leadEmployeeId&&contract?.supervisorEmployeeId===employeeId);
}


export const serviceTypes = {om:'MEP O&M',scheduled:'Scheduled Maintenance Agreement',troubleshooting:'Troubleshooting (one time)'};
export const agreementSections = {
  scope:'Asset register, locations and scope',staffing:'Resident staffing, shifts and relief',sla:'Response, attendance and restoration targets',
  parts:'Parts, consumables and corrective repairs',payment:'Fees, tax, invoice evidence and payment',variations:'Written variations and emergency approval',
  clientDuties:'Client access, safety and shutdown responsibilities',warranty:'Workmanship warranty and existing defects',
  liability:'Liability allocation, exclusions and insurance',termination:'Default, cure, termination and handover',
  confidentiality:'Confidentiality, security and client publicity',dispute:'Governing law, language, notices and disputes',precedence:'Documents, annexes and precedence',
};
export function agreementDefaults(contract){
  return {scope:contract.equipment||'',staffing:contract.staffingPlan||'',sla:contract.sla||'',
    parts:'Only the parts and consumables expressly included in the agreed asset and price schedules are included. Additional parts, major repairs and third-party specialist work require a written quotation and approval before commitment.',
    payment:'',variations:'Any change to assets, quantities, staffing, operating hours or work scope requires a written variation identifying price and schedule impacts, approved by the designated representatives of both parties. Emergency attendance does not authorize unlimited repair expenditure. Record the agreed emergency limit and escalation contacts in the service schedule.',
    clientDuties:'The client provides agreed access, security clearance, utilities, asset information and permits to work. Electrical isolation, shutdown and restart require the agreed site authorization. Unsafe work is stopped and reported. Record access delays and revised attendance arrangements.',
    warranty:'',liability:'',termination:'',
    confidentiality:'Use client information only for the contracted services. Follow the agreed site security and information handling requirements. Report incidents through the designated contacts. Do not publish the client name, logo, photographs or service details without prior written consent. Record any required subcontractor approval, audit scope and record retention requirements.',
    dispute:'',precedence:'List every incorporated quotation revision, asset register, service schedule, staffing plan, rate schedule and amendment. State their order of precedence and resolve conflicts in writing before signature. A renewal must identify the original agreement and the annexes it replaces.'};
}
export const templateReviewFindings = [
  ['Jurisdiction and definitions','A historical form refers to events in India and uses undefined Authority/FMC terms. Confirm Cambodian project terms, parties, notices and governing documents.'],
  ['Payment default','A historical termination clause describes a payment being paid within 60 days as a breach. Correct the trigger, due date, notice and cure process.'],
  ['Emergency scope','References mix included minor repairs, two-hour labor allowances and chargeable emergency call-outs. Define per-call limits, working hours, parts and written approval.'],
  ['Staffing and coverage','Visit teams are different from resident staff and facility operators. State headcount, shifts, holidays, relief, overtime and supervision separately.'],
  ['Response versus restoration','Attendance promises do not establish a repair completion guarantee. Define severity, clock start, coverage, access delays, escalation and restoration dependencies.'],
  ['Risk and completion','Agree liability and insurance, existing defects, warranty, default/cure, payment on termination, handover and renewal. Keep bank-specific security, audit and publicity terms where required.'],
];

export function quotationTotals(quote) {
  const c = quote.currency;
  const r = n => roundMoney(n, c);
  const direct = r(quote.items.reduce((sum, item) => sum + r(item.quantity * (item.material + item.laborHours * item.laborRate + item.other)), 0));
  const cost = r(direct + quote.indirect + quote.risk);
  const beforeDiscount = r(cost / (1 - quote.margin / 100));
  const selling = r(beforeDiscount - quote.discount);
  const tax = r(selling * quote.tax / 100);
  const profit = r(selling - cost);
  return { direct, cost, beforeDiscount, selling, tax, total:r(selling + tax), profit, margin:selling ? profit / selling * 100 : 0, markup:cost ? profit / cost * 100 : 0 };
}

export function bidAssessment(tender, settings) {
  const { value, cost, currency, duration, upfront, delay, advance, guarantee, collateral, fee, retention } = tender;
  if (!(value > 0 && cost > 0 && duration > 0)) return { decision:'Requires Management Review', missing:['Contract value, project cost and duration'], cash:[], exposure:null };
  const missing = [];
  if (!tender.due) missing.push('Submission deadline');
  if (!tender.terms?.trim()) missing.push('Verified terms and source references');
  if (upfront > cost) missing.push('Upfront cost exceeds total estimated cost');
  const bondCash = value * guarantee / 100 * collateral / 100;
  const firstReceipt = value * advance / 100;
  const retained = value * retention / 100;
  const periodic = (value - firstReceipt - retained) / duration;
  if (periodic < 0) missing.push('Advance and retention exceed contract value');
  const cash = [];
  let balance = 0;
  for (let month = 0; month <= duration + delay + 1; month++) {
    const receipt = month === 0 ? firstReceipt : month === duration + delay + 1 ? retained + bondCash : month > delay ? Math.max(0,periodic) : 0;
    const spend = month === 0 ? upfront + fee + bondCash : month <= duration ? Math.max(0,cost-upfront) / duration : 0;
    balance += receipt - spend;
    cash.push({ month, receipt:roundMoney(receipt,currency), spend:roundMoney(spend,currency), balance:roundMoney(balance,currency) });
  }
  const profit = roundMoney(value - cost - fee,currency);
  const margin = profit / value * 100;
  const exposure = Math.max(0,...cash.map(x=>-x.balance));
  const comparison = currency === settings.currency;
  if (!comparison) missing.push('Cash approval limit is set in ' + settings.currency);
  const decision = profit < 0 ? 'Do Not Bid' : missing.length || exposure > settings.cashLimit ? 'Requires Management Review' : margin < settings.minMargin ? 'Bid with Conditions' : 'Proceed to Bid';
  return { decision, missing, margin, profit, exposure, cash, collateral:roundMoney(bondCash,currency), retention:roundMoney(retained,currency) };
}

export function availableStock(rows, materialId, warehouseId, excludeProject) {
  const moves = rows.filter(r=>r.kind==='movement' && r.materialId===materialId && (!warehouseId || r.warehouseId===warehouseId));
  const onHand = roundQty(moves.reduce((sum,m)=>sum+m.delta,0));
  const value = moves.reduce((sum,m)=>sum+m.delta*m.cost,0);
  const reserved = roundQty(rows.filter(r=>r.kind==='reservation' && r.materialId===materialId && (!warehouseId || r.warehouseId===warehouseId) && r.projectId!==excludeProject).reduce((sum,r)=>sum+r.quantity,0));
  return { onHand, reserved, free:roundQty(onHand-reserved), value, rate:onHand>0 ? value/onHand : null };
}

export function invoiceBalance(rows, invoice) {
  const paid = rows.filter(x=>x.kind==='payment' && x.invoiceId===invoice.id).reduce((sum,p)=>sum+p.amount,0);
  return { paid:roundMoney(paid,invoice.currency), outstanding:receivableInvoice(invoice)?roundMoney(invoice.amount-paid,invoice.currency):0 };
}
export function projectPosition(rows, project) {
  const issued = rows.filter(x=>x.kind==='movement' && x.projectId===project.id && ['Issue','Return'].includes(x.type)).reduce((s,x)=>s-x.delta*x.cost,0);
  const costs = rows.filter(x=>x.kind==='cost'&&x.projectId===project.id).reduce((s,x)=>s+x.amount,0);
  const orders = rows.filter(x=>x.kind==='po'&&x.projectId===project.id&&!['Cancelled','Closed'].includes(x.status));
  const outstandingOrders = orders.reduce((s,x)=>s+(x.quantity-x.received)*x.price,0);
  const moves=rows.filter(x=>x.kind==='movement'&&x.projectId===project.id);
  const receivedByMaterial=new Map();
  for(const move of moves.filter(x=>x.type==='Receipt'&&x.delta>0)){
    const existing=receivedByMaterial.get(move.materialId)??{qty:0,value:0};
    receivedByMaterial.set(move.materialId,{qty:existing.qty+move.quantity,value:existing.value+move.quantity*move.cost});
  }
  let allocatedStock=0;
  for(const [id,receipt] of receivedByMaterial){
    const used=moves.filter(x=>x.materialId===id&&['Issue','Return'].includes(x.type)).reduce((total,x)=>total-x.delta,0);
    allocatedStock+=Math.max(0,receipt.qty-Math.max(0,used))*receipt.value/receipt.qty;
  }
  const committed=outstandingOrders+allocatedStock;
  const approved = rows.filter(x=>x.kind==='variation'&&x.projectId===project.id&&x.status==='Approved');
  const value=project.value+approved.reduce((s,x)=>s+x.value,0), budget=project.budget+approved.reduce((s,x)=>s+x.cost,0);
  const actual=issued+costs, forecast=actual+committed+project.remaining;
  const bills=rows.filter(x=>receivableInvoice(x)&&x.projectId===project.id);
  const balance=bills.reduce((s,x)=>{const p=invoiceBalance(rows,x);return {paid:s.paid+p.paid,outstanding:s.outstanding+p.outstanding};},{paid:0,outstanding:0});
  return { value,budget,issued,costs,actual,committed,forecast,profit:value-forecast,margin:value ? (value-forecast)/value*100 : 0,...balance };
}

export function applyOperation(rows, actor, action, data, demo, today = dateOffset()) {
  ensure(allowed(actor,action), 'Your role cannot perform this action.',403);
  return applyAuthorizedOperation(rows,actor,action,data,demo,today);
}

function applyAuthorizedOperation(rows,actor,action,data,demo,today) {
  if(action.startsWith('mail.'))return applyMailbox(rows,actor,action,data,demo);
  const approval=approvalFor(action,data.status);
  if(actor.previewEmployeeId&&approval)ensure(actor.approvals?.includes(approval),'This employee has no separate authorization for this decision.',403);
  const byId = new Map(rows.map(r=>[r.id,r]));
  const changes = new Map();
  const settings = byId.get('settings');
  const list = kind => [...byId.values()].filter(r=>r.kind===kind);
  const get = (id, kind) => {
    const record = byId.get(String(id ?? ''));
    ensure(record?.kind===kind, 'Select a valid ' + kind + '.',404);
    return record;
  };
  const write = record => { byId.set(record.id,record);changes.set(record.id,record);return record; };
  const make = (kind, values) => write({id:crypto.randomUUID(),kind,date:today,createdBy:actor.id,...values});
  const update = (record, values) => write({...record,...values,updated:today});
  const next = (kind,prefix) => {
    const pattern=prefix+'-'+today.slice(2,4)+'-';
    const number=Math.max(0,...list(kind).map(x=>x.code?.startsWith(pattern)?Number(x.code.slice(pattern.length))||0:0))+1;
    return pattern+String(number).padStart(3,'0');
  };
  const projectOf = id => get(id,'project');
  const clientOf = id => get(id,'client');
  const materialOf = id => get(id,'material');
  const warehouseOf = id => get(id,'warehouse');
  const person = id => {
    if(!id)return null;
    ensure(hasNamedAssignments(actor),'Employee assignments are unavailable in this workspace.',403);
    return get(id,actor.demoAssignments?'demo-person':'personnel');
  };
  const projectScope = p => {
    if(actor.previewEmployeeId&&!hasFullModule(actor,'projects')&&!hasFullModule(actor,'procurement')&&!hasFullModule(actor,'maintenance'))
      ensure(projectAssigned(rows,p.id,actor.previewEmployeeId),'This project is outside your assignment.',403);
  };
  const internalPerson = (id,label,existing) => {
    const named=person(id);
    if(named)return named.name;
    if(actor.privateWorkspace)ensure(existing,'Select a named employee for '+label+'.');
    return field(existing,label);
  };

  const authority = (...wanted) => ensure(has(actor,'admin',...wanted),'This decision requires an authorized reviewer.',403);
  const separation = record => ensure(record.createdBy!==actor.id || (demo && actor.id.startsWith('demo:')), 'A different authorized employee must approve this record.',403);
  const stock = (id,wh,project) => availableStock([...byId.values()],id,wh,project);
  const verifiedPrice = (material, currency,context='') => {
    sameCurrency(material.currency,currency);
    ensure(material.priceDate && dayGap(material.priceDate,today)<=settings.priceDays,
      context+material.code+' ('+material.name+'). The price was last checked '+(material.priceDate||'on an unrecorded date')+
      ' and requires review within '+settings.priceDays+' days. Enter price evidence on this line or ask Procurement to verify the catalog price.');
    return material.price;
  };
  const projectCode = () => next('project','MEP');
  const makeProject = (input, client, values) => make('project',{
    name:field(input.name,'Project name'),code:projectCode(),clientId:client.id,parentId:client.id,
    location:field(input.location,'Site location'),service:field(input.service,'Service category'),
    manager:internalPerson(input.managerEmployeeId,'project lead',actor.privateWorkspace?null:input.manager),
    managerEmployeeId:person(input.managerEmployeeId)?.id??null,
    status:'Awarded',start:validDate(input.start,'start date'),end:validDate(input.end,'completion date'),
    terms:note(input.terms),retention:optionalNumber(input.retention,'Retention',100),progress:0,
    history:[{status:'Awarded',date:today,actor:actor.id}], ...values,
  });
  const quoteValues = (input, currency) => {
    ensure(Array.isArray(input.items)&&input.items.length>0&&input.items.length<=350,'Add 1 to 350 valid BOQ items.');
    const items = input.items.map((x,index) => {
      const material = x.materialId ? materialOf(x.materialId) : null;
      const unit = field(x.unit,'Unit on line '+(index+1),25);
      let price = money(x.material,'Material price on line '+(index+1),currency);
      const reason = note(x.override,300);
      if(material){
        ensure(unit.toLowerCase()===material.unit.toLowerCase(),'Use '+material.unit+' for '+material.code+' or remove the material match.');
        sameCurrency(currency,material.currency);
        if (!reason) price=verifiedPrice(material,currency,'Quotation line '+(index+1)+' - ');
      } else if(price>0) ensure(reason,'Record the source or reason for a manual material price on line '+(index+1)+'.');
      return { description:field(x.description,'Description on line '+(index+1),350),section:note(x.section,100),
        spec:note(x.spec,250),unit,quantity:quantityOf(x.quantity),materialId:material?.id ?? null,material:price,override:reason,
        laborHours:optionalNumber(x.laborHours,'Labor hours',10000),laborRate:money(x.laborRate ?? 0,'Labor rate',currency),other:money(x.other ?? 0,'Other direct unit cost',currency),
        ...(x.sourceRef?{sourceRef:note(x.sourceRef,250)}:{}) };
    });
    const result={currency,items,margin:numeric(input.margin,'Target margin',0,95),indirect:money(input.indirect??0,'Indirect costs',currency),risk:money(input.risk??0,'Risk allowance',currency),
      discount:money(input.discount??0,'Discount',currency),tax:optionalNumber(input.tax,'Tax',100),validUntil:validDate(input.validUntil,'validity date'),terms:note(input.terms),warranty:note(input.warranty),exclusions:note(input.exclusions)};
    ensure(quotationTotals(result).selling>=0,'The discount exceeds the selling price.');
    return result;
  };
  let target;
  switch(action){
    case 'client.create': {
      const name=field(data.name,'Company name');
      ensure(!list('client').some(x=>x.name.toLowerCase()===name.toLowerCase()),'A client with this name already exists.');
      const source=Array.isArray(data.contacts)?data.contacts:[{name:data.contact,phone:data.phone,email:data.email}];
      const contacts=source.slice(0,15).filter(x=>x.name || x.phone || x.email).map(x=>({name:field(x.name,'Contact name'),phone:note(x.phone,60),email:note(x.email,200)}));
      const serviceGroups=(Array.isArray(data.serviceGroups)?data.serviceGroups:[has(actor,'maintenance')?'maintenance':'installation']).filter(x=>['installation','maintenance'].includes(x));
      ensure(serviceGroups.length,'Choose at least one client service group.');
      target=make('client',{serviceGroups:[...new Set(serviceGroups)],name,address:note(data.address),type:note(data.type,80)||'Corporate',taxId:note(data.taxId,70),contacts,notes:note(data.notes)});
      break;
    }
    case 'client.update': {
      const c=get(data.id,'client');
      ensure(has(actor,'admin','manager')||has(actor,'maintenance')&&((c.serviceGroups||[]).includes('maintenance')||list('contract').some(x=>x.clientId===c.id)||data.shareWithMaintenance===true),'Edit a maintenance client or explicitly share an existing client.',403);
      const groups=(Array.isArray(data.serviceGroups)?data.serviceGroups:c.serviceGroups||[...(list('project').some(x=>x.clientId===c.id)?['installation']:[]),...(list('contract').some(x=>x.clientId===c.id)?['maintenance']:[])]).filter(x=>['installation','maintenance'].includes(x));ensure(groups.length,'Choose a service group.');
      if(has(actor,'maintenance')&&!has(actor,'admin','manager'))groups.push('maintenance');
      target=update(c,{serviceGroups:[...new Set(groups)],...(data.shareWithMaintenance?{}:{address:note(data.address),notes:note(data.notes),contacts:[{name:field(data.contact,'Contact name'),phone:note(data.phone,60),email:note(data.email,200)},...(c.contacts||[]).slice(1)]}),reason:field(data.reason,'Client change reference')});break;
    }
    case 'supplier.create': {
      const name=field(data.name,'Supplier name');
      ensure(!list('supplier').some(x=>x.name.toLowerCase()===name.toLowerCase()),'This supplier already exists.');
      target=make('supplier',{name,email:note(data.email),terms:note(data.terms),phone:note(data.phone)});
      break;
    }
    case 'warehouse.create': {
      const name=field(data.name,'Warehouse name'),code=field(data.code,'Warehouse code',30).toUpperCase();
      ensure(!list('warehouse').some(x=>x.code===code),'Warehouse code already exists.');
      target=make('warehouse',{name,code,location:field(data.location,'Location')});
      break;
    }
    case 'material.create': {
      const code=field(data.code,'Material code',40).toUpperCase(),barcode=note(data.barcode,80)||code,currency=curr(data.currency);
      ensure(!list('material').some(x=>x.code===code || x.barcode===barcode),'Material code or barcode already exists.');
      const price=money(data.price,'Verified price',currency),priceDate=validDate(data.priceDate,'price date');
      ensure(priceDate<=today,'The verified price date cannot be in the future.');
      target=make('material',{code,barcode,currency,price,priceDate,priceHistory:[{price,currency,date:priceDate}],name:field(data.name,'Description'),unit:field(data.unit,'Base unit',25),
        category:field(data.category,'Category',80),spec:note(data.spec),supplierId:data.supplierId?get(data.supplierId,'supplier').id:null,minimum:optionalNumber(data.minimum,'Minimum stock')});
      break;
    }
    case 'material.price': {
      const m=materialOf(data.id),price=money(data.price,'Verified price',m.currency),priceDate=validDate(data.priceDate,'price date'),reason=field(data.reason,'Price evidence');
      ensure(priceDate>=m.priceDate && priceDate<=today,'Use a price date on or after the current verified date and on or before today.');
      target=update(m,{price,priceDate,priceHistory:[...(m.priceHistory??[]),{price,currency:m.currency,date:priceDate,reason,actor:actor.id}]}); break;
    }
    case 'project.create': {
      const currency=curr(data.currency);
      target=makeProject(data,clientOf(data.clientId),{currency,value:money(data.value,'Contract value',currency),budget:money(data.budget,'Approved budget',currency),remaining:money(data.budget,'Approved budget',currency),contract:field(data.contract,'Contract reference')});
      ensure(target.end>=target.start,'Completion must follow the start date.');
      break;
    }
    case 'tender.create':
    case 'tender.update': {
      const old=action==='tender.update'?get(data.id,'tender'):null;
      if(old) ensure(['Received','Under Evaluation','Estimating','Pending Review'].includes(old.status),'This tender is locked.');
      if(data.aiBoqDocumentId){
        const source=get(data.aiBoqDocumentId,'document');
        ensure(old&&source.parentId===old.id&&source.type==='application/pdf','Select the tender source PDF.');
        ensure(!old.boq?.length,'A tender BOQ already exists. Review it before changing the material lines.',409);
      }
      const c=clientOf(data.clientId),currency=curr(data.currency),due=validDate(data.due,'submission deadline');
      const values={name:field(data.name,'Tender title'),clientId:c.id,parentId:c.id,due,currency,
        value:money(data.value,'Contract value',currency),cost:money(data.cost,'Estimated cost',currency),upfront:money(data.upfront,'Upfront materials and mobilization',currency),
        duration:Math.trunc(numeric(data.duration,'Duration in months',1,60)),delay:Math.trunc(optionalNumber(data.delay,'Payment delay in months',24)),
        advance:optionalNumber(data.advance,'Advance',100),retention:optionalNumber(data.retention,'Retention',100),
        guarantee:optionalNumber(data.guarantee,'Guarantee',100),collateral:optionalNumber(data.collateral,'Collateral',100),
        fee:money(data.fee??0,'Guarantee fees',currency),terms:note(data.terms),hours:optionalNumber(data.hours,'Estimating hours',50000),scope:note(data.scope??old?.scope),
        paymentTerms:note(data.paymentTerms??old?.paymentTerms),warranty:note(data.warranty??old?.warranty),
        estimateMargin:numeric(data.estimateMargin??old?.estimateMargin??settings.minMargin,'Estimate target margin',0,95),
        estimateIndirect:money(data.estimateIndirect??old?.estimateIndirect??0,'Estimate indirect allowance',currency),
        estimateRisk:money(data.estimateRisk??old?.estimateRisk??0,'Estimate risk allowance',currency)};
      if(data.boq!==undefined){
        ensure(Array.isArray(data.boq)&&data.boq.length<=350,'Tender BOQ supports up to 350 lines.');
        values.boq=data.boq.map((line,index)=>({
          description:field(line.description,'BOQ description on line '+(index+1),350),unit:field(line.unit,'BOQ unit',25),quantity:quantityOf(line.quantity),
          section:note(line.section,100),spec:note(line.spec,250),materialCode:note(line.materialCode,80),sourceRef:note(line.sourceRef,250),
          ...(line.materialId?{materialId:materialOf(line.materialId).id}:{}),
          ...(line.laborHours!=null?{laborHours:numeric(line.laborHours,'BOQ labor hours',0,10000)}:{}),
          ...(line.laborRate!=null?{laborRate:money(line.laborRate,'BOQ labor rate',currency)}:{}),
          ...(line.other!=null?{other:money(line.other,'BOQ other cost',currency)}:{}),
        }));
      }
      ensure(values.upfront<=values.cost,'Upfront costs must be included in estimated costs.');
      ensure(values.advance+values.retention<=100,'Advance and retention together cannot exceed 100%.');
      target=old?update(old,values):make('tender',{code:next('tender','T'),status:'Received',...values});
      break;
    }
    case 'tender.transition': {
      const t=get(data.id,'tender');
      const edges={Received:['Under Evaluation','Cancelled'],'Under Evaluation':['Estimating','Pending Review','Cancelled'],Estimating:['Pending Review','Cancelled'],'Pending Review':['Approved for Bid','Estimating','Do Not Bid','Cancelled'],'Approved for Bid':['Submitted','Cancelled'],Submitted:['Awarded','Lost','Cancelled']};
      const status=choose(data.status,edges[t.status]??[],'next tender status');
      const reason=['Cancelled','Lost','Do Not Bid','Approved for Bid','Submitted','Awarded'].includes(status)?field(data.reason,'Decision or reference'):note(data.reason);
      if(['Approved for Bid','Submitted','Awarded','Do Not Bid'].includes(status)){authority('manager','director','mep'); separation(t);}
      if(status==='Submitted') ensure(t.due>=today,'The tender deadline has passed.');
      target=update(t,{status,history:[...(t.history??[]),{status,reason,date:today,actor:actor.id}]}); break;
    }
    case 'quote.create':
    case 'tender.quote':
    case 'quote.edit': {
      const old=action==='quote.edit'?get(data.id,'quote'):null;
      if(old) ensure(old.status==='Draft','Only draft quotations can be edited. Create a revision for an issued quotation.');
      const tender=action==='tender.quote'?get(data.tenderId,'tender'):old?.tenderId?get(old.tenderId,'tender'):null;
      if(action==='tender.quote')ensure(tender.status==='Approved for Bid','Approve this tender for bid before creating its quotation.');
      if(tender) ensure(!['Cancelled','Lost','Do Not Bid'].includes(tender.status),'This tender cannot generate a quotation.');
      const client=clientOf(tender?.clientId||data.clientId),currency=curr(data.currency);
      const project=data.projectId?projectOf(data.projectId):null;
      if(project) ensure(project.clientId===client.id && project.currency===currency,'The quotation must match the project client and currency.');
      if(tender) sameCurrency(tender.currency,currency);
      const values={name:field(data.name,'Quotation title'),clientId:client.id,parentId:client.id,projectId:project?.id??null,tenderId:tender?.id??null,...quoteValues(data,currency)};
      if(data.generation){
        ensure(tender,'Generated quotations require a tender reference.');
        const generation=data.generation;
        values.generation={mode:choose(generation.mode,demo?['simulation','boq_match']:['boq_match'],'generation mode'),tenderCode:tender.code,
          source:field(generation.source,'Generation source',120),sourceLines:numeric(generation.sourceLines,'Source line count',1,350),
          matchedLines:numeric(generation.matchedLines,'Matched line count',1,350),generatedAt:validDate(generation.generatedAt,'generation date'),
          assumptions:(Array.isArray(generation.assumptions)?generation.assumptions:[]).slice(0,20).map(value=>note(value,1000)),
          warnings:(Array.isArray(generation.warnings)?generation.warnings:[]).slice(0,350).map(value=>note(value,1000))};
      }
      target=old?update(old,values):make('quote',{code:next('quote','Q'),revision:1,status:'Draft',...values});break;
    }
    case 'quote.transition': {
      const q=get(data.id,'quote');
      const edges={Draft:['Internal Review'], 'Internal Review':['Approved','Draft'], Approved:['Sent'], Sent:['Accepted','Rejected','Expired']};
      const status=choose(data.status,edges[q.status]??[],'next quotation status');
      if(['Approved','Accepted'].includes(status)){authority('manager','director','mep'); separation(q);}
      if(status==='Sent')authority('estimator','manager','director','mep');
      if(status==='Approved') ensure(quotationTotals(q).total>0 && q.validUntil>=today,'Approve only a positive, current quotation.');
      if(status==='Accepted') ensure(q.validUntil>=today,'This quotation has expired. Create a revision.');
      const reason=['Accepted','Rejected','Draft'].includes(status)?field(data.reason,'Decision or reference'):note(data.reason);
      target=update(q,{status,...(status==='Sent'?{sentBy:actor.id,sentDate:today}:{}),history:[...(q.history??[]),{status,reason,date:today,actor:actor.id}]});
      if(status==='Approved') make('quoteVersion',{name:q.name,parentId:q.id,projectId:q.projectId,quoteId:q.id,code:q.code,revision:q.revision,snapshot:structuredClone(target)});
      break;
    }
    case 'quote.revise': {
      const q=get(data.id,'quote');
      ensure(['Approved','Sent','Rejected','Expired'].includes(q.status),'A draft, in-review or accepted quotation cannot be revised.');
      const reason=field(data.reason,'Revision reason');
      ensure(!list('quote').some(x=>x.code===q.code&&x.revision>q.revision),'A newer revision already exists.');
      if(['Approved','Sent'].includes(q.status)) update(q,{status:'Superseded',supersededReason:reason});
      const {id,kind,history,updated,...copy}=q;
      target=make(kind,{...copy,date:today,createdBy:actor.id,revision:q.revision+1,status:'Draft',revisionReason:reason}); break;
    }
    case 'project.award': {
      const q=get(data.id,'quote');
      ensure(q.status==='Accepted' && !q.awardProjectId,'This quotation must be accepted and unused.');
      const terms=quotationTotals(q),client=clientOf(q.clientId);
      ensure(!q.projectId,'This quotation already refers to an existing project. Use an approved variation to update its budget.');
      target=makeProject({...data,terms:q.terms},client,{currency:q.currency,value:terms.selling,budget:terms.cost,remaining:terms.cost,contract:field(data.contract,'Contract reference'),quoteId:q.id});
      ensure(target.end>=target.start,'Completion must follow the start date.');
      update(q,{projectId:target.id,awardProjectId:target.id});
      const needs=new Map();
      q.items.filter(x=>x.materialId).forEach(x=>needs.set(x.materialId,roundQty((needs.get(x.materialId)??0)+x.quantity)));
      for(const [materialId,quantity] of needs) make('requirement',{projectId:target.id,parentId:target.id,materialId,quantity,unit:materialOf(materialId).unit,quoteId:q.id});
      break;
    }
    case 'project.assign': {
      ensure(hasNamedAssignments(actor),'Named project assignments are unavailable in this workspace.',403);
      const p=projectOf(data.id),owner=person(data.managerEmployeeId);
      ensure(owner,'Select a project owner.');
      const staff=Array.isArray(data.staffEmployeeIds)?[...new Set(data.staffEmployeeIds)]:[];
      ensure(staff.length<=100,'Select up to 100 employees.');
      staff.forEach(person);
      target=update(p,{manager:owner.name,managerEmployeeId:owner.id,staffEmployeeIds:staff,
        assignmentReason:field(data.reason,'Assignment reason')});break;
    }
    case 'task.create':
    case 'task.assign':
    case 'task.update': {
      ensure(hasNamedAssignments(actor),'Named project tasks are unavailable in this workspace.',403);
      const old=action==='task.create'?null:get(data.id,'task');
      const p=projectOf(old?.projectId??data.projectId);
      projectScope(p);
      if(action==='task.update'){
        if(actor.previewEmployeeId&&!hasFullModule(actor,'projects')&&!has(actor,'installation_lead'))
          ensure(old.ownerEmployeeId===actor.previewEmployeeId,'This task is assigned to another employee.',403);
        target=update(old,{status:choose(data.status,['Open','In Progress','Completed'],'task status'),progressNote:note(data.notes,1000)});
      } else {
        const owner=person(data.ownerEmployeeId);
        ensure(owner,'Select a task owner.');
        const values={ownerEmployeeId:owner.id,ownerName:owner.name,due:validDate(data.due,'task due date')};
        if(old)target=update(old,{...values,assignmentReason:field(data.reason,'Assignment reason')});
        else target=make('task',{...values,name:field(data.name,'Task title'),notes:note(data.notes,1500),projectId:p.id,parentId:p.id,status:'Open'});
      }
      break;
    }
    case 'project.progress': {
      const p=projectOf(data.id),progress=point(data.progress,'Completion');
      ensure(['Awarded','Active','On Hold'].includes(p.status),'Progress is locked for this project.');
      const details=field(data.notes,'Progress note');
      target=update(p,{progress,remaining:hasFinanceAccess(actor)&&data.remaining!=null?money(data.remaining,'Remaining uncommitted cost',p.currency):p.remaining});
      make('progress',{name:'Progress update',projectId:p.id,parentId:p.id,progress,notes:details,remaining:target.remaining}); break;
    }
    case 'project.status': {
      const p=projectOf(data.id),edges={Awarded:['Active','Cancelled'],Active:['On Hold','Completed','Cancelled'],'On Hold':['Active','Cancelled'],Completed:['Closed','Active']};
      const status=choose(data.status,edges[p.status]??[],'next project status'),reason=field(data.reason,'Status reason');
      target=update(p,{status,history:[...(p.history??[]),{status,reason,date:today,actor:actor.id}]});break;
    }
    case 'project.cost': {
      const p=projectOf(data.projectId),amount=money(data.amount,'Cost',p.currency);
      ensure(amount>0,'Cost must be positive.');
      target=make('cost',{name:field(data.name,'Cost reference'),projectId:p.id,parentId:p.id,currency:p.currency,amount,type:choose(data.type,['Labor','Equipment','Subcontract','Other'],'cost type')}); break;
    }
    case 'variation.create': {
      const p=projectOf(data.projectId);
      target=make('variation',{code:next('variation','VO'),name:field(data.name,'Variation title'),projectId:p.id,parentId:p.id,value:money(data.value,'Variation revenue',p.currency),cost:money(data.cost,'Variation budget',p.currency),currency:p.currency,status:'Pending'}); break;
    }
    case 'variation.transition': {
      const v=get(data.id,'variation');
      ensure(v.status==='Pending','This variation has already been decided.');
      separation(v);
      target=update(v,{status:choose(data.status,['Approved','Rejected'],'variation decision'),evidence:field(data.reason,'Client approval or rejection reference'),approver:actor.id});
      if(target.status==='Approved'){const p=projectOf(v.projectId);update(p,{remaining:roundMoney(p.remaining+v.cost,p.currency)});}
      break;
    }
    case 'request.create': {
      if(data.items!==undefined){
        ensure(Array.isArray(data.items)&&data.items.length>0&&data.items.length<=100,'Add between 1 and 100 material lines.');
        ensure(new Set(data.items.map(line=>line.materialId)).size===data.items.length,'Use one line per material and adjust its quantity.');
        const project=projectOf(data.projectId);
        const group=make('requisition',{code:next('requisition','PRG'),name:field(data.name,'Requisition title'),projectId:project.id,parentId:project.id,
          needed:validDate(data.needed,'required date'),reason:field(data.reason,'Purchase reason'),currency:project.currency,lineIds:[]});
        const lineIds=[];
        for(const line of data.items){
          const result=applyOperation([...byId.values()],actor,'request.create',{
            projectId:data.projectId,requesterEmployeeId:data.requesterEmployeeId,needed:data.needed,reason:data.reason,
            materialId:line.materialId,quantity:line.quantity,price:line.price,
          },demo,today);
          result.changes.forEach(write);
          update(result.target,{requisitionId:group.id});
          lineIds.push(result.target.id);
        }
        target=update(group,{lineIds});
        break;
      }
      const p=projectOf(data.projectId),m=materialOf(data.materialId),quantity=quantityOf(data.quantity),needed=validDate(data.needed,'required date');
      projectScope(p);
      const requester=person(actor.previewEmployeeId||data.requesterEmployeeId);
      if(actor.privateWorkspace)ensure(requester,'Select a requesting employee.');
      ensure(!list('request').some(x=>x.projectId===p.id&&x.materialId===m.id&&x.needed===needed&&x.quantity===quantity&&!['Closed','Cancelled','Rejected'].includes(x.status)),'A matching open requisition already exists.');
      const price=data.price?money(data.price,'Unit price',p.currency):verifiedPrice(m,p.currency);
      sameCurrency(p.currency,m.currency);
      target=make('request',{code:next('request','PR'),name:note(data.name)||m.name,requesterEmployeeId:requester?.id,requesterName:requester?.name,projectId:p.id,materialId:m.id,parentId:m.id,quantity,needed,price,currency:p.currency,status:'Requested',reason:field(data.reason,'Purchase reason')}); break;
    }
    case 'request.transition': {
      const r=get(data.id,'request');
      const status=choose(data.status,{Requested:['Reviewed','Cancelled'],Reviewed:['Approved','Rejected','Cancelled'],Approved:['Cancelled','Closed']}[r.status]??[],'next requisition status');
      if(status==='Approved'){
        separation(r);
        const available=stock(r.materialId,undefined,r.projectId).free;
        const openOrders=list('po').filter(x=>x.projectId===r.projectId&&x.materialId===r.materialId&&!['Cancelled','Received','Closed'].includes(x.status)).reduce((s,x)=>s+x.quantity-x.received,0);
        const approvedQty=Math.max(0,roundQty(r.quantity-available-openOrders));
        ensure(approvedQty>0,'Available stock and open POs already cover this request. Close it or issue stock.');
        const p=projectOf(r.projectId),position=projectPosition([...byId.values()],p);
        const escalated=p.currency!==settings.currency || approvedQty*r.price>settings.purchaseLimit || position.actual+position.committed+approvedQty*r.price>position.budget;
        if(escalated) authority('director'); else authority('manager','director','procurement');
        target=update(r,{status,approvedQty,approver:actor.id,approvedDate:today});
      } else target=update(r,{status,reason:field(data.reason,'Decision or review note'),reviewer:actor.id});
      break;
    }
    case 'supplier.offer': {
      const r=get(data.requestId,'request'),s=get(data.supplierId,'supplier');
      ensure(['Requested','Reviewed','Approved'].includes(r.status),'Supplier offers are closed for this requisition.');
      target=make('offer',{name:s.name,parentId:r.id,projectId:r.projectId,requestId:r.id,supplierId:s.id,currency:r.currency,price:money(data.price,'Offered unit price',r.currency),due:validDate(data.due,'delivery date'),terms:note(data.terms),warranty:note(data.warranty),spec:note(data.spec)});break;
    }
    case 'po.create': {
      const r=get(data.requestId,'request');
      ensure(r.status==='Approved' && r.approvedQty>0 && !list('po').some(x=>x.requestId===r.id&&x.status!=='Cancelled'),'An approved, unused purchase shortage is required.');
      const s=get(data.supplierId,'supplier'),offer=data.offerId?get(data.offerId,'offer'):null;
      if(offer) ensure(offer.requestId===r.id&&offer.supplierId===s.id,'This offer belongs to a different supplier or requisition.');
      const price=offer?.price??r.price;
      const buyer=person(data.buyerEmployeeId||actor.previewEmployeeId),delivery=person(data.deliveryEmployeeId);
      if(actor.privateWorkspace)ensure(buyer,'Select the employee responsible for the order.');
      ensure(price<=r.price,'The offer exceeds the approved price. Cancel and submit a revised requisition.');
      const otherOpen=list('po').filter(x=>x.projectId===r.projectId&&x.materialId===r.materialId&&!['Cancelled','Received','Closed'].includes(x.status)).reduce((sum,x)=>sum+x.quantity-x.received,0);
      const currentShortage=Math.max(0,roundQty(r.quantity-stock(r.materialId,undefined,r.projectId).free-otherOpen));
      ensure(currentShortage>0,'Stock and open orders now cover this requisition.');
      target=make('po',{code:next('po','PO'),name:r.name,parentId:r.id,projectId:r.projectId,requestId:r.id,materialId:r.materialId,supplierId:s.id,buyerEmployeeId:buyer?.id,buyerName:buyer?.name,deliveryEmployeeId:delivery?.id,deliveryName:delivery?.name,offerId:offer?.id,quantity:Math.min(currentShortage,r.approvedQty),received:0,price,currency:r.currency,
        due:validDate(data.due,'delivery date'),location:field(data.location,'Delivery location'),terms:note(data.terms)||s.terms,status:'Ordered',approver:r.approver});
      update(r,{status:'Ordered'});break;
    }
    case 'delivery.assign':
    case 'delivery.proof':
    case 'delivery.ack': {
      ensure(hasNamedAssignments(actor),'Named delivery actions are unavailable in this workspace.',403);
      const order=get(data.id,'po');
      if(action==='delivery.assign'){
        const employee=person(data.deliveryEmployeeId);
        ensure(employee,'Select the delivery employee.');
        target=update(order,{deliveryEmployeeId:employee.id,deliveryName:employee.name,deliveryAssignmentReason:field(data.reason,'Assignment reason')});
      } else if(action==='delivery.proof'){
        if(actor.previewEmployeeId&&!hasFullModule(actor,'procurement'))
          ensure(order.deliveryEmployeeId===actor.previewEmployeeId,'This delivery is assigned to another employee.',403);
        target=update(order,{deliveryProof:field(data.reference,'Delivery proof reference'),deliveryProofAt:today,deliveryProofBy:actor.id});
      } else {
        projectScope(projectOf(order.projectId));
        target=update(order,{deliveryAcknowledgment:field(data.reference,'Acknowledgment reference'),deliveryAcknowledgedAt:today,deliveryAcknowledgedBy:actor.id});
      }
      break;
    }
    case 'po.cancel': {
      const po=get(data.id,'po');
      ensure(['Ordered','Partially Received','Received'].includes(po.status),'This purchase order is already closed.');
      const reason=field(data.reason,'Closure reason'),status=po.received>0?'Closed':'Cancelled';
      target=update(po,{status,closeReason:reason});update(get(po.requestId,'request'),{status:status==='Closed'?'Closed':'Approved'});break;
    }
    case 'po.receive': {
      const po=get(data.id,'po'),w=warehouseOf(data.warehouseId),quantity=quantityOf(data.quantity);
      ensure(['Ordered','Partially Received'].includes(po.status),'This purchase order is closed for receipt.');
      ensure(quantity<=roundQty(po.quantity-po.received),'Delivered quantity exceeds the open PO balance.');
      const reference=field(data.reference,'Supplier delivery reference');
      ensure(!list('movement').some(x=>x.poId===po.id&&x.reason.toLowerCase()===reference.toLowerCase()),'This supplier delivery reference has already been received for the PO.');
      const condition=choose(data.condition,['Usable','Damaged'],'condition'),handler=person(data.handlerEmployeeId||actor.previewEmployeeId);
      if(actor.privateWorkspace)ensure(handler,'Select the warehouse employee receiving the stock.');
      target=make('movement',{type:'Receipt',handlerEmployeeId:handler?.id,handlerName:handler?.name,materialId:po.materialId,parentId:po.id,poId:po.id,projectId:po.projectId,warehouseId:w.id,quantity,delta:condition==='Usable'?quantity:0,cost:po.price,currency:po.currency,reason:reference,condition});
      if(condition==='Usable'){
        const received=roundQty(po.received+quantity),status=received===po.quantity?'Received':'Partially Received';
        update(po,{received,status});update(get(po.requestId,'request'),{status});
      }
      break;
    }
    case 'stock.reserve': {
      const m=materialOf(data.materialId),w=warehouseOf(data.warehouseId),p=projectOf(data.projectId),quantity=optionalNumber(data.quantity,'Reserved quantity',1000000);
      ensure(quantity<=stock(m.id,w.id,p.id).free,'Reservation exceeds stock available to this project.');
      const existing=list('reservation').find(x=>x.materialId===m.id&&x.warehouseId===w.id&&x.projectId===p.id);
      const values={materialId:m.id,warehouseId:w.id,projectId:p.id,parentId:m.id,quantity:roundQty(quantity),reason:field(data.reason,'Reservation reason')};
      target=existing?update(existing,values):make('reservation',values);break;
    }
    case 'stock.move': {
      const m=materialOf(data.materialId),w=warehouseOf(data.warehouseId),quantity=quantityOf(data.quantity);
      const type=choose(data.type,['Stock In','Issue','Return','Transfer','Supplier Return'],'movement type');
      const reason=field(data.reason,'Reference or reason');
      const p=data.projectId?projectOf(data.projectId):null;
      const job=data.jobId?get(data.jobId,'job'):null;
      const handler=person(data.handlerEmployeeId||actor.previewEmployeeId),recipientEmployee=person(data.recipientEmployeeId);
      if(actor.privateWorkspace)ensure(handler,'Select the warehouse employee handling the movement.');
      const before=stock(m.id,w.id,p?.id),base={materialId:m.id,warehouseId:w.id,quantity,currency:m.currency,reason,projectId:p?.id??null,jobId:job?.id??null,
        handlerEmployeeId:handler?.id,handlerName:handler?.name,recipientEmployeeId:recipientEmployee?.id};
      let cost=before.rate??m.price;
      if(p) sameCurrency(m.currency,p.currency);
      if(job){sameCurrency(m.currency,get(job.contractId,'contract').currency);ensure(!p&&type==='Issue'&&job.status!=='Completed','Use an active maintenance job as the sole cost destination.');}
      if(type==='Stock In') {
        const balance=stock(m.id,w.id);
        ensure(data.cost!==''&&data.cost!=null,'Enter the verified purchase or opening unit cost.');
        cost=money(data.cost,'Receipt unit cost',m.currency);
        ensure(!list('movement').some(x=>x.materialId===m.id&&x.warehouseId===w.id&&x.type==='Stock In'&&x.reason===reason),'This material receipt reference already exists.');
        target=make('movement',{...base,parentId:m.id,type,cost,delta:quantity,opening:balance.onHand===0});break;
      }
      if(type==='Return'){
        const issue=get(data.issueId,'movement');
        ensure(issue.type==='Issue' && issue.materialId===m.id && issue.projectId===p?.id && !!p,'Select the original project issue for this material.');
        const returned=list('movement').filter(x=>x.issueId===issue.id).reduce((s,x)=>s+x.quantity,0);
        ensure(quantity<=roundQty(issue.quantity-returned),'Return quantity exceeds the original issue balance.');
        const condition=choose(data.condition,['Usable','Damaged'],'return condition');
        target=make('movement',{...base,parentId:issue.id,issueId:issue.id,type:condition==='Usable'?'Return':'Damaged Return',condition,delta:condition==='Usable'?quantity:0,cost:issue.cost});break;
      }
      ensure(quantity<=before.free,'Insufficient unreserved stock at this location.');
      if(type==='Issue'){
        ensure(Number(!!p)+Number(!!job)+Number(!!String(data.expense||'').trim())===1,'Choose exactly one project, maintenance job, or expense category.');
        const recipient=recipientEmployee?.name??field(data.recipient,'Recipient');
        target=make('movement',{...base,parentId:m.id,type,delta:-quantity,cost,recipient,expense:note(data.expense)});
        const reservation=p&&list('reservation').find(x=>x.projectId===p.id&&x.materialId===m.id&&x.warehouseId===w.id&&x.quantity>0);
        if(reservation) update(reservation,{quantity:roundQty(Math.max(0,reservation.quantity-quantity))});
      } else if(type==='Transfer') {
        const to=warehouseOf(data.toWarehouseId),receivedBy=field(data.transferConfirmation,'Destination recipient');
        ensure(to.id!==w.id,'Select a different destination warehouse.');
        target=make('movement',{...base,parentId:m.id,type:'Transfer Out',delta:-quantity,cost});
        make('movement',{...base,parentId:target.id,warehouseId:to.id,type:'Transfer In',delta:quantity,cost,recipient:receivedBy});
      } else target=make('movement',{...base,parentId:m.id,type,delta:-quantity,cost});
      break;
    }
    case 'stock.count': {
      const m=materialOf(data.materialId),w=warehouseOf(data.warehouseId),current=stock(m.id,w.id);
      target=make('count',{name:m.name,parentId:m.id,materialId:m.id,warehouseId:w.id,counted:roundQty(optionalNumber(data.counted,'Physical count',1000000)),onHand:current.onHand,status:'Pending',reason:field(data.reason,'Count reference')}); break;
    }
    case 'stock.adjust': {
      const count=get(data.id,'count'),m=materialOf(count.materialId),current=stock(m.id,count.warehouseId);
      ensure(count.status==='Pending'&&current.onHand===count.onHand,'Stock changed or this count was decided. Record a fresh count.');
      separation(count);
      ensure(count.counted>=current.reserved,'Counted stock is lower than active reservations. Resolve them first.');
      const delta=roundQty(count.counted-current.onHand);
      target=update(count,{status:'Approved',approver:actor.id,approvalReason:field(data.reason,'Adjustment reason')});
      if(delta) make('movement',{parentId:count.id,materialId:m.id,warehouseId:count.warehouseId,type:'Adjustment',quantity:absolute(delta),delta,cost:current.rate??m.price,currency:m.currency,reason:target.approvalReason});break;
    }
    case 'contract.create':
    case 'contract.edit': {
      const old=action==='contract.edit'?get(data.id,'contract'):null;
      const serviceType=choose(data.serviceType||old?.serviceType||'scheduled',Object.keys(serviceTypes),'service type');
      const residentTechnicians=numeric(data.residentTechnicians??old?.residentTechnicians??0,'Resident technician count',0,50);
      ensure(Number.isInteger(residentTechnicians),'Resident technician count must be a whole number.');
      if(old&&serviceType==='troubleshooting')ensure(list('job').filter(j=>j.contractId===old.id).length<=1,'This contract already has recurring jobs. Keep its service history and create a separate one-time service.');
      const coverage=note(data.coverage),staffingPlan=note(data.staffingPlan);
      if(serviceType==='om')ensure(residentTechnicians>0&&coverage&&staffingPlan,'MEP O&M requires onsite staffing, operating coverage and a shift/relief plan.');
      if(residentTechnicians>0)ensure(coverage&&staffingPlan,'Describe resident working hours, shifts, relief and overtime arrangements.');
      const c=clientOf(data.clientId),currency=curr(data.currency),start=validDate(data.start,'start date'),end=validDate(data.end,'end date');
      ensure(end>=start,'Contract end date must follow the start date.');
      const values={serviceType,residentTechnicians,coverage,staffingPlan,name:field(data.name,'Contract title'),clientId:c.id,parentId:c.id,currency,value:money(data.value,'Contract value',currency),
        frequency:serviceType==='troubleshooting'?null:Math.trunc(numeric(data.frequency,'Work interval in days',1,365)),billing:field(data.billing,'Billing frequency'),
        site:field(data.site,'Site'),equipment:field(data.equipment,'Covered equipment'),supervisor:internalPerson(data.supervisorEmployeeId,'supervisor',actor.privateWorkspace?null:data.supervisor),
        technician:internalPerson(data.technicianEmployeeId,'technician',actor.privateWorkspace?null:data.technician),
        supervisorEmployeeId:person(data.supervisorEmployeeId)?.id,technicianEmployeeId:person(data.technicianEmployeeId)?.id,
        technicianEmail:note(data.technicianEmail,150).toLowerCase(),start,end,status:old?.status||'Active',sla:note(data.sla),safety:note(data.safety)};
      target=old?update(old,values):make('contract',{code:next('contract','MC'),...values});break;
    }
    case 'contract.schedule': {
      const c=get(data.id,'contract');
      if(c.serviceType==='troubleshooting'){
        ensure(!list('job').some(j=>j.contractId===c.id),'This one-time service already has a job. Reschedule the existing job instead.');
        const scheduled=validDate(data.until||c.start,'attendance date');
        ensure(scheduled>=c.start&&scheduled<=c.end,'Choose an attendance date within the service period.');
        target=make('job',{code:next('job','JOB'),name:c.name,parentId:c.id,contractId:c.id,scheduled,occurrence:scheduled,technician:c.technician,technicianEmail:c.technicianEmail,technicianEmployeeId:c.technicianEmployeeId,leadEmployeeId:c.supervisorEmployeeId,status:'Scheduled',checklist:['Record reported fault and safety conditions','Diagnose fault and record findings','Obtain written approval before additional repairs','Test and obtain service acknowledgment'],completed:[],minutes:0});break;
      }
      const until=validDate(data.until,'schedule horizon');
      ensure(until>=today&&dayGap(today,until)<=365,'Schedule up to 365 days from today.');
      const stop=until<c.end?until:c.end;
      const booked=new Set(list('job').filter(j=>j.contractId===c.id).map(j=>j.occurrence||j.scheduled));
      const existing=list('job').filter(j=>j.contractId===c.id).map(j=>j.occurrence||j.scheduled).sort().at(-1);
      let day=existing?addDays(existing,c.frequency):c.start;
      if(day<today) day=addDays(day,Math.ceil(dayGap(day,today)/c.frequency)*c.frequency);
      for(let i=0;i<366&&day<=stop;i++,day=addDays(day,c.frequency)){
        if(booked.has(day))continue;
        make('job',{code:next('job','JOB'),name:c.name,parentId:c.id,contractId:c.id,scheduled:day,occurrence:day,technician:c.technician,technicianEmail:c.technicianEmail,technicianEmployeeId:c.technicianEmployeeId,leadEmployeeId:c.supervisorEmployeeId,status:'Scheduled',
          checklist:c.serviceType==='om'?['Record onsite operating readings and alarms','Complete planned operational checks','Record incidents and shift handover']:['Inspect equipment condition','Clean and test equipment','Record readings and findings'],completed:[],minutes:0});
      }
      ensure(changes.size>0,'No new visits are due within this horizon.');
      target=c;break;
    }
    case 'agreement.create':
    case 'agreement.edit': {
      const old=action==='agreement.edit'?get(data.id,'agreement'):null;
      if(old)ensure(old.status==='Draft','Only draft agreements can be edited. Create a new revision for an approved agreement.');
      const c=get(old?.contractId||data.contractId||data.id,'contract');
      if(!old)ensure(!list('agreement').some(a=>a.contractId===c.id&&['Draft','Internal Review'].includes(a.status)),'Finish the existing agreement draft before creating a revision.');
      const sections=Object.fromEntries(Object.keys(agreementSections).map(key=>[key,note(data[key],8000)]));
      const values={name:c.name,contractId:c.id,parentId:c.id,clientId:c.clientId,contractSnapshot:structuredClone(c),...sections,
        contractorParty:note(data.contractorParty),clientParty:note(data.clientParty),contractorSignatory:note(data.contractorSignatory),clientSignatory:note(data.clientSignatory),authorityReference:note(data.authorityReference),
        revisionReason:field(data.reason,'Draft or revision reference'),reviewConfirmed:false};
      const prior=list('agreement').filter(a=>a.contractId===c.id);
      target=old?update(old,values):make('agreement',{code:'SA-'+c.code,revision:1+Math.max(0,...prior.map(a=>a.revision)),status:'Draft',...values});break;
    }
    case 'agreement.transition': {
      const a=get(data.id,'agreement'),edges={Draft:['Internal Review'],'Internal Review':['Approved','Draft']};
      const status=choose(data.status,edges[a.status]||[],'agreement status');
      const reason=field(data.reason,'Decision reference');
      if(status==='Approved'){
        authority('manager','director');separation(a);
        for(const key of [...Object.keys(agreementSections),'contractorParty','clientParty','contractorSignatory','clientSignatory','authorityReference']){
          field(a[key],agreementSections[key]||key,8000);
          ensure(!/\[(?:AGREE|INSERT|TODO)|TBD|TO BE AGREED/i.test(a[key]),'Resolve placeholders in '+(agreementSections[key]||key)+' before approval.');
        }
        ensure(data.reviewConfirmed===true,'Confirm the commercial, legal and signatory authority review before approval.');
        list('agreement').filter(x=>x.contractId===a.contractId&&x.id!==a.id&&x.status==='Approved').forEach(x=>update(x,{status:'Superseded'}));
      }
      target=update(a,{status,reviewConfirmed:status==='Approved',history:[...(a.history||[]),{status,reason,date:today,actor:actor.id}]});break;
    }
    case 'dispatch.create':throw new DomainError('Use Email to compose and send messages. Scans are not required.',400);
    case 'job.assign': {
      const j=get(data.id,'job');
      ensure(j.status!=='Completed','Completed service visits are locked.');
      if(actor.previewEmployeeId&&!hasFullModule(actor,'maintenance'))ensure(jobAssigned(rows,j,actor.previewEmployeeId),'This service visit is outside your assignment.',403);
      const assigned=person(data.technicianEmployeeId),lead=person(data.leadEmployeeId);
      if(actor.privateWorkspace)ensure(assigned,'Select a maintenance technician.');
      if(actor.previewEmployeeId&&!hasFullModule(actor,'maintenance')&&lead)
        ensure(lead.id===j.leadEmployeeId,'Only a maintenance supervisor can change the lead.',403);
      target=update(j,{technician:assigned?.name??field(data.technician,'Technician'),technicianEmployeeId:assigned?.id??j.technicianEmployeeId,
        leadEmployeeId:lead?.id??j.leadEmployeeId,technicianEmail:actor.privateWorkspace?j.technicianEmail:note(data.technicianEmail,150).toLowerCase(),scheduled:validDate(data.scheduled,'visit date'),assignReason:field(data.reason,'Assignment or rescheduling reason')});break;
    }
    case 'job.update': {
      const j=get(data.id,'job');
      if(actor.previewEmployeeId&&!hasFullModule(actor,'maintenance'))ensure(jobAssigned(rows,j,actor.previewEmployeeId),'This service visit is outside your assignment.',403);
      if (!has(actor,'admin','maintenance')&&!demo) ensure(employeeMatchesEmail(actor,j.technicianEmail),'This service visit is assigned to another technician.',403);
      ensure(j.status!=='Completed','Completed service reports are locked.');
      const status=choose(data.status,['In Progress','Completed'],'service status'),selected=Array.isArray(data.completed)?data.completed:[];
      const completed=j.checklist.filter(x=>selected.includes(x)),minutes=optionalNumber(data.minutes,'Minutes worked',10000);
      const values={status,completed,minutes,findings:note(data.findings),ack:note(data.ack),remarks:note(data.remarks)};
      if(status==='Completed'){
        ensure(completed.length===j.checklist.length&&minutes>0&&values.ack&&values.findings,'Finish the checklist and enter time, findings and customer acknowledgment.');
        values.finished=today;
      }
      target=update(j,values);break;
    }
    case 'milestone.create': {
      const p=projectOf(data.projectId);
      target=make('milestone',{name:field(data.name,'Milestone name'),parentId:p.id,projectId:p.id,amount:money(data.amount,'Milestone value',p.currency),due:validDate(data.due,'expected claim date'),criteria:field(data.criteria,'Completion or certification criteria'),currency:p.currency});break;
    }
    case 'claim.create': {
      const p=projectOf(data.projectId),m=data.milestoneId?get(data.milestoneId,'milestone'):null;
      if(m) ensure(m.projectId===p.id&&!list('claim').some(x=>x.milestoneId===m.id&&x.status!=='Cancelled'),'This milestone already has an open claim or belongs to another project.');
      const amount=m?.amount??money(data.amount,'Claim amount',p.currency);
      ensure(amount>0,'Claim must be positive.');
      const prior=list('claim').filter(c=>c.projectId===p.id&&c.status!=='Cancelled').reduce((s,c)=>s+(c.certified??c.amount),0);
      ensure(roundMoney(prior+amount,p.currency)<=roundMoney(projectPosition([...byId.values()],p).value,p.currency),'Claims would exceed the approved contract value.');
      target=make('claim',{code:next('claim','CL'),name:field(data.name,'Claim title'),projectId:p.id,parentId:m?.id??p.id,milestoneId:m?.id,amount,currency:p.currency,retention:p.retention,status:'Draft',evidence:field(data.evidence,'Approved progress reference')});break;
    }
    case 'claim.transition': {
      const c=get(data.id,'claim'),edges={Draft:['Submitted','Cancelled'],Submitted:['Certified','Disputed','Cancelled'],Disputed:['Submitted','Cancelled']};
      const status=choose(data.status,edges[c.status]??[],'next claim status');
      const values={status,reason:field(data.reason,'Submission, certification or dispute reference')};
      if(status==='Submitted')values.submitted=today;
      if(status==='Certified'){values.certified=money(data.certified,'Certified amount',c.currency);ensure(values.certified>0&&values.certified<=c.amount,'Certified amount must be positive and within the claim.');values.certifiedOn=today;}
      target=update(c,values);break;
    }
    case 'invoiceProfile.update':
    case 'invoice.draft':case 'invoice.edit':case 'invoice.issue':case 'invoice.void':
      target=applyInvoiceOperation([...byId.values()],actor,action,data,demo,today,{make,update,get,next,settings});break;
    case 'invoice.create': {
      const c=get(data.claimId,'claim');
      ensure(c.status==='Certified'&&!list('invoice').some(x=>x.claimId===c.id),'A certified claim may be invoiced once.');
      const amount=roundMoney(c.certified*(1-c.retention/100),c.currency);
      ensure(amount>0,'Certified amount after retention must be positive.');
      const reference=field(data.reference,'Accounting invoice reference');
      ensure(!list('invoice').some(x=>x.reference?.toLowerCase()===reference.toLowerCase()),'This accounting invoice reference already exists.');
      target=make('invoice',{name:c.name,code:next('invoice','INV'),projectId:c.projectId,parentId:c.id,claimId:c.id,amount,currency:c.currency,reference,due:validDate(data.due,'payment due date'),status:'Issued'});break;
    }
    case 'invoice.pay': {
      const i=get(data.invoiceId,'invoice');ensure(receivableInvoice(i),'Only issued invoices accept payments.');const amount=money(data.amount,'Payment amount',i.currency),reference=field(data.reference,'Bank or receipt reference');
      ensure(amount>0&&amount<=invoiceBalance([...byId.values()],i).outstanding,'Payment must be positive and within the invoice balance.');
      ensure(!list('payment').some(x=>x.invoiceId===i.id&&x.reference.toLowerCase()===reference.toLowerCase()),'This reference has already been recorded for the invoice.');
      target=make('payment',{code:next('payment','PAY'),parentId:i.id,projectId:i.projectId,invoiceId:i.id,amount,currency:i.currency,reference,date:validDate(data.date,'payment date')});
      ensure(target.date<=today,'An actual payment date cannot be in the future.');break;
    }
    case 'invoice.reverse': {
      const p=get(data.id,'payment');
      ensure(p.amount>0&&!list('payment').some(x=>x.reverses===p.id),'This payment cannot be reversed again.');
      target=make('payment',{code:next('payment','PAY'),parentId:p.invoiceId,projectId:p.projectId,invoiceId:p.invoiceId,amount:-p.amount,currency:p.currency,
        reference:field(data.reason,'Reversal reason'),reverses:p.id});break;
    }
    case 'cash.update': {
      const type=choose(data.type,['Opening cash','Payroll','Loan repayment','Other inflow','Other outflow'],'cash entry type');
      const amount=money(data.amount,'Cash amount',settings.currency),due=validDate(data.due,'cash date');
      target=type==='Opening cash'?update(settings,{cashOpening:{amount,date:due}}):make('cash',{name:field(data.name,'Cash entry reference'),type,amount,due,currency:settings.currency});break;
    }
    case 'settings.update': {
      const currency=curr(data.currency);
      if(currency!==settings.currency) ensure(!list('cash').length&&!settings.cashOpening,'Clear or reconcile existing cash inputs before changing the reporting currency.');
      target=update(settings,{name:field(data.name,'Company name'),address:note(data.address),email:note(data.email),currency,tax:optionalNumber(data.tax,'Default tax',100),
        minMargin:optionalNumber(data.minMargin,'Minimum margin',95),cashLimit:money(data.cashLimit,'Cash exposure limit',currency),purchaseLimit:money(data.purchaseLimit,'Purchase limit',currency),
        priceDays:numeric(data.priceDays,'Price verification age',1,3650),agingDays:numeric(data.agingDays,'Inventory aging threshold',1,3650),renewalDays:numeric(data.renewalDays,'Renewal alert days',1,365),
        fxRate:data.fxRate?numeric(data.fxRate,'KHR per USD',1,100000):null,fxDate:data.fxRate?validDate(data.fxDate,'exchange rate date'):null});break;
    }
    case 'personnel.edit':
    case 'personnel.roles':
    case 'personnel.approvals': {
      ensure(actor.personnelAdmin||!actor.previewEmployeeId&&action==='personnel.roles'&&has(actor,'director'),'Only the authenticated directory administrator or MD can manage these assignments.',403);
      const employee=get(data.id,'personnel'),reason=field(data.reason,'Change reason or authorization reference',500);
      if(action==='personnel.edit'){
        target=update(employee,{position:field(data.position,'Position'),department:note(data.department,220),team:note(data.team,220),
          reviewResolved:data.reviewResolved===true,personnelReason:reason});
      } else if(action==='personnel.roles'){
        const assigned=Array.isArray(data.roles)?[...new Set(data.roles)]:[];
        ensure(assigned.every(role=>roles.includes(role)),'Select valid permission profiles.');
        ensure(demo||has(actor,'director')||JSON.stringify(assigned.filter(r=>['director','finance'].includes(r)).sort())===JSON.stringify(employee.roles.filter(r=>['director','finance'].includes(r)).sort()),'Only the Managing Director can change protected financial permission profiles.',403);
        const valid=eligibleApprovals(assigned);
        target=update(employee,{roles:assigned,approvals:employee.approvals.filter(key=>valid.includes(key)),personnelReason:reason});
      } else {
        const approvals=Array.isArray(data.approvals)?[...new Set(data.approvals)]:[];
        ensure(approvals.every(key=>eligibleApprovals(employee.roles).includes(key)),'Approval grants must match the employee’s assigned permission profiles.');
        target=update(employee,{approvals,personnelReason:reason});
      }
      break;
    }
    case 'employee.upsert': {
      ensure(!demo,'Employee access is configured in the team environment.');
      const employees=list('employee'),selected=data.id?get(data.id,'employee'):null;
      const email=String(data.email??selected?.email??'').trim().toLowerCase();
      ensure(!email||(email.length<=254&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)),'Enter a valid sign-in email.');
      const prior=selected||(email?employees.find(x=>x.email===email):null);
      ensure(!data.create||!prior,'This sign-in email is already registered.',409);
      ensure(!prior?.removedOn,'Restore this employee before editing the account.',409);
      ensure(canManageEmployee(actor,prior),'Your role cannot manage this employee account.',403);
      ensure(!email||!employees.some(x=>x.id!==prior?.id&&(x.email===email||x.formerSignInEmails?.includes(email))),
        'This sign-in email is assigned to another employee or their account history.',409);
      const employeeId=String(data.employeeId??prior?.employeeId??'').trim();
      ensure(employeeId.length<=100,'Enter an employee ID of up to 100 characters.');
      ensure(!employeeId||!employees.some(x=>x.id!==prior?.id&&x.employeeId===employeeId),'This employee ID is already registered.',409);
      const requested=data.roles??prior?.roles??[];
      const assigned=[...new Set(Array.isArray(requested)?requested:[requested])];
      ensure(assigned.every(role=>roles.includes(role)),'Select valid employee roles.');
      ensure(assigned.every(role=>employeeRoleChoices(actor).includes(role)),'Your role cannot assign one or more selected permission profiles.',403);
      ensure(!assigned.includes('admin')||assigned.length===1,'Use a separate account for Platform Administrator access.');
      const active=data.active??prior?.active??Boolean(email);
      ensure(typeof active==='boolean','Choose an access status.');
      ensure(!active||(email&&assigned.length),'Active access requires a sign-in email and at least one role.');
      ensureDirectorCoverage(actor,employees,prior,active,assigned);
      const values={name:field(data.name??prior?.name,'Employee name'),email,roles:assigned,active,employeeId,
        position:note(data.position??prior?.position,220),department:note(data.department??prior?.department,150),team:note(data.team??prior?.team,150),
        jobFunctions:note(data.jobFunctions??prior?.jobFunctions),accessReason:note(data.reason,500)};
      if(prior?.email&&prior.email!==email){
        values.identityEmail=prior.identityEmail||prior.email;
        values.formerSignInEmails=[...new Set([...(prior.formerSignInEmails??[]),prior.email])].filter(value=>value!==email);
      }
      target=prior?update(prior,values):make('employee',values);break;
    }
    case 'employee.remove':
    case 'employee.restore': {
      ensure(!demo,'Employee access is configured in the team environment.');
      const employee=get(data.id,'employee');
      ensure(canManageEmployee(actor,employee),'Your role cannot manage this employee account.',403);
      const reason=field(data.reason,'Reason',500);
      if(action==='employee.remove'){
        ensure(!employee.removedOn,'This employee has already been removed.',409);
        ensureDirectorCoverage(actor,list('employee'),employee,false,employee.roles);
        target=update(employee,{active:false,removedOn:today,accessReason:reason});
      }else{
        ensure(employee.removedOn,'Select a removed employee to restore.',409);
        target=update(employee,{active:false,removedOn:null,accessReason:reason});
      }
      break;
    }
    case 'master.import': {
      const input=choose(data.type,['client','supplier','material','project','contract','employee','opening'],'import type');
      ensure(!actor.platformAdmin||input==='employee','Platform Administrators can import employee accounts only.',403);
      const actions={client:'client.create',supplier:'supplier.create',material:'material.create',project:'project.create',contract:'contract.create',employee:'employee.upsert'};
      const source=field(data.source,'Source filename');
      ensure(Array.isArray(data.entries)&&data.entries.length>0&&data.entries.length<=100,'Confirm between 1 and 100 rows per import.');
      const errors=[];
      let cutoff;
      if(input==='opening'){
        cutoff=validDate(data.cutoff,'verified stock cutoff date');
        ensure(cutoff<=today,'The stock cutoff date cannot be in the future.');
      }
      for(const [index,entry] of data.entries.entries()){
        try{
          if(input==='opening'){
            const m=list('material').find(x=>x.code===String(entry.materialCode).trim().toUpperCase());
            const w=list('warehouse').find(x=>x.code===String(entry.warehouseCode).trim().toUpperCase());
            ensure(m&&w,'Match the existing material and warehouse codes.');
            ensure(!list('movement').some(x=>x.materialId===m.id&&x.warehouseId===w.id),'This location already has a stock ledger. Record a physical count instead.');
            const quantity=quantityOf(entry.quantity),cost=money(entry.cost,'Verified unit cost',m.currency);
            make('movement',{type:'Opening',materialId:m.id,parentId:m.id,warehouseId:w.id,quantity,delta:quantity,cost,currency:m.currency,date:cutoff,reason:source,opening:true});
          }else{
            const values={...entry};
            if(input==='project'||input==='contract'){
              const c=list('client').find(x=>x.name.toLowerCase()===String(entry.clientName??'').trim().toLowerCase());
              ensure(c,'Match the name of an existing client.');
              values.clientId=c.id;
              if(actor.privateWorkspace){
                const fields=input==='project'?['manager']:['supervisor','technician'];
                for(const key of fields){
                  const matches=list('personnel').filter(row=>row.name.toLowerCase()===String(entry[key]??'').trim().toLowerCase());
                  ensure(matches.length===1,'Match the '+key+' to one employee by official English name.');
                  values[key+'EmployeeId']=matches[0].id;
                }
              }
            }
            if(input==='employee'){
              values.create=true;
              values.active=entry.active===true;
              values.roles=String(entry.roles??'').split(/[;,|]/).map(x=>x.trim()).filter(Boolean);
            }
            if(input==='material'&&entry.supplierName){
              const supplier=list('supplier').find(x=>x.name.toLowerCase()===String(entry.supplierName).trim().toLowerCase());
              ensure(supplier,'Match the name of an existing supplier.');
              values.supplierId=supplier.id;
            }
            // The outer import permission authorizes these validated batch writes.
            const outcome=applyAuthorizedOperation([...byId.values()],actor,actions[input],values,demo,today);
            outcome.changes.forEach(write);
          }
        }catch(error){if(!(error instanceof DomainError))throw error;errors.push('Row '+(index+1)+': '+error.message);}
      }
      ensure(!errors.length,errors.slice(0,12).join(' ')+(errors.length>12?' '+(errors.length-12)+' more errors.':''));
      target=make('importLog',{name:source,type:input,count:data.entries.length,cutoff});
      break;
    }
    case 'folder.create': {
      const parentId=data.parentId?String(data.parentId):null;
      if(parentId)ensure(get(parentId,'folder').createdBy===actor.id,'Select a folder in My folders.',404);
      const name=field(data.name,'Folder name',120);
      ensure(name!=='.'&&name!=='..'&&!/[\\/\\\\\u0000-\u001f]/.test(name),'Enter a folder name without slashes or control characters.');
      ensure(!list('folder').some(folder=>folder.createdBy===actor.id&&folder.parentId===parentId&&folder.name.toLowerCase()===name.toLowerCase()),
        'A folder with that name already exists here.',409);
      target=make('folder',{name,parentId});
      break;
    }
    case 'document.store': {
      const folder=get(data.parentId,'folder');
      ensure(folder.createdBy===actor.id,'Select a folder in My folders.',404);
      target=make('document',{name:field(data.name,'Filename'),parentId:folder.id,parentKind:'folder',key:data.key,size:data.size,type:data.type});
      break;
    }
    case 'document.attach': {
      const parent=byId.get(data.parentId);
      const byKind={client:'clients',project:'clients',tender:'tenders',quote:'quotes',request:'procurement',requisition:'procurement',po:'procurement',contract:'maintenance',agreement:'maintenance',mail:'mail',job:'maintenance',claim:'billing',invoice:'billing'};
      ensure(parent&&byKind[parent.kind]&&(viewAccess(actor).includes('*')||viewAccess(actor).includes(byKind[parent.kind])), 'Select an accessible document record.',403);
      if(parent.kind==='job'&&!has(actor,'admin','maintenance')&&!demo) ensure(employeeMatchesEmail(actor,parent.technicianEmail),'This service visit is assigned to another technician.',403);
      target=make('document',{name:field(data.name,'Filename'),parentId:parent.id,projectId:parent.kind==='project'?parent.id:parent.projectId,parentKind:parent.kind,key:data.key,size:data.size,type:data.type});break;
    }
    default: throw new DomainError('Unknown operation.',400);
  }
  return {target,changes:[...changes.values()]};
}

function ensureDirectorCoverage(actor,employees,prior,active,assigned){
  if(actor.platformAdmin||!prior?.active||!prior.roles.includes('director')||(active&&assigned.includes('director')))return;
  ensure(employees.some(x=>x.id!==prior.id&&x.active&&!x.removedOn&&x.roles.includes('director')&&!x.roles.includes('admin')),
    'Activate another Managing Director before removing access for the last active one.',409);
}

export function reportData(rows,today=dateOffset()) {
  const settings=rows.find(x=>x.kind==='settings');
  const types=kind=>rows.filter(x=>x.kind===kind);
  const reporting=items=>items.filter(x=>x.currency===settings.currency);
  const alerts=[];
  const alert=(category,title,detail,priority,id,view)=>alerts.push({category,title,detail,priority,id,view});
  const projects=types('project').filter(x=>['Awarded','Active','On Hold'].includes(x.status));
  const tenders=types('tender').filter(x=>!['Submitted','Awarded','Lost','Cancelled','Do Not Bid'].includes(x.status));
  for(const t of tenders){const d=dayGap(today,t.due);if(d<=14)alert('Tenders',t.name,d<0?'Tender deadline passed':'Tender due '+t.due,d<=3?'High':'Medium',t.id,'tenders');}
  for(const q of types('quote').filter(x=>x.status==='Internal Review')) alert('Quotations',q.name,'Awaiting quotation approval','Medium',q.id,'quotes');
  for(const po of types('po').filter(x=>['Ordered','Partially Received'].includes(x.status)&&x.due<today)) alert('Procurement',po.name,'Supplier delivery overdue','High',po.id,'procurement');
  for(const i of types('invoice').filter(receivableInvoice)) { const b=invoiceBalance(rows,i); if(b.outstanding>0&&i.due<today) alert('Collections',i.name,dayGap(i.due,today)+' days overdue','High',i.id,'billing'); }
  for(const c of types('claim').filter(x=>['Draft','Submitted','Disputed'].includes(x.status))) alert('Billing',c.name,c.status==='Submitted'?'Awaiting certification':c.status==='Draft'?'Claim awaiting submission':'Claim under dispute','Medium',c.id,'billing');
  for(const m of types('material')) {const b=availableStock(rows,m.id);if(b.onHand<=m.minimum)alert('Inventory',m.name,b.onHand+' '+m.unit+' on hand, minimum '+m.minimum,'Medium',m.id,'inventory');}
  for(const c of types('contract').filter(x=>x.status==='Active'&&dayGap(today,x.end)<=settings.renewalDays))alert('Maintenance',c.name,'Renewal due '+c.end,'Medium',c.id,'maintenance');
  for(const j of types('job').filter(x=>x.status!=='Completed'&&x.scheduled<today))alert('Maintenance',j.name,'Visit overdue since '+j.scheduled,'High',j.id,'maintenance');
  for(const p of projects) { const f=projectPosition(rows,p);if(f.forecast>f.budget||f.margin<settings.minMargin)alert('Projects',p.name,'Forecast cost or margin exceeds policy','High',p.id,'projects'); }
  const invoices=reporting(types('invoice').filter(receivableInvoice));
  const current={outstanding:0,overdue:0};
  invoices.forEach(i=>{const b=invoiceBalance(rows,i);current.outstanding+=b.outstanding;if(i.due<today)current.overdue+=b.outstanding;});
  const since=addDays(today,-6),week=x=>x.date>=since&&x.date<=today;
  const summary={quotes:types('quote').filter(week).length,tenders:types('tender').filter(week).length,awards:projects.filter(week).length,
    billed:invoices.filter(week).reduce((s,x)=>s+x.amount,0),collected:reporting(types('payment')).filter(week).reduce((s,x)=>s+x.amount,0),
    jobs:types('job').filter(x=>x.status==='Completed'&&x.finished>=since&&x.finished<=today).length};
  let forecastBalance=settings.cashOpening?.date===today?settings.cashOpening.amount:null;
  const weeks=Array.from({length:13},(_,i)=>{
    const start=addDays(today,i*7),end=addDays(start,6),includes=d=>d&&d<=end&&(i===0||d>=start);
    const collections=invoices.filter(x=>includes(x.due)).reduce((s,x)=>s+invoiceBalance(rows,x).outstanding,0);
    const procurement=reporting(types('po')).filter(x=>['Ordered','Partially Received'].includes(x.status)&&includes(x.due)).reduce((s,x)=>s+(x.quantity-x.received)*x.price,0);
    const manual=reporting(types('cash')).filter(x=>includes(x.due));
    const otherIn=manual.filter(x=>x.type==='Other inflow').reduce((s,x)=>s+x.amount,0),otherOut=manual.filter(x=>x.type!=='Other inflow').reduce((s,x)=>s+x.amount,0);
    const net=collections+otherIn-procurement-otherOut;
    if(forecastBalance!==null)forecastBalance+=net;
    return {start,end,collections,procurement,otherIn,otherOut,net,balance:forecastBalance};
  });
  return {today,currency:settings.currency,alerts:alerts.sort((a,b)=>Number(b.priority==='High')-Number(a.priority==='High')),activeProjects:projects.length,openTenders:tenders.length,...current,summary,weeks};
}
