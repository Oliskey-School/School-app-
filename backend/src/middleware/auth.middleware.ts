import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config, DEMO_SCHOOL_ID } from '../config/env';

export interface AuthRequest extends Request {
    user?: any;
    school_id?: string;
    branch_id?: string;
}

/**
 * Enhanced authentication middleware with:
 * - X-School-Id & X-Branch-Id header validation
 * - Postgres context setting for RLS policies
 * - Strict header-JWT consistency checks
 */
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Prefer the per-tab Bearer token over the shared cookie. Cookies are shared by
    // ALL tabs of the same site, so reading the cookie first made a second tab (e.g.
    // a different demo role) silently adopt whichever identity last logged in or
    // refreshed in another tab — which showed empty data until re-login. The
    // Authorization header is set per tab from that tab's own sessionStorage, so it
    // is the authoritative source; the cookie is only a fallback for clients that
    // can't send the header.
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }
    if (!token) {
        token = req.cookies?.access_token;
    }

    if (!token) {
        console.warn('⚠️ [Auth] No authorization token provided');
        return res.status(401).json({ message: 'Authentication token missing' });
    }

    try {
        // VULNERABILITY MITIGATION: Strictly enforce the signature algorithm
        const decoded: any = jwt.verify(token, config.jwtSecret, {
            algorithms: ['HS256'] // Rejects algorithm: "none" or asymmetric confusion
        });
        
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Invalid token payload' });
        }

        // DEMO TOKEN: Validate that demo tokens can only access the demo school
        if (decoded.is_demo === true) {
            const requestedSchoolId = (req.headers['x-school-id'] as string) ||
                (req.query.schoolId as string) || (req.query.school_id as string) ||
                (req.body?.school_id as string) || (req.body?.schoolId as string);

            // If a school ID is explicitly requested, it MUST be the demo school
            if (requestedSchoolId && requestedSchoolId !== DEMO_SCHOOL_ID) {
                console.warn('🚨 [Auth] Demo token attempted to access non-demo school:', requestedSchoolId);
                return res.status(403).json({ message: 'Demo tokens can only access the demo school' });
            }

            // Fetch demo school details to ensure name updates persist
            const demoSchool = await prisma.school.findUnique({
                where: { id: DEMO_SCHOOL_ID }
            });

            // Re-read the demo user's editable profile fields from the DB so that
            // profile edits (name / phone / avatar) made in this session show up
            // (the JWT carries only the values from login time).
            const demoDbUser = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { full_name: true, avatar_url: true, phone: true },
            }).catch(() => null);

            // Within their private sandbox a demo visitor may switch to the root branch
            // or any branch they created ("<root>__<rand>"); honor that active branch.
            const demoSessionRoot = (decoded.branch_id || '').split('__')[0];
            const demoHeaderBranch = req.headers['x-branch-id'] as string | undefined;
            const demoActiveBranch = (demoHeaderBranch && demoSessionRoot &&
                (demoHeaderBranch === demoSessionRoot || demoHeaderBranch.startsWith(demoSessionRoot + '__')))
                ? demoHeaderBranch
                : decoded.branch_id;

            const demoRoleUpper = (decoded.role || '').toUpperCase();
            req.user = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                school_id: DEMO_SCHOOL_ID,
                branch_id: decoded.branch_id,
                allowed_branch_ids: decoded.allowed_branch_ids || [],
                active_branch_id: demoActiveBranch,
                school_generated_id: decoded.school_generated_id,
                full_name: demoDbUser?.full_name ?? decoded.full_name,
                avatar_url: demoDbUser?.avatar_url ?? null,
                phone: demoDbUser?.phone ?? null,
                is_demo: true,
                is_main_admin: ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(demoRoleUpper),
                school: demoSchool,
                // Session id embedded in the access token — lets Session Management tell
                // "this row is my own live session" apart from other devices/sessions.
                sid: decoded.sid
            };

            // Set Postgres context for RLS policies (demo mode)
            req.school_id = DEMO_SCHOOL_ID;
            req.branch_id = demoActiveBranch || null;
            
            console.log(`🛡️ [Auth] Demo token validated — identity: ${req.user.role} (${req.user.email})`);
            return next();
        }

        // REAL USER: Fetch from database
        const user = await (prisma.user.findUnique as any)({
            where: { id: decoded.id },
            include: {
                school: true,
                branch: true,
                teacher_profile: true,
                parent_profile: true
            }
        });

        if (!user) {
            // User deleted — reject immediately, no ghost fallback
            console.error('❌ [Auth Error] User not found in database');
            return res.status(401).json({ message: 'User no longer exists' });
        }

        // ========================================================================
        // HEADER VALIDATION: Strict consistency check between headers and JWT
        // ========================================================================
        const headerSchoolId = req.headers['x-school-id'] as string | undefined;
        const headerBranchId = req.headers['x-branch-id'] as string | undefined;

        // If X-School-Id header is provided, it MUST match user's school_id
        if (headerSchoolId && headerSchoolId !== user.school_id) {
            console.error(`🚨 [Security] Header-JWT mismatch: X-School-Id (${headerSchoolId}) != user.school_id (${user.school_id})`);
            return res.status(403).json({ message: 'School header does not match authenticated school' });
        }

        // A SCHOOL-LEVEL admin manages the whole school and may operate in ANY of
        // its branches. This is true whether their home branch is the Main Branch
        // OR they have no fixed branch. Onboarding pins the owner admin to the Main
        // Branch, so we must NOT treat that pin as a single-branch lock — otherwise
        // switching to a sub-branch is rejected and the UI bounces back to main.
        // A BRANCH admin (home branch is a sub-branch) stays locked to their branch.
        const roleUpper = (user.role || '').toUpperCase();
        const isSchoolLevelAdmin =
            ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(roleUpper)
            && (!user.branch_id || user.branch?.is_main === true);

        // If X-Branch-Id header is provided, a BRANCH-SCOPED user must be authorized
        // for that exact branch. Unrestricted users (school-level admin / super admin /
        // proprietor) may filter to any branch; their queries remain scoped by
        // school_id, so this cannot cross tenants.
        if (headerBranchId && user.branch_id && !isSchoolLevelAdmin) {
            const allowedBranches = [user.branch_id, ...(user.allowed_branch_ids || [])];
            // Demo sandboxes: the visitor owns their own private sandbox and, as its
            // admin/proprietor, may operate in the sandbox root OR any branch they
            // created inside it ("<root>__<child>"). Teachers/students remain limited
            // to their explicitly assigned branches. Live schools are unaffected.
            const isSandboxOwner = user.school_id === DEMO_SCHOOL_ID
                && ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes((user.role || '').toUpperCase());
            const sandboxRoot = isSandboxOwner ? String(user.branch_id).split('__')[0] : null;
            const inOwnSandbox = !!sandboxRoot
                && (headerBranchId === sandboxRoot || headerBranchId.startsWith(sandboxRoot + '__'));
            if (!allowedBranches.includes(headerBranchId) && !inOwnSandbox) {
                console.error(`🚨 [Security] Unauthorized branch access attempt: ${user.id} tried branch ${headerBranchId}`);
                return res.status(403).json({ message: 'User not authorized to access this branch' });
            }
        }

        console.log(`✅ [Auth Success] User: ${user.email}`);

        // Phone now lives on the core user (all roles); fall back to a role profile.
        const phone = user.phone || user.teacher_profile?.phone || user.parent_profile?.phone || null;

        // Return the role-specific school_generated_id so that the Admin dashboard
        // does not accidentally display a teacher's ID stored in the User row.
        const roleAwareGeneratedId = (() => {
            const r = (user.role || '').toUpperCase();
            if (r === 'TEACHER' && user.teacher_profile?.school_generated_id) {
                return user.teacher_profile.school_generated_id;
            }
            if (r === 'PARENT' && user.parent_profile?.school_generated_id) {
                return user.parent_profile.school_generated_id;
            }
            // For ADMIN, SUPER_ADMIN, PROPRIETOR etc. — use User.school_generated_id as-is
            return user.school_generated_id;
        })();

        // Determine the effective branch_id for this request
        // If X-Branch-Id header is provided, use it; otherwise use user's default branch
        const effectiveBranchId = headerBranchId || user.branch_id;

        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            school_id: user.school_id,
            branch_id: user.branch_id,
            allowed_branch_ids: user.allowed_branch_ids || [],
            // The validated active branch for THIS request (from X-Branch-Id when the
            // user is authorized for it, else their primary branch). Used to enforce
            // session-based isolation for multi-branch teachers.
            active_branch_id: effectiveBranchId,
            // School-level admins can act in any branch of their school; branch admins
            // (home branch is a sub-branch) cannot. Consumed by getEffectiveBranchId so
            // a main admin pinned to the Main Branch is not hard-locked to it.
            is_main_admin: isSchoolLevelAdmin,
            school_generated_id: roleAwareGeneratedId,
            full_name: user.full_name,
            phone: phone,
            avatar_url: user.avatar_url,
            email_verified: user.email_verified, // Added for frontend checks
            school: user.school,
            branch: user.branch,
            teacher_profile: user.teacher_profile,
            parent_profile: user.parent_profile,
            // Session id embedded in the access token — lets Session Management tell
            // "this row is my own live session" apart from other devices/sessions.
            sid: decoded.sid
        };

        // Set Postgres context for RLS policies
        req.school_id = user.school_id;
        req.branch_id = effectiveBranchId;

        next();
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Session expired' });
        }
        console.error('🚨 [Security] Auth Exception [FULL]:', error);
        return res.status(401).json({ message: 'Authentication failed: ' + error.message });
    }
};
