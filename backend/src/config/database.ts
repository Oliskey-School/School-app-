import { PrismaClient } from '../../generated/prisma-client';
import { getTenantContext } from '../lib/tenantContext';

// Recursively deletes credential fields from a Prisma result, mutating in place.
// Handles arrays, nested objects (e.g. an `include`d user relation), and leaves
// everything else untouched. Bounded depth so a pathological result shape can't
// recurse forever.
//
// initial_password is NOT a one-time onboarding artifact: auth.service rewrites
// it with the new plaintext on EVERY password change/reset, so it mirrors the
// user's CURRENT live password indefinitely. It was being returned in cleartext
// by the /students, /teachers and /users LIST endpoints — a value read straight
// off the API was used to log in successfully as that teacher, i.e. full account
// takeover from a directory read. The detail route already stripped it; the list
// routes did not.
//
// Credential hand-out is unaffected: the create/reset services return the freshly
// generated password to the caller at the moment they issue it. What is removed
// is the ability to read an existing user's live password back later — for that,
// reset it.
const SENSITIVE_FIELDS = ['password_hash', 'two_factor_secret', 'initial_password'];
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
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['info', 'warn', 'error'],
  });

  globalThis.__rawPrisma = client;

  return client.$extends({
    query: {
        async $allOperations({ model, args, query }) {
            const TIMEOUT_MS = 30000;
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('PrismaQueryTimeout: Operation exceeded 30s limit.')), TIMEOUT_MS)
            );

            const ctx = getTenantContext();

            const run = async () => {
                // Applies to model operations AND raw $queryRaw/$executeRaw calls.
                //
                // Raw calls have `model === undefined`. They used to fall straight
                // through with no GUCs set at all, which was harmless before RLS but
                // became a silent breakage after it: under RLS a raw SELECT with no
                // app.current_school_id matches NOTHING, so ~37 raw call sites began
                // returning 0 rows. BranchIdentityService is the visible symptom —
                // its `SELECT code FROM "Branch"` came back empty, so a teacher lent
                // to another branch silently kept their home ID instead of that
                // branch's (the failure is swallowed by a catch in teacher.service).
                if (ctx?.schoolId) {
                    // set_config and the real query MUST run on the exact same
                    // connection, or the session var never reaches the query that
                    // needs it. prisma.$transaction(async (tx) => ...) does NOT
                    // guarantee that — query(args) here is bound to this client, not
                    // to `tx`, and gets dispatched on a separate pooled connection.
                    // The array/batch form below is Prisma's documented pattern for
                    // this exact case: it runs every element as one real DB
                    // transaction over one connection.
                    const raw = globalThis.__rawPrisma!;
                    const setters = [
                        raw.$executeRaw`SELECT set_config('app.current_school_id', ${ctx.schoolId}, true)`,
                    ];
                    if (ctx.branchId) {
                        setters.push(raw.$executeRaw`SELECT set_config('app.current_branch_id', ${ctx.branchId}, true)`);
                    }
                    if (ctx.userId) {
                        setters.push(raw.$executeRaw`SELECT set_config('app.current_user_id', ${ctx.userId}, true)`);
                    }
                    // Branch entitlement for RLS. An EMPTY string means "no branch
                    // restriction" — correct for a school-level admin (manages every
                    // branch) and for a parent (children may sit in different
                    // branches). Anyone else is limited to this list, so Branch A
                    // cannot read or write Branch B's rows even if a query forgets
                    // its branch filter. Rows with branch_id IS NULL are school-wide
                    // and remain visible to every branch.
                    const branchList = (ctx.allowedBranchIds && ctx.allowedBranchIds.length)
                        ? ctx.allowedBranchIds.join(',')
                        : '';
                    setters.push(raw.$executeRaw`SELECT set_config('app.current_branch_ids', ${branchList}, true)`);
                    const results = await raw.$transaction([...setters, query(args)] as any);
                    return results[results.length - 1];
                }

                // No tenant context. Under RLS every tenant table denies rows unless
                // app.current_school_id matches, so these operations — login (which
                // looks a user up by email before any school is known), school
                // onboarding (which creates the tenant), platform/SUPER_ADMIN reads
                // and the seed scripts — would silently return nothing.
                //
                // They run with an explicit, transaction-local bypass flag instead of
                // being implicitly trusted. This is the SAME reach these operations
                // already have today (they were never scoped), so it grants nothing
                // new — but it makes the exemption explicit and greppable, and it
                // means every *authenticated* query is now DB-enforced rather than
                // relying on ~1,900 call sites each remembering a school_id filter.
                // Same reasoning for raw calls made outside a request (seeds, scripts,
                // login lookups): without the flag they match nothing under RLS.
                const raw = globalThis.__rawPrisma!;
                const results = await raw.$transaction([
                    raw.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
                    query(args),
                ] as any);
                return results[results.length - 1];
            };

            const result = await Promise.race([run(), timeoutPromise]);
            stripSensitiveFields(result);
            return result;
        },
    }
  });
};

const prisma = globalThis.prisma ?? prismaClientSingleton();

/**
 * Returns a Prisma client for operations that need access to sensitive fields
 * like `password_hash` / `two_factor_secret`, which the default client strips
 * from every result (e.g. AuthService.login, verify2FALogin, updatePassword).
 *
 * These run BEFORE any tenant is known — login looks a user up by email — so
 * under RLS they must carry the explicit bypass flag, exactly like the unscoped
 * branch of the main extension. Without it every real login failed with
 * "Invalid credentials": the row existed but the policy hid it.
 *
 * NOTE: this deliberately returns a SEPARATE extended client, leaving
 * `globalThis.__rawPrisma` as the plain base client. The main extension batches
 * `__rawPrisma.$transaction([...setters, query(args)])`, and pointing that at an
 * extended client would recurse.
 */
let _privilegedPrisma: any = null;
export function getRawPrisma(): PrismaClient {
  if (!globalThis.__rawPrisma) {
    prismaClientSingleton();
  }
  if (!_privilegedPrisma) {
    const base = globalThis.__rawPrisma!;
    _privilegedPrisma = base.$extends({
      query: {
        async $allOperations({ model, args, query }) {
          if (!model) return query(args);
          const results = await base.$transaction([
            base.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
            query(args),
          ] as any);
          return results[results.length - 1];
        },
      },
    });
  }
  return _privilegedPrisma as PrismaClient;
}

const dbUrl = process.env.DATABASE_URL || '';
const finalObfuscatedUrl = dbUrl.replace(/\/\/.*:.*@/, '//****:****@');
console.log('📦 [Prisma] Status:', dbUrl ? 'CONNECTED (CONFIGURED)' : 'DISCONNECTED (FALLBACK)', '-', finalObfuscatedUrl);

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
