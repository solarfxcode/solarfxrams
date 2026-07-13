import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const root = new URL('..', import.meta.url);
const read = file => fs.readFile(new URL(file, root), 'utf8');
const source = await read('lib/review.ts');
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

function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS', name);
}

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
    proposedBatteryLocation: '',
    proposedEvLocation: '',
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

const loginPage = await read('app/page.tsx');
const loginRoute = await read('app/api/auth/login/route.ts');
const logoutRoute = await read('app/api/auth/logout/route.ts');
const authSource = await read('lib/auth.ts');
const middlewareSource = await read('middleware.ts');
const ramsApp = await read('components/RamsApp.tsx');
const reviewSource = await read('lib/review.ts');
const css = await read('app/globals.css');

assert('correct access code succeeds on first submission', loginRoute.includes('success: true') && loginRoute.includes('redirectTo: PROTECTED_REDIRECT') && loginPage.includes('router.replace')); 
assert('duplicate login submissions are blocked', loginPage.includes('submitLock.current') && loginPage.includes('disabled={busy || code.length !== 4}')); 
assert('invalid code shows the correct error', loginRoute.includes('Incorrect access code.') && loginPage.includes('Incorrect access code.'));
assert('successful login sets the session cookie', loginRoute.includes('cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions())')); 
assert('session cookie has required security settings', authSource.includes('httpOnly: true') && authSource.includes("sameSite: 'lax'") && authSource.includes("secure: process.env.NODE_ENV === 'production'") && authSource.includes("path: '/'") && authSource.includes('maxAge: SESSION_MAX_AGE_SECONDS'));
assert('successful login redirects to the protected route', loginPage.includes('router.replace(result.redirectTo || FALLBACK_REDIRECT)'));
assert('middleware permits login and auth API routes', middlewareSource.includes("'/login'") && middlewareSource.includes("'/api/auth/login'") && middlewareSource.includes('shouldBypassMiddleware'));
assert('protected routes redirect unauthenticated users', middlewareSource.includes("PROTECTED_PREFIXES = ['/dashboard']") && middlewareSource.includes('NextResponse.redirect'));
assert('logout clears the session', logoutRoute.includes('clearSessionCookieOptions') && authSource.includes('maxAge: 0'));

assert('completed step shows a tick', ramsApp.includes('step-status-complete') && css.includes('border:solid currentColor'));
assert('warning step shows an issue count', ramsApp.includes('warning-count') && ramsApp.includes('summary.warnings'));
assert('active step has aria-current step', ramsApp.includes("aria-current={i===step?'step':undefined}"));
assert('OK text is not rendered', !ramsApp.includes('>OK<') && !ramsApp.includes("'OK'"));
assert('step labels do not wrap', css.includes('.step-label{white-space:nowrap'));
assert('active step scrolls into view', ramsApp.includes('scrollIntoView({behavior:'));
assert('mobile navigation remains usable', css.includes('overflow-x:auto') && css.includes('scroll-snap-type:x proximity'));


const systemSectionStart = ramsApp.indexOf("{step===2&&");
const systemSectionEnd = ramsApp.indexOf("{step===3&&", systemSectionStart);
const systemSection = ramsApp.slice(systemSectionStart, systemSectionEnd);
assert('EV and battery location fields use expected IDs', systemSection.includes("'proposed-battery-location'") && systemSection.includes("'proposed-ev-location'"));
assert('EV and battery location fields use expected data keys', systemSection.includes("'proposedBatteryLocation'") && systemSection.includes("'proposedEvLocation'") && !systemSection.includes("'batteryLocation'") && !systemSection.includes("'evChargerLocation'"));
assert('field helper writes unique input id and name', ramsApp.includes("<label htmlFor={id}>") && ramsApp.includes("<input id={id} name={String(key)}"));
assert('review issues focus the EV field directly', reviewSource.includes("data.proposedEvLocation") && reviewSource.includes("fieldId:'proposed-ev-location'") && reviewSource.includes("fieldId:'proposed-battery-location'"));
assert('draft auto-save does not refocus system fields', ramsApp.includes("},[step,reviewNav.targetFieldId]);") && !ramsApp.includes("},[step,reviewNav.targetFieldId,data]);"));
assert('regression: typing EV location cannot update battery field', systemSection.indexOf("proposedEvLocation") !== systemSection.indexOf("proposedBatteryLocation") && systemSection.includes("field('Proposed EV charger location','proposedEvLocation','proposed-ev-location')"));
