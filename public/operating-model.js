// Public descriptions contain function names and job roles only.
const stage = (title, role, view, description, record, action) => ({ title, role, view, description, record, action });

export const serviceWorkflows = [
  {
    id: 'design', name: 'MEP Design & Assessment', short: 'Design & assessment', icon: 'blueprint', color: 'blue',
    owner: 'Design, QS & Tendering', coordination: 'Business & Commercial qualifies the request. Design & QS owns the technical package.',
    stages: [
      stage('Qualify scope', 'manager', 'tenders', 'Confirm the client brief, site requirements and bid deadline.', 't0'),
      stage('Assess systems', 'estimator', 'quotes', 'Record site findings and define mechanical, electrical, plumbing and fire protection scope.', 'q0'),
      stage('Build BOQ', 'estimator', 'quotes', 'Measure quantities, compare costs and prepare the proposal for review.', 'q0', ['quote.create', 'Create quotation']),
      stage('Technical review', 'mep', 'quotes', 'Review the technical scope and assumptions before the package goes to Commercial.', 'q0'),
    ],
  },
  {
    id: 'contracting', name: 'MEP Contracting & Installation', short: 'MEP contracting', icon: 'building', color: 'yellow',
    owner: 'Projects & Installation', coordination: 'Design & QS prepares the estimate. Projects & Installation owns delivery, with material and claim handoffs.',
    stages: [
      stage('Qualify tender', 'manager', 'tenders', 'Screen scope, delivery commitments and commercial risk.', 't1', ['tender.create', 'Analyze tender']),
      stage('Estimate & review', 'estimator', 'quotes', 'Price the BOQ and hand the scope and assumptions to the project team.', 'q0'),
      stage('Buy & issue', 'procurement', 'procurement', 'Prepare purchasing from the site requisition. Stock Control receives and issues materials.', 'po0'),
      stage('Deliver works', 'project', 'projects', 'Assign the site team and track installation, progress evidence and cost to complete.', 'p0'),
      stage('Submit claim', 'finance', 'billing', 'Review the project claim, invoice certified work and track collection.', 'cl3'),
    ],
  },
  {
    id: 'maintenance', name: 'MEP O&M, Scheduled Maintenance & Troubleshooting', short: 'Maintenance & FM', icon: 'tool', color: 'green',
    owner: 'Maintenance & FM', coordination: 'Choose onsite facility operations, scheduled maintenance with optional resident staff, or a one-time troubleshooting job. The signed service scope defines coverage and repair approvals.',
    stages: [
      stage('Review contract', 'maintenance', 'maintenance', 'Classify the service model and define covered assets, resident staffing, operating hours and planned visits.', 'mc0'),
      stage('Plan visit', 'maintenance_lead', 'maintenance', 'Coordinate the scheduled visit and prepare work for the assigned team.', 'job0'),
      stage('Service equipment', 'technician', 'maintenance', 'Complete the equipment checklist and record findings and consumption.', 'job0'),
      stage('Prepare renewal', 'manager', 'maintenance', 'Review service records, agreement terms and renewals. Email approved client documents directly and keep correspondence linked to the service record.', 'mc0'),
    ],
  },
  {
    id: 'solar', name: 'Solar Power Systems', short: 'Solar power', icon: 'solar', color: 'orange',
    owner: 'Projects & Installation or Maintenance & FM', coordination: 'Design & QS provides the technical package. The signed contract determines the delivery owner.',
    stages: [
      stage('Review design', 'estimator', 'quotes', 'Check the proposed system, scope and pricing before handoff.', 'q-solar-demo'),
      stage('Source equipment', 'procurement', 'procurement', 'Prepare purchasing and confirm equipment availability against the approved scope.', null),
      stage('Install & commission', 'project', 'projects', 'Track site delivery and confirm installation and commissioning milestones.', 'p-solar-demo'),
      stage('Hand over service', 'maintenance', 'maintenance', 'Plan preventive service where the customer contract includes maintenance.', null, ['contract.create', 'Create service contract']),
    ],
  },
  {
    id: 'consultancy', name: 'Consultancy & Project Management', short: 'Consultancy', icon: 'clipboard', color: 'violet',
    owner: 'Design, QS & Tendering', coordination: 'Commercial agrees the scope. Design & QS owns technical deliverables and reports progress against the assignment.',
    stages: [
      stage('Agree brief', 'manager', 'clients', 'Confirm the deliverables, client contact and scope of the engagement.', 'c2'),
      stage('Assess & advise', 'estimator', 'quotes', 'Prepare the assessment and costed technical recommendations.', 'q-consult-demo'),
      stage('Track delivery', 'project', 'projects', 'Record milestones, site observations and client handover.', 'p-consult-demo'),
    ],
  },
  {
    id: 'trading', name: 'Generator Trading', short: 'Generator trading', icon: 'bolt', color: 'rose',
    owner: 'Procurement & Logistics', coordination: 'Commercial owns the customer quotation. Head of MEP reviews technical fit, and Procurement & Logistics owns fulfilment.',
    stages: [
      stage('Quote supply', 'estimator', 'quotes', 'Specify the generator and prepare the equipment quotation.', 'q-generator-demo'),
      stage('Prepare purchase', 'procurement', 'procurement', 'Confirm the supplier, commercial terms and purchase order.', 'po-generator-demo'),
      stage('Dispatch & confirm', 'logistics', 'procurement', 'Track the assigned delivery and record proof of handover.', 'po-generator-demo'),
      stage('Follow collection', 'finance', 'billing', 'Review the customer account and payment position.', null),
    ],
  },
];

export const operatingUnits = [
  {id:'executive',name:'Executive',lead:'Managing Director',parent:null,icon:'target',color:'yellow',roles:['director'],
    responsibility:'Sets direction, approves delegation and handles high-risk or above-limit decisions.',links:['reports','tenders']},
  {id:'commercial',name:'Business & Commercial',lead:'Business Manager',parent:'executive',icon:'target',color:'orange',roles:['manager'],
    responsibility:'Qualifies opportunities, manages client and tender pipelines, handles contracting and coordinates renewals.',links:['clients','tenders','quotes']},
  {id:'finance',name:'Finance & Accounting',lead:'Accounting Manager',parent:'executive',icon:'wallet',color:'rose',roles:['finance'],
    responsibility:'Reviews budgets, certifies claims, reconciles payments and collections, and maintains the cash forecast.',links:['billing','reports']},
  {id:'people',name:'People & Administration',lead:'Senior HR & Admin Executive',parent:'executive',icon:'people',color:'violet',roles:['adminSupport'],
    responsibility:'Maintains employee records, confirms reporting lines and coordinates attendance and personnel assignments.',links:[]},
  {id:'engineering',name:'Engineering & Operations',lead:'Head of MEP',parent:'executive',icon:'layers',color:'blue',roles:['mep'],
    responsibility:'Owns technical oversight, delivery capacity, engineering standards and safety across service lines.',links:['projects','quotes','maintenance']},
  {id:'design',name:'Design, QS & Tendering',lead:'Design & QS Manager',parent:'engineering',icon:'blueprint',color:'blue',roles:['estimator'],
    responsibility:'Leads assessment, design, quantities, cost estimates and technical tender review.',links:['tenders','quotes']},
  {id:'projects',name:'Projects & Installation',lead:'Project Manager',parent:'engineering',icon:'building',color:'yellow',roles:['project','installation_lead','installation_technician'],
    responsibility:'Owns installation delivery, crew assignments, site evidence, cost to complete and progress claim preparation.',links:['projects','procurement','billing']},
  {id:'maintenance',name:'Maintenance & FM',lead:'O&M Supervisor',parent:'engineering',icon:'tool',color:'green',roles:['maintenance','maintenance_lead','technician'],
    responsibility:'Plans contract visits, schedules technicians, reviews service records and manages maintenance cost.',links:['maintenance']},
  {id:'supply',name:'Procurement & Logistics',lead:'Procurement, Stock Control and Logistics',parent:'engineering',icon:'truck',color:'orange',roles:['procurement','warehouse','logistics'],
    responsibility:'Prepares purchases, maintains independent stock custody and coordinates dispatch and proof of delivery.',links:['procurement','inventory']},
];

export const decisionRights = [
  {unit:'executive',decision:'Accept contract or guarantee exception',accountable:'Managing Director',responsible:'Business Manager',consulted:'Accounting Manager and Head of MEP',view:'tenders'},
  {unit:'commercial',decision:'Screen new opportunity',accountable:'Business Manager',responsible:'Business Manager',consulted:'Design & QS Manager and Finance',view:'tenders'},
  {unit:'commercial',decision:'Bid decision within delegated limit',accountable:'Business Manager',responsible:'Business Manager',consulted:'Accounting Manager, Design & QS Manager and Head of MEP',view:'tenders'},
  {unit:'design',decision:'Prepare estimate and BOQ',accountable:'Design & QS Manager',responsible:'Assigned estimator or QS',consulted:'Head of MEP and Project Manager',view:'quotes'},
  {unit:'projects',decision:'Approve project work plan',accountable:'Project Manager',responsible:'Project Coordinator and Site Lead',consulted:'Head of MEP and Design & QS Manager',view:'projects'},
  {unit:'projects',decision:'Prepare progress claim',accountable:'Project Manager',responsible:'Project Coordinator',consulted:'Accounting Manager and Business Manager',view:'billing'},
  {unit:'maintenance',decision:'Schedule and assign maintenance work',accountable:'O&M Supervisor',responsible:'Discipline supervisors',consulted:'HR & Administration and Business Manager',view:'maintenance'},
  {unit:'supply',decision:'Prepare purchase order within limit',accountable:'Head of MEP',responsible:'Procurement Operator',consulted:'Accounting Manager and Stock Controller',view:'procurement'},
  {unit:'supply',decision:'Receive and issue materials',accountable:'Stock Controller',responsible:'Stock Controller',consulted:'Logistics and the relevant site lead',view:'inventory'},
  {unit:'supply',decision:'Approve stock adjustment within limit',accountable:'Head of MEP',responsible:'Stock Controller',consulted:'Accounting Manager',view:'inventory'},
  {unit:'finance',decision:'Record client payment or receivable',accountable:'Accounting Manager',responsible:'Accounting Assistant',consulted:'Business Manager',view:'billing'},
  {unit:'people',decision:'Reassign permanent role or reporting line',accountable:'Managing Director',responsible:'HR & Administration',consulted:'Head of MEP and the relevant supervisor',view:null},
  {unit:'engineering',decision:'Escalate a safety or quality incident',accountable:'Head of MEP',responsible:'Site or service supervisor',consulted:'HR & Administration',view:'projects'},
];
