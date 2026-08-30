import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { aiChat } from '@/lib/ai-engine';
import { db, runFunction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Flowchart } from '@/lib/flowchart/types';

/**
 * GET /api/submissions/[id]/pdf
 *
 * Generates a branded PDF report for a single submission. Includes:
 *   - Form name + description
 *   - Submission metadata (timestamp, source)
 *   - Field-by-field breakdown (label, value)
 *   - AI-generated "Analyst notes" — the LLM reviews the submission and
 *     adds a short professional summary suitable for human review
 *
 * The PDF is returned as application/pdf (downloadable).
 */
export const runtime = 'nodejs';

const BRAND_COLOR: [number, number] = [0, 102, 255]; // #0066ff (rf-primary)
const TEXT_COLOR: [number, number] = [12, 10, 9];   // rf-on-surface
const MUTED_COLOR: [number, number] = [120, 120, 120];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionIdStr } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    // Look up the submission by its timestamp ID
    let submissionDate: Date;
    try {
      submissionDate = new Date(submissionIdStr);
      if (isNaN(submissionDate.getTime())) throw new Error('Invalid date');
    } catch {
      return NextResponse.json({ error: 'Invalid submission ID' }, { status: 400 });
    }

    // Find submissions matching this timestamp (using a search query)
    const allSubmissionsForUser = await db.submission.findMany({
      where: {}, // we'll filter below
      take: 500,
    });
    const submission = allSubmissionsForUser.find((s) =>
      s.id instanceof Date && s.id.getTime() === submissionDate.getTime()
    );

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Verify the form belongs to the user
    const form = await db.form.findFirst({
      where: { id: submission.formId, ownerId: user.id },
    });
    if (!form) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Parse the form's flowchart to get field metadata (labels, types)
    const flowchart: Flowchart = typeof form.flowchart === 'string'
      ? JSON.parse(form.flowchart as string)
      : form.flowchart as Flowchart;
    const fieldMap = new Map<string, { id: string; label: string; type: string }>();
    for (const node of flowchart.nodes) {
      if (node.type === 'field') {
        fieldMap.set(node.id, {
          id: node.id,
          label: node.data.label ?? 'Untitled',
          type: node.data.fieldType ?? 'text',
        });
      }
    }

    // Parse the submission data
    const submissionData: Record<string, any> = typeof submission.data === 'string'
      ? JSON.parse(submission.data as string)
      : submission.data as Record<string, any>;

    // Generate AI analyst notes (1 LLM call summarising the submission)
    const aiNotes = await generateAnalystNotes(form.name, form.description ?? '', fieldMap, submissionData, user.id);

    // Generate the PDF
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    // Brand banner
    doc
      .fillColor(BRAND_COLOR[0].toString(16).padStart(2, '0') + BRAND_COLOR[1].toString(16).padStart(2, '0') + BRAND_COLOR[2].toString(16).padStart(2, '0'))
      .rect(0, 0, doc.page.width, 80)
      .fill();
    doc.fillColor('white')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('Reform', 60, 28, { continued: true })
      .fontSize(11)
      .font('Helvetica')
      .fillColor('rgba(255,255,255,0.7)')
      .text('  Submission Report', 60, 38);

    // Title
    doc.moveDown(3);
    doc.fillColor(TEXT_COLOR)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(form.name, { align: 'left' });

    if (form.description) {
      doc.moveDown(0.5);
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor(MUTED_COLOR)
        .text(form.description, { align: 'left' });
    }

    // Submission metadata
    doc.moveDown(1.5);
    doc.fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(TEXT_COLOR)
      .text('SUBMISSION METADATA', { align: 'left' });
    doc.moveDown(0.3);
    doc.font('Helvetica')
      .fillColor(MUTED_COLOR)
      .fontSize(10)
      .text(`Submitted:  ${submissionDate.toUTCString()}`)
      .text(`Source:     ${submission.source ?? 'web'}`)
      .text(`Status:     ${submission.status ?? 'Live'}`)
      .text(`Form ID:    ${form.id}`)
      .text(`Submission: ${submissionIdStr}`);

    // Fields section
    doc.moveDown(2);
    doc.font('Helvetica-Bold')
      .fillColor(TEXT_COLOR)
      .fontSize(13)
      .text('Field responses', { align: 'left' });

    // Draw a horizontal rule
    doc.moveDown(0.3);
    doc.moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor(BRAND_COLOR[0] / 255, BRAND_COLOR[1] / 255, BRAND_COLOR[2] / 255)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);

    // Field rows
    for (const [fieldId, field] of fieldMap.entries()) {
      const value = submissionData[fieldId];
      const valueStr = formatValue(value, field.type);

      doc.font('Helvetica-Bold')
        .fillColor(TEXT_COLOR)
        .fontSize(10)
        .text(field.label, { continued: false });
      doc.moveDown(0.2);
      doc.font('Helvetica')
        .fillColor(MUTED_COLOR)
        .fontSize(10)
        .text(valueStr, { indent: 12 });
      doc.moveDown(0.8);
    }

    // AI analyst notes section
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold')
      .fillColor(TEXT_COLOR)
      .fontSize(13)
      .text('AI analyst notes', { align: 'left' });

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y)
      .lineTo(doc.page.width - 60, doc.y)
      .strokeColor(BRAND_COLOR[0] / 255, BRAND_COLOR[1] / 255, BRAND_COLOR[2] / 255)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica-Oblique')
      .fillColor(TEXT_COLOR)
      .fontSize(10)
      .text(aiNotes.text, { align: 'justify', lineGap: 4 });

    doc.moveDown(0.5);
    doc.font('Helvetica')
      .fillColor(MUTED_COLOR)
      .fontSize(8)
      .text(`Generated by Reform AI · model: ${aiNotes.model} · ${aiNotes.latency_ms}ms · audit log: ${aiNotes.audit_log_id}`);

    // Footer with page numbers
    doc.page = doc.page; // ensure we're on the current page
    const pageCount = (doc as any).bufferedPageCount ?? 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.switchToPage(i - 1);
      doc.fillColor(MUTED_COLOR)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Page ${i} of ${pageCount} · Reform · Generated ${new Date().toISOString()}`,
          60,
          doc.page.height - 30,
          { width: doc.page.width - 120, align: 'center' }
        );
    }

    doc.end();

    // Wait for the PDF to finish streaming
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reform-submission-${submissionIdStr}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/submissions/[id]/pdf] error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'PDF generation failed', details: message },
      { status: 500 }
    );
  }
}

function formatValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) return '(no value)';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

async function generateAnalystNotes(
  formName: string,
  formDescription: string,
  fieldMap: Map<string, { id: string; label: string; type: string }>,
  submissionData: Record<string, any>,
  userId: string
): Promise<{ text: string; model: string; latency_ms: number; audit_log_id: string }> {
  const fieldsForPrompt = Array.from(fieldMap.values()).map((f) => ({
    label: f.label,
    type: f.type,
    value: submissionData[f.id],
  }));

  const systemPrompt = `You are an analyst reviewing a form submission for "${formName}". ${formDescription ? `Form purpose: ${formDescription}.` : ''}

Write a brief, professional analyst note (3-5 sentences) about this submission. Mention:
- The key information provided
- Any anomalies, missing data, or items requiring follow-up
- Overall completeness / quality

Write in plain prose — no markdown, no bullet points, no headers. Just 3-5 sentences.`;

  const userMessage = `Submission data:\n${JSON.stringify(fieldsForPrompt, null, 2)}`;

  const startTime = Date.now();
  const result = await aiChat(systemPrompt, userMessage, {
    max_tokens: 400,
    temperature: 0.4,
  });
  const elapsedMs = Date.now() - startTime;
  const text = result.content || '(no notes generated)';

  // Audit-log via Xano
  let auditLogId = '';
  try {
    const result = await runFunction<{ audit_log_id: string }>('ai/log_field_suggestion', {
      label: `pdf report for ${formName}`,
      field_type: 'pdf',
      llm_response: JSON.stringify({ notes: text }),
      model: 'glm-4.5',
      input_tokens: Math.ceil((systemPrompt.length + userMessage.length) / 4),
      output_tokens: Math.ceil(text.length / 4),
      latency_ms: elapsedMs,
      user_id: userId,
    });
    auditLogId = result.audit_log_id;
  } catch (e) {
    console.error('[pdf] audit log failed:', e);
  }

  return { text, model: 'glm-4.5', latency_ms: elapsedMs, audit_log_id: auditLogId };
}
