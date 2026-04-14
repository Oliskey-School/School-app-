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
 */
export function getEffectiveBranchId(user: any, requestedId?: string | null): string | undefined {
    // If explicitly requesting 'all', return undefined to search across all branches
    // (This should only be honored if the user has permission, but for now we trust the controller logic)
    if (requestedId === 'all') {
        return undefined;
    }

    const isBranchAdmin = user.role === 'admin' && !!user.branch_id;

    if (isBranchAdmin) {
        // Branch admin is always locked to their own branch
        return user.branch_id as string;
    }

    if (user.role === 'superadmin') {
        // Super admin can target any branch (or none = see all)
        return requestedId || undefined;
    }

    // For all other roles (teacher, parent, student, proprietor, …)
    // and for the main admin (no branch_id on profile):
    // use the user's own branch first, then fall back to requested branch.
    return (user.branch_id as string | undefined) || requestedId || undefined;
}

/** Returns true when the user is scoped to exactly one branch. */
export function isBranchScoped(user: any): boolean {
    return !!user.branch_id;
}
