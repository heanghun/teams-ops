const decoder=new TextDecoder();
const doc=xml=>{
  const result=new DOMParser().parseFromString(xml,'application/xml');
  if(result.querySelector('parsererror'))throw Error('The workbook contains invalid XML.');
  return result;
};
const nodes=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
const attr=(node,name)=>node.getAttribute(name)??'';
const aliases={
  description:['description','item description','material description','description of works','work description','particulars','item name','material','name','item'],
  section:['section','work section','trade','discipline','category'],
  spec:['spec','specification','technical specification','size','model'],
  unit:['unit','units','uom','unit of measure','u o m'],
  quantity:['quantity','qty','quantities','q ty','q t y'],
  material:['material price','material cost','material unit cost','material rate','unit price','unit rate','rate','price'],
  laborHours:['labor hours','labour hours','hours per unit'],
  laborRate:['labor rate','labour rate','hourly rate'],
  other:['other cost','other direct unit cost'],
};
const normalized=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const matchHeader=s=>Object.entries(aliases).find(([,names])=>names.includes(normalized(s)))?.[0]??null;
function fromCSV(text){
  text=text.replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/)[0],sep=first.includes('\t')?'\t':!first.includes(',')&&first.includes(';')?';':',';
  const rows=[];
  let row=[],value='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){
      if(quoted&&text[i+1]==='"'){value+='"';i++;}
      else quoted=!quoted;
    }else if(c===sep&&!quoted){row.push(value.trim());value='';}
    else if(c==='\n'&&!quoted){row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value='';}
    else if(c!=='\r'||quoted)value+=c;
  }
  if(quoted)throw Error('A quoted CSV field is missing its closing quote.');
  if(value||row.length){row.push(value.trim());if(row.some(Boolean))rows.push(row);}
  return rows;
}
async function workbook(buffer) {
  const view=new DataView(buffer), bytes=new Uint8Array(buffer);
  let end=bytes.length-22;
  while(end>=Math.max(0,bytes.length-65557)&&view.getUint32(end,true)!==0x06054b50)end--;
  if(end<0||view.getUint32(end,true)!==0x06054b50)throw Error('The workbook could not be opened. Save it as .xlsx.');
  let index=view.getUint32(end+16,true);
  const zip=new Map(),entries=view.getUint16(end+10,true);
  let expanded=0;
  for(let i=0;i<entries;i++){
    if(index+46>bytes.length||view.getUint32(index,true)!==0x02014b50)throw Error('The workbook ZIP directory is invalid.');
    const method=view.getUint16(index+10,true),length=view.getUint32(index+20,true),raw=view.getUint32(index+24,true),
      nameSize=view.getUint16(index+28,true),extra=view.getUint16(index+30,true),comment=view.getUint16(index+32,true),offset=view.getUint32(index+42,true);
    const name=decoder.decode(bytes.slice(index+46,index+46+nameSize));
    index+=46+nameSize+extra+comment;
    if(!/^xl\/(sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml)$/.test(name))continue;
    expanded+=raw;
    if(expanded>18000000||offset+30>bytes.length)throw Error('This workbook expands beyond the 18 MB import limit.');
    const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true);
    if(start+length>bytes.length)throw Error('The workbook data is incomplete.');
    const content=bytes.slice(start,start+length);
    if(method===0)zip.set(name,decoder.decode(content));
    else if(method===8){
      const reader=new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      const chunks=[];let size=0;
      while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>raw||size>18000000){await reader.cancel();throw Error('Invalid workbook expansion size.');}chunks.push(part.value);}
      zip.set(name,await new Blob(chunks).text());
    }
  }
  if(!zip.has('xl/workbook.xml')||!zip.has('xl/_rels/workbook.xml.rels'))throw Error('Workbook structure could not be recognized.');
  const shared=zip.get('xl/sharedStrings.xml');
  const strings=shared?nodes(doc(shared),'si').map(si=>nodes(si,'t').map(x=>x.textContent).join('')):[];
  const rels=new Map(nodes(doc(zip.get('xl/_rels/workbook.xml.rels')),'Relationship').map(rel=>[attr(rel,'Id'),attr(rel,'Target').replace(/^\//,'').replace(/^(?!xl\/)/,'xl/')]));
  const sheets=nodes(doc(zip.get('xl/workbook.xml')),'sheet').map(sheet=>{
    const file=rels.get(attr(sheet,'r:id'));
    if(!zip.has(file))return null;
    const rows=nodes(doc(zip.get(file)),'row').slice(0,5000).map(row=>{
      const result=[];
      for(const cell of nodes(row,'c')){
        const address=attr(cell,'r').match(/^[A-Z]+/)?.[0];
        const column=address?[...address].reduce((p,c)=>p*26+c.charCodeAt(0)-64,0)-1:result.length;
        if(column>100)continue;
        const type=attr(cell,'t'),value=nodes(cell,'v')[0]?.textContent;
        result[column]=type==='s'?strings[Number(value)]??'':type==='inlineStr'?nodes(cell,'t').map(x=>x.textContent).join(''):type==='e'?'':value??'';
      }
      return Array.from(result,v=>v??'');
    });
    return {name:attr(sheet,'name'),rows};
  }).filter(Boolean);
  if(!sheets.length)throw Error('No readable worksheets were found.');
  return sheets;
}
export async function pdfText(buffer) {
  const pdf=await import('/vendor/pdf.min.mjs');
  pdf.GlobalWorkerOptions.workerSrc='/vendor/pdf.worker.min.mjs';
  const document=await pdf.getDocument({data:new Uint8Array(buffer),isEvalSupported:false,disableFontFace:true,enableXfa:false,stopAtErrors:true}).promise;
  const pages=[];
  try{
    for(let n=1;n<=Math.min(document.numPages,30);n++){
      const page=await document.getPage(n),text=await page.getTextContent(),positions=[];
      for(const item of text.items){
        if(!item.str?.trim())continue;
        const [, , , ,x,y]=item.transform;
        let line=positions.find(group=>Math.abs(group.y-y)<2.4);
        if(!line){line={y,parts:[]};positions.push(line);}
        line.parts.push({x,w:item.width,text:item.str.trim()});
      }
      const rows=positions.sort((a,b)=>b.y-a.y).map(group=>{
        const parts=group.parts.sort((a,b)=>a.x-b.x),result=[];
        let edge=-Infinity;
        for(const part of parts){
          if(part.x-edge<11&&result.length)result[result.length-1]+=' '+part.text;
          else result.push(part.text);
          edge=part.x+part.w;
        }
        return result;
      });
      pages.push({name:'Page '+n,rows});
    }
  }finally{await document.destroy();}
  if(!pages.some(p=>p.rows.length))throw Error('No searchable text was found. Use a verified Excel or CSV copy or enter the lines manually.');
  return pages;
}
export async function readBoq(file) {
  if(!file||file.size>10000000)throw Error('Select a supported file up to 10 MB.');
  const ext=file.name.toLowerCase().split('.').at(-1);
  if(ext==='xlsx')return workbook(await file.arrayBuffer());
  if(ext==='pdf')return pdfText(await file.arrayBuffer());
  if(ext==='csv'||ext==='tsv')return [{name:file.name,rows:fromCSV(await file.text())}];
  throw Error('Choose an Excel .xlsx, CSV, or searchable PDF file.');
}
export function propose(rows){
  let index=0,score=-1;
  rows.slice(0,30).forEach((row,i)=>{
    const fields=new Set(row.map(matchHeader));
    const found=(fields.has('description')?5:0)+(fields.has('quantity')?5:0)+(fields.has('unit')?3:0)+fields.size;
    if(found>score){score=found;index=i;}
  });
  const mapping={};
  (rows[index]??[]).forEach((v,i)=>{const key=matchHeader(v);if(key&&mapping[key]==null)mapping[key]=i;});
  return {index,mapping};
}
const cleanedNumber=v=>String(v??'').trim().replace(/[\s,$៛]/g,'');
export function mapBoq(sheet,index,mapping) {
  const warnings=[],items=[],seen=new Set();
  let section=sheet.name;
  for(const [i,row] of sheet.rows.slice(index+1).entries()){
    const get=key=>String(row[mapping[key]]??'').trim();
    const description=get('description'),quantity=cleanedNumber(get('quantity')),unit=get('unit');
    const any=row.some(x=>String(x).trim());
    if(!any||/^(sub\s*total|grand total|total|page \d+|brought forward|carried forward)\b/i.test(description))continue;
    if(description&&!quantity&&!unit&&row.filter(x=>String(x).trim()).length<=2){section=description;continue;}
    if(!description||!quantity||Number(quantity)<=0||!Number.isFinite(Number(quantity))||!unit){warnings.push('Row '+(index+i+2)+': missing description, positive quantity or unit.');continue;}
    const signature=[description.toLowerCase(),unit.toLowerCase(),quantity].join('|');
    if(seen.has(signature))warnings.push('Row '+(index+i+2)+': possible duplicate, retained for review.');
    seen.add(signature);
    const price=Number(cleanedNumber(get('material')));
    const material=Number.isFinite(price)&&price>=0?price:0;
    if(get('material')&&!Number.isFinite(price))warnings.push('Row '+(index+i+2)+': unrecognized price, set to zero for review.');
    items.push({section:get('section')||section,description,unit,quantity:Number(quantity),spec:get('spec'),material,
      laborHours:Number(cleanedNumber(get('laborHours')))||0,laborRate:Number(cleanedNumber(get('laborRate')))||0,
      other:Number(cleanedNumber(get('other')))||0,override:material?'Imported price from '+sheet.name:''});
    if(items.length>=350){warnings.push('The import stopped at 350 lines. Split larger BOQs before proceeding.');break;}
  }
  return {items,warnings};
}
export const fields=Object.keys(aliases);
