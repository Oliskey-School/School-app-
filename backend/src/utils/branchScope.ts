import { DEMO_SCHOOL_ID } from '../config/env';

/**
 * Branch Isolation Helpers
 *
 * Enforces the access control rule:
 *   - Branch admin (role='admin' with branch_id set): LOCKED to their branch.
 *     Query-string overrides are ignored.
 *   - Main admin (role='admin', no branch_id): can see all branches or filter
 *     by a requested branch_id.
 *   - Super admin: platform-wide, no branch restriction.
 *   - Teacher / parent / student: scoped to their own branch_id from the profile.
 */

/**
 * Returns the branch ID that must be used for queries made by this user.
 *
 * @param user           - req.user populated by auth middleware
 * @param requestedId    - branch_id from query-string or request body (optional)
 * @param headerId       - branch_id from X-Branch-Id header (optional)
 */
export function getEffectiveBranchId(user: any, requestedId?: string | null, headerId?: string | null): string | undefined {
    const allowed: string[] = Array.isArray(user.allowed_branch_ids) ? user.allowed_branch_ids : [];
    const authorized = [user.branch_id, ...allowed].filter(Boolean);

    // The branch the user is ACTIVELY focused on — validated by the auth middleware
    // from the X-Branch-Id header and surfaced as `active_branch_id` — is the
    // authoritative selection. It must win over any explicit branch a screen passes,
    // because screens frequently pass a stale "home branch" value that would otherwise
    // override the user's live selection (this is exactly why switching to a sub-branch
    // still leaked main-branch data on some screens). The explicit requested branch is
    // used only as a FALLBACK when there is no active selection (e.g. a main admin
    // viewing "All Branches", whose active_branch_id resolves to null).
    const requested = (requestedId && requestedId !== 'undefined' && requestedId !== 'null')
        ? requestedId
        : undefined;
    const headerActive = (headerId && headerId !== 'undefined' && headerId !== 'null')
        ? headerId
        : undefined;
    const selected = headerActive || user.active_branch_id || requested;

    // 0. DEMO sessions: the visitor is the main admin of their private sandbox and may
    //    operate in the root branch OR any branch they created within it ("<root>__<rand>"),
    //    but never outside their sandbox.
    const demoRoot = getDemoSessionRoot(user);
    if (demoRoot) {
        if (selected && selected !== 'all' && (selected === demoRoot || selected.startsWith(demoRoot + '__'))) {
            return selected;
        }
        return user.active_branch_id || user.branch_id || demoRoot;
    }

    // 1. MULTI-BRANCH users (e.g. a teacher assigned to two branches by the main admin).
    //    They operate in exactly ONE active branch at a time and are isolated to it.
    //    Honor the selected branch ONLY if it is one of their authorized branches;
    //    never grant them an 'all-branches' view.
    if (allowed.length > 0) {
        if (selected && selected !== 'all' && authorized.includes(selected)) {
            return selected;
        }
        // No valid selection → default to their primary branch (still a single branch).
        return user.branch_id || authorized[0] || undefined;
    }

    // 2. SINGLE-BRANCH scoped users (branch admin, single-branch teacher/student/parent):
    //    hard-locked to their profile branch. Query/header overrides are ignored.
    if (user.branch_id) {
        return user.branch_id;
    }

    // 3. UNRESTRICTED users (Super Admin, Main Admin, Proprietor with no fixed branch).
    if (selected === 'all') {
        return undefined;
    }
    return selected || undefined;
}

/** Returns true when the user is scoped to exactly one branch. */
export function isBranchScoped(user: any): boolean {
    return !!user.branch_id;
}

/**
 * For demo sessions, returns the root virtual branch that identifies this
 * visitor's private sandbox (e.g. "demo-v-ab12cd34"). Branches the visitor
 * creates are stored as children ("<root>__<rand>") so they stay isolated to
 * the session and never leak into another visitor's demo.
 *
 * Returns undefined for live (non-demo) schools, leaving their behaviour
 * (main admin sees all branches, branch admin locked to one) untouched.
 */
export function getDemoSessionRoot(user: any): string | undefined {
    if (!user || user.school_id !== DEMO_SCHOOL_ID) return undefined;
    const active = user.active_branch_id || user.branch_id;
    if (!active || typeof active !== 'string') return undefined;
    // The active branch is either the sandbox root itself or one of its
    // children ("<root>__<rand>"); normalise back to the root.
    return active.split('__')[0];
}
