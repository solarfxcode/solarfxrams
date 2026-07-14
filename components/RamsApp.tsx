'use client';

import {Component, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {
  createDefaultPpeMatrix,
  createEmptyDraft,
  equipmentOptions,
  materialOptions,
  personsAtRiskOptions,
  ppeOptions,
  workTypes
} from '@/lib/defaults';
import {createStoredPhoto, deletePhotoBlob, getPhotoBlob, isQuotaError, MAX_IMAGE_BYTES, MAX_PHOTOS, MAX_TOTAL_IMAGE_BYTES, migrateLegacyPhoto, PHOTO_UPLOAD_ERROR} from '@/lib/browser-photo-storage';
import {recommendedRiskRowsForWorkTypes} from '@/lib/hazards';
import {getDefaultMethodByField, getMethodSectionsForDraft, type MethodSectionDefinition} from '@/lib/rams/default-methods';
import {migrateRamsDraft, populateDefaultsForWorkType} from '@/lib/rams/draft-migration';
import {getNextReviewIssue, getReviewIssues, getReviewStepSummaries, isPdfReadyFromIssues, REQUIRED_DECLARATIONS, REVIEW_STEP_LABELS} from '@/lib/review';
import type {HazardSuggestion, Photo, RamsData, ReviewIssue, ReviewNavigationState, RiskRow} from '@/types/rams';

const DRAFT_STORAGE_KEY = 'solarfx-rams-draft';
const steps = [...REVIEW_STEP_LABELS];
const riskScale = [0, 1, 2, 3, 4, 5];
const SLOW_DASHBOARD_STEP_MS = 5000;
type ListKey = 'systemTypes' | 'ppe' | 'personsAtRisk' | 'equipment' | 'materials';
type DraftRecoveryState = {message: string; draft: RamsData};

class SafeSection extends Component<{children: ReactNode; fallback: string}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {
    return {failed: true};
  }
  componentDidCatch(error: unknown) {
    console.error('[SolarFX RAMS] Protected section failed', error);
  }
  render() {
    if (this.state.failed) return <p className='warning' role='alert'>{this.props.fallback}</p>;
    return this.props.children;
  }
}

function makeId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

const score = (s: number, l: number) => Number(s || 0) * Number(l || 0);
const riskName = (n: number) => n <= 0 ? 'Not scored' : n <= 5 ? 'Low' : n <= 10 ? 'Medium' : n <= 15 ? 'High' : 'Very High';
const severityIcon = (severity: string) => severity === 'error' ? '!' : severity === 'warning' ? '?' : 'i';
const categoryLabel = (issue: ReviewIssue) => issue.stepLabel;

function logDashboardSlowStep(label: string) {
  return window.setTimeout(() => console.warn('[SolarFX dashboard] ' + label + ' still waiting after 5 seconds'), SLOW_DASHBOARD_STEP_MS);
}

function DashboardSkeleton() {
  return <>
    <header className='header'><div className='header-inner'><div className='brand'><img src='/branding/solarfx-logo-horizontal.png' alt='SolarFX'/><strong>RAMS Generator</strong></div></div></header>
    <main className='shell app-shell'><section className='dashboard-skeleton' aria-busy='true' aria-live='polite'><span className='skeleton-spinner' aria-hidden='true'/><div><h1>Opening RAMS Generator</h1><p className='muted'>Loading your saved draft on this device.</p></div></section></main>
  </>;
}

function draftForStorage(draft: RamsData): RamsData {
  return {...draft, photos: draft.photos.map(photo => ({...photo, dataUrl: undefined}))};
}

export default function RamsApp() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<RamsData>(() => createEmptyDraft());
  const [message, setMessage] = useState('');
  const [reviewNav, setReviewNav] = useState<ReviewNavigationState>({});
  const [draftReady, setDraftReady] = useState(false);
  const [draftRecovery, setDraftRecovery] = useState<DraftRecoveryState | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const [startNewOpen, setStartNewOpen] = useState(false);
  const [startNewConfirmed, setStartNewConfirmed] = useState(false);
  const stepperRef = useRef<HTMLDivElement | null>(null);
  const stepButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastStartNewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const modalCancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    console.info('[SolarFX dashboard] dashboard mounted');
    const slowSession = logDashboardSlowStep('session load');
    fetch('/api/auth/session', {cache: 'no-store'})
      .then(res => res.json())
      .then(session => console.info('[SolarFX dashboard] session loaded', {authenticated: Boolean(session.ok || session.authenticated)}))
      .catch(error => console.warn('[SolarFX dashboard] session load failed', error))
      .finally(() => window.clearTimeout(slowSession));
  }, []);

  useEffect(() => {
    const slowDraft = logDashboardSlowStep('draft load');
    let cancelled = false;
    async function loadDraft() {
      try {
        const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const migrated = migrateRamsDraft(JSON.parse(saved));
          const photoResults = await Promise.allSettled(migrated.photos.map(photo => migrateLegacyPhoto(photo)));
          const photos = photoResults.flatMap(result => result.status === 'fulfilled' && result.value ? [result.value] : []);
          const recovered = {...migrated, photos};
          if (!cancelled) {
            if (photos.length !== migrated.photos.length) setDraftRecovery({message: 'The saved draft contains invalid photo data.', draft: recovered});
            setData(recovered);
          }
        }
        console.info('[SolarFX dashboard] draft loaded', {hasDraft: Boolean(saved)});
      } catch (error) {
        console.warn('[SolarFX dashboard] draft load failed', error);
        if (!cancelled) setDraftRecovery({message: 'The saved draft contains invalid photo data.', draft: createEmptyDraft()});
      } finally {
        if (!cancelled) {
          setDraftReady(true);
          console.info('[SolarFX dashboard] loading complete');
        }
        window.clearTimeout(slowDraft);
      }
    }
    void loadDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftForStorage(data)));
    } catch (error) {
      console.warn('[SolarFX dashboard] draft autosave failed', error);
      setMessage('Draft autosave could not complete on this device. Your current screen remains available.');
    }
  }, [data, draftReady]);

  useEffect(() => {
    let cancelled = false;
    const activePhotoIds = new Set(data.photos.map(photo => photo.id));
    setPreviewUrls(current => {
      const next = {...current};
      Object.entries(next).forEach(([id, url]) => {
        if (!activePhotoIds.has(id)) {
          URL.revokeObjectURL(url);
          delete next[id];
        }
      });
      return next;
    });
    data.photos.forEach(photo => {
      if (!photo.storageRef || previewUrls[photo.id]) return;
      getPhotoBlob(photo.storageRef).then(blob => {
        if (!blob || cancelled) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrls(current => current[photo.id] ? current : {...current, [photo.id]: url});
      }).catch(error => console.warn('[SolarFX photos] preview load failed', error));
    });
    return () => {
      cancelled = true;
    };
  }, [data.photos, previewUrls]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
  }, []);

  const issues = useMemo(() => getReviewIssues(data), [data]);
  const stepSummaries = useMemo(() => getReviewStepSummaries(issues), [issues]);
  const methodSections = useMemo(() => getMethodSectionsForDraft(data), [data]);
  const blockingIssues = issues.filter(issue => issue.blocking);
  const warningIssues = issues.filter(issue => !issue.blocking);
  const ready = isPdfReadyFromIssues(issues);
  const allAiReviewed = data.hazards.every(h => h.status !== 'pending');

  useEffect(() => {
    stepButtonRefs.current[step]?.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
  }, [step]);

  useEffect(() => {
    if (!reviewNav.targetFieldId) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(reviewNav.targetFieldId || '');
      if (!element) return;
      element.scrollIntoView({behavior: 'smooth', block: 'center'});
      element.classList.add('review-target-highlight');
      const focusTarget = element.matches('input,textarea,select,button,[tabindex]') ? element : element.querySelector('input,textarea,select,button,[tabindex]');
      if (focusTarget instanceof HTMLElement) focusTarget.focus({preventScroll: true});
      window.setTimeout(() => element.classList.remove('review-target-highlight'), 2800);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [step, reviewNav.targetFieldId]);

  useEffect(() => {
    if (!startNewOpen) return;
    const timer = window.setTimeout(() => modalCancelRef.current?.focus(), 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeStartNewModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const modal = document.getElementById('start-new-rams-modal');
      if (!modal) return;
      const focusable = Array.from(modal.querySelectorAll<HTMLElement>('button,input,[href],select,textarea,[tabindex]:not([tabindex="-1"])')).filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [startNewOpen]);

  const set = (k: keyof RamsData, v: any) => setData(d => ({...d, [k]: v}));
  const toggleArray = (k: ListKey, v: string) => setData(d => {
    const selected = d[k].includes(v);
    const nextValues = selected ? d[k].filter(x => x !== v) : [...d[k], v];
    let next = {...d, [k]: nextValues} as RamsData;
    if (k === 'systemTypes') {
      if (!selected) next = populateDefaultsForWorkType(next, v);
      next.ppeMatrix = createDefaultPpeMatrix(next.systemTypes).map(item => {
        const existing = next.ppeMatrix.find(current => current.item === item.item);
        return existing ? {...item, required: existing.required || item.required, task: existing.task || item.task} : item;
      });
    }
    if (k === 'ppe') {
      next.ppeMatrix = next.ppeMatrix.map(item => item.item === v ? {...item, required: !selected} : item);
    }
    return next;
  });
  const updatePhoto = (id: string, patch: Partial<Photo>) => set('photos', data.photos.map(photo => photo.id === id ? {...photo, ...patch} : photo));
  const updateRisk = (id: string, patch: Partial<RiskRow>) => set('risks', data.risks.map(risk => risk.id === id ? {...risk, ...patch} : risk));
  const updateHazard = (id: string, patch: Partial<HazardSuggestion>) => set('hazards', data.hazards.map(hazard => hazard.id === id ? {...hazard, ...patch} : hazard));

  async function logout() {
    await fetch('/api/auth/logout', {method: 'POST'});
    router.push('/');
  }

  async function importPdf(file: File) {
    setMessage('Reading PDF...');
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@' + pdfjs.version + '/build/pdf.worker.min.mjs';
    const doc = await pdfjs.getDocument({data: await file.arrayBuffer()}).promise;
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const p = await doc.getPage(i);
      const c = await p.getTextContent();
      text += c.items.map((x: any) => x.str).join(' ') + '\\n';
    }
    const r = await fetch('/api/ai/extract-pdf', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({text})});
    const j = await r.json();
    if (r.ok) {
      setData(d => migrateRamsDraft({...d, projectReference: j.projectReference?.value || d.projectReference, customerName: j.customerName?.value || d.customerName, address: j.address?.value || d.address, postcode: j.postcode?.value || d.postcode, panelQuantity: String(j.panelQuantity?.value || d.panelQuantity), panelModel: j.panelModel?.value || d.panelModel, inverterModel: j.inverterModel?.value || d.inverterModel, batteryModel: j.batteryModel?.value || d.batteryModel, importedPdfAt: new Date().toISOString(), declarations: {...d.declarations, importVerified: false}}));
      setMessage('Imported values are editable and must be verified in final review.');
    } else setMessage(j.error || 'Import failed');
  }

  async function addPhotos(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).slice(0, Math.max(0, MAX_PHOTOS - data.photos.length));
    if (!accepted.length) {
      setMessage('Maximum photo limit reached.');
      return;
    }
    const currentTotal = data.photos.reduce((total, photo) => total + Number(photo.size || 0), 0);
    const incomingTotal = accepted.reduce((total, file) => total + file.size, 0);
    if (incomingTotal + currentTotal > MAX_TOTAL_IMAGE_BYTES) {
      setMessage(PHOTO_UPLOAD_ERROR);
      return;
    }
    const list: Photo[] = [];
    for (const f of accepted) {
      try {
        if (f.size > MAX_IMAGE_BYTES) throw new Error('Image too large');
        list.push(await createStoredPhoto(f, makeId()));
      } catch (error) {
        console.warn('[SolarFX photos] upload failed', error);
        setMessage(isQuotaError(error) ? 'Photo storage is full on this device. Remove photos or recover the draft without photos.' : PHOTO_UPLOAD_ERROR);
      }
    }
    if (list.length) set('photos', [...data.photos, ...list]);
  }

  async function analyse() {
    setMessage('Analysing photographs...');
    try {
      const photos = await Promise.all(data.photos.map(async photo => {
        const blob = await getPhotoBlob(photo.storageRef);
        return {...photo, dataUrl: blob ? await new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);}) : undefined};
      }));
      const r = await fetch('/api/ai/analyse-hazards', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({photos, job: {address: data.address, scope: data.scope}})});
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.error || 'Analysis failed');
        return;
      }
      const hazards: HazardSuggestion[] = (j.suggestions || []).map((s: any) => ({id: makeId(), photoId: s.photoId, hazardCode: s.hazardCode, title: s.title, observation: s.observation, potentialHarm: s.potentialHarm, controls: s.controls || [], confidence: s.confidence || 0, status: 'pending', assessorComment: ''}));
      setData(d => ({...d, hazards, declarations: {...d.declarations, aiReviewed: false}}));
      setMessage('AI analysis complete. Review Centre will list unreviewed suggestions until each item is accepted or rejected.');
    } catch (error) {
      console.error('[SolarFX photos] AI analysis failed', error);
      setMessage('Photo analysis could not complete. Please try again or continue without AI photo analysis.');
    }
  }

  function acceptHazard(h: HazardSuggestion, status: 'accepted' | 'rejected') {
    setData(d => {
      const reviewedAt = new Date().toISOString();
      const hazards = d.hazards.map(x => x.id === h.id ? {...x, status, reviewedAt, reviewedBy: d.assessor || 'Assessor'} : x);
      let risks = d.risks;
      if (status === 'accepted' && !risks.some(r => r.source === h.id)) {
        const row: RiskRow = {id: makeId(), code: h.hazardCode, category: 'AI observation', activity: h.title, hazard: h.title, harm: h.potentialHarm, persons: 'Installers / occupants / public as applicable', controls: h.controls.join('; '), additionalControls: '', severity: 0, likelihood: 0, residualSeverity: 0, residualLikelihood: 0, responsible: d.siteSupervisor || d.assessor || 'Site Supervisor', source: h.id, relatedPhotoId: h.photoId, assessorNotes: h.assessorComment};
        risks = [...risks, row];
      }
      return {...d, hazards, risks, declarations: {...d.declarations, aiReviewed: hazards.every(item => item.status !== 'pending') ? d.declarations.aiReviewed : false}};
    });
  }

  function addRiskRow() {
    const row: RiskRow = {id: makeId(), hazard: '', harm: '', persons: 'Installers / occupants / public as applicable', controls: '', additionalControls: '', severity: 0, likelihood: 0, residualSeverity: 0, residualLikelihood: 0, responsible: data.siteSupervisor || '', source: 'manual', assessorNotes: ''};
    set('risks', [...data.risks, row]);
  }

  function addRecommendedRisks() {
    const existing = new Set(data.risks.map(risk => risk.source));
    const rows = recommendedRiskRowsForWorkTypes(data.systemTypes).filter(risk => !existing.has(risk.source)).map(risk => ({...risk, id: makeId()}));
    if (!rows.length) {
      setMessage('Recommended risks are already listed.');
      return;
    }
    set('risks', [...data.risks, ...rows]);
    setMessage(rows.length + ' recommended risk row' + (rows.length === 1 ? '' : 's') + ' added. Scores still need assessor confirmation.');
  }

  function openStartNewModal(event: MouseEvent<HTMLButtonElement>) {
    lastStartNewTriggerRef.current = event.currentTarget;
    setStartNewConfirmed(false);
    setStartNewOpen(true);
  }
  function closeStartNewModal() {
    setStartNewOpen(false);
    setStartNewConfirmed(false);
    window.setTimeout(() => lastStartNewTriggerRef.current?.focus(), 0);
  }
  function revokeDraftObjectUrls(draft: RamsData) {
    draft.photos.forEach(photo => {
      if (photo.dataUrl?.startsWith('blob:')) URL.revokeObjectURL(photo.dataUrl);
      void deletePhotoBlob(photo.storageRef);
    });
  }
  function resetDraftToInitialState() {
    const empty = createEmptyDraft();
    revokeDraftObjectUrls(data);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftForStorage(empty)));
    } catch (error) {
      console.warn('[SolarFX dashboard] reset autosave failed', error);
    }
    setData(empty);
    setDraftReady(true);
    setReviewNav({});
    setStep(0);
    setStartNewOpen(false);
    setStartNewConfirmed(false);
    setMessage('New RAMS started.');
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
  function confirmStartNewRams() {
    if (!startNewConfirmed) return;
    resetDraftToInitialState();
  }
  function recoverDraftWithoutPhotos() {
    if (!draftRecovery) return;
    const recovered = {...draftRecovery.draft, photos: []};
    data.photos.forEach(photo => void deletePhotoBlob(photo.storageRef));
    setData(recovered);
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftForStorage(recovered)));
    } catch (error) {
      console.warn('[SolarFX recovery] recovery autosave failed', error);
    }
    setDraftRecovery(null);
    setMessage('Draft recovered without photos.');
  }
  function clearBrokenDraft() {
    data.photos.forEach(photo => void deletePhotoBlob(photo.storageRef));
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    setData(createEmptyDraft());
    setDraftRecovery(null);
    setStep(0);
    setMessage('Broken draft cleared.');
  }
  function removePhoto(photo: Photo) {
    const previewUrl = previewUrls[photo.id];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrls(current => {
      const next = {...current};
      delete next[photo.id];
      return next;
    });
    void deletePhotoBlob(photo.storageRef);
    set('photos', data.photos.filter(item => item.id !== photo.id));
  }
  function navigateToIssue(issue: ReviewIssue) {
    setReviewNav({returnStep: 9, targetIssueId: issue.id, targetFieldId: issue.fieldId, targetIssueTitle: issue.title});
    setStep(issue.step);
  }
  function fixNext() {
    const issue = getNextReviewIssue(issues);
    if (issue) navigateToIssue(issue);
  }
  async function pdf() {
    console.log('Generate PDF clicked');
    const currentIssues = getReviewIssues(data);
    const currentBlocking = currentIssues.filter(issue => issue.blocking);
    if (currentBlocking.length) {
      const failing = currentBlocking.map(issue => issue.stepLabel + ': ' + issue.title).join('; ');
      setMessage('PDF blocked by: ' + failing);
      console.warn('[SolarFX PDF] Validation blocked PDF generation', currentBlocking.map(issue => ({id: issue.id, title: issue.title, fieldId: issue.fieldId})));
      return;
    }
    console.log('Validation passed');
    const pdfFileName = 'SolarFX-RAMS-' + (data.projectReference || 'RAMS').replace(/[^a-z0-9-]/gi, '_') + '-Rev-' + data.revision + '.pdf';
    console.log('Calling PDF API');
    setMessage('Generating PDF...');
    try {
      const photos = await Promise.all(data.photos.map(async photo => {
        if (!photo.includeInPdf) return photo;
        const blob = await getPhotoBlob(photo.storageRef);
        const dataUrl = blob ? await new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob);}) : undefined;
        return {...photo, dataUrl};
      }));
      const response = await fetch('/api/pdf', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({data: {...data, photos}, pdfFileName})});
      if (!response.ok) {
        let details = '';
        try {
          const error = await response.json();
          details = error.error ? String(error.error) : '';
        } catch {}
        throw new Error(details || 'PDF generation failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setData(d => ({...d, pdfDownloadedAt: new Date().toISOString(), pdfFileName}));
      setMessage('PDF downloaded.');
    } catch (error) {
      console.error('[SolarFX PDF] PDF generation failed', error);
      setMessage('Unable to generate PDF. Please try again.');
    }
  }

  const field = (label: string, key: keyof RamsData, id: string, type = 'text') => <div className='field' id={id + '-field'}><label htmlFor={id}>{label}</label><input id={id} name={String(key)} type={type} value={String(data[key] || '')} onChange={e => set(key, e.target.value)}/></div>;
  const textareaField = (label: string, key: keyof RamsData, id: string, rows = 4) => <div className='field' id={id + '-field'}><label htmlFor={id}>{label}</label><textarea id={id} name={String(key)} rows={rows} value={String(data[key] || '')} onChange={e => set(key, e.target.value)}/></div>;
  const riskNumber = (risk: RiskRow, key: 'severity' | 'likelihood' | 'residualSeverity' | 'residualLikelihood', label: string) => <div className='field'><label htmlFor={'field-' + key + '-' + risk.id}>{label}</label><select id={'field-' + key + '-' + risk.id} value={risk[key] || 0} onChange={e => updateRisk(risk.id, {[key]: Number(e.target.value)} as Partial<RiskRow>)}>{riskScale.map(n => <option key={n} value={n}>{n === 0 ? 'Select' : n}</option>)}</select></div>;
  const checkboxList = (id: string, key: ListKey, options: string[]) => <div className='grid three' id={id}>{options.map(x => <label className='checkbox-card' key={x}><input type='checkbox' checked={data[key].includes(x)} onChange={() => toggleArray(key, x)}/><span>{x}</span></label>)}</div>;
  const renderMethodSection = (section: MethodSectionDefinition) => {
    const value = String(data[section.field] || '');
    return <section className='method-card' id={section.id + '-field'} key={section.field}>
      <div className='method-section-header'><div><h2>{section.heading}</h2><p className='muted'>{section.description}</p></div><span className={value.trim() ? 'completion-pill complete' : 'completion-pill missing'}>{value.trim() ? 'Complete' : 'Needs text'}</span></div>
      <textarea id={section.id} name={section.field} rows={8} value={value} onChange={e => set(section.field, e.target.value)}/>
      <button type='button' className='btn secondary' onClick={() => set(section.field, getDefaultMethodByField(section.field, data))}>Restore standard wording</button>
    </section>;
  };

  const fixingTitle = reviewNav.targetIssueTitle || issues.find(issue => issue.id === reviewNav.targetIssueId)?.title || 'Review item';

  if (!draftReady) return <DashboardSkeleton/>;

  if (draftRecovery) return <>
    <header className='header'><div className='header-inner'><div className='brand'><img src='/branding/solarfx-logo-horizontal.png' alt='SolarFX'/><strong>RAMS Generator</strong></div></div></header>
    <main className='shell app-shell'><section className='card'><h1>The saved draft contains invalid photo data.</h1><p className='warning'>{draftRecovery.message}</p><p>The RAMS text data can be recovered, but one or more saved photo entries could not be restored safely.</p><div className='toolbar'><button className='btn primary' onClick={recoverDraftWithoutPhotos}>Recover draft without photos</button><button className='btn danger' onClick={clearBrokenDraft}>Clear draft and start again</button></div></section></main>
  </>;

  return <>
    <header className='header'><div className='header-inner'><div className='brand'><img src='/branding/solarfx-logo-horizontal.png' alt='SolarFX'/><strong>RAMS Generator</strong></div><div className='header-actions'><button type='button' className='btn secondary start-new-button' onClick={openStartNewModal}>Start new RAMS</button><button className='btn secondary header-logout' onClick={logout}>Log out</button></div></div></header>
    <main className='shell app-shell'>
      <nav className='wizard-nav-shell' aria-label='RAMS wizard progress'><div className='wizard-stepper' ref={stepperRef}>{steps.map((s, i) => {const summary = stepSummaries[i]; const hasErrors = summary.errors > 0; const hasWarnings = !hasErrors && summary.warnings > 0; const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'complete'; const count = hasErrors ? summary.errors : summary.warnings; const statusLabel = hasErrors ? summary.errors + ' mandatory issue' + (summary.errors === 1 ? '' : 's') : hasWarnings ? summary.warnings + ' warning' + (summary.warnings === 1 ? '' : 's') : 'complete'; return <button type='button' key={s} ref={element => {stepButtonRefs.current[i] = element;}} onClick={() => setStep(i)} className={'step step-' + status + ' ' + (i === step ? 'active' : '')} aria-current={i === step ? 'step' : undefined} aria-label={s + ', step ' + (i + 1) + ' of ' + steps.length + ', ' + statusLabel}><span className='step-index'>{i + 1}</span>{count > 0 ? <span className={'step-count ' + (hasWarnings ? 'warning-count' : '')} aria-hidden='true'>{count}</span> : <span className='step-status step-status-complete' aria-hidden='true'/>}<span className='step-label'>{s}</span></button>;})}</div></nav>
      {reviewNav.returnStep === 9 && step !== 9 && <div className='return-review'><div><span className='muted'>Fixing:</span> <strong>{fixingTitle}</strong></div><button className='btn secondary' onClick={() => {setStep(9); setReviewNav({});}}>Return to Review</button></div>}
      {message && <p className='warning' role='status'>{message}</p>}
      <div className='card'>
        {step === 0 && <><h1 id='step-heading'>Job details</h1><div className='grid two'>{field('Project reference', 'projectReference', 'field-project-reference')}{field('Customer name', 'customerName', 'field-customer-name')}{field('Site address', 'address', 'field-site-address')}{field('Postcode', 'postcode', 'field-postcode')}{field('Client', 'client', 'field-client')}{field('Principal contractor', 'principalContractor', 'field-principal-contractor')}{field('Installation company', 'installationCompany', 'field-installation-company')}{field('Prepared by', 'preparedBy', 'field-prepared-by')}{field('Competent assessor', 'assessor', 'field-assessor')}{field('Assessor position', 'assessorPosition', 'field-assessor-position')}{field('Site supervisor', 'siteSupervisor', 'field-site-supervisor')}{field('Qualified electrician', 'qualifiedElectrician', 'field-qualified-electrician')}{field('Number of operatives', 'numberOfOperatives', 'field-number-of-operatives')}{field('Assessment date', 'assessmentDate', 'field-assessment-date', 'date')}{field('Installation date', 'installDate', 'field-install-date', 'date')}{field('Revision', 'revision', 'field-revision')}{field('Document status', 'documentStatus', 'field-document-status')}{field('Emergency contact', 'emergencyContact', 'field-emergency-contact')}{field('Emergency phone', 'emergencyPhone', 'field-emergency-phone-job')}</div>{textareaField('Scope of works', 'scope', 'field-scope', 4)}</>}
        {step === 1 && <><h1 id='step-heading'>Import existing PDF</h1><p className='muted'>Import project details from an existing RAMS or survey PDF, then verify them before final output.</p><input type='file' accept='application/pdf' onChange={e => e.target.files?.[0] && importPdf(e.target.files[0])}/>{data.importedPdfAt && <p className='ok'>Imported on {new Date(data.importedPdfAt).toLocaleString('en-GB')}</p>}</>}
        {step === 2 && <><h1 id='step-heading'>System and work activities</h1><h2>Selected work activities</h2>{checkboxList('system-work-types', 'systemTypes', workTypes)}<div className='grid two' style={{marginTop: 18}}>{field('Panel quantity', 'panelQuantity', 'field-panel-quantity')}{field('Panel model', 'panelModel', 'field-panel-model')}{field('Inverter model', 'inverterModel', 'field-inverter-model')}{field('Battery model', 'batteryModel', 'field-battery-model')}{field('Proposed battery location', 'proposedBatteryLocation', 'proposed-battery-location')}{field('Proposed EV charger location', 'proposedEvLocation', 'proposed-ev-location')}</div><h2>Persons at risk</h2>{checkboxList('persons-at-risk-list', 'personsAtRisk', personsAtRiskOptions)}{textareaField('Other persons at risk', 'otherPersonsAtRisk', 'field-other-persons-at-risk', 2)}<h2>Plant, tools and equipment</h2>{checkboxList('equipment-list', 'equipment', equipmentOptions)}{textareaField('Equipment notes', 'equipmentNotes', 'field-equipment-notes', 3)}<h2>Materials</h2>{checkboxList('materials-list', 'materials', materialOptions)}{textareaField('Materials notes', 'materialNotes', 'field-material-notes', 3)}</>}
        {step === 3 && <><h1 id='step-heading'>Site conditions</h1><div className='grid two'>{field('Roof type', 'roofType', 'field-roof-type')}{field('Roof condition', 'roofCondition', 'field-roof-condition')}</div>{textareaField('Access notes', 'accessNotes', 'field-access-notes', 4)}{textareaField('Electrical notes', 'electricalNotes', 'field-electrical-notes', 4)}{textareaField('Environmental notes', 'environmentalNotes', 'field-environmental-notes', 4)}{textareaField('Environmental controls notes', 'environmentalControlsNotes', 'field-environmental-controls-notes', 4)}</>}
        {step === 4 && <SafeSection fallback='Photo upload could not load. Your draft is still available.'><><h1 id='step-heading'>Site photographs</h1><input type='file' accept='image/jpeg,image/png,image/webp' multiple onChange={e => addPhotos(e.target.files)}/><div className='photo-grid' style={{marginTop: 18}}>{data.photos.map((p, index) => <div className='photo' id={'photo-' + p.id} key={p.id}>{previewUrls[p.id] ? <img src={previewUrls[p.id]} alt={'Site photo ' + (index + 1)}/> : <div className='photo-missing'>Preview unavailable</div>}<label className='checkbox-card'><input type='checkbox' checked={!!p.includeInPdf} onChange={e => updatePhoto(p.id, {includeInPdf: e.target.checked})}/><span>Include in final PDF</span></label><div className='field'><label htmlFor={'photo-category-' + p.id}>Category</label><select id={'photo-category-' + p.id} value={p.category} onChange={e => updatePhoto(p.id, {category: e.target.value})}><option value=''>Select category</option><option>Potential hazard</option><option>Front elevation</option><option>Rear elevation</option><option>Roof</option><option>Roof access</option><option>Consumer unit</option><option>Battery location</option><option>EV charger location</option><option>Cable route</option><option>Trenching route</option></select></div><div className='field'><label htmlFor={'photo-caption-' + p.id}>Caption</label><input id={'photo-caption-' + p.id} value={p.caption} onChange={e => updatePhoto(p.id, {caption: e.target.value})}/></div><div className='field'><label htmlFor={'photo-surveyor-notes-' + p.id}>Surveyor notes</label><textarea id={'photo-surveyor-notes-' + p.id} value={p.surveyorNotes || ''} onChange={e => updatePhoto(p.id, {surveyorNotes: e.target.value})}/></div><div className='field'><label htmlFor={'photo-confirmed-controls-' + p.id}>Confirmed controls</label><textarea id={'photo-confirmed-controls-' + p.id} value={p.confirmedControls || ''} onChange={e => updatePhoto(p.id, {confirmedControls: e.target.value})}/></div><button className='btn danger' onClick={() => removePhoto(p)}>Remove</button></div>)}</div></></SafeSection>}
        {step === 5 && <SafeSection fallback='AI photo review could not load. You can continue without AI analysis.'><><div className='toolbar'><div><h1 id='step-heading'>AI hazard review</h1><p className='muted'>AI suggestions are observations only. Accept or reject every item.</p></div><button className='btn primary' disabled={!data.photos.length} onClick={analyse}>Analyse photographs</button></div><div className='grid'>{data.hazards.map((h, index) => <div className='hazard' id={'ai-suggestion-' + h.id} key={h.id}><span className='badge'>{h.hazardCode} - {Math.round(h.confidence * 100)}% confidence</span><h3>{h.title}</h3><p>{h.observation}</p><p><strong>Potential harm:</strong> {h.potentialHarm}</p><div className='field'><label htmlFor={'ai-controls-' + h.id}>Controls</label><textarea id={'ai-controls-' + h.id} value={h.controls.join('\\n')} onChange={e => updateHazard(h.id, {controls: e.target.value.split('\\n').map(x => x.trim()).filter(Boolean)})}/></div><div className='field'><label htmlFor={'ai-comment-' + h.id}>Assessor comment</label><input id={'ai-comment-' + h.id} value={h.assessorComment} onChange={e => updateHazard(h.id, {assessorComment: e.target.value})}/></div><p><strong>Status:</strong> {h.status}{h.reviewedAt ? ' - reviewed ' + new Date(h.reviewedAt).toLocaleString('en-GB') : ''}</p><button className='btn primary' onClick={() => acceptHazard(h, 'accepted')}>Assessor accepts</button> <button className='btn danger' onClick={() => acceptHazard(h, 'rejected')}>Reject</button>{index === 0 && <p className='muted'>Use Review Centre to return here directly if any suggestion remains unreviewed.</p>}</div>)}</div></></SafeSection>}
        {step === 6 && <><div className='toolbar'><div><h1 id='step-heading'>Risk assessment</h1><p>Scores are severity x likelihood. Suggested rows start unscored so the assessor must confirm risk scores.</p></div><div className='toolbar-actions'><button className='btn secondary' onClick={addRecommendedRisks}>Add recommended risks</button><button className='btn secondary' onClick={addRiskRow}>Add risk row</button></div></div><div id='risk-list'>{data.risks.map((r, index) => <div className='hazard' id={'risk-row-' + r.id} key={r.id}><h3>Risk row {index + 1}</h3>{r.code && <span className='badge'>{r.code} - {r.category}</span>}<div className='grid two'><div className='field'><label htmlFor={'risk-hazard-' + r.id}>Hazard</label><input id={'risk-hazard-' + r.id} value={r.hazard} onChange={e => updateRisk(r.id, {hazard: e.target.value})}/></div><div className='field'><label htmlFor={'risk-responsible-' + r.id}>Responsible person</label><input id={'risk-responsible-' + r.id} value={r.responsible} onChange={e => updateRisk(r.id, {responsible: e.target.value})}/></div></div><div className='field'><label htmlFor={'risk-persons-' + r.id}>Persons at risk</label><input id={'risk-persons-' + r.id} value={r.persons} onChange={e => updateRisk(r.id, {persons: e.target.value})}/></div><div className='field'><label htmlFor={'risk-harm-' + r.id}>Potential harm</label><input id={'risk-harm-' + r.id} value={r.harm} onChange={e => updateRisk(r.id, {harm: e.target.value})}/></div><div className='field'><label htmlFor={'risk-controls-' + r.id}>Existing control measures</label><textarea id={'risk-controls-' + r.id} value={r.controls} onChange={e => updateRisk(r.id, {controls: e.target.value})}/></div><div className='field'><label htmlFor={'risk-additional-controls-' + r.id}>Additional site-specific controls</label><textarea id={'risk-additional-controls-' + r.id} value={r.additionalControls || ''} onChange={e => updateRisk(r.id, {additionalControls: e.target.value})}/></div><div className='grid four'>{riskNumber(r, 'severity', 'Initial severity')}{riskNumber(r, 'likelihood', 'Initial likelihood')}{riskNumber(r, 'residualSeverity', 'Residual severity')}{riskNumber(r, 'residualLikelihood', 'Residual likelihood')}</div><p><strong>Initial:</strong> {score(r.severity, r.likelihood)} ({riskName(score(r.severity, r.likelihood))}) - <strong>Residual:</strong> {score(r.residualSeverity, r.residualLikelihood)} ({riskName(score(r.residualSeverity, r.residualLikelihood))})</p><div className='field'><label htmlFor={'risk-assessor-notes-' + r.id}>Assessor notes</label><textarea id={'risk-assessor-notes-' + r.id} value={r.assessorNotes || ''} onChange={e => updateRisk(r.id, {assessorNotes: e.target.value})}/></div><button className='btn danger' onClick={() => set('risks', data.risks.filter(x => x.id !== r.id))}>Remove risk row</button></div>)}</div></>}
        {step === 7 && <><h1 id='step-heading'>Method statement</h1><div className='method-section-list'>{methodSections.map(renderMethodSection)}</div>{textareaField('Senior-review notes for Very High residual risks', 'seniorReviewNotes', 'field-senior-review-notes', 4)}<h2>PPE matrix</h2><div className='grid three' id='ppe-matrix-list'>{ppeOptions.map(x => {const matrixItem = data.ppeMatrix.find(item => item.item === x); return <label className='checkbox-card ppe-card' key={x}><input type='checkbox' checked={data.ppe.includes(x)} onChange={() => toggleArray('ppe', x)}/><span><strong>{x}</strong>{matrixItem && <small>{matrixItem.task}</small>}</span></label>;})}</div>{textareaField('PPE notes', 'ppeNotes', 'field-ppe-notes', 3)}{textareaField('Monitoring and review notes', 'monitoringReviewNotes', 'field-monitoring-review-notes', 4)}</>}
        {step === 8 && <><h1 id='step-heading'>Emergency arrangements</h1><div className='grid two'>{field('First aider', 'firstAider', 'field-first-aider')}{field('First aid kit location', 'firstAidKitLocation', 'field-first-aid-kit-location')}{field('Nearest hospital', 'nearestHospital', 'field-nearest-hospital')}{field('Assembly point', 'assemblyPoint', 'field-assembly-point')}{field('Fire extinguisher location', 'fireExtinguisherLocation', 'field-fire-extinguisher-location')}{field('Site isolation point', 'siteIsolationPoint', 'field-site-isolation-point')}{field('Emergency contact', 'emergencyContact', 'field-emergency-contact-emergency')}{field('Emergency phone', 'emergencyPhone', 'field-emergency-phone')}</div>{textareaField('PV shutdown / isolation information', 'pvShutdownInfo', 'field-pv-shutdown', 4)}{data.systemTypes.includes('Battery storage') && textareaField('Battery shutdown / isolation information', 'batteryShutdownInfo', 'field-battery-shutdown', 4)}{data.systemTypes.includes('EV charger') && textareaField('EV charger shutdown / isolation information', 'evShutdownInfo', 'field-ev-shutdown', 4)}<p><strong>Emergency services:</strong> 999</p></>}
        {step === 9 && <><h1 id='step-heading'>Final review</h1><section className={'review-centre ' + (blockingIssues.length ? 'review-error' : warningIssues.length ? 'review-warning' : 'review-ok')} aria-labelledby='review-centre-heading'><div className='toolbar'><div><h2 id='review-centre-heading'>Review Centre</h2><p aria-live='polite'>{blockingIssues.length ? blockingIssues.length + ' mandatory item' + (blockingIssues.length === 1 ? '' : 's') + ' must be completed before PDF generation.' : warningIssues.length ? warningIssues.length + ' item' + (warningIssues.length === 1 ? '' : 's') + ' require review.' : 'All required items are complete.'}</p></div><button className='btn primary' disabled={!issues.length} onClick={fixNext}>Fix next issue</button></div>{issues.length === 0 && <p className='ok'>All required items are complete. PDF generation is available.</p>}{steps.map((label, idx) => {const stepIssues = issues.filter(issue => issue.step === idx); if (!stepIssues.length) return null; return <div className='review-group' key={label}><h3>{label}</h3><div className='review-issue-list'>{stepIssues.map(issue => <article className={'review-issue issue-' + issue.severity} key={issue.id} id={'review-issue-' + issue.id}><div className='issue-icon' aria-hidden='true'>{severityIcon(issue.severity)}</div><div><p className='issue-meta'>{issue.blocking ? 'Mandatory' : 'Review'} - {categoryLabel(issue)}</p><h4>{issue.title}</h4><p>{issue.description}</p></div><button className='btn secondary' onClick={() => navigateToIssue(issue)} aria-label={issue.actionLabel + ': ' + issue.title}>{issue.actionLabel}</button></article>)}</div></div>;})}</section><h2>Final declarations</h2>{REQUIRED_DECLARATIONS.map(([key, label]) => {const disabled = key === 'aiReviewed' && !allAiReviewed; const checked = key === 'aiReviewed' ? allAiReviewed && !!data.declarations[key] : !!data.declarations[key]; return <label className='checkbox-card' id={'declaration-' + key} key={key}><input type='checkbox' checked={checked} disabled={disabled} onChange={e => set('declarations', {...data.declarations, [key]: e.target.checked})}/><span>{label}{disabled && <em className='muted'> Complete AI reviews first.</em>}</span></label>;})}<div className='grid two' style={{marginTop: 16}}>{field('Approval name', 'approvalName', 'field-approval-name')}{field('Approved by', 'approvedBy', 'field-approved-by')}{field('Approval date', 'approvalDate', 'field-approval-date', 'date')}{field('Prepared signature', 'preparedSignature', 'field-prepared-signature')}{field('Assessed signature', 'assessedSignature', 'field-assessed-signature')}{field('Approved signature', 'approvedSignature', 'field-approved-signature')}</div><p className={ready ? 'ok' : 'error'}>{ready ? 'Ready to generate the combined PDF.' : 'Complete ' + blockingIssues.length + ' mandatory item' + (blockingIssues.length === 1 ? '' : 's') + ' before generating the PDF.'}</p><p className={data.pdfDownloadedAt ? 'ok' : 'warning'}>{data.pdfDownloadedAt ? 'PDF downloaded on ' + new Date(data.pdfDownloadedAt).toLocaleString('en-GB') + (data.pdfFileName ? ' - ' + data.pdfFileName : '') : 'PDF has not yet been downloaded.'}</p><div className='review-actions'><button className='btn primary' type='button' aria-disabled={!ready} onClick={pdf}>Generate and download PDF</button><div className='start-new-review-action'><button type='button' className='btn secondary start-new-button' onClick={openStartNewModal}>Start new RAMS</button><span className='muted'>Clear all fields and begin a new job</span></div></div></>}
        <div className='toolbar' style={{marginTop: 24}}><button className='btn secondary' disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</button><span className='muted'>Draft saves automatically on this device.</span><button className='btn primary' disabled={step === steps.length - 1} onClick={() => setStep(s => s + 1)}>Next</button></div>
      </div>
    </main>
    {startNewOpen && <div className='modal-backdrop' role='presentation' onMouseDown={event => {if (event.target === event.currentTarget) closeStartNewModal();}}><section className='confirm-modal' id='start-new-rams-modal' role='dialog' aria-modal='true' aria-labelledby='start-new-rams-title'><h2 id='start-new-rams-title'>Start a new RAMS?</h2><p>This clears the current draft from this device so you can begin a new job.</p>{!data.pdfDownloadedAt && <p className='modal-warning'>This RAMS has not been downloaded as a PDF.</p>}<label className='checkbox-card confirm-checkbox'><input type='checkbox' checked={startNewConfirmed} onChange={event => setStartNewConfirmed(event.target.checked)}/><span>I understand the current draft will be deleted.</span></label><div className='modal-actions'><button type='button' className='btn secondary' ref={modalCancelRef} onClick={closeStartNewModal}>Cancel</button><button type='button' className='btn danger' disabled={!startNewConfirmed} onClick={confirmStartNewRams}>Start new RAMS</button></div></section></div>}
  </>;
}
