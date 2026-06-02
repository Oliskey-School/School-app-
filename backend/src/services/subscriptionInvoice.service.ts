import { jsPDF } from 'jspdf';

interface InvoiceInput {
    school: { name: string; address?: string | null; contact_email?: string | null };
    plan: 'basic' | 'advanced';
    student_count: number;
    rate: number;        // ₦ per child per term
    total: number;       // ₦ paid
    reference: string;   // Paystack reference
    term: { term: number; session: string; resumption_date: Date; closing_date: Date };
    paid_at?: Date;
}

const fmtNaira = (n: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Render a one-page A4 invoice and return it as a Node Buffer so it can be
 * attached to the payment-success email or downloaded from an endpoint.
 */
export function generateInvoicePdf(input: InvoiceInput): Buffer {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    // Header band
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, W, 80, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('OLISKEY', 40, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('School Management — Billing', 40, 66);

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', W - 40, 50, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ref: ${input.reference}`, W - 40, 66, { align: 'right' });

    // Body
    doc.setTextColor(31, 41, 55);
    let y = 120;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Billed to', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.text(input.school.name, 40, y + 16);
    if (input.school.address) doc.text(input.school.address, 40, y + 32);
    if (input.school.contact_email) doc.text(input.school.contact_email, 40, y + 48);

    doc.setFont('helvetica', 'bold');
    doc.text('Term', W - 40, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Term ${input.term.term} — ${input.term.session}`, W - 40, y + 16, { align: 'right' });
    doc.text(`${fmtDate(input.term.resumption_date)} to`, W - 40, y + 32, { align: 'right' });
    doc.text(fmtDate(input.term.closing_date), W - 40, y + 48, { align: 'right' });

    y = 220;

    // Table
    doc.setFillColor(243, 244, 246);
    doc.rect(40, y, W - 80, 30, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('Description', 50, y + 20);
    doc.text('Qty', 320, y + 20);
    doc.text('Rate', 400, y + 20);
    doc.text('Amount', W - 50, y + 20, { align: 'right' });

    y += 50;
    doc.setFont('helvetica', 'normal');
    const planLabel = input.plan === 'advanced' ? 'Advanced (with AI)' : 'Basic';
    doc.text(`${planLabel} — per child per term`, 50, y);
    doc.text(String(input.student_count), 320, y);
    doc.text(fmtNaira(input.rate), 400, y);
    doc.text(fmtNaira(input.total), W - 50, y, { align: 'right' });

    // Total
    y += 60;
    doc.setDrawColor(229, 231, 235);
    doc.line(40, y, W - 40, y);
    y += 24;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total paid', 320, y);
    doc.text(fmtNaira(input.total), W - 50, y, { align: 'right' });

    // Footer
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    const paidAt = (input.paid_at || new Date()).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
    doc.text(`Paid on ${paidAt} (Africa/Lagos)`, 40, 780);
    doc.text('Thank you for using Oliskey.', W - 40, 780, { align: 'right' });

    const ab = doc.output('arraybuffer');
    return Buffer.from(ab as ArrayBuffer);
}
