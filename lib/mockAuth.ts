/**
 * Demo account definitions.
 * These map to REAL Supabase auth users in the demo school.
 * All logins use supabase.auth.signInWithPassword() — no mock bypass.
 *
 * Demo school: d0ff3e95-9b4c-4c12-989c-e5640d3cacd1
 * Demo branch: 7601cbea-e1ba-49d6-b59b-412a584cb94f
 */
export const DEMO_SCHOOL_ID = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';
export const DEMO_BRANCH_ID = '7601cbea-e1ba-49d6-b59b-412a584cb94f';

export interface DemoAccount {
    role: string;
    email: string;
    password: string;
    name: string;
    description: string;   // shown on the demo role card
    capabilities: string[]; // what the visitor can do in this role
    color: string;
    textColor: string;
}

export const DEMO_ACCOUNTS: Record<string, DemoAccount> = {
    admin: {
        role: 'admin',
        email: 'user@school.com',
        password: 'password123',
        name: 'School Admin',
        description: 'Manage the full school — students, teachers, fees, reports',
        capabilities: ['Add students & teachers', 'Manage fees & payments', 'View all reports', 'Configure school settings'],
        color: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700',
    },
    teacher: {
        role: 'teacher',
        email: 'john.smith@demo.com',
        password: 'password123',
        name: 'Demo Teacher',
        description: 'Manage your classes, students, and attendance',
        capabilities: ['Mark attendance', 'Grade students', 'Manage timetable', 'Generate reports'],
        color: 'bg-orange-50 border-orange-200',
        textColor: 'text-orange-700',
    },
    parent: {
        role: 'parent',
        email: 'parent1@demo.com',
        password: 'password123',
        name: 'Demo Parent',
        description: "Track your child's progress, pay fees, receive alerts",
        capabilities: ['View report cards', 'Pay school fees', 'Receive notifications', 'Message teachers'],
        color: 'bg-green-50 border-green-200',
        textColor: 'text-green-700',
    },
    student: {
        role: 'student',
        email: 'student1@demo.com',
        password: 'password123',
        name: 'Demo Student',
        description: 'Check results, timetable, assignments and notifications',
        capabilities: ['View timetable', 'Check results', 'Submit assignments', 'Access resources'],
        color: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700',
    },
    proprietor: {
        role: 'proprietor',
        email: 'proprietor@demo.com',
        password: 'password123',
        name: 'Proprietor',
        description: 'Overarching view of school operations',
        capabilities: [],
        color: 'bg-slate-50 border-slate-200',
        textColor: 'text-slate-700',
    },
    inspector: {
        role: 'inspector',
        email: 'inspector@demo.com',
        password: 'password123',
        name: 'Inspector',
        description: 'Academic quality assurance',
        capabilities: [],
        color: 'bg-slate-50 border-slate-200',
        textColor: 'text-slate-700',
    },
    examofficer: {
        role: 'examofficer',
        email: 'examofficer@demo.com',
        password: 'password123',
        name: 'Exam Officer',
        description: 'Examination management',
        capabilities: [],
        color: 'bg-slate-50 border-slate-200',
        textColor: 'text-slate-700',
    },
    complianceofficer: {
        role: 'complianceofficer',
        email: 'compliance@demo.com',
        password: 'password123',
        name: 'Compliance',
        description: 'Regulatory adherence',
        capabilities: [],
        color: 'bg-slate-50 border-slate-200',
        textColor: 'text-slate-700',
    },
};

/** Ordered list for the demo landing page */
export const DEMO_ROLES_ORDER = ['admin', 'teacher', 'parent', 'student', 'proprietor', 'inspector', 'examofficer', 'complianceofficer'] as const;

/**
 * Legacy MOCK_USERS kept for any remaining references during migration.
 * New code should use DEMO_ACCOUNTS instead.
 */
export const MOCK_USERS: Record<string, any> = {
    admin: {
        id: '014811ea-281f-484e-b039-e37beb8d92b2',
        email: DEMO_ACCOUNTS.admin.email,
        password: 'password123',
        role: 'admin',
        name: DEMO_ACCOUNTS.admin.name,
        school_id: DEMO_SCHOOL_ID,
        metadata: {
            role: 'admin',
            full_name: DEMO_ACCOUNTS.admin.name,
            school_generated_id: 'OLISKEY_MAIN_ADM_0001',
            school_id: DEMO_SCHOOL_ID,
            branch_id: DEMO_BRANCH_ID,
            school_code: 'OLISKEY',
            branch_code: 'MAIN',
        },
    },
    teacher: {
        id: '6f90901e-4119-457d-8d73-745b17831a30',
        email: DEMO_ACCOUNTS.teacher.email,
        password: 'password123',
        role: 'teacher',
        name: DEMO_ACCOUNTS.teacher.name,
        metadata: {
            role: 'teacher',
            full_name: DEMO_ACCOUNTS.teacher.name,
            school_generated_id: 'OLISKEY_MAIN_TCH_0017',
            school_id: DEMO_SCHOOL_ID,
            branch_id: DEMO_BRANCH_ID,
            school_code: 'OLISKEY',
            branch_code: 'MAIN',
        },
    },
    parent: {
        id: '3deca03a-6ebd-4732-98fa-5fd2a278d498',
        email: DEMO_ACCOUNTS.parent.email,
        password: 'password123',
        role: 'parent',
        name: DEMO_ACCOUNTS.parent.name,
        metadata: {
            role: 'parent',
            full_name: DEMO_ACCOUNTS.parent.name,
            school_generated_id: 'OLISKEY_MAIN_PAR_0007',
            school_id: DEMO_SCHOOL_ID,
            branch_id: DEMO_BRANCH_ID,
            school_code: 'OLISKEY',
            branch_code: 'MAIN',
        },
    },
    student: {
        id: '404d70d9-451c-4ba5-be3a-9a8929c0f2e8',
        email: DEMO_ACCOUNTS.student.email,
        password: 'password123',
        role: 'student',
        name: DEMO_ACCOUNTS.student.name,
        metadata: {
            role: 'student',
            full_name: DEMO_ACCOUNTS.student.name,
            school_generated_id: 'OLISKEY_MAIN_STU_0135',
            school_id: DEMO_SCHOOL_ID,
            branch_id: DEMO_BRANCH_ID,
            school_code: 'OLISKEY',
            branch_code: 'MAIN',
        },
    },
};

export const mockLogin = async (email: string, password: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const user = Object.values(MOCK_USERS).find(u => u.email === email);
    if (!user || user.password !== password) {
        return { data: { user: null, session: null }, error: { message: 'Invalid credentials' } };
    }
    return {
        data: {
            user: {
                id: user.id,
                email: user.email,
                user_metadata: user.metadata,
                app_metadata: {},
                aud: 'authenticated',
                created_at: new Date().toISOString(),
            },
            session: {
                access_token: 'mock-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
                token_type: 'bearer',
                user: { id: user.id, email: user.email },
            },
        },
        error: null,
    };
};
