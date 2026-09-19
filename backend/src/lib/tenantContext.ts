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
    /**
     * Platform-level work that legitimately spans schools: sign-in by email,
     * onboarding a new school, demo seeding, payment webhooks, scheduled jobs,
     * the platform owner's own account. ONLY code that runs inside
     * runAsPlatform()/platformContext gets the RLS bypass; a query with no
     * context at all runs with RLS fully applied (and sees nothing
     * tenant-owned) instead of silently bypassing it.
     */
    platform?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): Promise<Awaited<T>> {
    // `await` INSIDE the store: a lazy PrismaPromise returned from `fn` would
    // otherwise execute after storage.run() returned, outside the context.
    return storage.run(context, async () => (await fn()) as Awaited<T>) as any;
}

/** Run `fn` as platform-level (cross-school) work. Keep the body minimal. */
export function runAsPlatform<T>(fn: () => T): Promise<Awaited<T>> {
    return storage.run({ platform: true }, async () => (await fn()) as Awaited<T>) as any;
}

/** Express middleware form of runAsPlatform for public / cross-school routers. */
export function platformContext(_req: any, _res: any, next: () => void) {
    return storage.run({ platform: true }, next);
}

/**
 * Test-only: puts the whole current async tree in platform scope so fixtures
 * can be created directly. Never call this from application code.
 */
export function enterPlatformScopeForTests() {
    storage.enterWith({ platform: true });
}

export function getTenantContext(): TenantContext | undefined {
    return storage.getStore();
}
