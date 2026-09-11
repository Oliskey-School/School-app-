import { test, expect, APIRequestContext } from '@playwright/test';
import { PrismaClient } from '../../../backend/generated/prisma-client';

const prisma = new PrismaClient();

// stripSensitiveFields() (backend/src/config/database.ts) strips
// initial_password from every API response that flows through the app's
// Prisma client — a deliberate anti-leak control, not a bug. It does mean
// the teacher-creation endpoint's own claimed `initial_password` field in
// its response is always empty in practice. This test needs real
// credentials to log in AS the teacher it just created, so it reads the
// value back directly (bypassing RLS, the same mechanism the app itself
// uses for pre-tenant operations) rather than relying on that response.
async function readInitialPassword(email: string): Promise<string> {
    const rows: any = await prisma.$transaction([
        prisma.$executeRaw`SELECT set_config('app.bypass_rls', 'on', true)`,
        prisma.user.findFirst({ where: { email: email.toLowerCase() }, select: { initial_password: true } }),
    ]);
    const value = rows[1]?.initial_password;
    if (!value) throw new Error(`no initial_password recorded for ${email}`);
    return value as string;
}

/**
 * RBAC permission matrix — API-level, not UI-hiding. A menu item that isn't
 * rendered is not an authorization boundary; the endpoint refusing the call
 * is. Every test here hits the real API directly with a token for a
 * deliberately UNDER-privileged role and asserts the action is refused.
 *
 * One disposable school, one of each role, created fresh per run through the
 * real admin-authenticated creation endpoints (not seeded directly into the
 * DB) so the creation endpoints' own authorization is exercised too.
 */

function apiBase(baseURL: string) {
    return `${baseURL}/api`;
}

interface Fixture {
    base: string;
    admin: { token: string; email: string };
    teacher: { token: string; id: string; email: string };
    student: { token: string; id: string; userId: string; email: string };
    parent: { token: string; id: string; email: string };
}

async function buildFixture(request: APIRequestContext, baseURL: string): Promise<Fixture> {
    const base = apiBase(baseURL);
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const adminEmail = `rb-admin-${unique}@example.com`;
    const adminPassword = 'RbacCiPass!23';

    const onboard = await request.post(`${base}/schools/onboard`, {
        data: {
            schoolName: `RBAC CI ${unique}`,
            schoolCode: `RB${unique}`.toUpperCase().slice(0, 12),
            adminEmail, adminName: 'RBAC Admin', adminPassword,
            phone: '08000000000', address: 'CI test address', state: 'Lagos', planType: 'free',
        },
    });
    expect(onboard.ok(), `onboarding failed: ${await onboard.text()}`).toBeTruthy();

    const adminLogin = await request.post(`${base}/auth/login`, { data: { email: adminEmail, password: adminPassword } });
    expect(adminLogin.ok()).toBeTruthy();
    const { token: adminToken } = await adminLogin.json();
    const auth = { Authorization: `Bearer ${adminToken}` };

    const teacherEmail = `rb-teacher-${unique}@example.com`;
    const teacherRes = await request.post(`${base}/teachers`, {
        headers: auth,
        data: { full_name: 'RBAC Teacher', email: teacherEmail, subjects: ['Mathematics'] },
    });
    expect(teacherRes.ok(), `teacher creation failed: ${await teacherRes.text()}`).toBeTruthy();
    const teacherBody = await teacherRes.json(); // { ...teacher, initial_password, username }
    const teacherPassword = await readInitialPassword(teacherEmail);
    const teacherLogin = await request.post(`${base}/auth/login`, { data: { email: teacherEmail, password: teacherPassword } });
    expect(teacherLogin.ok(), await teacherLogin.text()).toBeTruthy();
    const { token: teacherToken } = await teacherLogin.json();

    const studentRes = await request.post(`${base}/students/enroll`, {
        headers: auth,
        data: { firstName: 'RBAC', lastName: 'Student' },
    });
    expect(studentRes.ok(), `student enrollment failed: ${await studentRes.text()}`).toBeTruthy();
    // { studentId, schoolGeneratedId, email, password, status, parentCredentials }
    const studentBody = await studentRes.json();
    expect(studentBody.email && studentBody.password, `student enrollment did not return usable credentials: ${JSON.stringify(studentBody).slice(0, 300)}`).toBeTruthy();
    const studentLogin = await request.post(`${base}/auth/login`, { data: { email: studentBody.email, password: studentBody.password } });
    expect(studentLogin.ok(), await studentLogin.text()).toBeTruthy();
    const { token: studentToken } = await studentLogin.json();

    const parentEmail = `rb-parent-${unique}@example.com`;
    const parentRes = await request.post(`${base}/parents`, {
        headers: auth,
        data: { email: parentEmail, full_name: 'RBAC Parent' },
    });
    expect(parentRes.ok(), `parent creation failed: ${await parentRes.text()}`).toBeTruthy();
    // { parent, userId, email, loginId, password }
    const parentBody = await parentRes.json();
    expect(parentBody.password, `parent creation did not return a password: ${JSON.stringify(parentBody).slice(0, 300)}`).toBeTruthy();
    const parentLogin = await request.post(`${base}/auth/login`, { data: { email: parentBody.email, password: parentBody.password } });
    expect(parentLogin.ok(), await parentLogin.text()).toBeTruthy();
    const { token: parentToken } = await parentLogin.json();

    return {
        base,
        admin: { token: adminToken, email: adminEmail },
        teacher: { token: teacherToken, id: teacherBody.id, email: teacherEmail },
        student: { token: studentToken, id: studentBody.studentId, userId: studentBody.userId, email: studentBody.email },
        parent: { token: parentToken, id: parentBody.parent?.id, email: parentEmail },
    };
}

test.describe('RBAC permission matrix', () => {
    test.describe.configure({ mode: 'serial' });
    test.setTimeout(60_000);
    let fx: Fixture;

    test.beforeAll(async ({ playwright, baseURL }) => {
        const ctx = await playwright.request.newContext();
        fx = await buildFixture(ctx, baseURL!);
        await ctx.dispose();
    });

    test.afterAll(async () => {
        await prisma.$disconnect();
    });

    test('a student cannot enroll another student (admin-only action)', async ({ request }) => {
        const res = await request.post(`${fx.base}/students/enroll`, {
            headers: { Authorization: `Bearer ${fx.student.token}` },
            data: { firstName: 'Escal', lastName: 'Ation' },
        });
        expect([401, 403]).toContain(res.status());
    });

    test('a teacher cannot delete a student (admin-only action)', async ({ request }) => {
        const res = await request.delete(`${fx.base}/students/${fx.student.id}`, {
            headers: { Authorization: `Bearer ${fx.teacher.token}` },
        });
        expect([401, 403, 404]).toContain(res.status());
        // Confirm the student record actually still exists — a 404 above must
        // mean "route doesn't allow this", not "it silently deleted anyway".
        const stillThere = await request.get(`${fx.base}/students/${fx.student.id}`, {
            headers: { Authorization: `Bearer ${fx.admin.token}` },
        });
        expect(stillThere.ok(), 'student was actually deleted by a teacher-authorized request').toBeTruthy();
    });

    test('a teacher cannot access admin-hub configuration', async ({ request }) => {
        const res = await request.get(`${fx.base}/admin-hub/config`, {
            headers: { Authorization: `Bearer ${fx.teacher.token}` },
        });
        expect([401, 403]).toContain(res.status());
    });

    test('a student cannot access another student\'s report card', async ({ request }) => {
        // Create a second student as admin, then have the FIRST student's token
        // try to read the second student's data.
        const other = await request.post(`${fx.base}/students/enroll`, {
            headers: { Authorization: `Bearer ${fx.admin.token}` },
            data: { firstName: 'Other', lastName: 'Student' },
        });
        expect(other.ok()).toBeTruthy();
        const otherBody = await other.json();
        const otherId = (otherBody.data || otherBody).id;

        const res = await request.get(`${fx.base}/students/${otherId}`, {
            headers: { Authorization: `Bearer ${fx.student.token}` },
        });
        expect([401, 403, 404]).toContain(res.status());
    });

    test('a parent cannot access a child not linked to them', async ({ request }) => {
        const res = await request.get(`${fx.base}/parents/${fx.parent.id}/children`, {
            headers: { Authorization: `Bearer ${fx.parent.token}` },
        });
        // The endpoint itself must succeed (it's the parent's own record) but
        // must not include the unrelated student created in this fixture.
        expect(res.ok(), await res.text()).toBeTruthy();
        const body = await res.json();
        const ids = JSON.stringify(body);
        expect(ids).not.toContain(fx.student.id);
    });

    test('a student cannot escalate their own role via a profile update', async ({ request }) => {
        const res = await request.put(`${fx.base}/users/me/profile`, {
            headers: { Authorization: `Bearer ${fx.student.token}` },
            data: { role: 'ADMIN', full_name: 'Still A Student' },
        });
        // Whether the endpoint accepts the harmless field and ignores `role`,
        // or refuses the request outright, is an implementation choice — what
        // must never happen is the role actually changing.
        void res;
        const me = await request.get(`${fx.base}/auth/me`, {
            headers: { Authorization: `Bearer ${fx.student.token}` },
        });
        const meBody = await me.json();
        expect(meBody.role).not.toBe('ADMIN');
        expect(meBody.role).toBe('STUDENT');
    });

    test('a teacher cannot promote themselves to admin via a forged JWT-shaped body', async ({ request }) => {
        // Some endpoints read role-like fields out of the body for legitimate
        // reasons (e.g. filtering); none of them may let the CALLER change
        // their own effective role. Confirm by attempting the same forged
        // profile update as a teacher, then re-checking their own identity.
        await request.put(`${fx.base}/users/me/profile`, {
            headers: { Authorization: `Bearer ${fx.teacher.token}` },
            data: { role: 'ADMIN', school_id: 'attacker-controlled-value' },
        });
        const me = await request.get(`${fx.base}/auth/me`, {
            headers: { Authorization: `Bearer ${fx.teacher.token}` },
        });
        const meBody = await me.json();
        expect(meBody.role).toBe('TEACHER');
    });

    test('an unauthenticated caller cannot reach any role-scoped endpoint', async ({ request }) => {
        const targets = [
            ['GET', `${fx.base}/admin-hub/config`],
            ['GET', `${fx.base}/students`],
            ['GET', `${fx.base}/teachers`],
            ['GET', `${fx.base}/parents`],
        ] as const;
        for (const [method, url] of targets) {
            const res = await request.fetch(url, { method });
            expect(res.status(), `${method} ${url} did not require auth`).toBe(401);
        }
    });

    test('a student cannot access the teacher directory (full read, not their own profile)', async ({ request }) => {
        const res = await request.get(`${fx.base}/teachers`, {
            headers: { Authorization: `Bearer ${fx.student.token}` },
        });
        expect([401, 403]).toContain(res.status());
    });

    test('a parent cannot create or modify a teacher', async ({ request }) => {
        const res = await request.post(`${fx.base}/teachers`, {
            headers: { Authorization: `Bearer ${fx.parent.token}` },
            data: { full_name: 'Should Not Exist', email: `should-not-exist-${Date.now()}@example.com` },
        });
        expect([401, 403]).toContain(res.status());
    });
});
