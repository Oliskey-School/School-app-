import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { TimetableService } from '../../src/services/timetable.service';

const S = 'ttc-school', B = 'ttc-main';
// Use a stable UUID — no teacher row needed; conflict check queries timetable entries only
const TEACHER_ID = 'aaaaaaaa-0000-0000-0000-ttctteacher1';

async function cleanup() {
  await (prisma as any).timetable.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Timetable create sanitizes UI-only fields', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'TTC', code: 'TTC', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('accepts the Editor payload (day/period_index/status) and maps day->day_of_week', async () => {
    const row = await TimetableService.createTimetable(S, {
      day: 'Monday', period_index: 0, status: 'Published',
      start_time: '08:00', end_time: '08:45', subject: 'Financial Accounting',
      class_name: 'SSS 3', teacher_id: null, branch_id: B,
    });
    expect(row).toBeTruthy();
    expect(row.day_of_week).toBe(1);
    expect(row.subject).toBe('Financial Accounting');
    expect(row.class_name).toBe('SSS 3');
    expect(row.branch_id).toBe(B);
  });

  it('checkTeacherConflict returns no conflict (and does not crash on day_of_week query)', async () => {
    // Before fix: this query used `day:` (unknown field) and crashed with a Prisma error.
    // After fix: correctly queries day_of_week and returns {conflict: false}.
    const result = await TimetableService.checkTeacherConflict(S, {
      teacherId: TEACHER_ID,
      day: 'Tuesday',
      startTime: '09:30',
      endTime: '10:15',
    });
    expect(result.conflict).toBe(false);
  });

  it('checkTeacherConflict handles all 5 day name variants without crashing', async () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    for (const day of days) {
      const result = await TimetableService.checkTeacherConflict(S, {
        teacherId: TEACHER_ID, day, startTime: '08:00', endTime: '08:45',
      });
      expect(result.conflict).toBe(false);
    }
  });

  it('getTimetable matches teacher assignments by class NAME when timetable rows use a duplicate class record', async () => {
    // Real-world data shape: the ClassTeacher assignment points at one class
    // record, but the timetable builder created rows against a DIFFERENT class
    // record with the same name (duplicate class rows exist in the same branch).
    // The teacher filter must match those rows by name — id-only matching made
    // every assigned period vanish from the teacher's schedule.
    const user = await prisma.user.create({ data: {
      email: 'ttc-teacher@test.local', password_hash: 'x', full_name: 'TTC Teacher',
      role: 'TEACHER' as any, school_id: S, branch_id: B,
    }});
    const teacher = await prisma.teacher.create({ data: {
      user_id: user.id, school_id: S, branch_id: B, full_name: 'TTC Teacher',
    }});
    const subject = await prisma.subject.create({ data: { school_id: S, branch_id: B, name: 'Data Processing' } });
    // Two class records, same name, same branch — assignment uses A, timetable uses B
    const classA = await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SSS 3', grade: 12, section: 'A' } });
    const classB = await prisma.class.create({ data: { school_id: S, branch_id: B, name: 'SSS 3', grade: 12, section: 'A' } });
    await (prisma as any).classTeacher.create({ data: {
      class_id: classA.id, teacher_id: teacher.id, subject_id: subject.id, school_id: S, branch_id: B,
    }});
    await TimetableService.createTimetable(S, {
      day: 'Thursday', start_time: '08:00', end_time: '08:45',
      subject: 'Data Processing', class_name: 'SSS 3', class_id: classB.id, branch_id: B,
    });
    // A non-assigned subject on the same class must NOT leak through
    await TimetableService.createTimetable(S, {
      day: 'Thursday', start_time: '09:00', end_time: '09:45',
      subject: 'French', class_name: 'SSS 3', class_id: classB.id, branch_id: B,
    });

    const rows: any[] = await TimetableService.getTimetable(S, B, undefined, teacher.id);
    const subjects = rows.map(r => r.subject);
    expect(subjects).toContain('Data Processing'); // name-matched despite different class_id
    expect(subjects).not.toContain('French');      // subject scoping still enforced

    await (prisma as any).classTeacher.deleteMany({ where: { school_id: S } });
    await prisma.timetable.deleteMany({ where: { school_id: S, class_id: { in: [classA.id, classB.id] } } });
    await prisma.class.deleteMany({ where: { id: { in: [classA.id, classB.id] } } });
    await prisma.subject.delete({ where: { id: subject.id } });
    await prisma.teacher.delete({ where: { id: teacher.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it('getTimetable with publishedOnly hides Draft rows (teacher/student view)', async () => {
    await TimetableService.createTimetable(S, {
      day: 'Monday', start_time: '08:00', end_time: '08:45',
      subject: 'Draft Subject', class_name: 'PUB 1', branch_id: B, status: 'Draft',
    });
    await TimetableService.createTimetable(S, {
      day: 'Monday', start_time: '08:45', end_time: '09:30',
      subject: 'Published Subject', class_name: 'PUB 1', branch_id: B, status: 'Published',
    });

    const adminView: any[] = await TimetableService.getTimetable(S, B, 'PUB 1');
    expect(adminView.map(r => r.subject).sort()).toEqual(['Draft Subject', 'Published Subject']);

    const publishedView: any[] = await TimetableService.getTimetable(S, B, 'PUB 1', undefined, { publishedOnly: true });
    expect(publishedView.map(r => r.subject)).toEqual(['Published Subject']);

    await prisma.timetable.deleteMany({ where: { school_id: S, class_name: 'PUB 1' } });
  });

  it('deleteTimetableByClass with a branch only deletes that branch\'s rows', async () => {
    const B2 = 'ttc-branch2';
    await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Second', code: 'BR2', is_main: false } });
    await TimetableService.createTimetable(S, {
      day: 'Monday', start_time: '08:00', end_time: '08:45',
      subject: 'Main Math', class_name: 'DEL 1', branch_id: B,
    });
    await TimetableService.createTimetable(S, {
      day: 'Monday', start_time: '08:00', end_time: '08:45',
      subject: 'Branch2 Math', class_name: 'DEL 1', branch_id: B2,
    });

    await TimetableService.deleteTimetableByClass(S, 'DEL 1', B);

    const remaining = await prisma.timetable.findMany({ where: { school_id: S, class_name: 'DEL 1' } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].branch_id).toBe(B2);

    await prisma.timetable.deleteMany({ where: { school_id: S, class_name: 'DEL 1' } });
    await prisma.branch.delete({ where: { id: B2 } });
  });

  it('updateTimetable whitelists fields and maps day string to day_of_week', async () => {
    const created = await TimetableService.createTimetable(S, {
      day: 'Friday', start_time: '10:30', end_time: '11:15',
      subject: 'English', class_name: 'JSS 2', branch_id: B,
    });
    // Update with raw editor payload that includes non-schema fields — must not throw
    const updated = await TimetableService.updateTimetable(S, created.id, {
      subject: 'Literature',
      day: 'Friday',        // string day — should map to day_of_week: 5
      period_index: 4,      // non-schema field — must be silently ignored
    });
    expect(updated.subject).toBe('Literature');
    expect(updated.day_of_week).toBe(5); // Friday = 5
    expect(updated.school_id).toBe(S);   // not overwritten
  });
});
