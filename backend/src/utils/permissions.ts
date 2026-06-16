/**
 * Branch-scoped admin permissions (two-layer governance model).
 *
 *  - Main Admin (school-level / proprietor / super admin) manages the whole school.
 *  - Branch Admin is locked to one branch (`branch_id`, `is_main_admin === false`).
 *
 * Teacher governance: a teacher's IDENTITY (name, email, phone, qualifications, photo,
 * login, allowed branches) is owned by the teacher's HOME branch (`teacher.branch_id`)
 * and the Main Admin. Other branches the teacher is assigned to (`allowed_branch_ids`)
 * may only assign classes/subjects (ClassTeacher) and scheduling (Timetable) — never
 * edit the teacher record itself.
 */

export interface RequesterLike {
    is_main_admin?: boolean;
    branch_id?: string | null;
    role?: string | null;
}

/** Manages the whole school — not pinned to a single branch's ownership. */
export function isMainAdmin(user: RequesterLike | undefined | null): boolean {
    if (!user) return false;
    if (user.is_main_admin) return true;
    const role = String(user.role || '').toUpperCase();
    return role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || role === 'PROPRIETOR';
}

/** The teacher's home-branch admin, or the Main Admin. */
export function canEditTeacherIdentity(
    user: RequesterLike | undefined | null,
    teacher: { branch_id?: string | null } | undefined | null,
): boolean {
    if (isMainAdmin(user)) return true;
    return !!user?.branch_id && !!teacher?.branch_id && user.branch_id === teacher.branch_id;
}

/** May lend a teacher to additional branches (Main Admin or the home-branch admin). */
export const canAssignTeacherToBranch = canEditTeacherIdentity;

/**
 * May assign the teacher to classes/subjects WITHIN a specific branch. Allowed for the
 * Main Admin, the teacher's home branch, OR the admin of a branch the teacher is
 * assigned to (their own branch, and the teacher is lent there). This never lets them
 * edit the teacher's identity — only their per-branch class/subject assignments.
 */
export function canAssignTeacherClassesInBranch(
    user: RequesterLike | undefined | null,
    teacher: { branch_id?: string | null; allowed_branch_ids?: string[] } | undefined | null,
    branchId: string | undefined | null,
): boolean {
    if (canEditTeacherIdentity(user, teacher)) return true; // main + home can manage any branch
    if (!branchId || !user?.branch_id || user.branch_id !== branchId) return false; // only their own branch
    const assigned = teacher?.branch_id === branchId
        || (Array.isArray(teacher?.allowed_branch_ids) && teacher!.allowed_branch_ids!.includes(branchId));
    return !!assigned;
}

/** School-wide settings (identity, plan, creating branches) — Main Admin only. */
export function canEditSchoolSettings(user: RequesterLike | undefined | null): boolean {
    return isMainAdmin(user);
}

/** Throw a 403 the controllers translate into an HTTP 403. */
export function forbidden(message: string): Error {
    return Object.assign(new Error(message), { status: 403 });
}
