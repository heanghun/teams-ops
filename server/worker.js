import { hasFinanceAccess, financeAuditAllowed, invoiceAccountingExport } from './finance.js';
import { mailConnection, mailboxRoute, receiveMailbox } from './mail-service.js';
import { emailConnection } from './email.js';
import { importPersonnel, personnelImportKey, validImportToken, verifyRoster } from './roster.js';
import { initialRecords } from './seed.js';
import { DomainError, applyOperation, allowed } from './domain.js';
import { tenderEstimate } from './tender-estimating.js';
import { aiReviewAvailable, reviewWithAi } from './ai-review.js';
import { attachmentTypes, demoRoles, downloadHeaders, exportResponse, json, protection, requestKey, statePayload, visible } from './presentation.js';

async function loadRows(db) {
  const {results}=await db.prepare('SELECT r.version, a.id, a.payload FROM revisions r LEFT JOIN records a ON 1=1 WHERE r.id=1 ORDER BY a.rowid').all();
  return {version:results[0]?.version??0, rows:results.filter(r=>r.id).map(r=>JSON.parse(r.payload))};
}
function writeRows(db,records,now){
  return db.prepare(`INSERT INTO records(id,kind,project_id,parent_id,payload,updated_at)
    SELECT json_extract(value,'$.id'),json_extract(value,'$.kind'),json_extract(value,'$.projectId'),json_extract(value,'$.parentId'),value,?
    FROM json_each(?) WHERE 1
    ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,parent_id=excluded.parent_id,payload=excluded.payload,updated_at=excluded.updated_at`)
    .bind(now,JSON.stringify(records));
}
function auditStmt(db,key,version,actor,action,target,changes,now){
  return db.prepare('INSERT INTO audit(request_id,version,actor,action,target,summary,created_at) VALUES(?,?,?,?,?,?,?)')
    .bind(key,version,actor.id,action,target?.id??null,JSON.stringify(changes),now);
}
const isConflict=error=>String(error?.message??error).includes('revision_conflict')||String(error?.message??error).includes('audit.request_id');
async function seedDB(db,demo) {
  const mode = demo ? 'demo.initialize' : 'initialize';
  const confirmMode = async state => {
    const first = await db.prepare("SELECT action FROM audit WHERE request_id='initialization'").first();
    if (first?.action !== mode) throw new DomainError('Use a separate database for team records and fictional records.', 503);
    return state;
  };
  let state=await loadRows(db);
  if(state.rows.length) return confirmMode(state);
  const now=new Date().toISOString(),items=initialRecords(demo);
  try{
    await db.batch([auditStmt(db,'initialization',state.version+1,{id:'system'},mode,null,[],now),writeRows(db,items,now)]);
    return {version:state.version+1,rows:items};
  }catch(error){ if(!isConflict(error))throw error; }
  state=await loadRows(db);
  if(!state.rows.length)throw new DomainError('The database is initializing. Try again.',503);
  return confirmMode(state);
}
function privatePrincipal(request,env){
  const id=request.headers.get('oai-authenticated-user-id');
  const email=(request.headers.get('oai-authenticated-user-email')||'').toLowerCase();
  const owner=env.TEAMS_OWNER_EMAIL?.trim().toLowerCase();
  if(!id)throw new DomainError('Sign in with the authorized TEAMS administrator account.',401);
  if(!owner||email!==owner)throw new DomainError('This account does not have access to the private TEAMS workspace.',403);
  return {id,email,roles:['admin'],demo:true,privateWorkspace:true,personnelAdmin:true,name:'TEAMS Administrator'};
}
function getActor(request,env,state,demo) {
  if(env.TEAMS_MODE==='staff-demo'){
    const principal=privatePrincipal(request,env);
    const preview=request.headers.get('X-Teams-Preview-Employee');
    if(!preview)return principal;
    const employee=state.rows.find(record=>record.kind==='personnel'&&record.id===preview);
    if(!employee)throw new DomainError('Select a valid employee to preview.',404);
    return {id:'preview:'+principal.id+':'+employee.id,roles:employee.roles,approvals:employee.approvals,name:employee.name,
      position:employee.position,previewEmployeeId:employee.id,demo:true,privateWorkspace:true};
  }
  const id=request.headers.get('oai-authenticated-user-id');
  const email=(request.headers.get('oai-authenticated-user-email')||'').toLowerCase();
  if(!id) throw new DomainError('Sign in to open TEAMS Operations.',401);
  if(demo){
    const role=request.headers.get('X-Teams-Demo-Role')||'admin';
    if(!demoRoles.includes(role))throw new DomainError('Unknown demonstration role.',400);
    return {id:'demo:'+id+':'+role,email,roles:[role],demo:true};
  }
  const owner=env.TEAMS_OWNER_EMAIL?.trim().toLowerCase();
  const employee=state.rows.find(r=>r.kind==='employee'&&r.email===email);
  if(employee){
    if(!employee.active)throw new DomainError('Your TEAMS access is disabled.',403);
    return {id,email,roles:employee.roles,name:employee.name,demo:false};
  }
  if(owner && email===owner)return {id,email,roles:['admin'],demo:false};
  throw new DomainError('Your account does not have TEAMS access.',403);
}
async function mutate(db,env,request,action,data,key,demo) {
  for(let attempt=0;attempt<4;attempt++){
    const state=await loadRows(db),actor=getActor(request,env,state,demo);
    const prior=await db.prepare('SELECT actor, action, target FROM audit WHERE request_id=?').bind(key).first();
    if(prior){
      if(prior.actor!==actor.id||prior.action!==action)throw new DomainError('This request identifier was already used.',409);
      return {id:prior.target,replayed:true};
    }
    let outcome;
    const reset=action==='demo.reset';
    if(reset){
      if(!demo||actor.privateWorkspace||!allowed(actor,'settings.update')||data.confirm!=='RESET')throw new DomainError('Demo reset requires administrator access and confirmation.',403);
      outcome={target:null,changes:initialRecords(true)};
    }else outcome=applyOperation(state.rows,actor,action,data,demo);
    const now=new Date().toISOString();
    const history=reset?[]:outcome.changes.map(row=>{
      const previous=state.rows.find(x=>x.id===row.id),fields=Object.keys(row).filter(k=>k!=='key'&&JSON.stringify(row[k])!==JSON.stringify(previous?.[k]));
      return {id:row.id,kind:row.kind,fields,reason:row.personnelReason||row.assignmentReason||row.approvalReason||row.reason||row.closeReason||row.reference||row.revisionReason||null,
        before:previous?Object.fromEntries(fields.map(k=>[k,previous[k]??null])):null,after:Object.fromEntries(fields.map(k=>[k,row[k]??null]))};
    });
    const batch=[auditStmt(db,key,state.version+1,actor,action,outcome.target,history,now),...(reset?[db.prepare('DELETE FROM records')]:[]),writeRows(db,outcome.changes,now)];
    try{await db.batch(batch);return {id:outcome.target?.id??null};}
    catch(error){if(!isConflict(error))throw error;}
  }
  throw new DomainError('Another transaction changed these records. Review the latest values and retry.',409);
}
function assertWriteOrigin(request){
  if(request.headers.get('Sec-Fetch-Site')==='cross-site')throw new DomainError('Cross-site writes are blocked.',403);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)throw new DomainError('Invalid request origin.',403);
}

async function provisionRoster(request,env,db){
  const token=request.headers.get('X-Teams-Roster-Import');
  if(!await validImportToken(token,env.TEAMS_PERSONNEL_IMPORT_TOKEN))return json({error:'This endpoint does not exist.'},404);
  if(!db)throw new DomainError('The employee directory database is unavailable.',503);
  if(request.method==='GET')return json(await verifyRoster((await loadRows(db)).rows));
  if(request.method!=='POST')throw new DomainError('Method not allowed.',405);
  const raw=await request.text();
  if(raw.length>150000)throw new DomainError('The employee master exceeds the allowed size.',413);
  let master;
  try{master=JSON.parse(raw);}catch{throw new DomainError('Invalid employee master JSON.',400);}
  const roster=importPersonnel(master);
  await seedDB(db,true);
  for(let attempt=0;attempt<4;attempt++){
    const state=await loadRows(db);
    if(state.rows.some(row=>row.kind==='personnel')){
      const prior=await db.prepare('SELECT request_id FROM audit WHERE request_id=?').bind(personnelImportKey).first();
      if(!prior)throw new DomainError('Existing employees require an administrator review before import.',409);
      const existing=await verifyRoster(state.rows);
      if(existing.sourceFingerprint!==(await verifyRoster(roster)).sourceFingerprint)throw new DomainError('A different employee master was already imported.',409);
      return json(existing);
    }
    const now=new Date().toISOString();
    const history=roster.map(row=>({id:row.id,kind:row.kind,fields:['roles'],before:{roles:[]},after:{roles:row.roles},reason:'November 2026 proposed profile import'}));
    try{
      await db.batch([auditStmt(db,personnelImportKey,state.version+1,{id:'authorized-personnel-import'},'personnel.import',null,history,now),writeRows(db,roster,now)]);
      return json(await verifyRoster((await loadRows(db)).rows),201);
    }catch(error){if(!isConflict(error))throw error;}
  }
  throw new DomainError('The directory changed during import. Retry the same master.',409);
}

async function route(request,env){
  const url=new URL(request.url),path=url.pathname,db=env.DB,demo=env.TEAMS_MODE!=='team';
  const publicDemo=env.TEAMS_MODE==='public-demo',staffDemo=env.TEAMS_MODE==='staff-demo';
  if(publicDemo&&path==='/'&&url.searchParams.get('workspace')==='private'){
    return new Response(null,{status:302,headers:{...protection,Location:'/#home'}});
  }
  if(!path.startsWith('/api/')){
    const asset=typeof assets!=='undefined'?assets[path]:null;
    if(asset&&typeof asset==='object'){
      const body=Uint8Array.from(atob(asset.base64),character=>character.charCodeAt(0));
      return new Response(body,{headers:{...protection,'Content-Type':asset.type,'Cache-Control':'public, max-age=3600'}});
    }
    if(asset!=null){
      const contentType=path==='/'||path.endsWith('.html')?'text/html':path.endsWith('.webmanifest')?'application/manifest+json':path.endsWith('.css')?'text/css':path.endsWith('.txt')?'text/plain':'text/javascript';
      const scriptSources=path==='/'&&typeof startupScriptHash==='string'?`'self' 'sha256-${startupScriptHash}'`:"'self'";
      const contentSecurityPolicy=`default-src 'self'; style-src 'self' 'unsafe-inline'; script-src ${scriptSources}; font-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'`;
      return new Response(asset,{headers:{...protection,'Content-Type':contentType+'; charset=utf-8',...(path==='/sw.js'?{'Service-Worker-Allowed':'/','Cache-Control':'no-cache'}:{}),'Content-Security-Policy':contentSecurityPolicy}});
    }
    return new Response('Page not found.',{status:404});
  }
  if(path==='/api/health'&&request.method==='GET')return json({status:'ok',service:'teams-operations'});
  if(path==='/api/mode'&&request.method==='GET')return json({publicDemo});
  if(path==='/api/mail/webhook'&&!publicDemo&&env.TEAMS_MODE==='team')return receiveMailbox(request,env,{db,seedDB,loadRows,writeRows,auditStmt,isConflict});
  if(publicDemo)return json({error:'Public demo transactions run in your browser.'},404);
  if(path==='/api/personnel-provision'){
    if(staffDemo&&env.TEAMS_PERSONNEL_BOOTSTRAP==='enabled')return provisionRoster(request,env,db);
    return json({error:'This endpoint does not exist.'},404);
  }
  if(staffDemo)privatePrincipal(request,env);
  if(!request.headers.get('oai-authenticated-user-id'))return json({error:'Sign in to open TEAMS Operations.'},401);
  if(!db)throw new DomainError('The operations database is not connected.',503);
  if(!['GET','POST'].includes(request.method))throw new DomainError('Method not allowed.',405);
  if(request.method==='POST')assertWriteOrigin(request);
  const state=await seedDB(db,demo);
  const actor=getActor(request,env,state,demo);
  if(path==='/api/tender-estimate'&&request.method==='GET')return json(tenderEstimate(state.rows,actor,url.searchParams.get('id')));
  if(path==='/api/state'&&request.method==='GET')return json({...statePayload(state,actor,demo),emailConnection:mailConnection(env,demo),aiReview:aiReviewAvailable(env,actor)});
  if(path==='/api/ai/review'&&request.method==='POST')return reviewWithAi(request,env,state,actor);
  if(path==='/api/personnel-audit'&&request.method==='GET'){
    if(!actor.personnelAdmin)throw new DomainError('Employee audit history is restricted to the directory administrator.',403);
    const {results}=await db.prepare("SELECT action,actor,target,summary,created_at,version FROM audit WHERE action LIKE 'personnel.%' ORDER BY version DESC LIMIT 100").all();
    return json(results.map(row=>({...row,summary:JSON.parse(row.summary)})));
  }
  if(path==='/api/action'&&request.method==='POST'){
    if(Number(request.headers.get('Content-Length'))>1500000)throw new DomainError('The submitted record is too large.',413);
    const raw=await request.text();
    if(raw.length>1500000)throw new DomainError('The submitted record is too large.',413);
    let input;
    try{input=JSON.parse(raw);}catch{throw new DomainError('Invalid request body.',400);}
    if(['dispatch.create','mail.send'].includes(input?.action))throw new DomainError('Use the email dispatch endpoint.',400);
    if(input?.action==='document.attach')throw new DomainError('Use the file upload endpoint.',400);
    return json(await mutate(db,env,request,input?.action,input?.data??{},requestKey(input?.key),demo));
  }
  if(path==='/api/send-email')throw new DomainError('Use the Email workspace to compose messages. Scans are no longer required.',400);
  if(path.startsWith('/api/mail/'))return mailboxRoute(request,env,{db,state,actor,demo,mutate,loadRows,writeRows,auditStmt,isConflict});
  if(path==='/api/invoice-accounting-export'&&request.method==='GET'){
    if(!hasFinanceAccess(actor))throw new DomainError('Financial export is restricted.',403);
    return new Response(JSON.stringify(invoiceAccountingExport(state.rows),null,2),{headers:downloadHeaders('teams-invoices-accounting.json','application/json')});
  }
  if(path==='/api/backup'&&request.method==='GET'){
    if(!hasFinanceAccess(actor))throw new DomainError('Full snapshots contain financial data and are restricted to MD and Finance Manager.',403);
    const {results}=await db.prepare('SELECT * FROM audit WHERE version<=? ORDER BY version').bind(state.version).all();
    const records=state.rows.filter(row=>row.kind!=='personnel'||actor.personnelAdmin).map(row=>{
      if(row.kind!=='document')return row;
      const {key,...metadata}=row;
      return metadata;
    });
    return new Response(JSON.stringify({format:1,mode:demo?'fictional':'team',version:state.version,exportedAt:new Date().toISOString(),records,audit:actor.personnelAdmin?results:results.filter(row=>!row.action.startsWith('personnel.'))}),{
      headers:downloadHeaders('teams-operations-snapshot.json','application/json; charset=utf-8'),
    });
  }
  if(path==='/api/audit'&&request.method==='GET'){
    if(!actor.roles.some(r=>['admin','auditor','director','finance'].includes(r)))throw new DomainError('Audit history requires authorized access.',403);
    const {results}=await db.prepare('SELECT action,actor,target,created_at,version FROM audit ORDER BY version DESC LIMIT 100').all();
    return json(results.filter(row=>(actor.personnelAdmin||!row.action.startsWith('personnel.'))&&financeAuditAllowed(row,actor,state.rows)));
  }
  if(path==='/api/upload'&&request.method==='POST'){
    if(!allowed(actor,'document.attach'))throw new DomainError('Your role cannot attach documents.',403);
    if(!env.BUCKET)throw new DomainError('Document storage is unavailable.',503);
    const length=Number(request.headers.get('Content-Length'));
    if(length>12000000)throw new DomainError('Maximum attachment size is 10 MB.',413);
    const form=await request.formData(),file=form.get('file'),parentId=String(form.get('parentId')??'');
    if(!file||typeof file==='string'||file.size===0||file.size>10000000)throw new DomainError('Choose a file up to 10 MB.',400);
    if(!attachmentTypes.has(file.type||'application/octet-stream'))throw new DomainError('Upload a PDF, image, Office workbook/document or text file.',415);
    const parent=state.rows.find(x=>x.id===parentId);
    if(!visible(parent,actor,state.rows))throw new DomainError('Select an accessible record.',403);
    const key=requestKey(form.get('key'));
    const previous=await db.prepare('SELECT actor,action,target FROM audit WHERE request_id=?').bind(key).first();
    if(previous?.actor===actor.id&&previous.action==='document.attach'&&previous.target)return json({id:previous.target,replayed:true});
    const storageKey=(demo?'fictional/':'team/')+crypto.randomUUID();
    const purpose=String(form.get('purpose')||'');

    const data={name:file.name,parentId,key:storageKey,size:file.size,type:file.type||'application/octet-stream',purpose};
    await env.BUCKET.put(storageKey,file.stream());
    try{
      const result=await mutate(db,env,request,'document.attach',data,key,demo);
      if(result.replayed)await env.BUCKET.delete(storageKey);
      return json(result);
    }catch(error){await env.BUCKET.delete(storageKey).catch(()=>{});throw error;}
  }
  if(path.startsWith('/api/file/')&&request.method==='GET'){
    const id=path.split('/').at(-1),record=state.rows.find(x=>x.kind==='document'&&x.id===id);
    if(!visible(record,actor,state.rows))throw new DomainError('File not found.',404);
    if(!env.BUCKET)throw new DomainError('Document storage is unavailable.',503);
    const object=await env.BUCKET.get(record.key);
    if(!object)throw new DomainError('File not found.',404);
    return new Response(object.body,{headers:downloadHeaders(record.name,'application/octet-stream')});
  }
  if(path==='/api/export'&&request.method==='GET')return exportResponse(state,actor,demo,url);
  return json({error:'This endpoint does not exist.'},404);
}

const operationsWorker = {
  async fetch(request,env){
    try{return await route(request,env);}
    catch(error){
      if(error instanceof DomainError)return json({error:error.message},error.status);
      console.error(error);
      return json({error:'The operation could not be completed. Refresh and try again.'},500);
    }
  },
};

export default operationsWorker;
