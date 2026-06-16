import { test, expect, Page } from '@playwright/test';

/**
 * Persistence sweep (reload-survives): create real records through the Admin UI,
 * do a FULL page reload, and assert the record is still there. This complements
 * admin-every-button.spec.ts (which proves every button renders / errors-free) by
 * proving that what an admin saves actually persists to the database.
 */

async function loginAsDemoAdmin(page: Page, baseURL: string) {
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    const demoBtn = page.getByRole('button', { name: /Try Demo School/i });
    await demoBtn.waitFor({ state: 'visible', timeout: 30_000 });
    await demoBtn.click();
    const adminTile = page.locator('button:has-text("admin")').first();
    await adminTile.waitFor({ state: 'visible', timeout: 10_000 });
    await adminTile.click();
    await page.waitForFunction(
        () => typeof (window as any).ADMIN_NAVIGATE === 'function'
            && Array.isArray((window as any).ADMIN_COMPONENTS)
            && (window as any).ADMIN_COMPONENTS.length > 50,
        null,
        { timeout: 45_000 }
    );
}

// After a full reload the same-tab demo session persists in sessionStorage, so the
// dashboard re-renders without re-running the landing-page demo flow.
async function ensureAdmin(page: Page, baseURL: string) {
    const present = await page.evaluate(() => typeof (window as any).ADMIN_NAVIGATE === 'function').catch(() => false);
    if (present) return;
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
    try {
        await page.waitForFunction(
            () => typeof (window as any).ADMIN_NAVIGATE === 'function'
                && Array.isArray((window as any).ADMIN_COMPONENTS),
            null,
            { timeout: 15_000 }
        );
        return;
    } catch { /* session gone — full login */ }
    await loginAsDemoAdmin(page, baseURL);
}

async function navigate(page: Page, view: string) {
    await page.evaluate((v) => (window as any).ADMIN_NAVIGATE?.(v, v, {}), view);
    await page.waitForTimeout(1500);
}

test.describe.configure({ mode: 'serial' });

test('admin: a created Student survives a full page reload', async ({ page, baseURL }) => {
    test.setTimeout(180_000);

    // Capture 5xx so a persistence failure caused by a server error is reported clearly.
    const serverErrors: string[] = [];
    page.on('response', (r) => {
        if (/\/api\//.test(r.url()) && r.status() >= 500) {
            serverErrors.push(`${r.request().method()} ${r.url().split('/api/')[1]} → ${r.status()}`);
        }
    });

    // Capture every /api/students payload so we can prove the saved row is returned
    // by the server AFTER a reload — the real "reload-survives" assertion, independent
    // of how the list groups students into stage/level tabs in the DOM.
    const studentPayloads: any[][] = [];
    page.on('response', async (r) => {
        if (/\/api\/students(\?|$)/.test(r.url()) && r.request().method() === 'GET' && r.status() < 400) {
            try {
                const body = await r.json();
                const arr = Array.isArray(body) ? body : (body?.data ?? body?.students ?? []);
                if (Array.isArray(arr)) studentPayloads.push(arr);
            } catch { /* non-JSON */ }
        }
    });

    await loginAsDemoAdmin(page, baseURL!);

    const uniqueName = `E2E Persist ${Date.now()}`;

    // ---- Create ----
    await navigate(page, 'addStudent');

    const fullName = page.locator('#fullName');
    await fullName.waitFor({ state: 'visible', timeout: 10_000 });
    await fullName.fill(uniqueName);

    // Branch is required — pick the first real option.
    const branch = page.locator('#branchId');
    if (await branch.count() > 0) {
        const values = await branch.locator('option').evaluateAll(
            (opts) => opts.map((o) => (o as HTMLOptionElement).value).filter(Boolean)
        );
        if (values.length > 0) await branch.selectOption(values[0]);
        await page.waitForTimeout(1000); // class list can reload per branch
    }

    // At least one class enrolment is required (the scrollable "Class Enrollments" box).
    // Prefer a real level (JSS/SSS/Primary/Basic/Grade) over any malformed demo class
    // so the student lands in a normal stage rather than the "preschool/Unassigned" bucket.
    const classLabels = page.locator('div.max-h-48 label');
    const classCount = await classLabels.count();
    test.skip(classCount === 0, 'Demo school has no classes to enrol — cannot exercise student persistence');
    let picked = false;
    for (let i = 0; i < classCount; i++) {
        const label = classLabels.nth(i);
        const text = (await label.innerText().catch(() => '')) || '';
        if (/JSS|SSS|Primary|Basic|Grade|Year|Nursery/i.test(text)) {
            await label.locator('input[type="checkbox"]').check();
            picked = true;
            break;
        }
    }
    if (!picked) await classLabels.first().locator('input[type="checkbox"]').check();

    const saveBtn = page.getByRole('button', { name: /^(Save Student|Update Student)$/i });
    await saveBtn.scrollIntoViewIfNeeded().catch(() => { });
    await saveBtn.click();

    // The plan may be at its student cap in the shared demo — that's a valid product
    // state, not a persistence bug, so skip rather than fail.
    await page.waitForTimeout(2500);
    const upgrade = page.locator('text=/upgrade your plan|plan limit|limit reached/i').first();
    if (await upgrade.isVisible().catch(() => false)) {
        test.skip(true, 'Demo plan student limit reached — upgrade modal shown instead of save');
    }

    // A credentials modal (generated username/password) appears on success — dismiss it.
    await page.waitForTimeout(2500);
    await page.keyboard.press('Escape').catch(() => { });
    const doneBtn = page.locator('button:has-text("Done"):visible, button:has-text("Close"):visible').first();
    if (await doneBtn.count() > 0) await doneBtn.click({ timeout: 1500 }).catch(() => { });

    expect(serverErrors, `Server 5xx during student create: ${serverErrors.join('; ')}`).toEqual([]);

    // ---- Reload (the actual persistence assertion) ----
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ensureAdmin(page, baseURL!);

    const payloadsBefore = studentPayloads.length;
    await navigate(page, 'studentList');

    // Wait for the post-reload students fetch to come back, then assert the server
    // returned the student we created before the reload (true reload-survives proof).
    await expect.poll(
        () => studentPayloads.slice(payloadsBefore).some(arr =>
            arr.some((s: any) => (s?.full_name || s?.name) === uniqueName)
        ),
        {
            timeout: 15_000,
            message: `Server did not return student "${uniqueName}" after reload — it did not persist`,
        }
    ).toBe(true);

    // Soft UI check: the name should also be searchable in the list.
    const search = page.locator('input[aria-label="Search for a student"], input[placeholder="Search by name..."]').first();
    if (await search.count() > 0) {
        await search.fill(uniqueName).catch(() => { });
        await page.waitForTimeout(1000);
    }
});
