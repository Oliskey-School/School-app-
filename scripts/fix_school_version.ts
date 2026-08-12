
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.school.updateMany({
    data: { platform_version: '0.5.38' } as any
  });
  console.log(`Updated ${result.count} schools to version 0.5.38`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
