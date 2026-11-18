import { createXlsx } from '../server/documents.js';

const column = (key,label,required,example,rule,aliases=[]) => ({key,label,required,example,rule,aliases});
const currencyColumn = column('currency','Currency',true,'USD','Use USD or KHR.');
const existingClient = column('clientName','Client name',true,'Example Property Co.','Use the exact name of an existing client. Import Clients first.');

export const masterImports = {
  client:{label:'Clients',columns:[
    column('name','Company name',true,'Example Property Co.','Unique client company name.',['Client name','Customer name','Company']),
    column('type','Customer type',false,'Corporate','Defaults to Corporate when blank.'),
    column('contact','Primary contact',false,'Example Contact','Required when entering a contact phone or email.',['Contact name']),
    column('phone','Phone',false,'012345678','Include any country code and leading zero.',['Telephone','Mobile']),
    column('email','Email',false,'contact@example.test','Email of the named contact.',['Email address','E-mail']),
    column('address','Billing address',false,'Example address, Phnom Penh','Billing address.',['Address']),
    column('taxId','Tax ID',false,'000123456','Keep leading zeros.',['TIN','VAT TIN']),
    column('notes','Notes',false,'Send billing queries to the primary contact.','Internal notes.'),
  ]},
  supplier:{label:'Suppliers',columns:[
    column('name','Supplier name',true,'Example Industrial Supplies','Unique supplier company name.',['Supplier','Company name','Vendor name','Vendor']),
    column('email','Email',false,'sales@example.test','Supplier contact email.',['Email address','E-mail','Supplier email']),
    column('phone','Phone',false,'012345678','Include any country code and leading zero.',['Telephone','Tel','Mobile','Phone number']),
    column('terms','Payment terms',false,'Net 30','Agreed supplier terms.',['Terms','Credit terms']),
  ]},
  material:{label:'Materials',columns:[
    column('code','Material code',true,'MAT-001','Unique catalog code.',['Item code','SKU']),
    column('name','Description',true,'Copper pipe','Material or stock item description.',['Material name','Item name']),
    column('category','Category',true,'Plumbing','Material category.'),
    column('unit','Base unit',true,'m','Main unit used for purchasing and stock.',['Unit','UOM']),
    column('spec','Specification',false,'22 mm','Size, grade, model, or other defining detail.'),
    column('barcode','Barcode',false,'0001234567890','Unique barcode. Defaults to the material code.'),
    currencyColumn,
    column('price','Verified unit price',true,'12.50','Enter a nonnegative amount in the stated currency.',['Unit price','Item price']),
    column('priceDate','Price date',true,'2026-01-15','YYYY-MM-DD. Use the date the price was verified. Future dates are rejected.'),
    column('minimum','Minimum',false,'10','Minimum stock quantity in the base unit. Defaults to zero.',['Minimum stock']),
    column('supplierName','Supplier name',false,'Example Industrial Supplies','Exact name of an existing supplier. Import Suppliers first.'),
  ]},
  project:{label:'Projects',columns:[
    column('name','Project name',true,'Example Office Retrofit','Project title.'),
    existingClient,
    column('location','Site location',true,'Example site, Phnom Penh','Project site.',['Site','Location']),
    column('service','Service category',true,'MEP installation','Operational service category.',['Service']),
    column('manager','Project lead',true,'Example Project Lead','Name of the assigned lead.'),
    column('contract','Contract reference',true,'EX-2026-001','Award or contract reference.'),
    column('start','Start date',true,'2026-02-01','YYYY-MM-DD.'),
    column('end','Completion date',true,'2026-05-31','YYYY-MM-DD. On or after the start date.',['End date']),
    currencyColumn,
    column('value','Contract value',true,'25000','Approved contract amount in the stated currency.'),
    column('budget','Approved budget',true,'18000','Approved cost budget in the stated currency.'),
    column('retention','Retention',false,'5','Enter a percentage from 0 to 100 without a percent sign.'),
    column('terms','Payment terms',false,'Net 30','Agreed payment terms.'),
  ]},
  contract:{label:'Maintenance contracts',columns:[
    column('name','Contract title',true,'Example preventative maintenance','Service contract name.'),
    existingClient,
    column('site','Site address',true,'Example site, Phnom Penh','Service location.',['Site','Location']),
    column('equipment','Covered equipment',true,'Split AC units','Equipment or systems covered.'),
    column('supervisor','Supervisor',true,'Example Supervisor','Maintenance supervisor name.'),
    column('technician','Technician',true,'Example Technician','Named technician.'),
    column('technicianEmail','Technician email',false,'technician@example.test','Verified sign-in email for an assigned technician.'),
    column('start','Start date',true,'2026-02-01','YYYY-MM-DD.'),
    column('end','End date',true,'2027-01-31','YYYY-MM-DD. On or after the start date.'),
    column('billing','Billing frequency',true,'Quarterly','Agreed billing frequency.'),
    column('frequency','Visit interval',false,'90','Required for scheduled and O&M contracts. Enter days from 1 to 365. Leave blank for troubleshooting.'),
    currencyColumn,
    column('value','Contract value',true,'4800','Contract amount in the stated currency.'),
    column('sla','Service levels',false,'Respond within four business hours.','Agreed response or service levels.'),
    column('safety','Safety instructions',false,'Arrange site access before attendance.','Site safety and access instructions.'),
    column('serviceType','Service model',false,'scheduled','Use scheduled, om, or troubleshooting. Defaults to scheduled.'),
    column('residentTechnicians','Resident technicians',false,'0','Whole number from 0 to 50. O&M requires at least one.'),
    column('coverage','Operating coverage',false,'Monday to Friday, 08:00-17:00','Required when resident technicians are assigned.'),
    column('staffingPlan','Staffing plan',false,'Primary technician and designated relief','Shift and relief plan. Required when resident technicians are assigned.'),
  ]},
  employee:{label:'Employee access',columns:[
    column('name','Employee name',true,'Example Staff Member','Official employee name.'),
    column('employeeId','Employee ID',false,'00045','Official identifier. Keep leading zeros.'),
    column('email','Email',false,'employee@example.test','Verified sign-in email. Leave blank for a directory-only record.',['Sign-in email']),
    column('roles','Roles',false,'estimator','Use permission keys separated by vertical bars. Imported accounts start with sign-in disabled.',['Role keys separated by |','Assigned roles']),
    column('position','Job title',false,'Site Technician','Official position title, independent of login permissions.',['Position']),
    column('department','Department',false,'Installation','Official department.'),
    column('team','Team',false,'Team 2','Official team.'),
    column('jobFunctions','Job functions',false,'Check completed installations.','Responsibilities and expected work.'),
  ]},
  opening:{label:'Opening stock',columns:[
    column('materialCode','Existing material code',true,'MAT-001','Use an existing material code.',['Material code']),
    column('warehouseCode','Existing warehouse code',true,'WH-MAIN','Use an existing warehouse code.',['Warehouse code']),
    column('quantity','Verified quantity',true,'14.5','Verified positive count in the material base unit.',['Quantity','Qty']),
    column('cost','Verified unit cost',true,'12.50','Nonnegative unit cost in the material currency.',['Unit cost']),
  ]},
};

export function masterImportTemplate(type,roleKeys=[]){
  const {label,columns}=masterImports[type];
  const guide=[
    ['TEAMS Operations - '+label],
    ['Where to enter data','', '', 'Start on row 2 of the Data worksheet. Keep row 1 as the header.'],
    ['File limits','', '', 'Prepare up to 100 data rows per import. Use plain numbers without currency symbols.'],
    ['Source values','', '', 'Data columns are formatted as text to retain dates, codes and identifiers. Paste values only.'],
    ...(type==='opening'?[['Cutoff date','','','Enter the verified stock cutoff in the import form. Use a material/warehouse pair with no stock ledger.']]:[]),
    ...(type==='employee'?[['Allowed role keys','','',roleKeys.join(' | ')]]:[]),
    [],
    ['Column','Required','Example','Rules'],
    ...columns.map(({key,label,required,example,rule})=>[label,required?'Yes':key==='frequency'||key==='contact'?'Conditional':'No',example,rule]),
  ];
  return createXlsx([columns.map(({label})=>label)],{guide});
}

const canonicalHeader = value => String(value??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu,'');

export function mapMasterHeaders(type,header){
  const labels=header.map(canonicalHeader),used=new Set(),mapping={};
  for(const {key,label,aliases} of masterImports[type].columns){
    const candidates=[label,key,...aliases].map(canonicalHeader);
    const index=candidates.map(candidate=>labels.findIndex((value,i)=>value===candidate&&!used.has(i))).find(i=>i>=0);
    if(index!==undefined){mapping[key]=index;used.add(index);}
  }
  return mapping;
}

export function guessMasterHeader(type,rows){
  let best=0,bestScore=0;
  const columns=masterImports[type].columns;
  for(const [index,row] of rows.slice(0,30).entries()){
    const mapping=mapMasterHeaders(type,row);
    const score=columns.reduce((total,column)=>total+(column.key in mapping?(column.required?3:1):0),0);
    if(score>bestScore){best=index;bestScore=score;}
  }
  return best;
}
