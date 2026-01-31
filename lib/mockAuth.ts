// Mock user data for Quick Login buttons (Used for real Supabase login)
export const MOCK_USERS: Record<string, any> = {
    admin: {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'admin@demo.com',
        password: 'password123',
        role: 'admin',
        name: 'Demo Admin',
        metadata: { role: 'admin', full_name: 'Demo Admin', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    teacher: {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'teacher@demo.com',
        password: 'password123',
        role: 'teacher',
        name: 'Demo Teacher',
        metadata: { role: 'teacher', full_name: 'Demo Teacher', subjects: ['Mathematics', 'Science'], school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    parent: {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'parent@demo.com',
        password: 'password123',
        role: 'parent',
        name: 'Demo Parent',
        metadata: { role: 'parent', full_name: 'Demo Parent', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    student: {
        id: '11111111-1111-1111-111111111111', // Matches screenshot UID
        email: 'student@demo.com',
        password: 'password123',
        role: 'student',
        name: 'Demo Student',
        metadata: { role: 'student', full_name: 'Demo Student', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    proprietor: {
        id: '55555555-5555-5555-5555-555555555555',
        email: 'proprietor@demo.com',
        password: 'password123',
        role: 'proprietor',
        name: 'Demo Proprietor',
        metadata: { role: 'proprietor', full_name: 'Demo Proprietor', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    inspector: {
        id: '66666666-6666-6666-6666-666666666666',
        email: 'inspector@demo.com',
        password: 'password123',
        role: 'inspector',
        name: 'Demo Inspector',
        metadata: { role: 'inspector', full_name: 'Demo Inspector', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    examofficer: {
        id: '77777777-7777-7777-7777-777777777777',
        email: 'examofficer@demo.com',
        password: 'password123',
        role: 'examofficer',
        name: 'Demo Exam Officer',
        metadata: { role: 'examofficer', full_name: 'Demo Exam Officer', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    compliance: {
        id: '88888888-8888-8888-8888-888888888888',
        email: 'compliance@demo.com',
        password: 'password123',
        role: 'complianceofficer',
        name: 'Demo Compliance',
        metadata: { role: 'complianceofficer', full_name: 'Demo Compliance', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },

};

/**
 * Mock authentication function for development
 * Simulates Supabase auth response
 */
export const mockLogin = async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Find user by email
    const user = Object.values(MOCK_USERS).find(u => u.email === email);

    if (!user || user.password !== password) {
        return {
            data: { user: null, session: null },
            error: { message: 'Invalid credentials' }
        };
    }

    // Return mock Supabase auth response
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
                user: {
                    id: user.id,
                    email: user.email,
                }
            }
        },
        error: null
    };
};
