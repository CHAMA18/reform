import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PDFDocument from 'pdfkit';

/**
 * GET /api/submissions/export?format=pdf[&formId=<id>]
 *
 * Exports submissions as a PDF document. Authenticated via the session
 * cookie (same as the rest of the dashboard UI) — the user must be
 * logged in. No API key required, since this is a UI-triggered export,
 * not a programmatic API call.
 *
 * Query params:
 *   - format: must be "pdf" (only format supported for now)
 *   - formId: optional — restricts the export to a single form's
 *     submissions. If omitted, all submissions are exported.
 *
 * The PDF contains:
 *   1. A title header with the export metadata (generated date,
 *      total count, form filter if any, distinct forms count)
 *   2. A "Submissions by Form" summary table showing how many
 *      submissions each form received
 *   3. A detailed listing of every submission, grouped by form, with
 *      the full response payload rendered as key-value pairs
 *
 * Response: application/pdf (binary stream, Content-Disposition: attachment)
 */
export async function GET(request: NextRequest) {
  // --- Auth: require a logged-in session ---
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'You must be signed in to export submissions.' },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const formId = searchParams.get('formId');

    if (format !== 'pdf') {
      return NextResponse.json(
        { error: `Unsupported format: "${format}". Only "pdf" is supported.` },
        { status: 400 }
      );
    }

    // Load submissions OWNED BY THE CURRENT USER (via the form's ownerId),
    // optionally filtered by formId, newest first.
    const where = formId
      ? { formId, form: { ownerId: user.id } }
      : { form: { ownerId: user.id } };
    const rows = await db.submission.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        form: { select: { id: true, name: true, shareId: true } },
      },
    });

    // Build a per-form summary: { formName: { count, formId } }
    const perForm: Record<string, { count: number; formId: string }> = {};
    for (const r of rows) {
      const key = r.form.name;
      if (!perForm[key]) {
        perForm[key] = { count: 0, formId: r.form.id };
      }
      perForm[key].count++;
    }

    // --- Generate the PDF ---
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 56, bottom: 56, left: 56, right: 56 },
      bufferPages: true, // enables page numbering via doc.bufferedPageRange
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 56 * 2; // left + right margins
    const now = new Date();

    // ---- Title block ----
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#0c0a09')
      .text('Reform — Submissions Report', 56, 56);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        `Generated: ${now.toLocaleString('en-US', {
          dateStyle: 'long',
          timeStyle: 'short',
        })}`,
        56,
        doc.y + 6,
        { width: contentWidth }
      );

    doc
      .fillColor('#666666')
      .text(`Total submissions: ${rows.length}`, 56, doc.y + 2, {
        width: contentWidth,
      });

    if (formId) {
      const formName = rows[0]?.form.name ?? '(unknown form)';
      doc
        .fillColor('#666666')
        .text(`Filtered to form: ${formName}`, 56, doc.y + 2, {
          width: contentWidth,
        });
    } else {
      doc
        .fillColor('#666666')
        .text(`Distinct forms: ${Object.keys(perForm).length}`, 56, doc.y + 2, {
          width: contentWidth,
        });
    }

    // Horizontal rule
    const ruleY = doc.y + 12;
    doc
      .strokeColor('#e5e5e5')
      .lineWidth(1)
      .moveTo(56, ruleY)
      .lineTo(pageWidth - 56, ruleY)
      .stroke();

    doc.y = ruleY + 16;

    // ---- Section 1: Submissions by Form (summary) ----
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0c0a09')
      .text('Submissions by Form', 56, doc.y);

    doc.y += 10;

    // Summary table — header row
    const tableX = 56;
    const colForm = tableX;
    const colCount = tableX + contentWidth * 0.7;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#666666')
      .text('FORM', colForm, doc.y, { width: contentWidth * 0.7 });
    doc.text('SUBMISSIONS', colCount, doc.y, {
      width: contentWidth * 0.3,
      align: 'right',
    });
    doc.y += 4;
    doc
      .strokeColor('#d5d5d5')
      .lineWidth(0.5)
      .moveTo(tableX, doc.y)
      .lineTo(pageWidth - 56, doc.y)
      .stroke();
    doc.y += 4;

    // Data rows — sorted by submission count descending
    const sortedForms = Object.entries(perForm).sort(
      (a, b) => b[1].count - a[1].count
    );
    doc.font('Helvetica').fontSize(9).fillColor('#1a1a1a');
    for (const [formName, info] of sortedForms) {
      if (doc.y > doc.page.height - 80) {
        doc.addPage();
      }
      const rowTop = doc.y;
      doc.text(formName, colForm, rowTop, {
        width: contentWidth * 0.7,
        ellipsis: true,
      });
      doc.text(String(info.count), colCount, rowTop, {
        width: contentWidth * 0.3,
        align: 'right',
      });
      doc.y = rowTop + 18;
    }

    doc.y += 12;
    doc
      .strokeColor('#e5e5e5')
      .lineWidth(1)
      .moveTo(56, doc.y)
      .lineTo(pageWidth - 56, doc.y)
      .stroke();
    doc.y += 16;

    // ---- Section 2: Detailed submission listing ----
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#0c0a09')
      .text('Submission Details', 56, doc.y);
    doc.y += 12;

    // Group submissions by form for readability
    const byForm: Record<string, typeof rows> = {};
    for (const r of rows) {
      const key = r.form.name;
      if (!byForm[key]) byForm[key] = [];
      byForm[key].push(r);
    }

    for (const [formName, formSubs] of Object.entries(byForm)) {
      if (doc.y > doc.page.height - 100) doc.addPage();

      // Form header band (amber tint, matching the app's brand)
      const bandY = doc.y;
      doc
        .fillColor('#fffbeb')
        .rect(56, bandY, contentWidth, 20)
        .fill();
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#92400e')
        .text(formName, 64, bandY + 5, { width: contentWidth - 16 });
      doc.y = bandY + 26;

      // Each submission
      for (const sub of formSubs) {
        if (doc.y > doc.page.height - 120) doc.addPage();

        const ts = sub.id.toISOString();
        const tsLabel = new Date(ts).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

        // Submission header line: #id · timestamp · source
        const idLabel = `#${ts.slice(0, 19)}`;
        const metaLabel = `  ·  ${tsLabel}  ·  source: ${sub.source ?? '—'}`;
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('#666666')
          .text(idLabel, 56, doc.y);
        const idWidth = doc.widthOfString(idLabel);
        doc
          .font('Helvetica')
          .fillColor('#999999')
          .text(metaLabel, 56 + idWidth, doc.y);
        doc.y += 14;

        // Data fields
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(String(sub.data)) as Record<string, unknown>;
        } catch {
          data = { _raw: String(sub.data) };
        }

        const entries = Object.entries(data);
        if (entries.length === 0) {
          doc
            .fontSize(9)
            .font('Helvetica-Oblique')
            .fillColor('#999999')
            .text('(empty submission)', 72, doc.y);
          doc.y += 14;
        } else {
          for (const [key, value] of entries) {
            if (doc.y > doc.page.height - 80) doc.addPage();

            const valStr =
              typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);

            const rowTop = doc.y;
            // Key (bold, fixed width column)
            doc
              .fontSize(9)
              .font('Helvetica-Bold')
              .fillColor('#44403c')
              .text(key + ':', 72, rowTop, { width: 140 });

            // Value (regular, wraps to remaining width)
            doc
              .font('Helvetica')
              .fillColor('#1a1a1a')
              .text(valStr, 220, rowTop, {
                width: contentWidth - 164,
              });

            const valHeight = doc.heightOfString(valStr, {
              width: contentWidth - 164,
            });
            const keyHeight = doc.heightOfString(key + ':', { width: 140 });
            doc.y = rowTop + Math.max(keyHeight, valHeight) + 4;
          }
        }

        doc.y += 6;
        doc
          .strokeColor('#f0f0f0')
          .lineWidth(0.5)
          .moveTo(56, doc.y)
          .lineTo(pageWidth - 56, doc.y)
          .stroke();
        doc.y += 8;
      }
      doc.y += 6;
    }

    // ---- Page numbers (footer on every page) ----
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#999999')
        .text(
          `Reform · Submissions Report · Page ${i + 1} of ${range.count}`,
          56,
          doc.page.height - 32,
          { width: contentWidth, align: 'center' }
        );
    }

    // --- Finalize and collect the PDF into a single Buffer ---
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    });

    const filename = `reform-submissions-${now.toISOString().slice(0, 10)}${
      formId ? `-${formId.slice(-6)}` : ''
    }.pdf`;

    // Convert the Node Buffer to a Uint8Array so NextResponse accepts it
    // as a BodyInit (the Web Fetch standard type). Node's Buffer is a
    // subclass of Uint8Array, but TypeScript's strict typing requires
    // the explicit conversion.
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[GET /api/submissions/export] error:', error);
    return NextResponse.json(
      { error: 'Failed to export submissions' },
      { status: 500 }
    );
  }
}
