import { PrismaClient } from '../../generated/prisma-client';
import { getTenantContext } from '../lib/tenantContext';

// Recursively deletes password_hash / two_factor_secret from a Prisma result,
// mutating in place. Handles arrays, nested objects (e.g. an `include`d user
// relation), and leaves everything else untouched. Bounded depth so a
// pathological result shape can't recurse forever.
const SENSITIVE_FIELDS = ['password_hash', 'two_factor_secret'];
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
                // Only model operations (not $queryRaw/$executeRaw calls the app makes
                // directly, e.g. via getRawPrisma()) get tenant-scoped — and only when
                // an authenticated request actually set a context (see auth.middleware.ts).
                if (ctx?.schoolId && model) {
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
                    const results = await raw.$transaction([...setters, query(args)] as any);
                    return results[results.length - 1];
                }
                return query(args);
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
 * Returns the raw (non-extended) Prisma client for operations that need
 * access to sensitive fields like `password_hash` that the default client
 * strips from all query results (e.g. AuthService.login, updatePassword).
 */
export function getRawPrisma(): PrismaClient {
  if (!globalThis.__rawPrisma) {
    prismaClientSingleton();
  }
  return globalThis.__rawPrisma!;
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
