/**
 * Regression: editing a student 500'd with Prisma "Unknown argument `branch_id`"
 * because the update allow-list included a non-existent column ('school_bus_id'),
 * which broke the whole update. Verifies a student edit (incl. branch_id + the
 * stray school_bus_id the form sends) now succeeds and persists.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../../src/config/database';
import { StudentService } from '../../src/services/student.service';

const S = 'supd-school', B = 'supd-main', U = 'supd-user', SID = 'supd-student';

async function cleanup() {
  await (prisma as any).studentEnrollment.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.student.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('Student update', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'SUPD', code: 'SUPD', slug: S, plan_type: 'enterprise', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'MAIN', is_main: true } });
    const u = await prisma.user.create({ data: { id: U, email: 'supd@x.com', password_hash: 'x', full_name: 'S U', role: 'STUDENT' as any, school_id: S, branch_id: B } });
    await prisma.student.create({ data: { id: SID, user_id: u.id, school_id: S, branch_id: B, full_name: 'Old Name', grade: 8, section: 'A' } });
  }, 120000);

  afterAll(cleanup, 120000);

  it('updates a student (with branch_id + stray school_bus_id) without erroring', async () => {
    const updates = {
      full_name: 'New Name',
      gender: 'Female',
      grade: 8,
      section: 'A',
      branch_id: B,
      school_bus_id: null,            // the field the form sends that is NOT on Student
      admission_number: 'ADM/2026/1',
      assigned_subjects: ['Mathematics', 'English Studies'],
    };
    await expect(StudentService.updateStudent(S, B, SID, updates)).resolves.toBeTruthy();
    const row = await prisma.student.findUnique({ where: { id: SID } });
    expect(row!.full_name).toBe('New Name');
    expect(row!.branch_id).toBe(B);
    expect(row!.assigned_subjects).toContain('Mathematics');
  });
});
