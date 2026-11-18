import { DomainError, roles } from '../server/domain.js';

// Fictional role representatives. Enter approved names in a protected workspace.
export const sourceRepresentatives = [
  {
    "id": "source-role:director",
    "name": "Demo Managing Director",
    "position": "Managing Director",
    "roles": [
      "director"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:installation_lead",
    "name": "Demo Electrical Lead",
    "position": "Electrical Leader",
    "roles": [
      "installation_lead"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:maintenance",
    "name": "Demo Maintenance Supervisor",
    "position": "LV/ELV Maintenance Supervisor",
    "roles": [
      "maintenance"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:installation_technician",
    "name": "Demo Electrical Technician",
    "position": "Electrical Technician",
    "roles": [
      "installation_technician"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:adminSupport",
    "name": "Demo HR Representative",
    "position": "Senior HRA Executive",
    "roles": [
      "adminSupport"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:mep",
    "name": "Demo Head of MEP",
    "position": "Head of MEP Manager",
    "roles": [
      "mep"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:estimator",
    "name": "Demo Estimator",
    "position": "Design & QS Manager",
    "roles": [
      "estimator"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:logistics",
    "name": "Demo Delivery Coordinator",
    "position": "Delivery/ Vehicle Controller",
    "roles": [
      "logistics"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:technician",
    "name": "Demo Maintenance Technician",
    "position": "Pool Maintenance Technician",
    "roles": [
      "technician"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:maintenance_lead",
    "name": "Demo Maintenance Team Leader",
    "position": "MVAC Maintenance Team Leader",
    "roles": [
      "maintenance_lead"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:finance",
    "name": "Demo Accounting Manager",
    "position": "Accounting Manager",
    "roles": [
      "finance"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:project",
    "name": "Demo Project Manager",
    "position": "Project Manager",
    "roles": [
      "project"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:procurement",
    "name": "Demo Procurement Officer",
    "position": "Procurement Operator",
    "roles": [
      "procurement"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:warehouse",
    "name": "Demo Stock Controller",
    "position": "Stock Controlling",
    "roles": [
      "warehouse"
    ],
    "sourceExample": true
  },
  {
    "id": "source-role:manager",
    "name": "Demo Business Manager",
    "position": "Business Manager",
    "roles": [
      "manager"
    ],
    "sourceExample": true
  }
];

export const planningStatuses = ['Requested', 'Reviewed', 'Prioritized', 'Deferred'];
export const planningPriorities = ['High', 'Medium', 'Low'];

export function rolePlanning(state) {
  state.rolePlanning ??= {
    format: 1,
    people: structuredClone(sourceRepresentatives),
    requests: [],
    audit: [],
    source: 'Fictional role examples',
  };
  return state.rolePlanning;
}

function requireValue(condition, message) {
  if (!condition) throw new DomainError(message);
}

function textValue(value, label, limit = 300) {
  requireValue(typeof value === 'string' && value.trim().length > 0 && value.length <= limit,
    label + ' is required (up to ' + limit + ' characters).');
  return value.trim();
}

function profiles(value) {
  requireValue(Array.isArray(value) && value.every(role => roles.includes(role)), 'Select valid permission profiles.');
  return [...new Set(value)];
}

export function applyPlanning(plan, operation, data) {
  if (operation === 'employee.save') {
    const previous = plan.people.find(person => person.id === data.id);
    const person = {
      ...previous,
      id: previous?.id ?? crypto.randomUUID(),
      name: textValue(data.name, 'Employee name'),
      position: textValue(data.position, 'Official position'),
      department: String(data.department ?? '').trim().slice(0,300),
      team: String(data.team ?? '').trim().slice(0,300),
      jobFunctions: String(data.jobFunctions ?? '').trim().slice(0,4000),
      roles: previous?.roles ?? [],
    };
    plan.people = [...plan.people.filter(row => row.id !== person.id), person];
    return { id: person.id, before: previous ?? null, after: person };
  }
  if (operation === 'person.save') {
    const previous = plan.people.find(person => person.id === data.id);
    const person = {
      ...previous,
      id: previous?.id ?? crypto.randomUUID(),
      name: textValue(data.name, 'Name'),
      position: textValue(data.position, 'Position'),
      roles: profiles(data.roles),
    };
    plan.people = [...plan.people.filter(row => row.id !== person.id), person];
    return { id: person.id, before: previous ?? null, after: person };
  }
  if (operation === 'request.save') {
    requireValue(roles.includes(data.role), 'Choose a valid role.');
    requireValue(!data.personId || plan.people.some(person => person.id === data.personId && person.roles.includes(data.role)),
      'Choose a person assigned to this proposed role.');
    requireValue(planningPriorities.includes(data.priority) && planningStatuses.includes(data.status), 'Choose a valid priority and review status.');
    const previous = plan.requests.find(request => request.id === data.id);
    const request = {
      id: previous?.id ?? crypto.randomUUID(),
      role: data.role,
      personId: data.personId || '',
      title: textValue(data.title, 'Requested function'),
      workflow: textValue(data.workflow, 'Workflow'),
      acceptance: textValue(data.acceptance, 'Expected result', 4000),
      priority: data.priority,
      status: data.status,
    };
    plan.requests = [...plan.requests.filter(row => row.id !== request.id), request];
    return { id: request.id, before: previous ?? null, after: request };
  }
  if (operation === 'source.import') {
    const input = data.source?.employees;
    requireValue(Array.isArray(input) && input.length > 0 && input.length <= 500, 'Choose the TEAMS employee import JSON.');
    const seen = new Set();
    // Validate the entire file before changing a single record.
    const incoming = input.map(row => {
      requireValue(typeof row.employee_id === 'string' && Number.isInteger(row.source_row), 'Employee IDs must be text and source rows must be present.');
      const sourceKey = row.employee_id || 'row-' + row.source_row;
      requireValue(!seen.has(sourceKey), 'The import contains duplicate employee identifiers.');
      seen.add(sourceKey);
      const name = textValue(row.english_name, 'Source employee name');
      const position = textValue(row.position_source, 'Source position');
      const proposed = row.proposed_app_role === 'no_access' ? [] : profiles([row.proposed_app_role]);
      return { sourceKey, name, position, proposed, employeeId: row.employee_id,
        department: String(row.department_source ?? ''), team: String(row.team_source ?? '') };
    });
    const before = structuredClone(plan.people);
    for (const person of incoming) {
      const previous = plan.people.find(row => row.sourceKey === person.sourceKey ||
        (row.sourceExample && row.name === person.name && row.position === person.position));
      const entry = {
        ...previous,
        id: previous?.id ?? 'source-import:' + person.sourceKey,
        sourceKey: person.sourceKey,
        employeeId: person.employeeId,
        name: person.name,
        position: person.position,
        department: previous?.department ?? person.department,
        team: previous?.team ?? person.team,
        roles: previous?.roles ?? person.proposed,
        imported: true,
      };
      plan.people = [...plan.people.filter(row => row.id !== entry.id), entry];
    }
    return { id: 'employee-source', before, after: structuredClone(plan.people), count: incoming.length };
  }
  throw new DomainError('Unknown role planning operation.');
}
