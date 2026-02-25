
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
            id: 'test-parent-id',
            school_id: 'school-123',
            role: 'parent',
            email: 'parent@school.com'
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

describe('Parent Backend Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockQuery.then.mockImplementation((cb: any) => cb({ data: [], error: null }));
        mockQuery.single.mockResolvedValue({ data: {}, error: null });
        mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    });

    describe('Children Data Management', () => {
        it('GET /api/parents/me/children - Should list linked children', async () => {
            const mockChildren = [{ id: 's1', name: 'Child One' }];
            // The controller likely queries parents then students or a junction table
            mockQuery.then.mockImplementation((cb: any) => cb({ data: mockChildren, error: null }));

            const res = await request(app).get('/api/parents/me/children');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('Appointment Management', () => {
        it('POST /api/parents/appointments - Should create an appointment', async () => {
            mockQuery.single.mockResolvedValue({ data: { id: 'a1' }, error: null });

            const res = await request(app)
                .post('/api/parents/appointments')
                .send({ studentId: 's1', teacherId: 't1', date: '2026-03-01', reason: 'Discussion' });

            expect(res.status).toBe(201);
        });
    });

    describe('Volunteer Management', () => {
        it('POST /api/parents/volunteer-signup - Should signup for volunteering', async () => {
            mockQuery.single.mockResolvedValue({ data: { id: 'v1' }, error: null });

            const res = await request(app)
                .post('/api/parents/volunteer-signup')
                .send({ eventId: 'ev1', role: 'Helper' });

            expect(res.status).toBe(201);
        });
    });
});
