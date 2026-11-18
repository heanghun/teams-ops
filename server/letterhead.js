import { letterheadLogo, letterheadLogoSize } from './letterhead-brand.js';

const lhEscape=value=>String(value??'').normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').replace(/[()\\]/g,'\\$&');
const lhWrap=(value,max)=>{
  const out=[];
  for(const paragraph of String(value??'').split('\n')){
    let line='';
    for(const token of paragraph.split(/\s+/)){
      const chunks=token.match(new RegExp('.{1,'+max+'}','g'))||[''];
      for(const word of chunks){if(line.length+word.length+1>max){out.push(line);line='';}line+=(line?' ':'')+word;}
    }
    out.push(line);
  }
  return out;
};
export function createLetterheadPdf(doc){
  const pages=[],pageWidth=595,left=42,right=553;
  const money=v=>Number(v).toLocaleString('en-US',{minimumFractionDigits:doc.currency==='KHR'?0:2,maximumFractionDigits:doc.currency==='KHR'?0:2});
  let commands='',y=0;
  const text=(value,x,at,size=10,bold=false)=>{commands+='0.12 0.16 0.20 rg BT /'+(bold?'F2':'F1')+' '+size+' Tf 1 0 0 1 '+x+' '+at+' Tm ('+lhEscape(value)+') Tj ET\n';};
  const line=(at)=>{commands+='0.84 0.86 0.88 RG '+left+' '+at+' m '+right+' '+at+' l S\n';};
  const finish=()=>{if(commands)pages.push(commands);commands='';};
  const start=()=>{
    finish();
    const h=144*letterheadLogoSize[1]/letterheadLogoSize[0];
    commands+='q 144 0 0 '+h+' '+left+' '+(800-h)+' cm /Logo Do Q\n';
    text(doc.company,236,787,12,true);
    lhWrap([doc.address,doc.email].filter(Boolean).join(' | '),54).slice(0,2).forEach((v,i)=>text(v,236,771-12*i,9));
    commands+='1 0.77 0.15 rg '+left+' 736 511 4 re f\n';
    text(doc.title.toUpperCase(),left,710,19,true);
    text(doc.reference+' / R'+doc.revision+' / '+doc.date,left,692,10);
    if(doc.demo)text('DEMONSTRATION COPY',left,676,9,true);
    y=doc.demo?650:665;
  };
  const ensure=height=>{if(y-height<84)start();};
  const paragraph=(label,value)=>{
    const lines=lhWrap(value||'Not recorded',94);ensure(46);
    text(label,left,y,10,true);y-=17;
    for(const row of lines){ensure(15);text(row,left,y,9);y-=13;}
    y-=12;
  };
  const tableHead=()=>{
    ensure(40);commands+='0.96 0.96 0.94 rg '+left+' '+(y-9)+' 511 26 re f\n';
    [['No.',47],['Description / specification',79],['Unit',322],['Qty',356],['Unit rate',412],['Amount',488]].forEach(([v,x])=>text(v,x,y,9,true));y-=29;
  };
  start();paragraph('To',doc.client+(doc.clientAddress?'\n'+doc.clientAddress:''));paragraph('Subject',doc.subject);
  if(doc.items){
    text('BILL OF QUANTITIES - '+doc.currency,left,y,11,true);y-=27;tableHead();
    doc.items.forEach((item,index)=>{
      const content=[item.section,item.description,item.spec].filter(Boolean).join(' / '),lines=lhWrap(content,43);
      // A row may continue on the next page; repeat its identity and table heading.
      let at=0;
      do{
        if(y<120){start();tableHead();}
        const count=Math.min(lines.length-at,Math.max(1,Math.floor((y-100)/13)));
        text(String(index+1)+(at?' cont.':''),47,y,8);
        lines.slice(at,at+count).forEach((v,i)=>text(v,79,y-i*13,9));
        if(at===0){text(item.unit.slice(0,8),322,y,8);text(String(item.quantity),356,y,8);text(item.rate.toFixed(doc.currency==='KHR'?0:4),412,y,8);text(money(item.amount),488,y,8);}
        y-=Math.max(24,count*13+10);line(y+10);at+=count;
      }while(at<lines.length);
    });
    ensure(135);y-=15;
    for(const [label,value] of [['Before discount',doc.totals.beforeDiscount],['Discount',doc.discount],['Subtotal',doc.totals.selling],['Tax ('+doc.taxRate+'%)',doc.totals.tax],['TOTAL '+doc.currency,doc.totals.total]]){
      text(label,330,y,10,true);text(money(value),478,y,10,true);y-=20;
    }
    y-=5;paragraph('Pricing note','Quoted line amounts govern; unit rates are displayed to four decimal places. The selling rates include the quoted allowances.');
  }
  for(const [label,value] of doc.paragraphs||[])paragraph(label,value);
  ensure(135);line(y);y-=23;
  text('For and on behalf of TEAMS',left,y,10,true);text('Customer acceptance',320,y,10,true);y-=57;
  text('Signature / company stamp: __________________',left,y,9);text('Signature / company stamp: __________________',320,y,9);y-=20;
  text('Name / position: __________________________',left,y,9);text('Name / position: __________________________',320,y,9);y-=20;
  text('Date: ___________________________________',left,y,9);text('Date: ___________________________________',320,y,9);
  finish();
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
    '<< /Type /XObject /Subtype /Image /Width '+letterheadLogoSize[0]+' /Height '+letterheadLogoSize[1]+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length '+(letterheadLogo.length+1)+' >>\nstream\n'+letterheadLogo+'>\nendstream'];
  const kids=[];
  pages.forEach((stream,index)=>{
    stream+='0.40 0.43 0.46 rg BT /F1 8 Tf 1 0 0 1 42 46 Tm ('+lhEscape(doc.reference+' / R'+doc.revision+' | '+(doc.demo?'Demo copy':'Client copy'))+') Tj ET\n';
    stream+='BT /F1 8 Tf 1 0 0 1 475 46 Tm (Page '+(index+1)+' of '+pages.length+') Tj ET\n';
    const pageId=objects.length+1,streamId=pageId+1;kids.push(pageId+' 0 R');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+pageWidth+' 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents '+streamId+' 0 R >>',
      '<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');
  });
  objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';
  let body='%PDF-1.4\n';const offsets=['0000000000 65535 f '];
  objects.forEach((value,i)=>{offsets.push(String(body.length).padStart(10,'0')+' 00000 n ');body+=(i+1)+' 0 obj\n'+value+'\nendobj\n';});
  const index=body.length;
  body+='xref\n0 '+offsets.length+'\n'+offsets.join('\n')+'\ntrailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+index+'\n%%EOF\n';
  return new TextEncoder().encode(body);
}
