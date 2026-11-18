import { DomainError } from './domain.js';
import { roundMoney } from './seed.js';

export const hasFinanceAccess = actor => !!actor?.roles?.some(role=>['director','finance'].includes(role));
export const financeKinds = new Set(['invoice','payment','cash','claim','milestone','cost']);
export const financeAction = action => /^(invoice\.|invoiceProfile\.|cash\.|claim\.|milestone\.|project\.cost$)/.test(action);
export function financialRecord(row,rows,seen=new Set()){
  if(!row||seen.has(row.id))return false;
  seen.add(row.id);
  if(financeKinds.has(row.kind)||row.confidentiality==='finance'||row.mailbox==='finance')return true;
  if(['document','dispatch','mail'].includes(row.kind)){
    if(financialRecord(rows.find(x=>x.id===(row.relatedId||row.parentId)),rows,seen))return true;
    return (row.attachments||[]).some(a=>financialRecord(rows.find(x=>x.id===a.id),rows,seen));
  }
  return false;
}
export function financeAuditAllowed(event,actor,rows){
  return hasFinanceAccess(actor)||(!financeAction(event.action||'')&&!financialRecord(rows.find(x=>x.id===(typeof event.target==='object'?event.target?.id:event.target)),rows));
}
export const invoiceCompanyDefaults = {
  legalNameEn:'T E A M S Co., Ltd.',legalNameKh:'',tin:'',taxpayerType:'',registeredAddress:'',registeredAddressKh:'',
  contactAddress:"# 824, Street Doung Ngeap II, Phumi Trong Moin, Sangkat Ou Baek K'am, Khan Sen Sok, Phnom Penh, Cambodia",
  phone:'023 230 689 / 093 219 111',email:'info@teams.com.kh',website:'www.teams.com.kh',
  contactSource:'https://www.teams.com.kh/contact/',paymentInstructions:'',signatory:'',verified:false
};
export const invoiceProfile = settings => ({...invoiceCompanyDefaults,...settings?.invoiceProfile,legalNameEn:invoiceCompanyDefaults.legalNameEn});
const fiRequire=(ok,message,status=422)=>{if(!ok)throw new DomainError(message,status);};
const fiText=(v,label,max=500)=>{const value=String(v??'').trim();fiRequire(value&&value.length<=max,label+' is required (up to '+max+' characters).');return value;};
const fiDate=(v,label)=>{fiRequire(/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Enter a valid '+label+'.');return v;};
const fiNumber=(v,label,min=0,max=1e9)=>{fiRequire(v!==''&&v!=null&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max,'Enter a valid '+label+'.');return Number(v);};
const fiOptional=(v,max=4000)=>String(v??'').trim().slice(0,max);
export function invoiceTotals(items,currency,taxRate=0,discount=0){
  const subtotal=roundMoney(items.reduce((sum,line)=>sum+roundMoney(line.quantity*line.rate,currency),0),currency);
  const taxable=roundMoney(subtotal-discount,currency),tax=roundMoney(taxable*taxRate/100,currency);
  return {subtotal,discount,taxable,tax,total:roundMoney(taxable+tax,currency)};
}
export const receivableInvoice = row => row.kind==='invoice'&&!['Draft','Void','Cancelled'].includes(row.status);
export function applyInvoiceOperation(rows,actor,action,data,demo,today,context){
  fiRequire(hasFinanceAccess(actor),'Financial access is restricted to the Managing Director and Accounting & Finance Manager.',403);
  const {make,update,get,next,settings}=context;
  if(action==='invoiceProfile.update'){
    const p={...invoiceProfile(settings)};
    for(const k of ['legalNameKh','tin','registeredAddress','registeredAddressKh','phone','email','paymentInstructions','signatory'])p[k]=fiOptional(data[k],k==='paymentInstructions'?2000:700);
    fiRequire(['','small','medium','large'].includes(data.taxpayerType),'Choose the registered taxpayer classification.');p.taxpayerType=data.taxpayerType;
    p.verified=data.verified===true;p.verificationReference=fiOptional(data.verificationReference,500);
    if(p.verified)fiRequire(p.legalNameKh&&p.registeredAddress&&p.registeredAddressKh&&p.tin&&p.taxpayerType&&p.signatory&&p.verificationReference,'Verify the registered Khmer name, registered addresses, TIN, taxpayer classification, signatory and verification reference.');
    return update(settings,{invoiceProfile:p});
  }
  if(action==='invoice.draft'||action==='invoice.edit'){
    const old=action==='invoice.edit'?get(data.id,'invoice'):null;
    fiRequire(!old||old.status==='Draft','Issued invoices are locked. Void an unpaid invoice with a reason; never overwrite its issued copy.');
    const client=get(data.clientId,'client'),project=data.projectId?get(data.projectId,'project'):null;
    const contract=data.contractId?get(data.contractId,'contract'):null,claim=data.claimId?get(data.claimId,'claim'):null;
    fiRequire(!project||project.clientId===client.id,'The project must belong to the selected client.');
    fiRequire(!contract||contract.clientId===client.id,'The service contract must belong to the selected client.');
    fiRequire(!(project&&contract),'Choose a project or maintenance contract.');
    fiRequire(!claim||(claim.status==='Certified'&&claim.projectId===project?.id),'Use a certified claim from the selected project.');
    fiRequire(!claim||!rows.some(x=>x.kind==='invoice'&&x.claimId===claim.id&&x.id!==old?.id&&x.status!=='Void'),'This claim already has an invoice or draft.');
    const currency=data.currency;fiRequire(['USD','KHR'].includes(currency),'Choose USD or KHR.');
    fiRequire(!project||project.currency===currency,'The project and invoice currencies must match.');fiRequire(!contract||contract.currency===currency,'The service contract and invoice currencies must match.');
    fiRequire(['commercial','tax'].includes(data.invoiceType),'Choose Commercial Invoice or Tax Invoice.');
    fiRequire(Array.isArray(data.items)&&data.items.length>0&&data.items.length<=100,'Add between 1 and 100 invoice lines.');
    const items=data.items.map(line=>({description:fiText(line.description,'Line description',1000),descriptionKh:fiOptional(line.descriptionKh,1000),unit:fiText(line.unit,'Unit',30),quantity:Math.round(fiNumber(line.quantity,'quantity',0.001,1e6)*1000)/1000,rate:Math.round(fiNumber(line.rate,'unit rate',0,1e8)*10000)/10000}));
    const taxRate=fiNumber(data.taxRate,'VAT rate',0,100),discount=roundMoney(fiNumber(data.discount??0,'discount'),currency),totals=invoiceTotals(items,currency,taxRate,discount);
    fiRequire(totals.taxable>0&&totals.total<=1e10,'The invoice total after discount must be positive and within the limit.');
    if(claim)fiRequire(totals.taxable===roundMoney(claim.certified*(1-claim.retention/100),currency),'The amount before VAT must equal the certified claim after retention.');
    const due=fiDate(data.due,'due date'),invoiceDate=fiDate(data.invoiceDate,'invoice date');fiRequire(due>=invoiceDate,'The due date cannot precede the invoice date.');
    const fxRate=currency==='KHR'?1: data.fxRate?fiNumber(data.fxRate,'KHR per USD',1,100000):null;
    const values={nativeInvoice:true,name:fiText(data.name,'Invoice subject'),invoiceType:data.invoiceType,clientId:client.id,projectId:project?.id||null,contractId:contract?.id||null,claimId:claim?.id||null,parentId:claim?.id||project?.id||contract?.id||client.id,
      buyer:{name:fiText(data.buyerName||client.name,'Customer name'),nameKh:fiOptional(data.buyerNameKh),address:fiText(data.buyerAddress||client.address,'Customer address',1000),addressKh:fiOptional(data.buyerAddressKh,1000),tin:fiOptional(data.buyerTin,100)},
      currency,items,taxRate,discount,totals,amount:totals.total,invoiceDate,due,fxRate,fxDate:fxRate&&currency==='USD'?fiDate(data.fxDate,'exchange rate date'):null,fxReference:fiOptional(data.fxReference,500),
      terms:fiOptional(data.terms,2000),purchaseReference:fiOptional(data.purchaseReference,250),status:'Draft',accounting:{status:'Not connected',externalId:null}};
    return old?update(old,values):make('invoice',values);
  }
  const invoice=get(data.id,'invoice');
  if(action==='invoice.issue'){
    fiRequire(invoice.nativeInvoice&&invoice.status==='Draft','Only a native draft invoice can be issued.');
    fiRequire(invoice.invoiceDate===today,'Issue on today\'s date. Historical invoices must be imported through an accounting reconciliation.');
    const company=invoiceProfile(settings),totals=invoiceTotals(invoice.items,invoice.currency,invoice.taxRate,invoice.discount);
    fiRequire(data.confirm===true,'Confirm the customer, amounts and invoice type before issue.');
    if(!demo){
      fiRequire(company.verified&&company.tin&&company.legalNameKh&&company.registeredAddress&&company.registeredAddressKh&&company.signatory,'Finance must verify the company invoice profile before live issuance.');
      fiRequire(invoice.buyer.nameKh&&invoice.buyer.addressKh&&invoice.items.every(x=>x.descriptionKh),'Complete the Khmer customer name, address and every line description before live issuance.');
      if(invoice.invoiceType==='tax')fiRequire(['medium','large'].includes(company.taxpayerType)&&invoice.buyer.tin,'Tax invoices require an eligible registered seller and customer TIN.');
      if(company.taxpayerType==='small')fiRequire(invoice.taxRate===0,'Small taxpayer invoices cannot charge VAT in this workflow.');
      if(invoice.currency==='USD')fiRequire(invoice.fxRate&&invoice.fxDate===today&&invoice.fxReference,'Record and reference the applicable daily KHR exchange rate for the invoice date.');
    }
    if(invoice.claimId)fiRequire(!rows.some(x=>x.kind==='invoice'&&x.id!==invoice.id&&x.claimId===invoice.claimId&&x.status!=='Void'),'The claim is already invoiced.');
    const code=next('invoice',invoice.invoiceType==='tax'?'TI':'CI');
    const snapshot={...structuredClone(invoice),code,date:today,invoiceDate:today,company:structuredClone(company),totals,amount:totals.total,demo:!!demo,issuedBy:actor.id,issuedOn:today};
    delete snapshot.snapshot;
    return update(invoice,{code,reference:code,date:today,status:'Issued',issuedOn:today,snapshot});
  }
  if(action==='invoice.void'){
    fiRequire(invoice.nativeInvoice&&['Draft','Issued'].includes(invoice.status),'Choose a draft or issued native invoice.');
    fiRequire(!rows.some(x=>x.kind==='payment'&&x.invoiceId===invoice.id),'An invoice with payment history needs an accounting credit-note process. It cannot be voided here.');
    return update(invoice,{status:'Void',voidReason:fiText(data.reason,'Void reason / authorization reference',1000),voidedOn:today,voidedBy:actor.id});
  }
  throw new DomainError('Unknown invoice action.',400);
}
export function invoiceAccountingExport(rows){
  return {schema:'teams.invoice-export.v1',integration:'Not connected',exportedAt:new Date().toISOString(),invoices:rows.filter(x=>x.nativeInvoice&&x.snapshot&&['Issued','Void'].includes(x.status)).map(x=>({id:x.id,number:x.code,type:x.invoiceType,status:x.status,issueDate:x.invoiceDate,dueDate:x.due,clientId:x.clientId,projectId:x.projectId,contractId:x.contractId,claimId:x.claimId,currency:x.currency,document:x.snapshot,voidReason:x.voidReason||null,voidedOn:x.voidedOn||null,accounting:x.accounting})),payments:rows.filter(x=>x.kind==='payment').map(x=>({id:x.id,invoiceId:x.invoiceId,amount:x.amount,currency:x.currency,date:x.date,reference:x.reference,reverses:x.reverses||null}))};
}
