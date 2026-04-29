
import prisma from '../config/database';

async function forceUpdateVersion() {
    const demoSchoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
    const newVersion = '0.5.31';
    
    console.log(`🚀 Force updating school ${demoSchoolId} to version ${newVersion}...`);
    
    try {
        const school = await prisma.school.update({
            where: { id: demoSchoolId },
            data: { platform_version: newVersion }
        });
        
        console.log('✅ Success! School is now at version:', school.platform_version);
        
        // Also ensure the AppVersion record exists
        await prisma.appVersion.upsert({
            where: { version: newVersion },
            update: { is_active: true },
            create: { 
                version: newVersion, 
                description: 'IP-Based Demo Isolation and Session Stability.',
                is_active: true 
            }
        });
        console.log('✅ AppVersion record created/updated.');
        
    } catch (error: any) {
        console.error('❌ Failed to update version:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

forceUpdateVersion();
