const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const branch = await prisma.branch.findFirst({ where: { school_id: schoolId } });
    
    if (branch) {
        const res = await prisma.parentChild.updateMany({
            where: { school_id: schoolId, branch_id: null },
            data: { branch_id: branch.id }
        });
        console.log(`Updated ${res.count} ParentChild records to have branch_id: ${branch.id}`);
    } else {
        console.log("No branch found for school");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
