import type {RamsData} from '@/types/rams';

export type MethodField =
  | 'methodStatement'
  | 'deliveryStorageMethod'
  | 'accessMethod'
  | 'roofWorkMethod'
  | 'dcInstallationMethod'
  | 'inverterInstallationMethod'
  | 'batteryInstallationMethod'
  | 'evChargerInstallationMethod'
  | 'trenchingMethod'
  | 'consumerUnitMethod'
  | 'loftWorkMethod'
  | 'externalCableRouteMethod'
  | 'epsBackupMethod'
  | 'acConnectionMethod'
  | 'commissioningHandoverMethod';

export type MethodSectionDefinition = {
  field: MethodField;
  id: string;
  heading: string;
  description: string;
  workTypes: string[];
  always?: boolean;
  getDefault: (draft?: Partial<RamsData>) => string;
};

export function getDefaultGeneralMethod() {
  return [
    'Pre-start planning will be completed before attendance. The supervisor will confirm the scope, access arrangements, welfare, emergency arrangements, weather conditions and any client restrictions.',
    'On arrival, operatives will sign in where required, complete a site induction or briefing, review this RAMS and confirm the safe system of work remains suitable.',
    'Exclusion zones, material storage areas and housekeeping expectations will be agreed before work starts. Work will stop if site conditions change or an unassessed hazard is identified.',
    'The site supervisor will complete daily monitoring and brief the workforce on any changes before work resumes.'
  ].join('\n\n');
}

export function getDefaultDeliveryStorageMethod() {
  return [
    'Deliveries will be directed to an agreed safe area that does not obstruct emergency access, public routes or client access.',
    'Materials will be inspected for damage on arrival. Damaged panels, batteries, chargers or electrical equipment will be quarantined and reported.',
    'Panels, batteries and equipment will be stored securely on stable ground, protected from weather and arranged to avoid manual-handling hazards.',
    'Manual handling will be planned before lifting. Team lifting or mechanical aids will be used where weight, size or route restrictions require them.'
  ].join('\n\n');
}

export function getDefaultAccessMethod() {
  return [
    'Access equipment will be selected to suit the work area and inspected before use. Scaffold, mobile towers, ladders or MEWPs will only be used by competent persons.',
    'Access routes will be kept clear and protected from slips, trips and public interface. Edge protection, ladder ties, tower stabilisers or MEWP controls will be used where required.',
    'Material lifting routes will be controlled and exclusion zones will be maintained below work areas.'
  ].join('\n\n');
}

export function getDefaultRoofMethod() {
  return [
    'The roof area will be visually checked before work starts. Fragile areas, rooflights, damaged coverings and restricted access points will be identified and controlled.',
    'Mounting positions will be set out in accordance with the design and manufacturer instructions. Fixings, brackets and rails will be installed without compromising weatherproofing.',
    'Panels will be lifted using the agreed method, secured promptly and managed to prevent dropped tools, falling materials or wind uplift.',
    'Roof cable routes will be supported, protected from abrasion and kept away from sharp edges or water traps.'
  ].join('\n\n');
}

export function getDefaultDcMethod() {
  return [
    'DC installation will be completed by competent operatives using compatible connectors and manufacturer-approved installation practices.',
    'Polarity will be controlled before connection. DC cables will be supported, protected from abrasion, separated where required and labelled clearly.',
    'Live connector contact will be prevented. DC isolators and labelling will be installed in accordance with the design and manufacturer instructions.'
  ].join('\n\n');
}

export function getDefaultInverterMethod() {
  return [
    'The inverter location will be checked for access, mounting suitability, ventilation and manufacturer clearance requirements.',
    'The inverter will be mounted in accordance with manufacturer instructions. Cable routes, isolators and labels will be installed to maintain safe access for operation and maintenance.',
    'Connections will remain isolated until the controlled commissioning stage.'
  ].join('\n\n');
}

export function getDefaultBatteryMethod() {
  return [
    'Battery delivery and condition will be checked before installation. Damaged, swollen, leaking or suspect batteries will not be installed and will be escalated.',
    'Manual handling will be planned using team lifting or mechanical aid where required. The battery will be installed using manufacturer-approved mounting, whether floor or wall mounted.',
    'The mounting surface will be assessed for suitability, including non-combustible or appropriate backing where required by the job assessment or manufacturer information.',
    'Manufacturer clearances, ventilation requirements, escape routes, shutdown access and protection from impact will be maintained. No arbitrary fixed clearance values will be used unless confirmed by the manufacturer information for the job.',
    'The battery will remain isolated before connection. Commissioning, shutdown instructions, fire response information and client handover will be completed before leaving site.'
  ].join('\n\n');
}

export function getDefaultEvMethod() {
  return [
    'The agreed charger mounting position will be confirmed before work starts, including safe access, cable route, weather exposure and the potential for vehicle or public impact.',
    'Drilling locations will be checked for hidden services. Cable containment, penetrations and external supports will be installed to protect the route and prevent trip hazards.',
    'The supply will be safely isolated before connection. Protective devices, labelling, functional checks, commissioning, shutdown procedure and client handover will be completed in accordance with manufacturer instructions.'
  ].join('\n\n');
}

export function getDefaultTrenchingMethod() {
  return [
    'Service plans and site information will be reviewed before excavation. The route will be scanned with suitable detection equipment and marked before digging.',
    'Permit-to-dig arrangements will be followed where applicable. Excavation will be controlled, with trench barriers, public protection and safe spoil storage maintained.',
    'Cable or duct will be installed as designed, warning tape will be placed where required, and the trench will be backfilled, reinstated and inspected before handover.'
  ].join('\n\n');
}

export function getDefaultConsumerUnitMethod() {
  return [
    'The consumer unit and surrounding installation will be assessed before work starts. Safe isolation, lock-off and prove-dead checks will be completed before covers are removed.',
    'Circuits will be identified and protected from accidental energisation. Installation, containment, terminations and protective devices will be completed by a qualified electrician.',
    'Labelling, restoration of supply and client handover will be completed after the work area has been made safe.'
  ].join('\n\n');
}

export function getDefaultLoftMethod() {
  return [
    'Loft access will be assessed for safe entry, lighting, boarding, fragile ceiling risk, heat, dust and restricted space.',
    'Operatives will use suitable lighting and access equipment. Cable routes will be planned to avoid damage, trip hazards and unsupported cables.',
    'Housekeeping will be maintained and access hatches will remain protected while work is in progress.'
  ].join('\n\n');
}

export function getDefaultExternalCableRouteMethod() {
  return [
    'The external cable route will be inspected before installation, including public interface, trip hazards, UV exposure, penetrations and mechanical protection requirements.',
    'Cables will be supported, protected and sealed at penetrations. Routes through public or occupied areas will be controlled and left safe at the end of each shift.'
  ].join('\n\n');
}

export function getDefaultEpsBackupMethod() {
  return [
    'EPS or backup circuits will be identified before installation. Separation, isolation, labelling and critical-load board arrangements will be confirmed against the design.',
    'Functional checks will be completed and the client will be briefed on limitations, shutdown and safe operation.'
  ].join('\n\n');
}

export function getDefaultAcConnectionMethod() {
  return [
    'AC connection work will be carried out by a qualified electrician. Safe isolation, lock-off and prove-dead checks will be completed before work starts.',
    'Containment, cable termination, protective devices and labelling will be installed to the design and manufacturer instructions. Supply restoration will be controlled and communicated.'
  ].join('\n\n');
}

export function getDefaultCommissioningHandoverMethod() {
  return [
    'Commissioning will include visual inspection, manufacturer commissioning steps, functional checks, labelling, monitoring setup and confirmation that protective devices are restored correctly.',
    'The client will be shown the shutdown procedure, operating information, manuals, warranties and emergency information. PV electrical test result schedules are not part of this RAMS application.'
  ].join('\n\n');
}

export const methodSectionDefinitions: MethodSectionDefinition[] = [
  {field: 'methodStatement', id: 'field-method-statement', heading: 'General method', description: 'Pre-start planning, induction, toolbox talk, welfare, exclusion zones, storage, weather checks, housekeeping and daily review.', workTypes: [], always: true, getDefault: getDefaultGeneralMethod},
  {field: 'deliveryStorageMethod', id: 'delivery-storage-method', heading: 'Delivery and storage', description: 'Delivery area, damage inspection, secure storage and manual handling plan.', workTypes: [], always: true, getDefault: getDefaultDeliveryStorageMethod},
  {field: 'accessMethod', id: 'access-method', heading: 'Access method', description: 'Scaffold, ladder, tower, MEWP, edge protection, access route and material lifting controls.', workTypes: ['Roof work', 'Scaffold', 'Mobile tower', 'MEWP', 'Ladder access'], getDefault: getDefaultAccessMethod},
  {field: 'roofWorkMethod', id: 'roof-work-method', heading: 'Roof work method', description: 'Roof inspection, fragile areas, rooflights, mounting, rails, panel lifting and cable management.', workTypes: ['Solar PV', 'Roof work'], getDefault: getDefaultRoofMethod},
  {field: 'dcInstallationMethod', id: 'dc-installation-method', heading: 'DC installation method', description: 'Module interconnection, polarity controls, cable support, separation, labelling and isolators.', workTypes: ['Solar PV'], getDefault: getDefaultDcMethod},
  {field: 'inverterInstallationMethod', id: 'inverter-installation-method', heading: 'Inverter installation method', description: 'Location, clearances, mounting, ventilation, access, routes, isolators and labelling.', workTypes: ['Solar PV'], getDefault: getDefaultInverterMethod},
  {field: 'batteryInstallationMethod', id: 'battery-installation-method', heading: 'Battery installation method', description: 'Battery inspection, handling, mounting, clearances, ventilation, escape routes, isolation, commissioning and emergency arrangements.', workTypes: ['Battery storage'], getDefault: getDefaultBatteryMethod},
  {field: 'evChargerInstallationMethod', id: 'ev-charger-installation-method', heading: 'EV charger installation method', description: 'Mounting position, access, cable route, drilling checks, isolation, connection, commissioning and handover.', workTypes: ['EV charger'], getDefault: getDefaultEvMethod},
  {field: 'trenchingMethod', id: 'trenching-method', heading: 'Trenching method', description: 'Service plans, route scanning, route marking, controlled excavation, barriers, ducting, warning tape, backfill and reinstatement.', workTypes: ['Trenching'], getDefault: getDefaultTrenchingMethod},
  {field: 'consumerUnitMethod', id: 'consumer-unit-method', heading: 'Consumer unit method', description: 'Assessment, safe isolation, lock-off, prove dead, circuit identification, installation, labelling and handover.', workTypes: ['Consumer unit work'], getDefault: getDefaultConsumerUnitMethod},
  {field: 'loftWorkMethod', id: 'loft-work-method', heading: 'Loft work method', description: 'Access, lighting, boarding, fragile ceilings, heat, dust, cable routes, restricted space and housekeeping.', workTypes: ['Loft work'], getDefault: getDefaultLoftMethod},
  {field: 'externalCableRouteMethod', id: 'external-cable-route-method', heading: 'External cable route method', description: 'Route inspection, mechanical protection, UV exposure, penetrations, sealing, support, public areas and trip hazards.', workTypes: ['External cable route', 'EV charger'], getDefault: getDefaultExternalCableRouteMethod},
  {field: 'epsBackupMethod', id: 'eps-backup-method', heading: 'EPS / backup method', description: 'Circuit identification, separation, critical-load board, isolation, labelling, functional check and client explanation.', workTypes: ['EPS / backup'], getDefault: getDefaultEpsBackupMethod},
  {field: 'acConnectionMethod', id: 'ac-connection-method', heading: 'AC connection method', description: 'Safe isolation, lock-off, consumer unit work, containment, cable termination, protective devices, labelling and restoration.', workTypes: ['Solar PV', 'Battery storage', 'EV charger', 'EPS / backup', 'Consumer unit work'], getDefault: getDefaultAcConnectionMethod},
  {field: 'commissioningHandoverMethod', id: 'commissioning-handover-method', heading: 'Commissioning and handover', description: 'Visual inspection, manufacturer commissioning, functional checks, labelling, monitoring setup, shutdown demonstration and handover.', workTypes: [], always: true, getDefault: getDefaultCommissioningHandoverMethod}
];

export function methodSectionApplies(section: MethodSectionDefinition, draft: Partial<RamsData>) {
  if (section.always) return true;
  const selected = Array.isArray(draft.systemTypes) ? draft.systemTypes : [];
  return section.workTypes.some(workType => selected.includes(workType));
}

export function getMethodSectionsForDraft(draft: Partial<RamsData>) {
  return methodSectionDefinitions.filter(section => methodSectionApplies(section, draft));
}

export function getDefaultMethodByField(field: MethodField, draft?: Partial<RamsData>) {
  return methodSectionDefinitions.find(section => section.field === field)?.getDefault(draft) || '';
}
