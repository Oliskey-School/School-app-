export const emailTemplates = {
  confirmEmailSignup: (userName: string, confirmLink: string, schoolName: string = "School App") => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Email - ${schoolName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .header p {
            margin: 5px 0 0 0;
            font-size: 14px;
            opacity: 0.9;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 16px;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .greeting strong {
            color: #4f46e5;
        }
        .message {
            font-size: 15px;
            color: #4b5563;
            margin-bottom: 25px;
            line-height: 1.8;
        }
        .cta-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f0f4ff;
            border-radius: 6px;
            border-left: 4px solid #4f46e5;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: white;
            padding: 14px 40px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 16px;
            margin: 15px 0;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
        .manual-link {
            font-size: 12px;
            color: #6b7280;
            word-break: break-all;
            padding: 10px;
            background-color: #f9fafb;
            border-radius: 4px;
            margin-top: 15px;
        }
        .benefits {
            background-color: #f9fafb;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }
        .benefits h3 {
            color: #1f2937;
            margin-top: 0;
            font-size: 15px;
        }
        .benefits ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .benefits li {
            padding: 8px 0;
            color: #4b5563;
            font-size: 14px;
            display: flex;
            align-items: center;
        }
        .benefits li:before {
            content: "✓";
            color: #10b981;
            font-weight: bold;
            margin-right: 10px;
            font-size: 16px;
        }
        .timeline {
            background-color: #fef3c7;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #f59e0b;
        }
        .timeline p {
            margin: 0;
            color: #92400e;
            font-size: 13px;
            font-weight: 500;
        }
        .divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 25px 0;
        }
        .security-note {
            background-color: #f0fdf4;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #10b981;
        }
        .security-note p {
            margin: 0;
            color: #15803d;
            font-size: 13px;
        }
        .footer {
            background-color: #f3f4f6;
            padding: 25px 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer-text {
            font-size: 13px;
            color: #6b7280;
            margin: 10px 0;
        }
        .footer-links {
            margin-top: 15px;
        }
        .footer-links a {
            color: #4f46e5;
            text-decoration: none;
            font-size: 12px;
            margin: 0 10px;
        }
        .footer-links a:hover {
            text-decoration: underline;
        }
        .support-section {
            background-color: #eff6ff;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            border-left: 4px solid #3b82f6;
        }
        .support-section p {
            margin: 0;
            color: #1e40af;
            font-size: 13px;
        }
        .support-section a {
            color: #3b82f6;
            text-decoration: none;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>🎓 Welcome to ${schoolName}</h1>
            <p>Your secure educational platform</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hi <strong>${userName}</strong>,
            </div>

            <div class="message">
                Welcome to <strong>${schoolName}</strong>! We're thrilled to have you on board. Your account has been created, but to access your personalized dashboard and all the features, we need you to confirm your email address.
            </div>

            <!-- CTA Section -->
            <div class="cta-section">
                <p style="margin-top: 0; color: #374151; font-weight: 500;">Click the button below to confirm your email:</p>
                <a href="${confirmLink}" class="cta-button">Confirm Your Email</a>
                <p style="margin: 15px 0 0 0; font-size: 12px; color: #6b7280;">Or paste this link in your browser:</p>
                <div class="manual-link">${confirmLink}</div>
            </div>

            <!-- Benefits Section -->
            <div class="benefits">
                <h3>✨ What You Can Do After Confirming:</h3>
                <ul>
                    <li>Access your personalized dashboard</li>
                    <li>View class schedules, timetables, and assignments</li>
                    <li>Check grades, report cards, and academic progress</li>
                    <li>Communicate securely with teachers and classmates</li>
                    <li>Receive real-time notifications about school announcements</li>
                    <li>Manage your profile, password, and account settings</li>
                </ul>
            </div>

            <!-- Timeline Warning -->
            <div class="timeline">
                <p>⏰ Important: This confirmation link expires in 7 days. Please confirm your email soon to activate your account.</p>
            </div>

            <!-- Security Note -->
            <div class="security-note">
                <p><strong>🔒 Security Tip:</strong> Your account is protected by advanced encryption. We never share your personal data without your consent. Learn more about our <a href="#" style="color: #15803d; text-decoration: underline;">privacy policy</a>.</p>
            </div>

            <div class="divider"></div>

            <!-- Password Reset Info -->
            <div class="support-section">
                <p><strong>Forgot your password?</strong> No problem! You can reset it anytime on the login page using the <strong>"Forgot Password"</strong> option. It's quick, easy, and secure.</p>
            </div>

            <!-- Suspicious Activity -->
            <div class="message" style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 12px; border-radius: 4px;">
                <strong style="color: #b45309;">Didn't sign up?</strong> If you didn't create this account, please contact our support team immediately or ignore this email. Your account will remain inactive if not confirmed.
            </div>

            <!-- Support Section -->
            <div class="support-section" style="background-color: #fef3c7; border-left-color: #f59e0b;">
                <p><strong>Need Help?</strong> Our support team is here for you 24/7. Feel free to reach out:</p>
                <p style="margin: 8px 0 0 0;">📧 Email: <a href="mailto:support@yourapp.com">support@yourapp.com</a></p>
                <p style="margin: 5px 0 0 0;">💬 Live Chat: Available on our website</p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">
                <strong>${schoolName}</strong> — Your Educational Partner
            </div>
            <div class="footer-text">
                Building Better Learning Experiences, One Student at a Time
            </div>
            <div class="footer-links">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Contact Us</a>
                <a href="#">FAQ</a>
            </div>
            <div class="footer-text" style="margin-top: 20px; font-size: 11px; color: #9ca3af;">
                This is an automated message. Please do not reply to this email. If you need assistance, use our support channels above.
            </div>
            <div class="footer-text" style="font-size: 11px; color: #d1d5db;">
                © 2025 ${schoolName}. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>
  `,

  // Plain text version for email clients that don't support HTML
  confirmEmailSignupPlain: (userName: string, confirmLink: string, schoolName: string = "School App") => `
WELCOME TO ${schoolName}
==========================

Hi ${userName},

Welcome to ${schoolName}! We're thrilled to have you on board. Your account has been created, but to access your personalized dashboard and all the features, we need you to confirm your email address.

CONFIRM YOUR EMAIL
==================

Please click the link below to confirm your email address:

${confirmLink}

WHAT YOU CAN DO AFTER CONFIRMING:
==================================

✓ Access your personalized dashboard
✓ View class schedules, timetables, and assignments
✓ Check grades, report cards, and academic progress
✓ Communicate securely with teachers and classmates
✓ Receive real-time notifications about school announcements
✓ Manage your profile, password, and account settings

IMPORTANT TIME LIMIT:
====================

This confirmation link expires in 7 days. Please confirm your email soon to activate your account.

SECURITY & PRIVACY:
===================

Your account is protected by advanced encryption. We never share your personal data without your consent. Learn more about our privacy policy on our website.

FORGOT YOUR PASSWORD?
====================

No problem! You can reset it anytime on the login page using the "Forgot Password" option. It's quick, easy, and secure.

DIDN'T SIGN UP?
===============

If you didn't create this account, please contact our support team immediately or ignore this email. Your account will remain inactive if not confirmed.

NEED HELP?
==========

Our support team is here for you 24/7:

📧 Email: support@yourapp.com
💬 Live Chat: Available on our website
📞 Phone: Contact our helpline

---

© 2025 ${schoolName}. All rights reserved.
Privacy Policy | Terms of Service | Contact Us

This is an automated message. Please do not reply to this email.
  `
};

// Usage example in your auth.ts file:
// import { emailTemplates } from '../lib/emailTemplates';
// const emailBody = emailTemplates.confirmEmailSignup('John Doe', 'https://confirm-link.com', 'My School App');
