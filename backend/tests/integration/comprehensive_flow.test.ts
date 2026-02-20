
import request from 'supertest';
import { app } from '../../src/app';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../../src/config/supabase';

// --- Mocks ---
// Mock Supabase globally for this test suite
vi.mock('../../src/config/supabase', () => ({
    supabase: {
        auth: {
            getUser: vi.fn(),
            admin: {
                createUser: vi.fn()
            }
        },
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            maybeSingle: vi.fn() // Add this if needed
        }))
    }
}));

// Mock Auth Middleware to simulate a logged-in user
vi.mock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { 
            id: 'test-user-id',
            school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
            role: 'admin',
            email: 'admin@school.com'
        };
        next();
    }
}));

describe('Comprehensive Backend Integration Tests', () => {
    const schoolId = 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Teacher Management Flow', () => {
        it('POST /api/teachers - Should create a teacher', async () => {
            // Mock Supabase insert response
            const mockTeacher = { id: 'teacher-123', name: 'John Doe', email: 'john@school.com' };
            (supabase.from as any).mockImplementation(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockTeacher, error: null })
            }));

            const res = await request(app)
                .post('/api/teachers')
                .send({ name: 'John Doe', email: 'john@school.com', subjects: ['Math'] });

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('John Doe');
        });

        it('GET /api/teachers - Should list teachers', async () => {
            const mockTeachers = [{ id: '1', name: 'T1' }, { id: '2', name: 'T2' }];
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: mockTeachers, error: null })
            }));

            const res = await request(app).get('/api/teachers');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('Class Management Flow', () => {
        it('GET /api/classes - Should return classes list', async () => {
            const mockClasses = [{ id: 'c1', grade: 10, section: 'A' }];
            (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                // Use a chain that resolves at the end
                then: (cb: any) => cb({ data: mockClasses, error: null }) 
            }));
            
            // Fix mock for specific chain if needed or use simple resolution
             (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockImplementation(function(this: any) { return this; }), // allow chaining order
                then: (cb: any) => cb({ data: mockClasses, error: null })
            }));

            const res = await request(app).get('/api/classes');
            // Depending on how controller awaits, might need more specific mock structure
            // Let's assume controller does await ClassService.getClasses
            
            // Re-mock for simplicity to match service structure
             (supabase.from as any).mockImplementation(() => ({
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                then: (cb: any) => cb({ data: mockClasses, error: null }) // simplified promise
            }));

            expect(res.status).toBe(200);
            // Validating response structure
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    describe('Fee Management Flow', () => {
        it('POST /api/fees - Should create a fee record', async () => {
            const mockFee = { id: 'fee-1', title: 'Tuition', amount: 50000 };
            (supabase.from as any).mockImplementation(() => ({
                insert: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: mockFee, error: null })
            }));

            const res = await request(app)
                .post('/api/fees')
                .send({ studentId: 'stu-1', title: 'Tuition', amount: 50000 });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Tuition');
        });
    });

    describe('Health Check & Error Handling', () => {
        it('GET / - Should return 200 OK', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        it('GET /unknown-route - Should return 404', async () => {
            const res = await request(app).get('/api/unknown-route');
            expect(res.status).toBe(404);
        });
    });
});
