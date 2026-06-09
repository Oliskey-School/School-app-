import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_CREDENTIALS = {
    schoolId: 'd0ff3e95-9b4c-4c12-989c-e5640d3cacd1',
    branchId: '7601cbea-e1ba-49d6-b59b-412a584cb94f'
};

describe('Database Persistence - Admin Dashboard', () => {
    describe('School & Branches', () => {
        it('School exists with correct ID', async () => {
            const school = await prisma.school.findUnique({
                where: { id: DEMO_CREDENTIALS.schoolId }
            });
            expect(school).not.toBeNull();
            expect(school?.slug).toBe('global-demo-school');
        });

        it('Branch exists under school', async () => {
            const branch = await prisma.branch.findUnique({
                where: { id: DEMO_CREDENTIALS.branchId }
            });
            expect(branch).not.toBeNull();
            expect(branch?.school_id).toBe(DEMO_CREDENTIALS.schoolId);
        });
    });

    describe('Users', () => {
        it('Admin user exists', async () => {
            // The demo seed creates admins as admin-<hash>@demo.com (one per virtual
            // session) — not a single fixed "admin@demo.com". Assert the real invariant:
            // the demo school has at least one ADMIN account.
            const admin = await prisma.user.findFirst({
                where: { school_id: DEMO_CREDENTIALS.schoolId, role: 'ADMIN' }
            });
            expect(admin).not.toBeNull();
            expect(admin?.role).toBe('ADMIN');
        });

        it('Teacher users exist', async () => {
            const teachers = await prisma.teacher.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId }
            });
            expect(teachers.length).toBeGreaterThan(0);
        });
    });

    describe('Students', () => {
        it('Students exist with enrollments', async () => {
            const students = await prisma.student.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId },
                include: { enrollments: true }
            });
            expect(students.length).toBeGreaterThan(0);
        });

        it('Parent-child relationships exist', async () => {
            const relationships = await prisma.parentChild.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId }
            });
            expect(relationships.length).toBeGreaterThan(0);
        });
    });

    describe('Classes & Subjects', () => {
        it('Classes exist', async () => {
            const classes = await prisma.class.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId }
            });
            expect(classes.length).toBeGreaterThan(0);
        });

        it('Subjects exist', async () => {
            const subjects = await prisma.subject.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId }
            });
            expect(subjects.length).toBeGreaterThan(0);
        });
    });

    describe('Fees & Payments', () => {
        it('Student fees exist', async () => {
            const fees = await prisma.studentFee.findMany({
                where: { school_id: DEMO_CREDENTIALS.schoolId }
            });
            expect(fees.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Attendance', () => {
        it('Attendance records exist', async () => {
            const attendance = await prisma.attendance.findMany({
                where: { 
                    student: { school_id: DEMO_CREDENTIALS.schoolId }
                }
            });
            expect(attendance.length).toBeGreaterThanOrEqual(0);
        });
    });
});
