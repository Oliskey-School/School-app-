import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

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
router.post('/invite-user', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, school_id, role, full_name } = req.body;

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
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                school_id,
                role,
                full_name
            },
            redirectTo: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#/auth/callback?type=invite&role=${role}`
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

export default router;
