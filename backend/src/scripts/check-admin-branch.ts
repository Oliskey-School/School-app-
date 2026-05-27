import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: { email: { contains: 'admin' } },
        select: { id: true, email: true, branch_id: true, school_id: true }
    });
    console.log(admin);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
