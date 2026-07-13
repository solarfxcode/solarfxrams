import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url);
const source = await fs.readFile(new URL('lib/review.ts', root), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX
  }
}).outputText;
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solarfx-review-'));
const tempFile = path.join(tempDir, 'review.mjs');
await fs.writeFile(tempFile, compiled, 'utf8');
const review = await import(pathToFileURL(tempFile).href);

const declarations = {siteReviewed: true, importVerified: true, controlsAvailable: true, aiReviewed: true, briefing: true, changeReview: true};
function completeDraft(overrides = {}) {
  const base = {
    projectReference: 'SFX-1001',
    customerName: 'Example Customer',
    address: '1 Solar Street',
    postcode: 'AB1 2CD',
    client: 'Example Customer',
    principalContractor: 'SolarFX',
    preparedBy: 'SolarFX',
    assessor: 'Assessor Name',
    assessorPosition: 'Contracts Manager',
    siteSupervisor: 'Supervisor Name',
    qualifiedElectrician: 'Electrician Name',
    installDate: '2026-07-13',
    assessmentDate: '2026-07-13',
    reviewDate: '2026-07-13',
    revision: '1',
    emergencyContact: 'Site contact',
    emergencyPhone: '07123456789',
    scope: 'Installation, testing, commissioning and handover of a solar PV system.',
    systemTypes: ['Solar PV'],
    panelQuantity: '12',
    panelModel: 'PV-400',
    inverterModel: 'INV-5',
    batteryModel: '',
    batteryLocation: '',
    evChargerLocation: '',
    roofType: '',
    roofCondition: '',
    accessNotes: '',
    electricalNotes: '',
    environmentalNotes: '',
    methodStatement: 'Install, test, commission and hand over the solar PV system using safe isolation and manufacturer instructions.',
    seniorReviewNotes: '',
    pvShutdownInfo: 'Use DC isolator and follow handover shutdown procedure.',
    batteryShutdownInfo: '',
    firstAider: 'Site supervisor',
    nearestHospital: 'Local hospital',
    assemblyPoint: 'Front driveway',
    approvalName: 'Approver Name',
    approvalDate: '2026-07-13',
    ppe: ['Safety helmet'],
    photos: [],
    hazards: [],
    risks: [{id: 'r1', hazard: 'Working at height', harm: 'Fall from height', persons: 'Installers', controls: 'Use suitable access equipment and edge protection.', severity: 4, likelihood: 3, residualSeverity: 3, residualLikelihood: 2, responsible: 'Supervisor', source: 'manual'}],
    declarations: {...declarations}
  };
  return {...base, ...overrides, declarations: {...base.declarations, ...(overrides.declarations || {})}};
}
function ids(draft) { return review.getReviewIssues(draft).map(issue => issue.id); }
function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS', name);
}

assert('missing customer-name issue', ids(completeDraft({customerName: ''})).includes('job-customer-name'));
const pendingAi = completeDraft({hazards: [{id: 'h1', photoId: 'p1', hazardCode: 'H1', title: 'Fragile roof', observation: 'Cracked tile', potentialHarm: 'Fall', controls: ['Avoid area'], confidence: 0.8, status: 'pending', assessorComment: ''}]});
const pendingIssue = review.getReviewIssues(pendingAi).find(issue => issue.id === 'ai-h1-pending');
assert('unreviewed AI suggestion blocking issue', pendingIssue?.blocking === true);
const acceptedAi = completeDraft({hazards: [{id: 'h1', photoId: 'p1', hazardCode: 'H1', title: 'Fragile roof', observation: 'Cracked tile', potentialHarm: 'Fall', controls: ['Avoid area'], confidence: 0.8, status: 'accepted', assessorComment: 'Accepted', reviewedAt: '2026-07-13T10:00:00Z'}], risks: [{id: 'r1', hazard: 'Fragile roof', harm: 'Fall', persons: 'Installers', controls: 'Avoid area', severity: 4, likelihood: 3, residualSeverity: 3, residualLikelihood: 2, responsible: 'Supervisor', source: 'h1'}]});
assert('reviewed AI removes pending issue', !ids(acceptedAi).includes('ai-h1-pending'));
assert('missing emergency contact issue', ids(completeDraft({emergencyPhone: ''})).includes('emergency-contact'));
const highRisk = completeDraft({risks: [{id: 'r1', hazard: 'Electrical work', harm: 'Electric shock', persons: 'Installers', controls: 'Safe isolation', severity: 5, likelihood: 5, residualSeverity: 5, residualLikelihood: 4, responsible: 'Supervisor', source: 'manual'}]});
assert('Very High residual risk issue', ids(highRisk).includes('risk-r1-very-high'));
assert('resolved high-risk issue disappears', !ids({...highRisk, seniorReviewNotes: 'Reviewed and authorised by senior manager.'}).includes('risk-r1-very-high'));
assert('PDF blocked when blocking exists', review.isPdfReadyFromIssues(review.getReviewIssues(completeDraft({customerName: ''}))) === false);
const warningOnly = completeDraft({photos: [{id: 'p1', name: 'photo.jpg', dataUrl: 'data:image/jpeg;base64,AA==', category: 'Access', caption: ''}]});
const warningIssues = review.getReviewIssues(warningOnly);
assert('warnings alone do not block PDF', warningIssues.some(issue => !issue.blocking) && review.isPdfReadyFromIssues(warningIssues) === true);
const summaries = review.getReviewStepSummaries(review.getReviewIssues(completeDraft({customerName: '', photos: [{id: 'p1', name: 'photo.jpg', dataUrl: 'data:image/jpeg;base64,AA==', category: 'Access', caption: ''}]})));
assert('step counts include errors and warnings', summaries[0].errors === 1 && summaries[4].warnings === 1);
const mixedIssues = review.getReviewIssues(completeDraft({customerName: '', photos: [{id: 'p1', name: 'photo.jpg', dataUrl: 'data:image/jpeg;base64,AA==', category: 'Access', caption: ''}]}));
assert('Fix next prioritises blocking', review.getNextReviewIssue(mixedIssues)?.id === 'job-customer-name');
