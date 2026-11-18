export const currencyScale = currency => currency === 'KHR' ? 1 : 100;
export const roundMoney = (value, currency = 'USD') => Math.round((value + Number.EPSILON) * currencyScale(currency)) / currencyScale(currency);
const cambodiaDate = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Phnom_Penh', year:'numeric', month:'2-digit', day:'2-digit' });
export const dateOffset = (days = 0, date = cambodiaDate.format(new Date())) => {
  const result = new Date(date + 'T00:00:00Z');
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
};

export function initialRecords(demo) {
  const created = [];
  const add = (kind, id, values) => {
    const record = { id, kind, date: dateOffset(), ...values };
    created.push(record);
    return record;
  };
  add('settings', 'settings', {
    name: 'TEAMS Engineering Co., Ltd.', currency: 'USD', tax: 0, minMargin: 15, cashLimit: 35000,
    purchaseLimit: 5000, priceDays: 90, agingDays: 180, renewalDays: 45, email: '', address: 'Phnom Penh, Cambodia', cashOpening: null, cashInputs: [],
  });
  if (!demo) return created;
  const clients = ['Mekong Commercial Properties', 'Borey Chan Dara', 'Sovann Health Network', 'Bassac Hospitality Group', 'Tonle Logistics Co.'];
  clients.forEach((name, i) => add('client', 'c' + i, { name, address: 'Phnom Penh, Cambodia', type: 'Corporate', contacts: [{ name: 'Site contact', phone: '', email: '' }] }));
  const projects = [
    ['MEP-026', 'Mekong Tower MEP Fit-out', 0, 'MEP Installation', 'Active', 186000, 142000, 68, 52000],
    ['MEP-031', 'Chan Dara Phase II', 1, 'Electrical & ELV', 'Active', 128500, 103500, 42, 62000],
    ['MEP-034', 'Sovann Clinic HVAC Upgrade', 2, 'HVAC & MVAC', 'Active', 96500, 79000, 85, 10200],
    ['MEP-038', 'Bassac Hotel Fire Systems', 3, 'Fire Protection', 'Awarded', 54800, 44700, 0, 42100],
  ];
  projects.forEach(([code,name,client,service,status,value,budget,progress,remaining], i) => add('project', 'p'+i, {
    code,name,clientId:'c'+client,parentId:'c'+client,service,status,value,budget,progress,remaining,retention:5,terms:'30 days after certification',
    currency:'USD', manager:['Site Engineering','MEP Projects','HVAC Projects','Fire Systems'][i],location:'Phnom Penh',start:dateOffset(-60),end:dateOffset(45 + i*10),
    history:[{status,date:dateOffset(-60)}],
  }));
  const suppliers = ['Mekong Industrial Supply','Angkor Electrical Trade','Bassac Mechanical Supply','Delta Pipe & Valve','Capital Controls'];
  suppliers.forEach((name, i) => add('supplier','s'+i,{name,email:'',terms:'30 days'}));
  add('warehouse','w0',{name:'Central Warehouse',code:'WH-01',location:'Phnom Penh'});
  add('warehouse','w1',{name:'Site Store',code:'WH-02',location:'Phnom Penh'});
  const lines = [
    ['HVAC','Copper Refrigerant Pipe','m',11.8,['1/4 in','3/8 in','1/2 in','5/8 in','3/4 in']],
    ['Electrical','XLPE Power Cable','m',5.6,['2.5 mm²','4 mm²','6 mm²','10 mm²','16 mm²']],
    ['Electrical','Miniature Circuit Breaker','ea',8.4,['1P 10A','1P 16A','1P 20A','2P 32A','3P 40A']],
    ['Plumbing','uPVC Pressure Pipe','m',3.2,['20 mm','25 mm','32 mm','50 mm','75 mm']],
    ['Fire Protection','Grooved Coupling','ea',16.5,['25 mm','40 mm','50 mm','80 mm','100 mm']],
    ['HVAC','Galvanized Duct Flange','ea',6.75,['100 mm','150 mm','200 mm','250 mm','300 mm']],
    ['Plumbing','Ball Valve','ea',12.5,['DN15','DN20','DN25','DN40','DN50']],
    ['ELV','Shielded Data Cable','m',0.85,['Cat5e','Cat6','Cat6A','LSZH','Outdoor']],
    ['Fire Protection','Sprinkler Head','ea',11.6,['Pendent 68C','Upright 68C','Concealed','Sidewall','Quick response']],
    ['Mechanical','Rubber Isolation Mount','ea',18,['25 kg','50 kg','75 kg','100 kg','150 kg']],
  ];
  lines.flatMap(([category,base,unit,price,variants]) => variants.map((spec,i) => ({category,name:base+' - '+spec,spec,unit,price:roundMoney(price*(1+i*0.24))}))).forEach((item,i) => {
    const id='m'+i, code='MAT-'+String(i+1).padStart(4,'0');
    add('material',id,{...item,code,barcode:code,supplierId:'s'+Math.floor(i/10),minimum:i<4?15:8,priceDate:dateOffset(i%13===0?-130:-18),currency:'USD',priceHistory:[{price:item.price,currency:'USD',date:dateOffset(i%13===0?-130:-18)}]});
    add('movement','opening-'+id,{materialId:id,parentId:id,warehouseId:'w0',type:'Opening',quantity:i<4?12:35+i,delta:i<4?12:35+i,cost:item.price,currency:'USD',date:dateOffset(i%7===0?-220:-24),reason:'Verified fictional opening stock'});
    if(i%5===0) add('movement','site-'+id,{materialId:id,parentId:id,warehouseId:'w1',type:'Opening',quantity:30,delta:30,cost:item.price,currency:'USD',date:dateOffset(-35),reason:'Verified fictional opening stock'});
  });
  projects.slice(0,3).forEach((_,i)=> {
    add('cost','labor'+i,{name:'Certified labor and subcontractor costs',projectId:'p'+i,type:'Labor',amount:[44350,29600,43100][i],currency:'USD',date:dateOffset(-12)});
    add('movement','issue'+i,{materialId:'m'+i,parentId:'m'+i,projectId:'p'+i,warehouseId:'w0',type:'Issue',quantity:5,delta:-5,cost:[11.8,14.63,17.46][i],currency:'USD',date:dateOffset(-3),reason:'Site installation',recipient:'Site engineering'});
  });
  const quoteData = [
    ['Mekong Tower - Additional AHU Works','Internal Review',0,580,15],
    ['Chan Dara - Phase II Electrical','Sent',1,920,18],
    ['Sovann Clinic - Chiller Replacement','Draft',2,650,20],
    ['Bassac Hotel - Fire Pump Controls','Accepted',3,480,16],
    ['Tonle Logistics - Loading Bay Lighting','Approved',4,300,17],
    ['Mekong Tower - Ductwork Extension','Draft',0,440,15],
  ];
  quoteData.forEach(([name,status,c,qty,margin],i)=>{
    const items=[{description:'MEP supply and installation',section:'Works',unit:'m',quantity:qty,materialId:'m'+(i*5),material:25,laborHours:0.6,laborRate:12,other:6}];
    add('quote','q'+i,{code:'Q-26-00'+(i+1),name,status,clientId:'c'+c,parentId:'c'+c,projectId:i<4?'p'+i:undefined,
      currency:'USD',items,margin,indirect:1200,risk:600,discount:0,tax:0,validUntil:dateOffset(14+i),terms:'30 days after certification',warranty:'12 months',createdBy:'demo-estimator',revision:1,date:dateOffset(-i)});
  });
  [
    ['Riverside Medical Centre Expansion',2,'Under Evaluation',dateOffset(3),148000,109000,46000],
    ['Sen Sok Commercial Centre - MEP',0,'Estimating',dateOffset(7),256000,194000,75000],
    ['Tonle Cold Storage - Electrical Works',4,'Received',dateOffset(12),78000,61000,21000],
  ].forEach(([name,c,status,due,value,cost,upfront],i)=>add('tender','t'+i,{
    code:'T-26-00'+(i+1),name,clientId:'c'+c,parentId:'c'+c,status,due,value,cost,upfront,duration:6,advance:10,delay:1,
    guarantee:10,collateral:20,fee:250,retention:5,currency:'USD',createdBy:'demo-estimator',terms:'',
  }));
  [0,1,2].forEach(i=> {
    add('request','pr'+i,{code:'PR-26-00'+(i+1),name:['Copper pipe replenishment','Site cable replacement','Fire protection fittings'][i],projectId:'p'+i,materialId:'m'+i,parentId:'m'+i,quantity:40,approvedQty:i===2?0:30,price:14,currency:'USD',status:i===2?'Requested':'Ordered',needed:dateOffset(i+1),createdBy:'demo-procurement'});
    if(i<2) add('po','po'+i,{code:'PO-26-00'+(i+1),name:['Copper pipe replenishment','Site cable replacement'][i],projectId:'p'+i,parentId:'pr'+i,requestId:'pr'+i,materialId:'m'+i,supplierId:'s'+i,quantity:30,received:i===0?12:0,price:14,currency:'USD',due:dateOffset(i===0?-1:4),status:i===0?'Partially Received':'Ordered',terms:'30 days'});
  });
  add('movement','seedreceipt',{type:'Receipt',materialId:'m0',parentId:'po0',poId:'po0',projectId:'p0',warehouseId:'w1',quantity:12,delta:12,cost:14,currency:'USD',reason:'DO-DEMO-001',date:dateOffset(-4)});
  const contracts = [
    ['Bassac Hotel - Preventive MEP',3,28800,27,'AHUs, pumps and distribution boards'],
    ['Sovann Clinic - HVAC Service',2,19200,80,'Split AC units and fresh-air fans'],
    ['Tonle Logistics - Electrical PM',4,15600,105,'Main panels and UPS systems'],
  ];
  contracts.forEach(([name,client,value,remaining,equipment],i)=>{
    const id='mc'+i;
    add('contract',id,{name,code:'MC-26-00'+(i+1),clientId:'c'+client,parentId:'c'+client,value,currency:'USD',start:dateOffset(-175),end:dateOffset(remaining),frequency:30,billing:'Monthly',site:'Phnom Penh',equipment,supervisor:'Service supervisor',technician:'Field technician',status:'Active'});
    add('job','job'+i,{name,code:'JOB-26-00'+(i+1),parentId:id,contractId:id,scheduled:dateOffset(i+1),technician:'Field technician',status:i===0?'In Progress':'Scheduled',checklist:['Inspect equipment condition','Clean and test equipment','Record readings and findings'],completed:[],minutes:0});
  });
  const bills=[[0,34000,12000,-12],[1,22750,7500,-4],[2,46500,11500,13]];
  bills.forEach(([p,amount,received,due],i)=>{
    add('claim','cl'+i,{code:'CL-26-00'+(i+1),name:'Progress claim '+(i+1),projectId:'p'+p,amount,certified:amount,retention:5,currency:'USD',status:'Certified',submitted:dateOffset(-29)});
    add('invoice','inv'+i,{code:'INV-26-00'+(i+1),name:'Progress billing '+(i+1),projectId:'p'+p,parentId:'cl'+i,claimId:'cl'+i,amount:roundMoney(amount*.95),currency:'USD',due:dateOffset(due),status:'Issued'});
    add('payment','pay'+i,{code:'PAY-26-00'+(i+1),projectId:'p'+p,parentId:'inv'+i,invoiceId:'inv'+i,amount:received,currency:'USD',reference:'Fictional collection '+(i+1),date:dateOffset(-8-i)});
  });
  add('claim','cl3',{code:'CL-26-004',name:'Installation milestone 2',projectId:'p0',amount:18500,retention:5,currency:'USD',status:'Submitted',submitted:dateOffset(-3)});
  return created;
}
