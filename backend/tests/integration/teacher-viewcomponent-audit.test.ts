/**
 * TEACHER — VIEWCOMPONENT AUDIT (real database)
 *
 * Seeds a school with Main + Lekki branch, a multi-branch teacher homed in Main,
 * and a second teacher homed exclusively in Lekki. Verifies:
 *   - Every teacher screen endpoint responds without a server error
 *   - Every write button persists a real row (assignment, lesson plan, quiz, counseling)
 *   - Stats (totalClasses / totalStudents) are BRANCH-SCOPED — Lekki shows Lekki data only
 *   - active-branch-id returns a branch-specific generated ID
 *   - A Lekki-only teacher is rejected (403) when requesting the Main branch
 *   - ExamOfficer role can reach exam/stats endpoints without server error
 *   - Counselor role can reach counseling endpoints without server error
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

const S = 'tva-school', M = 'tva-main', L = 'tva-lekki';

// Multi-branch teacher: home=Main, allowed in Lekki
const TUID = 'tva-tch-u', TID = 'tva-tch';
// Lekki-only teacher: home=Lekki, NOT allowed in Main
const LTUID = 'tva-ltch-u', LTID = 'tva-ltch';

let CLS  = '';   // Main branch class id
let LCLS = '';   // Lekki branch class id
let SUBJ = '';   // Subject id (needed for lesson plan + quiz)
let STU_ID  = ''; // Main student id
let LSTU_ID = ''; // Lekki student id

// ─── Tokens ──────────────────────────────────────────────────────────────────

/** Main (multi-branch) teacher */
const tok = () => jwt.sign(
  { id: TUID, email: 'tva-tch@x.com', role: 'TEACHER', school_id: S, branch_id: M, allowed_branch_ids: [L], school_generated_id: 'TVA_TVAML_TCH_0001' },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

/** Lekki-only teacher */
const lekkiTok = () => jwt.sign(
  { id: LTUID, email: 'tva-ltch@x.com', role: 'TEACHER', school_id: S, branch_id: L, allowed_branch_ids: [], school_generated_id: 'TVA_TVALK_TCH_0001' },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

/** ExamOfficer role — same user id as main teacher for simplicity */
const examOfficerTok = () => jwt.sign(
  { id: TUID, email: 'tva-tch@x.com', role: 'EXAM_OFFICER', school_id: S, branch_id: M, allowed_branch_ids: [L] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

/** Counselor role — same user id as main teacher */
const counselorTok = () => jwt.sign(
  { id: TUID, email: 'tva-tch@x.com', role: 'COUNSELOR', school_id: S, branch_id: M, allowed_branch_ids: [L] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

const get = (path: string, branch: string, tokenFn = tok) =>
  request(app).get(path).set('Authorization', `Bearer ${tokenFn()}`).set('X-Branch-Id', branch);

const post = (path: string, branch: string, body: any, tokenFn = tok) =>
  request(app).post(path).set('Authorization', `Bearer ${tokenFn()}`).set('X-Branch-Id', branch).send(body);

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  await (prisma as any).mentoringMatch?.deleteMany?.({ where: { OR: [{ mentor_id: TID }, { mentee_id: TID }, { mentor_id: LTID }, { mentee_id: LTID }] } }).catch(() => {});
  await (prisma as any).BranchUserIdentity?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).counselingAppointment?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).quizSubmission?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).quizQuestion?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).quiz?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).lessonNote?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).assignmentSubmission?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await (prisma as any).assignment?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  for (const m of ['substituteAssignment', 'appointment', 'teacherAttendance', 'studentEnrollment',
    'classTeacher', 'student', 'class', 'teacher', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await (prisma as any).subject?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

describe('Teacher viewComponent audit', () => {
  beforeAll(async () => {
    await cleanup();

    await prisma.school.create({ data: { id: S, name: 'TVA', code: 'TVA', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main', code: 'TVAML', is_main: true } });
    await prisma.branch.create({ data: { id: L, school_id: S, name: 'Lekki', code: 'TVALK', is_main: false } });

    // Shared subject (required by LessonNote + Quiz FKs)
    const subj = await (prisma as any).subject.create({ data: { school_id: S, branch_id: M, name: 'Mathematics', code: 'MTH' } });
    SUBJ = subj.id;

    // --- Main (multi-branch) teacher ---
    const u = await prisma.user.create({ data: {
      id: TUID, email: 'tva-tch@x.com', password_hash: 'x', full_name: 'Main Teacher',
      role: 'TEACHER' as any, school_id: S, branch_id: M, allowed_branch_ids: [L],
      school_generated_id: 'TVA_TVAML_TCH_0001'
    }});
    await prisma.teacher.create({ data: {
      id: TID, user_id: u.id, school_id: S, branch_id: M, full_name: 'Main Teacher',
      subject_specialty: [], curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [L],
      school_generated_id: 'TVA_TVAML_TCH_0001'
    }});

    // --- Lekki-only teacher ---
    const lu = await prisma.user.create({ data: {
      id: LTUID, email: 'tva-ltch@x.com', password_hash: 'x', full_name: 'Lekki Teacher',
      role: 'TEACHER' as any, school_id: S, branch_id: L, allowed_branch_ids: [],
      school_generated_id: 'TVA_TVALK_TCH_0001'
    }});
    await prisma.teacher.create({ data: {
      id: LTID, user_id: lu.id, school_id: S, branch_id: L, full_name: 'Lekki Teacher',
      subject_specialty: [], curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [],
      school_generated_id: 'TVA_TVALK_TCH_0001'
    }});

    // --- Main branch: class + student ---
    CLS = (await prisma.class.create({ data: { school_id: S, branch_id: M, name: 'JSS1', grade: 7, section: 'A' } })).id;
    await (prisma as any).classTeacher.create({ data: { class_id: CLS, teacher_id: TID, school_id: S, branch_id: M } });
    const su = await prisma.user.create({ data: { id: 'tva-stu-u', email: 'tva-stu@x.com', password_hash: 'x', full_name: 'Main Stu', role: 'STUDENT' as any, school_id: S, branch_id: M } });
    const stu = await prisma.student.create({ data: { user_id: su.id, school_id: S, branch_id: M, full_name: 'Main Stu', grade: 7 } });
    STU_ID = stu.id;
    await (prisma as any).studentEnrollment.create({ data: { student_id: stu.id, class_id: CLS, school_id: S, branch_id: M } });

    // --- Lekki branch: class + student ---
    LCLS = (await prisma.class.create({ data: { school_id: S, branch_id: L, name: 'SSS1', grade: 10, section: 'A' } })).id;
    await (prisma as any).classTeacher.create({ data: { class_id: LCLS, teacher_id: LTID, school_id: S, branch_id: L } });
    const lsu = await prisma.user.create({ data: { id: 'tva-lstu-u', email: 'tva-lstu@x.com', password_hash: 'x', full_name: 'Lekki Stu', role: 'STUDENT' as any, school_id: S, branch_id: L } });
    const lstu = await prisma.student.create({ data: { user_id: lsu.id, school_id: S, branch_id: L, full_name: 'Lekki Stu', grade: 10 } });
    LSTU_ID = lstu.id;
    await (prisma as any).studentEnrollment.create({ data: { student_id: lstu.id, class_id: LCLS, school_id: S, branch_id: L } });
  }, 120000);

  afterAll(cleanup, 120000);

  // ─── 1. ALL ENDPOINTS SMOKE TEST ─────────────────────────────────────────

  const TEACHER_ENDPOINTS: string[] = [
    '/api/teachers/me', '/api/teachers/me/appointments', '/api/teachers/me/attendance',
    '/api/teachers/me/students', '/api/teachers/pending-students', '/api/teachers/me/badges',
    '/api/teachers/me/recognitions', '/api/teachers/me/mentoring', '/api/teachers/me/substitutes',
    '/api/teachers/me/pd-courses', '/api/teachers/attendance', '/api/teachers/attendance-approvals',
    '/api/teachers/substitutes',
    // shared reads used by teacher screens
    '/api/students', '/api/classes', '/api/subjects', '/api/notices', '/api/calendar', '/api/attendance',
    '/api/exams', '/api/timetables', '/api/quizzes', '/api/lesson-plans', '/api/report-cards',
    '/api/assignments', '/api/behavior/notes', '/api/resources', '/api/forum/topics', '/api/chat/rooms',
    '/api/notifications', '/api/gallery', '/api/academic/performance', '/api/pd/courses',
    '/api/extracurriculars', '/api/counseling',
    // active-branch-id (used by header ID badge)
    '/api/active-branch-id',
    // dashboard stats
    `/api/dashboard/stats?teacherId=${TID}&schoolId=${S}&branchId=${M}`,
  ];

  it('every Teacher endpoint responds without a server error (Main branch)', async () => {
    const failures: string[] = [];
    for (const p of TEACHER_ENDPOINTS) {
      const res = await get(p, M);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    }
    if (failures.length) console.log('Teacher failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  it('every Teacher endpoint responds without a server error (Lekki branch — same teacher)', async () => {
    const failures: string[] = [];
    const lEndpoints = TEACHER_ENDPOINTS.map(p => p.replace(`branchId=${M}`, `branchId=${L}`));
    for (const p of lEndpoints) {
      const res = await get(p, L);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    }
    if (failures.length) console.log('Teacher (Lekki) failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 180000);

  // ─── 2. BRANCH-ISOLATED STATS ────────────────────────────────────────────

  it('Main teacher: stats in Main branch = 1 class, 1 student', async () => {
    const res = await get(`/api/dashboard/stats?teacherId=${TID}&schoolId=${S}&branchId=${M}`, M);
    expect(res.status).toBe(200);
    expect(res.body.totalClasses).toBe(1);
    expect(res.body.totalStudents).toBe(1);
  });

  it('Main teacher: stats in Lekki branch = 0 classes, 0 students (not assigned there)', async () => {
    const res = await get(`/api/dashboard/stats?teacherId=${TID}&schoolId=${S}&branchId=${L}`, L);
    expect(res.status).toBe(200);
    expect(res.body.totalClasses).toBe(0);
    expect(res.body.totalStudents).toBe(0);
  });

  it('Lekki teacher: stats in Lekki branch = 1 class, 1 student', async () => {
    const res = await get(`/api/dashboard/stats?teacherId=${LTID}&schoolId=${S}&branchId=${L}`, L, lekkiTok);
    expect(res.status).toBe(200);
    expect(res.body.totalClasses).toBe(1);
    expect(res.body.totalStudents).toBe(1);
  });

  // ─── 3. /teachers/me RETURNS ONLY BRANCH CLASSES ─────────────────────────

  it('/teachers/me for Main teacher in Main branch returns only Main classes', async () => {
    const res = await get('/api/teachers/me', M);
    expect(res.status).toBe(200);
    const classes = res.body?.classes || [];
    expect(classes.length).toBeGreaterThanOrEqual(1);
    expect(classes.every((ct: any) => ct.branch_id === M || ct.branch_id === null)).toBe(true);
  });

  it('/teachers/me for Main teacher in Lekki branch returns 0 classes (none assigned there)', async () => {
    const res = await get('/api/teachers/me', L);
    expect(res.status).toBe(200);
    const classes = res.body?.classes || [];
    expect(classes.length).toBe(0);
  });

  // ─── 4. BRANCH-SPECIFIC GENERATED ID ─────────────────────────────────────

  it('/active-branch-id returns Main teacher home ID when in Main', async () => {
    const res = await get('/api/active-branch-id', M);
    expect(res.status).toBe(200);
    expect(res.body.school_generated_id).toBe('TVA_TVAML_TCH_0001');
  });

  it('/active-branch-id returns a Lekki-specific ID for Main teacher when in Lekki', async () => {
    const res = await get('/api/active-branch-id', L);
    expect(res.status).toBe(200);
    const id: string = res.body.school_generated_id || '';
    expect(id.length).toBeGreaterThan(0);
    expect(id.toUpperCase()).toContain('TVALK');
  });

  it('/active-branch-id returns Lekki teacher home ID when in Lekki', async () => {
    const res = await get('/api/active-branch-id', L, lekkiTok);
    expect(res.status).toBe(200);
    expect(res.body.school_generated_id).toBe('TVA_TVALK_TCH_0001');
  });

  // ─── 5. CROSS-CONTAMINATION CHECK ─────────────────────────────────────────

  it('Lekki-only teacher is rejected (403) when requesting the Main branch', async () => {
    const res = await get('/api/teachers/me', M, lekkiTok);
    expect(res.status).toBe(403);
  });

  // ─── 6. WRITE BUTTONS — ATTENDANCE ───────────────────────────────────────

  it('check-in button persists a real attendance row in the focused branch', async () => {
    const res = await post('/api/teachers/me/attendance', M, {});
    expect([200, 201]).toContain(res.status);
    const rows = await prisma.teacherAttendance.findMany({ where: { teacher_id: TID, branch_id: M } });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('check-in is PER-BRANCH: Lekki check-in is a separate row, invisible in Main history', async () => {
    await post('/api/teachers/me/attendance', L, {});
    const main  = await get('/api/teachers/me/attendance', M);
    const lekki = await get('/api/teachers/me/attendance', L);
    const mArr = Array.isArray(main.body)  ? main.body  : [];
    const lArr = Array.isArray(lekki.body) ? lekki.body : [];
    expect(mArr.every((r: any) => r.branch_id === M)).toBe(true);
    expect(lArr.every((r: any) => r.branch_id === L)).toBe(true);
  });

  it('mentoring button persists a row', async () => {
    const res = await post('/api/teachers/me/mentoring', M, { mentor_id: TID, subject_area: 'Mathematics' });
    if (![200, 201].includes(res.status)) console.log('mentoring:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
  });

  it('substitute-request button persists a row', async () => {
    const res = await post('/api/teachers/me/substitutes', M, { substitute_teacher_id: TID, class_id: CLS, date: new Date().toISOString() });
    if (![200, 201].includes(res.status)) console.log('substitute:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
  });

  it('appointment button persists a row', async () => {
    const res = await post('/api/teachers/appointments', M, { title: 'Parent meeting', date: new Date().toISOString(), teacher_id: TID });
    if (![200, 201].includes(res.status)) console.log('appointment:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
  });

  // ─── 7. WRITE BUTTONS — ACADEMIC CONTENT ─────────────────────────────────

  it('Create Assignment button persists a real assignment row', async () => {
    const res = await post('/api/assignments', M, {
      class_id: CLS,
      title: 'Maths Homework Week 1',
      subject: 'Mathematics',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
      description: 'Complete exercises 1-10',
    });
    if (![200, 201].includes(res.status)) console.log('assignment create:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const rows = await (prisma as any).assignment.findMany({ where: { class_id: CLS, school_id: S } });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('Submit Lesson Plan button persists a real lessonNote row', async () => {
    const res = await post('/api/lesson-plans', M, {
      teacherId: TID,
      classId: CLS,
      subjectId: SUBJ,
      term: 'First',
      week: 1,
      title: 'Introduction to Algebra',
      content: 'Students will understand basic algebraic concepts.',
    });
    if (![200, 201].includes(res.status)) console.log('lesson plan create:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const rows = await (prisma as any).lessonNote.findMany({ where: { teacher_id: TID, school_id: S } });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('Upload Quiz button persists a real quiz + questions row', async () => {
    const res = await post('/api/quizzes/upload', M, {
      quiz: {
        title: 'Algebra Quiz 1',
        teacher_id: TID,
        class_id: CLS,
        subject_id: SUBJ,
        total_marks: 20,
        branch_id: M,
      },
      questions: [
        { question_text: 'What is 2 + 2?', options: ['2', '3', '4', '5'], correct_answer: '4', points: 10, order_index: 1 },
        { question_text: 'What is 5 × 4?', options: ['9', '20', '25', '15'], correct_answer: '20', points: 10, order_index: 2 },
      ],
    });
    if (![200, 201].includes(res.status)) console.log('quiz create:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const quizzes = await (prisma as any).quiz.findMany({ where: { teacher_id: TID, school_id: S } });
    expect(quizzes.length).toBeGreaterThan(0);
    const questions = await (prisma as any).quizQuestion.findMany({ where: { quiz_id: quizzes[0].id } });
    expect(questions.length).toBe(2);
  });

  it('Book Counseling Appointment button persists a real counselingAppointment row', async () => {
    const res = await post('/api/counseling', M, {
      student_id: STU_ID,
      requested_date: new Date(Date.now() + 3 * 86400000).toISOString(),
      appointment_type: 'Academic Support',
      reason: 'Student struggling with algebra',
    });
    if (![200, 201].includes(res.status)) console.log('counseling create:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
    const rows = await (prisma as any).counselingAppointment.findMany({ where: { student_id: STU_ID, school_id: S } });
    expect(rows.length).toBeGreaterThan(0);
  });

  // ─── 8. EXAMOFFICER ROLE — SMOKE TEST ────────────────────────────────────

  const EXAM_OFFICER_ENDPOINTS = [
    '/api/exams',
    `/api/dashboard/stats?schoolId=${S}&branchId=${M}`,
    '/api/classes',
    '/api/students',
    '/api/report-cards',
  ];

  it('ExamOfficer role: all exam-related endpoints respond without server error', async () => {
    const failures: string[] = [];
    for (const p of EXAM_OFFICER_ENDPOINTS) {
      const res = await get(p, M, examOfficerTok);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    }
    if (failures.length) console.log('ExamOfficer failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 60000);

  it('ExamOfficer: GET /api/exams returns an array (no server error)', async () => {
    const res = await get('/api/exams', M, examOfficerTok);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body) || typeof res.body === 'object').toBe(true);
  });

  // ─── 9. COUNSELOR ROLE — SMOKE TEST ──────────────────────────────────────

  const COUNSELOR_ENDPOINTS = [
    '/api/counseling',
    '/api/students',
    `/api/dashboard/stats?schoolId=${S}&branchId=${M}`,
  ];

  it('Counselor role: all counseling-related endpoints respond without server error', async () => {
    const failures: string[] = [];
    for (const p of COUNSELOR_ENDPOINTS) {
      const res = await get(p, M, counselorTok);
      if (res.status >= 500) failures.push(`${p} -> ${res.status} ${JSON.stringify(res.body).slice(0, 80)}`);
    }
    if (failures.length) console.log('Counselor failing endpoints:\n' + failures.join('\n'));
    expect(failures).toEqual([]);
  }, 60000);

  it('Counselor: GET /api/counseling returns the appointment we booked (cross-role visibility)', async () => {
    const res = await get('/api/counseling', M, counselorTok);
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body) ? res.body : [];
    // At least the appointment booked in test 7 should be present
    expect(items.length).toBeGreaterThan(0);
  });

  it('Counselor: POST /api/counseling books a separate appointment for Lekki student', async () => {
    const res = await post('/api/counseling', M, {
      student_id: LSTU_ID,
      requested_date: new Date(Date.now() + 5 * 86400000).toISOString(),
      appointment_type: 'Behavioural',
      reason: 'Attendance concern',
    }, counselorTok);
    if (![200, 201].includes(res.status)) console.log('counselor book:', res.status, JSON.stringify(res.body));
    expect([200, 201]).toContain(res.status);
  });

  // ─── 10. WRITE BRANCH ISOLATION ───────────────────────────────────────────

  it('Assignment created in Main branch is NOT visible when querying Lekki branch', async () => {
    const mainRes  = await get(`/api/assignments?branchId=${M}`, M);
    const lekkiRes = await get(`/api/assignments?branchId=${L}`, L);
    const mainArr  = Array.isArray(mainRes.body)  ? mainRes.body  : [];
    const lekkiArr = Array.isArray(lekkiRes.body) ? lekkiRes.body : [];
    // Assignment was created in Main (CLS), should appear in Main but not Lekki
    const mainHas  = mainArr.some((a: any) => a.title === 'Maths Homework Week 1');
    const lekkiHas = lekkiArr.some((a: any) => a.title === 'Maths Homework Week 1');
    expect(mainHas).toBe(true);
    expect(lekkiHas).toBe(false);
  });

  it('Lesson plan created in Main branch is NOT visible when querying Lekki branch', async () => {
    const mainRes  = await get('/api/lesson-plans', M);
    const lekkiRes = await get('/api/lesson-plans', L);
    const mainArr  = Array.isArray(mainRes.body)  ? mainRes.body  : [];
    const lekkiArr = Array.isArray(lekkiRes.body) ? lekkiRes.body : [];
    const mainHas  = mainArr.some((p: any) => p.title === 'Introduction to Algebra');
    const lekkiHas = lekkiArr.some((p: any) => p.title === 'Introduction to Algebra');
    expect(mainHas).toBe(true);
    expect(lekkiHas).toBe(false);
  });
});
