import { Transaction, Fee } from '../types';

/**
 * Generate and download a payment receipt as PDF
 */
export async function generateReceipt(
    transaction: Transaction,
    fee: Fee,
    studentName: string,
    schoolName: string = 'School Management System'
): Promise<void> {
    const html2pdf = (await import('html2pdf.js')).default;
    const receiptHTML = createReceiptHTML(transaction, fee, studentName, schoolName);

    const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `receipt-${transaction.reference}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
        await html2pdf().set(options).from(receiptHTML).save();
    } catch (error) {
        console.error('Error generating receipt:', error);
        throw new Error('Failed to generate receipt');
    }
}

/**
 * Preview receipt in a new window (for testing)
 */
export function previewReceipt(
    transaction: Transaction,
    fee: Fee,
    studentName: string,
    schoolName: string = 'School Management System'
): void {
    const receiptHTML = createReceiptHTML(transaction, fee, studentName, schoolName);
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
        previewWindow.document.write(receiptHTML);
        previewWindow.document.close();
    }
}

/**
 * Create HTML template for receipt
 */
function createReceiptHTML(
    transaction: Transaction,
    fee: Fee,
    studentName: string,
    schoolName: string
): string {
    const receiptDate = new Date(transaction.date);
    const currentDate = new Date();

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Receipt - ${transaction.reference}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: white;
            color: #333;
        }
        
        .receipt-container {
            max-width: 700px;
            margin: 0 auto;
            border: 2px solid #e0e0e0;
            padding: 40px;
            background: white;
        }
        
        .header {
            text-align: center;
            border-bottom: 3px solid #f97316;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .school-name {
            font-size: 28px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }
        
        .receipt-title {
            font-size: 20px;
            color: #f97316;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .receipt-number {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px dotted #e5e7eb;
        }
        
        .info-label {
            font-weight: 500;
            color: #6b7280;
        }
        
        .info-value {
            font-weight: 600;
            color: #1f2937;
        }
        
        .amount-section {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
        }
        
        .amount-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .amount-value {
            color: white;
            font-size: 36px;
            font-weight: bold;
        }
        
        .status-badge {
            display: inline-block;
            padding: 6px 16px;
            background: #10b981;
            color: white;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e0e0e0;
            text-align: center;
        }
        
        .footer-text {
            font-size: 12px;
            color: #9ca3af;
            line-height: 1.6;
        }
        
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(249, 115, 22, 0.05);
            font-weight: bold;
            z-index: 0;
            pointer-events: none;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
        }
        
        .signature-box {
            text-align: center;
            flex: 1;
        }
        
        .signature-line {
            border-top: 1px solid #333;
            margin: 40px 20px 5px;
        }
        
        .signature-label {
            font-size: 12px;
            color: #6b7280;
        }
        
        @media print {
            body {
                padding: 0;
            }
            .receipt-container {
                border: none;
            }
        }
    </style>
</head>
<body>
    <div class="watermark">PAID</div>
    
    <div class="receipt-container">
        <!-- Header -->
        <div class="header">
            <div class="school-name">${schoolName}</div>
            <div class="receipt-title">OFFICIAL PAYMENT RECEIPT</div>
            <div class="receipt-number">Receipt No: ${transaction.reference}</div>
        </div>
        
        <!-- Student Information -->
        <div class="section">
            <div class="section-title">Student Information</div>
            <div class="info-row">
                <span class="info-label">Student Name:</span>
                <span class="info-value">${studentName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Student ID:</span>
                <span class="info-value">${fee.studentId}</span>
            </div>
        </div>
        
        <!-- Payment Information -->
        <div class="section">
            <div class="section-title">Payment Details</div>
            <div class="info-row">
                <span class="info-label">Fee Title:</span>
                <span class="info-value">${fee.title}</span>
            </div>
            ${fee.description ? `
            <div class="info-row">
                <span class="info-label">Description:</span>
                <span class="info-value">${fee.description}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">Payment Date:</span>
                <span class="info-value">${receiptDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Payment Method:</span>
                <span class="info-value">${transaction.provider}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Transaction Reference:</span>
                <span class="info-value">${transaction.reference}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Status:</span>
                <span class="info-value">
                    <span class="status-badge">${transaction.status}</span>
                </span>
            </div>
        </div>
        
        <!-- Amount Section -->
        <div class="amount-section">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">₦${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        
        <!-- Balance Information (if partial payment) -->
        ${fee.paidAmount < fee.amount ? `
        <div class="section">
            <div class="section-title">Balance Information</div>
            <div class="info-row">
                <span class="info-label">Total Fee Amount:</span>
                <span class="info-value">₦${fee.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Total Paid:</span>
                <span class="info-value">₦${fee.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Balance Remaining:</span>
                <span class="info-value" style="color: #dc2626; font-weight: bold;">₦${(fee.amount - fee.paidAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
        ` : `
        <div class="section" style="text-align: center; padding: 20px; background: #ecfdf5; border-radius: 8px;">
            <span style="color: #10b981; font-weight: 600; font-size: 16px;">✓ Payment Complete - No Balance Due</span>
        </div>
        `}
        
        <!-- Signature Section -->
        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Authorized Signature</div>
            </div>
            <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">School Seal</div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">
                This is an official receipt generated by ${schoolName}.<br>
                For any queries, please contact the finance department.<br>
                Receipt generated on ${currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Generate receipt for email attachment (returns base64)
 */
export async function generateReceiptForEmail(
    transaction: Transaction,
    fee: Fee,
    studentName: string,
    schoolName: string = 'School Management System'
): Promise<string> {
    const html2pdf = (await import('html2pdf.js')).default;
    const receiptHTML = createReceiptHTML(transaction, fee, studentName, schoolName);

    const options = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
        const pdf = await html2pdf().set(options).from(receiptHTML).output('datauristring');
        return pdf;
    } catch (error) {
        console.error('Error generating receipt for email:', error);
        throw new Error('Failed to generate receipt for email');
    }
}
