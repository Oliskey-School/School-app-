import { PrismaClient } from '../../generated/prisma-client';

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️ [Prisma] DATABASE_URL is NOT SET in environment! Using local fallback.');
  } else {
    const obfuscatedUrl = databaseUrl.replace(/\/\/.*:.*@/, '//****:****@');
    console.log('✅ [Prisma] Initializing with DATABASE_URL:', obfuscatedUrl);
  }

  const baseUrl = databaseUrl || 'postgresql://postgres:password123@127.0.0.1:5432/school_app';

  // Raise pool limits so concurrent onboarding / tenant queries don't starve each other.
  // Only append if the caller hasn't already set these params (avoids double-setting).
  let finalUrl = baseUrl;
  try {
    const u = new URL(baseUrl);
    if (!u.searchParams.has('connection_limit')) u.searchParams.set('connection_limit', '20');
    if (!u.searchParams.has('pool_timeout')) u.searchParams.set('pool_timeout', '30');
    finalUrl = u.toString();
  } catch {
    // Non-standard URL (e.g. env misconfiguration) — use as-is and let Prisma error clearly
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: finalUrl
      }
    },
    // Lead DevSecOps: Optimized logging - only log significant events
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['info', 'warn', 'error'],
  }).$extends({
    query: {
        async $allOperations({ args, query }) {
            // Lead DevSecOps: Global Query Timeout (30s)
            // Prevents "Denial of Wallet" and Resource Exhaustion
            const TIMEOUT_MS = 30000;
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('PrismaQueryTimeout: Operation exceeded 30s limit.')), TIMEOUT_MS)
            );

            return Promise.race([query(args), timeoutPromise]);
        },
    }
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

/**
 * Returns a Prisma client scoped to a specific school (and optionally a branch).
 * Every query is wrapped in a transaction that first sets the Postgres session
 * variables consumed by the RLS helper functions:
 *   app.current_school_id  → enforced by all school-scoped RLS policies
 *   app.current_branch_id  → enforced by branch-scoped RLS policies
 * set_config is_local=true scopes the variable to the transaction only,
 * preventing it from leaking to the next caller on a pooled connection.
 */
export const getTenantPrisma = (schoolId: string, branchId?: string | null) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const TIMEOUT_MS = 30000;
          const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('PrismaQueryTimeout: Tenant operation exceeded 30s limit.')), TIMEOUT_MS)
          );

          const operationPromise = prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT set_config('app.current_school_id', ${schoolId}, true)`;
            if (branchId) {
              await tx.$executeRaw`SELECT set_config('app.current_branch_id', ${branchId}, true)`;
            }
            return query(args);
          });

          return Promise.race([operationPromise, timeoutPromise]);
        },
      },
    },
  });
};

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
