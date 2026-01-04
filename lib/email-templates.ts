/**
 * Email Templates
 * Centralized HTML email templates with consistent branding
 */

const SCHOOL_NAME = 'Oliskey School App';
const SCHOOL_COLOR = '#0EA5E9';
const SCHOOL_COLOR_DARK = '#0369a1';

// Reusable email components
const emailHeader = (title: string, emoji: string) => `
  <div class="header">
    <h1>${emoji} ${title}</h1>
  </div>
`;

const emailFooter = () => `
  <div class="footer">
    <p>This is an automated message from ${SCHOOL_NAME}</p>
    <p>Please do not reply to this email</p>
  </div>
`;

const emailStyles = `
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, ${SCHOOL_COLOR} 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .info-box { background: white; border: 2px solid ${SCHOOL_COLOR}; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f0f9ff; border-radius: 4px; }
    .label { font-weight: bold; color: ${SCHOOL_COLOR_DARK}; }
    .value { font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px; }
    .button { display: inline-block; background: ${SCHOOL_COLOR}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .info { background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
  </style>
`;

// Template interfaces
export interface FeeAssignmentEmailData {
    parentName: string;
    studentName: string;
    feeTitle: string;
    amount: number;
    dueDate: string;
    description?: string;
    portalUrl?: string;
}

export interface PaymentConfirmationEmailData {
    parentName: string;
    studentName: string;
    feeTitle: string;
    amountPaid: number;
    transactionReference: string;
    paymentDate: string;
    balance: number;
    portalUrl?: string;
}

export interface AbsenceNotificationEmailData {
    parentName: string;
    studentName: string;
    date: string;
    grade: string;
    section?: string;
    portalUrl?: string;
}

export interface EmergencyBroadcastEmailData {
    recipientName: string;
    title: string;
    message: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    sentBy: string;
    sentAt: string;
}

/**
 * Fee Assignment Email Template
 */
export const generateFeeAssignmentEmail = (data: FeeAssignmentEmailData): string => {
    const portalUrl = data.portalUrl || 'http://localhost:5173';

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          ${emailHeader('New Fee Assigned', '💰')}
          <div class="content">
            <p>Hello <strong>${data.parentName}</strong>,</p>
            
            <p>A new fee has been assigned to your child <strong>${data.studentName}</strong>.</p>
            
            <div class="info-box">
              <h3>📝 Fee Details</h3>
              <div class="info-row">
                <span class="label">Fee:</span>
                <span class="value">${data.feeTitle}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount:</span>
                <span class="value">₦${data.amount.toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="label">Due Date:</span>
                <span class="value">${data.dueDate}</span>
              </div>
              ${data.description ? `
              <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0;"><strong>Description:</strong></p>
                <p style="margin: 10px 0 0 0;">${data.description}</p>
              </div>
              ` : ''}
            </div>

            <div class="info">
              💡 You can pay this fee online through the parent portal using your debit/credit card.
            </div>

            <div style="text-align: center;">
              <a href="${portalUrl}" class="button">View & Pay Fee</a>
            </div>

            <p>If you have any questions about this fee, please contact the school administration.</p>

            ${emailFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Payment Confirmation Email Template
 */
export const generatePaymentConfirmationEmail = (data: PaymentConfirmationEmailData): string => {
    const portalUrl = data.portalUrl || 'http://localhost:5173';

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          ${emailHeader('Payment Received', '✅')}
          <div class="content">
            <p>Hello <strong>${data.parentName}</strong>,</p>
            
            <div class="success">
              ✅ Your payment has been successfully received and processed!
            </div>
            
            <div class="info-box">
              <h3>💳 Payment Details</h3>
              <div class="info-row">
                <span class="label">Student:</span>
                <span class="value">${data.studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">Fee:</span>
                <span class="value">${data.feeTitle}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount Paid:</span>
                <span class="value">₦${data.amountPaid.toLocaleString()}</span>
              </div>
              <div class="info-row">
                <span class="label">Transaction Ref:</span>
                <span class="value">${data.transactionReference}</span>
              </div>
              <div class="info-row">
                <span class="label">Payment Date:</span>
                <span class="value">${data.paymentDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Remaining Balance:</span>
                <span class="value">₦${data.balance.toLocaleString()}</span>
              </div>
            </div>

            <div class="info">
              📄 You can download your official payment receipt from the parent portal.
            </div>

            <div style="text-align: center;">
              <a href="${portalUrl}" class="button">Download Receipt</a>
            </div>

            <p>Thank you for your prompt payment!</p>

            ${emailFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Absence Notification Email Template
 */
export const generateAbsenceNotificationEmail = (data: AbsenceNotificationEmailData): string => {
    const portalUrl = data.portalUrl || 'http://localhost:5173';
    const classInfo = data.section ? `${data.grade}${data.section}` : data.grade;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${emailStyles}
      </head>
      <body>
        <div class="container">
          ${emailHeader('Absence Notification', '⚠️')}
          <div class="content">
            <p>Hello <strong>${data.parentName}</strong>,</p>
            
            <div class="warning">
              ⚠️ Your child was marked absent from school today.
            </div>
            
            <div class="info-box">
              <h3>📋 Absence Details</h3>
              <div class="info-row">
                <span class="label">Student:</span>
                <span class="value">${data.studentName}</span>
              </div>
              <div class="info-row">
                <span class="label">Class:</span>
                <span class="value">${classInfo}</span>
              </div>
              <div class="info-row">
                <span class="label">Date:</span>
                <span class="value">${data.date}</span>
              </div>
            </div>

            <div class="info">
              💬 If this absence was expected, please log in to the portal to provide an explanation or upload a sick note/permission slip.
            </div>

            <div style="text-align: center;">
              <a href="${portalUrl}" class="button">Explain Absence</a>
            </div>

            <p>If you believe this is an error, please contact the school immediately.</p>

            ${emailFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
};

/**
 * Emergency Broadcast Email Template
 */
export const generateEmergencyBroadcastEmail = (data: EmergencyBroadcastEmailData): string => {
    const urgencyColors: Record<string, { bg: string; border: string }> = {
        low: { bg: '#dbeafe', border: '#3b82f6' },
        medium: { bg: '#fef3c7', border: '#f59e0b' },
        high: { bg: '#fed7aa', border: '#ea580c' },
        critical: { bg: '#fecaca', border: '#dc2626' }
    };

    const color = urgencyColors[data.urgencyLevel] || urgencyColors.medium;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        ${emailStyles}
        <style>
          .emergency-header {
            background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .urgency-badge {
            display: inline-block;
            padding: 8px 16px;
            background: white;
            color: #dc2626;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="emergency-header">
            <h1>🚨 ${data.title}</h1>
            <span class="urgency-badge">${data.urgencyLevel} Priority</span>
          </div>
          <div class="content">
            <p>Hello <strong>${data.recipientName}</strong>,</p>
            
            <div style="background: ${color.bg}; border-left: 4px solid ${color.border}; padding: 20px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6;">
                ${data.message.replace(/\n/g, '<br>')}
              </p>
            </div>

            <div class="info-box">
              <h3>📤 Broadcast Information</h3>
              <div class="info-row">
                <span class="label">Sent By:</span>
                <span class="value">${data.sentBy}</span>
              </div>
              <div class="info-row">
                <span class="label">Sent At:</span>
                <span class="value">${data.sentAt}</span>
              </div>
            </div>

            <div class="warning">
              ⚠️ This is an official school communication. Please read carefully and take any necessary actions.
            </div>

            <p>If you have any questions or concerns, please contact the school administration immediately.</p>

            ${emailFooter()}
          </div>
        </div>
      </body>
    </html>
  `;
};
