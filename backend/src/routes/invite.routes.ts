import { Router } from 'express';
import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import prisma from '../config/database';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * POST /api/invite-user
 * Invites a user to join a school with a specific role
 * Requires admin authentication
 * [LOCAL REFACTOR] Creating user directly in DB instead of Supabase Auth
 */
router.post('/invite-user', authenticate, requireRole(['admin', 'proprietor']), async (req: any, res: Response): Promise<void> => {
    try {
        const { email, school_id, role, full_name, branch_id } = req.body;

        // Validate required fields
        if (!email || !school_id || !role || !full_name) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: email, school_id, role, full_name'
            });
            return;
        }

        console.log(`[LocalInvite] Inviting ${email} as ${role} for school ${school_id}`);

        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (user) {
            // Check if already a member
            const existingMember = await prisma.schoolMembership.findUnique({
                where: { school_id_user_id: { school_id, user_id: user.id } }
            });

            if (existingMember) {
                res.status(400).json({ success: false, message: 'User is already a member of this school' });
                return;
            }
        } else {
            // Create user with a temporary random password
            const tempPassword = Math.random().toString(36).slice(-10) + '1!A';
            const hashedPassword = await bcrypt.hash(tempPassword, 10);
            
            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    full_name,
                    password_hash: hashedPassword,
                    role: role.toUpperCase() as any,
                    school_id,
                    branch_id: branch_id || null,
                    email_verified: false,
                    initial_password: tempPassword
                }
            });
        }

        // Create membership
        await prisma.schoolMembership.create({
            data: {
                school_id,
                user_id: user!.id,
                base_role: role.toUpperCase() as any,
                is_active: true
            }
        });

        res.status(200).json({
            success: true,
            message: `User ${email} invited/created successfully`,
            data: { user_id: user!.id, email: user!.email }
        });
    } catch (error: any) {
        console.error('Error inviting user:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});

/**
 * POST /api/invite/complete
 * Mocked for now to maintain consistency with frontend calls
 */
router.post('/invite/complete', authenticate, async (req: any, res: Response): Promise<void> => {
    res.status(200).json({ success: true, message: 'Invite completion handled locally' });
});

export default router;
