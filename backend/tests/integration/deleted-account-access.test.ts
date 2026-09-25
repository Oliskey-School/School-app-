/**
 * A deleted account must not be able to sign back in — by any route.
 *
 * The hole: deleting a person from the admin screens is a SOFT delete.
 * StudentService.deleteStudent stamps deleted_at on the Student row and on the
 * User row, but the User row stays. Neither login path looked at deleted_at:
 *   - googleLogin matched on email alone, so a deleted person signing in with
 *     Google got a full token;
 *   - the password path filtered is_active, which a soft delete never clears,
 *     so it let them through too.
 * The profile vanished from every admin list while its owner kept access.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '../../src/config/database';
import { AuthService } from '../../src/services/auth.service';
import { StudentService } from '../../src/services/student.service';

const S = 'delacc-school', B = 'delacc-main';
const U = 'delacc-user';
const EMAIL = 'delacc-student@x.com';
const PASSWORD = 'Str0ng!Pass123';
let studentId = '';

async function cleanup() {
    await prisma.userSession.deleteMany({ where: { user_id: U } }).catch(() => {});
    await prisma.student.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.user.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.branch.deleteMany({ where: { school_id: S } }).catch(() => {});
    await prisma.school.delete({ where: { id: S } }).catch(() => {});
}

describe('a deleted account cannot sign back in', () => {
    beforeAll(async () => {
        await cleanup();
        const bcrypt = await import('bcrypt');
        await prisma.school.create({ data: { id: S, name: 'DelAcc', code: 'DELACC', slug: S, is_active: true } as any });
        await prisma.branch.create({ data: { id: B, school_id: S, name: 'Main', code: 'DAM', is_main: true } });
        await prisma.user.create({
            data: {
                id: U, email: EMAIL, password_hash: await bcrypt.hash(PASSWORD, 10),
                full_name: 'Deleted Student', role: 'STUDENT' as any,
                school_id: S, branch_id: B, email_verified: true, is_active: true,
            },
        });
        studentId = (await prisma.student.create({
            data: { user_id: U, school_id: S, branch_id: B, full_name: 'Deleted Student', grade: 5, school_generated_id: 'DELACC_DAM_STU_0001' } as any,
        })).id;
    }, 60000);
    afterAll(cleanup, 60000);

    it('can sign in normally BEFORE deletion (the test would pass vacuously otherwise)', async () => {
        const r: any = await AuthService.login(EMAIL, PASSWORD);
        expect(r.token, 'a live account could not sign in — fixture is wrong').toBeTruthy();
    }, 60000);

    it('password sign-in is refused after the admin deletes the account', async () => {
        await StudentService.deleteStudent(S, B, studentId);
        await expect(AuthService.login(EMAIL, PASSWORD)).rejects.toThrow();
    }, 60000);

    it('GOOGLE sign-in is refused after deletion — the actual reported hole', async () => {
        // verifyGoogleIdToken is the only part that needs Google; stub it so the
        // test exercises the account lookup that was missing its filter.
        const spy = vi.spyOn(AuthService as any, 'verifyGoogleIdToken')
            .mockResolvedValue({ email: EMAIL });
        try {
            await expect(
                AuthService.googleLogin('stubbed-id-token'),
                'a deleted account was still able to sign in with Google',
            ).rejects.toThrow();
        } finally {
            spy.mockRestore();
        }
    }, 60000);

    it('the delete also deactivates the user and revokes live sessions', async () => {
        const user = await prisma.user.findUnique({ where: { id: U }, select: { is_active: true, deleted_at: true } });
        expect(user!.deleted_at).not.toBeNull();
        expect(user!.is_active, 'a deleted user was left marked active').toBe(false);
        const live = await prisma.userSession.count({ where: { user_id: U, is_active: true } });
        expect(live, 'a deleted user still had live sessions').toBe(0);
    }, 60000);
});
