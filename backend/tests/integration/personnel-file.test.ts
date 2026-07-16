/**
 * TEACHER PERSONNEL FILE & QUERY LETTERS (real database).
 *
 * Covers: assembled personnel file, permanent record creation + same-day-only
 * edit rule, query letter issue → teacher response (late flag) → admin close
 * (warning_issued auto-writes a warning record), teacher notification on
 * issue, access control (teacher sees only own file, cross-teacher and
 * cross-school isolation).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'pf-school', B = 'pf-main';
const ADMIN = 'pf-admin', TCH_U = 'pf-tch-u', TCH2_U = 'pf-tch2-u';
let teacherId = '', teacher2Id = '';

const tok = (id: string, role: string, branchId: string | null = null) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: branchId, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const asAdmin = () => tok(ADMIN, 'ADMIN');
const asTeacher = () => tok(TCH_U, 'TEACHER', B);
const asTeacher2 = () => tok(TCH2_U, 'TEACHER', B);

const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysFromToday = (n: number) => {
    const d = new Date(Date.now() + n * 86_400_000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function cleanup() {
    for (const m of ['queryLetter', 'teacherRecord', 'notification', 'teacher', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Teacher personnel file & query letters', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'PF', code: 'PF', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'PFM', is_main: true } });
        await prisma.user.create({ data: { id: ADMIN, email: 'pf-admin@x.com', password_hash: 'x', full_name: 'PF Admin', role: 'ADMIN' as any, school_id: S, branch_id: null } });
        for (const [uid, name] of [[TCH_U, 'PF Teacher'], [TCH2_U, 'PF Teacher Two']] as const) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: 'TEACHER' as any, school_id: S, branch_id: B } });
        }
        teacherId = (await prisma.teacher.create({ data: { user_id: TCH_U, school_id: S, branch_id: B, full_name: 'PF Teacher', subject_specialty: ['Maths'], curriculum_eligibility: ['Nigerian'] } })).id;
        teacher2Id = (await prisma.teacher.create({ data: { user_id: TCH2_U, school_id: S, branch_id: B, full_name: 'PF Teacher Two', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    let queryId = '';

    it('admin adds a permanent record (promotion) to the file', async () => {
        const res = await request(app).post('/api/personnel/records')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacherId, type: 'promotion', title: 'Promoted to HOD', details: 'Head of Maths' });
        expect(res.status).toBe(201);
        expect(res.body.type).toBe('promotion');
    });

    it('rejects an invalid record type', async () => {
        const res = await request(app).post('/api/personnel/records')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ teacher_id: teacherId, type: 'gossip', title: 'x' });
        expect(res.status).toBe(400);
    });

    it('teacher cannot add records', async () => {
        const res = await request(app).post('/api/personnel/records')
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ teacher_id: teacherId, type: 'commendation', title: 'Self praise' });
        expect(res.status).toBe(403);
    });

    it('records created on a previous day cannot be edited', async () => {
        const old = await (prisma as any).teacherRecord.create({
            data: { school_id: S, branch_id: B, teacher_id: teacherId, type: 'note', title: 'Old note' }
        });
        await (prisma as any).teacherRecord.update({
            where: { id: old.id }, data: { created_at: new Date(Date.now() - 2 * 86_400_000) }
        });
        const res = await request(app).put(`/api/personnel/records/${old.id}`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ title: 'Rewritten history' });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/day they were created/i);
    });

    it('admin issues a query letter and the teacher is notified in-app', async () => {
        const res = await request(app).post('/api/personnel/query-letters')
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({
                teacher_id: teacherId,
                subject: 'Unauthorized absence',
                reason: 'You were absent on Friday without approval. Explain in writing.',
                response_deadline: daysFromToday(3),
            });
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
        queryId = res.body.id;

        const notif = await prisma.notification.findFirst({
            where: { school_id: S, user_id: TCH_U, title: 'Query Letter Issued' }
        });
        expect(notif).toBeTruthy();
    });

    it('another teacher cannot respond to that query letter', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/respond`)
            .set('Authorization', `Bearer ${asTeacher2()}`)
            .send({ response_text: 'Not mine' });
        expect(res.status).toBe(404);
    });

    it('the addressed teacher responds on time (no late flag)', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/respond`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ response_text: 'I was at the hospital; medical report attached.', attachment_urls: ['/uploads/med.pdf'] });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('responded');
        expect(res.body.is_late_response).toBe(false);
    });

    it('a second response is rejected', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/respond`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ response_text: 'Adding more' });
        expect(res.status).toBe(400);
    });

    it('a response after the deadline is accepted but marked late', async () => {
        const lateLetter = await (prisma as any).queryLetter.create({
            data: {
                school_id: S, branch_id: B, teacher_id: teacherId,
                subject: 'Missing gradebook', reason: 'Explain missing entries.',
                issue_date: daysFromToday(-10), response_deadline: daysFromToday(-3),
            }
        });
        const res = await request(app).post(`/api/personnel/query-letters/${lateLetter.id}/respond`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ response_text: 'Apologies for the delayed response.' });
        expect(res.status).toBe(200);
        expect(res.body.is_late_response).toBe(true);
    });

    it('admin closes with "warning_issued" and a warning record is auto-added', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/close`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ outcome: 'warning_issued', outcome_note: 'Absence not pre-approved.' });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('warning_issued');

        const warning = await (prisma as any).teacherRecord.findFirst({
            where: { school_id: S, teacher_id: teacherId, type: 'warning' }
        });
        expect(warning).toBeTruthy();
        expect(warning.title).toMatch(/Unauthorized absence/);
    });

    it('a closed query cannot be closed again', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/close`)
            .set('Authorization', `Bearer ${asAdmin()}`)
            .send({ outcome: 'resolved' });
        expect(res.status).toBe(400);
    });

    it('teacher cannot close query letters', async () => {
        const res = await request(app).post(`/api/personnel/query-letters/${queryId}/close`)
            .set('Authorization', `Bearer ${asTeacher()}`)
            .send({ outcome: 'resolved' });
        expect(res.status).toBe(403);
    });

    it('admin fetches the assembled personnel file', async () => {
        const res = await request(app).get(`/api/personnel/teachers/${teacherId}/file`)
            .set('Authorization', `Bearer ${asAdmin()}`);
        expect(res.status).toBe(200);
        expect(res.body.teacher.full_name).toBe('PF Teacher');
        const types = res.body.records.map((r: any) => r.type);
        expect(types).toContain('promotion');
        expect(types).toContain('warning');
        expect(res.body.query_letters.length).toBeGreaterThanOrEqual(2);
        expect(res.body.query_letters.every((q: any) => 'is_overdue' in q)).toBe(true);
    });

    it('teacher fetches their own file but not a colleague\'s', async () => {
        const own = await request(app).get('/api/personnel/my-file')
            .set('Authorization', `Bearer ${asTeacher()}`);
        expect(own.status).toBe(200);
        expect(own.body.teacher.id).toBe(teacherId);

        const other = await request(app).get(`/api/personnel/teachers/${teacherId}/file`)
            .set('Authorization', `Bearer ${asTeacher2()}`);
        expect(other.status).toBe(403);
    });

    it('another school\'s admin cannot see the teacher\'s file', async () => {
        await prisma.school.create({ data: { id: 'pf-other-school', name: 'PF2', code: 'PF2', slug: 'pf-other-school', plan_type: 'enterprise', subscription_status: 'active' } }).catch(() => {});
        await prisma.user.create({ data: { id: 'pf-foreign-admin', email: 'pf-foreign@x.com', password_hash: 'x', full_name: 'Foreign Admin', role: 'ADMIN' as any, school_id: 'pf-other-school', branch_id: null } }).catch(() => {});
        const foreign = jwt.sign(
            { id: 'pf-foreign-admin', email: 'pf-foreign@x.com', role: 'ADMIN', school_id: 'pf-other-school', branch_id: null, allowed_branch_ids: [] },
            config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
        const res = await request(app).get(`/api/personnel/teachers/${teacherId}/file`)
            .set('Authorization', `Bearer ${foreign}`);
        expect(res.status).toBe(404);

        await prisma.user.delete({ where: { id: 'pf-foreign-admin' } }).catch(() => {});
        await prisma.school.delete({ where: { id: 'pf-other-school' } }).catch(() => {});
    });
});
