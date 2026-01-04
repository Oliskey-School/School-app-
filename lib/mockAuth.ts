// Mock user data for Quick Login development
export const MOCK_USERS = {
    admin: {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'admin@school.com',
        password: 'password123',
        role: 'admin',
        name: 'Admin User',
        metadata: {
            role: 'admin',
            full_name: 'Admin User',
        }
    },
    teacher: {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'teacher@school.com',
        password: 'password123',
        role: 'teacher',
        name: 'John Adeoye',
        metadata: {
            role: 'teacher',
            full_name: 'John Adeoye',
            subjects: ['Mathematics', 'Physics']
        }
    },
    parent: {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'parent@school.com',
        password: 'password123',
        role: 'parent',
        name: 'Peter Okonkwo',
        metadata: {
            role: 'parent',
            full_name: 'Peter Okonkwo',
            children: ['Ada Okonkwo', 'Chidi Okonkwo']
        }
    },
    student: {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'student@school.com',
        password: 'password123',
        role: 'student',
        name: 'Adebayo Adewale',
        metadata: {
            role: 'student',
            full_name: 'Adebayo Adewale',
            grade: 10,
            section: 'A'
        }
    },
    proprietor: {
        id: '55555555-5555-5555-5555-555555555555',
        email: 'proprietor@school.com',
        password: 'password123',
        role: 'proprietor',
        name: 'Mrs. Oluwaseun Ajayi',
        metadata: {
            role: 'proprietor',
            full_name: 'Mrs. Oluwaseun Ajayi',
            title: 'School Proprietor'
        }
    },
    inspector: {
        id: '66666666-6666-6666-6666-666666666666',
        email: 'inspector@school.com',
        password: 'password123',
        role: 'inspector',
        name: 'Dr. Ibrahim Mohammed',
        metadata: {
            role: 'inspector',
            full_name: 'Dr. Ibrahim Mohammed',
            organization: 'Ministry of Education'
        }
    },
    examofficer: {
        id: '77777777-7777-7777-7777-777777777777',
        email: 'exam@school.com',
        password: 'password123',
        role: 'examofficer',
        name: 'Mr. Chukwudi Nnamdi',
        metadata: {
            role: 'examofficer',
            full_name: 'Mr. Chukwudi Nnamdi',
            department: 'Examinations Office'
        }
    },
    complianceofficer: {
        id: '88888888-8888-8888-8888-888888888888',
        email: 'compliance@school.com',
        password: 'password123',
        role: 'complianceofficer',
        name: 'Ms. Ngozi Okafor',
        metadata: {
            role: 'complianceofficer',
            full_name: 'Ms. Ngozi Okafor',
            department: 'Compliance & Quality Assurance'
        }
    }
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
