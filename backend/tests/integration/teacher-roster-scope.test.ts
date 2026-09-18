/**
 * TEACHER ROSTER SCOPE — "what the teacher can see, the teacher can save".
 *
 * Production 2026-09-18: the gradebook listed a student for the teacher's
 * class (the roster falls back to grade/section when the class has no
 * enrollment register) but saving that student's score answered
 * 403 "You are not assigned to this student's class", because the save
 * re-checked membership with enrollment rows only. Result: "Saved 0 of 1".
 * The roster rule and the permission rule are now the same function.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'trs-school', B = 'trs-main';
const CLASS_NO_REGISTER = 'trs-class-fallback';   // no StudentEnrollment rows
const CLASS_OTHER = 'trs-class-other';            // a class this teacher does not teach
const T1 = 'trs-teacher-1', T2 = 'trs-teacher-2', TEACHER1 = 'trs-tch-1', TEACHER2 = 'trs-tch-2';
const S_FALLBACK = 'trs-stu-fallback', S_OTHER = 'trs-stu-other', U1 = 'trs-u-1', U2 = 'trs-u-2';
const TERM = 'First Term', SESSION = '2026/2027';

const token = (id: string, role: string) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: B, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const auth = (who: string, role = 'TEACHER') => ({ Authorization: `Bearer ${token(who, role)}` });
const rec = { subject: 'English Language', test1: 12, test2: 16, exam: 0, total: 28, grade: 'F', remark: 'Needs Improvement' };
const save = (who: string, studentId: string) => request(app).post('/api/academic/upsert-report-card').set(auth(who))
    .send({ studentId, term: TERM, session: SESSION, status: 'Draft', academicRecords: [rec] });

async function cleanup() {
    await prisma.auditLog.deleteMany({ where: { school_id: S } }).catch(() => {});
    for (const m of ['reportCard', 'academicPerformance', 'classTeacher', 'studentEnrollment', 'student', 'teacher', 'class', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Teacher roster scope', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'TRS', code: 'TRS', slug: S, plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'TRSMAIN', is_main: true } as any });
        await prisma.class.create({ data: { id: CLASS_NO_REGISTER, school_id: S, branch_id: B, name: 'SSS 3', grade: 12, section: 'A' } as any });
        await prisma.class.create({ data: { id: CLASS_OTHER, school_id: S, branch_id: B, name: 'JSS 1', grade: 7, section: 'A' } as any });
        for (const [uid, name] of [[T1, 'English Teacher'], [T2, 'Other Teacher'], [U1, 'Amaka'], [U2, 'Other Pupil']]) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: (uid.startsWith('trs-teacher') ? 'TEACHER' : 'STUDENT') as any, school_id: S, branch_id: B } as any });
        }
        await prisma.teacher.create({ data: { id: TEACHER1, user_id: T1, school_id: S, branch_id: B, full_name: 'English Teacher' } as any });
        await prisma.teacher.create({ data: { id: TEACHER2, user_id: T2, school_id: S, branch_id: B, full_name: 'Other Teacher' } as any });
        // Amaka: grade 12 A in this branch, but NO enrollment row anywhere.
        await prisma.student.create({ data: { id: S_FALLBACK, user_id: U1, school_id: S, branch_id: B, full_name: 'Amaka Okafor', grade: 12, section: 'A', status: 'Active' } as any });
        // Other pupil: enrolled in the class this teacher does not teach.
        await prisma.student.create({ data: { id: S_OTHER, user_id: U2, school_id: S, branch_id: B, full_name: 'Other Pupil', grade: 7, section: 'A', status: 'Active' } as any });
        await prisma.studentEnrollment.create({ data: { student_id: S_OTHER, class_id: CLASS_OTHER, school_id: S, branch_id: B, status: 'Active' } as any });
        await prisma.classTeacher.create({ data: { class_id: CLASS_NO_REGISTER, teacher_id: TEACHER1, school_id: S } as any });
        await prisma.classTeacher.create({ data: { class_id: CLASS_OTHER, teacher_id: TEACHER2, school_id: S } as any });
    }, 60000);
    afterAll(cleanup, 60000);

    it('a student listed on the class roster can be saved by that class teacher', async () => {
        const roster = await request(app).get(`/api/students/class/${CLASS_NO_REGISTER}`).set(auth(T1));
        expect(roster.status).toBe(200);
        expect(roster.body.map((s: any) => s.id)).toContain(S_FALLBACK);

        const r = await save(T1, S_FALLBACK);
        expect(r.status).toBe(200);

        const d = await request(app).get(`/api/academic/report-card-details?studentId=${S_FALLBACK}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`).set(auth(T1));
        expect(d.status).toBe(200);
        expect(d.body.academic_records.find((g: any) => g.subject === 'English Language')?.total).toBe(28);
        const g = await request(app).post('/api/academic/grades').set(auth(T1)).send({ studentIds: [S_FALLBACK], subject: 'English Language', term: TERM, session: SESSION });
        expect(g.status).toBe(200);
        expect(Array.isArray(g.body) ? g.body.length : 0).toBeGreaterThan(0);
    });

    it('a teacher still cannot save for a student outside their classes', async () => {
        expect((await save(T1, S_OTHER)).status).toBe(403);
        expect((await save(T2, S_FALLBACK)).status).toBe(403);
        expect((await request(app).get(`/api/students/class/${CLASS_NO_REGISTER}`).set(auth(T2))).status).toBe(403);
    });

    it('class rankings cover the roster, not only enrollment rows', async () => {
        const r = await request(app).post('/api/academic/calculate-rankings').set(auth(T1)).send({ classId: CLASS_NO_REGISTER, term: TERM, session: SESSION });
        expect(r.status).toBe(200);
        const card = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: S_FALLBACK, term: TERM, session: SESSION } });
        expect(card?.position_in_class).toBe(1);
        expect(card?.total_students_in_class).toBe(1);
    });
});
