import { PrismaClient } from '../../generated/prisma-client';

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('⚠️ [Prisma] DATABASE_URL is NOT SET in environment! Using local fallback.');
  } else {
    const obfuscatedUrl = databaseUrl.replace(/\/\/.*:.*@/, '//****:****@');
    console.log('✅ [Prisma] Initializing with DATABASE_URL:', obfuscatedUrl);
  }

  const finalUrl = databaseUrl || 'postgresql://postgres:password123@127.0.0.1:5432/school_app';
  
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
 * Lead DevSecOps Extension: 
 * Returns a Prisma client instance scoped to a specific school (tenant).
 * It automatically sets the PostgreSQL session variable 'app.current_school_id' 
 * within a transaction for every query, ensuring RLS enforcement.
 */
export const getTenantPrisma = (schoolId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Lead DevSecOps: Apply Global Timeout (30s)
          const TIMEOUT_MS = 30000;
          const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('PrismaQueryTimeout: Tenant operation exceeded 30s limit.')), TIMEOUT_MS)
          );

          // Bind to a transaction to ensure 'SET LOCAL' stays within the same connection/session
          const operationPromise = prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`SET LOCAL app.current_school_id = '${schoolId}';`);
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
        
        if (dbUrl.includes('supabase') || dbUrl.includes('pooler')) {
            console.error('   💡 Tip: Check if the Supabase pooler is active and credentials are correct.');
            console.error('   💡 Current DB Host seems to be a Supabase pooler.');
        }
      }
    });
}

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
