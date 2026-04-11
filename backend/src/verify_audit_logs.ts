import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking AuditLogs in database...');
  
  const count = await prisma.auditLog.count();
  console.log(`📊 Total Audit Logs: ${count}`);

  const logs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
    include: {
      user: {
        select: {
          full_name: true,
          email: true,
          role: true
        }
      }
    }
  });

  if (logs.length === 0) {
    console.log('⚠️ No logs found. Attempting to seed a test log...');
    // Find an admin user to associate the log with
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (admin && admin.school_id) {
        const newLog = await prisma.auditLog.create({
            data: {
                school_id: admin.school_id,
                user_id: admin.id,
                action: 'Test Activity Logging',
                entity_type: 'System',
                metadata: { test: true }
            }
        });
        console.log('✅ Test log created:', newLog);
    } else {
        console.log('❌ Could not find an admin user to create a test log.');
    }
  } else {
    console.log('📜 Recent Activity from Database:');
    logs.forEach((log: any, index: number) => {
      console.log(`${index + 1}. [${log.created_at.toISOString()}] ${log.user?.full_name || 'System'}: ${log.action}`);
    });
  }
}

main()
  .catch((e) => {
    console.error('❌ Error during verification:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
