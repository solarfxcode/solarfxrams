import type {PpeMatrixItem, RamsData} from '@/types/rams';
import {
  getDefaultAcConnectionMethod,
  getDefaultAccessMethod,
  getDefaultBatteryMethod,
  getDefaultCommissioningHandoverMethod,
  getDefaultConsumerUnitMethod,
  getDefaultDcMethod,
  getDefaultDeliveryStorageMethod,
  getDefaultEpsBackupMethod,
  getDefaultEvMethod,
  getDefaultExternalCableRouteMethod,
  getDefaultGeneralMethod,
  getDefaultInverterMethod,
  getDefaultLoftMethod,
  getDefaultRoofMethod,
  getDefaultTrenchingMethod
} from '@/lib/rams/default-methods';

export const workTypes = [
  'Solar PV',
  'Battery storage',
  'EV charger',
  'EPS / backup',
  'Consumer unit work',
  'Trenching',
  'External cable route',
  'Roof work',
  'Loft work',
  'Scaffold',
  'Mobile tower',
  'MEWP',
  'Ladder access'
];

export const personsAtRiskOptions = [
  'Employees',
  'Subcontractors',
  'Client',
  'Occupants',
  'Visitors',
  'Members of the public',
  'Neighbours',
  'Vulnerable persons',
  'Other'
];

export const equipmentOptions = [
  'Ladders',
  'Scaffold',
  'Mobile tower',
  'MEWP',
  'Hand tools',
  'Cordless drills',
  'Torque tools',
  'Cable crimping tools',
  'Lifting equipment',
  'CAT and Genny',
  'Trenching tools',
  'Electrical test equipment',
  'Lock-off kit',
  'Fire extinguisher',
  'Spill kit',
  'Fall-restraint equipment',
  'Panel lifting equipment'
];

export const materialOptions = [
  'PV modules',
  'Mounting system',
  'Inverters',
  'Batteries',
  'EV charger',
  'AC cabling',
  'DC cabling',
  'Containment',
  'Isolators',
  'Protective devices',
  'Labelling',
  'Generation meter',
  'Fixings',
  'Earthing and bonding materials',
  'Trench ducting',
  'Marker tape',
  'Sand or suitable backfill'
];

export const ppeOptions = [
  'Safety helmet',
  'Safety footwear',
  'High-visibility clothing',
  'Protective gloves',
  'Safety glasses',
  'Hearing protection',
  'Dust mask / RPE',
  'Task-specific RPE',
  'Fall restraint / arrest equipment',
  'Weather-appropriate clothing',
  'Arc-rated PPE where assessed',
  'Knee protection',
  'Other'
];

const today = () => new Date().toISOString().slice(0, 10);

export function createDefaultPpeMatrix(systemTypes: string[] = ['Solar PV']): PpeMatrixItem[] {
  const has = (name: string) => systemTypes.includes(name);
  return [
    {item: 'Safety helmet', required: has('Roof work') || has('Scaffold') || has('Solar PV'), task: 'Head protection where materials, access equipment or roof work create falling-object risk.', applicableWorkTypes: ['Solar PV', 'Roof work', 'Scaffold', 'Mobile tower', 'MEWP']},
    {item: 'Safety footwear', required: true, task: 'General site work, deliveries, handling, electrical and external works.', applicableWorkTypes: ['General']},
    {item: 'High-visibility clothing', required: has('Trenching') || has('EV charger') || has('External cable route'), task: 'Vehicle interface, public areas, deliveries and external work areas.', applicableWorkTypes: ['Trenching', 'EV charger', 'External cable route']},
    {item: 'Protective gloves', required: true, task: 'Handling panels, batteries, containment, tools, fixings and waste.', applicableWorkTypes: ['General']},
    {item: 'Safety glasses', required: true, task: 'Drilling, cutting, overhead work, electrical work and dusty tasks.', applicableWorkTypes: ['General']},
    {item: 'Hearing protection', required: has('Trenching') || has('Consumer unit work') || has('EV charger'), task: 'Drilling, cutting, excavation tools and noisy task-specific work.', applicableWorkTypes: ['Trenching', 'Consumer unit work', 'EV charger']},
    {item: 'Dust mask / RPE', required: has('Loft work') || has('Consumer unit work'), task: 'Dusty loft, drilling and building-fabric tasks where dust cannot be controlled at source.', applicableWorkTypes: ['Loft work', 'Consumer unit work', 'Roof work']},
    {item: 'Task-specific RPE', required: false, task: 'Use when the site assessment identifies dust or respiratory hazards needing additional control.', applicableWorkTypes: ['Loft work', 'Building fabric']},
    {item: 'Fall restraint / arrest equipment', required: has('Roof work') || has('MEWP'), task: 'Where the access method or rescue plan requires restraint or arrest equipment.', applicableWorkTypes: ['Roof work', 'MEWP']},
    {item: 'Weather-appropriate clothing', required: has('Roof work') || has('Trenching') || has('External cable route'), task: 'External work, weather exposure and maintaining safe working condition.', applicableWorkTypes: ['Roof work', 'Trenching', 'External cable route']},
    {item: 'Arc-rated PPE where assessed', required: false, task: 'Only where electrical assessment identifies arc-flash or live-work risk. Live work is not planned by default.', applicableWorkTypes: ['Consumer unit work', 'AC connection']},
    {item: 'Knee protection', required: has('Loft work') || has('Consumer unit work'), task: 'Low-level, loft, floor or kneeling tasks.', applicableWorkTypes: ['Loft work', 'Consumer unit work']},
    {item: 'Other', required: false, task: 'Task-specific PPE recorded by the assessor.', applicableWorkTypes: ['General']}
  ];
}

export function createEmptyDraft(): RamsData {
  const date = today();
  return {
    projectReference: '',
    customerName: '',
    address: '',
    postcode: '',
    client: '',
    principalContractor: '',
    installationCompany: 'SolarFX',
    preparedBy: 'SolarFX',
    assessor: '',
    assessorPosition: '',
    siteSupervisor: '',
    qualifiedElectrician: '',
    numberOfOperatives: '',
    installDate: '',
    assessmentDate: date,
    reviewDate: date,
    revision: '1',
    approvedBy: '',
    documentStatus: 'Draft',
    revisionHistory: [{revision: '1', date, description: 'Initial issue', preparedBy: 'SolarFX', approvedBy: ''}],
    emergencyContact: '',
    emergencyPhone: '',
    scope: 'Installation, commissioning and handover of a site-specific SolarFX renewable energy system.',
    systemTypes: ['Solar PV'],
    panelQuantity: '',
    panelModel: '',
    inverterModel: '',
    batteryModel: '',
    proposedBatteryLocation: '',
    proposedEvLocation: '',
    roofType: '',
    roofCondition: '',
    accessNotes: '',
    electricalNotes: '',
    environmentalNotes: '',
    environmentalControlsNotes: '',
    monitoringReviewNotes: 'The RAMS will be reviewed if conditions change, following an incident or near miss, if equipment or methods change, or where the supervisor identifies that controls are no longer suitable.',
    methodStatement: getDefaultGeneralMethod(),
    deliveryStorageMethod: getDefaultDeliveryStorageMethod(),
    accessMethod: getDefaultAccessMethod(),
    roofWorkMethod: getDefaultRoofMethod(),
    dcInstallationMethod: getDefaultDcMethod(),
    inverterInstallationMethod: getDefaultInverterMethod(),
    batteryInstallationMethod: getDefaultBatteryMethod(),
    trenchingMethod: getDefaultTrenchingMethod(),
    evChargerInstallationMethod: getDefaultEvMethod(),
    consumerUnitMethod: getDefaultConsumerUnitMethod(),
    loftWorkMethod: getDefaultLoftMethod(),
    externalCableRouteMethod: getDefaultExternalCableRouteMethod(),
    epsBackupMethod: getDefaultEpsBackupMethod(),
    acConnectionMethod: getDefaultAcConnectionMethod(),
    commissioningHandoverMethod: getDefaultCommissioningHandoverMethod(),
    seniorReviewNotes: '',
    pvShutdownInfo: '',
    batteryShutdownInfo: '',
    evShutdownInfo: '',
    siteIsolationPoint: '',
    firstAider: '',
    firstAidKitLocation: '',
    nearestHospital: '',
    assemblyPoint: '',
    fireExtinguisherLocation: '',
    approvalName: '',
    approvalDate: date,
    preparedSignature: '',
    assessedSignature: '',
    approvedSignature: '',
    clientAcknowledgementName: '',
    clientAcknowledgementSignature: '',
    clientAcknowledgementDate: '',
    personsAtRisk: ['Employees', 'Client', 'Occupants'],
    otherPersonsAtRisk: '',
    equipment: ['Hand tools', 'Cordless drills', 'Electrical test equipment', 'Lock-off kit', 'Fire extinguisher'],
    equipmentNotes: '',
    materials: ['PV modules', 'Mounting system', 'Inverters', 'AC cabling', 'DC cabling', 'Isolators', 'Labelling', 'Fixings'],
    materialNotes: '',
    ppe: ['Safety helmet', 'Safety footwear', 'Protective gloves', 'Safety glasses'],
    ppeNotes: '',
    ppeMatrix: createDefaultPpeMatrix(['Solar PV']),
    photos: [],
    hazards: [],
    risks: [],
    briefingRegister: [],
    declarations: {
      siteReviewed: false,
      importVerified: false,
      controlsAvailable: false,
      aiReviewed: false,
      briefing: false,
      changeReview: false
    }
  };
}

export const defaultRams: RamsData = createEmptyDraft();
