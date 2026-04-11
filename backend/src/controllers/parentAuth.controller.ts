import { Request, Response } from 'express';
import { ParentService } from '../services/parent.service';
import { VerificationService } from '../services/verification.service';
import { AuthService } from '../services/auth.service';
import prisma from '../config/database';

export class ParentAuthController {
    /**
     * Send verification code to parent email
     * POST /api/parent-auth/verify-email/send
     */
    static async sendVerificationEmail(req: Request, res: Response) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email.toLowerCase();
            
            const parent = await prisma.parent.findFirst({
                where: { email: normalizedEmail }
            });

            if (!parent) {
                return res.status(404).json({ success: false, message: 'Parent account not found' });
            }

            const user = await prisma.user.findUnique({
                where: { id: parent.user_id }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User account not found' });
            }

            if (user.email_verified) {
                return res.json({ 
                    success: true, 
                    message: 'Email already verified',
                    already_verified: true
                });
            }

            const { code, expiresAt } = await VerificationService.createVerification(
                user.id,
                user.email,
                parent.full_name,
                'email_verification'
            );

            res.json({
                success: true,
                message: 'Verification code sent',
                data: { expiresAt }
            });
        } catch (error: any) {
            console.error('[ParentAuthController] Send error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to send verification code' });
        }
    }

    /**
     * Verify parent email with code
     * POST /api/parent-auth/verify-email
     */
    static async verifyEmail(req: Request, res: Response) {
        try {
            const { email, code } = req.body;
            
            if (!email || !code) {
                return res.status(400).json({ success: false, message: 'Email and code are required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email.toLowerCase();
            
            const parent = await prisma.parent.findFirst({
                where: { email: normalizedEmail }
            });

            if (!parent) {
                return res.status(404).json({ success: false, message: 'Parent account not found' });
            }

            const user = await prisma.user.findUnique({
                where: { id: parent.user_id }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User account not found' });
            }

            const result = await VerificationService.verifyCode(user.id, code, 'email_verification');

            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }

            await VerificationService.markEmailVerified(user.id);

            // Generate auth token for auto-login
            const token = await AuthService.generateToken(user);

            res.json({
                success: true,
                message: 'Email verified successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    school_generated_id: user.school_generated_id,
                    school_id: user.school_id,
                    branch_id: user.branch_id
                }
            });
        } catch (error: any) {
            console.error('[ParentAuthController] Verify error:', error);
            res.status(500).json({ success: false, message: error.message || 'Verification failed' });
        }
    }

    /**
     * Resend verification code to parent
     * POST /api/parent-auth/verify-email/resend
     */
    static async resendVerificationCode(req: Request, res: Response) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email.toLowerCase();
            
            const parent = await prisma.parent.findFirst({
                where: { email: normalizedEmail }
            });

            if (!parent) {
                return res.status(404).json({ success: false, message: 'Parent account not found' });
            }

            const user = await prisma.user.findUnique({
                where: { id: parent.user_id }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User account not found' });
            }

            const result = await VerificationService.resendVerification(
                user.id,
                user.email,
                parent.full_name,
                'email_verification'
            );

            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }

            res.json({
                success: true,
                message: result.message,
                data: result.data
            });
        } catch (error: any) {
            console.error('[ParentAuthController] Resend error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to resend code' });
        }
    }

    /**
     * Check parent verification status
     * GET /api/parent-auth/verify-email/status/:email
     */
    static async checkVerificationStatus(req: Request, res: Response) {
        try {
            const { email } = req.params;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email.toLowerCase();
            
            const parent = await prisma.parent.findFirst({
                where: { email: normalizedEmail }
            });

            if (!parent) {
                return res.status(404).json({ success: false, message: 'Parent account not found' });
            }

            const user = await prisma.user.findUnique({
                where: { id: parent.user_id }
            });

            res.json({
                success: true,
                email_verified: user?.email_verified ?? false,
                userId: user?.id
            });
        } catch (error: any) {
            console.error('[ParentAuthController] Status check error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to check status' });
        }
    }

    /**
     * Check if parent's email is verified during login
     * Returns error if email not verified (used by login flow)
     */
    static async checkLoginEligibility(req: Request, res: Response) {
        try {
            const { email } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email.toLowerCase();
            
            const user = await prisma.user.findFirst({
                where: { 
                    email: normalizedEmail,
                    role: 'PARENT'
                }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'Parent account not found' });
            }

            if (!user.email_verified) {
                return res.json({
                    success: false,
                    requires_verification: true,
                    message: 'Please verify your email before logging in',
                    email: user.email
                });
            }

            res.json({
                success: true,
                requires_verification: false,
                eligible: true
            });
        } catch (error: any) {
            console.error('[ParentAuthController] Login eligibility check error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to check eligibility' });
        }
    }
}
