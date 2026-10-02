import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';
import { config, DEMO_SCHOOL_ID } from '../config/env';
import { runWithTenantContext, runAsPlatform } from '../lib/tenantContext';

export interface AuthRequest extends Request {
    user?: any;
    school_id?: string;
    branch_id?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) token = authHeader.split(' ')[1];
    if (!token) token = req.cookies?.access_token;

    if (!token) return res.status(401).json({ message: 'Authentication token missing' });

    try {
        const decoded: any = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
        if (!decoded || !decoded.id) return res.status(401).json({ message: 'Invalid token payload' });

        if (decoded.is_demo === true) {
            const requestedSchoolId = (req.headers['x-school-id'] as string) ||
                (req.query.schoolId as string) || (req.query.school_id as string) ||
                (req.body?.school_id as string) || (req.body?.schoolId as string);
            if (requestedSchoolId && requestedSchoolId !== DEMO_SCHOOL_ID) {
                return res.status(403).json({ message: 'Demo tokens can only access the demo school' });
            }

            // Resolving the token's identity happens BEFORE a tenant scope exists,
            // so it is platform-level work (see lib/tenantContext.ts). Without this
            // the lookups run with RLS applied and an empty school → no row.
            const demoSchool = await runAsPlatform(() => prisma.school.findUnique({
                where: { id: DEMO_SCHOOL_ID }
            }));

            // Re-read the demo user's editable profile fields from the DB so that
            // profile edits (name / phone / avatar) made in this session show up
            // (the JWT carries only the values from login time).
            const demoDbUser = await runAsPlatform(() => prisma.user.findUnique({
                where: { id: decoded.id },
                select: { full_name: true, avatar_url: true, phone: true },
            })).catch(() => null);

            const demoSessionRoot = (decoded.branch_id || '').split('__')[0];
            const demoHeaderBranch = req.headers['x-branch-id'] as string | undefined;
            const demoActiveBranch = (demoHeaderBranch && demoSessionRoot &&
                (demoHeaderBranch === demoSessionRoot || demoHeaderBranch.startsWith(demoSessionRoot + '__')))
                ? demoHeaderBranch : decoded.branch_id;
            const demoRoleUpper = (decoded.role || '').toUpperCase();

            req.user = {
                id: decoded.id, email: decoded.email, role: decoded.role,
                school_id: DEMO_SCHOOL_ID, branch_id: decoded.branch_id,
                allowed_branch_ids: decoded.allowed_branch_ids || [],
                active_branch_id: demoActiveBranch,
                school_generated_id: decoded.school_generated_id,
                full_name: demoDbUser?.full_name ?? decoded.full_name,
                avatar_url: demoDbUser?.avatar_url ?? null, phone: demoDbUser?.phone ?? null,
                is_demo: true,
                is_main_admin: ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(demoRoleUpper),
                school: demoSchool, sid: decoded.sid
            };
            req.school_id = DEMO_SCHOOL_ID;
            req.branch_id = demoActiveBranch || null;

            const demoUnrestricted = ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN', 'PARENT'].includes(demoRoleUpper);
            const demoEntitled = demoUnrestricted ? null : Array.from(new Set(
                [decoded.branch_id, ...(decoded.allowed_branch_ids || [])].filter(Boolean)
            ));
            return runWithTenantContext({
                schoolId: DEMO_SCHOOL_ID,
                branchId: demoActiveBranch || null,
                userId: decoded.id,
                allowedBranchIds: demoEntitled,
            }, next);
        }

        // REAL USER: token → user is resolved before any tenant scope exists, so
        // it is platform-level by definition (the scope for everything after this
        // is derived from it). With no scope this would run with RLS applied and
        // an empty school, find nothing, and every real user would get 401
        // "User no longer exists" right after a successful sign-in.
        const user = await runAsPlatform(() => (prisma.user.findUnique as any)({
            where: { id: decoded.id },
            include: {
                school: true,
                branch: true,
                teacher_profile: true,
                parent_profile: true
            }
        }));

        if (!user) return res.status(401).json({ message: 'User no longer exists' });

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
        // HEADER VALIDATION: strict consistency between headers and the JWT
        // ========================================================================
        const headerSchoolId = req.headers['x-school-id'] as string | undefined;
        const headerBranchId = req.headers['x-branch-id'] as string | undefined;
        if (headerSchoolId && headerSchoolId !== user.school_id) {
            return res.status(403).json({ message: 'School header does not match authenticated school' });
        }

        const roleUpper = (user.role || '').toUpperCase();
        const isSchoolLevelAdmin = ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(roleUpper)
            && (!user.branch_id || user.branch?.is_main === true);

        if (headerBranchId && user.branch_id && !isSchoolLevelAdmin) {
            const allowedBranches = [user.branch_id, ...(user.allowed_branch_ids || [])];
            const isSandboxOwner = user.school_id === DEMO_SCHOOL_ID
                && ['ADMIN', 'PROPRIETOR', 'SUPER_ADMIN'].includes(roleUpper);
            const sandboxRoot = isSandboxOwner ? String(user.branch_id).split('__')[0] : null;
            const inOwnSandbox = !!sandboxRoot &&
                (headerBranchId === sandboxRoot || headerBranchId.startsWith(sandboxRoot + '__'));
            if (!allowedBranches.includes(headerBranchId) && !inOwnSandbox) {
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
                // Deliberately cross-school: the check is whether a requested branch
                // belongs to ANOTHER school, which the tenant scope would hide.
                const owners = await runAsPlatform(() => prisma.branch.findMany({
                    where: { id: { in: Array.from(new Set(candidates)) } },
                    select: { id: true, school_id: true },
                }));
                const foreign = owners.find(b => b.school_id !== user.school_id);
                if (foreign) {
                    console.error(`🚨 [Security] Cross-tenant branch assertion: ${user.id} (school ${user.school_id}) tried branch ${foreign.id} of school ${foreign.school_id}`);
                    return res.status(403).json({ message: 'User not authorized to access this branch' });
                }
            }
        }

        const phone = user.phone || user.teacher_profile?.phone || user.parent_profile?.phone || null;
        const roleAwareGeneratedId = (() => {
            if (roleUpper === 'TEACHER' && user.teacher_profile?.school_generated_id) return user.teacher_profile.school_generated_id;
            if (roleUpper === 'PARENT' && user.parent_profile?.school_generated_id) return user.parent_profile.school_generated_id;
            return user.school_generated_id;
        })();
        const effectiveBranchId = headerBranchId || user.branch_id;

        req.user = {
            id: user.id, email: user.email, role: user.role,
            school_id: user.school_id, branch_id: user.branch_id,
            allowed_branch_ids: user.allowed_branch_ids || [],
            active_branch_id: effectiveBranchId,
            is_main_admin: isSchoolLevelAdmin,
            school_generated_id: roleAwareGeneratedId,
            full_name: user.full_name, phone, avatar_url: user.avatar_url,
            email_verified: user.email_verified, school: user.school, branch: user.branch,
            teacher_profile: user.teacher_profile, parent_profile: user.parent_profile,
            sid: decoded.sid
        };

        req.school_id = user.school_id;
        req.branch_id = effectiveBranchId;
        const branchUnrestricted = isSchoolLevelAdmin || roleUpper === 'SUPER_ADMIN' || roleUpper === 'PARENT';
        const entitledBranches = branchUnrestricted
            ? null
            : Array.from(new Set([user.branch_id, ...(user.allowed_branch_ids || [])].filter(Boolean)));

        runWithTenantContext(
            {
                schoolId: user.school_id,
                branchId: effectiveBranchId,
                userId: user.id,
                allowedBranchIds: entitledBranches,
                // The platform owner's account has no school of its own.
                platform: roleUpper === 'SUPER_ADMIN',
            },
            next
        );
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Session expired' });
        }
        console.error('[Security] Authentication exception:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
};
