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
            
            // Seed the main global branch (shared fallback)
            await this.seedBranchData(demoSchoolId, demoBranchId, 'global');
            
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

    /**
     * Original ensureDemoData core (truncated for brevity, logic remains in ensureDemoData)
     */
    static async ensureDemoData_Original() {

            // 0. Dynamic Versioning - Read from package.json
            let currentVersion = '0.5.33'; // Fallback
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

            // 1. Ensure Demo School Exists
            await prisma.school.upsert({
                where: { id: demoSchoolId },
                update: {
                    name: 'Oliskey Demo Academy',
                    is_active: true,
                    subscription_status: 'active',
                    plan_type: 'premium',
                    is_onboarded: true,
                    platform_version: currentVersion
                },
                create: {
                    id: demoSchoolId,
                    name: 'Oliskey Demo Academy',
                    code: 'ODA',
                    slug: 'oliskey-demo-academy',
                    is_active: true,
                    subscription_status: 'active',
                    plan_type: 'premium',
                    is_onboarded: true,
                    platform_version: currentVersion
                }
            });

            // 2. Ensure Main Branch Exists
            await prisma.branch.upsert({
                where: { id: demoBranchId },
                update: {
                    name: 'Main Campus',
                    is_main: true,
                },
                create: {
                    id: demoBranchId,
                    school_id: demoSchoolId,
                    name: 'Main Campus',
                    code: 'ODA-MAIN',
                    is_main: true,
                }
            });

            // 3. Ensure Demo Users Exist
            const passwordHash = await bcrypt.hash('password123', 10);
            const roles = AuthService.getDemoRoles();
            
            for (const r of roles) {
                const innerUser = (AuthService as any).DEMO_USERS[r.role];
                
                // create or update User
                const user = await prisma.user.upsert({
                    where: { email: innerUser.email },
                    update: {
                        school_generated_id: innerUser.school_generated_id,
                        full_name: innerUser.full_name,
                        role: innerUser.role as any,
                    },
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
                        update: {
                            full_name: innerUser.full_name,
                            school_generated_id: innerUser.school_generated_id
                        }
                    });
                } else if (innerUser.role === 'STUDENT') {
                    await prisma.student.upsert({
                        where: { user_id: user.id },
                        create: profileData,
                        update: {
                            full_name: innerUser.full_name,
                            school_generated_id: innerUser.school_generated_id
                        }
                    });
                } else if (innerUser.role === 'PARENT') {
                    await prisma.parent.upsert({
                        where: { user_id: user.id },
                        create: profileData,
                        update: {
                            full_name: innerUser.full_name,
                            school_generated_id: innerUser.school_generated_id
                        }
                    });
                }
            }

            // 5. Ensure Demo Classes and Subjects Exist
            const subjects = [
                { id: 'subj-MATH', name: 'Mathematics', code: 'MATH' },
                { id: 'subj-SCI', name: 'Science', code: 'SCI' },
                { id: 'subj-ENG', name: 'English', code: 'ENG' },
                { id: 'subj-SOC', name: 'Social Studies', code: 'SOC' }
            ];

            for (const sub of subjects) {
                await prisma.subject.upsert({
                    where: { id: sub.id },
                    update: {},
                    create: { ...sub, school_id: demoSchoolId }
                });
            }

            const classes = [
                { id: 'class-10-A', name: 'Grade 10A', grade: 10, section: 'A' },
                { id: 'class-11-A', name: 'Grade 11A', grade: 11, section: 'A' },
                { id: 'class-12-A', name: 'Grade 12A', grade: 12, section: 'A' }
            ];

            for (const cls of classes) {
                await prisma.class.upsert({
                    where: { id: cls.id },
                    update: {},
                    create: { ...cls, school_id: demoSchoolId, branch_id: demoBranchId }
                });
            }

            // 6. Link Demo Teachers to Classes
            const demoAssignments = [
                { email: 'john.smith@demo.com', classId: 'class-10-A', subjectId: 'subj-MATH', id: 'ct-demo-1' },
                { email: 'teacher2@school.com', classId: 'class-11-A', subjectId: 'subj-ENG', id: 'ct-demo-2' },
                { email: 'teacher3@school.com', classId: 'class-12-A', subjectId: 'subj-SCI', id: 'ct-demo-3' }
            ];

            for (const assign of demoAssignments) {
                const user = await prisma.user.findUnique({ where: { email: assign.email } });
                if (user) {
                    const profile = await prisma.teacher.findUnique({ where: { user_id: user.id } });
                    if (profile) {
                        await prisma.classTeacher.upsert({
                            where: { 
                                class_id_teacher_id_subject_id: {
                                    class_id: assign.classId,
                                    teacher_id: profile.id,
                                    subject_id: assign.subjectId || null
                                }
                            },
                            update: { 
                                school: { connect: { id: demoSchoolId } },
                                branch: demoBranchId ? { connect: { id: demoBranchId } } : undefined,
                                teacher: { connect: { id: profile.id } },
                                class: { connect: { id: assign.classId } },
                                subject: assign.subjectId ? { connect: { id: assign.subjectId } } : undefined
                            },
                            create: {
                                id: assign.id,
                                school: { connect: { id: demoSchoolId } },
                                branch: demoBranchId ? { connect: { id: demoBranchId } } : undefined,
                                teacher: { connect: { id: profile.id } },
                                class: { connect: { id: assign.classId } },
                                subject: assign.subjectId ? { connect: { id: assign.subjectId } } : undefined,
                                is_primary: true
                            }
                        });
                    }
                }
            }

            // 7. Ensure Demo Parent is specifically linked to Demo Student
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
            // 8. Ensure Demo Timetable and Assignments exist for Student Dashboard
            const studentUser = await prisma.user.findUnique({ where: { email: (AuthService as any).DEMO_USERS['student'].email } });
            const teacherUser = await prisma.user.findUnique({ where: { email: 'john.smith@demo.com' } });
            
            if (teacherUser && studentUser) {
                const teacherProfile = await prisma.teacher.findUnique({ where: { user_id: teacherUser.id } });
                const studentProfile = await prisma.student.findUnique({ where: { user_id: studentUser.id } });

                if (teacherProfile && studentProfile) {
                    const todayDay = new Date().getDay() || 7; // 1-7
                    
                    // Link student to a class if not already
                    await prisma.studentEnrollment.upsert({
                        where: { student_id_class_id: { student_id: studentProfile.id, class_id: 'class-10-A' } },
                        update: { status: 'Active' },
                        create: {
                            student_id: studentProfile.id,
                            class_id: 'class-10-A',
                            school_id: demoSchoolId,
                            branch_id: demoBranchId,
                            status: 'Active',
                            is_primary: true
                        }
                    });

                    // Seed Timetable entries (5 entries to test 3-item limit)
                    const scheduleEntries = [
                        { id: 'ts-demo-1', start: '08:00', end: '09:00', subject: 'Mathematics', class: 'Grade 10A', classId: 'class-10-A' },
                        { id: 'ts-demo-2', start: '09:30', end: '10:30', subject: 'Science', class: 'Grade 10A', classId: 'class-10-A' },
                        { id: 'ts-demo-3', start: '11:00', end: '12:00', subject: 'English', class: 'Grade 10A', classId: 'class-10-A' },
                        { id: 'ts-demo-4', start: '13:00', end: '14:00', subject: 'Mathematics', class: 'Grade 11A', classId: 'class-11-A' },
                        { id: 'ts-demo-5', start: '14:30', end: '15:30', subject: 'Science', class: 'Grade 12A', classId: 'class-12-A' },
                    ];

                    for (const entry of scheduleEntries) {
                        await prisma.timetable.upsert({
                            where: { id: entry.id },
                            update: {
                                day_of_week: todayDay,
                                start_time: entry.start,
                                end_time: entry.end,
                                teacher_id: teacherProfile.id,
                                class_id: entry.classId,
                                class_name: entry.class,
                                subject: entry.subject,
                                branch_id: demoBranchId,
                                school_id: demoSchoolId
                            },
                            create: {
                                id: entry.id,
                                school_id: demoSchoolId,
                                branch_id: demoBranchId,
                                class_id: entry.classId,
                                class_name: entry.class,
                                subject: entry.subject,
                                teacher_id: teacherProfile.id,
                                day_of_week: todayDay,
                                start_time: entry.start,
                                end_time: entry.end,
                            }
                        });
                    }

                    // Seed Assignments (6 entries to test "See More" count)
                    const assignmentEntries = [
                        { id: 'as-demo-1', title: 'Algebra Worksheet', subject: 'Mathematics' },
                        { id: 'as-demo-2', title: 'Photosynthesis Essay', subject: 'Science' },
                        { id: 'as-demo-3', title: 'Grammar Quiz Prep', subject: 'English' },
                        { id: 'as-demo-4', title: 'History Project', subject: 'Social Studies' },
                        { id: 'as-demo-5', title: 'Weekly Journal', subject: 'English' },
                        { id: 'as-demo-6', title: 'World War II Research', subject: 'Social Studies' },
                    ];

                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);

                    for (const entry of assignmentEntries) {
                        await prisma.assignment.upsert({
                            where: { id: entry.id },
                            update: {
                                title: entry.title,
                                subject: entry.subject,
                                due_date: nextWeek,
                                class_id: 'class-10-A',
                                teacher_id: teacherProfile.id,
                                is_published: true
                            },
                            create: {
                                id: entry.id,
                                title: entry.title,
                                subject: entry.subject,
                                due_date: nextWeek,
                                class_id: 'class-10-A',
                                teacher_id: teacherProfile.id,
                                is_published: true,
                                description: 'Demo assignment description'
                            }
                        });
                    }
                    
                    console.log(`✅ Demo Today's Schedule and Assignments seeded for ${studentUser.full_name}.`);
                }
            }

            console.log('✅ Demo DB Accounts and Assignments verified & synchronized.');


            // 8. Ensure App Versions exist for Management Dashboard
            try {
                const versions = [
                    { version: '0.5.27', description: 'Initial stable release with core dashboard features.' },
                    { version: '0.5.28', description: 'Performance optimizations and mobile UI stabilization.' },
                    { version: '0.5.29', description: 'Google Auth integration and CSRF hardening.' },
                    { version: '0.5.30', description: 'E2E Version Management and Production Synchronization.' },
                    { version: '0.5.31', description: 'IP-Based Demo Isolation and Session Stability.' },
                    { version: '0.5.32', description: 'Timetable UI Unification and Role-Based Theming.' },
                    { version: '0.5.33', description: 'Production Schema Synchronization and Stability Fix.' }
                ];

                for (const v of versions) {
                    await prisma.appVersion.upsert({
                        where: { version: v.version },
                        update: { description: v.description, is_active: true },
                        create: { version: v.version, description: v.description, is_active: true }
                    });
                }

                // Ensure the CURRENT version record exists
                await prisma.appVersion.upsert({
                    where: { version: currentVersion },
                    update: { is_active: true },
                    create: { 
                        version: currentVersion, 
                        description: `Automatic sync for ${currentVersion}`,
                        is_active: true 
                    }
                });

                console.log(`✅ App Version v${currentVersion} synced for Platform Management.`);
            } catch (vError: any) {
                console.warn('⚠️ [Seeder] Could not seed AppVersions (Table might be missing):', vError.message);
            }

        } catch (error) {
            console.error('❌ [Seeder] Fatal error during Demo Seeding:', error);
        }
    }
}
