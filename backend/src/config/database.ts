import { PrismaClient } from '../../generated/prisma-client';
import { getTenantContext, runAsPlatform } from '../lib/tenantContext';

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

/**
 * Run one Prisma operation with the current tenant scope applied on the SAME
 * connection (see the ROOT CAUSE note inside). Shared by the default client
 * and the privileged auth client; only the sensitive-field scrubbing differs.
 */
async function runScoped(model: string | undefined, operation: string, args: any, query: (a: any) => Promise<any>, stripSensitive: boolean, inTransaction: boolean): Promise<any> {
    // Inside an interactive or batch transaction opened through this client
    // the scope GUCs were already set on that transaction's connection by the
    // $transaction override below — run the operation there as-is. Opening a
    // nested transaction here (the previous behaviour) ran every statement on
    // a DIFFERENT connection: no atomicity, and one extra pooled connection
    // held per statement while the outer transaction sat idle (the source of
    // P2028 "Unable to start a transaction in the given time" under load).
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
    const ctx = getTenantContext();

    // Execute the operation INSIDE one interactive transaction, after setting
    // the tenant session variables on that same connection.
    //
    // ROOT CAUSE this replaces: the previous code batched
    // `raw.$transaction([set_config…, query(args)])`. `query(args)` from a
    // query extension is a plain Promise, not a PrismaPromise, so Prisma ran
    // it OUTSIDE the batch transaction — the set_config never applied to the
    // query. With a superuser connection (dev/CI) nothing noticed; with a
    // NOBYPASSRLS role every tenant query returned nothing. Verified with
    // tests/integration/demo-seed-idempotent.test.ts.
    const run = async () => {
      const raw = globalThis.__rawPrisma!;
      const modelKey = model ? model.charAt(0).toLowerCase() + model.slice(1) : null;
      // Every operation — model queries AND raw SQL — must be re-issued on the
      // transaction client `tx`: calling `query(args)` would run it on the base
      // client, i.e. on a different connection where the GUCs are not set.
      const dispatch = (tx: any) => {
        if (modelKey) return tx[modelKey][operation](args);
        if (operation === '$queryRawUnsafe' || operation === '$executeRawUnsafe') return tx[operation](...(args as any[]));
        if (operation === '$queryRaw' || operation === '$executeRaw') return tx[operation](args);
        return query(args);
      };
      const setGucs = (fragments: string[], values: string[]) =>
        raw.$transaction(async (tx: any) => {
          await tx.$executeRawUnsafe(`SELECT ${fragments.join(', ')}`, ...values);
          return dispatch(tx);
        }, { maxWait: 10000, timeout: TIMEOUT_MS });

      const { fragments, values, unscoped } = scopeGucs(ctx);
      if (unscoped) warnUnscopedOnce(model, operation);
      return setGucs(fragments, values);
    };

    try {
      const result = await Promise.race([run(), timeoutPromise]);
      if (stripSensitive) stripSensitiveFields(result);
      return result;
    } finally {
      // Never leave the 30s timer pending after the query settles (it kept
      // every serverless invocation alive and leaked one timer per query).
      if (timer) clearTimeout(timer);
    }
}

/**
 * The session variables (GUCs) that express the current scope to the RLS
 * policies. Tenant scope → school/branch/user set and bypass OFF; explicit
 * platform scope (see lib/tenantContext.ts) → bypass ON, the only path that
 * may bypass RLS; no scope at all → bypass OFF with an empty school, so
 * tenant tables return nothing / refuse writes instead of silently
 * bypassing, and the call site is reported so it can be given the scope it
 * actually needs.
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

/**
 * Wrap a query-extended client so that BOTH forms of `$transaction` run every
 * statement on one connection with the scope GUCs set first:
 *   - interactive: `prisma.$transaction(async (tx) => …)` — GUCs are set on
 *     the transaction connection before the callback runs;
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

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required. Refusing to start with a fallback database credential.');
  }

  const obfuscatedUrl = databaseUrl.replace(/\/\/.*:.*@/, '//****:****@');
  console.log('✅ [Prisma] Initializing with DATABASE_URL:', obfuscatedUrl);

  let finalUrl = databaseUrl;
  try {
    const u = new URL(databaseUrl);
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '30');
    finalUrl = u.toString();
  } catch {
    throw new Error('DATABASE_URL is invalid.');
  }

  const client = new PrismaClient({
    datasources: { db: { url: finalUrl } },
    transactionOptions: { timeout: 20000, maxWait: 10000 },
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['info', 'warn', 'error'],
  });

  // (The plaintext initial_password column no longer exists — see migration
  // 20260919140000 — so no write-guard middleware is needed. NOTE: a $use
  // middleware on this client breaks the set_config+query batching below.)

  globalThis.__rawPrisma = client;

  return withScopedTransactions(client.$extends({
    query: {
      $allOperations({ model, operation, args, query, ...rest }) {
        return runScoped(model, operation, args as any, query as any, true, !!(rest as any).__internalParams?.transaction);
      },
    },
  }));
};

const unscopedWarned = new Set<string>();
function warnUnscopedOnce(model: string | undefined, op: string) {
  const site = (new Error().stack || '').split('\n').slice(3, 6).join(' | ');
  const key = `${model}:${site}`;
  if (unscopedWarned.has(key)) return;
  unscopedWarned.add(key);
  console.warn(`[RLS] ${model}.${op} ran with NO tenant or platform scope (RLS applied, tenant rows invisible). Wrap the caller in runAsPlatform() if it is genuinely platform-level. ${site}`);
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

/**
 * Privileged Prisma client for authentication/2FA operations that need
 * password_hash or two_factor_secret in the result. It applies EXACTLY the
 * same tenant/platform scoping as the default client — the only difference
 * is that sensitive fields are not scrubbed from results.
 *
 * ROOT CAUSE this replaces: it used to batch `set_config(bypass on)` with
 * `query(args)`, which Prisma ran outside the batch (see runScoped), so under
 * a NOBYPASSRLS role email/password sign-in found no user at all; and it was
 * an unconditional RLS bypass rather than following the caller's scope.
 */
let _privilegedPrisma: any = null;
export function getRawPrisma(): PrismaClient {
  if (!globalThis.__rawPrisma) prismaClientSingleton();
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
console.log('📦 [Prisma] Status:', dbUrl ? 'CONNECTED (CONFIGURED)' : 'DISCONNECTED');
if (dbUrl) console.log('📦 [Prisma] Database:', finalObfuscatedUrl);

export default prisma;

/**
 * Every tenant-isolation policy in this database is inert if the application
 * connects as a role that can bypass row level security — which is exactly what
 * Supabase's default `postgres` role does (rolbypassrls = true). That made the
 * single most important security property of this system depend on an
 * environment variable nobody could verify from the code.
 *
 * So the app now checks its OWN role at boot and refuses to serve production
 * traffic on a bypassing or superuser role. Failing to start is the correct
 * outcome: serving with RLS silently disabled is worse than being down.
 */
export async function assertDatabaseRoleCannotBypassRls(): Promise<void> {
  const rows = await runAsPlatform(() => prisma.$queryRawUnsafe<Array<{ rolname: string; rolbypassrls: boolean; rolsuper: boolean }>>(
    `SELECT rolname, rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`
  ));
  const role = rows[0];
  if (!role) throw new Error('Could not determine the current database role');
  if (role.rolbypassrls || role.rolsuper) {
    throw new Error(
      `The application is connected as "${role.rolname}", which bypasses row level security ` +
      `(rolbypassrls=${role.rolbypassrls}, rolsuper=${role.rolsuper}). Every tenant_isolation policy is inert. ` +
      `Point DATABASE_URL at the non-superuser, NOBYPASSRLS application role (see migration 20260919150000).`
    );
  }
  console.log(`🔒 [Prisma] Database role "${role.rolname}" cannot bypass RLS — tenant policies are enforced.`);
}

if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
    .then(() => console.log('🚀 [Prisma] Production database connection established successfully.'))
    .then(() => assertDatabaseRoleCannotBypassRls())
    .catch((err) => {
      console.error('❌ [Prisma] FATAL:', err instanceof Error ? err.message : 'unknown error');
      process.exit(1);
    });
}

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
