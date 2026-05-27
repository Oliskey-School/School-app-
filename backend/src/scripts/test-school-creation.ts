import { PrismaClient } from '@prisma/client';
import { OnboardingService } from '../services/onboarding.service';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting school creation test...');
    
    const uniqueId = Date.now().toString();
    const schoolData = {
        schoolName: `Test School ${uniqueId}`,
        schoolCode: `TS${uniqueId.slice(-6)}`,
        mainBranchCode: 'MAIN',
        mainBranchName: 'Main Campus',
        additionalBranches: [
            { name: 'Science Dept', code: 'SCI' },
            { name: 'Arts Dept', code: 'ART' }
        ],
        adminName: 'Test Admin',
        adminEmail: `admin-${uniqueId}@test.com`,
        adminPassword: 'Password123!',
        address: '123 Test Street',
        state: 'Lagos',
        planType: 'free'
    };

    try {
        const result = await OnboardingService.createSchoolWithSetup(schoolData as any);
        console.log('✅ School creation successful:', JSON.stringify(result, null, 2));
        
        // Verify persistence
        const school = await prisma.school.findFirst({
            where: { name: schoolData.schoolName }
        });
        
        if (school) {
            console.log('✅ School found in database:', school.id);
        } else {
            console.error('❌ School NOT found in database!');
        }
    } catch (error) {
        console.error('❌ School creation failed:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
