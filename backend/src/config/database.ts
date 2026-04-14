import { PrismaClient } from '../../generated/prisma-client';

const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:password123@127.0.0.1:5432/school_app';
  console.log('[Prisma] Connecting to:', databaseUrl.replace(/\/\/.*:.*@/, '//****:****@'));
  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

const dbUrl = process.env.DATABASE_URL || '';
const obfuscatedUrl = dbUrl.replace(/\/\/.*:.*@/, '//****:****@');
console.log('ðŸ“¦ [Prisma] DATABASE_URL is', dbUrl ? 'SET' : 'NOT SET', '-', obfuscatedUrl);

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
