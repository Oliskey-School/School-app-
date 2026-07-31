import prisma from '../config/database';
import bcrypt from 'bcrypt';
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
        console.log('🌱 [Maintenance] Ensuring Oliskey School App Baseline...');
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

            // 0a. Ensure Global Demo School exists
            await prisma.school.upsert({
                where: { id: demoSchoolId },
                update: {
                    name: 'Oliskey School App',
                    code: 'OLISKEY',
                    slug: 'global-demo-school',
                    is_active: true,
                    is_onboarded: true,
                },
                create: {
                    id: demoSchoolId,
                    name: 'Oliskey School App',
                    code: 'OLISKEY',
                    slug: 'global-demo-school',
                    subscription_status: 'active',
                    is_active: true,
                    is_onboarded: true,
                }
            });

            // 0b. Ensure Global Demo Branch exists
            await prisma.branch.upsert({
                where: { id: demoBranchId },
                update: {
                    name: 'Global Branch',
                    code: 'GLOBAL',
                    is_main: true,
                },
                create: {
                    id: demoBranchId,
                    school_id: demoSchoolId,
                    name: 'Global Branch',
                    code: 'GLOBAL',
                    is_main: true,
                }
            });

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
            throw error;
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
            // Use the branch's real code; the demo "virtual" branch has none, so fall
            // back to a clean MAIN code rather than an opaque IP hash. This keeps the
            // global ID readable: e.g. OLISKEY_MAIN_ADM_0001 (not OLISKEY_EFF8E7CA_...).
            const branchCode = branch?.code?.toUpperCase() || 'MAIN';

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

            // Two more teachers so the demo shows all three role scenarios:
            // the primary teacher (index 1) below is given BOTH roles; these two
            // are Class-Teacher-only and Subject-Teacher-only respectively.
            const extraTeachers = [
                { name: 'Grace Adeyemi', email: `grace-${ipHash}@demo.com`, index: 2 },
                { name: 'Michael Bassey', email: `michael-${ipHash}@demo.com`, index: 3 },
            ];

            await prisma.$transaction(async (tx) => {
                // 2a. Clean up old demo users with mismatched IDs (migration).
                // Covers primary roles AND the extra students, so a branch-code change
                // (e.g. hash → MAIN) doesn't collide on the unique email.
                const seedIdentities = [
                    ...demoUsers.map(u => ({ email: u.email, id: u.id })),
                    ...extraStudents.map(s => ({ email: s.email, id: getPersistenceId('STUDENT', s.index) })),
                    ...extraTeachers.map(t => ({ email: t.email, id: getPersistenceId('TEACHER', t.index) })),
                ];
                for (const u of seedIdentities) {
                    const existing = await tx.user.findFirst({ where: { email: u.email } });
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

                // 2d. Create Extra Teachers (Class-Teacher-only and Subject-Teacher-only
                // personas — see the "Teacher Management" role assignment below).
                const extraTeacherProfiles: Record<string, any> = {};
                for (const t of extraTeachers) {
                    const id = getPersistenceId('TEACHER', t.index);
                    const user = await tx.user.upsert({
                        where: { id },
                        update: { full_name: t.name, branch_id: branchId, email: t.email },
                        create: {
                            id,
                            email: t.email,
                            password_hash: passwordHash,
                            full_name: t.name,
                            role: 'TEACHER',
                            school_id: schoolId,
                            branch_id: branchId,
                            school_generated_id: id,
                            email_verified: true,
                            is_active: true
                        }
                    });
                    const profile = await tx.teacher.upsert({
                        where: { user_id: user.id },
                        create: {
                            user_id: user.id,
                            school_id: schoolId,
                            branch_id: branchId,
                            full_name: t.name,
                            email: t.email,
                            school_generated_id: id,
                        },
                        update: { full_name: t.name, email: t.email }
                    });
                    extraTeacherProfiles[t.index] = profile;
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
                    { id: `subj-${ipHash}-ENG`, name: 'English Language', code: 'ENG' },
                    { id: `subj-${ipHash}-SCI`, name: 'Basic Science', code: 'SCI' },
                    { id: `subj-${ipHash}-SOC`, name: 'Social Studies', code: 'SOC' },
                    { id: `subj-${ipHash}-AGR`, name: 'Agricultural Science', code: 'AGRI' },
                    { id: `subj-${ipHash}-ICT`, name: 'ICT', code: 'ICT' },
                    { id: `subj-${ipHash}-CRS`, name: 'CRS/IRS', code: 'CRS' },
                    { id: `subj-${ipHash}-CCA`, name: 'CCA', code: 'CCA' },
                    { id: `subj-${ipHash}-PHE`, name: 'PHE', code: 'PHE' },
                    { id: `subj-${ipHash}-FRE`, name: 'French', code: 'FRE' }
                ];
                for (const s of subjects) {
                    await tx.subject.upsert({
                        where: { id: s.id },
                        update: { name: s.name },
                        create: { id: s.id, name: s.name, code: s.code, school_id: schoolId }
                    });
                }

                // 5. Create Classes and link Subjects
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
                        update: { 
                            name: level.name,
                            subjects: {
                                connect: subjects.map(s => ({ id: s.id }))
                            }
                        },
                        create: { 
                            id: classId, 
                            name: level.name, 
                            grade: level.grade, 
                            section: 'A', 
                            school_id: schoolId, 
                            branch_id: branchId,
                            subjects: {
                                connect: subjects.map(s => ({ id: s.id }))
                            }
                        }
                    });
                }

                // 5b. Seed Curriculum Topics for subjects
                for (const sub of subjects) {
                    const topics = [
                        { week: 1, title: `Introduction to ${sub.name}`, content: `Basics and overview of ${sub.name} curriculum for this term.` },
                        { week: 2, title: `${sub.name} Fundamentals`, content: `Deep dive into the core principles of ${sub.name}.` },
                        { week: 3, title: 'Applied Concepts', content: 'Practical applications and real-world examples.' },
                        { week: 4, title: 'Monthly Assessment', content: 'Review and testing of concepts covered in weeks 1-3.' }
                    ];

                    for (const t of topics) {
                        const topicId = `topic-${sub.id}-T1-W${t.week}`;
                        await tx.curriculumTopic.upsert({
                            where: { id: topicId },
                            update: { title: t.title, content: t.content },
                            create: {
                                id: topicId,
                                subject_id: sub.id,
                                school_id: schoolId,
                                branch_id: branchId,
                                term: '1', // Matches SubjectsScreen.tsx Term 1
                                week_number: t.week,
                                title: t.title,
                                content: t.content
                            }
                        });
                        
                        // Also seed for Term 2 and 3 for variety
                        await tx.curriculumTopic.upsert({
                            where: { id: `topic-${sub.id}-T2-W${t.week}` },
                            update: {},
                            create: {
                                id: `topic-${sub.id}-T2-W${t.week}`,
                                subject_id: sub.id,
                                school_id: schoolId,
                                branch_id: branchId,
                                term: '2',
                                week_number: t.week,
                                title: `${t.title} (Advanced)`,
                                content: `Term 2 progression of ${sub.name}.`
                            }
                        });
                    }
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

                        // 6b. Seed Academic Performance and Report Card for each student
                        const academicRecords = [];
                        for (const sub of subjects) {
                            const score = 65 + Math.floor(Math.random() * 30); // Random score between 65 and 95
                            const test1 = 15 + Math.floor(Math.random() * 5);
                            const test2 = 15 + Math.floor(Math.random() * 5);
                            const exam = score - test1 - test2;
                            const grade = score >= 80 ? 'A' : score >= 70 ? 'B' : 'C';
                            const remark = score >= 80 ? 'Excellent' : score >= 70 ? 'Very Good' : 'Good';

                            await tx.academicPerformance.upsert({
                                where: { 
                                    school_id_student_id_subject_term_session: {
                                        school_id: schoolId,
                                        student_id: sp.id,
                                        subject: sub.name,
                                        term: 'First Term',
                                        session: '2025/2026'
                                    }
                                },
                                update: { score },
                                create: {
                                    school_id: schoolId,
                                    branch_id: branchId,
                                    student_id: sp.id,
                                    subject: sub.name,
                                    score,
                                    term: 'First Term',
                                    session: '2025/2026'
                                }
                            });

                            academicRecords.push({
                                subject: sub.name,
                                test1,
                                test2,
                                exam,
                                total: score,
                                grade,
                                remark
                            });
                        }

                        // Create Report Card
                        const reportId = `report-${sp.id}-2025-T1`;
                        await tx.reportCard.upsert({
                            where: { id: reportId },
                            update: { 
                                academic_records: { grades: academicRecords } as any,
                                is_published: true,
                                status: 'Published'
                            },
                            create: {
                                id: reportId,
                                school_id: schoolId,
                                branch_id: branchId,
                                student_id: sp.id,
                                class_id: sss1ClassId,
                                session: '2025/2026',
                                term: 'First Term',
                                academic_records: { grades: academicRecords } as any,
                                is_published: true,
                                status: 'Published',
                                principal_remark: 'Outstanding performance, keep it up!',
                                teacher_remark: 'A very dedicated and hardworking student.'
                            }
                        });
                    }

                    // Enroll a few students into JSS 3 too, so Grace's (class-only
                    // teacher, below) roster in "My Class" isn't empty.
                    for (const sp of allStudentProfiles.slice(0, 3)) {
                        await tx.studentEnrollment.upsert({
                            where: { student_id_class_id: { student_id: sp.id, class_id: jss3ClassId } },
                            update: { status: 'Active' },
                            create: { student_id: sp.id, class_id: jss3ClassId, school_id: schoolId, branch_id: branchId, status: 'Active', is_primary: false }
                        });
                    }

                    // Teacher role assignments — demonstrates all three scenarios from
                    // the Teacher Management System: John (both roles), Grace (Class
                    // Teacher only), Michael (Subject Teacher only, across two classes).
                    const demoSession = '2025/2026';
                    const demoTerm = 1;
                    const graceProfile = extraTeacherProfiles[2];
                    const michaelProfile = extraTeacherProfiles[3];

                    const classTeacherAssignments = [
                        // John Smith — Class Teacher of SSS 1 (his "both roles" seat).
                        { id: `ct-${ipHash}-classteacher-john`, teacherId: teacherProfile.id, classId: sss1ClassId, subjectId: null, role: 'class_teacher' },
                        // Grace Adeyemi — Class Teacher of JSS 3 ONLY (no subject assignments).
                        { id: `ct-${ipHash}-classteacher-grace`, teacherId: graceProfile.id, classId: jss3ClassId, subjectId: null, role: 'class_teacher' },
                    ];
                    const subjectTeacherAssignments = [
                        // John Smith — also Mathematics Subject Teacher in both classes.
                        { id: `ct-${ipHash}-0`, teacherId: teacherProfile.id, classId: sss1ClassId, subjectId: subjects[0].id, role: 'subject_teacher' },
                        { id: `ct-${ipHash}-1`, teacherId: teacherProfile.id, classId: jss3ClassId, subjectId: subjects[0].id, role: 'subject_teacher' },
                        // Michael Bassey — English Subject Teacher only, in both classes.
                        { id: `ct-${ipHash}-subjectteacher-michael-sss1`, teacherId: michaelProfile.id, classId: sss1ClassId, subjectId: subjects[1].id, role: 'subject_teacher' },
                        { id: `ct-${ipHash}-subjectteacher-michael-jss3`, teacherId: michaelProfile.id, classId: jss3ClassId, subjectId: subjects[1].id, role: 'subject_teacher' },
                    ];

                    for (const a of [...classTeacherAssignments, ...subjectTeacherAssignments]) {
                        const commonData = {
                            role: a.role,
                            session: demoSession,
                            term: demoTerm,
                            status: 'active',
                            ended_at: null,
                            ended_by: null,
                        };
                        // Prisma's compound-unique `where` (class_id+teacher_id+subject_id)
                        // rejects an explicit null for subject_id, so class-teacher rows
                        // (subject_id: null) can't use upsert's where-by-compound-key —
                        // find-then-create/update instead. Subject-teacher rows (always a
                        // real subject_id) still use the fast compound-key upsert.
                        if (a.subjectId === null) {
                            const existingRow = await tx.classTeacher.findFirst({
                                where: { class_id: a.classId, teacher_id: a.teacherId, subject_id: null },
                            });
                            if (existingRow) {
                                await tx.classTeacher.update({ where: { id: existingRow.id }, data: commonData });
                            } else {
                                await tx.classTeacher.create({
                                    data: {
                                        id: a.id, school_id: schoolId, branch_id: branchId,
                                        teacher_id: a.teacherId, class_id: a.classId, subject_id: null,
                                        effective_date: new Date('2025-09-15T00:00:00Z'),
                                        is_primary: true,
                                        ...commonData,
                                    }
                                });
                            }
                            continue;
                        }
                        await tx.classTeacher.upsert({
                            where: { class_id_teacher_id_subject_id: { class_id: a.classId, teacher_id: a.teacherId, subject_id: a.subjectId } },
                            update: commonData,
                            create: {
                                id: a.id, school_id: schoolId, branch_id: branchId,
                                teacher_id: a.teacherId, class_id: a.classId, subject_id: a.subjectId,
                                effective_date: new Date('2025-09-15T00:00:00Z'),
                                is_primary: false,
                                ...commonData,
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
                                school_id: schoolId,
                                branch_id: branchId,
                                title: a.title,
                                description: a.desc,
                                subject: subjects[0].name,
                                due_date: a.dueDate,
                                class_id: sss1ClassId,
                                teacher_id: teacherProfile.id,
                                is_published: true
                            }
                        });
                    }

                    // 7b. Seed Timetable for SSS 1 (Full week)
                    const timetableEntries = [
                        { day: 1, start: '08:00', end: '09:00', subject: 'Mathematics', room: 'Room 101' },
                        { day: 1, start: '09:00', end: '10:00', subject: 'English Language', room: 'Room 101' },
                        { day: 1, start: '10:30', end: '11:30', subject: 'Basic Science', room: 'Lab A' },
                        { day: 2, start: '08:00', end: '09:00', subject: 'English Language', room: 'Room 101' },
                        { day: 2, start: '09:00', end: '10:00', subject: 'Mathematics', room: 'Room 101' },
                        { day: 2, start: '11:00', end: '12:00', subject: 'ICT', room: 'Computer Lab' },
                        { day: 3, start: '08:00', end: '09:00', subject: 'Mathematics', room: 'Room 101' },
                        { day: 3, start: '09:00', end: '10:00', subject: 'Agricultural Science', room: 'Farm' },
                        { day: 3, start: '11:00', end: '12:00', subject: 'Social Studies', room: 'Room 101' },
                        { day: 4, start: '08:00', end: '09:00', subject: 'Basic Science', room: 'Lab A' },
                        { day: 4, start: '09:00', end: '10:00', subject: 'French', room: 'Language Room' },
                        { day: 5, start: '08:00', end: '09:00', subject: 'Mathematics', room: 'Room 101' },
                        { day: 5, start: '09:00', end: '10:00', subject: 'PHE', room: 'Sports Field' }
                    ];

                    // Classrooms with permanent QR tokens — one per distinct room in the
                    // timetable, so QR lesson verification works out of the box in the demo.
                    const roomNames = [...new Set(timetableEntries.map(e => e.room))];
                    const classroomIdByRoom = new Map<string, string>();
                    for (const roomName of roomNames) {
                        const classroom = await (tx as any).classroom.upsert({
                            where: { branch_id_name: { branch_id: branchId, name: roomName } },
                            update: {},
                            create: {
                                school_id: schoolId,
                                branch_id: branchId,
                                name: roomName,
                                qr_token: `demo-room-${ipHash}-${roomName.replace(/\s+/g, '-')}`,
                            }
                        });
                        classroomIdByRoom.set(roomName, classroom.id);
                    }

                    for (const entry of timetableEntries) {
                        await tx.timetable.create({
                            data: {
                                school_id: schoolId,
                                branch_id: branchId,
                                class_id: sss1ClassId,
                                subject: entry.subject,
                                day_of_week: entry.day,
                                start_time: entry.start,
                                end_time: entry.end,
                                room: entry.room,
                                classroom_id: classroomIdByRoom.get(entry.room) ?? null,
                                // Published so the demo teacher sees the schedule and can scan into it
                                status: 'Published',
                                teacher_id: teacherProfile.id // Simplifying by using the same teacher for all for demo
                            }
                        });
                    }

                    // 7c. Personnel file: a commendation, a promotion, and one fully
                    // resolved query letter so the demo teacher's file tells a story.
                    // Deterministic ids + upsert so re-running the seeder (every server
                    // boot) never duplicates "permanent" records.
                    const personnelSeed = [
                        {
                            id: `pr-${ipHash}-commendation`,
                            type: 'commendation', title: 'Outstanding WAEC results',
                            details: '92% of students passed Mathematics with credit or above.',
                            effective_date: '2026-05-20',
                        },
                        {
                            id: `pr-${ipHash}-promotion`,
                            type: 'promotion', title: 'Promoted to Senior Teacher',
                            details: 'Promoted in recognition of consistent performance.',
                            effective_date: '2026-01-10',
                        },
                    ];
                    for (const pr of personnelSeed) {
                        await (tx as any).teacherRecord.upsert({
                            where: { id: pr.id },
                            update: {},
                            create: {
                                id: pr.id, school_id: schoolId, branch_id: branchId,
                                teacher_id: teacherProfile.id,
                                type: pr.type, title: pr.title, details: pr.details,
                                effective_date: pr.effective_date,
                            }
                        });
                    }
                    await (tx as any).queryLetter.upsert({
                        where: { id: `ql-${ipHash}-resolved` },
                        update: {},
                        create: {
                            id: `ql-${ipHash}-resolved`,
                            school_id: schoolId, branch_id: branchId, teacher_id: teacherProfile.id,
                            subject: 'Late submission of lesson notes',
                            reason: 'Lesson notes for the week of 2 June were submitted three days after the deadline. Please explain in writing.',
                            issue_date: '2026-06-08', response_deadline: '2026-06-12',
                            status: 'resolved', issued_by_name: 'School Admin',
                            response_text: 'I apologise for the delay. I was attending the approved WAEC marking exercise and have since submitted all outstanding notes.',
                            responded_at: new Date('2026-06-10T09:30:00Z'),
                            outcome_note: 'Explanation accepted — absence was pre-approved.',
                            closed_at: new Date('2026-06-11T14:00:00Z'),
                        }
                    });

                    // 7d. Alumni archive: one graduated past student with a returned
                    // suspension on record, so Past Students shows a real history.
                    const alumniId = `alumni-${ipHash}`;
                    const alumniUser = await tx.user.upsert({
                        where: { id: alumniId },
                        update: {},
                        create: {
                            id: alumniId,
                            email: `alumni-${ipHash}@demo.oliskey.app`,
                            password_hash: passwordHash,
                            full_name: 'Amaka Okafor',
                            role: 'STUDENT',
                            school_id: schoolId,
                            branch_id: branchId,
                            is_active: true,
                        }
                    });
                    const alumniStudent = await tx.student.upsert({
                        where: { user_id: alumniUser.id },
                        update: {
                            status: 'Graduated', exit_year: 2025, exit_class: 'SSS 3',
                            exit_date: new Date('2025-07-15T00:00:00Z'),
                        },
                        create: {
                            user_id: alumniUser.id,
                            school_id: schoolId,
                            branch_id: branchId,
                            full_name: 'Amaka Okafor',
                            email: alumniUser.email,
                            admission_number: `ALM-${ipHash}`,
                            grade: 12,
                            section: 'A',
                            status: 'Graduated',
                            exit_year: 2025,
                            exit_class: 'SSS 3',
                            exit_date: new Date('2025-07-15T00:00:00Z'),
                        }
                    });
                    await (tx as any).studentSuspension.upsert({
                        where: { id: `alumni-suspension-${ipHash}` },
                        update: {},
                        create: {
                            id: `alumni-suspension-${ipHash}`,
                            school_id: schoolId, branch_id: branchId, student_id: alumniStudent.id,
                            reason: 'Involved in a physical altercation with a classmate during break time.',
                            start_date: '2025-02-10', return_date: '2025-02-17',
                            return_conditions: 'Meet with the school counselor before resuming classes.',
                            status: 'returned', issued_by_name: 'School Admin',
                            returned_at: new Date('2025-02-17T09:00:00Z'),
                            return_note: 'Counseling session completed. Returned in good standing.',
                        }
                    });

                    // 7e. School SOP: two incident types (one standard multi-stage
                    // workflow, one critical-alert) and a sample case already midway
                    // through its stages, so the demo shows a live workflow in progress.
                    const bullyingTypeId = `sop-type-${ipHash}-bullying`;
                    await (tx as any).sOPIncidentType.upsert({
                        where: { id: bullyingTypeId },
                        update: {},
                        create: {
                            id: bullyingTypeId, school_id: schoolId, branch_id: branchId,
                            name: 'Bullying', description: 'A student reports or is reported to be bullying another student.',
                            severity: 'standard', is_active: true,
                        }
                    });
                    const bullyingStages = [
                        { name: 'Vice Principal Notified', notify_roles: ['ADMIN'] },
                        { name: 'Parent Notified', notify_roles: ['PARENT'] },
                        { name: 'Investigation', notify_roles: ['ADMIN'], requires_evidence: true },
                        { name: 'Decision Recorded', notify_roles: ['ADMIN'], requires_decision: true },
                        { name: 'Letter Generated', notify_roles: [] as string[] },
                        { name: 'Case Archived', notify_roles: [] as string[], is_terminal: true },
                    ];
                    await (tx as any).sOPWorkflowStage.deleteMany({ where: { incident_type_id: bullyingTypeId } });
                    await (tx as any).sOPWorkflowStage.createMany({
                        data: bullyingStages.map((s, i) => ({
                            incident_type_id: bullyingTypeId, order: i + 1, name: s.name,
                            notify_roles: s.notify_roles, requires_evidence: !!(s as any).requires_evidence,
                            requires_decision: !!(s as any).requires_decision, is_terminal: !!(s as any).is_terminal,
                        }))
                    });
                    const bullyingStageRows = await (tx as any).sOPWorkflowStage.findMany({ where: { incident_type_id: bullyingTypeId }, orderBy: { order: 'asc' } });

                    const fireTypeId = `sop-type-${ipHash}-fire`;
                    await (tx as any).sOPIncidentType.upsert({
                        where: { id: fireTypeId },
                        update: {},
                        create: {
                            id: fireTypeId, school_id: schoolId, branch_id: branchId,
                            name: 'Fire Emergency', description: 'Fire or smoke detected on school premises.',
                            severity: 'critical', is_critical_alert: true, alert_audience: 'all', is_active: true,
                        }
                    });
                    await (tx as any).sOPWorkflowStage.deleteMany({ where: { incident_type_id: fireTypeId } });
                    await (tx as any).sOPWorkflowStage.createMany({
                        data: [
                            { incident_type_id: fireTypeId, order: 1, name: 'Emergency Services Notified', notify_roles: ['ADMIN'] },
                            { incident_type_id: fireTypeId, order: 2, name: 'All Clear Confirmed', notify_roles: ['ADMIN'], requires_decision: true },
                            { incident_type_id: fireTypeId, order: 3, name: 'Incident Report Filed', notify_roles: [], is_terminal: true },
                        ]
                    });

                    // Sample case already past its first two (auto-completing, no-requirement)
                    // stages and waiting on "Investigation" — mirrors exactly where a real
                    // report would land after the automatic cascade.
                    const sampleCaseId = `sop-case-${ipHash}-1`;
                    await (tx as any).sOPCase.upsert({
                        where: { id: sampleCaseId },
                        update: {},
                        create: {
                            id: sampleCaseId, school_id: schoolId, branch_id: branchId,
                            incident_type_id: bullyingTypeId,
                            title: 'Repeated teasing reported in SSS 1',
                            description: 'A student reported being repeatedly teased and excluded by classmates during break time over the past week.',
                            involved_student_ids: studentProfile ? [studentProfile.id] : [],
                            reported_by: teacherUser.id, reported_by_role: 'TEACHER',
                            status: 'in_progress', current_stage_order: 3,
                        }
                    });
                    await (tx as any).sOPCaseStageLog.deleteMany({ where: { case_id: sampleCaseId } });
                    await (tx as any).sOPCaseStageLog.createMany({
                        data: bullyingStageRows.map((s: any) => ({
                            case_id: sampleCaseId, stage_order: s.order, stage_name: s.name,
                            status: s.order < 3 ? 'completed' : 'pending',
                            completed_at: s.order < 3 ? new Date() : null,
                            completed_by: s.order < 3 ? 'system' : null,
                        }))
                    });

                    // 7f. Staff Substitute Management: give Michael Bassey a real
                    // period TODAY and mark him absent, so the Substitute Coverage
                    // screen always has a live, working example to demo regardless
                    // of which day the server happens to boot on.
                    const now = new Date();
                    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                    const todayDow = now.getDay() === 0 ? 7 : now.getDay();
                    if (todayDow <= 5) { // Mon–Fri only — no school periods to cover on a weekend
                        const substituteDemoTimetableId = `tt-sub-demo-${ipHash}`;
                        await tx.timetable.upsert({
                            where: { id: substituteDemoTimetableId },
                            update: { day_of_week: todayDow, status: 'Published' },
                            create: {
                                id: substituteDemoTimetableId, school_id: schoolId, branch_id: branchId,
                                class_id: sss1ClassId, subject: 'English Language',
                                teacher_id: michaelProfile.id, day_of_week: todayDow,
                                start_time: '13:00', end_time: '13:45', room: 'Room 101',
                                status: 'Published',
                            }
                        });
                        await (tx as any).teacherAttendance.upsert({
                            where: { teacher_id_date_branch_id: { teacher_id: michaelProfile.id, date: todayIso, branch_id: branchId } },
                            update: { status: 'Absent' },
                            create: {
                                teacher_id: michaelProfile.id, school_id: schoolId, branch_id: branchId,
                                date: todayIso, status: 'Absent', approval_status: 'approved',
                            }
                        });
                    }

                    // 7g. Student Early Warning System: a live example flag for the
                    // main demo student so the At-Risk Students screen isn't empty.
                    if (studentProfile) {
                        await (tx as any).studentRiskFlag.upsert({
                            where: { student_id: studentProfile.id },
                            update: {
                                score: 62, level: 'Medium', status: 'Active', resolved_at: null, resolved_by: null, computed_at: new Date(),
                                reasons: [
                                    { category: 'Attendance', detail: 'Missed 6 classes in the last 30 days', points: 18 },
                                    { category: 'Homework', detail: 'Missed 3 of 8 assignments', points: 12 },
                                    { category: 'Fees', detail: '1 unpaid fee past due', points: 8 },
                                    { category: 'Academic', detail: 'Low scores in Mathematics', points: 15 },
                                ] as any,
                            },
                            create: {
                                school_id: schoolId, branch_id: branchId, student_id: studentProfile.id,
                                score: 62, level: 'Medium', status: 'Active',
                                reasons: [
                                    { category: 'Attendance', detail: 'Missed 6 classes in the last 30 days', points: 18 },
                                    { category: 'Homework', detail: 'Missed 3 of 8 assignments', points: 12 },
                                    { category: 'Fees', detail: '1 unpaid fee past due', points: 8 },
                                    { category: 'Academic', detail: 'Low scores in Mathematics', points: 15 },
                                ] as any,
                            },
                        });

                        // 7h. School Timeline: a custom milestone entry (admission,
                        // suspension, and graduation are already auto-derived from
                        // existing student data, so this demonstrates a manually
                        // added entry alongside them).
                        const timelineEventId = `life-event-${ipHash}-1`;
                        await (tx as any).lifeEvent.upsert({
                            where: { id: timelineEventId },
                            update: {},
                            create: {
                                id: timelineEventId, school_id: schoolId, branch_id: branchId,
                                subject_type: 'student', subject_id: studentProfile.id,
                                event_type: 'Custom', title: 'Won Inter-House Spelling Competition',
                                description: 'Represented the school and placed first in the state-wide spelling competition.',
                                event_date: new Date(now.getFullYear(), 2, 15), source: 'manual', created_by: teacherUser.id,
                            },
                        });
                    }

                    // 7i. Classroom Observation Module: one recorded observation for
                    // Michael Bassey so the admin and teacher screens both show data.
                    {
                        const observationTemplate = await (tx as any).observationTemplate.upsert({
                            where: { id: `obs-template-${ipHash}` },
                            update: {},
                            create: {
                                id: `obs-template-${ipHash}`, school_id: schoolId, name: 'Classroom Observation', version: 1, is_active: true,
                                criteria: [
                                    { key: 'lesson_prep', label: 'Lesson Preparation', max_score: 10 },
                                    { key: 'teaching_method', label: 'Teaching Method', max_score: 10 },
                                    { key: 'student_participation', label: 'Student Participation', max_score: 10 },
                                    { key: 'classroom_management', label: 'Classroom Management', max_score: 10 },
                                    { key: 'time_management', label: 'Time Management', max_score: 10 },
                                ] as any,
                            },
                        });
                        const observationId = `observation-${ipHash}-1`;
                        await (tx as any).classroomObservation.upsert({
                            where: { id: observationId },
                            update: {},
                            create: {
                                id: observationId, school_id: schoolId, branch_id: branchId,
                                template_id: observationTemplate.id, teacher_id: michaelProfile.id, class_id: sss1ClassId,
                                observer_id: teacherUser.id, date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 5)),
                                status: 'Submitted', overall_score: 84, overall_grade: 'B',
                                notes: 'Well-prepared lesson with strong student engagement. Could tighten pacing in the last 10 minutes.',
                            },
                        });
                        await (tx as any).observationResponse.deleteMany({ where: { observation_id: observationId } });
                        await (tx as any).observationResponse.createMany({
                            data: [
                                { observation_id: observationId, criterion_key: 'lesson_prep', score: 9, comment: 'Clear objectives, materials ready.' },
                                { observation_id: observationId, criterion_key: 'teaching_method', score: 8, comment: 'Good use of questioning.' },
                                { observation_id: observationId, criterion_key: 'student_participation', score: 9, comment: 'Most students engaged.' },
                                { observation_id: observationId, criterion_key: 'classroom_management', score: 8, comment: 'Calm, orderly classroom.' },
                                { observation_id: observationId, criterion_key: 'time_management', score: 7, comment: 'Ran a few minutes over.' },
                            ],
                        });
                    }

                    // 7j. School Maintenance System — a couple of live tickets at
                    // different stages of the Pending → In Progress → Completed flow.
                    await (tx as any).maintenanceTicket.upsert({
                        where: { id: `maint-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `maint-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                            location: 'JSS1A', category: 'HVAC/Fan', issue_title: 'Ceiling fan not working',
                            priority: 'Medium', status: 'Pending', reported_by: teacherUser.id,
                            ticket_number: `TKT-DEMO-${ipHash.slice(0, 4)}1`,
                        },
                    });
                    await (tx as any).maintenanceTicket.upsert({
                        where: { id: `maint-${ipHash}-2` },
                        update: {},
                        create: {
                            id: `maint-${ipHash}-2`, school_id: schoolId, branch_id: branchId,
                            location: 'Staff Room', category: 'Plumbing', issue_title: 'Leaking tap',
                            priority: 'Low', status: 'In Progress', reported_by: teacherUser.id,
                            ticket_number: `TKT-DEMO-${ipHash.slice(0, 4)}2`,
                        },
                    });

                    // 7k. Asset Tracking — a couple of tagged assets with QR codes,
                    // warranty, and an assigned user, so scanning/detail views have data.
                    const demoAsset = await (tx as any).asset.upsert({
                        where: { id: `asset-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `asset-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                            name: 'Epson Projector', code: 'PRJ-001', category: 'Electronics', location: 'SSS1',
                            status: 'good', condition: 'Good', current_value: 250000, quantity: 1,
                            purchase_date: new Date(now.getFullYear() - 1, 0, 15),
                            warranty_expiry: new Date(now.getFullYear() + 1, 0, 15),
                            assigned_user_id: teacherUser.id,
                            qr_code: `AST-DEMO-${ipHash.slice(0, 8)}`,
                        },
                    });
                    await (tx as any).maintenanceTicket.upsert({
                        where: { id: `maint-${ipHash}-3` },
                        update: {},
                        create: {
                            id: `maint-${ipHash}-3`, school_id: schoolId, branch_id: branchId,
                            asset_id: demoAsset.id, issue_title: 'Projector bulb dim', category: 'Electrical',
                            priority: 'Low', status: 'Completed', reported_by: teacherUser.id,
                            ticket_number: `TKT-DEMO-${ipHash.slice(0, 4)}3`,
                        },
                    });

                    // 7l. Student Departure — an authorized pickup person for the demo
                    // student, plus a completed routine pickup and a pending gate pass.
                    if (studentProfile) {
                        const pickupPerson = await (tx as any).authorizedPickupPerson.upsert({
                            where: { id: `pickup-${ipHash}-1` },
                            update: {},
                            create: {
                                id: `pickup-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                                student_id: studentProfile.id, name: 'Grace Okafor', relationship: 'Aunt',
                                phone: '0803 000 0000', is_active: true, added_by: teacherUser.id,
                            },
                        });
                        await (tx as any).studentDeparture.upsert({
                            where: { id: `departure-${ipHash}-1` },
                            update: {},
                            create: {
                                id: `departure-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                                student_id: studentProfile.id, type: 'EndOfDay',
                                pickup_person_id: pickupPerson.id, pickup_person_name: pickupPerson.name,
                                is_authorized: true, status: 'Completed',
                                requested_by: teacherUser.id, confirmed_by: teacherUser.id, departure_time: new Date(),
                            },
                        });
                        await (tx as any).studentDeparture.upsert({
                            where: { id: `departure-${ipHash}-2` },
                            update: {},
                            create: {
                                id: `departure-${ipHash}-2`, school_id: schoolId, branch_id: branchId,
                                student_id: studentProfile.id, type: 'EarlyDismissal',
                                pickup_person_name: 'Grace Okafor', is_authorized: false,
                                reason: 'Doctor appointment', status: 'Pending', requested_by: teacherUser.id,
                            },
                        });
                    }

                    // 7m. Teacher Workload — a duty and a club advisor role for Michael
                    // Bassey, so the Workload tab shows more than just teaching periods.
                    await (tx as any).teacherDuty.upsert({
                        where: { id: `duty-${ipHash}-1` },
                        update: {},
                        create: { id: `duty-${ipHash}-1`, school_id: schoolId, branch_id: branchId, teacher_id: michaelProfile.id, name: 'Exam Supervision', weight: 2 },
                    });
                    await (tx as any).extracurricularActivity.upsert({
                        where: { id: `club-${ipHash}-1` },
                        update: { advisor_teacher_id: michaelProfile.id },
                        create: {
                            id: `club-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                            name: 'Debate Club', category: 'Academic', advisor_teacher_id: michaelProfile.id,
                        },
                    });

                    // 7n. Teacher Leave Workflow — a leave type, a balance, and a
                    // pending request so the approval screen isn't empty.
                    const demoLeaveType = await (tx as any).leaveType.upsert({
                        where: { id: `leavetype-${ipHash}-annual` },
                        update: {},
                        create: { id: `leavetype-${ipHash}-annual`, school_id: schoolId, name: 'Annual Leave', days_allowed: 21 },
                    });
                    await (tx as any).leaveBalance.upsert({
                        where: { id: `leavebalance-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `leavebalance-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                            teacher_id: michaelProfile.id, leave_type_id: demoLeaveType.id,
                            total_days: 21, used_days: 0, remaining_days: 21, academic_year: `${now.getFullYear()}/${now.getFullYear() + 1}`,
                        },
                    });
                    await (tx as any).leaveRequest.upsert({
                        where: { id: `leaverequest-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `leaverequest-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                            teacher_id: michaelProfile.id, leave_type_id: demoLeaveType.id,
                            start_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7),
                            end_date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 9),
                            days_requested: 3, reason: 'Family event out of town', status: 'Pending',
                        },
                    });

                    // 7o. Department Management — a Science department with a Head
                    // of Department, a teacher on the roster, a budget line, and a
                    // logged meeting.
                    const demoDepartment = await (tx as any).department.upsert({
                        where: { id: `dept-${ipHash}-science` },
                        update: {},
                        create: { id: `dept-${ipHash}-science`, school_id: schoolId, branch_id: branchId, name: 'Science', head_teacher_id: michaelProfile.id },
                    });
                    await tx.teacher.updateMany({ where: { id: michaelProfile.id }, data: { department_id: demoDepartment.id } });
                    await tx.budget.upsert({
                        where: { id: `dept-budget-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `dept-budget-${ipHash}-1`, school_id: schoolId, branch_id: branchId, department_id: demoDepartment.id,
                            fiscal_year: `${now.getFullYear()}/${now.getFullYear() + 1}`, category: 'Science', allocated_amount: 500000, spent_amount: 120000,
                        },
                    });
                    await (tx as any).departmentMeeting.upsert({
                        where: { id: `dept-meeting-${ipHash}-1` },
                        update: {},
                        create: {
                            id: `dept-meeting-${ipHash}-1`, school_id: schoolId, branch_id: branchId, department_id: demoDepartment.id,
                            title: 'Term Planning Meeting', date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 10)),
                            minutes: 'Reviewed lab equipment needs and agreed on the practical exam schedule.',
                        },
                    });

                    // 7p. School Clubs — a Debate Club with the demo student as a
                    // member, an advisor, an achievement, and today's attendance.
                    const demoClub = await tx.extracurricularActivity.upsert({
                        where: { id: `club-${ipHash}-1` },
                        update: {},
                        create: { id: `club-${ipHash}-1`, school_id: schoolId, branch_id: branchId, name: 'Debate Club', category: 'Academic', advisor_teacher_id: michaelProfile.id },
                    });
                    if (studentProfile) {
                        await tx.studentActivity.upsert({
                            where: { student_id_activity_id: { student_id: studentProfile.id, activity_id: demoClub.id } },
                            update: {},
                            create: { student_id: studentProfile.id, activity_id: demoClub.id, school_id: schoolId, branch_id: branchId },
                        });
                        await (tx as any).clubAttendance.upsert({
                            where: { activity_id_student_id_date: { activity_id: demoClub.id, student_id: studentProfile.id, date: new Date(`${todayIso}T00:00:00Z`) } },
                            update: {},
                            create: { school_id: schoolId, branch_id: branchId, activity_id: demoClub.id, student_id: studentProfile.id, date: new Date(`${todayIso}T00:00:00Z`), status: 'Present', marked_by: teacherUser.id },
                        });
                        await tx.achievement.upsert({
                            where: { id: `club-achievement-${ipHash}-1` },
                            update: {},
                            create: {
                                id: `club-achievement-${ipHash}-1`, school_id: schoolId, branch_id: branchId,
                                student_id: studentProfile.id, activity_id: demoClub.id, title: 'Won Regional Debate Final',
                                description: 'Represented the school and won first place at the regional inter-school debate competition.',
                                type: 'competition', date: new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 3)),
                            },
                        });
                    }

                    // 7q. School Calendar Automation — a Sports Day event so the
                    // audience-notification flow has something real to demo.
                    const sportsDayId = `event-${ipHash}-sportsday`;
                    const existingSportsDay = await tx.event.findUnique({ where: { id: sportsDayId } });
                    if (!existingSportsDay) {
                        await tx.event.create({
                            data: {
                                id: sportsDayId, school_id: schoolId, branch_id: branchId,
                                title: 'Sports Day', type: 'Sports Day', location: 'School Field',
                                date: new Date(now.getFullYear(), now.getMonth(), Math.min(28, now.getDate() + 14)),
                                description: 'Annual inter-house sports competition.',
                            },
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
            }, { timeout: 120000, maxWait: 30000 });

            console.log(`✅ [Seeder] Sandbox for ${branchId} is populated with real-world data.`);
        } catch (err) {
            console.error(`❌ [Seeder] Failed to seed sandbox for branch ${branchId}:`, err);
            throw err;
        }
    }
}
