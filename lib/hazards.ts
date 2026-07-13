import type {HazardLibraryEntry, RiskRow} from '@/types/rams';

function hazard(
  code: string,
  category: string,
  activity: string,
  hazardText: string,
  potentialHarm: string,
  defaultControls: string[],
  applicableWorkTypes: string[],
  recommendedMethodSection: string,
  recommendedPpe: string[] = ['Safety footwear', 'Protective gloves', 'Safety glasses'],
  photoEvidenceUseful = false,
  additionalControls: string[] = ['Confirm controls remain suitable for the site conditions before work starts.'],
  responsibleRole = 'Site Supervisor'
): HazardLibraryEntry {
  return {
    code,
    category,
    activity,
    hazard: hazardText,
    potentialHarm,
    personsAtRisk: ['Employees', 'Subcontractors', 'Client', 'Occupants', 'Visitors', 'Members of the public'],
    defaultControls,
    additionalControls,
    responsibleRole,
    applicableWorkTypes,
    recommendedPpe,
    recommendedMethodSection,
    photoEvidenceUseful
  };
}

export const hazardLibrary: HazardLibraryEntry[] = [
  hazard('GEN-001', 'General', 'Site access and egress', 'Restricted or unsafe site access and egress', 'Slips, trips, falls, obstruction of emergency access or unauthorised entry', ['Agree safe access route', 'Keep emergency routes clear', 'Use barriers or signage where public interface exists'], ['General'], 'General method', ['Safety footwear', 'High-visibility clothing'], true),
  hazard('GEN-002', 'General', 'Housekeeping', 'Slips, trips and falls from poor housekeeping', 'Sprains, fractures or impact injury', ['Keep work areas tidy', 'Route cables safely', 'Clear waste progressively'], ['General'], 'General method'),
  hazard('GEN-003', 'General', 'Public interface', 'Members of the public or occupants entering the work area', 'Impact, falling-object injury or exposure to work activities', ['Set exclusion zones', 'Use signage', 'Brief client on restricted areas'], ['General', 'EV charger', 'Trenching', 'External cable route'], 'General method', ['High-visibility clothing'], true),
  hazard('GEN-004', 'General', 'Occupied premises', 'Work in occupied homes or commercial premises', 'Injury to occupants, vulnerable persons or visitors', ['Agree access restrictions', 'Maintain communication with occupier', 'Secure tools and materials'], ['General'], 'General method'),
  hazard('GEN-005', 'General', 'Material storage', 'Poorly stored panels, batteries, cables or equipment', 'Manual-handling injury, trip hazards or damage to equipment', ['Use designated storage area', 'Keep stacks stable', 'Protect from weather and public access'], ['General', 'Solar PV', 'Battery storage', 'EV charger'], 'Delivery and storage', ['Safety footwear', 'Protective gloves'], true),
  hazard('GEN-006', 'General', 'Vehicle movements', 'Delivery vehicles or site vehicles near operatives or public', 'Collision, crush injury or property damage', ['Use agreed delivery area', 'Use banksman where needed', 'Keep pedestrians segregated'], ['General', 'Trenching'], 'Delivery and storage', ['High-visibility clothing', 'Safety footwear'], true),
  hazard('GEN-007', 'General', 'Adverse weather', 'High winds, rain, ice or lightning affecting external work', 'Falls, dropped materials, electric shock or loss of control', ['Monitor weather', 'Stop roof or external work when unsafe', 'Secure materials'], ['General', 'Solar PV', 'Roof work', 'Trenching', 'External cable route', 'EV charger'], 'General method', ['Weather-appropriate clothing'], true),
  hazard('GEN-008', 'General', 'Noise and vibration', 'Noise from drilling, cutting or excavation tools', 'Hearing damage or disturbance to occupants and neighbours', ['Select low-noise methods where possible', 'Use hearing protection where assessed', 'Limit duration'], ['General', 'Trenching', 'EV charger', 'Consumer unit work'], 'General method', ['Hearing protection']),
  hazard('GEN-009', 'General', 'Waste and packaging', 'Waste creating trip, fire or environmental hazards', 'Injury, pollution or poor housekeeping', ['Segregate waste', 'Remove packaging', 'Recycle where practicable'], ['General'], 'General method'),
  hazard('GEN-010', 'General', 'Fire', 'Fire from electrical equipment, hot work or combustible storage', 'Burns, smoke inhalation, property damage or evacuation', ['Keep ignition sources controlled', 'Maintain extinguishers where assessed', 'Keep escape routes clear'], ['General', 'Battery storage', 'Solar PV', 'EV charger'], 'Emergency arrangements', ['Safety glasses', 'Protective gloves'], true),
  hazard('WAH-001', 'Working at height', 'Pitched roof work', 'Fall from pitched roof edge or roof surface', 'Major injury or fatality', ['Use suitable access equipment', 'Maintain edge protection where required', 'Stop work in unsafe weather'], ['Solar PV', 'Roof work'], 'Roof work method', ['Safety helmet', 'Fall restraint / arrest equipment', 'Weather-appropriate clothing'], true),
  hazard('WAH-002', 'Working at height', 'Flat roof edges', 'Fall from unprotected flat roof edge', 'Major injury or fatality', ['Assess edge protection', 'Maintain exclusion zone below', 'Use competent operatives'], ['Solar PV', 'Roof work'], 'Roof work method', ['Safety helmet', 'Fall restraint / arrest equipment'], true),
  hazard('WAH-003', 'Working at height', 'Fragile roof or rooflights', 'Fall through fragile roof, rooflight or weak covering', 'Major injury or fatality', ['Identify fragile areas', 'Prevent access onto fragile surfaces', 'Use suitable staging or protection'], ['Solar PV', 'Roof work'], 'Roof work method', ['Safety helmet', 'Fall restraint / arrest equipment'], true),
  hazard('WAH-004', 'Working at height', 'Ladder positioning', 'Ladder slip, overreach or poor footing', 'Fall causing injury', ['Inspect ladders', 'Secure or foot ladder where required', 'Maintain three points of contact'], ['Ladder access', 'Roof work'], 'Access method', ['Safety helmet', 'Safety footwear'], true),
  hazard('WAH-005', 'Working at height', 'Scaffold access', 'Unsafe scaffold, missing handover or unauthorised alteration', 'Falls or falling materials', ['Check scaffold handover', 'Inspect access before use', 'Do not alter scaffold'], ['Scaffold', 'Roof work', 'Solar PV'], 'Access method', ['Safety helmet', 'Safety footwear'], true),
  hazard('WAH-006', 'Working at height', 'Mobile tower or MEWP', 'Incorrect tower or MEWP setup and use', 'Fall, overturning or crush injury', ['Use competent operators', 'Inspect equipment', 'Set up on suitable ground'], ['Mobile tower', 'MEWP'], 'Access method', ['Safety helmet', 'Fall restraint / arrest equipment'], true),
  hazard('WAH-007', 'Working at height', 'Falling objects and dropped tools', 'Tools or materials falling from height', 'Head injury, impact injury or property damage', ['Use exclusion zone', 'Secure tools', 'Control lifting and lowering'], ['Solar PV', 'Roof work', 'Scaffold', 'Mobile tower', 'MEWP'], 'Roof work method', ['Safety helmet', 'Safety footwear'], true),
  hazard('MAN-001', 'Manual handling', 'Solar panel handling', 'Manual handling of large PV modules', 'Musculoskeletal injury, cuts or dropped load', ['Plan lifts', 'Use team handling', 'Avoid lifting in high winds'], ['Solar PV', 'Roof work'], 'Delivery and storage', ['Protective gloves', 'Safety footwear'], true),
  hazard('MAN-002', 'Manual handling', 'Inverter handling', 'Manual handling of inverter or electrical equipment', 'Strains, dropped load or damage', ['Check weight and route', 'Use team lift where required', 'Keep route clear'], ['Solar PV'], 'Inverter installation method', ['Protective gloves', 'Safety footwear']),
  hazard('MAN-003', 'Manual handling', 'Battery handling', 'Manual handling of battery modules or cabinets', 'Serious strain, crush injury or dropped load', ['Check manufacturer weight', 'Use team lift or mechanical aid', 'Protect escape routes'], ['Battery storage'], 'Battery installation method', ['Protective gloves', 'Safety footwear'], true),
  hazard('MAN-004', 'Manual handling', 'Awkward or restricted lifting route', 'Restricted access causing poor posture or dropped load', 'Musculoskeletal injury or impact injury', ['Survey route', 'Remove obstacles', 'Use staged lifting plan'], ['General', 'Battery storage', 'Solar PV', 'Loft work'], 'Delivery and storage'),
  hazard('ELEC-001', 'Electrical', 'Existing live equipment', 'Contact with live electrical equipment', 'Electric shock, burns or fire', ['Safe isolation', 'Lock off and prove dead', 'Qualified electrician only'], ['Solar PV', 'Battery storage', 'EV charger', 'Consumer unit work', 'EPS / backup'], 'AC connection method', ['Safety glasses', 'Arc-rated PPE where assessed'], true),
  hazard('ELEC-002', 'Electrical', 'Safe isolation and lock-off', 'Failure to isolate or accidental re-energisation', 'Electric shock, burns or fatality', ['Use lock-off kit', 'Prove dead', 'Control keys and warning labels'], ['Solar PV', 'Battery storage', 'EV charger', 'Consumer unit work', 'EPS / backup'], 'AC connection method', ['Safety glasses', 'Protective gloves'], true),
  hazard('ELEC-003', 'Electrical', 'DC voltage from modules', 'PV modules producing DC voltage during daylight', 'Electric shock, burns or fire', ['Control DC connectors', 'Check polarity', 'Use DC isolators and labelling'], ['Solar PV'], 'DC installation method', ['Safety glasses', 'Protective gloves'], true),
  hazard('ELEC-004', 'Electrical', 'Cable damage', 'Damaged AC or DC cable during routing or fixing', 'Electric shock, fire or system failure', ['Protect cables', 'Avoid sharp edges', 'Use suitable containment and supports'], ['Solar PV', 'EV charger', 'External cable route', 'Trenching'], 'External cable route method', ['Protective gloves', 'Safety glasses'], true),
  hazard('ELEC-005', 'Electrical', 'Overhead cables', 'Contact with overhead electrical services', 'Electric shock or fatality', ['Identify overhead services', 'Maintain safe clearance', 'Do not handle long conductive items near cables'], ['Roof work', 'Scaffold', 'MEWP', 'Trenching'], 'Access method', ['Safety helmet', 'High-visibility clothing'], true),
  hazard('ELEC-006', 'Electrical', 'Underground cables', 'Contact with buried electrical services', 'Electric shock, explosion or service interruption', ['Review plans', 'Scan route', 'Use safe digging methods'], ['Trenching', 'External cable route', 'EV charger'], 'Trenching method', ['High-visibility clothing', 'Safety footwear'], true),
  hazard('ELEC-007', 'Electrical', 'Incorrect polarity or termination', 'Incorrect electrical connection', 'Electric shock, fire, equipment damage or system failure', ['Qualified electrician', 'Verify polarity', 'Follow manufacturer instructions'], ['Solar PV', 'Battery storage', 'EV charger', 'Consumer unit work'], 'Commissioning and handover', ['Safety glasses', 'Protective gloves']),
  hazard('BAT-001', 'Battery', 'Battery mounting', 'Unsuitable battery mounting surface or bracket', 'Dropped battery, fire risk or blocked escape route', ['Use manufacturer-approved mounting', 'Assess surface', 'Maintain access and escape routes'], ['Battery storage'], 'Battery installation method', ['Safety footwear', 'Protective gloves'], true),
  hazard('BAT-002', 'Battery', 'Clearances and ventilation', 'Restricted clearances, ventilation or access around battery', 'Overheating, access restriction or emergency response delay', ['Follow manufacturer clearances', 'Maintain ventilation', 'Keep shutdown accessible'], ['Battery storage'], 'Battery installation method', ['Safety glasses'], true),
  hazard('BAT-003', 'Battery', 'Thermal event or damaged battery', 'Battery heating, smoke, fire or electrolyte release', 'Burns, smoke inhalation, fire spread or evacuation', ['Do not install damaged battery', 'Isolate if safe', 'Follow manufacturer emergency information'], ['Battery storage'], 'Emergency arrangements', ['Safety glasses', 'Protective gloves'], true),
  hazard('BAT-004', 'Battery', 'Combustible materials nearby', 'Battery located near combustible storage or ignition source', 'Fire spread or blocked emergency access', ['Assess location', 'Keep area clear', 'Record site-specific controls'], ['Battery storage'], 'Battery installation method', ['Safety footwear'], true),
  hazard('EV-001', 'EV charger', 'Vehicle and pedestrian interface', 'Charger installation near vehicles or public routes', 'Impact injury, trip hazard or damage to charger', ['Agree exclusion zone', 'Control vehicle movements', 'Assess impact protection'], ['EV charger'], 'EV charger installation method', ['High-visibility clothing', 'Safety footwear'], true),
  hazard('EV-002', 'EV charger', 'External cable route', 'EV cable route crossing external or public areas', 'Trip hazard, cable damage or weather exposure', ['Protect and support cables', 'Avoid trip routes', 'Seal penetrations'], ['EV charger', 'External cable route'], 'External cable route method', ['Safety glasses', 'Protective gloves'], true),
  hazard('EV-003', 'EV charger', 'Wall drilling', 'Drilling into hidden services or unsuitable wall fabric', 'Electric shock, water damage, dust or structural damage', ['Check for services', 'Use controlled drilling', 'Wear eye protection'], ['EV charger'], 'EV charger installation method', ['Safety glasses', 'Dust mask / RPE']),
  hazard('EV-004', 'EV charger', 'Weather exposure', 'Charger or connection exposed to unsuitable weather during installation', 'Electric shock, equipment damage or commissioning failure', ['Check weather', 'Protect equipment', 'Follow manufacturer instructions'], ['EV charger'], 'EV charger installation method', ['Weather-appropriate clothing'], true),
  hazard('TRN-001', 'Trenching', 'Underground services', 'Striking gas, electric, water or telecoms services', 'Explosion, electric shock, flood, service outage or fatality', ['Review service plans', 'Scan using CAT and Genny', 'Mark route before excavation'], ['Trenching'], 'Trenching method', ['High-visibility clothing', 'Safety footwear'], true),
  hazard('TRN-002', 'Trenching', 'Excavation collapse', 'Collapse of excavation sides or unstable ground', 'Crush injury, entrapment or fall', ['Control trench depth', 'Keep spoil back', 'Do not enter unsafe excavation'], ['Trenching'], 'Trenching method', ['Safety footwear', 'High-visibility clothing'], true),
  hazard('TRN-003', 'Trenching', 'Open trench', 'Open excavation left accessible to occupants or public', 'Falls, trips or unauthorised access', ['Barrier excavation', 'Cover or backfill where possible', 'Maintain lighting/signage'], ['Trenching'], 'Trenching method', ['High-visibility clothing'], true),
  hazard('TRN-004', 'Trenching', 'Spoil storage and reinstatement', 'Poor spoil storage or incomplete reinstatement', 'Trip hazards, blocked drainage or property damage', ['Store spoil safely', 'Keep access clear', 'Reinstate and inspect surface'], ['Trenching'], 'Trenching method', ['Safety footwear']),
  hazard('BLD-001', 'Building fabric', 'Suspected asbestos', 'Disturbing asbestos-containing material', 'Exposure to hazardous fibres', ['Review asbestos information', 'Do not disturb suspect material', 'Stop work and escalate'], ['General', 'Consumer unit work', 'Loft work', 'Roof work'], 'General method', ['Task-specific RPE'], true),
  hazard('BLD-002', 'Building fabric', 'Silica and drilling dust', 'Dust from drilling masonry, brick or concrete', 'Respiratory irritation or long-term ill health', ['Use dust control', 'Wear suitable RPE where assessed', 'Clean as work progresses'], ['EV charger', 'Consumer unit work', 'External cable route'], 'External cable route method', ['Dust mask / RPE', 'Safety glasses']),
  hazard('BLD-003', 'Building fabric', 'Loft access and restricted space', 'Unsafe loft access, poor boarding, heat or fragile ceiling', 'Falls, heat stress, cuts or ceiling damage', ['Check access and boarding', 'Use lighting', 'Avoid stepping on unsupported ceiling'], ['Loft work'], 'Loft work method', ['Dust mask / RPE', 'Knee protection'], true),
  hazard('BLD-004', 'Building fabric', 'Hidden services', 'Drilling or fixing into hidden cables, pipes or structural elements', 'Electric shock, water damage or structural damage', ['Check before drilling', 'Use detection equipment where required', 'Stop if services are suspected'], ['EV charger', 'External cable route', 'Consumer unit work', 'Battery storage'], 'External cable route method', ['Safety glasses']),
  hazard('TLS-001', 'Tools', 'Power tools and drilling', 'Incorrect use of drills, cutting tools or battery tools', 'Cuts, eye injury, noise, dust or electric shock', ['Use competent operators', 'Inspect tools', 'Use guards and task PPE'], ['General', 'Solar PV', 'EV charger', 'Consumer unit work', 'Trenching'], 'General method', ['Safety glasses', 'Hearing protection', 'Protective gloves']),
  hazard('TLS-002', 'Tools', 'Hand tools', 'Cuts, punctures or dropped hand tools', 'Minor to serious injury or property damage', ['Use suitable tools', 'Keep tools controlled', 'Store safely when not in use'], ['General'], 'General method', ['Protective gloves', 'Safety glasses']),
  hazard('EPS-001', 'EPS / backup', 'Backup circuit separation', 'Incorrect separation or labelling of backup circuits', 'Electric shock, unintended energisation or client misuse', ['Identify circuits', 'Maintain separation', 'Label clearly and brief client'], ['EPS / backup'], 'EPS / backup method', ['Safety glasses', 'Protective gloves']),
  hazard('CU-001', 'Consumer unit work', 'Restricted consumer unit access', 'Poor access, congested wiring or working position at consumer unit', 'Electric shock, manual-handling strain or poor workmanship', ['Clear access', 'Use safe isolation', 'Qualified electrician only'], ['Consumer unit work', 'Solar PV', 'EV charger', 'Battery storage'], 'Consumer unit method', ['Safety glasses', 'Arc-rated PPE where assessed'], true)
];

const alwaysRelevant = (entry: HazardLibraryEntry) => entry.applicableWorkTypes.includes('General');

export function getRecommendedHazardsForWorkTypes(workTypes: string[]) {
  return hazardLibrary.filter(entry => alwaysRelevant(entry) || entry.applicableWorkTypes.some(workType => workTypes.includes(workType)));
}

export function recommendedRiskRowsForWorkTypes(workTypes: string[]): Omit<RiskRow, 'id'>[] {
  return getRecommendedHazardsForWorkTypes(workTypes).map(entry => ({
    code: entry.code,
    category: entry.category,
    activity: entry.activity,
    hazard: entry.hazard,
    harm: entry.potentialHarm,
    persons: entry.personsAtRisk.join(' / '),
    controls: entry.defaultControls.join('; '),
    additionalControls: entry.additionalControls.join('; '),
    severity: 0,
    likelihood: 0,
    residualSeverity: 0,
    residualLikelihood: 0,
    responsible: entry.responsibleRole,
    source: 'library:' + entry.code,
    assessorNotes: '',
    recommendedPpe: entry.recommendedPpe,
    recommendedMethodSection: entry.recommendedMethodSection,
    photoEvidenceUseful: entry.photoEvidenceUseful
  }));
}
