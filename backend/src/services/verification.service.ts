import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { EmailService } from './email.service';

import { TestOTPStore } from './test-otp.store';

export interface VerificationResult {
    success: boolean;
    message: string;
    data?: any;
}

export class VerificationService {
    private static readonly OTP_LENGTH = 6;
    private static readonly OTP_EXPIRY_MINUTES = 10;
    private static readonly MAX_ATTEMPTS = 5;

    /**
     * Generates a random OTP code of specified length
     */
    static generateOTP(length: number = this.OTP_LENGTH): string {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return otp;
    }

    /**
     * Creates a new verification code for a user
     * - Deletes any existing unused codes for this user/purpose
     * - Creates a new code and sends it via email
     */
    static async createVerification(
        userId: string,
        email: string,
        fullName: string,
        purpose: 'email_verification' | 'password_reset' = 'email_verification',
        ipAddress?: string
    ): Promise<{ code: string; expiresAt: Date }> {
        // Delete any existing unused codes for this user and purpose
        await prisma.verificationCode.deleteMany({
            where: {
                user_id: userId,
                purpose,
                used_at: null
            }
        });

        // Generate new OTP
        const code = this.generateOTP();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

        // Store for testing if needed
        TestOTPStore.set(email, code);

        // Store the code (hashed for security)
        const hashedCode = await bcrypt.hash(code, 10);
        
        await prisma.verificationCode.create({
            data: {
                user_id: userId,
                email: email.toLowerCase(),
                code: hashedCode,
                purpose,
                expires_at: expiresAt,
                ip_address: ipAddress ? ipAddress : undefined
            }
        });

        // Send email with the plain code (we need to send it plain for user to enter)
        if (purpose === 'email_verification') {
            await EmailService.sendOTPEmail(email, fullName, code);
        } else if (purpose === 'password_reset') {
            await EmailService.sendPasswordResetEmail(email, fullName, code);
        }

        return { code, expiresAt };
    }

    /**
     * Verifies an OTP code submitted by a user
     * - Checks if code exists, is not expired, and has not been used
     * - Marks the code as used after successful verification
     */
    static async verifyCode(
        userId: string,
        submittedCode: string,
        purpose: 'email_verification' | 'password_reset'
    ): Promise<VerificationResult> {
        // Find the latest unused code for this user and purpose
        const verificationRecord = await prisma.verificationCode.findFirst({
            where: {
                user_id: userId,
                purpose,
                used_at: null,
                expires_at: { gt: new Date() }
            },
            orderBy: { created_at: 'desc' }
        });

        if (!verificationRecord) {
            return {
                success: false,
                message: 'Verification code not found or has expired. Please request a new one.'
            };
        }

        // Check max attempts
        if (verificationRecord.attempts >= this.MAX_ATTEMPTS) {
            // Mark as used (exhausted attempts)
            await prisma.verificationCode.update({
                where: { id: verificationRecord.id },
                data: { used_at: new Date() }
            });
            return {
                success: false,
                message: 'Too many failed attempts. Please request a new verification code.'
            };
        }

        // Verify the submitted code against the hashed code
        const isValid = await bcrypt.compare(submittedCode, verificationRecord.code);

        if (!isValid) {
            // Increment attempts
            await prisma.verificationCode.update({
                where: { id: verificationRecord.id },
                data: { attempts: verificationRecord.attempts + 1 }
            });

            const remainingAttempts = this.MAX_ATTEMPTS - verificationRecord.attempts - 1;
            return {
                success: false,
                message: `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
            };
        }

        // Mark the code as used
        await prisma.verificationCode.update({
            where: { id: verificationRecord.id },
            data: { used_at: new Date() }
        });

        return {
            success: true,
            message: 'Verification successful.'
        };
    }

    /**
     * Resends a new verification code
     */
    static async resendVerification(
        userId: string,
        email: string,
        fullName: string,
        purpose: 'email_verification' | 'password_reset' = 'email_verification'
    ): Promise<VerificationResult> {
        // Check if there's a recent code that hasn't expired
        const recentCode = await prisma.verificationCode.findFirst({
            where: {
                user_id: userId,
                purpose,
                used_at: null,
                expires_at: { gt: new Date() },
                created_at: { gt: new Date(Date.now() - 60 * 1000) } // 1 minute cooldown
            }
        });

        if (recentCode) {
            return {
                success: false,
                message: 'Please wait at least 1 minute before requesting a new code.'
            };
        }

        // Create new verification
        const { code, expiresAt } = await this.createVerification(userId, email, fullName, purpose);

        return {
            success: true,
            message: `A new ${purpose === 'email_verification' ? 'verification' : 'reset'} code has been sent to your email.`,
            data: { expiresAt }
        };
    }

    /**
     * Checks if a user has verified their email
     */
    static async isEmailVerified(userId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email_verified: true }
        });
        return user?.email_verified ?? false;
    }

    /**
     * Marks a user's email as verified (called after successful OTP verification)
     */
    static async markEmailVerified(userId: string): Promise<void> {
        await prisma.user.update({
            where: { id: userId },
            data: { email_verified: true }
        });
    }

    /**
     * Cleans up expired verification codes (can be called by a cron job)
     */
    static async cleanupExpiredCodes(): Promise<number> {
        const result = await prisma.verificationCode.deleteMany({
            where: {
                expires_at: { lt: new Date() },
                used_at: null
            }
        });
        return result.count;
    }
}
