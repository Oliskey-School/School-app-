import prisma from '../backend/src/config/database';
import { AuthService } from '../backend/src/services/auth.service';

async function generateUsageReport() {
    console.log('📊 Generating Active School Usage Report...\n');

    try {
        // 1. School Metrics
        const totalSchools = await prisma.school.count();
        const activeSchools = await prisma.school.count({ where: { is_active: true } });
        const onboardedSchools = await prisma.school.count({ where: { is_onboarded: true } });
        const trialSchools = await prisma.school.count({ where: { subscription_status: 'trial' } });
        const activePaidSchools = await prisma.school.count({ 
            where: { is_active: true, subscription_status: 'active' } 
        });

        // 2. Plan Distribution
        const planDistribution = await prisma.school.groupBy({
            by: ['plan_type'],
            _count: { id: true }
        });

        // 3. User Metrics
        const totalUsers = await prisma.user.count();
        const usersByRole = await prisma.user.groupBy({
            by: ['role'],
            _count: { id: true }
        });

        // 4. Role-Specific Profiles
        const totalStudents = await prisma.student.count();
        const totalTeachers = await prisma.teacher.count();
        const totalParents = await prisma.parent.count();

        // 4b. Engagement Metrics
        const totalSessions = await prisma.userSession.count();
        const activeSessions = await prisma.userSession.count({ where: { is_active: true } });
        const totalMessages = await prisma.message.count();

        // 5. Identify Demo School specifically
        const demoSchool = await prisma.school.findUnique({
            where: { id: AuthService.DEMO_SCHOOL_ID },
            include: {
                _count: {
                    select: {
                        students: true,
                        teachers: true,
                        parents: true,
                        branches: true,
                        messages: true
                    }
                }
            }
        });

        // 6. Output Summary
        console.log('=========================================');
        console.log('🏫 SCHOOL STATISTICS');
        console.log('=========================================');
        console.log(`Total Schools:      ${totalSchools}`);
        console.log(`Active Schools:     ${activeSchools}`);
        console.log(`Onboarded Schools:  ${onboardedSchools}`);
        console.log(`Trial Schools:      ${trialSchools}`);
        console.log(`Active Paid:        ${activePaidSchools}`);
        console.log('\nPlan Distribution:');
        planDistribution.forEach(p => {
            console.log(` - ${p.plan_type || 'unspecified'}: ${p._count.id}`);
        });

        console.log('\n=========================================');
        console.log('👥 USER STATISTICS');
        console.log('=========================================');
        console.log(`Total Users:        ${totalUsers}`);
        console.log(`Total Students:     ${totalStudents}`);
        console.log(`Total Teachers:     ${totalTeachers}`);
        console.log(`Total Parents:      ${totalParents}`);
        console.log('\nUsers by Role:');
        usersByRole.forEach(r => {
            console.log(` - ${r.role}: ${r._count.id}`);
        });

        console.log('\n=========================================');
        console.log('📈 ENGAGEMENT METRICS');
        console.log('=========================================');
        console.log(`Total Sessions:     ${totalSessions}`);
        console.log(`Active Sessions:    ${activeSessions}`);
        console.log(`Total Messages:     ${totalMessages}`);

        console.log('\n=========================================');
        console.log('🧪 DEMO SCHOOL STATUS');
        console.log('=========================================');
        if (demoSchool) {
            console.log(`Name:               ${demoSchool.name}`);
            console.log(`Status:             ${demoSchool.is_active ? 'ACTIVE' : 'INACTIVE'}`);
            console.log(`Branches:           ${demoSchool._count.branches}`);
            console.log(`Students:           ${demoSchool._count.students}`);
            console.log(`Teachers:           ${demoSchool._count.teachers}`);
            console.log(`Parents:            ${demoSchool._count.parents}`);
            console.log(`Messages:           ${demoSchool._count.messages}`);
        } else {
            console.log('❌ Demo School record NOT FOUND in database.');
        }
        console.log('=========================================\n');

    } catch (error) {
        console.error('❌ Error generating report:', error);
    } finally {
        await prisma.$disconnect();
    }
}

generateUsageReport();
