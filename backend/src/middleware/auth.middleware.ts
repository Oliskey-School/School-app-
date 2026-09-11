import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config, DEMO_SCHOOL_ID } from '../config/env';
import { runWithTenantContext } from '../lib/tenantContext';

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
            // Branch entitlement for RLS — the demo path MUST set this too.
            // Omitting it meant `app.current_branch_ids` was written as '', which
            // the policies read as "no branch restriction", so the branch half of
            // every policy on all 177 branch-scoped tables was inert for EVERY
            // demo session — including students. Same rule as the real-user path
            // below: admins/proprietors and parents are unrestricted; teachers and
            // students are limited to their own + assigned branches.
            const demoUnrestricted =
                ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN', 'PARENT'].includes(demoRoleUpper);
            const demoEntitled = demoUnrestricted
                ? null
                : Array.from(new Set(
                    [decoded.branch_id, ...(decoded.allowed_branch_ids || [])].filter(Boolean)
                ));

            return runWithTenantContext(
                {
                    schoolId: DEMO_SCHOOL_ID,
                    branchId: demoActiveBranch || null,
                    userId: decoded.id,
                    allowedBranchIds: demoEntitled,
                },
                next
            );
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

        // The token was minted for a specific school (the claim is signed). If the
        // row it resolves to sits in a different school, something is wrong — a
        // switch-school that half-applied, a stale token after a move, or a lookup
        // that returned the wrong row. Whatever the cause, the request must not
        // proceed carrying a tenant the token was never issued for. Fail closed.
        // (switch-school mints a fresh token, so a legitimate move never hits this.)
        if (decoded.school_id && user.school_id && decoded.school_id !== user.school_id) {
            console.error(`🚨 [Security] Token/row tenant mismatch: token school ${decoded.school_id}, user ${user.id} is in ${user.school_id}`);
            return res.status(401).json({ message: 'Session no longer valid for this school. Please sign in again.' });
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

        // School-level admins skip the allow-list above by design (they manage every
        // branch of their school). That previously let them assert ANOTHER SCHOOL's
        // branch id: the request was accepted, and only the school_id filter on each
        // downstream query kept the data separate. Any branch-only query would have
        // turned that into a cross-tenant read. Reject a branch that demonstrably
        // belongs to a different school.
        //
        // Only a branch that actually EXISTS and resolves to another tenant is
        // rejected — demo sandbox branch ids ("demo-v-<id>" / "<root>__<child>") are
        // virtual and have no Branch row, so they are unaffected.
        //
        // The header is not the only place a branch id arrives. Controllers also
        // read it from the query string and the body (some directly, e.g. a
        // create that stores body.branch_id on the new row). For a branch-scoped
        // user that is harmless — RLS refuses any branch outside their entitlement
        // list — but a school-level admin is branch-UNRESTRICTED at the RLS layer
        // on purpose, so a foreign branch id in the body was accepted and stored:
        // the hostile probe produced School A rows carrying School B's branch id
        // in AcademicSettings and SchoolDocument. Every source is checked here,
        // in one place, with one query, before any controller runs.
        if (isSchoolLevelAdmin && user.school_id) {
            const candidates = [
                headerBranchId,
                req.query?.branchId, req.query?.branch_id,
                req.body?.branchId, req.body?.branch_id,
            ]
                .flat()
                .filter((v): v is string => typeof v === 'string' && v !== '' && v !== 'all' && v !== 'undefined' && v !== 'null');
            if (candidates.length) {
                const owners = await prisma.branch.findMany({
                    where: { id: { in: Array.from(new Set(candidates)) } },
                    select: { id: true, school_id: true },
                });
                const foreign = owners.find(b => b.school_id !== user.school_id);
                if (foreign) {
                    console.error(`🚨 [Security] Cross-tenant branch assertion: ${user.id} (school ${user.school_id}) tried branch ${foreign.id} of school ${foreign.school_id}`);
                    return res.status(403).json({ message: 'User not authorized to access this branch' });
                }
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

        // Branch entitlement for RLS. A school-level admin (and SUPER_ADMIN)
        // manages every branch, and a PARENT must see children across branches —
        // both are deliberately unrestricted here. Everyone else is pinned to
        // their own branch plus explicitly assigned ones, which mirrors the
        // allow-list getEffectiveBranchId already enforces at the app layer.
        const roleUpperCtx = (user.role || '').toUpperCase();
        const branchUnrestricted = isSchoolLevelAdmin || roleUpperCtx === 'SUPER_ADMIN' || roleUpperCtx === 'PARENT';
        const entitledBranches = branchUnrestricted
            ? null
            : Array.from(new Set([user.branch_id, ...(user.allowed_branch_ids || [])].filter(Boolean)));

        runWithTenantContext(
            {
                schoolId: user.school_id,
                branchId: effectiveBranchId,
                userId: user.id,
                allowedBranchIds: entitledBranches,
            },
            next
        );
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Session expired' });
        }
        console.error('🚨 [Security] Auth Exception [FULL]:', error);
        return res.status(401).json({ message: 'Authentication failed: ' + error.message });
    }
};
