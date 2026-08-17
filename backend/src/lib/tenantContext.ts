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
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenantContext<T>(context: TenantContext, fn: () => T): T {
    return storage.run(context, fn);
}

export function getTenantContext(): TenantContext | undefined {
    return storage.getStore();
}
