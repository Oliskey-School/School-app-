import { Prisma, PrismaClient } from '../../generated/prisma-client';
import { getTenantContext } from '../lib/tenantContext';

// Recursively deletes credential fields from a Prisma result, mutating in place.
// Handles arrays, nested objects (e.g. an `include`d user relation), and leaves
// everything else untouched. Bounded depth so a pathological result shape can't
// recurse forever.
//
// The plaintext initial_password column no longer exists (migration
// 20260919140000); the names stay in this list so a stray value in a JSON
// column or a stale client can never reach a response.
const SENSITIVE_FIELDS = ['password_hash', 'two_factor_secret', 'initial_password', 'password'];
function stripSensitiveFields(value: any, depth = 0): void {
  if (!value || typeof value !== 'object' || depth > 6) return;
  if (Array.isArray(value)) {
    for (const item of value) stripSensitiveFields(item, depth + 1);
    return;
  }
  for (const field of SENSITIVE_FIELDS) {
    if (field in value) delete value[field];
  }
  for (const key of Object.keys(value)) {
    const child = value[key];
    if (child && typeof child === 'object' && !(child instanceof Date)) {
      stripSensitiveFields(child, depth + 1);
    }
  }
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
  var __rawPrisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️ [Prisma] DATABASE_URL is NOT SET in environment! Using local fallback.');
  } else {
    const obfuscatedUrl = databaseUrl.replace(/\/\/.*:.*@/, '//****:****@');
    console.log('✅ [Prisma] Initializing with DATABASE_URL:', obfuscatedUrl);
  }

  const baseUrl = databaseUrl || 'postgresql://postgres:password123@127.0.0.1:5432/school_app';

  let finalUrl = baseUrl;
  try {
    const u = new URL(baseUrl);
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '30');
    finalUrl = u.toString();
  } catch {
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: finalUrl
      }
    },
    // RLS requires set_config and the query it protects to run on the SAME
    // connection, so the extension below batches them into one transaction —
    // which adds a round-trip to every model query. Multi-step interactive
    // transactions (creating a parent writes user + parent + links) then blew
    // past Prisma's 5s default and failed with "Transaction already closed".
    // The work is legitimate, so give it a realistic ceiling rather than
    // silently losing writes.
    transactionOptions: {
      timeout: 20000,
      maxWait: 10000,
    },
    // Opt-in per-query timing, off by default. Query-level events require
    // { emit: 'event', level: 'query' } rather than the plain 'query' string,
    // which only prints to stdout with no timing captured. Set
    // PROFILE_QUERIES=true locally to see exactly which queries a request
    // issues and how long each took — this is how the N+1 patterns behind
    // the slow-dashboard fixes were found.
    log: process.env.PROFILE_QUERIES === 'true'
      ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
      : (process.env.NODE_ENV === 'production' ? ['error'] : ['info', 'warn', 'error']),
  });

  if (process.env.PROFILE_QUERIES === 'true') {
    (client as any).$on('query', (e: any) => {
      console.log(`[PROFILE] ${e.duration}ms  ${e.query.slice(0, 200)}`);
    });
  }

  globalThis.__rawPrisma = client;

  return withScopedTransactions(client.$extends({
    query: {
      $allOperations({ model, operation, args, query, ...rest }) {
        return runScoped(model, operation, args as any, query as any, true, !!(rest as any).__internalParams?.transaction);
      },
    },
  }));
};

/**
 * The session variables (GUCs) that express the current scope to the RLS
 * policies, as ONE statement (the values are bound as parameters).
 *
 *  - tenant scope   → bypass OFF + school / branch / user / branch list
 *  - platform scope → bypass ON. This is the ONLY path that may bypass RLS,
 *    and only code wrapped in runAsPlatform()/platformContext (sign-in by
 *    email, onboarding, demo seeding, webhooks, jobs, SUPER_ADMIN) gets it.
 *  - no scope at all → bypass OFF with an empty school. This used to bypass
 *    RLS silently, so any request path that reached the database without a
 *    tenant context could read or write EVERY school. Now such a query sees
 *    nothing / writes nothing and the call site is reported once so it can be
 *    given the scope it actually needs.
 *
 * Branch entitlement: an EMPTY list means "no branch restriction" — correct
 * for a school-level admin and for a parent whose children may sit in
 * different branches. Anyone else is limited to the list, so Branch A cannot
 * read or write Branch B's rows even if a query forgets its branch filter.
 * Rows with branch_id IS NULL are school-wide and stay visible to every branch.
 */
function scopeGucs(ctx: ReturnType<typeof getTenantContext>): { fragments: string[]; values: string[]; unscoped: boolean } {
  if (ctx?.schoolId) {
    const fragments = [`set_config('app.bypass_rls', 'off', true)`, `set_config('app.current_school_id', $1, true)`];
    const values: string[] = [ctx.schoolId];
    if (ctx.branchId) { values.push(ctx.branchId); fragments.push(`set_config('app.current_branch_id', $${values.length}, true)`); }
    if (ctx.userId) { values.push(ctx.userId); fragments.push(`set_config('app.current_user_id', $${values.length}, true)`); }
    values.push(ctx.allowedBranchIds?.length ? ctx.allowedBranchIds.join(',') : '');
    fragments.push(`set_config('app.current_branch_ids', $${values.length}, true)`);
    return { fragments, values, unscoped: false };
  }
  if (ctx?.platform) return { fragments: [`set_config('app.bypass_rls', 'on', true)`], values: [], unscoped: false };
  return { fragments: [`set_config('app.bypass_rls', 'off', true)`, `set_config('app.current_school_id', '', true)`, `set_config('app.current_branch_ids', '', true)`], values: [], unscoped: true };
}

const unscopedWarned = new Set<string>();
function warnUnscopedOnce(model: string | undefined, op: string) {
  const key = `${model}:${op}`;
  if (unscopedWarned.has(key)) return;
  unscopedWarned.add(key);
  console.warn(`[RLS] ${model ?? 'raw'}.${op} ran with NO tenant or platform scope (RLS applied, tenant rows invisible). Wrap the caller in runAsPlatform() if it is genuinely platform-level.`);
}

/**
 * Run one Prisma operation with the current scope applied on the SAME
 * connection. Applies to model operations AND raw $queryRaw/$executeRaw calls
 * (raw calls have `model === undefined`; under RLS a raw SELECT with no
 * app.current_school_id matches nothing, so they must be scoped too).
 *
 * The GUC statement and the query are batched into one real DB transaction
 * over one connection — Prisma's documented pattern for exactly this. Shared
 * by the default client and the privileged auth client; only the
 * sensitive-field scrubbing differs.
 */
async function runScoped(model: string | undefined, operation: string, args: any, query: (a: any) => Promise<any>, stripSensitive: boolean, inTransaction: boolean): Promise<any> {
  // Inside an interactive or batch transaction opened through this client the
  // scope GUCs were already set on that transaction's connection by the
  // $transaction override below — run the operation there as-is. Opening a
  // nested batch here (the previous behaviour) ran every statement on a
  // DIFFERENT connection: nothing inside `prisma.$transaction(async tx …)`
  // was atomic, and each outer transaction held a pooled connection idle
  // while its statements queued for more — the P2028 "Unable to start a
  // transaction in the given time" seen under bursts of admin edits.
  if (inTransaction) {
    const result = await query(args);
    if (stripSensitive) stripSensitiveFields(result);
    return result;
  }

  const TIMEOUT_MS = 30000;
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('PrismaQueryTimeout: Operation exceeded 30s limit.')), TIMEOUT_MS);
  });

  const run = async () => {
    const raw = globalThis.__rawPrisma!;
    const { fragments, values, unscoped } = scopeGucs(getTenantContext());
    if (unscoped) warnUnscopedOnce(model, operation);
    const results = await raw.$transaction([
      raw.$executeRawUnsafe(`SELECT ${fragments.join(', ')}`, ...values),
      query(args),
    ] as any);
    return results[results.length - 1];
  };

  try {
    const result = await Promise.race([run(), timeoutPromise]);
    if (stripSensitive) stripSensitiveFields(result);
    return result;
  } finally {
    // Never leave the 30s timer pending after the query settles: it leaked one
    // timer per query and kept every serverless invocation alive.
    if (timer) clearTimeout(timer);
  }
}

/**
 * Wrap a query-extended client so that BOTH forms of `$transaction` run every
 * statement on one connection with the scope GUCs set first:
 *   - interactive: `prisma.$transaction(async (tx) => …)` — GUCs are set on
 *     the transaction connection before the callback runs, so locks, SET LOCAL
 *     and rollback genuinely work;
 *   - batch: `prisma.$transaction([op1, op2])` — a GUC-setting statement is
 *     prepended to the batch.
 * Operations issued through `tx` (or inside the batch) are detected in
 * runScoped via Prisma's transaction marker and executed as-is.
 */
function withScopedTransactions<C extends { $transaction: any; $executeRawUnsafe: any }>(extended: C): C {
  return (extended as any).$extends({
    client: {
      $transaction(arg: any, options?: any) {
        const { fragments, values, unscoped } = scopeGucs(getTenantContext());
        if (unscoped) warnUnscopedOnce(undefined, '$transaction');
        const gucSql = `SELECT ${fragments.join(', ')}`;
        if (typeof arg === 'function') {
          return extended.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe(gucSql, ...values);
            return arg(tx);
          }, options);
        }
        return extended.$transaction([extended.$executeRawUnsafe(gucSql, ...values), ...arg], options)
          .then((results: any[]) => results.slice(1));
      },
    },
  });
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

/**
 * Privileged Prisma client for authentication/2FA operations that need
 * password_hash or two_factor_secret in the result (AuthService.login,
 * verify2FALogin, updatePassword). It applies EXACTLY the same tenant/platform
 * scoping as the default client — sign-in runs under the auth router's
 * platform scope — the only difference is that sensitive fields are not
 * scrubbed from results. It is no longer an unconditional RLS bypass.
 */
let _privilegedPrisma: any = null;
export function getRawPrisma(): PrismaClient {
  if (!globalThis.__rawPrisma) {
    prismaClientSingleton();
  }
  if (!_privilegedPrisma) {
    _privilegedPrisma = withScopedTransactions(globalThis.__rawPrisma!.$extends({
      query: {
        $allOperations({ model, operation, args, query, ...rest }) {
          return runScoped(model, operation, args as any, query as any, false, !!(rest as any).__internalParams?.transaction);
        },
      },
    }));
  }
  return _privilegedPrisma as PrismaClient;
}

const dbUrl = process.env.DATABASE_URL || '';
const finalObfuscatedUrl = dbUrl.replace(/\/\/.*:.*@/, '//****:****@');
console.log('📦 [Prisma] Status:', dbUrl ? 'CONNECTED (CONFIGURED)' : 'DISCONNECTED (FALLBACK)', '-', finalObfuscatedUrl);

/**
 * A REAL database transaction, scoped to one tenant.
 *
 * `prisma.$transaction(async (tx) => ...)` on the extended client above is NOT
 * atomic: the RLS extension dispatches every model call as its own batch on
 * the base client, on whatever pooled connection is free, so nothing inside
 * the callback shares a connection — row locks, SET LOCAL and rollback all
 * silently stop working. This helper runs the callback on the plain client
 * inside one interactive transaction, sets the tenant session variables on
 * that same connection first (so RLS still applies), and hands back a `tx`
 * whose queries genuinely share the transaction. Use it for anything that
 * must be atomic or must lock a row (SELECT ... FOR UPDATE).
 */
export async function withTenantTransaction<T>(
  scope: { schoolId: string; branchId?: string | null; userId?: string | null; branchIds?: string[] },
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options: { maxWait?: number; timeout?: number } = {},
): Promise<T> {
  if (!globalThis.__rawPrisma) prismaClientSingleton();
  const base = globalThis.__rawPrisma!;
  return base.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'off', true)`;
    await tx.$executeRaw`SELECT set_config('app.current_school_id', ${scope.schoolId}, true)`;
    if (scope.branchId) await tx.$executeRaw`SELECT set_config('app.current_branch_id', ${scope.branchId}, true)`;
    if (scope.userId) await tx.$executeRaw`SELECT set_config('app.current_user_id', ${scope.userId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.current_branch_ids', ${(scope.branchIds || []).join(',')}, true)`;
    return fn(tx);
  }, { maxWait: options.maxWait ?? 10000, timeout: options.timeout ?? 20000 });
}

export default prisma;

// Connection test for production debugging
if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
    .then(() => {
      console.log('🚀 [Prisma] Production database connection established successfully.');
    })
    .catch((err) => {
      console.error('❌ [Prisma] Production database connection FAILED:');
      console.error('   Error Trace:', err.message);
      
      const dbUrl = process.env.DATABASE_URL || '';
      if (dbUrl) {
        const hostMatch = dbUrl.match(/@([^:/]+)/);
        console.error('   Host Attempted:', hostMatch ? hostMatch[1] : 'Unknown');
        
        if (dbUrl.includes('pooler')) {
            console.error('   💡 Tip: Check if the connection pooler is active and credentials are correct.');
            console.error('   💡 Current DB Host seems to be a connection pooler.');
        }
      }
    });
}

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
