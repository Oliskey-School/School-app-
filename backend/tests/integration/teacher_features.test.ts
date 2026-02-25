
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
    order: vi.fn(() => mockQuery),
    limit: vi.fn(() => mockQuery),
    range: vi.fn(() => mockQuery),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((cb: any) => cb({ data: [], error: null }))
};

vi.mock('../../src/config/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            admin: {
                createUser: vi.fn()
            }
        },
        from: vi.fn(() => mockQuery)
    }
}));

vi.mock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { 
            id: 'test-teacher-id',
            school_id: 'school-123',
            role: 'teacher',
            email: 'teacher@school.com'
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

describe('Teacher Backend Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default behavior for mockQuery
        mockQuery.then.mockImplementation((cb: any) => cb({ data: [], error: null }));
        mockQuery.single.mockResolvedValue({ data: {}, error: null });
        mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    });

    describe('Assignment Management', () => {
        it('GET /api/assignments - Should list assignments', async () => {
            const mockAssignments = [{ id: 'a1', title: 'Math Homework' }];
            mockQuery.then.mockImplementation((cb: any) => cb({ data: mockAssignments, error: null }));

            const res = await request(app).get('/api/assignments');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        it('POST /api/assignments - Should create an assignment', async () => {
            const mockAssignment = { id: 'a1', title: 'New' };
            mockQuery.single.mockResolvedValue({ data: mockAssignment, error: null });

            const res = await request(app)
                .post('/api/assignments')
                .send({ title: 'New', class_id: 'c1' });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('New');
        });
    });

    describe('Attendance Management', () => {
        it('POST /api/attendance - Should save attendance', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ success: true }], error: null }));

            const res = await request(app)
                .post('/api/attendance')
                .send({ records: [{ studentId: 's1', status: 'Present', date: '2026-02-25' }] });

            expect(res.status).toBe(200); 
        });
    });

    describe('Lesson Plan Management', () => {
        it('GET /api/lesson-plans - Should list lesson plans', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ id: 'lp1' }], error: null }));

            const res = await request(app).get('/api/lesson-plans');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });

    describe('Quiz Management', () => {
        it('GET /api/quizzes - Should list quizzes', async () => {
            mockQuery.then.mockImplementation((cb: any) => cb({ data: [{ id: 'q1' }], error: null }));

            const res = await request(app).get('/api/quizzes');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });
    });
});
