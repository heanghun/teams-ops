import { reportData, teamsEmployeeIdentity, viewAccess } from './domain.js';
import { visible } from './presentation.js';

export const telegramWorkstreams={
  projects:'Projects and tasks',maintenance:'Maintenance',procurement:'Procurement and inventory',
  commercial:'Tenders and quotations',finance:'Billing and collections',reports:'Reports',mail:'Email',general:'General operations',
};

const workRoutes={
  project:['projects','projects'],task:['projects','projects'],variation:['projects','projects'],delivery:['procurement','procurement'],
  job:['maintenance','maintenance'],contract:['maintenance','maintenance'],agreement:['maintenance','maintenance'],
  request:['procurement','procurement'],po:['procurement','procurement'],supplier:['procurement','procurement'],
  stock:['procurement','inventory'],material:['procurement','inventory'],warehouse:['procurement','inventory'],
  tender:['commercial','tenders'],quote:['commercial','quotes'],claim:['finance','billing'],
  milestone:['finance','billing'],invoice:['finance','billing'],cash:['finance','billing'],mail:['mail','mail'],
  client:['general','clients'],document:['general','documents'],
};

const workMessage={
  'task.create':'A project task was assigned.',
  'task.assign':'A project task was reassigned.',
  'task.update':'A project task was updated.',
  'project.assign':'A project team assignment changed.',
  'job.assign':'A service visit assignment changed.',
  'delivery.assign':'A delivery was assigned.',
  'mail.received':'New work mail is available.',
};

export function telegramConfiguration(rows){
  return rows.find(row=>row.id==='platform-settings')?.telegram??{enabled:false,routes:{}};
}

const telegramEnabled=(env,rows)=>env.TEAMS_MODE==='team'&&!!env.TEAMS_TELEGRAM_BOT_TOKEN&&telegramConfiguration(rows).enabled;
const minuteInSeconds=60;
const hourInSeconds=60*minuteInSeconds;
const nowSeconds=()=>Math.floor(Date.now()/1000);

function workRecordUsers(row){
  return [row.ownerEmployeeId,row.managerEmployeeId,row.technicianEmployeeId,row.leadEmployeeId,
    row.supervisorEmployeeId,row.deliveryEmployeeId,row.buyerEmployeeId,row.requesterEmployeeId,
    row.handlerEmployeeId,row.recipientEmployeeId,...(row.staffEmployeeIds??[])].filter(Boolean);
}
const teamNoticeActor=employee=>({
  id:teamsEmployeeIdentity(employee),employeeId:employee.id,roles:employee.roles,email:employee.email,
  formerSignInEmails:employee.formerSignInEmails??[],demo:false,directoryAssignments:true,mailboxGrants:employee.mailboxGrants??[],
});

function notificationRows(env,rows,event,category,view,message,employees,now){
  const config=telegramConfiguration(rows);
  const groups=config.routes[category]??[];
  const recipients=employees.filter(employee=>employee.active&&!employee.removedOn&&!employee.roles.includes('admin')&&viewAccess(teamNoticeActor(employee)).includes(view));
  return [...new Set([...groups,...recipients.map(employee=>'account:'+employee.id)])].map(destination=>
    env.DB.prepare('INSERT OR IGNORE INTO teams_telegram_outbox(id,category,destination,message,view,created_at,next_at) VALUES(?,?,?,?,?,?,?)')
      .bind(event+':'+destination,category,destination,message,view,now,now));
}

export function queueTelegramWork(env,records,change,action,key){
  if(!telegramEnabled(env,records)||!change||action==='document.store'||action==='mail.save')return [];
  const route=workRoutes[action.split('.')[0]];
  if(!route)return [];
  const [category,view]=route;
  const index=new Map(records.map(row=>[row.id,row]));
  const parent=index.get(change.projectId||change.contractId||change.parentId);
  const ids=new Set([...workRecordUsers(change),...(parent?workRecordUsers(parent):[])]);
  const creators=new Set([change.createdBy,parent?.createdBy].filter(Boolean));
  const employees=records.filter(row=>row.kind==='employee'&&
    (ids.has(row.id)||creators.has(teamsEmployeeIdentity(row))||change.technicianEmail&&change.technicianEmail===row.email||
      action==='mail.received'&&row.mailboxGrants?.includes(change.mailbox)));
  const readable=employees.filter(employee=>visible(change,teamNoticeActor(employee),records));
  const message=action==='job.update'&&change.status==='Completed'?'A completed service report is ready.':
    workMessage[action]||telegramWorkstreams[category]+' update ready to review.';
  return notificationRows(env,records,key,category,view,message,readable,nowSeconds());
}

export async function queueTelegramReminders(env,records,scheduledTime){
  if(!telegramEnabled(env,records)||!records.some(row=>row.kind==='settings'))return;
  const now=Math.floor(scheduledTime/1000),local=new Date(scheduledTime+7*3600*1000);
  if(local.getUTCHours()!==8)return;
  const day=local.toISOString().slice(0,10);
  const nextDay=new Date(local.getTime()+86400000).toISOString().slice(0,10);
  const dueTasks=records.filter(row=>row.kind==='task'&&row.status!=='Completed'&&row.due&&row.due<=nextDay);
  const currentAlerts=reportData(records,day).alerts;
  const employees=records.filter(row=>row.kind==='employee');
  const statements=[];
  for(const [category,views] of Object.entries({
    projects:['projects'],maintenance:['maintenance'],procurement:['inventory','procurement'],
    commercial:['tenders','quotes'],finance:['billing'],
  })){
    const alerts=currentAlerts.filter(alert=>views.includes(alert.view)).map(alert=>records.find(row=>row.id===alert.id)).filter(Boolean);
    if(category==='projects')alerts.push(...dueTasks);
    if(!alerts.length)continue;
    statements.push(...notificationRows(env,records,'daily:'+day+':'+category,category,views.at(-1),
      'TEAMS work queue has items requiring attention.',employees.filter(employee=>alerts.some(row=>visible(row,teamNoticeActor(employee),records))),now));
  }
  if(local.getUTCDay()===1){
    statements.push(...notificationRows(env,records,'weekly:'+day,'reports','reports',
      'The weekly operations summary is ready to review.',employees,now));
  }
  if(statements.length)await env.DB.batch(statements);
}

export async function deliverTelegramQueue(env,records){
  if(!telegramEnabled(env,records))return;
  const db=env.DB,now=nowSeconds(),config=telegramConfiguration(records);
  const {results}=await db.prepare("UPDATE teams_telegram_outbox SET attempts=attempts+1,next_at=? WHERE id IN "+
    "(SELECT id FROM teams_telegram_outbox WHERE status='pending' AND next_at<=? ORDER BY next_at LIMIT 24) RETURNING *")
    .bind(now+10*minuteInSeconds,now).all();
  if(!results.length)return;
  let recipients=new Map();
  if(results.some(row=>row.destination.startsWith('account:'))){
    const {results:links}=await db.prepare("SELECT a.account_id,a.chat_id,r.payload FROM teams_telegram_accounts a "+
      "JOIN records r ON r.id=a.account_id AND r.kind='employee' WHERE a.approved_at IS NOT NULL").all();
    recipients=new Map(links.map(link=>[link.account_id,{chatId:link.chat_id,employee:JSON.parse(link.payload)}]));
  }
  const outcomes=[];
  for(const event of results){
    const {id}=event;
    let chatId='';
    if(event.destination.startsWith('account:')){
      const recipient=recipients.get(event.destination.slice('account:'.length)),employee=recipient?.employee;
      if(employee?.active&&!employee.removedOn&&!employee.roles.includes('admin')&&viewAccess(teamNoticeActor(employee)).includes(event.view))chatId=recipient.chatId;
    }else if(config.routes[event.category]?.includes(event.destination)){
      chatId=event.destination;
    }
    if(!chatId){
      outcomes.push(db.prepare("UPDATE teams_telegram_outbox SET status='skipped' WHERE id=?").bind(id));
      continue;
    }
    let status='pending',delay=Math.min(2**event.attempts*minuteInSeconds,2*hourInSeconds);
    try{
      const response=await fetch('https://api.telegram.org/bot'+env.TEAMS_TELEGRAM_BOT_TOKEN+'/sendMessage',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:chatId,text:event.message+'\nhttps://'+env.TEAMS_APP_HOST+'/#'+event.view,link_preview_options:{is_disabled:true}}),
      });
      const result=await response.json().catch(()=>null);
      if(response.ok&&result?.ok===true)status='sent';
      else if(response.status===429)delay=Math.min(Math.max(Number(result?.parameters?.retry_after)||delay,15),2*hourInSeconds);
      else if(response.status>=400&&response.status<500)status='failed';
    }catch{
      // Retry without including a provider credential or work data in logs.
    }
    if(event.attempts>=6&&status==='pending')status='failed';
    outcomes.push(db.prepare('UPDATE teams_telegram_outbox SET status=?,next_at=? WHERE id=?').bind(status,now+delay,id));
  }
  outcomes.push(db.prepare("DELETE FROM teams_telegram_outbox WHERE status<>'pending' AND created_at<?").bind(now-30*24*hourInSeconds));
  await db.batch(outcomes);
}
