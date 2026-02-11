// Mock user data for Quick Login buttons (Synced with Shared Reality Demo School)
export const MOCK_USERS: Record<string, any> = {
    admin: {
        id: '11111111-1111-1111-1111-111111111111',
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
        name: 'New Teacher',
        metadata: { role: 'teacher', full_name: 'New Teacher', subjects: ['Mathematics'], school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    parent: {
        id: '12345678-1234-1234-1234-123456781234',
        email: 'parent@demo.com',
        password: 'password123',
        role: 'parent',
        name: 'Demo Parent',
        metadata: { role: 'parent', full_name: 'Demo Parent', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    student: {
        id: '87654321-4321-4321-4321-876543218765',
        email: 'student@demo.com',
        password: 'password123',
        role: 'student',
        name: 'Demo Student',
        metadata: { role: 'student', full_name: 'Demo Student', school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' }
    },
    proprietor: {
        id: 'd3300000-0000-0000-0000-000000000005',
        email: 'demo_proprietor@school.com',
        password: 'password123',
        role: 'proprietor',
        name: 'Demo Proprietor',
        metadata: { role: 'proprietor', full_name: 'Demo Proprietor', school_id: '00000000-0000-0000-0000-00000000d330' }
    },
    inspector: {
        id: 'd3300000-0000-0000-0000-000000000006',
        email: 'demo_inspector@school.com',
        password: 'password123',
        role: 'inspector',
        name: 'Demo Inspector',
        metadata: { role: 'inspector', full_name: 'Demo Inspector', school_id: '00000000-0000-0000-0000-00000000d330' }
    },
    examofficer: {
        id: 'd3300000-0000-0000-0000-000000000007',
        email: 'demo_examofficer@school.com',
        password: 'password123',
        role: 'examofficer',
        name: 'Demo Exam Officer',
        metadata: { role: 'examofficer', full_name: 'Demo Exam Officer', school_id: '00000000-0000-0000-0000-00000000d330' }
    },
    compliance: {
        id: 'd3300000-0000-0000-0000-000000000008',
        email: 'demo_compliance@school.com',
        password: 'password123',
        role: 'complianceofficer',
        name: 'Demo Compliance',
        metadata: { role: 'complianceofficer', full_name: 'Demo Compliance', school_id: '00000000-0000-0000-0000-00000000d330' }
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
