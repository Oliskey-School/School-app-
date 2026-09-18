/**
 * ATTENDANCE DAYS — one source of truth for "how many days" across the app.
 *
 * Proves, against a real database, that the day counts a report card shows,
 * the counts the teacher's class list shows and the counts a parent/student
 * sees all come from the same register summary; that a saved report card
 * snapshots them; that skills / psychomotor / attendance survive a reload; and
 * that a student's published-card list carries all of those sections.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'atd-school', B = 'atd-main', CLASS = 'atd-class';
const T1 = 'atd-teacher-1', ADMIN = 'atd-admin', PARENT = 'atd-parent', STUDENT = 'atd-student', STUDENT2 = 'atd-student-2', STRANGER = 'atd-stranger';
const TEACHER1 = 'atd-tch-1', PARENT_ROW = 'atd-par-1', STU = 'atd-stu-1', STU2 = 'atd-stu-2', STRANGER_ROW = 'atd-stu-3';
const TERM = 'First Term', SESSION = '2026/2027';

const token = (id: string, role: string) => jwt.sign(
    { id, email: `${id}@x.com`, role, school_id: S, branch_id: B, allowed_branch_ids: [] },
    config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
const auth = (who: string, role: string) => ({ Authorization: `Bearer ${token(who, role)}` });
const summary = (who: string, role: string, q: string) => request(app).get(`/api/attendance/summary?${q}`).set(auth(who, role));
const details = (who: string, role: string, sid = STU) =>
    request(app).get(`/api/academic/report-card-details?studentId=${sid}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`).set(auth(who, role));

async function cleanup() {
    await prisma.auditLog.deleteMany({ where: { school_id: S } }).catch(() => {});
    for (const m of ['attendance', 'reportCard', 'academicPerformance', 'parentChild', 'classTeacher', 'studentEnrollment', 'student', 'parent', 'teacher', 'class', 'user', 'branch'] as const) {
        await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
    }
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Attendance days across report card, teacher list and parent view', () => {
    beforeAll(async () => {
        await cleanup();
        await prisma.school.create({ data: { id: S, name: 'ATD', code: 'ATD', slug: S, plan_type: 'premium', subscription_status: 'active' } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'ATDMAIN', is_main: true } as any });
        await prisma.class.create({ data: { id: CLASS, school_id: S, branch_id: B, name: 'JSS 2A', grade: 8, section: 'A' } as any });
        for (const [uid, role, name] of [[T1, 'TEACHER', 'Class Teacher'], [ADMIN, 'ADMIN', 'Admin'], [PARENT, 'PARENT', 'Parent'], [STUDENT, 'STUDENT', 'Pupil'], [STUDENT2, 'STUDENT', 'Pupil Two'], [STRANGER, 'STUDENT', 'Stranger']]) {
            await prisma.user.create({ data: { id: uid, email: `${uid}@x.com`, password_hash: 'x', full_name: name, role: role as any, school_id: S, branch_id: B } as any });
        }
        await prisma.teacher.create({ data: { id: TEACHER1, user_id: T1, school_id: S, branch_id: B, full_name: 'Class Teacher' } as any });
        for (const [id, uid, name] of [[STU, STUDENT, 'Pupil'], [STU2, STUDENT2, 'Pupil Two'], [STRANGER_ROW, STRANGER, 'Stranger']]) {
            await prisma.student.create({ data: { id, user_id: uid, school_id: S, branch_id: B, full_name: name, grade: 8, status: 'Active' } as any });
            await prisma.studentEnrollment.create({ data: { student_id: id, class_id: CLASS, school_id: S, branch_id: B, status: 'Active' } as any });
        }
        await prisma.classTeacher.create({ data: { class_id: CLASS, teacher_id: TEACHER1, school_id: S } as any });
        await prisma.parent.create({ data: { id: PARENT_ROW, user_id: PARENT, school_id: S, full_name: 'Parent' } as any });
        await prisma.parentChild.create({ data: { parent_id: PARENT_ROW, student_id: STU, school_id: S } as any });

        // Register for First Term 2026/2027: 5 school days. Pupil: 3 present, 1 absent, 1 late.
        // Pupil Two: present every day. One mark in the NEXT term must not count.
        const days = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];
        const pupil = ['present', 'present', 'absent', 'late', 'present'];
        const rows: any[] = [];
        days.forEach((d, i) => {
            rows.push({ student_id: STU, class_id: CLASS, date: new Date(d), status: pupil[i], school_id: S, branch_id: B });
            rows.push({ student_id: STU2, class_id: CLASS, date: new Date(d), status: 'present', school_id: S, branch_id: B });
        });
        rows.push({ student_id: STU, class_id: CLASS, date: new Date('2027-02-01'), status: 'absent', school_id: S, branch_id: B });
        await prisma.attendance.createMany({ data: rows });
    }, 60000);
    afterAll(cleanup, 60000);

    it("teacher: whole-class summary counts school days and each pupil's marks for the term only", async () => {
        const r = await summary(T1, 'TEACHER', `classId=${CLASS}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`);
        expect(r.status).toBe(200);
        expect(r.body.students[STU]).toMatchObject({ total: 5, present: 3, absent: 1, late: 1, percentage: 80 });
        expect(r.body.students[STU2]).toMatchObject({ total: 5, present: 5, absent: 0, late: 0, percentage: 100 });
    });

    it('parent: sees their own child only; a student sees themselves only', async () => {
        const p = await summary(PARENT, 'PARENT', `studentId=${STU}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`);
        expect(p.status).toBe(200);
        expect(p.body.students[STU]).toMatchObject({ total: 5, present: 3, absent: 1, late: 1 });
        expect(p.body.students[STU2]).toBeUndefined();
        expect((await summary(PARENT, 'PARENT', `studentId=${STU2}&term=${encodeURIComponent(TERM)}`)).status).toBe(403);
        // class-wide request from a parent collapses to their children
        const pc = await summary(PARENT, 'PARENT', `classId=${CLASS}&term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`);
        expect(Object.keys(pc.body.students)).toEqual([STU]);
        const s = await summary(STUDENT, 'STUDENT', `term=${encodeURIComponent(TERM)}&session=${encodeURIComponent(SESSION)}`);
        expect(Object.keys(s.body.students)).toEqual([STU]);
    });

    it('report card shows the register days before anyone types them, and a save snapshots them', async () => {
        const before = await details(T1, 'TEACHER');
        expect(before.status).toBe(200);
        expect(before.body.attendance).toEqual({ total: 5, present: 3, absent: 1, late: 1 });
        expect(before.body.attendance_source).toBe('register');

        const saved = await request(app).post('/api/academic/upsert-report-card').set(auth(T1, 'TEACHER')).send({
            studentId: STU, term: TERM, session: SESSION, status: 'Draft',
            academicRecords: [{ subject: 'Mathematics', test1: 10, test2: 10, exam: 50, total: 70, grade: 'A', remark: 'Excellent' }],
            skills: { Punctuality: 'A', Neatness: 'B' },
            psychomotor: { Handwriting: 'B' },
            // no attendance sent — the register figures must be stored anyway
        });
        expect(saved.status).toBe(200);
        const row = await prisma.reportCard.findFirst({ where: { school_id: S, student_id: STU, term: TERM, session: SESSION } });
        const blob: any = row?.academic_records;
        expect(blob.attendance).toEqual({ total: 5, present: 3, absent: 1, late: 1 });
        expect(blob.skills).toEqual({ Punctuality: 'A', Neatness: 'B' });
        expect(blob.psychomotor).toEqual({ Handwriting: 'B' });
        expect(row?.attendance_count).toBe(3);

        const after = await details(T1, 'TEACHER');
        expect(after.body.attendance_source).toBe('saved');
        expect(after.body.skills).toEqual({ Punctuality: 'A', Neatness: 'B' });
        expect(after.body.psychomotor).toEqual({ Handwriting: 'B' });
        expect(after.body.attendance_register).toMatchObject({ total: 5, present: 3 });
    });

    it('typed attendance wins over the register; a save without the sections keeps them', async () => {
        const typed = await request(app).post('/api/academic/upsert-report-card').set(auth(ADMIN, 'ADMIN')).send({
            studentId: STU, term: TERM, session: SESSION, status: 'Draft', academicRecords: [],
            attendance: { total: 60, present: 55, absent: 4, late: 1 },
        });
        expect(typed.status).toBe(200);
        let d = await details(ADMIN, 'ADMIN');
        expect(d.body.attendance).toEqual({ total: 60, present: 55, absent: 4, late: 1 });
        expect(d.body.skills).toEqual({ Punctuality: 'A', Neatness: 'B' });

        // a subject teacher's save carries only scores
        const subj = await request(app).post('/api/academic/upsert-report-card').set(auth(T1, 'TEACHER')).send({
            studentId: STU, term: TERM, session: SESSION, status: 'Submitted',
            academicRecords: [{ subject: 'English', test1: 12, test2: 13, exam: 40, total: 65, grade: 'B', remark: 'Good' }],
        });
        expect(subj.status).toBe(200);
        d = await details(ADMIN, 'ADMIN');
        expect(d.body.attendance).toEqual({ total: 60, present: 55, absent: 4, late: 1 });
        expect(d.body.skills).toEqual({ Punctuality: 'A', Neatness: 'B' });
        expect(d.body.psychomotor).toEqual({ Handwriting: 'B' });
    });

    it("the student's published-card list carries subjects, skills, psychomotor, attendance and comments", async () => {
        await request(app).post('/api/academic/upsert-report-card').set(auth(ADMIN, 'ADMIN')).send({
            studentId: STU, term: TERM, session: SESSION, status: 'Published', academicRecords: [],
            teacherComment: 'Keep it up', principalComment: 'Well done',
        });
        const list = await request(app).get('/api/students/me/report-cards').set(auth(STUDENT, 'STUDENT'));
        expect(list.status).toBe(200);
        const card = list.body.find((c: any) => c.term === TERM && c.session === SESSION);
        expect(card).toBeTruthy();
        expect(card.academic_records.map((g: any) => g.subject).sort()).toEqual(['English', 'Mathematics']);
        expect(card.skills).toEqual({ Punctuality: 'A', Neatness: 'B' });
        expect(card.psychomotor).toEqual({ Handwriting: 'B' });
        expect(card.attendance).toEqual({ total: 60, present: 55, absent: 4, late: 1 });
        expect(card.teacher_comment).toBe('Keep it up');
        expect(card.principal_comment).toBe('Well done');
    });

    it('a published card saved before snapshots existed shows the register days to the student', async () => {
        await prisma.reportCard.create({ data: {
            school_id: S, branch_id: B, student_id: STU2, term: TERM, session: SESSION, status: 'Published', is_published: true,
            academic_records: { grades: [{ subject: 'Mathematics', test1: 10, test2: 10, exam: 60, total: 80, grade: 'A' }], skills: {}, psychomotor: {}, attendance: { total: 0, present: 0, absent: 0, late: 0 } } as any,
        } as any });
        const list = await request(app).get('/api/students/me/report-cards').set(auth(STUDENT2, 'STUDENT'));
        expect(list.body[0].attendance).toEqual({ total: 5, present: 5, absent: 0, late: 0 });
    });
});
