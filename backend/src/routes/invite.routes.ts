import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/tenant.middleware';

const router = Router();

// Initialize Supabase Admin client (with service_role key)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

// Lazy initialization to prevent server crash
const getSupabaseAdmin = () => {
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials for admin operations (SUPABASE_SERVICE_KEY)');
        throw new Error('Supabase service role key is not configured');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

/**
 * POST /api/invite-user
 * Invites a user to join a school with a specific role
 * Requires admin authentication
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

        // Validate role
        const validRoles = ['admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'examofficer', 'complianceofficer'];
        if (!validRoles.includes(role)) {
            res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
            return;
        }

        console.log(`Inviting ${email} as ${role} for school ${school_id}`);

        // Use Supabase Admin API to invite user
        const supabaseAdmin = getSupabaseAdmin();
        const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || 'http://localhost:5173';
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                school_id,
                branch_id: branch_id || null,
                role,
                full_name,
            },
            // Hash-based redirect so the SPA picks it up without a 404.
            // App.tsx detects hash containing 'invite/accept' and shows InviteAcceptScreen.
            redirectTo: `${appUrl}/#/invite/accept?role=${encodeURIComponent(role)}&school_id=${encodeURIComponent(school_id)}${branch_id ? `&branch_id=${encodeURIComponent(branch_id)}` : ''}`,
        });

        if (error) {
            console.error('Supabase invitation error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to send invitation'
            });
            return;
        }

        console.log(`Successfully invited ${email}`);

        res.status(200).json({
            success: true,
            message: `Invitation sent to ${email}`,
            data: {
                user_id: data.user?.id,
                email: data.user?.email
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
 * Called by the frontend immediately after an invited user accepts their invite
 * and lands on the app for the first time. Generates their school_generated_id
 * and ensures their profile is fully set up.
 * Requires the invitee's own session token (they are already authenticated).
 */
router.post('/invite/complete', authenticate, async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const supabaseAdmin = getSupabaseAdmin();

        // Call the DB RPC to generate the ID and complete the profile
        const { data, error } = await supabaseAdmin.rpc('complete_staff_invite', {
            p_user_id: userId,
        });

        if (error) {
            console.error('[InviteComplete] RPC error:', error.message);
            res.status(500).json({ success: false, message: error.message });
            return;
        }

        console.log(`[InviteComplete] Completed for user ${userId}:`, data);
        res.status(200).json({ success: true, ...data });
    } catch (error: any) {
        console.error('[InviteComplete] Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
