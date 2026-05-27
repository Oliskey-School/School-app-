import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.student.count();
    const teachers = await prisma.teacher.count();
    const parents = await prisma.parent.count();
    const schools = await prisma.school.count();
    const branches = await prisma.branch.count();
    const classes = await prisma.class.count();

    console.log({
        students,
        teachers,
        parents,
        schools,
        branches,
        classes
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
