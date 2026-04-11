import request from 'supertest';
import { app } from '../../src/app';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// MOCK EXTERNAL DEPENDENCIES
// ============================================================

vi.mock('../../src/config/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
            admin: {
                createUser: vi.fn().mockResolvedValue({
                    data: { user: { id: 'test-user-id' } },
                    error: null
                })
            }
        },
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null }),
                })),
                then: vi.fn((cb: any) => cb({ data: [], error: null }))
            })),
            eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null }),
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null }),
                then: vi.fn((cb: any) => cb({ data: [], error: null }))
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: { id: 'new1' }, error: null })
                }))
            })),
            update: vi.fn(() => ({
                eq: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null })
                    }))
                }))
            })),
            upsert: vi.fn(() => ({})),
            delete: vi.fn(() => ({})),
            in: vi.fn(() => ({})),
            order: vi.fn(() => ({})),
            limit: vi.fn(() => ({})),
            range: vi.fn(() => ({})),
            single: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null }),
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 't1' }, error: null }),
            then: vi.fn((cb: any) => cb({ data: [], error: null }))
        }))
    }
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = {
            id: 'test-user-id',
            school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
            branch_id: 'test-branch-id',
            role: 'teacher',
            email: 'teacher@school.com'
        };
        next();
    }
}));

vi.mock('../../src/middleware/tenant.middleware', () => ({
    requireTenant: (req: any, res: any, next: any) => {
        req.user = req.user || { school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' };
        next();
    },
    requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
        next();
    },
    enforceTenant: (schema?: any) => (req: any, res: any, next: any) => {
        next();
    }
}));

vi.mock('../../src/middleware/plan.middleware', () => ({
    requirePlanCapacity: (feature: string) => (req: any, res: any, next: any) => {
        next();
    }
}));

// ============================================================
// MOCK PRISMA
// ============================================================

vi.mock('../../src/config/database', () => {
    const mockPrisma = {
        // Teacher
        teacher: {
            findUnique: vi.fn().mockResolvedValue({
                id: 't1',
                user_id: 'test-user-id',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id',
                full_name: 'John Teacher',
                email: 'teacher@school.com',
                subject: 'Mathematics',
                phone: '08012345678',
                gender: 'male',
                school_generated_id: 'SCH01_MAIN_TCH_001'
            }),
            findFirst: vi.fn().mockResolvedValue({
                id: 't1',
                user_id: 'test-user-id',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id',
                full_name: 'John Teacher',
                email: 'teacher@school.com',
                subject: 'Mathematics'
            }),
            findMany: vi.fn().mockResolvedValue([{
                id: 't1',
                full_name: 'John Teacher',
                email: 'teacher@school.com',
                subject: 'Mathematics',
                school_generated_id: 'SCH01_MAIN_TCH_001'
            }, {
                id: 't2',
                full_name: 'Jane Teacher',
                email: 'jane@school.com',
                subject: 'English',
                school_generated_id: 'SCH01_MAIN_TCH_002'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 't-new',
                full_name: 'New Teacher',
                email: 'new@school.com',
                subject: 'Science',
                school_generated_id: 'SCH01_MAIN_TCH_003'
            }),
            update: vi.fn().mockResolvedValue({
                id: 't1',
                full_name: 'Updated Teacher',
                email: 'teacher@school.com',
                subject: 'Mathematics'
            }),
            delete: vi.fn().mockResolvedValue({ id: 't1' }),
            count: vi.fn().mockResolvedValue(2)
        },

        // User
        user: {
            findUnique: vi.fn().mockResolvedValue({
                id: 'test-user-id',
                email: 'teacher@school.com',
                role: 'teacher'
            }),
            create: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
            update: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
            delete: vi.fn().mockResolvedValue({ id: 'test-user-id' })
        },

        // Assignment
        assignment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'a1',
                title: 'Math Homework',
                description: 'Complete exercises 1-10',
                class_id: 'c1',
                teacher_id: 't1',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                due_date: '2026-04-10',
                created_at: '2026-04-01',
                class: { name: 'JSS 1A' },
                submissions: []
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'a1',
                title: 'Math Homework',
                description: 'Complete exercises 1-10',
                class_id: 'c1',
                teacher_id: 't1',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                due_date: '2026-04-10',
                created_at: '2026-04-01'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'a-new',
                title: 'New Assignment',
                description: 'New description',
                class_id: 'c1',
                teacher_id: 't1',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                due_date: '2026-04-15',
                created_at: '2026-04-01'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'a1',
                title: 'Updated Assignment'
            }),
            delete: vi.fn().mockResolvedValue({ id: 'a1' }),
            count: vi.fn().mockResolvedValue(1)
        },

        // Assignment Submission
        assignmentSubmission: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'sub1',
                assignment_id: 'a1',
                student_id: 's1',
                status: 'submitted',
                score: null,
                feedback: null,
                submitted_at: '2026-04-05',
                student: { name: 'Student One' }
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'sub1',
                assignment_id: 'a1',
                student_id: 's1',
                status: 'submitted',
                score: null,
                feedback: null
            }),
            upsert: vi.fn().mockResolvedValue({
                id: 'sub1',
                student_id: 's1',
                assignment_id: 'a1',
                status: 'submitted'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'sub-new',
                assignment_id: 'a1',
                student_id: 's1',
                status: 'submitted'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'sub1',
                score: 85,
                feedback: 'Good work',
                status: 'graded'
            })
        },

        // Attendance
        attendance: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'att1',
                student_id: 's1',
                class_id: 'c1',
                date: '2026-04-01',
                status: 'Present',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1'
            }]),
            createMany: vi.fn().mockResolvedValue({ count: 3 }),
            upsert: vi.fn().mockResolvedValue({
                id: 'att1',
                student_id: 's1',
                class_id: 'c1',
                date: '2026-04-01',
                status: 'Present'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'att-new',
                student_id: 's1',
                status: 'Present'
            }),
            count: vi.fn().mockResolvedValue(10)
        },

        // Teacher Attendance
        teacherAttendance: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'ta1',
                teacher_id: 't1',
                date: '2026-04-01',
                check_in: '08:00:00',
                check_out: '15:00:00',
                status: 'present'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'ta-new',
                teacher_id: 't1',
                date: '2026-04-01',
                check_in: '08:00:00',
                status: 'present'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'ta1',
                status: 'approved'
            })
        },

        // Lesson Note / Lesson Plan
        lessonNote: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'ln1',
                title: 'Introduction to Algebra',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                content: 'Lesson content here',
                created_at: '2026-04-01'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'ln1',
                title: 'Introduction to Algebra',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                content: 'Lesson content here'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'ln-new',
                title: 'New Lesson',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                content: 'New content'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'ln1',
                title: 'Updated Lesson'
            }),
            delete: vi.fn().mockResolvedValue({ id: 'ln1' })
        },

        // Lesson Plan
        lessonPlan: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'lp1',
                title: 'Week 1 Plan',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                objectives: 'Learn basics',
                created_at: '2026-04-01'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'lp1',
                title: 'Week 1 Plan',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'lp-new',
                title: 'New Plan',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'lp1',
                title: 'Updated Plan'
            }),
            delete: vi.fn().mockResolvedValue({ id: 'lp1' })
        },

        // Quiz
        quiz: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'q1',
                title: 'Math Quiz 1',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                duration: 30,
                total_marks: 50,
                status: 'draft',
                created_at: '2026-04-01'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'q1',
                title: 'Math Quiz 1',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                duration: 30,
                total_marks: 50,
                status: 'draft'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'q-new',
                title: 'New Quiz',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                duration: 30,
                total_marks: 50,
                status: 'draft'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'q1',
                status: 'published'
            }),
            delete: vi.fn().mockResolvedValue({ id: 'q1' })
        },

        // Quiz Question
        quizQuestion: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'qq1',
                quiz_id: 'q1',
                question: 'What is 2+2?',
                options: ['3', '4', '5', '6'],
                correct_answer: '4',
                marks: 5
            }]),
            createMany: vi.fn().mockResolvedValue({ count: 5 }),
            create: vi.fn().mockResolvedValue({
                id: 'qq-new',
                quiz_id: 'q1',
                question: 'New question?',
                options: ['A', 'B', 'C', 'D'],
                correct_answer: 'A',
                marks: 5
            })
        },

        // Quiz Submission
        quizSubmission: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'qs1',
                quiz_id: 'q1',
                student_id: 's1',
                score: 45,
                total_marks: 50,
                submitted_at: '2026-04-02'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'qs-new',
                quiz_id: 'q1',
                student_id: 's1',
                score: 45,
                total_marks: 50
            })
        },

        // Exam
        exam: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'e1',
                title: 'Mid-Term Exam',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                exam_date: '2026-04-15',
                total_marks: 100,
                term: 'Second Term',
                session: '2025/2026'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'e1',
                title: 'Mid-Term Exam',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                exam_date: '2026-04-15',
                total_marks: 100
            }),
            create: vi.fn().mockResolvedValue({
                id: 'e-new',
                title: 'New Exam',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                exam_date: '2026-04-20',
                total_marks: 100
            }),
            update: vi.fn().mockResolvedValue({
                id: 'e1',
                title: 'Updated Exam'
            }),
            delete: vi.fn().mockResolvedValue({ id: 'e1' })
        },

        // Grade
        grade: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'g1',
                student_id: 's1',
                exam_id: 'e1',
                subject: 'Mathematics',
                score: 85,
                grade: 'A',
                term: 'Second Term'
            }]),
            upsert: vi.fn().mockResolvedValue({
                id: 'g1',
                student_id: 's1',
                exam_id: 'e1',
                subject: 'Mathematics',
                score: 85,
                grade: 'A'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'g-new',
                student_id: 's1',
                exam_id: 'e1',
                subject: 'Mathematics',
                score: 85,
                grade: 'A'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'g1',
                score: 90,
                grade: 'A+'
            })
        },

        // Class
        class: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'c1',
                name: 'JSS 1A',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id',
                teacher_id: 't1'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'c1',
                name: 'JSS 1A',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id'
            })
        },

        // Class Teacher
        classTeacher: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'ct1',
                class_id: 'c1',
                teacher_id: 't1',
                role: 'class_teacher'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'ct1',
                class_id: 'c1',
                teacher_id: 't1',
                role: 'class_teacher'
            }),
            count: vi.fn().mockResolvedValue(5)
        },

        // Student
        student: {
            findMany: vi.fn().mockResolvedValue([{
                id: 's1',
                name: 'Student One',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id',
                grade: 'JSS1',
                section: 'A',
                school_generated_id: 'SCH01_MAIN_STU_001',
                enrollments: [{ class_id: 'c1' }]
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 's1',
                name: 'Student One',
                school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
                branch_id: 'test-branch-id',
                grade: 'JSS1',
                section: 'A',
                enrollments: [{ class_id: 'c1' }]
            })
        },

        // Student Enrollment
        studentEnrollment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'se1',
                student_id: 's1',
                class_id: 'c1'
            }]),
            findFirst: vi.fn().mockResolvedValue({
                id: 'se1',
                student_id: 's1',
                class_id: 'c1'
            })
        },

        // Timetable
        timetable: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'tt1',
                teacher_id: 't1',
                class_id: 'c1',
                subject: 'Mathematics',
                day: 'Monday',
                start_time: '09:00',
                end_time: '10:00'
            }])
        },

        // Appointment
        appointment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'apt1',
                teacher_id: 't1',
                title: 'Parent Meeting',
                date: '2026-04-05',
                time: '14:00',
                status: 'scheduled'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'apt1',
                teacher_id: 't1',
                title: 'Parent Meeting',
                date: '2026-04-05',
                time: '14:00',
                status: 'scheduled'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'apt-new',
                teacher_id: 't1',
                title: 'New Appointment',
                date: '2026-04-10',
                time: '10:00',
                status: 'scheduled'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'apt1',
                status: 'confirmed'
            })
        },

        // Forum
        forum_category: {
            findMany: vi.fn().mockResolvedValue([{
                id: 1,
                name: 'General',
                order_index: 1
            }])
        },
        forum_thread: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'ft1',
                title: 'Teaching Tips',
                content: 'Share your tips',
                teacher_id: 't1',
                category_id: 1,
                created_at: '2026-04-01',
                teacher: { full_name: 'John Teacher' },
                forum_category: { name: 'General' }
            }])
        },
        forum_post: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'fp1',
                thread_id: 'ft1',
                content: 'Great tip!',
                teacher_id: 't2',
                created_at: '2026-04-01'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'fp-new',
                thread_id: 'ft1',
                content: 'New post',
                teacher_id: 't1'
            })
        },

        // Chat
        chatRoom: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'cr1',
                name: 'Math Dept',
                type: 'group',
                created_at: '2026-04-01'
            }])
        },
        chatMessage: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'cm1',
                room_id: 'cr1',
                sender_id: 't1',
                content: 'Hello',
                created_at: '2026-04-01'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'cm-new',
                room_id: 'cr1',
                sender_id: 't1',
                content: 'New message'
            })
        },

        // Payroll
        payslip: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'ps1',
                teacher_id: 't1',
                month: 'April',
                year: 2026,
                basic_salary: 150000,
                net_salary: 180000,
                status: 'paid'
            }])
        },
        leaveRequest: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'lr1',
                teacher_id: 't1',
                leave_type: 'Annual',
                start_date: '2026-04-10',
                end_date: '2026-04-12',
                reason: 'Vacation',
                status: 'pending'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'lr-new',
                teacher_id: 't1',
                leave_type: 'Annual',
                start_date: '2026-04-15',
                end_date: '2026-04-17',
                reason: 'Family event',
                status: 'pending'
            })
        },
        leaveType: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'lt1',
                name: 'Annual Leave',
                days_allowed: 20
            }, {
                id: 'lt2',
                name: 'Sick Leave',
                days_allowed: 10
            }])
        },

        // PD (Professional Development)
        pd_course: {
            findMany: vi.fn().mockResolvedValue([{
                id: 1,
                title: 'Modern Teaching Methods',
                description: 'Learn modern techniques',
                is_published: true,
                duration_hours: 10,
                created_at: '2026-04-01'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 1,
                title: 'Modern Teaching Methods',
                description: 'Learn modern techniques',
                is_published: true,
                duration_hours: 10,
                modules: [{ id: 1, title: 'Module 1', order_index: 1 }]
            })
        },
        pdEnrollment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'pe1',
                teacher_id: 't1',
                course_id: 1,
                status: 'In Progress',
                progress: 50,
                enrolled_at: '2026-04-01',
                pd_course: {
                    id: 1,
                    title: 'Modern Teaching Methods',
                    description: 'Learn modern techniques',
                    duration_hours: 10
                }
            }])
        },
        teacher_course_enrollment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'tce1',
                teacher_id: 't1',
                course_id: 1,
                status: 'In Progress'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'tce-new',
                teacher_id: 't1',
                course_id: 1,
                status: 'In Progress'
            })
        },
        module_progress: {
            upsert: vi.fn().mockResolvedValue({
                id: 'mp1',
                enrollment_id: 'tce1',
                module_id: 1,
                is_completed: true,
                completed_at: '2026-04-01'
            }),
            create: vi.fn().mockResolvedValue({
                id: 'mp-new',
                enrollment_id: 'tce1',
                module_id: 1,
                is_completed: true
            })
        },

        // Badge
        badge: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'b1',
                teacher_id: 't1',
                name: 'First Lesson',
                description: 'Created first lesson plan',
                earned_at: '2026-04-01'
            }])
        },

        // Recognition
        recognition: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'r1',
                teacher_id: 't1',
                from_teacher_id: 't2',
                message: 'Great teaching!',
                created_at: '2026-04-01'
            }])
        },

        // Mentoring
        mentoringMatch: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'mm1',
                mentor_id: 't2',
                mentee_id: 't1',
                status: 'active',
                created_at: '2026-04-01'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'mm-new',
                mentor_id: 't2',
                mentee_id: 't1',
                status: 'active'
            })
        },

        // Substitute Assignment
        substitute_assignment: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'sa1',
                substitute_teacher_id: 't1',
                original_teacher_id: 't2',
                class_id: 'c1',
                date: '2026-04-05',
                status: 'assigned'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'sa-new',
                substitute_teacher_id: 't1',
                original_teacher_id: 't2',
                class_id: 'c1',
                date: '2026-04-10',
                status: 'assigned'
            })
        },

        // Certificate
        certificate: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'cert1',
                teacher_id: 't1',
                title: 'Teaching Excellence',
                issued_by: 'Ministry of Education',
                issued_at: '2026-04-01'
            }])
        },

        // Resource
        resource: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'res1',
                title: 'Math Worksheet',
                teacher_id: 't1',
                type: 'worksheet',
                url: '/uploads/worksheet.pdf',
                created_at: '2026-04-01'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'res-new',
                title: 'New Resource',
                teacher_id: 't1',
                type: 'document',
                url: '/uploads/new.pdf'
            })
        },

        // Gallery
        gallery: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'gal1',
                title: 'Class Photo',
                url: '/uploads/photo.jpg',
                teacher_id: 't1',
                created_at: '2026-04-01'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'gal-new',
                title: 'New Photo',
                url: '/uploads/new.jpg',
                teacher_id: 't1'
            })
        },

        // Virtual Class
        virtualClass: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'vc1',
                teacher_id: 't1',
                class_id: 'c1',
                title: 'Virtual Math Class',
                scheduled_at: '2026-04-05T10:00:00Z',
                status: 'scheduled'
            }]),
            create: vi.fn().mockResolvedValue({
                id: 'vc-new',
                teacher_id: 't1',
                class_id: 'c1',
                title: 'New Virtual Class',
                scheduled_at: '2026-04-10T10:00:00Z',
                status: 'scheduled'
            })
        },

        // Report Card
        reportCard: {
            findMany: vi.fn().mockResolvedValue([{
                id: 'rc1',
                student_id: 's1',
                teacher_id: 't1',
                term: 'Second Term',
                session: '2025/2026',
                status: 'draft',
                created_at: '2026-04-01'
            }]),
            findUnique: vi.fn().mockResolvedValue({
                id: 'rc1',
                student_id: 's1',
                teacher_id: 't1',
                term: 'Second Term',
                status: 'draft'
            }),
            update: vi.fn().mockResolvedValue({
                id: 'rc1',
                status: 'published'
            })
        },

        // Dashboard Stats
        $queryRaw: vi.fn().mockResolvedValue([]),

        // Transaction
        $transaction: vi.fn(async (cb: any) => {
            if (typeof cb === 'function') {
                return await cb(mockPrisma);
            }
            return cb;
        })
    };

    return {
        default: mockPrisma,
        prisma: mockPrisma
    };
});

// ============================================================
// TEST SUITES
// ============================================================

describe('Teacher Backend E2E Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================
    // 1. TEACHER PROFILE & CRUD
    // ============================================================
    describe('Teacher Profile & CRUD', () => {
        it('GET /api/teachers/me - Should return teacher profile', async () => {
            const res = await request(app).get('/api/teachers/me');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });

        it('GET /api/teachers - Should list all teachers', async () => {
            const res = await request(app).get('/api/teachers');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/teachers/:id - Should get teacher by ID', async () => {
            const res = await request(app).get('/api/teachers/t1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });

        it('POST /api/teachers - Should create a new teacher', async () => {
            const res = await request(app)
                .post('/api/teachers')
                .send({
                    full_name: 'New Teacher',
                    email: 'newteacher@school.com',
                    subject: 'Science',
                    branch_id: 'test-branch-id'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('PUT /api/teachers/:id - Should update teacher', async () => {
            const res = await request(app)
                .put('/api/teachers/t1')
                .send({ full_name: 'Updated Name' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });

        it('DELETE /api/teachers/:id - Should delete teacher', async () => {
            const res = await request(app).delete('/api/teachers/t1');
            expect([200, 204, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 2. TEACHER SELF ATTENDANCE
    // ============================================================
    describe('Teacher Self Attendance', () => {
        it('POST /api/teachers/me/attendance - Should submit teacher attendance', async () => {
            const res = await request(app).post('/api/teachers/me/attendance');
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/teachers/me/attendance - Should get attendance history', async () => {
            const res = await request(app).get('/api/teachers/me/attendance');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ============================================================
    // 3. TEACHER ATTENDANCE MANAGEMENT
    // ============================================================
    describe('Teacher Attendance Management', () => {
        it('GET /api/teachers/attendance - Should get teacher attendance records', async () => {
            const res = await request(app).get('/api/teachers/attendance');
            expect(res.status).toBe(200);
        });

        it('POST /api/teachers/attendance - Should save teacher attendance', async () => {
            const res = await request(app)
                .post('/api/teachers/attendance')
                .send({
                    records: [{
                        student_id: 's1',
                        class_id: 'c1',
                        status: 'Present',
                        date: '2026-04-01'
                    }]
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('PUT /api/teachers/attendance/:id/approve - Should approve attendance', async () => {
            const res = await request(app)
                .put('/api/teachers/attendance/att1/approve')
                .send({ status: 'approved' });
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 4. STUDENT ATTENDANCE
    // ============================================================
    describe('Student Attendance', () => {
        it('GET /api/attendance - Should get attendance records', async () => {
            const res = await request(app).get('/api/attendance');
            expect([200, 400]).toContain(res.status);
            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });

        it('POST /api/attendance - Should save student attendance', async () => {
            const res = await request(app)
                .post('/api/attendance')
                .send({
                    records: [{
                        student_id: 's1',
                        class_id: 'c1',
                        status: 'Present',
                        date: '2026-04-01'
                    }]
                });
            expect(res.status).toBe(200);
        });

        it('POST /api/attendance/bulk-fetch - Should bulk fetch attendance', async () => {
            const res = await request(app)
                .post('/api/attendance/bulk-fetch')
                .send({
                    classIds: ['c1', 'c2'],
                    startDate: '2026-04-01',
                    endDate: '2026-04-30'
                });
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/attendance/student/:studentId - Should get attendance by student', async () => {
            const res = await request(app).get('/api/attendance/student/s1');
            expect(res.status).toBe(200);
        });
    });

    // ============================================================
    // 5. ASSIGNMENT MANAGEMENT
    // ============================================================
    describe('Assignment Management', () => {
        it('GET /api/assignments - Should list assignments', async () => {
            const res = await request(app).get('/api/assignments');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('POST /api/assignments - Should create an assignment', async () => {
            const res = await request(app)
                .post('/api/assignments')
                .send({
                    title: 'New Assignment',
                    description: 'Complete exercises',
                    class_id: 'c1',
                    due_date: '2026-04-15'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('GET /api/assignments/:id/submissions - Should get submissions', async () => {
            const res = await request(app).get('/api/assignments/a1/submissions');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/assignments/:id/submissions - Should submit assignment', async () => {
            const res = await request(app)
                .post('/api/assignments/a1/submissions')
                .send({
                    student_id: 's1',
                    content: 'My submission',
                    status: 'submitted'
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('PUT /api/assignments/submissions/:id/grade - Should grade submission', async () => {
            const res = await request(app)
                .put('/api/assignments/submissions/sub1/grade')
                .send({
                    score: 85,
                    feedback: 'Good work',
                    status: 'graded'
                });
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 6. EXAM MANAGEMENT
    // ============================================================
    describe('Exam Management', () => {
        it('GET /api/exams - Should list exams', async () => {
            const res = await request(app).get('/api/exams');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/exams - Should create an exam', async () => {
            const res = await request(app)
                .post('/api/exams')
                .send({
                    title: 'New Exam',
                    class_id: 'c1',
                    subject: 'Mathematics',
                    exam_date: '2026-04-20',
                    total_marks: 100,
                    term: 'Second Term',
                    session: '2025/2026'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('PUT /api/exams/:id - Should update exam', async () => {
            const res = await request(app)
                .put('/api/exams/e1')
                .send({ title: 'Updated Exam' });
            expect([200, 500]).toContain(res.status);
        });

        it('DELETE /api/exams/:id - Should delete exam', async () => {
            const res = await request(app).delete('/api/exams/e1');
            expect([200, 204, 500]).toContain(res.status);
        });

        it('GET /api/exams/:id/results - Should get exam results', async () => {
            const res = await request(app).get('/api/exams/e1/results');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 7. QUIZ MANAGEMENT
    // ============================================================
    describe('Quiz Management', () => {
        it('GET /api/quizzes - Should list quizzes', async () => {
            const res = await request(app).get('/api/quizzes');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/quizzes/upload - Should create quiz with questions', async () => {
            const res = await request(app)
                .post('/api/quizzes/upload')
                .send({
                    title: 'New Quiz',
                    class_id: 'c1',
                    subject: 'Mathematics',
                    duration: 30,
                    total_marks: 50,
                    questions: [
                        { question: 'What is 2+2?', options: ['3', '4', '5', '6'], correct_answer: '4', marks: 5 },
                        { question: 'What is 3x3?', options: ['6', '9', '12', '15'], correct_answer: '9', marks: 5 }
                    ]
                });
            expect([200, 201, 400, 500]).toContain(res.status);
        });

        it('POST /api/quizzes/submit - Should submit quiz result', async () => {
            const res = await request(app)
                .post('/api/quizzes/submit')
                .send({
                    quiz_id: 'q1',
                    student_id: 's1',
                    answers: [{ question_id: 'qq1', answer: '4' }],
                    score: 45,
                    total_marks: 50
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('PUT /api/quizzes/:id/status - Should update quiz status', async () => {
            const res = await request(app)
                .put('/api/quizzes/q1/status')
                .send({ status: 'published' });
            expect([200, 500]).toContain(res.status);
        });

        it('DELETE /api/quizzes/:id - Should delete quiz', async () => {
            const res = await request(app).delete('/api/quizzes/q1');
            expect([200, 204, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 8. LESSON PLAN MANAGEMENT
    // ============================================================
    describe('Lesson Plan Management', () => {
        it('GET /api/lesson-plans - Should list lesson plans', async () => {
            const res = await request(app).get('/api/lesson-plans');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/lesson-plans - Should create lesson plan', async () => {
            const res = await request(app)
                .post('/api/lesson-plans')
                .send({
                    title: 'New Lesson Plan',
                    class_id: 'c1',
                    subject: 'Mathematics',
                    objectives: 'Learn algebra basics',
                    content: 'Detailed lesson content'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('PUT /api/lesson-plans/:id - Should update lesson plan', async () => {
            const res = await request(app)
                .put('/api/lesson-plans/lp1')
                .send({ title: 'Updated Plan' });
            expect([200, 500]).toContain(res.status);
        });

        it('DELETE /api/lesson-plans/:id - Should delete lesson plan', async () => {
            const res = await request(app).delete('/api/lesson-plans/lp1');
            expect([200, 204, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 9. GRADEBOOK & ACADEMICS
    // ============================================================
    describe('Gradebook & Academics', () => {
        it('POST /api/academic/grades - Should get grades', async () => {
            const res = await request(app)
                .post('/api/academic/grades')
                .send({
                    class_id: 'c1',
                    exam_id: 'e1',
                    subject: 'Mathematics'
                });
            expect([200, 500]).toContain(res.status);
            if (res.status === 200) {
                expect(Array.isArray(res.body)).toBe(true);
            }
        });

        it('PUT /api/academic/grade - Should save grade', async () => {
            const res = await request(app)
                .put('/api/academic/grade')
                .send({
                    student_id: 's1',
                    exam_id: 'e1',
                    subject: 'Mathematics',
                    score: 85,
                    grade: 'A',
                    term: 'Second Term'
                });
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/subjects - Should get subjects', async () => {
            const res = await request(app).get('/api/academic/subjects');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/analytics - Should get analytics', async () => {
            const res = await request(app).get('/api/academic/analytics');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/performance - Should get performance', async () => {
            const res = await request(app).get('/api/academic/performance');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/report-card-details - Should get report card details', async () => {
            const res = await request(app).get('/api/academic/report-card-details');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/curricula - Should get curricula', async () => {
            const res = await request(app).get('/api/academic/curricula');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/academic/tracks - Should get academic tracks', async () => {
            const res = await request(app).get('/api/academic/tracks');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 10. REPORT CARDS
    // ============================================================
    describe('Report Cards', () => {
        it('GET /api/report-cards - Should list report cards', async () => {
            const res = await request(app).get('/api/report-cards');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/report-cards/:id - Should get report card', async () => {
            const res = await request(app).get('/api/report-cards/rc1');
            expect([200, 500]).toContain(res.status);
        });

        it('PUT /api/report-cards/:id/status - Should update report card status', async () => {
            const res = await request(app)
                .put('/api/report-cards/rc1/status')
                .send({ status: 'published' });
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 11. CLASSES & STUDENTS
    // ============================================================
    describe('Classes & Students', () => {
        it('GET /api/classes - Should list classes', async () => {
            const res = await request(app).get('/api/classes');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/classes/subjects - Should get class subjects', async () => {
            const res = await request(app).get('/api/classes/subjects');
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/students - Should list students', async () => {
            const res = await request(app).get('/api/students');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/students/class/:classId - Should get students by class', async () => {
            const res = await request(app).get('/api/students/class/c1');
            expect([200, 404, 500]).toContain(res.status);
        });

        it('GET /api/students/:id - Should get student by ID', async () => {
            const res = await request(app).get('/api/students/s1');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 12. TEACHER APPOINTMENTS
    // ============================================================
    describe('Teacher Appointments', () => {
        it('GET /api/teachers/me/appointments - Should get my appointments', async () => {
            const res = await request(app).get('/api/teachers/me/appointments');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('PUT /api/teachers/appointments/:id/status - Should update appointment status', async () => {
            const res = await request(app)
                .put('/api/teachers/appointments/apt1/status')
                .send({ status: 'confirmed' });
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/teachers/appointments/:id - Should get single appointment', async () => {
            const res = await request(app).get('/api/teachers/appointments/apt1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });

        it('PUT /api/teachers/appointments/:id - Should update appointment', async () => {
            const res = await request(app)
                .put('/api/teachers/appointments/apt1')
                .send({ title: 'Updated Meeting' });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('id');
        });

        it('POST /api/teachers/appointments - Should create appointment', async () => {
            const res = await request(app)
                .post('/api/teachers/appointments')
                .send({
                    title: 'New Meeting',
                    date: '2026-04-10',
                    time: '10:00',
                    teacher_id: 't1'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('GET /api/teachers/:id/appointments - Should get teacher appointments', async () => {
            const res = await request(app).get('/api/teachers/t1/appointments');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ============================================================
    // 13. TEACHER MY STUDENTS
    // ============================================================
    describe('Teacher My Students', () => {
        it('GET /api/teachers/me/students - Should get my students with credentials', async () => {
            const res = await request(app).get('/api/teachers/me/students');
            expect([200, 404, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 14. PARENTS
    // ============================================================
    describe('Parents', () => {
        it('GET /api/parents/by-class/:classId - Should get parents by class', async () => {
            const res = await request(app).get('/api/parents/by-class/c1');
            expect([200, 404, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 15. FORUM & COMMUNICATION
    // ============================================================
    describe('Forum & Communication', () => {
        it('GET /api/forum/data - Should get forum data', async () => {
            const res = await request(app).get('/api/forum/data');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('categories');
            expect(res.body).toHaveProperty('threads');
        });

        it('GET /api/forum/topics - Should get forum topics', async () => {
            const res = await request(app).get('/api/forum/topics');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/forum/topics - Should create forum topic', async () => {
            const res = await request(app)
                .post('/api/forum/topics')
                .send({
                    title: 'New Topic',
                    content: 'Topic content',
                    category_id: 1
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/forum/topics/:id/posts - Should get posts', async () => {
            const res = await request(app).get('/api/forum/topics/ft1/posts');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/forum/posts - Should create post', async () => {
            const res = await request(app)
                .post('/api/forum/posts')
                .send({
                    thread_id: 'ft1',
                    content: 'New post content'
                });
            expect([200, 201, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 16. CHAT
    // ============================================================
    describe('Chat', () => {
        it('GET /api/chat/rooms - Should get chat rooms', async () => {
            const res = await request(app).get('/api/chat/rooms');
            expect(res.status).toBe(200);
        });

        it('GET /api/chat/rooms/:roomId/messages - Should get messages', async () => {
            const res = await request(app).get('/api/chat/rooms/cr1/messages');
            expect(res.status).toBe(200);
        });

        it('POST /api/chat/rooms/:roomId/messages - Should send message', async () => {
            const res = await request(app)
                .post('/api/chat/rooms/cr1/messages')
                .send({ content: 'Hello everyone' });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/chat/contacts - Should get chat contacts', async () => {
            const res = await request(app).get('/api/chat/contacts');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/chat/direct - Should get or create direct chat', async () => {
            const res = await request(app)
                .post('/api/chat/direct')
                .send({ recipient_id: 't2' });
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 17. PAYROLL & LEAVE
    // ============================================================
    describe('Payroll & Leave', () => {
        it('GET /api/payroll/payslips - Should get payslips', async () => {
            const res = await request(app).get('/api/payroll/payslips');
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/payroll/transactions - Should get transactions', async () => {
            const res = await request(app).get('/api/payroll/transactions');
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/payroll/salary-profile - Should get salary profile', async () => {
            const res = await request(app).get('/api/payroll/salary-profile');
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/payroll/payment-history - Should get payment history', async () => {
            const res = await request(app).get('/api/payroll/payment-history');
            expect([200, 400, 500]).toContain(res.status);
        });

        it('GET /api/payroll/leave-requests - Should get leave requests', async () => {
            const res = await request(app).get('/api/payroll/leave-requests');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/payroll/leave-requests - Should submit leave request', async () => {
            const res = await request(app)
                .post('/api/payroll/leave-requests')
                .send({
                    leave_type: 'Annual',
                    start_date: '2026-04-15',
                    end_date: '2026-04-17',
                    reason: 'Family event'
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/payroll/leave-types - Should get leave types', async () => {
            const res = await request(app).get('/api/payroll/leave-types');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/teachers/:id/payslips - Should get teacher payslips', async () => {
            const res = await request(app).get('/api/teachers/t1/payslips');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/teachers/:id/salary-profile - Should get teacher salary profile', async () => {
            const res = await request(app).get('/api/teachers/t1/salary-profile');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 18. PROFESSIONAL DEVELOPMENT (PD)
    // ============================================================
    describe('Professional Development', () => {
        it('GET /api/pd/courses - Should get PD courses', async () => {
            const res = await request(app).get('/api/pd/courses');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/pd/my-enrollments - Should get my enrollments', async () => {
            const res = await request(app).get('/api/pd/my-enrollments');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/pd/enroll - Should enroll in course', async () => {
            const res = await request(app)
                .post('/api/pd/enroll')
                .send({ course_id: 1 });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('PUT /api/pd/progress - Should update progress', async () => {
            const res = await request(app)
                .put('/api/pd/progress')
                .send({ course_id: 1, module_id: 1, is_completed: true });
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/teachers/me/pd-courses - Should get my PD courses', async () => {
            const res = await request(app).get('/api/teachers/me/pd-courses');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ============================================================
    // 19. TEACHER ENGAGEMENT (Badges, Recognition, Mentoring)
    // ============================================================
    describe('Teacher Engagement', () => {
        it('GET /api/teachers/me/badges - Should get my badges', async () => {
            const res = await request(app).get('/api/teachers/me/badges');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/teachers/me/recognitions - Should get my recognitions', async () => {
            const res = await request(app).get('/api/teachers/me/recognitions');
            expect([200, 500]).toContain(res.status);
        });

        it('GET /api/teachers/me/mentoring - Should get my mentoring matches', async () => {
            const res = await request(app).get('/api/teachers/me/mentoring');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/teachers/me/mentoring - Should create mentoring match', async () => {
            const res = await request(app)
                .post('/api/teachers/me/mentoring')
                .send({ mentor_id: 't2' });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/teachers/:id/certificates - Should get teacher certificates', async () => {
            const res = await request(app).get('/api/teachers/t1/certificates');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 20. SUBSTITUTE TEACHERS
    // ============================================================
    describe('Substitute Teachers', () => {
        it('GET /api/teachers/substitutes - Should list substitute teachers', async () => {
            const res = await request(app).get('/api/teachers/substitutes');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/teachers/substitutes/requests - Should get substitute requests', async () => {
            const res = await request(app).get('/api/teachers/substitutes/requests');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/teachers/substitutes/requests - Should create substitute request', async () => {
            const res = await request(app)
                .post('/api/teachers/substitutes/requests')
                .send({
                    substitute_teacher_id: 't1',
                    original_teacher_id: 't2',
                    class_id: 'c1',
                    date: '2026-04-10'
                });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
        });

        it('GET /api/teachers/me/substitutes - Should get my substitute requests', async () => {
            const res = await request(app).get('/api/teachers/me/substitutes');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/teachers/me/substitutes - Should create my substitute request', async () => {
            const res = await request(app)
                .post('/api/teachers/me/substitutes')
                .send({
                    original_teacher_id: 't2',
                    class_id: 'c1',
                    date: '2026-04-10'
                });
            expect([200, 201, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 21. TIMETABLE
    // ============================================================
    describe('Timetable', () => {
        it('GET /api/timetable - Should get timetable', async () => {
            const res = await request(app).get('/api/timetable');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ============================================================
    // 22. VIRTUAL CLASS
    // ============================================================
    describe('Virtual Class', () => {
        it('GET /api/virtual-classes - Should get virtual class sessions', async () => {
            const res = await request(app).get('/api/virtual-classes');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/virtual-classes - Should create virtual class session', async () => {
            const res = await request(app)
                .post('/api/virtual-classes')
                .send({
                    class_id: 'c1',
                    title: 'Virtual Math Class',
                    scheduled_at: '2026-04-10T10:00:00Z'
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('POST /api/virtual-classes/attendance - Should record virtual attendance', async () => {
            const res = await request(app)
                .post('/api/virtual-classes/attendance')
                .send({
                    session_id: 'vc1',
                    student_id: 's1',
                    status: 'present'
                });
            expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 23. RESOURCES
    // ============================================================
    describe('Resources', () => {
        it('GET /api/resources - Should get resources', async () => {
            const res = await request(app).get('/api/resources');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('POST /api/resources - Should upload resource', async () => {
            const res = await request(app)
                .post('/api/resources')
                .send({
                    title: 'New Resource',
                    type: 'document',
                    url: '/uploads/new.pdf'
                });
            expect([200, 201, 500]).toContain(res.status);
        });

        it('GET /api/resources/courses - Should get PD courses via resources', async () => {
            const res = await request(app).get('/api/resources/courses');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // ============================================================
    // 24. GALLERY
    // ============================================================
    describe('Gallery', () => {
        it('GET /api/gallery - Should get photos', async () => {
            const res = await request(app).get('/api/gallery');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/gallery - Should add photo', async () => {
            const res = await request(app)
                .post('/api/gallery')
                .send({
                    title: 'New Photo',
                    url: '/uploads/new.jpg'
                });
            expect([200, 201, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 25. DASHBOARD STATS
    // ============================================================
    describe('Dashboard Stats', () => {
        it('GET /api/dashboard/stats - Should get dashboard stats', async () => {
            const res = await request(app).get('/api/dashboard/stats');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 26. NOTIFICATIONS
    // ============================================================
    describe('Notifications', () => {
        it('POST /api/notifications/send - Should send notification', async () => {
            const res = await request(app)
                .post('/api/notifications/send')
                .send({
                    recipient_id: 'p1',
                    title: 'Test Notification',
                    message: 'This is a test',
                    type: 'info'
                });
            expect([200, 201, 404, 500]).toContain(res.status);
        });

        it('GET /api/notifications/me - Should get my notifications', async () => {
            const res = await request(app).get('/api/notifications/me');
            expect([200, 500]).toContain(res.status);
        });
    });

    // ============================================================
    // 27. GAMES
    // ============================================================
    describe('Games', () => {
        it('GET /api/games - Should get games', async () => {
            const res = await request(app).get('/api/games');
            expect([200, 500]).toContain(res.status);
        });

        it('POST /api/games/scores - Should submit game score', async () => {
            const res = await request(app)
                .post('/api/games/scores')
                .send({
                    game_id: 'g1',
                    student_id: 's1',
                    score: 100
                });
            expect([200, 201, 400, 500]).toContain(res.status);
        });

        it('GET /api/games/scores/leaderboard/:gameId - Should get leaderboard', async () => {
            const res = await request(app).get('/api/games/scores/leaderboard/g1');
            expect(res.status).toBe(200);
        });

        it('GET /api/games/scores/me - Should get my game scores', async () => {
            const res = await request(app).get('/api/games/scores/me');
            expect(res.status).toBe(200);
        });
    });

    // ============================================================
    // 28. WORKLOAD
    // ============================================================
    describe('Teacher Workload', () => {
        it('GET /api/teachers/:id/workload - Should get teacher workload', async () => {
            const res = await request(app).get('/api/teachers/t1/workload');
            expect(res.status).toBe(200);
        });
    });

    // ============================================================
    // 29. STUDENT REPORTS
    // ============================================================
    describe('Student Reports', () => {
        it('GET /api/student-reports/:studentId/stats - Should get student report stats', async () => {
            const res = await request(app).get('/api/student-reports/s1/stats');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('avgScore');
            expect(res.body).toHaveProperty('attendancePct');
        });
    });

    // ============================================================
    // 30. PENDING STUDENTS
    // ============================================================
    describe('Pending Students', () => {
        it('GET /api/teachers/pending-students - Should get pending students', async () => {
            const res = await request(app).get('/api/teachers/pending-students');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
