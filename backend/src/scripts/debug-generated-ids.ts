import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    // List users with generated IDs to find the source of the conflict
    const users = await prisma.user.findMany({
        where: { school_generated_id: { not: null } },
        select: { email: true, school_generated_id: true }
    });
    
    console.log('Users with generated IDs:', users);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
