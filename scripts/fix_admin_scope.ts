import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Promoting admin@demo.com to Global Admin...');
    await prisma.user.update({
        where: { email: 'admin@demo.com' },
        data: { branch_id: null }
    });
    console.log('✅ admin@demo.com is now a Global Admin.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
