/**
 * Invoice Generator
 * Generates professional PDF invoices for fees using html2pdf.js
 */

export interface InvoiceData {
    invoiceNumber: string;
    studentName: string;
    grade: string;
    section?: string;
    parentName: string;
    feeTitle: string;
    amount: number;
    paidAmount: number;
    balance: number;
    dueDate: string;
    assignedDate: string;
    description?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolPhone?: string;
    schoolEmail?: string;
}

export const generateInvoice = async (data: InvoiceData): Promise<void> => {
    const html2pdf = (await import('html2pdf.js')).default;
    const schoolName  = data.schoolName || 'Oliskey School App';
    const classInfo   = data.section ? `${data.grade} ${data.section}` : (data.grade || 'N/A');

    const isPaid    = data.balance === 0;
    const isPartial = !isPaid && data.paidAmount > 0;

    const statusColor  = isPaid ? '#059669' : isPartial ? '#d97706' : '#dc2626';
    const statusBg     = isPaid ? '#d1fae5'  : isPartial ? '#fef3c7' : '#fee2e2';
    const statusBorder = isPaid ? '#6ee7b7'  : isPartial ? '#fcd34d' : '#fca5a5';
    const statusLabel  = isPaid ? 'PAID IN FULL' : isPartial ? 'PARTIALLY PAID' : 'PAYMENT DUE';

    const fmt = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 });
    const now  = new Date();
    const genDate = now.toLocaleDateString('en-GB');
    const genTime = now.toLocaleTimeString('en-GB');

    const invoiceHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
  body {
    margin: 0;
    padding: 24px;
    background: #eef2ff;
    font-family: Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { border-collapse: collapse; }
  td, th { padding: 0; }
  .page {
    width: 750px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #c7d2fe;
  }

  /* ── HEADER ── */
  .hdr {
    background: #4338ca;
    padding: 0;
  }
  .hdr-inner {
    width: 100%;
  }
  .hdr-school-col {
    padding: 32px 36px;
    vertical-align: middle;
    width: 55%;
  }
  .hdr-invoice-col {
    padding: 32px 36px 32px 0;
    vertical-align: middle;
    text-align: right;
    width: 45%;
  }
  .school-icon {
    width: 52px;
    height: 52px;
    border-radius: 14px;
    background: rgba(255,255,255,0.18);
    border: 2px solid rgba(255,255,255,0.35);
    display: inline-block;
    font-size: 26px;
    line-height: 52px;
    text-align: center;
    margin-bottom: 10px;
  }
  .school-name-text {
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .school-meta-text {
    font-size: 11px;
    color: rgba(255,255,255,0.65);
    line-height: 1.7;
  }
  .inv-word {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.55);
    margin-bottom: 4px;
  }
  .inv-big {
    font-size: 48px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: -3px;
    line-height: 1;
    margin-bottom: 10px;
  }
  .inv-num {
    display: inline-block;
    background: rgba(255,255,255,0.13);
    border: 1px solid rgba(255,255,255,0.28);
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 10px;
    color: rgba(255,255,255,0.85);
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
    word-break: break-all;
  }

  /* ── ACCENT BAR ── */
  .accent-bar {
    height: 5px;
    background: linear-gradient(90deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%);
  }

  /* ── STATUS ROW ── */
  .status-row {
    background: ${statusBg};
    border-bottom: 2px solid ${statusBorder};
    padding: 10px 36px;
  }
  .status-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${statusColor};
    margin-right: 8px;
    vertical-align: middle;
    position: relative;
    top: -1px;
  }
  .status-text {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: ${statusColor};
    vertical-align: middle;
  }

  /* ── META TABLE ── */
  .meta-wrap { padding: 28px 36px 0; }
  .meta-tbl { width: 100%; border: 1.5px solid #e0e7ff; border-radius: 12px; overflow: hidden; }
  .meta-tbl td {
    padding: 16px 20px;
    width: 33.33%;
    border-right: 1.5px solid #e0e7ff;
    background: #f5f3ff;
    vertical-align: top;
  }
  .meta-tbl td:last-child { border-right: none; }
  .meta-lbl {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: #a5b4fc;
    margin-bottom: 6px;
  }
  .meta-val {
    font-size: 15px;
    font-weight: 800;
    color: #1e1b4b;
  }
  .meta-val-big {
    font-size: 22px;
    font-weight: 900;
    color: #4338ca;
  }
  .meta-val-red { color: #dc2626; }

  /* ── BILL SECTION ── */
  .bill-wrap { padding: 24px 36px; }
  .bill-tbl { width: 100%; }
  .bill-tbl td { vertical-align: top; width: 50%; padding: 0; }
  .bill-tbl td:first-child { padding-right: 10px; }
  .bill-tbl td:last-child  { padding-left: 10px; }
  .bill-card {
    border: 1.5px solid #e0e7ff;
    border-radius: 12px;
    padding: 20px 22px;
    background: #fafafe;
  }
  .bill-card-purple {
    border: 1.5px solid #6366f1;
    border-radius: 12px;
    padding: 20px 22px;
    background: #4338ca;
  }
  .blbl {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a5b4fc;
    margin-bottom: 10px;
  }
  .blbl-w { color: rgba(255,255,255,0.5); }
  .bname {
    font-size: 16px;
    font-weight: 800;
    color: #1e1b4b;
    margin-bottom: 4px;
  }
  .bname-w { color: #ffffff; }
  .bsub { font-size: 12px; color: #6b7280; line-height: 1.7; }
  .bsub-w { color: rgba(255,255,255,0.7); }
  .class-pill {
    display: inline-block;
    margin-top: 10px;
    padding: 3px 12px;
    background: #ede9fe;
    color: #6d28d9;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.5px;
  }

  /* ── DIVIDER ── */
  .divider { margin: 0 36px; border: none; border-top: 1.5px solid #e0e7ff; }

  /* ── FEE TABLE ── */
  .fee-wrap { padding: 24px 36px; }
  .sec-title {
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #a5b4fc;
    margin-bottom: 12px;
  }
  .fee-tbl { width: 100%; border: 1.5px solid #e0e7ff; border-radius: 12px; overflow: hidden; }
  .fee-tbl thead tr { background: #4338ca; }
  .fee-tbl thead th {
    padding: 13px 18px;
    text-align: left;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.8);
  }
  .fee-tbl thead th:last-child { text-align: right; }
  .fee-tbl tbody td {
    padding: 16px 18px;
    font-size: 13px;
    color: #374151;
    border-bottom: 1.5px solid #f0f4ff;
    vertical-align: top;
  }
  .fee-tbl tbody tr:last-child td { border-bottom: none; }
  .fee-tbl tbody td:last-child { text-align: right; font-weight: 700; font-size: 14px; color: #1e1b4b; }
  .fee-num { font-size: 11px; font-weight: 800; color: #c7d2fe; }
  .fee-title-text { font-size: 14px; font-weight: 800; color: #1e1b4b; margin-bottom: 3px; }
  .fee-desc { font-size: 11px; color: #94a3b8; }
  .cat-pill {
    display: inline-block;
    padding: 2px 10px;
    background: #ede9fe;
    color: #7c3aed;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
  }

  /* ── TOTALS ── */
  .totals-wrap { padding: 0 36px 24px; }
  .totals-outer { width: 100%; }
  .totals-outer td:first-child { width: 55%; vertical-align: top; }
  .totals-outer td:last-child  { width: 45%; vertical-align: top; }
  .totals-box {
    border: 1.5px solid #e0e7ff;
    border-radius: 12px;
    overflow: hidden;
    background: #fafafe;
  }
  .t-row { width: 100%; }
  .t-row td {
    padding: 13px 18px;
    font-size: 13px;
    border-bottom: 1.5px solid #f0f4ff;
  }
  .t-row td:first-child { color: #64748b; }
  .t-row td:last-child  { text-align: right; font-weight: 700; color: #1e1b4b; }
  .t-row.t-green td:last-child { color: #059669; }
  .t-row.t-bal { background: #4338ca; }
  .t-row.t-bal td { border-bottom: none; }
  .t-bal-lbl {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
  }
  .t-bal-val {
    font-size: 20px;
    font-weight: 900;
    color: #ffffff;
    text-align: right;
  }

  /* ── PAYMENT BOX ── */
  .pay-box {
    border-radius: 12px;
    padding: 18px 20px;
    border: 1.5px solid;
  }
  .pay-box table { width: 100%; }
  .pay-box table td { vertical-align: top; padding: 0; }
  .pay-icon-cell { width: 48px; }
  .pay-icon {
    width: 44px;
    height: 44px;
    border-radius: 11px;
    font-size: 22px;
    text-align: center;
    line-height: 44px;
  }
  .pay-content-cell { padding-left: 14px; }
  .pay-title { font-size: 14px; font-weight: 800; margin-bottom: 5px; }
  .pay-body  { font-size: 12px; color: #374151; line-height: 1.6; }
  .pay-due   { font-size: 12px; font-weight: 800; margin-top: 7px; color: #b45309; }

  /* ── FOOTER ── */
  .footer {
    background: #0f172a;
    padding: 0;
  }
  .footer-inner { width: 100%; }
  .footer-inner td { padding: 24px 36px; vertical-align: middle; }
  .footer-inner td:last-child { text-align: right; }
  .footer-school { font-size: 14px; font-weight: 800; color: #ffffff; margin-bottom: 4px; }
  .footer-note   { font-size: 10px; color: #64748b; line-height: 1.6; }
  .footer-gen    { font-size: 10px; color: #475569; margin-bottom: 6px; }
  .footer-gen span { display: block; color: #64748b; }
  .oliskey-badge {
    display: inline-block;
    margin-top: 6px;
    padding: 3px 12px;
    background: rgba(99,102,241,0.2);
    border: 1px solid rgba(99,102,241,0.35);
    border-radius: 6px;
    font-size: 9px;
    font-weight: 800;
    color: #818cf8;
    letter-spacing: 2px;
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <table class="hdr-inner">
      <tr>
        <td class="hdr-school-col">
          <div class="school-icon">🏫</div>
          <div class="school-name-text">${schoolName}</div>
          <div class="school-meta-text">
            ${data.schoolAddress ? data.schoolAddress + '<br>' : ''}
            ${data.schoolPhone   ? '📞 ' + data.schoolPhone + '<br>' : ''}
            ${data.schoolEmail   ? '✉ '  + data.schoolEmail          : ''}
            ${!data.schoolAddress && !data.schoolPhone && !data.schoolEmail ? 'School Management System' : ''}
          </div>
        </td>
        <td class="hdr-invoice-col">
          <div class="inv-word">Document</div>
          <div class="inv-big">INVOICE</div>
          <div class="inv-num">${data.invoiceNumber}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ACCENT BAR -->
  <div class="accent-bar"></div>

  <!-- STATUS -->
  <div class="status-row">
    <span class="status-dot"></span>
    <span class="status-text">${statusLabel}</span>
  </div>

  <!-- META ROW -->
  <div class="meta-wrap">
    <table class="meta-tbl">
      <tr>
        <td>
          <div class="meta-lbl">Invoice Date</div>
          <div class="meta-val">${data.assignedDate}</div>
        </td>
        <td>
          <div class="meta-lbl">Due Date</div>
          <div class="meta-val ${data.balance > 0 ? 'meta-val-red' : ''}">${data.dueDate}</div>
        </td>
        <td style="background:#ffffff;">
          <div class="meta-lbl">Balance Due</div>
          <div class="meta-val-big">${fmt(data.balance)}</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- BILL TO / FROM -->
  <div class="bill-wrap">
    <table class="bill-tbl">
      <tr>
        <td>
          <div class="bill-card">
            <div class="blbl">Billed To</div>
            <div class="bname">${data.parentName}</div>
            <div class="bsub">
              Parent / Guardian of<br>
              <strong style="color:#1e1b4b;">${data.studentName}</strong>
            </div>
            <span class="class-pill">Class: ${classInfo}</span>
          </div>
        </td>
        <td>
          <div class="bill-card-purple">
            <div class="blbl blbl-w">From</div>
            <div class="bname bname-w">${schoolName}</div>
            <div class="bsub bsub-w">
              ${data.schoolAddress || 'Official Fee Invoice'}<br>
              ${data.schoolEmail || ''}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <hr class="divider">

  <!-- FEE TABLE -->
  <div class="fee-wrap">
    <div class="sec-title">Fee Breakdown</div>
    <table class="fee-tbl">
      <thead>
        <tr>
          <th style="width:6%;">#</th>
          <th style="width:48%;">Description</th>
          <th style="width:22%;">Category</th>
          <th style="width:24%; text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="fee-num">01</span></td>
          <td>
            <div class="fee-title-text">${data.feeTitle}</div>
            ${data.description ? `<div class="fee-desc">${data.description}</div>` : ''}
          </td>
          <td><span class="cat-pill">School Fee</span></td>
          <td>${fmt(data.amount)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TOTALS + PAYMENT -->
  <div class="totals-wrap">
    <table class="totals-outer">
      <tr>
        <td style="padding-right:16px; vertical-align:top;">
          ${data.balance > 0 ? `
          <div class="pay-box" style="background:#fffbeb; border-color:#fcd34d;">
            <table>
              <tr>
                <td class="pay-icon-cell">
                  <div class="pay-icon" style="background:#fef3c7;">💳</div>
                </td>
                <td class="pay-content-cell">
                  <div class="pay-title" style="color:#92400e;">Payment Instructions</div>
                  <div class="pay-body">Log in to the parent portal and pay securely online using your debit or credit card via Paystack.</div>
                  <div class="pay-due">Due by ${data.dueDate}</div>
                </td>
              </tr>
            </table>
          </div>
          ` : `
          <div class="pay-box" style="background:#f0fdf4; border-color:#86efac;">
            <table>
              <tr>
                <td class="pay-icon-cell">
                  <div class="pay-icon" style="background:#dcfce7;">✅</div>
                </td>
                <td class="pay-content-cell">
                  <div class="pay-title" style="color:#065f46;">Payment Complete</div>
                  <div class="pay-body">This invoice has been settled in full. Please keep this document for your records. Thank you!</div>
                </td>
              </tr>
            </table>
          </div>
          `}
        </td>
        <td style="vertical-align:top;">
          <div class="totals-box">
            <table style="width:100%;">
              <tr class="t-row">
                <td>Subtotal</td>
                <td style="text-align:right; font-weight:700; color:#1e1b4b; padding:13px 18px;">${fmt(data.amount)}</td>
              </tr>
              ${data.paidAmount > 0 ? `
              <tr class="t-row t-green">
                <td style="padding:13px 18px; color:#64748b; border-bottom:1.5px solid #f0f4ff;">Amount Paid</td>
                <td style="text-align:right; font-weight:700; color:#059669; padding:13px 18px; border-bottom:1.5px solid #f0f4ff;">- ${fmt(data.paidAmount)}</td>
              </tr>
              ` : ''}
              <tr class="t-row t-bal">
                <td style="padding:16px 18px;"><span class="t-bal-lbl">Balance Due</span></td>
                <td style="padding:16px 18px;"><div class="t-bal-val">${fmt(data.balance)}</div></td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <table class="footer-inner">
      <tr>
        <td>
          <div class="footer-school">${schoolName}</div>
          <div class="footer-note">
            This is a computer-generated invoice and does not require a signature.<br>
            For queries, contact the school administration.
          </div>
        </td>
        <td>
          <div class="footer-gen">
            Generated on ${genDate}
            <span>${genTime}</span>
          </div>
          <span class="oliskey-badge">OLISKEY</span>
        </td>
      </tr>
    </table>
  </div>

</div>
</body>
</html>`;

    const options = {
        margin: 0,
        filename: `Invoice-${data.invoiceNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
        await html2pdf().set(options).from(invoiceHTML).save();
    } catch (error) {
        console.error('Invoice generation error:', error);
        throw error;
    }
};

export const generateInvoiceNumber = (feeId: string, studentId: string): string => {
    const date  = new Date();
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${studentId}-${feeId}`;
};
