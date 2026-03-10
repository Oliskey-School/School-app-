import request from 'supertest';
import { app } from '../../src/app';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase to avoid real DB calls
vi.mock('../../src/config/supabase', () => ({
    supabase: {
        auth: {
            admin: {
                createUser: vi.fn()
            }
        },
        from: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis()
    }
}));

// Mock Auth Middleware to provide a school context
vi.mock('../../src/middleware/auth.middleware', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { 
            id: 'test-admin-id',
            email: 'admin@school.com',
            role: 'admin',
            school_id: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1' 
        };
        next();
    }
}));

describe('Backend Security: Student Validation Audit', () => {
    
    it('🚫 should return 400 Bad Request when mandatory fields are missing', async () => {
        // Empty payload (missing name, firstName, lastName, grade, section)
        const emptyPayload = {};

        const response = await request(app)
            .post('/api/students/enroll')
            .send(emptyPayload);

        // Assertions for security and stability
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Validation Error');
        expect(response.body).toHaveProperty('details');
        
        // Check that specific missing fields are flagged by the Yup schema
        const errorMessages = response.body.details;
        expect(errorMessages).toContain('name is a required field');
        expect(errorMessages).toContain('firstName is a required field');
        expect(errorMessages).toContain('lastName is a required field');
        expect(errorMessages).toContain('grade is a required field');
        expect(errorMessages).toContain('section is a required field');
        
        console.log('✅ Validation Audit Passed: Backend correctly rejected empty student record with 400.');
    });

    it('🚫 should return 400 when field types are invalid (e.g., non-numeric grade)', async () => {
        const invalidPayload = {
            name: "Test Student",
            firstName: "Test",
            lastName: "Student",
            grade: "Not ANumber", // Should be a number (0-12)
            section: "A"
        };

        const response = await request(app)
            .post('/api/students/enroll')
            .send(invalidPayload);

        expect(response.status).toBe(400);
        expect(response.body.details).toContain('grade must be a `number` type, but the final value was: `NaN` (cast from the value `"Not ANumber"`).');
    });

    it('🚫 should return 400 when numeric fields are out of bounds (grade > 12)', async () => {
        const outOfBoundsPayload = {
            name: "Test Student",
            firstName: "Test",
            lastName: "Student",
            grade: 99, // Max is 12
            section: "A"
        };

        const response = await request(app)
            .post('/api/students/enroll')
            .send(outOfBoundsPayload);

        expect(response.status).toBe(400);
        expect(response.body.details).toContain('grade must be less than or equal to 12');
    });
});
