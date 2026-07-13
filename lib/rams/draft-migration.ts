import {createDefaultPpeMatrix, createEmptyDraft} from '@/lib/defaults';
import {getMethodSectionsForDraft} from '@/lib/rams/default-methods';
import type {BriefingRegisterEntry, Photo, RamsData, RiskRow} from '@/types/rams';

type LegacyRamsDraft = Partial<RamsData> & {
  batteryLocation?: string;
  evChargerLocation?: string;
};

const arrayOr = <T>(value: unknown, fallback: T[]) => Array.isArray(value) ? value as T[] : fallback;
const stringArrayOr = (value: unknown, fallback: string[]) => Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback;

function migratePhotos(value: unknown): Photo[] {
  return arrayOr<Partial<Photo>>(value, []).map(photo => ({
    id: String(photo.id || 'photo-' + Math.random().toString(16).slice(2)),
    name: String(photo.name || photo.originalFilename || 'Site photo'),
    dataUrl: String(photo.dataUrl || ''),
    category: String(photo.category || ''),
    caption: String(photo.caption || ''),
    includeInPdf: Boolean(photo.includeInPdf),
    surveyorNotes: String(photo.surveyorNotes || ''),
    aiObservation: String(photo.aiObservation || ''),
    confirmedHazard: String(photo.confirmedHazard || ''),
    confirmedControls: String(photo.confirmedControls || ''),
    assessorDecision: String(photo.assessorDecision || ''),
    takenAt: photo.takenAt,
    originalFilename: String(photo.originalFilename || photo.name || '')
  }));
}

function migrateRisks(value: unknown): RiskRow[] {
  return arrayOr<Partial<RiskRow>>(value, []).map(risk => ({
    id: String(risk.id || 'risk-' + Math.random().toString(16).slice(2)),
    code: risk.code,
    category: risk.category,
    activity: risk.activity,
    hazard: String(risk.hazard || ''),
    harm: String(risk.harm || ''),
    persons: String(risk.persons || 'Installers / occupants / public as applicable'),
    controls: String(risk.controls || ''),
    additionalControls: String(risk.additionalControls || ''),
    severity: Number(risk.severity || 0),
    likelihood: Number(risk.likelihood || 0),
    residualSeverity: Number(risk.residualSeverity || 0),
    residualLikelihood: Number(risk.residualLikelihood || 0),
    responsible: String(risk.responsible || ''),
    source: String(risk.source || 'manual'),
    relatedPhotoId: risk.relatedPhotoId,
    assessorNotes: String(risk.assessorNotes || ''),
    recommendedPpe: arrayOr<string>(risk.recommendedPpe, []),
    recommendedMethodSection: risk.recommendedMethodSection,
    photoEvidenceUseful: Boolean(risk.photoEvidenceUseful)
  }));
}

function ensureRevisionHistory(data: RamsData) {
  if (data.revisionHistory.length) return data.revisionHistory;
  return [{
    revision: data.revision || '1',
    date: data.assessmentDate || new Date().toISOString().slice(0, 10),
    description: 'Current RAMS issue',
    preparedBy: data.preparedBy || data.assessor || 'SolarFX',
    approvedBy: data.approvedBy || data.approvalName || ''
  }];
}

function mergeMissingMethodDefaults(data: RamsData, source: LegacyRamsDraft) {
  const next = {...data};
  getMethodSectionsForDraft(next).forEach(section => {
    if (source[section.field] === undefined) next[section.field] = section.getDefault(next) as never;
  });
  return next;
}

export function populateDefaultsForWorkType(draft: RamsData, workType: string): RamsData {
  const next = {...draft};
  if (!next.systemTypes.includes(workType)) next.systemTypes = [...next.systemTypes, workType];
  getMethodSectionsForDraft(next).forEach(section => {
    if (!String(next[section.field] || '').trim()) next[section.field] = section.getDefault(next) as never;
  });
  next.ppeMatrix = createDefaultPpeMatrix(next.systemTypes).map(item => {
    const existing = next.ppeMatrix.find(current => current.item === item.item);
    return existing ? {...item, required: existing.required || item.required, task: existing.task || item.task} : item;
  });
  return next;
}

export function migrateRamsDraft(draft: LegacyRamsDraft = {}): RamsData {
  const empty = createEmptyDraft();
  const systemTypes = stringArrayOr(draft.systemTypes, empty.systemTypes);
  const merged: RamsData = {
    ...empty,
    ...draft,
    installationCompany: draft.installationCompany ?? empty.installationCompany,
    approvedBy: draft.approvedBy ?? draft.approvalName ?? empty.approvedBy,
    documentStatus: draft.documentStatus ?? empty.documentStatus,
    proposedBatteryLocation: draft.proposedBatteryLocation ?? draft.batteryLocation ?? empty.proposedBatteryLocation,
    proposedEvLocation: draft.proposedEvLocation ?? draft.evChargerLocation ?? empty.proposedEvLocation,
    declarations: {...empty.declarations, ...(draft.declarations || {})},
    systemTypes,
    personsAtRisk: stringArrayOr(draft.personsAtRisk, empty.personsAtRisk),
    equipment: stringArrayOr(draft.equipment, empty.equipment),
    materials: stringArrayOr(draft.materials, empty.materials),
    ppe: stringArrayOr(draft.ppe, empty.ppe),
    ppeMatrix: arrayOr(draft.ppeMatrix, createDefaultPpeMatrix(systemTypes)),
    photos: migratePhotos(draft.photos),
    hazards: arrayOr(draft.hazards, []),
    risks: migrateRisks(draft.risks),
    revisionHistory: arrayOr(draft.revisionHistory, []),
    briefingRegister: arrayOr<BriefingRegisterEntry>(draft.briefingRegister, [])
  };
  merged.revisionHistory = ensureRevisionHistory(merged);
  return mergeMissingMethodDefaults(merged, draft);
}
