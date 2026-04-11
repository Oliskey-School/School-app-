import { Request, Response } from 'express';
import { VerificationService } from '../services/verification.service';
import prisma from '../config/database';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export class VerificationController {
    /**
     * Send verification code to email
     * POST /api/verification/send
     */
    static async sendVerificationCode(req: Request, res: Response) {
        try {
            const { email, purpose = 'email_verification', fullName } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email;
            
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail.toLowerCase() }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const isVerified = await VerificationService.isEmailVerified(user.id);

            if (isVerified && purpose === 'email_verification') {
                return res.json({
                    success: true,
                    message: 'Email already verified',
                    email_verified: true
                });
            }

            const { code, expiresAt } = await VerificationService.createVerification(
                user.id,
                user.email,
                fullName || user.full_name || 'User',
                purpose
            );

            res.json({
                success: true,
                message: 'Verification code sent',
                data: { expiresAt }
            });
        } catch (error: any) {
            console.error('[VerificationController] Send error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to send verification code' });
        }
    }

    /**
     * Verify a code submitted by user
     * POST /api/verification/verify
     */
    static async verifyCode(req: Request, res: Response) {
        try {
            const { email, code, purpose = 'email_verification' } = req.body;
            
            if (!email || !code) {
                return res.status(400).json({ success: false, message: 'Email and code are required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email;
            
            const user = await (prisma.user.findUnique as any)({
                where: { email: normalizedEmail.toLowerCase() },
                include: { school: true }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const result = await VerificationService.verifyCode(user.id, code, purpose);

            if (!result.success) {
                return res.status(400).json({ success: false, message: result.message });
            }

            if (purpose === 'email_verification') {
                await VerificationService.markEmailVerified(user.id);
            }

            const token = jwt.sign(
                { 
                    id: user.id, 
                    email: user.email,
                    role: user.role,
                    school_id: user.school_id,
                    branch_id: user.branch_id
                },
                config.jwtSecret,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Verification successful',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    school_generated_id: user.school_generated_id,
                    school_id: user.school_id,
                    branch_id: user.branch_id,
                    school: user.school
                }
            });
        } catch (error: any) {
            console.error('[VerificationController] Verify error:', error);
            res.status(500).json({ success: false, message: error.message || 'Verification failed' });
        }
    }

    /**
     * Resend verification code
     * POST /api/verification/resend
     */
    static async resendCode(req: Request, res: Response) {
        try {
            const { email, purpose = 'email_verification' } = req.body;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email;
            
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail.toLowerCase() }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const result = await VerificationService.resendVerification(
                user.id,
                user.email,
                user.full_name || 'User',
                purpose
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
            console.error('[VerificationController] Resend error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to resend code' });
        }
    }

    /**
     * Check verification status
     * GET /api/verification/status/:email
     */
    static async checkStatus(req: Request, res: Response) {
        try {
            const { email } = req.params;
            
            if (!email) {
                return res.status(400).json({ success: false, message: 'Email is required' });
            }

            const normalizedEmail = Array.isArray(email) ? email[0] : email;
            
            const user = await prisma.user.findUnique({
                where: { email: normalizedEmail.toLowerCase() }
            });

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            const isVerified = await VerificationService.isEmailVerified(user.id);

            res.json({
                success: true,
                email_verified: isVerified,
                userId: user.id
            });
        } catch (error: any) {
            console.error('[VerificationController] Status check error:', error);
            res.status(500).json({ success: false, message: error.message || 'Failed to check status' });
        }
    }
}
