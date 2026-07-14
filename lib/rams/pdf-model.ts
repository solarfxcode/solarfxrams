import {getRecommendedHazardsForWorkTypes, recommendedRiskRowsForWorkTypes} from '@/lib/hazards';
import {migrateRamsDraft} from '@/lib/rams/draft-migration';
import {getMethodSectionsForDraft} from '@/lib/rams/default-methods';
import type {HazardSuggestion, Photo, RamsData, RiskRow} from '@/types/rams';

export type RamsPdfRisk = RiskRow & {
  initialScore: number;
  residualScore: number;
};

export type RamsPdfModel = {
  documentControl: {
    documentId: string;
    projectReference: string;
    revision: string;
    issueDate: string;
    reviewDate: string;
    preparedBy: string;
    assessor: string;
    approvedBy: string;
    status: string;
    revisionHistory: RamsData['revisionHistory'];
  };
  project: {
    customerName: string;
    client: string;
    principalContractor: string;
    installationCompany: string;
    siteSupervisor: string;
    qualifiedElectrician: string;
    numberOfOperatives: string;
    emergencyContact: string;
    emergencyPhone: string;
    fullSiteAddress: string;
    postcode: string;
    assessmentDate: string;
    installDate: string;
    scope: string;
    selectedWorkTypes: string[];
    equipmentSummary: string;
    proposedLocations: string[];
    accessArrangements: string;
  };
  scopeOfWorks: Array<{heading: string; items: string[]}>;
  personsAtRisk: string[];
  responsibilities: Array<{role: string; duties: string[]}>;
  equipment: Array<{item: string; notes: string}>;
  materials: string[];
  riskMatrix: {
    severities: string[];
    likelihoods: string[];
    explanation: string;
  };
  recommendedHazards: ReturnType<typeof getRecommendedHazardsForWorkTypes>;
  risks: RamsPdfRisk[];
  methods: Array<{heading: string; text: string}>;
  ppe: Array<{item: string; required: boolean; task: string; workTypes: string[]}>;
  emergencyProcedures: Array<{heading: string; items: string[]}>;
  emergencyDetails: Array<[string, string]>;
  environmentalControls: string[];
  monitoringReview: string[];
  photos: Photo[];
  aiReview: HazardSuggestion[];
  signatures: Array<{label: string; name: string; position: string; signature: string; date: string}>;
  briefingRegister: RamsData['briefingRegister'];
  aiDisclaimer: string;
};

const clean = (value: unknown) => String(value ?? '').trim();
const score = (severity: number, likelihood: number) => Number(severity || 0) * Number(likelihood || 0);
const hasWork = (data: RamsData, workType: string) => data.systemTypes.includes(workType);

function selectedOrDefault(selected: string[], fallback: string[]) {
  return selected.length ? selected : fallback;
}

function buildScope(data: RamsData) {
  const sections: Array<{heading: string; items: string[]}> = [];
  if (hasWork(data, 'Solar PV')) sections.push({heading: 'Solar PV', items: ['Delivery and storage of PV materials', 'Access setup and exclusion zones', 'Mounting system installation', 'PV module installation', 'DC cabling and connector controls', 'Inverter installation', 'AC connection and labelling', 'Manufacturer commissioning and client handover']});
  if (hasWork(data, 'Battery storage')) sections.push({heading: 'Battery storage', items: ['Delivery and battery condition check', 'Manual handling plan', 'Manufacturer-approved mounting', 'Electrical connection under isolation', 'Clearance and ventilation checks', 'Shutdown arrangements', 'Commissioning and handover']});
  if (hasWork(data, 'EV charger')) sections.push({heading: 'EV charger', items: ['Confirm charger position', 'Confirm cable route', 'Mount charger', 'Connect supply and protection', 'Complete functional checks', 'Commission and hand over']});
  if (hasWork(data, 'Trenching')) sections.push({heading: 'Trenching', items: ['Identify services and mark route', 'Controlled excavation', 'Protect open trench', 'Install duct or cable', 'Backfill and reinstate', 'Final inspection']});
  if (hasWork(data, 'Consumer unit work')) sections.push({heading: 'Consumer unit work', items: ['Assess existing board', 'Safe isolation and lock-off', 'Circuit identification', 'Install protective devices or terminations', 'Label and restore supply']});
  if (hasWork(data, 'EPS / backup')) sections.push({heading: 'EPS / backup', items: ['Identify critical-load circuits', 'Maintain separation', 'Install backup arrangements', 'Label and functionally check', 'Explain limitations to client']});
  if (hasWork(data, 'External cable route')) sections.push({heading: 'External cable route', items: ['Inspect route', 'Install containment or supports', 'Protect penetrations', 'Seal external openings', 'Remove trip hazards']});
  if (hasWork(data, 'Loft work')) sections.push({heading: 'Loft work', items: ['Assess loft access', 'Provide lighting', 'Control fragile ceiling risk', 'Install cable routes', 'Maintain housekeeping']});
  return sections;
}

function buildResponsibilities(data: RamsData) {
  const roles: Array<{role: string; duties: string[]}> = [
    {role: 'Project Manager', duties: ['Overall delivery of the works', 'Appointment of competent persons', 'Coordination with client and principal contractor', 'Ensuring RAMS are available and current']},
    {role: 'Site Supervisor', duties: ['Deliver toolbox talk and daily briefing', 'Monitor site conditions and access equipment', 'Enforce exclusion zones and housekeeping', 'Stop work if conditions change or controls are not suitable']},
    {role: 'Operatives', duties: ['Follow this RAMS and supervisor instructions', 'Use correct PPE', 'Report hazards or changes', 'Maintain housekeeping and stop work where unsafe']},
    {role: 'First Aider', duties: ['Provide first-aid response within competence', 'Escalate incidents to emergency services where required', 'Record and report incidents']}
  ];
  if (data.systemTypes.some(type => ['Solar PV', 'Battery storage', 'EV charger', 'Consumer unit work', 'EPS / backup'].includes(type))) {
    roles.splice(2, 0, {role: 'Qualified Electrician', duties: ['Complete safe isolation, lock-off and prove-dead checks', 'Complete electrical installation within competence', 'Verify labelling and manufacturer commissioning steps', 'Control energisation and handover information']});
  }
  return roles;
}

function buildEmergencyProcedures(data: RamsData) {
  const procedures = [
    {heading: 'General incident', items: ['Stop work', 'Make the area safe if it is safe to do so', 'Contact the supervisor', 'Call emergency services where necessary', 'Provide first aid within competence', 'Report and record the incident', 'Do not restart until authorised']},
    {heading: 'Electric shock', items: ['Do not touch the casualty until the supply is isolated', 'Safely isolate and lock off where possible', 'Call emergency services', 'Provide first aid or CPR if trained', 'Preserve the incident area']},
    {heading: 'Fire', items: ['Raise the alarm', 'Evacuate the work area', 'Call 999', 'Do not fight fire unless trained and safe', 'Assemble at the designated location', 'Account for personnel']}
  ];
  if (hasWork(data, 'Roof work') || hasWork(data, 'Solar PV')) procedures.push({heading: 'Fall from height', items: ['Stop work', 'Do not move the casualty unless needed for immediate safety', 'Call emergency services', 'Implement rescue plan where applicable', 'Preserve access for responders']});
  if (hasWork(data, 'Battery storage')) procedures.push({heading: 'Battery event', items: ['Stop work', 'Isolate if safe', 'Evacuate the immediate area', 'Call emergency services', 'Do not approach a damaged or heating battery', 'Follow manufacturer emergency information', 'Prevent re-entry until authorised']});
  if (hasWork(data, 'Trenching')) procedures.push({heading: 'Excavation or service strike', items: ['Stop work', 'Isolate plant and tools', 'Prevent entry to the excavation', 'Call emergency services where required', 'Preserve access for responders', 'Follow site emergency plan for service strikes']});
  return procedures;
}

function buildEnvironmentalControls(data: RamsData) {
  const controls = ['Segregate general waste and packaging', 'Recycle cable and packaging where practicable', 'Maintain site cleanliness', 'Control dust at source where drilling or loft work is undertaken', 'Control noise duration and communicate with occupants where required', 'Prevent spills and keep drainage routes protected where liquid products are used', 'Remove waste from site at the end of works'];
  if (hasWork(data, 'Battery storage')) controls.push('Handle damaged or waste battery materials only in accordance with supplier or manufacturer instructions');
  if (hasWork(data, 'Trenching')) controls.push('Store trench spoil safely and prevent spoil entering drains, paths or public areas');
  if (clean(data.environmentalControlsNotes)) controls.push(clean(data.environmentalControlsNotes));
  return controls;
}

function buildMaterials(data: RamsData) {
  const materials = new Set(data.materials);
  if (hasWork(data, 'Solar PV')) ['PV modules', 'Mounting system', 'Inverters', 'DC cabling', 'AC cabling', 'Isolators', 'Labelling', 'Fixings'].forEach(item => materials.add(item));
  if (hasWork(data, 'Battery storage')) materials.add('Batteries');
  if (hasWork(data, 'EV charger')) materials.add('EV charger');
  if (hasWork(data, 'Trenching')) ['Trench ducting', 'Marker tape', 'Sand or suitable backfill'].forEach(item => materials.add(item));
  if (hasWork(data, 'Consumer unit work')) ['Protective devices', 'Earthing and bonding materials'].forEach(item => materials.add(item));
  if (clean(data.materialNotes)) materials.add(data.materialNotes);
  return Array.from(materials);
}

function buildPdfRisks(data: RamsData): RamsPdfRisk[] {
  const existing = data.risks.map(risk => ({
    ...risk,
    initialScore: score(risk.severity, risk.likelihood),
    residualScore: score(risk.residualSeverity, risk.residualLikelihood)
  }));
  const existingSources = new Set(existing.map(risk => risk.source));
  const suggested = recommendedRiskRowsForWorkTypes(data.systemTypes)
    .filter(risk => !existingSources.has(risk.source))
    .map((risk, index) => ({
      ...risk,
      id: 'pdf-suggested-' + index + '-' + String(risk.code || risk.source).replace(/[^a-z0-9-]/gi, '-'),
      source: risk.source + ' (recommended for selected work - assessor scoring required)',
      assessorNotes: 'Recommended by the SolarFX hazard library for the selected work activities. Assessor must confirm suitability and scores.',
      initialScore: score(risk.severity, risk.likelihood),
      residualScore: score(risk.residualSeverity, risk.residualLikelihood)
    }));
  return [...existing, ...suggested];
}

export function buildRamsPdfModel(input: Partial<RamsData>): RamsPdfModel {
  const data = migrateRamsDraft(input);
  const documentId = 'SolarFX-RAMS-' + (clean(data.projectReference) || 'Unreferenced') + '-Rev-' + (clean(data.revision) || '1');
  const proposedLocations = [
    clean(data.proposedBatteryLocation) ? 'Battery: ' + clean(data.proposedBatteryLocation) : '',
    clean(data.proposedEvLocation) ? 'EV charger: ' + clean(data.proposedEvLocation) : '',
    clean(data.inverterModel) ? 'Inverter model/location notes: ' + clean(data.inverterModel) : ''
  ].filter(Boolean);
  const methods = getMethodSectionsForDraft(data)
    .map(section => ({heading: section.heading, text: clean(data[section.field])}))
    .filter(section => section.text.length > 0);
  return {
    documentControl: {
      documentId,
      projectReference: clean(data.projectReference),
      revision: clean(data.revision) || '1',
      issueDate: clean(data.assessmentDate),
      reviewDate: clean(data.reviewDate),
      preparedBy: clean(data.preparedBy),
      assessor: clean(data.assessor),
      approvedBy: clean(data.approvedBy || data.approvalName),
      status: clean(data.documentStatus) || 'Draft',
      revisionHistory: data.revisionHistory
    },
    project: {
      customerName: clean(data.customerName),
      client: clean(data.client),
      principalContractor: clean(data.principalContractor),
      installationCompany: clean(data.installationCompany || data.preparedBy),
      siteSupervisor: clean(data.siteSupervisor),
      qualifiedElectrician: clean(data.qualifiedElectrician),
      numberOfOperatives: clean(data.numberOfOperatives),
      emergencyContact: clean(data.emergencyContact),
      emergencyPhone: clean(data.emergencyPhone),
      fullSiteAddress: clean(data.address),
      postcode: clean(data.postcode),
      assessmentDate: clean(data.assessmentDate),
      installDate: clean(data.installDate),
      scope: clean(data.scope),
      selectedWorkTypes: data.systemTypes,
      equipmentSummary: selectedOrDefault(data.equipment, []).join(', '),
      proposedLocations,
      accessArrangements: clean(data.accessNotes)
    },
    scopeOfWorks: buildScope(data),
    personsAtRisk: selectedOrDefault(data.personsAtRisk, ['Employees', 'Client', 'Occupants']).concat(clean(data.otherPersonsAtRisk) ? [clean(data.otherPersonsAtRisk)] : []),
    responsibilities: buildResponsibilities(data),
    equipment: selectedOrDefault(data.equipment, []).map(item => ({item, notes: clean(data.equipmentNotes)})),
    materials: buildMaterials(data),
    riskMatrix: {
      severities: ['1 Minor injury or negligible damage', '2 Injury requiring first aid', '3 Injury requiring medical treatment', '4 Major injury or long-term incapacity', '5 Fatality or multiple fatalities'],
      likelihoods: ['1 Rare', '2 Unlikely', '3 Possible', '4 Likely', '5 Almost certain'],
      explanation: 'Risk score = Severity x Likelihood. 1-5 Low, 6-10 Medium, 11-15 High, 16-25 Very High.'
    },
    recommendedHazards: getRecommendedHazardsForWorkTypes(data.systemTypes),
    risks: buildPdfRisks(data),
    methods,
    ppe: data.ppeMatrix.map(item => ({item: item.item, required: data.ppe.includes(item.item) || item.required, task: item.task, workTypes: item.applicableWorkTypes})),
    emergencyProcedures: buildEmergencyProcedures(data),
    emergencyDetails: [
      ['Emergency services', '999'],
      ['Emergency contact', clean(data.emergencyContact)],
      ['Emergency phone', clean(data.emergencyPhone)],
      ['First aider', clean(data.firstAider)],
      ['First aid kit location', clean(data.firstAidKitLocation)],
      ['Nearest hospital', clean(data.nearestHospital)],
      ['Assembly point', clean(data.assemblyPoint)],
      ['Fire extinguisher location', clean(data.fireExtinguisherLocation)],
      ['Site isolation point', clean(data.siteIsolationPoint)],
      ['PV shutdown', clean(data.pvShutdownInfo)],
      ['Battery shutdown', clean(data.batteryShutdownInfo)],
      ['EV shutdown', clean(data.evShutdownInfo)]
    ].filter(([, value]) => clean(value).length > 0),
    environmentalControls: buildEnvironmentalControls(data),
    monitoringReview: [
      'Review this RAMS if site conditions change.',
      'Review following an incident or near miss.',
      'Review if equipment, access or method changes.',
      'Supervisor to monitor controls and brief workforce.',
      'Stop work where controls are not suitable.',
      clean(data.monitoringReviewNotes)
    ].filter(Boolean),
    photos: data.photos.filter(photo => photo.includeInPdf),
    aiReview: data.hazards,
    signatures: [
      {label: 'Prepared by', name: clean(data.preparedBy), position: 'Prepared by', signature: clean(data.preparedSignature), date: clean(data.assessmentDate)},
      {label: 'Assessed by', name: clean(data.assessor), position: clean(data.assessorPosition), signature: clean(data.assessedSignature), date: clean(data.assessmentDate)},
      {label: 'Approved by', name: clean(data.approvalName || data.approvedBy), position: 'Approver', signature: clean(data.approvedSignature), date: clean(data.approvalDate)},
      {label: 'Client acknowledgement', name: clean(data.clientAcknowledgementName), position: 'Client', signature: clean(data.clientAcknowledgementSignature), date: clean(data.clientAcknowledgementDate)}
    ].filter(row => row.name || row.signature || row.label !== 'Client acknowledgement'),
    briefingRegister: data.briefingRegister,
    aiDisclaimer: 'AI-assisted observations were reviewed by the named competent assessor. AI output does not constitute approval of site safety and does not replace competent-person assessment.'
  };
}
