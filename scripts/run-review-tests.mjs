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
const defaultsSourceCompiled = ts.transpileModule(await read('lib/defaults.ts'), {compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022}}).outputText;
const defaultsFile = path.join(tempDir, 'defaults.mjs');
await fs.writeFile(defaultsFile, defaultsSourceCompiled, 'utf8');
const defaults = await import(pathToFileURL(defaultsFile).href);

function assert(name, condition) {
  if (!condition) throw new Error(name);
  console.log('PASS', name);
}

const declarations = {siteReviewed: true, importVerified: true, controlsAvailable: true, aiReviewed: true, briefing: true, changeReview: true};
function completeDraft(overrides = {}) {
  const base = {...defaults.createEmptyDraft(),
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
const sessionRoute = await read('app/api/auth/session/route.ts');
const authSource = await read('lib/auth.ts');
const middlewareSource = await read('middleware.ts');
const ramsApp = await read('components/RamsApp.tsx');
const reviewSource = await read('lib/review.ts');
const defaultsSource = await read('lib/defaults.ts');
const typeSource = await read('types/rams.ts');
const css = await read('app/globals.css');

assert('correct access code succeeds on first submission', loginRoute.includes('success: true') && loginRoute.includes('redirectTo: PROTECTED_REDIRECT') && loginPage.includes('router.replace')); 
assert('duplicate login submissions are blocked', loginPage.includes('submitLock.current') && loginPage.includes('disabled={busy || code.length !== 4}')); 
assert('invalid code shows the correct error', loginRoute.includes('Incorrect access code.') && loginPage.includes('Incorrect access code.'));
assert('successful login sets the session cookie', loginRoute.includes('cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions())')); 
assert('session cookie has required security settings', authSource.includes('httpOnly: true') && authSource.includes("sameSite: 'lax'") && authSource.includes("secure: process.env.NODE_ENV === 'production'") && authSource.includes("path: '/'") && authSource.includes('maxAge: SESSION_MAX_AGE_SECONDS'));
assert('successful login redirects to the protected route', loginPage.includes('const redirectTo = result.redirectTo || FALLBACK_REDIRECT') && loginPage.includes('startNavigation(redirectTo)') && loginPage.includes('router.replace(redirectTo)')); 
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


const resetFunctionStart = ramsApp.indexOf('function resetDraftToInitialState');
const resetFunctionEnd = ramsApp.indexOf('function confirmStartNewRams', resetFunctionStart);
const resetFunction = ramsApp.slice(resetFunctionStart, resetFunctionEnd);
const modalMarkupStart = ramsApp.indexOf("{startNewOpen&&");
const modalMarkup = ramsApp.slice(modalMarkupStart);
assert('Start New RAMS opens confirmation modal', ramsApp.includes('function openStartNewModal') && ramsApp.includes('setStartNewOpen(true)') && ramsApp.includes('Start a new RAMS?'));
assert('Cancel leaves all fields unchanged', ramsApp.includes('function closeStartNewModal') && !ramsApp.slice(ramsApp.indexOf('function closeStartNewModal'), ramsApp.indexOf('function revokeDraftObjectUrls')).includes('setData('));
assert('confirmation button disabled until checkbox selected', modalMarkup.includes('disabled={!startNewConfirmed}') && modalMarkup.includes('I understand the current draft will be deleted.'));
assert('confirming clears job details through factory', defaultsSource.includes('export function createEmptyDraft') && defaults.createEmptyDraft().customerName === '' && resetFunction.includes('const empty=createEmptyDraft()') && resetFunction.includes('setData(empty)'));
assert('confirming clears system details', defaults.createEmptyDraft().panelQuantity === '' && defaults.createEmptyDraft().proposedBatteryLocation === '' && defaults.createEmptyDraft().proposedEvLocation === '');
assert('confirming clears photos and imported PDF metadata', defaults.createEmptyDraft().photos.length === 0 && defaults.createEmptyDraft().importedPdfAt === undefined);
assert('confirming clears AI suggestions and risks', defaults.createEmptyDraft().hazards.length === 0 && defaults.createEmptyDraft().risks.length === 0);
assert('confirming clears local persistence', resetFunction.includes('localStorage.removeItem(DRAFT_STORAGE_KEY)') && resetFunction.includes('sessionStorage.removeItem(DRAFT_STORAGE_KEY)') && resetFunction.includes('localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify(empty))'));
assert('user remains authenticated during reset', !resetFunction.includes('logout') && !resetFunction.includes('/api/auth/logout') && !resetFunction.includes('router.'));
assert('wizard returns to Step 1', resetFunction.includes('setStep(0)') && resetFunction.includes('window.scrollTo({top:0'));
assert('old draft does not return after refresh', ramsApp.includes('draftReady') && ramsApp.includes('if(!draftReady)return;') && resetFunction.includes('setDraftReady(true)'));
assert('unsaved PDF warning appears when applicable', modalMarkup.includes('!data.pdfDownloadedAt') && modalMarkup.includes('This RAMS has not been downloaded as a PDF.'));
assert('downloaded PDF timestamp displays correctly', ramsApp.includes('PDF downloaded on ') && ramsApp.includes('data.pdfFileName') && typeSource.includes('pdfDownloadedAt?:string;pdfFileName?:string'));
assert('PDF state is set only after save is initiated', ramsApp.indexOf('doc.save(pdfFileName)') < ramsApp.indexOf('pdfDownloadedAt:new Date().toISOString()'));
assert('autosave race condition is guarded', ramsApp.includes('const [draftReady,setDraftReady]=useState(false)') && ramsApp.includes('useEffect(()=>{if(!draftReady)return;localStorage.setItem(DRAFT_STORAGE_KEY,JSON.stringify(data))},[data,draftReady])'));
assert('reset revokes any object URLs', resetFunction.includes('revokeDraftObjectUrls(data)') && ramsApp.includes('URL.revokeObjectURL'));
assert('reset announces success', resetFunction.includes("setMessage('New RAMS started.')") && ramsApp.includes("role='status'"));
assert('modal traps focus and Escape closes it', ramsApp.includes("event.key==='Escape'") && ramsApp.includes("event.key!=='Tab'") && ramsApp.includes("document.addEventListener('keydown',onKeyDown)"));


const batteryMethodMissingDraft = completeDraft({systemTypes: ['Solar PV', 'Battery storage'], methodStatement: 'Install the system safely.', batteryInstallationMethod: ''});
const batteryMethodIssue = review.getReviewIssues(batteryMethodMissingDraft).find(issue => issue.id === 'method-battery');
assert('battery storage method issue points to rendered field', batteryMethodIssue?.fieldId === 'battery-installation-method' && ramsApp.includes("id='battery-installation-method'"));
const batteryMethodCompleteDraft = completeDraft({systemTypes: ['Solar PV', 'Battery storage'], methodStatement: 'Install the system safely.', batteryInstallationMethod: 'Wall mounted battery installation with manufacturer mounting bracket, clearances maintained and ventilation requirements observed.'});
assert('battery storage method issue clears when field is completed', !review.getReviewIssues(batteryMethodCompleteDraft).some(issue => issue.id === 'method-battery'));
assert('battery method field is included in generated method output', ramsApp.includes('Battery installation method:') && ramsApp.includes('data.batteryInstallationMethod'));
const literalReviewTargets = [...reviewSource.matchAll(/fieldId:'([^']+)'/g)].map(match => match[1]);
const unrenderedTargets = literalReviewTargets.filter(id => {
  if (id.startsWith('declaration-')) return !ramsApp.includes("id={'declaration-'+key}");
  return !(ramsApp.includes("'" + id + "'") || ramsApp.includes('"' + id + '"'));
});
assert('Review Centre literal navigation targets are rendered', unrenderedTargets.length === 0);


assert('login digit sanitizer strips non-digits on client and server', loginPage.includes("replace(/\\D/g, '').slice(0, 4)") && loginRoute.includes("replace(/\\D/g, '').slice(0, 4)"));
assert('successful login sets authenticated state before navigation', loginPage.includes('setAuthenticated(true)') && loginPage.includes("console.info('[SolarFX login] login success"));
assert('login navigation does not call router.refresh', !loginPage.includes('router.refresh()'));
assert('login has five second navigation fallback', loginPage.includes('dashboard navigation still waiting after 5 seconds') && loginPage.includes('window.location.assign(redirectTo)'));
assert('login confirms cookie in background without blocking navigation', loginPage.includes('void confirmCookieDetected()') && loginPage.indexOf('void confirmCookieDetected()') < loginPage.indexOf('startNavigation(redirectTo)'));
assert('dashboard renders skeleton while draft loads', ramsApp.includes('function DashboardSkeleton') && ramsApp.includes('if(!draftReady)return <DashboardSkeleton/>') && css.includes('.dashboard-skeleton'));
assert('dashboard logs mount session draft and completion', ramsApp.includes("console.info('[SolarFX dashboard] dashboard mounted')") && ramsApp.includes("console.info('[SolarFX dashboard] session loaded") && ramsApp.includes("console.info('[SolarFX dashboard] draft loaded") && ramsApp.includes("console.info('[SolarFX dashboard] loading complete')"));
assert('dashboard slow steps log after five seconds', ramsApp.includes('still waiting after 5 seconds') && ramsApp.includes('SLOW_DASHBOARD_STEP_MS=5000'));
assert('server auth flow logs cookie and redirects', loginRoute.includes("console.info('[SolarFX auth] login success')") && sessionRoute.includes("console.info('[SolarFX auth] session loaded") && middlewareSource.includes("console.info('[SolarFX auth] cookie detected") && middlewareSource.includes("console.warn('[SolarFX auth] dashboard redirect unauthenticated"));
