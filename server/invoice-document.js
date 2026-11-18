import { roundMoney } from './seed.js';
import invoiceFontkit from './invoice-fontkit.js';
import { invoiceRegular, invoiceBold, invoiceLatinRegular, invoiceLatinBold } from './invoice-fonts.js';
import { letterheadLogo, letterheadLogoSize } from './letterhead-brand.js';

let invFonts;
const invHex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
const invActual=value=>'feff'+Array.from(String(value)).map(c=>{const n=c.codePointAt(0);return n<=65535?n.toString(16).padStart(4,'0'):(0xd800+((n-65536)>>10)).toString(16)+(0xdc00+((n-65536)&1023)).toString(16);}).join('');
export function createInvoicePdf(record){
  const d=record.snapshot,c=d.company;
  if(!invFonts)invFonts=[invoiceRegular,invoiceBold,invoiceLatinRegular,invoiceLatinBold].map(base64=>{const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));return {bytes,font:invoiceFontkit.create(bytes)};});
  const fmt=n=>Number(n).toLocaleString('en-US',{minimumFractionDigits:d.currency==='KHR'?0:2,maximumFractionDigits:d.currency==='KHR'?0:2});
  let content='',y=0;const pages=[];
  const runs=(value,bold)=>String(value).split(/([\u1780-\u17ff\u19e0-\u19ff]+)/).filter(Boolean).map(segment=>{const index=(/[\u1780-\u17ff\u19e0-\u19ff]/.test(segment)?0:2)+(bold?1:0);const font=invFonts[index].font;return {index,font,run:font.layout(segment)};});
  const width=(value,size=9,bold=false)=>runs(value,bold).reduce((sum,{font,run})=>sum+run.positions.reduce((s,p)=>s+p.xAdvance,0)*size/font.unitsPerEm,0);
  const text=(value,x,at,size=9,bold=false)=>{
    if(!value)return;let cursor=x;
    content+='/Span << /ActualText <'+invActual(value)+'> >> BDC\n0.13 0.17 0.20 rg\n';
    for(const {index,font,run} of runs(value,bold)){const scale=size/font.unitsPerEm;
      run.glyphs.forEach((g,i)=>{const p=run.positions[i];content+='BT /F'+index+' '+size+' Tf 1 0 0 1 '+(cursor+p.xOffset*scale).toFixed(3)+' '+(at+p.yOffset*scale).toFixed(3)+' Tm <'+g.id.toString(16).padStart(4,'0')+'> Tj ET\n';cursor+=p.xAdvance*scale;});
    }content+='EMC\n';
  };
  const wrap=(value,maxWidth,size=9,bold=false)=>{
    const result=[];for(const paragraph of String(value||'').split('\n')){
      const words=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('km',{granularity:'word'}).segment(paragraph)].map(x=>x.segment):paragraph.split(/(\s+)/);
      let line='';for(const word of words){if(line&&width(line+word,size,bold)>maxWidth){result.push(line.trim());line='';}line+=word;}result.push(line.trim());
    }return result;
  };
  const line=at=>{content+='0.83 0.85 0.88 RG 40 '+at+' m 555 '+at+' l S\n';};
  const finish=()=>{if(content)pages.push(content);content='';};
  const start=()=>{
    finish();const h=130*letterheadLogoSize[1]/letterheadLogoSize[0];content+='q 130 0 0 '+h+' 40 '+(802-h)+' cm /Logo Do Q\n';
    let cy=804;for(const value of [c.legalNameKh,c.legalNameEn])if(value){text(value,200,cy,12,true);cy-=20;}
    for(const value of wrap(c.registeredAddressKh||'',350,8))if(value){text(value,200,cy,8);cy-=13;}
    for(const value of wrap(c.registeredAddress||c.contactAddress,350,8))if(value){text(value,200,cy,8);cy-=13;}
    text('VAT TIN: '+(c.tin||'Not configured'),200,cy,8);cy-=14;text([c.phone,c.email].filter(Boolean).join(' | '),200,cy,8);
    y=Math.min(690,cy-25);content+='1 0.78 0.16 rg 40 '+(y+11)+' 515 3 re f\n';
    text(d.invoiceType==='tax'?'វិក្កយបត្រអាករ':'វិក្កយបត្រពាណិជ្ជកម្ម',40,y-12,17,true);y-=36;
    text(d.invoiceType==='tax'?'TAX INVOICE':'COMMERCIAL INVOICE',40,y,14,true);text(d.code,380,y,13,true);y-=22;
    if(d.demo){text('DEMONSTRATION ONLY - NOT FOR TAX OR PAYMENT USE',40,y,9,true);y-=21;}
    text('កាលបរិច្ឆេទ / Date: '+d.invoiceDate+'    កាលកំណត់ / Due: '+d.due,40,y,9);y-=24;
  };
  const ensure=h=>{if(y-h<65)start();};
  const para=(label,value)=>{const ls=wrap(value,510);ensure(40);text(label,40,y,9,true);y-=18;for(const l of ls){ensure(16);text(l,40,y);y-=15;}y-=9;};
  const headings=()=>{ensure(50);content+='0.96 0.96 0.94 rg 40 '+(y-22)+' 515 43 re f\n';[['ល.រ.','No.',42],['បរិយាយទំនិញ / សេវា','Description',72],['ឯកតា','Unit',324],['បរិមាណ','Qty',363],['តម្លៃឯកតា','Rate',417],['ចំនួនទឹកប្រាក់','Amount',487]].forEach(([kh,en,x])=>{text(kh,x,y,8,true);text(en,x,y-15,8,true);});y-=44;};
  start();para('អតិថិជន / Customer',[d.buyer.nameKh,d.buyer.name,d.buyer.addressKh,d.buyer.address,'VAT TIN: '+(d.buyer.tin||'Not provided')].filter(Boolean).join('\n'));
  para('កម្មវត្ថុ / Subject',d.name+(d.purchaseReference?'\nPO / Reference: '+d.purchaseReference:''));headings();
  d.items.forEach((item,i)=>{
    const lines=[...wrap(item.descriptionKh,238),...wrap(item.description,238)].filter(Boolean);let n=0;
    while(n<lines.length){if(y<110){start();headings();}const count=Math.min(lines.length-n,Math.max(1,Math.floor((y-85)/16)));
      text(String(i+1)+(n?' cont.':''),42,y,8);lines.slice(n,n+count).forEach((l,j)=>text(l,72,y-j*16));
      if(n===0){text(item.unit,324,y,8);text(item.quantity,363,y,8);text(Number(item.rate).toFixed(d.currency==='KHR'?0:4),417,y,8);text(fmt(roundMoney(item.quantity*item.rate,d.currency)),487,y,8);}
      y-=Math.max(30,count*16+12);line(y+10);n+=count;
    }
  });
  ensure(190);y-=10;
  for(const [label,value] of [['សរុប / Subtotal',d.totals.subtotal],['បញ្ចុះតម្លៃ / Discount',d.discount],['មុនអាករ / Before VAT',d.totals.taxable],['អាករលើតម្លៃបន្ថែម / VAT '+d.taxRate+'%',d.totals.tax],['សរុបរួមអាករ / TOTAL '+d.currency,d.totals.total]]){text(label,265,y,9,true);text(fmt(value),477,y,10,true);y-=23;}
  if(d.currency==='KHR'||d.fxRate){text('សរុបជារៀល / Total KHR: '+Math.round(d.totals.total*(d.currency==='KHR'?1:d.fxRate)).toLocaleString('en-US'),265,y,9,true);y-=23;}
  if(d.currency==='USD'&&d.fxRate){text('KHR / USD: '+d.fxRate+' | '+d.fxDate,265,y,8);y-=17;if(d.fxReference)para('Exchange rate reference',d.fxReference);}
  if(d.invoiceType==='commercial'){para('កំណត់សម្គាល់ / Note','Total includes the taxes shown above. Commercial invoice.');}
  if(d.terms)para('លក្ខខណ្ឌទូទាត់ / Payment terms',d.terms);
  if(c.paymentInstructions)para('សេចក្តីណែនាំទូទាត់ / Payment instructions',c.paymentInstructions);
  ensure(100);line(y);y-=25;text('អ្នកលក់ / Seller',40,y,10,true);text('អ្នកទិញ / Buyer',330,y,10,true);y-=25;text(c.signatory||'Authorized representative',40,y,9);text(d.buyer.name,330,y,9);y-=38;text('ហត្ថលេខា / Signature: __________________',40,y,9);text('ហត្ថលេខា / Signature: __________________',330,y,9);finish();
  const objects=['<< /Type /Catalog /Pages 2 0 R >>',''];
  const add=v=>{objects.push(v);return objects.length;},fontRefs=[];
  for(const {bytes,font} of invFonts){const hex=invHex(bytes)+'>';const file=add('<< /Length '+hex.length+' /Filter /ASCIIHexDecode /Length1 '+bytes.length+' >>\nstream\n'+hex+'\nendstream');
    const descriptor=add('<< /Type /FontDescriptor /FontName /'+font.postscriptName+' /Flags 4 /FontBBox [-1100 -1000 2100 2100] /ItalicAngle 0 /Ascent 1100 /Descent -500 /CapHeight 700 /StemV 80 /FontFile2 '+file+' 0 R >>');
    const cid=add('<< /Type /Font /Subtype /CIDFontType2 /BaseFont /'+font.postscriptName+' /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor '+descriptor+' 0 R /DW 1000 /CIDToGIDMap /Identity >>');
    fontRefs.push(add('<< /Type /Font /Subtype /Type0 /BaseFont /'+font.postscriptName+' /Encoding /Identity-H /DescendantFonts ['+cid+' 0 R] >>'));
  }
  const logo=add('<< /Type /XObject /Subtype /Image /Width '+letterheadLogoSize[0]+' /Height '+letterheadLogoSize[1]+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length '+(letterheadLogo.length+1)+' >>\nstream\n'+letterheadLogo+'>\nendstream'),kids=[];
  pages.forEach((stream,i)=>{content='';text(d.code+' | Page '+(i+1)+' / '+pages.length,40,38,8);stream+=content;const sid=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream');kids.push(add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << '+fontRefs.map((ref,index)=>'/F'+index+' '+ref+' 0 R').join(' ')+' >> /XObject << /Logo '+logo+' 0 R >> >> /Contents '+sid+' 0 R >>')+' 0 R');});
  objects[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+pages.length+' >>';let body='%PDF-1.4\n',offsets=['0000000000 65535 f '];objects.forEach((v,i)=>{offsets.push(String(body.length).padStart(10,'0')+' 00000 n ');body+=(i+1)+' 0 obj\n'+v+'\nendobj\n';});const offset=body.length;body+='xref\n0 '+offsets.length+'\n'+offsets.join('\n')+'\ntrailer\n<< /Size '+offsets.length+' /Root 1 0 R >>\nstartxref\n'+offset+'\n%%EOF\n';return new TextEncoder().encode(body);
}
