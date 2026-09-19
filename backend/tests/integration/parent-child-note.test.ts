/**
 * "A Note About <child>" on the parent home is about ACADEMIC difficulty only,
 * names the subjects, and calls out the core subjects (Mathematics / English).
 * A flag raised for fees / lateness / behaviour alone produces no note.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = '7d5f1c1e-3333-4333-8333-333333333333', B = 'pcn-main';
const PARENT_USER = 'pcn-parent', PARENT = 'pcn-par-1';
const kids = [
    { id: 'pcn-stu-core', user: 'pcn-u-core', name: 'Amara Core', reasons: [{ category: 'Academic', detail: 'Low scores in Mathematics, English Language', points: 10 }] },
    { id: 'pcn-stu-many', user: 'pcn-u-many', name: 'Bayo Many', reasons: [{ category: 'Academic', detail: 'Low scores in Biology, Chemistry, Physics', points: 15 }] },
    { id: 'pcn-stu-fees', user: 'pcn-u-fees', name: 'Chidi Fees', reasons: [{ category: 'Fees', detail: '2 unpaid fees past due', points: 10 }, { category: 'Lateness', detail: 'Arrived late 4 times', points: 5 }] },
];
const token = jwt.sign({ id: PARENT_USER, email: 'p@x.com', role: 'PARENT', school_id: S, branch_id: B, allowed_branch_ids: [] }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

async function cleanup() {
    for (const m of ['studentRiskFlag', 'parentChild', 'student', 'parent', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Parent child-support note', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'PCN', code: 'PCN', slug: 'pcn-school', plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'PCNMAIN', is_main: true } as any });
        await prisma.user.create({ data: { id: PARENT_USER, email: 'p@x.com', password_hash: 'x', full_name: 'Parent', role: 'PARENT' as any, school_id: S, branch_id: B } as any });
        await prisma.parent.create({ data: { id: PARENT, user_id: PARENT_USER, school_id: S, full_name: 'Parent' } as any });
        for (const k of kids) {
            await prisma.user.create({ data: { id: k.user, email: `${k.user}@x.com`, password_hash: 'x', full_name: k.name, role: 'STUDENT' as any, school_id: S, branch_id: B } as any });
            await prisma.student.create({ data: { id: k.id, user_id: k.user, school_id: S, branch_id: B, full_name: k.name, grade: 7, status: 'Active' } as any });
            await prisma.parentChild.create({ data: { parent_id: PARENT, student_id: k.id, school_id: S } as any });
            await (prisma as any).studentRiskFlag.create({ data: { school_id: S, branch_id: B, student_id: k.id, score: 60, level: 'High', reasons: k.reasons, status: 'Active' } });
        }
    }, 60000);
    afterAll(cleanup, 60000);

    it('names the subjects, flags core subjects, and stays silent for non-academic flags', async () => {
        const r = await request(app).get('/api/risk/children').set({ Authorization: `Bearer ${token}` });
        expect(r.status).toBe(200);
        const byId = Object.fromEntries(r.body.map((n: any) => [n.student_id, n]));
        expect(byId['pcn-stu-core'].message).toMatch(/Amara is struggling in Mathematics and English Language this term/);
        expect(byId['pcn-stu-core'].message).toMatch(/core subjects/);
        expect(byId['pcn-stu-core'].core_subjects).toEqual(['Mathematics', 'English Language']);
        expect(byId['pcn-stu-many'].message).toMatch(/low in most subjects this term \(Biology, Chemistry, Physics\)/);
        expect(byId['pcn-stu-fees']).toBeUndefined(); // fees/lateness only → no note to the parent
    });
});
