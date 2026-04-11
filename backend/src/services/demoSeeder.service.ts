import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/**
 * Service responsible for ensuring Demo Accounts exist in the PostgreSQL Database.
 * This binds the frontend's mock demo tokens to actual DB referential integrity,
 * allowing Admin, Teacher, and Parent screens to see these generic Demo users natively.
 */
export class DemoSeederService {
    /**
     * Runs quickly on server startup or when trigged to ensure the Demo subset is seeded.
     */
    static async ensureDemoData() {
        try {
            const demoSchoolId = AuthService.DEMO_SCHOOL_ID;
            const demoBranchId = AuthService.DEMO_BRANCH_ID;

            // 1. Ensure Demo School Exists
            let school = await prisma.school.findUnique({ where: { id: demoSchoolId } });
            if (!school) {
                school = await prisma.school.create({
                    data: {
                        id: demoSchoolId,
                        name: 'Oliskey Demo Academy',
                        code: 'ODA',
                        slug: 'oliskey-demo-academy',
                        is_active: true,
                        subscription_status: 'active',
                        plan_type: 'premium',
                        is_onboarded: true,
                    }
                });
            }

            // 2. Ensure Main Branch Exists
            let branch = await prisma.branch.findMany({ where: { school_id: demoSchoolId, id: demoBranchId } });
            if (branch.length === 0) {
                await prisma.branch.create({
                    data: {
                        id: demoBranchId,
                        school_id: demoSchoolId,
                        name: 'Main Campus',
                        code: 'ODA-MAIN',
                        is_main: true,
                    }
                });
            }

            // 3. Ensure Demo Users Exist
            const passwordHash = await bcrypt.hash('password123', 10);
            const roles = AuthService.getDemoRoles();
            
            for (const r of roles) {
                const innerUser = (AuthService as any).DEMO_USERS[r.role];
                
                // create or update User
                const user = await prisma.user.upsert({
                    where: { email: innerUser.email },
                    update: {},
                    create: {
                        id: innerUser.id,
                        email: innerUser.email,
                        password_hash: passwordHash,
                        full_name: innerUser.full_name,
                        role: innerUser.role as any,
                        school_id: demoSchoolId,
                        branch_id: demoBranchId,
                        school_generated_id: innerUser.school_generated_id,
                        email_verified: true,
                        is_active: true,
                    }
                });

                // create school membership
                await prisma.schoolMembership.upsert({
                    where: { school_id_user_id: { school_id: demoSchoolId, user_id: user.id } },
                    update: {},
                    create: {
                        school_id: demoSchoolId,
                        user_id: user.id,
                        base_role: innerUser.role as any,
                        is_active: true,
                    }
                });

                const profileData = {
                    user_id: user.id,
                    school_id: demoSchoolId,
                    branch_id: demoBranchId,
                    full_name: innerUser.full_name,
                    email: innerUser.email,
                    school_generated_id: innerUser.school_generated_id
                };

                // ensure respective role profiles
                if (innerUser.role === 'TEACHER') {
                    await prisma.teacher.upsert({
                        where: { user_id: user.id },
                        create: profileData,
                        update: {}
                    });
                } else if (innerUser.role === 'STUDENT') {
                    await prisma.student.upsert({
                        where: { user_id: user.id },
                        create: profileData,
                        update: {}
                    });
                } else if (innerUser.role === 'PARENT') {
                    await prisma.parent.upsert({
                        where: { user_id: user.id },
                        create: profileData,
                        update: {}
                    });
                }
            }

            // 4. Ensure Demo Parent is specifically linked to Demo Student
            const parentDbUser = await prisma.user.findUnique({ where: { email: (AuthService as any).DEMO_USERS['parent'].email } });
            const studentDbUser = await prisma.user.findUnique({ where: { email: (AuthService as any).DEMO_USERS['student'].email } });
            
            if (parentDbUser && studentDbUser) {
                const parentProfile = await prisma.parent.findUnique({ where: { user_id: parentDbUser.id } });
                const studentProfile = await prisma.student.findUnique({ where: { user_id: studentDbUser.id } });

                if (parentProfile && studentProfile) {
                    await prisma.parentChild.upsert({
                        where: { 
                            parent_id_student_id: {
                                parent_id: parentProfile.id,
                                student_id: studentProfile.id
                            }
                        },
                        update: {},
                        create: {
                            parent_id: parentProfile.id,
                            student_id: studentProfile.id,
                            school_id: demoSchoolId,
                            branch_id: demoBranchId,
                        }
                    });
                }
            }

            console.log('✅ Demo DB Accounts verified & synchronized.');
        } catch (error) {
            console.error('❌ Failed to verify Demo DB Accounts:', error);
        }
    }
}
