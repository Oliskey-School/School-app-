import { PrismaClient } from '@prisma/client';

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
    // Add logging in non-production environments
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'info', 'warn', 'error'],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

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
      if (process.env.DATABASE_URL) {
        const urlMatch = process.env.DATABASE_URL.match(/@(.*)\//);
        console.error('   Host Attempted:', urlMatch ? urlMatch[1] : 'Unknown');
      }
    });
}

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
