/**
 * REPORT CARD PERSISTENCE — end-to-end against a real database.
 *
 * Reproduces the production findings of 2026-09-18 and proves the fixes:
 *   - two subject teachers saving the same student at the same time used to
 *     silently lose one subject (both got 200) → now both subjects persist;
 *   - a Draft save could pull a Submitted card back to Draft → status only
 *     moves forward for teachers;
 *   - a parent could read Draft/Submitted grades from the per-term detail
 *     endpoint → 404 until Published;
 *   - three simultaneous first saves gave 1×200 + 2×500 → all succeed, one row;
 *   - nothing was audited → every save / submit / publish leaves an AuditLog
 *     row with actor, before/after per subject, student, term, session.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'rcp-school', B = 'rcp-main', CLASS = 'rcp-class';
const T1 = 'rcp-teacher-1', T2 = 'rcp-teacher-2', ADMIN = 'rcp-admin', PARENT = 'rcp-parent', STUDENT = 'rcp-student';
const TEACHER1 = 'rcp-tch-1', TEACHER2 = 'rcp-tch-2', PARENT_ROW = 'rcp-par-1', STUDENT_ROW = 'rcp-stu-1';
const TERM = 'First Term', SESSION = '2026/2027';

const token = (id: string, role: string) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: B, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

const rec = (subject: string, t1: number, t2: number, exam: number) => ({ subject, test1: t1, test2: t2, exam, total: t1 + t2 + exam, grade: 'B', remark: 'ok' });
const save = (who: string, role: string, records: any[], status = 'Draft', extra: any = {}) =>
    request(app).post('/api/academic/upsert-report-card').set('Authorization', `Bearer ${token(who, role)}`)
        .send({ studentId: STUDENT_ROW, term: TERM, session: SESSION, status, academicRecords: records, ...extra });
const details = (who: string, role: string) =>
    request(app).get(`/api/academic/report-card-details?studentId=${STUDENT_ROW}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`).set('Authorization', `Bearer ${token(who, role)}`);
const subjectsOf = (r: any) => (r.body?.academic_records || []).map((g: any) => `${g.subject}=${g.total}`).sort().join(',');

async function cleanup() {
    await prisma.auditLog.deleteMany({ where: { school_id: S } }).catch(() => {});
    for (const m of ['reportCard', 'academicPerformance', 'parentChild', 'classTeacher', 'studentEnrollment', 'student', 'parent', 'teacher', 'class', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Report card persistence', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'RCP', code: 'RCP', slug: S, plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'RCPMAIN', is_main: true } as any });
        await prisma.class.create({ data: { id: CLASS, school_id: S, branch_id: B, name: 'JSS 1A', grade: 7, section: 'A' } as any });
        for (const [uid, role, name] of [[T1, 'TEACHER', 'Maths Teacher'], [T2, 'TEACHER', 'English Teacher'], [ADMIN, 'ADMIN', 'Admin'], [PARENT, 'PARENT', 'Parent'], [STUDENT, 'STUDENT', 'Student']]) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: role as any, school_id: S, branch_id: B } as any });
        }
        await prisma.teacher.create({ data: { id: TEACHER1, user_id: T1, school_id: S, branch_id: B, full_name: 'Maths Teacher' } as any });
        await prisma.teacher.create({ data: { id: TEACHER2, user_id: T2, school_id: S, branch_id: B, full_name: 'English Teacher' } as any });
        await prisma.student.create({ data: { id: STUDENT_ROW, user_id: STUDENT, school_id: S, branch_id: B, full_name: 'Pupil One', grade: 7, status: 'Active' } as any });
        await prisma.studentEnrollment.create({ data: { student_id: STUDENT_ROW, class_id: CLASS, school_id: S, branch_id: B, status: 'Active' } as any });
        await prisma.classTeacher.create({ data: { class_id: CLASS, teacher_id: TEACHER1, school_id: S } as any });
        await prisma.classTeacher.create({ data: { class_id: CLASS, teacher_id: TEACHER2, school_id: S } as any });
        await prisma.parent.create({ data: { id: PARENT_ROW, user_id: PARENT, school_id: S, full_name: 'Parent' } as any });
        await prisma.parentChild.create({ data: { parent_id: PARENT_ROW, student_id: STUDENT_ROW, school_id: S } as any });
    }, 60000);
    afterAll(cleanup, 60000);

    it('saves, survives a fresh read, and edits update the same row', async () => {
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 42)])).status).toBe(200);
        expect(subjectsOf(await details(T1, 'TEACHER'))).toBe('Mathematics=72');
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 45)])).status).toBe(200);
        expect(subjectsOf(await details(T1, 'TEACHER'))).toBe('Mathematics=75');
        expect(await prisma.reportCard.count({ where: { school_id: S, student_id: STUDENT_ROW, term: TERM, session: SESSION } })).toBe(1);
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STUDENT_ROW } });
        expect(card?.created_by).toBe(T1);
        expect(card?.updated_by).toBe(T1);
    });

    it('two subject teachers saving at the same time both persist (no silent overwrite)', async () => {
        const [a, b] = await Promise.all([
            save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 45)]),
            save(T2, 'TEACHER', [rec('English', 12, 14, 50)]),
        ]);
        expect([a.status, b.status]).toEqual([200, 200]);
        // Both subjects are on the card (drafts are private, so read the row itself).
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STUDENT_ROW, term: TERM, session: SESSION } });
        const stored = ((card?.academic_records as any)?.grades || []).map((g: any) => `${g.subject}=${g.total}`).sort().join(',');
        expect(stored).toBe('English=76,Mathematics=75');
        // DRAFT PRIVACY: each teacher sees their own draft, not the other's; admin sees neither yet.
        expect(subjectsOf(await details(T1, 'TEACHER'))).toBe('Mathematics=75');
        expect(subjectsOf(await details(T2, 'TEACHER'))).toBe('English=76');
        expect(subjectsOf(await details(ADMIN, 'ADMIN'))).toBe('');
        expect((await details(ADMIN, 'ADMIN')).body.hidden_draft_subjects).toBe(2);
        const ap = await prisma.academicPerformance.findMany({ where: { school_id: S, student_id: STUDENT_ROW, term: TERM, session: SESSION } });
        expect(ap.map((r) => `${r.subject}=${r.score}`).sort()).toEqual(['English=76', 'Mathematics=75']);
    });

    it('a teacher cannot see another school-wide subject removed: only admin replaceAll removes subjects', async () => {
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 45)], 'Draft', { replaceAll: true })).status).toBe(200);
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STUDENT_ROW, term: TERM, session: SESSION } });
        expect(((card?.academic_records as any)?.grades || []).length).toBe(2); // replaceAll ignored for teachers
        // a missing session resolves to the same card the save used
        const noSession = await request(app).get(`/api/academic/report-card-details?studentId=${STUDENT_ROW}&term=${encodeURIComponent(TERM)}&session=undefined`).set('Authorization', `Bearer ${token(T1, 'TEACHER')}`);
        expect(subjectsOf(noSession)).toBe('Mathematics=75');
    });

    it('parent and student get 404 while Draft/Submitted, and see it once Published', async () => {
        expect((await details(PARENT, 'PARENT')).status).toBe(404);
        expect((await details(STUDENT, 'STUDENT')).status).toBe(404);
        expect((await save(T2, 'TEACHER', [rec('English', 12, 14, 50)], 'Submitted')).status).toBe(200);
        // submitted English is now visible to every staff member; Maths is still T1's private draft
        expect(subjectsOf(await details(ADMIN, 'ADMIN'))).toBe('English=76');
        expect(subjectsOf(await details(T1, 'TEACHER'))).toBe('English=76,Mathematics=75');
        expect((await details(PARENT, 'PARENT')).status).toBe(404);
        // a Draft save from the other teacher must not pull it back to Draft
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 46)], 'Draft')).status).toBe(200);
        expect((await details(ADMIN, 'ADMIN')).body.status).toBe('Submitted');
        // teacher cannot publish (capped to Submitted) — and that submits their subject
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 46)], 'Published')).status).toBe(200);
        expect((await details(ADMIN, 'ADMIN')).body.status).toBe('Submitted');
        expect(subjectsOf(await details(ADMIN, 'ADMIN'))).toBe('English=76,Mathematics=76');
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STUDENT_ROW } });
        const pub = await request(app).put(`/api/report-cards/${card!.id}/status`).set('Authorization', `Bearer ${token(ADMIN, 'ADMIN')}`).send({ status: 'Published' });
        expect(pub.status).toBe(200);
        const p = await details(PARENT, 'PARENT');
        expect(p.status).toBe(200);
        expect(p.body.status).toBe('Published');
        expect(subjectsOf(p)).toBe('English=76,Mathematics=76');
        expect((await details(STUDENT, 'STUDENT')).status).toBe(200);
        // published → locked for teachers, admins may still correct
        expect((await save(T1, 'TEACHER', [rec('Mathematics', 15, 15, 47)])).status).toBe(409);
        expect((await save(ADMIN, 'ADMIN', [rec('Mathematics', 15, 15, 47)])).status).toBe(200);
        expect(subjectsOf(await details(PARENT, 'PARENT'))).toBe('English=76,Mathematics=77');
    });

    it('records a complete audit trail: who, what, before/after, student, term, session', async () => {
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STUDENT_ROW } });
        const history = await request(app).get(`/api/academic/report-cards/${card!.id}/history`).set('Authorization', `Bearer ${token(ADMIN, 'ADMIN')}`);
        expect(history.status).toBe(200);
        const actions = history.body.map((h: any) => `${h.user_id}:${h.action}`);
        expect(actions[0]).toBe(`${T1}:report_card.create`);
        expect(actions).toContain(`${T2}:report_card.update`);        // English added by teacher 2
        expect(actions).toContain(`${T2}:report_card.submitted`);
        expect(actions).toContain(`${ADMIN}:report_card.published`);
        expect(actions).toContain(`${ADMIN}:report_card.update`);     // admin correction after publish
        const first = history.body[0];
        expect(first.metadata).toMatchObject({ student_id: STUDENT_ROW, term: TERM, session: SESSION });
        expect(first.new_values.grades.Mathematics.total).toBe(72);
        const edit = history.body.find((h: any) => h.user_id === T1 && h.action === 'report_card.update');
        expect(edit.old_values.grades.Mathematics.total).toBe(72);
        expect(edit.new_values.grades.Mathematics.total).toBe(75);
        // teachers cannot read history
        expect((await request(app).get(`/api/academic/report-cards/${card!.id}/history`).set('Authorization', `Bearer ${token(T1, 'TEACHER')}`)).status).toBe(403);
    });

    it('three simultaneous first saves for a new term produce one row and no failures', async () => {
        const mk = () => request(app).post('/api/academic/upsert-report-card').set('Authorization', `Bearer ${token(ADMIN, 'ADMIN')}`)
            .send({ studentId: STUDENT_ROW, term: 'Second Term', session: SESSION, status: 'Draft', academicRecords: [rec('Biology', 10, 10, 40)] });
        const rs = await Promise.all([mk(), mk(), mk()]);
        expect(rs.map((r) => r.status)).toEqual([200, 200, 200]);
        expect(await prisma.reportCard.count({ where: { school_id: S, student_id: STUDENT_ROW, term: 'Second Term', session: SESSION } })).toBe(1);
    });
});
