import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.student.findMany({
        select: { id: true, full_name: true, school_id: true, branch_id: true }
    });
    console.log('Students distribution:', students);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
