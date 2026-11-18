import { clientWorkbookTemplate, clientWorkbookStyles } from './xlsx-template.js';
import { invoiceBalance, quotationTotals, reportData, serviceTypes, agreementSections } from './domain.js';

const encode = text => new TextEncoder().encode(text);
const amountString = (amount,currency) => currency+' '+new Intl.NumberFormat('en-US',{minimumFractionDigits:currency==='KHR'?0:2,maximumFractionDigits:currency==='KHR'?0:2}).format(amount);
const escapePdf = text => String(text).normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').replace(/[()\\]/g,'\\$&');
function wrapPdf(line, width=92) {
  const words=String(line).split(/\s+/), result=[];
  let current='';
  for (const word of words) {
    if(current&&current.length+word.length>width){result.push(current);current='';}
    if(word.length>width){if(current)result.push(current);for(let i=0;i<word.length;i+=width)result.push(word.slice(i,i+width));current='';}
    else current+=(current?' ':'')+word;
  }
  result.push(current);
  return result;
}
export function createPdf(company,title,subtitle,lines,demo) {
  const flow=lines.flatMap(x=>wrapPdf(x));
  const pages=[];
  do { pages.push(flow.splice(0,44)); } while(flow.length);
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'];
  const kids=[];
  for(const [idx,page] of pages.entries()){
    const pageId=objects.length+1,streamId=pageId+1;
    kids.push(pageId+' 0 R');
    const textAt=(font,size,x,y,value)=>'BT /'+font+' '+size+' Tf 1 0 0 1 '+x+' '+y+' Tm ('+escapePdf(value)+') Tj ET\n';
    let stream='0.12 0.19 0.27 rg\n'+textAt('F2',12,48,787,company)+textAt('F2',23,48,751,title)+textAt('F1',10,48,730,subtitle);
    if(demo)stream+=textAt('F2',9,48,712,'FICTIONAL DEMONSTRATION RECORD');
    stream+='0.74 0.78 0.82 RG 48 698 m 547 698 l S\n';
    page.forEach((line,i)=>{stream+=textAt('F1',9,48,677-i*14,line);});
    stream+=textAt('F1',8,48,38,'TEAMS Operations  |  Page '+(idx+1)+' of '+pages.length);
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+streamId+' 0 R >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
  }
  objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let body='%PDF-1.4\n';
  const offsets=['0000000000 65535 f '];
  objects.forEach((obj,i)=>{offsets.push(String(body.length).padStart(10,'0')+' 00000 n ');body+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
  const index=body.length;
  body+='xref\n0 '+offsets.length+'\n'+offsets.join('\n')+'\ntrailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+index+'\n%%EOF\n';
  return encode(body);
}

const xml = v => String(v??'').replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function crc32(data) {
  let crc=-1;
  for(const byte of data){
    crc^=byte;
    for(let bit=0;bit<8;bit++)crc=(crc>>>1)^(crc&1?0xedb88320:0);
  }
  return (crc^-1)>>>0;
}
function zipStored(files) {
  const local=[],central=[];
  let offset=0,size=0;
  const header=(signature,length)=>{const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);view.setUint32(0,signature,true);return [bytes,view];};
  for(const [name,content] of Object.entries(files)){
    const n=encode(name),bytes=content instanceof Uint8Array?content:encode(content),crc=crc32(bytes);
    const [lh,l]=header(0x04034b50,30),[ch,c]=header(0x02014b50,46);
    l.setUint16(4,20,true);l.setUint32(14,crc,true);l.setUint32(18,bytes.length,true);l.setUint32(22,bytes.length,true);l.setUint16(26,n.length,true);
    c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,n.length,true);c.setUint32(42,offset,true);
    local.push(lh,n,bytes);central.push(ch,n);offset+=lh.length+n.length+bytes.length;size+=ch.length+n.length;
  }
  const [end,e]=header(0x06054b50,22);
  e.setUint16(8,central.length/2,true);e.setUint16(10,central.length/2,true);e.setUint32(12,size,true);e.setUint32(16,offset,true);
  const output=new Uint8Array(offset+size+22);
  let at=0;for(const chunk of [...local,...central,end]){output.set(chunk,at);at+=chunk.length;}
  return output;
}
export function createXlsx(rows) {
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationship='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const packageRel='http://schemas.openxmlformats.org/package/2006/relationships';
  const rowData=rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((v,col)=>{
    const ref=String.fromCharCode(65+col)+(i+1);
    return typeof v==='number'?'<c r="'+ref+'"><v>'+v+'</v></c>':'<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';
  }).join('')+'</row>').join('');
  return zipStored({
    '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<Relationships xmlns="'+packageRel+'"><Relationship Id="rId1" Type="'+relationship+'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="'+relationship+'"><sheets><sheet name="TEAMS Operations" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<Relationships xmlns="'+packageRel+'"><Relationship Id="rId1" Type="'+relationship+'/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':'<worksheet xmlns="'+ns+'"><sheetData>'+rowData+'</sheetData></worksheet>',
  });
}
export function documentContent(rows, kind, id, demo, internal) {
  const setting=rows.find(x=>x.kind==='settings'), get=key=>rows.find(x=>x.id===key);
  const record=get(id), print=(title,subtitle,lines,sheet=null)=>({title,subtitle,lines,sheet,company:setting.name,demo});
  if(kind==='agreement'&&record?.kind==='agreement'){
    const a=record,c=a.contractSnapshot;
    return {...print('Service agreement',a.code+' | Revision '+a.revision+' | '+a.status,[]),letterhead:true,reference:a.code,revision:a.revision,date:a.date,
      address:setting.address,email:setting.email,subject:a.name,client:get(a.clientId)?.name,
      paragraphs:[['Service model',serviceTypes[c.serviceType||'scheduled']],['Contractor',a.contractorParty],['Client',a.clientParty],
        ['Service period',c.start+' to '+c.end],['Site',c.site],['Contract value',c.value===0&&c.billing?.includes('fees not agreed')?'Not agreed - demonstration only':amountString(c.value,c.currency)+' | Billing: '+c.billing],
        ['Coverage',c.coverage||'As agreed in the service schedule'],['Resident technicians',String(c.residentTechnicians||0)],
        ...Object.entries(agreementSections).map(([key,label])=>[label,a[key]]),
        ['Authorized signatories','TEAMS: '+a.contractorSignatory+' | Client: '+a.clientSignatory],['Authority reference',a.authorityReference]],
      lines:Object.entries(agreementSections).flatMap(([key,label])=>[label,a[key]||'Not recorded',''])};
  }
  if(kind==='report'){
    const r=reportData(rows);
    return print('Weekly operations summary',r.today+'  |  Reporting currency '+r.currency,[
      'Reporting period: last seven days','',
      'Active projects: '+r.activeProjects+'  |  Open tenders: '+r.openTenders,
      'New quotations: '+r.summary.quotes+'  |  New tenders: '+r.summary.tenders+'  |  Project awards: '+r.summary.awards,
      'Operational billing recorded: '+amountString(r.summary.billed,r.currency),
      'Cash collections recorded: '+amountString(r.summary.collected,r.currency),
      'Outstanding invoices: '+amountString(r.outstanding,r.currency)+'  |  Overdue: '+amountString(r.overdue,r.currency),
      'Maintenance visits completed: '+r.summary.jobs,'','Operational exceptions','',
      ...r.alerts.map(x=>x.priority+'  |  '+x.category+'  |  '+x.title+'  |  '+x.detail),
    ]);
  }
  if(kind==='inventory'){
    const sheet=[['Code','Description','Unit','Warehouse','Movement','Quantity','Date','Reference']];
    rows.filter(x=>x.kind==='movement').forEach(m=>{const mat=get(m.materialId);sheet.push([mat?.code,mat?.name,mat?.unit,get(m.warehouseId)?.name,m.type,m.quantity,m.date,m.reason]);});
    return print('Inventory movements',setting.address,[],sheet);
  }
  if(kind==='quote' && record?.kind===kind){
    const q=record,t=quotationTotals(q),fmt=v=>amountString(v,q.currency);
    const title=internal?'Internal cost estimate':'Quotation';
    const sheet=[['Document',q.code],['Revision',q.revision],['Client',get(q.clientId)?.name],['Currency',q.currency],
      demo?['Fictional demonstration']:[],['Section','Description','Specification','Unit','Quantity',...(internal?['Material cost per unit','Labor hours per unit','Labor rate','Other cost per unit']:[])]];
    const clientItems=quoteClientItems(q);
    q.items.forEach((i,index)=>sheet.push([i.section,i.description,i.spec,i.unit,i.quantity,...(internal?[i.material,i.laborHours,i.laborRate,i.other]:[clientItems[index].rate,clientItems[index].amount])]));
    if(!internal)sheet[5]=['Section','Description','Specification','Unit','Quantity','Selling unit rate','Amount'];
    sheet.push([],['Before discount',t.beforeDiscount],['Discount',q.discount],['Subtotal',t.selling],['Tax',t.tax],['Total',t.total],['Payment terms',q.terms]);
    if(internal)sheet.push(['Estimated cost',t.cost],['Gross profit',t.profit],['Gross margin (%)',t.margin],['Markup (%)',t.markup]);
    const doc=print(title,q.code+'  |  Revision '+q.revision+'  |  '+q.status,[
      q.name,'Client: '+get(q.clientId)?.name,'Valid until: '+q.validUntil,'Currency: '+q.currency,'',
      ...q.items.flatMap((i,index)=>[(index+1)+'. '+i.description+'  |  '+i.quantity+' '+i.unit+(i.section?'  |  '+i.section:''),...(i.spec?[i.spec]:[]),
        ...(internal?['   Material / unit: '+fmt(i.material)+'   Labor: '+i.laborHours+' h x '+fmt(i.laborRate)+'   Other / unit: '+fmt(i.other)]:['   Selling unit rate: '+clientItems[index].rate+' | Amount: '+fmt(clientItems[index].amount)])]),
      '', 'Discount: '+fmt(q.discount),'Subtotal: '+fmt(t.selling),'Tax: '+fmt(t.tax),'Total: '+fmt(t.total),
      ...(internal?['Estimated cost: '+fmt(t.cost),'Gross profit: '+fmt(t.profit),'Gross margin: '+t.margin.toFixed(2)+'%  |  Markup: '+t.markup.toFixed(2)+'%']:[]),
      '', 'Payment terms: '+q.terms,'Warranty: '+q.warranty,'Exclusions: '+(q.exclusions||'None recorded'),
    ],sheet);
    return internal?doc:{...doc,letterhead:true,reference:q.code,revision:q.revision,date:q.date,address:setting.address,email:setting.email,
      subject:q.name,client:get(q.clientId)?.name,clientAddress:get(q.clientId)?.address,items:clientItems,currency:q.currency,totals:t,discount:q.discount,taxRate:q.tax,
      paragraphs:[['Validity',q.validUntil],['Payment terms',q.terms],['Warranty',q.warranty],['Exclusions',q.exclusions||'Only the items and quantities listed in this quotation are included.']]};
  }
  if(kind==='po'&&record?.kind===kind){
    const p=record,m=get(p.materialId),s=get(p.supplierId);
    return print('Purchase order',p.code+'  |  '+p.status,[
      'Supplier: '+s.name,'Project: '+get(p.projectId)?.name,'Delivery to: '+(p.location||setting.address),'Delivery date: '+p.due,'',
      m.code+'  |  '+m.name,'Quantity: '+p.quantity+' '+m.unit,'Unit price: '+amountString(p.price,p.currency),'Total: '+amountString(p.price*p.quantity,p.currency),'','Payment terms: '+p.terms,
    ]);
  }
  if(kind==='claim'&&record?.kind===kind){
    const c=record,p=get(c.projectId),fmt=v=>amountString(v,c.currency);
    const held=c.certified==null?null:c.certified*c.retention/100;
    return print('Progress claim',c.code+'  |  '+c.status,[
      p.name,'Client: '+get(p.clientId)?.name,c.name,'Evidence: '+(c.evidence||'See project record'),'','Claimed: '+fmt(c.amount),'Certified: '+(c.certified==null?'Pending':fmt(c.certified)),
      'Retention: '+c.retention+'%'+(held==null?'':' ('+fmt(held)+')'),'Reference: '+(c.reason||'Pending'),
    ]);
  }
  if(kind==='job'&&record?.kind===kind&&record.status==='Completed'){
    const j=record,c=get(j.contractId),materials=rows.filter(x=>x.kind==='movement'&&x.jobId===j.id&&x.type==='Issue');
    return print('Maintenance service report',j.code+'  |  '+j.finished,[
      'Client: '+get(c.clientId)?.name,'Site: '+c.site,'Equipment: '+c.equipment,'Technician: '+j.technician,'Time: '+j.minutes+' minutes','',
      'Completed checks',...j.completed.map(s=>'- '+s),'','Findings: '+j.findings,'Customer acknowledgment: '+j.ack,'Customer remarks: '+(j.remarks||'None recorded'),'',
      'Materials issued',...materials.map(x=>get(x.materialId)?.name+'  |  '+x.quantity+' '+get(x.materialId)?.unit),
    ]);
  }
  return null;
}

// Allocate the approved selling total across lines; never expose internal cost or margin.
export function quoteClientItems(quote){
  const scale=quote.currency==='KHR'?1:100,t=quotationTotals(quote),units=Math.round(t.beforeDiscount*scale);
  const weights=quote.items.map(i=>Math.max(0,i.quantity*(i.material+i.laborHours*i.laborRate+i.other)));
  const sum=weights.reduce((a,b)=>a+b,0),fallback=quote.items.reduce((a,b)=>a+b.quantity,0);
  let cumulative=0,used=0;
  return quote.items.map((item,index)=>{
    cumulative+=sum?weights[index]/sum:item.quantity/fallback;
    const next=index===quote.items.length-1?units:Math.round(units*cumulative),amount=(next-used)/scale;used=next;
    return {description:item.description,spec:item.spec||'',section:item.section||'',unit:item.unit,quantity:item.quantity,rate:Math.round(amount/item.quantity*10000)/10000,amount};
  });
}

export function createClientXlsx(doc){
  const files=Object.fromEntries(Object.entries(clientWorkbookTemplate).map(([key,value])=>[key,typeof value==='object'?Uint8Array.from(atob(value.base64),x=>x.charCodeAt(0)):value.replace(/<(\/?)x:/g,'<$1').replace(/xmlns:x=/g,'xmlns=')]));
  const styles={...clientWorkbookStyles},cells=new Map(),heights=new Map(),merges=[];
  const styleXml=files['xl/styles.xml'],group=styleXml.match(/<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/),xfs=group[2].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g);
  const numberStyle=(key,format)=>{let xf=xfs[Number(styles[key])].replace(/numFmtId="\d+"/,'numFmtId="'+format+'"').replace(/applyNumberFormat="[^"]*"/g,'');xf=xf.replace('<xf ','<xf applyNumberFormat="1" ');styles[key]=String(xfs.length);xfs.push(xf);};
  numberStyle('E14',0);styles._issueDate=styles.A6;numberStyle('_issueDate',14);
  if(doc.currency==='KHR')for(const key of ['F14','G14','G19','G23'])numberStyle(key,3);
  files['xl/styles.xml']=styleXml.replace(group[0],'<cellXfs count="'+xfs.length+'">'+xfs.join('')+'</cellXfs>');
  const cell=(ref,value,style='A9',formula)=>{const row=Number(ref.match(/\d+/)[0]);if(!cells.has(row))cells.set(row,[]);const sid=styles[style]||'2';cells.get(row).push('<c r="'+ref+'" s="'+sid+'"'+(typeof value==='number'?'':' t="inlineStr"')+'>'+(formula?'<f>'+xml(formula)+'</f>':'')+(typeof value==='number'?'<v>'+value+'</v>':'<is><t xml:space="preserve">'+xml(value)+'</t></is>')+'</c>');};
  const merge=range=>merges.push('<mergeCell ref="'+range+'"/>');
  const wide=(row,text,style='A9',height=24)=>{merge('A'+row+':G'+row);cell('A'+row,text,style);heights.set(row,height);};
  for(const range of ['C1:G1','C2:G2','C3:G3','A5:G5','A6:D6','E6:G6'])merge(range);
  cell('C1',doc.company,'C1');cell('C2',doc.address||'','C2');cell('C3',doc.email||'','C2');
  for(let col=0;col<7;col++)cell(String.fromCharCode(65+col)+'4','',String.fromCharCode(65+col)+'4');
  cell('A5','QUOTATION','A5');heights.set(5,32);cell('A6',doc.reference+' / Revision '+doc.revision,'A6');cell('E6',Math.round(Date.parse(doc.date+'T00:00:00Z')/86400000)+25569,'_issueDate');
  wide(7,doc.subject,'A7',36);wide(9,'To: '+doc.client,'A7');wide(10,doc.clientAddress||'');
  const valid=doc.paragraphs.find(x=>x[0]==='Validity')?.[1]||'';wide(11,'Currency: '+doc.currency+'   Valid through: '+valid+(doc.demo?'   Demonstration copy':''),'A6');
  ['No.','Section','Description / specification','Unit','Quantity','Unit rate','Amount'].forEach((v,i)=>cell(String.fromCharCode(65+i)+'13',v,'A13'));heights.set(13,30);
  doc.items.forEach((item,i)=>{const r=14+i,description=[item.description,item.spec].filter(Boolean).join(' / ');[i+1,item.section,description,item.unit,item.quantity,item.rate,item.amount].forEach((v,col)=>cell(String.fromCharCode(65+col)+r,v,['D14','B14','C14','D14','E14','F14','G14'][col]));heights.set(r,Math.max(30,Math.ceil(description.length/48)*17));});
  const end=13+doc.items.length,start=end+2,t=doc.totals;
  const summary=[['Before discount',t.beforeDiscount,'SUM(G14:G'+end+')'],['Discount',doc.discount,null],['Subtotal',t.selling,'G'+start+'-G'+(start+1)],['Tax ('+doc.taxRate+'%)',t.tax,'ROUND(G'+(start+2)+'*'+doc.taxRate+'/100,'+(doc.currency==='KHR'?0:2)+')'],['TOTAL '+doc.currency,t.total,'SUM(G'+(start+2)+':G'+(start+3)+')']];
  summary.forEach(([label,value,formula],i)=>{const r=start+i;cell('F'+r,label,i===4?'F23':'F19');cell('G'+r,value,i===4?'G23':'G19',formula);heights.set(r,i===4?30:24);});
  let r=start+7;for(const [label,value] of doc.paragraphs.filter(x=>x[0]!=='Validity')){const text=label+': '+(value||'');wide(r,text,'A27',Math.max(30,Math.ceil(text.length/125)*17));r+=2;}
  wide(r,'Quoted line amounts govern. Unit rates are rounded for display.','A31');r+=3;
  merge('A'+r+':C'+r);merge('E'+r+':G'+r);cell('A'+r,'For TEAMS','A33');cell('E'+r,'Customer acceptance','A33');r+=3;
  merge('A'+r+':C'+r);merge('E'+r+':G'+r);cell('A'+r,'Authorized representative','A36');cell('E'+r,'Name / signature / date','A36');
  let out=files['xl/worksheets/sheet1.xml'].replace(/<sheetData[\s\S]*?<\/sheetData>/,'<sheetData>'+[...cells.entries()].sort((a,b)=>a[0]-b[0]).map(([n,v])=>'<row r="'+n+'" ht="'+(heights.get(n)||22)+'" customHeight="1">'+v.join('')+'</row>').join('')+'</sheetData>').replace(/<mergeCells[\s\S]*?<\/mergeCells>/,'<mergeCells count="'+merges.length+'">'+merges.join('')+'</mergeCells>').replace(/<dimension[^>]*\/>/,'<dimension ref="A1:G'+r+'"/>');
  out=out.replace(/<pageMargins[^>]*\/>/,'').replace(/<pageSetup[^>]*\/>/,'').replace(/<headerFooter[\s\S]*?<\/headerFooter>/,'');
  if(!out.includes('<sheetPr'))out=out.replace(/(<worksheet[^>]*>)/,'$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
  out=out.replace(/<drawing /,'<pageMargins left="0.3" right="0.3" top="0.4" bottom="0.4" header="0.15" footer="0.15"/><pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>&amp;L'+xml(doc.reference)+' / R'+doc.revision+'&amp;RPage &amp;P of &amp;N</oddFooter></headerFooter><drawing ');
  files['xl/worksheets/sheet1.xml']=out;files['xl/workbook.xml']=files['xl/workbook.xml'].replace(/<definedNames[\s\S]*?<\/definedNames>/,'').replace(/<calcPr[^>]*\/>/,'').replace('</workbook>','<definedNames><definedName name="_xlnm.Print_Area" localSheetId="0">Quotation!$A$1:$G$'+r+'</definedName><definedName name="_xlnm.Print_Titles" localSheetId="0">Quotation!$1:$13</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>');
  return zipStored(files);
}
