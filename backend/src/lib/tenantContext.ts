import { AsyncLocalStorage } from 'async_hooks';

/**
 * Carries the authenticated request's tenant identity across the whole async
 * call chain (middleware -> controller -> service -> prisma) without having
 * to thread a scoped client through every function signature. database.ts
 * reads this via getTenantContext() inside its query extension to set the
 * Postgres session vars that back RLS (app.current_school_id etc.) on the
 * SAME connection that runs the actual query.
 */
export interface TenantContext {
    schoolId?: string | null;
    branchId?: string | null;
    userId?: string | null;
    /**
     * Branches this caller is ENTITLED to, which is not the same as the branch
     * they are currently viewing. RLS uses this as the hard boundary; the app
     * still narrows to `branchId` for the active view.
     *
     * Empty / undefined means "no branch restriction" and is correct for the
     * roles the product defines that way: a main-branch (school-level) admin
     * manages every branch, and a parent must see all their children even when
     * those children are enrolled in different branches. A branch admin,
     * teacher or student gets their own branch plus any explicitly assigned
     * ones. Rows with branch_id IS NULL are school-wide and stay visible to
     * everyone in the school.
     */
    allowedBranchIds?: string[] | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
    return storage.run(context, fn);
}

export function getTenantContext(): TenantContext | undefined {
    return storage.getStore();
}
