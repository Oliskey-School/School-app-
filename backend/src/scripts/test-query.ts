import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const branchId = '7601cbea-e1ba-49d6-b59b-412a584cb94f';
    
    const count = await prisma.parent.count({
        where: {
            school_id: schoolId,
            branch_id: branchId
        }
    });
    console.log('Count for specific branch:', count);

    const countAll = await prisma.parent.count({
        where: {
            school_id: schoolId
        }
    });
    console.log('Count for all branches:', countAll);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
