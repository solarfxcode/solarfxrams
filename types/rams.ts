export type WorkType =
  | 'Solar PV'
  | 'Battery storage'
  | 'EV charger'
  | 'EPS / backup'
  | 'Consumer unit work'
  | 'Trenching'
  | 'External cable route'
  | 'Roof work'
  | 'Loft work'
  | 'Scaffold'
  | 'Mobile tower'
  | 'MEWP'
  | 'Ladder access';

export type RevisionHistoryEntry = {
  revision: string;
  date: string;
  description: string;
  preparedBy: string;
  approvedBy?: string;
};

export type Photo = {
  id: string;
  name: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  storageRef?: string;
  dataUrl?: string;
  category: string;
  caption: string;
  includeInPdf?: boolean;
  surveyorNotes?: string;
  aiObservation?: string;
  confirmedHazard?: string;
  confirmedControls?: string;
  assessorDecision?: string;
  takenAt?: string;
  originalFilename?: string;
};

export type HazardSuggestion = {
  id: string;
  photoId: string;
  hazardCode: string;
  title: string;
  observation: string;
  potentialHarm: string;
  controls: string[];
  confidence: number;
  status: 'pending' | 'accepted' | 'rejected' | 'amended';
  assessorComment: string;
  reviewedAt?: string;
  reviewedBy?: string;
};

export type HazardLibraryEntry = {
  code: string;
  category: string;
  activity: string;
  hazard: string;
  potentialHarm: string;
  personsAtRisk: string[];
  defaultControls: string[];
  additionalControls: string[];
  responsibleRole: string;
  applicableWorkTypes: string[];
  recommendedPpe: string[];
  recommendedMethodSection: string;
  photoEvidenceUseful: boolean;
};

export type RiskRow = {
  id: string;
  code?: string;
  category?: string;
  activity?: string;
  hazard: string;
  harm: string;
  persons: string;
  controls: string;
  additionalControls?: string;
  severity: number;
  likelihood: number;
  residualSeverity: number;
  residualLikelihood: number;
  responsible: string;
  source: string;
  relatedPhotoId?: string;
  assessorNotes?: string;
  recommendedPpe?: string[];
  recommendedMethodSection?: string;
  photoEvidenceUseful?: boolean;
};

export type PpeMatrixItem = {
  item: string;
  required: boolean;
  task: string;
  applicableWorkTypes: string[];
};

export type BriefingRegisterEntry = {
  name: string;
  role: string;
  signature: string;
  date: string;
  time: string;
};

export type RamsData = {
  projectReference: string;
  customerName: string;
  address: string;
  postcode: string;
  client: string;
  principalContractor: string;
  installationCompany: string;
  preparedBy: string;
  assessor: string;
  assessorPosition: string;
  siteSupervisor: string;
  qualifiedElectrician: string;
  numberOfOperatives: string;
  installDate: string;
  assessmentDate: string;
  reviewDate: string;
  revision: string;
  approvedBy: string;
  documentStatus: string;
  revisionHistory: RevisionHistoryEntry[];
  emergencyContact: string;
  emergencyPhone: string;
  scope: string;
  systemTypes: string[];
  panelQuantity: string;
  panelModel: string;
  inverterModel: string;
  batteryModel: string;
  proposedBatteryLocation: string;
  proposedEvLocation: string;
  roofType: string;
  roofCondition: string;
  accessNotes: string;
  electricalNotes: string;
  environmentalNotes: string;
  environmentalControlsNotes: string;
  monitoringReviewNotes: string;
  methodStatement: string;
  deliveryStorageMethod: string;
  accessMethod: string;
  roofWorkMethod: string;
  dcInstallationMethod: string;
  inverterInstallationMethod: string;
  batteryInstallationMethod: string;
  trenchingMethod: string;
  evChargerInstallationMethod: string;
  consumerUnitMethod: string;
  loftWorkMethod: string;
  externalCableRouteMethod: string;
  epsBackupMethod: string;
  acConnectionMethod: string;
  commissioningHandoverMethod: string;
  seniorReviewNotes: string;
  pvShutdownInfo: string;
  batteryShutdownInfo: string;
  evShutdownInfo: string;
  siteIsolationPoint: string;
  firstAider: string;
  firstAidKitLocation: string;
  nearestHospital: string;
  assemblyPoint: string;
  fireExtinguisherLocation: string;
  approvalName: string;
  approvalDate: string;
  preparedSignature: string;
  assessedSignature: string;
  approvedSignature: string;
  clientAcknowledgementName: string;
  clientAcknowledgementSignature: string;
  clientAcknowledgementDate: string;
  personsAtRisk: string[];
  otherPersonsAtRisk: string;
  equipment: string[];
  equipmentNotes: string;
  materials: string[];
  materialNotes: string;
  ppe: string[];
  ppeNotes: string;
  ppeMatrix: PpeMatrixItem[];
  photos: Photo[];
  hazards: HazardSuggestion[];
  risks: RiskRow[];
  briefingRegister: BriefingRegisterEntry[];
  declarations: Record<string, boolean>;
  importedPdfAt?: string;
  pdfDownloadedAt?: string;
  pdfFileName?: string;
};

export type ReviewIssueSeverity = 'error' | 'warning' | 'info';
export type ReviewIssueCategory =
  | 'job'
  | 'import'
  | 'system'
  | 'site'
  | 'photos'
  | 'ai'
  | 'risk'
  | 'method'
  | 'emergency'
  | 'declarations';

export type ReviewIssue = {
  id: string;
  severity: ReviewIssueSeverity;
  category: ReviewIssueCategory;
  step: number;
  stepLabel: string;
  title: string;
  description: string;
  blocking: boolean;
  fieldId?: string;
  entityId?: string;
  photoId?: string;
  riskId?: string;
  actionLabel: string;
};

export type ReviewNavigationState = {
  returnStep?: number;
  targetIssueId?: string;
  targetFieldId?: string;
  targetIssueTitle?: string;
};
