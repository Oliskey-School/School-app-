import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    console.log('Promoting admin@demo.com to Global Admin...');
    // Email is unique per school+branch, not globally, so this is not a
    // findUnique target — updateMany matches every admin@demo.com row.
    await prisma.user.updateMany({
        where: { email: 'admin@demo.com' },
        data: { branch_id: null }
    });
    console.log('✅ admin@demo.com is now a Global Admin.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
