import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import path from 'path';
import fs from 'fs';

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
        console.log('🌱 [Maintenance] Ensuring Global Demo School Baseline...');
        try {
            const demoSchoolId = AuthService.DEMO_SCHOOL_ID;
            const demoBranchId = AuthService.DEMO_BRANCH_ID;
            
            // 0. Dynamic Versioning - Read from package.json
            let currentVersion = '0.5.34'; // Fallback
            try {
                const pkgPath = path.join(process.cwd(), 'package.json');
                if (fs.existsSync(pkgPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    currentVersion = pkg.version;
                    console.log(`📌 [Version] Detected Code Version: v${currentVersion}`);
                }
            } catch (err) {
                console.warn('⚠️ [Version] Could not read package.json version, using fallback.');
            }

            // 1. Seed the main global branch (shared fallback)
            await this.seedBranchData(demoSchoolId, demoBranchId, 'global');
            
            // 2. Ensure App Version records are up to date for the dashboard
            try {
                await prisma.appVersion.upsert({
                    where: { version: currentVersion },
                    update: { is_active: true },
                    create: { 
                        version: currentVersion, 
                        description: `Automatic sync for ${currentVersion}`,
                        is_active: true 
                    }
                });
                console.log(`✅ App Version v${currentVersion} synchronized.`);
            } catch (vError) {
                console.warn('⚠️ [Version] Could not sync app version table.');
            }
            
            console.log('✅ Global Demo Baseline verified.');
        } catch (error) {
            console.error('❌ [Seeder] Fatal error during Global Demo Seeding:', error);
        }
    }

    /**
     * Seeds a specific branch with the standard 4-user demo dataset.
     * This is used for both the global demo and IP-based virtual sandboxes.
     */
    static async seedBranchData(schoolId: string, branchId: string, ipHash: string) {
        console.log(`🏗️ [Seeder] Seeding Sandbox for Branch: ${branchId} (IP Hash: ${ipHash})`);
        
        try {
            const passwordHash = await bcrypt.hash('password123', 10);
            
            // 1. Create unique User IDs for this branch to ensure perfect isolation
            // We use a prefix + ipHash to ensure they don't collide with other IPs
            const getScopedId = (role: string) => `d33-${ipHash.substring(0, 8)}-${role.toLowerCase().substring(0, 4)}`;
            
            const demoUsers = [
                { role: 'ADMIN', name: 'School Admin', email: `admin-${ipHash}@demo.com`, id: getScopedId('ADMIN'), genId: `ADM-${ipHash.toUpperCase()}` },
                { role: 'TEACHER', name: 'John Smith', email: `teacher-${ipHash}@demo.com`, id: getScopedId('TEACHER'), genId: `TCH-${ipHash.toUpperCase()}` },
                { role: 'STUDENT', name: 'Demo Student', email: `student-${ipHash}@demo.com`, id: getScopedId('STUDENT'), genId: `STU-${ipHash.toUpperCase()}` },
                { role: 'PARENT', name: 'Demo Parent', email: `parent-${ipHash}@demo.com`, id: getScopedId('PARENT'), genId: `PAR-${ipHash.toUpperCase()}` }
            ];

            // 2. Ensure Users and Profiles exist
            for (const u of demoUsers) {
                const user = await prisma.user.upsert({
                    where: { email: u.email },
                    update: { full_name: u.name, branch_id: branchId },
                    create: {
                        id: u.id,
                        email: u.email,
                        password_hash: passwordHash,
                        full_name: u.name,
                        role: u.role as any,
                        school_id: schoolId,
                        branch_id: branchId,
                        school_generated_id: u.genId,
                        email_verified: true,
                        is_active: true
                    }
                });

                const profileData = {
                    user_id: user.id,
                    school_id: schoolId,
                    branch_id: branchId,
                    full_name: u.name,
                    email: u.email,
                    school_generated_id: u.genId
                };

                // Create role-specific profiles
                if (u.role === 'TEACHER') await prisma.teacher.upsert({ where: { user_id: user.id }, create: profileData, update: profileData });
                if (u.role === 'STUDENT') await prisma.student.upsert({ where: { user_id: user.id }, create: profileData, update: profileData });
                if (u.role === 'PARENT') await prisma.parent.upsert({ where: { user_id: user.id }, create: profileData, update: profileData });
            }

            // 3. Link Parent to Student
            const parentUser = demoUsers.find(u => u.role === 'PARENT');
            const studentUser = demoUsers.find(u => u.role === 'STUDENT');
            if (parentUser && studentUser) {
                const parentProfile = await prisma.parent.findUnique({ where: { user_id: parentUser.id } });
                const studentProfile = await prisma.student.findUnique({ where: { user_id: studentUser.id } });
                if (parentProfile && studentProfile) {
                    await prisma.parentChild.upsert({
                        where: { parent_id_student_id: { parent_id: parentProfile.id, student_id: studentProfile.id } },
                        update: {},
                        create: { parent_id: parentProfile.id, student_id: studentProfile.id, school_id: schoolId, branch_id: branchId }
                    });
                }
            }

            // 4. Create a Class and Subject
            const classId = `class-${ipHash}-10A`;
            const subjectId = `subj-${ipHash}-MATH`;
            
            await prisma.subject.upsert({
                where: { id: subjectId },
                update: {},
                create: { id: subjectId, name: 'Mathematics', code: 'MATH', school_id: schoolId }
            });

            await prisma.class.upsert({
                where: { id: classId },
                update: {},
                create: { id: classId, name: 'Grade 10A', grade: 10, section: 'A', school_id: schoolId, branch_id: branchId }
            });

            // 5. Enroll Student and Assign Teacher
            const teacherUser = demoUsers.find(u => u.role === 'TEACHER');
            if (teacherUser && studentUser) {
                const teacherProfile = await prisma.teacher.findUnique({ where: { user_id: teacherUser.id } });
                const studentProfile = await prisma.student.findUnique({ where: { user_id: studentUser.id } });
                
                if (teacherProfile && studentProfile) {
                    // Enroll
                    await prisma.studentEnrollment.upsert({
                        where: { student_id_class_id: { student_id: studentProfile.id, class_id: classId } },
                        update: { status: 'Active' },
                        create: { student_id: studentProfile.id, class_id: classId, school_id: schoolId, branch_id: branchId, status: 'Active', is_primary: true }
                    });

                    // Assign Teacher
                    await prisma.classTeacher.upsert({
                        where: { class_id_teacher_id_subject_id: { class_id: classId, teacher_id: teacherProfile.id, subject_id: subjectId } },
                        update: {},
                        create: { id: `ct-${ipHash}`, school_id: schoolId, branch_id: branchId, teacher_id: teacherProfile.id, class_id: classId, subject_id: subjectId, is_primary: true }
                    });
                }
            }

            console.log(`✅ [Seeder] Sandbox for ${branchId} is ready.`);
        } catch (err) {
            console.error(`❌ [Seeder] Failed to seed sandbox for branch ${branchId}:`, err);
        }
    }
}
