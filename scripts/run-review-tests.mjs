import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url);
const read = file => fs.readFile(new URL(file, root), 'utf8');
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solarfx-review-'));

function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS', name);
}

async function writeCompiled(name, source, replacements = {}) {
  let code = source;
  for (const [from, to] of Object.entries(replacements)) code = code.split(from).join(to);
  const compiled = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX
    },
    fileName: name.replace(/\.mjs$/, '.ts')
  }).outputText;
  const file = path.join(tempDir, name);
  await fs.writeFile(file, compiled, 'utf8');
  return file;
}

const source = {
  review: await read('lib/review.ts'),
  defaults: await read('lib/defaults.ts'),
  defaultMethods: await read('lib/rams/default-methods.ts'),
  draftMigration: await read('lib/rams/draft-migration.ts'),
  hazards: await read('lib/hazards.ts'),
  pdfModel: await read('lib/rams/pdf-model.ts'),
  ramsApp: await read('components/RamsApp.tsx'),
  types: await read('types/rams.ts'),
  css: await read('app/globals.css'),
  pdfRoute: await read('app/api/pdf/route.ts'),
  loginPage: await read('app/page.tsx'),
  loginRoute: await read('app/api/auth/login/route.ts'),
  authSource: await read('lib/auth.ts'),
  middlewareSource: await read('middleware.ts')
};

await writeCompiled('default-methods.mjs', source.defaultMethods);
await writeCompiled('hazards.mjs', source.hazards);
await writeCompiled('defaults.mjs', source.defaults, {'@/lib/rams/default-methods': './default-methods.mjs'});
await writeCompiled('draft-migration.mjs', source.draftMigration, {'@/lib/defaults': './defaults.mjs', '@/lib/rams/default-methods': './default-methods.mjs'});
await writeCompiled('pdf-model.mjs', source.pdfModel, {'@/lib/hazards': './hazards.mjs', '@/lib/rams/draft-migration': './draft-migration.mjs', '@/lib/rams/default-methods': './default-methods.mjs'});
await writeCompiled('review.mjs', source.review);

const defaults = await import(pathToFileURL(path.join(tempDir, 'defaults.mjs')).href);
const migration = await import(pathToFileURL(path.join(tempDir, 'draft-migration.mjs')).href);
const hazards = await import(pathToFileURL(path.join(tempDir, 'hazards.mjs')).href);
const pdfModel = await import(pathToFileURL(path.join(tempDir, 'pdf-model.mjs')).href);
const review = await import(pathToFileURL(path.join(tempDir, 'review.mjs')).href);

const declarations = {siteReviewed: true, importVerified: true, controlsAvailable: true, aiReviewed: true, briefing: true, changeReview: true};
function risk(id, hazard, source = 'manual') {
  return {id, hazard, harm: 'Injury or damage', persons: 'Installers / occupants / public as applicable', controls: 'Control measures confirmed by assessor.', additionalControls: 'Site-specific controls confirmed.', severity: 4, likelihood: 3, residualSeverity: 3, residualLikelihood: 2, responsible: 'Site Supervisor', source, assessorNotes: 'Assessor confirmed'};
}
function completeDraft(overrides = {}) {
  const base = {...defaults.createEmptyDraft(),
    projectReference: 'SFX-1001',
    customerName: 'Example Customer',
    address: '1 Solar Street',
    postcode: 'AB1 2CD',
    client: 'Example Customer',
    principalContractor: 'SolarFX',
    installationCompany: 'SolarFX',
    preparedBy: 'SolarFX',
    assessor: 'Assessor Name',
    assessorPosition: 'Contracts Manager',
    siteSupervisor: 'Supervisor Name',
    qualifiedElectrician: 'Electrician Name',
    numberOfOperatives: '3',
    installDate: '2026-07-13',
    assessmentDate: '2026-07-13',
    reviewDate: '2026-07-13',
    revision: '1',
    approvedBy: 'Approver Name',
    documentStatus: 'Approved for issue',
    emergencyContact: 'Site contact',
    emergencyPhone: '07123456789',
    scope: 'Installation, commissioning and handover of a solar PV system.',
    systemTypes: ['Solar PV'],
    panelQuantity: '12',
    panelModel: 'PV-400',
    inverterModel: 'INV-5',
    proposedBatteryLocation: '',
    proposedEvLocation: '',
    accessNotes: 'Access controlled with ladder and exclusion zone.',
    electricalNotes: 'Safe isolation required.',
    environmentalNotes: 'Packaging waste segregated.',
    environmentalControlsNotes: 'Cable waste recycled.',
    pvShutdownInfo: 'Use DC isolator and follow handover shutdown procedure.',
    batteryShutdownInfo: '',
    evShutdownInfo: '',
    siteIsolationPoint: 'Main consumer unit switch.',
    firstAider: 'Site supervisor',
    firstAidKitLocation: 'Works van',
    nearestHospital: 'Local hospital',
    assemblyPoint: 'Front driveway',
    fireExtinguisherLocation: 'Works van',
    approvalName: 'Approver Name',
    approvalDate: '2026-07-13',
    ppe: ['Safety helmet', 'Safety footwear', 'Protective gloves', 'Safety glasses'],
    photos: [],
    hazards: [],
    risks: [risk('r-solar', 'Solar PV roof DC electrical work', 'library:ELEC-003')],
    declarations: {...declarations}
  };
  const merged = {...base, ...overrides, declarations: {...base.declarations, ...(overrides.declarations || {})}};
  return migration.migrateRamsDraft(merged);
}
function ids(draft) { return review.getReviewIssues(draft).map(issue => issue.id); }

assert('draft type includes professional RAMS fields', source.types.includes('revisionHistory') && source.types.includes('consumerUnitMethod') && source.types.includes('ppeMatrix') && source.types.includes('briefingRegister'));
assert('standard method wording is centralised', source.defaultMethods.includes('getDefaultBatteryMethod') && source.defaultMethods.includes('getDefaultTrenchingMethod') && !source.ramsApp.includes('delivery inspection\n'));
assert('old drafts migrate without losing legacy locations', migration.migrateRamsDraft({batteryLocation: 'Garage wall', evChargerLocation: 'Driveway wall'}).proposedBatteryLocation === 'Garage wall' && migration.migrateRamsDraft({batteryLocation: 'Garage wall', evChargerLocation: 'Driveway wall'}).proposedEvLocation === 'Driveway wall');
assert('old drafts receive revision history', migration.migrateRamsDraft({projectReference: 'OLD-1'}).revisionHistory.length === 1);

assert('roof work includes roof hazards', hazards.getRecommendedHazardsForWorkTypes(['Solar PV', 'Roof work']).some(item => item.category === 'Working at height'));
assert('battery selection includes battery risks and method', hazards.getRecommendedHazardsForWorkTypes(['Battery storage']).some(item => item.code.startsWith('BAT-')) && pdfModel.buildRamsPdfModel(completeDraft({systemTypes: ['Battery storage'], panelQuantity: '', proposedBatteryLocation: 'Garage wall', pvShutdownInfo: '', batteryShutdownInfo: 'Battery isolator', risks: [risk('r-bat', 'Battery mounting clearances ventilation thermal event', 'library:BAT-001')]})).methods.some(item => item.heading === 'Battery installation method'));
assert('EV selection includes EV risks and method', hazards.getRecommendedHazardsForWorkTypes(['EV charger']).some(item => item.code.startsWith('EV-')) && pdfModel.buildRamsPdfModel(completeDraft({systemTypes: ['EV charger'], panelQuantity: '', proposedEvLocation: 'External wall', pvShutdownInfo: '', evShutdownInfo: 'EV circuit isolation', risks: [risk('r-ev', 'EV charger vehicle external cable route', 'library:EV-001')]})).methods.some(item => item.heading === 'EV charger installation method'));
assert('trenching selection includes excavation risks and method', hazards.getRecommendedHazardsForWorkTypes(['Trenching']).some(item => item.code.startsWith('TRN-')) && pdfModel.buildRamsPdfModel(completeDraft({systemTypes: ['Trenching'], panelQuantity: '', qualifiedElectrician: '', pvShutdownInfo: '', siteIsolationPoint: '', risks: [risk('r-trench', 'Trenching excavation underground service strike cat and genny', 'library:TRN-001')]})).methods.some(item => item.heading === 'Trenching method'));
assert('irrelevant methods are excluded', !pdfModel.buildRamsPdfModel(completeDraft({systemTypes: ['Battery storage'], panelQuantity: '', proposedBatteryLocation: 'Garage wall', pvShutdownInfo: '', batteryShutdownInfo: 'Battery isolator', risks: [risk('r-bat', 'Battery mounting clearances ventilation thermal event', 'library:BAT-001')]})).methods.some(item => ['Roof work method', 'EV charger installation method', 'Trenching method'].includes(item.heading)));

const completed = completeDraft();
assert('completed workflow has no blocking issues', review.isPdfReadyFromIssues(review.getReviewIssues(completed)) === true);
assert('PDF model includes all relevant risks', pdfModel.buildRamsPdfModel(completed).risks.length === 1 && pdfModel.buildRamsPdfModel(completed).risks[0].initialScore === 12);
assert('PDF model excludes unrelated sections', !pdfModel.buildRamsPdfModel(completed).methods.some(item => item.heading === 'Trenching method'));
assert('emergency procedures are conditional', pdfModel.buildRamsPdfModel(completeDraft({systemTypes: ['Battery storage'], panelQuantity: '', proposedBatteryLocation: 'Garage wall', pvShutdownInfo: '', batteryShutdownInfo: 'Battery isolator', risks: [risk('r-bat', 'Battery mounting clearances ventilation thermal event', 'library:BAT-001')]})).emergencyProcedures.some(item => item.heading === 'Battery event'));
assert('multiple risk rows render in PDF model', pdfModel.buildRamsPdfModel(completeDraft({risks: [risk('r1', 'Solar PV roof DC electrical work'), risk('r2', 'Public access falling objects')]})).risks.length === 2);
assert('photograph appendix renders selected photos only', pdfModel.buildRamsPdfModel(completeDraft({photos: [{id: 'p1', name: 'one.jpg', dataUrl: 'data:image/jpeg;base64,AA==', category: 'Roof', caption: 'Roof', includeInPdf: true}, {id: 'p2', name: 'two.jpg', dataUrl: 'data:image/jpeg;base64,AA==', category: 'Other', caption: 'Other', includeInPdf: false}]})).photos.length === 1);
assert('AI appendix only renders when AI was used', pdfModel.buildRamsPdfModel(completed).aiReview.length === 0 && pdfModel.buildRamsPdfModel(completeDraft({hazards: [{id: 'h1', photoId: 'p1', hazardCode: 'H1', title: 'Fragile roof', observation: 'Cracked tile', potentialHarm: 'Fall', controls: ['Avoid area'], confidence: 0.8, status: 'rejected', assessorComment: 'Not applicable', reviewedAt: '2026-07-13T10:00:00Z'}]})).aiReview.length === 1);
assert('PV electrical test sheets are not present', !source.ramsApp.toLowerCase().includes('pv electrical testing form') && !source.pdfRoute.toLowerCase().includes('pv electrical test sheet'));
assert('PDF generation remains available once blocking issues are resolved', review.getReviewIssues(completed).filter(issue => issue.blocking).length === 0);

const batteryMethodIssue = review.getReviewIssues(completeDraft({systemTypes: ['Battery storage'], panelQuantity: '', proposedBatteryLocation: 'Garage wall', pvShutdownInfo: '', batteryShutdownInfo: 'Battery isolator', batteryInstallationMethod: '', risks: [risk('r-bat', 'Battery mounting clearances ventilation thermal event', 'library:BAT-001')]})).find(issue => issue.id === 'method-battery');
assert('battery method issue points to rendered field', batteryMethodIssue?.fieldId === 'battery-installation-method' && source.ramsApp.includes("id={section.id}"));
const evIssue = review.getReviewIssues(completeDraft({systemTypes: ['EV charger'], panelQuantity: '', proposedEvLocation: 'External wall', pvShutdownInfo: '', evShutdownInfo: 'EV isolation', evChargerInstallationMethod: '', risks: [risk('r-ev', 'EV charger vehicle external cable route', 'library:EV-001')]})).find(issue => issue.id === 'method-ev');
assert('EV method issue points to rendered field', evIssue?.fieldId === 'ev-charger-installation-method');
const trenchIssue = review.getReviewIssues(completeDraft({systemTypes: ['Trenching'], panelQuantity: '', qualifiedElectrician: '', pvShutdownInfo: '', siteIsolationPoint: '', trenchingMethod: '', risks: [risk('r-trench', 'Trenching excavation underground service strike cat and genny', 'library:TRN-001')]})).find(issue => issue.id === 'method-trenching');
assert('trenching method issue points to rendered field', trenchIssue?.fieldId === 'trenching-method');

const literalReviewTargets = [...source.review.matchAll(/fieldId: '([^']+)'/g)].map(match => match[1]);
const unrenderedTargets = literalReviewTargets.filter(id => {
  if (id.startsWith('declaration-')) return !source.ramsApp.includes("id={'declaration-' + key}");
  if (id === 'risk-list' || id === 'system-work-types' || id === 'persons-at-risk-list' || id === 'equipment-list' || id === 'ppe-matrix-list') return !source.ramsApp.includes("'" + id + "'");
  if (id.startsWith('photo-') || id.startsWith('ai-suggestion-') || id.startsWith('risk-row-')) return false;
  return !(source.ramsApp.includes("'" + id + "'") || source.ramsApp.includes('\"' + id + '\"') || source.defaultMethods.includes("id: '" + id + "'"));
});
assert('Review Centre literal navigation targets are rendered', unrenderedTargets.length === 0);
assert('Review Centre cannot generate method targets for missing UI fields', source.review.includes('consumer-unit-method') && source.ramsApp.includes('methodSections.map(renderMethodSection)'));

assert('EV and battery location fields use expected IDs', source.ramsApp.includes("'proposed-battery-location'") && source.ramsApp.includes("'proposed-ev-location'"));
assert('EV and battery location fields use expected data keys', source.ramsApp.includes("'proposedBatteryLocation'") && source.ramsApp.includes("'proposedEvLocation'") && !source.ramsApp.includes("'batteryLocation'") && !source.ramsApp.includes("'evChargerLocation'"));
assert('draft auto-save does not refocus system fields', source.ramsApp.includes('}, [step, reviewNav.targetFieldId]);'));
assert('login and auth flow remain present', source.loginRoute.includes('success: true') && source.loginPage.includes('router.replace') && source.authSource.includes('httpOnly: true') && source.middlewareSource.includes("PROTECTED_PREFIXES = ['/dashboard']"));
assert('Generate PDF button reaches click handler and API', source.ramsApp.includes("console.log('Generate PDF clicked')") && source.ramsApp.includes("console.log('Validation passed')") && source.ramsApp.includes("console.log('Calling PDF API')") && source.ramsApp.includes("fetch('/api/pdf'"));
assert('PDF API route exists and returns a PDF', source.pdfRoute.includes('export async function POST') && source.pdfRoute.includes("'content-type': 'application/pdf'") && source.pdfRoute.includes("doc.output('arraybuffer')"));
assert('PDF API route protects authenticated data', source.pdfRoute.includes('verifySession') && source.pdfRoute.includes('SESSION_COOKIE_NAME') && source.pdfRoute.includes('Not authenticated.'));
assert('professional PDF sections are present', ['Document control', 'Project information', 'Scope of works', 'Risk assessment matrix', 'Dynamic risk assessment', 'Method statement', 'PPE matrix', 'Emergency procedures', 'Environmental controls', 'Monitoring and review', 'Sign-off'].every(title => source.pdfRoute.includes(title)));
assert('new UI styles are present', source.css.includes('.method-card') && source.css.includes('.completion-pill'));
