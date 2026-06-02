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

    // The active branch already validated by the auth middleware (from X-Branch-Id),
    // then any explicit query/body branch, then the header param.
    const selected = (requestedId && requestedId !== 'undefined' && requestedId !== 'null')
        ? requestedId
        : (headerId || user.active_branch_id);

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
