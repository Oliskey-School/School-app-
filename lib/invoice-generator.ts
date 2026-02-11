/**
 * Invoice Generator
 * Generates professional PDF invoices for fees using html2pdf.js
 */

import html2pdf from 'html2pdf.js';

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

/**
 * Generate and download invoice PDF
 */
export const generateInvoice = async (data: InvoiceData): Promise<void> => {
    const schoolName = data.schoolName || 'Oliskey School App';
    const classInfo = data.section ? `${data.grade}${data.section}` : data.grade;

    const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Arial', sans-serif;
                    color: #333;
                    line-height: 1.6;
                    padding: 40px;
                }
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 2px solid #0EA5E9;
                    border-radius: 10px;
                    overflow: hidden;
                }
                .header {
                    background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }
                .header h1 {
                    font-size: 32px;
                    margin-bottom: 10px;
                }
                .header p {
                    font-size: 14px;
                    opacity: 0.9;
                }
                .content {
                    padding: 40px;
                }
                .invoice-details {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 40px;
                    padding-bottom: 20px;
                    border-bottom: 2px solid #e5e7eb;
                }
                .invoice-details div {
                    flex: 1;
                }
                .label {
                    font-weight: bold;
                    color: #0369a1;
                    font-size: 12px;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
                .value {
                    font-size: 16px;
                    margin-bottom: 15px;
                }
                .invoice-number {
                    font-family: monospace;
                    background: #f0f9ff;
                    padding: 5px 10px;
                    border-radius: 4px;
                    display: inline-block;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                }
                .items-table th {
                    background: #f0f9ff;
                    padding: 15px;
                    text-align: left;
                    font-weight: bold;
                    color: #0369a1;
                    border-bottom: 2px solid #0EA5E9;
                }
                .items-table td {
                    padding: 15px;
                    border-bottom: 1px solid #e5e7eb;
                }
                .items-table tr:last-child td {
                    border-bottom: none;
                }
                .total-section {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    font-size: 16px;
                }
                .total-row.grand-total {
                    font-size: 20px;
                    font-weight: bold;
                    color: #0EA5E9;
                    padding-top: 15px;
                    border-top: 2px solid #0EA5E9;
                    margin-top: 15px;
                }
                .payment-info {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 20px;
                    margin: 30px 0;
                    border-radius: 4px;
                }
                .payment-info h3 {
                    color: #92400e;
                    margin-bottom: 10px;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                }
                .status-badge {
                    display: inline-block;
                    padding: 5px 15px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .status-unpaid {
                    background: #fef3c7;
                    color: #92400e;
                }
                .status-partial {
                    background: #dbeafe;
                    color: #1e40af;
                }
                .status-paid {
                    background: #d1fae5;
                    color: #065f46;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="header">
                    <h1>📋 INVOICE</h1>
                    <p>${schoolName}</p>
                    ${data.schoolAddress ? `<p>${data.schoolAddress}</p>` : ''}
                    ${data.schoolPhone ? `<p>Phone: ${data.schoolPhone}</p>` : ''}
                    ${data.schoolEmail ? `<p>Email: ${data.schoolEmail}</p>` : ''}
                </div>
                
                <div class="content">
                    <div class="invoice-details">
                        <div>
                            <div class="label">Invoice Number</div>
                            <div class="value">
                                <span class="invoice-number">${data.invoiceNumber}</span>
                            </div>
                            
                            <div class="label">Invoice Date</div>
                            <div class="value">${data.assignedDate}</div>
                            
                            <div class="label">Due Date</div>
                            <div class="value">${data.dueDate}</div>
                        </div>
                        
                        <div style="text-align: right;">
                            <div class="label">Bill To</div>
                            <div class="value">
                                <strong>${data.parentName}</strong><br>
                                Parent/Guardian of ${data.studentName}<br>
                                Class: ${classInfo}
                            </div>
                            
                            <div class="label">Status</div>
                            <div class="value">
                                ${data.balance === 0
            ? '<span class="status-badge status-paid">Paid</span>'
            : data.paidAmount > 0
                ? '<span class="status-badge status-partial">Partially Paid</span>'
                : '<span class="status-badge status-unpaid">Unpaid</span>'
        }
                            </div>
                        </div>
                    </div>
                    
                    ${data.description ? `
                    <div style="margin-bottom: 30px; padding: 15px; background: #f9fafb; border-radius: 8px;">
                        <div class="label">Description</div>
                        <p style="margin-top: 5px;">${data.description}</p>
                    </div>
                    ` : ''}
                    
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>${data.feeTitle}</strong></td>
                                <td style="text-align: right;">₦${data.amount.toLocaleString()}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div class="total-section">
                        <div class="total-row">
                            <span>Total Amount:</span>
                            <span>₦${data.amount.toLocaleString()}</span>
                        </div>
                        ${data.paidAmount > 0 ? `
                        <div class="total-row">
                            <span>Amount Paid:</span>
                            <span style="color: #10b981;">-₦${data.paidAmount.toLocaleString()}</span>
                        </div>
                        ` : ''}
                        <div class="total-row grand-total">
                            <span>Balance Due:</span>
                            <span>₦${data.balance.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    ${data.balance > 0 ? `
                    <div class="payment-info">
                        <h3>💳 Payment Instructions</h3>
                        <p>You can pay this invoice online through the parent portal using your debit/credit card via Paystack.</p>
                        <p style="margin-top: 10px;"><strong>Payment must be received by ${data.dueDate}.</strong></p>
                    </div>
                    ` : `
                    <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
                        <h3 style="color: #065f46; margin-bottom: 10px;">✅ Payment Completed</h3>
                        <p>This invoice has been fully paid. Thank you!</p>
                    </div>
                    `}
                    
                    <div class="footer">
                        <p>This is a computer-generated invoice and does not require a signature.</p>
                        <p style="margin-top: 5px;">For any queries, please contact the school administration.</p>
                        <p style="margin-top: 15px;">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    // Generate PDF
    const options = {
        margin: 0,
        filename: `Invoice-${data.invoiceNumber}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
        await html2pdf().set(options).from(invoiceHTML).save();
        console.log('✅ Invoice generated successfully');
    } catch (error) {
        console.error('❌ Error generating invoice:', error);
        throw error;
    }
};

/**
 * Generate unique invoice number
 */
export const generateInvoiceNumber = (feeId: string, studentId: string): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `INV-${year}${month}-${studentId}-${feeId}`;
};
