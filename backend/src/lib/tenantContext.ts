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
     * onboarding a new school, demo seeding, payment webhooks, scheduled jobs.
     * ONLY code that runs inside runAsPlatform()/platformContext gets the RLS
     * bypass; a query with no context at all now runs with RLS fully applied
     * (and sees nothing tenant-owned) instead of silently bypassing it.
     */
    platform?: boolean;
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Test-process default (see enterPlatformScopeForTests). Never set by app code. */
const TEST_PLATFORM_CONTEXT: TenantContext = { platform: true };
let testPlatformFallback = false;

/**
 * Prisma operations are LAZY: the query runs when the promise is awaited, and
 * that happens after `fn` has returned. Awaiting inside the store keeps the
 * execution — and therefore the tenant scope — inside the context. (Passing a
 * synchronous `next` from Express is fine: it simply resolves to undefined.)
 */
export function runWithTenantContext<T>(context: TenantContext, fn: () => T): Promise<any> {
    return storage.run(context, async () => (await fn()) as Awaited<T>);
}

export function getTenantContext(): TenantContext | undefined {
    // An explicit scope always wins. The fallback below applies only when there
    // is no store at all, and only in a test process that asked for it.
    return storage.getStore() ?? (testPlatformFallback ? TEST_PLATFORM_CONTEXT : undefined);
}

/** Run `fn` as platform-level (cross-school) work. Keep the body minimal. */
export function runAsPlatform<T>(fn: () => T): Promise<any> {
    return storage.run({ platform: true }, async () => (await fn()) as Awaited<T>);
}

/** Express middleware form of runAsPlatform for public / cross-school routers. */
export function platformContext(_req: any, _res: any, next: () => void) {
    return storage.run({ platform: true }, next);
}

/**
 * TEST HARNESS ONLY. Marks the current async flow (a vitest worker running a
 * test file) as platform-level so fixture setup / direct assertions can read
 * and write any school. Requests made through the Express app still go
 * through `authenticate`, whose runWithTenantContext() overrides this scope —
 * so the API is exercised with real tenant isolation.
 */
export function enterPlatformScopeForTests() {
    if (process.env.NODE_ENV === 'production') throw new Error('enterPlatformScopeForTests is for tests only');
    // enterWith() alone is not enough: a vitest setup file and the test bodies
    // are not always in the same async context (they are not under Node 24, so
    // CI failed with "new row violates row-level security policy" while the
    // same tests passed on Node 20). The flag makes the test-process default
    // independent of async-context propagation; runWithTenantContext() and
    // runAsPlatform() still override it, so the tests that assert the
    // NO-SCOPE behaviour keep working.
    testPlatformFallback = true;
    storage.enterWith({ ...TEST_PLATFORM_CONTEXT });
}
