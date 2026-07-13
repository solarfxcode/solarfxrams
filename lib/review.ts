import type {RamsData,ReviewIssue,ReviewIssueCategory,ReviewIssueSeverity} from '@/types/rams';

export const REVIEW_STEP_LABELS=['Job','Import','System','Site','Photos','AI hazards','Risk','Method','Emergency','Review & PDF'] as const;
export const REQUIRED_DECLARATIONS=[
  ['siteReviewed','Site details and conditions have been reviewed.'],
  ['importVerified','Imported PDF information has been verified.'],
  ['controlsAvailable','Selected control measures will be available.'],
  ['aiReviewed','All AI suggestions have been reviewed by a competent person.'],
  ['briefing','Operatives will be briefed before work starts.'],
  ['changeReview','RAMS will be reviewed if conditions change.']
] as const;

type IssueInput={id:string;severity?:ReviewIssueSeverity;category:ReviewIssueCategory;step:number;title:string;description:string;blocking?:boolean;fieldId?:string;entityId?:string;photoId?:string;riskId?:string;actionLabel:string};
const text=(value:unknown)=>String(value??'').trim();
const lower=(value:unknown)=>text(value).toLowerCase();
const hasWork=(data:RamsData,name:string)=>Array.isArray(data.systemTypes)&&data.systemTypes.includes(name);
const includesAny=(value:unknown,terms:string[])=>terms.some(term=>lower(value).includes(term));
const isMissing=(value:unknown)=>text(value).length===0;
const positiveNumber=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)&&value>0;
const residualScore=(risk:{residualSeverity:number;residualLikelihood:number})=>(Number(risk.residualSeverity)||0)*(Number(risk.residualLikelihood)||0);
function issue(input:IssueInput):ReviewIssue{return{severity:input.severity??(input.blocking===false?'warning':'error'),blocking:input.blocking??true,stepLabel:REVIEW_STEP_LABELS[input.step]??'Review',...input};}

export function getReviewIssues(data:RamsData):ReviewIssue[]{
  const issues:ReviewIssue[]=[];
  const add=(input:IssueInput)=>issues.push(issue(input));
  const declarations=data.declarations||{};
  const systemTypes=Array.isArray(data.systemTypes)?data.systemTypes:[];
  const photos=Array.isArray(data.photos)?data.photos:[];
  const hazards=Array.isArray(data.hazards)?data.hazards:[];
  const risks=Array.isArray(data.risks)?data.risks:[];

  if(isMissing(data.customerName))add({id:'job-customer-name',category:'job',step:0,title:'Customer name missing',description:'Add the customer name for this RAMS.',fieldId:'field-customer-name',actionLabel:'Go to Job'});
  if(isMissing(data.address))add({id:'job-site-address',category:'job',step:0,title:'Site address missing',description:'Add the installation site address.',fieldId:'field-site-address',actionLabel:'Go to Job'});
  if(isMissing(data.projectReference))add({id:'job-project-reference',category:'job',step:0,title:'Project reference missing',description:'Add the SolarFX project or job reference.',fieldId:'field-project-reference',actionLabel:'Go to Job'});
  if(isMissing(data.assessor))add({id:'job-assessor',category:'job',step:0,title:'Assessor name missing',description:'Name the competent assessor responsible for this RAMS.',fieldId:'field-assessor',actionLabel:'Go to Job'});
  if(isMissing(data.assessmentDate))add({id:'job-assessment-date',category:'job',step:0,title:'Assessment date missing',description:'Add the RAMS assessment date.',fieldId:'field-assessment-date',actionLabel:'Go to Job'});

  if(data.importedPdfAt&&!declarations.importVerified)add({id:'import-not-verified',severity:'warning',blocking:false,category:'import',step:1,title:'Imported PDF details not verified',description:'Check the extracted PDF values and tick the import verification declaration.',fieldId:'declaration-importVerified',actionLabel:'Verify Import'});

  if(systemTypes.length===0)add({id:'system-work-types',category:'system',step:2,title:'No work activities selected',description:'Select the work activities included in this RAMS.',fieldId:'system-work-types',actionLabel:'Go to System'});
  if(hasWork(data,'Solar PV')&&isMissing(data.panelQuantity))add({id:'system-panel-quantity',category:'system',step:2,title:'Panel quantity missing',description:'Solar PV is selected, so add the planned panel quantity.',fieldId:'field-panel-quantity',actionLabel:'Go to System'});
  if(hasWork(data,'Battery storage')&&isMissing(data.proposedBatteryLocation))add({id:'system-battery-location',category:'system',step:2,title:'Battery location missing',description:'Battery storage is selected, so add the proposed battery location.',fieldId:'proposed-battery-location',actionLabel:'Go to System'});
  if(hasWork(data,'EV charger')&&isMissing(data.proposedEvLocation))add({id:'system-ev-location',category:'system',step:2,title:'EV charger location missing',description:'EV charger work is selected, so add the proposed charger location.',fieldId:'proposed-ev-location',actionLabel:'Go to System'});

  if(hasWork(data,'Roof work')&&isMissing(data.roofType))add({id:'site-roof-type',category:'site',step:3,title:'Roof type missing',description:'Roof work is selected, so record the roof type.',fieldId:'field-roof-type',actionLabel:'Go to Site'});
  if(hasWork(data,'Roof work')&&isMissing(data.accessNotes))add({id:'site-access-method',category:'site',step:3,title:'Access method not confirmed',description:'Record how the roof or work area will be accessed safely.',fieldId:'field-access-notes',actionLabel:'Go to Site'});
  if(hasWork(data,'Scaffold')&&!includesAny(data.accessNotes,['scaffold','handover','review','tag']))add({id:'site-scaffold-review',severity:'warning',blocking:false,category:'site',step:3,title:'Scaffold requirement needs review',description:'Scaffold is selected. Note the scaffold inspection, handover or access plan.',fieldId:'field-access-notes',actionLabel:'Go to Site'});
  if(includesAny(String(data.accessNotes)+' '+String(data.environmentalNotes),['asbestos'])&&!includesAny(String(data.accessNotes)+' '+String(data.environmentalNotes),['stop','do not disturb','survey','specialist']))add({id:'site-asbestos-control',category:'site',step:3,title:'Suspected asbestos needs stop-work control',description:'If asbestos is suspected, record the stop-work control or specialist survey requirement.',fieldId:'field-environmental-notes',actionLabel:'Go to Site'});
  if(includesAny(String(data.accessNotes)+' '+String(data.environmentalNotes),['public','occupant','customer access'])&&!includesAny(String(data.accessNotes)+' '+String(data.environmentalNotes),['barrier','exclusion','segregat','signage']))add({id:'site-public-exclusion',category:'site',step:3,title:'Public access controls missing',description:'Public or customer access is noted. Add exclusion-zone controls, barriers or signage.',fieldId:'field-environmental-notes',actionLabel:'Go to Site'});

  photos.forEach((photo,index)=>{
    const photoTarget='photo-'+photo.id;
    if(isMissing(photo.category))add({id:'photo-'+photo.id+'-category',severity:'warning',blocking:false,category:'photos',step:4,title:'Photo category missing',description:'Photo '+(index+1)+' needs a category.',fieldId:photoTarget,photoId:photo.id,actionLabel:'Review Photo '+(index+1)});
    if(photo.category==='Potential hazard'&&isMissing(photo.caption))add({id:'photo-'+photo.id+'-hazard-notes',severity:'warning',blocking:false,category:'photos',step:4,title:'Potential-hazard photo needs notes',description:'Photo '+(index+1)+' is marked as a potential hazard. Add a short note or caption.',fieldId:photoTarget,photoId:photo.id,actionLabel:'Review Photo '+(index+1)});
    if(isMissing(photo.caption))add({id:'photo-'+photo.id+'-caption',severity:'warning',blocking:false,category:'photos',step:4,title:'Photo caption missing',description:'Photo '+(index+1)+' will appear in the final PDF. Add a caption for context.',fieldId:photoTarget,photoId:photo.id,actionLabel:'Review Photo '+(index+1)});
  });

  hazards.forEach((hazard,index)=>{
    const hazardTarget='ai-suggestion-'+hazard.id;
    if(hazard.status==='pending')add({id:'ai-'+hazard.id+'-pending',category:'ai',step:5,title:'AI hazard suggestion requires review',description:(hazard.title||'Suggestion')+(hazard.observation?': '+hazard.observation:''),fieldId:hazardTarget,entityId:hazard.id,photoId:hazard.photoId,actionLabel:'Review AI Suggestion '+(index+1)});
    if((hazard.status==='accepted'||hazard.status==='amended')&&isMissing(data.assessor))add({id:'ai-'+hazard.id+'-assessor',category:'ai',step:0,title:'Accepted AI suggestion needs assessor',description:'Add the competent assessor name linked to this AI review.',fieldId:'field-assessor',entityId:hazard.id,actionLabel:'Go to Job'});
    if((hazard.status==='accepted'||hazard.status==='amended')&&isMissing(hazard.reviewedAt))add({id:'ai-'+hazard.id+'-timestamp',category:'ai',step:5,title:'AI review timestamp missing',description:'Review this suggestion again so the acceptance or rejection timestamp is recorded.',fieldId:hazardTarget,entityId:hazard.id,actionLabel:'Review AI Suggestion '+(index+1)});
    if(hazard.status==='accepted'&&(!Array.isArray(hazard.controls)||hazard.controls.length===0||hazard.controls.every(isMissing)))add({id:'ai-'+hazard.id+'-controls',category:'ai',step:5,title:'Accepted AI suggestion has no controls',description:'Accepted AI observations must include control measures before they can support the RAMS.',fieldId:hazardTarget,entityId:hazard.id,actionLabel:'Review AI Suggestion '+(index+1)});
  });

  if(risks.length===0)add({id:'risk-none',category:'risk',step:6,title:'No risk assessment rows',description:'Add at least one risk row or accept an AI suggestion that creates one.',fieldId:'risk-list',actionLabel:'Review Risk'});
  risks.forEach((risk,index)=>{
    const rowTarget='risk-row-'+risk.id;
    const rowName=risk.hazard||'risk row '+(index+1);
    if(isMissing(risk.hazard))add({id:'risk-'+risk.id+'-hazard',category:'risk',step:6,title:'Risk hazard missing',description:'Risk row '+(index+1)+' needs a hazard description.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(!positiveNumber(risk.severity))add({id:'risk-'+risk.id+'-severity',category:'risk',step:6,title:'Initial severity missing',description:'Complete the initial severity for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(!positiveNumber(risk.likelihood))add({id:'risk-'+risk.id+'-likelihood',category:'risk',step:6,title:'Initial likelihood missing',description:'Complete the initial likelihood for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(!positiveNumber(risk.residualSeverity))add({id:'risk-'+risk.id+'-residual-severity',category:'risk',step:6,title:'Residual severity missing',description:'Complete the residual severity for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(!positiveNumber(risk.residualLikelihood))add({id:'risk-'+risk.id+'-residual-likelihood',category:'risk',step:6,title:'Residual likelihood missing',description:'Complete the residual likelihood for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(isMissing(risk.responsible))add({id:'risk-'+risk.id+'-responsible',category:'risk',step:6,title:'Responsible person missing',description:'Assign a responsible person for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(isMissing(risk.controls))add({id:'risk-'+risk.id+'-controls',category:'risk',step:6,title:'Control measures missing',description:'Add control measures for '+rowName+'.',fieldId:rowTarget,riskId:risk.id,actionLabel:'Review Risk'});
    if(residualScore(risk)>15&&isMissing(data.seniorReviewNotes))add({id:'risk-'+risk.id+'-very-high',category:'risk',step:7,title:'Very High residual risk needs senior review',description:rowName+' has a Very High residual score. Add senior-review notes before PDF generation.',fieldId:'field-senior-review-notes',riskId:risk.id,actionLabel:'Review Method'});
  });
  hazards.filter(h=>h.status==='accepted').forEach((hazard,index)=>{
    if(!risks.some(r=>r.source===hazard.id))add({id:'risk-ai-'+hazard.id+'-missing',category:'risk',step:6,title:'Accepted AI hazard missing from risk assessment',description:(hazard.title||'Accepted AI hazard '+(index+1))+' is accepted but not represented in the risk rows.',fieldId:'risk-list',entityId:hazard.id,actionLabel:'Review Risk'});
  });

  if(isMissing(data.scope))add({id:'method-scope',category:'method',step:0,title:'Scope of works empty',description:'Add the scope of works for this RAMS.',fieldId:'field-scope',actionLabel:'Go to Job'});
  if(isMissing(data.methodStatement))add({id:'method-empty',category:'method',step:7,title:'Method statement missing',description:'Add the safe system of work for the installation.',fieldId:'field-method-statement',actionLabel:'Review Method'});
  if(hasWork(data,'Battery storage')&&isMissing(data.batteryInstallationMethod))add({id:'method-battery',severity:'warning',blocking:false,category:'method',step:7,title:'Battery installation method missing',description:'Battery storage is selected. Add the battery installation method, mounting arrangement, clearances and ventilation requirements.',fieldId:'battery-installation-method',actionLabel:'Review Method'});
  if(hasWork(data,'Trenching')&&!includesAny(data.methodStatement,['trench','excavat','duct']))add({id:'method-trenching',severity:'warning',blocking:false,category:'method',step:7,title:'Trenching method missing',description:'Trenching is selected. Add excavation, service avoidance and reinstatement controls.',fieldId:'field-method-statement',actionLabel:'Review Method'});
  if(hasWork(data,'EV charger')&&!includesAny(data.methodStatement,['ev','charger']))add({id:'method-ev',severity:'warning',blocking:false,category:'method',step:7,title:'EV charger method missing',description:'EV charger work is selected. Add the installation and commissioning method.',fieldId:'field-method-statement',actionLabel:'Review Method'});

  if(isMissing(data.emergencyPhone))add({id:'emergency-contact',category:'emergency',step:8,title:'Emergency contact missing',description:'Add the site emergency contact number.',fieldId:'field-emergency-phone',actionLabel:'Go to Emergency'});
  if(isMissing(data.firstAider))add({id:'emergency-first-aider',category:'emergency',step:8,title:'First-aid arrangements missing',description:'Name the first aider or first-aid arrangement for the site.',fieldId:'field-first-aider',actionLabel:'Go to Emergency'});
  if(isMissing(data.assemblyPoint))add({id:'emergency-assembly-point',category:'emergency',step:8,title:'Assembly point missing',description:'Add the fire or emergency assembly point.',fieldId:'field-assembly-point',actionLabel:'Go to Emergency'});
  if(hasWork(data,'Solar PV')&&isMissing(data.pvShutdownInfo))add({id:'emergency-pv-shutdown',category:'emergency',step:8,title:'PV shutdown information missing',description:'Solar PV work is selected. Add the PV shutdown or isolation information.',fieldId:'field-pv-shutdown',actionLabel:'Go to Emergency'});
  if(hasWork(data,'Battery storage')&&isMissing(data.batteryShutdownInfo))add({id:'emergency-battery-shutdown',category:'emergency',step:8,title:'Battery shutdown information missing',description:'Battery storage is selected. Add the battery shutdown or isolation information.',fieldId:'field-battery-shutdown',actionLabel:'Go to Emergency'});

  REQUIRED_DECLARATIONS.forEach(([key,label])=>{
    if(!declarations[key])add({id:'declaration-'+key,category:'declarations',step:9,title:'Final declaration unchecked',description:label,fieldId:'declaration-'+key,actionLabel:'Go to Review'});
  });
  if(isMissing(data.approvalName))add({id:'declaration-approval-name',category:'declarations',step:9,title:'Approval name missing',description:'Add the name of the person approving this RAMS.',fieldId:'field-approval-name',actionLabel:'Go to Review'});
  if(isMissing(data.approvalDate))add({id:'declaration-approval-date',category:'declarations',step:9,title:'Approval date missing',description:'Add the approval date for this RAMS.',fieldId:'field-approval-date',actionLabel:'Go to Review'});
  if(isMissing(data.assessorPosition))add({id:'declaration-assessor-position',category:'declarations',step:9,title:'Assessor position missing',description:'Add the assessor position or role.',fieldId:'field-assessor-position',actionLabel:'Go to Review'});

  return issues;
}

export function getNextReviewIssue(issues:ReviewIssue[]):ReviewIssue|undefined{return issues.find(issue=>issue.blocking)||issues.find(issue=>issue.severity==='warning')||issues[0];}
export function hasBlockingReviewIssues(issues:ReviewIssue[]):boolean{return issues.some(issue=>issue.blocking);}
export function getReviewStepSummaries(issues:ReviewIssue[]){return REVIEW_STEP_LABELS.map((label,step)=>{const stepIssues=issues.filter(issue=>issue.step===step);const errors=stepIssues.filter(issue=>issue.blocking).length;const warnings=stepIssues.filter(issue=>!issue.blocking).length;return{step,label,errors,warnings,total:stepIssues.length,state:errors?'error':warnings?'warning':'complete'};});}
export function isPdfReadyFromIssues(issues:ReviewIssue[]):boolean{return !hasBlockingReviewIssues(issues);}
