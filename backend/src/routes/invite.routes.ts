import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { IdGeneratorService } from '../services/idGenerator.service';

const router = Router();

// Naive `role.toUpperCase()` breaks any multi-word role — the Prisma Role enum
// uses underscores (EXAM_OFFICER, COMPLIANCE_OFFICER), not the concatenated
// form the frontend sends ("examofficer"). Mirrors AuthService.mapRole.
const ROLE_ENUM_MAP: Record<string, string> = {
    examofficer: 'EXAM_OFFICER',
    complianceofficer: 'COMPLIANCE_OFFICER',
    superadmin: 'SUPER_ADMIN',
};
function toRoleEnum(role: string): string {
    const key = role.toLowerCase();
    return ROLE_ENUM_MAP[key] || role.toUpperCase();
}

/**
 * POST /api/invite-user
 * Invites a user to join a school with a specific role
 * Requires admin authentication
 * [LOCAL REFACTOR] Creating user directly in DB instead of an external auth provider
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

        const roleEnum = toRoleEnum(role);
        console.log(`[LocalInvite] Inviting ${email} as ${role} (${roleEnum}) for school ${school_id}`);

        // Check if user already exists
        let user = await prisma.user.findFirst({
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

            // Every user needs the platform's standard {SCHOOL}_{BRANCH}_{ROLE}_{NUM}
            // ID the moment they're created — this path was skipping it entirely,
            // leaving invited staff with a null school_generated_id.
            const schoolGeneratedId = await IdGeneratorService.generateSchoolId(school_id, branch_id, role);

            user = await prisma.user.create({
                data: {
                    email: email.toLowerCase(),
                    full_name,
                    password_hash: hashedPassword,
                    role: roleEnum as any,
                    school_id,
                    branch_id: branch_id || null,
                    email_verified: false,
                    initial_password: tempPassword,
                    school_generated_id: schoolGeneratedId
                }
            });
        }

        // Create membership
        await prisma.schoolMembership.create({
            data: {
                school_id,
                user_id: user!.id,
                base_role: roleEnum as any,
                is_active: true
            }
        });

        // No real invitation email is actually sent (/invite/complete below is a
        // stub) — the admin creating this account is the only way these
        // credentials are ever surfaced, so they must come back in the response,
        // the same way Add Teacher/Add Student already do.
        res.status(200).json({
            success: true,
            message: `User ${email} invited/created successfully`,
            data: {
                user_id: user!.id,
                email: user!.email,
                username: user!.school_generated_id || user!.email,
                school_generated_id: user!.school_generated_id,
                initial_password: user!.initial_password
            }
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
