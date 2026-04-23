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
    // 1. If the user is strictly scoped to a specific branch in their profile (Teacher, Student, Parent, Branch Admin)
    // They ARE NOT allowed to escape this branch, even if they request 'all' or another ID.
    // We prioritize the profile branch above ALL external inputs (query, body, or headers).
    if (user.branch_id) {
        return user.branch_id;
    }

    // 2. User is unrestricted (Super Admin, Main Admin, or Proprietor with no fixed branch)
    // They can use the requestedId or the headerId.
    const effectiveRequested = (requestedId && requestedId !== 'undefined') ? requestedId : headerId;
    
    // Honor 'all' only for unrestricted users
    if (effectiveRequested === 'all') {
        return undefined;
    }

    // Return the effective request if provided, otherwise undefined (which defaults to 'all' or handled by service)
    return effectiveRequested || undefined;
}

/** Returns true when the user is scoped to exactly one branch. */
export function isBranchScoped(user: any): boolean {
    return !!user.branch_id;
}
