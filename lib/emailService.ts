/**
 * Email Service using Resend API
 * Sends welcome and verification emails to new users
 */

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || '';
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'onboarding@resend.dev';
const SCHOOL_NAME = 'Oliskey School App';

interface SendWelcomeEmailParams {
    toEmail: string;
    userName: string;
    username: string;
    password: string;
    userType: string;
}

/**
 * Sends a welcome email with login credentials
 */
export const sendWelcomeEmail = async ({
    toEmail,
    userName,
    username,
    password,
    userType
}: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> => {

    // If no API key is configured, skip email sending (development mode)
    if (!RESEND_API_KEY || RESEND_API_KEY === '') {
        console.warn('⚠️ Resend API key not configured. Skipping email send. Set VITE_RESEND_API_KEY in .env');
        return { success: true }; // Don't fail the account creation
    }

    try {
        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box { background: white; border: 2px solid #0EA5E9; padding: 20px; margin: 20px 0; border-radius: 8px; }
            .credential-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f0f9ff; border-radius: 4px; }
            .label { font-weight: bold; color: #0369a1; }
            .value { font-family: monospace; background: white; padding: 5px 10px; border-radius: 4px; }
            .button { display: inline-block; background: #0EA5E9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎓 Welcome to ${SCHOOL_NAME}!</h1>
              <p>Your account has been created successfully</p>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>Your <strong>${userType}</strong> account has been created and is ready to use. You can now access the school portal using the credentials below:</p>
              
              <div class="credentials-box">
                <h3>🔐 Login Credentials</h3>
                <div class="credential-row">
                  <span class="label">Username:</span>
                  <span class="value">${username}</span>
                </div>
                <div class="credential-row">
                  <span class="label">Password:</span>
                  <span class="value">${password}</span>
                </div>
                <div class="credential-row">
                  <span class="label">Email:</span>
                  <span class="value">${toEmail}</span>
                </div>
              </div>

              <div class="warning">
                ⚠️ <strong>Security Note:</strong> Please change your password after first login. Do not share these credentials with anyone.
              </div>

              <div style="text-align: center;">
                <a href="http://localhost:5173" class="button">Login to Portal</a>
              </div>

              <h3>📚 What's Next?</h3>
              <ul>
                <li>Log in to your account using the credentials above</li>
                <li>Complete your profile information</li>
                <li>Explore the dashboard and features</li>
                <li>Change your password in Settings → Security</li>
              </ul>

              <p>If you have any questions or need assistance, please contact the school administration.</p>

              <div class="footer">
                <p>This is an automated message from ${SCHOOL_NAME}</p>
                <p>Please do not reply to this email</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: toEmail,
                subject: `🎓 Welcome to ${SCHOOL_NAME} - Your Account is Ready!`,
                html: emailHtml
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Resend API error:', errorData);
            return { success: false, error: `Email service error: ${errorData.message || 'Unknown error'}` };
        }

        const result = await response.json();
        console.log('✅ Welcome email sent successfully:', result.id);

        return { success: true };
    } catch (err: any) {
        console.error('Error sending welcome email:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Sends a password reset email
 */
export const sendPasswordResetEmail = async (
    toEmail: string,
    userName: string,
    resetToken: string
): Promise<{ success: boolean; error?: string }> => {

    if (!RESEND_API_KEY || RESEND_API_KEY === '') {
        console.warn('⚠️ Resend API key not configured. Skipping email send.');
        return { success: true };
    }

    try {
        const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              
              <p>We received a request to reset your password for your ${SCHOOL_NAME} account.</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>

              <div class="warning">
                ⚠️ This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
              </div>

              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
                ${resetLink}
              </p>

              <div class="footer">
                <p>This is an automated message from ${SCHOOL_NAME}</p>
                <p>Please do not reply to this email</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: toEmail,
                subject: `🔐 Password Reset - ${SCHOOL_NAME}`,
                html: emailHtml
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            return { success: false, error: errorData.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('Error sending password reset email:', err);
        return { success: false, error: err.message };
    }
};
