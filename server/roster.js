import { dateOffset } from './seed.js';
import { DomainError, roles } from './domain.js';

export const personnelImportKey='personnel-master-november-2026';
const sourceKeys=['source_row','employee_id','english_name','position_source','department_source','team_source','employment_group',
  'proposed_app_role','access_status','review_notes'];
const byteString=new TextEncoder();
export async function rosterHash(value){
  const hash=await crypto.subtle.digest('SHA-256',byteString.encode(JSON.stringify(value)));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function validImportToken(supplied,configured){
  if(typeof configured!=='string'||configured.length<48||typeof supplied!=='string'||supplied.length!==configured.length)return false;
  const [a,b]=await Promise.all([rosterHash(supplied),rosterHash(configured)]);
  let difference=0;
  for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
export function importPersonnel(master){
  if(!Array.isArray(master?.employees)||master.employees.length!==69||master.as_of!=='2026-11-11')
    throw new DomainError('The November employee master must contain exactly 69 records.');
  const employeeIds=new Set(),sourceRows=new Set();
  const employees=master.employees.map(row=>{
    if(!row||!Number.isSafeInteger(row.source_row)||sourceRows.has(row.source_row)||sourceKeys.slice(1).some(key=>typeof row[key]!=='string'||row[key].length>800))
      throw new DomainError('An employee master row is incomplete or duplicated.');
    if(!row.english_name.trim()||!row.position_source.trim()||!['Regular','Intern'].includes(row.employment_group)||
        ![...roles,'no_access'].includes(row.proposed_app_role))throw new DomainError('An employee name, position, employment group or permission profile is invalid.');
    const employeeId=row.employee_id;
    if(employeeId&&(!/^[A-Za-z0-9_-]{1,32}$/.test(employeeId)||employeeIds.has(employeeId)))
      throw new DomainError('Employee IDs must be unique text values.');
    sourceRows.add(row.source_row);
    if(employeeId)employeeIds.add(employeeId);
    const source=Object.fromEntries(sourceKeys.map(key=>[key,row[key]]));
    return {
      kind:'personnel',id:'personnel:'+(employeeId||crypto.randomUUID()),employeeId:employeeId||null,
      name:row.english_name,position:row.position_source,department:row.department_source,team:row.team_source,
      employmentGroup:row.employment_group,roles:row.proposed_app_role==='no_access'?[]:[row.proposed_app_role],approvals:[],
      loginProvisioned:false,source,reviewResolved:false,date:dateOffset(),
    };
  });
  if(employees.filter(row=>row.employmentGroup==='Regular').length!==67||employeeIds.size!==68)
    throw new DomainError('The roster must have 67 regular employees, two interns and one blank HR ID.');
  return employees;
}
export async function verifyRoster(rows){
  const roster=rows.filter(row=>row.kind==='personnel').sort((a,b)=>a.source.source_row-b.source.source_row);
  const operations=rows.filter(row=>row.kind!=='personnel');
  const counts={};
  for(const row of operations)counts[row.kind]=(counts[row.kind]??0)+1;
  return {
    total:roster.length,regular:roster.filter(row=>row.employmentGroup==='Regular').length,interns:roster.filter(row=>row.employmentGroup==='Intern').length,
    leadingZeroIds:roster.filter(row=>row.employeeId?.startsWith('0')).length,missingIds:roster.filter(row=>!row.employeeId).length,
    reviewFlags:roster.filter(row=>row.source.review_notes||!row.department||!row.team||!row.employeeId).length,
    loginAccountsCreated:roster.filter(row=>row.loginProvisioned).length,
    separateApprovalGrants:roster.reduce((sum,row)=>sum+row.approvals.length,0),
    sourceFingerprint:await rosterHash(roster.map(row=>Object.fromEntries(sourceKeys.map(key=>[key,row.source[key]])))),
    operationalCounts:counts,operationalFingerprint:await rosterHash(operations),
  };
}
