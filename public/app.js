import { findActionControl } from './actions.js';
import { hasFinanceAccess, financeAction, invoiceProfile, invoiceTotals } from '../server/finance.js';
import { quoteClientItems } from '../server/documents.js';
import { createRoleSession, roleHome } from './role-session.js';
import { initLocalization, translate as t, translateInterface, getLanguage, languageControl } from './localization.js';
import { initPwa, promptInstall, installHelp, applyAppUpdate } from './pwa.js';
import { mailboxes, cleanMailHtml } from '../server/mail-model.js';
import { approvalFor, actionAccess, viewAccess, serviceTypes, agreementSections, agreementDefaults, templateReviewFindings, employeeRoleChoices, canManageEmployee } from '../server/domain.js';
import { planningPriorities, planningStatuses } from './role-planning.js';
import {icon} from './icons.js';
import {decisionRights,operatingUnits,serviceWorkflows} from './operating-model.js';
import {readBoq,propose,mapBoq,fields as boqFields,pdfText} from './boq.js';
import { masterImports, masterImportTemplate, mapMasterHeaders, guessMasterHeader } from './master-import.js';

initLocalization();
initPwa();

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=value=>e(value);
const storage={get(key){try{return sessionStorage.getItem(key);}catch{return null;}},set(key,value){try{sessionStorage.setItem(key,value);}catch{}}};
const nav=[
  ['Overview',[['home','Home','grid'],['roles','Roles & PICs','people'],['structure','Operating structure','branch']]],
  ['Commercial & Design',[['clients','Clients & Projects','people'],['tenders','Tenders & Bidding','target'],['materials','Material Prices','box'],['quotes','Quotations & Estimates','blueprint']]],
  ['Project & Service Delivery',[['projects','Project Operations','building'],['maintenance','Maintenance Services','tool']]],
  ['Procurement & Logistics',[['procurement','Procurement','cart'],['inventory','Inventory','box']]],
  ['Finance & Support',[['hr','HR & Employees','people'],['team-employees','Employees','people'],['billing','Billing & Collections','wallet'],['reports','Reports','chart'],['mail','Email','mail'],['documents','Documents','folder'],['settings','Settings','settings']]],
];
const platformNav=[['Administration',[
  ['home','Admin dashboard','grid'],['platform-users','User management','people'],
  ['platform-settings','Admin settings','settings'],['platform-activity','Activity logs','clipboard'],
]]];
const navMap=Object.fromEntries([...platformNav,...nav].flatMap(([,entries])=>entries.map(([k,t,i])=>[k,{t,i}])));
navMap.employees={t:'Settings / Employees',i:'people'};
navMap.roles={t:'Settings / Roles',i:'settings'};
const roleLabels={admin:'Platform Administrator',director:'Managing Director',manager:'Business Manager',mep:'Head of MEP',estimator:'Engineering & Estimation',project:'Project Manager',procurement:'Procurement',warehouse:'Stock Controller',maintenance:'Maintenance Supervisor',technician:'Maintenance Technician',finance:'Accounting & Finance Manager',hr_head:'HR Department Head',adminSupport:'HR & Administration',auditor:'Read-Only Auditor',installation_lead:'Installation Lead',installation_technician:'Installation Technician',maintenance_lead:'Maintenance Team Leader',logistics:'Logistics'};
const demoRoleChoices=Object.entries(roleLabels).filter(([role])=>role!=='hr_head');
const roleLabel=r=>roleLabels[r]??r;
const kindView={mail:'mail',client:'clients',project:'projects',tender:'tenders',quote:'quotes',supplier:'procurement',request:'procurement',requisition:'procurement',po:'procurement',material:'inventory',movement:'inventory',count:'inventory',contract:'maintenance',agreement:'maintenance',dispatch:'documents',job:'maintenance',claim:'billing',invoice:'billing',folder:'documents',document:'documents',personnel:'employees',task:'projects'};
const kindLabels={mail:'Email',requisition:'Purchase requisition',client:'Client',project:'Project',tender:'Tender',quote:'Quotation',supplier:'Supplier',request:'Requisition',po:'Purchase order',material:'Material',movement:'Stock movement',count:'Stock count',contract:'Service contract',agreement:'Service agreement',dispatch:'Client email',job:'Service visit',claim:'Progress claim',invoice:'Invoice',document:'Attachment',variation:'Variation',milestone:'Billing milestone',payment:'Payment',requirement:'Material requirement',offer:'Supplier offer',employee:'Employee',progress:'Progress update',warehouse:'Warehouse',personnel:'Employee',task:'Project task'};
const state={mailFolder:'inbox',mailbox:'',mailSelected:'',mailQuery:'',clientFilter:'all',view:'home',queue:'All items',data:null,role:storage.get('teams-demo-role')||'admin',picId:storage.get('teams-demo-pic')||'',planRole:'mep',mobile:false,error:null,previewId:'',service:'contracting',stage:0,unit:'engineering',accountSearch:'',accountStatus:'current',documentFolder:'',employeeFilters:{search:'',department:'',role:'',review:''}};
const permissions=()=>state.data?.permissions??['*'];
const isPlatform=()=>state.data?.actor.platformAdmin===true;
const isPrivate=()=>state.data?.privateWorkspace===true;
const namedAssignments=()=>state.data?.namedAssignments===true;
const demoEmployee=()=>state.data?.actor.previewEmployeeId||
  (state.data?.people?.some(person=>person.id==='demo-person:'+state.role)?'demo-person:'+state.role:'');
const show=key=>{
  if(!state.data)return key==='home';
  if(isPlatform())return permissions().includes(key);
  if(['billing','reports'].includes(key)&&!hasFinanceAccess(state.data?.actor))return false;
  if(key==='hr')return state.data?.publicDemo===true&&hasRole('admin','adminSupport');
  if(key==='materials')return hasRole('admin','estimator','mep','manager','director','project','procurement','auditor');
  if(key==='structure')return state.data?.publicDemo===true;
  if(['employees','roles'].includes(key))return state.data?.publicDemo===true||state.data?.actor.personnelAdmin===true;
  return permissions().includes('*')||permissions().includes(key);
};
const hasRole=(...roles)=>state.data?.actor.roles.some(r=>roles.includes(r));
const can=(action,stage)=>{
  const profile=state.data?.actions??[],required=approvalFor(action,stage);
  return (!financeAction(action)||hasFinanceAccess(state.data?.actor))&&(profile.includes('*')||profile.includes(action))&&(!state.data?.actor.previewEmployeeId||!required||state.data.actor.approvals.includes(required));
};
const data=()=>state.data?.records??[];
const rows=kind=>data().filter(r=>r.kind===kind);
const rec=id=>data().find(r=>r.id===id);
const settings=()=>rec('settings')??{};
const today=()=>state.data?.report?.today??new Date().toISOString().slice(0,10);
const offset=days=>{const d=new Date(today()+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
const amount=(value,currency=settings().currency,compact=false)=>{
  if(value==null||!Number.isFinite(Number(value)))return '—';
  const number=new Intl.NumberFormat('en-US',{maximumFractionDigits:compact?0:currency==='KHR'?0:2,minimumFractionDigits:compact||currency==='KHR'?0:2}).format(value);
  return currency==='USD'?'$'+number:currency==='KHR'?number+' KHR':number;
};
const formatDate=(value,extended=false)=>{
  if(!value)return '—';
  return new Intl.DateTimeFormat(getLanguage()==='km'?'km-KH':'en-GB',{day:'numeric',month:extended?'long':'short',...(extended?{year:'numeric',weekday:'short'}:{}),timeZone:'UTC'}).format(new Date(value.slice(0,10)+'T00:00:00Z'));
};
const rawName=r=>r?.name||r?.reference||r?.code||'Record';
const name=id=>e(rawName(rec(id)));
const rawCode=r=>r?.code||'';
const qty=n=>Number(n??0).toLocaleString('en-US',{maximumFractionDigits:3});
const pct=n=>n==null?'—':Number(n).toFixed(1)+'%';
const tone=status=>{
  if(/^(Active|Approved|Accepted|Awarded|Received|Completed|Certified|Paid|Low|Usable|Closed|Proceed to Bid)$/.test(status))return 'green';
  if(/^(Overdue|High|Rejected|Cancelled|Disputed|Do Not Bid|Lost|Expired|Damaged)$/.test(status))return 'red';
  if(/^(Medium|Pending|Internal Review|Pending Review|Partially Received|On Hold|Requires Management Review|Bid with Conditions|Reviewed)$/.test(status))return 'amber';
  if(/^(Submitted|Sent|Scheduled|In Progress|Ordered|Estimating|Under Evaluation|Issued|Requested|Outstanding)$/.test(status))return 'blue';
  return '';
};
const status=v=>'<span class="status '+tone(v)+'">'+e(v||'—')+'</span>';
const button=(label,cmd,opts={})=>'<button type="button" class="btn '+(opts.primary?'primary ':'')+(opts.small?'small ':'')+(opts.danger?'danger':'')+'" data-'+(opts.attr||'cmd')+'="'+A(cmd)+'">'+(opts.icon?icon(opts.icon,16):'')+e(label)+'</button>';
const go=(label,view)=>'<button type="button" class="link-btn" data-view="'+A(view)+'">'+e(label)+icon('arrow',15)+'</button>';
const openLink=(label,id)=>'<button type="button" class="link-btn" data-open="'+A(id)+'">'+e(label)+'</button>';
const recordCell=(r,sub='')=>'<div class="primary-cell"><button data-open="'+A(r.id)+'" type="button">'+e(rawName(r))+'</button>'+(sub?'<small>'+e(sub)+'</small>':'')+'</div>';
const num=value=>({html:e(value),cls:'num'});
const cell=value=>typeof value==='object'&&value!==null?'<td class="'+(value.cls??'')+'" data-label="'+A((value.label||'').replace(/^~/,''))+'">'+value.html+'</td>':'<td>'+value+'</td>';
const table=(columns,records,build,empty='No records yet.')=>records.length?'<div class="table-scroll"><table class="table"><thead><tr>'+columns.map(t=>'<th scope="col"'+(t.startsWith('~')?' class="num"':'')+'>'+e(t.replace(/^~/,''))+'</th>').join('')+'</tr></thead><tbody>'+records.map(r=>'<tr>'+build(r).map((value,i)=>cell(typeof value==='object'&&value!==null?{...value,label:columns[i]}:{html:value,label:columns[i]})).join('')+'</tr>').join('')+'</tbody></table></div>':'<p class="empty">'+e(empty)+'</p>';
const block=(title,content,actions='')=>'<section class="card"><div class="section-toolbar"><h2>'+e(title)+'</h2><div class="actions">'+actions+'</div></div>'+content+'</section>';
const page=(title,description,actions,content)=>'<div class="page-head"><div><h1>'+e(title)+'</h1><p>'+e(description)+'</p></div><div class="actions">'+actions+'</div></div><div class="section-stack">'+content+'</div>';
const details=pairs=>'<dl class="details">'+pairs.filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v,html])=>'<div><dt>'+e(k)+'</dt><dd'+(html||['Permission profiles','Roles','Approval grants','Review status','Service model','Employment group','Login account'].includes(k)?'':' data-no-translate')+'>'+(html?v:e(v))+'</dd></div>').join('')+'</dl>';
const panel=(title,content)=>'<section class="detail-card"><h3>'+e(title)+'</h3><div class="content">'+content+'</div></section>';
const fieldsButton=(action,label,opts={})=>can(action)?button(label,action,opts):'';
const actionButton=(action,label,id,options={})=>can(action)?button(label,action+'|'+(id??''),{small:true,...options}):'';
const exportButton=(label,kind,id,format='pdf',internal=false)=>button(label,[kind,id??'',format,internal?'1':'0'].join('|'),{attr:'export',small:true,icon:'download'});
const documentButton=(r)=>can('document.attach')?actionButton('document.attach','Attach file',r.id,{icon:'upload'}):'';
const linksTo=(kind,projectId)=>rows(kind).filter(r=>r.projectId===projectId);
const projectOptions=()=>rows('project').map(x=>[x.id,x.code+' · '+x.name]);
const materialOptions=()=>rows('material').map(x=>[x.id,x.code+' · '+x.name]);
const optionRows=(kind,filter=()=>true)=>rows(kind).filter(filter).map(x=>[x.id,(x.code?x.code+' · ':'')+rawName(x)]);
const join=(...chunks)=>chunks.filter(Boolean).join('');
const sorted=(records,key='date',desc=true)=>[...records].sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(desc?-1:1));
const meter=n=>'<span class="meter"><span class="meter-track"><i style="width:'+Math.max(0,Math.min(100,Number(n)||0))+'%"></i></span>'+e(qty(n))+'%</span>';

let demoTransport,modeReady=false,publicMode=false;
async function detectMode(){
  const response=await fetch('/api/mode');
  if(!response.ok)throw Error('Workspace configuration could not be loaded.');
  publicMode=(await response.json()).publicDemo;
  if(publicMode) {
    const {createDemoTransport}=await import('./demo.js');
    demoTransport=createDemoTransport();
  }
  modeReady=true;
}
async function api(path,opts={}){
  const headers=new Headers(opts.headers);
  headers.set('X-Teams-Demo-Role',opts.demoRole??state.role);delete opts.demoRole;
  if(!publicMode&&state.previewId)headers.set('X-Teams-Preview-Employee',state.previewId);
  if(opts.json){headers.set('Content-Type','application/json');opts.body=JSON.stringify(opts.json);delete opts.json;}
  let response;
  try{response=await (demoTransport||fetch)(path,{...opts,headers});}
  catch(error){if(!demoTransport&&error instanceof TypeError)throw Error('Connection unavailable. Reconnect, refresh the record and retry. There is no automatic offline resubmission.');throw error;}
  if(!response.ok){
    let message='Request failed ('+response.status+').';
    try{message=(await response.json()).error||message;}catch{}
    throw Error(message);
  }
  return response;
}
const roleSession=createRoleSession({state,fetchState:async role=>(await api('/api/state',{demoRole:role})).json(),people:role=>rolePeople(role),persist:(role,picId)=>{storage.set('teams-demo-role',role);storage.set('teams-demo-pic',picId);}});
async function readState(){return roleSession.read();}
async function refresh(){try{if(!modeReady)await detectMode();await readState();render();}catch(error){state.error=error.message;render();}}
let toastTimer;
function toast(message,error=false){
  const bar=$('#toast');bar.className='toast'+(error?' error':'');bar.textContent=message;bar.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>bar.hidden=true,4500);
}
function navigate(view){
  if(!navMap[view]||!show(view))return;
  state.view=view;state.mobile=false;
  if(location.hash!=='#'+view)history.pushState({view},'', '#'+view);
  render();window.scrollTo(0,0);
}
function sidebar(){
  const smallScreen=matchMedia('(max-width:850px)').matches;
  $('#sidebar').inert=smallScreen&&!state.mobile;
  $('.workspace').inert=smallScreen&&state.mobile;
  document.documentElement.classList.toggle('nav-open',smallScreen&&state.mobile);
  $('#sidebar').classList.toggle('open',state.mobile);
  $('#nav-scrim').hidden=!state.mobile;
  $$('[data-cmd=mobile]').forEach(control=>{control.setAttribute('aria-expanded',String(state.mobile));control.setAttribute('aria-controls','sidebar');});
  $('#sidebar').innerHTML='<div class="brand"><button type="button" class="brand-home" data-view="home" aria-label="TEAMS Operations home"><img src="/assets/teams-wordmark.webp" alt="TEAMS" width="150" height="40"><span>ENGINEERING OPERATIONS</span></button></div><nav class="nav">'+(isPlatform()?platformNav:nav).map(([group,entries])=>{
    const available=entries.filter(([key])=>show(key));
    return available.length?'<div class="nav-group">'+e(group.toUpperCase())+'</div>'+available.map(([key,title,i])=>'<button type="button" data-view="'+key+'" '+((state.view===key||(key==='settings'&&['employees','roles'].includes(state.view)))?'class="current" aria-current="page"':'')+'>'+icon(i,17)+e(title)+'</button>').join(''):'';
  }).join('')+'</nav><div class="sidebar-foot">'+icon('layers',16)+'<span>TEAMS Operations <strong>V1</strong></span></div>';
}
function topbar(){
  const actor=state.data?.actor;
  const pic=activePic();
  const initials=state.data?.demoRoles.length?'TE':(actor?.name||actor?.email||'TE').slice(0,2).toUpperCase();
  const title=isPlatform()&&state.view==='home'?'Admin dashboard':navMap[state.view]?.t||'Home';
  const search='<label class="search">'+icon('search',17)+'<input id="search" type="search" placeholder="Search records..." aria-label="Search records" autocomplete="off"><div id="search-results" class="search-results" hidden></div></label>';
  const exceptions='<button type="button" class="icon-btn notify" data-cmd="alerts" aria-label="View exceptions">'+icon('bell',17)+'</button>';
  $('#topbar').innerHTML='<button type="button" class="icon-btn mobile-menu" data-cmd="mobile" aria-label="Toggle navigation">'+icon('menu',19)+'</button><div class="crumb"><span>'+e(isPlatform()?'Administration':'Workspace')+'</span>'+icon('right',13)+'<b>'+e(title)+'</b></div><div class="top-right">'+languageControl()+'<button type="button" class="icon-btn install-shortcut" data-cmd="pwa.install" aria-label="Install app">'+icon('download',18)+'</button>'+(isPlatform()?'':search+exceptions)+'<button type="button" class="profile" data-cmd="profile" aria-label="Account and role"><span class="avatar">'+e(initials)+'</span><span><span class="name">'+e(pic?.name||(state.data?.demoRoles.length?'TEAMS Demo':actor?.name||'Account'))+'</span><small>'+e(actor?roleLabel(actor.roles[0]):'')+'</small></span>'+icon('down',14)+'</button></div>';
}
function demoBar(){
  if(isPrivate())return '<div class="demo-bar"><span class="dot"></span><strong>'+(state.previewId?'Employee preview':'Private demo')+'</strong><span class="text">'+(state.previewId?'Operational actions use the selected employee’s permissions.':'Authorized access to named employees and operational assignments.')+'</span>'+(state.previewId?'<button data-cmd="preview.exit" type="button">Return to administrator</button>':'')+'</div>';
  return state.data.demoRoles.length?'<div class="demo-bar"><span class="dot"></span><strong>'+(state.data.publicDemo?'Public demo':'Demo workspace')+'</strong><span class="text">'+(state.data.publicDemo?'Fictional records. Changes are saved in this browser.':'All clients, projects and financial figures are fictional.')+'</span>'+'<button data-cmd="profile" type="button">Switch demo role '+icon('down',13)+'</button></div>':'';
}
const alertItem=a=>'<button type="button" class="alert-item" data-open="'+A(a.id)+'"><span class="alert-icon '+(a.priority==='High'?'high':'')+'">'+icon(a.priority==='High'?'alert':'clock',15)+'</span><span class="alert-copy"><strong>'+e(a.title)+'</strong><small>'+e(a.category+' · '+a.detail)+'</small></span>'+icon('right',13)+'</button>';
function workItems(){
  const list=[];
  const push=(r,k,category,date,stage,i)=>list.push({id:r.id,name:r.name,code:r.code,kind:k,category,date,stage,i});
  rows('tender').filter(x=>!['Lost','Cancelled','Awarded','Submitted','Do Not Bid'].includes(x.status)).forEach(x=>push(x,'tender','Tender',x.due,x.status,'target'));
  rows('quote').filter(x=>['Internal Review','Draft'].includes(x.status)).forEach(x=>push(x,'quote','Quotation',x.validUntil,x.status,'file'));
  rows('po').filter(x=>['Ordered','Partially Received'].includes(x.status)).forEach(x=>push(x,'po','Procurement',x.due,x.status,'truck'));
  rows('invoice').filter(x=>x.balance?.outstanding>0).forEach(x=>push(x,'invoice','Collection',x.due,x.due<today()?'Overdue':'Outstanding','wallet'));
  rows('job').filter(x=>x.status!=='Completed').forEach(x=>push(x,'job','Maintenance',x.scheduled,x.status,'tool'));
  rows('task').filter(x=>x.status!=='Completed').forEach(x=>push(x,'task','Project task',x.due,x.status,'check'));
  return list;
}
function dashboardHero(report){
  return '<section class="operations-hero" aria-labelledby="operations-heading"><div class="hero-copy"><div class="hero-context"><span class="hero-demo"><i></i>Public demo</span><span class="hero-date">'+icon('cal',15)+e(formatDate(report.today,true))+'</span></div>'+
    '<h1 id="operations-heading">Operations dashboard</h1><p>Explore how TEAMS handles tenders, installation, maintenance and the work between them.</p>'+
    '<div class="hero-actions"><button class="btn hero-primary" type="button" data-cmd="profile">'+icon('people',17)+' Switch demo role'+icon('down',15)+'</button>'+
    '<button class="btn hero-outline" type="button" data-view="roles">'+icon('people',17)+' Roles & PICs</button><button class="btn hero-outline" type="button" data-view="structure">'+icon('branch',17)+' Operating structure</button></div>'+
    '<div class="hero-note">Viewing as <strong>'+e(activePic()?.name?activePic().name+' / '+roleLabel(state.role):roleLabel(state.role))+'</strong><span>Fictional projects and figures</span></div></div>'+
    '<div class="hero-media"><img src="/assets/teams-field.webp" alt="" width="800" height="800" fetchpriority="high"></div></section>';
}
function serviceExplorer(){
  const service=serviceWorkflows.find(item=>item.id===state.service)??serviceWorkflows[0];
  const step=service.stages[state.stage]??service.stages[0];
  const record=rec(step.record);
  const sample=record?button('Open '+kindLabels[record.kind].toLowerCase(),record.id,{attr:'open',small:true,icon:'arrow'}):'';
  const switchRole=state.role===step.role?'':button('Switch to '+roleLabel(step.role),step.role,{attr:'demo-role',small:true,icon:'people'});
  const workArea=show(step.view)?button(navMap[step.view].t,step.view,{attr:'view',small:true}):'';
  const create=step.action&&can(step.action[0])?button(step.action[1],step.action[0],{small:true,primary:true,icon:'plus'}):'';
  return '<section class="service-explorer" id="service-workflows" aria-labelledby="service-heading"><header class="explorer-heading"><div><h2 id="service-heading">Service workflows</h2><p>Select a service and follow the handoff from one team to the next.</p></div></header>'+
    '<div class="service-picker" role="group" aria-label="TEAMS services">'+serviceWorkflows.map(item=>
      '<button type="button" class="service-choice tone-'+item.color+'" data-service="'+item.id+'" aria-pressed="'+(service.id===item.id)+'"><span class="service-icon">'+icon(item.icon,22)+'</span><strong>'+e(item.short)+'</strong>'+icon('right',14)+'</button>').join('')+'</div>'+
    '<div class="workflow-card card tone-'+service.color+'"><div class="workflow-heading"><div><h3>'+e(service.name)+'</h3><p>'+e(service.coordination)+'</p></div><div class="workflow-owner"><span>Delivery owner</span><strong>'+e(service.owner)+'</strong></div></div>'+
    '<div class="workflow-steps" role="group" aria-label="Workflow stages">'+service.stages.map((item,i)=>
      '<button type="button" class="workflow-step" data-step="'+i+'" aria-pressed="'+(i===state.stage)+'"><span class="step-index">'+(i+1)+'</span><span><strong>'+e(item.title)+'</strong><small>'+e(roleLabel(item.role))+'</small><small class="step-person">'+e(rolePeople(item.role).map(person=>person.name).join(', ')||'PIC to confirm')+'</small></span></button>').join('')+'</div>'+
    '<div class="workflow-detail"><div><strong>'+e(step.title)+'</strong><p>'+e(step.description)+'</p>'+(record?'<span class="sample-label">Demo record: '+e(rawName(record))+'</span>':'')+'</div>'+
    '<div class="actions">'+button('PIC & function requests','planning.role|'+step.role,{small:true,icon:'people'})+sample+create+switchRole+workArea+'</div></div></div></section>';
}
function structurePage(){
  const selected=operatingUnits.find(item=>item.id===state.unit)??operatingUnits[0];
  const parent=operatingUnits.find(item=>item.id===selected.parent);
  const unitButton=unit=>'<button type="button" class="unit-card tone-'+unit.color+'" data-unit="'+unit.id+'" aria-pressed="'+(unit.id===selected.id)+'"><span class="service-icon">'+icon(unit.icon,20)+'</span><span><strong>'+e(unit.name)+'</strong><small>'+e(unit.lead)+'</small></span>'+icon('right',15)+'</button>';
  const functionGroup=(title,units)=>'<section class="unit-group"><h3>'+e(title)+'</h3><div class="unit-grid">'+units.map(unitButton).join('')+'</div></section>';
  const decisions=decisionRights.filter(entry=>entry.unit===selected.id);
  return page('Operating structure','Proposed November 2026 operating model',button('View decision rights','structure.decisions',{icon:'clipboard'}),
    '<div class="structure-layout"><section class="card structure-map" aria-label="Select a TEAMS function">'+
    '<div class="card-head"><div><h2>TEAMS functions</h2><p>Select a function to see its responsibilities and demo roles.</p></div></div>'+
    '<div class="structure-tree">'+unitButton(operatingUnits[0])+functionGroup('Reporting to Executive',operatingUnits.filter(unit=>unit.parent==='executive'))+
    functionGroup('Under Engineering & Operations',operatingUnits.filter(unit=>unit.parent==='engineering'))+'</div></section>'+
    '<section class="card unit-inspector tone-'+selected.color+'" aria-label="Selected function"><div class="unit-inspector-head"><span class="service-icon">'+icon(selected.icon,24)+'</span><div><h2>'+e(selected.name)+'</h2><p>'+e(selected.lead)+'</p></div></div>'+
    '<div class="unit-inspector-body">'+(parent?'<p class="unit-reporting">Reports to <strong>'+e(parent.name)+'</strong></p>':'')+'<p>'+e(selected.responsibility)+'</p>'+
    '<h3>Demo roles</h3><div class="actions">'+selected.roles.map(role=>button(state.role===role?roleLabel(role)+' (active)':'Try '+roleLabel(role),role,{attr:'demo-role',small:true,primary:state.role!==role})).join('')+'</div>'+
    (decisions.length?'<h3>Decision handoffs</h3><ul class="decision-list">'+decisions.map(item=>'<li><strong>'+e(item.decision)+'</strong><span>'+e(item.accountable)+'</span></li>').join('')+'</ul>':'')+
    (selected.links.some(show)?'<h3>Work areas</h3><div class="actions">'+selected.links.filter(show).map(view=>button(navMap[view].t,view,{attr:'view',small:true})).join('')+'</div>':'')+
    '</div></section></div>');
}
function showDecisionRights(){
  openModal('Decision rights','Proposed responsibilities. Delegation and limits require TEAMS approval.',
    table(['Decision','Accountable','Responsible','Consulted'],decisionRights,row=>[e(row.decision),e(row.accountable),e(row.responsible),e(row.consulted)]),button('Close','close',{small:true}),true);
}
function updateExplorer(control){
  const host=$('#service-workflows');
  if(!host)return;
  const key=control.dataset.service?'service':'step',value=control.dataset[key];
  if(key==='service'){
    state.service=value;
    state.stage=0;
  }else state.stage=Number(value);
  host.outerHTML=serviceExplorer();
  $$('[data-'+key+']',$('#service-workflows')).find(item=>item.dataset[key]===value)?.focus({preventScroll:true});
}
async function chooseDemoRole(role,view=state.view,focusService=false,personId=''){
  if(roleSession.switching)return;
  const controls=$$('[data-demo-role]'),pending=modal.open?$('#role-switch-pending'):null,errorBox=modal.open?$('#role-switch-error'):null;
  controls.forEach(control=>control.disabled=true);
  if(pending)pending.hidden=false;if(errorBox)errorBox.hidden=true;
  try{
    if(!await roleSession.switch(role,personId))return;
    // Clear selections from the previous mailbox before displaying the new profile.
    state.mailbox='';state.mailSelected='';state.mailQuery='';state.mobile=false;
    closeModal(true);
    navigate(show(view)?view:'home');
    if(focusService)$('#service-workflows')?.scrollIntoView({block:'start'});
    toast('Viewing as '+(activePic()?.name?activePic().name+' / ':'')+roleLabel(role)+'.');
  }catch(error){
    if(errorBox&&errorBox.isConnected){errorBox.textContent=error.message;errorBox.hidden=false;}
    else toast(error.message,true);
  }finally{controls.forEach(control=>control.disabled=false);if(pending)pending.hidden=true;}
}

function fieldHub(){
  const work=hasRole('maintenance','maintenance_lead','technician')?'maintenance':show('projects')?'projects':show('quotes')?'quotes':'clients';
  return '<section class="field-hub"><div><h2>My work</h2><p data-no-translate>'+e(activePic()?.name||state.data?.actor.name||'TEAMS')+'</p><p>'+e(roleLabel(state.data?.actor.roles[0]))+'</p></div><div class="actions">'+button('Assigned work',work,{attr:'view',icon:'clipboard'})+(can('request.create')?button('Request purchase','request.create',{icon:'cart'}):can('stock.move')?button('Issue materials','stock.issue',{icon:'box'}):'')+'</div></section>';
}
function dashboard(){
  const r=state.data.report;
  const kpis=[
    ['Active projects',r.activeProjects,'Projects in delivery','building','teal','projects'],
    ['Open tenders',r.openTenders,'Opportunities in the pipeline','target','blue','tenders'],
    ['Outstanding invoices',r.outstanding==null?null:amount(r.outstanding,r.currency,true),'Uncollected invoice balances','wallet','amber','billing'],
    ['Overdue collections',r.overdue==null?null:amount(r.overdue,r.currency,true),'Past the payment due date','clock','red','billing'],
  ].filter(x=>x[1]!=null&&show(x[5]));
  const queue=workItems(),tabs=['All items','Commercial','Operations','Collections'];
  const groups={Commercial:['Tender','Quotation'],Operations:['Procurement','Maintenance','Project task'],Collections:['Collection']};
  const active=state.queue==='All items'?queue:queue.filter(x=>groups[state.queue]?.includes(x.category));
  const ranked=sorted(active,'date',false);
  const quick=[
    ['Create quotation','quote.create','file'],['Analyze tender','tender.create','target'],['Receive materials','receive.pick','truck'],['Issue materials','stock.issue','scan'],
  ].filter(([,cmd])=>cmd==='receive.pick'?can('po.receive'):cmd==='stock.issue'?can('stock.move'):can(cmd));
  const heading=state.data.publicDemo?dashboardHero(r):
    '<div class="page-head"><div><h1>Operations dashboard</h1><p>Monitor work, commitments and exceptions across TEAMS.</p></div><span class="date-pill">'+icon('cal',15)+e(formatDate(r.today,true))+'</span></div>'+demoBar();
  return fieldHub()+heading+(kpis.length?'<section class="kpis" aria-label="Key indicators">'+kpis.map(([label,value,sub,i,color,v])=>'<button class="kpi '+(color==='red'?'danger':'')+'" type="button" data-view="'+v+'"><span class="kpi-head">'+e(label)+'<span class="kpi-icon '+color+'">'+icon(i,17)+'</span></span><strong>'+e(value)+'</strong><p>'+e(sub)+'</p></button>').join('')+'</section>':'')+
    (state.data.publicDemo?serviceExplorer():'')+
    '<div class="dashboard-grid"><section class="card"><div class="card-head"><div><h2>Work queue</h2><p>Upcoming deadlines and records that need attention.</p></div><span class="chip">'+queue.length+' open</span></div><div class="tabs">'+tabs.map(x=>'<button type="button" class="'+(state.queue===x?'selected':'')+'" data-queue="'+e(x)+'">'+e(x)+'</button>').join('')+'</div>'+
    (ranked.length?'<div class="table-scroll"><table class="table queue"><thead><tr><th>Record</th><th>Type</th><th class="due-col">Due</th><th>Status</th><th><span class="sr"></span></th></tr></thead><tbody>'+ranked.slice(0,7).map(x=>'<tr data-open="'+A(x.id)+'"><td><div class="row-title"><span class="row-ico">'+icon(x.i,15)+'</span>'+recordCell(x,x.code)+'</div></td><td>'+e(x.category)+'</td><td class="due-col nowrap">'+e(formatDate(x.date))+'</td><td>'+status(x.stage)+'</td><td>'+icon('right',15)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="empty">No items in this queue.</p>')+
    '<div class="queue-footer">'+button('View full work queue','queue.full',{small:true,icon:'arrow'})+'</div></section><div class="dashboard-side">'+
    (quick.length?'<section class="card"><div class="card-head"><div><h2>Quick actions</h2><p>Start common transactions.</p></div></div><div class="quick-grid">'+quick.map(([label,cmd,i])=>'<button type="button" class="quick" data-cmd="'+cmd+'">'+icon(i,19)+e(label)+'</button>').join('')+'</div></section>':'')+
    '<section class="card alerts-card"><div class="card-head"><div><h2>Operational exceptions</h2><p>Items outside normal workflow.</p></div><span class="chip">'+r.alerts.length+'</span></div><div class="alerts">'+(r.alerts.slice(0,3).map(alertItem).join('')||'<p class="empty">No current exceptions.</p>')+'</div><div class="card-footer"><button class="link-btn" data-cmd="alerts" type="button">View all exceptions '+icon('arrow',15)+'</button></div></section></div></div>';
}

const projectTable=()=>table(['Project','Service','Client','Status','Progress','~Contract value'],rows('project'),r=>[recordCell(r,r.code),e(r.service||'—'),name(r.clientId),status(r.status),meter(r.progress),num(amount(r.value,r.currency))]);
const clientGroups=r=>{if(r.serviceGroups)return r.serviceGroups;const groups=[...(rows('project').some(x=>x.clientId===r.id)?['installation']:[]),...(rows('contract').some(x=>x.clientId===r.id)?['maintenance']:[])];return groups.length?groups:['installation'];};
function clientsPage(){const clients=rows('client').filter(r=>state.clientFilter==='all'||state.clientFilter==='shared'&&clientGroups(r).length>1||clientGroups(r).includes(state.clientFilter));return page('Clients & projects','One client profile can serve installation, maintenance or both teams.',join(fieldsButton('client.create',hasRole('maintenance')?'New maintenance client':'New client',{icon:'plus',primary:true}),fieldsButton('project.create','New project',{icon:'plus'})),
  '<div class="tabs">'+[['all','All clients'],['maintenance','Maintenance'],['installation','Installation'],['shared','Shared clients']].map(([key,label])=>button(label,'client.filter|'+key,{small:true,primary:state.clientFilter===key})).join('')+'</div>'+block('Clients',table(['Company','Service teams','Contacts','Installation projects','Service contracts'],clients,r=>[recordCell(r,r.address),e(clientGroups(r).map(x=>x==='maintenance'?'Maintenance':'Installation').join(' / ')),e(r.contacts?.length??0),e(rows('project').filter(p=>p.clientId===r.id).length),e(rows('contract').filter(c=>c.clientId===r.id).length)]))+block('Installation project register',projectTable()));}
function tendersPage(){return page('Tenders & bidding','Approve the bid, then generate a quotation from its scope and material BOQ.',fieldsButton('tender.create','Analyze tender',{primary:true,icon:'plus'}),
  block('Tender pipeline',table(['Tender','Deadline','Stage','Assessment','~Peak cash deficit',''],sorted(rows('tender'),'due',false),r=>[recordCell(r,r.code+(r.boq?.length?' / '+r.boq.length+' BOQ lines':'')),e(formatDate(r.due)),status(r.status),status(r.assessment?.decision),num(amount(r.assessment?.exposure,r.currency)),
    r.status==='Approved for Bid'?actionButton('tender.quote','Create quotation',r.id,{small:true,primary:true}):''])));}
function quotesPage(){return page('Quotations & estimates','Import a BOQ, verify costs, and approve the client quotation.',fieldsButton('quote.create','Create quotation',{primary:true,icon:'plus'}),
  '<div class="actions">'+go('Material prices for estimating','materials')+'</div>'+block('Quotation register',table(['Quotation','Client','Stage','Revision','~Selling price','~Margin'],sorted(rows('quote')),r=>[recordCell(r,r.code),name(r.clientId),status(r.status),'R'+e(r.revision),num(amount(r.totals.total,r.currency)),num(pct(r.totals.margin))])));}
function materialsPage(){
  return page('Material prices','Use verified unit prices to build estimates and client quotations.',fieldsButton('quote.create','Create quotation',{primary:true,icon:'plus'}),
    block('Material price list',table(['Material / specification','Category','Unit','~Unit price','Verified on','Price review',''],rows('material'),material=>[
      recordCell(material,material.code+(material.spec?' / '+material.spec:'')),e(material.category),e(material.unit),num(amount(material.price,material.currency)),
      e(formatDate(material.priceDate,true)),status(material.priceDate&&(Date.parse(today())-Date.parse(material.priceDate))/86400000<=settings().priceDays?'Verified':'Pending Review'),
      actionButton('quote.create','Use in quotation',material.id),
    ]),'<input class="filter" id="material-price-filter" type="search" placeholder="Find material, code or specification" aria-label="Search material prices">'));
}
const requisitionLines=group=>(group.lineIds??[]).map(rec).filter(Boolean);
const requisitionStatus=group=>{
  const statuses=requisitionLines(group).map(line=>line.status);
  return statuses.every(value=>value===statuses[0])?statuses[0]||'Requested':'In Progress';
};
function procurementPage(){return page('Procurement','Review stock shortages, compare suppliers and track deliveries.',join(fieldsButton('request.create','Request purchase',{icon:'plus',primary:true}),fieldsButton('supplier.create','Add supplier',{icon:'plus'}),can('po.receive')?button('Receive materials','receive.pick',{icon:'truck'}):''),
  block('Purchase requisitions',table(['Requisition','Project','Material','Requested','Shortage','Status'],sorted([...rows('requisition'),...rows('request').filter(row=>!row.requisitionId||!rec(row.requisitionId))]),r=>r.kind==='requisition'?
    [recordCell(r,r.code),name(r.projectId),e(requisitionLines(r).map(line=>rawName(rec(line.materialId))).join(', ')),e(requisitionLines(r).length+' material lines'),e(requisitionLines(r).filter(line=>line.shortage>0).length+' lines to buy'),status(requisitionStatus(r))]:
    [recordCell(r,r.code),name(r.projectId),name(r.materialId),e(qty(r.quantity)),e(qty(r.shortage)),status(r.status)]))+
  block('Purchase orders',table(['Order','Supplier','Delivery','Received','Status','~Total'],sorted(rows('po')),r=>[recordCell(r,r.code),name(r.supplierId),e(formatDate(r.due)),e(qty(r.received)+' / '+qty(r.quantity)),status(r.status),num(r.price==null?'—':amount(r.price*r.quantity,r.currency))]))+
  block('Suppliers',table(['Supplier','Terms','Email'],rows('supplier'),r=>[recordCell(r),e(r.terms||'—'),e(r.email||'—')])));}
function inventoryPage(){
  const items=rows('material'),moves=sorted(rows('movement')).slice(0,25),counts=rows('count');
  const actions=join(can('stock.move')?button('Issue materials','stock.issue',{primary:true,icon:'scan'}):'',can('stock.move')?button('Stock in','stock.in',{icon:'plus'}):'',fieldsButton('material.create','Add item',{icon:'plus'}));
  return page('Inventory','Record stock movements and see available quantities by location.',actions,
    '<div class="actions">'+join(can('stock.move')?button('Return','stock.return',{icon:'refresh'})+button('Transfer','stock.transfer',{icon:'layers'})+button('Supplier return','stock.supplier',{icon:'truck'}):'',fieldsButton('stock.count','Cycle count',{icon:'check'}),fieldsButton('stock.reserve','Reserve stock',{icon:'box'}),state.data.actor.previewEmployeeId&&!hasRole('admin','warehouse','procurement','auditor','project')?'':exportButton('Export movements','inventory',null,'xlsx'))+'</div>'+
    block('Material catalog',table(['Material','Category','Unit','On hand','Reserved','Available','Last movement'],items,r=>[recordCell(r,r.code),e(r.category),e(r.unit),e(qty(r.stock.onHand)),e(qty(r.stock.reserved)),r.stock.free<=r.minimum?status(qty(r.stock.free)+' low'):e(qty(r.stock.free)),e(formatDate(r.lastMovement))]),'<input class="filter" id="inventory-filter" type="search" placeholder="Filter code or material" aria-label="Filter inventory">')+
    block('Recent movements',table(['Material','Movement','Warehouse','Quantity','Date','Reference'],moves,r=>[openLink(rawName(rec(r.materialId)),r.id),e(r.type),name(r.warehouseId),e(qty(r.quantity)),e(formatDate(r.date)),e(r.reason)]))+
    (counts.length?block('Stock counts',table(['Item','Warehouse','System','Physical','Status'],counts,r=>[recordCell(r),name(r.warehouseId),e(qty(r.onHand)),e(qty(r.counted)),status(r.status)])):''));
}
function projectsPage(){
  return page('Project operations','Monitor progress, material consumption, commitments and costs to complete.',fieldsButton('project.create','New project',{icon:'plus',primary:true}),
    block('Project performance',table(['Project','Progress','Status','~Budget','~Incurred','~Committed','~Forecast margin'],rows('project'),r=>[recordCell(r,r.code),meter(r.progress),status(r.status),num(amount(r.position?.budget,r.currency)),num(amount(r.position?.actual,r.currency)),num(amount(r.position?.committed,r.currency)),num(pct(r.position?.margin))]))+
    block('Variations',table(['Variation','Project','Status','~Value','~Budget impact'],rows('variation'),r=>[recordCell(r,r.code),name(r.projectId),status(r.status),num(amount(r.value,r.currency)),num(amount(r.cost,r.currency))])));}
function maintenancePage(){return page('Maintenance services','Manage facility operations, planned maintenance and one-time troubleshooting.',fieldsButton('contract.create','New service contract',{icon:'plus',primary:true})+fieldsButton('client.create','Add maintenance client',{icon:'plus'})+go('Client profiles','clients')+button('Template review','agreement.review',{icon:'file'}),
  '<div class="service-models">'+Object.entries(serviceTypes).map(([key,label],i)=>'<article class="service-model '+key+'"><span class="eyebrow">0'+(i+1)+'</span><h3>'+e(label)+'</h3><p>'+e({om:'Operate the facility onsite. Define shifts, coverage, operating rounds and handover.',scheduled:'Planned visits, with optional resident technicians. Resident support does not change the service type.',troubleshooting:'One attendance for diagnosis and agreed repairs. Additional work needs approval; no recurring visits.'}[key])+'</p></article>').join('')+'</div>'+
  block('Service contracts',table(['Contract','Service model','Client','Resident technicians','Coverage','End date'],rows('contract'),r=>[recordCell(r,r.code),e(serviceTypes[r.serviceType||'scheduled']),name(r.clientId),e(r.residentTechnicians??0),e(r.coverage||'Review required'),e(formatDate(r.end,true))]))+
  block('Service agreements',table(['Agreement','Service model','Revision','Status'],rows('agreement'),r=>[recordCell(r,r.code),e(serviceTypes[r.contractSnapshot?.serviceType||'scheduled']),e('R'+r.revision),status(r.status)]))+
  block('Service jobs and operations rounds',table(['Job','Scheduled','Technician','Status'],sorted(rows('job'),'scheduled',false),r=>[recordCell(r,r.code),e(formatDate(r.scheduled)),e(r.technician),status(r.status)])));}
function billingPage(){
  const profile=invoiceProfile(settings()),invoices=sorted(rows('invoice'),'due',false);
  return page('Billing & collections','Restricted to Managing Director and Accounting & Finance Manager.',fieldsButton('invoice.draft','Create invoice',{primary:true,icon:'plus'})+fieldsButton('client.create','Add client',{icon:'plus'})+fieldsButton('claim.create','Prepare claim',{icon:'plus'}),
    '<div class="finance-banner"><span>'+icon('wallet',23)+'</span><div><strong>T E A M S Co., Ltd.</strong><p>Commercial invoices, tax invoices and collection records. Issued copies are locked and changes are audited.</p></div></div>'+
    block('Invoice register',table(['Invoice','Type','Client / project','Due','~Invoiced','~Received','~Outstanding','Status'],invoices,r=>[recordCell(r,r.code||r.reference||'Draft'),e(r.nativeInvoice?(r.invoiceType==='tax'?'Tax Invoice':'Commercial Invoice'):'Legacy reference'),name(r.clientId||r.projectId),e(formatDate(r.due)),num(amount(r.amount,r.currency)),num(amount(r.balance.paid,r.currency)),num(amount(r.balance.outstanding,r.currency)),status(['Draft','Void'].includes(r.status)?r.status:r.balance.outstanding<=0?'Paid':r.due<today()?'Overdue':'Outstanding')]))+
    block('Company invoice profile','<div class="modal-body">'+details([['Official company name',profile.legalNameEn],['Registered Khmer name',profile.legalNameKh||'Not configured'],['Taxpayer classification',profile.taxpayerType||'Not configured'],['VAT TIN',profile.tin||'Not configured'],['Registered address',profile.registeredAddress||'Not verified'],['Public contact address',profile.contactAddress],['Live issuance',profile.verified?'Verified company profile':'Finance verification required']])+'<p class="muted">The public contact address is from teams.com.kh. Verify the registered tax address, Khmer legal details and taxpayer classification before live issuance. Demo invoices are marked as demonstrations.</p></div>',fieldsButton('invoiceProfile.update','Edit invoice profile',{small:true,icon:'settings'}))+
    block('Accounting integration','<div class="modal-body"><strong>Not connected</strong><p>Stable invoice IDs, customer and project links, line items, currency, VAT and issued snapshots are available for accounting mapping. Export does not post to a ledger or create an accounting sync.</p></div>',button('Export accounting data','invoice.accounting',{small:true,icon:'download'})+button('Financial audit history','audit',{small:true,icon:'file'})+button('Export data snapshot','backup',{small:true,icon:'download'}))+
    block('Progress claims',table(['Claim','Project','Status','~Claimed','~Certified','Retention'],sorted(rows('claim')),r=>[recordCell(r,r.code),name(r.projectId),status(r.status),num(amount(r.amount,r.currency)),num(amount(r.certified,r.currency)),e(r.retention+'%')]))+
    block('Billing milestones',table(['Milestone','Project','Due','~Value'],rows('milestone'),r=>[recordCell(r),name(r.projectId),e(formatDate(r.due)),num(amount(r.amount,r.currency))]),fieldsButton('milestone.create','Add milestone',{small:true,icon:'plus'})));
}
function reportsPage(){
  const r=state.data.report;
  return page('Reports','Review the weekly operating position and a rolling 13-week cash forecast.',exportButton('Weekly summary PDF','report'),
    '<div class="grid-two">'+block('Weekly activity',details([['New quotations',r.summary.quotes],['Tenders received',r.summary.tenders],['Awarded projects',r.summary.awards],['Operational billing',amount(r.summary.billed,r.currency)],['Recorded collections',amount(r.summary.collected,r.currency)],['Visits completed',r.summary.jobs]]).replace('class="details"','class="details" style="padding:14px;margin:0"'))+
    block('Exceptions','<div class="alerts">'+(r.alerts.map(alertItem).join('')||'<p class="empty">No current exceptions.</p>')+'</div>')+'</div>'+
    block('13-week cash forecast','<p class="muted" style="padding:11px 15px">Projected collections and commitments use record due dates. An opening cash entry dated today enables the running balance.</p>'+
      table(['Week starting','~Collections','~PO commitments','~Other in','~Other out','~Net movement','~Projected cash'],r.weeks,w=>[e(formatDate(w.start)),num(amount(w.collections,r.currency)),num(amount(w.procurement,r.currency)),num(amount(w.otherIn,r.currency)),num(amount(w.otherOut,r.currency)),num(amount(w.net,r.currency)),num(amount(w.balance,r.currency))]),fieldsButton('cash.update','Add forecast input',{small:true,icon:'plus'})));
}
const downloadDocument=id=>button('Download',id,{attr:'file',small:true,icon:'download'});
function openDocumentFolder(id=''){
  if(!show('documents')||(id&&rec(id)?.kind!=='folder')||(modal.open&&!closeModal()))return;
  state.documentFolder=id;
  navigate('documents');
}
function documentsPage(){
  const folder=rec(state.documentFolder),folderId=folder?.kind==='folder'?folder.id:null;
  const path=[];
  for(let current=folder;current?.kind==='folder';current=rec(current.parentId))path.unshift(current);
  const breadcrumbs='<nav class="document-path" aria-label="Folder path">'+button('My folders','folder.open',{small:true,icon:'folder'})+
    path.map((entry,i)=>icon('right',14)+(i===path.length-1?
      '<span aria-current="location" data-no-translate>'+e(entry.name)+'</span>':
      '<span data-no-translate>'+button(entry.name,'folder.open|'+entry.id,{small:true})+'</span>')).join('')+'</nav>';
  const folders=sorted(rows('folder').filter(row=>row.parentId===folderId),'name',false);
  const documents=sorted(rows('document'));
  const files=folderId?documents.filter(row=>row.parentKind==='folder'&&row.parentId===folderId):[];
  const personal=block('My folders',breadcrumbs+
    table(['Name','Type','Size','Added',''],[...folders,...files],row=>row.kind==='folder'?
      [recordCell(row),'Folder','',e(formatDate(row.date)),'']:
      [recordCell(row),'File',e(Math.ceil(row.size/1024)+' KB'),e(formatDate(row.date)),downloadDocument(row.id)],
    folderId?'This folder is empty.':'You have no folders yet.'),
    actionButton('folder.create','New folder',folderId,{icon:'plus'})+
    (folderId?actionButton('document.store','Upload file',folderId,{primary:true,icon:'upload'}):''));
  return page('Documents','Store files in private folders and find attachments linked to operational records.','',personal+
    block('Record attachments',table(['Document','Linked record','Type','Size','Added',''],documents.filter(row=>row.parentKind!=='folder'),
      r=>[recordCell(r),name(r.parentId),e(r.type),e(Math.ceil(r.size/1024)+' KB'),e(formatDate(r.date)),downloadDocument(r.id)]),
    fieldsButton('document.attach','Attach to record',{small:true,icon:'upload'}))+
    emailConnectionPanel()+block('Client email history',table(['Subject','Document','To','Status','Created'],sorted(rows('dispatch')),r=>[recordCell(r),name(r.parentId),e(r.to),status(r.status),e(formatDate(r.date))])));
}
function settingsPage(){
  const s=settings();
  return page('Settings','Configure company details, thresholds, warehouses and access.',fieldsButton('settings.update','Edit settings',{primary:true}),
    settingsTabs()+
    block('Mobile app and languages','<div class="modal-body"><p>Use English or Khmer. Install the app on a phone for quick access in the field.</p><p class="muted">Official names, positions and entered data retain their original spelling. Client exports retain their approved document language.</p></div>',button('Install app','pwa.install',{icon:'download'}))+
    block('Production readiness','<div class="modal-body"><p>Public demo remains isolated. A separate authenticated environment and deployment checks are required for real operations.</p><a class="btn" href="/deployment-guide.html" target="_blank" rel="noopener">Deployment requirements</a></div>')+
    (state.data.publicDemo?block('Role planning','<p class="empty">See named source examples, propose PIC assignments and record the functions each role needs.</p>',go('Open Roles & PICs','roles')):'')+
    block('Company and approval thresholds','<div class="modal-body">'+details([['Company',s.name],['Reporting currency',s.currency],['Address',s.address],['Default tax',s.tax+'%'],['Minimum margin',s.minMargin+'%'],['Cash exposure limit',amount(s.cashLimit,s.currency)],['Delegated purchase limit',amount(s.purchaseLimit,s.currency)],['Price review interval',s.priceDays+' days'],['Inventory aging',s.agingDays+' days'],['Renewal alert',s.renewalDays+' days'],['KHR per USD',s.fxRate],['FX effective date',s.fxDate]])+'</div>')+
    emailConnectionPanel()+
    block('Warehouses',table(['Name','Code','Location'],rows('warehouse'),r=>[recordCell(r),e(r.code),e(r.location)]),fieldsButton('warehouse.create','Add warehouse',{small:true,icon:'plus'}))+
    (!isPrivate()&&state.data.demoRoles.length?block('Fictional demonstration','<p class="empty">Reset records to the original fictional dataset. Existing demonstration edits will be removed.</p>',button('Reset demo','demo.reset',{small:true,danger:true})):'')+
    block('Data imports',table(['Source file','Type','Rows','Cutoff'],sorted(rows('importLog')),r=>[recordCell(r),e(r.type),e(r.count),e(r.cutoff||'—')]),button('Import records','master.import',{small:true,icon:'upload'}))+
    block('Audit history','<p class="empty">Review timestamped changes and approval actions.</p>',button('Open audit log','audit',{small:true})+(hasFinanceAccess(state.data.actor)?button('Export data snapshot','backup',{small:true,icon:'download'}):'')));
}
const storageAmount=bytes=>qty(Number((bytes/1_000_000).toFixed(3)))+' MB';
const storageCap=limit=>limit==null?'Unlimited':qty(limit)+' MB';
const accountCanEdit=record=>canManageEmployee(state.data.actor,record);
const accountStatus=record=>record.removedOn?'Removed':record.active?'Active':record.email?'Disabled':'Directory only';
function employeeAccountActions(record){
  if(record.bootstrapOwner)return e('Deployment owner');
  if(record.removedOn)return accountCanEdit(record)?actionButton('employee.restore','Restore',record.id):'';
  return (accountCanEdit(record)?actionButton('employee.upsert','Edit',record.id)+
    actionButton('employee.remove','Remove',record.id):'')+
    (isPlatform()&&record.email?actionButton('platform.storage.user','Set storage limit',record.id):'');
}

function platformDashboard(){
  const p=state.data.platform, users=rows('employee');
  const indicators=[
    ['Active users',qty(users.filter(user=>user.active).length),'people','platform-users'],
    ['Storage used',storageAmount(p.storageUsedBytes),'box','platform-settings'],
    ['Request failures (24 hours)',p.activity.counts.failures??'Unavailable','alert','platform-activity'],
    ['Slow requests (24 hours)',p.activity.counts.slow??'Unavailable','clock','platform-activity'],
  ];
  return page('Admin dashboard','Manage TEAMS accounts, integrations and service activity.','',
    '<section class="kpis" aria-label="Platform indicators">'+indicators.map(([label,value,i,view])=>
      '<button class="kpi" type="button" data-view="'+A(view)+'"><span class="kpi-head">'+e(label)+'<span class="kpi-icon">'+icon(i,17)+'</span></span><strong>'+e(value)+'</strong></button>').join('')+'</section>'+
    block('Service status','<div class="modal-body">'+details([['Application database','Connected'],['Document storage',p.storageBound?'Connected':'Unavailable'],
      ['Email sending',p.emailConnection.mode==='configured'?'Configured':'Unavailable'],['Email receiving',p.emailConnection.receiving==='configured'?'Configured':'Unavailable'],
      ['AI review',p.ai.enabled?(p.aiKeySet&&p.ai.model?'Configured':'Credentials required'):'Disabled']])+'</div>'));
}
function employeeAccountTable(){
  const q=state.accountSearch.trim().toLowerCase(),p=state.data.platform;
  const users=sorted(rows('employee'),'name',false).filter(user=>
    (state.accountStatus==='all'||Boolean(user.removedOn)===(state.accountStatus==='removed'))&&
    (!q||[user.name,user.employeeId,user.email,user.position,user.department,user.team,...user.roles.map(roleLabel)].some(value=>String(value??'').toLowerCase().includes(q))));
  return table(['Employee','Job title','Department','Sign-in email','Roles','Access',...(p?['Storage used','Limit']:[]),'Actions'],users,user=>[
    recordCell(user,[user.employeeId,user.team].filter(Boolean).join(' / ')),
    '<span data-no-translate>'+e(user.position)+'</span>','<span data-no-translate>'+e(user.department)+'</span>',
    e(user.email),e(user.roles.map(roleLabel).join(', ')),status(accountStatus(user)),
    ...(p?[e(storageAmount(user.storageUsedBytes)),e(storageCap(user.storageLimitMb??p.defaultStorageMb))]:[]),employeeAccountActions(user),
  ],'No matching employees.');
}
function employeeAccountsPage(){
  const platform=isPlatform();
  const options=[['current','Current accounts'],['removed','Removed accounts'],['all','All accounts']].map(([value,label])=>
    '<option value="'+value+'"'+(state.accountStatus===value?' selected':'')+'>'+e(label)+'</option>').join('');
  const filters='<div class="directory-filters"><label>Search employees<input type="search" id="account-search" class="filter" value="'+A(state.accountSearch)+'" placeholder="Name, ID, title, role or email"></label>'+
    '<label>Account status<select id="account-status" class="filter">'+options+'</select></label></div>';
  return page(platform?'User management':'Employees',platform?'Manage user accounts and assigned access.':'Manage job titles, teams and employee access.',
    button(platform?'Add user':'Add employee','employee.upsert',{primary:true,icon:'plus'})+(platform?button('Import accounts','master.import',{icon:'upload'}):''),
    block(platform?'User accounts':'Employee directory',filters+'<div id="account-grid">'+employeeAccountTable()+'</div>'));
}
function platformSettings(){
  const p=state.data.platform;
  return page('Admin settings','Configure platform connections and upload limits.','',
    block('Email (Resend)','<div class="modal-body">'+details([['Sending',p.email.outbound?'Enabled':'Disabled'],['Receiving',p.email.inbound?'Enabled':'Disabled'],
      ['Sender',p.email.fromEmail||'Unconfigured'],['API credentials',p.mailKeySet?'Configured':'Required'],['Webhook signing secret',p.webhookKeySet?'Configured':'Required'],
      ...Object.entries(mailboxes).map(([key,label])=>[label,(p.email.routing[key]??[]).join(', ')])])+
      '<p class="muted">Provider keys and webhook secrets are stored in Cloudflare Worker Secrets.</p></div>',button('Configure email','platform.email.update',{small:true}))+
    block('Document storage (R2)','<div class="modal-body">'+details([['Storage binding',p.storageBound?'Connected':'Unavailable'],
      ['Default per-user limit',storageCap(p.defaultStorageMb)],['Account storage used',storageAmount(p.storageUsedBytes)]])+
      '<p class="muted">Limits cover uploaded documents and stored outbound email attachment copies.</p></div>',button('Set default storage limit','platform.storage.default',{small:true}))+
    block('AI review (OpenAI)','<div class="modal-body">'+details([['AI review',p.ai.enabled?'Enabled':'Disabled'],['Model',p.ai.model||'Unconfigured'],
      ['API credentials',p.aiKeySet?'Configured':'Required'],['Team daily limit',p.ai.dailyLimit],['User daily limit',p.ai.userDailyLimit]])+'</div>',button('Configure AI review','platform.ai.update',{small:true})));
}
function platformActivityPage(){
  const {available,issues,audit}=state.data.platform.activity;
  const actorLabel=value=>e(value.replace(/^cloudflare-access:/,''));
  const utcTime=value=>e(value.replace('T',' ').slice(0,19));
  return page('Activity logs','Review recent activity, request failures and slow requests.',button('Refresh','retry'),
    block('Request diagnostics',available?table(['Last seen (UTC)','User','Area','HTTP status','Requests','Longest (ms)'],issues,
      x=>[utcTime(x.last_seen),actorLabel(x.actor),e(x.area),e(x.status),e(x.hits),e(x.max_ms)],'No request issues recorded in the past seven days.'):
      '<p class="empty">Diagnostic storage is unavailable.</p>')+
    block('Audit activity',table(['When (UTC)','User','Action','Authorization reference'],audit,
      x=>[utcTime(x.created_at),actorLabel(x.actor),e(x.action),e(x.authorization_reference||'')])));
}
function settingsTabs(){
  if(!show('employees'))return '';
  return '<nav class="settings-tabs" aria-label="Settings sections">'+[['settings','General'],['employees','Employees'],['roles','Roles']].map(([key,label])=>
    '<button type="button" class="btn '+(state.view===key?'primary':'')+'" data-view="'+key+'"'+(state.view===key?' aria-current="page"':'')+'>'+label+'</button>').join('')+'</nav>';
}
const employeeReview = person => !person.reviewResolved&&(!person.team||!person.department||!person.employeeId||person.source.review_notes);
const employeeRoles = profile => profile?.length?profile.map(roleLabel).join(', '):'No access';
const personName = (id,fallback='') => (rec(id)||state.data?.people?.find(person=>person.id===id))?.name||fallback;
const planning = () => state.data?.rolePlanning??{people:[],requests:[],audit:[]};
const rolePeople = role => planning().people.filter(person=>person.roles.includes(role));
const activePic = () => state.data?.publicDemo?(rolePeople(state.role).find(person=>person.id===state.picId)??rolePeople(state.role)[0]):null;
const planningPerson = id => planning().people.find(person=>person.id===id);
function planningNote(){
  return '<div class="planning-note"><strong>Proposed role mappings</strong><span>The named examples come from the supplied employee list. Confirm PICs with TEAMS. Edits and imported names are saved in this browser. Export the plan to share it.</span></div>';
}
function planningEmployeesGrid(){
  const f=state.employeeFilters,q=f.search.trim().toLowerCase();
  const people=planning().people.filter(person=>(!q||(person.name+' '+person.position).toLowerCase().includes(q))&&(!f.role||person.roles.includes(f.role)));
  return '<p class="directory-count">'+people.length+' of '+planning().people.length+' people</p>'+table(['Name / official position','Proposed profiles','Source','Actions'],people,person=>[
    '<strong>'+e(person.name)+'</strong><small>'+'<span data-no-translate>'+e(person.position)+'</span>'+'</small>',e(employeeRoles(person.roles)),
    e(person.imported?'Imported in this browser':person.sourceExample?'Source example':'Added in this browser'),button('Edit assignment','planning.person|'+person.id,{small:true})]);
}
function planningEmployeesPage(){
  const f=state.employeeFilters;
  const filters='<div class="directory-filters planning-filters"><label>Search names and positions<input type="search" class="filter" data-employee-filter="search" value="'+A(f.search)+'" placeholder="Name or official position"></label><label>Proposed profile<select class="filter" data-employee-filter="role"><option value="">All profiles</option>'+demoRoleChoices.map(([role,label])=>'<option value="'+role+'"'+(f.role===role?' selected':'')+'>'+e(label)+'</option>').join('')+'</select></label></div>';
  return page('Employees for role planning','Named representatives for the TEAMS requirements discussion.',button('Load provided employee JSON','planning.import',{icon:'upload'})+button('Add person','planning.person',{primary:true,icon:'plus'}),settingsTabs()+planningNote()+
    block('People and proposed profiles',filters+'<div id="employee-grid">'+planningEmployeesGrid()+'</div>','<span class="muted">Load the source JSON to include all 69 people in this browser.</span>'));
}
const profileFunctions=role=>[...actionAccess({roles:[role]}),...(state.data?.publicDemo&&role==='adminSupport'?['hr.employees']:[])];
function functionLabel(action){
  if(action==='dispatch.create')return 'View historical client sends';
  if(action==='mail.save')return 'Compose email and save drafts';
  if(action==='mail.send')return 'Send project email with attachments';
  if(action==='mail.update')return 'Manage authorized mailbox messages';
  if(action==='agreement.create')return 'Prepare a service agreement';
  if(action==='agreement.edit')return 'Edit an agreement draft';
  if(action==='agreement.transition')return 'Review service agreement stages';
  if(action==='hr.employees')return 'Manage employees and job functions';
  if(action==='*')return 'Manage all demonstration workflows';
  const [subject,verb]=action.split('.');
  const nouns={quote:'quotation',tender:'tender',client:'client',project:'project',task:'project task',request:'material requisition',supplier:'supplier',po:'purchase order',delivery:'delivery',stock:'stock',contract:'service contract',job:'service visit',claim:'progress claim',invoice:'invoice',cash:'cash forecast',document:'document',material:'material',variation:'variation',milestone:'billing milestone'};
  const verbs={create:'Create',update:'Update',edit:'Edit',transition:'Review stages for',revise:'Revise',quote:'Prepare quotation from',progress:'Record progress for',status:'Update status for',cost:'Record cost for',award:'Record award for',assign:'Assign',ack:'Acknowledge',price:'Update price for',offer:'Record offer from',cancel:'Cancel',proof:'Record proof of',move:'Receive, issue, return or transfer',reserve:'Reserve',count:'Count',receive:'Receive',schedule:'Schedule',pay:'Record payment for',reverse:'Reverse payment for',attach:'Attach'};
  return (verbs[verb]||verb)+' '+(nouns[subject]||subject);
}
function planningRolePage(){
  const selected=Object.hasOwn(roleLabels,state.planRole)?state.planRole:'mep';
  const people=rolePeople(selected),requests=planning().requests.filter(request=>request.role===selected);
  const modules=viewAccess({roles:[selected]}).includes('*')?nav.flatMap(([,entries])=>entries.map(([key])=>key)).filter(key=>!['home','structure','roles'].includes(key)):viewAccess({roles:[selected]}).filter(key=>navMap[key]&&key!=='home');
  if(state.data.publicDemo&&selected==='adminSupport')modules.push('hr');
  if(['estimator','mep','manager','director','project','procurement','auditor'].includes(selected))modules.unshift('materials');
  const actions=profileFunctions(selected);
  const picker='<div class="planning-role-list" role="group" aria-label="Permission profiles">'+demoRoleChoices.map(([role,label])=>{
    const names=rolePeople(role).map(person=>person.name);
    return '<button type="button" class="planning-role" data-cmd="planning.role|'+role+'" aria-pressed="'+(selected===role)+'"><strong>'+e(label)+'</strong><span>'+e(names.join(', ')||'PIC to confirm')+'</span></button>';
  }).join('')+'</div>';
  const representatives=people.length?people.map(person=>'<div class="planning-person"><div><strong>'+e(person.name)+'</strong><p>'+'<span data-no-translate>'+e(person.position)+'</span>'+'</p>'+(person.jobFunctions?'<div class="job-functions">'+e(person.jobFunctions)+'</div>':'')+'<small>'+e(person.imported?'Source imported in this browser':person.sourceExample?'Source example / proposed profile':'Proposed in this browser')+'</small></div><div class="actions">'+button('Edit profiles','planning.person|'+person.id,{small:true})+button('Explore as '+person.name,'planning.try|'+selected+'|'+person.id,{small:true,primary:true})+'</div></div>').join(''):'<p class="empty">The supplied source has no named example for this system role. Add a person when TEAMS identifies the PIC.</p>';
  const features=actions.length?'<ul class="planning-functions">'+actions.slice(0,6).map(action=>'<li>'+icon('check',15)+e(functionLabel(action))+'</li>').join('')+'</ul>':'<p class="empty">View accessible records and reports.</p>';
  const workAreas='<div class="actions planning-modules">'+modules.map(key=>button(navMap[key].t,'planning.module|'+selected+'|'+key,{small:true})).join('')+'</div>';
  const requirements=table(['Function requested','Requested by','Priority / review','Expected result',''],requests,request=>[
    '<strong>'+e(request.title)+'</strong><small>'+e(request.workflow)+'</small>',e(planningPerson(request.personId)?.name||'Role discussion'),
    status(request.priority)+' '+status(request.status),e(request.acceptance),button('Edit','planning.request|'+request.id,{small:true}),
  ],'No requests yet. Record what this PIC needs to do, see or decide in the system.');
  const detail='<div class="planning-role-detail"><section class="card planning-selected"><header><span class="planning-kicker">Permission profile</span><h2>'+e(roleLabel(selected))+'</h2><p>'+people.length+' named '+(people.length===1?'example':'examples')+' / '+requests.length+' function '+(requests.length===1?'request':'requests')+'</p></header>'+representatives+'<div class="planning-person-actions">'+button('Assign another person','planning.person',{small:true,icon:'plus'})+'</div></section>'+
    block('Available functions',features+workAreas,button('View all functions','planning.functions|'+selected,{small:true}))+
    block('PIC function requests',requirements,button('Add function request','planning.request||'+selected,{small:true,primary:true,icon:'plus'}))+'</div>';
  return page('Roles & PICs','Connect each permission profile to named people and discuss what they need from TEAMS Operations.',button('Planning history','planning.audit',{icon:'file'})+button('Export role plan','planning.export',{icon:'download'}),settingsTabs()+planningNote()+'<div class="planning-layout">'+picker+detail+'</div>');
}
async function savePlanning(operation,data,reason,key=crypto.randomUUID()){
  await api('/api/demo-planning',{method:'POST',json:{operation,data,reason,key}});
  closeModal(true);await readState();render();toast('Role plan saved in this browser.');
}
function planningPersonForm(id,createNew=false){
  if(!id&&!createNew){
    const key=crypto.randomUUID();
    formModal({title:'Assign an existing person',sub:roleLabel(state.planRole),fields:[
      select('personId','Person from the employee list',planning().people.map(person=>[person.id,person.name+' / '+person.position]),'',{search:true}),
      select('roles','Proposed permission profiles',demoRoleChoices,[state.planRole],{multiple:true,full:true}),
      textarea('reason','Reason for assignment or change',''),
    ],content:button('Load the full provided list','planning.import',{small:true,icon:'upload'})+button('Add a new person','planning.new',{small:true,icon:'plus'}),
      submit:'Save proposed assignment',afterOpen:form=>form.elements.personId.addEventListener('change',()=>{
        const chosen=planningPerson(form.elements.personId.value);
        const selected=new Set([...(chosen?.roles||[]),state.planRole]);
        for(const option of form.elements.roles.options)option.selected=selected.has(option.value);
      }),onSubmit:values=>{
        const person=planningPerson(values.personId);
        if(!person)throw Error('Select a person from the employee list.');
        return savePlanning('person.save',{id:person.id,name:person.name,position:person.position,roles:values.roles},values.reason,key);
      }});
    return;
  }
  const person=planningPerson(id),key=crypto.randomUUID();
  formModal({title:person?'Edit proposed role assignment':'Assign a person to roles',sub:'Keep the official position separate from proposed system profiles.',fields:[
    input('name','Official English name',person?.name||''),input('position','Official position',person?.position||''),
    select('roles','Proposed permission profiles',demoRoleChoices,person?.roles||[state.planRole],{multiple:true,required:false,full:true,help:'Hold Control or Command to select multiple profiles. Leave empty for no proposed access.'}),
    textarea('reason','Reason for assignment or change',''),
  ],notes:'These are demonstration proposals. Production access requires a separate authorized decision.',submit:'Save proposed assignment',onSubmit:values=>savePlanning('person.save',{id,...values},values.reason,key)});
}
function planningRequestForm(id,role=state.planRole){
  const request=planning().requests.find(row=>row.id===id),selected=request?.role||role;
  const people=rolePeople(selected),key=crypto.randomUUID();
  formModal({title:request?'Edit function request':'Add function request',sub:roleLabel(selected),fields:[
    select('personId','PIC / requester',[['','Role discussion'],...people.map(person=>[person.id,person.name+' / '+person.position])],request?.personId||people[0]?.id||'',{required:false}),
    input('title','Function needed',request?.title||'',{help:'For example, compare the estimate with actual material use.'}),input('workflow','Workflow or work area',request?.workflow||''),
    select('priority','Priority',planningPriorities.map(value=>[value,value]),request?.priority||'Medium'),
    select('status','Review status',planningStatuses.map(value=>[value,value]),request?.status||'Requested'),
    textarea('acceptance','Expected result',request?.acceptance||''),textarea('reason','Discussion note or reason for change',''),
  ],submit:'Save function request',onSubmit:values=>savePlanning('request.save',{...values,id,role:selected},values.reason,key)});
}
function planningImport(){
  const key=crypto.randomUUID();
  formModal({title:'Load the provided employee list',sub:'TEAMS_V1_Employee_Role_Import.json',fields:[input('file','Employee JSON file','',{type:'file',accept:'.json,application/json',full:true})],
    notes:'Adds all source names and positions to role planning in this browser. Existing proposed assignments are retained. Export the role plan to share your discussion.',submit:'Load names and proposed profiles',onSubmit:async(_,form)=>{
      const file=form.elements.file.files[0];
      if(!file||file.size>2000000)throw Error('Choose the supplied JSON file up to 2 MB.');
      let source;try{source=JSON.parse(await file.text());}catch{throw Error('The selected file must contain valid JSON.');}
      await savePlanning('source.import',{source},'Loaded the supplied employee master for role discussions.',key);
    }});
}
function planningAudit(){
  const events=[...planning().audit].reverse();
  const assignment=value=>Array.isArray(value)?value.length+' people':value?.roles?value.name+' / '+employeeRoles(value.roles):value?.title||'None';
  openModal('Role planning history','Saved changes in this browser.',table(['When (UTC)','Change','Before','After','Reason'],events,event=>[
    e(event.created_at.replace('T',' ').slice(0,19)),e(event.action.replace('planning.','')),e(assignment(event.before)),e(assignment(event.after)),e(event.reason),
  ]),button('Export plan and history','planning.export',{icon:'download'}),true);
}
function employeeGrid(){
  if(state.data.publicDemo)return planningEmployeesGrid();
  const f=state.employeeFilters,q=f.search.trim().toLowerCase();
  const list=rows('personnel').filter(person=>
    (!q||[person.name,person.position,person.employeeId,person.department,person.team].some(value=>String(value??'').toLowerCase().includes(q)))&&
    (!f.department||person.department===f.department)&&(!f.role||(f.role==='no_access'?!person.roles.length:person.roles.includes(f.role)))&&
    (!f.review||(f.review==='yes'?employeeReview(person):!employeeReview(person))));
  const heading=e(list.length+' of '+rows('personnel').length+' employees');
  return '<div class="directory-count">'+heading+'</div>'+table(['Employee / position','Employee ID','Department / team','Permission profiles','Account','Review'],list,person=>[
    recordCell(person,person.position),e(person.employeeId??'Not provided'),
    '<div>'+e(person.department||'Department not provided')+'</div><small>'+e(person.team||'Team not provided')+'</small>',
    e(employeeRoles(person.roles)),status(person.loginProvisioned?'Provisioned':'Unprovisioned'),employeeReview(person)?status('Pending'):e(person.reviewResolved?'Reviewed':''),
  ],'No employees match these filters.');
}
function employeesPage(){
  if(state.data.publicDemo)return planningEmployeesPage();
  const employees=rows('personnel'),f=state.employeeFilters;
  const options=(values,value)=>values.map(([id,label])=>'<option value="'+A(id)+'"'+(id===value?' selected':'')+'>'+e(label)+'</option>').join('');
  const departments=[...new Set(employees.map(person=>person.department).filter(Boolean))].sort();
  const profiles=state.data.roleCatalog.map(({role})=>[role,roleLabel(role)]);
  const filters='<div class="directory-filters"><label>Search<input class="filter" type="search" data-employee-filter="search" value="'+A(f.search)+'" placeholder="Name, ID or position"></label>'+
    '<label>Department<select class="filter" data-employee-filter="department">'+options([['','All departments'],...departments.map(d=>[d,d])],f.department)+'</select></label>'+
    '<label>Permission profile<select class="filter" data-employee-filter="role">'+options([['','All profiles'],['no_access','No access'],...profiles],f.role)+'</select></label>'+
    '<label>Review<select class="filter" data-employee-filter="review">'+options([['','All records'],['yes','Needs review'],['no','No open flags']],f.review)+'</select></label></div>';
  const summary=employees.length+' employees · '+employees.filter(p=>p.employmentGroup==='Regular').length+' regular · '+employees.filter(p=>p.employmentGroup==='Intern').length+' interns · '+employees.filter(employeeReview).length+' need review';
  return page('Employees','Private employee directory',button('Employee audit history','personnel.audit',{icon:'file'}),settingsTabs()+
    block('Employee directory',filters+'<div id="employee-grid">'+employeeGrid()+'</div>','<span class="muted">'+e(summary)+'</span>'));
}
function rolesPage(){
  if(state.data.publicDemo)return planningRolePage();
  const assigned=rows('personnel'),catalog=state.data.roleCatalog;
  return page('Roles','Permission profiles and approval grants',button('Role assignment audit','personnel.audit',{icon:'file'}),settingsTabs()+
    block('Permission profiles',table(['Profile','Assigned employees','Modules','Actions','Separate approval grants eligible'],catalog,row=>[
      '<button class="link-btn" type="button" data-cmd="profile.detail|'+A(row.role)+'">'+e(roleLabel(row.role))+'</button>',
      e(assigned.filter(p=>p.roles.includes(row.role)).length),e(row.modules.includes('*')?'All modules':row.modules.map(x=>navMap[x]?.t||x).join(', ')),
      e(row.actions.includes('*')?'All actions':row.actions.length),e(row.approvals.map(key=>state.data.approvalLabels[key]).join(', ')||'None'),
    ]))+
    block('Employee assignments',table(['Employee / position','Permission profiles','Approval grants','Actions'],assigned,row=>[
      recordCell(row,row.position),e(employeeRoles(row.roles)),e(row.approvals.map(key=>state.data.approvalLabels[key]).join(', ')||'None'),
      actionButton('personnel.roles','Edit profiles',row.id),
    ])));
}
function hrEmployeeGrid(){
  const search=(state.hrSearch||'').toLowerCase().trim();
  const employees=planning().people.filter(person=>[person.name,person.position,person.department,person.team,person.jobFunctions].join(' ').toLowerCase().includes(search));
  return table(['Employee / position','Department / team','Job functions','System profiles',''],employees,person=>[
    '<strong>'+e(person.name)+'</strong><small>'+'<span data-no-translate>'+e(person.position)+'</span>'+'</small>',
    e(person.department||'Department to confirm')+'<small>'+e(person.team||'Team to confirm')+'</small>',
    '<div class="job-functions">'+e(person.jobFunctions||'Job functions to record')+'</div>',e(employeeRoles(person.roles)),
    button('Edit employee','hr.employee|'+person.id,{small:true}),
  ],'No matching employees.');
}
function hrPage(){
  return page('HR & employees','Maintain employee positions, departments, teams and job functions for the demonstration.',
    button('Load employee list','planning.import',{icon:'upload'})+button('Add employee','hr.employee',{primary:true,icon:'plus'}),
    '<div class="planning-note"><strong>'+planning().people.length+' employees</strong><span>Names and official positions come from the source list. HR can record job functions and organizational corrections. Changes are saved in this browser.</span></div>'+
    block('Employee directory','<div id="hr-employee-grid">'+hrEmployeeGrid()+'</div>',
      '<input class="filter" type="search" id="hr-employee-search" value="'+A(state.hrSearch||'')+'" placeholder="Search employees and job functions" aria-label="Search employees and job functions">')+
    block('Employee changes','<p class="empty">Review recorded employee changes and export job functions with the discussion plan.</p>',button('Change history','planning.audit',{small:true})+button('Export employee plan','planning.export',{small:true,icon:'download'})));
}
function hrEmployeeForm(id){
  const person=planningPerson(id),key=crypto.randomUUID();
  formModal({title:person?'Edit employee and job functions':'Add employee',sub:'HR & Administration',fields:[
    input('name','Official English name',person?.name||''),input('position','Official position',person?.position||''),
    input('department','Department',person?.department||'',optional),input('team','Team',person?.team||'',optional),
    textarea('jobFunctions','Job functions',person?.jobFunctions||'',{...optional,help:'Record responsibilities, recurring tasks and expected outputs. Use a new line for each function.'}),
    textarea('reason','Reason for employee change',''),
  ],submit:'Save employee',onSubmit:values=>savePlanning('employee.save',{...values,id},values.reason,key)});
}
const pages={mail:mailPage,home:()=>isPlatform()?platformDashboard():dashboard(),structure:structurePage,clients:clientsPage,tenders:tendersPage,materials:materialsPage,hr:hrPage,quotes:quotesPage,procurement:procurementPage,inventory:inventoryPage,projects:projectsPage,maintenance:maintenancePage,billing:billingPage,reports:reportsPage,documents:documentsPage,settings:settingsPage,employees:employeesPage,roles:rolesPage,
  'platform-users':employeeAccountsPage,'team-employees':employeeAccountsPage,'platform-settings':platformSettings,'platform-activity':platformActivityPage};
function render(){
  if(isPlatform()&&state.view==='settings')state.view='platform-settings';
  if(state.data&&!show(state.view))state.view='home';
  sidebar();topbar();mobileNavigation();
  $('#main').innerHTML=state.error?'<section class="card"><div class="empty"><h2>Workspace unavailable</h2><p>'+e(state.error)+'</p><div class="actions" style="margin-top:12px">'+button('Retry','retry')+'</div></div></section>':state.data?pages[state.view]():'<div class="loading">Loading TEAMS Operations...</div>';
}

function mobileNavigation(){
  const preferred=show('team-employees')&&hasRole('hr_head')?'team-employees':hasRole('warehouse','logistics')?'inventory':hasRole('maintenance','maintenance_lead','technician')?'maintenance':show('projects')?'projects':show('quotes')?'quotes':'clients';
  const items=isPlatform()?[['home','Admin','grid'],['platform-users','Users','people'],['platform-settings','Settings','settings'],['platform-activity','Logs','clipboard']]:
    [['home','Home','grid'],[preferred,preferred==='team-employees'?'Employees':'Work','clipboard'],[show('inventory')?'inventory':show('documents')?'documents':'roles',show('inventory')?'Stock':'Documents','box'],[show('mail')?'mail':show('procurement')?'procurement':'clients',show('mail')?'Email':show('procurement')?'Procurement':'Clients','mail']];
  $('#mobile-nav').innerHTML=items.filter(([view],i,all)=>show(view)&&all.findIndex(x=>x[0]===view)===i).map(([view,label,i])=>'<button type="button" data-view="'+view+'"'+(state.view===view?' aria-current="page"':'')+'>'+icon(i,21)+'<span>'+e(label)+'</span></button>').join('')+'<button type="button" data-cmd="mobile" aria-label="Toggle navigation" aria-controls="sidebar" aria-expanded="false">'+icon('menu',21)+'<span>More</span></button>';
  document.documentElement.dataset.view=state.view;
}
async function installApp(){if(await promptInstall())return;openModal('Install TEAMS','Use TEAMS from your Home screen.',installHelp(),button('Close','close'));}

const modal=$('#modal');
let formDirty=false;
let cleanupModal=null;
function closeModal(force=false){
  if(!force&&formDirty&&!window.confirm(t('Discard unsaved changes?')))return false;
  formDirty=false;cleanupModal?.();cleanupModal=null;if(modal.open)modal.close();return true;
}
function openModal(title,subtitle,body,foot='',wide=false){
  if(modal.open&&!closeModal())return false;
  modal.className=wide?'wide':'';
  modal.innerHTML='<header class="modal-head"><div><h2 id="modal-title">'+e(title)+'</h2>'+(subtitle?'<p>'+e(subtitle)+'</p>':'')+'</div><div class="modal-head-controls">'+languageControl()+'<button type="button" class="icon-btn" data-cmd="close" aria-label="Close">'+icon('close',19)+'</button></div></header><div class="modal-body">'+body+'</div>'+(foot?'<footer class="modal-foot">'+foot+'</footer>':'');
  modal.showModal();modal.scrollTop=0;return true;
}
modal.addEventListener('cancel',event=>{event.preventDefault();closeModal();});
const appendDocs=r=>{
  const attached=rows('document').filter(x=>x.parentId===r.id);
  return attached.length?panel('Attachments',attached.map(x=>'<div>'+openLink(x.name,x.id)+'</div>').join('')):'';
};
const historyPanel=r=>r.history?.length?panel('History',table(['Stage','Date','Reference'],[...r.history].reverse(),x=>[status(x.status),e(formatDate(x.date)),e(x.reason||'—')])):'';
const stages={
  tender:{Received:['Under Evaluation','Cancelled'],'Under Evaluation':['Estimating','Pending Review','Cancelled'],Estimating:['Pending Review','Cancelled'],'Pending Review':['Approved for Bid','Estimating','Do Not Bid','Cancelled'],'Approved for Bid':['Submitted','Cancelled'],Submitted:['Awarded','Lost','Cancelled']},
  quote:{Draft:['Internal Review'],'Internal Review':['Approved','Draft'],Approved:['Sent'],Sent:['Accepted','Rejected','Expired']},
  project:{Awarded:['Active','Cancelled'],Active:['On Hold','Completed','Cancelled'],'On Hold':['Active','Cancelled'],Completed:['Closed','Active']},
  request:{Requested:['Reviewed','Cancelled'],Reviewed:['Approved','Rejected','Cancelled'],Approved:['Closed','Cancelled']},
  claim:{Draft:['Submitted','Cancelled'],Submitted:['Certified','Disputed','Cancelled'],Disputed:['Submitted','Cancelled']},
  variation:{Pending:['Approved','Rejected']},
  agreement:{Draft:['Internal Review'],'Internal Review':['Approved','Draft']},
};
const stageLabel={'Internal Review':'Send to review',Approved:'Approve',Draft:'Return to draft',Sent:'Record as sent',Accepted:'Record acceptance',Rejected:'Reject',Submitted:'Record submission',Certified:'Record certification',Reviewed:'Mark reviewed',Cancelled:'Cancel record','Approved for Bid':'Approve for bid',Disputed:'Record dispute',Active:'Activate',Completed:'Mark completed',Closed:'Close record','Under Evaluation':'Start evaluation','Pending Review':'Send to review',Estimating:'Move to estimating',Awarded:'Record award',Lost:'Record loss','On Hold':'Put on hold','Do Not Bid':'Record no-bid'};
function transitionButtons(r,action){
  return (stages[r.kind]?.[r.status]??[]).filter(next=>{
    if(!can(action,next))return false;
    if(r.kind==='agreement'&&next==='Approved')return hasRole('admin','manager','director');
    if(r.kind==='quote'&&['Approved','Accepted'].includes(next))return hasRole('admin','manager','director','mep');
    return true;
  }).map((next,i)=>actionButton(action,stageLabel[next]||next,r.id+'|'+next,{primary:i===0})).join('');
}
function openRecord(id){
  const r=rec(id);if(!r)return;
  if(r.kind==='mail'){mailOpen(id);return;}
  if(r.kind==='folder'){openDocumentFolder(id);return;}
  let body='',actions='',wide=false;
  const cur=r.currency,f=v=>amount(v,cur);
  const add=(...args)=>details(args);
  switch(r.kind){
    case 'client':
      body=add(['Company',r.name],['Service teams',clientGroups(r).join(' / ')],['Customer type',r.type],['Billing address',r.address],['Tax ID',r.taxId],['Notes',r.notes])+
        panel('Contacts',table(['Name','Phone','Email'],r.contacts??[],x=>[e(x.name),e(x.phone),e(x.email)]))+
        panel('Projects',table(['Project','Status'],rows('project').filter(x=>x.clientId===r.id),x=>[recordCell(x,x.code),status(x.status)]));
      body+=panel('Maintenance contracts',table(['Contract','Service model','Status'],rows('contract').filter(c=>c.clientId===r.id),c=>[recordCell(c,c.code),e(serviceTypes[c.serviceType||'scheduled']),status(c.status)]));
      actions=documentButton(r)+(can('client.update')?(hasRole('maintenance')&&!clientGroups(r).includes('maintenance')?button('Share with Maintenance','client.share|'+r.id):actionButton('client.update','Edit client profile',r.id)):'')+(can('mail.save')?button('Email client','mail.compose|'+r.id):'');break;
    case 'project': {
      const p=r.position;
      body=add(['Client',name(r.clientId),true],['Status',status(r.status),true],['Category',r.service],['Project lead',personName(r.managerEmployeeId,r.manager)],['Assigned staff',(r.staffEmployeeIds??[]).map(id=>personName(id)).filter(Boolean).join(', ')],['Site',r.location],['Contract',r.contract],['Start',formatDate(r.start)],['Expected completion',formatDate(r.end)],['Completion',meter(r.progress),true],['Payment terms',r.terms],['Retention',r.retention==null?'':r.retention+'%']);
      if(p)body+=panel('Cost and cash position',add(['Approved value',f(p.value)],['Budget',f(p.budget)],['Incurred direct cost',f(p.actual)],['Open commitments',f(p.committed)],['Uncommitted cost to complete',f(r.remaining)],['Forecast total',f(p.forecast)],['Forecast margin',pct(p.margin)],['Collected',f(p.paid)],['Outstanding',f(p.outstanding)]));
      const requirements=linksTo('requirement',r.id),progress=linksTo('progress',r.id), costs=linksTo('cost',r.id), orders=linksTo('po',r.id), billing=linksTo('claim',r.id), variations=linksTo('variation',r.id);
      if(requirements.length)body+=panel('Material requirements',table(['Material','Quantity','Action'],requirements,x=>[name(x.materialId),e(qty(x.quantity)+' '+x.unit),actionButton('request.create','Request purchase',r.id+'|'+x.materialId+'|'+x.quantity)]));
      if(orders.length)body+=panel('Purchase orders',table(['Order','Status'],orders,x=>[recordCell(x,x.code),status(x.status)]));
      if(billing.length)body+=panel('Progress claims',table(['Claim','Status'],billing,x=>[recordCell(x,x.code),status(x.status)]));
      if(variations.length)body+=panel('Variation orders',table(['Variation','Status'],variations,x=>[recordCell(x,x.code),status(x.status)]));
      if(costs.length&&p)body+=panel('Manual direct costs',table(['Cost','Type','~Amount'],costs,x=>[recordCell(x),e(x.type),num(f(x.amount))]));
      if(namedAssignments())body+=panel('Project tasks',table(['Task','Owner','Due','Status'],linksTo('task',r.id),task=>[recordCell(task),e(personName(task.ownerEmployeeId,task.ownerName)),e(formatDate(task.due)),status(task.status)]));
      if(progress.length)body+=panel('Progress history',table(['Date','Progress','Notes'],sorted(progress),x=>[e(formatDate(x.date)),meter(x.progress),e(x.notes)]));
      actions=join(namedAssignments()?actionButton('project.assign','Assign project team',r.id)+actionButton('task.create','Create task',r.id):'',actionButton('project.progress','Update progress',r.id,{primary:true}),actionButton('project.cost','Record cost',r.id),actionButton('variation.create','Add variation',r.id),
        actionButton('milestone.create','Add milestone',r.id),actionButton('claim.create','Prepare claim',r.id),actionButton('request.create','Request purchase',r.id),transitionButtons(r,'project.status'),documentButton(r));
      break;
    }
    case 'task':
      body=add(['Project',name(r.projectId),true],['Owner',personName(r.ownerEmployeeId,r.ownerName)],['Due',formatDate(r.due,true)],['Status',status(r.status),true],['Task details',r.notes],['Latest update',r.progressNote]);
      actions=actionButton('task.update','Update task',r.id)+actionButton('task.assign','Reassign task',r.id);break;
    case 'personnel': {
      const original=r.source;
      body=add(['Employee ID',r.employeeId??'Not provided in source'],['English name',r.name],['Position',r.position],['Department',r.department||'Not provided'],['Team',r.team||'Not provided'],
        ['Employment group',r.employmentGroup],['Login account',r.loginProvisioned?'Provisioned':'Unprovisioned'],['Permission profiles',employeeRoles(r.roles)],
        ['Approval grants',r.approvals.map(key=>state.data.approvalLabels[key]).join(', ')||'None'],['Review status',employeeReview(r)?'Needs review':r.reviewResolved?'Reviewed':'No open flags']);
      body+=panel('Source record',add(['Roster row',original.source_row],['Source position',original.position_source],['Source department',original.department_source||'Not provided'],
        ['Source team',original.team_source||'Not provided'],['Source profile',original.proposed_app_role],['Source review notes',original.review_notes],['Latest change reference',r.personnelReason]));
      actions=join(actionButton('personnel.edit','Edit organization details',r.id,{primary:true}),actionButton('personnel.roles','Edit permission profiles',r.id),
        actionButton('personnel.approvals','Edit approval grants',r.id),r.roles.length?button('Preview employee','preview.start|'+r.id,{small:true,icon:'people'}):'');break;
    }
    case 'tender': {
      const a=r.assessment;
      body=add(['Client',name(r.clientId),true],['Stage',status(r.status),true],['Deadline',formatDate(r.due,true)],['Contract value',f(r.value)],['Estimate',f(r.cost)],['Bid recommendation',status(a.decision),true],['Expected profit',f(a.profit)],['Expected margin',pct(a.margin)],['Peak cash deficit',f(a.exposure)],['Collateral held',f(a.collateral)],['Retention',f(a.retention)],['Duration',r.duration+' months']);
      if(a.missing?.length)body+=panel('Needs review','<div class="form-note" style="margin:0">'+a.missing.map(e).join('<br>')+'</div>');
      if(r.terms)body+=panel('Verified terms and source references','<p style="white-space:pre-wrap">'+e(r.terms)+'</p>');
      if(r.scope)body+=panel('Scope of work','<p>'+e(r.scope)+'</p>');
      if(r.boq?.length)body+=panel('Tender material BOQ',table(['Section','Material','Unit','Quantity','Source'],r.boq,line=>[
        e(line.section),e(line.description),e(line.unit),e(qty(line.quantity)),e(line.sourceRef||'Tender BOQ'),
      ]));
      if(a.cash.length)body+=panel('Cash exposure by month',table(['Month','~Expected receipts','~Expected spending','~Running cash'],a.cash,w=>[e(w.month),num(f(w.receipt)),num(f(w.spend)),num(f(w.balance))]));
      const linked=rows('quote').filter(x=>x.tenderId===r.id);
      if(linked.length)body+=panel('Quotations',linked.map(x=>openLink(x.code+' · '+x.name,x.id)).join('<br>'));
      if(r.status==='Approved for Bid')body+=panel(state.data.publicDemo?'AI quotation demo':'Quotation preparation','<p>Generate an editable draft using the tender BOQ and catalog prices. Review materials, quantities, labor and exclusions before approval.</p>');
      actions=join(r.status==='Approved for Bid'?actionButton('tender.quote','Create quotation',r.id,{primary:true}):'',editableTender(r)?actionButton('tender.update','Edit assessment',r.id):'',transitionButtons(r,'tender.transition'),documentButton(r),aiReviewActions(r));
      break;
    }
    case 'quote': {
      const q=r.totals;
      body=add(['Client',name(r.clientId),true],['Status',status(r.status),true],['Revision','R'+r.revision],['Valid through',formatDate(r.validUntil,true)],['Estimated cost',f(q.cost)],['Selling price before tax',f(q.selling)],['Gross profit',f(q.profit)],['Gross margin',pct(q.margin)],['Markup',pct(q.markup)],['Tax',f(q.tax)],['Client total',f(q.total)],['Payment terms',r.terms],['Warranty',r.warranty],['Exclusions',r.exclusions]);
      body+=panel('Bill of quantities',table(['Section','Description','Unit','Quantity','~Material rate','~Labor rate'],r.items,x=>[e(x.section),e(x.description),e(x.unit),e(qty(x.quantity)),num(f(x.material)),num(f(x.laborRate))]));
      if(r.generation)body+=panel('Quotation generation record',generationSummary(r.generation));
      const revs=rows('quote').filter(x=>x.code===r.code&&x.id!==r.id);
      if(revs.length)body+=panel('Other revisions',revs.map(x=>openLink('Revision '+x.revision+' · '+x.status,x.id)).join('<br>'));
      const versions=rows('quoteVersion').filter(x=>x.quoteId===r.id);
      if(versions.length)body+=panel('Approval snapshot',add(['Locked revision','R'+versions[0].revision],['Approved on',formatDate(versions[0].date,true)]));
      actions=join(r.status==='Draft'?actionButton('quote.edit','Edit quotation',r.id,{primary:true}):'',transitionButtons(r,'quote.transition'),
        ['Approved','Sent','Rejected','Expired'].includes(r.status)?actionButton('quote.revise','Create revision',r.id):'',
        r.status==='Accepted'&&!r.projectId?actionButton('project.award','Create awarded project',r.id,{primary:true}):'',
        ['Approved','Sent','Accepted','Rejected','Expired','Superseded'].includes(r.status)?exportButton('Client PDF','quote',r.id)+exportButton('Client Excel','quote',r.id,'xlsx'):'',
        hasRole('admin','manager','director','auditor','mep','estimator')?exportButton('Internal estimate','quote',r.id,'pdf',true):'',documentButton(r),aiReviewActions(r));
      body+=dispatchPanel(r);
      actions+=dispatchActions(r);
      wide=true;break;
    }
    case 'supplier':
      body=add(['Company',r.name],['Terms',r.terms],['Email',r.email],['Phone',r.phone]);break;
    case 'requisition': {
      const lines=requisitionLines(r);
      body=add(['Requisition',r.code],['Project',name(r.projectId),true],['Required',formatDate(r.needed,true)],['Status',requisitionStatus(r)],['Purchase reason',r.reason])+panel('Requested materials',
        '<p class="form-note">Review each material line to compare offers, authorize its shortage and create the purchase order.</p>'+table(['Material','Quantity','Shortage','Status',''],lines,line=>[
          e(rawName(rec(line.materialId))),e(qty(line.quantity)+' '+(rec(line.materialId)?.unit||'')),e(qty(line.shortage)),status(line.status),openLink('Review '+line.code,line.id),
        ]));
      actions=documentButton(r);wide=true;break;
    }
    case 'request': {
      const material=rec(r.materialId);
      body=add(['Project',name(r.projectId),true],['Material',name(r.materialId),true],['Required',formatDate(r.needed)],['Status',status(r.status),true],['Requested',qty(r.quantity)+' '+(material?.unit||'')],['Current shortage',qty(r.shortage)],['Approved shortage',r.approvedQty],['Unit price',r.price==null?'':f(r.price)],['Requested by',personName(r.requesterEmployeeId,r.requesterName)],['Reason',r.reason]);
      if(r.requisitionId&&rec(r.requisitionId))body=panel('Requisition',openLink(rawName(rec(r.requisitionId)),r.requisitionId))+body;
      const offers=rows('offer').filter(x=>x.requestId===r.id);
      if(offers.length)body+=panel('Supplier comparisons',table(['Supplier','Delivery','~Unit price','Terms','Warranty'],offers,x=>[recordCell(x),e(formatDate(x.due)),num(f(x.price)),e(x.terms),e(x.warranty)]));
      actions=join(transitionButtons(r,'request.transition'),['Requested','Reviewed','Approved'].includes(r.status)?actionButton('supplier.offer','Add supplier offer',r.id):'',
        r.status==='Approved'?actionButton('po.create','Generate purchase order',r.id,{primary:true}):'',documentButton(r));break;
    }
    case 'offer':
      body=add(['Supplier',name(r.supplierId),true],['Delivery',formatDate(r.due)],['Price',f(r.price)],['Payment terms',r.terms],['Warranty',r.warranty],['Specification',r.spec]);break;
    case 'po': {
      body=add(['Supplier',name(r.supplierId),true],['Project',name(r.projectId),true],['Material',name(r.materialId),true],['Status',status(r.status),true],['Expected delivery',formatDate(r.due,true)],['Ordered',qty(r.quantity)],['Received usable',qty(r.received)],['Remaining',qty(r.quantity-r.received)],['Unit price',r.price==null?'':f(r.price)],['Delivery location',r.location],['Purchasing owner',personName(r.buyerEmployeeId,r.buyerName)],['Delivery owner',personName(r.deliveryEmployeeId,r.deliveryName)],['Delivery proof',r.deliveryProof],['Receipt acknowledgment',r.deliveryAcknowledgment],['Payment terms',r.terms],['Closure reason',r.closeReason]);
      const receipts=rows('movement').filter(x=>x.poId===r.id);
      if(receipts.length)body+=panel('Goods receipts',table(['Reference','Warehouse','Quantity','Condition','Date'],receipts,x=>[recordCell(x),name(x.warehouseId),e(qty(x.quantity)),e(x.condition||'Usable'),e(formatDate(x.date))]));
      actions=join(namedAssignments()?actionButton('delivery.assign','Assign delivery',r.id)+actionButton('delivery.proof','Record proof of delivery',r.id)+actionButton('delivery.ack','Acknowledge delivery',r.id):'', ['Ordered','Partially Received'].includes(r.status)?actionButton('po.receive','Receive materials',r.id,{primary:true,icon:'truck'}):'',
        ['Ordered','Partially Received','Received'].includes(r.status)?actionButton('po.cancel','Close order',r.id):'',r.price==null?'':exportButton('Purchase order PDF','po',r.id),documentButton(r));break;
    }
    case 'material': {
      const age=r.lastMovement?Math.floor((Date.parse(today())-Date.parse(r.lastMovement))/86400000):null;
      body=add(['Code',r.code],['Barcode or QR value',r.barcode],['Category',r.category],['Specification',r.spec],['Base unit',r.unit],['Minimum',r.minimum],['Last movement',formatDate(r.lastMovement)],['Days since movement',age],['Verified price',r.price==null?'':f(r.price)],['Price verified on',r.priceDate],['Carrying value',r.stock.value==null?'':f(r.stock.value)]);
      if(age!=null&&age>=settings().agingDays)body+=panel('Inventory aging','<p class="form-note" style="margin:0">This item exceeds the configured movement age. Review redistribution or disposal.</p>');
      body+=panel('Warehouse balances',table(['Location','On hand','Reserved','Available'],r.bins,x=>[e(x.name),e(qty(x.onHand)),e(qty(x.reserved)),e(qty(x.free))]));
      if(r.priceHistory?.length)body+=panel('Price verification history',table(['Effective date','~Price','Source'],[...r.priceHistory].reverse(),x=>[e(formatDate(x.date)),num(amount(x.price,x.currency)),e(x.reason||'Original verified price')]));
      actions=join(actionButton('material.price','Verify new price',r.id),can('stock.move')?button('Issue stock','stock.issue|'+r.id,{small:true,icon:'scan',primary:true}):'',actionButton('stock.count','Count stock',r.id),actionButton('stock.reserve','Reserve stock',r.id));break;
    }
    case 'movement':
      body=add(['Material',name(r.materialId),true],['Movement',r.type],['Warehouse',name(r.warehouseId),true],['Quantity',qty(r.quantity)],['Condition',r.condition],['Date',formatDate(r.date,true)],['Project',r.projectId?name(r.projectId):'',true],['Reference',r.reason],['Recipient',personName(r.recipientEmployeeId,r.recipient)],['Warehouse handler',personName(r.handlerEmployeeId,r.handlerName)]);break;
    case 'count':
      body=add(['Item',name(r.materialId),true],['Warehouse',name(r.warehouseId),true],['System quantity',qty(r.onHand)],['Physical quantity',qty(r.counted)],['Difference',qty(r.counted-r.onHand)],['Status',status(r.status),true],['Reference',r.reason]);
      actions=r.status==='Pending'?actionButton('stock.adjust','Approve adjustment',r.id,{primary:true}):'';break;
    case 'contract': {
      const model=r.serviceType||'scheduled';
      body=add(['Service model',serviceTypes[model]],['Client',name(r.clientId),true],['Site',r.site],['Status',status(r.status),true],['Contract value',r.value===0&&r.billing?.includes('fees not agreed')?'Not agreed':r.value==null?'':f(r.value)],['Recorded material cost',r.materialCost==null?'':f(r.materialCost)],['Billing',r.billing],['Work interval',model==='troubleshooting'?'One-time attendance':r.frequency+' days'],['Start',formatDate(r.start,true)],['End',formatDate(r.end,true)],['Resident technicians',r.residentTechnicians??0],['Coverage hours',r.coverage||'Review required'],['Staffing and relief plan',r.staffingPlan||'Review required'],['Supervisor',personName(r.supervisorEmployeeId,r.supervisor)],['Technician',personName(r.technicianEmployeeId,r.technician)],['Covered assets',r.equipment],['Response and service terms',r.sla],['Safety instructions',r.safety])+
        panel('Service agreements',table(['Agreement','Revision','Status'],rows('agreement').filter(x=>x.contractId===r.id),x=>[recordCell(x,x.code),e('R'+x.revision),status(x.status)]))+
        panel('Jobs and operations rounds',table(['Job','Date','Technician','Status'],sorted(rows('job').filter(x=>x.contractId===r.id),'scheduled',false),x=>[recordCell(x,x.code),e(formatDate(x.scheduled)),e(x.technician),status(x.status)]));
      actions=join(actionButton('contract.schedule',model==='troubleshooting'?'Create one-time job':model==='om'?'Plan operations rounds':'Generate visits',r.id,{primary:true}),actionButton('contract.edit','Edit service plan',r.id),actionButton('agreement.create','Prepare agreement / revision',r.id),documentButton(r));break;
    }
    case 'agreement': {
      body=add(['Service contract',name(r.contractId),true],['Service model',serviceTypes[r.contractSnapshot.serviceType||'scheduled']],['Revision','R'+r.revision],['Status',status(r.status),true],['Contractor party',r.contractorParty],['Client party',r.clientParty],['TEAMS signatory',r.contractorSignatory||'Not nominated'],['Client signatory',r.clientSignatory||'Not nominated'],['Authority reference',r.authorityReference||'Not recorded'])+
        Object.entries(agreementSections).map(([key,label])=>panel(label,'<p class="clause-text">'+e(r[key]||'Needs agreement before approval')+'</p>')).join('')+dispatchPanel(r);
      actions=join(r.status==='Draft'?actionButton('agreement.edit','Edit agreement',r.id,{primary:true}):'',transitionButtons(r,'agreement.transition'),r.status==='Approved'?exportButton('Print letterhead PDF','agreement',r.id):'',dispatchActions(r));wide=true;break;
    }
    case 'dispatch': {
      body=add(['Document',name(r.parentId),true],['Revision','R'+r.documentRevision],['To',r.to],['Status',status(r.status),true],['Created',r.createdAt],['Provider reference',r.providerId],['Provider accepted',r.acceptedAt],['Error',r.error])+panel('Email message','<p class="clause-text">'+e(r.body)+'</p>')+panel('Attached signed/stamped scan',openLink(rec(r.documentId)?.name||'Scan',r.documentId));
      if(['Ready','Delivery unknown','Provider rejected'].includes(r.status)&&can('dispatch.create'))actions=button('Retry same send','dispatch.retry|'+r.id,{primary:true});
      if(r.status==='Simulated')body+='<div class="form-note">Simulation only. No email left this browser.</div>';
      if(r.status==='Provider accepted')body+='<div class="form-note">The provider accepted this message. Client inbox delivery has not been confirmed.</div>';
      break;
    }
    case 'job': {
      const c=rec(r.contractId);
      body=add(['Site',c?.site],['Equipment',c?.equipment],['Technician',personName(r.technicianEmployeeId,r.technician)],['Team lead',personName(r.leadEmployeeId)],['Scheduled',formatDate(r.scheduled,true)],['Status',status(r.status),true],['Time on job',r.minutes+' min'],['Safety instructions',c?.safety],['Findings',r.findings],['Customer acknowledgment',r.ack],['Customer remarks',r.remarks])+
        panel('Checklist',r.checklist.map(x=>'<p>'+icon(r.completed.includes(x)?'check':'clock',15)+' '+e(x)+'</p>').join(''));
      const used=rows('movement').filter(x=>x.jobId===r.id);
      if(used.length)body+=panel('Materials used',table(['Material','Quantity'],used,x=>[name(x.materialId),e(qty(x.quantity))]));
      actions=join(r.status==='Completed'?exportButton('Service report PDF','job',r.id):actionButton('job.update','Update job card',r.id,{primary:true})+actionButton('job.assign','Assign or reschedule',r.id),
        r.status!=='Completed'&&can('stock.move')?button('Issue job materials','stock.issue||'+r.id,{small:true,icon:'box'}):'',documentButton(r));break;
    }
    case 'milestone':
      body=add(['Project',name(r.projectId),true],['Amount',f(r.amount)],['Expected claim date',formatDate(r.due,true)],['Criteria',r.criteria]);
      actions=actionButton('claim.create','Prepare claim',r.projectId+'|'+r.id,{primary:true});break;
    case 'claim': {
      const inv=rows('invoice').find(x=>x.claimId===r.id);
      body=add(['Project',name(r.projectId),true],['Status',status(r.status),true],['Claimed',f(r.amount)],['Certified',f(r.certified)],['Retention',r.retention+'%'],['Retention held',r.certified==null?'':f(r.certified*r.retention/100)],['Submitted',r.submitted?formatDate(r.submitted,true):''],['Evidence',r.evidence],['Certification or dispute reference',r.reason],['Invoice',inv?openLink(inv.reference||inv.code,inv.id):'',true]);
      actions=join(transitionButtons(r,'claim.transition'),r.status==='Certified'&&!inv?actionButton('invoice.draft','Create invoice',r.id,{primary:true})+actionButton('invoice.create','Record legacy invoice reference',r.id):'',exportButton('Progress claim PDF','claim',r.id),documentButton(r));break;
    }
    case 'invoice': {
      const payments=rows('payment').filter(x=>x.invoiceId===r.id);
      const inv=r.snapshot||r;
      body=add(['Status',status(r.status),true],['Invoice type',r.nativeInvoice?(r.invoiceType==='tax'?'Tax Invoice':'Commercial Invoice'):'Legacy invoice reference'],['Customer',inv.buyer?.name||name(r.clientId),!inv.buyer],['Project',r.projectId?name(r.projectId):'',true],['Service contract',r.contractId?name(r.contractId):'',true],['Invoice number',r.reference||'Assigned when issued'],['Invoice date',formatDate(r.invoiceDate||r.date,true)],['Due',formatDate(r.due,true)],['Invoice amount',f(r.amount)],['Payments recorded',f(r.balance.paid)],['Outstanding',f(r.balance.outstanding)],['Void reason',r.voidReason||''],['Progress claim',rec(r.claimId)?openLink(rec(r.claimId).code,r.claimId):'',true]);
      if(r.nativeInvoice)body+=panel('Invoice line items',table(['Description','Unit','Quantity','~Unit rate','~Amount'],inv.items,x=>[e([x.descriptionKh,x.description].filter(Boolean).join(' / ')),e(x.unit),e(qty(x.quantity)),num(f(x.rate)),num(f(x.quantity*x.rate))]))+panel('Invoice totals',details([['Subtotal',f(inv.totals.subtotal)],['Discount',f(inv.discount)],['Before VAT',f(inv.totals.taxable)],['VAT',inv.taxRate+'% / '+f(inv.totals.tax)],['Total',f(inv.totals.total)],['KHR per USD',inv.fxRate||'Not configured'],['Payment terms',inv.terms]]))+(r.status==='Issued'?panel('Issued document','<p>The issued company, customer, line items and tax details are preserved in a locked snapshot.</p>'):'');
      body+=panel('Payment history',table(['Reference','Date','~Payment','Action'],payments,x=>[recordCell(x,x.code),e(formatDate(x.date)),num(f(x.amount)),x.amount>0&&!payments.some(y=>y.reverses===x.id)?actionButton('invoice.reverse','Reverse',x.id):'']));
      actions=join(r.nativeInvoice&&r.status==='Draft'?actionButton('invoice.edit','Edit draft',r.id)+actionButton('invoice.issue','Issue invoice',r.id,{primary:true}):'',r.nativeInvoice&&r.status==='Issued'?exportButton('Client invoice PDF','invoice',r.id)+button('Print invoice','invoice.print|'+r.id,{small:true,icon:'file'})+(can('mail.save')?button('Email client','mail.compose|'+r.id,{small:true,icon:'mail'}):''):'',r.nativeInvoice&&['Draft','Issued'].includes(r.status)&&!payments.length?actionButton('invoice.void','Void invoice',r.id):'',r.balance.outstanding>0&&!['Draft','Void'].includes(r.status)?actionButton('invoice.pay','Record payment',r.id,{primary:true}):'',documentButton(r));break;
    }
    case 'variation':
      body=add(['Project',name(r.projectId),true],['Status',status(r.status),true],['Variation value',f(r.value)],['Cost impact',f(r.cost)],['Client decision reference',r.evidence]);actions=transitionButtons(r,'variation.transition');break;
    case 'payment':
      body=add(['Reference',r.reference],['Recorded',formatDate(r.date,true)],['Amount',f(r.amount)],['Invoice',name(r.invoiceId),true]);break;
    case 'cost':
      body=add(['Cost type',r.type],['Amount',f(r.amount)],['Date',formatDate(r.date,true)]);break;
    case 'document':
      body=add(['Filename',r.name],[r.parentKind==='folder'?'Folder':'Linked record',rec(r.parentId)?openLink(rawName(rec(r.parentId)),r.parentId):'',true],['File type',r.type],['Size',Math.ceil(r.size/1024)+' KB']);
      actions=button('Download attachment',r.id,{attr:'file',icon:'download',small:true});break;
    case 'importLog':
      body=add(['Source file',r.name],['Import type',r.type],['Rows committed',r.count],['Verified cutoff',r.cutoff],['Imported',formatDate(r.date,true)]);break;
    case 'warehouse':
      body=add(['Location',r.location],['Warehouse',r.name],['Code',r.code]);break;
    case 'employee':
      body=add(['Employee',r.name],['Employee ID',r.employeeId],['Job title',r.position],['Department',r.department],['Team',r.team],
        ['Job functions',r.jobFunctions],['Sign-in email',r.email],['Roles',r.roles.map(roleLabel).join(', ')],['Access',status(accountStatus(r)),true]);
      actions=employeeAccountActions(r);break;
    default:body=add(['Date',formatDate(r.date,true)],['Status',r.status]);
  }
  openModal(rawName(r),[rawCode(r),kindLabels[r.kind]].filter(Boolean).join(' · '),body+historyPanel(r)+appendDocs(r),actions||button('Close','close',{small:true}),wide);
}

const input=(key,label,value='',options={})=>({key,label,value,...options});
const select=(key,label,choices,value='',options={})=>input(key,label,value,{type:'select',choices,...options});
const textarea=(key,label,value='',options={})=>input(key,label,value,{type:'textarea',full:true,...options});
const text=(key,label,value='',options={})=>input(key,label,value,options);
const number=(key,label,value='',options={})=>input(key,label,value,{type:'number',min:0,step:'any',...options});
const date=(key,label,value=today(),options={})=>input(key,label,value,{type:'date',...options});
const currency=(value=settings().currency||'USD')=>select('currency','Currency',[['USD','USD'],['KHR','KHR']],value);
const client=(value='')=>select('clientId','Client',optionRows('client'),value);
const project=(value='')=>select('projectId','Project',projectOptions(),value);
const material=(value='')=>select('materialId','Material',materialOptions(),value,{search:true});
const warehouse=(key='warehouseId',label='Warehouse',value='')=>select(key,label,optionRows('warehouse'),value);
const employeeSelect=(key,label,value='',options={})=>select(key,label,(state.data?.people??[]).map(person=>[person.id,person.name+' · '+person.position]),value,{search:!options.multiple,...options});
const reason=(label='Reason',value='')=>textarea('reason',label,value);
const optional={required:false};
function fieldHtml(f){
  const req=f.required===false?'':' required';
  let control;
  if(f.type==='select'){
    control='<select name="'+A(f.key)+'" aria-label="'+A(f.label)+'"'+req+(f.multiple?' multiple size="6"':'')+'>'+(f.multiple?'':'<option value="">'+e(f.emptyLabel||'Select '+f.label.toLowerCase())+'</option>')+f.choices.map(([v,label])=>'<option value="'+A(v)+'" '+((Array.isArray(f.value)?f.value.includes(v):f.value===v)?' selected':'')+'>'+e(label)+'</option>').join('')+'</select>';
    if(f.search)control='<input type="search" aria-label="Filter '+A(f.label)+'" placeholder="Search code or name" data-field-filter="'+A(f.key)+'" style="margin-bottom:4px">'+control;
  }else if(f.type==='textarea')control='<textarea name="'+A(f.key)+'"'+req+' maxlength="4000">'+e(f.value)+'</textarea>';
  else if(f.type==='checkbox')control='<input type="checkbox" name="'+A(f.key)+'"'+(f.value?' checked':'')+'>';
  else control='<input type="'+(f.type??'text')+'" name="'+A(f.key)+'" value="'+A(f.value)+'"'+req+(f.type==='number'?' inputmode="decimal" min="'+(f.min??0)+'" step="'+(f.step??'any')+'"':f.type==='file'?' accept="'+A(f.accept||'')+'"':' maxlength="300"')+'>';
  return '<label class="field '+(f.full?'full':'')+'">'+e(f.label)+control+(f.help?'<small>'+e(f.help)+'</small>':'')+'</label>';
}
function formDataValues(form){
  const formData=new FormData(form),result=Object.fromEntries(formData);
  $$('select[multiple]',form).forEach(x=>result[x.name]=formData.getAll(x.name));
  $$('input[type=checkbox][name]',form).forEach(x=>result[x.name]=x.checked);
  return result;
}
function formModal({title,sub='',fields=[],content='',notes='',submit='Save',wide=false,onSubmit,afterOpen}){
  const body='<form id="active-form"><p id="form-error" class="form-error" role="alert" hidden></p>'+(notes?'<div class="form-note">'+e(notes)+'</div>':'')+
    (fields.length?'<div class="form-grid">'+fields.map(fieldHtml).join('')+'</div>':'')+content+'</form>';
  const footer=button('Cancel','close')+'<button class="btn primary" type="submit" form="active-form">'+e(submit)+'</button>';
  if(!openModal(title,sub,body,footer,wide))return;
  const form=$('#active-form'),errorBox=$('#form-error'),save=$('button[type="submit"][form="active-form"]');
  $$('[data-field-filter]',form).forEach(filter=>{
    const select=form.elements[filter.dataset.fieldFilter],options=[...select.options].map(o=>[o.value,o.textContent]);
    filter.addEventListener('input',()=>{
      const chosen=select.value,q=filter.value.toLowerCase();
      select.replaceChildren(...options.filter(([id,label])=>!id||id===chosen||label.toLowerCase().includes(q)).map(([id,label])=>new Option(label,id,id===chosen,id===chosen)));
    });
  });
  form.addEventListener('input',()=>{formDirty=true;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(save.disabled)return;
    errorBox.hidden=true;save.disabled=true;
    try{await onSubmit(formDataValues(form),form);}
    catch(error){errorBox.textContent=error.message;errorBox.hidden=false;modal.scrollTop=0;}
    finally{save.disabled=false;}
  });
  afterOpen?.(form);
}
async function submitAction(action, values, key) {
  return (await api('/api/action',{method:'POST',json:{action,data:values,key}})).json();
}
function editOperation(action, config){
  const key=crypto.randomUUID();
  let lastPayload='',currentKey=key;
  formModal({...config,onSubmit:async (values,form)=>{
    const payload=config.transform?await config.transform(values,form):values;
    const serialized=JSON.stringify(payload);
    if(lastPayload&&lastPayload!==serialized)currentKey=crypto.randomUUID();
    lastPayload=serialized;
    const result=await submitAction(action,payload,currentKey);
    closeModal(true);
    try{await readState();render();if(result.id&&config.open!==false)openRecord(result.id);toast(config.success||'Record saved.');}
    catch(error){state.error=error.message;render();toast('The record was saved. Refresh to see the updated workspace.');}
  }});
}

const boqLabels={description:'Description',section:'Section',spec:'Specification',unit:'Unit',quantity:'Quantity',material:'Material rate',laborHours:'Labor hours',laborRate:'Labor rate',other:'Other cost'};
const emptyLine={section:'',description:'',spec:'',unit:'',quantity:1,material:0,laborHours:0,laborRate:0,other:0,materialId:'',override:''};
const editableTender=r=>['Received','Under Evaluation','Estimating','Pending Review'].includes(r.status);
const aiReviewLabels={tender:'Review tender with AI',boq:'Extract BOQ with AI',quote:'Review quotation with AI'};
function aiReviewActions(record){
  if(!state.data.aiReview)return '';
  const kinds=record.kind==='tender'?['tender','boq']:['quote'];
  return kinds.map(kind=>button(aiReviewLabels[kind],'ai.review|'+record.id+'|'+kind,{small:true,icon:'blueprint'})).join('');
}
function openAiReview(id,kind){
  const record=rec(id);
  if(!state.data.aiReview||!record||!Object.hasOwn(aiReviewLabels,kind))return;
  const linked=kind==='quote'?rec(record.tenderId):null;
  const files=rows('document').filter(row=>row.type==='application/pdf'&&(row.parentId===id||row.parentId===linked?.id));
  if(!files.length&&kind!=='quote'){toast('Attach a source PDF to this tender first.',true);return;}
  const controller=new AbortController();
  formModal({title:aiReviewLabels[kind],sub:record.code,submit:'Start AI review',wide:true,
    notes:kind==='quote'?'OpenAI processes the saved quotation scope, accessible approved tender scope and any PDF you select. Confirm sharing permission and verify the findings.':'OpenAI processes the selected PDF. Confirm sharing permission and verify the findings and references against the document.',
    fields:[select('attachmentId','Source PDF',files.map(row=>[row.id,row.name]),'',kind==='quote'?{...optional,emptyLabel:'Use saved scope only'}:{}),
      input('confirmed','I have permission to share the selected source for AI processing',false,{type:'checkbox',full:true})],
    content:'<p class="form-note" id="ai-review-progress" role="status" hidden>Reviewing source. This can take up to 45 seconds.</p>',
    afterOpen:()=>{cleanupModal=()=>controller.abort();},
    onSubmit:async(values,form)=>{
      if(!values.confirmed)throw Error('Confirm permission to process the selected AI source.');
      const progress=$('#ai-review-progress',form);
      progress.hidden=false;
      let review;
      try{review=await(await api('/api/ai/review',{method:'POST',signal:controller.signal,
        json:{kind,recordId:id,attachmentId:values.attachmentId,confirmed:true,language:getLanguage()}})).json();}
      finally{progress.hidden=true;}
      if(controller.signal.aborted||!form.isConnected)return;
      closeModal(true);
      openAiResult(record,review);
    }});
}
function openAiResult(record,review){
  const completeLines=review.kind==='boq'&&review.complete&&review.lines.length>0&&review.lines.every(line=>line.selectable);
  const useLines=completeLines&&editableTender(record)&&!record.boq?.length&&can('tender.update');
  const copy=value=>'<span data-no-translate>'+e(value)+'</span>';
  let body='<p class="form-note">AI review. Check every finding and quantity against the source before use.</p>'+
    '<p>'+copy(review.summary)+'</p>'+panel('Findings',table(['Topic','Observation','Source'],review.findings,item=>[
      copy(item.topic),copy(item.observation),copy(item.source),
    ]));
  if(review.kind==='boq'){
    body+=(!completeLines?'<p class="form-error">The BOQ needs correction or completion. Review a smaller PDF section or import the verified BOQ workbook.</p>':'')+
      panel('Extracted BOQ lines',table([...(useLines?['Confirm']:[]),'Section','Description','Specification','Unit','Quantity','Source','Review'],
        review.lines.map((line,index)=>({...line,index})),line=>[
          ...(useLines?[line.selectable?'<input type="checkbox" aria-label="'+A(line.description)+'" data-ai-line="'+line.index+'">':'']:[]),
          copy(line.section),copy(line.description),copy(line.spec),copy(line.unit),copy(line.quantity),copy(line.source),copy(line.review),
        ]));
  }
  const actions=button('Back to record',record.id,{attr:'open'})+
    (review.source?button('Download source PDF',review.source.id,{attr:'file',icon:'download'}):'')+
    (useLines?'<button id="ai-use-lines" type="button" class="btn primary">Open tender editor with confirmed lines</button>':'');
  if(!openModal('AI review results',record.code,body,actions,true))return;
  $('#ai-use-lines')?.addEventListener('click',()=>{
    const selected=$$('[data-ai-line]:checked',modal).map(box=>review.lines[Number(box.dataset.aiLine)]).filter(line=>line.selectable);
    if(selected.length!==review.lines.length){toast('Confirm every BOQ line against the source PDF before continuing.',true);return;}
    tenderForm('tender.update',record,{documentId:review.source.id,lines:selected.map(({section,description,spec,unit,quantity,source})=>({
      section,description,spec,unit,quantity,sourceRef:review.source.name.slice(0,90)+' / '+source,
    }))});
  });
}
function generationSummary(generation){
  return '<section class="ai-quote-summary"><header><span>'+icon('blueprint',20)+'</span><div><strong>'+(generation.mode==='simulation'?'Simulated AI quotation draft':'Quotation draft from tender BOQ')+'</strong><p>'+e(generation.tenderCode)+' / '+e(generation.source)+' / '+generation.matchedLines+' of '+generation.sourceLines+' source lines matched to the material catalog</p></div></header><ul>'+[...generation.assumptions,...generation.warnings].map(note=>'<li>'+e(note)+'</li>').join('')+'</ul></section>';
}
async function generateTenderQuotation(id){
  const tender=rec(id);
  if(!tender||tender.status!=='Approved for Bid'){toast('Approve this tender for bid before creating its quotation.',true);return;}
  try{
    const estimate=await(await api('/api/tender-estimate?id='+encodeURIComponent(id))).json();
    if(!estimate.ready){
      openModal('Tender materials need review',tender.code,generationSummary(estimate.generation)+table(['Source line','Material','Review needed'],estimate.unmatched,line=>[
        e(line.line),e(line.description),e(line.reason),
      ]),button('Close','close'),true);
      return;
    }
    quoteForm('tender.quote',id,estimate);
  }catch(error){toast(error.message,true);}
}
function quoteForm(action,id,generated){
  const existing=action==='quote.edit'?rec(id):null,tender=action==='tender.quote'?rec(id):null;
  const base=existing??generated?.quote;
  const selectedMaterial=action==='quote.create'&&rec(id)?.kind==='material'?rec(id):null;
  const selectedCurrency=base?.currency||tender?.currency||selectedMaterial?.currency||settings().currency;
  const startingLine=selectedMaterial?{...emptyLine,description:selectedMaterial.name,spec:selectedMaterial.spec||'',materialId:selectedMaterial.id,unit:selectedMaterial.unit,material:selectedMaterial.price??0}:emptyLine;
  const lines=(base?.items?.length?base.items:[startingLine]).map(x=>({...x}));
  const fields=[text('name','Quotation title',base?.name||tender?.name||''),client(base?.clientId||tender?.clientId),
    select('projectId','Existing project, if applicable',projectOptions(),base?.projectId||'',optional),currency(selectedCurrency),
    number('margin','Target gross margin (%)',base?.margin??settings().minMargin),number('tax','Tax (%)',base?.tax??settings().tax),
    number('indirect','Indirect costs',base?.indirect??0),number('risk','Risk allowance',base?.risk??0),
    number('discount','Discount',base?.discount??0),date('validUntil','Valid through',base?.validUntil||offset(14)),
    text('terms','Payment terms',base?.terms||'',optional),text('warranty','Warranty',base?.warranty||'',optional),textarea('exclusions','Exclusions and qualifications',base?.exclusions||'',optional)];
  editOperation(action,{title:existing?'Edit quotation':generated?'Review generated quotation':tender?'Quotation from tender':'Create quotation',sub:existing?.code||tender?.code||'',fields,wide:true,submit:generated?'Save quotation draft':'Save quotation',
    notes:generated?(generated.generation.mode==='simulation'?'AI simulation. ':'')+generated.generation.matchedLines+' catalog materials were added from '+generated.generation.source+'. Review the generated lines and assumptions before saving.':'',
    content:(generated?.generation||base?.generation?generationSummary(generated?.generation||base?.generation):'')+'<div class="catalog-picker"><label>Material price list<select id="quote-catalog" aria-label="Material from price list"></select></label><label>Quantity<input id="quote-catalog-qty" type="number" min="0.001" step="any" value="1" aria-label="Material quantity"></label><button type="button" class="btn" id="quote-catalog-add">'+icon('plus',15)+' Add material</button></div><div id="quote-price-review" class="quote-price-review" role="status" hidden></div><div class="file-drop"><label class="field">Import a BOQ <input id="boq-file" type="file" accept=".xlsx,.csv,.tsv,.pdf"></label><button class="btn small" id="boq-add" type="button">'+icon('plus',15)+' Add line</button></div><div id="boq-import"></div><div class="table-scroll" id="quote-lines"></div><div id="quote-totals" class="summary-line" aria-live="polite"></div>',
    transform:values=>({...values,id:existing?.id,tenderId:tender?.id,items:lines.filter(x=>x.description||x.unit||x.materialId),generation:generated?.generation??existing?.generation}),
    afterOpen:form=>{
      const lineWrap=$('#quote-lines'),importWrap=$('#boq-import');
      const match=x=>{
        const text=x.description.toLowerCase().trim(),spec=String(x.spec||'').toLowerCase();
        return rows('material').filter(m=>m.currency===form.elements.currency.value&&m.unit.toLowerCase()===x.unit.toLowerCase()&&
          (m.code.toLowerCase()===text||m.name.toLowerCase()===text||(spec&&m.name.toLowerCase().startsWith(text)&&m.spec.toLowerCase()===spec)));
      };
      const priceVerified=m=>m.priceDate&&Math.floor((Date.parse(today())-Date.parse(m.priceDate))/86400000)<=settings().priceDays;
      const priceReview=$('#quote-price-review');
      const drawPriceReview=()=>{
        const pending=lines.map((line,index)=>({line,index,material:rec(line.materialId)})).filter(({line,material})=>
          material&&!priceVerified(material)&&!String(line.override||'').trim());
        priceReview.hidden=!pending.length;
        priceReview.innerHTML='<strong>Material prices need review</strong><p>Prices must be reviewed every '+e(settings().priceDays)+' days. Enter current price evidence on each affected line.'+
          (state.data.publicDemo?' For this public demonstration, you can record that you are using the sample rate.':'')+'</p>'+
          pending.map(({index,material})=>'<div class="price-review-line"><span><strong>Line '+(index+1)+' / '+e(material.code)+'</strong> / '+e(material.name)+
            '<small>Last recorded rate '+e(amount(material.price,material.currency))+' per '+e(material.unit)+' / checked '+e(material.priceDate?formatDate(material.priceDate,true):'date not recorded')+'</small></span>'+
            (state.data.publicDemo?'<button type="button" class="btn small" data-sample-price="'+index+'">Use sample price for line '+(index+1)+'</button>':'')+'</div>').join('');
      };
      priceReview.addEventListener('click',event=>{
        const control=event.target.closest('[data-sample-price]');
        if(!control||!state.data.publicDemo)return;
        const line=lines[Number(control.dataset.samplePrice)],material=rec(line?.materialId);
        if(!line||!material)return;
        line.material=material.price;
        line.override='Public demo sample rate acknowledged. '+material.code+' / '+amount(material.price,material.currency)+' per '+material.unit+' / catalog date '+(material.priceDate||'not recorded')+'.';
        formDirty=true;draw();
        $('#form-error').hidden=true;
        toast('Sample rate recorded for this quotation line.');
      });
      const catalog=$('#quote-catalog');
      const updateCatalog=()=>catalog.replaceChildren(new Option('Select a priced material',''),...rows('material').filter(material=>material.currency===form.elements.currency.value).map(material=>
        new Option(material.code+' / '+material.name+' / '+amount(material.price,material.currency)+' per '+material.unit+(priceVerified(material)?'':' / verify price'),material.id)));
      updateCatalog();
      $('#quote-catalog-add').addEventListener('click',()=>{
        const material=rec(catalog.value),quantity=Number($('#quote-catalog-qty').value);
        if(!material||!(quantity>0)){toast('Select a material and enter a positive quantity.',true);return;}
        if(lines.length>=350){toast('A quotation supports up to 350 lines.',true);return;}
        if(lines.length===1&&!lines[0].description&&!lines[0].materialId)lines.splice(0,1);
        lines.push({...emptyLine,description:material.name,spec:material.spec||'',materialId:material.id,unit:material.unit,quantity,material:material.price??0});
        formDirty=true;draw();
        if(!priceVerified(material))toast('Verify this material price or record current price evidence before saving.',true);
      });
      const quickNumber=n=>Number(n)||0;
      const totals=()=>{
        const currency=form.elements.currency.value,cents=currency==='KHR'?1:100,r=n=>Math.round((n+Number.EPSILON)*cents)/cents;
        const cost=r(lines.reduce((s,x)=>s+r(quickNumber(x.quantity)*(quickNumber(x.material)+quickNumber(x.laborHours)*quickNumber(x.laborRate)+quickNumber(x.other))),0)
          +quickNumber(form.elements.indirect.value)+quickNumber(form.elements.risk.value));
        const margin=quickNumber(form.elements.margin.value),selling=margin>=100?0:r(cost/(1-margin/100)-quickNumber(form.elements.discount.value));
        const tax=r(selling*quickNumber(form.elements.tax.value)/100),profit=selling-cost;
        $('#quote-totals').innerHTML=[['Estimated cost',amount(cost,currency)],['Price before tax',amount(selling,currency)],['Client total',amount(selling+tax,currency)],
          ['Gross margin',pct(selling?profit/selling*100:0)],['Markup',pct(cost?profit/cost*100:0)]].map(([t,v])=>'<span>'+e(t)+' <b>'+e(v)+'</b></span>').join('');
      };
      const names=[['section','Section'],['description','Description'],['spec','Specification'],['unit','Unit'],['quantity','Qty'],['materialId','Material match'],['material','Material / unit'],['laborHours','Labor h / unit'],['laborRate','Labor rate'],['other','Other / unit'],['override','Price evidence / override']];
      const draw=()=>{
        lineWrap.innerHTML='<table class="table line-table"><thead><tr>'+names.map(([,label])=>'<th>'+e(label)+'</th>').join('')+'<th></th></tr></thead><tbody>'+lines.map((x,i)=>'<tr>'+names.map(([key,label])=>{
          const pos=' data-line="'+i+'" data-value="'+key+'" aria-label="'+A(label+' line '+(i+1))+'"';
          if(key==='materialId'){
            const materials=rows('material').filter(m=>m.currency===form.elements.currency.value||m.id===x.materialId);
            return '<td><select class="line-input"'+pos+'><option value="">Manual</option>'+materials.map(m=>'<option value="'+A(m.id)+'" '+(m.id===x.materialId?'selected':'')+'>'+e(m.code+' '+m.name+(priceVerified(m)?'':' [verify price]'))+'</option>').join('')+'</select></td>';
          }
          const isNum=['quantity','material','laborHours','laborRate','other'].includes(key);
          return '<td><input class="line-input" '+(isNum?'type="number" inputmode="decimal" step="any" min="0"':'type="text"')+pos+' value="'+A(x[key])+'"></td>';
        }).join('')+'<td><button class="icon-btn" style="width:29px;height:31px" data-delete-line="'+i+'" aria-label="Remove line '+(i+1)+'" type="button">'+icon('close',13)+'</button></td></tr>').join('')+'</tbody></table>';
        totals();drawPriceReview();
      };
      form.addEventListener('input',event=>{
        const el=event.target;
        if(el.dataset.line!=null){
          const line=lines[Number(el.dataset.line)],key=el.dataset.value;
          line[key]=el.type==='number'?quickNumber(el.value):el.value;
          if(key==='materialId'){
            const m=rec(el.value);
            if(m){
              if(!line.description)line.description=m.name;
              line.unit=m.unit;
              if(priceVerified(m)){line.material=m.price;line.override='';}
              else toast('This price needs verification before it can be used.',true);
              draw();
            }
          }
        }
        if(el.name==='currency'){draw();updateCatalog();}else{totals();drawPriceReview();}
      });
      lineWrap.addEventListener('click',event=>{
        const control=event.target.closest('[data-delete-line]');if(!control)return;
        lines.splice(Number(control.dataset.deleteLine),1);
        if(!lines.length)lines.push({...emptyLine});
        formDirty=true;draw();
      });
      $('#boq-add').addEventListener('click',()=>{lines.push({...emptyLine});formDirty=true;draw();});
      $('#boq-file').addEventListener('change',async event=>{
        const file=event.target.files[0];if(!file)return;
        importWrap.innerHTML='<p class="form-note">Reading the file...</p>';
        try{
          const sheets=await readBoq(file);
          importWrap.innerHTML='<div class="form-note"><div class="form-grid"><label class="field">Worksheet or PDF page <select id="boq-sheet">'+sheets.map((s,i)=>'<option value="'+i+'">'+e(s.name)+'</option>').join('')+'</select></label><label class="field">Header row <input id="boq-header" type="number" min="1" max="100" value="1"></label></div><div id="boq-map" class="form-grid" style="margin-top:9px"></div><div id="boq-preview" style="margin-top:9px"></div><button type="button" class="btn small primary" id="boq-confirm" style="margin-top:9px">Confirm selected lines</button></div>';
          const sheetSelect=$('#boq-sheet'),header=$('#boq-header'),mapWrap=$('#boq-map'),preview=$('#boq-preview'),confirm=$('#boq-confirm');
          let current={items:[],warnings:[]};
          const recalc=()=>{
            const map=Object.fromEntries($$('select[data-boq-key]',mapWrap).filter(x=>x.value!=='').map(x=>[x.dataset.boqKey,Number(x.value)]));
            current=mapBoq(sheets[Number(sheetSelect.value)],Math.max(0,Number(header.value)-1),map);
            let flagged=0;
            current.items=current.items.map(item=>{
              const matches=match(item);
              if(matches.length===1&&priceVerified(matches[0]))return {...item,materialId:matches[0].id,material:matches[0].price,override:''};
              if(matches.length||!item.material)flagged++;
              return item;
            });
            const available=map.description!=null&&map.quantity!=null&&map.unit!=null;
            confirm.disabled=!available||!current.items.length;
            preview.innerHTML='<p>'+current.items.length+' rows ready. '+flagged+' lines need a price or material check. '+current.warnings.length+' import notices.</p>'+
              (current.warnings.length?'<p class="muted">'+current.warnings.slice(0,5).map(e).join('<br>')+'</p>':'')+
              table(['Description','Unit','Qty','Material cost'],current.items.slice(0,6),item=>[e(item.description),e(item.unit),e(qty(item.quantity)),e(amount(item.material,form.elements.currency.value))],'Map description, quantity and unit to preview lines.');
          };
          const drawMapping=()=>{
            const sheet=sheets[Number(sheetSelect.value)],index=Math.max(0,Number(header.value)-1);
            const headers=sheet.rows[index]??[];
            const guess=propose([headers]).mapping;
            const width=Math.min(32,Math.max(headers.length,...sheet.rows.slice(index,index+6).map(r=>r.length)));
            mapWrap.innerHTML=boqFields.map(k=>'<label class="field">'+e(boqLabels[k])+'<select data-boq-key="'+k+'"><option value="">Skip</option>'+Array.from({length:width},(_,i)=>'<option value="'+i+'" '+(guess[k]===i?'selected':'')+'>'+e((i+1)+'. '+(headers[i]||'Column'))+'</option>').join('')+'</select></label>').join('');
            recalc();
          };
          const changeSheet=()=>{header.value=propose(sheets[Number(sheetSelect.value)].rows).index+1;drawMapping();};
          sheetSelect.addEventListener('change',changeSheet);header.addEventListener('change',drawMapping);mapWrap.addEventListener('change',recalc);
          confirm.addEventListener('click',()=>{
            if(lines.filter(x=>x.description||x.unit||x.materialId).length+current.items.length>350){toast('A quotation supports up to 350 lines.',true);return;}
            if(lines.length===1&&!lines[0].description&&!lines[0].unit)lines.length=0;
            lines.push(...current.items.map(x=>({...x})));
            formDirty=true;draw();
            toast(current.items.length+' lines added. Review all rates before saving.');
            confirm.disabled=true;
          });
          changeSheet();
        }catch(error){importWrap.innerHTML='<p class="form-error">'+e(error.message)+'</p>';}
      });
      draw();
    },
  });
}
function tenderForm(action,r,aiBoq=null){
  let boq=structuredClone(aiBoq?.lines??r?.boq??[]),boqImportError='',boqLoad=0;
  const fields=[text('name','Tender title',r?.name),client(r?.clientId),date('due','Submission deadline',r?.due||offset(7)),currency(r?.currency),number('value','Contract value',r?.value??0),
    number('cost','Estimated project cost',r?.cost??0),number('upfront','Upfront materials and mobilization',r?.upfront??0),number('duration','Project months',r?.duration??6,{min:1,step:1}),
    number('advance','Customer advance (%)',r?.advance??0),number('retention','Retention (%)',r?.retention??0),number('delay','Payment delay in months',r?.delay??0,{step:1}),
    number('guarantee','Guarantee face value (% of contract)',r?.guarantee??0),number('collateral','Cash collateral (% of guarantee)',r?.collateral??0),number('fee','Guarantee fees',r?.fee??0),
    number('hours','Estimating hours',r?.hours??0),textarea('scope','Scope of work',r?.scope||'',optional),
    number('estimateMargin','Quotation target margin (%)',r?.estimateMargin??settings().minMargin),
    number('estimateIndirect','Quotation indirect allowance',r?.estimateIndirect??0),number('estimateRisk','Quotation risk allowance',r?.estimateRisk??0),
    text('paymentTerms','Quotation payment terms',r?.paymentTerms||'',optional),text('warranty','Quotation warranty',r?.warranty||'',optional),
    textarea('terms','Verified commercial terms and source references',r?.terms||'',optional)];
  editOperation(action,{title:r?'Edit tender assessment':'Analyze tender',sub:r?.code||'',fields,submit:'Save assessment',wide:false,
    content:'<div class="file-drop"><label class="field">Import tender material BOQ<input id="tender-boq" type="file" accept=".xlsx,.csv,.tsv"></label></div><p class="muted">Use Description, Quantity and Unit columns. The selected worksheet supplies the tender BOQ. Catalog prices are applied when the quotation is generated.</p><div id="tender-boq-preview">'+(aiBoq?'<p class="form-note">Confirmed AI lines are ready for review and saving.</p>'+table(['Description','Quantity','Unit','Source'],boq,line=>[e(line.description),e(qty(line.quantity)),e(line.unit),e(line.sourceRef)]):boq.length?'<p class="form-note">'+boq.length+' saved BOQ lines</p>':'')+'</div><div class="file-drop"><label class="field">Find terms in a searchable PDF<input id="tender-pdf" type="file" accept=".pdf"></label></div><div id="term-preview"></div>',
    transform:values=>{if(boqImportError)throw Error(boqImportError);return {...values,id:r?.id,boq,aiBoqDocumentId:aiBoq?.documentId};},afterOpen:form=>{
      if(aiBoq)formDirty=true;
      $('#tender-boq').addEventListener('change',async event=>{
        const file=event.target.files[0],output=$('#tender-boq-preview');
        const currentLoad=++boqLoad;
        if(!file){boqImportError='';return;}
        boqImportError='Wait for the BOQ import to finish.';
        try{
          if(file.size>10000000)throw Error('Use a BOQ file up to 10 MB.');
          const sheets=await readBoq(file);
          if(currentLoad!==boqLoad||!form.isConnected)return;
          output.innerHTML='<label class="field">BOQ worksheet<select id="tender-boq-sheet" aria-label="BOQ worksheet">'+sheets.map((sheet,index)=>'<option value="'+index+'">'+e(sheet.name)+'</option>').join('')+'</select></label><div id="tender-boq-lines"></div>';
          const selector=$('#tender-boq-sheet');
          const readSheet=()=>{
            const preview=$('#tender-boq-lines'),sheet=sheets[Number(selector.value)];
            try{
              const proposed=propose(sheet.rows),mapping=proposed.mapping;
              if(['description','quantity','unit'].some(field=>mapping[field]==null))throw Error('Include Description, Quantity and Unit headers in this worksheet.');
              const mapped=mapBoq(sheet,proposed.index,mapping);
              if(mapped.warnings.length)throw Error('Review the source BOQ before importing. '+mapped.warnings.slice(0,3).join(' '));
              if(!mapped.items.length)throw Error('This worksheet has no valid material lines.');
              boq=mapped.items.map((line,index)=>({description:line.description,section:line.section,spec:line.spec,quantity:line.quantity,unit:line.unit,
                sourceRef:file.name+' / '+sheet.name+' / material line '+(index+1),
                ...(mapping.laborHours!=null?{laborHours:line.laborHours}:{}),...(mapping.laborRate!=null?{laborRate:line.laborRate}:{}),
                ...(mapping.other!=null?{other:line.other}:{}),
              }));
              boqImportError='';formDirty=true;
              preview.innerHTML='<p class="form-note">'+boq.length+' BOQ lines loaded. Review this selected worksheet before saving.</p>'+table(['Description','Quantity','Unit'],boq,line=>[e(line.description),e(qty(line.quantity)),e(line.unit)]);
            }catch(error){boqImportError=error.message;preview.innerHTML='<p class="form-error">'+e(error.message)+'</p>';}
          };
          selector.addEventListener('change',readSheet);readSheet();
        }catch(error){boqImportError=error.message;output.innerHTML='<p class="form-error">'+e(error.message)+'</p>';}
      });
      $('#tender-pdf').addEventListener('change',async event=>{
        const file=event.target.files[0],output=$('#term-preview');if(!file)return;
        if(file.size>10000000){output.innerHTML='<p class="form-error">Use a PDF up to 10 MB.</p>';return;}
        output.innerHTML='<p class="form-note">Reading document text...</p>';
        try{
          const pages=await pdfText(await file.arrayBuffer());
          const pattern=/submission|liquidated damages|retention|bid security|bid bond|advance payment|performance guarantee|insurance|warranty|milestone|payment terms|contract period|exclusion|scope of work|client.supplied/i;
          const hits=pages.flatMap(p=>p.rows.map(row=>row.join(' ')).filter(line=>pattern.test(line)).map(line=>file.name+' · '+p.name+': '+line)).slice(0,25);
          output.innerHTML=hits.length?'<div class="form-note"><strong>Candidate terms. Verify each against the PDF before adding it.</strong>'+hits.map((term,i)=>'<label class="choice"><input type="checkbox" data-term="'+i+'">'+e(term)+'</label>').join('')+'<button type="button" id="terms-add" class="btn small">Add verified excerpts</button></div>':'<p class="form-note">No matching terms were found. Review and enter the confirmed terms manually.</p>';
          $('#terms-add')?.addEventListener('click',()=>{const add=$$('[data-term]:checked',output).map(x=>hits[Number(x.dataset.term)]).join('\n');if(add){form.elements.terms.value=[form.elements.terms.value,add].filter(Boolean).join('\n');formDirty=true;toast('Verified excerpts added. Attach the source PDF to the tender record after saving.');}});
        }catch(error){output.innerHTML='<p class="form-error">'+e(error.message)+'</p>';}
      });
    },
  });
}
function scanner(selectElement,form){
  const host=$('#scan-panel',form),trigger=$('#start-scan',form);
  let stream,frame=0,busy=false,active=false;
  cleanupModal=()=>{active=false;cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());};
  trigger.addEventListener('click',async()=>{
    if(active){cleanupModal();host.innerHTML='';trigger.textContent='Scan QR or barcode';return;}
    if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){
      host.innerHTML='<p class="form-note">Camera scanning is unavailable in this browser. Search for the item code or use a keyboard scanner.</p>';return;
    }
    try{
      const supported=await BarcodeDetector.getSupportedFormats(),formats=['qr_code','code_128','code_39','ean_13','ean_8','upc_a','data_matrix'].filter(x=>supported.includes(x));
      if(!formats.length)throw Error('No supported scan formats.');
      const detector=new BarcodeDetector({formats});
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(!modal.open||!form.isConnected){stream.getTracks().forEach(x=>x.stop());return;}
      host.innerHTML='<video autoplay muted playsinline class="scan-preview"></video><p class="muted">Position the item label inside the camera view.</p>';
      const video=$('video',host);video.srcObject=stream;active=true;trigger.textContent='Stop scanner';
      await video.play();
      const tick=async()=>{
        if(!active)return;
        if(!busy&&video.readyState>=2){
          busy=true;
          try{
            const found=await detector.detect(video);
            const code=found[0]?.rawValue?.trim();
            if(code){
              const row=rows('material').find(m=>[m.barcode,m.code].some(x=>x?.toLowerCase()===code.toLowerCase()));
              if(row){
                const filter=$('[data-field-filter="materialId"]',form);
                if(filter){filter.value='';filter.dispatchEvent(new Event('input'));}
                selectElement.value=row.id;selectElement.dispatchEvent(new Event('input',{bubbles:true}));
                cleanupModal();host.innerHTML='<p class="form-note">Scanned '+e(row.code)+' · '+e(row.name)+'</p>';trigger.textContent='Scan QR or barcode';return;
              }
              host.querySelector('p').textContent='Unknown item code. Check the label or search manually.';
            }
          }catch{}
          busy=false;
        }
        frame=requestAnimationFrame(tick);
      };
      frame=requestAnimationFrame(tick);
    }catch(error){cleanupModal();host.innerHTML='<p class="form-note">Camera unavailable. Search by code or allow camera access and retry.</p>';trigger.textContent='Scan QR or barcode';}
  });
}
function stockForm(cmd,id,jobId){
  const type={'stock.issue':'Issue','stock.in':'Stock In','stock.return':'Return','stock.transfer':'Transfer','stock.supplier':'Supplier Return'}[cmd];
  const fields=[material(id),warehouse('warehouseId',type==='Transfer'?'Source warehouse':'Warehouse'),number('quantity','Quantity','',{min:.001})];
  if(namedAssignments())fields.push(employeeSelect('handlerEmployeeId','Warehouse handler',demoEmployee(),isPrivate()?{}:optional));
  if(type==='Issue'){
    if(namedAssignments())fields.push(employeeSelect('recipientEmployeeId','Internal recipient','',optional));
    fields.push(text('recipient',namedAssignments()?'External recipient':'Recipient','',namedAssignments()?optional:{}),select('projectId','Charge to project',projectOptions(),'',optional),
      select('jobId','Or maintenance visit',optionRows('job',x=>x.status!=='Completed'),jobId||'',optional),text('expense','Or expense category','',optional));
  }
  if(type==='Stock In')fields.push(number('cost','Verified unit cost'));
  if(type==='Return')fields.push(project(),select('issueId','Original issue',rows('movement').filter(x=>x.type==='Issue'&&x.projectId).map(x=>[x.id,rawName(rec(x.materialId))+' · '+qty(x.quantity)+' · '+formatDate(x.date)])),select('condition','Condition',[['Usable','Usable'],['Damaged','Damaged']],'Usable'));
  if(type==='Transfer')fields.push(warehouse('toWarehouseId','Destination warehouse'),text('transferConfirmation','Received by'));
  fields.push(reason('Reference or reason'));
  editOperation('stock.move',{title:{Issue:'Issue materials','Stock In':'Receive unlinked stock',Return:'Return project stock',Transfer:'Transfer stock','Supplier Return':'Return stock to supplier'}[type],fields,submit:'Post movement',
    notes:type==='Stock In'?'Use a purchase order receipt when the delivery is against a PO.':type==='Transfer'?'Confirm physical receipt at the destination before posting.':'',
    content:'<div class="file-drop"><button type="button" id="start-scan" class="btn small">'+icon('scan',16)+' Scan QR or barcode</button></div><div id="scan-panel"></div>',
    transform:values=>({...values,type}),afterOpen:form=>scanner(form.elements.materialId,form)});
}

function purchaseRequestForm(projectId='',materialId='',quantity=''){
  const lines=[{materialId,quantity:quantity||1}];
  const fields=[project(projectId),text('name','Requisition title'),
    ...(namedAssignments()&&!state.data.actor.previewEmployeeId?[employeeSelect('requesterEmployeeId','Requesting employee',demoEmployee(),isPrivate()?{}:optional)]:[]),
    date('needed','Needed by',offset(7)),reason('Purchase reason')];
  editOperation('request.create',{title:'Request purchase',sub:'One requisition with multiple material lines',fields,wide:true,submit:'Create requisition',
    content:'<div class="section-toolbar"><h3>Materials requested</h3><button class="btn small" type="button" id="request-add-line">'+icon('plus',15)+' Add material</button></div><div class="table-scroll" id="request-material-lines"></div><div class="summary-line" id="request-estimate" aria-live="polite"></div>',
    transform:values=>({...values,items:lines.map(line=>({...line}))}),
    afterOpen:form=>{
      const host=$('#request-material-lines');
      const totals=()=>{
        const currency=rec(form.elements.projectId.value)?.currency;
        const priced=lines.every(line=>rec(line.materialId)?.price!=null);
        $('#request-estimate').textContent=lines.length+' material '+(lines.length===1?'line':'lines')+(priced&&currency?' / Estimated material value '+amount(lines.reduce((sum,line)=>sum+(Number(line.quantity)||0)*(rec(line.materialId)?.price||0),0),currency):'');
      };
      const draw=()=>{
        const currency=rec(form.elements.projectId.value)?.currency;
        const materials=rows('material').filter(material=>!currency||material.currency===currency);
        host.innerHTML='<table class="table request-line-table"><thead><tr><th>Material</th><th>Quantity</th><th>Unit</th><th>Unit price</th><th></th></tr></thead><tbody>'+lines.map((line,index)=>{
          const material=rec(line.materialId);
          return '<tr><td><select required data-request-material="'+index+'" aria-label="Material line '+(index+1)+'"><option value="">Select material</option>'+materials.map(row=>'<option value="'+A(row.id)+'"'+(row.id===line.materialId?' selected':'')+'>'+e(row.code+' / '+row.name)+'</option>').join('')+'</select></td>'+
            '<td><input type="number" required min="0.001" step="any" value="'+A(line.quantity)+'" data-request-quantity="'+index+'" aria-label="Quantity line '+(index+1)+'"></td><td>'+e(material?.unit||'')+'</td><td>'+(material?.price!=null?e(amount(material.price,material.currency)):'')+'</td>'+
            '<td><button class="icon-btn" type="button" data-request-remove="'+index+'" aria-label="Remove material line '+(index+1)+'"'+(lines.length===1?' disabled':'')+'>'+icon('close',15)+'</button></td></tr>';
        }).join('')+'</tbody></table>';
        totals();
      };
      $('#request-add-line').addEventListener('click',()=>{if(lines.length>=100){toast('A requisition supports up to 100 materials.',true);return;}lines.push({materialId:'',quantity:1});formDirty=true;draw();});
      host.addEventListener('change',event=>{
        const index=event.target.dataset.requestMaterial;
        if(index!==undefined){lines[Number(index)].materialId=event.target.value;draw();}
      });
      host.addEventListener('input',event=>{
        const index=event.target.dataset.requestQuantity;
        if(index!==undefined){lines[Number(index)].quantity=event.target.value;totals();}
      });
      host.addEventListener('click',event=>{
        const remove=event.target.closest('[data-request-remove]');
        if(remove&&lines.length>1){lines.splice(Number(remove.dataset.requestRemove),1);formDirty=true;draw();}
      });
      form.elements.projectId.addEventListener('change',()=>{for(const line of lines)if(rec(line.materialId)?.currency!==rec(form.elements.projectId.value)?.currency)line.materialId='';draw();});
      draw();
    }});
}
function formOperation(cmd,id,arg,extra){
  const r=rec(id);
  const config=(title,fields,more={})=>editOperation(cmd,{title,fields,...more,transform:values=>({id,...values,...(more.values||{})})});
  const onProject=(title,fields,more={})=>config(title,[project(r?.kind==='project'?r.id:id),...fields],more);
  const projectFields=(title='')=>[text('name','Project name',title),text('location','Site location'),text('service','Service category'),(namedAssignments()?employeeSelect('managerEmployeeId','Project lead',demoEmployee()):text('manager','Project lead')),text('contract','Contract reference'),date('start','Start date'),date('end','Expected completion',offset(90)),number('retention','Retention (%)',0)];
  switch(cmd){
    case 'quote.create':case 'quote.edit':return quoteForm(cmd,id);
    case 'tender.quote':return generateTenderQuotation(id);
    case 'tender.create':case 'tender.update':return tenderForm(cmd,r);
    case 'stock.issue':case 'stock.in':case 'stock.return':case 'stock.transfer':case 'stock.supplier':return stockForm(cmd,id,arg);
    case 'client.create':
      return config('Add client',[text('name','Company name'),select('serviceGroups','Service teams',[['installation','Installation'],['maintenance','Maintenance']],hasRole('maintenance')||state.view==='maintenance'?['maintenance']:['installation'],{multiple:true,help:'Select both teams when the client is shared.'}),text('type','Customer type','Corporate'),text('contact','Primary contact','',optional),text('phone','Phone','',optional),
        text('email','Email','',{type:'email',...optional}),text('taxId','Tax ID','',optional),textarea('address','Billing address','',optional),textarea('notes','Internal notes','',optional)]);
    case 'client.update':return config('Edit client profile',[select('serviceGroups','Service teams',[['installation','Installation'],['maintenance','Maintenance']],clientGroups(r),{multiple:true}),text('contact','Contact name',r.contacts?.[0]?.name),text('phone','Phone',r.contacts?.[0]?.phone||'',optional),text('email','Email',r.contacts?.[0]?.email||'',{type:'email',...optional}),textarea('address','Billing address',r.address||'',optional),textarea('notes','Notes',r.notes||'',optional),reason('Client change reference')]);
    case 'supplier.create':
      return config('Add supplier',[text('name','Supplier name'),text('email','Email','',{type:'email',...optional}),text('phone','Phone','',optional),text('terms','Payment terms','',optional)]);
    case 'warehouse.create':
      return config('Add warehouse',[text('name','Warehouse name'),text('code','Warehouse code'),text('location','Location')]);
    case 'project.create':
      return config('Create awarded project',[client(),...projectFields(),currency(),number('value','Contract value'),number('budget','Approved budget'),textarea('terms','Payment terms','',optional)]);
    case 'project.award':
      return config('Create awarded project',projectFields(r?.name),{sub:r?.code,notes:'The accepted quotation supplies the client, approved value, cost budget and material requirements.',submit:'Create project'});
    case 'personnel.edit':
      return config('Edit organization details',[text('position','Position',r.position),text('department','Department',r.department,optional),text('team','Team',r.team,optional),
        input('reviewResolved','Mark source issues reviewed',r.reviewResolved,{type:'checkbox',required:false}),reason('Change reason')],{sub:r.name});
    case 'personnel.roles':
      return config('Edit permission profiles',[select('roles','Permission profiles',state.data.roleCatalog.map(x=>[x.role,roleLabel(x.role)]),r.roles,
        {multiple:true,required:false,help:'Select all applicable profiles. Clear the selection for no access.'}),reason('Change reason')],{sub:r.name,notes:'Profile assignments do not provision login accounts or grant approval authority.'});
    case 'personnel.approvals': {
      const permitted=[...new Set(state.data.roleCatalog.filter(x=>r.roles.includes(x.role)).flatMap(x=>x.approvals))];
      return config('Edit approval grants',[select('approvals','Authorized decisions',permitted.map(x=>[x,state.data.approvalLabels[x]]),r.approvals,
        {multiple:true,required:false}),reason('Authorization reference')],{sub:r.name,notes:'Record documented authority for each selected decision.'});
    }
    case 'project.assign':
      return config('Assign project team',[employeeSelect('managerEmployeeId','Project lead',r.managerEmployeeId),employeeSelect('staffEmployeeIds','Assigned staff',r.staffEmployeeIds??[],{multiple:true,required:false}),reason('Assignment reason')],{sub:r.code});
    case 'task.create':
      return config('Create project task',[text('name','Task title'),employeeSelect('ownerEmployeeId','Task owner'),date('due','Due date',offset(7)),textarea('notes','Task details','',optional)],{values:{projectId:id}});
    case 'task.assign':
      return config('Reassign task',[employeeSelect('ownerEmployeeId','Task owner',r.ownerEmployeeId),date('due','Due date',r.due),reason('Assignment reason')]);
    case 'task.update':
      return config('Update task',[select('status','Status',['Open','In Progress','Completed'].map(value=>[value,value]),r.status),textarea('notes','Progress note',r.progressNote||'',optional)]);
    case 'delivery.assign':
      return config('Assign delivery',[employeeSelect('deliveryEmployeeId','Delivery owner',r.deliveryEmployeeId),reason('Assignment reason')],{sub:r.code});
    case 'delivery.proof':
      return config('Record proof of delivery',[text('reference','Delivery proof reference')],{sub:r.code});
    case 'delivery.ack':
      return config('Acknowledge delivery',[text('reference','Receipt acknowledgment reference')],{sub:r.code});
    case 'project.progress':
      return config('Update project progress',[number('progress','Completion (%)',r?.progress),...(hasFinanceAccess(state.data.actor)?[number('remaining','Uncommitted cost to complete',r?.remaining)]:[]),textarea('notes','Progress note')],{sub:r?.code,notes:'Exclude existing purchase commitments from the uncommitted cost to complete.'});
    case 'project.cost':
      return onProject('Record direct cost',[text('name','Cost reference'),select('type','Cost type',['Labor','Equipment','Subcontract','Other'].map(x=>[x,x]),'Labor'),number('amount','Amount')],{notes:'Warehouse stock issues automatically record material cost.'});
    case 'variation.create':
      return onProject('Request variation',[text('name','Variation title'),number('value','Requested contract value change'),number('cost','Budget impact')]);
    case 'material.create':
      return config('Add material',[text('code','Material code'),text('name','Description'),text('category','Category'),text('unit','Base unit'),text('spec','Specification','',optional),
        text('barcode','Barcode or QR value','',optional),select('supplierId','Supplier',optionRows('supplier'),'',optional),currency(),number('price','Verified unit price'),date('priceDate','Price verification date'),number('minimum','Minimum stock',0)]);
    case 'material.price':
      return config('Verify material price',[number('price','Verified unit price',r?.price),date('priceDate','Effective date'),reason('Price evidence or supplier reference')],{sub:r?.code});
    case 'request.create':
      return purchaseRequestForm(id||'',arg,extra);
    case 'supplier.offer':
      return config('Add supplier offer',[select('supplierId','Supplier',optionRows('supplier')),number('price','Offered unit price'),date('due','Delivery date',offset(7)),
        text('terms','Payment terms','',optional),text('warranty','Warranty','',optional),textarea('spec','Product specifications','',optional)],{values:{requestId:id}});
    case 'po.create':
      return config('Generate purchase order',[...(namedAssignments()?[employeeSelect('buyerEmployeeId','Purchasing owner',demoEmployee(),isPrivate()?{}:optional),employeeSelect('deliveryEmployeeId','Delivery owner','',optional)]:[]),select('supplierId','Supplier',optionRows('supplier')),select('offerId','Confirmed supplier offer',rows('offer').filter(x=>x.requestId===id).map(x=>[x.id,name(x.supplierId)+' · '+amount(x.price,x.currency)]),'',optional),
        date('due','Expected delivery',r?.needed||offset(7)),text('location','Delivery location',rec(r?.projectId)?.location||''),textarea('terms','Payment terms','',optional)],{sub:r?.code,values:{requestId:id},notes:'The order uses the approved shortage quantity and the approved price ceiling.',submit:'Issue purchase order'});
    case 'po.cancel':
      return config('Close purchase order',[reason('Closure reason')],{sub:r?.code,notes:'Closing releases any undelivered quantity. Posted receipts remain in the stock ledger.',submit:'Close order'});
    case 'po.receive':
      return config('Receive purchase order',[...(namedAssignments()?[employeeSelect('handlerEmployeeId','Warehouse receiver',demoEmployee(),isPrivate()?{}:optional)]:[]),warehouse(),number('quantity','Delivered quantity',r?Math.max(0,r.quantity-r.received):'',{min:.001}),
        select('condition','Condition',[['Usable','Usable'],['Damaged','Damaged']],'Usable'),text('reference','Supplier delivery reference')],{sub:r?.code,notes:r?qty(r.quantity-r.received)+' units remain on this order.':'',submit:'Post receipt'});
    case 'stock.reserve':
      return config('Reserve stock',[material(r?.kind==='material'?r.id:''),warehouse(),project(),number('quantity','Total quantity to reserve',0),reason('Reservation reason')],{notes:'Enter the full reservation for this material, warehouse and project. Use zero to release it.'});
    case 'stock.count':
      return config('Record physical count',[material(r?.kind==='material'?r.id:''),warehouse(),number('counted','Physical quantity'),reason('Count reference')],{submit:'Submit count'});
    case 'stock.adjust':
      return config('Approve stock adjustment',[reason('Adjustment reason')],{sub:r?.name,notes:'The system posts an auditable correction from this count. A new count is required if stock has moved.',submit:'Approve adjustment'});
    case 'contract.create':case 'contract.edit':return contractForm(cmd,r);
    case 'agreement.create':case 'agreement.edit':return agreementForm(cmd,r);
    case 'agreement.transition':{
      const fields=[reason('Decision / review reference')];
      if(arg==='Approved')fields.push(input('reviewConfirmed','Commercial terms, legal review and signatory authority have been checked',false,{type:'checkbox',full:true}));
      return config(stageLabel[arg]||arg,fields,{sub:r.code,values:{status:arg},notes:arg==='Approved'?'The approved revision is locked. This approval does not sign the agreement or appoint a signatory.':'All required agreement sections must be completed before approval.'});
    }
    case 'contract.schedule':
      return config(r.serviceType==='troubleshooting'?'Create one-time job':r.serviceType==='om'?'Plan operations rounds':'Generate recurring visits',
        [date('until',r.serviceType==='troubleshooting'?'Attendance date':'Plan through',r.serviceType==='troubleshooting'?r.start:offset(90))],
        {sub:r.code,notes:r.serviceType==='troubleshooting'?'One job is created. Use the existing job to reschedule.':'Existing jobs are preserved. O&M rounds use the agreed operating interval; these are not a substitute for a staff shift roster.',submit:'Create jobs'});
    case 'job.assign':
      return config('Assign or reschedule visit',[...(namedAssignments()?[employeeSelect('technicianEmployeeId','Technician',r.technicianEmployeeId),
          ...(!state.data.actor.previewEmployeeId||hasRole('admin','maintenance')?[employeeSelect('leadEmployeeId','Team lead',r.leadEmployeeId,optional)]:[])]:
          [text('technician','Technician',r?.technician),text('technicianEmail','Technician sign-in email',r?.technicianEmail||'',{type:'email',...optional})]),
        date('scheduled','Visit date',r?.scheduled),reason('Assignment or rescheduling reason')],{sub:r?.code});
    case 'job.update': {
      const content='<div style="margin-top:13px"><h3>Service checklist</h3>'+r.checklist.map((item,i)=>'<label class="choice"><input type="checkbox" name="check-'+i+'" '+(r.completed.includes(item)?'checked':'')+'>'+e(item)+'</label>').join('')+'</div>';
      return editOperation(cmd,{title:'Update service job',sub:r.code,fields:[select('status','Visit status',[['In Progress','In progress'],['Completed','Completed']],r.status==='Scheduled'?'In Progress':r.status),
        number('minutes','Minutes worked',r.minutes),textarea('findings','Findings and work completed',r.findings||'',optional),
        text('ack','Customer acknowledgment name',r.ack||'',optional),textarea('remarks','Customer remarks',r.remarks||'',optional)],content,
        transform:values=>({...values,id,completed:r.checklist.filter((_,i)=>values['check-'+i])}),submit:'Save job card'});
    }
    case 'milestone.create':
      return onProject('Add billing milestone',[text('name','Milestone name'),number('amount','Claim value'),date('due','Expected claim date',offset(30)),textarea('criteria','Completion or certification criteria')]);
    case 'claim.create':
      return onProject('Prepare progress claim',[text('name','Claim title',arg?rec(arg)?.name:''),select('milestoneId','Approved milestone, if applicable',optionRows('milestone',x=>!id||x.projectId===id),arg||'',optional),
        number('amount','Claim amount',arg?rec(arg)?.amount:'',{...optional,help:'Leave blank when selecting a milestone.'}),textarea('evidence','Approved progress reference')],{submit:'Create draft claim'});
    case 'invoice.draft':case 'invoice.edit':return invoiceForm(cmd,id);
    case 'invoice.issue':return config('Issue invoice',[],{notes:state.data.publicDemo?'This issues a simulated invoice. No real tax document or payment request is created.':'Review the customer, amount and tax treatment. Issuing assigns the next invoice number and locks this client copy.',content:details([['Customer',r.buyer.name],['Invoice type',r.invoiceType==='tax'?'Tax Invoice':'Commercial Invoice'],['Invoice amount',amount(r.amount,r.currency)],['Due',formatDate(r.due,true)]]),values:{confirm:true},submit:'Issue invoice'});
    case 'invoice.void':return config('Void invoice',[reason('Void reason / authorization reference')],{notes:'The record, issued number and audit history are retained. Invoices with any payment history require an accounting credit-note process.',submit:'Void invoice'});
    case 'invoiceProfile.update':return invoiceProfileForm();
    case 'invoice.create':
      return config('Record accounting invoice',[text('reference','Accounting invoice reference'),date('due','Payment due date',offset(30))],{sub:r?.code,
        notes:'Net amount after retention: '+amount(r.certified*(1-r.retention/100),r.currency)+'.',values:{claimId:id},submit:'Record invoice reference'});
    case 'invoice.pay':
      return config('Record customer payment',[number('amount','Amount received',r?.balance?.outstanding),date('date','Payment date'),text('reference','Bank or receipt reference')],{sub:r?.code,values:{invoiceId:id},submit:'Record payment'});
    case 'invoice.reverse':
      return config('Reverse customer payment',[reason('Reversal reason')],{sub:r?.code,notes:'A reversing payment is added to preserve the original record.',submit:'Post reversal'});
    case 'cash.update':
      return config('Add cash forecast input',[select('type','Entry type',['Opening cash','Payroll','Loan repayment','Other inflow','Other outflow'].map(x=>[x,x])),number('amount','Amount'),date('due','Cash date'),text('name','Entry reference','',optional)],{open:false});
    case 'settings.update':{
      const s=settings();
      return config('Company and business settings',[text('name','Company name',s.name),text('address','Address',s.address,optional),text('email','Company contact email',s.email,{type:'email',...optional}),
        currency(s.currency),number('tax','Default tax (%)',s.tax),number('minMargin','Minimum gross margin (%)',s.minMargin),number('cashLimit','Cash exposure limit',s.cashLimit),
        number('purchaseLimit','Delegated purchase limit',s.purchaseLimit),number('priceDays','Price verification age (days)',s.priceDays,{min:1,step:1}),
        number('agingDays','Inventory aging threshold (days)',s.agingDays,{min:1,step:1}),number('renewalDays','Renewal alert lead time (days)',s.renewalDays,{min:1,step:1}),
        number('fxRate','KHR per USD, for reference',s.fxRate??'',optional),date('fxDate','Exchange rate effective date',s.fxDate||today(),optional)],{open:false});
    }
    case 'employee.upsert':{
      if(!accountCanEdit(r)||r?.removedOn)return;
      const choices=employeeRoleChoices(state.data.actor).map(role=>[role,roleLabel(role)]);
      return config(r?'Edit employee':isPlatform()?'Add user':'Add employee',[text('name','Employee name',r?.name),
        text('employeeId','Employee ID',r?.employeeId,optional),
        text('position','Job title',r?.position,optional),text('department','Department',r?.department,optional),text('team','Team',r?.team,optional),
        text('email','Sign-in email',r?.email,{...optional,type:'email',help:'Required for active access.'}),
        select('roles','Assigned roles',choices,r?.roles??[],{multiple:true,required:false,help:'Hold Control or Command to select multiple roles.'}),
        input('active','Active access',r?.active??false,{type:'checkbox',required:false}),
        textarea('jobFunctions','Job functions',r?.jobFunctions,optional),
        textarea('reason','Change reason','',optional),
      ],{open:false,values:{create:!r}});
    }
    case 'employee.remove':case 'employee.restore':{
      if(!r||!accountCanEdit(r))return;
      const restoring=cmd==='employee.restore',label=restoring?'Restore employee':'Remove employee';
      return config(label,[textarea('reason','Reason')],{sub:r.name,open:false,submit:label,
        notes:restoring?'The restored record starts with sign-in disabled.':'Removing the employee disables sign-in and records the removal in the audit log.'});
    }
    case 'platform.storage.default':case 'platform.storage.user':{
      const individual=cmd==='platform.storage.user';
      return config(individual?'Set storage limit':'Set default storage limit',[
        number('limitMb','Storage limit (MB)',individual?r?.storageLimitMb??'':state.data.platform.defaultStorageMb??'',
          {required:false,min:0,step:1,help:individual?'Leave blank to use the platform default. Zero blocks new uploads.':'Leave blank for unlimited storage. Zero blocks new uploads.'}),
      ],{open:false,sub:r?.name});
    }
    case 'platform.email.update':{
      const {email}=state.data.platform;
      return config('Configure email',[input('outbound','Enable outbound email',email.outbound,{type:'checkbox'}),
        input('inbound','Enable inbound email',email.inbound,{type:'checkbox'}),text('fromName','Sender display name',email.fromName,optional),
        text('fromEmail','Verified sender email',email.fromEmail,{...optional,type:'email'}),
        ...Object.entries(mailboxes).map(([key,label])=>textarea(key,label,(email.routing[key]??[]).join('\n'),{...optional,help:'Enter one receiving address per line.'})),
      ],{wide:true,open:false});
    }
    case 'platform.ai.update':{
      const {ai}=state.data.platform;
      return config('Configure AI review',[input('enabled','Enable AI review',ai.enabled,{type:'checkbox'}),text('model','OpenAI model',ai.model,optional),
        number('dailyLimit','Team daily limit',ai.dailyLimit,{min:1,step:1}),number('userDailyLimit','User daily limit',ai.userDailyLimit,{min:1,step:1})],{open:false});
    }
    case 'tender.transition':case 'quote.transition':case 'project.status':case 'request.transition':case 'claim.transition':case 'variation.transition': {
      const title=stageLabel[arg]||arg;
      let label='Decision or document reference';
      if(cmd==='claim.transition')label='Submission, certification or dispute reference';
      if(cmd==='variation.transition')label='Client approval or rejection reference';
      const required=cmd==='project.status'||cmd==='claim.transition'||cmd==='variation.transition'||
        (cmd==='request.transition'&&arg!=='Approved')||(cmd==='tender.transition'&&['Cancelled','Lost','Do Not Bid','Approved for Bid','Submitted','Awarded'].includes(arg))||
        (cmd==='quote.transition'&&['Accepted','Rejected','Draft'].includes(arg));
      const fields=[textarea('reason',label,'',{required})];
      if(cmd==='claim.transition'&&arg==='Certified')fields.unshift(number('certified','Certified amount',r.amount));
      return config(title,fields,{sub:r?.code,values:{status:arg},submit:title});
    }
    case 'quote.revise':
      return config('Create quotation revision',[reason('Revision reason')],{sub:r?.code,notes:'The previous quotation remains in the revision history.',submit:'Create revision'});
    case 'master.import':
      return masterImportForm();
    case 'demo.reset':
      return config('Reset fictional demonstration',[text('confirm','Type RESET to confirm')],{notes:'This removes edits from the demonstration workspace.',open:false,submit:'Reset demo',success:'Fictional workspace restored.'});
    case 'folder.create':
      return config('New folder',[text('name','Folder name')],{sub:r?.kind==='folder'?r.name:'My folders',open:false,
        submit:'Create folder',values:{parentId:id||null},success:'Folder created.'});
    case 'document.attach':case 'document.store':
      return documentForm(id,cmd==='document.store');
  }
}
function masterImportForm(){
  let sheets=[],entries=[];
  const types=Object.entries(masterImports).filter(([type])=>isPlatform()?type==='employee':
    type!=='employee'||(!state.data.demoRoles.length&&!isPrivate())).map(([type,{label}])=>[type,label]);
  editOperation('master.import',{title:'Import records',sub:'Map columns, preview the rows, and confirm the batch.',wide:true,
    fields:[select('type','Record type',types,isPlatform()?'employee':'client'),
      input('file','Spreadsheet','',{type:'file',accept:'.csv,.tsv,.xlsx'}),date('cutoff','Verified opening stock cutoff',today(),optional)],
    content:'<div class="import-template"><button type="button" class="btn" id="master-template">'+icon('download',16)+'Download Excel template</button>'+
      '<p>Enter records on the Data tab. The Instructions tab has examples, required columns, and formats.</p></div>'+
      '<div id="master-import"></div>',submit:'Confirm import',
    notes:isPlatform()?'Import up to 100 users at a time. Store employee IDs as text. Imported users start with sign-in disabled.':'Use YYYY-MM-DD dates and plain numeric values. Import up to 100 rows per batch.',
    transform:values=>{
      if(!entries.length)throw Error('Map every required field and review valid rows.');
      return {type:values.type,source:values.file.name,...(values.type==='opening'?{cutoff:values.cutoff}:{}),entries};
    },
    afterOpen:form=>{
      const host=$('#master-import');
      const {type:typePicker,file:filePicker,cutoff}=form.elements;
      $('#master-template',form).addEventListener('click',()=>{
        const type=typePicker.value;
        const workbook=masterImportTemplate(type,employeeRoleChoices(state.data.actor));
        const filename='TEAMS_'+masterImports[type].label.replace(/[^A-Za-z0-9]+/g,'_')+'_Import_Template.xlsx';
        downloadBlob(new Blob([workbook],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),filename);
      });
      const renderMapping=()=>{
        const type=typePicker.value,{columns}=masterImports[type];
        cutoff.closest('label').hidden=type!=='opening';
        cutoff.required=type==='opening';
        if(!sheets.length){host.innerHTML='';return;}
        const required=columns.filter(column=>column.required),labels=Object.fromEntries(columns.map(column=>[column.key,column.label]));
        host.innerHTML='<div class="form-grid"><label class="field">Worksheet <select id="master-sheet">'+sheets.map((sheet,index)=>
          '<option value="'+index+'">'+e(sheet.name)+'</option>').join('')+'</select></label>'+
          '<label class="field">Header row <select id="master-header"></select></label></div>'+
          '<div id="master-map" class="form-grid"></div><div id="master-preview" aria-live="polite"></div>';
        const sheetPicker=$('#master-sheet'),headerPicker=$('#master-header'),mapping=$('#master-map'),preview=$('#master-preview');
        const selectedRows=()=>sheets[Number(sheetPicker.value)].rows;
        const display=()=>{
          const header=Number(headerPicker.value);
          const map=Object.fromEntries($$('select',mapping).filter(select=>select.value!=='').map(select=>[select.dataset.master,Number(select.value)]));
          const missing=required.filter(({key})=>map[key]==null);
          const rows=selectedRows().slice(header+1).map((row,index)=>({row,number:index+header+2})).filter(({row})=>row.some(value=>String(value??'').trim()));
          const values=rows.map(({row})=>Object.fromEntries(
            Object.entries(map).map(([key,index])=>[key,String(row[index]??'').trim()]).filter(([,value])=>value!==''),
          ));
          const blanks=values.flatMap((row,index)=>required.some(({key})=>!row[key])||(type==='contract'&&row.serviceType!=='troubleshooting'&&!row.frequency)?[rows[index].number]:[]);
          const duplicates=[],seen=new Set();
          for(const [i,row] of values.entries()){
            const signature=type==='opening'?row.materialCode+'|'+row.warehouseCode:type==='employee'?row.employeeId||row.email||row.name:row.code||row.email||row.name;
            if(signature){const key=signature.toLowerCase();if(seen.has(key))duplicates.push(rows[i].number);seen.add(key);}
          }
          const issue=missing.length?'Map required fields: '+missing.map(({label})=>label).join(', '):
            new Set(Object.values(map)).size<Object.keys(map).length?'Map each spreadsheet column to one field.':
            blanks.length?'Required values are missing in rows '+blanks.slice(0,12).join(', ')+'.':
            duplicates.length?'Possible duplicate records in rows '+duplicates.slice(0,12).join(', ')+'.':
            values.length>100?'Split the source into files of up to 100 data rows.':
            !values.length?'Enter data below the header row and upload the file again.':'';
          entries=issue?[]:values;
          const previewKeys=Object.keys(map).slice(0,8);
          preview.innerHTML='<p class="form-note">'+e(issue||values.length+' rows ready for server validation.')+'</p>'+
            (previewKeys.length&&values.length?table(previewKeys.map(key=>labels[key]),values.slice(0,6),row=>previewKeys.map(key=>e(row[key]))):'');
        };
        const selectHeader=()=>{
          const header=selectedRows()[Number(headerPicker.value)]??[],guesses=mapMasterHeaders(type,header);
          mapping.innerHTML=columns.map(({key,label,required})=>'<label class="field">'+e(label)+(required?' *':'')+
            '<select data-master="'+key+'"><option value="">Skip</option>'+header.slice(0,100).map((title,index)=>
              '<option value="'+index+'" '+(guesses[key]===index?'selected':'')+'>'+e(title||'Column '+(index+1))+'</option>').join('')+'</select></label>').join('');
          display();
        };
        const selectSheet=()=>{
          const rows=selectedRows(),suggested=guessMasterHeader(type,rows);
          headerPicker.innerHTML=rows.slice(0,100).map((row,index)=>'<option value="'+index+'"'+(suggested===index?' selected':'')+'>'+
            e('Row '+(index+1)+(row.some(Boolean)?' / '+row.filter(Boolean).slice(0,3).join(' / ').slice(0,100):''))+'</option>').join('');
          selectHeader();
        };
        sheetPicker.addEventListener('change',selectSheet);
        headerPicker.addEventListener('change',selectHeader);
        mapping.addEventListener('change',display);
        selectSheet();
      };
      typePicker.addEventListener('change',renderMapping);
      filePicker.addEventListener('change',async()=>{
        entries=[];sheets=[];
        const file=filePicker.files[0];
        if(!file){host.innerHTML='';return;}
        host.innerHTML='<p class="form-note">Reading spreadsheet...</p>';
        try{
          const parsed=await readBoq(file);
          if(filePicker.files[0]===file){sheets=parsed;renderMapping();}
        }catch(error){if(filePicker.files[0]===file)host.innerHTML='<p class="form-error">'+e(error.message)+'</p>';}
      });
      renderMapping();
    },
  });
}
function documentForm(id,inFolder=false){
  const parent=rec(id),key=crypto.randomUUID();
  if(inFolder&&parent?.kind!=='folder')return;
  const options=data().filter(x=>['client','project','tender','quote','request','requisition','po','contract','agreement','mail','job','claim','invoice'].includes(x.kind))
    .map(x=>[x.id,(kindLabels[x.kind]||x.kind)+' / '+rawName(x)]);
  const fields=inFolder?[]:[select('parentId','Link to record',options,id||'')];
  fields.push(input('file','Select file','',{type:'file',full:true}));
  const notes=state.data.publicDemo?'Maximum 10 MB per file. Attachments stay in this browser. Use fictional test files.':
    inFolder?'Maximum 10 MB per file. This folder is private to your account.':'Maximum 10 MB. Files inherit access from the linked record.';
  formModal({title:inFolder?'Upload file':'Attach document',sub:inFolder?parent.name:parent?.code||'',fields,notes,submit:'Upload file',onSubmit:async(_,form)=>{
    const body=new FormData(form);
    if(inFolder)body.set('folderId',parent.id);
    body.set('key',key);
    const result=await(await api('/api/upload',{method:'POST',body})).json();
    closeModal(true);await readState();render();
    if(!inFolder)openRecord(parent?.id||result.id);
    toast(inFolder?'File uploaded.':'Attachment saved.');
  }});
}
function receivePicker(){
  const open=rows('po').filter(x=>['Ordered','Partially Received'].includes(x.status));
  if(!open.length){openModal('Receive materials','','<p class="empty">No open purchase orders are available.</p>');return;}
  formModal({title:'Receive materials',sub:'Select a purchase order',fields:[select('id','Open purchase order',open.map(x=>[x.id,x.code+' · '+x.name]))],
    submit:'Continue',onSubmit:values=>{closeModal(true);formOperation('po.receive',values.id);}});
}
function profile(){
  const current=state.data?.actor;
  if(isPrivate()){
    const actions=state.previewId?button('Return to administrator','preview.exit',{primary:true}):
      go('Employees','employees')+' <a class="btn" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>';
    openModal(current?.name||'Account','Private workspace',details([['Position',current?.position],['Permission profiles',employeeRoles(current?.roles)],['Account',current?.email]]),actions);
    return;
  }
  if(!state.data?.demoRoles.length){
    openModal('Account','',details([['Email',current?.email],['Role',current?.roles.map(roleLabel).join(', ')]]),'<a class="btn" href="/cdn-cgi/access/logout" target="_top">Sign out</a>');
    return;
  }
  const cards=state.data.demoRoles.flatMap(role=>{
    const people=rolePeople(role),candidates=people.length?people:[null],view=roleHome[role]||'home';
    return candidates.map(person=>{
      const active=state.role===role&&(person?activePic()?.id===person.id:!activePic());
      return '<button type="button" class="role-choice" data-demo-role="'+A(role)+'" data-demo-person="'+A(person?.id||'')+'" data-demo-view="'+A(view)+'" aria-pressed="'+active+'" aria-label="'+A('Switch to '+roleLabel(role)+(person?' / '+person.name:''))+'"><span class="role-choice-icon">'+icon(navMap[view]?.i||'people',22)+'</span><span class="role-choice-copy"><strong>'+e(roleLabel(role))+'</strong>'+(person?'<span data-no-translate>'+e(person.name)+'</span><small data-no-translate>'+e(person.position)+'</small>':'<span>PIC to confirm</span>')+'</span><span class="role-choice-state">'+(active?'Current role':'Switch')+'</span></button>';
    });
  }).join('');
  openModal('Switch demonstration role',"Choose a role or named PIC. The demo opens that role's work area.",
    '<div data-role-switcher><label class="field">Find a role or employee<input type="search" id="role-search" placeholder="Search roles or employee names" autocomplete="off"></label><p id="role-switch-error" class="form-error" role="alert" hidden></p><p id="role-switch-pending" class="form-note" role="status" hidden>Switching role...</p><div class="role-choice-grid">'+cards+'</div><p id="role-search-empty" class="empty" hidden>No matching roles or employees.</p></div>',button('Close','close'),true);

}
function downloadBlob(blob,filename){
  const href=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=href;link.download=filename;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),4000);
}
async function exportFile(path){
  try{
    const response=await api(path);
    const header=response.headers.get('Content-Disposition')||'',name=header.match(/filename\*=UTF-8''(.+)/i)?.[1];
    downloadBlob(await response.blob(),name?decodeURIComponent(name):'teams-export');
  }catch(error){toast(error.message,true);}
}
async function audit(){
  try{
    const events=await (await api('/api/audit')).json();
    openModal('Audit history','Most recent 100 committed operations.',table(['When (UTC)','Action','Actor','Revision'],events,x=>[e(x.created_at.replace('T',' ').slice(0,19)),e(x.action),e(x.actor),e(x.version)]),button('Close','close',{small:true}),true);
  }catch(error){toast(error.message,true);}
}
async function changePreview(id){
  if(!isPrivate()||(!state.data.actor.personnelAdmin&&id))return;
  if(modal.open&&!closeModal())return;
  const prior=state.previewId;
  state.previewId=id;
  try{await readState();navigate(id?'home':'employees');}
  catch(error){state.previewId=prior;toast(error.message,true);}
}
function roleDetail(role){
  const profile=state.data.roleCatalog?.find(entry=>entry.role===role);
  if(!profile)return;
  openModal(roleLabel(role),'Permission profile',details([['Modules',profile.modules.includes('*')?'All modules':profile.modules.map(x=>navMap[x]?.t||x).join(', ')],
    ['Available actions',profile.actions.includes('*')?'All actions':profile.actions.join(', ')||'Read only'],['Eligible approval grants',profile.approvals.map(x=>state.data.approvalLabels[x]).join(', ')||'None']]));
}
async function personnelAudit(){
  try{
    const events=await (await api('/api/personnel-audit')).json();
    const changes=events.flatMap(event=>event.summary.map(change=>({...change,action:event.action,at:event.created_at,actor:event.actor})));
    const changeText=(x,key)=>['roles','approvals'].filter(field=>x.fields.includes(field)).map(field=>{
      const labels=(x[key]?.[field]??[]).map(value=>field==='roles'?roleLabel(value):state.data.approvalLabels[value]);
      return (field==='roles'?'Profiles: ':'Approvals: ')+(labels.join(', ')||'None');
    }).join(' · ');
    openModal('Employee audit history','Employee record, profile and approval changes.',table(['When (UTC)','Employee','Action','Before','After','Reason','Actor'],changes,x=>[
      e(x.at.replace('T',' ').slice(0,19)),e(personName(x.id)),e(x.action.replace('personnel.','')),e(changeText(x,'before')),e(changeText(x,'after')),e(x.reason),e(x.actor),
    ]),button('Close','close',{small:true}),true);
  }catch(error){toast(error.message,true);}
}
function searchRecords(input){
  const results=$('#search-results'),q=input.value.trim().toLowerCase();
  if(!q){results.hidden=true;return;}
  const matches=data().filter(r=>kindView[r.kind]&&[r.name,r.code,r.reference,r.barcode].some(x=>String(x??'').toLowerCase().includes(q))).slice(0,9);
  results.hidden=false;
  results.innerHTML=matches.length?matches.map(r=>'<button type="button" data-open="'+A(r.id)+'">'+icon(navMap[kindView[r.kind]].i,15)+' <span><b>'+e(rawName(r))+'</b> · '+e(r.code||kindLabels[r.kind])+'</span></button>').join(''):'<p>No matching records.</p>';
}
document.addEventListener('input',event=>{
  const node=event.target;
  if(node.id==='search')searchRecords(node);
  if(node.id==='role-search'){const query=node.value.trim().toLowerCase(),choices=$$('.role-choice');choices.forEach(control=>control.hidden=![control.textContent,control.getAttribute('aria-label')].join(' ').toLowerCase().includes(query));$('#role-search-empty').hidden=choices.some(control=>!control.hidden);}
  if(node.dataset.employeeFilter){
    state.employeeFilters[node.dataset.employeeFilter]=node.value;
    $('#employee-grid').innerHTML=employeeGrid();
  }
  if(node.id==='mail-search'){state.mailQuery=node.value;$('#mail-list').innerHTML=mailList();}
  if(node.id==='hr-employee-search'){state.hrSearch=node.value;$('#hr-employee-grid').innerHTML=hrEmployeeGrid();}
  if(node.id==='account-search'){
    state.accountSearch=node.value;
    $('#account-grid').innerHTML=employeeAccountTable();
  }
  if(['inventory-filter','material-price-filter'].includes(node.id)){
    const q=node.value.trim().toLowerCase(),table=node.closest('section').querySelector('tbody');
    if(table)[...table.rows].forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));
  }
});
document.addEventListener('change',event=>{
  if(event.target.id!=='account-status')return;
  state.accountStatus=event.target.value;
  $('#account-grid').innerHTML=employeeAccountTable();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&state.mobile){state.mobile=false;sidebar();}
  if(event.key==='Escape'&&event.target.id==='search')$('#search-results').hidden=true;
  if(event.key==='Enter'&&event.target.id==='search'){const result=$('#search-results button');if(result)result.click();}
});
document.addEventListener('click',event=>{
  const control=findActionControl(event.target);
  const results=$('#search-results');
  if(results&&!event.target.closest('.search'))results.hidden=true;
  if(!control)return;
  if(control.dataset.service||control.dataset.step!==undefined){updateExplorer(control);return;}
  if(control.dataset.unit){
    state.unit=control.dataset.unit;
    render();
    $$('[data-unit]').find(item=>item.dataset.unit===state.unit)?.focus({preventScroll:true});
    return;
  }
  if(control.dataset.demoRole){
    chooseDemoRole(control.dataset.demoRole,control.dataset.demoView||state.view,!!control.closest('#service-workflows'),control.dataset.demoPerson||'').catch(error=>toast(error.message,true));
    return;
  }
  if(control.dataset.view){if(modal.open&&!closeModal())return;navigate(control.dataset.view);return;}
  if(control.dataset.open){if(results)results.hidden=true;openRecord(control.dataset.open);return;}
  if(control.dataset.queue){state.queue=control.dataset.queue;render();return;}
  if(control.dataset.file){exportFile('/api/file/'+encodeURIComponent(control.dataset.file));return;}
  if(control.dataset.export){
    const [kind,id,format,internal]=control.dataset.export.split('|'),p=new URLSearchParams({kind,format,internal});
    if(id)p.set('id',id);exportFile('/api/export?'+p);return;
  }
  const [cmd,id,arg,extra]=control.dataset.cmd.split('|');
  switch(cmd){
    case 'folder.open':openDocumentFolder(id);break;
    case 'close':closeModal();break;
    case 'mobile':state.mobile=!state.mobile;sidebar();if(state.mobile)$('#sidebar .nav button')?.focus();break;
    case 'mobile.close':state.mobile=false;sidebar();break;
    case 'pwa.install':installApp();break;
    case 'pwa.update':applyAppUpdate();break;
    case 'retry':refresh();break;
    case 'alerts':openModal('Operational exceptions','Records requiring review.',state.data?.report.alerts.map(alertItem).join('')||'<p class="empty">No current exceptions.</p>',button('Close','close',{small:true}));break;
    case 'queue.full':openModal('Work queue','Open records ordered by due date.',table(['Record','Category','Due','Status'],sorted(workItems(),'date',false),x=>[recordCell(x,x.code),e(x.category),e(formatDate(x.date,true)),status(x.stage)]),button('Close','close',{small:true}),true);break;
    case 'receive.pick':receivePicker();break;
    case 'profile':profile();break;
    case 'agreement.review':agreementReview();break;
    case 'dispatch.scan':case 'dispatch.compose':composeMailbox({relatedId:id});break;
    case 'dispatch.retry':toast('Use Email to compose a new message. Historical send records are retained.');break;
    case 'client.filter':state.clientFilter=id;render();break;
    case 'client.share':shareMaintenanceClient(id);break;
    case 'mail.compose':composeMailbox({relatedId:id,format:arg||'pdf'});break;
    case 'mail.open':mailOpen(id);break;
    case 'mail.back':state.mailSelected='';render();break;
    case 'mail.folder':state.mailFolder=id;state.mailSelected='';render();break;
    case 'mail.box':state.mailbox=id;state.mailSelected='';render();break;
    case 'mail.star':mailUpdate(id,{starred:!rec(id).starred});break;
    case 'mail.archive':mailUpdate(id,{folder:'archive'});break;
    case 'mail.trash':mailUpdate(id,{folder:'trash'});break;
    case 'mail.restore':mailUpdate(id,{folder:rec(id).status==='Draft'?'drafts':rec(id).direction==='incoming'?'inbox':'sent'});break;
    case 'mail.unread':mailUpdate(id,{read:false});break;
    case 'mail.reply':composeMailbox({replyId:id,replyAll:arg==='all'});break;
    case 'mail.forward':composeMailbox({forwardId:id});break;
    case 'mail.edit':composeMailbox({draftId:id});break;
    case 'mail.download':exportFile('/api/mail/file/'+encodeURIComponent(id)+'/'+arg);break;
    case 'mail.receive':simulateIncomingMail();break;
    case 'mail.refresh':refresh();break;
    case 'mail.retry':retryMailbox(id);break;
    case 'mail.link':linkMailRecord(id);break;
    case 'hr.employee':hrEmployeeForm(id);break;
    case 'planning.role':if(modal.open&&!closeModal())return;state.planRole=id;navigate('roles');break;
    case 'planning.person':planningPersonForm(id);break;
    case 'planning.new':planningPersonForm('',true);break;
    case 'planning.request':planningRequestForm(id,arg);break;
    case 'planning.import':planningImport();break;
    case 'planning.audit':planningAudit();break;
    case 'planning.export':exportFile('/api/demo-planning-export');break;
    case 'planning.try':chooseDemoRole(id,'home',false,arg).catch(error=>toast(error.message,true));break;
    case 'planning.module':chooseDemoRole(id,arg).catch(error=>toast(error.message,true));break;
    case 'planning.functions':openModal(roleLabel(id),'Functions available in this permission profile.',
      '<ul class="planning-functions">'+profileFunctions(id).map(action=>'<li>'+icon('check',15)+e(functionLabel(action))+'</li>').join('')+'</ul>',button('Add function request','planning.request||'+id,{primary:true}));break;
    case 'structure.decisions':showDecisionRights();break;
    case 'profile.detail':roleDetail(id);break;
    case 'personnel.audit':personnelAudit();break;
    case 'ai.review':openAiReview(id,arg);break;
    case 'preview.start':changePreview(id);break;
    case 'preview.exit':changePreview('');break;
    case 'audit':audit();break;
    case 'backup':exportFile('/api/backup');break;
    case 'invoice.accounting':exportFile('/api/invoice-accounting-export');break;
    case 'invoice.print':printInvoice(id);break;
    default:formOperation(cmd,id,arg,extra);
  }
});
window.addEventListener('hashchange',()=>{
  const view=location.hash.slice(1),v=isPlatform()&&view==='settings'?'platform-settings':view;
  if(navMap[v]&&show(v)){state.view=v;render();}
});
const initialView=location.hash.slice(1);
if(navMap[initialView])state.view=initialView;
render();
refresh();

function emailConnectionPanel(){
  const connection=state.data.emailConnection||{mode:'unconfigured'};
  return block('Client email connection','<div class="connection-note"><strong>'+e({simulation:'Public demo: simulated email',configured:'Live sender configured',unconfigured:'Live email not connected'}[connection.mode])+'</strong><p>'+e(connection.mode==='simulation'?'Use Inbox, drafts, replies and project attachments. Incoming and outgoing email is simulated in this browser.':connection.mode==='configured'?'Sender: '+connection.sender+'. Provider acceptance is logged; inbox delivery is not asserted.':'A verified sender and email provider connection are required before client messages can leave the system.')+'</p></div>');
}
function clientDocumentReady(r){return r.kind==='invoice'?r.status==='Issued':r.kind==='quote'?['Approved','Sent','Accepted'].includes(r.status):r.status==='Approved';}
function dispatchPanel(r){const emails=rows('mail').filter(m=>m.relatedId===r.id||(m.attachments||[]).some(a=>a.id===r.id));return panel('Client documents and email','<p>'+e(clientDocumentReady(r)?'Approved client documents are final exports. Attach the PDF or Excel directly in the email composer.':'Approve this revision before sending the final client document.')+'</p>'+(emails.length?table(['Email','Recipients','Status'],emails,m=>[recordCell(m),e((m.to||[]).join(', ')),status(m.status)]):''));}
function dispatchActions(r){return can('mail.save')&&clientDocumentReady(r)?button('Email client','mail.compose|'+r.id,{small:true,icon:'mail'}):'';}
function agreementReview(){openModal('Agreement template review','Commercial gaps found in the historical references.',
  '<div class="form-note">Drafting checklist for review. Final wording, commercial limits and signatory authority must be agreed before use.</div>'+table(['Area','Gap to resolve'],templateReviewFindings,row=>row.map(e))+
  '<p class="clause-text">The quotation format follows the supplied summary and BOQ structure: sections, descriptions, specifications, units, quantities, selling rates, line amounts, tax, terms and customer acceptance. Historical client documents, signatures, personal IDs and prices are not included in this public demo.</p>',button('Close','close'),true);}
function contractForm(cmd,r){
  const old=r?.kind==='contract'?r:null;
  editOperation(cmd,{title:old?'Edit service plan':'New service contract',sub:old?.code||'',wide:true,
    fields:[select('serviceType','Maintenance service type',Object.entries(serviceTypes),old?.serviceType||'scheduled'),text('name','Contract title',old?.name),client(old?.clientId),text('site','Site address',old?.site),currency(old?.currency),number('value','Contract value',old?.value??''),date('start','Start date',old?.start||today()),date('end','End date',old?.end||offset(365)),
      number('frequency','Visit / operations round interval (days)',old?.frequency??30,{min:1,step:1,...optional}),text('billing','Billing frequency',old?.billing||'Monthly'),number('residentTechnicians','Resident technicians (0 for visit-only)',old?.residentTechnicians??0,{step:1}),text('coverage','Coverage days and hours',old?.coverage||'',optional),textarea('staffingPlan','Staffing, shifts, relief and overtime plan',old?.staffingPlan||'',optional),
      ...(namedAssignments()?[employeeSelect('supervisorEmployeeId','Maintenance supervisor',old?.supervisorEmployeeId),employeeSelect('technicianEmployeeId','Default technician',old?.technicianEmployeeId)]:[text('supervisor','Supervisor',old?.supervisor),text('technician','Default technician',old?.technician),text('technicianEmail','Technician sign-in email',old?.technicianEmail||'',{type:'email',...optional})]),
      textarea('equipment','Asset register / covered equipment and locations',old?.equipment),textarea('sla','Response, attendance, escalation and restoration terms',old?.sla||'',optional),textarea('safety','Site access, isolation and safety requirements',old?.safety||'',optional)],
    notes:'MEP O&M requires onsite operations staffing and a coverage plan. Scheduled maintenance can include resident technicians. One-time troubleshooting creates one job. Changes to this operating plan do not change an approved agreement; prepare a new agreement revision.',
    transform:values=>({...values,id:old?.id}),afterOpen:form=>{
      const change=()=>{const one=form.elements.serviceType.value==='troubleshooting',om=form.elements.serviceType.value==='om',resident=Number(form.elements.residentTechnicians.value)>0;
        form.elements.frequency.disabled=one;form.elements.frequency.required=!one;form.elements.coverage.required=om||resident;form.elements.staffingPlan.required=om||resident;
        if(om)form.elements.residentTechnicians.min=1;else form.elements.residentTechnicians.min=0;};
      form.elements.serviceType.addEventListener('change',change);form.elements.residentTechnicians.addEventListener('input',change);change();
    }});
}
function agreementForm(cmd,record){
  const old=record.kind==='agreement'?record:null,c=old?rec(old.contractId):record,prior=rows('agreement').filter(x=>x.contractId===c.id).sort((a,b)=>b.revision-a.revision)[0],defaults=old||prior||agreementDefaults(c),customer=rec(c.clientId);
  editOperation(cmd,{title:old?'Edit service agreement':'Prepare agreement revision',sub:c.code,wide:true,
    notes:'Proposed template for review. Complete all sections, parties, signatories and authority references before approval. Do not infer authority from a job title. The approved revision captures this service plan and is locked.',
    fields:[textarea('contractorParty','TEAMS legal entity and registered address',defaults.contractorParty||[settings().name,settings().address].filter(Boolean).join(', ')),textarea('clientParty','Client legal entity and registered address',defaults.clientParty||[customer?.name,customer?.address].filter(Boolean).join(', ')),
      text('contractorSignatory','TEAMS authorized signatory and position',defaults.contractorSignatory||'',optional),text('clientSignatory','Client authorized signatory and position',defaults.clientSignatory||'',optional),textarea('authorityReference','Signatory authority / delegation references',defaults.authorityReference||'',optional),
      ...Object.entries(agreementSections).map(([key,label])=>textarea(key,label,defaults[key]||'',optional)),reason('Draft or revision reference',old?.revisionReason||(prior?'New revision of R'+prior.revision:'Initial agreement draft'))],
    transform:values=>({...values,id:old?.id,contractId:c.id})});
}

function currentMailbox(){const boxes=state.data?.mailboxes||[];if(!boxes.includes(state.mailbox))state.mailbox=boxes[0]||'';return state.mailbox;}
function mailFolderMessages(){const box=currentMailbox(),q=state.mailQuery.toLowerCase();return rows('mail').filter(m=>m.mailbox===box&&(state.mailFolder==='starred'?m.starred&&m.folder!=='trash':m.folder===state.mailFolder)&&(!q||[m.subject,m.from,m.body,...(m.to||[])].join(' ').toLowerCase().includes(q))).sort((a,b)=>(b.updatedAt||b.createdAt||'').localeCompare(a.updatedAt||a.createdAt||''));}
function mailList(){const items=mailFolderMessages();return items.length?items.map(m=>'<button class="mail-list-item '+(m.id===state.mailSelected?'selected ':'')+(!m.read?'unread':'')+'" data-cmd="mail.open|'+A(m.id)+'" type="button"><span class="mail-list-top"><strong>'+e(m.direction==='incoming'?(m.from||'Client'):(m.to||[]).join(', ')||'No recipient')+'</strong><time>'+e(formatDate(m.date))+'</time></span><span class="mail-list-subject">'+(m.starred?'* ':'')+e(m.subject||'Untitled draft')+'</span><span class="mail-list-preview">'+e(m.body?.slice(0,105)||'No message yet')+'</span><span class="mail-list-meta">'+e(m.attachments?.length?m.attachments.length+' attachment'+(m.attachments.length>1?'s':''):'')+' '+(m.status==='Draft'?'Draft':m.status==='Simulated'?'Demo sent':'')+'</span></button>').join(''):'<div class="mail-empty"><h3>No messages</h3><p>'+e(state.mailQuery?'No messages match your search.':'Messages in this folder will appear here.')+'</p></div>';}
function mailReader(message){
  if(!message)return '<div class="mail-empty reader-empty">'+icon('mail',36)+'<h2>Your project conversations</h2><p>Select an email to read it, reply or review its project attachments.</p></div>';
  const related=rec(message.relatedId),editable=can('mail.save')&&(message.createdBy===state.data.actor.id||hasRole('admin'));
  const peers=rows('mail').filter(x=>x.id!==message.id&&(x.threadId||x.id)===(message.threadId||message.id));
  const actions=message.status==='Draft'&&editable?button('Continue draft','mail.edit|'+message.id,{primary:true}):can('mail.save')?button('Reply','mail.reply|'+message.id,{primary:true})+button('Reply all','mail.reply|'+message.id+'|all')+button('Forward','mail.forward|'+message.id):'';
  return '<button type="button" class="btn mobile-back" data-cmd="mail.back">'+icon('right',18)+'Back to inbox</button><div class="mail-reader-toolbar">'+button(message.starred?'Unstar':'Star','mail.star|'+message.id,{small:true})+button('Mark unread','mail.unread|'+message.id,{small:true})+(hasRole('auditor')?'':button('Archive','mail.archive|'+message.id,{small:true})+(message.folder==='trash'?button('Restore','mail.restore|'+message.id,{small:true}):button('Trash','mail.trash|'+message.id,{small:true})))+'</div><div class="mail-reader-content"><span class="eyebrow">'+e(mailboxes[message.mailbox])+'</span><h2>'+e(message.subject||'Untitled draft')+'</h2><div class="mail-sender"><span class="mail-avatar">'+e((message.from||'TEAMS').slice(0,1).toUpperCase())+'</span><div><strong>'+e(message.direction==='incoming'?message.from:state.data.emailConnection?.sender||'TEAMS demo mailbox')+'</strong><p>To: '+e((message.to||[]).join(', ')||'No recipient')+'</p>'+(message.cc?.length?'<p>Cc: '+e(message.cc.join(', '))+'</p>':'')+(message.bcc?.length&&message.direction==='outgoing'?'<p>Bcc: '+e(message.bcc.join(', '))+'</p>':'')+'<p>'+e(new Date(message.createdAt).toLocaleString('en-GB'))+'</p></div></div><div class="mail-context">'+(related?'<button type="button" class="chip" data-open="'+A(related.id)+'">'+e((related.code?related.code+' / ':'')+related.name)+'</button>':'<span class="muted">No project record linked</span>')+(can('mail.save')?button('Link record','mail.link|'+message.id,{small:true}):'')+'</div><div class="mail-message">'+(message.direction==='outgoing'&&message.bodyHtml?cleanMailHtml(message.bodyHtml):e(message.body))+'</div>'+
    (message.attachments?.length?'<section class="mail-attachments"><h3>Attachments ('+message.attachments.length+')</h3><div class="mail-attachment-grid">'+message.attachments.map((a,i)=>'<button type="button" class="mail-attachment" data-cmd="mail.download|'+A(message.id)+'|'+i+'">'+icon('file',23)+'<span><strong>'+e(a.name)+'</strong><small>'+e(a.type==='export'?'Final client '+a.format.toUpperCase():a.size?Math.ceil(a.size/1024)+' KB':'Project attachment')+'</small></span>'+icon('download',17)+'</button>').join('')+'</div></section>':'')+'<div class="mail-delivery">'+status(message.status)+(message.status==='Simulated'?'<span>Demo only. No email was transmitted.</span>':message.status==='Provider accepted'?'<span>The provider accepted this message. Delivery is pending confirmation.</span>':'')+(message.error?'<p class="form-error">'+e(message.error)+'</p>':'')+(['Ready','Delivery unknown','Provider rejected'].includes(message.status)&&editable?button('Retry same send','mail.retry|'+message.id,{small:true}):'')+'</div><div class="mail-reply-actions">'+actions+'</div>'+
    (peers.length?'<div class="mail-thread"><h3>Conversation ('+(peers.length+1)+')</h3>'+peers.map(x=>'<button type="button" data-cmd="mail.open|'+A(x.id)+'"><strong>'+e(x.subject)+'</strong><span>'+e(x.body.slice(0,100))+'</span></button>').join('')+'</div>':'')+'</div>';
}
function mailPage(){const box=currentMailbox(),items=mailFolderMessages();if(state.mailSelected&&!rows('mail').some(x=>x.id===state.mailSelected&&x.mailbox===box))state.mailSelected='';const selected=rec(state.mailSelected);document.documentElement.dataset.mailReading=selected?'true':'false';
  return page('Email','Client conversations and attachments linked to your project records.',(can('mail.save')?button('Compose','mail.compose',{primary:true,icon:'plus'}):'')+button('Refresh','mail.refresh',{icon:'refresh'})+(state.data.publicDemo&&can('mail.save')?button('Receive demo email','mail.receive',{icon:'mail'}):''),
    '<div class="mail-mode-note">'+e(state.data.publicDemo?'Public demo: Inbox, incoming mail and sending are simulated. Messages and files stay in this browser.':state.data.emailConnection?.mode==='configured'?'Sending is connected. Incoming: '+(state.data.emailConnection.receiving==='configured'?'connected':'setup required')+'.':'Live email is not connected. Drafting and document preparation are available.')+'</div><div class="mail-workspace"><aside class="mail-folders"><label class="mailbox-label">Mailbox<select id="mailbox-picker" aria-label="Mailbox">'+(state.data.mailboxes||[]).map(b=>'<option value="'+b+'"'+(b===box?' selected':'')+'>'+e(mailboxes[b])+'</option>').join('')+'</select></label>'+[['inbox','Inbox'],['starred','Starred'],['sent','Sent'],['drafts','Drafts'],['archive','Archive'],['trash','Trash']].map(([key,label])=>'<button type="button" class="mail-folder '+(state.mailFolder===key?'selected':'')+'" data-cmd="mail.folder|'+key+'"><span>'+e(label)+'</span><small>'+rows('mail').filter(m=>m.mailbox===box&&(key==='starred'?m.starred&&m.folder!=='trash':m.folder===key)).length+'</small></button>').join('')+'<p class="mailbox-foot">'+e(state.data.publicDemo?'TEAMS demo mailbox':(state.data.emailConnection?.addresses?.[box]||[]).join(', ')||'Receiving address not configured')+'</p></aside><section class="mail-list-panel"><div class="mail-search"><input type="search" id="mail-search" aria-label="Search email" placeholder="Search this folder" value="'+A(state.mailQuery)+'"></div><div id="mail-list">'+mailList()+'</div></section><section class="mail-reading-pane">'+mailReader(selected)+'</section></div>');
}
async function mailOpen(id){const m=rec(id);if(!m)return;if(modal.open)closeModal(true);state.mailbox=m.mailbox;state.mailSelected=id;state.mailFolder=m.folder;if(!m.read){try{await submitAction('mail.update',{id,read:true},crypto.randomUUID());await readState();}catch(error){toast(error.message,true);}}navigate('mail');}
async function mailUpdate(id,values){try{await submitAction('mail.update',{id,...values},crypto.randomUUID());await readState();render();}catch(error){toast(error.message,true);}}
function mailRelatedOptions(){return data().filter(r=>['client','project','tender','quote','agreement','contract','job','po','claim','invoice'].includes(r.kind)).map(r=>[r.id,(r.code?r.code+' / ':'')+r.name]);}
function mailExportOptions(){return data().filter(r=>r.kind==='quote'&&['Approved','Sent','Accepted'].includes(r.status)&&r.validUntil>=today()||r.kind==='agreement'&&r.status==='Approved'||r.kind==='job'&&r.status==='Completed'||r.kind==='po'&&hasRole('admin','procurement','manager','director','project','auditor')||r.kind==='claim'||r.kind==='invoice'&&r.nativeInvoice&&r.status==='Issued').flatMap(r=>(r.kind==='quote'?['pdf','xlsx']:['pdf']).map(format=>[{type:'export',id:r.id,kind:r.kind,revision:r.revision,format},(r.code||r.name)+' / '+format.toUpperCase()+(r.revision?' / R'+r.revision:'')]));}
function composeMailbox({relatedId='',draftId='',replyId='',replyAll=false,forwardId='',format='pdf'}={}){
  if(!can('mail.save'))return;
  const draft=rec(draftId),reply=rec(replyId),forward=rec(forwardId),related=rec(relatedId||draft?.relatedId||reply?.relatedId||forward?.relatedId),clientRecord=rec(related?.kind==='client'?related.id:related?.clientId),sender=reply?.from?.match(/<([^>]+)>/)?.[1]||reply?.from||'';
  let attachments=structuredClone(draft?.attachments||(forward?(forward.attachments||[]).map((a,index)=>({type:'message',id:forward.id,index,name:a.name,size:a.size})):[])),savedId=draft?.id||'',sendKey=crypto.randomUUID();
  if(related&&['quote','agreement','invoice'].includes(related.kind)&&clientDocumentReady(related)&&!draft&&!reply&&!forward)attachments.push({type:'export',id:related.id,kind:related.kind,revision:related.revision,format:['agreement','invoice'].includes(related.kind)?'pdf':format,name:related.code+(related.revision?'-R'+related.revision:'')+'.'+(['agreement','invoice'].includes(related.kind)?'pdf':format)});
  const exports=mailExportOptions(),docs=rows('document').filter(row=>row.parentKind!=='folder');
  const to=draft?.to|| (reply?reply.direction==='outgoing'?reply.to:[sender]:[]),cc=draft?.cc||(replyAll?[...new Set([...(reply.cc||[]),...(reply.to||[])])].filter(x=>!(state.data.emailConnection?.addresses?.[reply.mailbox]||[]).includes(x)&&x!==sender):[]);
  const subject=draft?.subject||(reply?'Re: '+reply.subject:forward?'Fwd: '+forward.subject:related?(related.code?related.code+' - ':'')+related.name:'');
  const body=draft?.bodyHtml||e(draft?.body|| (forward?'Forwarded message\nFrom: '+(forward.from||'TEAMS')+'\nSubject: '+forward.subject+'\n\n'+forward.body:reply?'Dear Client,\n\n\n\nRegards,\nTEAMS':related?'Dear Client,\n\nPlease find the '+(related.kind==='quote'?'quotation':'project documents')+' attached for your review.\n\nRegards,\nTEAMS':'' )).replace(/\n/g,'<br>');
  const content='<div class="mail-compose-notice">'+e(state.data.publicDemo?'Demo compose. Sending is simulated; no message will leave this browser.':'Message will be submitted through the configured TEAMS sender.')+'</div><div class="mail-compose-fields">'+[
    select('mailbox','From mailbox',(state.data.mailboxes||[]).map(b=>[b,mailboxes[b]]),draft?.mailbox||reply?.mailbox||(['invoice','claim'].includes(related?.kind)?'finance':related?.kind==='contract'||related?.kind==='agreement'?'maintenance':currentMailbox())),
    text('to','To',(to.length?to:clientRecord?.contacts?.find(c=>c.email)?.email?[clientRecord.contacts.find(c=>c.email).email]:[]).join(', '),optional),text('cc','Cc',cc.join(', '),optional),text('bcc','Bcc',(draft?.bcc||[]).join(', '),optional),
    select('relatedId','Linked project or client record',mailRelatedOptions(),related?.id||'',optional),text('subject','Subject',subject,optional)
  ].map(fieldHtml).join('')+'</div><div class="mail-editor-toolbar" role="toolbar" aria-label="Message formatting"><button type="button" data-mail-format="bold" aria-label="Bold"><b>B</b></button><button type="button" data-mail-format="italic" aria-label="Italic"><i>I</i></button><button type="button" data-mail-format="underline" aria-label="Underline"><u>U</u></button><button type="button" data-mail-format="insertUnorderedList" aria-label="Bullet list">List</button><button type="button" data-mail-format="removeFormat" aria-label="Clear formatting">Clear</button></div><div id="mail-editor" class="mail-editor" contenteditable="true" role="textbox" aria-label="Email message" aria-multiline="true">'+cleanMailHtml(body)+'</div><div class="mail-compose-attachments"><h3>Attachments</h3><div id="compose-attachments"></div><div class="mail-attach-controls"><label class="btn small">'+icon('upload',15)+' Upload files<input type="file" multiple id="mail-upload" class="sr" aria-label="Upload email attachments"></label><select id="mail-existing-document" aria-label="Existing project document"><option value="">Choose an existing project file</option>'+docs.map((d,i)=>'<option value="'+i+'">'+e(d.name+' / '+rawName(rec(d.parentId)))+'</option>').join('')+'</select><button type="button" class="btn small" id="mail-add-file">Attach file</button></div><div class="mail-attach-controls"><select id="mail-export" aria-label="Final client document"><option value="">Choose a final client PDF or Excel</option>'+exports.map(([,label],i)=>'<option value="'+i+'">'+e(label)+'</option>').join('')+'</select><button type="button" class="btn small" id="mail-add-export">Attach client document</button></div><p class="muted">Up to 20 attachments, 10 MB total. Choose accessible project files or approved client exports.</p></div>';
  formModal({title:draft?'Continue email draft':reply?'Reply to client':forward?'Forward email':'New message',sub:'TEAMS Email',wide:true,fields:[],content,submit:'Send',onSubmit:async()=>{await saveDraft();const result=await (await api('/api/mail/send',{method:'POST',json:{id:savedId,key:sendKey}})).json();closeModal(true);await readState();state.mailbox=rec(result.id)?.mailbox||currentMailbox();state.mailFolder='sent';state.mailSelected=result.id;navigate('mail');toast(state.data.publicDemo?'Demo email sent. No real email was transmitted.':result.status==='Provider accepted'?'Email accepted by provider.':'Review the submission status in Sent.');},afterOpen:form=>{
    const attachmentHost=$('#compose-attachments',form),draw=()=>{attachmentHost.innerHTML=attachments.length?attachments.map((a,i)=>'<div class="compose-file">'+icon('file',16)+'<span>'+e(a.name||((rec(a.id)?.code||rec(a.id)?.name)+'.'+a.format))+'</span><button type="button" data-remove-mail-file="'+i+'" aria-label="Remove attachment '+(i+1)+'">'+icon('close',14)+'</button></div>').join(''):'<p class="muted">No attachments selected.</p>';};
    const add=a=>{if(attachments.length>=20){toast('Choose up to 20 attachments.',true);return;}if(!attachments.some(x=>x.id===a.id&&x.format===a.format))attachments.push(a);draw();formDirty=true;};
    const editor=$('#mail-editor',form);form.querySelectorAll('[data-mail-format]').forEach(b=>{b.addEventListener('mousedown',event=>event.preventDefault());b.addEventListener('click',()=>{editor.focus();document.execCommand(b.dataset.mailFormat,false);formDirty=true;});});
    attachmentHost.addEventListener('click',event=>{const b=event.target.closest('[data-remove-mail-file]');if(b){attachments.splice(Number(b.dataset.removeMailFile),1);draw();formDirty=true;}});
    $('#mail-add-file',form).addEventListener('click',()=>{const value=$('#mail-existing-document',form).value;if(value==='')return;const d=docs[Number(value)];add({type:'file',id:d.id,name:d.name,size:d.size});});
    $('#mail-add-export',form).addEventListener('click',()=>{const value=$('#mail-export',form).value;if(value==='')return;const [a,label]=exports[Number(value)];add({...a,name:(rec(a.id).code||rec(a.id).name)+(a.revision?'-R'+a.revision:'')+'.'+a.format});});
    $('#mail-upload',form).addEventListener('change',async event=>{try{await saveDraft();for(const file of event.target.files){if(file.size>10000000)throw Error('Each file must be no more than 10 MB.');const body=new FormData();body.set('file',file);body.set('parentId',savedId);body.set('key',crypto.randomUUID());const result=await (await api('/api/upload',{method:'POST',body})).json();add({type:'file',id:result.id,name:file.name,size:file.size});}await saveDraft();await readState();toast('Files attached to the draft.');}catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;}finally{event.target.value='';}});
    const footer=$('button[type="submit"][form="active-form"]').parentElement,b=document.createElement('button');b.type='button';b.className='btn';b.textContent='Save draft';footer.insertBefore(b,footer.lastElementChild);b.addEventListener('click',async()=>{b.disabled=true;try{await saveDraft();closeModal(true);await readState();state.mailFolder='drafts';state.mailSelected=savedId;state.mailbox=rec(savedId).mailbox;navigate('mail');toast('Email draft saved.');}catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;}finally{b.disabled=false;}});draw();
  }});
  async function saveDraft(){const form=$('#active-form');if(!form)throw Error('The email editor is closed.');const values=formDataValues(form);const result=await submitAction('mail.save',{...values,id:savedId||undefined,bodyHtml:$('#mail-editor',form).innerHTML,attachments,replyToId:reply?.id||draft?.replyToId||undefined},crypto.randomUUID());savedId=result.id;return result;}
}
async function simulateIncomingMail(){try{const result=await (await api('/api/mail/demo-receive',{method:'POST',json:{mailbox:currentMailbox(),key:crypto.randomUUID()}})).json();await readState();state.mailFolder='inbox';state.mailSelected=result.id;render();toast('Simulated incoming email received.');}catch(error){toast(error.message,true);}}
async function retryMailbox(id){const m=rec(id);try{const result=await (await api('/api/mail/send',{method:'POST',json:{id,key:m.sendKey}})).json();await readState();state.mailSelected=result.id;render();}catch(error){toast(error.message,true);}}
function linkMailRecord(id){editOperation('mail.update',{title:'Link email to a record',fields:[select('relatedId','Project, service contract or client',mailRelatedOptions(),rec(id).relatedId||'',optional)],transform:values=>({id,...values}),open:false});}
function shareMaintenanceClient(id){editOperation('client.update',{title:'Share client with Maintenance',sub:rec(id).name,notes:'The existing client profile and contacts are retained. Maintenance will share this same client record.',fields:[reason('Sharing reference')],transform:values=>({...values,id,shareWithMaintenance:true,serviceGroups:[...new Set([...clientGroups(rec(id)),'maintenance'])]})});}
document.addEventListener('change',event=>{if(event.target.id==='mailbox-picker'){state.mailbox=event.target.value;state.mailSelected='';state.mailQuery='';render();}});

setInterval(async()=>{if(state.view==='mail'&&!modal.open&&!document.hidden){try{await readState();render();}catch{}}},30000);

window.addEventListener('resize',()=>{if(state.data)sidebar();});

function invoiceForm(action,id){
  const existing=action==='invoice.edit'?rec(id):null,claim=rec(id)?.kind==='claim'?rec(id):null;
  const linkedProject=rec(existing?.projectId||claim?.projectId),initialClient=rec(existing?.clientId||linkedProject?.clientId)||rows('client')[0];
  const start=existing||{},items=structuredClone(existing?.items||[{description:claim?.name||'',descriptionKh:'',unit:'lot',quantity:1,rate:claim?Math.round(claim.certified*(1-claim.retention/100)*100)/100:0}]);
  const fields=[text('name','Invoice subject',start.name||claim?.name||''),select('invoiceType','Invoice type',[['commercial','Commercial Invoice'],['tax','Tax Invoice']],start.invoiceType||'commercial'),
    client(initialClient?.id),currency(start.currency||linkedProject?.currency||'USD'),select('projectId','Project (optional)',projectOptions(),start.projectId||linkedProject?.id||'',optional),
    select('contractId','Maintenance contract (optional)',optionRows('contract'),start.contractId||'',optional),date('invoiceDate','Invoice date',start.invoiceDate||today()),date('due','Payment due date',start.due||offset(30)),
    text('buyerName','Customer legal name',start.buyer?.name||initialClient?.name||''),text('buyerNameKh','Customer legal name in Khmer',start.buyer?.nameKh||'',optional),
    textarea('buyerAddress','Customer billing address',start.buyer?.address||initialClient?.address||''),textarea('buyerAddressKh','Customer billing address in Khmer',start.buyer?.addressKh||'',optional),text('buyerTin','Customer VAT TIN',start.buyer?.tin||initialClient?.taxId||'',optional),text('purchaseReference','Customer PO / reference',start.purchaseReference||'',optional),
    number('taxRate','VAT rate (%)',start.taxRate??0,{max:100}),number('discount','Discount',start.discount??0),number('fxRate','KHR per USD',start.fxRate||'',optional),date('fxDate','Exchange rate date',start.fxDate||today(),optional),text('fxReference','Exchange rate source / reference',start.fxReference||'',optional),textarea('terms','Payment terms',start.terms||'',optional)];
  const quotations=rows('quote').filter(q=>['Accepted','Approved','Sent'].includes(q.status));
  const content=(claim?'<p class="form-note">Certified claim after retention. The subtotal less discount must match this claim before VAT.</p>':'<div class="invoice-source"><label class="field">Use an approved quotation<select id="invoice-source"><option value="">Choose a quotation (optional)</option>'+quotations.map(q=>'<option value="'+A(q.id)+'">'+e(q.code+' / '+q.name)+'</option>').join('')+'</select></label><button type="button" class="btn" id="invoice-load">Load quotation lines</button></div>')+'<div id="invoice-lines"></div><button type="button" class="btn" id="invoice-add-line">'+icon('plus',16)+'Add invoice line</button><div class="invoice-live-total" id="invoice-total" aria-live="polite"></div>';
  editOperation(action,{title:existing?'Edit invoice draft':'Create invoice',wide:true,fields,content,notes:state.data.publicDemo?'Public demo invoices are simulated. No TIN, tax registration or signatory is invented.':'Complete the verified company profile and bilingual customer and item details before live issuance.',submit:'Save invoice draft',transform:values=>({...values,id:existing?.id,claimId:existing?.claimId||claim?.id,items:structuredClone(items)}),afterOpen:form=>{
    const host=$('#invoice-lines',form),total=$('#invoice-total',form);
    const totals=()=>{const v=invoiceTotals(items,form.elements.currency.value,Number(form.elements.taxRate.value)||0,Number(form.elements.discount.value)||0);total.textContent=t('Invoice total')+': '+amount(v.total,form.elements.currency.value)+' | '+t('VAT')+': '+amount(v.tax,form.elements.currency.value);};
    const draw=()=>{host.innerHTML=items.map((item,i)=>'<section class="invoice-line"><header><strong>'+e(t('Invoice line'))+' '+(i+1)+'</strong><button type="button" class="btn small" data-invoice-remove="'+i+'" aria-label="Remove line '+(i+1)+'">'+icon('close',16)+'</button></header><div class="form-grid">'+[['description','Description','text'],['descriptionKh','Description in Khmer','text'],['unit','Unit','text'],['quantity','Quantity','number'],['rate','Unit rate','number']].map(([key,label,type])=>'<label class="field">'+e(t(label))+'<input data-invoice-line="'+i+'" data-invoice-field="'+key+'" type="'+type+'" '+(key!=='descriptionKh'?'required':'')+' '+(type==='number'?'min="'+(key==='quantity'?'0.001':'0')+'" step="any"':'')+' value="'+A(item[key]??'')+'"></label>').join('')+'</div></section>').join('');totals();};
    host.addEventListener('input',event=>{const input=event.target;if(!input.dataset.invoiceField)return;const key=input.dataset.invoiceField;items[Number(input.dataset.invoiceLine)][key]=['quantity','rate'].includes(key)?Number(input.value):input.value;totals();});
    host.addEventListener('click',event=>{const control=event.target.closest('[data-invoice-remove]');if(control){items.splice(Number(control.dataset.invoiceRemove),1);draw();formDirty=true;}});
    $('#invoice-add-line',form).addEventListener('click',()=>{if(items.length>=100){toast('An invoice supports up to 100 lines.',true);return;}items.push({description:'',descriptionKh:'',unit:'ea',quantity:1,rate:0});draw();formDirty=true;});
    for(const key of ['currency','taxRate','discount'])form.elements[key].addEventListener('input',totals);
    form.elements.clientId.addEventListener('change',()=>{const c=rec(form.elements.clientId.value);for(const [key,value] of Object.entries({buyerName:c?.name||'',buyerNameKh:'',buyerAddress:c?.address||'',buyerAddressKh:'',buyerTin:c?.taxId||''}))form.elements[key].value=value;});
    $('#invoice-load',form)?.addEventListener('click',()=>{const q=rec($('#invoice-source',form).value);if(!q)return;items.splice(0,items.length,...quoteClientItems(q).map(line=>({description:[line.description,line.spec].filter(Boolean).join(' / '),descriptionKh:'',unit:line.unit,quantity:line.quantity,rate:line.rate})));const c=rec(q.clientId);for(const [key,value] of Object.entries({name:q.name,clientId:q.clientId,projectId:q.projectId||'',contractId:'',currency:q.currency,taxRate:q.tax,discount:q.discount,buyerName:c.name,buyerAddress:c.address||'',buyerNameKh:'',buyerAddressKh:'',buyerTin:c.taxId||''}))form.elements[key].value=value;draw();formDirty=true;});draw();
  }});
}
function invoiceProfileForm(){
  const p=invoiceProfile(settings());
  editOperation('invoiceProfile.update',{title:'Company invoice profile',wide:true,notes:'Official English name: T E A M S Co., Ltd. Enter the registered details exactly as supported by company records. Public contact address: '+p.contactAddress,
    fields:[text('legalNameKh','Registered company name in Khmer',p.legalNameKh,optional),text('tin','Company VAT TIN',p.tin,optional),select('taxpayerType','Registered taxpayer classification',[['','Not configured'],['small','Small'],['medium','Medium'],['large','Large']],p.taxpayerType,optional),textarea('registeredAddress','Registered company address',p.registeredAddress,optional),textarea('registeredAddressKh','Registered company address in Khmer',p.registeredAddressKh,optional),text('phone','Company phone',p.phone,optional),text('email','Company invoice email',p.email,{...optional,type:'email'}),textarea('paymentInstructions','Payment instructions / bank details',p.paymentInstructions,optional),text('signatory','Authorized invoice signatory',p.signatory,optional),text('verificationReference','Verification reference',p.verificationReference||'',optional),input('verified','Registered details verified for live issuance',p.verified,{type:'checkbox',required:false})],submit:'Save invoice profile',open:false});
}
async function printInvoice(id){
  const tab=window.open('about:blank','_blank');
  try{const response=await api('/api/export?'+new URLSearchParams({kind:'invoice',id,format:'pdf'}));const href=URL.createObjectURL(await response.blob());if(tab){tab.opener=null;tab.location.href=href;}else{const a=document.createElement('a');a.href=href;a.download=(rec(id)?.code||'invoice')+'.pdf';a.click();}setTimeout(()=>URL.revokeObjectURL(href),60000);}catch(error){tab?.close();toast(error.message,true);}
}
