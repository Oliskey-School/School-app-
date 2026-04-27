import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

async function initTransporter() {
    if (!transporter) {
        const user = process.env.SMTP_USER?.trim();
        const pass = process.env.SMTP_PASS?.trim();

        if (!user || !pass) {
            console.warn("⚠️ SMTP_USER or SMTP_PASS not set in .env. Falling back to Ethereal for testing.");
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: { user: testAccount.user, pass: testAccount.pass },
            });
            return transporter;
        }

        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: user,
                pass: pass,
            },
        });
        console.log(`📧 Gmail Mailer initialized for: ${user}`);
    }
    return transporter;
}

export class EmailService {
    static async sendVerificationEmail(email: string, fullName: string): Promise<string> {
        try {
            const transport = await initTransporter();
            
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            const info = await transport.sendMail({
                from: '"Oliskey Admin" <no-reply@oliskey.com>',
                to: email,
                subject: 'Your Oliskey Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #4f46e5;">Welcome to Oliskey, ${fullName}!</h2>
                        <p>We're excited to have your school onboard.</p>
                        <p>Your 6-digit confirmation code is:</p>
                        <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 8px; text-align: center;">
                            <strong style="font-size: 32px; letter-spacing: 8px; color: #1f2937;">${code}</strong>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
                    </div>
                `
            });

            if (!process.env.SMTP_USER) {
                console.log('✅ OTP Email sent! Preview URL: %s', nodemailer.getTestMessageUrl(info));
                console.log(`[TESTING OTP CODE]: ${code}`);
            } else {
                console.log(`✅ Real OTP Email sent to: ${email}`);
            }

            return code;
        } catch (error) {
            console.error('Email sending failed:', error);
            throw new Error('Could not send verification email. Please try again.');
        }
    }

    /**
     * Sends a 6-digit OTP code via email
     */
    static async sendOTPEmail(email: string, fullName: string, code: string): Promise<void> {
        try {
            const transport = await initTransporter();

            const info = await transport.sendMail({
                from: '"Oliskey School Management" <no-reply@oliskey.com>',
                to: email,
                subject: 'Your Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #4f46e5; font-size: 24px; margin: 0;">Oliskey</h1>
                        </div>
                        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${fullName},</h2>
                        <p style="color: #4b5563; line-height: 1.6;">
                            Your verification code is:
                        </p>
                        <div style="margin: 30px 0; padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; text-align: center;">
                            <span style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px;">${code}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">
                            This code will expire in <strong>10 minutes</strong>.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                            If you didn't request this code, please ignore this email.
                        </p>
                    </div>
                `
            });

            if (!process.env.SMTP_USER) {
                console.log(`✅ OTP Email sent to ${email}! Preview: ${nodemailer.getTestMessageUrl(info)}`);
                console.log(`[TEST OTP]: ${code}`);
            } else {
                console.log(`✅ OTP Email sent to: ${email}`);
            }
        } catch (error) {
            console.error('OTP Email sending failed:', error);
            throw new Error('Could not send verification code. Please try again.');
        }
    }

    /**
     * Sends a password reset code via email
     */
    static async sendPasswordResetEmail(email: string, fullName: string, code: string): Promise<void> {
        try {
            const transport = await initTransporter();

            const info = await transport.sendMail({
                from: '"Oliskey School Management" <no-reply@oliskey.com>',
                to: email,
                subject: 'Password Reset Request',
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #4f46e5; font-size: 24px; margin: 0;">Oliskey</h1>
                        </div>
                        <h2 style="color: #1f2937; margin-bottom: 16px;">Password Reset Request</h2>
                        <p style="color: #4b5563; line-height: 1.6;">
                            Hello ${fullName},<br><br>
                            We received a request to reset your password. Use the code below:
                        </p>
                        <div style="margin: 30px 0; padding: 24px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 12px; text-align: center;">
                            <span style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px;">${code}</span>
                        </div>
                        <p style="color: #6b7280; font-size: 14px;">
                            This code will expire in <strong>10 minutes</strong>.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="color: #dc2626; font-size: 14px;">
                            <strong>Security Notice:</strong> If you didn't request this password reset, someone may be trying to access your account. Please contact your school administrator immediately.
                        </p>
                    </div>
                `
            });

            if (!process.env.SMTP_USER) {
                console.log(`✅ Password Reset Email sent to ${email}! Preview: ${nodemailer.getTestMessageUrl(info)}`);
                console.log(`[TEST RESET CODE]: ${code}`);
            } else {
                console.log(`✅ Password Reset Email sent to: ${email}`);
            }
        } catch (error) {
            console.error('Password Reset Email sending failed:', error);
            throw new Error('Could not send password reset email. Please try again.');
        }
    }

    /**
     * Sends login credentials to a new user (parent, teacher, etc.)
     */
    static async sendCredentialsEmail(
        email: string, 
        fullName: string, 
        role: string, 
        identifier: string, 
        password: string,
        schoolName?: string
    ): Promise<void> {
        try {
            const transport = await initTransporter();
            const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

            const info = await transport.sendMail({
                from: '"Oliskey School Management" <no-reply@oliskey.com>',
                to: email,
                subject: `Welcome to ${schoolName || 'Oliskey'} - Your Login Credentials`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #4f46e5; font-size: 24px; margin: 0;">Oliskey</h1>
                            <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">School Management System</p>
                        </div>
                        
                        <h2 style="color: #1f2937; margin-bottom: 16px;">Welcome, ${fullName}!</h2>
                        
                        <p style="color: #4b5563; line-height: 1.6;">
                            Your account has been created as a <strong>${roleDisplay}</strong>${schoolName ? ` at <strong>${schoolName}</strong>` : ''}.
                        </p>
                        
                        <p style="color: #4b5563; line-height: 1.6;">
                            Please find your login credentials below:
                        </p>
                        
                        <div style="margin: 24px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Login ID:</td>
                                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right;">${identifier}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Password:</td>
                                    <td style="padding: 8px 0; color: #1f2937; font-size: 14px; font-weight: bold; text-align: right; font-family: monospace;">${password}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="margin: 24px 0;">
                            <a href="${process.env.APP_URL || 'https://app.oliskey.com'}" 
                               style="display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                                Login to Your Account
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        
                        <p style="color: #dc2626; font-size: 13px;">
                            <strong>Important:</strong> Please change your password after your first login for security purposes.
                        </p>
                        
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">
                            If you have any issues logging in, please contact your school administrator.
                        </p>
                    </div>
                `
            });

            if (!process.env.SMTP_USER) {
                console.log(`✅ Credentials Email sent to ${email}! Preview: ${nodemailer.getTestMessageUrl(info)}`);
            } else {
                console.log(`✅ Credentials Email sent to: ${email}`);
            }
        } catch (error) {
            console.error('Credentials Email sending failed:', error);
            throw new Error('Could not send credentials email. Please try again.');
        }
    }
}
