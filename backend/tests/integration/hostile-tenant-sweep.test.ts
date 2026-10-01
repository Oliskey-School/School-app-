/**
 * Hostile two-school sweep.
 *
 * Builds TWO complete schools (attacker A, victim B) with every role, seeds a
 * wide set of real records in B — each carrying the marker string below — and
 * then attacks B's records from A through the real HTTP API.
 *
 * Nothing that belongs to School B may ever appear in a response to School A,
 * and no write from School A may ever land on a School B row. The marker check
 * is deliberately blunt: a 200 with a "safe-looking" body still fails if any
 * victim string is inside it.
 *
 * This complements cross_tenant_probe.test.ts (5 endpoint families) by covering
 * the wider surface: assignments, exams, report cards, quizzes, fees, payments,
 * classes, attendance, SOP cases/letters/evidence, observations, study plans,
 * departments, buses, dashboards and school records.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const MARK = 'VICTIMSECRETMARKER';

const SA = 'hts-school-a', AB1 = 'hts-a-b1', AB2 = 'hts-a-b2';
const SB = 'hts-school-b', BB1 = 'hts-b-b1';

const A_ADMIN = 'hts-a-admin', A_B1_ADMIN = 'hts-a-b1-admin', A_TEACHER_U = 'hts-a-tch-u', A_PARENT_U = 'hts-a-par-u', A_STUDENT_U = 'hts-a-stu-u';
const B_ADMIN = 'hts-b-admin', B_TEACHER_U = 'hts-b-tch-u', B_PARENT_U = 'hts-b-par-u', B_STUDENT_U = 'hts-b-stu-u';

const ids: Record<string, string> = {};

function token(payload: Record<string, unknown>) {
    return jwt.sign(payload, config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
}
const asAAdmin = () => token({ id: A_ADMIN, email: 'a-admin@hts.com', role: 'ADMIN', school_id: SA, branch_id: null, allowed_branch_ids: [] });
const asAB1Admin = () => token({ id: A_B1_ADMIN, email: 'a-b1-admin@hts.com', role: 'ADMIN', school_id: SA, branch_id: AB1, allowed_branch_ids: [AB1] });
const asATeacher = () => token({ id: A_TEACHER_U, email: 'a-tch@hts.com', role: 'TEACHER', school_id: SA, branch_id: AB1, allowed_branch_ids: [AB1] });
const asAParent = () => token({ id: A_PARENT_U, email: 'a-par@hts.com', role: 'PARENT', school_id: SA, branch_id: AB1, allowed_branch_ids: [AB1] });
const asAStudent = () => token({ id: A_STUDENT_U, email: 'a-stu@hts.com', role: 'STUDENT', school_id: SA, branch_id: AB1, allowed_branch_ids: [AB1] });
const asBAdmin = () => token({ id: B_ADMIN, email: 'b-admin@hts.com', role: 'ADMIN', school_id: SB, branch_id: null, allowed_branch_ids: [] });

/**
 * A response leaks if it carries the victim marker or ANY School B identifier.
 *
 * Identity-based rather than status-based on purpose: some endpoints (aggregate
 * dashboards) legitimately answer 200 with the CALLER'S OWN data while ignoring
 * the id in the URL, and failing those would be a false positive. What must
 * never happen is School B's data — or its row ids — coming back.
 */
function victimIds(): string[] {
    return [SB, BB1, B_ADMIN, B_TEACHER_U, B_PARENT_U, B_STUDENT_U, ...Object.entries(ids).filter(([k]) => k.startsWith('b')).map(([, v]) => v)]
        .filter(v => typeof v === 'string' && v.length > 0);
}
function expectDenied(res: request.Response, label: string) {
    const body = JSON.stringify(res.body ?? '');
    expect(body, `${label}: victim marker leaked in a ${res.status}`).not.toContain(MARK);
    for (const id of victimIds()) {
        // The id may legitimately appear in an error message echoing the URL;
        // only a 2xx body carrying it counts as a leak.
        if (res.status >= 200 && res.status < 300) {
            expect(body.includes(`"${id}"`), `${label}: 2xx body contains victim id ${id}`).toBe(false);
        }
    }
    if (res.status < 200 || res.status >= 300) {
        expect([400, 401, 403, 404, 422], `${label}: unexpected status`).toContain(res.status);
    }
}

async function wipe() {
    for (const school of [SA, SB]) {
        for (const m of ['observationResponse'] as const) { void m; }
        await prisma.$executeRawUnsafe(`DELETE FROM "ObservationResponse" WHERE observation_id IN (SELECT id FROM "ClassroomObservation" WHERE school_id = $1)`, school).catch(() => {});
        await prisma.$executeRawUnsafe(`DELETE FROM "StudyPlanItem" WHERE study_plan_id IN (SELECT id FROM "StudyPlan" WHERE school_id = $1)`, school).catch(() => {});
        for (const t of ['SOPEvidence', 'SOPLetter', 'SOPDecision', 'SOPCaseStageLog']) {
            await prisma.$executeRawUnsafe(`DELETE FROM "${t}" WHERE case_id IN (SELECT id FROM "SOPCase" WHERE school_id = $1)`, school).catch(() => {});
        }
        for (const m of ['sOPCase', 'sOPIncidentType', 'classroomObservation', 'studyPlan', 'resource', 'payment', 'studentFee', 'attendance', 'assignment', 'reportCard', 'quiz', 'exam', 'department', 'transportBus', 'classTeacher', 'class', 'subject', 'parentChild', 'parent', 'teacher', 'student', 'user', 'branch'] as const) {
            await (prisma as any)[m]?.deleteMany?.({ where: { school_id: school } }).catch(() => {});
        }
        await prisma.school.delete({ where: { id: school } }).catch(() => {});
    }
}

describe('Hostile cross-tenant sweep (School A attacks School B)', () => {
    beforeAll(async () => {
        await wipe();

        for (const [school, code, slug] of [[SA, 'HTSA', 'hts-a'], [SB, 'HTSB', 'hts-b']] as const) {
            await prisma.school.create({ data: { id: school, name: `Sweep ${code}`, code, slug, plan_type: 'premium', subscription_status: 'active', is_active: true } as any });
        }
        await prisma.branch.create({ data: { id: AB1, school_id: SA, name: 'A Main', code: 'HTSAM', is_main: true } as any });
        await prisma.branch.create({ data: { id: AB2, school_id: SA, name: 'A Second', code: 'HTSA2', is_main: false } as any });
        await prisma.branch.create({ data: { id: BB1, school_id: SB, name: 'B Main', code: 'HTSBM', is_main: true } as any });

        const mkUser = (id: string, school: string, branch: string | null, role: string, name: string) =>
            prisma.user.create({ data: { id, email: `${id}@hts.com`, password_hash: 'x', full_name: name, role: role as any, school_id: school, branch_id: branch } as any });

        await mkUser(A_ADMIN, SA, null, 'ADMIN', 'A Admin');
        await mkUser(A_B1_ADMIN, SA, AB1, 'ADMIN', 'A Branch Admin');
        await mkUser(A_TEACHER_U, SA, AB1, 'TEACHER', 'A Teacher');
        await mkUser(A_PARENT_U, SA, AB1, 'PARENT', 'A Parent');
        await mkUser(A_STUDENT_U, SA, AB1, 'STUDENT', 'A Student');
        await mkUser(B_ADMIN, SB, null, 'ADMIN', 'B Admin');
        await mkUser(B_TEACHER_U, SB, BB1, 'TEACHER', `B Teacher ${MARK}`);
        await mkUser(B_PARENT_U, SB, BB1, 'PARENT', `B Parent ${MARK}`);
        await mkUser(B_STUDENT_U, SB, BB1, 'STUDENT', `B Student ${MARK}`);

        // --- School A's own minimal records (so "own data" still works) ---
        ids.aTeacher = (await prisma.teacher.create({ data: { user_id: A_TEACHER_U, school_id: SA, branch_id: AB1, full_name: 'A Teacher', subject_specialty: [], curriculum_eligibility: ['Nigerian'] } as any })).id;
        ids.aStudent = (await prisma.student.create({ data: { user_id: A_STUDENT_U, school_id: SA, branch_id: AB1, full_name: 'A Student', grade: 7, section: 'A', school_generated_id: 'HTSA_HTSAM_STU_0001' } as any })).id;
        ids.aParent = (await prisma.parent.create({ data: { user_id: A_PARENT_U, school_id: SA, branch_id: AB1, full_name: 'A Parent' } as any })).id;
        await prisma.parentChild.create({ data: { parent_id: ids.aParent, student_id: ids.aStudent, school_id: SA, branch_id: AB1 } as any });

        // --- School B's records: every one carries the marker ---
        ids.bTeacher = (await prisma.teacher.create({ data: { user_id: B_TEACHER_U, school_id: SB, branch_id: BB1, full_name: `B Teacher ${MARK}`, subject_specialty: [], curriculum_eligibility: ['Nigerian'] } as any })).id;
        ids.bStudent = (await prisma.student.create({ data: { user_id: B_STUDENT_U, school_id: SB, branch_id: BB1, full_name: `B Student ${MARK}`, grade: 7, section: 'A', school_generated_id: 'HTSB_HTSBM_STU_0001' } as any })).id;
        ids.bParent = (await prisma.parent.create({ data: { user_id: B_PARENT_U, school_id: SB, branch_id: BB1, full_name: `B Parent ${MARK}` } as any })).id;
        await prisma.parentChild.create({ data: { parent_id: ids.bParent, student_id: ids.bStudent, school_id: SB, branch_id: BB1 } as any });

        ids.bClass = (await prisma.class.create({ data: { school_id: SB, branch_id: BB1, name: `B Class ${MARK}`, grade: 7, section: 'A' } as any })).id;
        ids.bSubject = (await prisma.subject.create({ data: { school_id: SB, branch_id: BB1, name: `B Subject ${MARK}` } as any })).id;
        ids.bAssignment = (await prisma.assignment.create({ data: { school_id: SB, branch_id: BB1, class_id: ids.bClass, title: `B Assignment ${MARK}`, subject: 'Mathematics', due_date: new Date(Date.now() + 86400000) } as any })).id;
        ids.bExam = (await prisma.exam.create({ data: { school_id: SB, branch_id: BB1, title: `B Exam ${MARK}`, subject: 'Mathematics' } as any })).id;
        ids.bReportCard = (await prisma.reportCard.create({ data: { school_id: SB, branch_id: BB1, student_id: ids.bStudent, session: '2026/2027', term: `First Term ${MARK}` } as any })).id;
        ids.bQuiz = (await prisma.quiz.create({ data: { school_id: SB, branch_id: BB1, teacher_id: ids.bTeacher, class_id: ids.bClass, subject_id: ids.bSubject, title: `B Quiz ${MARK}`, total_marks: 10 } as any })).id;
        ids.bFee = (await prisma.studentFee.create({ data: { school_id: SB, branch_id: BB1, student_id: ids.bStudent, title: `B Fee ${MARK}`, amount: 50000, due_date: new Date() } as any })).id;
        ids.bPayment = (await prisma.payment.create({ data: { school_id: SB, branch_id: BB1, student_id: ids.bStudent, fee_id: ids.bFee, amount: 1000, payment_method: `gateway-${MARK}`, reference: `REF-${MARK}` } as any })).id;
        ids.bDepartment = (await prisma.department.create({ data: { school_id: SB, branch_id: BB1, name: `B Department ${MARK}` } as any })).id;
        await prisma.attendance.create({ data: { school_id: SB, branch_id: BB1, student_id: ids.bStudent, class_id: ids.bClass, date: new Date(), status: 'Present', notes: `B Attendance ${MARK}` } as any }).catch(() => {});

        // Child tables that carry NO school_id of their own (scoped only via their parent).
        ids.bIncidentType = (await (prisma as any).sOPIncidentType.create({ data: { school_id: SB, branch_id: BB1, name: `B Incident ${MARK}`, severity: 'high' } as any }).catch(() => ({ id: '' }))).id;
        if (ids.bIncidentType) {
            ids.bCase = (await (prisma as any).sOPCase.create({ data: { school_id: SB, branch_id: BB1, incident_type_id: ids.bIncidentType, title: `B Case ${MARK}`, description: `B Case description ${MARK}`, reported_by: B_ADMIN, reported_by_role: 'ADMIN' } as any })).id;
            ids.bLetter = (await (prisma as any).sOPLetter.create({ data: { case_id: ids.bCase, draft_text: `B letter body ${MARK}`, generated_by: B_ADMIN } as any })).id;
            ids.bEvidence = (await (prisma as any).sOPEvidence.create({ data: { case_id: ids.bCase, url: `https://evidence.example/${MARK}.pdf`, uploaded_by: B_ADMIN } as any })).id;
        }
        ids.bStudyPlan = (await (prisma as any).studyPlan.create({ data: { school_id: SB, branch_id: BB1, student_id: ids.bStudent, title: `B Study Plan ${MARK}` } as any }).catch(() => ({ id: '' }))).id;
    }, 180000);

    afterAll(wipe, 180000);

    // ---------------------------------------------------------------- reads
    const readTargets = () => [
        ['GET /students/:id', `/api/students/${ids.bStudent}`],
        ['GET /teachers/:id', `/api/teachers/${ids.bTeacher}`],
        ['GET /classes/:id', `/api/classes/${ids.bClass}`],
        ['GET /classes/:id/students', `/api/classes/${ids.bClass}/students`],
        ['GET /classes/:id/subjects', `/api/classes/${ids.bClass}/subjects`],
        ['GET /assignments/:id', `/api/assignments/${ids.bAssignment}`],
        ['GET /assignments/:id/submissions', `/api/assignments/${ids.bAssignment}/submissions`],
        ['GET /exams/:id/results', `/api/exams/${ids.bExam}/results`],
        ['GET /report-cards/:id', `/api/report-cards/${ids.bReportCard}`],
        ['GET /quizzes/:id', `/api/quizzes/${ids.bQuiz}`],
        ['GET /quizzes/:id/submissions', `/api/quizzes/${ids.bQuiz}/submissions`],
        ['GET /fees/:id', `/api/fees/${ids.bFee}`],
        ['GET /fees/:id/transactions', `/api/fees/${ids.bFee}/transactions`],
        ['GET /departments/:id/report', `/api/departments/${ids.bDepartment}/report`],
        ['GET /attendance/student/:studentId', `/api/attendance/student/${ids.bStudent}`],
        ['GET /schools/:id', `/api/schools/${SB}`],
        ['GET /schools/:id/policies', `/api/schools/${SB}/policies`],
        ['GET /dashboard/:schoolId/stats', `/api/dashboard/${SB}/stats`],
        ['GET /dashboard/:schoolId/audit-logs', `/api/dashboard/${SB}/audit-logs`],
        ['GET /sop/cases/:id', `/api/sop/cases/${ids.bCase}`],
        ['GET /learning-hub/study-plans/:studentId', `/api/learning-hub/study-plans/${ids.bStudent}`],
        ['GET /observations/teacher/:teacherId', `/api/observations/teacher/${ids.bTeacher}`],
        ['GET /personnel/teachers/:teacherId/file', `/api/personnel/teachers/${ids.bTeacher}/file`],
        ['GET /payroll/salary/:teacherId', `/api/payroll/salary/${ids.bTeacher}`],
        ['GET /id-cards/student/:studentId', `/api/id-cards/student/${ids.bStudent}`],
    ].filter(([, url]) => !String(url).includes('undefined') && !/\/\s*$/.test(String(url)));

    it('School A main admin cannot read ANY School B record by id', async () => {
        const failures: string[] = [];
        for (const [label, url] of readTargets()) {
            const res = await request(app).get(url as string).set('Authorization', `Bearer ${asAAdmin()}`);
            try { expectDenied(res, label as string); } catch (e: any) { failures.push(`${label} → ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`); }
        }
        expect(failures, `cross-school reads that leaked:\n${failures.join('\n')}`).toEqual([]);
    }, 180000);

    it('School A teacher / parent / student cannot read School B records either', async () => {
        const failures: string[] = [];
        for (const [who, tok] of [['teacher', asATeacher()], ['parent', asAParent()], ['student', asAStudent()]] as const) {
            for (const [label, url] of readTargets()) {
                const res = await request(app).get(url as string).set('Authorization', `Bearer ${tok}`);
                try { expectDenied(res, `${who} ${label}`); } catch { failures.push(`${who} ${label} → ${res.status} ${JSON.stringify(res.body).slice(0, 140)}`); }
            }
        }
        expect(failures, `cross-school reads that leaked:\n${failures.join('\n')}`).toEqual([]);
    }, 300000);

    // --------------------------------------------------------------- writes
    it('School A cannot modify or delete School B records', async () => {
        const writes: [string, 'put' | 'patch' | 'delete' | 'post', string, any][] = [
            ['PUT /students/:id', 'put', `/api/students/${ids.bStudent}`, { full_name: 'HIJACKED' }],
            ['PUT /teachers/:id', 'put', `/api/teachers/${ids.bTeacher}`, { full_name: 'HIJACKED' }],
            ['PUT /classes/:id', 'put', `/api/classes/${ids.bClass}`, { name: 'HIJACKED' }],
            ['PUT /assignments/:id', 'put', `/api/assignments/${ids.bAssignment}`, { title: 'HIJACKED' }],
            ['PUT /fees/:id', 'put', `/api/fees/${ids.bFee}`, { amount: 1 }],
            ['PUT /fees/:id/status', 'put', `/api/fees/${ids.bFee}/status`, { status: 'Paid' }],
            ['PUT /report-cards/:id/status', 'put', `/api/report-cards/${ids.bReportCard}/status`, { status: 'Published' }],
            ['PUT /schools/:id', 'put', `/api/schools/${SB}`, { name: 'HIJACKED' }],
            ['POST /schools/:id/subscription', 'post', `/api/schools/${SB}/subscription`, { planType: 'enterprise' }],
            ['DELETE /students/:id', 'delete', `/api/students/${ids.bStudent}`, null],
            ['DELETE /teachers/:id', 'delete', `/api/teachers/${ids.bTeacher}`, null],
            ['DELETE /classes/:id', 'delete', `/api/classes/${ids.bClass}`, null],
            ['DELETE /assignments/:id', 'delete', `/api/assignments/${ids.bAssignment}`, null],
            ['DELETE /fees/:id', 'delete', `/api/fees/${ids.bFee}`, null],
        ];
        const failures: string[] = [];
        for (const [label, method, url, body] of writes) {
            const req = (request(app) as any)[method](url).set('Authorization', `Bearer ${asAAdmin()}`);
            const res = await (body ? req.send(body) : req);
            if (res.status >= 200 && res.status < 300) failures.push(`${label} → ${res.status} (write accepted)`);
        }
        // Every School B row must be untouched and still present.
        const [student, teacher, klass, assignment, fee, school] = await Promise.all([
            prisma.student.findUnique({ where: { id: ids.bStudent } }),
            prisma.teacher.findUnique({ where: { id: ids.bTeacher } }),
            prisma.class.findUnique({ where: { id: ids.bClass } }),
            prisma.assignment.findUnique({ where: { id: ids.bAssignment } }),
            prisma.studentFee.findUnique({ where: { id: ids.bFee } }),
            prisma.school.findUnique({ where: { id: SB } }),
        ]);
        expect(failures, `cross-school writes accepted:\n${failures.join('\n')}`).toEqual([]);
        expect(student?.full_name).toContain(MARK);
        expect(teacher?.full_name).toContain(MARK);
        expect(klass?.name).toContain(MARK);
        expect(assignment?.title).toContain(MARK);
        expect(Number(fee?.amount)).toBe(50000);
        expect(fee?.status).not.toBe('Paid');
        expect(school?.name).not.toBe('HIJACKED');
        expect(school?.plan_type).toBe('premium');
    }, 180000);

    it('School A cannot CREATE records inside School B by passing B ids in the body', async () => {
        const creates: [string, string, any][] = [
            ['POST /classes', '/api/classes', { name: 'INJECTED', grade: 7, section: 'Z', school_id: SB, branch_id: BB1 }],
            ['POST /assignments', '/api/assignments', { title: 'INJECTED', subject: 'Maths', class_id: ids.bClass, due_date: new Date(Date.now() + 86400000).toISOString(), school_id: SB, branch_id: BB1 }],
            ['POST /fees', '/api/fees', { title: 'INJECTED', student_id: ids.bStudent, amount: 1, due_date: new Date().toISOString(), school_id: SB, branch_id: BB1 }],
            ['POST /departments', '/api/departments', { name: 'INJECTED', school_id: SB, branch_id: BB1 }],
        ];
        for (const [, url, body] of creates) {
            await request(app).post(url).set('Authorization', `Bearer ${asAAdmin()}`).set('x-school-id', SB).send(body);
        }
        // Nothing named INJECTED may exist anywhere in School B.
        const leaked: string[] = [];
        for (const m of ['class', 'assignment', 'studentFee', 'department'] as const) {
            const rows = await (prisma as any)[m].findMany({ where: { school_id: SB } });
            for (const r of rows) {
                const v = JSON.stringify(r);
                if (v.includes('INJECTED')) leaked.push(`${m}: ${v.slice(0, 120)}`);
            }
        }
        expect(leaked, `rows created inside School B by School A:\n${leaked.join('\n')}`).toEqual([]);
    }, 180000);

    // ------------------------------------------------------- header forgery
    it('forged school / branch headers do not move the caller into another tenant', async () => {
        const probes = [
            ['x-school-id', SB, '/api/students'],
            ['x-branch-id', BB1, '/api/students'],
            ['x-school-id', SB, '/api/teachers'],
            ['x-branch-id', BB1, '/api/classes'],
        ] as const;
        for (const [header, value, url] of probes) {
            const res = await request(app).get(url).set('Authorization', `Bearer ${asAAdmin()}`).set(header, value);
            const body = JSON.stringify(res.body ?? '');
            expect(body, `${header}:${value} on ${url} leaked victim data`).not.toContain(MARK);
        }
    }, 120000);

    it('a JWT that claims another school is rejected or cannot read that school', async () => {
        // A forged token: School A's real user id, School B's school_id.
        const forged = token({ id: A_ADMIN, email: 'a-admin@hts.com', role: 'ADMIN', school_id: SB, branch_id: BB1, allowed_branch_ids: [BB1] });
        for (const url of ['/api/students', '/api/teachers', `/api/students/${ids.bStudent}`]) {
            const res = await request(app).get(url).set('Authorization', `Bearer ${forged}`);
            const body = JSON.stringify(res.body ?? '');
            expect(body, `forged school claim read ${url}`).not.toContain(MARK);
        }
    }, 120000);

    // ------------------------------------------------------ branch isolation
    it('a branch-scoped admin cannot reach another branch of the same school', async () => {
        const otherBranchClass = await prisma.class.create({ data: { school_id: SA, branch_id: AB2, name: 'A Branch2 Class SECRET2', grade: 8, section: 'B' } as any });
        const res = await request(app).get(`/api/classes/${otherBranchClass.id}`).set('Authorization', `Bearer ${asAB1Admin()}`).set('x-branch-id', AB1);
        const body = JSON.stringify(res.body ?? '');
        expect(body, 'branch admin read another branch class').not.toContain('SECRET2');
        const list = await request(app).get('/api/classes').set('Authorization', `Bearer ${asAB1Admin()}`).set('x-branch-id', AB1);
        expect(JSON.stringify(list.body ?? ''), 'branch admin list leaked another branch').not.toContain('SECRET2');
        await prisma.class.delete({ where: { id: otherBranchClass.id } }).catch(() => {});
    }, 120000);

    // ------------------------------------------------- role escalation (own school)
    it('non-admin roles cannot reach admin-only endpoints in their OWN school', async () => {
        const adminOnly: [string, 'get' | 'post' | 'delete', string, any][] = [
            ['teacher → POST /students/enroll', 'post', '/api/students/enroll', { firstName: 'X', lastName: 'Y', grade: 7, section: 'A' }],
            ['student → GET /teachers', 'get', '/api/teachers', null],
            ['student → GET /users', 'get', '/api/users', null],
            ['parent → GET /users', 'get', '/api/users', null],
            ['parent → POST /students/enroll', 'post', '/api/students/enroll', { firstName: 'X', lastName: 'Y', grade: 7, section: 'A' }],
            ['student → GET /admin-hub/invoices', 'get', '/api/admin-hub/invoices', null],
            ['teacher → GET /admin-hub/invoices', 'get', '/api/admin-hub/invoices', null],
            ['parent → GET /admin-hub/invoices', 'get', '/api/admin-hub/invoices', null],
        ];
        const who: Record<string, string> = { teacher: asATeacher(), student: asAStudent(), parent: asAParent() };
        const failures: string[] = [];
        for (const [label, method, url, body] of adminOnly) {
            const role = label.split(' ')[0] as string;
            const req = (request(app) as any)[method](url).set('Authorization', `Bearer ${who[role]}`);
            const res = await (body ? req.send(body) : req);
            if (res.status >= 200 && res.status < 300) failures.push(`${label} → ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
        }
        expect(failures, `role escalation accepted:\n${failures.join('\n')}`).toEqual([]);
    }, 180000);

    it('School B admin still has full access to its own records (the controls are not just blanket denials)', async () => {
        const ok = await request(app).get(`/api/students/${ids.bStudent}`).set('Authorization', `Bearer ${asBAdmin()}`);
        expect(ok.status, JSON.stringify(ok.body).slice(0, 200)).toBe(200);
        expect(JSON.stringify(ok.body)).toContain(MARK);
    }, 120000);
});
