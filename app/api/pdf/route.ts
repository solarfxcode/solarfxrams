import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {NextRequest, NextResponse} from 'next/server';
import {jsPDF} from 'jspdf';
import {SESSION_COOKIE_NAME, verifySession} from '@/lib/auth';
import {buildRamsPdfModel, type RamsPdfModel} from '@/lib/rams/pdf-model';

const pageWidth = 210;
const pageHeight = 297;
const margin = 14;
const contentWidth = pageWidth - margin * 2;
const solarBlue = [0, 107, 255] as const;
const darkText = [20, 29, 43] as const;
const softLine = [214, 224, 238] as const;

const clean = (value: unknown) => String(value ?? '').trim();
const riskName = (value: number) => value <= 0 ? 'Not scored' : value <= 5 ? 'Low' : value <= 10 ? 'Medium' : value <= 15 ? 'High' : 'Very High';

async function loadLogoDataUrl() {
  try {
    const bytes = await readFile(path.join(process.cwd(), 'public', 'branding', 'solarfx-logo-horizontal.png'));
    return 'data:image/png;base64,' + Buffer.from(bytes).toString('base64');
  } catch {
    return '';
  }
}

function photoNumber(index: number) {
  return 'Photo ' + (index + 1);
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;
  if (!session) return NextResponse.json({error: 'Not authenticated.'}, {status: 401});

  let payload: {data?: unknown; pdfFileName?: string};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({error: 'Invalid PDF request.'}, {status: 400});
  }
  if (!payload?.data) return NextResponse.json({error: 'Invalid PDF request.'}, {status: 400});

  const model = buildRamsPdfModel(payload.data as Partial<RamsPdfModel> as any);
  const filename = clean(payload.pdfFileName) || (model.documentControl.documentId.replace(/[^a-z0-9-]/gi, '_') + '.pdf');
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  let y = 24;
  let sectionNumber = 0;

  function addHeaderFooter() {
    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page);
      doc.setDrawColor(...softLine);
      doc.setLineWidth(0.2);
      if (page > 1) {
        if (logoDataUrl) {
          try { doc.addImage(logoDataUrl, 'PNG', margin, 7, 42, 11); } catch { doc.text('SolarFX', margin, 14); }
        } else {
          doc.setTextColor(...solarBlue);
          doc.setFont('helvetica', 'bold');
          doc.text('SolarFX', margin, 14);
        }
        doc.setTextColor(...darkText);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(model.documentControl.projectReference || model.documentControl.documentId, pageWidth / 2, 14, {align: 'center'});
        doc.text('Rev ' + model.documentControl.revision, pageWidth - margin, 14, {align: 'right'});
        doc.line(margin, 19, pageWidth - margin, 19);
      }
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.setFontSize(8);
      doc.setTextColor(95, 108, 125);
      doc.text(model.documentControl.documentId, margin, pageHeight - 9);
      doc.text('Page ' + page + ' of ' + pageCount, pageWidth - margin, pageHeight - 9, {align: 'right'});
    }
  }

  function ensureSpace(height: number) {
    if (y + height <= pageHeight - 22) return;
    doc.addPage();
    y = 25;
  }

  function section(title: string) {
    sectionNumber += 1;
    if (doc.getNumberOfPages() === 1 && y < 40) y = 40;
    else doc.addPage();
    y = 28;
    doc.setTextColor(...solarBlue);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(sectionNumber + '. ' + title, margin, y);
    y += 9;
    doc.setDrawColor(...softLine);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  function write(text: string, options: {size?: number; bold?: boolean; color?: readonly [number, number, number]; indent?: number; lineHeight?: number} = {}) {
    const x = margin + (options.indent || 0);
    const maxWidth = contentWidth - (options.indent || 0);
    doc.setFontSize(options.size || 10);
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setTextColor(...(options.color || darkText));
    const paragraphs = clean(text).split(/\n+/).filter(Boolean);
    const lineHeight = options.lineHeight || 5;
    paragraphs.forEach(paragraph => {
      const lines = doc.splitTextToSize(paragraph, maxWidth) as string[];
      ensureSpace(lines.length * lineHeight + 3);
      doc.text(lines, x, y);
      y += lines.length * lineHeight + 3;
    });
  }

  function bulletList(items: string[]) {
    items.filter(item => clean(item)).forEach(item => write('- ' + item, {indent: 4}));
  }

  function keyValueTable(rows: Array<[string, string]>) {
    rows.filter(([, value]) => clean(value)).forEach(([key, value]) => {
      ensureSpace(9);
      doc.setFillColor(248, 251, 255);
      doc.rect(margin, y - 4, 48, 8, 'F');
      doc.setDrawColor(...softLine);
      doc.rect(margin, y - 4, contentWidth, 8);
      doc.line(margin + 48, y - 4, margin + 48, y + 4);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(62, 76, 96);
      doc.text(key, margin + 2, y + 1);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...darkText);
      const wrapped = doc.splitTextToSize(value, contentWidth - 54) as string[];
      if (wrapped.length > 1) {
        y -= 1;
        doc.text(wrapped, margin + 52, y);
        y += Math.max(8, wrapped.length * 4.2) + 1;
      } else {
        doc.text(value, margin + 52, y + 1);
        y += 8;
      }
    });
    y += 4;
  }

  function simpleRows(headers: string[], rows: string[][]) {
    ensureSpace(12);
    doc.setFillColor(0, 107, 255);
    doc.rect(margin, y - 5, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const colWidth = contentWidth / headers.length;
    headers.forEach((header, index) => doc.text(header, margin + index * colWidth + 2, y));
    y += 8;
    doc.setTextColor(...darkText);
    rows.forEach(row => {
      const wrapped = row.map(cell => doc.splitTextToSize(clean(cell), colWidth - 4) as string[]);
      const rowHeight = Math.max(8, ...wrapped.map(lines => lines.length * 4 + 3));
      ensureSpace(rowHeight + 1);
      doc.setDrawColor(...softLine);
      doc.rect(margin, y - 5, contentWidth, rowHeight);
      wrapped.forEach((lines, index) => {
        if (index > 0) doc.line(margin + index * colWidth, y - 5, margin + index * colWidth, y - 5 + rowHeight);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(lines, margin + index * colWidth + 2, y);
      });
      y += rowHeight;
    });
    y += 5;
  }

  function cover() {
    doc.setFillColor(246, 250, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    if (logoDataUrl) {
      try { doc.addImage(logoDataUrl, 'PNG', margin, 22, 72, 19); } catch { doc.text('SolarFX', margin, 32); }
    } else {
      doc.setTextColor(...solarBlue);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.text('SolarFX', margin, 34);
    }
    doc.setTextColor(...darkText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(27);
    doc.text('SolarFX Site-Specific RAMS', margin, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Risk Assessment and Method Statement pack', margin, 80);
    y = 98;
    keyValueTable([
      ['Project reference', model.documentControl.projectReference],
      ['Customer', model.project.customerName],
      ['Site address', model.project.fullSiteAddress],
      ['Postcode', model.project.postcode],
      ['Assessment date', model.project.assessmentDate],
      ['Planned installation', model.project.installDate],
      ['Revision', model.documentControl.revision],
      ['Prepared by', model.documentControl.preparedBy],
      ['Assessor', model.documentControl.assessor],
      ['Approved by', model.documentControl.approvedBy],
      ['Document ID', model.documentControl.documentId],
      ['Status', model.documentControl.status]
    ]);
    y = 250;
    write(model.aiDisclaimer, {size: 9, color: [75, 88, 105], lineHeight: 4.5});
  }

  cover();

  section('Document control');
  keyValueTable([
    ['Document ID', model.documentControl.documentId],
    ['Project reference', model.documentControl.projectReference],
    ['Revision', model.documentControl.revision],
    ['Issue date', model.documentControl.issueDate],
    ['Review date', model.documentControl.reviewDate],
    ['Prepared by', model.documentControl.preparedBy],
    ['Assessor', model.documentControl.assessor],
    ['Approved by', model.documentControl.approvedBy],
    ['Status', model.documentControl.status]
  ]);
  simpleRows(['Revision', 'Date', 'Description', 'Prepared by', 'Approved by'], model.documentControl.revisionHistory.map(row => [row.revision, row.date, row.description, row.preparedBy, row.approvedBy || '']));

  section('Project information');
  keyValueTable([
    ['Customer', model.project.customerName],
    ['Client', model.project.client],
    ['Principal contractor', model.project.principalContractor],
    ['Installation company', model.project.installationCompany],
    ['Site supervisor', model.project.siteSupervisor],
    ['Qualified electrician', model.project.qualifiedElectrician],
    ['Operatives', model.project.numberOfOperatives],
    ['Emergency contact', [model.project.emergencyContact, model.project.emergencyPhone].filter(Boolean).join(' - ')],
    ['Scope of works', model.project.scope],
    ['Selected work activities', model.project.selectedWorkTypes.join(', ')],
    ['Equipment summary', model.project.equipmentSummary],
    ['Proposed locations', model.project.proposedLocations.join('; ')],
    ['Access arrangements', model.project.accessArrangements]
  ]);

  section('Scope of works');
  model.scopeOfWorks.forEach(scope => { write(scope.heading, {bold: true, size: 12}); bulletList(scope.items); });

  section('Persons at risk');
  bulletList(model.personsAtRisk);

  section('Responsibilities');
  model.responsibilities.forEach(role => { write(role.role, {bold: true, size: 12}); bulletList(role.duties); });

  section('Plant, tools, equipment and materials');
  write('Plant, tools and equipment', {bold: true, size: 12});
  bulletList(model.equipment.map(row => row.item + (row.notes ? ' - ' + row.notes : '')));
  write('Materials', {bold: true, size: 12});
  bulletList(model.materials);

  section('Risk assessment matrix');
  write(model.riskMatrix.explanation, {bold: true});
  simpleRows(['Severity', 'Description'], model.riskMatrix.severities.map(item => [item.split(' ')[0], item.replace(/^\d+\s*/, '')]));
  simpleRows(['Likelihood', 'Description'], model.riskMatrix.likelihoods.map(item => [item.split(' ')[0], item.replace(/^\d+\s*/, '')]));

  section('Dynamic risk assessment');
  if (!model.risks.length) {
    write('No risk rows recorded. Review Centre should prevent final PDF generation until assessor-confirmed risk rows exist.', {color: [156, 64, 36]});
  }
  model.risks.forEach((risk, index) => {
    ensureSpace(58);
    write('Risk ' + (index + 1) + ': ' + clean(risk.hazard), {bold: true, size: 12});
    keyValueTable([
      ['Activity / category', [risk.activity, risk.category, risk.code].filter(Boolean).join(' - ')],
      ['Potential harm', risk.harm],
      ['Persons at risk', risk.persons],
      ['Existing controls', risk.controls],
      ['Initial score', risk.severity + ' x ' + risk.likelihood + ' = ' + risk.initialScore + ' (' + riskName(risk.initialScore) + ')'],
      ['Additional controls', risk.additionalControls || ''],
      ['Residual score', risk.residualSeverity + ' x ' + risk.residualLikelihood + ' = ' + risk.residualScore + ' (' + riskName(risk.residualScore) + ')'],
      ['Responsible person', risk.responsible],
      ['Source', risk.source],
      ['Related photo', risk.relatedPhotoId || ''],
      ['Assessor notes', risk.assessorNotes || '']
    ]);
  });

  section('Method statement');
  model.methods.forEach(method => { write(method.heading, {bold: true, size: 12}); write(method.text); });

  section('PPE matrix');
  simpleRows(['PPE item', 'Required', 'Task / reason', 'Applicable work'], model.ppe.map(item => [item.item, item.required ? 'Yes' : 'No', item.task, item.workTypes.join(', ')]));

  section('Emergency procedures');
  keyValueTable(model.emergencyDetails);
  model.emergencyProcedures.forEach(procedure => { write(procedure.heading, {bold: true, size: 12}); bulletList(procedure.items); });

  section('Environmental controls');
  bulletList(model.environmentalControls);

  section('Monitoring and review');
  bulletList(model.monitoringReview);

  if (model.photos.length) {
    section('Site photographs');
    model.photos.forEach((photo, index) => {
      ensureSpace(125);
      write(photoNumber(index) + ': ' + clean(photo.category || photo.name), {bold: true, size: 12});
      if (photo.dataUrl?.startsWith('data:image/')) {
        try {
          doc.addImage(photo.dataUrl, 'JPEG', margin, y, contentWidth, 96);
          y += 102;
        } catch {
          write('Image could not be embedded in the PDF.', {color: [156, 64, 36]});
        }
      }
      keyValueTable([
        ['Caption', clean(photo.caption)],
        ['Surveyor notes', clean(photo.surveyorNotes)],
        ['AI observation', clean(photo.aiObservation)],
        ['Confirmed hazard', clean(photo.confirmedHazard)],
        ['Confirmed controls', clean(photo.confirmedControls)],
        ['Assessor decision', clean(photo.assessorDecision)],
        ['Date/time', clean(photo.takenAt)],
        ['Original filename', clean(photo.originalFilename || photo.name)]
      ]);
    });
  }

  if (model.aiReview.length) {
    section('AI observation appendix');
    write(model.aiDisclaimer, {bold: true});
    simpleRows(['Photo', 'AI suggestion', 'Assessor decision', 'Assessor notes', 'Accepted controls', 'Review timestamp'], model.aiReview.map(item => [item.photoId, item.title + ': ' + item.observation, item.status, item.assessorComment, item.controls.join('; '), item.reviewedAt || '']));
  }

  section('Sign-off');
  simpleRows(['Role', 'Name', 'Position', 'Signature', 'Date'], model.signatures.map(row => [row.label, row.name, row.position, row.signature, row.date]));
  if (model.briefingRegister.length) simpleRows(['Name', 'Role', 'Signature', 'Date', 'Time'], model.briefingRegister.map(row => [row.name, row.role, row.signature, row.date, row.time]));
  else write('Installer briefing register to be completed before works start.', {color: [75, 88, 105]});

  addHeaderFooter();
  const pdf = doc.output('arraybuffer');
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="' + filename.replace(/"/g, '') + '"'
    }
  });
}
