
import request from 'supertest';
import { app } from '../../src/app';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/config/supabase';

// --- Mocks ---
const mockQuery: any = {
    select: vi.fn(() => mockQuery),
    insert: vi.fn(() => mockQuery),
    update: vi.fn(() => mockQuery),
    upsert: vi.fn(() => mockQuery),
    delete: vi.fn(() => mockQuery),
    eq: vi.fn(() => mockQuery),
    in: vi.fn(() => mockQuery),
    or: vi.fn(() => mockQuery),
    order: vi.fn(() => mockQuery),
    limit: vi.fn(() => mockQuery),
    range: vi.fn(() => mockQuery),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((cb: any) => cb({ data: [], error: null }))
};

// Mock the whole module
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
            admin: {
                createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
            }
        },
        from: vi.fn(() => mockQuery),
        rpc: vi.fn().mockResolvedValue({ data: {}, error: null })
    }))
}));

// Still need this for the config import in services
vi.mock('../../src/config/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            admin: {
                createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-id' } }, error: null })
            }
        },
        from: vi.fn(() => mockQuery)
    }
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { 
            id: 'test-student-id',
            school_id: 'school-123',
            role: 'student',
            email: 'student@school.com'
        };
        next();
    }
}));

vi.mock('../../src/middleware/tenant.middleware', () => ({
    requireTenant: (req: any, res: any, next: any) => {
        req.user = req.user || { school_id: 'school-123' };
        next();
    },
    requireRole: (allowedRoles: string[]) => (req: any, res: any, next: any) => {
        next();
    },
    enforceTenant: (schema?: any) => (req: any, res: any, next: any) => {
        next();
    }
}));

describe('Student Backend Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQuery.then.mockImplementation((cb: any) => cb({ data: [], error: null }));
        mockQuery.single.mockResolvedValue({ data: { id: 's1', name: 'Test Student' }, error: null });
        mockQuery.maybeSingle.mockResolvedValue({ data: { id: 's1', name: 'Test Student' }, error: null });
    });

    describe('Profile Management', () => {
        it('GET /api/students/me - Should return student profile', async () => {
            const res = await request(app).get('/api/students/me');
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Test Student');
        });
    });

    describe('Performance Data', () => {
        it('GET /api/students/me/performance - Should return performance data', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ subject: 'Math', score: 90 }], error: null }));
            const res = await request(app).get('/api/students/me/performance');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('GET /api/students/me/quiz-results - Should return quiz results', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ quiz_id: 'q1', score: 85 }], error: null }));
            const res = await request(app).get('/api/students/me/quiz-results');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('Enrollment & Relations', () => {
        it('POST /api/students/enroll - Should enroll a new student', async () => {
            // Service returns { studentId, email }
            mockQuery.single.mockResolvedValue({ data: { id: 'new-s1' }, error: null });
            
            const res = await request(app)
                .post('/api/students/enroll')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    school_id: 'school-123',
                    parentEmail: 'parent@demo.com'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.studentId).toBe('new-s1');
        });

        it('POST /api/students/link-guardian - Should link student to guardian', async () => {
            // Mock the admin client requirements if needed, but we mocked supabase config globally
            // Let's ensure mockQuery handles the calls in linkGuardian
            mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
            mockQuery.single.mockResolvedValue({ data: { id: 'p1' }, error: null });

            const res = await request(app)
                .post('/api/students/link-guardian')
                .send({
                    studentId: 's1',
                    guardianName: 'Jane Smith',
                    guardianEmail: 'jane@demo.com'
                });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('Student Data Access', () => {
        it('GET /api/students - Should list students for the school', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ id: 's1', name: 'Test' }], error: null }));
            
            const res = await request(app).get('/api/students');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
