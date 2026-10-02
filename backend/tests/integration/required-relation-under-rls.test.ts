/**
 * A required Prisma relation must never turn an RLS-hidden row into a 500.
 *
 * StudentEnrollment.class is declared required. Row level security can
 * legitimately hide the Class (an enrolment pointing at a class in a branch the
 * caller cannot see), and Prisma then treats the empty relation as corrupt data
 * and throws "Inconsistent query result: Field class is required to return
 * data, got null". A student opening their OWN profile got a 500.
 *
 * Found by the four-role browser sweep against CI's seeded demo data; it did
 * not reproduce locally because the runtime seeder happens to put student and
 * class in the same branch.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { runAsPlatform } from '../../src/lib/tenantContext';

const S = 'rru-school', B1 = 'rru-b1', B2 = 'rru-b2';
const STUDENT_U = 'rru-stu-u';
const ids: Record<string, string> = {};

const studentAuth = () => ({
    Authorization: `Bearer ${jwt.sign(
        { id: STUDENT_U, email: 'rru-stu@x.com', role: 'STUDENT', school_id: S, branch_id: B1, allowed_branch_ids: [B1] },
        config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' })}`,
});

async function wipe() {
    await runAsPlatform(async () => {
        await prisma.studentEnrollment.deleteMany({ where: { school_id: S } }).catch(() => {});
        for (const m of ['student', 'class', 'user', 'branch'] as const) {
            await (prisma as any)[m].deleteMany({ where: { school_id: S } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: S } }).catch(() => {});
    });
}

describe('required relations hidden by RLS', () => {
    beforeAll(async () => {
        await wipe();
        await runAsPlatform(async () => {
            await prisma.school.create({ data: { id: S, name: 'RRU', code: 'RRU', slug: 'rru-school', plan_type: 'premium', subscription_status: 'active' } as any });
            await prisma.branch.create({ data: { id: B1, school_id: S, name: 'One', code: 'RRU1', is_main: true } as any });
            await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Two', code: 'RRU2', is_main: false } as any });
            await prisma.user.create({ data: { id: STUDENT_U, email: 'rru-stu@x.com', password_hash: 'x', full_name: 'RRU Student', role: 'STUDENT' as any, school_id: S, branch_id: B1 } as any });
            ids.student = (await prisma.student.create({ data: { user_id: STUDENT_U, school_id: S, branch_id: B1, full_name: 'RRU Student', grade: 7, section: 'A', school_generated_id: 'RRU_RRU1_STU_0001' } as any })).id;
            // The class lives in a branch the student cannot see, so RLS hides it
            // while the enrolment row itself stays visible.
            ids.hiddenClass = (await prisma.class.create({ data: { school_id: S, branch_id: B2, name: 'Other-branch class', grade: 7, section: 'B' } as any })).id;
            await prisma.studentEnrollment.create({ data: { school_id: S, branch_id: B1, student_id: ids.student, class_id: ids.hiddenClass, status: 'Active' } as any });
        });
    }, 120000);
    afterAll(wipe, 120000);

    it('a student whose enrolment points at a class they cannot see still gets their profile', async () => {
        const res = await request(app).get('/api/students/me').set(studentAuth());
        expect(res.status, `students/me failed: ${JSON.stringify(res.body).slice(0, 300)}`).toBe(200);
        expect(JSON.stringify(res.body)).not.toMatch(/Inconsistent query result/i);
    }, 120000);

    it('every student-facing endpoint that loads enrolments survives the hidden class', async () => {
        // students/me was the one the browser sweep caught; these share the
        // exact same required-relation include and failed the same way.
        const failures: string[] = [];
        for (const url of ['/api/students/me', '/api/students/me/dashboard', `/api/students/${ids.student}`, `/api/students/${ids.student}/subjects`, '/api/students/me/subjects']) {
            const res = await request(app).get(url).set(studentAuth());
            if (res.status >= 500) failures.push(`${url} → ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`);
        }
        expect(failures, ['endpoints still 500 on an RLS-hidden required relation:', ...failures].join(String.fromCharCode(10))).toEqual([]);
    }, 120000);

    it('the hidden class is reported as absent, not fabricated', async () => {
        const res = await request(app).get('/api/students/me').set(studentAuth());
        const body = JSON.stringify(res.body ?? '');
        // The student must not be handed a class from a branch they cannot see.
        expect(body, 'a class from another branch leaked into the profile').not.toContain('Other-branch class');
    }, 120000);
});
