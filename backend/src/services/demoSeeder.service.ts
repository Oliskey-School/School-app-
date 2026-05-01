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
            let currentVersion = '0.5.38'; // Fallback
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

    private static cachedPasswordHash: string | null = null;

    /**
     * Seeds a specific branch with the standard 4-user demo dataset.
     * This is used for both the global demo and IP-based virtual sandboxes.
     */
    static async seedBranchData(schoolId: string, branchId: string, ipHash: string) {
        console.log(`🏗️ [Seeder] Seeding Sandbox for Branch: ${branchId} (IP Hash: ${ipHash})`);
        
        try {
            // 0. Fetch School and Branch Codes dynamically
            const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { code: true } });
            const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } });
            
            const schoolCode = school?.code?.toUpperCase() || 'OLISKEY';
            const branchCode = branch?.code?.toUpperCase() || ipHash.substring(0, 8).toUpperCase();

            if (!this.cachedPasswordHash) {
                this.cachedPasswordHash = await bcrypt.hash('password123', 10);
            }
            const passwordHash = this.cachedPasswordHash;
            
            // 1. Generate Persistence IDs: SCHOOL_BRANCH_ROLE_NUMBER
            const roleCodes: Record<string, string> = { ADMIN: 'ADM', TEACHER: 'TCH', STUDENT: 'STU', PARENT: 'PAR' };
            const getPersistenceId = (role: string, index: number = 1) => {
                const rCode = roleCodes[role.toUpperCase()] || role.toUpperCase().substring(0, 3);
                const suffix = String(index).padStart(4, '0');
                return `${schoolCode}_${branchCode}_${rCode}_${suffix}`;
            };
            
            // Define a core set of 4 primary users
            const demoUsers = [
                { role: 'ADMIN', name: 'School Admin', email: `admin-${ipHash}@demo.com`, id: getPersistenceId('ADMIN'), genId: getPersistenceId('ADMIN') },
                { role: 'TEACHER', name: 'John Smith', email: `teacher-${ipHash}@demo.com`, id: getPersistenceId('TEACHER'), genId: getPersistenceId('TEACHER') },
                { role: 'STUDENT', name: 'Demo Student', email: `student-${ipHash}@demo.com`, id: getPersistenceId('STUDENT'), genId: getPersistenceId('STUDENT') },
                { role: 'PARENT', name: 'Demo Parent', email: `parent-${ipHash}@demo.com`, id: getPersistenceId('PARENT'), genId: getPersistenceId('PARENT') }
            ];

            // Add extra students for a more "populated" feel
            const extraStudents = [
                { name: 'Sarah Connor', email: `sarah-${ipHash}@demo.com`, index: 2 },
                { name: 'James Moriarty', email: `james-${ipHash}@demo.com`, index: 3 },
                { name: 'Ada Lovelace', email: `ada-${ipHash}@demo.com`, index: 4 },
                { name: 'Nikola Tesla', email: `nikola-${ipHash}@demo.com`, index: 5 }
            ];

            await prisma.$transaction(async (tx) => {
                // 2a. Clean up old demo users with mismatched IDs (migration)
                for (const u of demoUsers) {
                    const existing = await tx.user.findUnique({ where: { email: u.email } });
                    if (existing && existing.id !== u.id) {
                        await tx.user.delete({ where: { id: existing.id } });
                    }
                }

                // 2b. Create Primary Users and Profiles
                const createdUsers = [];
                for (const u of demoUsers) {
                    const user = await tx.user.upsert({
                        where: { id: u.id },
                        update: { full_name: u.name, branch_id: branchId, email: u.email },
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

                    if (u.role === 'TEACHER') await tx.teacher.upsert({ where: { user_id: user.id }, create: profileData, update: profileData });
                    if (u.role === 'STUDENT') await tx.student.upsert({ 
                        where: { user_id: user.id }, 
                        create: { ...profileData, status: 'Active', grade: 10, section: 'A' }, 
                        update: { ...profileData, status: 'Active', grade: 10, section: 'A' } 
                    });
                    if (u.role === 'PARENT') await tx.parent.upsert({ where: { user_id: user.id }, create: profileData, update: profileData });
                    
                    createdUsers.push(user);
                }

                // 2c. Create Extra Students
                const extraStudentProfiles = [];
                for (const s of extraStudents) {
                    const id = getPersistenceId('STUDENT', s.index);
                    const user = await tx.user.upsert({
                        where: { id },
                        update: { full_name: s.name, branch_id: branchId, email: s.email },
                        create: {
                            id,
                            email: s.email,
                            password_hash: passwordHash,
                            full_name: s.name,
                            role: 'STUDENT',
                            school_id: schoolId,
                            branch_id: branchId,
                            school_generated_id: id,
                            email_verified: true,
                            is_active: true
                        }
                    });

                    const profile = await tx.student.upsert({
                        where: { user_id: user.id },
                        create: {
                            user_id: user.id,
                            school_id: schoolId,
                            branch_id: branchId,
                            full_name: s.name,
                            email: s.email,
                            school_generated_id: id,
                            status: 'Active',
                            grade: 10,
                            section: 'A'
                        },
                        update: { status: 'Active', grade: 10, section: 'A' }
                    });
                    extraStudentProfiles.push(profile);
                }

                // 3. Link Parent to Student (Primary)
                const parentUser = createdUsers.find(u => u.role === 'PARENT');
                const studentUser = createdUsers.find(u => u.role === 'STUDENT');
                if (parentUser && studentUser) {
                    const parentProfile = await tx.parent.findUnique({ where: { user_id: parentUser.id } });
                    const studentProfile = await tx.student.findUnique({ where: { user_id: studentUser.id } });
                    if (parentProfile && studentProfile) {
                        await tx.parentChild.upsert({
                            where: { parent_id_student_id: { parent_id: parentProfile.id, student_id: studentProfile.id } },
                            update: {},
                            create: { parent_id: parentProfile.id, student_id: studentProfile.id, school_id: schoolId, branch_id: branchId }
                        });
                    }
                }

                // 4. Create Subjects
                const subjects = [
                    { id: `subj-${ipHash}-MATH`, name: 'Mathematics', code: 'MATH' },
                    { id: `subj-${ipHash}-PHYS`, name: 'Physics', code: 'PHYS' },
                    { id: `subj-${ipHash}-ENG`, name: 'English Language', code: 'ENG' }
                ];
                for (const s of subjects) {
                    await tx.subject.upsert({
                        where: { id: s.id },
                        update: { name: s.name },
                        create: { id: s.id, name: s.name, code: s.code, school_id: schoolId }
                    });
                }

                // 5. Create Classes
                const levels = [
                    { name: 'SSS 1', grade: 10 },
                    { name: 'JSS 3', grade: 9 }
                ];

                const sss1ClassId = `class-${ipHash}-SSS1`;
                const jss3ClassId = `class-${ipHash}-JSS3`;

                for (const level of levels) {
                    const classId = `class-${ipHash}-${level.name.replace(/\s+/g, '')}`;
                    await tx.class.upsert({
                        where: { id: classId },
                        update: { name: level.name },
                        create: { id: classId, name: level.name, grade: level.grade, section: 'A', school_id: schoolId, branch_id: branchId }
                    });
                }

                // 6. Enroll ALL students (primary + extra) into SSS 1
                const teacherUser = createdUsers.find(u => u.role === 'TEACHER');
                const studentProfile = await tx.student.findUnique({ where: { user_id: studentUser.id } });
                const teacherProfile = await tx.teacher.findUnique({ where: { user_id: teacherUser.id } });

                if (teacherProfile && studentProfile) {
                    const allStudentProfiles = [studentProfile, ...extraStudentProfiles];
                    for (const sp of allStudentProfiles) {
                        await tx.studentEnrollment.upsert({
                            where: { student_id_class_id: { student_id: sp.id, class_id: sss1ClassId } },
                            update: { status: 'Active' },
                            create: { student_id: sp.id, class_id: sss1ClassId, school_id: schoolId, branch_id: branchId, status: 'Active', is_primary: true }
                        });
                    }

                    // Assign Teacher to SSS 1 (Math) and JSS 3 (Math)
                    const teacherClasses = [
                        { classId: sss1ClassId, subjectId: subjects[0].id, subjectName: subjects[0].name },
                        { classId: jss3ClassId, subjectId: subjects[0].id, subjectName: subjects[0].name }
                    ];

                    for (let i = 0; i < teacherClasses.length; i++) {
                        const tc = teacherClasses[i];
                        await tx.classTeacher.upsert({
                            where: { class_id_teacher_id_subject_id: { class_id: tc.classId, teacher_id: teacherProfile.id, subject_id: tc.subjectId } },
                            update: {},
                            create: { 
                                id: `ct-${ipHash}-${i}`, 
                                school_id: schoolId, 
                                branch_id: branchId, 
                                teacher_id: teacherProfile.id, 
                                class_id: tc.classId, 
                                subject_id: tc.subjectId, 
                                is_primary: i === 0 
                            }
                        });
                    }

                    // 7. Seed REAL Assignments
                    const assignments = [
                        { title: 'Algebraic Expressions Quiz', desc: 'Solve all questions in section A and B.', type: 'Quiz', dueDate: new Date(Date.now() + 86400000 * 2) },
                        { title: 'Calculus Introduction', desc: 'Watch the video and solve the practice problems.', type: 'Homework', dueDate: new Date(Date.now() + 86400000 * 5) },
                        { title: 'Statistics Project', desc: 'Collect data from 10 students about their favorite subject.', type: 'Project', dueDate: new Date(Date.now() + 86400000 * 10) }
                    ];

                    // Prune "E2E Test Assignment" to keep it clean
                    await tx.assignment.deleteMany({
                        where: { 
                            class_id: sss1ClassId,
                            title: { contains: 'E2E Test' }
                        }
                    });

                    for (const a of assignments) {
                        await tx.assignment.create({
                            data: {
                                title: a.title,
                                description: a.desc,
                                subject: teacherClasses[0].subjectName,
                                due_date: a.dueDate,
                                class_id: sss1ClassId,
                                teacher_id: teacherProfile.id,
                                is_published: true
                            }
                        });
                    }

                    // 8. Seed Fees (Financial Persistence)
                    const feeStructures = [
                        { name: 'Tuition Fee - Q1', amount: 45000, type: 'Tuition' },
                        { name: 'Development Levy', amount: 15000, type: 'Other' },
                        { name: 'Library & Tech', amount: 5000, type: 'Other' }
                    ];

                    for (const fs of feeStructures) {
                        const feeId = `fee-${ipHash}-${fs.name.replace(/\s+/g, '')}`;
                        const fee = await tx.studentFee.upsert({
                            where: { id: feeId },
                            update: { amount: fs.amount, status: 'Overdue' },
                            create: {
                                id: feeId,
                                school_id: schoolId,
                                branch_id: branchId,
                                student_id: studentProfile.id,
                                amount: fs.amount,
                                title: fs.name,
                                status: 'Overdue',
                                due_date: new Date(Date.now() - 86400000 * 7)
                            }
                        });
                    }

                    // 9. Seed Exams (Academic Persistence)
                    const exams = [
                        { title: 'Mid-Term Assessment', subject: 'Mathematics' },
                        { title: 'Physics Practical', subject: 'Physics' }
                    ];

                    for (const e of exams) {
                        const examId = `exam-${ipHash}-${e.title.replace(/\s+/g, '')}`;
                        await tx.exam.upsert({
                            where: { id: examId },
                            update: {},
                            create: {
                                id: examId,
                                school_id: schoolId,
                                branch_id: branchId,
                                title: e.title,
                                subject: e.subject,
                                exam_type: 'Assessment',
                                description: `${e.title} for ${e.subject}`,
                                date: new Date(Date.now() + 86400000 * 14),
                                total_marks: 100,
                                passing_marks: 0,
                                is_published: false
                            }
                        });
                    }
                }
            }, { timeout: 30000 });

            console.log(`✅ [Seeder] Sandbox for ${branchId} is populated with real-world data.`);
        } catch (err) {
            console.error(`❌ [Seeder] Failed to seed sandbox for branch ${branchId}:`, err);
        }
    }
}
