/**
 * ACCOUNT CREATION & IDS — end-to-end (real database)
 *
 * Proves the account/identity rules the owner asked for:
 *   - every teacher/student/parent created in a branch gets a UNIQUE, incrementing
 *     Global ID with the CORRECT role letters (TCH / STU / PAR)
 *   - a user shown in a branch they're only ASSIGNED to gets that branch's code and
 *     a distinct number — never a duplicate, never the wrong role letters
 *   - creating an account with an email that already exists is REJECTED (no silent
 *     overwrite / role-flip that made teachers disappear)
 *   - a large embedded profile photo is accepted (no "request entity too large")
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/app';
import prisma from '../../src/config/database';
import { config } from '../../src/config/env';
import { TeacherService } from '../../src/services/teacher.service';
import { ParentService } from '../../src/services/parent.service';
import { StudentService } from '../../src/services/student.service';
import { BranchIdentityService } from '../../src/services/branchIdentity.service';

const S = 'acid-school';
const B1 = 'acid-b1', B2 = 'acid-b2';
const ADMIN = 'acid-admin';

const token = () => jwt.sign(
  { id: ADMIN, email: 'acid-admin@x.com', role: 'ADMIN', school_id: S, branch_id: B1, allowed_branch_ids: [] },
  config.jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });

async function cleanup() {
  await prisma.$executeRawUnsafe(`DELETE FROM "BranchUserIdentity" WHERE school_id = $1`, S).catch(() => {});
  for (const m of ['behaviorNote', 'parent', 'student', 'teacher', 'class', 'subject', 'schoolMembership', 'user', 'branch'] as const) {
    await (prisma as any)[m]?.deleteMany?.({ where: { school_id: S } }).catch(() => {});
  }
  await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

const codeOf = (gid: string) => gid.split('_').slice(-2, -1)[0];
const numOf = (gid: string) => parseInt(gid.split('_').pop() as string, 10);
const idForEmail = async (email: string) =>
  (await prisma.user.findFirst({ where: { email }, select: { school_generated_id: true } }))?.school_generated_id || '';

describe('Account creation & IDs', () => {
  beforeAll(async () => {
    await cleanup();
    await prisma.school.create({ data: { id: S, name: 'ACID', code: 'ACID', slug: S, plan_type: 'premium', subscription_status: 'active' } });
    await prisma.branch.create({ data: { id: B1, school_id: S, name: 'Main', code: 'ACMAIN', is_main: true } });
    await prisma.branch.create({ data: { id: B2, school_id: S, name: 'Lekki', code: 'ACLEKKI', is_main: false } });
    await prisma.user.create({ data: { id: ADMIN, email: 'acid-admin@x.com', password_hash: 'x', full_name: 'ACID Admin', role: 'ADMIN' as any, school_id: S, branch_id: B1 } });
  }, 60000);
  afterAll(cleanup, 60000);

  it('3 teachers in one branch → unique, incrementing TCH ids', async () => {
    await TeacherService.createTeacher(S, B1, { full_name: 'T One', email: 't1@acid.com' });
    await TeacherService.createTeacher(S, B1, { full_name: 'T Two', email: 't2@acid.com' });
    await TeacherService.createTeacher(S, B1, { full_name: 'T Three', email: 't3@acid.com' });
    const ids = await Promise.all(['t1@acid.com', 't2@acid.com', 't3@acid.com'].map(idForEmail));
    for (const id of ids) expect(codeOf(id)).toBe('TCH');           // correct role letters
    expect(new Set(ids).size).toBe(3);                              // all unique
    expect(new Set(ids.map(numOf)).size).toBe(3);                  // distinct numbers
  });

  it('student gets STU letters, parent gets PAR letters', async () => {
    await StudentService.enrollStudent(S, B1, { firstName: 'Stu', lastName: 'Dent', email: 'stu1@acid.com' }, 'ADMIN', ADMIN);
    await ParentService.createParent(S, B1, { full_name: 'Pa Rent', email: 'par1@acid.com' }, ADMIN);
    expect(codeOf(await idForEmail('stu1@acid.com'))).toBe('STU');
    expect(codeOf(await idForEmail('par1@acid.com'))).toBe('PAR');
  });

  it('duplicate email is REJECTED for every role (no overwrite/role-flip)', async () => {
    await expect(TeacherService.createTeacher(S, B1, { full_name: 'Dup', email: 't1@acid.com' }))
      .rejects.toThrow(/already registered/i);
    await expect(ParentService.createParent(S, B1, { full_name: 'Dup', email: 't1@acid.com' }, ADMIN))
      .rejects.toThrow(/already registered/i);
    await expect(StudentService.enrollStudent(S, B1, { firstName: 'Dup', lastName: 'X', email: 't1@acid.com' }, 'ADMIN', ADMIN))
      .rejects.toThrow(/already registered/i);
    // the original teacher is still intact (was NOT converted/deleted)
    const t1 = await prisma.user.findFirst({ where: { email: 't1@acid.com' } });
    expect(t1?.role).toBe('TEACHER');
  });

  it('teachers ASSIGNED to another branch show THAT branch code + DISTINCT numbers (no duplicates)', async () => {
    const u1 = await prisma.user.findFirst({ where: { email: 't1@acid.com' } });
    const u2 = await prisma.user.findFirst({ where: { email: 't2@acid.com' } });
    for (const u of [u1, u2]) {
      await prisma.user.update({ where: { id: u!.id }, data: { allowed_branch_ids: [B2] } });
      await prisma.teacher.updateMany({ where: { user_id: u!.id }, data: { allowed_branch_ids: [B2] } });
    }
    const list: any[] = await TeacherService.getAllTeachers(S, B2);
    const shown = list
      .filter(t => [u1!.id, u2!.id].includes(t.user_id))
      .map(t => t.school_generated_id);
    expect(shown.length).toBe(2);
    for (const id of shown) {
      expect(codeOf(id)).toBe('TCH');                 // role letters correct
      expect(id).toContain('_ACLEKKI_');              // target branch code
    }
    expect(new Set(shown).size).toBe(2);              // NOT the same id (the bug)
  });

  it('a PARENT resolved in another branch keeps PAR letters (never TCH)', async () => {
    const par = await prisma.user.findFirst({ where: { email: 'par1@acid.com' } });
    const resolved = await BranchIdentityService.resolveForUser(
      { id: par!.id, school_id: S, branch_id: B1, school_generated_id: par!.school_generated_id, role: 'PARENT' },
      B2
    );
    expect(codeOf(resolved)).toBe('PAR');
    expect(resolved).not.toContain('_TCH_');
  });

  it('a large embedded profile photo is accepted (no 413 "entity too large")', async () => {
    const bigPhoto = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024); // ~3 MB
    const res = await request(app).post('/api/teachers')
      .set('Authorization', `Bearer ${token()}`).set('X-Branch-Id', B1)
      .send({ full_name: 'Photo Teacher', email: 'photo@acid.com', avatar_url: bigPhoto });
    expect(res.status).not.toBe(413);
    expect([200, 201]).toContain(res.status);
  });
});
