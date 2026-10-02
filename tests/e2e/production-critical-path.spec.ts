import { test, expect, Page, APIRequestContext } from '@playwright/test';
import bcrypt from 'bcrypt';
// The ONE Prisma schema is backend/prisma/schema.prisma; its generated client is
// the only one that matches the migrated database.
import { PrismaClient } from '../../backend/generated/prisma-client';

/**
 * Production release gate: login, dashboard loading, student create/edit,
 * attendance, results, logout, role permissions, and school isolation.
 *
 * These tests must exercise the real application, but the test harness must
 * not depend on private browser hooks that can disappear during refactors.
 */

// Diagnostic only, temporary: forwards the browser's own console/error/network
// activity into CI's stdout, which IS captured reliably (unlike the
// .playwright-results/ trace+screenshot artifacts, which this suite's own
// error messages reference by path but which have not actually been showing
// up in this workflow's uploads). Every failing test in this file goes
// through loginAsDemo, and CI evidence gathered so far shows the backend
// receiving literally zero requests from these tests (not even a page load's
// worth of translate/collect calls) — meaning the page itself is not
// mounting/becoming interactive, not that a click or a network call is
// failing. This is the fastest way to find out why without another blind
// round-trip.
function attachDiagnostics(page: Page, label: string) {
    // Errors only — a passing run stays quiet, a failing one explains itself.
    // Forwarding every console.log as well made a green run unreadable.
    page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[BROWSER:${label}][${msg.type()}]`, msg.text());
        }
    });
    page.on('pageerror', (err) => console.log(`[PAGEERROR:${label}]`, err.message, err.stack || ''));
    page.on('requestfailed', (req) => console.log(`[REQUESTFAILED:${label}]`, req.url(), req.failure()?.errorText));
    page.on('response', (r) => {
        if (r.status() >= 400) console.log(`[HTTP:${label}]`, r.status(), r.url());
    });
}

// Fixture seeding is administrative work, not app traffic: connect as the
// migration/superuser role (DIRECT_URL). DATABASE_URL is the NOBYPASSRLS app
// role in CI, which correctly refuses unscoped inserts.
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });

async function warmDemoBackend(page: Page, baseURL: string, role: string) {
    const request = page.context().request;
    let lastStatus = 0;
    let lastBody = '';

    for (let attempt = 1; attempt <= 6; attempt++) {
        const response = await request.post(`${baseURL}/api/auth/demo/login`, {
            data: { role },
        });
        lastStatus = response.status();
        lastBody = await response.text();

        if (response.ok()) return;
        if (response.status() === 503 || /warming|seed/i.test(lastBody)) {
            await page.waitForTimeout(2000);
            continue;
        }
        break;
    }

    throw new Error(`Demo backend could not authenticate ${role}: ${lastStatus} ${lastBody}`);
}

async function loginAsDemo(page: Page, baseURL: string, role: 'admin' | 'teacher' | 'student' | 'parent') {
    attachDiagnostics(page, `loginAsDemo:${role}`);
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
    });

    // The backend seeds the demo sandbox in the background and answers 503 while
    // it does, so the suite used to race it and see no traffic at all.
    await warmDemoBackend(page, baseURL, role);

    console.log(`[DIAG] navigated to ${baseURL}, current URL: ${page.url()}`);
    // The visible label is translated. Match the semantic action instead of
    // hard-coding one English translation, so locale changes cannot break CI.
    const demoBtn = page.locator('button').filter({ hasText: /demo/i }).first();
    try {
        await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    } catch (e) {
        const bodyText = await page.locator('body').innerText().catch(() => '(could not read body)');
        console.log(`[DIAG] the demo button never became visible. Body text follows:\n${bodyText.slice(0, 2000)}`);
        throw e;
    }
    await expect(demoBtn).toBeEnabled();
    await demoBtn.click();

    const tile = page.locator(`button:has-text("${role}")`).first();
    await tile.waitFor({ state: 'visible', timeout: 10_000 });
    await tile.click();

    for (let attempt = 0; attempt < 5; attempt++) {
        const authenticated = await page.evaluate(() => !!sessionStorage.getItem('auth_token'));
        const adminHook = await page.evaluate(() => typeof (window as any).ADMIN_NAVIGATE === 'function');
        if (authenticated || adminHook) return;

        await page.waitForTimeout(1500);
        const visibleTile = page.locator(`button:has-text("${role}"):visible`).first();
        if (await visibleTile.count() > 0) {
            await visibleTile.click().catch(() => {});
        }
    }
}

async function loginAsAdminWithHook(page: Page, baseURL: string) {
    await loginAsDemo(page, baseURL, 'admin');
    await page.waitForFunction(
        () => !!sessionStorage.getItem('auth_token') && typeof (window as any).ADMIN_NAVIGATE === 'function',
        null,
        { timeout: 30_000 }
    );
}

async function navigateAdmin(page: Page, view: string) {
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function',
        null,
        { timeout: 15_000 }
    );
    await page.evaluate((v) => (window as any).ADMIN_NAVIGATE(v, v, {}), view);
    await page.waitForTimeout(1500);
}

function trackServerErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('response', (r) => {
        if (/\/api\//.test(r.url()) && r.status() >= 500) {
            errors.push(`${r.request().method()} ${r.url().split('/api/')[1]} → ${r.status()}`);
        }
    });
    return errors;
}

/** Onboards a fresh throwaway school via the real API. */
async function onboardThrowawaySchool(request: APIRequestContext, apiBase: string, tag: string) {
    const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `${tag}-admin-${unique}@example.com`;
    const res = await request.post(`${apiBase}/schools/onboard`, {
        data: {
            schoolName: `CI ${tag} ${unique}`,
            schoolCode: `${tag}${unique}`.toUpperCase(),
            adminEmail: email,
            adminName: `${tag} Admin`,
            adminPassword: 'CiTestPass!23',
            phone: '08000000000',
            address: 'CI test address',
            state: 'Lagos',
            planType: 'free',
        },
    });
    expect(res.ok(), `Onboarding ${tag} failed: ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    return { email, password: 'CiTestPass!23', schoolId: body.data.schoolId as string };
}

async function createIsolationFixture(tag: string) {
    const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    const school = await prisma.school.create({
        data: {
            name: `Isolation ${tag} ${unique}`,
            code: `ISO${tag}${unique.slice(-6)}`, // the tail of the id is what differs between two fixtures made ms apart
            slug: `iso-${tag.toLowerCase()}-${unique.toLowerCase()}`,
            email: `${tag.toLowerCase()}-${unique.toLowerCase()}@example.com`,
            is_active: true,
            is_onboarded: true,
            subscription_status: 'active',
        },
    });
    const branch = await prisma.branch.create({
        data: {
            school_id: school.id,
            name: 'Main Campus',
            code: 'MAIN',
            is_main: true,
        },
    });
    const email = `${tag.toLowerCase()}-${unique.toLowerCase()}@example.com`;
    const password = 'CiIsolationPass!23';
    const password_hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
        data: {
            email,
            password_hash,
            full_name: `${tag} Isolation Admin`,
            role: 'ADMIN',
            school_id: school.id,
            branch_id: branch.id,
            email_verified: true,
            is_active: true,
        },
    });
    return { schoolId: school.id, email, password };
}

test.describe('Production critical path', () => {
    test.afterAll(async () => {
        await prisma.$disconnect();
    });

    test('Login', async ({ page, baseURL }) => {
        // loginAsAdminWithHook alone waits up to 60s for window.ADMIN_NAVIGATE,
        // on top of loginAsDemo's own up to 40s for the demo button + role tile
        // — comfortably more than Playwright's 30s default test timeout, which
        // this test (and several below) had relied on implicitly by getting
        // lucky on faster/warmer environments. A slower CI runner + a genuinely
        // fresh database makes the real end-to-end time exceed 30s, so the test
        // was cut off mid-wait regardless of whether login would have actually
        // succeeded. 'Student creation'/'Student editing' below already learned
        // this the same way; giving every test here the same headroom.
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        expect(await page.evaluate(() => typeof (window as any).ADMIN_NAVIGATE === 'function')).toBe(true);
    });

    test('Dashboard loading', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        const serverErrors = trackServerErrors(page);
        await loginAsAdminWithHook(page, baseURL!);
        await navigateAdmin(page, 'dashboard');
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.length).toBeGreaterThan(50);
        expect(serverErrors, `Server 5xx while loading dashboard: ${serverErrors.join('; ')}`).toEqual([]);
    });

    test('Student creation', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        await navigateAdmin(page, 'addStudent');
        const uniqueName = `CI Student ${Date.now()}`;
        // Evidence on failure: what the app sent and what the API answered.
        const apiTrace: string[] = [];
        page.on('response', async (r) => {
            const u = r.url();
            if (!/\/api\/students(\/enroll|\?|$)/.test(u)) return;
            const body = await r.text().catch(() => '');
            // For the list, the names are the evidence; for everything else the first 400 chars.
            const names = r.request().method() === 'GET' ? (body.match(/"full_name":"[^"]*"/g) || []).join(', ') : '';
            apiTrace.push(`${r.request().method()} ${u.split('/api/')[1]} → ${r.status()} ${names ? `[${(body.match(/"full_name"/g) || []).length} students] ${names}` : body.slice(0, 400)}`);
            if (r.request().method() === 'POST') apiTrace.push(`  payload: ${(r.request().postData() || '').slice(0, 400)}`);
        });
        const fullName = page.locator('#fullName');
        await fullName.waitFor({ state: 'visible', timeout: 15_000 });
        await fullName.fill(uniqueName);

        // #branchId is a REQUIRED select populated from an async branch fetch.
        // Acting on a fixed 1s delay meant the form was often still empty, and a
        // required-but-empty select makes the browser refuse the submit itself —
        // no handler runs, no request, no toast, so the failure surfaced much
        // later as "student not in the roster". Wait for a real option instead of
        // guessing, and leave any auto-selected branch alone.
        const branch = page.locator('#branchId');
        if (await branch.count() > 0) {
            await expect
                .poll(
                    () => branch.locator('option').evaluateAll(
                        (opts) => opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean).length,
                    ),
                    { timeout: 20_000, message: 'branch dropdown never loaded any selectable option' },
                )
                .toBeGreaterThan(0);

            if (!(await branch.inputValue())) {
                const values = await branch.locator('option').evaluateAll(
                    (opts) => opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean),
                );
                await branch.selectOption(values[0]);
            }
            // Classes are re-fetched for the chosen branch.
            await page.waitForTimeout(1500);
        }

        // Scope to the class group by the radio's own name. `div.max-h-48` alone
        // also matches the parent-picker list further down the form, so the old
        // selector could count rows that were never classes.
        const classBox = page.locator('div.max-h-48')
            .filter({ has: page.locator('input[name="classEnrollment"]') })
            .first();
        const classLabels = classBox.locator('label');
        const classCount = await classLabels.count();
        test.skip(classCount === 0, 'Demo school has no classes to enrol into');

        // Click the label, as a user does, and then confirm the control actually
        // holds the selection. The radio is CONTROLLED by React state
        // (checked={selectedClassIds.includes(cls.id)}), so a forced .check() can
        // report success while the component re-renders it straight back to
        // unchecked — which is how the form reached submit with
        // selectedClassIds empty and silently refused to save.
        const selectClass = async (label: ReturnType<typeof classLabels.nth>) => {
            await label.click({ timeout: 5000 }).catch(() => {});
            return label.locator('input[type="radio"]').isChecked().catch(() => false);
        };

        let picked = false;
        for (let i = 0; i < classCount; i++) {
            const label = classLabels.nth(i);
            const text = (await label.innerText().catch(() => '')) || '';
            if (/JSS|SSS|Primary|Basic|Grade|Year|Nursery/i.test(text)) {
                picked = await selectClass(label);
                if (picked) break;
            }
        }
        if (!picked) picked = await selectClass(classLabels.first());

        // A class that will not stay selected is a real defect, not a reason to
        // skip: without it the save is refused and the assertion below would
        // fail for a completely misleading reason.
        expect(picked, 'class radio did not hold its selection — enrolment cannot be saved').toBe(true);

        // If any required field is still empty the browser blocks the submit
        // silently — no handler, no request. Surface that here, naming the field,
        // instead of letting it masquerade as a missing student further down.
        const invalidFields = await page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) return [] as string[];
            return [...form.querySelectorAll(':invalid')].map(
                (el) => `${(el as HTMLInputElement).id || (el as HTMLInputElement).name || el.tagName}: ${(el as HTMLInputElement).validationMessage}`,
            );
        });
        expect(invalidFields, 'form has unfilled required fields, so the browser will refuse the submit').toEqual([]);

        const saveBtn = page.getByRole('button', { name: /^(Save Student|Update Student)$/i });
        await saveBtn.scrollIntoViewIfNeeded().catch(() => {});

        // Wait for the write itself to land, not a fixed interval. Enrolment
        // currently takes ~3.2s server-side, so the old 2.5s sleep let the test
        // navigate to the list and issue its GET while the POST was still in
        // flight — the row really was created, it just did not exist yet at the
        // moment we looked. This is a race in the test, so fix the race rather
        // than lengthen the sleep.
        const enrolled = page.waitForResponse(
            (r) => /\/api\/students(\/enroll)?$/.test(new URL(r.url()).pathname)
                && r.request().method() === 'POST',
            { timeout: 30_000 },
        ).catch(() => null);
        await saveBtn.click();
        await enrolled;
        await page.waitForTimeout(500);

        const upgrade = page.locator('text=/upgrade your plan|plan limit|limit reached/i').first();
        test.skip(await upgrade.isVisible().catch(() => false), 'Demo plan student limit reached');
        await page.keyboard.press('Escape').catch(() => {});
        const doneBtn = page.locator('button:has-text("Done"):visible, button:has-text("Close"):visible').first();
        if (await doneBtn.count() > 0) await doneBtn.click({ timeout: 1500 }).catch(() => {});

        await navigateAdmin(page, 'studentList');
        const search = page.locator('input[aria-label="Search for a student"], input[placeholder="Search by name..."]').first();
        if (await search.count() > 0) {
            await search.fill(uniqueName);
            await page.waitForTimeout(1200);
        }

        // Two things have to happen in order here, and doing them the other way
        // round is why this looked like a lost student.
        //
        // 1. The roster keeps showing the previously cached list while it
        //    refetches, so immediately after the mutation the filtered list is
        //    briefly empty for this search term.
        // 2. The roster groups students into collapsible stage/class sections
        //    rendered as `{isOpen && ...}` — a closed section puts none of its
        //    rows in the DOM. The form enrols into the first class offered,
        //    which is a preschool-grade class, and that section starts closed.
        //
        // So wait for the refreshed data to arrive FIRST, then expand. Expanding
        // before the refetch lands just opens the old sections, and the rows that
        // replace them arrive collapsed again.
        await expect
            .poll(
                async () => page.locator('text=No students found matching your search.').count(),
                { timeout: 30_000, message: 'roster never refreshed to include the newly enrolled student' },
            )
            .toBe(0);

        for (let pass = 0; pass < 4; pass++) {
            const collapsed = page.locator('button[aria-expanded="false"]');
            const n = await collapsed.count();
            if (n === 0) break;
            for (let i = 0; i < n; i++) {
                await collapsed.nth(i).click({ timeout: 2000 }).catch(() => {});
            }
            await page.waitForTimeout(400);
        }

        await expect(page.locator(`text="${uniqueName}"`).first()).toBeVisible({ timeout: 15_000 });
    });

    test('Student editing', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        await navigateAdmin(page, 'studentList');

        // Students sit inside collapsed stage/class sections which render as
        // `{isOpen && ...}`, so nothing is clickable until those are opened.
        // The old selector took the first `tr, li` on the page, which was a
        // section header — clicking it merely expanded a group, no profile ever
        // opened, and the test skipped itself on "No Edit action found". It
        // therefore never exercised editing at all.
        // Each roster row exposes its own button for this.
        const studentRow = page.getByRole('button', { name: /^View profile for / }).first();

        // Expanding once is not enough: the roster refetches when it mounts, so
        // sections opened before the rows land are replaced by fresh, collapsed
        // ones. Keep expanding until a row is actually reachable.
        await expect
            .poll(async () => {
                const collapsed = page.locator('button[aria-expanded="false"]');
                const n = await collapsed.count();
                for (let i = 0; i < n; i++) {
                    await collapsed.nth(i).click({ timeout: 2000 }).catch(() => {});
                }
                return studentRow.count();
            }, { timeout: 30_000, message: 'roster rendered no student rows to edit' })
            .toBeGreaterThan(0);

        await expect(studentRow).toBeVisible({ timeout: 15_000 });

        await studentRow.click({ timeout: 10_000 });
        await page.waitForTimeout(1500);
        const editBtn = page.getByRole('button', { name: /^Edit/i }).first();
        await expect(editBtn, 'student profile exposed no Edit action').toBeVisible({ timeout: 15_000 });

        await editBtn.click();

        // The edit form fetches the student before it renders its controls, so
        // counting the Save button straight after a fixed 1s wait found nothing
        // and the test skipped itself — silently not testing editing at all.
        // Wait for the control instead, and treat its absence as a failure.
        const saveBtn = page.getByRole('button', { name: /^(Save|Update Student)/i }).first();
        await expect(saveBtn, 'edit form exposed no Save action').toBeVisible({ timeout: 30_000 });

        const field = page.locator('#address, #phone, textarea, input[type="text"]').first();
        if (await field.count() > 0) await field.fill(`CI edited ${Date.now()}`).catch(() => {});

        await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
        await saveBtn.click();
        await page.waitForTimeout(2000);
    });

    test('Attendance', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        const views: string[] = await page.evaluate(() => (window as any).ADMIN_COMPONENTS || []);
        const attView = views.find((v) => /attendance/i.test(v));
        test.skip(!attView, 'No attendance view registered');
        await navigateAdmin(page, attView!);
        expect((await page.locator('body').innerText()).length).toBeGreaterThan(30);
    });

    test('Results', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        const views: string[] = await page.evaluate(() => (window as any).ADMIN_COMPONENTS || []);
        const resultView = views.find((v) => /result/i.test(v));
        test.skip(!resultView, 'No results view registered');
        await navigateAdmin(page, resultView!);
        expect((await page.locator('body').innerText()).length).toBeGreaterThan(30);
    });

    test('Logout', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsAdminWithHook(page, baseURL!);
        await page.evaluate(async () => {
            try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
            sessionStorage.clear();
            localStorage.clear();
        });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('button').filter({ hasText: /demo/i }).first()).toBeVisible({ timeout: 15_000 });
    });

    test('Role permissions — a teacher cannot reach admin-only data', async ({ page, baseURL }) => {
        test.setTimeout(90_000);
        await loginAsDemo(page, baseURL!, 'teacher');
        await page.waitForFunction(() => !!sessionStorage.getItem('auth_token'), null, { timeout: 30_000 });
        const token = await page.evaluate(() => sessionStorage.getItem('auth_token'));
        expect(token, 'Teacher login did not produce a token').toBeTruthy();

        const resp = await page.evaluate(async (t) => {
            const r = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${t}` } });
            return { status: r.status };
        }, token);
        expect([200, 403]).toContain(resp.status);

        const createResp = await page.evaluate(async (t) => {
            const r = await fetch('/api/teachers', {
                method: 'POST',
                headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: 'Should Not Be Created' }),
            });
            return { status: r.status };
        }, token);
        expect(createResp.status, 'Teacher was able to create another teacher — admin-only action not gated').toBe(403);
    });

    test('School isolation — two isolated schools cannot see each other', async ({ request, baseURL }) => {
        const apiBase = `${baseURL}/api`;
        const schoolA = await createIsolationFixture('A');
        const schoolB = await createIsolationFixture('B');

        const loginA = await request.post(`${apiBase}/auth/login`, { data: { email: schoolA.email, password: schoolA.password } });
        const loginB = await request.post(`${apiBase}/auth/login`, { data: { email: schoolB.email, password: schoolB.password } });
        expect(loginA.ok(), `School A fixture login failed: ${await loginA.text()}`).toBeTruthy();
        expect(loginB.ok(), `School B fixture login failed: ${await loginB.text()}`).toBeTruthy();
        const tokenA = (await loginA.json()).token as string;
        const tokenB = (await loginB.json()).token as string;

        const aFromB = await request.get(`${apiBase}/students`, {
            headers: { Authorization: `Bearer ${tokenA}`, 'X-School-Id': schoolB.schoolId },
        });
        expect(aFromB.status(), 'School A was able to view School B via a forged school header').toBe(403);

        const bFromA = await request.get(`${apiBase}/students`, {
            headers: { Authorization: `Bearer ${tokenB}`, 'X-School-Id': schoolA.schoolId },
        });
        expect(bFromA.status(), 'School B was able to view School A via a forged school header').toBe(403);
    });
});