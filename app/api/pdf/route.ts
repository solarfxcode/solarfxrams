import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jsPDF } from 'jspdf';
import { SESSION_COOKIE_NAME, verifySession } from '@/lib/auth';
import type { RamsData, Photo, RiskRow } from '@/types/rams';

export const runtime = 'nodejs';

type PdfRequest = {data?: Partial<RamsData>; pdfFileName?: string};

const clean = (value: unknown) => String(value ?? '').trim();
const score = (severity: unknown, likelihood: unknown) => Number(severity || 0) * Number(likelihood || 0);
const riskName = (value: number) => value <= 0 ? 'Not scored' : value <= 5 ? 'Low' : value <= 10 ? 'Medium' : value <= 15 ? 'High' : 'Very High';
const safeFileName = (value: unknown) => clean(value).replace(/[^a-z0-9_.-]/gi, '_') || 'SolarFX-RAMS.pdf';

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth = 180, lineHeight = 5) {
  const lines = doc.splitTextToSize(text || '-', maxWidth);
  lines.forEach((line: string, index: number) => doc.text(line, x, y + index * lineHeight));
  return y + Math.max(lines.length, 1) * lineHeight;
}

function section(doc: jsPDF, title: string) {
  doc.addPage();
  doc.setFontSize(16);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
}

function keyValueRows(doc: jsPDF, rows: Array<[string, string]>, startY = 30) {
  let y = startY;
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 14, y);
    doc.setFont('helvetica', 'normal');
    y = writeWrapped(doc, value, 58, y, 136);
    y += 2;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const authenticated = await verifySession(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!authenticated) return NextResponse.json({error: 'Not authenticated.'}, {status: 401});

  let body: PdfRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({error: 'Invalid PDF request.'}, {status: 400});
  }

  const data = body.data || {};
  const pdfFileName = safeFileName(body.pdfFileName || ('SolarFX-RAMS-' + clean(data.projectReference || 'RAMS') + '-Rev-' + clean(data.revision || '1') + '.pdf'));
  const risks = Array.isArray(data.risks) ? data.risks as RiskRow[] : [];
  const photos = Array.isArray(data.photos) ? data.photos as Photo[] : [];

  const doc = new jsPDF({unit: 'mm', format: 'a4'});
  doc.setFontSize(22);
  doc.text('SolarFX Site-Specific RAMS', 14, 28);
  doc.setFontSize(11);
  keyValueRows(doc, [
    ['Project', clean(data.projectReference)],
    ['Customer', clean(data.customerName)],
    ['Site', [clean(data.address), clean(data.postcode)].filter(Boolean).join(', ')],
    ['Revision', clean(data.revision || '1')],
    ['Assessment date', clean(data.assessmentDate)],
    ['Assessor', clean(data.assessor)]
  ], 44);
  doc.setFontSize(9);
  writeWrapped(doc, 'AI-assisted observations were reviewed by the named competent assessor and do not replace competent-person assessment.', 14, 108, 180, 4);

  section(doc, 'Project information');
  keyValueRows(doc, [
    ['Prepared by', clean(data.preparedBy)],
    ['Principal contractor', clean(data.principalContractor)],
    ['Site supervisor', clean(data.siteSupervisor)],
    ['Qualified electrician', clean(data.qualifiedElectrician)],
    ['Scope', clean(data.scope)]
  ]);

  section(doc, 'Risk assessment');
  let y = 30;
  if (!risks.length) {
    doc.text('No risk rows recorded.', 14, y);
  } else {
    risks.forEach((risk, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text('Risk ' + (index + 1) + ': ' + clean(risk.hazard), 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      y = writeWrapped(doc, 'Potential harm: ' + clean(risk.harm), 14, y);
      y = writeWrapped(doc, 'Controls: ' + clean(risk.controls), 14, y);
      y = writeWrapped(doc, 'Initial: ' + score(risk.severity, risk.likelihood) + ' ' + riskName(score(risk.severity, risk.likelihood)) + ' | Residual: ' + score(risk.residualSeverity, risk.residualLikelihood) + ' ' + riskName(score(risk.residualSeverity, risk.residualLikelihood)), 14, y);
      y = writeWrapped(doc, 'Responsible: ' + clean(risk.responsible), 14, y);
      y += 5;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });
  }

  section(doc, 'Method statement');
  const methodText = clean(data.methodStatement) +
    (clean(data.batteryInstallationMethod) ? '\n\nBattery installation method:\n' + clean(data.batteryInstallationMethod) : '') +
    (clean(data.trenchingMethod) ? '\n\nTrenching method:\n' + clean(data.trenchingMethod) : '') +
    (clean(data.evChargerInstallationMethod) ? '\n\nEV charger installation method:\n' + clean(data.evChargerInstallationMethod) : '');
  y = writeWrapped(doc, methodText, 14, 30, 180, 5);
  if (clean(data.seniorReviewNotes)) writeWrapped(doc, '\nSenior review: ' + clean(data.seniorReviewNotes), 14, y + 4, 180, 5);

  section(doc, 'Emergency arrangements');
  keyValueRows(doc, [
    ['Emergency contact', [clean(data.emergencyContact), clean(data.emergencyPhone)].filter(Boolean).join(' ')],
    ['First aider', clean(data.firstAider)],
    ['Nearest hospital', clean(data.nearestHospital)],
    ['Assembly point', clean(data.assemblyPoint)],
    ['PV shutdown', clean(data.pvShutdownInfo)],
    ['Battery shutdown', clean(data.batteryShutdownInfo)],
    ['Emergency services', '999']
  ]);

  photos.forEach((photo, index) => {
    section(doc, 'Site photograph ' + (index + 1) + ': ' + clean(photo.category));
    try {
      if (photo.dataUrl?.startsWith('data:image/')) doc.addImage(photo.dataUrl, 'JPEG', 14, 30, 180, 120);
    } catch {}
    doc.setFontSize(10);
    writeWrapped(doc, clean(photo.caption || photo.name), 14, 158, 180, 5);
  });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text('SolarFX RAMS | ' + clean(data.projectReference) + ' | Page ' + i + ' of ' + pages, 14, 290);
  }

  const bytes = Buffer.from(doc.output('arraybuffer'));
  return new NextResponse(bytes, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="' + pdfFileName + '"'
    }
  });
}
