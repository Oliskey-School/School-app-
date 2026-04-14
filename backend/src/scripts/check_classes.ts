
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- DATABASE CLASS AUDIT ---");
    const classes = await prisma.class.findMany({
        orderBy: [
            { school_id: 'asc' },
            { branch_id: 'asc' },
            { grade: 'asc' }
        ]
    });

    console.log(`Found ${classes.length} total classes.\n`);
    
    classes.forEach(cls => {
        console.log(`ID: ${cls.id} | Name: ${cls.name} | School: ${cls.school_id} | Branch: ${cls.branch_id || 'NULL'}`);
    });

    const schools = await prisma.school.findMany();
    console.log("\n--- SCHOOLS ---");
    schools.forEach(s => console.log(`ID: ${s.id} | Name: ${s.name}`));

    const branches = await prisma.branch.findMany();
    console.log("\n--- BRANCHES ---");
    branches.forEach(b => console.log(`ID: ${b.id} | Name: ${b.name} | School: ${b.school_id}`));

    await prisma.$disconnect();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
