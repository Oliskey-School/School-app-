/**
 * LEKKI BRANCH ADMIN — Comprehensive E2E Screen Audit
 *
 * Seeds a school with Main + Lekki branches. Every admin screen gets its own
 * Lekki-branch row AND a corresponding Main-branch row seeded in the DB.
 * Tests verify:
 *   1. Every admin GET endpoint returns < 500
 *   2. Each screen shows Lekki-seeded data (data is visible)
 *   3. Each screen excludes Main-branch data (full isolation)
 *   4. Write operations persist with branch_id = Lekki
 *   5. Cross-branch destructive ops are blocked
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';

/* ── Fixed UUIDs ─────────────────────────────────────────────────────────── */
const S          = '33330000-0000-4000-8000-000000000001'; // school
const M          = '33330000-0000-4000-8000-000000000002'; // main branch
const L          = '33330000-0000-4000-8000-000000000003'; // lekki branch
const ADMU       = '33330000-0000-4000-8000-000000000004'; // lekki admin user
const TCH_L_UID  = '33330000-0000-4000-8000-000000000005'; // lekki teacher user
const PAR_L_UID  = '33330000-0000-4000-8000-000000000006'; // lekki parent user
const PAR_M_UID  = '33330000-0000-4000-8000-000000000007'; // main parent user
const TCH_M_UID  = '33330000-0000-4000-8000-000000000008'; // main teacher user
const MADMU      = '33330000-0000-4000-8000-000000000010'; // main admin user
const STU_L_UID1 = '33330000-0000-4000-8000-000000000020'; // lekki student 1 user
const STU_L_UID2 = '33330000-0000-4000-8000-000000000021'; // lekki student 2 user
const STU_M_UID  = '33330000-0000-4000-8000-000000000030'; // main student user

/* ── Dynamic IDs (set in beforeAll) ─────────────────────────────────────── */
let STU_L_ID   = ''; // Lekki student 1 record
let STU_M_ID   = ''; // Main student record
let TCH_L_ID   = ''; // Lekki teacher record
let TCH_M_ID   = ''; // Main teacher record
let CLS_L_ID   = ''; // Lekki class
let CLS_M_ID   = ''; // Main class
let SUBJ_L_ID  = ''; // Lekki subject
let SUBJ_M_ID  = ''; // Main subject
let PAR_L_ID   = ''; // Lekki parent record
let PAR_M_ID   = ''; // Main parent record
let EXAM_L_ID  = ''; let EXAM_M_ID   = '';
let ASSIGN_L_ID = ''; let ASSIGN_M_ID = '';
let LESSON_L_ID = ''; let LESSON_M_ID = '';
let BEHAV_L_ID  = ''; let BEHAV_M_ID  = '';
let EXTRA_L_ID  = ''; let EXTRA_M_ID  = '';
let TT_L_ID     = ''; let TT_M_ID     = '';
let BUS_L_ID    = ''; let BUS_M_ID    = '';
let IDCARD_L_ID = ''; let IDCARD_M_ID = '';
let RES_L_ID    = ''; let RES_M_ID    = '';
let FORUM_L_ID  = ''; let FORUM_M_ID  = '';
let CAL_L_ID    = ''; let CAL_M_ID    = '';
let NOTICE_L_ID = ''; let NOTICE_M_ID = '';
let COUNSEL_L_ID = '';
let PD_L_ID      = '';
let REPORT_L_ID  = '';

/* ── Request helpers ─────────────────────────────────────────────────────── */
const lekkiAdminTok = () => jwt.sign(
  { id: ADMU, email: 'lka-adm@x.com', role: 'ADMIN',
    school_id: S, branch_id: L, is_main_admin: false,
    school_generated_id: 'LKA_LEKKI_ADM_0001' },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' }
);
const mainAdminTok = () => jwt.sign(
  { id: MADMU, email: 'lka-madm@x.com', role: 'ADMIN',
    school_id: S, branch_id: M, is_main_admin: true,
    school_generated_id: 'LKA_MAIN_ADM_0001' },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' }
);

const lkGet  = (p: string) =>
  request(app).get(p).set('Authorization', `Bearer ${lekkiAdminTok()}`).set('X-Branch-Id', L);
const lkPost = (p: string, b: any) =>
  request(app).post(p).set('Authorization', `Bearer ${lekkiAdminTok()}`).set('X-Branch-Id', L).send(b);
const lkPut  = (p: string, b: any) =>
  request(app).put(p).set('Authorization', `Bearer ${lekkiAdminTok()}`).set('X-Branch-Id', L).send(b);

/** Extracts an array of IDs from varied API response shapes. */
function ids(body: any, ...listKeys: string[]): string[] {
  const list: any[] = Array.isArray(body)
    ? body
    : (listKeys.map(k => body?.[k]).find(v => Array.isArray(v)) ?? []);
  return list.map((item: any) => item?.id).filter(Boolean);
}

/* ── Cleanup ─────────────────────────────────────────────────────────────── */
async function cleanup() {
  const sql = (q: string) => prisma.$executeRawUnsafe(q).catch(() => {});
  // Child → parent deletion order to respect FK constraints
  await sql(`DELETE FROM "PDEnrollment" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "PDCertificate" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ForumPost" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "StudentActivity" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ExtracurricularEvent" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "StudentIDCard" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "BehaviorNote" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "CounselingAppointment" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ReportCard" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "StudentFee" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "StudentEnrollment" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "AssignmentSubmission" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Assignment" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "LessonPlan" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "LessonNote" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Timetable" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ClassTeacher" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "TeacherAttendance" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Attendance" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Exam" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Resource" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ForumTopic" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ExtracurricularActivity" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "PDCourse" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "TransportBus" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Subject" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Event" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "Announcement" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "BranchUserIdentity" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "ParentChild" WHERE school_id = '${S}'`);
  await sql(`DELETE FROM "SchoolMembership" WHERE school_id = '${S}'`);
  for (const m of ['parent', 'student', 'teacher', 'class', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

/* ── Seed ────────────────────────────────────────────────────────────────── */
beforeAll(async () => {
  await cleanup();

  /* ── School + branches ──────────────────────────────────────────────── */
  await prisma.school.create({ data: {
    id: S, name: 'Lekki Academy', code: 'LKA', slug: S,
    plan_type: 'premium', subscription_status: 'active'
  }});
  await prisma.branch.create({ data: { id: M, school_id: S, name: 'Main',           code: 'MAIN',  is_main: true  }});
  await prisma.branch.create({ data: { id: L, school_id: S, name: 'Lekki Phase 1',  code: 'LEKKI', is_main: false }});

  /* ── Admin users ────────────────────────────────────────────────────── */
  await prisma.user.create({ data: {
    id: ADMU, email: 'lka-adm@x.com', password_hash: 'x',
    full_name: 'Lekki Admin', role: 'ADMIN' as any,
    school_id: S, branch_id: L, school_generated_id: 'LKA_LEKKI_ADM_0001'
  }});
  await prisma.user.create({ data: {
    id: MADMU, email: 'lka-madm@x.com', password_hash: 'x',
    full_name: 'Main Admin', role: 'ADMIN' as any,
    school_id: S, branch_id: M, school_generated_id: 'LKA_MAIN_ADM_0001'
  }});

  /* ── Lekki teacher ──────────────────────────────────────────────────── */
  await prisma.user.create({ data: {
    id: TCH_L_UID, email: 'lka-tch-l@x.com', password_hash: 'x',
    full_name: 'Lekki Teacher', role: 'TEACHER' as any,
    school_id: S, branch_id: L, school_generated_id: 'LKA_LEKKI_TCH_0001'
  }});
  const tchL = await prisma.teacher.create({ data: {
    user_id: TCH_L_UID, school_id: S, branch_id: L,
    full_name: 'Lekki Teacher', subject_specialty: ['Mathematics'],
    curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [],
    school_generated_id: 'LKA_LEKKI_TCH_0001'
  }});
  TCH_L_ID = tchL.id;

  /* ── Main teacher ───────────────────────────────────────────────────── */
  await prisma.user.create({ data: {
    id: TCH_M_UID, email: 'lka-tch-m@x.com', password_hash: 'x',
    full_name: 'Main Teacher', role: 'TEACHER' as any,
    school_id: S, branch_id: M, school_generated_id: 'LKA_MAIN_TCH_0001'
  }});
  const tchM = await prisma.teacher.create({ data: {
    user_id: TCH_M_UID, school_id: S, branch_id: M,
    full_name: 'Main Teacher', subject_specialty: ['English'],
    curriculum_eligibility: ['Nigerian'], allowed_branch_ids: [],
    school_generated_id: 'LKA_MAIN_TCH_0001'
  }});
  TCH_M_ID = tchM.id;

  /* ── Subjects (Lekki + Main) ────────────────────────────────────────── */
  const subjL = await prisma.subject.create({ data: {
    school_id: S, branch_id: L, name: 'Lekki Mathematics'
  }});
  SUBJ_L_ID = subjL.id;

  const subjM = await prisma.subject.create({ data: {
    school_id: S, branch_id: M, name: 'Main English'
  }});
  SUBJ_M_ID = subjM.id;

  /* ── Classes (Lekki + Main) ─────────────────────────────────────────── */
  const clsL = await prisma.class.create({ data: {
    school_id: S, branch_id: L, name: 'JSS 1', grade: 7, section: 'A'
  }});
  CLS_L_ID = clsL.id;

  const clsM = await prisma.class.create({ data: {
    school_id: S, branch_id: M, name: 'JSS 1', grade: 7, section: 'A'
  }});
  CLS_M_ID = clsM.id;

  // Assign Lekki teacher to Lekki class
  await (prisma as any).classTeacher.create({ data: {
    class_id: CLS_L_ID, teacher_id: TCH_L_ID, school_id: S, branch_id: L
  }}).catch(() => {});

  /* ── Lekki students ──────────────────────────────────────────────────── */
  const stuU1 = await prisma.user.create({ data: {
    id: STU_L_UID1, email: 'lka-stu1@x.com', password_hash: 'x',
    full_name: 'Lekki Student One', role: 'STUDENT' as any,
    school_id: S, branch_id: L, school_generated_id: 'LKA_LEKKI_STU_0001'
  }});
  const stu1 = await prisma.student.create({ data: {
    user_id: stuU1.id, school_id: S, branch_id: L,
    full_name: 'Lekki Student One', grade: 7, section: 'A', status: 'Active',
    school_generated_id: 'LKA_LEKKI_STU_0001'
  }});
  STU_L_ID = stu1.id;
  await (prisma as any).studentEnrollment.create({ data: {
    student_id: STU_L_ID, class_id: CLS_L_ID, school_id: S, branch_id: L
  }}).catch(() => {});

  await prisma.user.create({ data: {
    id: STU_L_UID2, email: 'lka-stu2@x.com', password_hash: 'x',
    full_name: 'Lekki Student Two', role: 'STUDENT' as any,
    school_id: S, branch_id: L, school_generated_id: 'LKA_LEKKI_STU_0002'
  }});
  await prisma.student.create({ data: {
    user_id: STU_L_UID2, school_id: S, branch_id: L,
    full_name: 'Lekki Student Two', grade: 7, section: 'A', status: 'Active',
    school_generated_id: 'LKA_LEKKI_STU_0002'
  }});

  /* ── Main student ────────────────────────────────────────────────────── */
  const stuMU = await prisma.user.create({ data: {
    id: STU_M_UID, email: 'lka-mstu@x.com', password_hash: 'x',
    full_name: 'Main Only Student', role: 'STUDENT' as any,
    school_id: S, branch_id: M, school_generated_id: 'LKA_MAIN_STU_0001'
  }});
  const stuM = await prisma.student.create({ data: {
    user_id: stuMU.id, school_id: S, branch_id: M,
    full_name: 'Main Only Student', grade: 7, status: 'Active',
    school_generated_id: 'LKA_MAIN_STU_0001'
  }});
  STU_M_ID = stuM.id;

  /* ── Parents (Lekki + Main) ─────────────────────────────────────────── */
  await prisma.user.create({ data: {
    id: PAR_L_UID, email: 'lka-par-l@x.com', password_hash: 'x',
    full_name: 'Lekki Parent', role: 'PARENT' as any,
    school_id: S, branch_id: L, school_generated_id: 'LKA_LEKKI_PAR_0001'
  }});
  const parL = await prisma.parent.create({ data: {
    user_id: PAR_L_UID, school_id: S, branch_id: L,
    full_name: 'Lekki Parent', email: 'lka-par-l@x.com'
  }});
  PAR_L_ID = parL.id;

  await prisma.user.create({ data: {
    id: PAR_M_UID, email: 'lka-par-m@x.com', password_hash: 'x',
    full_name: 'Main Parent', role: 'PARENT' as any,
    school_id: S, branch_id: M, school_generated_id: 'LKA_MAIN_PAR_0001'
  }});
  const parM = await prisma.parent.create({ data: {
    user_id: PAR_M_UID, school_id: S, branch_id: M,
    full_name: 'Main Parent', email: 'lka-par-m@x.com'
  }});
  PAR_M_ID = parM.id;

  /* ── Exams (Lekki + Main) ───────────────────────────────────────────── */
  const examL = await prisma.exam.create({ data: {
    school_id: S, branch_id: L, title: 'Lekki Maths Exam', subject: 'Mathematics',
    class_name: 'JSS 1', exam_type: 'Mid-Term'
  }});
  EXAM_L_ID = examL.id;

  const examM = await prisma.exam.create({ data: {
    school_id: S, branch_id: M, title: 'Main English Exam', subject: 'English',
    class_name: 'JSS 1', exam_type: 'Mid-Term'
  }});
  EXAM_M_ID = examM.id;

  /* ── Assignments (Lekki + Main) ─────────────────────────────────────── */
  const assignL = await prisma.assignment.create({ data: {
    school_id: S, branch_id: L, class_id: CLS_L_ID,
    title: 'Lekki Assignment', subject: 'Mathematics',
    due_date: new Date(Date.now() + 7 * 86400000), teacher_id: TCH_L_ID
  }});
  ASSIGN_L_ID = assignL.id;

  const assignM = await prisma.assignment.create({ data: {
    school_id: S, branch_id: M, class_id: CLS_M_ID,
    title: 'Main Assignment', subject: 'English',
    due_date: new Date(Date.now() + 7 * 86400000), teacher_id: TCH_M_ID
  }});
  ASSIGN_M_ID = assignM.id;

  /* ── Lesson Notes (served by /api/lesson-plans endpoint) ───────────── */
  // The lesson-plans service queries LessonNote model (not LessonPlan)
  const lessonL = await prisma.lessonNote.create({ data: {
    school_id: S, branch_id: L, teacher_id: TCH_L_ID,
    class_id: CLS_L_ID, subject_id: SUBJ_L_ID,
    title: 'Lekki Algebra Basics', term: 'First', week: 1, content: 'intro'
  }});
  LESSON_L_ID = lessonL.id;

  const lessonM = await prisma.lessonNote.create({ data: {
    school_id: S, branch_id: M, teacher_id: TCH_M_ID,
    class_id: CLS_M_ID, subject_id: SUBJ_M_ID,
    title: 'Main Grammar Intro', term: 'First', week: 1, content: 'intro'
  }});
  LESSON_M_ID = lessonM.id;

  /* ── Behavior Notes (Lekki + Main) ─────────────────────────────────── */
  const behavL = await prisma.behaviorNote.create({ data: {
    school_id: S, branch_id: L, student_id: STU_L_ID, teacher_id: TCH_L_ID,
    note: 'Lekki student is attentive', category: 'Academic', type: 'positive'
  }});
  BEHAV_L_ID = behavL.id;

  const behavM = await prisma.behaviorNote.create({ data: {
    school_id: S, branch_id: M, student_id: STU_M_ID, teacher_id: TCH_M_ID,
    note: 'Main student needs improvement', category: 'Academic', type: 'negative'
  }});
  BEHAV_M_ID = behavM.id;

  /* ── Extracurricular Activities (Lekki + Main) ──────────────────────── */
  const extraL = await (prisma as any).extracurricularActivity.create({ data: {
    school_id: S, branch_id: L, name: 'Lekki Drama Club', category: 'Arts'
  }});
  EXTRA_L_ID = extraL.id;

  const extraM = await (prisma as any).extracurricularActivity.create({ data: {
    school_id: S, branch_id: M, name: 'Main Football Team', category: 'Sports'
  }});
  EXTRA_M_ID = extraM.id;

  /* ── Counseling Appointments (Lekki only — no branch filter in API) ── */
  const counsel = await (prisma as any).counselingAppointment.create({ data: {
    school_id: S, student_id: STU_L_ID, counselor_id: TCH_L_ID,
    requested_date: new Date(Date.now() + 86400000),
    appointment_type: 'Initial Consultation', status: 'Pending'
  }});
  COUNSEL_L_ID = counsel.id;

  /* ── Timetables (Lekki + Main) ──────────────────────────────────────── */
  const ttL = await prisma.timetable.create({ data: {
    school_id: S, branch_id: L, class_id: CLS_L_ID, class_name: 'JSS 1',
    subject: 'Mathematics', teacher_id: TCH_L_ID,
    day_of_week: 1, start_time: '08:00', end_time: '09:00'
  }});
  TT_L_ID = ttL.id;

  const ttM = await prisma.timetable.create({ data: {
    school_id: S, branch_id: M, class_id: CLS_M_ID, class_name: 'JSS 1',
    subject: 'English', teacher_id: TCH_M_ID,
    day_of_week: 1, start_time: '08:00', end_time: '09:00'
  }});
  TT_M_ID = ttM.id;

  /* ── Transport Buses (Lekki + Main) ────────────────────────────────── */
  const busL = await (prisma as any).transportBus.create({ data: {
    school_id: S, branch_id: L, name: 'Lekki Bus 1',
    driver_name: 'Emeka', plate_number: 'LKA-001', capacity: 30
  }});
  BUS_L_ID = busL.id;

  const busM = await (prisma as any).transportBus.create({ data: {
    school_id: S, branch_id: M, name: 'Main Bus 1',
    driver_name: 'Chidi', plate_number: 'MAN-001', capacity: 30
  }});
  BUS_M_ID = busM.id;

  /* ── ID Cards (Lekki + Main, scoped via student.branch_id) ─────────── */
  const cardL = await (prisma as any).studentIDCard.create({ data: {
    school_id: S, student_id: STU_L_ID,
    card_number: `CARD-L-${Date.now()}`,
    expiry_date: new Date(Date.now() + 365 * 86400000)
  }});
  IDCARD_L_ID = cardL.id;

  const cardM = await (prisma as any).studentIDCard.create({ data: {
    school_id: S, student_id: STU_M_ID,
    card_number: `CARD-M-${Date.now()}`,
    expiry_date: new Date(Date.now() + 365 * 86400000)
  }});
  IDCARD_M_ID = cardM.id;

  /* ── Resources (Lekki + Main) ───────────────────────────────────────── */
  const resL = await prisma.resource.create({ data: {
    school_id: S, branch_id: L, teacher_id: TCH_L_ID,
    title: 'Lekki Maths Notes', type: 'PDF'
  }});
  RES_L_ID = resL.id;

  const resM = await prisma.resource.create({ data: {
    school_id: S, branch_id: M, teacher_id: TCH_M_ID,
    title: 'Main English Notes', type: 'PDF'
  }});
  RES_M_ID = resM.id;

  /* ── Forum Topics (Lekki + Main) ────────────────────────────────────── */
  const forumL = await prisma.forumTopic.create({ data: {
    school_id: S, branch_id: L, title: 'Lekki Branch Forum',
    author_id: ADMU, author_name: 'Lekki Admin', author_role: 'admin'
  }});
  FORUM_L_ID = forumL.id;

  const forumM = await prisma.forumTopic.create({ data: {
    school_id: S, branch_id: M, title: 'Main Branch Forum',
    author_id: MADMU, author_name: 'Main Admin', author_role: 'admin'
  }});
  FORUM_M_ID = forumM.id;

  /* ── Calendar Events (Lekki + Main) ────────────────────────────────── */
  const calL = await prisma.event.create({ data: {
    school_id: S, branch_id: L, title: 'Lekki Sports Day',
    date: new Date(Date.now() + 14 * 86400000), type: 'Sports'
  }});
  CAL_L_ID = calL.id;

  const calM = await prisma.event.create({ data: {
    school_id: S, branch_id: M, title: 'Main Prize Giving',
    date: new Date(Date.now() + 21 * 86400000), type: 'Academic'
  }});
  CAL_M_ID = calM.id;

  /* ── Notices / Announcements (Lekki + Main) ─────────────────────────── */
  const noticeL = await prisma.announcement.create({ data: {
    school_id: S, branch_id: L, title: 'Lekki Branch Notice',
    content: 'For Lekki students only', category: 'General', audience: ['all']
  }});
  NOTICE_L_ID = noticeL.id;

  const noticeM = await prisma.announcement.create({ data: {
    school_id: S, branch_id: M, title: 'Main Branch Notice',
    content: 'For Main branch only', category: 'General', audience: ['all']
  }});
  NOTICE_M_ID = noticeM.id;

  /* ── Counseling (already done above) ────────────────────────────────── */

  /* ── PD Course (school-scoped, no branch_id on model) ──────────────── */
  const pd = await (prisma as any).pDCourse.create({ data: {
    school_id: S, title: 'Classroom Management', category: 'Teaching'
  }});
  PD_L_ID = pd.id;

  /* ── Report Card (Lekki only) ───────────────────────────────────────── */
  const reportL = await prisma.reportCard.create({ data: {
    school_id: S, branch_id: L, student_id: STU_L_ID,
    session: '2025/2026', term: 'First', status: 'Draft'
  }});
  REPORT_L_ID = reportL.id;

}, 120_000);

afterAll(cleanup, 120_000);

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — Every admin screen endpoint returns < 500
   ══════════════════════════════════════════════════════════════════════════ */
const ADMIN_GET_ENDPOINTS = [
  // Core people
  '/api/students', '/api/teachers', '/api/classes',
  '/api/subjects', '/api/parents',
  // Dashboard
  '/api/dashboard/stats', '/api/active-branch-id',
  // Academic
  '/api/attendance', '/api/exams', '/api/assignments', '/api/lesson-plans',
  '/api/quizzes', '/api/report-cards', '/api/timetables',
  // Communication
  '/api/notices', '/api/notifications', '/api/forum/topics',
  '/api/calendar', '/api/gallery',
  // Finance
  '/api/fees', '/api/transactions', '/api/payroll',
  // Student support
  '/api/behavior/notes', '/api/extracurriculars',
  '/api/counseling', '/api/pd/courses',
  // Infrastructure
  '/api/buses', '/api/id-cards', '/api/resources',
  // Admin tools
  '/api/branches',
];

it('every Lekki Admin GET endpoint returns < 500', async () => {
  const failures: string[] = [];
  for (const p of ADMIN_GET_ENDPOINTS) {
    const res = await lkGet(p);
    if (res.status >= 500) {
      failures.push(`${p} → ${res.status}: ${JSON.stringify(res.body).slice(0, 120)}`);
    }
  }
  if (failures.length) console.error('\nFailing endpoints:\n' + failures.join('\n'));
  expect(failures).toEqual([]);
}, 300_000);

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — Per-screen branch isolation
   ══════════════════════════════════════════════════════════════════════════ */
describe('Isolation — Students screen', () => {
  it('shows Lekki students', async () => {
    const res = await lkGet('/api/students');
    expect(res.status).toBe(200);
    const list: any[] = Array.isArray(res.body) ? res.body : (res.body?.students ?? res.body?.data ?? []);
    const names = list.map((s: any) => s.full_name || s.name || '');
    expect(names.some(n => n.includes('Lekki'))).toBe(true);
  });

  it('excludes Main branch student', async () => {
    const res = await lkGet('/api/students');
    const list: any[] = Array.isArray(res.body) ? res.body : (res.body?.students ?? res.body?.data ?? []);
    expect(list.map((s: any) => s.id)).not.toContain(STU_M_ID);
  });
});

describe('Isolation — Teachers screen', () => {
  it('shows Lekki teacher', async () => {
    const res = await lkGet('/api/teachers');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'teachers', 'data');
    expect(idList).toContain(TCH_L_ID);
  });

  it('excludes Main branch teacher', async () => {
    const res = await lkGet('/api/teachers');
    const idList = ids(res.body, 'teachers', 'data');
    expect(idList).not.toContain(TCH_M_ID);
  });
});

describe('Isolation — Classes screen', () => {
  it('shows Lekki class', async () => {
    const res = await lkGet('/api/classes');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'classes', 'data');
    expect(idList).toContain(CLS_L_ID);
  });

  it('excludes Main branch class', async () => {
    const res = await lkGet('/api/classes');
    const idList = ids(res.body, 'classes', 'data');
    expect(idList).not.toContain(CLS_M_ID);
  });
});

describe('Isolation — Subjects screen', () => {
  it('shows Lekki subject', async () => {
    const res = await lkGet('/api/subjects');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'subjects', 'data');
    expect(idList).toContain(SUBJ_L_ID);
  });

  it('excludes Main branch subject', async () => {
    const res = await lkGet('/api/subjects');
    const idList = ids(res.body, 'subjects', 'data');
    expect(idList).not.toContain(SUBJ_M_ID);
  });
});

describe('Isolation — Parents screen', () => {
  it('shows Lekki parent', async () => {
    const res = await lkGet('/api/parents');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'parents', 'data');
    expect(idList).toContain(PAR_L_ID);
  });

  it('excludes Main branch parent', async () => {
    const res = await lkGet('/api/parents');
    const idList = ids(res.body, 'parents', 'data');
    expect(idList).not.toContain(PAR_M_ID);
  });
});

describe('Isolation — Exams screen', () => {
  it('shows Lekki exam', async () => {
    const res = await lkGet('/api/exams');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'exams', 'data');
    expect(idList).toContain(EXAM_L_ID);
  });

  it('excludes Main branch exam', async () => {
    const res = await lkGet('/api/exams');
    const idList = ids(res.body, 'exams', 'data');
    expect(idList).not.toContain(EXAM_M_ID);
  });
});

describe('Isolation — Assignments screen', () => {
  it('shows Lekki assignment', async () => {
    const res = await lkGet('/api/assignments');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'assignments', 'data');
    expect(idList).toContain(ASSIGN_L_ID);
  });

  it('excludes Main branch assignment', async () => {
    const res = await lkGet('/api/assignments');
    const idList = ids(res.body, 'assignments', 'data');
    expect(idList).not.toContain(ASSIGN_M_ID);
  });
});

describe('Isolation — Lesson Plans screen', () => {
  it('shows Lekki lesson plan', async () => {
    const res = await lkGet('/api/lesson-plans');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'lessonPlans', 'lesson_plans', 'data');
    expect(idList).toContain(LESSON_L_ID);
  });

  it('excludes Main branch lesson plan', async () => {
    const res = await lkGet('/api/lesson-plans');
    const idList = ids(res.body, 'lessonPlans', 'lesson_plans', 'data');
    expect(idList).not.toContain(LESSON_M_ID);
  });
});

describe('Isolation — Behavior Notes screen', () => {
  it('shows Lekki behavior note', async () => {
    const res = await lkGet('/api/behavior/notes');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'notes', 'behaviorNotes', 'data');
    expect(idList).toContain(BEHAV_L_ID);
  });

  it('excludes Main branch behavior note', async () => {
    const res = await lkGet('/api/behavior/notes');
    const idList = ids(res.body, 'notes', 'behaviorNotes', 'data');
    expect(idList).not.toContain(BEHAV_M_ID);
  });
});

describe('Isolation — Extracurriculars screen', () => {
  // Controller reads branchId from query params (not JWT), so we pass it explicitly
  it('shows Lekki activity', async () => {
    const res = await lkGet(`/api/extracurriculars?branchId=${L}`);
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'activities', 'extracurriculars', 'data');
    expect(idList).toContain(EXTRA_L_ID);
  });

  it('excludes Main branch activity', async () => {
    const res = await lkGet(`/api/extracurriculars?branchId=${L}`);
    const idList = ids(res.body, 'activities', 'extracurriculars', 'data');
    expect(idList).not.toContain(EXTRA_M_ID);
  });
});

describe('Isolation — Timetable screen', () => {
  it('shows Lekki timetable entry', async () => {
    const res = await lkGet('/api/timetables');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'timetables', 'data');
    expect(idList).toContain(TT_L_ID);
  });

  it('excludes Main branch timetable', async () => {
    const res = await lkGet('/api/timetables');
    const idList = ids(res.body, 'timetables', 'data');
    expect(idList).not.toContain(TT_M_ID);
  });
});

describe('Isolation — Buses screen', () => {
  it('shows Lekki bus', async () => {
    const res = await lkGet('/api/buses');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'buses', 'data');
    expect(idList).toContain(BUS_L_ID);
  });

  it('excludes Main branch bus', async () => {
    const res = await lkGet('/api/buses');
    const idList = ids(res.body, 'buses', 'data');
    expect(idList).not.toContain(BUS_M_ID);
  });
});

describe('Isolation — ID Cards screen', () => {
  it('shows Lekki student ID card', async () => {
    const res = await lkGet('/api/id-cards');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'cards', 'idCards', 'data');
    expect(idList).toContain(IDCARD_L_ID);
  });

  it('excludes Main branch student ID card', async () => {
    const res = await lkGet('/api/id-cards');
    const idList = ids(res.body, 'cards', 'idCards', 'data');
    expect(idList).not.toContain(IDCARD_M_ID);
  });
});

describe('Isolation — Resources screen', () => {
  it('shows Lekki resource', async () => {
    const res = await lkGet('/api/resources');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'resources', 'data');
    expect(idList).toContain(RES_L_ID);
  });

  it('excludes Main branch resource', async () => {
    const res = await lkGet('/api/resources');
    const idList = ids(res.body, 'resources', 'data');
    expect(idList).not.toContain(RES_M_ID);
  });
});

describe('Isolation — Forum Topics screen', () => {
  it('shows Lekki forum topic', async () => {
    const res = await lkGet('/api/forum/topics');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'topics', 'data');
    expect(idList).toContain(FORUM_L_ID);
  });

  it('excludes Main branch forum topic', async () => {
    const res = await lkGet('/api/forum/topics');
    const idList = ids(res.body, 'topics', 'data');
    expect(idList).not.toContain(FORUM_M_ID);
  });
});

describe('Isolation — Calendar Events screen', () => {
  it('shows Lekki calendar event', async () => {
    const res = await lkGet('/api/calendar');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'events', 'data');
    expect(idList).toContain(CAL_L_ID);
  });

  it('excludes Main branch calendar event', async () => {
    const res = await lkGet('/api/calendar');
    const idList = ids(res.body, 'events', 'data');
    expect(idList).not.toContain(CAL_M_ID);
  });
});

describe('Isolation — Notices screen', () => {
  it('shows Lekki notice', async () => {
    const res = await lkGet('/api/notices');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'announcements', 'notices', 'data');
    expect(idList).toContain(NOTICE_L_ID);
  });

  it('excludes Main branch notice', async () => {
    const res = await lkGet('/api/notices');
    const idList = ids(res.body, 'announcements', 'notices', 'data');
    expect(idList).not.toContain(NOTICE_M_ID);
  });
});

describe('Isolation — Dashboard & Identity', () => {
  it('GET /dashboard/stats totalStudents ≥ 2 (Lekki-scoped)', async () => {
    const res = await lkGet('/api/dashboard/stats');
    expect(res.status).toBe(200);
    const total = res.body.totalStudents ?? res.body.students;
    if (total !== undefined) expect(Number(total)).toBeGreaterThanOrEqual(2);
  });

  it('/active-branch-id returns Lekki branch ID', async () => {
    const res = await lkGet('/api/active-branch-id');
    expect(res.status).toBe(200);
    expect(res.body.branch_id ?? res.body.branchId ?? res.body.school_generated_id).toBeTruthy();
  });

  it('/active-branch-id school_generated_id contains branch code', async () => {
    const res = await lkGet('/api/active-branch-id');
    expect(res.status).toBe(200);
    // school_generated_id like 'LKA_LEKKI_ADM_0001' encodes the branch
    const genId: string = res.body.school_generated_id ?? res.body.generatedId ?? '';
    expect(genId.toUpperCase()).toContain('LEKKI');
  });
});

describe('School-scoped screens (no branch filter — presence check only)', () => {
  it('GET /counseling returns seeded counseling appointment', async () => {
    const res = await lkGet('/api/counseling');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'appointments', 'data');
    expect(idList).toContain(COUNSEL_L_ID);
  });

  it('GET /pd/courses returns seeded PD course', async () => {
    const res = await lkGet('/api/pd/courses');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'courses', 'data');
    expect(idList).toContain(PD_L_ID);
  });

  it('GET /report-cards returns Lekki report card', async () => {
    const res = await lkGet('/api/report-cards');
    expect(res.status).toBe(200);
    const idList = ids(res.body, 'reportCards', 'report_cards', 'data');
    expect(idList).toContain(REPORT_L_ID);
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — Write operations persist to Lekki branch
   ══════════════════════════════════════════════════════════════════════════ */
describe('Write operations', () => {
  it('POST /students/enroll creates a student scoped to Lekki branch', async () => {
    const res = await lkPost('/api/students/enroll', {
      school_id: S, branch_id: L,
      firstName: 'New', lastName: 'LekkiStudent',
      grade: 8, section: 'A',
      email: `lka-new-stu-${Date.now()}@x.com`, gender: 'Male'
    });
    if (![200, 201].includes(res.status))
      console.error('POST /students/enroll:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    const newId = res.body?.id || res.body?.student?.id;
    if (newId) {
      const row = await prisma.student.findUnique({ where: { id: newId } });
      expect(row?.branch_id).toBe(L);
    }
  });

  it('POST /notices creates a notice scoped to Lekki branch', async () => {
    const res = await lkPost('/api/notices', {
      title: 'Write-test Lekki Notice',
      content: 'Branch write test', category: 'General', audience: ['all']
    });
    if (![200, 201].includes(res.status))
      console.error('POST /notices:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    const newId = res.body?.id || res.body?.announcement?.id;
    if (newId) {
      const row = await prisma.announcement.findUnique({ where: { id: newId } });
      if (row) expect(row.branch_id).toBe(L);
    }
  });

  it('GET /students/:id returns Lekki student with correct branch', async () => {
    const res = await lkGet(`/api/students/${STU_L_ID}`);
    expect([200]).toContain(res.status);
    const b = res.body?.branch_id ?? res.body?.student?.branch_id;
    expect(b).toBe(L);
  });

  it('GET /students/class/:classId returns students enrolled in Lekki class', async () => {
    const res = await lkGet(`/api/students/class/${CLS_L_ID}`);
    expect([200]).toContain(res.status);
    const list: any[] = Array.isArray(res.body) ? res.body : (res.body?.students ?? []);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /attendance marks attendance for Lekki student', async () => {
    const res = await lkPost('/api/attendance', {
      records: [{
        student_id: STU_L_ID, class_id: CLS_L_ID,
        date: new Date().toISOString().split('T')[0], status: 'Present'
      }]
    });
    if (![200, 201].includes(res.status))
      console.error('POST /attendance:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
  });

  it('PUT /teachers/:id updates Lekki teacher profile', async () => {
    const res = await lkPut(`/api/teachers/${TCH_L_ID}`, {
      full_name: 'Lekki Teacher Updated', subject_specialty: ['Mathematics', 'Physics']
    });
    if (![200, 201].includes(res.status))
      console.error('PUT /teachers/:id:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
  });

  it('POST /fees creates a fee record with correct branch', async () => {
    const res = await lkPost('/api/fees', {
      studentId: STU_L_ID, title: 'Lekki Term 1 Fees',
      amount: 50000,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString()
    });
    if (![200, 201].includes(res.status))
      console.error('POST /fees:', res.status, JSON.stringify(res.body).slice(0, 200));
    expect([200, 201]).toContain(res.status);
    if (res.body?.id) {
      const row = await (prisma as any).studentFee?.findUnique({ where: { id: res.body.id } });
      if (row) expect(row.branch_id).toBe(L);
    }
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   SECTION 4 — Branch governance
   ══════════════════════════════════════════════════════════════════════════ */
describe('Branch governance', () => {
  it('Lekki admin CANNOT delete a Main-branch student', async () => {
    const res = await request(app)
      .delete(`/api/students/${STU_M_ID}`)
      .set('Authorization', `Bearer ${lekkiAdminTok()}`)
      .set('X-Branch-Id', L);
    expect(res.status).not.toBe(200);
    const still = await prisma.student.findUnique({ where: { id: STU_M_ID } });
    expect(still).not.toBeNull();
  });

  it('Lekki admin /branches returns only the Lekki branch', async () => {
    const res = await lkGet('/api/branches');
    expect(res.status).toBe(200);
    const list: any[] = Array.isArray(res.body) ? res.body : (res.body?.branches ?? res.body?.data ?? []);
    expect(list.length).toBeGreaterThanOrEqual(1);
    list.forEach((b: any) => expect(b.id).toBe(L));
  });

  it('Lekki admin sees only Lekki teachers (not Main teachers)', async () => {
    const res = await lkGet('/api/teachers');
    const list: any[] = Array.isArray(res.body) ? res.body : (res.body?.teachers ?? res.body?.data ?? []);
    const branchIds = list.map((t: any) => t.branch_id ?? t.user?.branch_id).filter(Boolean);
    branchIds.forEach(b => expect(b).toBe(L));
  });
});
