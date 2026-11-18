import { DomainError, allowed, quotationTotals } from './domain.js';
import { dateOffset } from './seed.js';

// Fictional takeoff allowances used only when simulating tender extraction.
const simulationPackages = {
  HVAC: [
    ['Copper Refrigerant Pipe - 3/8 in',120,'m',0.3],
    ['Galvanized Duct Flange - 100 mm',20,'ea',0.3],
    ['Rubber Isolation Mount - 50 kg',12,'ea',0.2],
  ],
  Electrical: [
    ['XLPE Power Cable - 4 mm²',180,'m',0.12],
    ['Miniature Circuit Breaker - 1P 16A',12,'ea',0.3],
  ],
  ELV: [['Shielded Data Cable - Cat6',200,'m',0.08]],
  Plumbing: [
    ['uPVC Pressure Pipe - 25 mm',90,'m',0.2],
    ['Ball Valve - DN25',12,'ea',0.25],
  ],
  Fire: [
    ['Grooved Coupling - 40 mm',30,'ea',0.15],
    ['Sprinkler Head - Pendent 68C',30,'ea',0.25],
  ],
};

export function simulationBoq(scope = '') {
  const packages = [];
  if (/hvac|mvac|air|cold|refriger|chiller|ahu|duct/i.test(scope)) packages.push('HVAC');
  if (/electri|power|lighting|cable/i.test(scope)) packages.push('Electrical');
  if (/elv|data|network/i.test(scope)) packages.push('ELV');
  if (/plumb|water|drain|pipework/i.test(scope)) packages.push('Plumbing');
  if (/fire|sprinkler/i.test(scope)) packages.push('Fire');
  if (!packages.length || /\bmep\b/i.test(scope)) packages.splice(0,packages.length,...Object.keys(simulationPackages));
  return packages.flatMap(section => simulationPackages[section].map(([description,quantity,unit,laborHours],index) => ({
    section,description,quantity,unit,laborHours,laborRate:12,other:0,sourceRef:'Demo '+section+' takeoff line '+(index+1),
  })));
}

const normalized = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');

export function tenderEstimate(records, actor, tenderId, { simulation = false, today = dateOffset() } = {}) {
  if (!allowed(actor,'tender.quote')) throw new DomainError('Your role cannot generate tender quotations.',403);
  const tender = records.find(row => row.id === tenderId && row.kind === 'tender');
  if (!tender) throw new DomainError('Tender not found.',404);
  if (tender.status !== 'Approved for Bid') throw new DomainError('Approve this tender for bid before creating its quotation.');
  const settings = records.find(row => row.kind === 'settings');
  const catalog = records.filter(row => row.kind === 'material' && row.currency === tender.currency);
  const supplied = Array.isArray(tender.boq) && tender.boq.length > 0;
  if (!supplied && !simulation) throw new DomainError('Add a structured tender BOQ before generating the quotation. Tender document extraction can supply these lines.');
  const source = supplied ? tender.boq : simulationBoq(tender.name+' '+(tender.scope||''));
  if (source.length > 350) throw new DomainError('Split this BOQ into packages of up to 350 lines.');
  const items = [], unmatched = [], warnings = [];
  for (const [index,line] of source.entries()) {
    const quantity = Number(line.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      unmatched.push({line:index+1,description:line.description||'Unnamed item',reason:'A positive source quantity is required.'});
      continue;
    }
    const matches = catalog.filter(material => line.materialId ? material.id === line.materialId :
      line.materialCode ? normalized(material.code) === normalized(line.materialCode) :
      (normalized(material.name) === normalized(line.description) || normalized(material.code) === normalized(line.description)) && (!line.spec || normalized(material.spec) === normalized(line.spec)));
    if (matches.length !== 1) {
      unmatched.push({line:index+1,description:line.description||line.materialCode||line.materialId,
        reason:matches.length?'Several catalog items match. Confirm the specification.':'No catalog match in the tender currency. Add or match this material.'});
      continue;
    }
    const material = matches[0];
    if (line.spec && normalized(line.spec) !== normalized(material.spec)) {
      unmatched.push({line:index+1,description:line.description,reason:'The BOQ specification differs from the selected catalog material.'});
      continue;
    }
    if (normalized(line.unit) !== normalized(material.unit)) {
      unmatched.push({line:index+1,description:line.description,reason:'BOQ unit '+line.unit+' differs from catalog unit '+material.unit+'. Confirm the conversion.'});
      continue;
    }
    if (!Number.isFinite(Number(material.price)) || Number(material.price) < 0) {
      unmatched.push({line:index+1,description:line.description,reason:'A catalog price is required.'});
      continue;
    }
    const costFields = ['laborHours','laborRate','other'];
    if (costFields.some(key => line[key] != null && (!Number.isFinite(Number(line[key])) || Number(line[key]) < 0))) {
      unmatched.push({line:index+1,description:line.description,reason:'Review the labor and other cost inputs.'});
      continue;
    }
    if (!material.priceDate || (Date.parse(today)-Date.parse(material.priceDate))/86400000 > settings.priceDays)
      warnings.push(material.code+' needs a current price review before saving.');
    items.push({section:line.section||material.category,description:normalized(line.description)===normalized(material.code)?material.name:line.description||material.name,spec:material.spec||'',unit:material.unit,
      quantity,materialId:material.id,material:Number(material.price),laborHours:Number(line.laborHours||0),laborRate:Number(line.laborRate||0),
      other:Number(line.other||0),override:'',sourceRef:line.sourceRef||'Tender BOQ line '+(index+1)});
  }
  const assumptions = [];
  if (simulation) assumptions.push('AI behavior is simulated. Sample takeoff quantities and labor allowances require Rina review.');
  if (!supplied) assumptions.push('The tender has no BOQ. Its title and scope selected a demo package. Every quantity is a demonstration allowance.');
  if (source.some(line => line.laborHours == null || line.laborRate == null))
    assumptions.push('Labor inputs are missing on some source lines. Complete them before approving the quotation.');
  assumptions.push('Confirm drawings, specifications, waste allowances, installation scope and omissions before approval.');
  const quote = {name:tender.name+' - Quotation',clientId:tender.clientId,currency:tender.currency,projectId:'',items,
    margin:tender.estimateMargin??settings.minMargin,tax:tender.quoteTax??settings.tax,indirect:tender.estimateIndirect??0,risk:tender.estimateRisk??0,
    discount:0,validUntil:dateOffset(14,today),terms:tender.paymentTerms||'',warranty:tender.warranty||'',exclusions:tender.exclusions||''};
  const generation = {mode:simulation?'simulation':'boq_match',source:supplied?'Tender BOQ':'Demo scope package',tenderCode:tender.code,
    sourceLines:source.length,matchedLines:items.length,generatedAt:today,assumptions,warnings};
  return {quote,generation,unmatched,ready:items.length>0&&unmatched.length===0,totals:quotationTotals(quote)};
}
