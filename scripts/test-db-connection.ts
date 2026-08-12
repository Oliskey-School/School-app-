import { PrismaClient } from '../backend/generated/prisma-client';

const prisma = new PrismaClient();

async function checkSchema() {
    console.log('=== Database Schema and Model Verification ===\n');
    const models = [
        { name: 'School', query: () => prisma.school.findFirst() },
        { name: 'User', query: () => prisma.user.findFirst() },
        { name: 'Student', query: () => prisma.student.findFirst() },
        { name: 'Teacher', query: () => prisma.teacher.findFirst() },
        { name: 'Parent', query: () => prisma.parent.findFirst() },
        { name: 'Class', query: () => prisma.class.findFirst() },
        { name: 'StudentIDCard', query: () => (prisma as any).studentIDCard.findFirst() },
        { name: 'PaymentPlan', query: () => (prisma as any).paymentPlan.findFirst() },
        { name: 'StoreProduct', query: () => (prisma as any).storeProduct.findFirst() },
        { name: 'StoreOrder', query: () => (prisma as any).storeOrder.findFirst() },
        { name: 'CounselingAppointment', query: () => (prisma as any).counselingAppointment.findFirst() },
        { name: 'SafeguardingPolicy', query: () => (prisma as any).safeguardingPolicy.findFirst() }
    ];

    let missingTables = 0;

    for (const model of models) {
        try {
            console.log(`Checking model: ${model.name}...`);
            await model.query();
            console.log(`  ✅ ${model.name}: table exists and queries successfully.`);
        } catch (error: any) {
            console.error(`  ❌ ${model.name}: FAILED to query table.`);
            console.error(`     Error: ${error.message}`);
            missingTables++;
        }
    }

    console.log('\n=========================================');
    if (missingTables === 0) {
        console.log('✅ ALL tables verified! No database schema drift detected.');
    } else {
        console.log(`⚠️  ${missingTables} tables failed verification.`);
        console.log('👉 Please run "npx prisma db push" or "npm run db:migrate" to synchronize the database schema.');
    }
    console.log('=========================================\n');
}

checkSchema()
    .catch(err => {
        console.error('Fatal schema check error:', err);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
