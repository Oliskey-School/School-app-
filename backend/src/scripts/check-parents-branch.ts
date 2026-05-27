import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const parents = await prisma.parent.findMany({
        select: { id: true, branch_id: true, school_id: true, full_name: true }
    });
    console.log(parents);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
